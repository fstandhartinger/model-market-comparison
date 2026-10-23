import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readOptionalJevbenchV1642Release,v1642TopicSupplementBinds} from '../lib/jevbench-v1642-release.mjs';
import {readOptionalJevbenchV1643Release,validateJevbenchV1643Bundle,V1643_ROW_SPEC,v1643BoardInput} from '../lib/jevbench-v1643-release.mjs';
const v=process.cwd()+'/data/raw/benchmarks/jevbench/v1.6/';
const load=async f=>JSON.parse(await readFile(v+'jevbench-v1.6.43-'+f+'.json','utf8'));
const previous=await readOptionalJevbenchV1642Release();
const manifest=await load('publication'),artifact=await load('results'),categories=await load('categories'),proof=await load('proof');
const bundle={manifest,artifact,categories,proof,previous,previousManifestSha256:createHash('sha256').update(await readFile(v+'jevbench-v1.6.42-publication.json')).digest('hex')};
const pass=structuredClone(bundle);pass.manifest.review={engine:'synthetic-review-only',verdict:'PASS',receipt_sha256:'a'.repeat(64)};pass.proof.publication_approval.status='PASS';
test('v1.6.43 requires independent review and separate publication authority',async()=>{
 assert.doesNotThrow(()=>validateJevbenchV1643Bundle(pass));
 const b=structuredClone(pass);b.manifest.review.verdict='PENDING';assert.throws(()=>validateJevbenchV1643Bundle(b),/independent release review/);
 b.manifest.review=pass.manifest.review;b.proof.publication_approval.status='PENDING';assert.throws(()=>validateJevbenchV1643Bundle(b),/publication authority PENDING/);
 if(manifest.review.verdict==='PENDING')await assert.rejects(readOptionalJevbenchV1643Release(),/independent release review/);
 else assert.equal((await readOptionalJevbenchV1643Release()).artifact.revision,'v1.6.43');
});
test('v1.6.43 measured hosted row and every carried score/interval/category',()=>{
 assert.equal(artifact.systems.length,79);assert.equal(artifact.n_ranked,68);
 const r=artifact.systems.find(s=>s.key==='subq-snap-1.1');assert.deepEqual(r,V1643_ROW_SPEC[r.key]);assert.equal(r.paid_fast_lane,false);
 assert.equal(proof.new_rows[r.key].input_tokens,1939205);assert.equal(proof.new_rows[r.key].output_tokens,0);assert.equal(proof.new_rows[r.key].over_10s,0);
 assert.deepEqual(proof.new_rows[r.key].status_counts,{'200':1500});
 assert.match(r.underlying,/capacity-limited public preview/);assert.match(r.underlying,/SAME-AUTHOR SECOND/);assert.match(r.underlying,/13 Oct/);assert.match(r.underlying,/not flagged/);
 assert.doesNotMatch(r.underlying+r.endpoint_condition,/18406|\/home\/|board/i);
});
for(const [name,mutate] of [
 ['carried CI',b=>b.artifact.systems.find(s=>s.key==='jev-1.14.0').composite_ci95.A[0]++],
 ['new cost',b=>b.artifact.systems.find(s=>s.key==='subq-snap-1.1').cost.usd_per_1000++],
 ['disclosure',b=>b.artifact.systems.find(s=>s.key==='subq-snap-1.1').underlying='removed'],
 ['category',b=>delete b.categories.systems['subq-snap-1.1']],
 ['rank',b=>b.artifact.systems.find(s=>s.ranked).ranks.A++],
 ['path',b=>b.manifest.files.proof.path='wrong'],
 ['review',b=>b.manifest.review.verdict='REVISE'],
 ['approval card',b=>b.proof.publication_approval.top_five_preview.card_id='wrong'],
 ['approval button',b=>b.proof.publication_approval.button_tap=false],
 ['fresh baseline',b=>b.proof.publication_approval.fresh_baseline='v1.6.40'],
 ['approval cause',b=>b.proof.publication_approval.top_five_changed_by=['other']],
 ['item leakage',b=>b.proof.task_id='private'],
 ['paid exception',b=>b.proof.new_rows['subq-snap-1.1'].paid_fast_lane=true],
])test('v1.6.43 rejects '+name,()=>{const b=structuredClone(pass);mutate(b);assert.throws(()=>validateJevbenchV1643Bundle(b))});
test('v1.6.42 archive supplement accepts only unchanged carried cells',async()=>{
 const t=JSON.parse(await readFile(v+'jevbench-v1.6-cohort-topic-cells.json')).draws['v1.6-regular-20261012'];const keys=previous.artifact.systems.map(s=>s.key);
 assert.equal(v1642TopicSupplementBinds(t,'wrong',keys),true);
 for(const change of [c=>delete c.systems[keys.find(k=>c.systems[k])],c=>c.extra_rows={},c=>c.release='v1.6.41']){const c=structuredClone(t);change(c);assert.equal(v1642TopicSupplementBinds(c,'wrong',keys),false)}
});
test('v1.6.43 comparison radars have measured topic and use-case cells',{skip:manifest.review.verdict==='PENDING'},async()=>{
 const b=v1643BoardInput(await readOptionalJevbenchV1643Release());assert.equal(b.categories.revision,'v1.6.43');for(const row of b.artifact.systems.filter(s=>s.ranked))for(const dim of ['topics','usecases'])assert.ok(Object.keys(b.categories.systems[row.key]?.[dim]??{}).length);
});
