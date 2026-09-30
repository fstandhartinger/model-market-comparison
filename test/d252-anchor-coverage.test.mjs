// D252, 2026-09-28. CR-25.6 fixes a category composite's anchor set in
// data/category-score-anchors.json and scores a model only when it has a result on EVERY anchor. That
// makes one thin anchor decide the whole category's coverage, which is why the rule says a category is
// only offered when its benchmarks are measured for at least 60 % of the featured model families — and
// why each anchor was recorded at >= 0.65 when the sets were written on 2026-09-15.
//
// Nothing re-measured it. By 2026-09-28 four anchors had fallen below the bar (DeepSWE 65 % -> 35 %,
// EnterpriseOps-Gym-AA 65 % -> 35 %, MLCR-AA 90 % -> 55 %, and GDP.pdf (AA), whose current identity
// covers 15 % where the September 10 snapshot covered 65 %), so Coding scored 50 of 868 model rows,
// Agentic 45 and Long context exactly one. These checks re-measure coverage from the built dataset on
// every run, so the drift cannot return silently, and they tie the score pickers to what the dataset
// actually publishes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';
import { buildBenchmarkMatrix } from '../lib/benchmark-matrix.mjs';
import { resolveAnchors, computeCategoryScores } from '../lib/category-scores.mjs';
import { importTsModule } from './helpers/transpile-ts.mjs';
import { SIMPLE_SCORE_CHOICES } from '../lib/value-map.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const dataset = read('../data/dataset.json');
const anchors = read('../data/category-score-anchors.json');
const taxonomy = read('../data/benchmark-taxonomy.json');
const caveats = read('../data/benchmark-caveats.json');

const matrix = buildBenchmarkMatrix(buildBenchmarkView(dataset), dataset, taxonomy, caveats);
const { SCORE_OPTIONS } = await importTsModule(new URL('../lib/cost.ts', import.meta.url));

/** The rule's own denominator: the featured, non-deprecated model families (ops/…/cr-25-6-coverage.mjs). */
const featuredFamilies = new Set(dataset.models.filter((m) => m.featured && !m.deprecated).map((m) => m.family_key));
const familyOf = new Map(dataset.models.map((m) => [m.id, m.family_key]));

/** Featured-family coverage of one resolved matrix row, counting measured values only (basis 0). */
function coverage(rowIndex) {
  const families = new Set();
  for (const [id, values] of Object.entries(matrix.values)) {
    const family = familyOf.get(id);
    if (!featuredFamilies.has(family)) continue;
    for (const [index, , basis] of values) if (index === rowIndex && (basis ?? 0) === 0) families.add(family);
  }
  return families.size / featuredFamilies.size;
}

test('D252: every anchor of every offered category still clears the coverage bar', () => {
  assert.ok(featuredFamilies.size >= 10, `the denominator is the featured families, got ${featuredFamilies.size}`);
  const resolved = resolveAnchors(matrix, anchors);
  assert.equal(resolved.length, anchors.categories.length,
    'a declared category did not resolve — an anchor board is missing from this build');
  for (const category of resolved) {
    for (const row of category.rows) {
      const measured = coverage(row.index);
      assert.ok(measured >= anchors.min_coverage,
        `${category.label}: anchor ${row.key} (${row.name}, v${row.version}) is measured for`
        + ` ${(measured * 100).toFixed(0)} % of the ${featuredFamilies.size} featured families, below the`
        + ` ${(anchors.min_coverage * 100).toFixed(0)} % bar CR-25.6 sets. Withdraw it to \`withdrawn\` with`
        + ' its measured coverage, or, if the category is then left with fewer than'
        + ` ${anchors.min_anchors} anchors, withdraw the category — do not lower the bar.`);
    }
    assert.ok(category.rows.length >= anchors.min_anchors, `${category.label}: ${category.rows.length} anchors`);
  }
});

test('D252: each anchor records the coverage it was last measured at, and the file says what it withdrew', () => {
  for (const category of anchors.categories) {
    for (const anchor of category.anchors) {
      assert.ok(typeof anchor.coverage_2026_09_28 === 'number',
        `${category.id}/${anchor.key}: no re-measured coverage recorded`);
      assert.ok(anchor.coverage_2026_09_28 >= anchors.min_coverage,
        `${category.id}/${anchor.key}: recorded at ${anchor.coverage_2026_09_28}, below the bar`);
    }
  }
  const withdrawn = anchors.withdrawn;
  assert.ok(withdrawn && Array.isArray(withdrawn.anchors) && withdrawn.anchors.length >= 5, 'the withdrawal record is kept');
  for (const entry of withdrawn.anchors) {
    assert.ok(entry.key && entry.category && entry.why?.length > 40, `${entry.key}: a withdrawal needs its reason`);
    assert.ok(typeof entry.coverage_2026_09_28 === 'number', `${entry.key}: record the coverage it was measured at`);
  }
  for (const entry of withdrawn.categories ?? []) {
    assert.ok(entry.why?.length > 40 && entry.returns_when?.length > 20, `${entry.key}: say why, and what brings it back`);
    assert.ok(!anchors.categories.some((c) => c.key === entry.key), `${entry.key}: withdrawn and still offered`);
  }
});

// A withdrawn category must leave the pickers with the data. If it stays in a list, the reader can select
// a score no model has; and because lib/settings-state.ts validates a stored or deep-linked `score`
// against SCORE_OPTIONS, leaving it out is also what makes an old bookmark fall back to the default
// instead of rendering a column of dashes.
test('D252: the score pickers offer exactly the category composites the dataset publishes', () => {
  const published = new Set((dataset.category_scores?.categories ?? []).map((c) => c.key));
  assert.deepEqual([...published].sort(), anchors.categories.map((c) => c.key).sort(),
    'published category scores must exactly match the declared qualified anchor sets');
  const { scores } = computeCategoryScores(matrix, anchors);
  const held = new Set();
  for (const row of scores.values()) for (const key of Object.keys(row)) held.add(key);
  assert.deepEqual([...held].sort(), [...published].sort(), 'a published category that no model holds');
  for (const [name, list] of [['SCORE_OPTIONS', SCORE_OPTIONS], ['SIMPLE_SCORE_CHOICES', [...SIMPLE_SCORE_CHOICES]]]) {
    const offered = list.filter((k) => k.startsWith('cat_'));
    assert.deepEqual(offered.slice().sort(), [...published].sort(),
      `${name} offers category scores the dataset does not publish, or misses one it does`);
  }
});

// The fourth category is not gone from the catalog, only from the selectable scores: the benchmark
// table still shows its group and its group header composite. Pin that, so "withdrawn" can never be
// read as "the boards were dropped".
test('D252: withdrawing a category score keeps its benchmarks and its table group', () => {
  const group = matrix.groups.find((g) => g.id === 'long-context');
  assert.ok(group, 'the long-context group is still a benchmark group');
  const rows = matrix.rows.filter((r) => r.group === 'long-context');
  assert.ok(rows.length >= 6, `the long-context boards are still published, got ${rows.length}`);
  for (const key of ['aa-lcr', 'aa-mlcr', 'aa-gdp-pdf']) {
    assert.ok(rows.some((r) => r.key === key), `${key} is still in the table`);
  }
  assert.equal((dataset.category_scores?.categories ?? []).some((c) => c.key === 'cat_long_context'), false);
  for (const model of dataset.models) {
    assert.equal(model.category_scores?.cat_long_context, undefined, `${model.id} still carries a withdrawn category score`);
  }
});
