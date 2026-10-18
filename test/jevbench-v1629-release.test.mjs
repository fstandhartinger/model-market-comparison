import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {validateJevbenchV1629Bundle, V1629_NEW_KEYS, V1629_ROW_SPEC, V1629_PRICING_MODULE_SHA256} from '../lib/jevbench-v1629-release.mjs';
import {readOptionalJevbenchV1628Release, V1628_ROOT, V1628_PRICING_MODULE_SHA256} from '../lib/jevbench-v1628-release.mjs';
const base=`${process.cwd()}/${V1628_ROOT}`;
const json=async n=>JSON.parse(await readFile(`${base}/jevbench-v1.6.29-${n}.json`,'utf8'));
const [manifest,artifact,categories,proof]=await Promise.all(['publication','results','categories','proof'].map(json));
const previous=await readOptionalJevbenchV1628Release();
const previousManifestSha256=createHash('sha256').update(await readFile(`${base}/jevbench-v1.6.28-publication.json`)).digest('hex');
const T='torchcast-decision-4b-v1.2',V='vega-u-qwen3.5-0.8b';
const bundle=()=>({manifest:{...structuredClone(manifest),review:{engine:'independent-fixture',verdict:'PASS',receipt_sha256:'a'.repeat(64)}},artifact:structuredClone(artifact),categories:structuredClone(categories),proof:structuredClone(proof),previous,previousManifestSha256});
const row=(b,k)=>b.artifact.systems.find(s=>s.key===k);
const reject=(f,re=/./)=>{const b=bundle();f(b);assert.throws(()=>validateJevbenchV1629Bundle(b),re);};
test('v1.6.29 validates after independent PASS; real release remains review gated',()=>{
 assert.doesNotThrow(()=>validateJevbenchV1629Bundle(bundle()));
 assert.deepEqual(V1629_NEW_KEYS,[T,V]); assert.equal(artifact.systems.length,58); assert.equal(artifact.n_ranked,47);
 assert.equal(V1629_PRICING_MODULE_SHA256,V1628_PRICING_MODULE_SHA256);
 reject(b=>{b.manifest.review={engine:'PENDING',verdict:'PENDING',receipt_sha256:null};},/independent release review/);
});
test('Vega-U reproduces handoff points and stays outside every release top five',()=>{
 const s=row(bundle(),V); assert.equal(s.scores.A,0.21547146354638824); assert.equal(s.capability,36.52005519443276);
 assert.deepEqual(['intelligence','calibration','cost','speed'].map(k=>Number(s.axes[k].toFixed(4))),[5.5034,67.5367,67.3524,73.8349]);
 assert.equal(s.cost.usd_per_1000,0.012253273333333332); assert.equal(s.endpoint_kind,'cpu');
 assert.ok(Object.values(s.ranks).every(r=>r>5));
 reject(b=>{row(b,V).axes.intelligence+=1;});
});
test('both rows bind native usage, raw hashes, costs and tariff estimates',()=>{
 for(const k of [T,V]){
  assert.equal(row(bundle(),k).status.answered_ok,1500);assert.equal(row(bundle(),k).cost.kind,'estimate');
  reject(b=>{b.proof.new_rows[k].input_tokens--;},/usage/);
  reject(b=>{b.proof.new_rows[k].output_tokens++;},/usage/);
  reject(b=>{b.proof.new_rows[k].raw_sha256='f'.repeat(64);},/new-row provenance/);
  reject(b=>{b.proof.new_rows[k].price_per_million.input*=2;},/tariff/);
  reject(b=>{row(b,k).cost.usd_per_1000*=1.01;},/cost/);
  reject(b=>{b.proof.new_rows[k].under_cost_cap=false;},/cost binding/);
 }
 assert.equal(row(bundle(),T).cost.usd_per_1000,1000*(982889*0.030000000000000002)/1e6/1500);
});
test('paid approval reuses standing-rule shape, names order and claims no card',()=>{
 const a=proof.publication_approval;
 assert.deepEqual(a.paid_fast_lane.orders,{[T]:'39e2266a'});assert.equal(a.top_five_effect,'changes-paid-only');
 assert.deepEqual(a.top_five_changed_by,[T]);assert.equal(a.top_five_preview,null);assert.equal(a.button_tap,false);
 reject(b=>{b.proof.publication_approval.paid_fast_lane.orders[T]='wrong';},/paid fast-lane rule provenance/);
 reject(b=>{b.proof.publication_approval.top_five_preview={card_id:'99999'};},/no card/);
 reject(b=>{b.proof.publication_approval.top_five_changed_by=[T,V];},/top-five causes/);
 reject(b=>{b.proof.publication_approval.go.quote='go';},/GO provenance/);
 reject(b=>{row(b,T).paid_fast_lane=false;},/paid flag/);
 reject(b=>{row(b,V).paid_fast_lane=true;},/paid flag/);
});
test('runtime and host differences remain mandatory evidence',()=>{
 for(const [field,value] of [['attention_mode','causal'],['noul_floor',.8],['network_mode','host'],['cuda_graphs',true],['speed_strictly_comparable_to_v11',true]])
  reject(b=>{b.proof.new_rows[T][field]=value;},/runtime provenance/);
 for(const [field,value] of [['right_truncated_answered_items',0],['context_cap_tokens',16384],['dtype','bf16'],['threads',64],['speed_comparable_with_gpu_rows',true]])
  reject(b=>{b.proof.new_rows[V][field]=value;},/CPU provenance/);
 for(const k of [T,V]){
  reject(b=>{row(b,k).endpoint_condition+=' ';},/endpoint_condition verbatim/);
  for(const fragment of V1629_ROW_SPEC[k].disclosures.slice(0,-1)) reject(b=>{
   const i=b.artifact.measurement_notes.findIndex(n=>n.startsWith(`${k}: `));b.artifact.measurement_notes[i]=b.artifact.measurement_notes[i].replaceAll(fragment,'x');
  },/required disclosure|too thin/);
 }
});
test('carried estimates, unranked A2, raw hashes and categories remain frozen',()=>{
 reject(b=>{row(b,'kettei-fat').capability++;});
 reject(b=>{row(b,'microsoft-decision-1-a2-20261012').display+=' ';},/carried preliminary row unchanged/);
 reject(b=>{b.proof.raw_sha256['kettei-fat']='b'.repeat(64);},/inherited raw-output hashes/);
 reject(b=>{b.proof.new_rows['basal-omni-1.0-ultra'].input_tokens++;},/inherited new-row provenance/);
 reject(b=>{b.proof.pricing_module_sha256='b'.repeat(64);},/pricing|provenance/);
 reject(b=>{b.proof.predecessor_seal_sha256=null;},/seal binding/);
});
test('public notes reject private paths, contact data and placeholders',()=>{
 for(const text of [' someone@example.com',' /home/flori/x',' PLACEHOLDER']) reject(b=>{
 const i=b.artifact.measurement_notes.findIndex(n=>n.startsWith(`${T}: `));b.artifact.measurement_notes[i]+=text;
 },/personal e-mail|private|placeholder/);
});
