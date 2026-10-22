import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readOptionalJevbenchV1636Release,validateJevbenchV1636Bundle} from '../lib/jevbench-v1636-release.mjs';
import {readOptionalJevbenchV1635Release} from '../lib/jevbench-v1635-release.mjs';
const r=await readOptionalJevbenchV1636Release(),previous=await readOptionalJevbenchV1635Release();
const LK='launchables-myles-g-31b',HY='hyland-hs1',AR='goddragon-arbiter-4b',DE='roudone-decider-4b',NEW=[AR,DE,HY,LK].sort();
const previousManifestSha256=createHash('sha256').update(await readFile('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.35-publication.json')).digest('hex');
const base={manifest:r.manifest,artifact:r.artifact,categories:r.categories,proof:r.proof,previous,previousManifestSha256};
const rejects=(edit,pattern)=>{const b=structuredClone(base);edit(b);assert.throws(()=>validateJevbenchV1636Bundle(b),pattern);};
const row=(b,k)=>b.artifact.systems.find(s=>s.key===k);
test('v1.6.36 adds exactly the four rows with the frozen draw and the common cost basis',()=>{
 assert.equal(r.artifact.systems.length,70);assert.equal(r.artifact.n_ranked,59);
 assert.deepEqual(r.artifact.systems.filter(s=>!previous.artifact.systems.some(p=>p.key===s.key)).map(s=>s.key).sort(),NEW);
 assert.deepEqual(r.artifact.v16.cost_basis,previous.artifact.v16.cost_basis);assert.equal(r.proof.cost_basis_sha256,previous.proof.cost_basis_sha256);assert.equal(r.artifact.G_med,9.839526770355711);
 for(const k of NEW){const s=r.artifact.systems.find(s=>s.key===k),n=r.proof.new_rows[k];
  assert.equal(s.cost.kind,'estimate');assert.equal(s.ranked,true);assert.equal(n.treatment,'ranked');assert.equal(n.under_cost_cap,true);assert.equal(n.ranked,true);assert.match(s.cost.basis,/ESTIMATE/);
  assert.equal(n.pricing_module_sha256,'1f4d1f7b1ce97ab27b938043444b9c2757e4a9dbecc799a803122588401f5bf1');assert.equal(r.proof.predecessor_pricing_module_sha256,'6202ef78a2c83cbffc9389cf1f37df70fe0c85ed03f4dd5c5f997f3d31aae13a');}
});
test('Myles-G 31B: vendor-hosted API on the base-model ESTIMATE, 15 truncated items scored as answered with the split disclosed',()=>{
 const s=row(base,LK),n=r.proof.new_rows[LK];
 assert.equal(s.endpoint_kind,'api');assert.equal(s.api_flag,true);assert.equal(s.paid_fast_lane,true);assert.equal(s.speed.adjustment,'none (API)');
 assert.equal(s.cost.usd_per_1000,0.0426199393939394);assert.deepEqual(n.price_per_million,{input:0.09,output:0.33999999999999997});
 assert.equal(n.input_tokens,907107);assert.equal(n.output_tokens,1500);assert.equal(n.answered_ok,1500);assert.equal(n.refused_http_422,0);assert.equal(n.truncated_long_items,15);assert.equal(n.context_cap_tokens,16384);
 assert.equal(n.truncated_input_tokens_min,12456);assert.equal(n.truncated_input_tokens_max,15166);assert.deepEqual(n.truncation_split.trunc,[4,15]);assert.deepEqual(n.truncation_split.rest,[1234,1485]);
 assert.equal(n.raw_sha256,'e03a68d867d56fb517eabcb936aca02bb51e0435f71f35f3f2ab88c60c232ae6');assert.equal(n.original_raw_sha256,n.raw_sha256);assert.equal(n.ar_scoring_copy_sha256,null);
 assert.equal(n.vendor_list_price_not_counted['usd_input_per_m_at_ecb_2026-10-20'],0.0066734);
 assert.match(s.cost.basis,/GBP 0\.005/);assert.match(s.cost.basis,/as for attest-31b-v1\.0/);assert.doesNotMatch(s.cost.basis,/fewer than 30 days|too young/);
 const note=r.artifact.measurement_notes.find(x=>x.startsWith(LK+': '));assert.match(note,/4 of 15 answers are correct/);assert.match(note,/1,234 of 1,485/);assert.match(note,/silently truncated/);
});
test('HS1: first occurrence per task id scored, original and scoring copy both recorded, customer tariff shown and not counted',()=>{
 const s=row(base,HY),n=r.proof.new_rows[HY];
 assert.equal(s.endpoint_kind,'api');assert.equal(s.paid_fast_lane,true);assert.equal(s.cost.usd_per_1000,0.04973636363636364);assert.deepEqual(n.price_per_million,{input:0.09,output:0.3});
 assert.equal(n.input_tokens,2012340);assert.equal(n.output_tokens,0);assert.equal(n.answered_ok,1500);assert.equal(n.refused_http_422,0);assert.equal(n.duplicate_rows_excluded,64);
 assert.equal(n.original_raw_sha256,'bc7a460b1c70bafda695f762e76dbbe1b526df38b2dde7ca6890e7152cea90f0');assert.equal(n.raw_sha256,'6db633804aa6059c05c75c7647377e3b8406a5b74754a94b5815c33e5626df20');assert.equal(n.ar_scoring_copy_sha256,n.raw_sha256);assert.ok(n.scoring_copy_receipt_sha256);
 assert.deepEqual(n.customer_tariff_not_counted,{usd_input_per_m:0.056,usd_output_per_m:0,status:'customer-stated, no public price page'});
 const note=r.artifact.measurement_notes.find(x=>x.startsWith(HY+': '));assert.match(note,/10,762 curated rows/);assert.match(note,/first answer per item is scored/);assert.match(note,/Original raw sha256 bc7a460b/);
});
test('Arbiter-4B and Decider-4B: author servers, 15 refusals scored wrong, same family disclosed, standing GO',()=>{
 for(const k of [AR,DE]){const s=row(base,k),n=r.proof.new_rows[k];
  assert.equal(s.endpoint_kind,'gpu');assert.equal(s.paid_fast_lane,false);assert.equal(s.cost.usd_per_1000,0.013387515151515154);assert.deepEqual(n.price_per_million,{input:0.030000000000000002,output:0.15});
  assert.equal(n.input_tokens,662682);assert.equal(n.output_tokens,0);assert.equal(n.answered_ok,1485);assert.equal(n.refused_http_422,15);assert.equal(n.refused_long_items,15);assert.equal(n.review_verdict,'PASS WITH FINDINGS');
  assert.match(s.cost.basis,/Qwen\/Qwen3\.5-4B/);assert.match(s.endpoint_condition,/A100/);const note=r.artifact.measurement_notes.find(x=>x.startsWith(k+': '));assert.match(note,/SAME FAMILY/);assert.match(note,/BASE:/);}
 assert.equal(r.proof.new_rows[AR].raw_sha256,'267b7759a397f5758f786dd33e9429617856ab97ad373b9ff857668c1a7b0c5b');assert.equal(r.proof.new_rows[DE].raw_sha256,'2248b5b19883ae1b6bd655d99f869194b2d2909735ca1350974f05aeeef5974a');
 assert.equal(r.proof.publication_approval.go.date,'2026-10-16');assert.equal(r.proof.publication_approval.top_five_preview,null);assert.equal(r.proof.publication_approval.button_tap,false);
});
test('all 65 carried point objects and A2 metadata remain exact',()=>{
 assert.equal(previous.artifact.systems.length,66);
 for(const p of previous.artifact.systems){const s=r.artifact.systems.find(s=>s.key===p.key);if(p.key==='microsoft-decision-1-a2-20261012'){assert.deepEqual(s,p);continue;}for(const f of ['axes','scores','cost','speed','intelligence','calibration','capability'])assert.deepEqual(s[f],p[f],p.key+'.'+f);}
 assert.equal(row(base,'seb-9b').supersedes_base_row,'v1.6.1');
});
test('v1.6.36 rejects altered usage, runtime, price, approval, disclosures and release gates',()=>{
 rejects(b=>{b.proof.new_rows[LK].input_tokens++},/usage/);
 rejects(b=>{b.proof.new_rows[LK].truncated_long_items=0},/runtime provenance/);
 rejects(b=>{b.proof.new_rows[HY].treatment='ranked_over_cap'},/new-row provenance/);
 rejects(b=>{b.proof.new_rows[HY].price_per_million={input:0.056,output:0}},/tariff/);
 rejects(b=>{row(b,LK).cost.usd_per_1000+=1e-9},/cost|registry/);
 rejects(b=>{b.proof.publication_approval.paid_fast_lane={date:'2026-09-29'}},/paid exception/);
 rejects(b=>{b.proof.publication_approval.top_five_effect=b.proof.publication_approval.top_five_effect==='none'?'changes-paid-only':'none'},/paid top-five effect/);
 rejects(b=>{b.proof.publication_approval.top_five_changed_by=[HY]},/paid causes/);
 rejects(b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith('Board effect')?n.replace('caused by: '+LK,'caused by: '+AR):n)},/STOP: a free-queue row changes a top five/);
 rejects(b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith(LK+': ')?n.replaceAll('TRUNCATION ON THE 15 LONGEST ITEMS','NOTE'):n)},/required disclosure/);
 rejects(b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith(HY+': ')?n.replaceAll('DUPLICATE REQUESTS, FIRST ANSWER SCORED','NOTE'):n)},/required disclosure/);
 rejects(b=>{b.proof.pricing_module_sha256=b.proof.predecessor_pricing_module_sha256},/pricing module pins/);
 rejects(b=>{b.manifest.review.verdict='PENDING'},/independent release review/);
 rejects(b=>{b.proof.predecessor_seal_sha256=null},/predecessor seal/);
 rejects(b=>{row(b,'kettei-fat').supersedes_base_row='v1.6.1'},/only Seb/);
 rejects(b=>{row(b,'kettei-fat').axes.intelligence++},/capability|carried|axes/);
});
test('v1.6.36 archived route keeps shared board, method and history',async()=>{
 const page=await readFile('app/jev-models/v1.6.36/page.tsx','utf8');assert.match(page,/readOptionalJevbenchV1636Release\(\)/);assert.match(page,/v1636BoardInput\(release\)/);assert.ok(page.indexOf('<JevBenchV16Board')<page.indexOf('data-bh-jev1636-method'));assert.ok(page.indexOf('data-bh-jev1636-method')<page.indexOf('<JevHistoryLazy'));
});
import { readCohortRows, jevWithCohortRows } from '../lib/jevbench-cohort-merge.mjs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { readJevbenchAgentFeed } from '../lib/jevbench-agent-feed.mjs';
test('live boards and the agent feed resolve each new row exactly once; Seb stays a single superseding row',async()=>{
 const {artifact}=await readCurrentJevbench();const m=jevWithCohortRows(artifact,await readCohortRows());
 for(const k of NEW){const rows=m.systems.filter(s=>s.key===k);assert.equal(rows.length,1,k);assert.equal(rows[0].ranked,true);assert.equal(rows[0].draw.id,'v1.6-regular-20261012');assert.equal(rows[0].draw.release,'v1.6.39');for(const b of Object.values(m.board))assert.equal(b.order.filter(x=>x===k).length,1,k);}
 assert.equal(m.systems.filter(s=>s.key==='seb-9b').length,1);
 const {feed}=await readJevbenchAgentFeed();for(const k of NEW)assert.equal(feed.systems.filter(s=>s.key===k).length,1,k);
});
