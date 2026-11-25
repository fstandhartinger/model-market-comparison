import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV1820Candidate,hasPublishedJevbenchV1820Release,readJevbenchV1820ForBoard,V1820_NEW_KEYS} from '../lib/jevbench-v1820-release.mjs';
import {baseModelFor} from '../lib/jev-base-model.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
const load=(v,n)=>JSON.parse(readFileSync(`data/raw/benchmarks/jevbench/v1.8/jevbench-${v}-${n}.json`));
test('v1.8.20 carries every score, rank, note and stored category unchanged',()=>{
 const a=load('v1.8.20','results'),b=load('v1.8.19','results');
 assert.deepEqual(a.systems.filter(s=>!V1820_NEW_KEYS.includes(s.key)),b.systems);assert.deepEqual(a.board,b.board);assert.equal(a.n_ranked,b.n_ranked);
 const c=load('v1.8.20','categories'),d=load('v1.8.19','categories');for(const[k,v]of Object.entries(d.systems))assert.deepEqual(c.systems[k],v);
});
test('v1.8.20 validates as candidate and publication visibility follows PENDING/PASS',async()=>{
 const r=await readJevbenchV1820Candidate();const visible=r.manifest.review.verdict==='PASS';
 assert.equal(await hasPublishedJevbenchV1820Release(),visible);assert.equal(Boolean(await readJevbenchV1820ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.20')),visible);
 assert.deepEqual(r.proof.equating,load('v1.8.19','proof').equating);assert.deepEqual(r.proof.cost_basis,load('v1.8.19','proof').cost_basis);
 const s=r.artifact.systems.find(s=>s.key===V1820_NEW_KEYS[0]);assert.equal(s.ranked,false);assert.equal(s.author,'xsdfasfgsa (Hugging Face)');assert.equal(s.endpoint_kind,'gpu');assert.equal(s.v16.lane,'selfhosted');assert.equal(s.base_model,'Qwen/Qwen3.5-4B');assert.equal(s.paid_fast_lane,true);
});

test('v1.8.20 registers the 22 Nov draw as anchor-runs-pending with offset 0 and the row sits on it',()=>{
 const t=JSON.parse(readFileSync('data/jevbench-draw-equating.json')),d=t.draws.find(x=>x.draw==='v1.6-regular-20261122');
 assert.ok(d);assert.equal(t.draws.at(-1),d);
 assert.deepEqual({label:d.label,drawn_on:d.drawn_on,releases:d.releases,latest_release:d.latest_release,status:d.status,offset:d.offset,offset_ci95:d.offset_ci95,anchors:d.anchors,joins_via:d.joins_via,g_med:d.g_med},{label:'Fourth regular draw',drawn_on:'2026-11-22',releases:['v1.8.20','v1.8.21'],latest_release:'v1.8.21',status:'anchor-runs-pending',offset:{I:0,C:0},offset_ci95:null,anchors:[],joins_via:'v1.7-addendum',g_med:2.573387642438244});
 assert.match(d.g_med_note,/^Carried over from the 27 Oct draw/);
 // The 27 Oct entry and every earlier draw are untouched.
 const before=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws.slice(0,4);
 assert.deepEqual(before.map(x=>x.draw),['v1.6-fastlane-20261009','v1.6-regular-20261010-a2','v1.6-regular-20261012','v1.6-regular-20261027']);
 assert.equal(before[3].latest_release,'v1.8.19');assert.equal(before[3].status,'equated');
 const row=load('v1.8.20','results').systems.find(x=>x.key===V1820_NEW_KEYS[0]);
 assert.equal(row.draw.id,d.draw);assert.deepEqual(row.draw.offset,{I:0,C:0});assert.equal(row.draw.status,'anchor-runs-pending');assert.equal(row.draw.release,'v1.8.20');
 assert.equal(row.published_scores,undefined);assert.equal(row.v16.equated,null);
});

test('v1.8.20 self-hosted pin, disclosed base, standard unranked sentence and cost wording',()=>{
 const {systems}=load('v1.8.20','results');
 const row=systems.find(s=>s.key===V1820_NEW_KEYS[0]),live=systems.find(s=>s.key==='starlord-4b-preview'),base=baseModelFor('jevbench',row.key);
 assert.equal(row.model_pin,'xsdfasfgsa/Starlord-4B-v2.0-preview@b4b4facd68fde1d8f9ad3bd05d692350a789a47f');
 assert.equal(row.speed.adjustment,'x2 + 0.15 s (assumption, not measured)');assert.equal(base.status,'disclosed');assert.equal(base.label,row.base_model);assert.ok(base.sources.length);
 assert.equal(row.not_ranked_because,'Measured on the 22 Nov 2026 draw, which is not yet equated to the reference scale; anchor runs for that draw are pending. Shown unranked until then.');
 const shape=t=>t.replace(/USD [0-9.e-]+\/1,000/g,'USD N/1,000');
 assert.equal(shape(row.cost.basis),shape(live.cost.basis),'same wording as the live Starlord-4B-preview, new numbers only');
 assert.ok(row.cost.usd_per_1000<0.0068&&row.cost.usd_per_1000>0.0067);
 for(const term of ['0.801','raw softmax','exactly p = 0.5','Not yet equated'])assert.ok(row.disclosure.includes(term),term);
 assert.ok(!/inert|read by nothing/i.test(row.disclosure));
});
