import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateJevbenchV179Bundle,readJevbenchV179ForBoard,readOptionalJevbenchV179Release,hasPublishedJevbenchV179Release,V179_NEW_KEYS} from '../lib/jevbench-v179-release.mjs';
import {readOptionalJevbenchV178Release} from '../lib/jevbench-v178-release.mjs';
const base='data/raw/benchmarks/jevbench/v1.7/';
const load=async n=>JSON.parse(await readFile(`${base}jevbench-v1.7.9-${n}.json`));
const sha=b=>createHash('sha256').update(b).digest('hex');
const b={manifest:await load('publication'),artifact:await load('results'),categories:await load('categories'),carry:await load('carry'),proof:await load('proof'),previous:await readOptionalJevbenchV178Release(),previousManifestSha256:sha(await readFile(`${base}jevbench-v1.7.8-publication.json`))};
const mutate=(fn,pattern)=>{const x=structuredClone(b);fn(x);assert.throws(()=>validateJevbenchV179Bundle(x,{candidate:true}),pattern);};
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k);
test('v1.7.9 exact roster, predecessor and method; PENDING stays hidden',async()=>{
 assert.equal(validateJevbenchV179Bundle(b,{candidate:true}),true);
 assert.equal(b.previous.artifact.systems.length,296);assert.equal(b.artifact.systems.length,297);
 assert.deepEqual(V179_NEW_KEYS,['knowledgator_gliclass_v4_9b']);
 if(b.manifest.review.verdict==='PENDING'){
  assert.equal(await readJevbenchV179ForBoard(),null);assert.equal(await hasPublishedJevbenchV179Release(),false);
  await assert.rejects(()=>readOptionalJevbenchV179Release(),/review PENDING/);
 }else assert.equal((await readJevbenchV179ForBoard()).artifact.revision,'v1.7.9');
 for(const p of ['app/api/jevbench/v1.7.9/route.ts','app/jev-models/v1.7.9/page.tsx'])assert.match(await readFile(p,'utf8'),/readJevbenchV179ForBoard\(\)/);
});
test('v1.7.9 rejects changed carried scores, CIs, category cells and lane',()=>{
 const k='jeff_1_1_medium';
 mutate(x=>{row(x,k).axes.speed+=1;},/carried row/);
 mutate(x=>{row(x,k).composite_ci95.A[0]+=1;},/carried row/);
 mutate(x=>{x.categories.systems[k]={};},/carried cells/);
 mutate(x=>{x.categories.lanes[k]='api';},/carried lane/);
});
test('v1.7.9 rejects changes outside the exact reprice/link exceptions',()=>{
 mutate(x=>{row(x,'launchables-myles-g-12b').axes.intelligence+=1;},/changed existing row/);
 mutate(x=>{row(x,'singularity-super-decider').axes.cost+=1;},/changed existing row/);
 mutate(x=>{row(x,'singularity-super-decider-thinking').source_url='https://example.com';},/changed existing row/);
 mutate(x=>{x.categories.systems['launchables-myles-g-12b']={};},/carried cells/);
});
test('v1.7.9 rejects altered new row, roster, ranks and provenance pins',()=>{
 mutate(x=>{row(x,V179_NEW_KEYS[0]).capability+=1;},/new self-hosted row/);
 mutate(x=>x.artifact.systems.pop(),/roster/);mutate(x=>x.artifact.systems.push(x.artifact.systems[0]),/duplicate/);
 mutate(x=>x.artifact.board.A.order.reverse(),/rank|sort/);
 mutate(x=>{x.proof.new_rows[V179_NEW_KEYS[0]].raw_sha256='bad';},/source pins/);
 mutate(x=>{x.manifest.predecessor.publication_sha256='b'.repeat(64);},/predecessor/);
 mutate(x=>{x.proof.pricing_module_sha256='b'.repeat(64);},/pricing pin/);
});
test('v1.7.9 requires bound fairness and independent publication review',()=>{
 assert.throws(()=>validateJevbenchV179Bundle({...b,manifest:{...b.manifest,review:{verdict:'PENDING'}}}),/review PENDING/);
 mutate(x=>{x.proof.publication_approval.top_five_effect='none';},/standing top-five GO/);
 mutate(x=>{x.proof.publication_approval.go.quote='other';},/standing top-five GO/);
 const x=structuredClone(b);x.manifest.review={verdict:'PASS',engine:'independent-fixture',receipt_sha256:'a'.repeat(64)};x.proof.publication_approval.fairness_check={path:'fixture.json',verdict:'PENDING'};
 assert.throws(()=>validateJevbenchV179Bundle(x),/bound FAIR/);x.proof.publication_approval.fairness_check.verdict='FAIR';assert.throws(()=>validateJevbenchV179Bundle(x),/bound FAIR/);
});
test('v1.7.9 carries exact GLiClass scores, coverage, pin and public price text',()=>{
 const s=row(b,'knowledgator_gliclass_v4_9b'),a=s.axes;
 assert.deepEqual([s.capability,a.intelligence,a.calibration,a.speed,a.cost,s.scores.A].map(x=>+x.toFixed(2)),[63.20,39.64,86.76,85.63,51.25,37.00]);
 assert.equal(s.model_pin,'knowledgator/gliclass-v4-9b@14d11a92b5e0bab4a166e1fce4cc0777cac27182');
 assert.equal(s.base_model,'Qwen/Qwen3.5-9B');assert.equal(s.status.answered_ok,1485);assert.equal(s.decision_limit.n_over_limit,0);
 for(const text of ['32,768','HTTP 422','overlap with JevBench','unmodified','Apex-large'])assert.ok((s.disclosure+s.code_revision).includes(text));
 assert.match(s.cost.basis,/ESTIMATE/);assert.match(s.licence,/Apache-2.0/);
 assert.doesNotMatch(JSON.stringify(s),/\{[A-Za-z_][A-Za-z0-9_]*\}/);
});
test('v1.7.9 reprices existing Myles-G usage only and preserves both Super Decider HF provenance',()=>{
 const s=row(b,'launchables-myles-g-12b');assert.equal(+s.cost.usd_per_1000.toFixed(8),0.00105060);assert.equal(+s.cost.common_basis.usd_per_1000_all_items.toFixed(8),0.00132080);assert.equal(+s.axes.cost.toFixed(4),99.3568);assert.match(s.cost.basis,/GBP 0.0015/);assert.match(s.cost.basis,/prices exclude VAT/);assert.match(s.cost.basis,/earlier releases showed a same-base ESTIMATE/);
 for(const k of ['singularity-super-decider','singularity-super-decider-thinking'])assert.equal(row(b,k).source_url,'https://singularitycompute.com/super-decider');
 const old=b.previous.artifact.systems.find(s=>s.key==='launchables-myles-g-31b'),now=row(b,'launchables-myles-g-31b');const strip=s=>{s=structuredClone(s);delete s.rank;delete s.ranks;return s};assert.deepEqual(strip(now),strip(old));
});
test('v1.7.9 synthetic board ranks and official cap lists match the recorded assembly',async()=>{
 const {jevLiveAllArtifact}=await import('../lib/jevbench-cohort-merge.mjs');
 const {jevbenchScopeArtifact,jevScopeClassifier}=await import('../lib/jevbench-scope.mjs');
 const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await import('../lib/jevbench-jev-class.mjs');
 const {readJevbenchV157Release}=await import('../lib/jevbench-v15-release.mjs');
 const historical=await readJevbenchV157Release();
 const isApi=jevScopeClassifier(b.artifact.systems,b.carry.rows,historical.artifact.systems,historical.artifact.not_measured);
 const f=JSON.parse(await readFile('test/fixtures/jevbench-v179-ranks.json'));
 const arts={all:jevLiveAllArtifact(b.artifact,isApi),open:jevbenchScopeArtifact(b.artifact,'open',isApi),api:jevbenchScopeArtifact(b.artifact,'api',isApi)};
 for(const [scope,a] of Object.entries(arts)){
  const rows=a.systems.filter(s=>s.ranked);
  assert.deepEqual(Object.fromEntries(rows.map(s=>[s.key,[s.rank,s.ranks.A,s.ranks.B,s.ranks.C,s.ranks.capability]])),f.views[scope].ranks);
  for(const m of ['A','B','C'])assert.deepEqual(a.board[m].order,f.views[scope].composite[m]);
  for(const [label,opts]of [['official_caps',{}],['no_caps',{costFactor:Infinity,latencyFactor:Infinity}],['cost_off_latency_2x',{costFactor:Infinity}],['latency_none',{latencyFactor:Infinity}]])assert.deepEqual(jevClassRows(rows,{...JEV_V16_CLASS_OPTIONS,...opts}).rows.filter(r=>r.inClass).map(r=>r.row.key),f.views[scope].capability[label]);
 }
});
