import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateJevbenchV1713Bundle,readJevbenchV1713ForBoard,readOptionalJevbenchV1713Release,V1713_NEW_KEYS,V1713_NEW_DRAW} from '../lib/jevbench-v1713-release.mjs';
import {readOptionalJevbenchV1712Release} from '../lib/jevbench-v1712-release.mjs';
import {readDrawEquating,readCohortRows} from '../lib/jevbench-cohort-merge.mjs';
import {readChainLatestRelease} from '../lib/jevbench-live-board.mjs';
import {checkNewRowText} from '../r197/v1713/row_gates_v1713.mjs';
const base='data/raw/benchmarks/jevbench/v1.7/',load=async n=>JSON.parse(await readFile(`${base}jevbench-v1.7.13-${n}.json`));
const b={manifest:await load('publication'),artifact:await load('results'),categories:await load('categories'),carry:await load('carry'),proof:await load('proof'),previous:await readOptionalJevbenchV1712Release(),previousManifestSha256:createHash('sha256').update(await readFile(`${base}jevbench-v1.7.12-publication.json`)).digest('hex')};
const K='h2o-lightning-4b-v1.4.1';
// The release builder records FAIR as PENDING until the fairness review is bound; bundle tests use a bound copy so the
// remaining gates are exercised in both states. The real approval state is asserted separately below.
const bound=x=>{const y=structuredClone(x);if(y.proof.publication_approval.top_five_effect==='changed'&&y.proof.publication_approval.fairness_check.verdict!=='FAIR')y.proof.publication_approval.fairness_check={verdict:'FAIR',sha256:'c'.repeat(64),path:'workers/r197-v1713-fair/RESULT.json'};return y;};
const B=bound(b);
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k),mutate=(fn,pattern)=>{const x=structuredClone(B);fn(x);assert.throws(()=>validateJevbenchV1713Bundle(x,{candidate:true}),pattern)};
test('v1.7.13 validates every row; PENDING is hidden, PASS is readable',async()=>{
 assert.equal(validateJevbenchV1713Bundle(B,{candidate:true}),true);assert.equal(b.previous.artifact.systems.length,300);assert.equal(b.artifact.systems.length,301);
 assert.deepEqual(V1713_NEW_KEYS,[K]);
 if(b.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV1713ForBoard(),null);await assert.rejects(()=>readOptionalJevbenchV1713Release(),/review PENDING|FAIR/);}
 else {assert.equal(b.manifest.review.verdict,'PASS');assert.equal((await readJevbenchV1713ForBoard()).artifact.revision,'v1.7.13');}
});
test('v1.7.13 top-five change requires a bound FAIR verdict; paid public basis is exact',()=>{
 const a=b.proof.publication_approval;
 assert.equal(a.status,'GO (paid public fast-lane order, automatic publication)');assert.equal(a.paid_public.order,'54575fd5');assert.equal(a.paid_public.visibility,'public');
 if(a.top_five_effect==='changed'&&a.fairness_check.verdict!=='FAIR')assert.throws(()=>validateJevbenchV1713Bundle(b,{candidate:true}),/bound FAIR/);
 mutate(x=>{x.proof.publication_approval.fairness_check.verdict='PENDING';x.proof.publication_approval.top_five_effect='changed'},/bound FAIR/);
 mutate(x=>{x.proof.publication_approval.paid_public.visibility='private'},/paid public/);mutate(x=>{x.proof.publication_approval.status='GO (standing)'},/approval status/);
 mutate(x=>{x.proof.topfive_diff_sha256='d'.repeat(64)},/top-five preview/);
});
test('v1.7.13 rejects carried score, interval, category and lane changes, including the v1.1 row',()=>{
 for(const key of ['h2o-lightning-4b','iota-decide-4b-v0.3','singularity-super-decider']){
  mutate(x=>{row(x,key).axes.speed+=1},/carried row/);mutate(x=>{row(x,key).composite_ci95.A[0]+=1},/carried row/);mutate(x=>{row(x,key).disclosure=(row(x,key).disclosure??'')+' newer version measured'},/carried row/);
  mutate(x=>{x.categories.systems[key]={}},/carried cells/);mutate(x=>{x.categories.lanes[key]='api'},/carried lane/);
 }
});
test('v1.7.13 rejects roster, rank, new row, draw and provenance mutations',()=>{
 mutate(x=>x.artifact.systems.pop(),/roster/);mutate(x=>x.artifact.systems.push(x.artifact.systems[0]),/duplicate/);mutate(x=>x.artifact.board.A.order.reverse(),/rank|sort/);
 mutate(x=>{row(x,K).axes.cost+=1},/new self-hosted row/);mutate(x=>{x.proof.new_rows[K].raw_sha256='bad'},/source pins/);
 mutate(x=>{x.proof.new_rows[K].category_pool_bounds.languages.en=1},/category pool bounds/);
 mutate(x=>{x.categories.systems[K]={...x.categories.systems[K],topics:{x:{n:20,competence:1}}}},/topics/);
 mutate(x=>{x.proof.pricing_module_sha256='a'.repeat(64)},/pricing pin/);mutate(x=>{x.manifest.predecessor.publication_sha256='b'.repeat(64)},/predecessor/);
 mutate(x=>{x.proof.scorers.score_v16='0'.repeat(64)},/scorer pins/);
});
test('v1.7.13 pin, template, public-text and cost-kind gates reject negatives',()=>{
 const s=row(b,K);checkNewRowText(s);
 for(const [field,value,pattern] of [['model_pin','h2oai/h2o-lightning-4b@193ad740925b176a3b70a5a13a7cff2f2fadd01e',/model pin/],['disclosure','bad {REF}',/template/],['disclosure','Florian board #12345',/internal/],['disclosure','ranked #1',/internal/],['endpoint_condition','lead-verified',/internal/],['disclosure','order 54575fd5',/internal/],['disclosure','per DECISIONS rule',/internal/],['author','H2O.ai (paid fast-lane order 54575fd5)',/internal|author/],['display','H2O-Lightning-4B v1.4.1 (x)',/display/]]){const t=structuredClone(s);t[field]=value;assert.throws(()=>checkNewRowText(t),pattern)}
 for(const [patch,pattern] of [[c=>{c.kind='measured'},/cost kind/],[c=>{c.basis=c.basis.replace('711,020','944,694')},/token disclosure|cost reference/],[c=>{c.basis=c.basis.replace('USD 0.03/0.15','USD 0.04/0.15')},/cost reference/]]){const t=structuredClone(s);patch(t.cost);assert.throws(()=>checkNewRowText(t),pattern)}
});
test('v1.7.13 exact new scores, cost, coverage, draw and disclosures',()=>{
 const s=row(b,K),a=s.axes;
 assert.deepEqual([s.capability,a.intelligence,a.calibration,a.speed,a.cost,s.scores.A,s.scores.B,s.scores.C].map(x=>+x.toFixed(4)),[77.0414,64.4293,89.6536,93.8617,65.2759,75.9756,73.3467,75.9756]);
 assert.equal(s.status.rows,1500);assert.equal(s.status.answered_ok,1500);assert.equal(s.decision_limit.n_over_limit,0);
 assert.equal(s.cost.kind,'estimate');assert.ok(Math.abs(s.cost.usd_per_1000-0.0143704)<1e-12);assert.equal(s.cost.common_basis,null);
 assert.match(s.cost.basis,/711,020/);assert.match(s.cost.basis,/944,694/);assert.match(s.cost.basis,/0\.22x/);
 assert.equal(s.draw.id,V1713_NEW_DRAW);assert.equal(s.draw.status,'anchor-runs-pending');assert.deepEqual(s.draw.offset,{C:0,I:0});assert.equal(s.v16.g_med_used,2.573387642438244);
 assert.equal(s.paid_fast_lane,true);assert.equal(s.display,'H2O-Lightning-4B v1.4.1');assert.equal(s.author,'H2O.ai');assert.match(s.endpoint_condition,/RTX PRO 6000/);assert.match(s.disclosure,/FIN-03/);
 assert.deepEqual(b.proof.new_rows[K].equated.offset,{C:0,I:0});assert.equal(b.proof.new_rows[K].equated.intelligence,a.intelligence);
});
test('v1.7.13 new draw joins the equating table without touching the v1.6 chain v1.7.0 is bound to',async()=>{
 const t=await readDrawEquating();const d=t.draws.find(x=>x.draw===V1713_NEW_DRAW);
 assert.deepEqual({...d},{draw:V1713_NEW_DRAW,label:'Third regular draw',drawn_on:'2026-10-27',releases:['v1.7.13'],latest_release:'v1.7.13',status:'anchor-runs-pending',offset:{I:0,C:0},offset_ci95:null,anchors:[],joins_via:'v1.7-addendum'});
 assert.equal(await readChainLatestRelease('v1.6.1'),'v1.6.43');
 const cohort=await readCohortRows(process.cwd(),()=>{});assert.ok(!cohort.rows.some(r=>r.draw.id===V1713_NEW_DRAW));
});
test('v1.7.13 synthetic board ranks and official cap lists match the recorded assembly',async()=>{
 const {jevLiveAllArtifact}=await import('../lib/jevbench-cohort-merge.mjs');
 const {jevbenchScopeArtifact,jevScopeClassifier}=await import('../lib/jevbench-scope.mjs');
 const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await import('../lib/jevbench-jev-class.mjs');
 const {readJevbenchV157Release}=await import('../lib/jevbench-v15-release.mjs');
 const historical=await readJevbenchV157Release();
 const isApi=jevScopeClassifier(b.artifact.systems,b.carry.rows,historical.artifact.systems,historical.artifact.not_measured);
 const f=JSON.parse(await readFile('test/fixtures/jevbench-v1713-ranks.json'));
 const arts={all:jevLiveAllArtifact(b.artifact,isApi),open:jevbenchScopeArtifact(b.artifact,'open',isApi),api:jevbenchScopeArtifact(b.artifact,'api',isApi)};
 for(const [scope,a] of Object.entries(arts)){
  const rows=a.systems.filter(s=>s.ranked);
  assert.deepEqual(Object.fromEntries(rows.map(s=>[s.key,[s.rank,s.ranks.A,s.ranks.B,s.ranks.C,s.ranks.capability]])),f.views[scope].ranks);
  for(const m of ['A','B','C'])assert.deepEqual(a.board[m].order,f.views[scope].composite[m]);
  for(const [label,opts]of [['official_caps',{}],['no_caps',{costFactor:Infinity,latencyFactor:Infinity}],['cost_off_latency_2x',{costFactor:Infinity}],['latency_none',{latencyFactor:Infinity}]])assert.deepEqual(jevClassRows(rows,{...JEV_V16_CLASS_OPTIONS,...opts}).rows.filter(r=>r.inClass).map(r=>r.row.key),f.views[scope].capability[label]);
 }
});
