import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateJevbenchV1715Bundle,readJevbenchV1715ForBoard,readOptionalJevbenchV1715Release,V1715_NEW_KEYS,V1715_DRAW_KEYS,V1715_DRAW,V1715_TEXT_FIXED,V1715_NOT_RANKED_BECAUSE,V1715_H2O_EXTRA} from '../lib/jevbench-v1715-release.mjs';
import {readDrawEquating,readCohortRows} from '../lib/jevbench-cohort-merge.mjs';
import {readChainLatestRelease} from '../lib/jevbench-live-board.mjs';
import {checkNewRowText,checkUnrankedRow,noteFor} from '../r197/v1715u/row_gates_v1715.mjs';
import {readV1714ForV1715} from '../r197/v1715u/prev_v1715.mjs';
const base='data/raw/benchmarks/jevbench/v1.7/',load=async n=>JSON.parse(await readFile(`${base}jevbench-v1.7.15-${n}.json`));
const b={manifest:await load('publication'),artifact:await load('results'),categories:await load('categories'),carry:await load('carry'),proof:await load('proof'),previous:await readV1714ForV1715(),previousManifestSha256:createHash('sha256').update(await readFile(`${base}jevbench-v1.7.14-publication.json`)).digest('hex')};
const MSFT='microsoft-decision-1-r2',H2O='h2o-lightning-4b-v1.4.1',DRAW_ROWS=['arcbright-elf-1-12b-r2','decisio-gemma-4-12b-tuned-commit-think',H2O,'jeff_1_1_large','jeff_1_1_qwen_4b','torchcast-decision-31b-v1.0'];
const KEYS=[...DRAW_ROWS,MSFT].sort();
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k),prev=k=>b.previous.artifact.systems.find(s=>s.key===k),mutate=(fn,pattern)=>{const x=structuredClone(b);fn(x);assert.throws(()=>validateJevbenchV1715Bundle(x,{candidate:true}),pattern)};
test('v1.7.15 validates every row; PENDING is hidden, PASS is readable',async()=>{
 assert.equal(validateJevbenchV1715Bundle(b,{candidate:true}),true);assert.equal(b.previous.artifact.systems.length,306);assert.equal(b.artifact.systems.length,307);
 assert.deepEqual(V1715_NEW_KEYS,[MSFT]);assert.deepEqual(V1715_DRAW_KEYS,DRAW_ROWS);assert.equal(b.previous.manifest.review.verdict,'PASS');
 if(b.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV1715ForBoard(),null);await assert.rejects(()=>readOptionalJevbenchV1715Release(),/review PENDING/);}
 else {assert.equal(b.manifest.review.verdict,'PASS');assert.equal((await readJevbenchV1715ForBoard()).artifact.revision,'v1.7.15');}
});
test('v1.7.15 is bound to the PASS v1.7.14 manifest bytes and refuses a stale binding',()=>{
 assert.deepEqual(b.manifest.predecessor,{revision:'v1.7.14',publication_sha256:b.previousManifestSha256});assert.deepEqual(b.proof.predecessor,b.manifest.predecessor);
 mutate(x=>{x.manifest.predecessor.publication_sha256='b'.repeat(64)},/predecessor/);
 assert.throws(()=>validateJevbenchV1715Bundle({...structuredClone(b),previousManifestSha256:'c'.repeat(64)},{candidate:true}),/predecessor/);
 mutate(x=>{x.previous.artifact.revision='v1.7.13'},/validated predecessor/);
});
test('v1.7.15 standing GO: no top-five change, unranked basis, cost basis and paid public basis exact',()=>{
 const a=b.proof.publication_approval;
 assert.equal(a.status,'GO (standing; no top-five change; paid public order)');assert.equal(a.top_five_effect,'unchanged');assert.equal(a.fresh_baseline,'v1.7.14');
 assert.equal(a.paid_public.key,MSFT);assert.equal(a.paid_public.order,'d2b677de');assert.equal(a.paid_public.visibility,'public');
 assert.equal(a.unranked_basis.decision,'d1027-strong-anchors-needed');assert.equal(a.cost_basis.decision,'msft-r2-cost-basis-tariff');assert.equal(a.fairness_check,undefined);assert.equal(b.proof.equating,undefined);
 mutate(x=>{x.proof.publication_approval.top_five_effect='changed'},/top-five preview/);mutate(x=>{x.proof.topfive_diff_sha256='d'.repeat(64)},/top-five preview/);
 mutate(x=>{x.proof.publication_approval.paid_public.visibility='private'},/paid public/);mutate(x=>{x.proof.publication_approval.paid_public.key=H2O},/paid public/);
 mutate(x=>{x.proof.publication_approval.status='GO (standing; no top-five change; paid public order for Torchcast)'},/approval status/);mutate(x=>{delete x.proof.publication_approval.unranked_basis},/unranked basis/);
 mutate(x=>{x.proof.publication_approval.cost_basis.decision='none'},/unranked basis/);mutate(x=>{x.proof.equating={offset:{I:-1.16,C:-0.69}}},/draw not equated/);
});
test('v1.7.15 rejects carried score, interval, category and lane changes, including the family and round-1 Microsoft rows',()=>{
 for(const key of ['microsoft-decision-1','h2o-lightning-4b','arcbright-elf-1-12b','decisio-gemma-4-12b-tuned-commit','jeff_1_1_medium','torchcast-decision-4b-v1.3',...DRAW_ROWS]){
  mutate(x=>{row(x,key).axes.speed+=1},/carried row/);mutate(x=>{row(x,key).composite_ci95.A[0]+=1},/carried row/);mutate(x=>{row(x,key).disclosure=(row(x,key).disclosure??'')+' newer version measured'},/carried row/);
  mutate(x=>{x.categories.systems[key]={}},/carried cells/);mutate(x=>{x.categories.lanes[key]='gpu-x'},/carried lane/);
 }
});
test('v1.7.15 replaces only the not_ranked_because note of the six carried draw rows (H2O keeps its v1.1 sentence)',()=>{
 assert.deepEqual(Object.keys(V1715_TEXT_FIXED).sort(),DRAW_ROWS);assert.deepEqual(b.artifact.addendum.text_fixed_keys,DRAW_ROWS);
 for(const k of DRAW_ROWS){
  assert.deepEqual(Object.keys(V1715_TEXT_FIXED[k]),['not_ranked_because']);
  const now=row(b,k),p=prev(k);assert.notEqual(now.not_ranked_because,p.not_ranked_because);
  assert.equal(now.not_ranked_because,V1715_NOT_RANKED_BECAUSE+(k===H2O?' '+V1715_H2O_EXTRA:''));assert.equal(now.not_ranked_because,noteFor(k));
  assert.deepEqual({...now,not_ranked_because:undefined},{...p,not_ranked_because:undefined});
  assert.match(now.disclosure,/This draw has no subject-topic labels yet, so the row has no topic cells/);
  assert.doesNotMatch(now.not_ranked_because,/72% multilingual|until the draw is equated/);
  mutate(x=>{row(x,k).not_ranked_because=p.not_ranked_because},/note pin|public note/);mutate(x=>{row(x,k).rank=3},/carried row|draw row/);
 }
 assert.match(row(b,H2O).not_ranked_because,/On the 300 public items every draw shares, this version scores 57\.2 Intelligence vs 61\.1 for H2O-Lightning-4B v1\.1\.$/);
 assert.doesNotMatch(row(b,'jeff_1_1_large').not_ranked_because,/H2O-Lightning-4B/);
 mutate(x=>{row(x,H2O).not_ranked_because=V1715_NOT_RANKED_BECAUSE},/note pin|public note/);
 mutate(x=>{x.proof.carried_rows_equal_except=[]},/carry exception/);mutate(x=>{x.proof.exceptions={}},/note change proof/);
});
test('v1.7.15 Microsoft-Decision-1 round 2: exact published values, 1,493 items, tariff, own row; round 1 unchanged',()=>{
 const s=row(b,MSFT),a=s.axes;checkNewRowText(s);
 assert.deepEqual([s.capability,a.intelligence,a.calibration,a.speed,a.cost,s.scores.A,s.scores.B,s.scores.C].map(x=>+x.toFixed(4)),[79.8052,67.1103,92.5002,89.3438,66.4442,76.9903,74.7882,76.9903]);
 assert.equal(s.display,'Microsoft-Decision-1 (updated weights, Oct 2026)');assert.equal(s.endpoint_kind,'api');assert.equal(s.status.rows,1493);assert.equal(s.status.answered_ok,1489);
 assert.equal(s.cost.kind,'tariff');assert.ok(Math.abs(s.cost.usd_per_1000-1000*467021*0.042/1e6/1493)<1e-12);assert.equal(s.paid_fast_lane,true);assert.equal(s.draw.release,'v1.7.15');
 assert.deepEqual(s.draw.offset,{C:0,I:0});assert.equal(s.draw.status,'anchor-runs-pending');assert.equal(s.published_scores,undefined);assert.equal(s.v16.equating_offset,null);
 assert.match(s.disclosure,/n = 1,493 of the draw's 1,500 items/);assert.match(s.endpoint_condition,/4 were refused by the server because the prompt exceeded its 32,768-token context limit/);
 assert.match(s.disclosure,/served model id \(microsoft-decision-1\) is identical to the first measurement/);assert.equal(b.categories.systems[MSFT].topics,undefined);
 assert.deepEqual(row(b,'microsoft-decision-1'),prev('microsoft-decision-1'));
 mutate(x=>{row(x,MSFT).cost.usd_per_1000=0.03143},/new row|tariff/);mutate(x=>{row(x,MSFT).axes.intelligence-=1.16},/new row/);
});
test('v1.7.15 every row of the draw is unranked: no rank, in no order list, every carried rank and order list unchanged',()=>{
 assert.deepEqual(b.artifact.board,b.previous.artifact.board);assert.equal(b.artifact.n_ranked,b.previous.artifact.n_ranked);
 for(const p of b.previous.artifact.systems){if(!DRAW_ROWS.includes(p.key))assert.deepEqual(row(b,p.key),p);}
 for(const K of KEYS){
  const s=row(b,K);checkUnrankedRow(s,b.artifact.board);
  assert.equal(s.ranked,false);assert.equal(s.rank,null);assert.equal(s.listing,'unranked');assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});assert.equal(s.not_ranked_because,noteFor(K));
  for(const [fn,pattern] of [
   [x=>{const t=row(x,K);t.ranked=true;t.listing='ranked';t.rank=7;t.ranks={A:7,B:12,C:6,capability:50};x.artifact.n_ranked+=1},/unranked provisional row|counts|new row|carried row|draw row/],
   [x=>{row(x,K).rank=1},/new row|unranked|carried row|draw row/],[x=>{row(x,K).listing='listed'},/new row|unranked|carried row|draw row/],
   [x=>{x.artifact.board.A.order.splice(6,0,K)},/order lists|unranked row in order/],[x=>{x.artifact.board.capability.order.push(K)},/order lists|unranked row in order/],
  ])mutate(fn,pattern);
  for(const fn of [t=>{t.ranked=true},t=>{t.rank=3},t=>{t.ranks={...t.ranks,B:2}},t=>{t.listing='ranked'},t=>{t.not_ranked_because='x'.repeat(80)},t=>{t.draw={...t.draw,status:'equated'}}]){const t=structuredClone(s);fn(t);assert.throws(()=>checkUnrankedRow(t,b.artifact.board))}
  for(const m of ['A','B','C','capability']){const board=structuredClone(b.artifact.board);board[m].order.push(K);assert.throws(()=>checkUnrankedRow(s,board),/order list/)}
 }
 mutate(x=>{const t=x.artifact.systems.find(s=>s.ranked&&s.rank===7);t.rank=8;t.ranks.A=8},/carried row/);
});
test('v1.7.15 extends the 27 Oct draw entry (still not equated) without touching the v1.6 chain v1.7.0 is bound to',async()=>{
 const t=await readDrawEquating();const d=t.draws.find(x=>x.draw===V1715_DRAW);
 assert.deepEqual(d.releases.slice(0,3),['v1.7.13','v1.7.14','v1.7.15']);assert.equal(d.latest_release,d.releases.at(-1));
 assert.deepEqual({...d,releases:undefined,latest_release:undefined},{draw:V1715_DRAW,label:'Third regular draw',drawn_on:'2026-10-27',releases:undefined,latest_release:undefined,status:'anchor-runs-pending',offset:{I:0,C:0},offset_ci95:null,anchors:[],joins_via:'v1.7-addendum'});
 assert.equal(await readChainLatestRelease('v1.6.1'),'v1.6.43');
 const cohort=await readCohortRows(process.cwd(),()=>{});assert.ok(!cohort.rows.some(r=>r.draw.id===V1715_DRAW));
});
test('v1.7.15 synthetic board ranks and official cap lists match the recorded assembly',async()=>{
 const {jevLiveAllArtifact}=await import('../lib/jevbench-cohort-merge.mjs');
 const {jevbenchScopeArtifact,jevScopeClassifier}=await import('../lib/jevbench-scope.mjs');
 const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await import('../lib/jevbench-jev-class.mjs');
 const {readJevbenchV157Release}=await import('../lib/jevbench-v15-release.mjs');
 const historical=await readJevbenchV157Release();
 const isApi=jevScopeClassifier(b.artifact.systems,b.carry.rows,historical.artifact.systems,historical.artifact.not_measured);
 const f=JSON.parse(await readFile('test/fixtures/jevbench-v1715-ranks.json'));
 const arts={all:jevLiveAllArtifact(b.artifact,isApi),open:jevbenchScopeArtifact(b.artifact,'open',isApi),api:jevbenchScopeArtifact(b.artifact,'api',isApi)};
 for(const [scope,a] of Object.entries(arts)){
  const rows=a.systems.filter(s=>s.ranked);
  assert.ok(!rows.some(s=>KEYS.includes(s.key)));
  assert.deepEqual(Object.fromEntries(rows.map(s=>[s.key,[s.rank,s.ranks.A,s.ranks.B,s.ranks.C,s.ranks.capability]])),f.views[scope].ranks);
  for(const m of ['A','B','C'])assert.deepEqual(a.board[m].order,f.views[scope].composite[m]);
  for(const [label,opts]of [['official_caps',{}],['no_caps',{costFactor:Infinity,latencyFactor:Infinity}],['cost_off_latency_2x',{costFactor:Infinity}],['latency_none',{latencyFactor:Infinity}]])assert.deepEqual(jevClassRows(rows,{...JEV_V16_CLASS_OPTIONS,...opts}).rows.filter(r=>r.inClass).map(r=>r.row.key),f.views[scope].capability[label]);
 }
 // The v1.7.15 fixture equals the v1.7.14 one: no ranked row changes.
 const f14=JSON.parse(await readFile('test/fixtures/jevbench-v1714-ranks.json'));assert.deepEqual(f.views,f14.views);
});
