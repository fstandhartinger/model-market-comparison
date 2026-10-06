// CR-301 v1.7.7 (Florian 6 Oct 2026, Part 12b): the API lane's equated A4 u P rows replace the preliminary rows and are
// ranked on the API board; the open-weights board and archived release pages are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jevWithApiA4Rows, jevbenchScopeArtifact, jevScopeClassifier, jevApiPreliminaryRows } from '../lib/jevbench-scope.mjs';

const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
const rel = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json');
const carry = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-dated-carry.json').rows;
const a4 = read('data/jevbench-api-a4-equated.json');
const merged = jevWithApiA4Rows(rel, a4, new Map(carry.map((r) => [r.key, r])));
const isApi = jevScopeClassifier(merged.systems, carry);

test('1: every A4 row is added once with the lane figures unchanged; only the wrapper is unranked', () => {
  for (const r of a4.rows) {
    const s = merged.systems.filter((x) => x.key === r.key);
    assert.equal(s.length, 1, r.key);
    assert.equal(s[0].jevbench_score, r.composite.A);
    assert.equal(s[0].capability, r.capability);
    assert.equal(s[0].ranked, r.ranked ?? r.listing === 'ranked', r.key);
    assert.equal(s[0].v16.lane, 'api');
    assert.equal(s[0].speed.p50_s_adjusted, r.p50_s);
    if (/^x2/.test(r.latency_adjustment ?? '')) assert.equal(s[0].speed.p50_s_raw * 2, r.p50_s);
  }
  assert.equal(merged.systems.find((s) => s.key === 'classifier-dev-fast').listing, 'wrapper');
});

test('2: API board ranks follow scores in every option and in Capability', () => {
  const api = jevbenchScopeArtifact(merged, 'api', isApi);
  const ranked = api.systems.filter((s) => s.ranked);
  assert.equal(ranked.length, 4 + [...a4.rows, ...(a4.a5_rows ?? []), ...(a4.full_rows ?? [])].filter((r) => (r.ranked ?? r.listing === 'ranked')).length);
  for (const o of ['A', 'B', 'C']) {
    const order = [...ranked].sort((x, y) => x.ranks[o] - y.ranks[o]);
    order.forEach((s, i) => { assert.equal(s.ranks[o], i + 1); if (i) assert.ok(order[i - 1].scores[o] >= s.scores[o], `${o}: ${order[i - 1].key} >= ${s.key}`); });
  }
  const cap = [...ranked].sort((x, y) => x.ranks.capability - y.ranks.capability);
  cap.forEach((s, i) => { assert.equal(s.ranks.capability, i + 1); if (i) assert.ok(cap[i - 1].capability >= s.capability); });
});

test('3: the open-weights board is unchanged and A4 rows only appear there as toggled API offerings', () => {
  const sig = (a) => JSON.stringify(a.systems.filter((s) => s.ranked).map((s) => [s.key, s.rank, s.ranks]).sort());
  const before = jevbenchScopeArtifact(rel, 'open', jevScopeClassifier(rel.systems, carry));
  const after = jevbenchScopeArtifact(merged, 'open', isApi);
  assert.equal(sig(after), sig(before));
  for (const r of a4.rows) assert.equal(after.systems.find((s) => s.key === r.key).ranked, false);
});

test('4: measured rows leave the preliminary set; the route skips archived pages', () => {
  const measured = new Set(merged.systems.map((s) => s.key));
  const { prelim, pending } = jevApiPreliminaryRows(read('data/jevbench-api-public-set.json'), new Map(carry.map((r) => [r.key, r])));
  const left = [...prelim, ...pending].filter((r) => !measured.has(r.key)).map((r) => r.key);
  assert.deepEqual(left, []); // v1.7.10: OpenAI Decisions now has its A5 u P result (v1.7.9 showed it as preliminary)
  const route = readFileSync(new URL('../components/JevBenchV16ReleaseRoute.tsx', import.meta.url), 'utf8');
  assert.match(route, /scope === 'all' \|\| release_\.revision !== 'v1\.6\.1' \? release_ : jevWithApiA4Rows/);
  assert.match(readFileSync(new URL('../components/JevBenchV16Board.tsx', import.meta.url), 'utf8'), /version: 'v1\.7\.7'/);
});
