import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readOptionalJevbenchV1632Release,validateJevbenchV1632Bundle} from '../lib/jevbench-v1632-release.mjs';
import {readOptionalJevbenchV1631Release} from '../lib/jevbench-v1631-release.mjs';
const r=await readOptionalJevbenchV1632Release(),previous=await readOptionalJevbenchV1631Release();
const previousManifestSha256=createHash('sha256').update(await readFile('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.31-publication.json')).digest('hex');
const base={manifest:r.manifest,artifact:r.artifact,categories:r.categories,proof:r.proof,previous,previousManifestSha256};
const rejects=(edit,pattern)=>{const b=structuredClone(base);edit(b);assert.throws(()=>validateJevbenchV1632Bundle(b),pattern);};
test('v1.6.32 adds the Chon siblings and Vega-U 4B with the frozen draw and common cost basis',()=>{
 assert.equal(r.artifact.systems.length,63);assert.equal(r.artifact.n_ranked,52);
 assert.deepEqual(r.artifact.systems.filter(s=>!previous.artifact.systems.some(p=>p.key===s.key)).map(s=>s.key).sort(),['chon-1.0-12b','chon-1.0-e4b','vega-u-qwen3.5-4b']);
 assert.deepEqual(r.artifact.v16.cost_basis,previous.artifact.v16.cost_basis);
 assert.equal(r.proof.cost_basis_sha256,previous.proof.cost_basis_sha256);assert.equal(r.artifact.G_med,9.839526770355711);
 const cpu=r.artifact.systems.find(s=>s.key==='chon-1.0-e4b'),gpu=r.artifact.systems.find(s=>s.key==='chon-1.0-12b');
 assert.equal(cpu.cost.kind,'listed');assert.equal(cpu.cost.usd_per_1000,0.009443245791245792);assert.equal(cpu.endpoint_kind,'cpu');
 assert.equal(gpu.cost.kind,'estimate');assert.equal(gpu.paid_fast_lane,true);assert.equal(cpu.paid_fast_lane,false);assert.equal(cpu.author,gpu.author);
 assert.equal(r.proof.new_rows['chon-1.0-12b'].input_tokens,806004);assert.equal(r.proof.new_rows['chon-1.0-12b'].output_tokens,264310);
 assert.equal(r.proof.new_rows['chon-1.0-e4b'].input_tokens,792841);assert.equal(r.proof.new_rows['chon-1.0-e4b'].output_tokens,0);
 assert.equal(r.proof.publication_approval.top_five_preview,null);assert.equal(r.proof.publication_approval.button_tap,false);
});
test('v1.6.32 validates carried estimates, usage, paid authority, disclosure and release gates',()=>{
 rejects(b=>{b.artifact.systems.find(s=>s.key==='kettei-fat').axes.intelligence+=1},/capability|carried|axes/);
 rejects(b=>{b.proof.new_rows['chon-1.0-e4b'].input_tokens+=1},/usage/);
 rejects(b=>{b.proof.publication_approval.paid_fast_lane.date='2026-10-20'},/paid exception/);
 rejects(b=>{b.proof.publication_approval.top_five_changed_by=['chon-1.0-e4b']},/paid causes/);
 rejects(b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith('chon-1.0-e4b:')?n.replaceAll('Chon family','Family'):n)},/required disclosure/);
 rejects(b=>{b.proof.new_rows['chon-1.0-12b'].truncated_long_items=0},/runtime provenance/);
 rejects(b=>{b.manifest.review.verdict='PENDING'},/independent release review/);
 rejects(b=>{b.proof.predecessor_seal_sha256=null},/predecessor seal/);
});
test('v1.6.32 archived route retains shared board, method notes and history',async()=>{
 const page=await readFile('app/jev-models/v1.6.32/page.tsx','utf8');assert.match(page,/readOptionalJevbenchV1632Release\(\)/);assert.match(page,/v1632BoardInput\(release\)/);
 assert.ok(page.indexOf('<JevBenchV16Board')<page.indexOf('data-bh-jev1632-method'));assert.ok(page.indexOf('data-bh-jev1632-method')<page.indexOf('<JevHistoryLazy'));
});

test('Vega 4B binds CPU, capped states, exact token totals and reader provenance',()=>{const k='vega-u-qwen3.5-4b',v=r.artifact.systems.find(s=>s.key===k),n=r.proof.new_rows[k];assert.equal(v.endpoint_kind,'cpu');assert.equal(n.input_tokens,1837991);assert.equal(n.output_tokens,0);assert.equal(n.context_cap_tokens,73728);assert.equal(n.truncated_long_items,15);assert.equal(n.native_probabilities,true);assert.match(v.endpoint_condition,/32 cores/);assert.match(n.disclosure,/851bf6e806efd8d0a36b00ddf55e13ccb7b8cd0a/);assert.match(n.disclosure,/27.8, p90 34.7, maximum 42.0/);assert.ok(Object.values(v.ranks).every(n=>n>5));rejects(b=>{b.proof.new_rows[k].context_cap_tokens=6000},/runtime provenance/);rejects(b=>{b.proof.new_rows[k].input_tokens++},/usage/);});
