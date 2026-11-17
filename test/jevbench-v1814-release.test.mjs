import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV1814Candidate,hasPublishedJevbenchV1814Release,readJevbenchV1814ForBoard,V1814_NEW_KEYS,V1814_KARPO_ROW,V1814_KARPO_CELLS} from '../lib/jevbench-v1814-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
const load=(v,n)=>JSON.parse(readFileSync(`data/raw/benchmarks/jevbench/v1.8/jevbench-${v}-${n}.json`));
test('v1.8.14 carries every score, rank, note and stored category unchanged',()=>{
 const a=load('v1.8.14','results'),b=load('v1.8.13','results');
 assert.deepEqual(a.systems.filter(s=>!V1814_NEW_KEYS.includes(s.key)),b.systems.map(s=>s.key==='karpo_decision_31b'?V1814_KARPO_ROW:s));assert.deepEqual(a.board,b.board);assert.equal(a.n_ranked,b.n_ranked);
 const c=load('v1.8.14','categories'),d=load('v1.8.13','categories');for(const[k,v]of Object.entries(d.systems))assert.deepEqual(c.systems[k],k==='karpo_decision_31b'?V1814_KARPO_CELLS:v);
});
test('v1.8.14 validates as candidate and publication visibility follows PENDING/PASS',async()=>{
 const r=await readJevbenchV1814Candidate();const visible=r.manifest.review.verdict==='PASS';
 assert.equal(await hasPublishedJevbenchV1814Release(),visible);assert.equal(Boolean(await readJevbenchV1814ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.14')),visible);
 assert.deepEqual(r.proof.equating,load('v1.8.13','proof').equating);
 const s=r.artifact.systems.find(s=>s.key===V1814_NEW_KEYS[0]);assert.equal(s.ranked,false);assert.equal(s.author,'Chinh Nguyen (chinhnc on Hugging Face)');assert.equal(s.endpoint_kind,'gpu');
});

test('v1.8.14 keeps the author runtime provenance after public wording cleanup',()=>{
 const a=load('v1.8.14','results');
 for(const key of V1814_NEW_KEYS){const row=a.systems.find(s=>s.key===key);for(const fact of ['official PyTorch 2.14.0','transformers 5.17.0','accelerate 1.15.0','Python 3.12'])assert.ok(row.endpoint_condition.includes(fact),key+' '+fact);}
});

test('Karpo disclosure and underlying describe its published breakdown scope truthfully',()=>{
 const row=load('v1.8.14','results').systems.find(s=>s.key==='karpo_decision_31b');
 assert.equal(row.disclosure,"Paid evaluation, published with the author's consent. Measured by us on an evaluator-owned rented GPU with the author's own serving code at the pinned commit, offline (no network) during the sealed run. Failed or unanswered requests count as wrong answers.");assert.equal(row.underlying,row.disclosure);
});
