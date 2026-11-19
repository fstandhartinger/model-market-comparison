import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV1817Candidate,hasPublishedJevbenchV1817Release,readJevbenchV1817ForBoard,V1817_NEW_KEYS} from '../lib/jevbench-v1817-release.mjs';
import {baseModelFor} from '../lib/jev-base-model.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
const load=(v,n)=>JSON.parse(readFileSync(`data/raw/benchmarks/jevbench/v1.8/jevbench-${v}-${n}.json`));
test('v1.8.17 carries every score, rank, note and stored category unchanged',()=>{
 const a=load('v1.8.17','results'),b=load('v1.8.16','results');
 assert.deepEqual(a.systems.filter(s=>!V1817_NEW_KEYS.includes(s.key)),b.systems);assert.deepEqual(a.board,b.board);assert.equal(a.n_ranked,b.n_ranked);
 const c=load('v1.8.17','categories'),d=load('v1.8.16','categories');for(const[k,v]of Object.entries(d.systems))assert.deepEqual(c.systems[k],v);
});
test('v1.8.17 validates as candidate and publication visibility follows PENDING/PASS',async()=>{
 const r=await readJevbenchV1817Candidate();const visible=r.manifest.review.verdict==='PASS';
 assert.equal(await hasPublishedJevbenchV1817Release(),visible);assert.equal(Boolean(await readJevbenchV1817ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.17')),visible);
 assert.deepEqual(r.proof.equating,load('v1.8.16','proof').equating);
 const s=r.artifact.systems.find(s=>s.key===V1817_NEW_KEYS[0]);assert.equal(s.ranked,false);assert.equal(s.author,'Subquadratic');assert.equal(s.endpoint_kind,'api');assert.equal(s.v16.lane,'api');assert.equal(s.base_model,null);
});

test('v1.8.17 binds Snap 1.2 to its hosted endpoint and matches the predecessor base-model display',()=>{
 const {systems}=load('v1.8.17','results');
 const key='subq-snap-1.2';
 const row=systems.find(s=>s.key===key);
 assert.equal(row.model_pin,'hosted-api:https://subq.ai#subq-snap-1.2');
 assert.match(row.endpoint_condition,/\/v1\/systemone API \(api\.subq\.ai\)/);
 assert.equal(row.speed.adjustment,'none (API)');
 const {key: previousKey,...previous}=baseModelFor('jevbench','subq-snap-1.1');
 const {key: currentKey,...current}=baseModelFor('jevbench',key);
 assert.deepEqual(current,previous);
});
