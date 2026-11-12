import express from 'express';
import archiver from 'archiver';
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import {
  extractReel,
  formatFilename,
  getCachedReel,
  parseInstagramUrls,
  runWithConcurrency,
} from './extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const PORT = Number(process.env.PORT) || 3001;

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'reeljet-api', timestamp: Date.now() });
});

app.post('/api/parse', (req, res) => {
  const { input } = req.body || {};
  const items = parseInstagramUrls(input);
  res.json({ items, count: items.length });
});

/**
 * SSE endpoint: extracts multiple Instagram Reels in parallel and streams
 * per-item progress events to the browser in real time.
 */
app.post('/api/extract/batch', async (req, res) => {
  const { items = [], concurrency = 5, sessionId = '' } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No valid Instagram Reel links provided.' });
  }

  const normalizedItems = items
    .map((item) =>
      typeof item === 'string'
        ? parseInstagramUrls(item)[0]
        : item?.shortcode
          ? { shortcode: item.shortcode, url: item.url || `https://www.instagram.com/reel/${item.shortcode}/` }
          : null
    )
    .filter(Boolean)
    .slice(0, 100);

  if (normalizedItems.length === 0) {
    return res.status(400).json({ error: 'Could not find any valid Instagram shortcodes.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let closed = false;
  res.on('close', () => {
    if (!res.writableFinished) {
      closed = true;
    }
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
    sendEvent('item', { shortcode: item.shortcode, status: 'extracting' });

    try {
      const data = await extractReel(item.shortcode, { sessionId });
      succeeded++;
      completed++;
      sendEvent('item', {
        shortcode: item.shortcode,
        status: 'ready',
        data: {
          ...data,
          // Never expose ephemeral CDN URLs unnecessarily; client uses proxy endpoints + optional copy
          proxyThumbUrl: `/api/thumb/${encodeURIComponent(item.shortcode)}`,
          proxyVideoUrl: `/api/stream/${encodeURIComponent(item.shortcode)}`,
        },
        progress: { completed, total: normalizedItems.length, succeeded, failed },
      });
    } catch (err) {
      failed++;
      completed++;
      sendEvent('item', {
        shortcode: item.shortcode,
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
 * Proxy Instagram thumbnails to bypass Cross-Origin-Resource-Policy restrictions.
 */
app.get('/api/thumb/:shortcode', async (req, res) => {
  const { shortcode } = req.params;
  const sessionId = req.headers['x-ig-session'] || req.query.sessionId || '';

  try {
    let reel = getCachedReel(shortcode, Boolean(sessionId));
    if (!reel) {
      reel = await extractReel(shortcode, { sessionId });
    }
    if (!reel.thumbnailUrl) {
      return res.status(404).end();
    }

    const upstream = await fetch(reel.thumbnailUrl, {
      headers: { 'User-Agent': CHROME_UA, Referer: 'https://www.instagram.com/' },
    });

    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).end();
    }

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);

    Readable.fromWeb(upstream.body).pipe(res);
  } catch {
    res.status(404).end();
  }
});

/**
 * High-speed video streaming proxy (supports Range seeking for preview & attachment download).
 */
app.get('/api/stream/:shortcode', async (req, res) => {
  const { shortcode } = req.params;
  const { download, filename, sessionId = '' } = req.query;

  try {
    let reel = getCachedReel(shortcode, Boolean(sessionId));
    if (!reel) {
      reel = await extractReel(shortcode, { sessionId: String(sessionId) });
    }

    const headers = {
      'User-Agent': CHROME_UA,
      Referer: 'https://www.instagram.com/',
    };
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    let upstream = await fetch(reel.videoUrl, { headers });

    // If cached CDN URL expired, refresh once
    if (upstream.status === 403 || upstream.status === 410) {
      reel = await extractReel(shortcode, { sessionId: String(sessionId), bypassCache: true });
      upstream = await fetch(reel.videoUrl, { headers });
    }

    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).json({ error: 'Upstream video unavailable' });
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (download === '1' || download === 'true') {
      const safeName =
        typeof filename === 'string' && filename.trim()
          ? filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
          : formatFilename(reel);
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    }

    const nodeStream = Readable.fromWeb(upstream.body);
    res.on('close', () => {
      if (!res.writableFinished) {
        nodeStream.destroy();
      }
    });
    nodeStream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Failed to stream reel' });
    }
  }
});

/**
 * High-speed concurrent batch ZIP streamer.
 * Uses STORE mode (level 0) because MP4s are already compressed, delivering wire-speed bundling.
 */
app.post('/api/download-zip', async (req, res) => {
  const {
    shortcodes = [],
    template = 'user_shortcode',
    concurrency = 6,
    sessionId = '',
  } = req.body || {};

  if (!Array.isArray(shortcodes) || shortcodes.length === 0) {
    return res.status(400).json({ error: 'No reels selected for ZIP download.' });
  }

  const uniqueCodes = [...new Set(shortcodes.filter((c) => typeof c === 'string' && c.trim()))].slice(
    0,
    100
  );

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="reeljet-batch-${stamp}.zip"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const archive = archiver('zip', {
    zlib: { level: 0 }, // Store MP4s uncompressed for maximum throughput
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

  // Resolve metadata for all selected reels concurrently if not already cached
  const resolved = await runWithConcurrency(uniqueCodes, concurrency, async (code, index) => {
    if (aborted) return null;
    try {
      const reel =
        getCachedReel(code, Boolean(sessionId)) ||
        (await extractReel(code, { sessionId }));
      return { reel, index };
    } catch (err) {
      return { error: err?.message || 'Failed', code, index };
    }
  });

  const validItems = resolved.filter((r) => r && r.reel);
  const failedItems = resolved.filter((r) => r && r.error);

  const usedNames = new Set();
  const getUniqueFilename = (reel, idx) => {
    let base = formatFilename(reel, template, idx);
    if (!usedNames.has(base)) {
      usedNames.add(base);
      return base;
    }
    const ext = '.mp4';
    const stem = base.slice(0, -ext.length);
    let counter = 2;
    while (usedNames.has(`${stem}_${counter}${ext}`)) counter++;
    const finalName = `${stem}_${counter}${ext}`;
    usedNames.add(finalName);
    return finalName;
  };

  // Prefetch CDN streams in parallel windows so network bandwidth stays saturated
  const windowSize = Math.max(2, Math.min(Number(concurrency) || 6, 8));
  for (let i = 0; i < validItems.length; i += windowSize) {
    if (aborted) break;
    const chunk = validItems.slice(i, i + windowSize);

    const fetchedChunk = await Promise.all(
      chunk.map(async ({ reel, index }) => {
        try {
          let upstream = await fetch(reel.videoUrl, {
            headers: { 'User-Agent': CHROME_UA, Referer: 'https://www.instagram.com/' },
          });
          if (upstream.status === 403 || upstream.status === 410) {
            const refreshed = await extractReel(reel.shortcode, {
              sessionId,
              bypassCache: true,
            });
            upstream = await fetch(refreshed.videoUrl, {
              headers: { 'User-Agent': CHROME_UA, Referer: 'https://www.instagram.com/' },
            });
          }
          if (!upstream.ok || !upstream.body) {
            return { error: `HTTP ${upstream.status}`, code: reel.shortcode };
          }
          const buffer = Buffer.from(await upstream.arrayBuffer());
          return {
            filename: getUniqueFilename(reel, index),
            buffer,
          };
        } catch (err) {
          return { error: err?.message || 'Download failed', code: reel.shortcode };
        }
      })
    );

    for (const entry of fetchedChunk) {
      if (aborted) break;
      if (entry.buffer) {
        archive.append(entry.buffer, { name: entry.filename, store: true });
      } else {
        failedItems.push(entry);
      }
    }
  }

  if (failedItems.length > 0 && !aborted) {
    const report = failedItems
      .map((f) => `${f.code}: ${f.error}`)
      .join('\n');
    archive.append(Buffer.from(`Some reels could not be downloaded:\n\n${report}\n`), {
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
  console.log(`\n🚀 ReelJet server listening on http://localhost:${PORT}\n`);
});

