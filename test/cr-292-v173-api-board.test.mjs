import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { JEV_INTERLEAVED_LISTINGS, jevbenchScopeArtifact, jevScopeClassifier, jevScopeDisplayOrder } from '../lib/jevbench-scope.mjs';

// CR-292 v1.7.3 (Florian, 6 Oct 2026 ~17:00 Berlin): API board without base-model reference prices; the
// "Show API offerings" toggle places API rows (and the Jev reference) at their score position in every section.
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

async function scoped() {
  const release = await readCurrentJevbench();
  const previous = await readJevbenchV157Release();
  const isApi = jevScopeClassifier(release.artifact.systems, release.carry.rows, previous.artifact.systems, previous.artifact.not_measured);
  return { release, api: jevbenchScopeArtifact(release.artifact, 'api', isApi), open: jevbenchScopeArtifact(release.artifact, 'open', isApi) };
}

test('1: API rows carry no base-model price alternative on the API board, but keep it on the open board', async () => {
  const { release, api, open } = await scoped();
  const withAlt = release.artifact.systems.filter((s) => s.alt).map((s) => s.key);
  assert.ok(withAlt.includes('wity-1'), 'fixture: wity-1 has a base-model alternative in the release');
  assert.deepEqual(api.systems.filter((s) => s.alt).map((s) => s.key), []);
  assert.ok(open.systems.find((s) => s.key === 'wity-1')?.alt, 'open board keeps the comparison against open weights');
  assert.ok(release.artifact.systems.find((s) => s.key === 'wity-1').alt, 'the release object is not mutated');
  const api1 = api.systems.find((s) => s.key === 'wity-1');
  assert.equal(api1.jevbench_score, release.artifact.systems.find((s) => s.key === 'wity-1').jevbench_score, 'score unchanged');
});

test('2: display order interleaves unranked reference / API rows by score and keeps ranked order', () => {
  const rows = [
    { key: 'a', ranked: true, rank: 1, jevbench_score: 80 }, { key: 'b', ranked: true, rank: 2, jevbench_score: 70 },
    { key: 'c', ranked: true, rank: 3, jevbench_score: 60 }, { key: 'jev', ranked: false, jevbench_score: 71.5 },
    { key: 'sage', ranked: false, jevbench_score: 90 }, { key: 'low', ranked: false, jevbench_score: 10 }, { key: 'none', ranked: false, jevbench_score: null },
  ];
  assert.deepEqual(jevScopeDisplayOrder(rows).map((r) => r.key), ['sage', 'a', 'jev', 'b', 'c', 'low', 'none']);
});

test('3: on the open board with the toggle on, Jev and every API offering sit at their score position', async () => {
  const { open } = await scoped();
  const listed = open.systems.filter((s) => s.ranked || JEV_INTERLEAVED_LISTINGS.has(s.listing));
  const order = jevScopeDisplayOrder(listed);
  const ranked = order.filter((s) => s.ranked).map((s) => s.rank);
  assert.deepEqual(ranked, [...ranked].sort((x, y) => x - y), 'ranked rows keep the official order');
  for (const key of ['jev-1.13.0', 'sage-1.3.0']) {
    const i = order.findIndex((s) => s.key === key);
    assert.ok(i >= 0 && i < 20, `${key} is in the visible top of the Composite list (position ${i + 1})`);
    const row = order[i];
    assert.ok(order.slice(0, i).filter((s) => s.ranked).every((s) => s.jevbench_score >= row.jevbench_score), `${key} sits below every higher ranked row`);
  }
});

test('4: the shared sort keeps interleaved listings in place; the board uses the display order; method + revision say so', () => {
  const chart = src('components/JevBoardInteractive.tsx');
  assert.match(chart, /const placed = \(r: JevBoardViewRow\) => r\.ranked \|\| JEV_INTERLEAVED_LISTINGS\.has\(r\.listing\);/);
  const board = src('components/JevBenchV16Board.tsx');
  assert.match(board, /: jevScopeDisplayOrder\(\[\.\.\.a\.systems\.filter\(listedRow\), \.\.\.\(extra as typeof a\.systems\)\]\);/); // v1.7.5 adds API-board extras
  assert.match(board, /The base-model reference price only applies to open-weights rows; API offerings are ranked at their own list price/);
  assert.match(board, /version: 'v1\.7\.3'/);
});

test('5: the Fastino GLiNER-2.5-Decide footnote says why the score is low (model, not our request) in short', () => {
  const note = JSON.parse(src('data/jevbench-base-models.json'));
  const text = JSON.stringify(note);
  assert.match(text, /A 340M English classifier \(8k context\), not built for multi-step reasoning/);
  assert.match(text, /Our request follows Fastino's documented format/);
});
