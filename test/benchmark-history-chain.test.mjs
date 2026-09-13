// H2 (review 2026-09-13): multi-hop bridging over intermediate snapshots and re-based
// versions. Synthetic fixture values throughout: not production benchmark claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BRIDGE_POLICY, buildState, crossVersionEstimates, datedEstimates, estimateFromRankShift, findBridgeChain,
} from '../lib/benchmark-history.mjs';

const observation = (id, value, benchmark_id = 'bench::1', unit = 'fraction') => ({
  id, value, benchmark_id, basis: 'measured', unit,
  subject: { model_id: `model:${id}`, source_id: `src:${id}`, name: `Model ${id}`, harness: null, variant: null },
  source: { url: 'https://example.org/results', retrieved_at: '2026-09-01', published_at: null, file: 'fixture.json', locator: `row ${id}` },
});
const obsSet = (ids, value, benchmark_id, unit) => ids.map((id, i) => observation(id, typeof value === 'function' ? value(i) : value, benchmark_id, unit));
const state = (id, day, observations) => buildState(observations, { state_id: id, source: `synthetic-${id}`, collected_at: `2026-09-${day}T00:00:00.000Z` });
const entry = (id, over = {}) => ({ id, family: id.split('::')[0], version: id.split('::')[1] ?? '1', status: 'active', scoring: { unit: 'fraction', higher_better: true }, ...over });
const registry = (entries) => ({ entries });
const A = ['a1', 'a2', 'a3', 'a4', 'a5'], B = ['b1', 'b2', 'b3', 'b4', 'b5'], C = ['c1', 'c2', 'c3', 'c4', 'c5'], D = ['d1', 'd2', 'd3', 'd4', 'd5'];
const byName = (list, id) => list.find((e) => e.subject_name === `Model ${id}`);

test('two-hop ratio chain: S0 and current share no model, S1 links them (x2 then x3)', () => {
  const s0 = state('S0', '01', [...obsSet(A, 1), observation('h', 3)]);
  const s1 = state('S1', '02', [...obsSet(A, 2), ...obsSet(B, 10)]);
  const live = obsSet(B, 30);
  const out = datedEstimates(live, registry([entry('bench::1')]), [s0, s1]);
  const h = byName(out, 'h');
  assert.equal(h.status, 'estimated');
  assert.equal(h.value, 18, '3 × 2 × 3');
  assert.equal(h.comparison.hops, 2);
  assert.deepEqual(h.comparison.path.map((p) => [p.from, p.to]), [['S0', 'S1'], ['S1', 'current']]);
  assert.equal(h.comparison.aggregate, 6);
  assert.equal(h.comparison.bridge_count, 5);
  assert.deepEqual([h.uncertainty.lower, h.uncertainty.upper], [18, 18]);
  assert.match(h.note, /over 2 bridge hops/);
  // S1's A rows are gone from the current board too; they bridge directly (one hop).
  const a1FromS1 = out.find((e) => e.source_state_id === 'S1' && e.subject_name === 'Model a1');
  assert.equal(a1FromS1.comparison.hops, 1);
  assert.equal(a1FromS1.value, 6);
});

test('a comparable direct hop is preferred over a chain', () => {
  const s0 = state('S0', '01', [...obsSet(A, 1), ...obsSet(B, 1), observation('h', 3)]);
  const s1 = state('S1', '02', [...obsSet(A, 5), ...obsSet(B, 5)]);
  const live = obsSet(B, 2); // direct S0 -> current: x2; via S1 it would be x5 then x0.4
  const h = byName(datedEstimates(live, registry([entry('bench::1')]), [s0, s1]), 'h');
  assert.equal(h.comparison.hops, 1);
  assert.equal(h.value, 6);
});

test('a chain whose hop is too uneven is refused, with the direct cause kept', () => {
  const wide = (i) => [0.05, 1, 2.5, 9, 20][i];
  const s0 = state('S0', '01', [...obsSet(A, 1), observation('h', 3)]);
  const s1 = state('S1', '02', [...obsSet(A, wide), ...obsSet(B, 10)]);
  const live = obsSet(B, 30);
  const h = byName(datedEstimates(live, registry([entry('bench::1')]), [s0, s1]), 'h');
  assert.equal(h.status, 'not_comparable');
  assert.equal(h.value, null);
  assert.equal(h.comparison.cause, 'insufficient_bridges');
  assert.equal(h.comparison.cause_value, 0);
});

test('chains are capped at BRIDGE_POLICY.maxHops hops', () => {
  assert.equal(BRIDGE_POLICY.maxHops, 3);
  // S0-S1 share A, S1-S2 share B, S2-S3 share C, S3-current share D: S0 needs 4 hops.
  const s0 = state('S0', '01', [...obsSet(A, 1), observation('h', 3)]);
  const s1 = state('S1', '02', [...obsSet(A, 2), ...obsSet(B, 1)]);
  const s2 = state('S2', '03', [...obsSet(B, 2), ...obsSet(C, 1)]);
  const s3 = state('S3', '04', [...obsSet(C, 2), ...obsSet(D, 1)]);
  const live = obsSet(D, 2);
  const out = datedEstimates(live, registry([entry('bench::1')]), [s0, s1, s2, s3]);
  assert.equal(byName(out, 'h').status, 'not_comparable', '4 hops exceed the cap');
  const fromS1 = out.find((e) => e.source_state_id === 'S1' && e.subject_name === 'Model a1');
  assert.equal(fromS1.status, 'estimated');
  assert.equal(fromS1.comparison.hops, 3);
  assert.equal(fromS1.value, 16, 'a1 is 2 in S1, then × 2 × 2 × 2');
});

test('summed hop spread above maxChainIqrRelative refuses the chain', () => {
  const nodes = [
    { id: 'S0', values: new Map([['a', 1], ['b', 1], ['c', 1], ['d', 1], ['h', 3]]) },
    { id: 'S1', values: new Map([['a', 0.8], ['b', 1], ['c', 1.2], ['d', 1.25], ['x', 1], ['y', 1], ['z', 1], ['w', 1]]) },
    { id: 'current', values: new Map([['x', 0.8], ['y', 1], ['z', 1.2], ['w', 1.25]]) },
  ];
  const loose = findBridgeChain(nodes, 0, 2, { maxChainIqrRelative: 1 });
  assert.equal(loose.comparable, true);
  assert.equal(loose.hops.length, 2);
  assert.ok(loose.chain_iqr_relative > 0.3, `each hop passes alone (${loose.chain_iqr_relative})`);
  const strict = findBridgeChain(nodes, 0, 2, { maxChainIqrRelative: 0.3 });
  assert.equal(strict.comparable, false);
});

test('multi-hop across re-based versions: v1 -> v2 -> v3 when v1 and v3 share no model', () => {
  const reg = registry([entry('bench::1'), entry('bench::2'), entry('bench::3')]);
  const observations = [
    ...obsSet(A, 1, 'bench::1'), observation('h', 4, 'bench::1'),
    ...obsSet(A, 2, 'bench::2'), ...obsSet(B, 2, 'bench::2'),
    ...obsSet(B, 3, 'bench::3'),
  ];
  const h = crossVersionEstimates(observations, reg).find((e) => e.subject_name === 'Model h' && e.source_benchmark_id === 'bench::1');
  assert.equal(h.benchmark_id, 'bench::3');
  assert.equal(h.status, 'estimated');
  assert.equal(h.value, 12, '4 × 2 × 1.5');
  assert.equal(h.comparison.hops, 2);
  assert.deepEqual(h.comparison.path.map((p) => p.to), ['bench::2', 'bench::3']);
});

test('Elo boards chain rank shifts and keep the historical order', () => {
  const elo = { unit: 'Elo', higher_better: true, metric: 'Elo' };
  const s0 = state('S0', '01', [
    ...A.map((id, i) => observation(id, 1500 - 50 * i, 'arena::1', 'Elo')),
    observation('h1', 1480, 'arena::1', 'Elo'), observation('h2', 1320, 'arena::1', 'Elo'),
  ]);
  const s1 = state('S1', '02', [
    ...A.map((id, i) => observation(id, 1600 - 50 * i, 'arena::1', 'Elo')),
    ...B.map((id, i) => observation(id, 1580 - 50 * i, 'arena::1', 'Elo')),
  ]);
  const live = B.map((id, i) => observation(id, 1700 - 50 * i, 'arena::1', 'Elo'));
  const out = datedEstimates(live, registry([entry('arena::1', { scoring: elo })]), [s0, s1]);
  const h1 = byName(out, 'h1'), h2 = byName(out, 'h2');
  for (const h of [h1, h2]) {
    assert.equal(h.status, 'estimated');
    assert.equal(h.method, 'bridge-rank-shift');
    assert.equal(h.comparison.hops, 2);
    assert.ok(h.value >= 1500 && h.value <= 1700, `${h.value} lies on the current board's scale`);
    assert.ok(h.uncertainty.lower <= h.value && h.value <= h.uncertainty.upper);
  }
  assert.ok(h1.value > h2.value, 'a model ahead in S0 stays ahead after two re-based hops');
});

test('rank shift places a value that is not on the board by interpolation, not at the bottom', () => {
  const board = [{ value: 1400 }, { value: 1300 }, { value: 1200 }];
  const same = estimateFromRankShift(1350, board, board, { shift: 0 });
  assert.equal(same, 1350);
});
