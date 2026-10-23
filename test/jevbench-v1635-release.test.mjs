import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readOptionalJevbenchV1635Release,validateJevbenchV1635Bundle} from '../lib/jevbench-v1635-release.mjs';
import {readOptionalJevbenchV1634Release} from '../lib/jevbench-v1634-release.mjs';
const r=await readOptionalJevbenchV1635Release(),previous=await readOptionalJevbenchV1634Release(),k='seb-9b';
const previousManifestSha256=createHash('sha256').update(await readFile('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.34-publication.json')).digest('hex');
const base={manifest:r.manifest,artifact:r.artifact,categories:r.categories,proof:r.proof,previous,previousManifestSha256};
const rejects=(edit,pattern)=>{const b=structuredClone(base);edit(b);assert.throws(()=>validateJevbenchV1635Bundle(b),pattern);};
test('v1.6.35 adds only Seb-9B with frozen draw and common cost basis',()=>{
 assert.equal(r.artifact.systems.length,66);assert.equal(r.artifact.n_ranked,55);
 assert.deepEqual(r.artifact.systems.filter(s=>!previous.artifact.systems.some(p=>p.key===s.key)).map(s=>s.key),[k]);
 assert.deepEqual(r.artifact.v16.cost_basis,previous.artifact.v16.cost_basis);assert.equal(r.proof.cost_basis_sha256,previous.proof.cost_basis_sha256);assert.equal(r.artifact.G_med,9.839526770355711);
 const s=r.artifact.systems.find(s=>s.key===k),n=r.proof.new_rows[k];
 assert.equal(s.cost.kind,'estimate');assert.equal(s.cost.usd_per_1000,0.050553636363636356);assert.equal(s.endpoint_kind,'gpu');assert.equal(s.paid_fast_lane,false);
 assert.equal(n.input_tokens,748494);assert.equal(n.output_tokens,1485);assert.equal(n.treatment,'ranked');assert.equal(n.under_cost_cap,true);
 assert.equal(n.answered_beyond_context_cap,0);assert.equal(n.truncated_long_items,0);assert.equal(n.context_cap_tokens,32768);assert.equal(n.native_probabilities,true);
 assert.equal(n.raw_sha256,'b3996413a3d83f25221f3ac3a7aa64984dbd13637fe15b3caebe518571082b15');
 assert.match(s.cost.basis,/ESTIMATE/);assert.match(s.cost.basis,/Qwen\/Qwen3.5-9B/);assert.match(s.endpoint_condition,/A100/);assert.equal(n.refused_http_422,15);assert.equal(n.refused_long_items,15);
 assert.equal(r.proof.publication_approval.top_five_effect,'none');assert.equal(r.proof.publication_approval.top_five_preview,null);assert.equal(r.proof.publication_approval.button_tap,false);
});
test('all 64 carried point objects and A2 metadata remain exact',()=>{
 for(const p of previous.artifact.systems){const s=r.artifact.systems.find(s=>s.key===p.key);if(p.key==='microsoft-decision-1-a2-20261012'){assert.deepEqual(s,p);continue;}for(const f of ['axes','scores','cost','speed','intelligence','calibration','capability'])assert.deepEqual(s[f],p[f],p.key+'.'+f);}
});
test('v1.6.35 rejects altered usage, runtime, approval, disclosures and release gates',()=>{
 rejects(b=>{b.artifact.systems.find(s=>s.key===k).supersedes_base_row='v1.6.0'},/supersede/);
 rejects(b=>{b.artifact.systems.find(s=>s.key==='kettei-fat').supersedes_base_row='v1.6.1'},/only Seb/);
 rejects(b=>{b.proof.new_rows[k].input_tokens++},/usage/);
 rejects(b=>{b.proof.new_rows[k].truncated_long_items=15},/runtime provenance/);
 rejects(b=>{b.proof.new_rows[k].treatment='ranked_over_cap'},/new-row provenance/);
 rejects(b=>{b.proof.publication_approval.top_five_effect='changes'},/standing GO/);
 rejects(b=>{b.proof.publication_approval.paid_fast_lane={date:'2026-09-29'}},/standing GO/);
 rejects(b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith(k+':')?n.replaceAll('TRAINING DATA','SPLITS'):n)},/required disclosure/);
 rejects(b=>{b.manifest.review.verdict='PENDING'},/independent release review/);
 rejects(b=>{b.proof.predecessor_seal_sha256=null},/predecessor seal/);
 rejects(b=>{b.artifact.systems.find(s=>s.key==='kettei-fat').axes.intelligence++},/capability|carried|axes/);
});
test('v1.6.35 archived route keeps shared board, method and history',async()=>{
 const page=await readFile('app/jev-models/v1.6.35/page.tsx','utf8');assert.match(page,/readOptionalJevbenchV1635Release\(\)/);assert.match(page,/v1635BoardInput\(release\)/);assert.ok(page.indexOf('<JevBenchV16Board')<page.indexOf('data-bh-jev1635-method'));assert.ok(page.indexOf('data-bh-jev1635-method')<page.indexOf('<JevHistoryLazy'));
});

import { readCohortRows, jevWithCohortRows } from '../lib/jevbench-cohort-merge.mjs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { readJevbenchSeoData } from '../lib/jevbench-seo.mjs';
import { readJevbenchAgentFeed, readJevbenchReleaseFeed, readJevbenchSeoFeed } from '../lib/jevbench-agent-feed.mjs';
import { baseModelFor } from '../lib/jev-base-model.mjs';
import { jevbenchLlmsFull } from '../lib/jevbench-llms-full.mjs';
test('live boards, feed and SEO resolve one new Seb; the base projection omits it and archive keeps the old row',async()=>{
 const {artifact}=await readCurrentJevbench(),old=artifact.systems.find(s=>s.key===k);
 assert.equal(baseModelFor('jevbench',k).label,'Qwen/Qwen3.5-9B');assert.equal(baseModelFor('jevbench',k).status,'disclosed');
 assert.equal(old.ranked,false);assert.equal(old.supersedes_base_row,undefined);
 const m=jevWithCohortRows(artifact,await readCohortRows()),rows=m.systems.filter(s=>s.key===k);
 assert.equal(rows.length,1);assert.equal(rows[0].ranked,true);assert.equal(rows[0].draw.id,'v1.6-regular-20261012');assert.equal(rows[0].draw.release,'v1.6.42');
 for(const b of Object.values(m.board))assert.equal(b.order.filter(key=>key===k).length,1);
 const {feed}=await readJevbenchAgentFeed();assert.equal(feed.systems.filter(s=>s.key===k).length,1);
 const seo=await readJevbenchSeoData(),seoRows=seo.systems.filter(s=>s.key===k);assert.equal(seoRows.length,1);assert.equal(seoRows[0].measurement_revision,feed.systems.find(s=>s.key===k).measured_in);assert.equal(seo.artifact.base_revision,'v1.6.1');
 const projected=await readJevbenchSeoFeed();
 const main=await readJevbenchReleaseFeed();
 const superseded=[k,'h2o-lightning-4b','kahn1'];
 const pos=x=>{const{rank,open_board_rank,api_board_rank,capability,...rest}=x;return{...rest,capability:{...capability,rank:undefined,open_board_rank:undefined,api_board_rank:undefined}};};
 assert.deepEqual(projected.feed.systems.map(s=>s.key),main.feed.systems.filter(s=>!superseded.includes(s.key)).map(s=>s.key),'base projection omits Seb and the two v1.6.37 restatements');
 assert.deepEqual(projected.feed.systems.map(pos),main.feed.systems.filter(s=>!superseded.includes(s.key)).map(pos),'all other base projection rows unchanged apart from board position');
 const llms=await jevbenchLlmsFull();assert.equal(llms.split('\n').filter(l=>l.includes('| seb-9b |')).length,1);
 const archive=await readJevbenchReleaseFeed();assert.equal(archive.feed.systems.find(s=>s.key===k).listing,old.listing);
 const bytes=await readFile('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json');assert.equal(createHash('sha256').update(bytes).digest('hex'),'5cd8c1332226ea9c179883d2285c0d8b8cc593ae38f2645197364a7ddd9c83c1');
});
