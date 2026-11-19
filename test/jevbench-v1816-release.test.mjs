import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV1816Candidate,hasPublishedJevbenchV1816Release,readJevbenchV1816ForBoard,V1816_NEW_KEYS} from '../lib/jevbench-v1816-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
const load=(v,n)=>JSON.parse(readFileSync(`data/raw/benchmarks/jevbench/v1.8/jevbench-${v}-${n}.json`));
test('v1.8.16 carries every score, rank, note and stored category unchanged',()=>{
 const a=load('v1.8.16','results'),b=load('v1.8.15','results');
 assert.deepEqual(a.systems.filter(s=>!V1816_NEW_KEYS.includes(s.key)),b.systems);assert.deepEqual(a.board,b.board);assert.equal(a.n_ranked,b.n_ranked);
 const c=load('v1.8.16','categories'),d=load('v1.8.15','categories');for(const[k,v]of Object.entries(d.systems))assert.deepEqual(c.systems[k],v);
});
test('v1.8.16 validates as candidate and publication visibility follows PENDING/PASS',async()=>{
 const r=await readJevbenchV1816Candidate();const visible=r.manifest.review.verdict==='PASS';
 assert.equal(await hasPublishedJevbenchV1816Release(),visible);assert.equal(Boolean(await readJevbenchV1816ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.16')),visible);
 assert.deepEqual(r.proof.equating,load('v1.8.15','proof').equating);
 const s=r.artifact.systems.find(s=>s.key===V1816_NEW_KEYS[0]);assert.equal(s.ranked,false);assert.equal(s.author,'Sthanika AI');assert.equal(s.endpoint_kind,'gpu');
});

test('v1.8.16 keeps the author runtime provenance after public wording cleanup',()=>{
 const a=load('v1.8.16','results');
 for(const key of V1816_NEW_KEYS){const row=a.systems.find(s=>s.key===key);for(const fact of ['Official PyTorch 2.9.1 CUDA12.8','LettersEngine','1e64657c','0.5.1'])assert.ok(row.endpoint_condition.includes(fact),key+' '+fact);}
});

