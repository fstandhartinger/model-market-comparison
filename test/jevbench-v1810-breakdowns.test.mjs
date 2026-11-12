import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jevbenchCategoryView, UNLABELLED_TOPICS_NOTE, BREAKDOWN_MIN_SHOWN_N, RADAR_MIN_N } from '../lib/jevbench-categories.mjs';
import { categoryCell } from '../lib/radar-shape.mjs';
import { buildAllDataModel } from '../lib/jevbench-all-data-grid.mjs';

// v1.8.10 fast path (DECISIONS jevbench-v1810-fast-path-tonight-1112, preview corrections 1112 item 3): every published breakdown
// cell is shown with its value and item count, low-sample cells marked, never blanked; a row without subject-topic labels keeps
// its use-case cells. Display only: no cell is recomputed.
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const cats = (n) => Array.from({ length: 6 }, (_, i) => ({ key: `c${i}`, label: `C${i}`, covers: 'x', n, open: 0, sealed: n }));
const cell = (competence, n) => ({ competence, n });
const artifact = () => ({
  kind: 'category-aggregates', benchmark: 'jevbench', revision: 'v1.6.1', min_n: 15, metric: 'm', labelling: 'l', rules: [],
  topics: cats(40), usecases: [...cats(40).slice(0, 5), { key: 'c5', label: 'C5', covers: 'x', n: 17, open: 0, sealed: 17 }],
  systems: {
    labelled: { topics: Object.fromEntries(cats(40).map((c) => [c.key, cell(50, 40)])), usecases: { c0: cell(61.2, 17), c1: cell(70, 40) } },
    draw: { usecases: { c0: cell(60.2, 40), c5: cell(40, 17) } },
    none: {},
  },
});

test('one minimum shown n of 10, under the radar minimum of 30', () => {
  assert.equal(BREAKDOWN_MIN_SHOWN_N, 10);
  assert.equal(RADAR_MIN_N, 30);
  assert.match(src('lib/radar-shape.mjs'), /export const BREAKDOWN_MIN_SHOWN_N = 10;/);
});

test('a row without subject-topic labels keeps its use-case cells and says why topics are empty', () => {
  const v = jevbenchCategoryView('v1.6.1', ['labelled', 'draw', 'none'], { artifact: artifact() });
  assert.deepEqual(Object.keys(v.missing), ['none']);
  assert.deepEqual(v.systems.draw.usecases.c0, [60.2, 40]);
  assert.equal(v.systems.draw.topics, undefined);
  assert.equal(v.missingDims.draw.topics, UNLABELLED_TOPICS_NOTE);
  assert.equal(UNLABELLED_TOPICS_NOTE, 'subject topics: not labelled for this draw yet (top-up pending)');
  assert.equal(v.drawLowN, true);
  assert.equal(v.minN, 10);
  assert.ok(v.dims.find((d) => d.key === 'usecases').cats.every((c) => c.plotted), 'a 17-item category is a spoke');
  const model = buildAllDataModel({ artifact: { revision: 'v1.6.1', systems: [{ key: 'draw', display: 'Draw', axes: {}, cost: {}, speed: {} }], not_measured: [] }, categoryView: v });
  assert.equal(model.rows[0].values.categoryNote, UNLABELLED_TOPICS_NOTE);
  assert.equal(model.rows[0].values['cat:usecases:c0'], 60.2);
});

test('a published cell under the radar minimum is drawn, marked low, with its n; never blanked', () => {
  assert.deepEqual(categoryCell([61.2, 17], 30, { drawLowN: true }), { value: 61.2, thin: false, low: true, n: 17, text: '61.2 (n=17)' });
  assert.deepEqual(categoryCell([61.2, 40], 30, { drawLowN: true }), { value: 61.2, thin: false, low: false, n: 40, text: '61.2' });
  assert.equal(categoryCell([61.2, 9], 30, { drawLowN: true }).thin, true, 'under the shown minimum stays undrawn');
  assert.equal(categoryCell([61.2, 17], 30).thin, true, 'historical views keep their rule');
  const radar = src('components/JevRadars.tsx');
  assert.match(radar, /data-bh-radar-low-n-point/);
  assert.match(radar, /fill: "var\(--surface\)", stroke: se\.stroke/);
  const compare = src('components/JevCompareV15.tsx');
  assert.match(compare, /categoryCell\(cats\.systems\[r\.key\]\?\.\[dim\.key\]\?\.\[c\.key\] \?\? null, cats\.radarMinN, \{ drawLowN: Boolean\(cats\.drawLowN\) \}\)/);
});

test('historical category views are unchanged (no low-n drawing, a partial row stays missing)', () => {
  const v = jevbenchCategoryView('v1.5.7', ['jev-1.13.0']);
  assert.equal(v.drawLowN, false);
  assert.equal(v.minN, 15);
});
