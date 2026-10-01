import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditCategoryCoverage } from '../lib/category-coverage.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';
import { buildBenchmarkMatrix } from '../lib/benchmark-matrix.mjs';
const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const ds = read('../data/dataset.json'), anchors = read('../data/category-score-anchors.json');
const matrix = buildBenchmarkMatrix(buildBenchmarkView(ds), ds,
  read('../data/benchmark-taxonomy.json'), read('../data/benchmark-caveats.json'));

// Data-independent on purpose: the daily pipeline runs this suite against each freshly built dataset, so it
// may not pin which categories qualify today (CR-244 L1). It pins that every OFFERED category qualifies (the
// fail-closed alarm) and that every withdrawn anchor is still re-measured, so a return is reported.
test('CR-244: every offered category qualifies on the built dataset and every withdrawn anchor is audited', () => {
  const report = auditCategoryCoverage(matrix, ds, anchors);
  assert.deepEqual(report.offered_failures, []);
  assert.deepEqual(report.categories.filter(c => c.offered).map(c => c.key), anchors.categories.map(c => c.key));
  assert.equal(report.categories.flatMap(c => c.anchors).filter(r => !r.active).length, anchors.withdrawn.anchors.length);
});

const dataset = { models: Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, family_key: `f${i}`, featured: true })) };
const fixtureAnchors = { min_coverage: 0.6, min_anchors: 2, categories: [], withdrawn: {
  categories: [{ id: 'long-context', key: 'cat_long_context', group: 'long-context' }],
  anchors: ['one', 'two'].map(key => ({ category: 'long-context', key })) } };
function fixture(n, { judged = false, basis = 0, newest = false, missing = false } = {}) {
  const rows = [{ key: 'one', group: 'long-context', version: '1', unit: 'percent', higherBetter: true },
    { key: 'two', group: 'long-context', version: '1', unit: 'percent', higherBetter: true, judged }];
  if (missing) rows.pop();
  if (newest) rows.push({ ...rows[1], version: '2' });
  const values = Object.fromEntries(dataset.models.map((m, i) => [m.id,
    [[0, 50, 0], ...(i < n && !missing ? [[1, 60, basis]] : []), ...(newest && i < 5 ? [[2, 70, 0]] : [])]]));
  return { rows, values };
}
test('CR-244: withdrawn category alerts exactly at 60%, without restoring any scores', () => {
  assert.deepEqual(auditCategoryCoverage(fixture(5), dataset, fixtureAnchors).requalified_categories, []);
  const green = auditCategoryCoverage(fixture(6), dataset, fixtureAnchors);
  assert.deepEqual(green.requalified_categories, ['cat_long_context']);
  assert.equal(green.categories[0].offered, false);
  assert.deepEqual(fixtureAnchors.categories, []);
});
test('CR-244: current thin version, judged, unmeasured and missing anchors cannot requalify', () => {
  for (const options of [{ newest: true }, { judged: true }, { basis: 1 }, { missing: true }]) {
    const r = auditCategoryCoverage(fixture(10, options), dataset, fixtureAnchors);
    assert.deepEqual(r.requalified_categories, [], JSON.stringify(options));
  }
});
test('CR-244: active category fails when an anchor is thin; a qualifying withdrawn anchor cannot substitute', () => {
  const active = structuredClone(fixtureAnchors);
  active.categories = [{ ...active.withdrawn.categories[0], anchors: [{ key: 'one' }, { key: 'two' }] }];
  active.withdrawn.categories = [];
  const red = auditCategoryCoverage(fixture(5), dataset, active);
  assert.deepEqual(red.offered_failures, ['cat_long_context']);
  assert.deepEqual(auditCategoryCoverage(fixture(6), dataset, active).offered_failures, []);
});
test('CR-244: featured families are deduplicated and deprecated/unfeatured models do not count', () => {
  const duplicated = structuredClone(dataset);
  duplicated.models.push({ id: 'dup', family_key: 'f0', featured: true },
    { id: 'old', family_key: 'old', featured: true, deprecated: true },
    { id: 'hidden', family_key: 'hidden', featured: false });
  const report = auditCategoryCoverage(fixture(6), duplicated, fixtureAnchors);
  assert.equal(report.featured_families, 10);
  assert.deepEqual(report.requalified_categories, ['cat_long_context']);
  assert.throws(() => auditCategoryCoverage(fixture(6), { models: [] }, fixtureAnchors), /featured/);
});
