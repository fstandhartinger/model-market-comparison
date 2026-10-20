import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readOptionalJevbenchV1633Release,validateJevbenchV1633Bundle} from '../lib/jevbench-v1633-release.mjs';
import {readOptionalJevbenchV1632Release} from '../lib/jevbench-v1632-release.mjs';
const r=await readOptionalJevbenchV1633Release(),previous=await readOptionalJevbenchV1632Release(),k='pplx-decider-v1.2';
const previousManifestSha256=createHash('sha256').update(await readFile('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.32-publication.json')).digest('hex');
const base={manifest:r.manifest,artifact:r.artifact,categories:r.categories,proof:r.proof,previous,previousManifestSha256};
const rejects=(edit,pattern)=>{const b=structuredClone(base);edit(b);assert.throws(()=>validateJevbenchV1633Bundle(b),pattern);};
test('v1.6.33 adds only the 27B sibling with frozen draw and common cost basis',()=>{
 assert.equal(r.artifact.systems.length,64);assert.equal(r.artifact.n_ranked,53);
 assert.deepEqual(r.artifact.systems.filter(s=>!previous.artifact.systems.some(p=>p.key===s.key)).map(s=>s.key),[k]);
 assert.deepEqual(r.artifact.v16.cost_basis,previous.artifact.v16.cost_basis);assert.equal(r.proof.cost_basis_sha256,previous.proof.cost_basis_sha256);assert.equal(r.artifact.G_med,9.839526770355711);
 const s=r.artifact.systems.find(s=>s.key===k),n=r.proof.new_rows[k];
 assert.equal(s.cost.kind,'estimate');assert.equal(s.cost.usd_per_1000,0.2147543434343434);assert.equal(s.endpoint_kind,'gpu');assert.equal(s.paid_fast_lane,false);
 assert.equal(n.input_tokens,1939205);assert.equal(n.output_tokens,0);assert.equal(n.treatment,'ranked_over_cap');assert.equal(n.under_cost_cap,false);
 assert.equal(n.answered_beyond_training_length,15);assert.equal(n.truncated_long_items,0);assert.equal(n.training_length_tokens,32768);assert.equal(n.native_probabilities,true);
 assert.equal(n.raw_sha256,'959283133bde3c019e3f86cf2f51d8bbeda83a6c9b6171e20cfbc859d03e170e');
 assert.match(s.cost.basis,/OVER THE OFFICIAL COST CAP/);assert.match(s.cost.basis,/ALL-ITEMS DIAGNOSTIC: USD 0.542977/);assert.match(s.endpoint_condition,/one NVIDIA H200 141 GB/);
 assert.equal(r.proof.publication_approval.top_five_effect,'none');assert.equal(r.proof.publication_approval.top_five_preview,null);assert.equal(r.proof.publication_approval.button_tap,false);
});
test('all 62 carried point objects and A2 metadata remain exact',()=>{
 for(const p of previous.artifact.systems){const s=r.artifact.systems.find(s=>s.key===p.key);if(p.key==='microsoft-decision-1-a2-20261012'){assert.deepEqual(s,p);continue;}for(const f of ['axes','scores','cost','speed','intelligence','calibration','capability'])assert.deepEqual(s[f],p[f],p.key+'.'+f);}
});
test('v1.6.33 rejects altered usage, runtime, approval, disclosures and release gates',()=>{
 rejects(b=>{b.proof.new_rows[k].input_tokens++},/usage/);
 rejects(b=>{b.proof.new_rows[k].truncated_long_items=15},/runtime provenance/);
 rejects(b=>{b.proof.new_rows[k].treatment='ranked'},/new-row provenance/);
 rejects(b=>{b.proof.publication_approval.top_five_effect='changes'},/standing GO/);
 rejects(b=>{b.proof.publication_approval.paid_fast_lane={date:'2026-09-29'}},/standing GO/);
 rejects(b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith(k+':')?n.replaceAll('TRAINING SPLITS','SPLITS'):n)},/required disclosure/);
 rejects(b=>{b.manifest.review.verdict='PENDING'},/independent release review/);
 rejects(b=>{b.proof.predecessor_seal_sha256=null},/predecessor seal/);
 rejects(b=>{b.artifact.systems.find(s=>s.key==='kettei-fat').axes.intelligence++},/capability|carried|axes/);
});
test('v1.6.33 archived route keeps shared board, method and history',async()=>{
 const page=await readFile('app/jev-models/v1.6.33/page.tsx','utf8');assert.match(page,/readOptionalJevbenchV1633Release\(\)/);assert.match(page,/v1633BoardInput\(release\)/);assert.ok(page.indexOf('<JevBenchV16Board')<page.indexOf('data-bh-jev1633-method'));assert.ok(page.indexOf('data-bh-jev1633-method')<page.indexOf('<JevHistoryLazy'));
});
