import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {readJevbenchV1824Candidate,v1824BoardInput,V1824_NEW_KEYS} from '../lib/jevbench-v1824-release.mjs';
const base=JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.23-categories.json'));
test('v1.8.24: no listed row displays any topic, use-case or language cell below 30 scored items',async()=>{
 const r=await readJevbenchV1824Candidate();const display=process.env.N30_BASELINE?base:v1824BoardInput(r).categories;
 const counts={},lost=[];let total=0;
 for(const k of new Set([...r.artifact.systems.map(row=>row.key),...Object.keys(r.categories.systems)])){counts[k]={};for(const d of ['topics','usecases','languages']){
  const stored=r.categories.systems[k]?.[d]??{},shown=display.systems[k]?.[d]??{};counts[k][d]=Object.keys(stored).length-Object.keys(shown).length;total+=counts[k][d];
  if(Object.keys(stored).length&&!Object.keys(shown).length)lost.push({key:k,dimension:d});
  for(const[c,v]of Object.entries(shown))assert.ok(v.n>=30 && (v.coverage_n??v.n)>=30,`${k}.${d}.${c}: n=${v.n}`);
 }}
 for(const[k,dims]of Object.entries(display.systems))for(const d of ['topics','usecases','languages'])for(const[c,v]of Object.entries(dims[d]??{}))assert.ok(v.n>=30 && (v.coverage_n??v.n)>=30,`${k}.${d}.${c}: n=${v.n}`);

 writeFileSync('r198/v1824/receipts/SUPPRESSED-CELLS.json',JSON.stringify({suppressed_cells:counts,rows_losing_a_dimension:lost,total,scored_floor:30,completed_coverage_floor:30},null,1)+'\n');
});

test('v1.8.24: the two new hosted API rows display no family, topic, use-case or language cell below 30 scored items',async()=>{
 const r=await readJevbenchV1824Candidate();const display=v1824BoardInput(r).categories;const per={};
 for(const k of V1824_NEW_KEYS){per[k]={};
  for(const d of ['topics','families','usecases','languages']){
   const stored=r.categories.systems[k]?.[d]??{},shown=display.systems[k]?.[d]??{};
   per[k][d]={stored:Object.keys(stored).length,shown:Object.keys(shown).length,hidden:Object.keys(stored).length-Object.keys(shown).length};
   for(const[c,v]of Object.entries(shown)){assert.ok(v.n>=30&&(v.coverage_n??v.n)>=30,`${k}.${d}.${c}: n=${v.n}`);assert.deepEqual(v,stored[c],'shown cells are the stored cells');}
   for(const[c,v]of Object.entries(stored))if(v.n>=30)assert.ok(shown[c],`${k}.${d}.${c}: n=${v.n} must stay shown`);else assert.equal(shown[c],undefined,`${k}.${d}.${c}: n=${v.n} must be hidden`);
  }
  assert.ok(Object.values(per[k]).reduce((a,b)=>a+b.shown,0)>0);
 }
 writeFileSync('r198/v1824/receipts/NEW-ROW-CELLS.json',JSON.stringify({floor:30,rows:per,note:'stored = cells in the pinned category file (cells under 15 are already omitted there); shown = after the display adapter'},null,1)+'\n');
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

test('v1.8.24: candidate display JSON removes small row breakdowns without changing the stored release', async () => {
 const release = await readJevbenchV1824Candidate();
 const stored = structuredClone(release.artifact);
 const {artifact} = v1824BoardInput(release);
 assertRowBreakdownFloor(artifact, 'candidate display');
 const expected = structuredClone(stored);
 for (const row of expected.systems) walkBreakdowns(row, (parent, name, cell) => {
  if (cell.n < 30) delete parent[name];
 });
 assert.deepEqual(artifact, expected, 'only integer n < 30 breakdown cells are removed');
 assert.deepEqual(release.artifact, stored, 'stored release is not mutated');
});

test('v1.8.24: precomputed All-data JSON has no small row breakdowns', () => {
 assertRowBreakdownFloor(JSON.parse(readFileSync('data/jevbench-v1.8.24-alldata.json')).artifact, 'snapshot');
});

test('v1.8.24: previous breakdowns are filtered at arbitrary depth in every dimension', async () => {
 const release = await readJevbenchV1824Candidate();
 const small = {n: 29, score: 12};
 const enough = {n: 30, score: 13};
 const row = {key: 'synthetic', previous: {previous: {v16: {breakdowns: {
  future_dimension: {small, enough}, family: {small, enough}
 }}}}};
 const artifact = {...release.artifact, systems: [row]};
 const shown = v1824BoardInput({...release, artifact}).artifact;
 assertRowBreakdownFloor(shown, 'synthetic deep previous');
 assert.deepEqual(shown.systems[0].previous.previous.v16.breakdowns,
  {future_dimension: {enough}, family: {enough}});
 assert.equal(row.previous.previous.v16.breakdowns.future_dimension.small, small, 'source is untouched');
});
