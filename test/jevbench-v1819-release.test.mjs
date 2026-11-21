import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV1819Candidate,hasPublishedJevbenchV1819Release,readJevbenchV1819ForBoard,V1819_NEW_KEYS} from '../lib/jevbench-v1819-release.mjs';
import {baseModelFor} from '../lib/jev-base-model.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
const load=(v,n)=>JSON.parse(readFileSync(`data/raw/benchmarks/jevbench/v1.8/jevbench-${v}-${n}.json`));
test('v1.8.19 carries every score, rank, note and stored category unchanged',()=>{
 const a=load('v1.8.19','results'),b=load('v1.8.18','results');
 assert.deepEqual(a.systems.filter(s=>!V1819_NEW_KEYS.includes(s.key)),b.systems);assert.deepEqual(a.board,b.board);assert.equal(a.n_ranked,b.n_ranked);
 const c=load('v1.8.19','categories'),d=load('v1.8.18','categories');for(const[k,v]of Object.entries(d.systems))assert.deepEqual(c.systems[k],v);
});
test('v1.8.19 validates as candidate and publication visibility follows PENDING/PASS',async()=>{
 const r=await readJevbenchV1819Candidate();const visible=r.manifest.review.verdict==='PASS';
 assert.equal(await hasPublishedJevbenchV1819Release(),visible);assert.equal(Boolean(await readJevbenchV1819ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.19')),visible);
 assert.deepEqual(r.proof.equating,load('v1.8.18','proof').equating);
 const s=r.artifact.systems.find(s=>s.key===V1819_NEW_KEYS[0]);assert.equal(s.ranked,false);assert.equal(s.author,'Base Labs');assert.equal(s.endpoint_kind,'api');assert.equal(s.v16.lane,'api');assert.match(s.base_model,/^google\/gemma-4-/);
});

test('v1.8.19 hosted endpoints and cited declared bases match both new rows',()=>{
 const {systems}=load('v1.8.19','results');
 for(const key of ['bison-1','groundhog-1']){
  const row=systems.find(s=>s.key===key),base=baseModelFor('jevbench',key);
  assert.match(row.model_pin,/^hosted-api:https:\/\/inference.baseten.co\/v1\/systemone#decision-models\/baseten-.+-latest$/);
  assert.equal(row.speed.adjustment,'none (API)');assert.equal(base.status,'disclosed');assert.equal(base.label,row.base_model);assert.ok(base.sources.length);
  assert.equal(row.not_ranked_because,'Added after the v1.8.10 ranking review; it is ranked at the next review.');
 }
});
