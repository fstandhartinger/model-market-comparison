// CR-41.1 / CR-41.2 (Florian 2026-09-16): agent/version runs of one board read as one row with each model's best
// recorded result; every value still points at the exact run it came from.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeBestOf, cellAxisId, variantLabel, countBoards, buildBenchmarkMatrix } from '../lib/benchmark-matrix.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

const row = (key, version, cohort, extra = {}) => ({ id: `${key}::${version}@@${cohort}`, benchmarkId: `${key}::${version}`, key, name: `${key} v${version}`, cohort, version, unit: 'percent', higherBetter: true, tags: [], saturation: null, asOf: '2026-09-14', ...extra });
const cand = (r, values) => ({ row: r, byModel: new Map(Object.entries(values)) });
const TAX = { best_of: { harness_cohorts: ['Claude Code', 'Codex'], across_versions: ['idx'] } };

test('harness runs of one board merge into one row holding each model\'s best, with its source run', () => {
  const c = [
    cand(row('bench', '1', 'Claude Code'), { a: [49, 0], b: [20, 0] }),
    cand(row('bench', '1', 'Codex'), { b: [30, 0], c: [21, 1] }),
    cand(row('other', '1', 'Published board'), { a: [1, 0] }),
  ];
  mergeBestOf(c, TAX);
  assert.equal(c.length, 2);
  const m = c[0];
  assert.equal(m.row.id, 'bench::best-of::1');
  assert.match(m.row.cohort, /^best of Claude Code \/ Codex$/);
  assert.deepEqual([...m.byModel.entries()].sort(), [['a', [49, 0]], ['b', [30, 0]], ['c', [21, 1]]]);
  assert.equal(cellAxisId(m.row, 'b'), 'bench::1@@Codex');
  assert.equal(cellAxisId(m.row, 'a'), 'bench::1@@Claude Code');
  assert.equal(variantLabel(m.row, 'b'), 'Codex');
  assert.equal(cellAxisId(c[1].row, 'a'), c[1].row.id, 'plain rows are their own source');
});

test('boards listed across_versions merge versions too; name drops the version, boards still count twice', () => {
  const c = [
    cand(row('idx', '1.4', 'Claude Code', { unit: 'fraction' }), { a: [0.70, 0] }),
    cand(row('idx', '1.5', 'Claude Code', { unit: 'fraction' }), { a: [0.62, 0], b: [0.43, 0] }),
    cand(row('idx', '1.5', 'Codex', { unit: 'fraction' }), { b: [0.40, 0] }),
  ];
  mergeBestOf(c, TAX);
  assert.equal(c.length, 1);
  const r = c[0].row;
  assert.equal(r.name, 'idx');
  assert.equal(r.version, '1.4 / 1.5');
  assert.equal(r.cohort, 'best of v1.4 / v1.5 · Claude Code / Codex');
  assert.equal(countBoards([r]), 2);
  assert.deepEqual(c[0].byModel.get('a'), [0.70, 0]);
  assert.equal(variantLabel(r, 'a'), 'v1.4 · Claude Code');
  assert.equal(variantLabel(r, 'b'), 'v1.5 · Claude Code');
});

test('a cost twin follows the run its score row picked, never another agent\'s cost; lower is better otherwise', () => {
  const c = [
    cand(row('bench-cost', '1', 'Claude Code', { unit: 'USD', higherBetter: false }), { a: [5, 0], z: [9, 0] }),
    cand(row('bench-cost', '1', 'Codex', { unit: 'USD', higherBetter: false }), { a: [2, 0], z: [3, 0] }),
    cand(row('bench', '1', 'Claude Code'), { a: [49, 0] }),
    cand(row('bench', '1', 'Codex'), { a: [30, 0] }),
  ];
  mergeBestOf(c, TAX);
  const costRow = c.find((x) => x.row.key === 'bench-cost');
  assert.deepEqual(costRow.byModel.get('a'), [5, 0], 'the Claude Code cost, because the Claude Code score was the best');
  assert.deepEqual(costRow.byModel.get('z'), [3, 0], 'no score picked: the lower cost');
});

test('different units or directions, other cohorts and single runs never merge', () => {
  const c = [
    cand(row('bench', '1', 'Claude Code'), { a: [1, 0] }),
    cand(row('bench', '1', 'Codex', { unit: 'fraction' }), { b: [0.2, 0] }),
    cand(row('bench', '2', 'Codex'), { b: [3, 0] }),
    cand(row('s', '1', 'parallel · server-tool'), { a: [1, 0] }),
    cand(row('s', '1', 'perplexity · server-tool'), { a: [2, 0] }),
  ];
  mergeBestOf(c, TAX);
  assert.equal(c.length, 5);
  assert.ok(c.every((x) => !x.row.bestOf));
  const none = [cand(row('bench', '1', 'Claude Code'), { a: [1, 0] }), cand(row('bench', '1', 'Codex'), { b: [2, 0] })];
  mergeBestOf(none, {});
  assert.equal(none.length, 2, 'no rule, no merge');
});

test('on the committed dataset: every merged value is its picked run\'s raw value and the best of its runs; board count unchanged', () => {
  const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
  const ds = read('data/dataset.json'), tax = read('data/benchmark-taxonomy.json'), cav = read('data/benchmark-caveats.json');
  const view = buildBenchmarkView(ds);
  const raw = buildBenchmarkMatrix(view, ds, { ...tax, best_of: undefined }, cav);
  const merged = buildBenchmarkMatrix(view, ds, tax, cav);
  assert.equal(merged.catalogBoards, raw.catalogBoards);
  const idx = new Map(raw.rows.map((r, i) => [r.id, i]));
  const bestRows = merged.rows.map((r, i) => [r, i]).filter(([r]) => r.bestOf);
  assert.ok(bestRows.some(([r]) => r.key === 'apprenticebench-api') && bestRows.some(([r]) => r.key === 'aa-coding-agent-index' && r.bestOf.acrossVersions));
  let checked = 0;
  for (const [r, i] of bestRows) for (const [modelId, list] of Object.entries(merged.values)) for (const [k, v, b] of list) {
    if (k !== i) continue;
    const src = raw.values[modelId].find(([j]) => j === idx.get(cellAxisId(r, modelId)));
    assert.deepEqual([src[1], src[2]], [v, b], `${r.id} ${modelId}`);
    if (!/-cost$/.test(r.key)) {
      const all = r.bestOf.variants.map((x) => raw.values[modelId].find(([j]) => j === idx.get(x.id))?.[1]).filter((x) => x != null);
      assert.equal(v, r.higherBetter === false ? Math.min(...all) : Math.max(...all));
    }
    checked++;
  }
  assert.ok(checked > 50);
  // every raw run of a merged board is represented, none survives as its own row
  for (const [r] of bestRows) for (const x of r.bestOf.variants) assert.ok(!merged.rows.some((m) => m.id === x.id));
});
