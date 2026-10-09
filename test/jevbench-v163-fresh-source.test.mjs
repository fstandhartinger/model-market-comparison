// Source-only support for a prospective JevBench v1.6.3 same-draw completed-field addendum. Synthetic fixtures only: no
// v1.6.3 data, route, manifest or navigation entry exists, and none is created here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { JEVBENCH_FRESH_V16_REVISIONS, isFreshJevbenchV16Revision, JEVBENCH_CATEGORY_REVISIONS, jevbenchCategoryView } from '../lib/jevbench-categories.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const v161 = JSON.parse(read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json'));

/** A fresh-cohort categories artifact built from the historical one, with distinct competence values and a zero-count category. */
function freshCategories(revision, competence) {
  const c = structuredClone(v161);
  c.revision = revision;
  for (const field of ['unavailable', 'supplement', 'live_category_cells', 'language_cells']) delete c[field];
  const keys = Object.keys(c.systems).slice(0, 2);
  c.systems = Object.fromEntries(keys.map((k) => [k, c.systems[k]]));
  for (const row of Object.values(c.systems)) for (const dim of ['topics', 'usecases']) for (const cell of Object.values(row[dim])) cell.competence = competence;
  // Zero-count fresh taxonomy entry: the category exists on the draw but no item fell into it, so no system has a cell.
  c.usecases.push({ key: 'fixture_zero', label: 'Fixture zero', covers: 'No items in this draw', n: 0, open: 0, sealed: 0, low_n: true });
  return { c, keys };
}
const cat = (view, dim, key) => view.dims.find((d) => d.key === dim).cats.find((x) => x.key === key);

test('fresh-v16 helper covers exactly v1.6.2 and v1.6.3', () => {
  assert.deepEqual(JEVBENCH_FRESH_V16_REVISIONS, ['v1.6.2', 'v1.6.3']);
  for (const r of ['v1.6.2', 'v1.6.3']) assert.equal(isFreshJevbenchV16Revision(r), true, r);
  for (const r of ['v1.6.1', 'v1.6.0', 'v1.5.7', 'v1.5.6', 'v1.5.5', 'v1.5.0', 'v1.6.4', 'v1.6', '', undefined, null]) assert.equal(isFreshJevbenchV16Revision(r), false, String(r));
  assert.ok(JEVBENCH_CATEGORY_REVISIONS.includes('v1.6.3'));
});

test('v1.6.3 honours its own passed category artifact, distinct from v1.6.2', () => {
  const a = freshCategories('v1.6.3', 61.5), b = freshCategories('v1.6.2', 12.25);
  const key = a.keys[0], topic = a.c.topics.find((t) => a.c.systems[key].topics[t.key]).key;
  const v163 = jevbenchCategoryView('v1.6.3', a.keys, { artifact: a.c });
  const v162 = jevbenchCategoryView('v1.6.2', b.keys, { artifact: b.c });
  assert.equal(v163.revision, 'v1.6.3');
  assert.equal(v163.systems[key].topics[topic][0], 61.5);
  assert.equal(v162.systems[key].topics[topic][0], 12.25);
  // Never the historical overlays.
  assert.deepEqual(v163.spokeExceptions, {});
  assert.deepEqual(v163.exposureNotes, {});
});

test('a missing fresh v1.6.3 artifact never falls back to historical categories', () => {
  for (const options of [undefined, {}, { artifact: null }, { artifact: undefined }, { supplement: true }, { supplement: true, artifact: null }]) {
    assert.equal(jevbenchCategoryView('v1.6.3', Object.keys(v161.systems), options), null, JSON.stringify(options));
    assert.equal(jevbenchCategoryView('v1.6.2', Object.keys(v161.systems), options), null, JSON.stringify(options));
  }
  // A v1.6.2 (or historical) artifact cannot stand in for v1.6.3.
  assert.throws(() => jevbenchCategoryView('v1.6.3', [], { artifact: freshCategories('v1.6.2', 50).c }), /revision mismatch/);
  assert.throws(() => jevbenchCategoryView('v1.6.3', [], { artifact: v161 }), /revision mismatch/);
});

test('fresh v1.6.3 keeps zero-count categories and plots Other, like v1.6.2', () => {
  for (const revision of JEVBENCH_FRESH_V16_REVISIONS) {
    const { c, keys } = freshCategories(revision, 40);
    const view = jevbenchCategoryView(revision, keys, { artifact: c });
    const zero = cat(view, 'usecases', 'fixture_zero');
    assert.ok(zero, `${revision} keeps zero-count taxonomy entry`);
    assert.equal(zero.n, 0); assert.equal(zero.plotted, false); assert.equal(zero.lowSample, false); assert.equal(zero.lowN, true);
    assert.equal(cat(view, 'usecases', 'other').plotted, true, `${revision} plots Other`);
    for (const k of keys) assert.equal(view.systems[k].usecases.fixture_zero, undefined);
  }
});

test('historical revisions keep their imported artifacts and hide Other', () => {
  for (const revision of ['v1.6.1', 'v1.6.0', 'v1.5.7', 'v1.5.6', 'v1.5.5', 'v1.5.0']) {
    const view = jevbenchCategoryView(revision, []);
    assert.equal(view?.revision?.startsWith(revision.slice(0, 4)), true, revision);
    const other = cat(view, 'usecases', 'other');
    if (other) assert.equal(other.plotted, false, `${revision} still hides Other`);
  }
  assert.equal(jevbenchCategoryView('v1.6.1', []).revision, 'v1.6.1');
});

test('board dispatches fresh behaviour through the helper and keeps every section', () => {
  const board = read('components/JevBenchV16Board.tsx');
  assert.match(board, /const fresh = isFreshJevbenchV16Revision\(a\.revision\);/);
  assert.equal([...board.matchAll(/artifact: fresh \? categories : undefined/g)].length, 2, 'Compare and All data both pass only the release categories');
  assert.match(board, /\(!fresh \|\| carry\.rows\.length > 0\) && <DatedCarry/);
  assert.match(board, /if \(isFreshJevbenchV16Revision\(a\.revision\)\) return <>/);
  assert.match(board, /isFreshJevbenchV16Revision\(props\.a\.revision\) \? `Method notes · fresh native cohort\$\{props\.a\.revision === 'v1\.6\.2' \? '' :/);
  assert.doesNotMatch(board, /revision === ["']v1\.6\.2["'] \? categories/);
  for (const section of ['<JevBenchV16Charts', '<JevScoreChart', '<JevCompareV15', '<JevV15AllDataGrid', '<LanguageView', '<DatedCarry', '<Method ']) assert.ok(board.includes(section), section);
});

test('candidate absence: no v1.6.3 data, route, API or navigation entry exists', () => {
  const dir = 'data/raw/benchmarks/jevbench/v1.6';
  assert.deepEqual(readdirSync(new URL(`../${dir}`, import.meta.url)).filter((f) => f.includes('1.6.3')), []);
  assert.equal(existsSync(new URL('../app/jev-models/v1.6.3', import.meta.url)), false);
  assert.equal(existsSync(new URL('../app/api/jevbench/v1.6.3', import.meta.url)), false);
  assert.doesNotMatch(read('components/JevBenchReleaseVersionNav.tsx'), /1\.6\.3/);
  assert.doesNotMatch(read('lib/jevbench-categories.mjs'), /jevbench-v1\.6\.3/);
});
