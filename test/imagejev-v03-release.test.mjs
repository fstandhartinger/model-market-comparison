import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

// ImageJevBench v0.3.0 (Florian's GO, 6 Oct 2026): aggregate-only data from the new 2,441-item pool.
test('ImageJevBench v0.3.0 release data keeps the reviewed roster and top five', async () => {
  const a = JSON.parse(await read('../data/imagejev-v03.json'));
  assert.equal(a.revision, 'v0.3.0');
  assert.equal(a.status, 'released');
  assert.equal(a.ranking.length, 47); // CR-313: + GPT-6 Luna via OpenAI Decisions; CR-325: + Wity-1
  assert.equal(a.carried.length, 8); // CR-325: Wity-1 moved from carry to measured
  const ranked = a.ranking.filter((row) => row.ranked).sort((x, y) => x.rank - y.rank);
  assert.equal(ranked.length, 45);
  assert.deepEqual(ranked.slice(0, 5).map((row) => row.key),
    ['wity_1', 'imajev_4b', 'surogate_rune_26b_v3', 'imajev_9b', 'jev_omni']);
  assert.ok(a.ranking.every((row) => !('predictions' in row) && !('gold' in row)), 'aggregate-only rows');
});

test('ImageJevBench v0.3.0 page carries no preview-only hooks', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.doesNotMatch(page, /private preview|Private release review|BH_PREVIEW/i);
  assert.match(page, /data\/imagejev-v03\.json/);
});

test('CR-325 dated carry rows link to the system homepage, not an in-page anchor, when one is known', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.match(page, /a\.carried\.map\([^]*?href=\{imageJevSourceUrl\(r\.key, r\.repo\) \?\? '#imagejev-v015-archive'\}/);
  const a = JSON.parse(await read('../data/imagejev-v03.json'));
  const wity = a.ranking.find((row) => row.key === 'wity_1');
  assert.equal(wity.repo, 'https://wity.alphanimble.com/');
  assert.equal(wity.ranked, true);
});
