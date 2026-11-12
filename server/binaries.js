import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SEARCH_PATHS = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'];

function findBinary(name) {
  for (const dir of SEARCH_PATHS) {
    const candidate = `${dir}/${name}`;
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore
    }
  }
  return name; // fallback to PATH
}

export const YTDLP_BIN = process.env.YTDLP_BIN || findBinary('yt-dlp');
export const FFMPEG_BIN = process.env.FFMPEG_BIN || findBinary('ffmpeg');

let capabilitiesCache = null;

export async function getEngineCapabilities(forceRefresh = false) {
  if (capabilitiesCache && !forceRefresh) return capabilitiesCache;

  const [ytDlpVersion, ffmpegVersion] = await Promise.all([
    execFileAsync(YTDLP_BIN, ['--version'], { timeout: 3000 })
      .then((r) => r.stdout.trim())
      .catch(() => null),
    execFileAsync(FFMPEG_BIN, ['-version'], { timeout: 3000 })
      .then((r) => {
        const firstLine = r.stdout.split('\n')[0] || '';
        const m = firstLine.match(/ffmpeg version\s+([^\s]+)/i);
        return m ? m[1] : firstLine.slice(0, 30);
      })
      .catch(() => null),
  ]);

  capabilitiesCache = {
    ytDlpAvailable: Boolean(ytDlpVersion),
    ytDlpVersion,
    ffmpegAvailable: Boolean(ffmpegVersion),
    ffmpegVersion,
    supportedFeatures: {
      instagramFastSsr: true,
      multiPlatform: Boolean(ytDlpVersion),
      hdMuxing: Boolean(ytDlpVersion && ffmpegVersion),
      audioExtraction: Boolean(ffmpegVersion),
      clipTrimming: Boolean(ffmpegVersion),
      playlists: Boolean(ytDlpVersion),
      subtitles: Boolean(ytDlpVersion),
    },
  };

  return capabilitiesCache;
}
