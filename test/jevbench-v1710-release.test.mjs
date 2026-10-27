import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateJevbenchV1710Bundle,readJevbenchV1710ForBoard,readOptionalJevbenchV1710Release,V1710_NEW_KEYS} from '../lib/jevbench-v1710-release.mjs';
import {readOptionalJevbenchV179Release} from '../lib/jevbench-v179-release.mjs';
import {checkNewRowText} from '../r196/v1710/row_gates_v1710.mjs';
const base='data/raw/benchmarks/jevbench/v1.7/',load=async n=>JSON.parse(await readFile(`${base}jevbench-v1.7.10-${n}.json`));
const b={manifest:await load('publication'),artifact:await load('results'),categories:await load('categories'),carry:await load('carry'),proof:await load('proof'),previous:await readOptionalJevbenchV179Release(),previousManifestSha256:createHash('sha256').update(await readFile(`${base}jevbench-v1.7.9-publication.json`)).digest('hex')};
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k),mutate=(fn,pattern)=>{const x=structuredClone(b);fn(x);assert.throws(()=>validateJevbenchV1710Bundle(x,{candidate:true}),pattern)};
test('v1.7.10 validates all rows and hides PENDING from public readers',async()=>{
 assert.equal(validateJevbenchV1710Bundle(b,{candidate:true}),true);assert.equal(b.previous.artifact.systems.length,297);assert.equal(b.artifact.systems.length,300);
 assert.deepEqual(V1710_NEW_KEYS,['decisio-qwen3.6-35b-a3b-v090','iota-decide-4b-v0.3','phillylabs_philly_decider_v2']);
 if(b.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV1710ForBoard(),null);await assert.rejects(()=>readOptionalJevbenchV1710Release(),/review PENDING/);}
 else {assert.equal(b.manifest.review.verdict,'PASS');assert.equal((await readJevbenchV1710ForBoard()).artifact.revision,'v1.7.10');}
});
test('v1.7.10 rejects carried score, interval, category and lane changes',()=>{
 for(const key of ['launchables-myles-g-12b','iota-decide-4b','knowledgator_gliclass_v4_9b']){
  mutate(x=>{row(x,key).axes.speed+=1},/carried row/);mutate(x=>{row(x,key).composite_ci95.A[0]+=1},/carried row/);mutate(x=>{x.categories.systems[key]={}},/carried cells/);mutate(x=>{x.categories.lanes[key]='api'},/carried lane/);
 }
});
test('v1.7.10 rejects roster, rank, new row and provenance mutations',()=>{
 mutate(x=>x.artifact.systems.pop(),/roster/);mutate(x=>x.artifact.systems.push(x.artifact.systems[0]),/duplicate/);mutate(x=>x.artifact.board.A.order.reverse(),/rank|sort/);
 for(const k of V1710_NEW_KEYS){mutate(x=>{row(x,k).axes.cost+=1},/new self-hosted row/);mutate(x=>{x.proof.new_rows[k].raw_sha256='bad'},/source pins/)}
 mutate(x=>{x.proof.pricing_module_sha256='a'.repeat(64)},/pricing pin/);mutate(x=>{x.manifest.predecessor.publication_sha256='b'.repeat(64)},/predecessor/);
});
test('v1.7.10 requires exact FAIR receipt and paid public order',()=>{
 mutate(x=>{x.proof.publication_approval.fairness_check.verdict='PENDING'},/bound FAIR/);mutate(x=>{x.proof.publication_approval.fairness_check.sha256='a'.repeat(64)},/fairness verdict/);
 mutate(x=>{x.proof.publication_approval.paid_public.visibility='private'},/paid public/);mutate(x=>{x.proof.publication_approval.paid_public.order='other'},/paid public/);
});
test('v1.7.10 pin, template, public-text and cost-kind gates reject negatives',()=>{
 for(const k of V1710_NEW_KEYS){const s=row(b,k);checkNewRowText(s);
  for(const [field,value,pattern] of [['model_pin','wrong@123',/model pin/],['disclosure','bad {REF}',/template/],['disclosure','Florian board #12345',/internal/],['disclosure','ranked #1',/internal/],['endpoint_condition','lead-verified',/internal/]]){const t=structuredClone(s);t[field]=value;assert.throws(()=>checkNewRowText(t),pattern)}
  const t=structuredClone(s);t.cost.kind='measured';assert.throws(()=>checkNewRowText(t),/cost kind/);
 }
});
test('v1.7.10 exact new scores, coverage and public disclosures',()=>{
 const expected={'phillylabs_philly_decider_v2':[69.30,56.08,82.52,93.20,64.55,71.21],'iota-decide-4b-v0.3':[68.64,52.53,84.76,87.47,64.33,69.19],'decisio-qwen3.6-35b-a3b-v090':[61.49,33.97,89.01,90.99,32.42,9.41]};
 for(const k of V1710_NEW_KEYS){const s=row(b,k),a=s.axes;assert.deepEqual([s.capability,a.intelligence,a.calibration,a.speed,a.cost,s.scores.A].map(x=>+x.toFixed(2)),expected[k]);assert.equal(s.status.rows,1500);assert.equal(s.status.answered_ok,k.startsWith('decisio')?1485:1500);assert.equal(s.cost.kind,'estimate')}
 const p=row(b,'phillylabs_philly_decider_v2');assert.match(p.disclosure,/aggregate longest-state length/);assert.match(p.disclosure,/frozen by the evaluator before launch/);assert.match(p.disclosure,/unchanged frozen scorer rejects both/);
 const i=row(b,'iota-decide-4b-v0.3');assert.equal(i.paid_fast_lane,true);assert.match(i.disclosure,/0.801/);assert.match(i.disclosure,/16,384/);
 const d=row(b,'decisio-qwen3.6-35b-a3b-v090');assert.match(d.cost.basis,/1,761,623/);assert.match(d.cost.basis,/2.77x/);assert.match(d.disclosure,/FP8/);assert.match(d.disclosure,/server-observed engine count was unavailable/);
});
test('v1.7.10 synthetic board ranks and official cap lists match the recorded assembly',async()=>{
 const {jevLiveAllArtifact}=await import('../lib/jevbench-cohort-merge.mjs');
 const {jevbenchScopeArtifact,jevScopeClassifier}=await import('../lib/jevbench-scope.mjs');
 const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await import('../lib/jevbench-jev-class.mjs');
 const {readJevbenchV157Release}=await import('../lib/jevbench-v15-release.mjs');
 const historical=await readJevbenchV157Release();
 const isApi=jevScopeClassifier(b.artifact.systems,b.carry.rows,historical.artifact.systems,historical.artifact.not_measured);
 const f=JSON.parse(await readFile('test/fixtures/jevbench-v1710-ranks.json'));
 const arts={all:jevLiveAllArtifact(b.artifact,isApi),open:jevbenchScopeArtifact(b.artifact,'open',isApi),api:jevbenchScopeArtifact(b.artifact,'api',isApi)};
 for(const [scope,a] of Object.entries(arts)){
  const rows=a.systems.filter(s=>s.ranked);
  assert.deepEqual(Object.fromEntries(rows.map(s=>[s.key,[s.rank,s.ranks.A,s.ranks.B,s.ranks.C,s.ranks.capability]])),f.views[scope].ranks);
  for(const m of ['A','B','C'])assert.deepEqual(a.board[m].order,f.views[scope].composite[m]);
  for(const [label,opts]of [['official_caps',{}],['no_caps',{costFactor:Infinity,latencyFactor:Infinity}],['cost_off_latency_2x',{costFactor:Infinity}],['latency_none',{latencyFactor:Infinity}]])assert.deepEqual(jevClassRows(rows,{...JEV_V16_CLASS_OPTIONS,...opts}).rows.filter(r=>r.inClass).map(r=>r.row.key),f.views[scope].capability[label]);
 }
});

test('v1.7.10 repo exception rejects HF regression, source or other field changes',()=>{
 for(const k of ['singularity-super-decider','singularity-super-decider-thinking']){
  mutate(x=>{row(x,k).repo='https://huggingface.co/singularity';},/carried row/);
  mutate(x=>{row(x,k).source_url='https://wrong.example';},/vendor source/);
  mutate(x=>{row(x,k).disclosure+=' changed';},/carried row/);
 }
 mutate(x=>{x.proof.exceptions={};},/link proof exceptions/);
});
