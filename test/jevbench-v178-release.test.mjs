import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateJevbenchV178Bundle,readJevbenchV178ForBoard,readOptionalJevbenchV178Release,hasPublishedJevbenchV178Release,V178_NEW_KEYS} from '../lib/jevbench-v178-release.mjs';
import {readOptionalJevbenchV177Release} from '../lib/jevbench-v177-release.mjs';
const base='data/raw/benchmarks/jevbench/v1.7/';
const load=async n=>JSON.parse(await readFile(`${base}jevbench-v1.7.8-${n}.json`));
const sha=b=>createHash('sha256').update(b).digest('hex');
const b={manifest:await load('publication'),artifact:await load('results'),categories:await load('categories'),carry:await load('carry'),proof:await load('proof'),previous:await readOptionalJevbenchV177Release(),previousManifestSha256:sha(await readFile(`${base}jevbench-v1.7.7-publication.json`))};
const mutate=(fn,pattern)=>{const x=structuredClone(b);fn(x);assert.throws(()=>validateJevbenchV178Bundle(x,{candidate:true}),pattern);};
test('v1.7.8 preserves all 295 predecessor rows, cells and frozen method',()=>{
 assert.equal(validateJevbenchV178Bundle(b,{candidate:true}),true);
 assert.equal(b.previous.artifact.systems.length,295);assert.equal(b.artifact.systems.length,296);
 assert.deepEqual(V178_NEW_KEYS,['jeff_1_1_medium']);
});
test('v1.7.8 PENDING is hidden; synthetic PASS is readable',async()=>{
 if(b.manifest.review.verdict==='PENDING'){
  assert.equal(await readJevbenchV178ForBoard(),null);assert.equal(await hasPublishedJevbenchV178Release(),false);
  await assert.rejects(()=>readOptionalJevbenchV178Release(),/review PENDING/);
 }else{assert.equal((await readJevbenchV178ForBoard()).artifact.revision,'v1.7.8');}
 for(const p of ['app/api/jevbench/v1.7.8/route.ts','app/jev-models/v1.7.8/page.tsx'])assert.match(await readFile(p,'utf8'),/readJevbenchV178ForBoard\(\)/);
});
test('v1.7.8 rejects changed carried scores, confidence intervals and cells',()=>{
 mutate(x=>{x.artifact.systems.find(s=>!V178_NEW_KEYS.includes(s.key)).axes.speed+=1;},/carried row/);
 mutate(x=>{x.artifact.systems.find(s=>s.composite_ci95?.A&&!V178_NEW_KEYS.includes(s.key)).composite_ci95.A[0]+=1;},/carried row/);
 mutate(x=>{x.categories.systems[Object.keys(x.previous.categories.systems)[0]]={};},/carried cells/);
});
test('v1.7.8 rejects altered new rows, roster, ranks and source pins',()=>{
 mutate(x=>{x.artifact.systems.find(s=>s.key===V178_NEW_KEYS[0]).capability+=1;},/new self-hosted row/);
 mutate(x=>x.artifact.systems.pop(),/roster/);mutate(x=>x.artifact.systems.push(x.artifact.systems[0]),/duplicate/);
 mutate(x=>x.artifact.board.A.order.reverse(),/rank|sort/);
 mutate(x=>{x.proof.new_rows[V178_NEW_KEYS[0]].raw_sha256='bad';},/source pins/);
 mutate(x=>{x.manifest.predecessor.publication_sha256='b'.repeat(64);},/predecessor/);
 mutate(x=>{x.proof.pricing_module_sha256='b'.repeat(64);},/pricing pin/);
});
test('v1.7.8 requires standing approval and independent publication review',()=>{
 assert.throws(()=>validateJevbenchV178Bundle({...b,manifest:{...b.manifest,review:{verdict:'PENDING'}}}),/review PENDING/);
 mutate(x=>{x.proof.publication_approval.top_five_effect='none';},/standing top-five GO/);
 mutate(x=>{x.proof.publication_approval.go.quote='other';},/standing top-five GO/);
});
test('v1.7.8 published validation refuses unbound fairness',()=>{
 const x=structuredClone(b);x.manifest.review={verdict:'PASS',engine:'independent-fixture',receipt_sha256:'a'.repeat(64)};
 x.proof.publication_approval.fairness_check={path:'fixture.json',verdict:'PENDING'};
 assert.throws(()=>validateJevbenchV178Bundle(x),/bound FAIR/);
 x.proof.publication_approval.fairness_check.verdict='FAIR';
 assert.throws(()=>validateJevbenchV178Bundle(x),/bound FAIR/);
});
test('v1.7.8 carries exact Jeff scores, pin, licence and disclosures',async()=>{
 const s=b.artifact.systems.find(s=>s.key==='jeff_1_1_medium'),a=s.axes;
 assert.deepEqual([s.capability,a.intelligence,a.calibration,a.speed,a.cost,s.scores.A].map(x=>+x.toFixed(2)),[81.89,74.49,89.28,73.98,53.79,70.51]);
 assert.ok(s.model_pin.startsWith('jgeuter/Jeff-1.1-Medium@540c40924dd67c715d3367309ba6744bac754b00'));
 assert.equal(Object.hasOwn(s,'base_model'),false);assert.equal(s.status.answered_ok,1500);assert.equal(s.decision_limit.n_over_limit,0);
 for(const text of ['8,192','427,166','overlap with JevBench','Jev-compatible','unmodified','ESTIMATE'])assert.ok(s.disclosure.includes(text));
 assert.match(s.licence,/CC BY-NC-4.0/);
 const {jevV15FilterRows}=await import('../lib/jevbench-v15-filter-rows.mjs');
 assert.match(jevV15FilterRows(b.artifact).find(r=>r.key===s.key).licence,/CC BY-NC-4.0/);
 assert.doesNotMatch(JSON.stringify(s),/\{[A-Za-z_][A-Za-z0-9_]*\}/);
});
test('v1.7.8 synthetic board ranks and official cap lists match the recorded assembly',async()=>{
 const {jevLiveAllArtifact}=await import('../lib/jevbench-cohort-merge.mjs');
 const {jevbenchScopeArtifact,jevScopeClassifier}=await import('../lib/jevbench-scope.mjs');
 const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await import('../lib/jevbench-jev-class.mjs');
 const {readJevbenchV157Release}=await import('../lib/jevbench-v15-release.mjs');
 const historical=await readJevbenchV157Release();
 const isApi=jevScopeClassifier(b.artifact.systems,b.carry.rows,historical.artifact.systems,historical.artifact.not_measured);
 const f=JSON.parse(await readFile('test/fixtures/jevbench-v178-ranks.json'));
 const arts={all:jevLiveAllArtifact(b.artifact,isApi),open:jevbenchScopeArtifact(b.artifact,'open',isApi),api:jevbenchScopeArtifact(b.artifact,'api',isApi)};
 for(const [scope,a] of Object.entries(arts)){
  const rows=a.systems.filter(s=>s.ranked);
  assert.deepEqual(Object.fromEntries(rows.map(s=>[s.key,[s.rank,s.ranks.A,s.ranks.B,s.ranks.C,s.ranks.capability]])),f.views[scope].ranks);
  for(const m of ['A','B','C'])assert.deepEqual(a.board[m].order,f.views[scope].composite[m]);
  for(const [label,opts]of [['official_caps',{}],['no_caps',{costFactor:Infinity,latencyFactor:Infinity}],['cost_off_latency_2x',{costFactor:Infinity}],['latency_none',{latencyFactor:Infinity}]])assert.deepEqual(jevClassRows(rows,{...JEV_V16_CLASS_OPTIONS,...opts}).rows.filter(r=>r.inClass).map(r=>r.row.key),f.views[scope].capability[label]);
 }
});
