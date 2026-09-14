import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rowBars, rowWinners, formatValue, groupOf, buildBenchmarkMatrix, baseKey, resultHref, chartScale, chartRows } from '../lib/benchmark-matrix.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

const taxonomy = JSON.parse(readFileSync(new URL('../data/benchmark-taxonomy.json', import.meta.url)));

test('CR-1.5 bars: proportional for ratio units, inverted for lower-is-better, none when missing', () => {
  assert.deepEqual(rowBars([0.5, 1, null], true, 'fraction'), [0.5, 1, null]);
  assert.deepEqual(rowBars([2, 4], false, 'USD'), [1, 0.5]);
  assert.deepEqual(rowBars([1, 2], null, 'percent'), [null, null]);
  assert.deepEqual(rowBars([null, null], true, 'percent'), [null, null]);
});

test('CR-1.5 bars: Elo uses min–max with a floor, direction-aware', () => {
  const [low, high] = rowBars([1200, 1300], true, 'Elo');
  assert.equal(high, 1);
  assert.ok(low > 0 && low < 0.2);
  assert.deepEqual(rowBars([1250, 1250], true, 'Elo'), [1, 1]);
  const [cheap, dear] = rowBars([-1, 3], false, 'points');
  assert.equal(cheap, 1);
  assert.ok(dear < 0.2);
});

test('CR-1.9 chart scale: fixed 0–100 % bars, nice ceiling for points, none when empty', () => {
  const f = chartScale([0.5, 0.25, null], 'fraction');
  assert.equal(f.kind, 'bar');
  assert.deepEqual(f.domain, [0, 1]);
  assert.deepEqual(f.positions, [0.5, 0.25, null]);
  assert.deepEqual(chartScale([40, 80], 'percent').domain, [0, 100]);
  const p = chartScale([61.2, 73.9], 'points');
  assert.deepEqual(p.domain, [0, 100]);
  assert.equal(chartScale([null, null], 'points'), null);
});

test('CR-1.9 chart scale: > 20× spread becomes a log position, zeros pinned left', () => {
  const s = chartScale([0.1, 30, 0, null], 'USD');
  assert.equal(s.kind, 'log');
  assert.deepEqual(s.domain, [0.1, 100]);
  assert.equal(s.positions[0], 0);
  assert.equal(s.positions[2], 0);
  assert.equal(s.positions[3], null);
  assert.ok(Math.abs(s.positions[1] - Math.log(300) / Math.log(1000)) < 1e-9);
  assert.equal(chartScale([1, 20], 'USD').kind, 'bar');
});

test('CR-1.9 chart scale: Elo is a position between the padded row min and max, never from zero', () => {
  const s = chartScale([1200, 1300, null], 'Elo');
  assert.equal(s.kind, 'position');
  assert.ok(s.domain[0] > 1000 && s.domain[0] < 1200 && s.domain[1] > 1300);
  assert.ok(s.positions[0] > 0 && s.positions[0] < s.positions[1] && s.positions[1] < 1);
  const flat = chartScale([1250, 1250], 'Elo');
  assert.equal(flat.positions[0], flat.positions[1]);
  assert.ok(chartScale([-1, 3], 'points').kind === 'position');
});

test('CR-1.9 chart rows: important rows only, at least two values', () => {
  const rows = [
    { group: 'indices', tags: [] }, { group: 'coding', tags: ['niche'] },
    { group: 'coding', tags: ['headline'] }, { group: 'math', tags: ['aa'] },
  ];
  const cols = [new Map([[0, 70], [1, 5], [2, 50], [3, 1]]), new Map([[0, 60], [1, 6], [2, null]])];
  assert.deepEqual(chartRows(rows, cols).map((r) => r.row), [rows[0]]);
});

test('CR-1.6 winners: ties, lower-is-better, missing values, fewer than two values', () => {
  assert.deepEqual(rowWinners([80, 90, 90, null], true), [false, true, true, false]);
  assert.deepEqual(rowWinners([3, 1, 2], false), [false, true, false]);
  assert.deepEqual(rowWinners([5, null, null], true), [false, false, false]);
  assert.deepEqual(rowWinners([5, 7], null), [false, false]);
});

test('CR-1.8 resultHref round-trips axis, model, compared models and pin state', () => {
  const href = resultHref('aa-lcr::1.1@@Published%20board@@fraction', 'gpt-6-astra::max', ['gpt-6-astra::max', 'claude-opus-5::max'], true);
  const u = new URL(href, 'https://x.test');
  assert.equal(u.pathname, '/benchmarks/result');
  assert.equal(u.searchParams.get('axis'), 'aa-lcr::1.1@@Published%20board@@fraction');
  assert.equal(u.searchParams.get('model'), 'gpt-6-astra::max');
  assert.deepEqual(u.searchParams.get('models').split(','), ['gpt-6-astra::max', 'claude-opus-5::max']);
  assert.equal(u.searchParams.get('pinned'), '1');
  assert.equal(new URL(resultHref('a', 'b', ['b'], false), 'https://x.test').searchParams.get('pinned'), null);
});

test('formatValue keeps units honest', () => {
  assert.equal(formatValue(0.4567, 'fraction'), '45.7%');
  assert.equal(formatValue(61.25, 'percent'), '61.3%');
  assert.equal(formatValue(1287.6, 'Elo'), '1,288');
  assert.equal(formatValue(0.042, 'USD'), '$0.042');
  assert.equal(formatValue(null, 'points'), '—');
});

const ds = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url)));
const matrix = buildBenchmarkMatrix(buildBenchmarkView(ds), ds, taxonomy);

test('CR-1.3 every registry benchmark lands in exactly one known group', () => {
  const ids = new Set(taxonomy.groups.map((g) => g.id));
  for (const b of ds.benchmark_results.registry) {
    const g = groupOf(baseKey(b.id), b.category, taxonomy);
    assert.ok(ids.has(g), `${b.id} → ${g}`);
    if (b.category !== 'Other') assert.notEqual(g, 'other', `${b.id} (${b.category}) fell through to Other`);
  }
  for (const row of matrix.rows) assert.ok(ids.has(row.group), row.id);
});

test('CR-1.4 AA Intelligence Index and its individual AA results are rows of their own', () => {
  const byBenchmark = new Set(matrix.rows.map((r) => r.benchmarkId));
  const index = matrix.rows.find((r) => r.key === 'aa_intelligence_index');
  assert.ok(index, 'AA Intelligence Index row');
  assert.equal(index.group, 'indices');
  for (const id of ['aa-gpqa-diamond::snapshot-2026-09-10', 'aa-hle::snapshot-2026-09-10', 'aa-ifbench::snapshot-2026-09-10', 'aa-lcr::1.1', 'aa-scicode::1.0.1', 'aa-terminal-bench::4.0', 'aa-tau3-banking::1.0.1', 'aa-critpt::snapshot-2026-09-10']) {
    assert.ok(byBenchmark.has(id), `${id} missing`);
  }
  const aaRows = matrix.rows.filter((r) => r.tags.includes('aa'));
  assert.ok(aaRows.length >= 20, `only ${aaRows.length} AA rows`);
  const arena = matrix.rows.filter((r) => r.tags.includes('arena'));
  assert.ok(arena.length >= 2 && arena.every((r) => r.group === 'design'));
});

test('matrix cells trace to data: every row has a value, every value is finite and on a catalog model', () => {
  const catalog = new Set(ds.models.map((m) => m.id));
  const counts = new Array(matrix.rows.length).fill(0);
  for (const [modelId, cells] of Object.entries(matrix.values)) {
    assert.ok(catalog.has(modelId), modelId);
    for (const [i, v] of cells) { assert.ok(Number.isFinite(v)); counts[i]++; }
  }
  assert.ok(counts.every((n) => n > 0));
  const order = matrix.groups.map((g) => g.id);
  const seen = matrix.rows.map((r) => order.indexOf(r.group));
  assert.deepEqual(seen, [...seen].sort((a, b) => a - b), 'rows are contiguous by group');
});

test('CR-1.7 every tier key names a real row and a defined tag', () => {
  const keys = new Set(matrix.rows.map((r) => r.key));
  for (const [key, tier] of Object.entries(taxonomy.tiers)) {
    assert.ok(taxonomy.tags[tier], `${key}: unknown tier ${tier}`);
    assert.ok(keys.has(key) || ds.benchmark_results.registry.some((b) => baseKey(b.id) === key), `${key}: no such benchmark`);
  }
});
