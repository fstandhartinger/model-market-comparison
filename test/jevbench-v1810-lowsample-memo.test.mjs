import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withRowPoolCategoryRows, hasApiFullAddendumCategories, copyRowPoolCategoryBounds } from '../lib/jevbench-api-full-addenda.mjs';
import { copyAssembledBoard } from '../lib/jevbench-live-board.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';

// v1.8.10 (low-sample caveat regression): from v1.8.8 on, the CR-729 build memo handed every live page a structuredClone of
// the assembled board. A clone is not in the row-pool bounds WeakMap, so /jev-models and the All-data grid fell back to the
// frozen v1.6.1 cells and 129 carried fresh-draw rows (Torchcast Decision 4B v1.3 among them) lost their topic and use-case
// cells: the compare view's low-sample table vanished. The copy must keep the bounds; a carried row keeps its cells.
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(src(p));
const PAIR = ['torchcast-decision-4b-v1.3', 'h2o-lightning-4b'];

function boundCategories() {
  const a = json('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.10-categories.json');
  const systems = Object.fromEntries(PAIR.map((k) => [k, a.systems[k]]));
  // Each row's own pool sizes, as the cohort builder attaches them for rows measured on their own item pool.
  const bounds = Object.fromEntries(PAIR.map((k) => [k, Object.fromEntries(['topics', 'usecases', 'languages'].map((d) => [d,
    Object.fromEntries(Object.entries(a.systems[k][d] ?? {}).map(([c, v]) => [c, v.n]))]))]));
  return withRowPoolCategoryRows({ ...a, revision: 'v1.6.1', systems: {} }, systems, bounds);
}

test('a deep copy of an assembled board keeps the row-pool bounds, so carried rows keep their use-case cells', () => {
  const board = { categories: boundCategories(), published: { revision: 'v1.6.1' } };
  assert.equal(hasApiFullAddendumCategories(board.categories), true);
  assert.equal(hasApiFullAddendumCategories(structuredClone(board).categories), false, 'a bare structuredClone loses the bounds (the regression)');
  const copy = copyAssembledBoard(board);
  assert.notEqual(copy.categories, board.categories);
  assert.deepEqual(copy, structuredClone(board));
  assert.equal(hasApiFullAddendumCategories(copy.categories), true);
  const view = jevbenchCategoryView('v1.6.1', PAIR, { supplement: Boolean(copy.categories.supplement), artifact: copy.categories });
  assert.deepEqual(Object.keys(view.missing), []);
  assert.deepEqual(view.systems['torchcast-decision-4b-v1.3'].usecases.search_retrieval, [97.56, 24], 'the carried 97.56 cell survives');
  assert.ok(Object.values(view.systems['torchcast-decision-4b-v1.3'].usecases).some(([, n]) => n >= view.minN && n < view.radarMinN), 'the pair has low-sample cells to list');
});

test('bounds only follow a deep copy of the same rows; unbound boards copy unchanged', () => {
  const a = boundCategories();
  const other = structuredClone(a); delete other.systems['h2o-lightning-4b'];
  assert.throws(() => copyRowPoolCategoryBounds(a, other), /deep copy of the same artifact/);
  assert.throws(() => copyRowPoolCategoryBounds(a, a), /deep copy of the same artifact/);
  const plain = { categories: { systems: {} } };
  assert.equal(hasApiFullAddendumCategories(copyAssembledBoard(plain).categories), false);
  assert.match(src('lib/jevbench-live-board.mjs'), /return copyAssembledBoard\(await BOARD_BUILD_CACHE\.get\(key\)\);/);
  assert.doesNotMatch(src('lib/jevbench-live-board.mjs'), /return structuredClone\(await BOARD_BUILD_CACHE/);
});

test('the low-sample table says when the pair has no per-category values instead of rendering nothing', () => {
  const compare = src('components/JevCompareV15.tsx');
  const body = compare.slice(compare.indexOf('function LowSampleTable'), compare.indexOf('function ccSpokes'));
  assert.match(body, /if \(!low\.length && !unreported\.length\) return pair\.some\(\(r\) => !cats\.systems\[r\.key\]\?\.\[dim\.key\]\)/);
  assert.match(body, /data-bh-jev15-low-sample-none=\{dim\.key\}>No per-category values are published for this pair\.<\/p>/);
  assert.doesNotMatch(body, /if \(!low\.length && !unreported\.length\) return null;/);
});

test('under the next build memo the live board still serves the carried pair its own use-case cells', { timeout: 1_200_000 }, async () => {
  const before = process.env.NEXT_PHASE;
  process.env.NEXT_PHASE = 'phase-production-build';
  try {
    const { readJevbenchV161Release } = await import('../lib/jevbench-v16-release.mjs');
    const { readJevbenchV157Release } = await import('../lib/jevbench-v15-release.mjs');
    const { assembleJevBoard } = await import('../lib/jevbench-live-board.mjs');
    const apiA4 = json('data/jevbench-api-a4-equated.json');
    const [release, previous] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release()]);
    const args = { release, previous, live: true, apiA4 };
    for (const board of [await assembleJevBoard(args), await assembleJevBoard(args)]) {
      const cats = board.categories;
      assert.equal(hasApiFullAddendumCategories(cats), true, 'memo copy keeps the row-pool bounds');
      const keys = board.published.systems.filter((s) => s.ranked).map((s) => s.key);
      const view = jevbenchCategoryView(board.published.revision, keys, { supplement: Boolean(cats.supplement), artifact: cats });
      assert.deepEqual(view.systems['torchcast-decision-4b-v1.3'].usecases.search_retrieval, [97.56, 24]);
      // v1.8.10 fast path: a row lacking one dimension (the 27 Oct draw's unlabelled topics) keeps the others.
      const expectMissing = keys.filter((k) => !cats.systems[k]?.topics && !cats.systems[k]?.usecases);
      assert.deepEqual(Object.keys(view.missing).sort(), expectMissing.sort(), 'only rows without any cells are missing');
      assert.equal(expectMissing.includes('torchcast-decision-4b-v1.3'), false);
      assert.equal(expectMissing.includes('torchcast-decision-31b-v1.0'), false);
      assert.ok(Object.keys(view.systems['torchcast-decision-31b-v1.0'].usecases).length >= 19, 'the 27 Oct draw row shows its use-case cells');
      assert.equal(view.missingDims['torchcast-decision-31b-v1.0'].topics, 'subject topics: not labelled for this draw yet (top-up pending)');
    }
  } finally {
    if (before === undefined) delete process.env.NEXT_PHASE; else process.env.NEXT_PHASE = before;
  }
});
