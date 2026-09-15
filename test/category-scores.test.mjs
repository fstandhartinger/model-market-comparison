import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCategoryScores, newestRow, resolveAnchors, versionRank } from '../lib/category-scores.mjs';

const anchors = {
  min_anchors: 2,
  categories: [
    { id: 'coding', key: 'cat_coding', label: 'Coding', group: 'coding', anchors: [{ key: 'tb' }, { key: 'scicode' }] },
    { id: 'science', key: 'cat_science', label: 'Science', group: 'science', anchors: [{ key: 'gpqa' }, { key: 'critpt' }] },
  ],
};
// Two versions of Terminal-Bench: v4.0 is the current test, even though the retired v2.1 covers more models.
const matrix = {
  rows: [
    { key: 'tb', group: 'coding', unit: 'fraction', higherBetter: true, version: '2.1' },
    { key: 'tb', group: 'coding', unit: 'fraction', higherBetter: true, version: '4.0' },
    { key: 'scicode', group: 'coding', unit: 'percent', higherBetter: true, version: '1.0' },
    { key: 'gpqa', group: 'science', unit: 'fraction', higherBetter: true, version: '1.0' },
    { key: 'elo', group: 'science', unit: 'Elo', higherBetter: true, version: '1.0' },
  ],
  values: {
    full: [[0, 0.5], [1, 0.6], [2, 80], [3, 0.9]],
    partial: [[1, 0.4], [3, 0.7]],
    oldOnly: [[0, 0.3], [2, 70], [3, 0.5]],
  },
};
test('category anchors: newest version per benchmark, categories without all anchors are dropped', () => {
  const resolved = resolveAnchors(matrix, anchors);
  assert.deepEqual(resolved.map((c) => c.key), ['cat_coding']); // Science lacks CritPt; Elo is not compatible
  assert.deepEqual(resolved[0].rows.map((r) => r.version), ['4.0', '1.0']);
  assert.equal(newestRow([], new Map()), null);
  // A numbered release outranks a dated snapshot of the same benchmark; snapshots compare by date.
  assert.deepEqual(resolveAnchors({ rows: [
    { key: 'tb', group: 'coding', unit: 'fraction', higherBetter: true, version: 'snapshot-2026-09-15' },
    { key: 'tb', group: 'coding', unit: 'fraction', higherBetter: true, version: '4.0' },
    { key: 'scicode', group: 'coding', unit: 'percent', higherBetter: true, version: '1.0' }],
    values: { a: [[0, 0.1], [1, 0.2], [2, 3]] } }, anchors)[0].rows.map((r) => r.version), ['4.0', '1.0']);
  assert.ok(versionRank('4.0')[0] > versionRank('snapshot-2026-09-15')[0]);
});
test('a model scores only with a result on every anchor; fractions count as percentages', () => {
  const { scores } = computeCategoryScores(matrix, anchors);
  assert.deepEqual(scores.get('full'), { cat_coding: 70 }); // (60 + 80) / 2 — the v4.0 row, not v2.1
  assert.equal(scores.has('partial'), false); // no SciCode result
  assert.equal(scores.has('oldOnly'), false); // only the retired Terminal-Bench version
});
