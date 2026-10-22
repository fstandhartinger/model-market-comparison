import test from 'node:test';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readOptionalJevbenchV1638Release, v1638TopicSupplementBinds } from '../lib/jevbench-v1638-release.mjs';
import { readOptionalJevbenchV1639Release, validateJevbenchV1639Bundle, V1639_NEW_KEYS, V1639_ROW_SPEC, v1639BoardInput } from '../lib/jevbench-v1639-release.mjs';
const root=process.cwd(),v=root+'/data/raw/benchmarks/jevbench/v1.6/';
const load=async f=>JSON.parse(await readFile(v+'jevbench-v1.6.39-'+f+'.json','utf8'));
const previous=await readOptionalJevbenchV1638Release();
const pm=await readFile(v+'jevbench-v1.6.38-publication.json');
const manifest=await load('publication'),artifact=await load('results'),categories=await load('categories'),proof=await load('proof');
const bundle={manifest,artifact,categories,proof,previous,previousManifestSha256:createHash('sha256').update(pm).digest('hex')};
// Candidate manifest is PENDING in the real tree; only disposable test trees receive synthetic PASS.
const pass=structuredClone(bundle);pass.manifest.review={engine:'synthetic-review-only',verdict:'PASS',receipt_sha256:'a'.repeat(64)};
test('v1.6.39 candidate requires independent PASS',async()=>{
 if(manifest.review.verdict==='PENDING')await assert.rejects(readOptionalJevbenchV1639Release(),/independent release review/);
 else assert.equal((await readOptionalJevbenchV1639Release()).artifact.revision,'v1.6.39');
 assert.doesNotThrow(()=>validateJevbenchV1639Bundle(pass));
});
test('v1.6.39 paid rows, carried scores/intervals, full category coverage',()=>{
 assert.equal(artifact.systems.length,previous.artifact.systems.length+V1639_NEW_KEYS.length);
 for(const k of V1639_NEW_KEYS){const r=artifact.systems.find(s=>s.key===k);assert.deepEqual(r,V1639_ROW_SPEC[k]);assert.ok(categories.systems[k]);assert.equal(r.paid_fast_lane,true)}
 assert.deepEqual(V1639_NEW_KEYS,['h2o-lightning-31b']);
 assert.equal(proof.new_rows['h2o-lightning-31b'].truncated_long_items,0);
 assert.equal(proof.new_rows['h2o-lightning-31b'].over_10s,15);
 assert.deepEqual(proof.new_rows['h2o-lightning-31b'].status_counts,{200:1500});
});
for(const [label,mutate] of [
 ['carried interval',b=>{b.artifact.systems.find(s=>s.key==='jev-1.14.0').composite_ci95.A[0]+=1}],
 ['new cost',b=>{b.artifact.systems.find(s=>s.key==='h2o-lightning-31b').cost.usd_per_1000+=0.001}],
 ['strip disclosure',b=>{b.artifact.systems.find(s=>s.key==='h2o-lightning-31b').underlying='removed'}],
 ['rank swap',b=>{const r=b.artifact.systems.find(s=>s.ranked);r.ranks.A+=1}],
 ['strip categories',b=>{delete b.categories.systems['h2o-lightning-31b']}],
 ['manifest path',b=>{b.manifest.files.proof.path='unbound.json'}],
 ['approval card claimed',b=>{b.proof.publication_approval.top_five_preview={card_id:'18140'}}],
 ['approval button claimed',b=>{b.proof.publication_approval.button_tap=true}],
 ['approval authority text',b=>{b.proof.publication_approval.top_five_authority='Florian GO'}],
 ['approval removed effect',b=>{b.proof.publication_approval.top_five_effect='none';delete b.proof.publication_approval.top_five_changed_by;delete b.proof.publication_approval.top_five_authority}],
 ['approval placeholder',b=>{b.proof.publication_approval.top_five_authority='PLACEHOLDER'}],
 ['approval public note',b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith('Publication of v1.6.39:')?n.replace('paid public fast-lane order publishes under that exception','is approved'):n)}],
 ['item leakage',b=>{b.proof.task_id='private'}],
 ['unprice ranked row',b=>{b.artifact.systems.find(s=>s.key==='h2o-lightning-31b').ranked=false}],
])test('v1.6.39 rejects '+label,()=>{const b=structuredClone(pass);mutate(b);assert.throws(()=>validateJevbenchV1639Bundle(b))});

test('v1.6.39 archive comparison has measured topic and use-case cells for every ranked row', {skip:manifest.review.verdict==='PENDING'}, async()=>{const r=await readOptionalJevbenchV1639Release();const board=v1639BoardInput(r);assert.equal(board.categories.revision,'v1.6.39');assert.ok(board.categories.topics.length>=5);assert.doesNotThrow(()=>jevbenchCategoryView('v1.6.39',board.artifact.systems.filter(s=>s.ranked).map(s=>s.key),{artifact:board.categories}));for(const row of board.artifact.systems.filter(s=>s.ranked))for(const dim of ['topics','usecases'])assert.ok(Object.keys(board.categories.systems[row.key]?.[dim]??{}).length,`${row.key}.${dim}`)});

test('v1.6.38 reader accepts a v1.6.39 topic supplement only with unchanged carried cells',async()=>{
 const sup=JSON.parse(await readFile(v+'jevbench-v1.6-cohort-topic-cells.json','utf8')).draws['v1.6-regular-20261012'];
 const roster=previous.artifact.systems.map(s=>s.key);
 assert.equal(v1638TopicSupplementBinds(sup,'x',roster),true);
 const mut=f=>{const c=structuredClone(sup);f(c);return v1638TopicSupplementBinds(c,'x',roster)};
 const bump=o=>{for(const k of Object.keys(o)){if(typeof o[k]==='number'){o[k]+=1;return true}if(o[k]&&typeof o[k]==='object'&&bump(o[k]))return true}return false};
 assert.equal(mut(c=>{assert.ok(bump(c.systems[roster.find(k=>c.systems[k])]))}),false);
 assert.equal(mut(c=>{c.extra_rows={}}),false);
 assert.equal(mut(c=>{delete c.systems[roster.find(k=>c.systems[k])]}),false);
 assert.equal(mut(c=>{c.release='v1.6.41'}),false);
 assert.equal(mut(c=>{c.release='v1.6.38';c.results_sha256='y'}),false);
 assert.equal(v1638TopicSupplementBinds(null,'x',roster),false);
});
