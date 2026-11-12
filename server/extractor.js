import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

let ytDlpAvailableCache = null;

async function isYtDlpAvailable() {
  if (ytDlpAvailableCache !== null) return ytDlpAvailableCache;
  try {
    await execFileAsync('yt-dlp', ['--version'], { timeout: 2500 });
    ytDlpAvailableCache = true;
  } catch {
    ytDlpAvailableCache = false;
  }
  return ytDlpAvailableCache;
}

/**
 * Parse raw user text containing 1 or more Instagram Reel / Post URLs.
 * Deduplicates by shortcode while preserving input order.
 */
export function parseInstagramUrls(rawInput = '') {
  if (!rawInput || typeof rawInput !== 'string') return [];

  // Match full URLs or bare instagram paths
  const urlPattern =
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/(?:(?:[A-Za-z0-9._]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,30}))[^\s,;"'<>)]*/gi;

  const seen = new Set();
  const results = [];

  let match;
  while ((match = urlPattern.exec(rawInput)) !== null) {
    const shortcode = match[1];
    if (!shortcode || seen.has(shortcode)) continue;
    seen.add(shortcode);

    let rawUrl = match[0];
    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `https://${rawUrl}`;
    }

    results.push({
      shortcode,
      url: `https://www.instagram.com/reel/${shortcode}/`,
      originalUrl: rawUrl,
    });
  }

  return results;
}

export function sanitizeFilenamePart(str = '') {
  return String(str)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '')
    .slice(0, 60);
}

export function formatFilename(meta, template = 'user_shortcode', index = 0) {
  const code = sanitizeFilenamePart(meta.shortcode || 'reel');
  const user = sanitizeFilenamePart(meta.username || 'instagram');
  const captionPart = sanitizeFilenamePart(
    (meta.caption || '')
      .split(/\r?\n/)[0]
      .replace(/#\S+/g, '')
      .trim()
  );
  const num = String(index + 1).padStart(2, '0');

  switch (template) {
    case 'numbered_user':
      return `${num}_${user}_${code}.mp4`;
    case 'caption_shortcode':
      return captionPart ? `${captionPart}_${code}.mp4` : `${user}_${code}.mp4`;
    case 'shortcode':
      return `${code}.mp4`;
    case 'user_shortcode':
    default:
      return `${user}_${code}.mp4`;
  }
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
  const hrs = Number(m[1] || 0);
  const mins = Number(m[2] || 0);
  const secs = Number(m[3] || 0);
  return Math.round(hrs * 3600 + mins * 60 + secs);
}

function normalizeMediaObject(media, shortcode, method) {
  const versions = Array.isArray(media.video_versions) ? media.video_versions : [];
  // Prefer highest resolution / type 101+ progressive mp4
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
    sortedThumbs[0]?.url ||
    media.display_uri ||
    media.display_url ||
    media.thumbnail_src ||
    null;

  const user = media.user || media.owner || {};
  const captionText =
    typeof media.caption === 'string'
      ? media.caption
      : media.caption?.text ||
        media.edge_media_to_caption?.edges?.[0]?.node?.text ||
        '';

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

  return {
    shortcode,
    url: `https://www.instagram.com/reel/${shortcode}/`,
    videoUrl,
    thumbnailUrl,
    username: user.username || 'instagram_user',
    fullName: user.full_name || '',
    avatarUrl: user.profile_pic_url || null,
    caption: captionText,
    width: media.original_width || media.dimensions?.width || sortedVersions[0]?.width || 1080,
    height: media.original_height || media.dimensions?.height || sortedVersions[0]?.height || 1920,
    duration,
    likeCount: media.like_count ?? media.edge_media_preview_like?.count ?? null,
    commentCount: media.comment_count ?? media.edge_media_to_comment?.count ?? null,
    playCount: media.play_count ?? media.video_view_count ?? null,
    takenAt: media.taken_at || media.taken_at_timestamp || null,
    hasAudio: media.has_audio !== false,
    audioTitle,
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
    if (!node || typeof node !== 'object') continue;
    if (visited.has(node)) continue;
    visited.add(node);

    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) {
        stack.push(node[i]);
      }
      continue;
    }

    // Detect explicit age/login gating messages
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
      if (val && typeof val === 'object') {
        stack.push(val);
      }
    }
  }

  return { foundMedia, gatingError };
}

function buildCookieString(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return '';
  const cleaned = sessionId.trim();
  if (!cleaned) return '';
  if (cleaned.includes('sessionid=')) return cleaned;
  return `sessionid=${cleaned}`;
}

async function extractViaSsrHtml(shortcode, sessionId, signal) {
  const headers = {
    'User-Agent': CHROME_UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1',
  };

  const cookie = buildCookieString(sessionId);
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`https://www.instagram.com/reel/${shortcode}/`, {
    headers,
    redirect: 'follow',
    signal,
  });

  if (!res.ok) {
    throw new Error(`Instagram returned HTTP ${res.status}`);
  }

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

  const scripts = [...html.matchAll(/<script[^>]*data-sjs[^>]*>(.*?)<\/script>/gs)].map(
    (m) => m[1]
  );

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
      const parsed = JSON.parse(scriptContent);
      const { foundMedia, gatingError: gErr } = findMediaInObject(parsed, shortcode);
      if (gErr) gatingError = gErr;
      if (foundMedia) {
        const normalized = normalizeMediaObject(foundMedia, shortcode, 'ssr-html');
        if (normalized) return { media: normalized, lsd, csrf, cookies };
      }
    } catch {
      // skip malformed script block
    }
  }

  // Detect unavailable / private / login wall
  if (gatingError) {
    const err = new Error(
      `${gatingError} Add your Instagram sessionid in Settings to unlock gated reels.`
    );
    err.code = 'GATED';
    throw err;
  }

  if (html.includes('Sorry, this page isn') || html.includes('Page Not Found')) {
    const err = new Error('Reel not found, deleted, or private.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  return { media: null, lsd, csrf, cookies };
}

async function extractViaGraphQL(shortcode, authContext, sessionId, signal) {
  const docIds = ['8845758582119845', '10015901848480474', '24368985919464652'];
  const cookieParts = [...(authContext?.cookies || [])];
  const userCookie = buildCookieString(sessionId);
  if (userCookie) cookieParts.push(userCookie);

  for (const docId of docIds) {
    try {
      const body = new URLSearchParams({
        lsd: authContext?.lsd || '',
        variables: JSON.stringify({
          shortcode,
          fetch_tagged_user_count: null,
          hoisted_comment_id: null,
          hoisted_reply_id: null,
        }),
        doc_id: docId,
        fb_api_req_friendly_name: 'PolarisPostActionLoadPostQueryQuery',
      });

      const res = await fetch('https://www.instagram.com/graphql/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': CHROME_UA,
          'X-CSRFToken': authContext?.csrf || '',
          'X-FB-LSD': authContext?.lsd || '',
          'X-IG-App-ID': '936619743392459',
          'X-ASBD-ID': '129477',
          'X-FB-Friendly-Name': 'PolarisPostActionLoadPostQueryQuery',
          Origin: 'https://www.instagram.com',
          Referer: `https://www.instagram.com/reel/${shortcode}/`,
          ...(cookieParts.length ? { Cookie: cookieParts.join('; ') } : {}),
        },
        body,
        signal,
      });

      if (!res.ok) continue;
      const json = await res.json();
      const raw =
        json?.data?.xdt_shortcode_media ||
        json?.data?.shortcode_media ||
        json?.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0];

      if (raw) {
        const normalized = normalizeMediaObject(raw, shortcode, 'graphql');
        if (normalized) return normalized;
      }
    } catch {
      // try next docId
    }
  }
  return null;
}

async function extractViaEmbed(shortcode, signal) {
  try {
    const res = await fetch(`https://www.instagram.com/reel/${shortcode}/embed/captioned/`, {
      headers: {
        'User-Agent': CHROME_UA,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal,
    });
    if (!res.ok) return null;
    const html = await res.text();

    const scripts = [...html.matchAll(/<script[^>]*data-sjs[^>]*>(.*?)<\/script>/gs)].map(
      (m) => m[1]
    );
    for (const s of scripts) {
      if (!s.includes('video_versions') && !s.includes('video_url')) continue;
      try {
        const { foundMedia } = findMediaInObject(JSON.parse(s), shortcode);
        if (foundMedia) {
          const normalized = normalizeMediaObject(foundMedia, shortcode, 'embed');
          if (normalized) return normalized;
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function extractViaYtDlp(shortcode) {
  if (!(await isYtDlpAvailable())) return null;
  try {
    const { stdout } = await execFileAsync(
      'yt-dlp',
      ['-j', '--no-warnings', `https://www.instagram.com/reel/${shortcode}/`],
      { timeout: 15000 }
    );
    const info = JSON.parse(stdout);
    const mp4Formats = (info.formats || []).filter(
      (f) => f.ext === 'mp4' && f.vcodec !== 'none' && f.acodec !== 'none' && f.url
    );
    const best = mp4Formats[mp4Formats.length - 1] || info;
    if (!best.url) return null;
    return {
      shortcode,
      url: `https://www.instagram.com/reel/${shortcode}/`,
      videoUrl: best.url,
      thumbnailUrl: info.thumbnail || null,
      username: info.uploader_id || info.uploader || 'instagram_user',
      fullName: info.uploader || '',
      avatarUrl: null,
      caption: info.description || info.title || '',
      width: best.width || info.width || 1080,
      height: best.height || info.height || 1920,
      duration: info.duration ? Math.round(info.duration) : null,
      likeCount: info.like_count ?? null,
      commentCount: info.comment_count ?? null,
      playCount: info.view_count ?? null,
      takenAt: info.timestamp ?? null,
      hasAudio: true,
      audioTitle: null,
      method: 'yt-dlp',
    };
  } catch {
    return null;
  }
}

async function probeFileSize(videoUrl) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
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
 * Extract a single Instagram Reel with caching and multi-strategy fallbacks.
 */
export async function extractReel(shortcode, { sessionId = '', bypassCache = false } = {}) {
  const cacheKey = `${shortcode}:${sessionId ? 'auth' : 'anon'}`;
  const cached = cache.get(cacheKey);
  if (!bypassCache && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  try {
    let media = null;
    let authContext = null;

    // Strategy 1: SSR HTML data-sjs extraction (fastest, ~500-1500ms)
    const ssrResult = await extractViaSsrHtml(shortcode, sessionId, controller.signal);
    authContext = ssrResult;
    if (ssrResult.media) {
      media = ssrResult.media;
    }

    // Strategy 2: GraphQL fallback
    if (!media) {
      media = await extractViaGraphQL(shortcode, authContext, sessionId, controller.signal);
    }

    // Strategy 3: Embed captioned fallback
    if (!media) {
      media = await extractViaEmbed(shortcode, controller.signal);
    }

    // Strategy 4: Optional yt-dlp binary fallback if installed
    if (!media) {
      media = await extractViaYtDlp(shortcode);
    }

    if (!media) {
      throw new Error(
        'Could not extract video stream. The post may be private, photo-only, or rate-limited.'
      );
    }

    const fileSize = await probeFileSize(media.videoUrl);
    const enriched = {
      ...media,
      fileSize,
      extractMs: Date.now() - startedAt,
      cached: false,
    };

    cache.set(cacheKey, { ts: Date.now(), data: enriched });
    return enriched;
  } finally {
    clearTimeout(timeout);
  }
}

export function getCachedReel(shortcode, hasSession = false) {
  const key = `${shortcode}:${hasSession ? 'auth' : 'anon'}`;
  const entry = cache.get(key) || cache.get(`${shortcode}:anon`) || cache.get(`${shortcode}:auth`);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

/**
 * Execute an async task across items with bounded concurrency.
 */
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

