import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV1822Candidate,readJevbenchV1822ForBoard,hasPublishedJevbenchV1822Release,V1822_NEW_KEYS,V1822_NOTE} from '../lib/jevbench-v1822-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
const load=p=>JSON.parse(readFileSync(p));
const data=(v,n)=>load(`data/raw/benchmarks/jevbench/v1.8/jevbench-${v}-${n}.json`);
const input=load('r198/v1822/receipts/BUILD-INPUTS.json'),scored=load('r198/v1822/src/scored.json'),pub=load('r198/v1822/inputs/PUBLIC-ROWS.json');
const rows=data('v1.8.22','results'),previous=data('v1.8.21','results');
test('v1.8.22 adds exactly eight unranked rows; exact scores, costs, HTTP and approved notes',()=>{
 assert.equal(V1822_NEW_KEYS.length,8);assert.deepEqual(V1822_NEW_KEYS,Object.keys(input.rows).sort());assert.equal(rows.systems.length,366);
 for(const k of V1822_NEW_KEYS){const s=rows.systems.find(r=>r.key===k),v=input.rows[k];
  assert.equal(s.scores.A,v.A);assert.equal(s.cost.usd_per_1000,v.usd_per_1000);assert.deepEqual(s.http_status,v.raw_status);
  assert.equal(s.ranked,false);assert.equal(s.listing,'unranked');assert.equal(s.rank,null);assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});
  assert.equal(s.disclosure,pub[k].disclosure);assert.equal(s.notes,pub[k].notes);assert.deepEqual(s.disclosures,pub[k].disclosures);
  for(const f of ['decision_limit','speed','validity','v16','composite_ci95'])assert.deepEqual(s[f],scored[k]['v17-share'][f]);
  if(!k.startsWith('apus-reflex2-')){assert.equal(s.not_ranked_because,V1822_NOTE);for(const f of ['axes','scores','views','capability','jevbench_score'])assert.deepEqual(s[f],scored[k]['v17-share'][f]);}
 }
});
test('v1.8.22 carries 358 systems, measured category cells, boards and top fives unchanged; only Mica leaves not_measured',()=>{
 assert.equal(previous.systems.length,358);assert.deepEqual(rows.systems.filter(s=>!V1822_NEW_KEYS.includes(s.key)),previous.systems);assert.deepEqual(rows.board,previous.board);assert.equal(rows.n_ranked,previous.n_ranked);
 assert.deepEqual(rows.not_measured,previous.not_measured.filter(s=>s.key!=='mica-v01-4b'));
 const c=data('v1.8.22','categories'),pc=data('v1.8.21','categories');
 for(const s of previous.systems){assert.deepEqual(c.systems[s.key],pc.systems[s.key]);assert.deepEqual(c.lanes[s.key],pc.lanes[s.key]);}
 assert.deepEqual(Object.keys(c.systems).sort(),[...new Set([...Object.keys(pc.systems),...V1822_NEW_KEYS])].sort());
 for(const [b,v]of Object.entries(previous.board)){assert.deepEqual(rows.board[b].order,v.order);assert.deepEqual(rows.board[b].order?.slice(0,5),v.order?.slice(0,5));}
 for(const f of ['carry','history','history-carry'])assert.deepEqual(data('v1.8.22',f),data('v1.8.21',f));
 const snapshot=load('data/jevbench-v1.8.22-alldata.json');assert.deepEqual(snapshot.artifact.not_measured,rows.not_measured);
});
test('v1.8.22 APUS uses frozen equated summary values and remains unpriced without composites or ranks',()=>{
 const d=load('data/jevbench-draw-equating.json').draws.find(d=>d.draw==='v1.6-regular-20261027');
 for(const k of ['apus-reflex2-1','apus-reflex2-2']){const s=rows.systems.find(s=>s.key===k),eq=input.rows[k].equated,raw=scored[k]['v17-share'];
  assert.deepEqual(s.draw.offset,d.offset);assert.equal(s.draw.status,'equated');assert.equal(s.draw.id,d.draw);assert.deepEqual(eq.offset,d.offset);
  assert.equal(s.axes.intelligence,eq.intelligence);assert.equal(s.axes.calibration,eq.calibration);assert.equal(s.capability,eq.capability);
  assert.equal(s.axes.intelligence,raw.axes.intelligence+d.offset.I);assert.equal(s.axes.calibration,raw.axes.calibration+d.offset.C);
  assert.equal(s.cost.kind,'unpriced');assert.equal(s.cost.usd_per_1000,null);assert.equal(s.axes.cost,null);assert.equal(s.jevbench_score,null);assert.deepEqual(s.scores,{A:null,B:null,C:null});assert.equal(s.paid_fast_lane,true);
  assert.match(s.not_ranked_because,/no price/);assert.match(s.disclosure,/no public tariff or parameter count was stated/);
 }
});
test('v1.8.22 self-hosted cost wording and critic corrections are exact',()=>{
 const u=load('r198/v1822/src/usage.json');
 for(const k of V1822_NEW_KEYS.filter(k=>!k.startsWith('apus-reflex2-'))){const s=rows.systems.find(s=>s.key===k),v=u[k];
  for(const t of ['GPU-time estimate from v1.8.0',String(v.gpu_all),String(v.cost_all),'Estimated, not a bill.'])assert.ok(s.cost.basis.includes(t),k+' '+t);
  if(v.list_all===null)assert.match(s.cost.basis,/GPU-time estimate only/);else{assert.ok(s.cost.basis.includes(String(v.list_all)));assert.match(s.cost.basis,/Applied min/);}
 }
 const mica=rows.systems.find(s=>s.key==='mica-v01-4b');assert.ok(mica.disclosures.includes("Measured latency includes the serving bridge's prompt and label parity checks, so its overhead differs from the earlier serving path."));assert.ok(mica.disclosures.includes("Probabilities use the author's repository calibration (temperature 1.124473)."));
 assert.ok(rows.systems.find(s=>s.key==='decision-4b-v16').disclosures.includes('One forward pass covers up to 26 options; larger option sets would be read out in two levels (none occur in this draw).'));
});
test('v1.8.22 PENDING visibility and unchanged scorer/equating bindings',async()=>{
 const r=await readJevbenchV1822Candidate(),visible=r.manifest.review.verdict==='PASS';assert.match(r.proof.publication_approval.status,/^(PENDING|GO \(.+\))$/);
 assert.equal(await hasPublishedJevbenchV1822Release(),visible);assert.equal(await readJevbenchV1822ForBoard()!==null,visible);assert.equal(await readJevAllDataInput('v1.8.22')!==null,visible);
 assert.deepEqual(r.proof.scorers,data('v1.8.21','proof').scorers);assert.deepEqual(r.proof.equating,data('v1.8.21','proof').equating);
 const d=load('data/jevbench-draw-equating.json').draws.find(d=>d.draw==='v1.6-regular-20261122');assert.deepEqual(d.releases,['v1.8.20','v1.8.21','v1.8.22']);assert.equal(d.latest_release,'v1.8.22');assert.deepEqual(d.offset,{I:0,C:0});assert.equal(d.g_med,2.573387642438244);
});
