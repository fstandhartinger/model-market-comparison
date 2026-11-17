import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV1815Candidate,hasPublishedJevbenchV1815Release,readJevbenchV1815ForBoard,V1815_NEW_KEYS} from '../lib/jevbench-v1815-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
const load=(v,n)=>JSON.parse(readFileSync(`data/raw/benchmarks/jevbench/v1.8/jevbench-${v}-${n}.json`));
test('v1.8.15 carries every score, rank, note and stored category unchanged',()=>{
 const a=load('v1.8.15','results'),b=load('v1.8.14','results');
 assert.deepEqual(a.systems.filter(s=>!V1815_NEW_KEYS.includes(s.key)),b.systems);assert.deepEqual(a.board,b.board);assert.equal(a.n_ranked,b.n_ranked);
 const c=load('v1.8.15','categories'),d=load('v1.8.14','categories');for(const[k,v]of Object.entries(d.systems))assert.deepEqual(c.systems[k],v);
});
test('v1.8.15 validates as candidate and publication visibility follows PENDING/PASS',async()=>{
 const r=await readJevbenchV1815Candidate();const visible=r.manifest.review.verdict==='PASS';
 assert.equal(await hasPublishedJevbenchV1815Release(),visible);assert.equal(Boolean(await readJevbenchV1815ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.15')),visible);
 assert.deepEqual(r.proof.equating,load('v1.8.14','proof').equating);
 const s=r.artifact.systems.find(s=>s.key===V1815_NEW_KEYS[0]);assert.equal(s.ranked,false);assert.equal(s.author,'xsdfasfgsa (Hugging Face)');assert.equal(s.endpoint_kind,'gpu');
});

test('v1.8.15 keeps the author runtime provenance after public wording cleanup',()=>{
 const a=load('v1.8.15','results');
 for(const key of V1815_NEW_KEYS){const row=a.systems.find(s=>s.key===key);for(const fact of ['official PyTorch 2.10.0','transformers 5.3.0','flash-attn 2.8.3','Python 3.12'])assert.ok(row.endpoint_condition.includes(fact),key+' '+fact);}
});

