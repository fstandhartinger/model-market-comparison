import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV1811Candidate,hasPublishedJevbenchV1811Release,readJevbenchV1811ForBoard,V1811_NEW_KEYS} from '../lib/jevbench-v1811-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
const load=(v,n)=>JSON.parse(readFileSync(`data/raw/benchmarks/jevbench/v1.8/jevbench-${v}-${n}.json`));
test('v1.8.11 carries every score, rank, note and stored category unchanged',()=>{
 const a=load('v1.8.11','results'),b=load('v1.8.10','results');
 assert.deepEqual(a.systems.filter(s=>!V1811_NEW_KEYS.includes(s.key)),b.systems);assert.deepEqual(a.board,b.board);assert.equal(a.n_ranked,b.n_ranked);
 const c=load('v1.8.11','categories'),d=load('v1.8.10','categories');for(const[k,v]of Object.entries(d.systems))assert.deepEqual(c.systems[k],v);
});
test('v1.8.11 validates as candidate and publication visibility follows PENDING/PASS',async()=>{
 const r=await readJevbenchV1811Candidate();const visible=r.manifest.review.verdict==='PASS';
 assert.equal(await hasPublishedJevbenchV1811Release(),visible);assert.equal(Boolean(await readJevbenchV1811ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.11')),visible);
 assert.deepEqual(r.proof.equating,load('v1.8.10','proof').equating);
 const s=r.artifact.systems.find(s=>s.key===V1811_NEW_KEYS[0]);assert.equal(s.ranked,false);assert.equal(s.author,'minimodels-ai');assert.equal(s.endpoint_kind,'gpu');
});
