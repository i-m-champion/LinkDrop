import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { YTDLP_BIN, getEngineCapabilities } from './binaries.js';
import { detectPlatform, normalizeMediaUrl, parseMediaUrls, formatMediaFilename } from './platforms.js';

const execFileAsync = promisify(execFile);

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 20 * 60 * 1000;
const cache = new Map();

// Re-export helpers for convenience & backward compatibility
export { parseMediaUrls, formatMediaFilename };
export function parseInstagramUrls(rawInput = '') {
  return parseMediaUrls(rawInput).filter((i) => i.platform === 'instagram');
}
export function formatFilename(meta, template = 'user_shortcode', index = 0) {
  return formatMediaFilename(meta, template, index, 'mp4', false);
}

function decodeDurationFromVideoUrl(videoUrl) {
  try {
    const u = new URL(videoUrl);
    const efg = u.searchParams.get('efg');
    if (efg) {
      const json = JSON.parse(Buffer.from(efg, 'base64').toString('utf8'));
      if (typeof json.duration_s === 'number' && json.duration_s > 0) {
        return json.duration_s;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function parseDashDurationSeconds(dashXml) {
  if (!dashXml || typeof dashXml !== 'string') return null;
  const m = dashXml.match(/mediaPresentationDuration="PT(?:(\d+)H)?(?:(\d+)M)?([\d.]+)S"/);
  if (!m) return null;
  return Math.round(Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0));
}

function normalizeIgMediaObject(media, id, shortcode, method) {
  const versions = Array.isArray(media.video_versions) ? media.video_versions : [];
  const sortedVersions = [...versions].sort((a, b) => {
    const areaA = (a.width || 0) * (a.height || 0);
    const areaB = (b.width || 0) * (b.height || 0);
    if (areaB !== areaA) return areaB - areaA;
    return (a.type || 999) - (b.type || 999);
  });

  const videoUrl = sortedVersions[0]?.url || media.video_url || null;
  if (!videoUrl) return null;

  const candidates = media.image_versions2?.candidates || [];
  const sortedThumbs = [...candidates].sort(
    (a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0)
  );
  const thumbnailUrl =
    sortedThumbs[0]?.url || media.display_uri || media.display_url || media.thumbnail_src || null;

  const user = media.user || media.owner || {};
  const captionText =
    typeof media.caption === 'string'
      ? media.caption
      : media.caption?.text || media.edge_media_to_caption?.edges?.[0]?.node?.text || '';

  const duration =
    media.video_duration ||
    parseDashDurationSeconds(media.video_dash_manifest) ||
    decodeDurationFromVideoUrl(videoUrl) ||
    null;

  const musicInfo = media.clips_metadata?.music_info?.music_asset_info;
  const origAudio = media.clips_metadata?.original_sound_info;
  const audioTitle = musicInfo
    ? `${musicInfo.title}${musicInfo.display_artist ? ` — ${musicInfo.display_artist}` : ''}`
    : origAudio?.original_audio_title || null;

  const width = media.original_width || media.dimensions?.width || sortedVersions[0]?.width || 1080;
  const height = media.original_height || media.dimensions?.height || sortedVersions[0]?.height || 1920;
  const shortTitle = captionText.split(/\r?\n/)[0]?.trim().slice(0, 80) || `Instagram Reel ${shortcode}`;

  return {
    id,
    shortcode,
    platform: 'instagram',
    url: `https://www.instagram.com/reel/${shortcode}/`,
    title: shortTitle,
    videoUrl,
    directProgressiveUrl: videoUrl,
    thumbnailUrl,
    username: user.username || 'instagram_user',
    fullName: user.full_name || '',
    caption: captionText,
    width,
    height,
    duration,
    qualities: [Math.min(width, height) >= 1080 ? 1080 : 720, 480].filter((v, i, a) => a.indexOf(v) === i),
    likeCount: media.like_count ?? media.edge_media_preview_like?.count ?? null,
    commentCount: media.comment_count ?? media.edge_media_to_comment?.count ?? null,
    viewCount: media.play_count ?? media.video_view_count ?? null,
    hasAudio: media.has_audio !== false,
    audioTitle,
    subtitleLangs: [],
    method,
  };
}

function findMediaInObject(root, targetShortcode) {
  let gatingError = null;
  let foundMedia = null;
  const stack = [root];
  const visited = new Set();

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object' || visited.has(node)) continue;
    visited.add(node);

    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) stack.push(node[i]);
      continue;
    }

    if (node.gating_ruling && node.if_not_gated_logged_out === null) {
      gatingError =
        node.gating_ruling.title ||
        node.gating_ruling.description ||
        'This reel is age-restricted or requires login.';
    }

    if (
      (Array.isArray(node.video_versions) && node.video_versions.length > 0) ||
      typeof node.video_url === 'string'
    ) {
      if (!node.code || node.code === targetShortcode || !foundMedia) {
        foundMedia = node;
        if (node.code === targetShortcode) break;
      }
    }

    for (const key of Object.keys(node)) {
      const val = node[key];
      if (val && typeof val === 'object') stack.push(val);
    }
  }

  return { foundMedia, gatingError };
}

function buildCookieString(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return '';
  const cleaned = sessionId.trim();
  if (!cleaned) return '';
  return cleaned.includes('sessionid=') ? cleaned : `sessionid=${cleaned}`;
}

async function extractIgFast(id, shortcode, sessionId, signal) {
  const headers = {
    'User-Agent': CHROME_UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
  };
  const cookie = buildCookieString(sessionId);
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`https://www.instagram.com/reel/${shortcode}/`, {
    headers,
    redirect: 'follow',
    signal,
  });

  if (!res.ok) throw new Error(`Instagram returned HTTP ${res.status}`);

  const html = await res.text();
  const cookies = (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]);
  const lsd =
    html.match(/\["LSD",\[\],\{"token":"([^"]+)"\}/)?.[1] ||
    html.match(/"lsd":"([^"]+)"/)?.[1] ||
    '';
  const csrf =
    html.match(/"csrf_token":"([^"]+)"/)?.[1] ||
    cookies.find((c) => c.startsWith('csrftoken='))?.split('=')[1] ||
    '';

  const scripts = [...html.matchAll(/<script[^>]*data-sjs[^>]*>(.*?)<\/script>/gs)].map((m) => m[1]);
  let gatingError = null;

  for (const scriptContent of scripts) {
    if (
      !scriptContent.includes('video_versions') &&
      !scriptContent.includes('video_url') &&
      !scriptContent.includes('gating_ruling')
    ) {
      continue;
    }
    try {
      const { foundMedia, gatingError: gErr } = findMediaInObject(JSON.parse(scriptContent), shortcode);
      if (gErr) gatingError = gErr;
      if (foundMedia) {
        const normalized = normalizeIgMediaObject(foundMedia, id, shortcode, 'ig-ssr');
        if (normalized) return { media: normalized, lsd, csrf, cookies };
      }
    } catch {
      // ignore
    }
  }

  if (gatingError) {
    const err = new Error(`${gatingError} Add your Instagram sessionid in Studio Settings.`);
    err.code = 'GATED';
    throw err;
  }

  if (html.includes('Sorry, this page isn') || html.includes('Page Not Found')) {
    const err = new Error('Reel not found, deleted, or private.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Fallback GraphQL
  const docIds = ['8845758582119845', '10015901848480474'];
  const cookieParts = [...cookies];
  if (cookie) cookieParts.push(cookie);
  for (const docId of docIds) {
    try {
      const body = new URLSearchParams({
        lsd,
        variables: JSON.stringify({
          shortcode,
          fetch_tagged_user_count: null,
          hoisted_comment_id: null,
          hoisted_reply_id: null,
        }),
        doc_id: docId,
        fb_api_req_friendly_name: 'PolarisPostActionLoadPostQueryQuery',
      });
      const r = await fetch('https://www.instagram.com/graphql/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': CHROME_UA,
          'X-CSRFToken': csrf,
          'X-FB-LSD': lsd,
          'X-IG-App-ID': '936619743392459',
          Origin: 'https://www.instagram.com',
          Referer: `https://www.instagram.com/reel/${shortcode}/`,
          ...(cookieParts.length ? { Cookie: cookieParts.join('; ') } : {}),
        },
        body,
        signal,
      });
      if (!r.ok) continue;
      const json = await r.json();
      const raw =
        json?.data?.xdt_shortcode_media ||
        json?.data?.shortcode_media ||
        json?.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0];
      if (raw) {
        const normalized = normalizeIgMediaObject(raw, id, shortcode, 'ig-graphql');
        if (normalized) return { media: normalized };
      }
    } catch {
      // ignore
    }
  }

  return { media: null };
}

/**
 * Extract rich metadata for YouTube, TikTok, X, Reddit, Facebook, Vimeo, etc. via yt-dlp.
 */
async function extractViaYtDlp(item) {
  const caps = await getEngineCapabilities();
  if (!caps.ytDlpAvailable) {
    throw new Error('yt-dlp is required on the server to extract videos from this platform.');
  }

  const args = [
    '-J',
    '--no-playlist',
    '--no-warnings',
    '--skip-download',
    item.url,
  ];

  const { stdout } = await execFileAsync(YTDLP_BIN, args, {
    timeout: 30000,
    maxBuffer: 25 * 1024 * 1024,
  });

  const info = JSON.parse(stdout);
  const formats = Array.isArray(info.formats) ? info.formats : [];

  // Progressive MP4 (video + audio together) for instant HTML5 <video> preview & fast streaming
  const progressiveMp4s = formats
    .filter(
      (f) =>
        f.ext === 'mp4' &&
        f.vcodec &&
        f.vcodec !== 'none' &&
        f.acodec &&
        f.acodec !== 'none' &&
        f.url
    )
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  // All available video heights (including adaptive DASH streams that ffmpeg muxes!)
  const heightsSet = new Set();
  for (const f of formats) {
    if (f.vcodec && f.vcodec !== 'none' && f.height && f.height >= 144) {
      // Bucket standard resolutions cleanly
      const h = f.height;
      if (h >= 2100) heightsSet.add(2160);
      else if (h >= 1400) heightsSet.add(1440);
      else if (h >= 1000) heightsSet.add(1080);
      else if (h >= 700) heightsSet.add(720);
      else if (h >= 460) heightsSet.add(480);
      else if (h >= 340) heightsSet.add(360);
    }
  }
  const qualities = [...heightsSet].sort((a, b) => b - a);
  if (qualities.length === 0 && info.height) qualities.push(info.height);

  // Estimate best file size for default best MP4
  const bestVideo = formats
    .filter((f) => f.vcodec && f.vcodec !== 'none')
    .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0))[0];
  const bestAudio = formats
    .filter((f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
    .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

  const estimatedSize =
    progressiveMp4s[0]?.filesize ||
    progressiveMp4s[0]?.filesize_approx ||
    ((bestVideo?.filesize || bestVideo?.filesize_approx || 0) +
      (bestAudio?.filesize || bestAudio?.filesize_approx || 0)) ||
    info.filesize ||
    info.filesize_approx ||
    null;

  // Subtitles languages
  const manualSubs = Object.keys(info.subtitles || {});
  const autoSubs = Object.keys(info.automatic_captions || {});
  const subtitleLangs = [...new Set([...manualSubs, ...autoSubs.filter((l) => l.startsWith('en'))])].slice(
    0,
    12
  );

  // Best thumbnail
  const thumbs = Array.isArray(info.thumbnails) ? info.thumbnails : [];
  const bestThumb =
    info.thumbnail ||
    thumbs
      .filter((t) => t.url)
      .sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0))[0]?.url ||
    null;

  const platform = item.platform || detectPlatform(item.url);

  return {
    id: item.id,
    shortcode: item.shortcode || null,
    videoId: info.id || item.videoId || item.id,
    platform,
    url: info.webpage_url || item.url,
    title: info.title || info.fulltitle || 'Untitled Video',
    videoUrl: progressiveMp4s[0]?.url || bestVideo?.url || info.url || null,
    directProgressiveUrl: progressiveMp4s[0]?.url || null,
    thumbnailUrl: bestThumb,
    username: info.uploader_id || info.channel || info.uploader || platform,
    fullName: info.uploader || info.channel || '',
    caption: info.description || info.title || '',
    width: bestVideo?.width || info.width || 1920,
    height: bestVideo?.height || info.height || 1080,
    duration: info.duration ? Math.round(info.duration) : null,
    qualities: qualities.length ? qualities : [1080, 720, 480],
    likeCount: info.like_count ?? null,
    commentCount: info.comment_count ?? null,
    viewCount: info.view_count ?? null,
    hasAudio: true,
    audioTitle: info.track ? `${info.track}${info.artist ? ` — ${info.artist}` : ''}` : null,
    subtitleLangs,
    fileSize: estimatedSize ? Number(estimatedSize) : null,
    method: 'yt-dlp',
  };
}

async function probeFileSize(videoUrl) {
  if (!videoUrl) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(videoUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': CHROME_UA },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const len = res.headers.get('content-length');
    return len ? Number(len) : null;
  } catch {
    return null;
  }
}

/**
 * Expand a playlist or channel URL into individual media items.
 */
export async function expandPlaylist(playlistUrl, limit = 30) {
  const caps = await getEngineCapabilities();
  if (!caps.ytDlpAvailable) {
    throw new Error('yt-dlp is required to expand playlists.');
  }

  const maxItems = Math.max(1, Math.min(Number(limit) || 30, 50));
  const { stdout } = await execFileAsync(
    YTDLP_BIN,
    ['--flat-playlist', '--playlist-end', String(maxItems), '-J', '--no-warnings', playlistUrl],
    { timeout: 30000, maxBuffer: 25 * 1024 * 1024 }
  );

  const json = JSON.parse(stdout);
  const entries = Array.isArray(json.entries) ? json.entries : [];
  const items = [];

  for (const entry of entries) {
    const rawUrl =
      entry.webpage_url ||
      entry.url ||
      (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : null);
    if (!rawUrl) continue;
    const normalized = normalizeMediaUrl(rawUrl);
    if (normalized) {
      items.push({
        ...normalized,
        hintTitle: entry.title || null,
        hintDuration: entry.duration || null,
      });
    }
  }

  return {
    title: json.title || 'Playlist',
    uploader: json.uploader || json.channel || null,
    count: items.length,
    items,
  };
}

/**
 * Universal extractor: fast SSR path for Instagram, yt-dlp engine for YouTube & all other platforms.
 */
export async function extractMedia(itemOrUrl, { sessionId = '', bypassCache = false } = {}) {
  const item =
    typeof itemOrUrl === 'string'
      ? normalizeMediaUrl(itemOrUrl)
      : itemOrUrl?.id
        ? itemOrUrl
        : normalizeMediaUrl(itemOrUrl?.url || '');

  if (!item) {
    throw new Error('Invalid or unsupported media URL.');
  }

  const cacheKey = `${item.id}:${sessionId ? 'auth' : 'anon'}`;
  const cached = cache.get(cacheKey);
  if (!bypassCache && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28000);

  try {
    let media = null;

    if (item.platform === 'instagram' && item.shortcode) {
      try {
        const res = await extractIgFast(item.id, item.shortcode, sessionId, controller.signal);
        media = res.media;
      } catch (err) {
        if (err.code === 'GATED' || err.code === 'NOT_FOUND') {
          throw err;
        }
      }
      if (!media) {
        media = await extractViaYtDlp(item).catch(() => null);
      }
      if (media && !media.fileSize && media.videoUrl) {
        media.fileSize = await probeFileSize(media.videoUrl);
      }
    } else {
      media = await extractViaYtDlp(item);
    }

    if (!media) {
      throw new Error('Could not extract media stream from this URL.');
    }

    const enriched = {
      ...media,
      extractMs: Date.now() - startedAt,
      cached: false,
    };

    cache.set(cacheKey, { ts: Date.now(), data: enriched });
    if (enriched.shortcode && enriched.shortcode !== enriched.id) {
      cache.set(`${enriched.shortcode}:${sessionId ? 'auth' : 'anon'}`, {
        ts: Date.now(),
        data: enriched,
      });
    }
    return enriched;
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractReel(shortcode, opts = {}) {
  return extractMedia(`https://www.instagram.com/reel/${shortcode}/`, opts);
}

export function getCachedMedia(id, hasSession = false) {
  const entry =
    cache.get(`${id}:${hasSession ? 'auth' : 'anon'}`) ||
    cache.get(`${id}:anon`) ||
    cache.get(`${id}:auth`);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

export const getCachedReel = getCachedMedia;

export async function runWithConcurrency(items, concurrency = 5, workerFn) {
  const limit = Math.max(1, Math.min(Number(concurrency) || 5, 10));
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) break;
      results[idx] = await workerFn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
