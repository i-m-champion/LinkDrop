import express from 'express';
import archiver from 'archiver';
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { getEngineCapabilities } from './binaries.js';
import {
  expandPlaylist,
  extractMedia,
  formatMediaFilename,
  getCachedMedia,
  parseMediaUrls,
  runWithConcurrency,
} from './extractor.js';
import {
  canDirectStream,
  cleanupPreparedFile,
  extractSubtitles,
  getMimeType,
  getPreparedFile,
  isAudioFormat,
  prepareMediaFile,
} from './downloader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const PORT = Number(process.env.PORT) || 3001;

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const app = express();
app.use(express.json({ limit: '4mb' }));

app.get('/api/health', async (_req, res) => {
  const capabilities = await getEngineCapabilities();
  res.json({
    ok: true,
    service: 'reeljet-studio-api',
    timestamp: Date.now(),
    capabilities,
  });
});

app.post('/api/parse', (req, res) => {
  const { input } = req.body || {};
  const items = parseMediaUrls(input);
  res.json({ items, count: items.length });
});

app.post('/api/playlist/expand', async (req, res) => {
  const { url, limit = 25 } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: 'Playlist URL is required.' });
  }
  try {
    const result = await expandPlaylist(url, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed to expand playlist.' });
  }
});

/**
 * SSE endpoint: extracts multiple mixed-platform URLs concurrently.
 */
app.post('/api/extract/batch', async (req, res) => {
  const { items = [], concurrency = 5, sessionId = '' } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No valid media links provided.' });
  }

  const normalizedItems = items
    .map((item) => {
      if (typeof item === 'string') return parseMediaUrls(item)[0];
      if (item?.url && item?.id) return item;
      if (item?.shortcode) {
        return {
          id: item.shortcode,
          shortcode: item.shortcode,
          platform: 'instagram',
          url: `https://www.instagram.com/reel/${item.shortcode}/`,
        };
      }
      return item?.url ? parseMediaUrls(item.url)[0] : null;
    })
    .filter(Boolean)
    .slice(0, 100);

  if (normalizedItems.length === 0) {
    return res.status(400).json({ error: 'Could not find any valid URLs.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let closed = false;
  res.on('close', () => {
    if (!res.writableFinished) closed = true;
  });

  const sendEvent = (event, payload) => {
    if (closed || res.writableEnded) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const startedAt = Date.now();
  sendEvent('start', {
    total: normalizedItems.length,
    concurrency: Math.max(1, Math.min(Number(concurrency) || 5, 10)),
  });

  let completed = 0;
  let succeeded = 0;
  let failed = 0;

  await runWithConcurrency(normalizedItems, concurrency, async (item) => {
    if (closed) return;
    sendEvent('item', { id: item.id, shortcode: item.shortcode || item.id, status: 'extracting' });

    try {
      const data = await extractMedia(item, { sessionId });
      succeeded++;
      completed++;
      sendEvent('item', {
        id: item.id,
        shortcode: item.shortcode || item.id,
        status: 'ready',
        data: {
          ...data,
          proxyThumbUrl: `/api/thumb/${encodeURIComponent(data.id)}`,
          proxyVideoUrl: `/api/stream/${encodeURIComponent(data.id)}`,
        },
        progress: { completed, total: normalizedItems.length, succeeded, failed },
      });
    } catch (err) {
      failed++;
      completed++;
      sendEvent('item', {
        id: item.id,
        shortcode: item.shortcode || item.id,
        status: 'error',
        error: err?.message || 'Extraction failed',
        code: err?.code || 'EXTRACT_ERROR',
        progress: { completed, total: normalizedItems.length, succeeded, failed },
      });
    }
  });

  sendEvent('done', {
    total: normalizedItems.length,
    succeeded,
    failed,
    elapsedMs: Date.now() - startedAt,
  });

  if (!closed && !res.writableEnded) {
    res.end();
  }
});

/**
 * Thumbnail proxy (supports ?download=1 to save cover image directly).
 */
app.get('/api/thumb/:id', async (req, res) => {
  const { id } = req.params;
  const { download, url: fallbackUrl, sessionId = '' } = req.query;

  try {
    let media = getCachedMedia(id, Boolean(sessionId));
    if (!media && fallbackUrl) {
      media = await extractMedia(String(fallbackUrl), { sessionId: String(sessionId) });
    }
    if (!media?.thumbnailUrl) {
      return res.status(404).end();
    }

    const upstream = await fetch(media.thumbnailUrl, {
      headers: { 'User-Agent': CHROME_UA, Referer: media.url || 'https://www.instagram.com/' },
    });

    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).end();
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);

    if (download === '1' || download === 'true') {
      const ext = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
      const thumbName = formatMediaFilename(media, 'title_id', 0, ext, false);
      res.setHeader('Content-Disposition', `attachment; filename="${thumbName}"`);
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch {
    res.status(404).end();
  }
});

/**
 * Subtitle (.srt) download endpoint.
 */
app.get('/api/subtitles/:id', async (req, res) => {
  const { id } = req.params;
  const { lang = 'en', url: fallbackUrl, sessionId = '' } = req.query;

  try {
    let media = getCachedMedia(id, Boolean(sessionId));
    if (!media && fallbackUrl) {
      media = await extractMedia(String(fallbackUrl), { sessionId: String(sessionId) });
    }
    if (!media) {
      return res.status(404).json({ error: 'Media item not found in cache.' });
    }

    const { content, ext } = await extractSubtitles(media, String(lang));
    const subName = formatMediaFilename(media, 'title_id', 0, ext, false);
    res.setHeader('Content-Type', getMimeType(ext));
    res.setHeader('Content-Disposition', `attachment; filename="${subName}"`);
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed to download subtitles.' });
  }
});

/**
 * Direct progressive Range streaming & fallback download endpoint.
 */
app.get('/api/stream/:id', async (req, res) => {
  const { id } = req.params;
  const {
    download,
    filename,
    format = 'mp4',
    quality = 'best',
    start = '',
    end = '',
    url: fallbackUrl,
    sessionId = '',
  } = req.query;

  try {
    let media = getCachedMedia(id, Boolean(sessionId));
    if (!media) {
      media = await extractMedia(fallbackUrl ? String(fallbackUrl) : id, {
        sessionId: String(sessionId),
      });
    }

    const opts = {
      format: String(format),
      quality: String(quality),
      start: String(start),
      end: String(end),
    };

    // Preview mode (no download=1) or direct progressive stream -> zero-disk proxy
    const isPreview = download !== '1' && download !== 'true';
    if ((isPreview && media.videoUrl) || canDirectStream(media, opts)) {
      const targetUrl = media.directProgressiveUrl || media.videoUrl;
      const headers = {
        'User-Agent': CHROME_UA,
        Referer: media.platform === 'instagram' ? 'https://www.instagram.com/' : media.url,
      };
      if (req.headers.range) headers.Range = req.headers.range;

      let upstream = await fetch(targetUrl, { headers });
      if (upstream.status === 403 || upstream.status === 410) {
        media = await extractMedia(media.url, { sessionId: String(sessionId), bypassCache: true });
        upstream = await fetch(media.directProgressiveUrl || media.videoUrl, { headers });
      }

      if (!upstream.ok || !upstream.body) {
        return res.status(upstream.status || 502).json({ error: 'Upstream media unavailable' });
      }

      res.status(upstream.status);
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      const len = upstream.headers.get('content-length');
      if (len) res.setHeader('Content-Length', len);
      const range = upstream.headers.get('content-range');
      if (range) res.setHeader('Content-Range', range);

      if (!isPreview) {
        const safeName =
          typeof filename === 'string' && filename.trim()
            ? filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            : formatMediaFilename(media, 'title_id', 0, 'mp4', false);
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      }

      const nodeStream = Readable.fromWeb(upstream.body);
      res.on('close', () => {
        if (!res.writableFinished) nodeStream.destroy();
      });
      nodeStream.pipe(res);
      return;
    }

    // Needs muxing / transcoding / trimming -> prepare via yt-dlp + ffmpeg
    const prepared = await prepareMediaFile(media, {
      ...opts,
      template: 'title_id',
    });

    const finalName =
      typeof filename === 'string' && filename.trim()
        ? filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        : prepared.filename;

    res.setHeader('Content-Type', prepared.mimeType);
    res.setHeader('Content-Length', prepared.size);
    res.setHeader('Content-Disposition', `attachment; filename="${finalName}"`);

    const stream = fs.createReadStream(prepared.filePath);
    res.on('close', () => {
      cleanupPreparedFile(prepared.token);
    });
    stream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Failed to stream media' });
    }
  }
});

/**
 * SSE progress endpoint for heavy jobs (1080p/4K muxing, MP3/FLAC conversion, Clipping).
 * Emits `progress` events and finishes with `ready` containing a one-time `/api/file/:token` URL.
 */
app.get('/api/prepare/:id', async (req, res) => {
  const { id } = req.params;
  const {
    format = 'mp4',
    quality = 'best',
    start = '',
    end = '',
    template = 'title_id',
    filename = '',
    url: fallbackUrl,
    sessionId = '',
  } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let closed = false;
  res.on('close', () => {
    if (!res.writableFinished) closed = true;
  });

  const sendEvent = (event, payload) => {
    if (closed || res.writableEnded) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    let media = getCachedMedia(id, Boolean(sessionId));
    if (!media) {
      sendEvent('progress', { stage: 'Resolving media...', percent: 2 });
      media = await extractMedia(fallbackUrl ? String(fallbackUrl) : id, {
        sessionId: String(sessionId),
      });
    }

    const opts = {
      format: String(format),
      quality: String(quality),
      start: String(start),
      end: String(end),
      template: String(template),
    };

    // If direct progressive stream works, skip temp file and return stream URL immediately
    if (canDirectStream(media, opts)) {
      const targetName =
        typeof filename === 'string' && filename.trim()
          ? filename.trim()
          : formatMediaFilename(media, opts.template, 0, 'mp4', false);
      const qs = new URLSearchParams({
        download: '1',
        filename: targetName,
      });
      if (sessionId) qs.set('sessionId', String(sessionId));
      sendEvent('ready', {
        downloadUrl: `/api/stream/${encodeURIComponent(media.id)}?${qs.toString()}`,
        filename: targetName,
        size: media.fileSize || null,
      });
      return res.end();
    }

    const prepared = await prepareMediaFile(media, {
      ...opts,
      onProgress: (p) => sendEvent('progress', p),
    });

    const targetName =
      typeof filename === 'string' && filename.trim() ? filename.trim() : prepared.filename;

    sendEvent('ready', {
      downloadUrl: `/api/file/${prepared.token}?filename=${encodeURIComponent(targetName)}`,
      filename: targetName,
      size: prepared.size,
    });
  } catch (err) {
    sendEvent('error', { error: err?.message || 'Processing failed' });
  } finally {
    if (!closed && !res.writableEnded) res.end();
  }
});

/**
 * Serves a prepared temp file once and removes it immediately afterward.
 */
app.get('/api/file/:token', (req, res) => {
  const { token } = req.params;
  const entry = getPreparedFile(token);
  if (!entry || !fs.existsSync(entry.filePath)) {
    return res.status(404).json({ error: 'Prepared file expired or not found.' });
  }

  const finalName =
    typeof req.query.filename === 'string' && req.query.filename.trim()
      ? req.query.filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      : entry.filename;

  res.setHeader('Content-Type', entry.mimeType);
  res.setHeader('Content-Length', entry.size);
  res.setHeader('Content-Disposition', `attachment; filename="${finalName}"`);

  const stream = fs.createReadStream(entry.filePath);
  res.on('close', () => {
    cleanupPreparedFile(token);
  });
  stream.pipe(res);
});

/**
 * Concurrent Batch ZIP Streamer across mixed platforms, qualities, and audio/video formats.
 */
app.post('/api/download-zip', async (req, res) => {
  const {
    items = [],
    shortcodes = [],
    template = 'title_id',
    format = 'mp4',
    quality = 'best',
    groupByPlatform = true,
    concurrency = 4,
    sessionId = '',
  } = req.body || {};

  // Support both new `items` ({ id, url, format, quality, start, end }) and legacy `shortcodes`
  const normalizedList =
    Array.isArray(items) && items.length > 0
      ? items
      : Array.isArray(shortcodes)
        ? shortcodes.map((c) => ({
            id: c,
            url: `https://www.instagram.com/reel/${c}/`,
          }))
        : [];

  if (normalizedList.length === 0) {
    return res.status(400).json({ error: 'No items selected for ZIP download.' });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="reeljet-batch-${stamp}.zip"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const archive = archiver('zip', {
    zlib: { level: 0 }, // Store mode for already-compressed video/audio
  });

  let aborted = false;
  res.on('close', () => {
    if (!res.writableFinished) {
      aborted = true;
      archive.abort();
    }
  });

  archive.on('error', (err) => {
    console.error('ZIP archive error:', err);
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });

  archive.pipe(res);

  const usedNames = new Set();
  const getUniqueFilename = (media, ext, idx) => {
    let base = formatMediaFilename(media, template, idx, ext, Boolean(groupByPlatform));
    if (!usedNames.has(base)) {
      usedNames.add(base);
      return base;
    }
    const dot = base.lastIndexOf('.');
    const stem = dot >= 0 ? base.slice(0, dot) : base;
    const suffix = dot >= 0 ? base.slice(dot) : `.${ext}`;
    let counter = 2;
    while (usedNames.has(`${stem}_${counter}${suffix}`)) counter++;
    const finalName = `${stem}_${counter}${suffix}`;
    usedNames.add(finalName);
    return finalName;
  };

  const failedItems = [];
  const windowSize = Math.max(2, Math.min(Number(concurrency) || 4, 6));

  for (let i = 0; i < normalizedList.length; i += windowSize) {
    if (aborted) break;
    const chunk = normalizedList.slice(i, i + windowSize);

    const processedChunk = await Promise.all(
      chunk.map(async (reqItem, offset) => {
        const index = i + offset;
        const itemFmt = String(reqItem.format || format).toLowerCase();
        const itemQuality = String(reqItem.quality || quality);
        const itemStart = reqItem.start || '';
        const itemEnd = reqItem.end || '';

        try {
          let media =
            getCachedMedia(reqItem.id, Boolean(sessionId)) ||
            (await extractMedia(reqItem.url || reqItem.id, { sessionId }));

          // Direct fast CDN download when progressive & no trim/audio conversion needed
          if (
            canDirectStream(media, {
              format: itemFmt,
              quality: itemQuality,
              start: itemStart,
              end: itemEnd,
            })
          ) {
            let upstream = await fetch(media.directProgressiveUrl || media.videoUrl, {
              headers: {
                'User-Agent': CHROME_UA,
                Referer: media.platform === 'instagram' ? 'https://www.instagram.com/' : media.url,
              },
            });
            if (upstream.status === 403 || upstream.status === 410) {
              media = await extractMedia(media.url, { sessionId, bypassCache: true });
              upstream = await fetch(media.directProgressiveUrl || media.videoUrl, {
                headers: { 'User-Agent': CHROME_UA },
              });
            }
            if (!upstream.ok || !upstream.body) {
              return { error: `HTTP ${upstream.status}`, id: media.id };
            }
            const buffer = Buffer.from(await upstream.arrayBuffer());
            return {
              filename: getUniqueFilename(media, 'mp4', index),
              buffer,
            };
          }

          // Processed via yt-dlp + ffmpeg (HD YouTube muxing, MP3/M4A/FLAC/WAV, or Clipping)
          const prepared = await prepareMediaFile(media, {
            format: itemFmt,
            quality: itemQuality,
            start: itemStart,
            end: itemEnd,
            template,
            index,
          });
          return {
            filename: getUniqueFilename(media, prepared.ext, index),
            filePath: prepared.filePath,
            token: prepared.token,
          };
        } catch (err) {
          return { error: err?.message || 'Failed', id: reqItem.id || reqItem.url };
        }
      })
    );

    for (const entry of processedChunk) {
      if (aborted) {
        if (entry.token) cleanupPreparedFile(entry.token);
        continue;
      }
      if (entry.buffer) {
        archive.append(entry.buffer, { name: entry.filename, store: true });
      } else if (entry.filePath) {
        await new Promise((resolve) => {
          const rs = fs.createReadStream(entry.filePath);
          archive.append(rs, { name: entry.filename, store: isAudioFormat(entry.filename.split('.').pop()) || true });
          rs.on('close', () => {
            cleanupPreparedFile(entry.token);
            resolve();
          });
          rs.on('error', () => {
            cleanupPreparedFile(entry.token);
            resolve();
          });
        });
      } else if (entry.error) {
        failedItems.push(entry);
      }
    }
  }

  if (failedItems.length > 0 && !aborted) {
    const report = failedItems.map((f) => `${f.id}: ${f.error}`).join('\n');
    archive.append(Buffer.from(`Some items could not be downloaded:\n\n${report}\n`), {
      name: '_download_errors.txt',
    });
  }

  if (!aborted) {
    await archive.finalize();
  }
});

// Serve built React app in production
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 ReelJet Studio server listening on http://localhost:${PORT}\n`);
});
