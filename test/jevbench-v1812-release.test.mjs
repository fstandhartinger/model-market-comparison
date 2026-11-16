const normalize=r=>r.key==='h2o-lightning-4b-v1.4.1'?{...r,not_ranked_because:'declared wording-only exception'}:r;
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV1812Candidate,hasPublishedJevbenchV1812Release,readJevbenchV1812ForBoard,V1812_NEW_KEYS} from '../lib/jevbench-v1812-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
const load=(v,n)=>JSON.parse(readFileSync(`data/raw/benchmarks/jevbench/v1.8/jevbench-${v}-${n}.json`));
test('v1.8.12 carries every score, rank, note and stored category unchanged',()=>{
 const a=load('v1.8.12','results'),b=load('v1.8.11','results');
 assert.deepEqual(a.systems.filter(s=>!V1812_NEW_KEYS.includes(s.key)).map(normalize),b.systems.map(normalize));assert.deepEqual(a.board,b.board);assert.equal(a.n_ranked,b.n_ranked);
 const c=load('v1.8.12','categories'),d=load('v1.8.11','categories');for(const[k,v]of Object.entries(d.systems))assert.deepEqual(c.systems[k],v);
});
test('v1.8.12 validates as candidate and publication visibility follows PENDING/PASS',async()=>{
 const r=await readJevbenchV1812Candidate();const visible=r.manifest.review.verdict==='PASS';
 assert.equal(await hasPublishedJevbenchV1812Release(),visible);assert.equal(Boolean(await readJevbenchV1812ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.12')),visible);
 assert.deepEqual(r.proof.equating,load('v1.8.11','proof').equating);
 const s=r.artifact.systems.find(s=>s.key===V1812_NEW_KEYS[0]);assert.equal(s.ranked,false);assert.equal(s.author,'xsdfasfgsa');assert.equal(s.endpoint_kind,'gpu');
});
