import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseInstagramUrls,
  formatFilename,
  runWithConcurrency,
} from '../server/extractor.js';

test('parseInstagramUrls extracts, normalizes, and deduplicates multiple reel/post links', () => {
  const messy = `
    Check these out:
    https://www.instagram.com/reel/DTVTvUDj-b1/?igsh=abc123
    instagram.com/reels/XYZ987abc/
    https://www.instagram.com/nasa/reel/C999aaa111/
    duplicate -> https://www.instagram.com/reel/DTVTvUDj-b1/
    https://instagr.am/p/PostCode123/
  `;

  const parsed = parseInstagramUrls(messy);
  assert.equal(parsed.length, 4);
  assert.deepEqual(
    parsed.map((p) => p.shortcode),
    ['DTVTvUDj-b1', 'XYZ987abc', 'C999aaa111', 'PostCode123']
  );
  assert.equal(parsed[0].url, 'https://www.instagram.com/reel/DTVTvUDj-b1/');
});

test('formatFilename supports all templates and sanitizes unsafe characters', () => {
  const meta = {
    shortcode: 'DTVTvUDj-b1',
    username: 'creator:name/1',
    caption: 'Hello World! #reels #viral\nSecond line',
  };

  assert.equal(formatFilename(meta, 'user_shortcode', 0), 'creatorname1_DTVTvUDj-b1.mp4');
  assert.equal(formatFilename(meta, 'numbered_user', 2), '03_creatorname1_DTVTvUDj-b1.mp4');
  assert.equal(formatFilename(meta, 'caption_shortcode', 0), 'Hello_World!_DTVTvUDj-b1.mp4');
  assert.equal(formatFilename(meta, 'shortcode', 0), 'DTVTvUDj-b1.mp4');
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

