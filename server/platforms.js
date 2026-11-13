import crypto from 'node:crypto';

export const PLATFORM_META = {
  instagram: { id: 'instagram', label: 'Instagram', folder: 'Instagram' },
  youtube: { id: 'youtube', label: 'YouTube', folder: 'YouTube' },
  tiktok: { id: 'tiktok', label: 'TikTok', folder: 'TikTok' },
  twitter: { id: 'twitter', label: 'X / Twitter', folder: 'X-Twitter' },
  facebook: { id: 'facebook', label: 'Facebook', folder: 'Facebook' },
  reddit: { id: 'reddit', label: 'Reddit', folder: 'Reddit' },
  pinterest: { id: 'pinterest', label: 'Pinterest', folder: 'Pinterest' },
  vimeo: { id: 'vimeo', label: 'Vimeo', folder: 'Vimeo' },
  twitch: { id: 'twitch', label: 'Twitch', folder: 'Twitch' },
  web: { id: 'web', label: 'Web Video', folder: 'Other' },
};

export function detectPlatform(rawUrl = '') {
  const lower = String(rawUrl).toLowerCase();
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'instagram';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
  if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com'))
    return 'facebook';
  if (lower.includes('reddit.com') || lower.includes('redd.it') || lower.includes('v.redd.it'))
    return 'reddit';
  if (lower.includes('pinterest.') || lower.includes('pin.it')) return 'pinterest';
  if (lower.includes('vimeo.com')) return 'vimeo';
  if (lower.includes('twitch.tv')) return 'twitch';
  return 'web';
}

export function stableItemId(canonicalUrl) {
  return crypto.createHash('sha1').update(canonicalUrl).digest('hex').slice(0, 14);
}

/**
 * Normalize a single matched URL into canonical URL, unique key, shortcode (if IG), and playlist flag.
 */
export function normalizeMediaUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let trimmed = rawUrl.trim().replace(/[),.;!?]+$/, '');

  // Support YouTube ID with yt_ prefix
  if (/^yt_[A-Za-z0-9_-]{6,25}$/.test(trimmed)) {
    const vid = trimmed.slice(3);
    const canonical = `https://www.youtube.com/watch?v=${vid}`;
    return {
      id: trimmed,
      videoId: vid,
      platform: 'youtube',
      url: canonical,
      originalUrl: canonical,
      isPlaylist: false,
    };
  }

  // Support direct Instagram shortcode (e.g. DQRZIlnj03i)
  if (/^[A-Za-z0-9_-]{9,35}$/.test(trimmed)) {
    const canonical = `https://www.instagram.com/reel/${trimmed}/`;
    return {
      id: trimmed,
      shortcode: trimmed,
      platform: 'instagram',
      url: canonical,
      originalUrl: canonical,
      isPlaylist: false,
    };
  }

  let withProto = trimmed;
  if (!/^https?:\/\//i.test(withProto)) {
    withProto = `https://${withProto}`;
  }

  let parsed;
  try {
    parsed = new URL(withProto);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  // Must have a real TLD or known domain
  if (!host.includes('.')) return null;

  const platform = detectPlatform(withProto);

  // Instagram specific normalization
  if (platform === 'instagram') {
    const igMatch = parsed.pathname.match(
      /(?:\/[A-Za-z0-9._]+)?\/(reel|reels|p|tv)\/([A-Za-z0-9_-]{5,30})/i
    );
    if (igMatch) {
      const shortcode = igMatch[2];
      const canonical = `https://www.instagram.com/reel/${shortcode}/`;
      return {
        id: shortcode,
        shortcode,
        platform: 'instagram',
        url: canonical,
        originalUrl: withProto,
        isPlaylist: false,
      };
    }
    // Stories or other IG links
    const canonical = `${parsed.origin}${parsed.pathname}`;
    return {
      id: stableItemId(canonical),
      shortcode: null,
      platform: 'instagram',
      url: canonical,
      originalUrl: withProto,
      isPlaylist: false,
    };
  }

  // YouTube specific normalization & playlist detection
  if (platform === 'youtube') {
    const listParam = parsed.searchParams.get('list');
    const vParam = parsed.searchParams.get('v');
    const isPlaylistPage =
      parsed.pathname === '/playlist' ||
      (!vParam && Boolean(listParam)) ||
      /\/(videos|shorts|streams)$/.test(parsed.pathname);

    if (host === 'youtu.be') {
      const vid = parsed.pathname.replace(/^\/+/, '').split('/')[0];
      if (vid) {
        const canonical = `https://www.youtube.com/watch?v=${vid}`;
        return {
          id: `yt_${vid}`,
          videoId: vid,
          platform: 'youtube',
          url: canonical,
          originalUrl: withProto,
          isPlaylist: false,
          playlistUrl: listParam ? `https://www.youtube.com/playlist?list=${listParam}` : null,
        };
      }
    }

    const shortsMatch = parsed.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{6,20})/);
    if (shortsMatch) {
      const vid = shortsMatch[1];
      const canonical = `https://www.youtube.com/shorts/${vid}`;
      return {
        id: `yt_${vid}`,
        videoId: vid,
        platform: 'youtube',
        url: canonical,
        originalUrl: withProto,
        isPlaylist: false,
      };
    }

    if (vParam && !parsed.pathname.startsWith('/playlist')) {
      const canonical = `https://www.youtube.com/watch?v=${vParam}`;
      return {
        id: `yt_${vParam}`,
        videoId: vParam,
        platform: 'youtube',
        url: canonical,
        originalUrl: withProto,
        isPlaylist: false,
        playlistUrl: listParam ? `https://www.youtube.com/playlist?list=${listParam}` : null,
      };
    }

    if (listParam) {
      const canonical = `https://www.youtube.com/playlist?list=${listParam}`;
      return {
        id: `ytpl_${listParam}`,
        platform: 'youtube',
        url: canonical,
        originalUrl: withProto,
        isPlaylist: true,
      };
    }

    const canonical = `${parsed.origin}${parsed.pathname}${parsed.search}`;
    return {
      id: stableItemId(canonical),
      platform: 'youtube',
      url: canonical,
      originalUrl: withProto,
      isPlaylist: isPlaylistPage,
    };
  }

  // Generic normalization for TikTok, X, Facebook, Reddit, Vimeo, Pinterest, Twitch, Web
  const cleanSearch =
    platform === 'facebook' || platform === 'web' ? parsed.search : '';
  const canonical = `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}${cleanSearch}`;

  return {
    id: stableItemId(canonical),
    platform,
    url: canonical,
    originalUrl: withProto,
    isPlaylist: false,
  };
}

/**
 * Extract all valid video/audio URLs across supported platforms from raw text.
 */
export function parseMediaUrls(rawInput = '') {
  if (!rawInput || typeof rawInput !== 'string') return [];

  // Match explicit http(s) URLs OR bare known domain URLs (instagram.com/..., youtu.be/..., tiktok.com/..., x.com/...)
  const regex =
    /(?:https?:\/\/[^\s"'<>]+)|(?:(?:www\.|m\.)?(?:instagram\.com|instagr\.am|youtube\.com|youtu\.be|tiktok\.com|twitter\.com|x\.com|facebook\.com|fb\.watch|reddit\.com|redd\.it|pinterest\.com|pin\.it|vimeo\.com|twitch\.tv)\/[^\s"'<>]+)/gi;

  const seen = new Set();
  const results = [];

  let match;
  while ((match = regex.exec(rawInput)) !== null) {
    const item = normalizeMediaUrl(match[0]);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    results.push(item);
  }

  return results;
}

export function sanitizeFilenamePart(str = '') {
  return String(str)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '')
    .slice(0, 64);
}

export function formatMediaFilename(
  meta,
  template = 'title_id',
  index = 0,
  ext = 'mp4',
  groupByPlatform = false
) {
  const safeExt = String(ext || 'mp4').replace(/[^a-z0-9]/gi, '') || 'mp4';
  const rawId = meta.shortcode || meta.videoId || meta.id || 'media';
  const idPart = sanitizeFilenamePart(rawId).slice(0, 20);
  const userPart = sanitizeFilenamePart(meta.username || meta.uploader || meta.platform || 'creator');
  const titleSource = meta.title || (meta.caption || '').split(/\r?\n/)[0].replace(/#\S+/g, '').trim();
  const titlePart = sanitizeFilenamePart(titleSource);
  const num = String(index + 1).padStart(2, '0');

  let base;
  switch (template) {
    case 'numbered_title':
      base = titlePart ? `${num}_${titlePart}_${idPart}` : `${num}_${userPart}_${idPart}`;
      break;
    case 'user_id':
    case 'user_shortcode':
      base = `${userPart}_${idPart}`;
      break;
    case 'numbered_user':
      base = `${num}_${userPart}_${idPart}`;
      break;
    case 'id_only':
    case 'shortcode':
      base = idPart;
      break;
    case 'caption_shortcode':
    case 'title_id':
    default:
      base = titlePart ? `${titlePart}_${idPart}` : `${userPart}_${idPart}`;
      break;
  }

  const filename = `${base}.${safeExt}`;
  if (groupByPlatform) {
    const folder = PLATFORM_META[meta.platform]?.folder || 'Other';
    return `${folder}/${filename}`;
  }
  return filename;
}

export function parseTimeToSeconds(input) {
  if (input === null || input === undefined) return null;
  const str = String(input).trim();
  if (!str) return null;
  if (/^\d+(\.\d+)?$/.test(str)) return Number(str);
  const parts = str.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

