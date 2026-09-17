import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rowBars, rowWinners, formatValue, groupOf, buildBenchmarkMatrix, baseKey, resultHref, chartScale, chartRows, importantMatrix } from '../lib/benchmark-matrix.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

const taxonomy = JSON.parse(readFileSync(new URL('../data/benchmark-taxonomy.json', import.meta.url)));

test('CR-1.5 bars: proportional for ratio units, inverted for lower-is-better, none when missing', () => {
  assert.deepEqual(rowBars([0.5, 1, null], true, 'fraction'), [0.5, 1, null]);
  assert.deepEqual(rowBars([2, 4], false, 'USD'), [1, 0.5]);
  assert.deepEqual(rowBars([1, 2], null, 'percent'), [null, null]);
  assert.deepEqual(rowBars([null, null], true, 'percent'), [null, null]);
  // F-84: fewer than two values → no bar (nothing to compare against)
  assert.deepEqual(rowBars([67, null, null], true, 'percent'), [null, null, null]);
  assert.deepEqual(rowBars([null, 157.6], true, 'points'), [null, null]);
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

test('CR-7.1 importantMatrix keeps Important rows only, re-indexes values, optionally per model', () => {
  const matrix = {
    version: 't', tags: {}, generatedAt: 'x',
    groups: [{ id: 'indices', label: 'I' }, { id: 'coding', label: 'C' }, { id: 'math', label: 'M' }],
    rows: [
      { id: 'r0', group: 'indices', tags: [] }, { id: 'r1', group: 'coding', tags: ['niche'] },
      { id: 'r2', group: 'coding', tags: ['headline'] }, { id: 'r3', group: 'math', tags: ['community'] },
    ],
    values: { a: [[0, 1, 0], [1, 2, 0], [2, 3, 1]], b: [[1, 5, 0], [3, 6, 0]], c: [[2, 7, 0]] },
  };
  const slim = importantMatrix(matrix);
  assert.deepEqual(slim.rows.map((r) => r.id), ['r0', 'r2']);
  assert.deepEqual(slim.groups.map((g) => g.id), ['indices', 'coding']);
  assert.deepEqual(slim.values, { a: [[0, 1, 0], [1, 3, 1]], c: [[1, 7, 0]] });
  assert.deepEqual(Object.keys(importantMatrix(matrix, ['c']).values), ['c']);
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

import { categoryComposite, compatibleRow, COMPOSITE_MIN_ROWS } from '../lib/benchmark-matrix.mjs';

const r = (name, unit, extra = {}) => ({ name, unit, higherBetter: true, range: unit === 'points' ? [0, 100] : null, ...extra });

test('2026-09-15 category composite: mean of shared 0–100 results, missing and incompatible rows excluded', () => {
  assert.equal(COMPOSITE_MIN_ROWS, 2);
  assert.ok(compatibleRow(r('pct', 'percent')) && compatibleRow(r('frac', 'fraction')) && compatibleRow(r('idx', 'points')));
  assert.ok(!compatibleRow(r('elo', 'Elo')), 'Elo has no 0–100 scale');
  assert.ok(!compatibleRow(r('eci', 'points', { range: null })), 'native index scale without a registered 0–100 range');
  assert.ok(!compatibleRow(r('cost', 'USD', { higherBetter: false })), 'lower-is-better rows never average in');
  const entries = [
    { row: r('A', 'percent'), vals: [60, 40] },
    { row: r('B', 'fraction'), vals: [0.8, 0.5] },          // shown as 80 % and 50 %
    { row: r('C', 'percent'), vals: [90, null] },           // model 2 has no result: excluded for both columns
    { row: r('D', 'Elo'), vals: [1300, 1200] },             // incompatible scale
  ];
  const c = categoryComposite(entries, 2);
  assert.deepEqual(c.values, [70, 45]);
  assert.deepEqual(c.rows.map((x) => x.name), ['A', 'B']);
  assert.equal(c.excluded, 2);
});

test('2026-09-15 category composite: fewer than two shared rows is no composite, never a fabricated one', () => {
  const one = categoryComposite([{ row: r('A', 'percent'), vals: [60, 40] }, { row: r('C', 'percent'), vals: [90, null] }], 2);
  assert.deepEqual(one.values, [null, null]);
  assert.deepEqual(categoryComposite([], 3).values, [null, null, null]);
});

test('2026-09-15 category composite follows the compared models and the chosen rows', () => {
  const rows = [r('A', 'percent'), r('B', 'percent'), r('C', 'percent')];
  const table = { m1: [50, 70, 90], m2: [30, null, 60], m3: [40, 20, 10] };
  const view = (ids, keep = rows) => categoryComposite(keep.map((row) => ({ row, vals: ids.map((id) => table[id][rows.indexOf(row)]) })), ids.length);
  assert.deepEqual(view(['m1', 'm3']).values, [70, 70 / 3 * 1]);
  // Adding m2 (no B result) changes the shared set to A and C for everyone.
  assert.deepEqual(view(['m1', 'm2', 'm3']).values, [70, 45, 25]);
  // Deselecting row C (a row preset / filter) changes it again; with m2 only A remains → no composite.
  assert.deepEqual(view(['m1', 'm2'], rows.slice(0, 2)).values, [null, null]);
});

import { scoreRowSubtitle } from '../lib/benchmark-matrix.mjs';

test('2026-09-15 Benchmark Heaven Score row: "Main Composite Score" only for the Composite, never for another score', () => {
  assert.equal(scoreRowSubtitle('composite', 'Composite'), 'Main Composite Score');
  for (const [key, label] of [['aa_coding_index', 'AA Coding'], ['aa_intelligence_index', 'AA Intelligence'], ['designarena_frontend', 'DA Frontend'], ['epoch_eci', 'Epoch ECI']]) {
    const sub = scoreRowSubtitle(key, label);
    assert.equal(sub, `Selected score: ${label}`);
    assert.doesNotMatch(sub, /Composite/);
  }
  const source = readFileSync(new URL('../components/ScoreRows.tsx', import.meta.url), 'utf8');
  assert.match(source, />Benchmark Heaven Score</, 'primary label');
  assert.match(source, /subtitleFor\(score, SCORE_SHORT_LABELS\[score\]\)/, 'the component uses this rule');
});

test('CR-63.6: small values keep one decimal count; formatNative names Elo and matches formatValue otherwise', async () => {
  const { formatNative } = await import('../lib/benchmark-matrix.mjs');
  assert.equal(formatValue(0.8, 'points'), '0.80');
  assert.equal(formatValue(0.58, 'points'), '0.58');
  assert.equal(formatValue(0.0042, 'points'), '0.0042');
  assert.equal(formatNative(0.88, 'fraction'), '88.0%');
  assert.equal(formatNative(46.1, 'percent'), '46.1%');
  assert.equal(formatNative(11.4, 'USD'), '$11.40');
  assert.equal(formatNative(77, 'points'), '77.0');
  assert.equal(formatNative(1625, 'Elo'), '1,625 Elo');
  assert.equal(formatNative(null, 'Elo'), '—');
});

test('CR-65.15: the DesignArena frontend board is labelled Web Apps (agentic) and links its exact board', async () => {
  const { readFile } = await import('node:fs/promises');
  const files = ['lib/types.ts', 'lib/client-model.ts', 'lib/benchmark-view.mjs', 'lib/headline-history.mjs', 'lib/score-label.ts', 'components/CompareView.tsx', 'components/ModelExplorer.tsx', 'components/CompositeNote.tsx', 'app/about/page.tsx'];
  for (const file of files) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /DesignArena Frontend|DA Frontend|Web Dev Frontend|\(Frontend\) Elo/, `${file} still calls the Web Apps board "Frontend"`);
  }
  const view = await readFile(new URL('../lib/benchmark-view.mjs', import.meta.url), 'utf8');
  assert.match(view, /'DesignArena Web Apps \(agentic\)'/);
  assert.match(view, /designarena\.ai\/leaderboard\/\$\{key === 'frontend' \? 'webapps' : 'fullstack'\}/);
});
