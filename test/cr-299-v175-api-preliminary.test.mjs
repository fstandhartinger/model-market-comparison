import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { JEV_INTERLEAVED_LISTINGS, jevApiPreliminaryRows, jevbenchScopeArtifact, jevScopeClassifier, jevScopeDisplayOrder } from '../lib/jevbench-scope.mjs';

// CR-299 v1.7.5 (Florian, 6 Oct 2026 ~19:30 Berlin, Part 12): every API offering with a v1.6 public-set figure appears in
// the API board's Composite and Capability charts as a hatched, unranked "preliminary" row; rows without one are "pending".
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const data = JSON.parse(src('data/jevbench-api-public-set.json'));

async function setup() {
  const { artifact, carry } = await readCurrentJevbench();
  const previous = await readJevbenchV157Release();
  const isApi = jevScopeClassifier(artifact.systems, carry.rows, previous.artifact.systems, previous.artifact.not_measured);
  const api = jevbenchScopeArtifact(artifact, 'api', isApi);
  const { prelim, pending } = jevApiPreliminaryRows(data, new Map(carry.rows.map((r) => [r.key, r])));
  return { api, prelim, pending };
}

test('1: one preliminary row per carried/new public-set row, unranked, with the data figures', async () => {
  const { api, prelim } = await setup();
  const expected = data.rows.filter((r) => r.role === 'carried' || r.role === 'new').map((r) => r.key).sort();
  assert.deepEqual(prelim.map((r) => r.key).sort(), expected);
  const rankedKeys = new Set(api.systems.filter((s) => s.ranked).map((s) => s.key));
  for (const p of prelim) {
    const d = data.rows.find((r) => r.key === p.key);
    assert.equal(p.ranked, false); assert.equal(p.rank, null); assert.equal(p.listing, 'preliminary');
    assert.ok(!rankedKeys.has(p.key), `${p.key} is not also a ranked row`);
    assert.equal(p.jevbench_score, d.composite.A); assert.equal(p.capability, d.capability);
    assert.match(p.not_ranked_because, /^Preliminary: v1\.6 public set only/);
  }
  assert.ok(JEV_INTERLEAVED_LISTINGS.has('preliminary'), 'preliminary rows sit at their score position');
});

test('2: ranked rows keep their order and ranks with preliminary and pending rows added', async () => {
  const { api, prelim, pending } = await setup();
  const before = api.systems.filter((s) => s.ranked).sort((x, y) => x.rank - y.rank).map((s) => [s.key, s.rank]);
  const order = jevScopeDisplayOrder([...api.systems.filter((s) => s.ranked || JEV_INTERLEAVED_LISTINGS.has(s.listing)), ...prelim, ...pending]);
  assert.deepEqual(order.filter((s) => s.ranked).map((s) => [s.key, s.rank]), before);
  assert.deepEqual(order.slice(-pending.length).map((s) => s.listing), pending.map(() => 'pending'), 'pending rows (no score) sink to the end');
  for (const p of pending) assert.equal(p.jevbench_score, null);
});

test('3: the board wires extras into the API charts only, not the compare view; labels and revision', () => {
  const board = src('components/JevBenchV16Board.tsx');
  assert.match(board, /const extra = scope === 'api' \? apiChartExtras\(carry, measuredKeys\) : \[\];/);
  assert.match(board, /ranked\.filter\(\(s\) => s\.listing !== JEV_PRELIMINARY_LISTING && s\.listing !== JEV_PENDING_LISTING\)\.map\(jevV15CompareRow\)/);
  assert.match(board, /version: 'v1\.7\.5'/);
  assert.match(src('components/JevCapabilityRanking.tsx'), /Preliminary · public set \(300 items\) · full re-evaluation running/);
  assert.match(src('components/JevBoardShared.tsx'), /preliminary: 'preliminary', pending: 'pending',/);
});
