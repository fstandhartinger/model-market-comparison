import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listedRadarBoards } from '../scripts/jevbench-radar-spokes.mjs';
import { jevbenchCategoryView, withSCategoryCells, withLiveCategoryCells, JEVBENCH_S_CATEGORY_CELLS_ARTIFACT, languagePoolNote } from '../lib/jevbench-categories.mjs';
import { radarSpokeFailures, validateRadarSpokeGate } from '../lib/jevbench-radar-spoke-gate.mjs';
const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
const exceptions = read('data/jevbench-radar-spoke-exceptions.json');
const boards = listedRadarBoards(), keys = [...new Set(Object.values(boards).flat())];
const view = jevbenchCategoryView('v1.6.1', keys, { supplement: true });
test('release gate: every listed row on both boards has 20 use-case and 7 topic spokes >=30 or a visible exception', () => {
  validateRadarSpokeGate(view, keys, exceptions);
  for (const [scope, rows] of Object.entries(boards)) {
    assert.ok(rows.length > 20, scope);
    const scoped = jevbenchCategoryView('v1.6.1', rows, { supplement: true });
    validateRadarSpokeGate(scoped, rows, exceptions.filter((e) => rows.includes(e.key)));
    assert.equal(scoped.dims.find((d) => d.key === 'usecases').cats.filter((c) => c.plotted).length, 20);
  }
});
test('gate fails on absent/thin cells, non-finite scores, unlisted/duplicate/hidden reasons and stale exceptions', () => {
  const cats = (n) => Array.from({length:n}, (_, i) => ({key:String(i),n:60}));
  const dims = [{key:'usecases',cats:cats(20)},{key:'topics',cats:cats(7)}];
  const row = Object.fromEntries(dims.map((d) => [d.key,Object.fromEntries(d.cats.map((c) => [c.key,[50,30]]))]));
  const good = {dims,systems:{x:row},spokeExceptions:{x:'L3 run pending'}};
  const e = {key:'x',reason:'L3 run pending',since:'2026-10-07'};
  assert.deepEqual(validateRadarSpokeGate(good,['x'],[]),{});
  assert.throws(() => validateRadarSpokeGate(good,['x'],[e]), /stale exception/);
  for (const cell of [undefined,[50,29],[NaN,30]]) {
    const bad = structuredClone(good); bad.systems.x.topics['0'] = cell;
    assert.throws(() => validateRadarSpokeGate(bad,['x'],[]), /below 30/);
    validateRadarSpokeGate(bad,['x'],[e]);
    assert.throws(() => validateRadarSpokeGate(bad,['x'],[e,e]), /duplicate/);
    assert.throws(() => validateRadarSpokeGate({...bad,spokeExceptions:{}},['x'],[e]), /not displayed/);
  }
  assert.throws(() => validateRadarSpokeGate(good,['x'],[{...e,key:'new'}]), /unlisted/);
  assert.throws(() => radarSpokeFailures({...good,dims:dims.slice(1)},['x']), /20 unique/);
});
test('S-based rows take the new source including d1; API rows retain their own overlay; history is unchanged', () => {
  const base = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json');
  const before = structuredClone(base), cells = read(JEVBENCH_S_CATEGORY_CELLS_ARTIFACT);
  const live = withLiveCategoryCells(base), sOnly = withSCategoryCells(base);
  for (const [key, row] of Object.entries(cells.systems)) for (const dim of ['families','topics','usecases']) {
    assert.deepEqual(live.systems[key][dim],row[dim],`${key}.${dim}`);
    assert.deepEqual(sOnly.systems[key][dim],row[dim]);
  }
  assert.equal(live.systems['liquid-d1'].category_pools,cells.systems['liquid-d1'].category_pools);
  const api = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-api-rerun-cells.json');
  for (const [key,row] of Object.entries(api.systems)) if (!cells.systems[key]) {
    for (const dim of ['families','topics','usecases']) assert.deepEqual(live.systems[key][dim], row[dim],key);
    assert.equal(view.categoryPools[key],row.category_pools ?? row.coverage);
  }
  assert.deepEqual(base,before);
  assert.deepEqual(jevbenchCategoryView('v1.6.1',['jev-1.13.0']).spokeExceptions,{});
});
test('page shows exception reasons by row and compare; final language method is complete and data-driven', () => {
  for (const f of ['components/JevCompareV15.tsx','components/JevV15AllDataGrid.tsx','components/JevBenchV16Board.tsx']) assert.match(readFileSync(new URL(`../${f}`,import.meta.url),'utf8'),/data-bh-radar-spoke-exception/);
  const note = languagePoolNote({pools:{S:1200,P:300,A4:300,A5:300,L1:354,L2:33,L3:999},drawn:'2026-10-07',min_api_basis:60});
  for (const pattern of [/L3 \(999 items\)/,/at least 60 items/,/drawn 2026-10-07/,/Claude Sonnet 5.5/,/solved blind/,/GPT-6.1 Sol/,/second review/,/no gold comes from Jev or any measured API/,/every hosted API row/,/never reused in a headline draw/,/C1 adds English/,/Headline scores are unchanged/]) assert.match(note,pattern);
});

test('new S category source is aggregate-only and excludes private systems', () => {
  const bytes = readFileSync(new URL(`../${JEVBENCH_S_CATEGORY_CELLS_ARTIFACT}`,import.meta.url),'utf8');
  assert.doesNotMatch(bytes, /"(?:item_ids?|item_text|prompt|question|gold|prediction|task_id|per_item|inputs|provenance)"/i);
  assert.doesNotMatch(bytes, /"djev(?:-thinking)?"/);
});
