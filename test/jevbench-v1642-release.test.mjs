import test from 'node:test';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readOptionalJevbenchV1640Release, v1640TopicSupplementBinds } from '../lib/jevbench-v1640-release.mjs';
import { readOptionalJevbenchV1642Release, validateJevbenchV1642Bundle, V1642_NEW_KEYS, V1642_ROW_SPEC, v1642BoardInput } from '../lib/jevbench-v1642-release.mjs';
const root=process.cwd(),v=root+'/data/raw/benchmarks/jevbench/v1.6/';
const load=async f=>JSON.parse(await readFile(v+'jevbench-v1.6.42-'+f+'.json','utf8'));
const previous=await readOptionalJevbenchV1640Release();
const pm=await readFile(v+'jevbench-v1.6.40-publication.json');
const manifest=await load('publication'),artifact=await load('results'),categories=await load('categories'),proof=await load('proof');
const bundle={manifest,artifact,categories,proof,previous,previousManifestSha256:createHash('sha256').update(pm).digest('hex')};
// Candidate manifest is PENDING in the real tree; only disposable test trees receive synthetic PASS.
const pass=structuredClone(bundle);pass.manifest.review={engine:'synthetic-review-only',verdict:'PASS',receipt_sha256:'a'.repeat(64)};
test('v1.6.42 candidate requires independent PASS',async()=>{
 if(manifest.review.verdict==='PENDING')await assert.rejects(readOptionalJevbenchV1642Release(),/independent release review/);
 else assert.equal((await readOptionalJevbenchV1642Release()).artifact.revision,'v1.6.42');
 assert.doesNotThrow(()=>validateJevbenchV1642Bundle(pass));
});
test('v1.6.42 paid rows, carried scores/intervals, full category coverage',()=>{
 assert.equal(artifact.systems.length,previous.artifact.systems.length+V1642_NEW_KEYS.length);
 for(const k of V1642_NEW_KEYS){const r=artifact.systems.find(s=>s.key===k);assert.deepEqual(r,V1642_ROW_SPEC[k]);assert.ok(categories.systems[k]);assert.equal(r.paid_fast_lane,true)}
 assert.deepEqual(V1642_NEW_KEYS,['torchcast-decision-4b-v1.3']);
 assert.equal(proof.new_rows['torchcast-decision-4b-v1.3'].truncated_long_items,0);
 assert.equal(proof.new_rows['torchcast-decision-4b-v1.3'].over_10s,0);
 assert.deepEqual(proof.new_rows['torchcast-decision-4b-v1.3'].status_counts,{200:1500});
});
for(const [label,mutate] of [
 ['carried interval',b=>{b.artifact.systems.find(s=>s.key==='jev-1.14.0').composite_ci95.A[0]+=1}],
 ['new cost',b=>{b.artifact.systems.find(s=>s.key==='torchcast-decision-4b-v1.3').cost.usd_per_1000+=0.001}],
 ['strip disclosure',b=>{b.artifact.systems.find(s=>s.key==='torchcast-decision-4b-v1.3').underlying='removed'}],
 ['rank swap',b=>{const r=b.artifact.systems.find(s=>s.ranked);r.ranks.A+=1}],
 ['strip categories',b=>{delete b.categories.systems['torchcast-decision-4b-v1.3']}],
 ['manifest path',b=>{b.manifest.files.proof.path='unbound.json'}],
 ['approval card claimed',b=>{b.proof.publication_approval.top_five_preview={card_id:'18140'}}],
 ['approval button claimed',b=>{b.proof.publication_approval.button_tap=true}],
 ['approval authority text',b=>{b.proof.publication_approval.top_five_authority='Florian GO'}],
 ['approval removed effect',b=>{b.proof.publication_approval.top_five_effect='none';delete b.proof.publication_approval.top_five_changed_by;delete b.proof.publication_approval.top_five_authority}],
 ['approval placeholder',b=>{b.proof.publication_approval.top_five_authority='PLACEHOLDER'}],
 ['approval public note',b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith('Publication of v1.6.42:')?n.replace('paid public fast-lane order publishes under that exception','is approved'):n)}],
 ['item leakage',b=>{b.proof.task_id='private'}],
 ['unprice ranked row',b=>{b.artifact.systems.find(s=>s.key==='torchcast-decision-4b-v1.3').ranked=false}],
])test('v1.6.42 rejects '+label,()=>{const b=structuredClone(pass);mutate(b);assert.throws(()=>validateJevbenchV1642Bundle(b))});

test('v1.6.42 archive comparison has measured topic and use-case cells for every ranked row', {skip:manifest.review.verdict==='PENDING'}, async()=>{const r=await readOptionalJevbenchV1642Release();const board=v1642BoardInput(r);assert.equal(board.categories.revision,'v1.6.42');assert.ok(board.categories.topics.length>=5);assert.doesNotThrow(()=>jevbenchCategoryView('v1.6.42',board.artifact.systems.filter(s=>s.ranked).map(s=>s.key),{artifact:board.categories}));for(const row of board.artifact.systems.filter(s=>s.ranked))for(const dim of ['topics','usecases'])assert.ok(Object.keys(board.categories.systems[row.key]?.[dim]??{}).length,`${row.key}.${dim}`)});

test('v1.6.40 reader accepts a v1.6.42 topic supplement only with unchanged carried cells',async()=>{
 const sup=JSON.parse(await readFile(v+'jevbench-v1.6-cohort-topic-cells.json','utf8')).draws['v1.6-regular-20261012'];
 const roster=previous.artifact.systems.map(s=>s.key);
 assert.equal(v1640TopicSupplementBinds(sup,'x',roster),true);
 const mut=f=>{const c=structuredClone(sup);f(c);return v1640TopicSupplementBinds(c,'x',roster)};
 const bump=o=>{for(const k of Object.keys(o)){if(typeof o[k]==='number'){o[k]+=1;return true}if(o[k]&&typeof o[k]==='object'&&bump(o[k]))return true}return false};
 assert.equal(mut(c=>{assert.ok(bump(c.systems[roster.find(k=>c.systems[k])]))}),false);
 assert.equal(mut(c=>{c.extra_rows={}}),false);
 assert.equal(mut(c=>{delete c.systems[roster.find(k=>c.systems[k])]}),false);
 assert.equal(mut(c=>{c.release='v1.6.41'}),false);
 assert.equal(mut(c=>{c.release='v1.6.39'}),false);
 assert.equal(mut(c=>{c.release='v1.6.40';c.results_sha256='y'}),false);
 assert.equal(v1640TopicSupplementBinds(null,'x',roster),false);
});
