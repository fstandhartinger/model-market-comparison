import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readOptionalJevbenchV1631Release,validateJevbenchV1631Bundle,V1631_FLASH_KEY as K} from '../lib/jevbench-v1631-release.mjs';
import {readOptionalJevbenchV1630Release} from '../lib/jevbench-v1630-release.mjs';
const r=await readOptionalJevbenchV1631Release();const previous=await readOptionalJevbenchV1630Release();
const previousManifestSha256=createHash('sha256').update(await readFile('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.30-publication.json')).digest('hex');
const base={manifest:r.manifest,artifact:r.artifact,categories:r.categories,proof:r.proof,previous,previousManifestSha256};
const rejects=(edit,pattern)=>{const b=structuredClone(base);edit(b);assert.throws(()=>validateJevbenchV1631Bundle(b),pattern);};
test('v1.6.31 adds Flash and d3-turbo on the same draw, basis and frozen median',()=>{
 assert.equal(r.artifact.systems.length,60);assert.equal(r.artifact.n_ranked,49);
 assert.deepEqual(r.artifact.systems.filter(s=>!previous.artifact.systems.some(p=>p.key===s.key)).map(s=>s.key).sort(),[K,"vllm-sr-d3-turbo"].sort());
 assert.deepEqual(r.artifact.v16.cost_basis,previous.artifact.v16.cost_basis);
 assert.equal(r.proof.cost_basis_sha256,previous.proof.cost_basis_sha256);
 assert.equal(r.artifact.G_med,9.839526770355711);
 const s=r.artifact.systems.find(s=>s.key===K);assert.deepEqual(s.ranks,{A:18,B:18,C:19,capability:28});
 assert.equal(s.cost.usd_per_1000,0.015339595959595961);
 assert.equal(s.cost.common_basis.usd_per_1000_all_items,0.0387841);
 for(const o of ['A','B','C'])assert.deepEqual(r.artifact.board[o].order.slice(0,5),previous.artifact.board[o].order.slice(0,5));
});
test('v1.6.31 loader rejects changed carried scores, forged handoff axes, lost disclosure, changed usage and invented approval',()=>{
 rejects(b=>{b.artifact.systems.find(s=>s.key==='kettei-fat').axes.intelligence+=1},/capability|carried|axes/);
 rejects(b=>{b.artifact.systems.find(s=>s.key===K).speed.p50_s_raw+=1},/handoff point estimates/);
 rejects(b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith(K+':')?n.replaceAll('downloading other weights','quiet host'):n)},/required disclosure/);
 rejects(b=>{b.proof.new_rows[K].input_tokens+=1},/usage/);
 rejects(b=>{b.proof.publication_approval.top_five_effect='none'},/a no-card approval needs the generated no-change board note/);
 rejects(b=>{b.manifest.review.verdict='PENDING'},/independent release review/);
 rejects(b=>{b.proof.predecessor_seal_sha256=null},/predecessor seal/);
});
test('v1.6.31 archived route uses the shared board, its own notes and historical catalogue',async()=>{
 const page=await readFile('app/jev-models/v1.6.31/page.tsx','utf8');
 assert.match(page,/readOptionalJevbenchV1631Release\(\)/);assert.match(page,/v1631BoardInput\(release\)/);
 assert.ok(page.indexOf('<JevBenchV16Board')<page.indexOf('data-bh-jev1631-method'));
 assert.ok(page.indexOf('data-bh-jev1631-method')<page.indexOf('<JevHistoryLazy'));
 assert.match(page,/previousKeys=\{historicalCatalogue/);
});

test('d3-turbo keeps the default cap refusals, over-cap ranking, native probability and CC disclosures',()=>{
 const k='vllm-sr-d3-turbo',s=r.artifact.systems.find(s=>s.key===k),n=r.proof.new_rows[k];
 assert.equal(s.ranked,true);assert.equal(s.listing,'ranked');assert.equal(n.refused_long_items,15);
 assert.equal(n.input_tokens,771190);assert.equal(n.output_tokens,0);assert.equal(n.context_cap_tokens,32768);
 assert.equal(n.long_context_used,false);assert.equal(n.confidential_computing,false);assert.equal(n.native_probabilities,true);
 assert.match(s.cost.basis,/1,485 common items/);assert.match(s.cost.basis,/OVER THE OFFICIAL COST CAP/);
 assert.match(s.endpoint_condition,/confidential-computing mode/);
 assert.equal(s.author,previous.artifact.systems.find(x=>x.key==='vllm-sr-d3').author);
 assert.deepEqual(r.artifact.systems.find(x=>x.key==='microsoft-decision-1-a2-20261012'),previous.artifact.systems.find(x=>x.key==='microsoft-decision-1-a2-20261012'));
 rejects(b=>{b.proof.new_rows[k].refused_long_items=0},/measurement provenance/);
 rejects(b=>{b.proof.publication_approval.top_five_preview.card_id='PLACEHOLDER'},/placeholder|approval/);
});
