import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

// ImageJevBench v0.3.0 (Florian's GO, 6 Oct 2026): aggregate-only data from the new 2,441-item pool.
test('ImageJevBench v0.3.0 release data keeps the reviewed roster and top five', async () => {
  const a = JSON.parse(await read('../data/imagejev-v03.json'));
  assert.equal(a.revision, 'v0.3.0');
  assert.equal(a.status, 'released');
  assert.equal(a.ranking.length, 56); // CR-414: + Liquid d1-3B, d1-omni-600M; CR-313: + GPT-6 Luna via OpenAI Decisions; CR-325: + Wity-1; CR-333: +6 re-measured carries, + Wity-1 reasoning off
  assert.equal(a.carried.length, 2); // CR-333 dated-carry re-run: only the two JevAny rows remain (source unavailable)
  const ranked = a.ranking.filter((row) => row.ranked).sort((x, y) => x.rank - y.rank);
  assert.equal(ranked.length, 54);
  assert.deepEqual(ranked.slice(0, 5).map((row) => row.key),
    ['wity_1', 'imajev_4b', 'surogate_rune_26b_v3', 'kushal_gemma4_31b_it_autoloops', 'imajev_9b']);
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

test('CR-333 dated-carry re-run (7 Oct 2026): re-measured carries disclose method; unavailable sources stay carried with a dated note', async () => {
  const a = JSON.parse(await read('../data/imagejev-v03.json'));
  for (const key of ['gpt6_luna', 'gpt56_luna', 'gemini31_flash_lite', 'gemini38_flash', 'kushal_gemma4_31b_it_autoloops', 'wity_1_off', 'neohorse_jev_4b']) {
    const row = a.ranking.find((r) => r.key === key);
    assert.ok(row, key);
    assert.match(row.measurement_source, /(A300|S1200)\+P300 pass 1 on 7 Oct 2026/, key);
    assert.ok(!('carry_note' in row), key);
  }
  assert.match(a.ranking.find((r) => r.key === 'gemini38_flash').measurement_source, /329 of 600 answers were cut off/);
  assert.equal(a.ranking.find((r) => r.key === 'wity_1_off').inference_setting, 'Wity SystemOne /v1/systemone, reasoning=off (the server default)');
  assert.deepEqual(a.carried.map((r) => r.key).sort(), ['jevany_27b_rlcr', 'jevany_27b_sft']);
  assert.match(a.ranking.find((r) => r.key === 'neohorse_jev_4b').measurement_source, /revision 434cb21d/);
  for (const r of a.carried) assert.match(r.carry_note, /Source unavailable since 30 Sep 2026/);
  assert.match(a.method.equating_note, /owner exception to the N=3 API refresh cadence/);
});
