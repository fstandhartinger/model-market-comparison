import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { imageJevBoardRows, imageJevBoardSystems, imageJevCompareRows, imageJevOfficialOrder } from '../lib/imagejev-board.mjs';

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

function assertOfficialOrder(rows, label) {
  const ranked = rows.filter((row) => Number.isInteger(row.rank));
  const unranked = rows.filter((row) => !Number.isInteger(row.rank));
  assert.deepEqual(rows.slice(0, ranked.length).map((row) => row.key), ranked.map((row) => row.key), `${label}: ranked rows come first`);
  ranked.forEach((row, index) => assert.equal(row.rank, index + 1, `${label}: rank ${index + 1} at position ${index}`));
  const scores = unranked.map((row) => row.jevbench_score ?? row.score ?? -Infinity);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a), `${label}: unranked rows by composite descending`);
}

for (const [label, path] of [['v0.3', '../data/imagejev-v03.json'], ['v0.1.5 archive', '../data/raw/benchmarks/jevbench/multimodal-preview/preview.json']]) {
  test(`ImageJevBench ${label} board, chart and compare rows follow the official rank order`, async () => {
    const artifact = await read(path);
    assertOfficialOrder(imageJevBoardSystems(artifact), `${label} systems`);
    assertOfficialOrder(imageJevBoardRows(artifact), `${label} chart`);
    assertOfficialOrder(imageJevCompareRows(artifact), `${label} compare`);
  });
}

test('ImageJevBench v0.3 data file lists measured rows in official order and carries by composite', async () => {
  const artifact = await read('../data/imagejev-v03.json');
  assertOfficialOrder(artifact.ranking.map((row) => ({ key: row.key, rank: row.rank, score: row.tracks.core.composite.score })), 'v0.3 data');
  const carried = artifact.carried.map((row) => row.tracks.all.composite.score);
  assert.deepEqual(carried, [...carried].sort((a, b) => b - a));
});

test('imageJevOfficialOrder sorts an alphabetical input by rank, then score, stably', () => {
  const rows = [
    { key: 'a', rank: 3, jevbench_score: 10 },
    { key: 'b', rank: null, jevbench_score: 5 },
    { key: 'c', rank: 1, jevbench_score: 30 },
    { key: 'd', rank: null, jevbench_score: null },
    { key: 'e', rank: 2, jevbench_score: 20 },
    { key: 'f', rank: null, jevbench_score: 7 },
  ];
  assert.deepEqual(imageJevOfficialOrder(rows).map((row) => row.key), ['c', 'e', 'a', 'f', 'b', 'd']);
});
