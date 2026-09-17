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
test('CR-65.10: only measured results enter a category score; a preliminary anchor changes nobody else', () => {
  const withBasis = { rows: matrix.rows, values: {
    full: [[1, 0.6, 0], [2, 80, 0], [3, 0.9, 0]],
    announced: [[1, 0.73, 3], [2, 90, 0]], // Terminal-Bench from a launch chart
    vendor: [[1, 0.5, 1], [2, 60, 0]],
  } };
  const { scores } = computeCategoryScores(withBasis, anchors);
  assert.deepEqual(scores.get('full'), { cat_coding: 70 });
  assert.equal(scores.has('announced'), false);
  assert.equal(scores.has('vendor'), false);
  const without = computeCategoryScores({ rows: matrix.rows, values: { full: withBasis.values.full, vendor: withBasis.values.vendor } }, anchors);
  assert.deepEqual(Object.fromEntries(without.scores), Object.fromEntries(scores));
  // A preliminary result does not decide which version counts as the anchor either.
  assert.deepEqual(resolveAnchors(withBasis, anchors)[0].rows.map((r) => r.version), ['4.0', '1.0']);
});
test('CR-65.10: the latest-score pick ranks measured, then self-reported, then preliminary — never the higher value', async () => {
  const { latestScores } = await import('../lib/benchmark-view.mjs');
  const obs = (id, basis, value, date) => ({ id, modelId: 'm', subjectId: 'm', basis, value, date });
  const pick = (rows) => latestScores(rows, 'all')[0].id;
  assert.equal(pick([obs('p', 'preliminary', 73, '2026-09-16'), obs('s', 'self_reported', 60, '2026-09-01')]), 's');
  assert.equal(pick([obs('p', 'preliminary', 73, '2026-09-16'), obs('m', 'measured', 50, '2026-09-01')]), 'm');
  assert.equal(pick([obs('m', 'measured', 50, '2026-09-01'), obs('p', 'preliminary', 73, '2026-09-16')]), 'm');
  assert.equal(latestScores([obs('p', 'preliminary', 73, '2026-09-16')]).length, 0, 'measured-only consumers never see it');
});

test('CR-65.16: the published method texts match the category-score and composite code', async () => {
  const { readFile } = await import('node:fs/promises');
  const read = async (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
  const about = (await read('app/about/page.tsx')).replace(/\s+/g, ' ');
  const tip = (await read('components/methodology.tsx')).replace(/\s+/g, ' ');
  const note = JSON.parse(await read('data/category-score-anchors.json')).note;
  assert.doesNotMatch(about, /plain average of that category/);
  assert.match(about, /<b>weighted average<\/b> of that category&apos;s <b>anchor benchmarks<\/b>, on a 0–100 scale: a saturated anchor counts at half the weight/);
  assert.match(about, /compare models within one category, not a Coding score with a Science score/);
  assert.match(about, /does not change the composite, which uses ranks only/);
  assert.match(about, /deprecated ones included/);
  assert.match(tip, /The weighted average of this category&apos;s anchor benchmarks, on a 0–100 scale; a saturated anchor counts half/);
  assert.doesNotMatch(note, /picks the one with the widest coverage/);
  assert.match(note, /picks the newest version/);
  // The texts describe what the code does.
  const { SATURATED_WEIGHT } = await import('../lib/benchmark-matrix.mjs');
  assert.equal(SATURATED_WEIGHT, 0.5);
  const { newestRow } = await import('../lib/category-scores.mjs');
  const counts = new Map([[0, 300], [1, 40]]);
  assert.equal(newestRow([{ index: 0, version: '2.1' }, { index: 1, version: '4.0' }], counts).index, 1, 'newest version wins over wider coverage');
});
