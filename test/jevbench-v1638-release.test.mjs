import test from 'node:test';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readOptionalJevbenchV1637Release } from '../lib/jevbench-v1637-release.mjs';
import { readOptionalJevbenchV1638Release, validateJevbenchV1638Bundle, V1638_NEW_KEYS, V1638_ROW_SPEC, v1638BoardInput } from '../lib/jevbench-v1638-release.mjs';
const root=process.cwd(),v=root+'/data/raw/benchmarks/jevbench/v1.6/';
const load=async f=>JSON.parse(await readFile(v+'jevbench-v1.6.38-'+f+'.json','utf8'));
const previous=await readOptionalJevbenchV1637Release();
const pm=await readFile(v+'jevbench-v1.6.37-publication.json');
const manifest=await load('publication'),artifact=await load('results'),categories=await load('categories'),proof=await load('proof');
const bundle={manifest,artifact,categories,proof,previous,previousManifestSha256:createHash('sha256').update(pm).digest('hex')};
// Candidate manifest is PENDING in the real tree; only disposable test trees receive synthetic PASS.
const pass=structuredClone(bundle);pass.manifest.review={engine:'synthetic-review-only',verdict:'PASS',receipt_sha256:'a'.repeat(64)};
test('v1.6.38 candidate requires independent PASS',async()=>{
 if(manifest.review.verdict==='PENDING')await assert.rejects(readOptionalJevbenchV1638Release(),/independent release review/);
 else assert.equal((await readOptionalJevbenchV1638Release()).artifact.revision,'v1.6.38');
 assert.doesNotThrow(()=>validateJevbenchV1638Bundle(pass));
});
test('v1.6.38 paid rows, carried scores/intervals, full category coverage',()=>{
 assert.equal(artifact.systems.length,previous.artifact.systems.length+V1638_NEW_KEYS.length);
 for(const k of V1638_NEW_KEYS){const r=artifact.systems.find(s=>s.key===k);assert.deepEqual(r,V1638_ROW_SPEC[k]);assert.ok(categories.systems[k]);assert.equal(r.paid_fast_lane,true)}
 if(V1638_NEW_KEYS.includes('drex-max'))assert.equal(proof.new_rows['drex-max'].status_counts['529'],2);
 assert.equal(proof.new_rows['iota-decide-4b'].truncated_long_items,15);
 assert.equal(proof.new_rows['launchables-myles-g-12b'].truncated_long_items,15);
});
for(const [label,mutate] of [
 ['carried interval',b=>{b.artifact.systems.find(s=>s.key==='jev-1.14.0').composite_ci95.A[0]+=1}],
 ['new cost',b=>{b.artifact.systems.find(s=>s.key==='iota-decide-4b').cost.usd_per_1000+=0.001}],
 ['strip truncation disclosure',b=>{b.artifact.systems.find(s=>s.key==='launchables-myles-g-12b').underlying='removed'}],
 ['rank swap',b=>{const r=b.artifact.systems.find(s=>s.ranked);r.ranks.A+=1}],
 ['strip categories',b=>{delete b.categories.systems['iota-decide-4b']}],
 ['manifest path',b=>{b.manifest.files.proof.path='unbound.json'}],
 ['invent approval',b=>{b.proof.publication_approval.button_tap=true}],
 ['item leakage',b=>{b.proof.task_id='private'}],
 ['unprice ranked row',b=>{b.artifact.systems.find(s=>s.key==='iota-decide-4b').ranked=false}],
])test('v1.6.38 rejects '+label,()=>{const b=structuredClone(pass);mutate(b);assert.throws(()=>validateJevbenchV1638Bundle(b))});

test('v1.6.38 archive comparison has measured topic and use-case cells for every ranked row', {skip:manifest.review.verdict==='PENDING'}, async()=>{const r=await readOptionalJevbenchV1638Release();const board=v1638BoardInput(r);assert.equal(board.categories.revision,'v1.6.38');assert.ok(board.categories.topics.length>=5);assert.doesNotThrow(()=>jevbenchCategoryView('v1.6.38',board.artifact.systems.filter(s=>s.ranked).map(s=>s.key),{artifact:board.categories}));for(const row of board.artifact.systems.filter(s=>s.ranked))for(const dim of ['topics','usecases'])assert.ok(Object.keys(board.categories.systems[row.key]?.[dim]??{}).length,`${row.key}.${dim}`)});
