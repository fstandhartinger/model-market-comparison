import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV1821Candidate,hasPublishedJevbenchV1821Release,readJevbenchV1821ForBoard,V1821_NEW_KEYS,V1821_NOTE} from '../lib/jevbench-v1821-release.mjs';
import {baseModelFor} from '../lib/jev-base-model.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
const load=p=>JSON.parse(readFileSync(p));
const data=(v,n)=>load(`data/raw/benchmarks/jevbench/v1.8/jevbench-${v}-${n}.json`);
const numbers={
 'strands-decider-e2b-gemma4-v2-2611':[38.50846642924707,0.002515999793650794],
 'strands-decider-e4b-gemma4-v2-2611':[77.55240914797979,0.003122139824535719],
 'strands-decider-12b-gemma4-v2-2611':[78.0346,0.00936641947360716],
 'strands-decider-26b-a4b-gemma4-v2-2611':[80.7443,0.007258564136028254],
 'strands-decider-31b-gemma4-v2-2611':[78.5640,0.02489482786677858],
 'basal-omni-2.0-mini-preview':[74.4846,0.004981568814920555]
};
const input=load('r198/v1821/receipts/BUILD-INPUTS.json');
// Exact full precision comes from hash-verified artifact receipts; rounded table values are checked separately.
test('v1.8.21 adds exactly six unranked rows with artifact numbers and per-row HTTP treatment',()=>{
 const r=data('v1.8.21','results');assert.deepEqual(V1821_NEW_KEYS,Object.keys(numbers).sort());assert.equal(r.systems.length,358);
 for(const k of V1821_NEW_KEYS){const s=r.systems.find(x=>x.key===k),v=input.rows[k];
  assert.equal(s.scores.A,v.A);assert.equal(s.cost.usd_per_1000,v.usd_per_1000);assert.equal(s.cost.usd_per_1000,numbers[k][1]);
  assert.equal(s.scores.A.toFixed(4),numbers[k][0].toFixed(4));assert.deepEqual(s.http_status,v.raw_status);
  assert.equal(s.ranked,false);assert.equal(s.listing,'unranked');assert.equal(s.not_ranked_because,V1821_NOTE);assert.equal(s.rank,null);assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});
  const basal=k.startsWith('basal');assert.equal(s.paid_fast_lane,!basal);assert.equal(s.decision_limit.n_over_limit,basal?5:0);assert.equal(s.decision_limit.speed_n,1500);
  assert.match(s.disclosure,/all 1,500 items remain in the denominator/);assert.ok(!/32,768|255 options/.test(s.disclosure));
 }
});
test('v1.8.21 carries all 352 rows, categories, lanes, boards, orders and top fives deep-equal',()=>{
 const r=data('v1.8.21','results'),p=data('v1.8.20','results'),c=data('v1.8.21','categories'),pc=data('v1.8.20','categories');
 assert.equal(p.systems.length,352);
 const carried=r.systems.filter(s=>!V1821_NEW_KEYS.includes(s.key)).map(s=>({...s}));
 for(const e of load('r198/v1821/inputs/TEXT-EXCEPTIONS.json')){const row=carried.find(s=>s.key===e.key);assert.equal(row[e.path],e.after);row[e.path]=e.before;}
 assert.deepEqual(carried,p.systems);assert.deepEqual(r.board,p.board);assert.equal(r.n_ranked,p.n_ranked);
 for(const [k,s]of Object.entries(pc.systems)){assert.deepEqual(c.systems[k],s);assert.deepEqual(c.lanes[k],pc.lanes[k]);}
 for(const [k,b]of Object.entries(p.board)){assert.deepEqual(r.board[k].order,b.order);assert.deepEqual(r.board[k].order?.slice(0,5),b.order?.slice(0,5));}
 for(const n of ['carry','history','history-carry'])assert.deepEqual(data('v1.8.21',n),data('v1.8.20',n));
});
test('v1.8.21 publication visibility follows the bound review state',async()=>{
 const r=await readJevbenchV1821Candidate();const visible=r.manifest.review.verdict==='PASS';
 assert.match(r.proof.publication_approval.status,/^(PENDING|GO \(.+\))$/);
 assert.equal(await hasPublishedJevbenchV1821Release(),visible);assert.equal(await readJevbenchV1821ForBoard()!==null,visible);assert.equal(await readJevAllDataInput('v1.8.21')!==null,visible);
 assert.deepEqual(r.proof.scorers,data('v1.8.20','proof').scorers);assert.deepEqual(r.proof.equating,data('v1.8.20','proof').equating);
});
test('v1.8.21 draw registration and literal scoring projection use unchanged offsets/G_med',()=>{
 const d=load('data/jevbench-draw-equating.json').draws.find(d=>d.draw==='v1.6-regular-20261122');assert.deepEqual(d.releases,['v1.8.20','v1.8.21','v1.8.22']);assert.equal(d.latest_release,'v1.8.22');assert.equal(d.status,'anchor-runs-pending');assert.deepEqual(d.offset,{I:0,C:0});assert.equal(d.offset_ci95,null);assert.equal(d.g_med,2.573387642438244);
 const r=data('v1.8.21','results'),scored=load('r198/v1821/src/scored.json');
 for(const k of V1821_NEW_KEYS){const s=r.systems.find(s=>s.key===k),a=scored[k]['v17-share'];for(const f of ['axes','scores','views','capability','jevbench_score','composite_ci95','decision_limit','speed','validity','v16'])assert.deepEqual(s[f],a[f]);assert.equal(s.cost.usd_per_1000,a.cost.usd_per_1000);assert.equal(s.draw.release,'v1.8.21');assert.equal(s.v16.equated,null);}
});
test('v1.8.21 cost basis binds the exact row numbers; E2B has no list leg and 12B uses older settled reference',()=>{
 const r=data('v1.8.21','results'),u=load('r198/v1821/src/usage.json');
 for(const k of V1821_NEW_KEYS){const s=r.systems.find(s=>s.key===k),v=u[k];for(const term of ['GPU-time estimate from v1.8.0',String(v.gpu_all),String(v.cost_all),'Estimated, not a bill.'])assert.ok(s.cost.basis.includes(term),k+' '+term);
  if(v.list_all!==null){assert.ok(s.cost.basis.includes(String(v.list_all)));assert.ok(s.cost.basis.includes('Applied min(old list-price estimate, GPU-time cost)'));}else assert.match(s.cost.basis,/UNLISTED.*no list-price leg/);
 }
 assert.match(r.systems.find(s=>s.key==='strands-decider-12b-gemma4-v2-2611').cost.basis,/google\/gemma-3-12b-it.*0.05\/M input and USD 0.15\/M output/);
 const e2b=r.systems.find(s=>s.key==='strands-decider-e2b-gemma4-v2-2611');assert.equal(e2b.repo,null);assert.equal(e2b.model_pin,'StrandsAgents/strands-decider-E2B-gemma4-v2-2611@a879714f3b0f2eb9c4eff6dde89e04ee01d44862');assert.equal(baseModelFor('jevbench',e2b.key).status,'self-reported');
 const basal=r.systems.find(s=>s.key==='basal-omni-2.0-mini-preview');assert.ok(basal.disclosures.includes('5 of 1,500 items (0.33 %) read one way (two-way limit 4,096 tokens); below the 5 % row-text threshold'));assert.ok(basal.disclosures.includes('no 422s, no other errors; run complete 1,500/1,500'));
});
