import test from 'node:test';
import assert from 'node:assert/strict';
import { ServerResponse } from 'node:http';
import { safeContentDisposition } from '../server/downloader.js';
import { normalizeMediaUrl } from '../server/platforms.js';

test('normalizeMediaUrl handles direct Instagram shortcodes and YouTube IDs', () => {
  const igItem = normalizeMediaUrl('DQRZIlnj03i');
  assert.ok(igItem);
  assert.equal(igItem.platform, 'instagram');
  assert.equal(igItem.shortcode, 'DQRZIlnj03i');
  assert.equal(igItem.url, 'https://www.instagram.com/reel/DQRZIlnj03i/');

  const ytItem = normalizeMediaUrl('yt_jNQXAC9IVRw');
  assert.ok(ytItem);
  assert.equal(ytItem.platform, 'youtube');
  assert.equal(ytItem.videoId, 'jNQXAC9IVRw');
  assert.equal(ytItem.url, 'https://www.youtube.com/watch?v=jNQXAC9IVRw');
});

test('safeContentDisposition encodes emojis, smart quotes, and Unicode for HTTP headers without throwing ERR_INVALID_CHAR', () => {
  const testFilenames = [
    // The exact 3 failed filenames from the user screenshot:
    'The_simple_forex_strategy_you_need_to_make_profits_\u{1F525}_DQRZIlnj03i.mp4',
    '\u{1F449}_Comment_\u201CLONDON\u201D_and_I\u2019ll_send_you_my_full_entry_guide_for_fr_DOpGViEjtv6.mp4',
    'Comment_\u2018broker\u2019_to_get_low_spreads_for_all_these_pairs_DMaY0gKuHZe.mp4',

    // Edge cases
    '\u{1F525}.mp4',
    'Normal_Ascii_Name_DQRZIlnj03i.mp4',
    'Hindi_हिंदी_वीडियो.mp4',
    'Japanese_アニメ_動画.mp4',
    'Quotes "and" \\slashes / test.mp4',
  ];

  for (const filename of testFilenames) {
    const header = safeContentDisposition(filename);
    assert.ok(header, `Header should be generated for ${filename}`);
    assert.ok(header.startsWith('attachment; filename='), `Header should have attachment disposition`);

    // Verify it can be set on Node.js ServerResponse without throwing TypeError [ERR_INVALID_CHAR]
    const res = new ServerResponse({});
    assert.doesNotThrow(() => {
      res.setHeader('Content-Disposition', header);
    }, `setHeader should not throw for ${filename}`);

    // If filename has Unicode, verify filename*=UTF-8'' is present
    if (/[^\x20-\x7E]/.test(filename)) {
      assert.ok(header.includes("filename*=UTF-8''"), `Header should include RFC 5987 UTF-8 encoding for ${filename}`);
    }
  }
});

