import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withTs20, ts20ReferenceRow, TS20_REFERENCE_KEY } from '../lib/imagejev-ts20.mjs';

// TypeSafe-20 image radar (lead job jevbench-radar-full-areas-20261009): a third category dimension on the image page.
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const ts20 = read('../data/imagejev-ts20-categories.json');
const release = read('../data/imagejev-v03.json');

test('TypeSafe-20 artifact: 20 use cases x 30 items, aggregates only, every cell [value, n, completed]', () => {
  assert.equal(ts20.dim.key, 'typesafe');
  assert.equal(ts20.dim.title, 'Use cases (TypeSafe categories)');
  assert.equal(ts20.dim.cats.length, 20);
  assert.ok(ts20.dim.cats.every((c) => c.n === 30 && c.plotted && c.label));
  const keys = ts20.dim.cats.map((c) => c.key);
  for (const [system, cells] of Object.entries(ts20.systems)) {
    assert.deepEqual(Object.keys(cells.typesafe).sort(), [...keys].sort(), system);
    for (const [cat, cell] of Object.entries(cells.typesafe)) {
      assert.equal(cell.length, 3, `${system}/${cat}`);
      assert.ok(Number.isFinite(cell[0]) && cell[0] >= -100 && cell[0] <= 100, `${system}/${cat} value`);
      assert.ok(cell[2] <= cell[1], `${system}/${cat} completed <= n`);
    }
  }
  assert.doesNotMatch(JSON.stringify(ts20), /"question"|"options"|"gold"|"caption"/, 'no item text, options, Gold or captions');
});

test('every measured system exists on the page (or is the Jev reference); unmeasured rows stay gaps', () => {
  const page = new Set(release.ranking.map((r) => r.key));
  for (const key of Object.keys(ts20.systems)) assert.ok(page.has(key) || key === TS20_REFERENCE_KEY, key);
  const merged = withTs20(release.categories, ts20);
  assert.equal(merged.dims.length, release.categories.dims.length + 1);
  assert.equal(merged.dims.at(-1).key, 'typesafe');
  const unmeasured = release.ranking.find((r) => !ts20.systems[r.key]);
  if (unmeasured) assert.equal(merged.systems[unmeasured.key]?.typesafe, undefined, 'no imputed cells');
  for (const [key, cells] of Object.entries(release.categories.systems)) {
    assert.deepEqual(merged.systems[key].capabilities, cells.capabilities, 'v0.3 cells untouched');
    assert.deepEqual(merged.systems[key].usecases, cells.usecases);
  }
});

test('the Jev reference row is unranked, has no v0.3 axes and only exists when it was measured', () => {
  const template = { key: 'x', axes: { intelligence: 1, calibration: 2, speed: 3, cost: 4 }, typeCc: { a: { open: 1, sealed: 2 } }, tierCc: { open: { easy: 1 } }, rank: 1 };
  const row = ts20ReferenceRow({ systems: { [TS20_REFERENCE_KEY]: { typesafe: {} } } }, template);
  assert.equal(row.key, 'jev-1.13.0');
  assert.equal(row.rank, null);
  assert.match(row.name, /REFERENCE/);
  assert.equal(row.axes, null, 'not scored on the v0.3 axes');
  assert.equal(row.hosted, false);
  assert.equal(ts20ReferenceRow({ systems: {} }, template), null);
});

test('the image page passes the merged categories and the method note discloses the bank', () => {
  const src = readFileSync(new URL('../components/ImageJevV03Page.tsx', import.meta.url), 'utf8');
  assert.match(src, /categories=\{categories\}/);
  assert.match(src, /data-bh-imagejev-ts20-method/);
  assert.match(src, /not a native vision result/);
});
