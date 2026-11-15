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
