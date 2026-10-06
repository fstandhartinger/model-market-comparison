import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { imageJevBoardSystems, imageJevBoardRows, imageJevCompareRows, imageJevApiKeys, IMAGEJEV_API_NOT_RANKED } from '../lib/imagejev-board.mjs';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const artifact = JSON.parse(await read('../data/imagejev-v03.json'));
const rankedOrder = (rows) => rows.filter((r) => r.ranked).sort((x, y) => x.rank - y.rank).map((r) => r.key);

// CR-311 (Review 6 Oct 2026): ImageJevBench ranks open weights; API rows are listed unranked.
test('open scope marks the API row unranked and shifts later composite ranks by one', () => {
  const all = imageJevBoardSystems(artifact);
  const open = imageJevBoardSystems(artifact, 'open');
  assert.equal(open.length, all.length);
  const api = open.find((r) => r.key === 's1-vision');
  assert.equal(api.ranked, false);
  assert.equal(api.listing, 'api_offering');
  assert.equal(api.rank, null);
  assert.equal(api.not_ranked_because, IMAGEJEV_API_NOT_RANKED);
  const before = new Map(all.map((r) => [r.key, r.rank]));
  for (const r of open.filter((x) => x.ranked)) {
    const old = before.get(r.key);
    assert.equal(r.rank, old > 10 ? old - 1 : old, `${r.key} ${old} -> ${r.rank}`);
  }
  assert.deepEqual(rankedOrder(open), rankedOrder(all).filter((k) => k !== 's1-vision'));
  assert.deepEqual(rankedOrder(open).slice(0, 5), rankedOrder(all).slice(0, 5));
  assert.equal(open.filter((r) => r.ranked).length, 42);
  const order = open.map((r) => r.key);
  assert.equal(order[order.indexOf('s1-vision') + 1], 'shisa_de_1');
  assert.deepEqual(open.map((r) => r.jevbench_score).sort(), all.map((r) => r.jevbench_score).sort(), 'scores untouched');
});

test('default scope is unchanged and scope reaches chart and compare rows', () => {
  const all = imageJevBoardSystems(artifact);
  assert.equal(all.find((r) => r.key === 's1-vision').rank, 10);
  assert.equal(all.find((r) => r.key === 's1-vision').ranked, true);
  assert.deepEqual(imageJevBoardSystems(artifact, 'all'), all);
  assert.equal(imageJevBoardRows(artifact, 'open').find((r) => r.key === 'shisa_de_1').rank, 10);
  assert.equal(imageJevCompareRows(artifact, 'open').find((r) => r.key === 's1-vision').listing, 'api_offering');
  assert.throws(() => imageJevBoardSystems(artifact, 'api'));
  assert.deepEqual(imageJevApiKeys(artifact), ['s1-vision']);
});

test('ImageJev page wires the open-weights split like /jev-models', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.match(page, /imageJevBoardSystems\(a, 'open'\)/);
  assert.match(page, /<JevV15FilterProvider rows=\{filterRows\} apiKeys=\{apiKeys\}>/);
  assert.match(page, /<JevApiOfferingsToggle/);
  assert.match(page, /JevImageBench Capability Score \(open weights\)/);
  assert.match(page, /composite \(open weights\)/);
  assert.match(page, /data-bh-imagejev-split-note/);
  assert.match(page, /data-bh-jev-api-row/);
  const toggle = await read('../components/JevApiOfferingsToggle.tsx');
  assert.match(toggle, /onNote/);
});

test('v0.3 page merges the split with the v0.3 fixes: open rank column, note, history bullet', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.match(page, /openRank\.get\(r\.key\)/);
  assert.match(page, /Rank is the composite rank on the open-weights board/);
  assert.match(page, /ranked on the open-weights board/);
  assert.match(page, /Jev-class \(within caps\)/);
  assert.match(page, /imageJevSourceUrl/);
  assert.match(page, /2026-10-06[^\n]*Open weights vs API/);
});
