import test from 'node:test';
import assert from 'node:assert/strict';
import { rankedEligibleUsecaseKeys, usecaseReleaseReview } from '../lib/jevbench-usecase-review.mjs';
import { currentUsecaseReleaseReview } from '../scripts/check-jevbench-usecase-release.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';

const fixture = (values) => ({ revision: 'fixture', radarMinN: 30,
  dims: [{ key: 'usecases', cats: [{ key: 'gaming', label: 'Gaming', plotted: true, n: 60 },
    { key: 'hidden', plotted: false, n: 10 }] }],
  systems: Object.fromEntries(values.map((v, i) => [String(i), { usecases: { gaming: [v, 30] } }])) });
const review = (values) => usecaseReleaseReview(fixture(values), values.map((_, i) => String(i))).categories[0];

test('strict <10 and <5 boundaries and ordinary even/odd medians', () => {
  assert.deepEqual(review([9, 9.99]).flags, ['all_below_10', 'best_minus_median_below_5']);
  assert.deepEqual(review([0, 10]).flags, []); // best 10; median 5; spread 5
  assert.deepEqual(review([10, 10]).flags, ['best_minus_median_below_5']);
  assert.deepEqual(review([0, 0, 9]).flags, ['all_below_10']);
  assert.deepEqual(review([20, 24, 28]).flags, ['best_minus_median_below_5']);
  assert.deepEqual(review([0, 5, 10]).flags, []);
  assert.equal(review([28, 20, 24]).median, 24);
});

test('zero is measured; missing/null/non-finite and under-30 cells are gaps, never zeros', () => {
  const view = fixture([0, null, NaN, Infinity, 5, 6]);
  view.systems['4'].usecases.gaming[1] = 29;
  delete view.systems['5'].usecases.gaming;
  const report = usecaseReleaseReview(view, ['0', '0', '1', '2', '3', '4', '5']);
  const c = report.categories[0];
  assert.equal(report.categories.length, 1); // only displayed spokes
  assert.equal(c.eligible, 6);
  assert.equal(c.measured, 1);
  assert.equal(c.best, 0);
  assert.equal(c.median, 0);
  assert.equal(c.coverage, 1 / 6);
  assert.deepEqual(c.missingKeys, ['1', '2', '3', '4', '5']);
  assert.deepEqual(c.flags, []); // no unsupported whole-cohort claim
  assert.deepEqual(c.coverageIssues, ['incomplete_coverage']);
  assert.equal(c.reviewRequired, true);
});

test('empty eligible cohort has null statistics and requires coverage review', () => {
  const c = usecaseReleaseReview(fixture([]), []).categories[0];
  assert.equal(c.best, null);
  assert.equal(c.median, null);
  assert.equal(c.bestMinusMedian, null);
  assert.equal(c.coverage, null);
  assert.deepEqual(c.flags, []);
  assert.deepEqual(c.coverageIssues, ['no_ranked_eligible_models']);
});

test('both boards contribute ranked eligible models once; wrappers/catalogue/outside caps excluded', () => {
  const model = (key, extra = {}) => ({ key, display: key, ranked: true, listing: 'ranked',
    axes: { intelligence: 60, calibration: 70, speed: 90 },
    cost: { usd_per_1000: 0.01 }, speed: { p50_s_adjusted: 0.1 }, ...extra });
  const open = model('open'), api = model('api');
  const boards = { open: { systems: [open, { ...api, ranked: false }, model('wrapper', { listing: 'wrapper' }),
    model('unmeasured', { ranked: false }), model('expensive', { cost: { usd_per_1000: 1 } }),
    model('slow', { speed: { p50_s_adjusted: 10 } })], not_measured: [model('catalogue')] },
  api: { systems: [api, open] } };
  assert.deepEqual(rankedEligibleUsecaseKeys(boards), ['api', 'open']);
});

test('live report uses shipped category values, covers both boards and never mutates scores', async () => {
  const report = await currentUsecaseReleaseReview();
  assert.ok(report.boards.open.length > 0 && report.boards.api.length > 0);
  assert.equal(report.eligibleKeys.length, new Set(Object.values(report.boards).flat()).size);
  const view = jevbenchCategoryView(report.revision, report.eligibleKeys, { supplement: true });
  const before = JSON.stringify(view);
  assert.equal(report.categories.length, view.dims.find((d) => d.key === 'usecases').cats.filter((c) => c.plotted).length);
  for (const cat of report.categories) {
    assert.equal(cat.measured + cat.missingKeys.length, report.eligibleKeys.length);
    for (const cell of cat.cells) {
      assert.deepEqual([cell.value, cell.n], view.systems[cell.key].usecases[cat.key]);
      assert.ok(cell.value >= 0 && cell.value <= 100);
    }
  }
  usecaseReleaseReview(view, report.eligibleKeys);
  assert.equal(JSON.stringify(view), before);
});
