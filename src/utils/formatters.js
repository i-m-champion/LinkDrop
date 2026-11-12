export function parseClientInstagramUrls(rawInput = '') {
  if (!rawInput || typeof rawInput !== 'string') return [];
  const urlPattern =
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/(?:(?:[A-Za-z0-9._]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,30}))[^\s,;"'<>)]*/gi;

  const seen = new Set();
  const results = [];
  let match;
  while ((match = urlPattern.exec(rawInput)) !== null) {
    const shortcode = match[1];
    if (!shortcode || seen.has(shortcode)) continue;
    seen.add(shortcode);
    results.push({
      shortcode,
      url: `https://www.instagram.com/reel/${shortcode}/`,
    });
  }
  return results;
}

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
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export function formatCount(num) {
  if (num === null || num === undefined) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

export function buildDownloadFilename(item, template = 'user_shortcode', index = 0) {
  const clean = (s) =>
    String(s || '')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[_.-]+|[_.-]+$/g, '')
      .slice(0, 60);

  const code = clean(item.shortcode || 'reel');
  const user = clean(item.username || 'instagram');
  const cap = clean((item.caption || '').split(/\r?\n/)[0].replace(/#\S+/g, '').trim());
  const num = String(index + 1).padStart(2, '0');

  switch (template) {
    case 'numbered_user':
      return `${num}_${user}_${code}.mp4`;
    case 'caption_shortcode':
      return cap ? `${cap}_${code}.mp4` : `${user}_${code}.mp4`;
    case 'shortcode':
      return `${code}.mp4`;
    case 'user_shortcode':
    default:
      return `${user}_${code}.mp4`;
  }
}

