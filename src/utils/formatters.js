export const PLATFORM_BADGES = {
  instagram: {
    label: 'Instagram',
    short: 'IG',
    pill: 'border-pink-500/35 bg-pink-500/15 text-pink-500 dark:text-pink-300',
  },
  youtube: {
    label: 'YouTube',
    short: 'YT',
    pill: 'border-rose-500/35 bg-rose-500/15 text-rose-600 dark:text-rose-300',
  },
  tiktok: {
    label: 'TikTok',
    short: 'TT',
    pill: 'border-cyan-500/35 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',
  },
  twitter: {
    label: 'X / Twitter',
    short: 'X',
    pill: 'border-slate-400/35 bg-slate-500/15 text-slate-600 dark:text-slate-300',
  },
  facebook: {
    label: 'Facebook',
    short: 'FB',
    pill: 'border-blue-500/35 bg-blue-500/15 text-blue-600 dark:text-blue-300',
  },
  reddit: {
    label: 'Reddit',
    short: 'RD',
    pill: 'border-orange-500/35 bg-orange-500/15 text-orange-600 dark:text-orange-300',
  },
  pinterest: {
    label: 'Pinterest',
    short: 'PIN',
    pill: 'border-red-500/35 bg-red-500/15 text-red-600 dark:text-red-300',
  },
  vimeo: {
    label: 'Vimeo',
    short: 'VM',
    pill: 'border-sky-500/35 bg-sky-500/15 text-sky-600 dark:text-sky-300',
  },
  twitch: {
    label: 'Twitch',
    short: 'TW',
    pill: 'border-purple-500/35 bg-purple-500/15 text-purple-600 dark:text-purple-300',
  },
  web: {
    label: 'Web',
    short: 'WEB',
    pill: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  },
};

export const FORMAT_PRESETS = [
  { id: 'mp4_best', label: 'Best MP4', format: 'mp4', quality: 'best', icon: '🎬' },
  { id: 'mp4_1080', label: '1080p HD', format: 'mp4', quality: '1080', icon: '📺' },
  { id: 'mp4_720', label: '720p Fast', format: 'mp4', quality: '720', icon: '⚡' },
  { id: 'mp3_audio', label: 'MP3 Audio', format: 'mp3', quality: 'best', icon: '🎵' },
  { id: 'm4a_audio', label: 'M4A Audio', format: 'm4a', quality: 'best', icon: '🎧' },
  { id: 'flac_audio', label: 'FLAC Lossless', format: 'flac', quality: 'best', icon: '💿' },
];

export function detectClientPlatform(rawUrl = '') {
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

function stableClientHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function normalizeClientMediaUrl(rawUrl) {
  let withProto = rawUrl.trim().replace(/[),.;!?]+$/, '');
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
  if (!host.includes('.')) return null;

  const platform = detectClientPlatform(withProto);

  if (platform === 'instagram') {
    const igMatch = parsed.pathname.match(
      /(?:\/[A-Za-z0-9._]+)?\/(reel|reels|p|tv)\/([A-Za-z0-9_-]{5,30})/i
    );
    if (igMatch) {
      const shortcode = igMatch[2];
      return {
        id: shortcode,
        shortcode,
        platform: 'instagram',
        url: `https://www.instagram.com/reel/${shortcode}/`,
        isPlaylist: false,
      };
    }
    const canonical = `${parsed.origin}${parsed.pathname}`;
    return {
      id: `ig_${stableClientHash(canonical)}`,
      shortcode: null,
      platform: 'instagram',
      url: canonical,
      isPlaylist: false,
    };
  }

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
        return {
          id: `yt_${vid}`,
          videoId: vid,
          platform: 'youtube',
          url: `https://www.youtube.com/watch?v=${vid}`,
          isPlaylist: false,
          playlistUrl: listParam ? `https://www.youtube.com/playlist?list=${listParam}` : null,
        };
      }
    }

    const shortsMatch = parsed.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{6,20})/);
    if (shortsMatch) {
      const vid = shortsMatch[1];
      return {
        id: `yt_${vid}`,
        videoId: vid,
        platform: 'youtube',
        url: `https://www.youtube.com/shorts/${vid}`,
        isPlaylist: false,
      };
    }

    if (vParam && !parsed.pathname.startsWith('/playlist')) {
      return {
        id: `yt_${vParam}`,
        videoId: vParam,
        platform: 'youtube',
        url: `https://www.youtube.com/watch?v=${vParam}`,
        isPlaylist: false,
        playlistUrl: listParam ? `https://www.youtube.com/playlist?list=${listParam}` : null,
      };
    }

    if (listParam) {
      return {
        id: `ytpl_${listParam}`,
        platform: 'youtube',
        url: `https://www.youtube.com/playlist?list=${listParam}`,
        isPlaylist: true,
      };
    }

    const canonical = `${parsed.origin}${parsed.pathname}${parsed.search}`;
    return {
      id: `yt_${stableClientHash(canonical)}`,
      platform: 'youtube',
      url: canonical,
      isPlaylist: isPlaylistPage,
    };
  }

  const cleanSearch = platform === 'facebook' || platform === 'web' ? parsed.search : '';
  const canonical = `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}${cleanSearch}`;
  return {
    id: `${platform}_${stableClientHash(canonical)}`,
    platform,
    url: canonical,
    isPlaylist: false,
  };
}

export function parseClientMediaUrls(rawInput = '') {
  if (!rawInput || typeof rawInput !== 'string') return [];
  const regex =
    /(?:https?:\/\/[^\s"'<>]+)|(?:(?:www\.|m\.)?(?:instagram\.com|instagr\.am|youtube\.com|youtu\.be|tiktok\.com|twitter\.com|x\.com|facebook\.com|fb\.watch|reddit\.com|redd\.it|pinterest\.com|pin\.it|vimeo\.com|twitch\.tv)\/[^\s"'<>]+)/gi;

  const seen = new Set();
  const results = [];
  let match;
  while ((match = regex.exec(rawInput)) !== null) {
    const item = normalizeClientMediaUrl(match[0]);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    results.push(item);
  }
  return results;
}

export const parseClientInstagramUrls = parseClientMediaUrls;

export function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let val = Number(bytes);
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return null;
  const s = Math.max(0, Math.round(Number(seconds)));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export function formatCount(num) {
  if (num === null || num === undefined) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

export function buildDownloadFilename(item, template = 'title_id', index = 0, ext = 'mp4') {
  const clean = (s) =>
    String(s || '')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[_.-]+|[_.-]+$/g, '')
      .slice(0, 64);

  const safeExt = String(ext || 'mp4').replace(/[^a-z0-9]/gi, '') || 'mp4';
  const idPart = clean(item.shortcode || item.videoId || item.id || 'media').slice(0, 20);
  const userPart = clean(item.username || item.platform || 'creator');
  const titleSource = item.title || (item.caption || '').split(/\r?\n/)[0].replace(/#\S+/g, '').trim();
  const titlePart = clean(titleSource);
  const num = String(index + 1).padStart(2, '0');

  switch (template) {
    case 'numbered_title':
      return `${num}_${titlePart || userPart}_${idPart}.${safeExt}`;
    case 'user_id':
    case 'user_shortcode':
      return `${userPart}_${idPart}.${safeExt}`;
    case 'numbered_user':
      return `${num}_${userPart}_${idPart}.${safeExt}`;
    case 'id_only':
    case 'shortcode':
      return `${idPart}.${safeExt}`;
    case 'caption_shortcode':
    case 'title_id':
    default:
      return `${titlePart || userPart}_${idPart}.${safeExt}`;
  }
}

export async function downloadViaPrepareSSE(
  item,
  { format = 'mp4', quality = 'best', start = '', end = '', template = 'title_id', filename = '', sessionId = '', onProgress }
) {
  const params = new URLSearchParams({
    format,
    quality,
    template,
  });
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  if (filename) params.set('filename', filename);
  if (item.url) params.set('url', item.url);
  if (sessionId) params.set('sessionId', sessionId);

  const res = await fetch(`/api/prepare/${encodeURIComponent(item.id)}?${params.toString()}`);
  if (!res.ok || !res.body) {
    throw new Error(`Preparation failed (HTTP ${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalPayload = null;

  const parseBlock = (block) => {
    const lines = block.split('\n');
    let evt = 'message';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event:')) evt = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) return;
    const parsed = JSON.parse(data);
    if (evt === 'progress') onProgress?.(parsed);
    else if (evt === 'ready') finalPayload = parsed;
    else if (evt === 'error') throw new Error(parsed.error || 'Download failed');
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';
    for (const block of blocks) {
      if (block.trim()) parseBlock(block);
    }
  }
  if (buffer.trim()) parseBlock(buffer);

  if (!finalPayload?.downloadUrl) {
    throw new Error('Download URL was not generated.');
  }

  const a = document.createElement('a');
  a.href = finalPayload.downloadUrl;
  a.download = finalPayload.filename || filename || 'media';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return finalPayload;
}
