import test from 'node:test';
import assert from 'node:assert/strict';
import { rowOutliers, scoreTypeText, OUTLIER_MIN_VALUES } from '../lib/benchmark-matrix.mjs';

test('CR-29.3: a clear leader and a clear laggard get one tag each; ordinary max/min do not', () => {
  assert.equal(OUTLIER_MIN_VALUES, 4);
  assert.deepEqual(rowOutliers([90, 60, 58, 55, 20], true), ['top', null, null, null, 'low']);
  assert.deepEqual(rowOutliers([62, 60, 58, 55, 53], true), [null, null, null, null, null], 'evenly spread row: no tag');
  assert.deepEqual(rowOutliers([90, 50, 50, 10], true), ['top', null, null, 'low'], 'flat core: both ends stand out');
  assert.deepEqual(rowOutliers([90, 88, 50, 48, 46], true), [null, null, null, null, null], 'two leaders close together: no top');
});

test('CR-29.3: direction-aware, ties, missing values and short rows', () => {
  assert.deepEqual(rowOutliers([1.0, 9.0, 9.5, 10], false), ['top', null, null, null], 'lower is better: the lowest is top');
  assert.deepEqual(rowOutliers([90, 90, 50, 49, 48], true), [null, null, null, null, null], 'tied best: no tag');
  assert.deepEqual(rowOutliers([90, null, 40, 38, 36], true), ['top', null, null, null, null]);
  assert.deepEqual(rowOutliers([90, 40, 38], true), [null, null, null], 'fewer than four results: no tag');
  assert.deepEqual(rowOutliers([90, 40, 38, 36], null), [null, null, null, null], 'unknown direction: no tag');
  assert.deepEqual(rowOutliers([5, 5, 5, 5], true), [null, null, null, null]);
});

test('CR-31.2: every row gets a non-empty score-type sentence', () => {
  assert.match(scoreTypeText({ unit: 'fraction', higherBetter: true }), /percentage.*Higher is better/);
  assert.match(scoreTypeText({ unit: 'Elo', higherBetter: true }), /Elo rating/);
  assert.match(scoreTypeText({ unit: 'points', higherBetter: true, range: [0, 100] }), /0–100/);
  assert.match(scoreTypeText({ unit: 'USD', higherBetter: false }), /US dollars.*Lower is better/);
  assert.ok(scoreTypeText({ unit: '', higherBetter: null }).length > 10);
});
