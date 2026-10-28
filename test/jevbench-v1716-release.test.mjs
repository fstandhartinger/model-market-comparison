import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateJevbenchV1716Bundle,readJevbenchV1716ForBoard,readOptionalJevbenchV1716Release,V1716_NEW_KEYS,V1716_DRAW_KEYS,V1716_DRAW,V1716_REPRICED,V1716_NOT_RANKED_BECAUSE,V1716_H2O_EXTRA} from '../lib/jevbench-v1716-release.mjs';
import {readDrawEquating,readCohortRows} from '../lib/jevbench-cohort-merge.mjs';
import {readChainLatestRelease} from '../lib/jevbench-live-board.mjs';
import {checkNewRowText,checkUnrankedRow,noteFor} from '../r197/v1716/row_gates_v1716.mjs';
import {readV1715ForV1716} from '../r197/v1716/prev_v1716.mjs';
const base='data/raw/benchmarks/jevbench/v1.7/',load=async n=>JSON.parse(await readFile(`${base}jevbench-v1.7.16-${n}.json`));
const b={manifest:await load('publication'),artifact:await load('results'),categories:await load('categories'),carry:await load('carry'),proof:await load('proof'),previous:await readV1715ForV1716(),previousManifestSha256:createHash('sha256').update(await readFile(`${base}jevbench-v1.7.15-publication.json`)).digest('hex')};
const ST='strike-1',MSFT='microsoft-decision-1-r2',H2O='h2o-lightning-4b-v1.4.1',DRAW_ROWS=['arcbright-elf-1-12b-r2','decisio-gemma-4-12b-tuned-commit-think',H2O,'jeff_1_1_large','jeff_1_1_qwen_4b',MSFT,'torchcast-decision-31b-v1.0'];
const KEYS=[...DRAW_ROWS,ST].sort();
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k),prev=k=>b.previous.artifact.systems.find(s=>s.key===k),mutate=(fn,pattern)=>{const x=structuredClone(b);fn(x);assert.throws(()=>validateJevbenchV1716Bundle(x,{candidate:true}),pattern)};
test('v1.7.16 validates every row; PENDING is hidden, PASS is readable',async()=>{
 assert.equal(validateJevbenchV1716Bundle(b,{candidate:true}),true);assert.equal(b.previous.artifact.systems.length,307);assert.equal(b.artifact.systems.length,308);
 assert.deepEqual(V1716_NEW_KEYS,[ST]);assert.deepEqual(V1716_DRAW_KEYS,DRAW_ROWS);assert.equal(b.previous.manifest.review.verdict,'PASS');
 if(b.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV1716ForBoard(),null);await assert.rejects(()=>readOptionalJevbenchV1716Release(),/review PENDING/);}
 else {assert.equal(b.manifest.review.verdict,'PASS');assert.equal((await readJevbenchV1716ForBoard()).artifact.revision,'v1.7.16');}
});
test('v1.7.16 is bound to the PASS v1.7.15 manifest bytes and refuses a stale binding',()=>{
 assert.deepEqual(b.manifest.predecessor,{revision:'v1.7.15',publication_sha256:b.previousManifestSha256});assert.deepEqual(b.proof.predecessor,b.manifest.predecessor);
 mutate(x=>{x.manifest.predecessor.publication_sha256='b'.repeat(64)},/predecessor/);
 assert.throws(()=>validateJevbenchV1716Bundle({...structuredClone(b),previousManifestSha256:'c'.repeat(64)},{candidate:true}),/predecessor/);
 mutate(x=>{x.previous.artifact.revision='v1.7.13'},/validated predecessor/);
});
test('v1.7.16 standing GO: no top-five change, unranked basis and same-items cost basis exact',()=>{
 const a=b.proof.publication_approval;
 assert.equal(a.status,'GO (standing; no top-five change)');assert.equal(a.top_five_effect,'unchanged');assert.equal(a.fresh_baseline,'v1.7.15');assert.equal(a.paid_public,undefined);
 assert.equal(a.unranked_basis.decision,'d1027-strong-anchors-needed');assert.equal(a.cost_basis.key,'v1.6-regular-20261027');assert.equal(a.fairness_check,undefined);assert.equal(b.proof.equating,undefined);
 mutate(x=>{x.proof.publication_approval.top_five_effect='changed'},/top-five preview/);mutate(x=>{x.proof.topfive_diff_sha256='d'.repeat(64)},/top-five preview/);
 mutate(x=>{x.proof.publication_approval.status='GO (standing; no top-five change; paid public order)'},/approval status/);mutate(x=>{delete x.proof.publication_approval.unranked_basis},/unranked/);
 mutate(x=>{x.proof.publication_approval.cost_basis.key='none'},/same-items basis/);mutate(x=>{x.proof.equating={offset:{I:-1.16,C:-0.69}}},/draw not equated/);
});
test('v1.7.16 rejects carried score, interval, category and lane changes, including the family and round-1 Microsoft rows',()=>{
 for(const key of ['microsoft-decision-1','h2o-lightning-4b','arcbright-elf-1-12b','decisio-gemma-4-12b-tuned-commit','jeff_1_1_medium','torchcast-decision-4b-v1.3',...DRAW_ROWS]){
  mutate(x=>{row(x,key).axes.speed+=1},/carried row|cost pin/);mutate(x=>{row(x,key).composite_ci95.A[0]+=1},/carried row|cost pin/);mutate(x=>{row(x,key).disclosure=(row(x,key).disclosure??'')+' newer version measured'},/carried row|cost pin/);
  mutate(x=>{x.categories.systems[key]={}},/carried cells/);mutate(x=>{x.categories.lanes[key]='gpu-x'},/carried lane/);
 }
});
test('v1.7.16 same-items cost rule: the seven carried draw rows change only cost fields, each pinned; set size and hash bound',()=>{
 assert.deepEqual(V1716_DRAW_KEYS,DRAW_ROWS);assert.deepEqual(b.artifact.addendum.repriced_keys,DRAW_ROWS);assert.deepEqual(b.artifact.addendum.text_fixed_keys,[]);
 assert.equal(b.proof.cost_basis.n_items,1489);assert.match(b.proof.cost_basis.set_sha256,/^4e912731[a-f0-9]{56}$/);assert.equal(b.proof.cost_basis.scorer_flag,'--cost-basis');
 assert.deepEqual(Object.keys(b.proof.cost_basis.per_row_membership).sort(),KEYS);
 const COST=['axes','composite_ci95','cost','jevbench_score','scores','v16','views'];
 for(const k of DRAW_ROWS){
  const now=row(b,k),p=prev(k);
  assert.deepEqual(Object.keys(V1716_REPRICED[k]).sort(),k===MSFT?[...COST,'disclosure'].sort():COST);
  const strip=r=>{const y=structuredClone(r);for(const f of COST)delete y[f];if(k===MSFT)delete y.disclosure;return y};assert.deepEqual(strip(now),strip(p));
  for(const f of ['intelligence','calibration','speed'])assert.equal(now.axes[f],p.axes[f]);
  assert.equal(now.capability,p.capability);assert.equal(now.not_ranked_because,noteFor(k));assert.notEqual(now.cost.usd_per_1000,p.cost.usd_per_1000);
  assert.deepEqual(now.cost.common_basis,{n_items:1489,rule:'common',usd_per_1000_all_items:p.cost.usd_per_1000});
  assert.ok(now.cost.basis.includes(`Cost on the 1,489 items every row on this draw answered (same-items rule); all-items cost USD ${p.cost.usd_per_1000.toFixed(6)} per 1,000 decisions.`));
  assert.match(now.disclosure,/This draw has no subject-topic labels yet, so the row has no topic cells/);
  mutate(x=>{row(x,k).cost.usd_per_1000=p.cost.usd_per_1000},/cost pin/);mutate(x=>{row(x,k).axes.intelligence+=0.1},/cost pin|axis unchanged/);mutate(x=>{row(x,k).rank=3},/carried row|draw row/);
  mutate(x=>{row(x,k).not_ranked_because=V1716_NOT_RANKED_BECAUSE+' x'},/carried row|public note/);
 }
 assert.match(row(b,MSFT).disclosure,/so every score and the speed are computed on those 1,493 items; the cost uses the 1,489 items every row on this draw answered \(same-items rule\)\./);
 mutate(x=>{x.proof.carried_rows_equal_except=[]},/carry exception/);mutate(x=>{x.proof.exceptions={}},/cost change proof/);
 mutate(x=>{x.proof.cost_basis.n_items=1500},/same-items set binding/);mutate(x=>{x.proof.cost_basis.set_sha256='e'.repeat(64)},/same-items set binding/);
});
test('v1.7.16 Strike-1: exact published values, 1,500 items with 5 over-limit refusals, estimate on the common set, own row',()=>{
 const s=row(b,ST),a=s.axes;checkNewRowText(s);
 assert.deepEqual([s.capability,a.intelligence,a.calibration,a.speed,a.cost,s.scores.A,s.scores.B,s.scores.C].map(x=>+x.toFixed(4)),[68.3532,45.3479,91.3585,83.2956,54.0596,51.8147,48.074,35.9824]);
 assert.equal(s.display,'Strike-1');assert.equal(s.endpoint_kind,'api');assert.equal(s.status.rows,1500);assert.equal(s.status.answered_ok,1495);
 assert.equal(s.cost.kind,'estimate');assert.ok(Math.abs(s.cost.usd_per_1000-1000*b.proof.new_rows[ST].cost.input_tokens_common*0.03/1e6/1489)<1e-12);assert.equal(b.proof.new_rows[ST].cost.output_tokens,0);
 assert.equal(s.paid_fast_lane,false);assert.equal(s.draw.release,'v1.7.16');
 assert.deepEqual(s.draw.offset,{C:0,I:0});assert.equal(s.draw.status,'anchor-runs-pending');assert.equal(s.published_scores,undefined);assert.equal(s.v16.equating_offset,null);
 assert.match(s.disclosure,/5 items over the provider's input limit were refused and are scored as misses/);assert.match(s.disclosure,/uncalibrated during beta/);assert.match(s.disclosure,/fine-tune of Qwen\/Qwen3\.5-4B/);
 assert.match(s.endpoint_condition,/OVH Gravelines/);assert.equal(b.categories.systems[ST].topics,undefined);
 assert.deepEqual(row(b,'microsoft-decision-1'),prev('microsoft-decision-1'));
 mutate(x=>{row(x,ST).cost.usd_per_1000=0.033853},/new row|estimate/);mutate(x=>{row(x,ST).axes.intelligence-=1.16},/new row/);mutate(x=>{row(x,ST).status.rows=1495},/new row|coverage/);
});
test('v1.7.16 every row of the draw is unranked: no rank, in no order list, every carried rank and order list unchanged',()=>{
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
test('v1.7.16 extends the 27 Oct draw entry (still not equated) without touching the v1.6 chain v1.7.0 is bound to',async()=>{
 const t=await readDrawEquating();const d=t.draws.find(x=>x.draw===V1716_DRAW);
 assert.deepEqual(d.releases.slice(0,4),['v1.7.13','v1.7.14','v1.7.15','v1.7.16']);assert.equal(d.latest_release,d.releases.at(-1));
 assert.deepEqual({...d,releases:undefined,latest_release:undefined},{draw:V1716_DRAW,label:'Third regular draw',drawn_on:'2026-10-27',releases:undefined,latest_release:undefined,status:'anchor-runs-pending',offset:{I:0,C:0},offset_ci95:null,anchors:[],joins_via:'v1.7-addendum'});
 assert.equal(await readChainLatestRelease('v1.6.1'),'v1.6.43');
 const cohort=await readCohortRows(process.cwd(),()=>{});assert.ok(!cohort.rows.some(r=>r.draw.id===V1716_DRAW));
});
test('v1.7.16 synthetic board ranks and official cap lists match the recorded assembly',async()=>{
 const {jevLiveAllArtifact}=await import('../lib/jevbench-cohort-merge.mjs');
 const {jevbenchScopeArtifact,jevScopeClassifier}=await import('../lib/jevbench-scope.mjs');
 const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await import('../lib/jevbench-jev-class.mjs');
 const {readJevbenchV157Release}=await import('../lib/jevbench-v15-release.mjs');
 const historical=await readJevbenchV157Release();
 const isApi=jevScopeClassifier(b.artifact.systems,b.carry.rows,historical.artifact.systems,historical.artifact.not_measured);
 const f=JSON.parse(await readFile('test/fixtures/jevbench-v1716-ranks.json'));
 const arts={all:jevLiveAllArtifact(b.artifact,isApi),open:jevbenchScopeArtifact(b.artifact,'open',isApi),api:jevbenchScopeArtifact(b.artifact,'api',isApi)};
 for(const [scope,a] of Object.entries(arts)){
  const rows=a.systems.filter(s=>s.ranked);
  assert.ok(!rows.some(s=>KEYS.includes(s.key)));
  assert.deepEqual(Object.fromEntries(rows.map(s=>[s.key,[s.rank,s.ranks.A,s.ranks.B,s.ranks.C,s.ranks.capability]])),f.views[scope].ranks);
  for(const m of ['A','B','C'])assert.deepEqual(a.board[m].order,f.views[scope].composite[m]);
  for(const [label,opts]of [['official_caps',{}],['no_caps',{costFactor:Infinity,latencyFactor:Infinity}],['cost_off_latency_2x',{costFactor:Infinity}],['latency_none',{latencyFactor:Infinity}]])assert.deepEqual(jevClassRows(rows,{...JEV_V16_CLASS_OPTIONS,...opts}).rows.filter(r=>r.inClass).map(r=>r.row.key),f.views[scope].capability[label]);
 }
 // The v1.7.16 fixture equals the v1.7.15 one: no ranked row changes.
 const f15=JSON.parse(await readFile('test/fixtures/jevbench-v1715-ranks.json'));assert.deepEqual(f.views,f15.views);
});
