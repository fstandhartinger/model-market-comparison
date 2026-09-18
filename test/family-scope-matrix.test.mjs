import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBenchmarkMatrix, familyScopeDonorOf, FAMILY_SCOPE_AXIS_KEYS } from '../lib/benchmark-matrix.mjs';

/** Synthetic catalog: two variants of family "fam-a" (value on the measured representative "high"),
 *  one single-variant family "other". */
const ds = (overrides = {}) => ({
  models: [
    { id: 'fam-a::max', family_key: 'fam-a', variant: 'max', display_name: 'A (max)', benchmarks: {}, ...overrides.max },
    { id: 'fam-a::high', family_key: 'fam-a', variant: 'high', display_name: 'A (high)', benchmarks: { aa_intelligence_index: 50 }, ...overrides.high },
    { id: 'other::default', family_key: 'other', variant: 'default', display_name: 'B', benchmarks: {}, ...overrides.other },
  ],
  benchmark_results: { registry: [], observations: [] },
  sources: { openrouter_aa_relay: '2026-09-20', epoch_eci: '2026-09-20' },
});

const agenticAxis = {
  id: 'aa_agentic_index::snapshot-2026-09-20', benchmarkId: 'aa_agentic_index::snapshot-2026-09-20',
  family: 'aa_agentic_index', name: 'AA Agentic Index', version: 'snapshot-2026-09-20 (unversioned)',
  category: 'Agentic', description: '', unit: 'points', higherBetter: true, cohort: 'Published board', url: '',
  scores: [
    { id: 'a1', modelId: 'fam-a::high', value: 58, basis: 'measured', date: '2026-09-18', source: 0 },
    { id: 'a2', modelId: 'other::default', value: 40, basis: 'measured', date: '2026-09-18', source: 0 },
  ],
};

const tax = {
  version: 'test',
  groups: [{ id: 'agentic', label: 'Agentic & tool use', categories: ['Agentic'] }],
  tags: {
    family_scope: { label: 'family', tip: 'Measured once per model family.' },
    headline: { label: 'Headline', tip: '' },
  },
  tiers: { aa_agentic_index: 'headline', 'board-x': 'headline' },
  descriptions: {},
  score_ranges: { aa_agentic_index: [0, 100] },
};

const viewOf = (axes) => ({ axes, sources: [{ url: '', date: '2026-09-18', published: null, file: '' }] });

test('family-scope fill: a sibling column of the measured family shows the family value', () => {
  const m = buildBenchmarkMatrix(viewOf([agenticAxis]), ds(), tax);
  const i = m.rows.findIndex((r) => r.key === 'aa_agentic_index');
  assert.ok(i >= 0);
  const row = m.rows[i];
  assert.equal(familyScopeDonorOf(row, 'fam-a::max'), 'fam-a::high');
  assert.equal(familyScopeDonorOf(row, 'fam-a::high'), null);
  const vMax = (m.values['fam-a::max'] ?? []).find(([x]) => x === i);
  const vHigh = (m.values['fam-a::high'] ?? []).find(([x]) => x === i);
  assert.deepEqual(vMax, vHigh, 'sibling and donor show the same [row, value, basis]');
  assert.equal(vMax[1], 58);
  assert.ok(row.tags.includes('family_scope'));
});

test('family-scope fill: disagreeing holders without a representative value share nothing', () => {
  // ::max (the variant-order representative, valueless) represents the family; ::high and ::low
  // disagree → nobody's number moves.
  const d = ds();
  d.models[1] = { ...d.models[1], benchmarks: {} }; // strip composite evidence → rep picks ::max
  d.models.push({ id: 'fam-a::low', family_key: 'fam-a', variant: 'low', display_name: 'A (low)', benchmarks: {} });
  const axis = { ...agenticAxis, scores: [
    { id: 'a1', modelId: 'fam-a::high', value: 58, basis: 'measured', date: '2026-09-18', source: 0 },
    { id: 'a2', modelId: 'fam-a::low', value: 42, basis: 'measured', date: '2026-09-18', source: 0 },
  ] };
  const m = buildBenchmarkMatrix(viewOf([axis]), d, tax);
  const row = m.rows.find((r) => r.key === 'aa_agentic_index');
  assert.equal(familyScopeDonorOf(row, 'fam-a::max'), null);
  assert.equal((m.values['fam-a::max'] ?? []).length, 0, 'the valueless representative column stays empty');
  // …but with the representative holding a value, it IS the donor even if a sibling disagrees:
  const axis2 = { ...axis, scores: [...axis.scores, { id: 'a3', modelId: 'fam-a::max', value: 40, basis: 'measured', date: '2026-09-18', source: 0 }] };
  const m2 = buildBenchmarkMatrix(viewOf([axis2]), d, tax);
  const row2 = m2.rows.find((r) => r.key === 'aa_agentic_index');
  const i2 = m2.rows.indexOf(row2);
  assert.equal(m2.values['fam-a::high'].find(([x]) => x === i2)?.[1], 58, 'own value never overwritten');
});

test('family-scope fill: a deprecated donor is not shared with a current sibling, keeps its own value', () => {
  const d = ds({ high: { deprecated: true } });
  const m = buildBenchmarkMatrix(viewOf([agenticAxis]), d, tax);
  const row = m.rows.find((r) => r.key === 'aa_agentic_index');
  assert.ok(row, 'the row still exists (visible measured rows: deprecated donor + other)');
  assert.equal(familyScopeDonorOf(row, 'fam-a::max'), null);
  assert.equal((m.values['fam-a::max'] ?? []).length, 0, 'current column stays empty');
  const i = m.rows.indexOf(row);
  assert.equal(m.values['fam-a::high'].find(([x]) => x === i)?.[1], 58, 'the deprecated donor keeps its own published value');
});

test('model-field rows (Epoch ECI) fill at family scope too', () => {
  const taxEci = { ...tax, model_field_rows: [
    { key: 'epoch_eci', field: 'epoch_eci', name: 'ECI', maintainer: 'Epoch AI', source: 'epoch_eci', unit: 'points', url: '', description: '' },
  ] };
  const d = ds();
  d.models[1] = { ...d.models[1], benchmarks: { ...d.models[1].benchmarks, epoch_eci: 164.5 } };
  const m = buildBenchmarkMatrix(viewOf([]), d, taxEci);
  const i = m.rows.findIndex((r) => r.key === 'epoch_eci');
  assert.ok(i >= 0);
  assert.equal(familyScopeDonorOf(m.rows[i], 'fam-a::max'), 'fam-a::high');
  assert.equal((m.values['fam-a::max'] ?? []).find(([x]) => x === i)?.[1], 164.5);
});

test('saturation and ordering count own measurements only, never fills', () => {
  // four own holders; the fill adds one more column entry → stays unassessable (< 5 measured).
  const d = ds();
  d.models.push(
    { id: 'fam-a::low', family_key: 'fam-a', variant: 'low', display_name: 'A (low)', benchmarks: {} },
    { id: 'f-b::default', family_key: 'f-b', variant: 'default', display_name: 'C', benchmarks: {} },
    { id: 'f-c::default', family_key: 'f-c', variant: 'default', display_name: 'D', benchmarks: {} },
  );
  const axis = { ...agenticAxis, scores: [
    { id: 'a1', modelId: 'fam-a::high', value: 58, basis: 'measured', date: '2026-09-18', source: 0 },
    { id: 'a2', modelId: 'other::default', value: 40, basis: 'measured', date: '2026-09-18', source: 0 },
    { id: 'a3', modelId: 'f-b::default', value: 35, basis: 'measured', date: '2026-09-18', source: 0 },
    { id: 'a4', modelId: 'f-c::default', value: 30, basis: 'measured', date: '2026-09-18', source: 0 },
  ] };
  // A plain non-family scope board with MORE own holders (5) than the agentic row (4 own + 2 filled).
  const plain = { ...agenticAxis, id: 'board-x::v1', benchmarkId: 'board-x::v1', name: 'Board X',
    scores: [...axis.scores, { id: 'a5', modelId: 'fam-a::low', value: 25, basis: 'measured', date: '2026-09-18', source: 0 }] };
  const m = buildBenchmarkMatrix(viewOf([axis, plain]), d, tax);
  const agenticIdx = m.rows.findIndex((r) => r.key === 'aa_agentic_index');
  const plainIdx = m.rows.findIndex((r) => r.key === 'board-x');
  assert.ok(plainIdx >= 0 && agenticIdx >= 0);
  assert.equal(m.rows[agenticIdx].saturation, null, '4 own measurements + fills must not become “5 measured models”');
  assert.equal(Object.keys(m.rows[agenticIdx].familyScope.fill).length, 2, 'both valueless siblings filled (::max, ::low)');
  assert.ok(plainIdx < agenticIdx, 'more-own-results first; fills are not coverage');
});

test('the family-scope axis keys stay the documented set (plus the two model-field ECI rows)', () => {
  assert.deepEqual([...FAMILY_SCOPE_AXIS_KEYS].sort(), ['aa_agentic_index', 'frontend', 'fullstack']);
});
