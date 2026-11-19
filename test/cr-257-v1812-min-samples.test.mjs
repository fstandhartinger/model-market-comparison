const normalize=r=>r.key==='h2o-lightning-4b-v1.4.1'?{...r,not_ranked_because:'declared wording-only exception'}:r;
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {readJevbenchV1812Candidate,v1812BoardInput} from '../lib/jevbench-v1812-release.mjs';
const base=JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.11-categories.json'));
test('v1.8.12: no listed row displays any topic, use-case or language cell below 30 scored items',async()=>{
 const r=await readJevbenchV1812Candidate();const display=process.env.N30_BASELINE?base:v1812BoardInput(r).categories;
 const counts={},lost=[];let total=0;
 for(const k of new Set([...r.artifact.systems.map(row=>row.key),...Object.keys(r.categories.systems)])){counts[k]={};for(const d of ['topics','usecases','languages']){
  const stored=r.categories.systems[k]?.[d]??{},shown=display.systems[k]?.[d]??{};counts[k][d]=Object.keys(stored).length-Object.keys(shown).length;total+=counts[k][d];
  if(Object.keys(stored).length&&!Object.keys(shown).length)lost.push({key:k,dimension:d});
  for(const[c,v]of Object.entries(shown))assert.ok(v.n>=30 && (v.coverage_n??v.n)>=30,`${k}.${d}.${c}: n=${v.n}`);
 }}
 for(const[k,dims]of Object.entries(display.systems))for(const d of ['topics','usecases','languages'])for(const[c,v]of Object.entries(dims[d]??{}))assert.ok(v.n>=30 && (v.coverage_n??v.n)>=30,`${k}.${d}.${c}: n=${v.n}`);
 assert.deepEqual(r.artifact.systems.filter(s=>!s.new_in||s.new_in!=='v1.8.12').map(normalize),JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.11-results.json')).systems.map(normalize));
 writeFileSync('r198/v1812/receipts/SUPPRESSED-CELLS.json',JSON.stringify({suppressed_cells:counts,rows_losing_a_dimension:lost,total,scored_floor:30,completed_coverage_floor:30},null,1)+'\n');
});

// Inspect every nested breakdown object, including an arbitrary chain of previous rows.
function walkBreakdowns(value, visit, path = [], inBreakdowns = false) {
 if (!value || typeof value !== 'object') return;
 for (const [name, cell] of Object.entries(value)) {
  const next = [...path, name];
  const inside = inBreakdowns || name === 'breakdowns';
  if (inside && cell && typeof cell === 'object' && Number.isInteger(cell.n)) visit(value, name, cell, next);
  walkBreakdowns(cell, visit, next, inside);
 }
}
function assertRowBreakdownFloor(artifact, surface) {
 for (const row of artifact.systems) walkBreakdowns(row, (_, name, cell, path) => {
  assert.ok(cell.n >= 30, `${surface}: ${row.key}.${path.join('.')}: n=${cell.n}`);
 });
}

test('v1.8.12: candidate display JSON removes small row breakdowns without changing the stored release', async () => {
 const release = await readJevbenchV1812Candidate();
 const stored = structuredClone(release.artifact);
 const {artifact} = v1812BoardInput(release);
 assertRowBreakdownFloor(artifact, 'candidate display');
 const expected = structuredClone(stored);
 for (const row of expected.systems) walkBreakdowns(row, (parent, name, cell) => {
  if (cell.n < 30) delete parent[name];
 });
 assert.deepEqual(artifact, expected, 'only integer n < 30 breakdown cells are removed');
 assert.deepEqual(release.artifact, stored, 'stored release is not mutated');
});

test('v1.8.12: precomputed All-data JSON has no small row breakdowns', () => {
 assertRowBreakdownFloor(JSON.parse(readFileSync('data/jevbench-v1.8.12-alldata.json')).artifact, 'snapshot');
});

test('v1.8.12: published live board and every All-data JSON input have no small row breakdowns', async t => {
 const manifest = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.12-publication.json'));
 if (manifest.review.verdict !== 'PASS') return t.skip('candidate PENDING; live board still uses the historical release');
 const {readJevbenchV161Release} = await import('../lib/jevbench-v16-release.mjs');
 const {readJevbenchV157Release} = await import('../lib/jevbench-v15-release.mjs');
 const {assembleJevBoard} = await import('../lib/jevbench-live-board.mjs');
 const {readJevAllDataInput} = await import('../lib/jevbench-alldata-input.mjs');
 const [release, previous] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release()]);
 const apiA4 = JSON.parse(readFileSync('data/jevbench-api-a4-equated.json'));
 const board = await assembleJevBoard({release, previous, apiA4, live: true});
 assert.ok(['v1.8.12','v1.8.13','v1.8.14','v1.8.15','v1.8.16','v1.8.17'].includes(board.published.restated_by));
 assertRowBreakdownFloor(board.published, 'live board');
 for (const version of ['board-all', 'board-open', 'board-api', 'v1.8.12']) {
  const input = await readJevAllDataInput(version);
  assert.ok(input, `${version}: published input exists`);
  assertRowBreakdownFloor(input.artifact, version);
 }
});

test('v1.8.12: previous breakdowns are filtered at arbitrary depth in every dimension', async () => {
 const release = await readJevbenchV1812Candidate();
 const small = {n: 29, score: 12};
 const enough = {n: 30, score: 13};
 const row = {key: 'synthetic', previous: {previous: {v16: {breakdowns: {
  future_dimension: {small, enough}, family: {small, enough}
 }}}}};
 const artifact = {...release.artifact, systems: [row]};
 const shown = v1812BoardInput({...release, artifact}).artifact;
 assertRowBreakdownFloor(shown, 'synthetic deep previous');
 assert.deepEqual(shown.systems[0].previous.previous.v16.breakdowns,
  {future_dimension: {enough}, family: {enough}});
 assert.equal(row.previous.previous.v16.breakdowns.future_dimension.small, small, 'source is untouched');
});
