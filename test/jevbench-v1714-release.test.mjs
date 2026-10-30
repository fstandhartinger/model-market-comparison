import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateJevbenchV1714Bundle,readJevbenchV1714ForBoard,readOptionalJevbenchV1714Release,V1714_NEW_KEYS,V1714_DRAW,V1714_TEXT_FIXED} from '../lib/jevbench-v1714-release.mjs';
import {readDrawEquating,readCohortRows} from '../lib/jevbench-cohort-merge.mjs';
import {readChainLatestRelease} from '../lib/jevbench-live-board.mjs';
import {checkNewRowText,checkUnrankedRow,NOT_RANKED_BECAUSE} from '../r197/v1714/row_gates_v1714.mjs';
import {readV1713ForV1714} from '../r197/v1714/prev_v1714.mjs';
const base='data/raw/benchmarks/jevbench/v1.7/',load=async n=>JSON.parse(await readFile(`${base}jevbench-v1.7.14-${n}.json`));
const b={manifest:await load('publication'),artifact:await load('results'),categories:await load('categories'),carry:await load('carry'),proof:await load('proof'),previous:await readV1713ForV1714(),previousManifestSha256:createHash('sha256').update(await readFile(`${base}jevbench-v1.7.13-publication.json`)).digest('hex')};
const KEYS=['arcbright-elf-1-12b-r2','decisio-gemma-4-12b-tuned-commit-think','jeff_1_1_large','jeff_1_1_qwen_4b','torchcast-decision-31b-v1.0'],PAID='torchcast-decision-31b-v1.0',H2O='h2o-lightning-4b-v1.4.1';
const DOPEST='dopest-1.0-31b',DOPEST_FIELDS=['code_revision','disclosure','licence'];
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k),mutate=(fn,pattern)=>{const x=structuredClone(b);fn(x);assert.throws(()=>validateJevbenchV1714Bundle(x,{candidate:true}),pattern)};
test('v1.7.14 validates every row; PENDING is hidden, PASS is readable',async()=>{
 assert.equal(validateJevbenchV1714Bundle(b,{candidate:true}),true);assert.equal(b.previous.artifact.systems.length,301);assert.equal(b.artifact.systems.length,306);
 assert.deepEqual(V1714_NEW_KEYS,KEYS);
 if(b.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV1714ForBoard(),null);if(b.previous.manifest.review.verdict==='PASS')await assert.rejects(()=>readOptionalJevbenchV1714Release(),/review PENDING/);}
 else {assert.equal(b.manifest.review.verdict,'PASS');assert.equal(b.previous.manifest.review.verdict,'PASS');assert.equal((await readJevbenchV1714ForBoard()).artifact.revision,'v1.7.14');}
});
test('v1.7.14 is bound to the current v1.7.13 manifest bytes and refuses a stale binding',()=>{
 assert.deepEqual(b.manifest.predecessor,{revision:'v1.7.13',publication_sha256:b.previousManifestSha256});assert.deepEqual(b.proof.predecessor,b.manifest.predecessor);
 mutate(x=>{x.manifest.predecessor.publication_sha256='b'.repeat(64)},/predecessor/);
 assert.throws(()=>validateJevbenchV1714Bundle({...structuredClone(b),previousManifestSha256:'c'.repeat(64)},{candidate:true}),/predecessor/);
 mutate(x=>{x.previous.artifact.revision='v1.7.12'},/validated predecessor/);
});
test('v1.7.14 standing GO: no top-five change, unranked basis and paid public basis exact',()=>{
 const a=b.proof.publication_approval;
 assert.equal(a.status,'GO (standing; no top-five change; paid public order for Torchcast)');assert.equal(a.top_five_effect,'unchanged');assert.equal(a.fresh_baseline,'v1.7.13');
 assert.equal(a.paid_public.key,PAID);assert.equal(a.paid_public.order,'69f7a75d');assert.equal(a.paid_public.visibility,'public');assert.equal(a.unranked_basis.decision,'v1713-h2o141-unranked-provisional');
 mutate(x=>{x.proof.publication_approval.top_five_effect='changed'},/top-five preview/);mutate(x=>{x.proof.topfive_diff_sha256='d'.repeat(64)},/top-five preview/);
 mutate(x=>{x.proof.publication_approval.paid_public.visibility='private'},/paid public/);mutate(x=>{x.proof.publication_approval.paid_public.key=H2O},/paid public/);
 mutate(x=>{x.proof.publication_approval.status='GO (standing; no top-five change; paid public order)'},/approval status/);mutate(x=>{delete x.proof.publication_approval.unranked_basis},/unranked basis/);
});
test('v1.7.14 rejects carried score, interval, category and lane changes, including the v1.7.13 row and the family rows',()=>{
 for(const key of [H2O,'h2o-lightning-4b','arcbright-elf-1-12b','decisio-gemma-4-12b-tuned-commit','jeff_1_1_medium','torchcast-decision-4b-v1.3']){
  mutate(x=>{row(x,key).axes.speed+=1},/carried row/);mutate(x=>{row(x,key).composite_ci95.A[0]+=1},/carried row/);mutate(x=>{row(x,key).disclosure=(row(x,key).disclosure??'')+' newer version measured'},/carried row/);
  mutate(x=>{x.categories.systems[key]={}},/carried cells/);mutate(x=>{x.categories.lanes[key]='api'},/carried lane/);
 }
});
test('v1.7.14 corrects only the DOPEST 1.0 31B text fields (repository public throughout); its numbers and cells stay equal',()=>{
 assert.deepEqual(Object.keys(V1714_TEXT_FIXED),[DOPEST]);assert.deepEqual(Object.keys(V1714_TEXT_FIXED[DOPEST]).sort(),DOPEST_FIELDS);assert.deepEqual(b.artifact.addendum.text_fixed_keys,[DOPEST]);
 const d=row(b,DOPEST),p=b.previous.artifact.systems.find(s=>s.key===DOPEST);
 for(const f of DOPEST_FIELDS){assert.notEqual(d[f],p[f]);assert.doesNotMatch(d[f],/became private|went private|private since|repository private|HTTP 401/i)}
 assert.match(d.code_revision,/serving code is public on GitHub \(DOPEST-studio\/dopest-model, created 24 Oct 2026\); an earlier version of this note said the repository had become private, which was our error; the measured vendored bytes remain pinned above\./);
 assert.match(d.licence,/author serving code public on GitHub at the pin \(no serving code redistributed here\)$/);
 assert.match(b.artifact.source_note,/Corrected the DOPEST 1\.0 31B notes: its serving-code repository has been public throughout\.$/);
 mutate(x=>{row(x,DOPEST).axes.speed+=1},/carried row/);mutate(x=>{row(x,DOPEST).rank=(row(x,DOPEST).rank??0)+1},/carried row/);mutate(x=>{row(x,DOPEST).author+=' x'},/carried row/);
 mutate(x=>{row(x,DOPEST).licence+=' x'},/text correction pin/);mutate(x=>{row(x,DOPEST).code_revision=b.previous.artifact.systems.find(s=>s.key===DOPEST).code_revision},/text correction pin/);
 mutate(x=>{x.categories.systems[DOPEST]={}},/carried cells/);mutate(x=>{x.proof.carried_rows_equal_except=[]},/carry exception/);mutate(x=>{x.proof.exceptions={}},/text correction proof/);
});
test('v1.7.14 rejects roster, rank, new row, draw and provenance mutations',()=>{
 mutate(x=>x.artifact.systems.pop(),/roster/);mutate(x=>x.artifact.systems.push(x.artifact.systems[0]),/duplicate/);mutate(x=>x.artifact.board.A.order.reverse(),/order lists|rank|sort/);
 for(const K of KEYS){
  mutate(x=>{row(x,K).axes.cost+=1},/new self-hosted row/);mutate(x=>{x.proof.new_rows[K].raw_sha256='bad'},/source pins/);
  mutate(x=>{x.proof.new_rows[K].category_pool_bounds.languages.en=1},/category pool bounds/);
  mutate(x=>{x.categories.systems[K]={...x.categories.systems[K],topics:{x:{n:20,competence:1}}}},/topics/);
  mutate(x=>{x.proof.new_rows[K].price_reference.in+=0.01},/base price/);mutate(x=>{x.proof.new_rows[K].cost.priced_input_tokens+=1},/priced-input cost/);
 }
 mutate(x=>{x.proof.pricing_module_sha256='a'.repeat(64)},/pricing pin/);mutate(x=>{x.proof.scorers.score_v16='0'.repeat(64)},/scorer pins/);
});
test('v1.7.14 pin, template, public-text and cost-kind gates reject negatives',()=>{
 for(const K of KEYS){
  const s=row(b,K);checkNewRowText(s);
  for(const [field,value,pattern] of [['model_pin',s.model_pin.replace(/@.*/,'@193ad740925b176a3b70a5a13a7cff2f2fadd01e'),/model pin/],['disclosure','bad {REF}',/template/],['disclosure','Florian board #12345',/internal/],['disclosure','ranked #1',/internal/],['endpoint_condition','lead-verified',/internal/],['disclosure','order 69f7a75d',/internal/],['disclosure','per DECISIONS rule',/internal/],['disclosure','custody admitted',/internal/],['author',s.author+' (paid fast-lane order 69f7a75d)',/internal|author/],['display',s.display+' (x)',/display/]]){const t=structuredClone(s);t[field]=value;assert.throws(()=>checkNewRowText(t),pattern)}
  for(const [patch,pattern] of [[c=>{c.kind='measured'},/cost kind/],[c=>{c.basis=c.basis.replace(/ at USD \d\.\d\d\//,' at USD 9.99/')},/cost reference/],[c=>{c.basis=c.basis.replace('over all 1,500 items','over 1,495 items')},/cost reference|token/]]){const t=structuredClone(s);patch(t.cost);assert.throws(()=>checkNewRowText(t),pattern)}
 }
});
test('v1.7.14 exact new scores, cost, coverage, draw and disclosures',()=>{
 const want={
  'torchcast-decision-31b-v1.0':[91.8213,88.3591,95.2834,87.2614,52.3633,76.3801,78.5088,76.3801,0.03871608],
  'arcbright-elf-1-12b-r2':[79.8588,66.7953,92.9223,92.5286,60.6402,75.4276,73.5272,75.4276,0.0205113333],
  'jeff_1_1_qwen_4b':[79.6351,68.1696,91.1006,78.371,61.2609,73.0866,72.0473,73.0866,0.01955702],
  'decisio-gemma-4-12b-tuned-commit-think':[78.6529,68.6215,88.6843,90.6052,56.1072,73.1147,72.1696,73.1147,0.0290464667],
  'jeff_1_1_large':[88.2223,84.4898,91.9548,72.1975,51.2527,71.3359,73.6285,71.3359,0.0421610333]};
 for(const [K,w] of Object.entries(want)){
  const s=row(b,K),a=s.axes;
  assert.deepEqual([s.capability,a.intelligence,a.calibration,a.speed,a.cost,s.scores.A,s.scores.B,s.scores.C].map(x=>+x.toFixed(4)),w.slice(0,8),K);
  assert.ok(Math.abs(s.cost.usd_per_1000-w[8])<1e-9,K);assert.equal(s.cost.kind,'estimate');assert.equal(s.cost.common_basis,null);
  assert.equal(s.status.rows,1500);assert.equal(s.status.answered_ok,1500);assert.equal(s.decision_limit.n_over_limit,0);
  assert.equal(s.draw.id,V1714_DRAW);assert.deepEqual(s.draw.offset,{C:0,I:0});assert.equal(s.draw.status,row(b,H2O).draw.status);assert.equal(s.draw.release,'v1.7.14');assert.equal(s.v16.g_med_used,2.573387642438244);
  assert.equal(s.paid_fast_lane,K===PAID);assert.match(s.endpoint_condition,/RTX PRO 6000/);assert.match(s.disclosure,/27 Oct 2026 regular draw/);
  assert.deepEqual(b.proof.new_rows[K].equated.offset,{C:0,I:0});assert.equal(b.proof.new_rows[K].cost.basis_items,1500);
 }
 assert.match(row(b,PAID).disclosure,/noul_floor 0\.801/);assert.equal(row(b,PAID).display,'Torchcast Decision 31B v1.0');
 assert.equal(b.proof.new_rows['decisio-gemma-4-12b-tuned-commit-think'].cost.priced_input_tokens,844031);assert.match(row(b,'decisio-gemma-4-12b-tuned-commit-think').cost.basis,/504,719/);
});
test('v1.7.14 the new rows are unranked: no rank, in no order list, every carried rank and order list unchanged',()=>{
 assert.deepEqual(b.artifact.board,b.previous.artifact.board);assert.equal(b.artifact.n_ranked,b.previous.artifact.n_ranked);assert.deepEqual(b.proof.carried_rows_equal_except,[DOPEST+': code_revision, disclosure, licence (text correction; numbers, ranks and cells unchanged)']);
 for(const p of b.previous.artifact.systems){if(p.key!==DOPEST){assert.deepEqual(row(b,p.key),p);continue}const a={...row(b,p.key)},o={...p};for(const f of DOPEST_FIELDS){delete a[f];delete o[f]}assert.deepEqual(a,o)}
 for(const K of KEYS){
  const s=row(b,K);checkUnrankedRow(s,b.artifact.board);
  assert.equal(s.ranked,false);assert.equal(s.rank,null);assert.equal(s.listing,'unranked');assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});assert.equal(s.not_ranked_because,NOT_RANKED_BECAUSE);
  assert.doesNotMatch(s.not_ranked_because,/H2O-Lightning-4B v1\.1/);assert.equal(b.proof.new_rows[K].treatment,'unranked');
  for(const [fn,pattern] of [
   [x=>{const t=row(x,K);t.ranked=true;t.listing='ranked';t.rank=7;t.ranks={A:7,B:12,C:6,capability:50};x.artifact.n_ranked+=1},/unranked provisional row|counts|new self-hosted row/],
   [x=>{row(x,K).rank=1},/new self-hosted row|unranked/],[x=>{row(x,K).ranks.A=1},/new self-hosted row|ranks/],[x=>{row(x,K).listing='listed'},/new self-hosted row|unranked/],
   [x=>{x.artifact.board.A.order.splice(6,0,K)},/order lists|unranked row in order/],[x=>{x.artifact.board.capability.order.push(K)},/order lists|unranked row in order/],
  ])mutate(fn,pattern);
  for(const fn of [t=>{t.ranked=true},t=>{t.rank=3},t=>{t.ranks={...t.ranks,B:2}},t=>{t.listing='ranked'},t=>{t.not_ranked_because='x'.repeat(80)}]){const t=structuredClone(s);fn(t);assert.throws(()=>checkUnrankedRow(t,b.artifact.board))}
  for(const m of ['A','B','C','capability']){const board=structuredClone(b.artifact.board);board[m].order.push(K);assert.throws(()=>checkUnrankedRow(s,board),/order list/)}
 }
 mutate(x=>{const t=x.artifact.systems.find(s=>s.ranked&&s.rank===7);t.rank=8;t.ranks.A=8},/carried row/);
});
test('v1.7.14 extends the 27 Oct draw entry without touching the v1.6 chain v1.7.0 is bound to',async()=>{
 const t=await readDrawEquating();const d=t.draws.find(x=>x.draw===V1714_DRAW);
 // Later same-draw addenda (v1.7.15+) append to releases; the first two releases stay v1.7.13 and v1.7.14 and the latest release is the newest entry.
 assert.deepEqual(d.releases.slice(0,2),['v1.7.13','v1.7.14']);assert.equal(d.latest_release,d.releases.at(-1));assert.ok(d.releases.every(r=>/^v1\.(?:7|8)\.\d+$/.test(r)));
 assert.deepEqual({...d,releases:undefined,latest_release:undefined},{draw:V1714_DRAW,label:'Third regular draw',drawn_on:'2026-10-27',releases:undefined,latest_release:undefined,status:'anchor-runs-pending',offset:{I:0,C:0},offset_ci95:null,anchors:[],joins_via:'v1.7-addendum'});
 assert.equal(await readChainLatestRelease('v1.6.1'),'v1.6.43');
 const cohort=await readCohortRows(process.cwd(),()=>{});assert.ok(!cohort.rows.some(r=>r.draw.id===V1714_DRAW));
});
test('v1.7.14 synthetic board ranks and official cap lists match the recorded assembly',async()=>{
 const {jevLiveAllArtifact}=await import('../lib/jevbench-cohort-merge.mjs');
 const {jevbenchScopeArtifact,jevScopeClassifier}=await import('../lib/jevbench-scope.mjs');
 const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await import('../lib/jevbench-jev-class.mjs');
 const {readJevbenchV157Release}=await import('../lib/jevbench-v15-release.mjs');
 const historical=await readJevbenchV157Release();
 const isApi=jevScopeClassifier(b.artifact.systems,b.carry.rows,historical.artifact.systems,historical.artifact.not_measured);
 const f=JSON.parse(await readFile('test/fixtures/jevbench-v1714-ranks.json'));
 const arts={all:jevLiveAllArtifact(b.artifact,isApi),open:jevbenchScopeArtifact(b.artifact,'open',isApi),api:jevbenchScopeArtifact(b.artifact,'api',isApi)};
 for(const [scope,a] of Object.entries(arts)){
  const rows=a.systems.filter(s=>s.ranked);
  assert.ok(!rows.some(s=>KEYS.includes(s.key)));
  assert.deepEqual(Object.fromEntries(rows.map(s=>[s.key,[s.rank,s.ranks.A,s.ranks.B,s.ranks.C,s.ranks.capability]])),f.views[scope].ranks);
  for(const m of ['A','B','C'])assert.deepEqual(a.board[m].order,f.views[scope].composite[m]);
  for(const [label,opts]of [['official_caps',{}],['no_caps',{costFactor:Infinity,latencyFactor:Infinity}],['cost_off_latency_2x',{costFactor:Infinity}],['latency_none',{latencyFactor:Infinity}]])assert.deepEqual(jevClassRows(rows,{...JEV_V16_CLASS_OPTIONS,...opts}).rows.filter(r=>r.inClass).map(r=>r.row.key),f.views[scope].capability[label]);
 }
 // The v1.7.14 fixture equals the v1.7.13 one: no ranked row changes.
 const f13=JSON.parse(await readFile('test/fixtures/jevbench-v1713-ranks.json'));assert.deepEqual(f.views,f13.views);
});
