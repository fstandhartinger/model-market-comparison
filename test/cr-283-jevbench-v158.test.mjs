import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV157Release, readJevbenchV158Release} from '../lib/jevbench-v15-release.mjs';
import {readCurrentJevbench, CURRENT_JEVBENCH_PAGE} from '../lib/jevbench-current.mjs';
import {baseModelFor} from '../lib/jev-base-model.mjs';
import {jevClassRows} from '../lib/jevbench-jev-class.mjs';
import {jevbenchCategoryView} from '../lib/jevbench-categories.mjs';
const read = p => JSON.parse(readFileSync(new URL(p,import.meta.url)));
const {artifact:old,sha256} = await readJevbenchV157Release();
const {artifact:a} = await readJevbenchV158Release();
const keys=['wity-1','wity-1-always','wity-1-off'];
const rows=keys.map(k=>a.systems.find(r=>r.key===k));
const fast=['torchcast-decision-12b','quyet-1-0-large','quyet-1-0-medium','quyet-1-0-small','quyet-1-0-small-en','quyet-1-0-tiny'];
const fastRows=fast.map(k=>a.systems.find(r=>r.key===k));
test('CR-283 adds one ranked Wity mode, two variants and six fast-lane rows; every existing value except ranks is preserved',async()=>{
 assert.deepEqual(a.parent_release,{revision:'v1.5.7',sha256});
 assert.deepEqual(a.systems.map(r=>r.key),[...old.systems.map(r=>r.key),...keys,...fast]);
 assert.deepEqual(a.not_measured,old.not_measured);
 for(const r of old.systems){const now=a.systems.find(s=>s.key===r.key);for(const f of Object.keys(r).filter(f=>!['rank','ranks'].includes(f)))assert.deepEqual(now[f],r[f],`${r.key}.${f}`);}
 assert.equal(a.G_med,old.G_med);assert.equal(a.n_ranked,old.n_ranked+7);
 assert.equal((await readCurrentJevbench()).artifact.revision,'v1.5.8');assert.equal(CURRENT_JEVBENCH_PAGE,'/jev-models/v1.5.8');
});
test('CR-283 only ranked rows enter orders; existing rows keep their relative order; variants stay out; actual Capability classifier',()=>{
 const c=jevClassRows(a.systems.filter(r=>r.ranked));
 const eligible=c.rows.filter(r=>r.inClass).map(r=>r.row.key);
 const prior=jevClassRows(old.systems.filter(r=>r.ranked)).rows.filter(r=>r.inClass).map(r=>r.row.key);
 const joined=new Set(['wity-1',...fast]);
 assert.deepEqual(eligible.filter(k=>!joined.has(k)),prior);
 for(const k of joined)assert.ok(eligible.includes(k),k);
 for(const o of 'ABC'){
  assert.deepEqual(a.board[o].order.filter(k=>!joined.has(k)),old.board[o].order);
  assert.equal(a.board[o].order.length,old.board[o].order.length+7);
 }
 assert.deepEqual(rows[0].ranks,{A:2,B:2,C:2});
 assert.deepEqual(fastRows[0].ranks,{A:1,B:1,C:1});
 for(const row of rows.slice(1)){
  assert.equal(row.ranked,false);assert.equal(row.listing,'variant');assert.equal(row.rank,null);assert.deepEqual(row.ranks,{});
  assert.match(row.not_ranked_because,/Configuration variant.*operator's main row/);
 }
 const top=read('../ops/jevbench-v158-cr283/TOP-FIVE.json');
 assert.deepEqual(top.changed,{A:true,B:true,C:true,Capability:true});
 for(const o of ['A','B','C','Capability']){
  const after=top['after_v1.5.8'][o];
  assert.deepEqual(after.filter(k=>!joined.has(k)),top['before_v1.5.7'][o].filter(k=>after.includes(k)));
 }
 assert.deepEqual(top['after_v1.5.8'].Capability.slice(0,3),['wity-1','quyet-1-0-large','torchcast-decision-12b']);
 assert.match(top.rule,/Top-five change\. Held for Florian's GO on the combined screenshot preview/);
});
test('CR-283 fast-lane rows: pinned open weights, reproduced official aggregate, estimated base-reference cost, cited base',()=>{
 const receipt=read('../ops/jevbench-v158-cr283/FASTLANE-RESCORE-RECEIPT.json');
 for(const r of fastRows){
  assert.equal(r.ranked,true);assert.equal(r.listing,'ranked');assert.equal(r.last_measured_on,'2026-10-04');
  assert.equal(r.status.answered_ok,1624);assert.equal(r.endpoint_kind,'gpu');assert.equal(r.open,'open weights');
  assert.match(r.model_pin,/@[0-9a-f]{40}/);assert.match(r.endpoint_condition,/--network none/);
  assert.equal(r.cost.kind,'estimate');assert.match(r.cost.basis,/^ESTIMATE/);
  assert.equal(receipt.systems[r.key].reproduced_delivered_aggregate,true);
  assert.equal(receipt.systems[r.key].raw_sha256,r.provenance.raw_sha256);
  assert.equal(baseModelFor('jevbench',r.key).status,'disclosed');
  assert.doesNotMatch(JSON.stringify(r),/task_id|"prompt"|"answer"/);
 }
});
test('CR-283 pinned build, reasoning, price and self-reported striped base are disclosed for each mode',()=>{
 for(const [i,mode] of ['auto','always','off'].entries()){
  const r=rows[i];assert.equal(r.display,`wity-1 (Wity, reasoning ${mode})`);
  assert.equal(r.status.answered_ok,1624);assert.equal(r.last_measured_on,'2026-10-04');
  assert.match(r.model_pin,/f65ce826a455.*all 1,624 responses/);assert.ok(r.model_pin.includes(`reasoning=${mode}`));
  assert.match(r.endpoint_condition,/API default is off/);
  assert.match(r.cost.basis,/USD 0\.042 per 1M input tokens, output free/);
  assert.equal(r.cost.usd_per_1000,0.02441896551724138);assert.equal(r.alt.usd_per_1000,0.08721059113300492);
  assert.match(r.alt.note,/self-reported.*not independently verified/);
  assert.equal(baseModelFor('jevbench',r.key).status,'self-reported');
  assert.equal(baseModelFor('jevbench',r.key).label,'Qwen/Qwen3.6-35B-A3B (self-reported)');
  assert.equal(r.adapter_id,`run/wity-1-${mode}.spec.json:wity_reasoning_adapter.WityReasoningAdapter`);
  assert.doesNotMatch(JSON.stringify(r),/task_id|"prompt"|"answer"|28 Sep|2026-10-03/);
 }
 assert.equal(rows[0].scores.A,73.74884310922342);
 const receipt=read('../ops/jevbench-v158-cr283/RESCORE-RECEIPT.json');
 for(const mode of ['auto','always','off'])for(const p of ['api','base'])assert.equal(receipt[mode][p].byte_identical,true);
});
test('CR-283 both radars cover all three modes, reproduce 24 cells each, and preserve every prior category',()=>{
 const cats=read('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.8-categories.json');const prior=read('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.7-categories.json');
 for(const k of Object.keys(prior.systems))assert.deepEqual(cats.systems[k],prior.systems[k]);
 const proof=read('../ops/jevbench-v158-cr283/CATEGORY-VERIFICATION.json');
 const v=jevbenchCategoryView('v1.5.8',[...keys,...fast]);
 for(const k of [...keys,...fast]){assert.equal(proof[k].verified_per_type_cells,24);assert.ok(v.systems[k]);for(const d of ['topics','usecases'])assert.ok(Object.keys(cats.systems[k][d]).length>0);}
});
