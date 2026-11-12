import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseInstagramUrls,
  parseMediaUrls,
  formatFilename,
  formatMediaFilename,
  runWithConcurrency,
} from '../server/extractor.js';
import { detectPlatform, parseTimeToSeconds } from '../server/platforms.js';

test('parseMediaUrls extracts, normalizes, and deduplicates mixed-platform links', () => {
  const messy = `
    Mixed links:
    https://www.instagram.com/reel/DTVTvUDj-b1/?igsh=abc123
    https://youtu.be/jNQXAC9IVRw?si=xyz
    https://www.youtube.com/watch?v=jNQXAC9IVRw
    https://www.youtube.com/shorts/AbCdEf12345
    https://www.youtube.com/playlist?list=PL1234567890
    https://www.tiktok.com/@creator/video/7281928371
    https://x.com/nasa/status/182910293
    duplicate ig -> https://www.instagram.com/reel/DTVTvUDj-b1/
  `;

  const parsed = parseMediaUrls(messy);
  assert.equal(parsed.length, 6);
  assert.deepEqual(
    parsed.map((p) => p.platform),
    ['instagram', 'youtube', 'youtube', 'youtube', 'tiktok', 'twitter']
  );
  assert.equal(parsed[1].url, 'https://www.youtube.com/watch?v=jNQXAC9IVRw');
  assert.equal(parsed[3].isPlaylist, true);
});

test('parseInstagramUrls keeps backward compatibility filtering IG links only', () => {
  const mixed = `
    https://www.instagram.com/reel/DTVTvUDj-b1/
    https://www.youtube.com/watch?v=jNQXAC9IVRw
    https://instagr.am/p/PostCode123/
  `;
  const igOnly = parseInstagramUrls(mixed);
  assert.equal(igOnly.length, 2);
  assert.deepEqual(
    igOnly.map((i) => i.shortcode),
    ['DTVTvUDj-b1', 'PostCode123']
  );
});

test('detectPlatform identifies major video platforms', () => {
  assert.equal(detectPlatform('https://youtu.be/abc'), 'youtube');
  assert.equal(detectPlatform('https://www.instagram.com/reel/xyz/'), 'instagram');
  assert.equal(detectPlatform('https://vm.tiktok.com/ZM123/'), 'tiktok');
  assert.equal(detectPlatform('https://x.com/user/status/123'), 'twitter');
  assert.equal(detectPlatform('https://vimeo.com/123456'), 'vimeo');
});

test('formatMediaFilename supports extensions, templates, and platform folders', () => {
  const meta = {
    id: 'yt_jNQXAC9IVRw',
    videoId: 'jNQXAC9IVRw',
    platform: 'youtube',
    username: 'jawed',
    title: 'Me at the zoo!',
  };

  assert.equal(
    formatMediaFilename(meta, 'title_id', 0, 'mp3', true),
    'YouTube/Me_at_the_zoo!_jNQXAC9IVRw.mp3'
  );
  assert.equal(
    formatMediaFilename(meta, 'numbered_title', 1, 'mp4', false),
    '02_Me_at_the_zoo!_jNQXAC9IVRw.mp4'
  );
  assert.equal(
    formatFilename({ shortcode: 'DTVTvUDj-b1', username: 'creator:1' }, 'user_shortcode', 0),
    'creator1_DTVTvUDj-b1.mp4'
  );
});

test('parseTimeToSeconds parses seconds, mm:ss, and hh:mm:ss cleanly', () => {
  assert.equal(parseTimeToSeconds('45'), 45);
  assert.equal(parseTimeToSeconds('01:30'), 90);
  assert.equal(parseTimeToSeconds('01:02:03'), 3723);
  assert.equal(parseTimeToSeconds(''), null);
  assert.equal(parseTimeToSeconds('bad'), null);
});

test('runWithConcurrency preserves output order while bounding active workers', async () => {
  const items = [10, 20, 30, 40, 50, 60];
  let active = 0;
  let maxActive = 0;

  const out = await runWithConcurrency(items, 3, async (val) => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((r) => setTimeout(r, 15));
    active--;
    return val * 2;
  });

  assert.deepEqual(out, [20, 40, 60, 80, 100, 120]);
  assert.ok(maxActive <= 3 && maxActive >= 2);
});
