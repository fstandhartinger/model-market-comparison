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

import { shortlistColumns } from '../lib/benchmark-matrix.mjs';
test('CR-33.1/33.2: shortlist columns sort high → low, keep models without a value as no data (never zero), Elo on a position scale', () => {
  const pts = shortlistColumns([{ id: 'a', value: 91.2 }, { id: 'b', value: null }, { id: 'c', value: 99.5 }, { id: 'd', value: 88 }], 'points');
  assert.deepEqual(pts.columns.map((c) => c.id), ['c', 'a', 'd', 'b']);
  assert.equal(pts.columns[3].noData, true);
  assert.equal(pts.columns[3].height, null);
  assert.ok(pts.columns[0].height > pts.columns[2].height);
  const elo = shortlistColumns([{ id: 'x', value: 1350 }, { id: 'y', value: 1171 }], 'Elo');
  assert.equal(elo.kind, 'position');
  assert.ok(elo.columns[1].height > 0 && elo.columns[1].height < elo.columns[0].height, 'Elo bars are positions, not from zero');
  assert.deepEqual(shortlistColumns([{ id: 'z', value: null }], 'points').columns.map((c) => c.noData), [true]);
});

import { matrixForModels } from '../lib/benchmark-matrix.mjs';
test('CR-28.1: the model-scoped matrix keeps every row any of those models has, re-indexed, and reports the catalog size', () => {
  const matrix = { groups: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }], rows: [{ id: 'r0', group: 'g1' }, { id: 'r1', group: 'g2' }, { id: 'r2', group: 'g3' }, { id: 'r3', group: 'g2' }],
    values: { a: [[0, 50, 0], [3, 7, 1]], b: [[3, 9, 0]], c: [[2, 1, 0]] } };
  const out = matrixForModels(matrix, ['a', 'b']);
  assert.deepEqual(out.rows.map((r) => r.id), ['r0', 'r3']);
  assert.deepEqual(out.values, { a: [[0, 50, 0], [1, 7, 1]], b: [[1, 9, 0]] });
  assert.deepEqual(out.groups.map((g) => g.id), ['g1', 'g2']);
  assert.equal(out.catalogRows, 4);
  assert.deepEqual(matrixForModels(matrix, []).rows, []);
});
