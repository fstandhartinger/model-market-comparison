import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateJevbenchV1713Bundle,readJevbenchV1713ForBoard,readOptionalJevbenchV1713Release,V1713_NEW_KEYS,V1713_NEW_DRAW} from '../lib/jevbench-v1713-release.mjs';
import {readOptionalJevbenchV1712Release} from '../lib/jevbench-v1712-release.mjs';
import {readDrawEquating,readCohortRows} from '../lib/jevbench-cohort-merge.mjs';
import {readChainLatestRelease} from '../lib/jevbench-live-board.mjs';
import {checkNewRowText,checkUnrankedRow,NOT_RANKED_BECAUSE} from '../r197/v1713/row_gates_v1713.mjs';
const base='data/raw/benchmarks/jevbench/v1.7/',load=async n=>JSON.parse(await readFile(`${base}jevbench-v1.7.13-${n}.json`));
const b={manifest:await load('publication'),artifact:await load('results'),categories:await load('categories'),carry:await load('carry'),proof:await load('proof'),previous:await readOptionalJevbenchV1712Release(),previousManifestSha256:createHash('sha256').update(await readFile(`${base}jevbench-v1.7.12-publication.json`)).digest('hex')};
const K='h2o-lightning-4b-v1.4.1';
// The new row is published UNRANKED (its draw has no anchor runs yet): the bundle validates as is, with no top-five change.
const B=b;
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k),mutate=(fn,pattern)=>{const x=structuredClone(B);fn(x);assert.throws(()=>validateJevbenchV1713Bundle(x,{candidate:true}),pattern)};
test('v1.7.13 validates every row; PENDING is hidden, PASS is readable',async()=>{
 assert.equal(validateJevbenchV1713Bundle(B,{candidate:true}),true);assert.equal(b.previous.artifact.systems.length,300);assert.equal(b.artifact.systems.length,301);
 assert.deepEqual(V1713_NEW_KEYS,[K]);
 if(b.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV1713ForBoard(),null);await assert.rejects(()=>readOptionalJevbenchV1713Release(),/review PENDING|FAIR/);}
 else {assert.equal(b.manifest.review.verdict,'PASS');assert.equal((await readJevbenchV1713ForBoard()).artifact.revision,'v1.7.13');}
});
test('v1.7.13 standing GO: no top-five change, fairness receipt (SUSPICIOUS) bound as evidence, paid public basis exact',()=>{
 const a=b.proof.publication_approval;
 assert.equal(a.status,'GO (standing; no top-five change; paid public order)');assert.equal(a.top_five_effect,'unchanged');assert.equal(a.paid_public.order,'54575fd5');assert.equal(a.paid_public.visibility,'public');
 assert.equal(a.fairness_check.verdict,'SUSPICIOUS');assert.equal(a.fairness_check.path,'workers/r197-v1713-fair/RESULT.json');assert.match(a.fairness_check.sha256,/^[0-9a-f]{64}$/);
 mutate(x=>{x.proof.publication_approval.top_five_effect='changed'},/top-five preview/);
 mutate(x=>{x.proof.publication_approval.fairness_check.verdict='PENDING'},/fairness receipt evidence/);mutate(x=>{x.proof.publication_approval.fairness_check.sha256=null},/fairness receipt evidence/);
 mutate(x=>{x.proof.publication_approval.paid_public.visibility='private'},/paid public/);mutate(x=>{x.proof.publication_approval.status='GO (paid public fast-lane order, automatic publication)'},/approval status/);
 mutate(x=>{x.proof.topfive_diff_sha256='d'.repeat(64)},/top-five preview/);
});
test('v1.7.13 rejects carried score, interval, category and lane changes, including the v1.1 row',()=>{
 for(const key of ['h2o-lightning-4b','iota-decide-4b-v0.3','singularity-super-decider']){
  mutate(x=>{row(x,key).axes.speed+=1},/carried row/);mutate(x=>{row(x,key).composite_ci95.A[0]+=1},/carried row/);mutate(x=>{row(x,key).disclosure=(row(x,key).disclosure??'')+' newer version measured'},/carried row/);
  mutate(x=>{x.categories.systems[key]={}},/carried cells/);mutate(x=>{x.categories.lanes[key]='api'},/carried lane/);
 }
});
test('v1.7.13 rejects roster, rank, new row, draw and provenance mutations',()=>{
 mutate(x=>x.artifact.systems.pop(),/roster/);mutate(x=>x.artifact.systems.push(x.artifact.systems[0]),/duplicate/);mutate(x=>x.artifact.board.A.order.reverse(),/order lists|rank|sort/);
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
test('v1.7.13 the new row is unranked: no rank, in no order list, every carried rank and order list unchanged',()=>{
 const s=row(b,K);checkUnrankedRow(s,b.artifact.board);
 assert.equal(s.ranked,false);assert.equal(s.rank,null);assert.equal(s.listing,'unranked');assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});assert.equal(s.not_ranked_because,NOT_RANKED_BECAUSE);
 assert.equal(b.proof.new_rows[K].treatment,'unranked');assert.deepEqual(b.proof.carried_rows_equal_except,[]);
 assert.deepEqual(b.artifact.board,b.previous.artifact.board);assert.equal(b.artifact.n_ranked,b.previous.artifact.n_ranked);
 for(const p of b.previous.artifact.systems)assert.deepEqual(row(b,p.key),p);
 for(const [fn,pattern] of [
  [x=>{const t=row(x,K);t.ranked=true;t.listing='ranked';t.rank=7;t.ranks={A:7,B:12,C:6,capability:50};x.artifact.n_ranked+=1},/unranked provisional row|counts|new self-hosted row/],
  [x=>{row(x,K).rank=1},/new self-hosted row|unranked/],[x=>{row(x,K).ranks.A=1},/new self-hosted row|ranks/],[x=>{row(x,K).listing='listed'},/new self-hosted row|unranked/],
  [x=>{x.artifact.board.A.order.splice(6,0,K)},/order lists|unranked row in order/],[x=>{x.artifact.board.capability.order.push(K)},/order lists|unranked row in order/],
  [x=>{const t=x.artifact.systems.find(s=>s.ranked&&s.rank===7);t.rank=8;t.ranks.A=8},/carried row/],
 ])mutate(fn,pattern);
 for(const fn of [t=>{t.ranked=true},t=>{t.rank=3},t=>{t.ranks={...t.ranks,B:2}},t=>{t.listing='ranked'},t=>{t.not_ranked_because='x'.repeat(80)}]){const t=structuredClone(s);fn(t);assert.throws(()=>checkUnrankedRow(t,b.artifact.board))}
 for(const m of ['A','B','C','capability']){const board=structuredClone(b.artifact.board);board[m].order.push(K);assert.throws(()=>checkUnrankedRow(s,board),/order list/)}
});
test('v1.7.13 new draw joins the equating table without touching the v1.6 chain v1.7.0 is bound to',async()=>{
 const t=await readDrawEquating();const d=t.draws.find(x=>x.draw===V1713_NEW_DRAW);
 // Later same-draw addenda (v1.7.14+) append to releases; the draw was first released in v1.7.13 and its latest release is the newest entry.
 assert.equal(d.releases[0],'v1.7.13');assert.equal(d.latest_release,d.releases.at(-1));assert.ok(d.releases.every(r=>/^v1\.7\.\d+$/.test(r)));
 assert.deepEqual({...d,releases:undefined,latest_release:undefined},{draw:V1713_NEW_DRAW,label:'Third regular draw',drawn_on:'2026-10-27',releases:undefined,latest_release:undefined,status:'anchor-runs-pending',offset:{I:0,C:0},offset_ci95:null,anchors:[],joins_via:'v1.7-addendum'});
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
