import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FFMPEG_BIN, YTDLP_BIN, getEngineCapabilities } from './binaries.js';
import { formatMediaFilename, parseTimeToSeconds } from './platforms.js';

const TEMP_ROOT = path.join(os.tmpdir(), 'reeljet-downloads');
fs.mkdirSync(TEMP_ROOT, { recursive: true });

const AUDIO_FORMATS = new Set(['mp3', 'm4a', 'flac', 'wav']);
const VIDEO_FORMATS = new Set(['mp4', 'webm', 'mkv']);

const preparedTokens = new Map();

// Periodic cleanup of orphaned temp files older than 20 mins
setInterval(() => {
  const cutoff = Date.now() - 20 * 60 * 1000;
  for (const [token, entry] of preparedTokens.entries()) {
    if (entry.createdAt < cutoff) {
      preparedTokens.delete(token);
      fs.promises.rm(entry.dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}, 5 * 60 * 1000).unref();

export function isAudioFormat(format = 'mp4') {
  return AUDIO_FORMATS.has(String(format).toLowerCase());
}

export function getMimeType(ext = 'mp4') {
  switch (String(ext).toLowerCase()) {
    case 'mp3':
      return 'audio/mpeg';
    case 'm4a':
      return 'audio/mp4';
    case 'flac':
      return 'audio/flac';
    case 'wav':
      return 'audio/wav';
    case 'webm':
      return 'video/webm';
    case 'mkv':
      return 'video/x-matroska';
    case 'srt':
      return 'application/x-subrip; charset=utf-8';
    case 'mp4':
    default:
      return 'video/mp4';
  }
}

/**
 * Determine if a request can be zero-disk pass-through streamed directly from CDN.
 */
export function canDirectStream(media, { format = 'mp4', quality = 'best', start = '', end = '' } = {}) {
  const fmt = String(format).toLowerCase();
  if (isAudioFormat(fmt)) return false;
  if (fmt !== 'mp4') return false;
  if (parseTimeToSeconds(start) !== null || parseTimeToSeconds(end) !== null) return false;

  // Instagram progressive MP4s are always single muxed files
  if (media.platform === 'instagram' && media.directProgressiveUrl) return true;

  // For other platforms, only direct-stream if user explicitly asked for 360p/fast or there is a direct progressive URL and quality is <= 720
  if (media.directProgressiveUrl && (quality === 'fast' || Number(quality) <= 360)) {
    return true;
  }

  return false;
}

function buildFormatSelector(quality = 'best') {
  const q = String(quality).toLowerCase();
  if (q === 'fast' || q === '360') {
    return 'best[height<=360][ext=mp4]/bestvideo[height<=360]+bestaudio/best[height<=360]/best';
  }
  const num = Number(q);
  if (!Number.isNaN(num) && num >= 144) {
    return `bestvideo[height<=${num}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${num}]+bestaudio/best[height<=${num}]/best`;
  }
  return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
}

function runCommandWithProgress(bin, args, onLine) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderrBuf = '';

    const handleChunk = (chunk, isErr = false) => {
      const text = chunk.toString();
      if (isErr) stderrBuf += text;
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) onLine?.(line.trim());
      }
    };

    child.stdout.on('data', (c) => handleChunk(c, false));
    child.stderr.on('data', (c) => handleChunk(c, true));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderrBuf.trim().split('\n').slice(-3).join(' ') || `Process exited with code ${code}`));
    });
  });
}

/**
 * Prepare a processed media file (HD muxed MP4, MP3/M4A/FLAC/WAV audio, or trimmed clip).
 * Returns { token, filePath, dir, filename, ext, size, mimeType }
 */
export async function prepareMediaFile(
  media,
  {
    format = 'mp4',
    quality = 'best',
    start = '',
    end = '',
    template = 'title_id',
    index = 0,
    onProgress,
  } = {}
) {
  const caps = await getEngineCapabilities();
  const fmt = String(format).toLowerCase();
  const ext = AUDIO_FORMATS.has(fmt) || VIDEO_FORMATS.has(fmt) ? fmt : 'mp4';

  const jobDir = path.join(TEMP_ROOT, crypto.randomUUID());
  fs.mkdirSync(jobDir, { recursive: true });

  const startSec = parseTimeToSeconds(start);
  const endSec = parseTimeToSeconds(end);
  const hasTrim = startSec !== null || endSec !== null;

  const targetName = formatMediaFilename(media, template, index, ext, false);
  const outputTemplate = path.join(jobDir, 'output.%(ext)s');

  try {
    // Fast direct ffmpeg path when we already have a progressive URL (e.g. Instagram Reel -> MP3 or Trimmed)
    if (media.directProgressiveUrl && (media.platform === 'instagram' || !caps.ytDlpAvailable)) {
      if (!caps.ffmpegAvailable) {
        throw new Error('ffmpeg is required for audio conversion or clip trimming.');
      }
      onProgress?.({ stage: isAudioFormat(ext) ? 'Extracting audio...' : 'Processing clip...', percent: 25 });

      const outPath = path.join(jobDir, `output.${ext}`);
      const ffArgs = ['-y'];
      if (startSec !== null) ffArgs.push('-ss', String(startSec));
      if (endSec !== null) ffArgs.push('-to', String(endSec));
      ffArgs.push('-i', media.directProgressiveUrl);

      if (ext === 'mp3') {
        ffArgs.push('-vn', '-c:a', 'libmp3lame', '-b:a', '320k', outPath);
      } else if (ext === 'm4a') {
        ffArgs.push('-vn', '-c:a', 'aac', '-b:a', '256k', outPath);
      } else if (ext === 'flac') {
        ffArgs.push('-vn', '-c:a', 'flac', outPath);
      } else if (ext === 'wav') {
        ffArgs.push('-vn', '-c:a', 'pcm_s16le', outPath);
      } else {
        ffArgs.push('-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-movflags', '+faststart', outPath);
      }

      await runCommandWithProgress(FFMPEG_BIN, ffArgs);
      onProgress?.({ stage: 'Finalizing...', percent: 95 });
    } else {
      if (!caps.ytDlpAvailable) {
        throw new Error('yt-dlp is required on the server for this operation.');
      }

      const ytArgs = [
        '--no-playlist',
        '--no-warnings',
        '--newline',
        '--ffmpeg-location',
        path.dirname(FFMPEG_BIN),
        '-o',
        outputTemplate,
      ];

      if (hasTrim) {
        const sStr = startSec !== null ? String(startSec) : '0';
        const eStr = endSec !== null ? String(endSec) : 'inf';
        ytArgs.push('--download-sections', `*${sStr}-${eStr}`, '--force-keyframes-at-cuts');
      }

      if (isAudioFormat(ext)) {
        ytArgs.push('-f', 'bestaudio/best', '-x', '--audio-format', ext, '--audio-quality', '0');
        if (ext === 'mp3' || ext === 'm4a') {
          ytArgs.push('--embed-thumbnail', '--add-metadata');
        }
      } else {
        ytArgs.push('-f', buildFormatSelector(quality), '--merge-output-format', ext);
      }

      ytArgs.push(media.url);

      onProgress?.({ stage: 'Connecting to stream...', percent: 5 });

      await runCommandWithProgress(YTDLP_BIN, ytArgs, (line) => {
        const dlMatch = line.match(/\[download\]\s+([\d.]+)%(?:\s+of\s+[^\s]+)?(?:\s+at\s+([^\s]+))?(?:\s+ETA\s+([^\s]+))?/);
        if (dlMatch) {
          onProgress?.({
            stage: isAudioFormat(ext) ? 'Downloading audio...' : 'Downloading streams...',
            percent: Math.min(88, Math.round(Number(dlMatch[1]) * 0.88)),
            speed: dlMatch[2] || null,
            eta: dlMatch[3] || null,
          });
          return;
        }
        if (line.includes('[Merger]') || line.includes('[ffmpeg]')) {
          onProgress?.({ stage: 'Muxing HD video + audio...', percent: 92 });
        } else if (line.includes('[ExtractAudio]')) {
          onProgress?.({ stage: `Converting to ${ext.toUpperCase()}...`, percent: 92 });
        }
      });
    }

    const files = fs.readdirSync(jobDir).filter((f) => !f.endsWith('.part') && !f.endsWith('.ytdl'));
    if (files.length === 0) {
      throw new Error('Processed media file was not generated.');
    }

    const finalFile = path.join(jobDir, files[0]);
    const stat = fs.statSync(finalFile);
    const token = crypto.randomBytes(16).toString('hex');

    const record = {
      token,
      dir: jobDir,
      filePath: finalFile,
      filename: targetName,
      ext,
      size: stat.size,
      mimeType: getMimeType(ext),
      createdAt: Date.now(),
    };

    preparedTokens.set(token, record);
    onProgress?.({ stage: 'Ready!', percent: 100 });
    return record;
  } catch (err) {
    fs.promises.rm(jobDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}

export function getPreparedFile(token) {
  return preparedTokens.get(token) || null;
}

export function cleanupPreparedFile(token) {
  const entry = preparedTokens.get(token);
  if (!entry) return;
  preparedTokens.delete(token);
  fs.promises.rm(entry.dir, { recursive: true, force: true }).catch(() => {});
}

/**
 * Extract subtitles (.srt) for a media URL.
 */
export async function extractSubtitles(media, lang = 'en') {
  const caps = await getEngineCapabilities();
  if (!caps.ytDlpAvailable) {
    throw new Error('yt-dlp is required to download subtitles.');
  }

  const jobDir = path.join(TEMP_ROOT, `subs-${crypto.randomUUID()}`);
  fs.mkdirSync(jobDir, { recursive: true });

  try {
    const safeLang = String(lang || 'en').replace(/[^a-z0-9_-]/gi, '') || 'en';
    await runCommandWithProgress(YTDLP_BIN, [
      '--no-playlist',
      '--skip-download',
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs',
      safeLang,
      '--sub-format',
      'srt/vtt/best',
      '--convert-subs',
      'srt',
      '-o',
      path.join(jobDir, 'sub.%(ext)s'),
      media.url,
    ]);

    const files = fs.readdirSync(jobDir).filter((f) => f.endsWith('.srt') || f.endsWith('.vtt'));
    if (files.length === 0) {
      throw new Error(`No subtitles found for language "${safeLang}".`);
    }
    const content = fs.readFileSync(path.join(jobDir, files[0]), 'utf8');
    const ext = path.extname(files[0]).slice(1) || 'srt';
    return { content, ext };
  } finally {
    fs.promises.rm(jobDir, { recursive: true, force: true }).catch(() => {});
  }
}

