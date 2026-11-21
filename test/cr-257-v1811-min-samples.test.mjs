import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {readJevbenchV1811Candidate,v1811BoardInput} from '../lib/jevbench-v1811-release.mjs';
const base=JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.10-categories.json'));
test('v1.8.11: no listed row displays any topic, use-case or language cell below 30 scored items',async()=>{
 const r=await readJevbenchV1811Candidate();const display=process.env.N30_BASELINE?base:v1811BoardInput(r).categories;
 const counts={},lost=[];let total=0;
 for(const k of new Set([...r.artifact.systems.map(row=>row.key),...Object.keys(r.categories.systems)])){counts[k]={};for(const d of ['topics','usecases','languages']){
  const stored=r.categories.systems[k]?.[d]??{},shown=display.systems[k]?.[d]??{};counts[k][d]=Object.keys(stored).length-Object.keys(shown).length;total+=counts[k][d];
  if(Object.keys(stored).length&&!Object.keys(shown).length)lost.push({key:k,dimension:d});
  for(const[c,v]of Object.entries(shown))assert.ok(v.n>=30 && (v.coverage_n??v.n)>=30,`${k}.${d}.${c}: n=${v.n}`);
 }}
 for(const[k,dims]of Object.entries(display.systems))for(const d of ['topics','usecases','languages'])for(const[c,v]of Object.entries(dims[d]??{}))assert.ok(v.n>=30 && (v.coverage_n??v.n)>=30,`${k}.${d}.${c}: n=${v.n}`);
 assert.deepEqual(r.artifact.systems.filter(s=>!s.new_in||s.new_in!=='v1.8.11'),JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.10-results.json')).systems);
 writeFileSync('r198/v1811/receipts/SUPPRESSED-CELLS.json',JSON.stringify({suppressed_cells:counts,rows_losing_a_dimension:lost,total,scored_floor:30,completed_coverage_floor:30},null,1)+'\n');
});

function assertRowBreakdownFloor(artifact, surface) {
 for (const row of artifact.systems) for (const [dimension, cells] of Object.entries(row.v16?.breakdowns ?? {})) {
  if (!cells || typeof cells !== 'object') continue;
  for (const [name, cell] of Object.entries(cells)) {
   assert.ok(!(cell && typeof cell === 'object' && Number.isInteger(cell.n) && cell.n < 30),
    `${surface}: ${row.key}.${dimension}.${name}: n=${cell?.n}`);
  }
 }
}

test('v1.8.11: candidate display JSON removes small row breakdowns without changing the stored release', async () => {
 const release = await readJevbenchV1811Candidate();
 const stored = structuredClone(release.artifact);
 const {artifact} = v1811BoardInput(release);
 assertRowBreakdownFloor(artifact, 'candidate display');
 const expected = structuredClone(stored);
 for (const row of expected.systems) for (const cells of Object.values(row.v16?.breakdowns ?? {})) {
  if (!cells || typeof cells !== 'object') continue;
  for (const [name, cell] of Object.entries(cells)) {
   if (cell && typeof cell === 'object' && Number.isInteger(cell.n) && cell.n < 30) delete cells[name];
  }
 }
 assert.deepEqual(artifact, expected, 'only integer n < 30 breakdown cells are removed');
 assert.deepEqual(release.artifact, stored, 'stored release is not mutated');
});

test('v1.8.11: precomputed All-data JSON has no small row breakdowns', () => {
 assertRowBreakdownFloor(JSON.parse(readFileSync('data/jevbench-v1.8.11-alldata.json')).artifact, 'snapshot');
});

// The live board + All-data input check for this release lives in test/cr-257-live-*-min-samples.test.mjs (CR-817).
