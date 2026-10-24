import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readOptionalJevbenchV1642Release,v1642TopicSupplementBinds} from '../lib/jevbench-v1642-release.mjs';
import {readOptionalJevbenchV1643Release,validateJevbenchV1643Bundle,V1643_ROW_SPEC,V1643_REFRESHED_PREVIEW,V1643_REFRESHED_PREVIEW_SHA256,V1643_FRESH_GO_RECEIPT_SHA256,v1643BoardInput} from '../lib/jevbench-v1643-release.mjs';
const v=process.cwd()+'/data/raw/benchmarks/jevbench/v1.6/';
const load=async f=>JSON.parse(await readFile(v+'jevbench-v1.6.43-'+f+'.json','utf8'));
const previous=await readOptionalJevbenchV1642Release();
const manifest=await load('publication'),artifact=await load('results'),categories=await load('categories'),proof=await load('proof');
const bundle={manifest,artifact,categories,proof,previous,previousManifestSha256:createHash('sha256').update(await readFile(v+'jevbench-v1.6.42-publication.json')).digest('hex')};
const pass=structuredClone(bundle);pass.manifest.review={engine:'synthetic-review-only',verdict:'PASS',receipt_sha256:'a'.repeat(64)};pass.proof.publication_approval.status='PASS';
const now=()=>new Date().toISOString().replace(/\.000Z$/,'Z');
const sentId=V1643_REFRESHED_PREVIEW.sent_card_id??'999999';
pass.proof.publication_approval.fresh_go={card_id:sentId,reply_to_card_id:sentId,from_user:'florian',answer_event_id:'synthetic-callback',button:'Publish (recommended)',answered_at_utc:now(),dispatch_receipt_sha256:V1643_REFRESHED_PREVIEW.dispatch_receipt_sha256??'a'.repeat(64),dispatch_action_sha256:V1643_REFRESHED_PREVIEW.dispatch_action_sha256??'c'.repeat(64),answer_receipt_sha256:V1643_FRESH_GO_RECEIPT_SHA256??'b'.repeat(64),preview_binding_sha256:V1643_REFRESHED_PREVIEW_SHA256};
test('v1.6.43 requires independent review and separate publication authority',async()=>{
 if(V1643_REFRESHED_PREVIEW.sent_card_id)assert.doesNotThrow(()=>validateJevbenchV1643Bundle(pass));
 else assert.throws(()=>validateJevbenchV1643Bundle(pass),/fresh request dispatch receipt/);
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
 ['old-card-only approval',b=>{b.proof.publication_approval.status='PASS';b.proof.publication_approval.fresh_go=null}],
 ['historical card reused',b=>b.proof.publication_approval.fresh_go.card_id='18406'],
 ['fresh approval button',b=>b.proof.publication_approval.fresh_go.button='Hold'],
 ['fresh approval answer time',b=>b.proof.publication_approval.fresh_go.answered_at_utc='not-a-time'],
 ['unrelated older card',b=>{b.proof.publication_approval.fresh_go.card_id='17515';b.proof.publication_approval.fresh_go.reply_to_card_id='17515'}],
 ['unsent card',b=>{b.proof.publication_approval.fresh_go.card_id='999998';b.proof.publication_approval.fresh_go.reply_to_card_id='999998'}],
 ['answer before dispatch',b=>b.proof.publication_approval.fresh_go.answered_at_utc='2000-01-01T00:00:00Z'],
 ['future answer',b=>b.proof.publication_approval.fresh_go.answered_at_utc='2099-01-01T00:00:00Z'],
 ['invalid calendar answer',b=>b.proof.publication_approval.fresh_go.answered_at_utc='2026-02-30T00:00:00Z'],
 ['wrong answer sender',b=>b.proof.publication_approval.fresh_go.from_user='someone-else'],
 ['wrong dispatch receipt',b=>b.proof.publication_approval.fresh_go.dispatch_receipt_sha256='0'.repeat(64)],
 ['wrong answer receipt',b=>b.proof.publication_approval.fresh_go.answer_receipt_sha256='0'.repeat(64)],
 ['fresh approval binding',b=>b.proof.publication_approval.fresh_go.preview_binding_sha256='0'.repeat(64)],
 ['proof preview binding',b=>b.proof.refreshed_preview.card_image_sha256='f'.repeat(64)],
 ['approval preview binding',b=>b.proof.publication_approval.refreshed_preview.card_text_sha256='f'.repeat(64)],
 ['fresh baseline',b=>b.proof.publication_approval.fresh_baseline='v1.6.40'],
 ['approval cause',b=>b.proof.publication_approval.top_five_changed_by=['other']],
 ['item leakage',b=>b.proof.task_id='private'],
 ['stale inherited authority',b=>b.proof.refreshed_preview_go_card='17515'],
 ['paid exception',b=>b.proof.new_rows['subq-snap-1.1'].paid_fast_lane=true],
])test('v1.6.43 rejects '+name,()=>{const b=structuredClone(pass);mutate(b);assert.throws(()=>validateJevbenchV1643Bundle(b))});
const written=structuredClone(pass);written.proof.publication_approval.fresh_go={...pass.proof.publication_approval.fresh_go,channel:'written',button:null,decisions_key:'subq-snap-v1643-go',answer_event_id:'decisions:subq-snap-v1643-go'};
test('v1.6.43 accepts a written GO bound to the same dispatch and preview',{skip:!V1643_REFRESHED_PREVIEW.sent_card_id},()=>{assert.doesNotThrow(()=>validateJevbenchV1643Bundle(written))});
for(const [name,mutate] of [
 ['written GO with a button',g=>g.button='Publish (recommended)'],
 ['written GO with a button choice Hold',g=>g.button='Hold'],
 ['written GO for another decision key',g=>g.decisions_key='other-go'],
 ['written GO with a mismatched event id',g=>g.answer_event_id='synthetic-callback'],
 ['written GO on the historical card',g=>{g.card_id='18406';g.reply_to_card_id='18406'}],
 ['written GO before dispatch',g=>g.answered_at_utc='2000-01-01T00:00:00Z'],
 ['written GO with a wrong receipt',g=>g.answer_receipt_sha256='0'.repeat(64)],
 ['written GO not bound to the preview',g=>g.preview_binding_sha256='0'.repeat(64)],
 ['written GO from someone else',g=>g.from_user='someone-else'],
 ['unknown approval channel',g=>g.channel='email'],
 ['tap-shaped GO labelled with a channel',g=>{g.channel='telegram-button';g.button='Publish (recommended)'}],
])test('v1.6.43 rejects '+name,()=>{const b=structuredClone(written);mutate(b.proof.publication_approval.fresh_go);assert.throws(()=>validateJevbenchV1643Bundle(b))});
test('v1.6.42 archive supplement accepts only unchanged carried cells',async()=>{
 const t=JSON.parse(await readFile(v+'jevbench-v1.6-cohort-topic-cells.json')).draws['v1.6-regular-20261012'];const keys=previous.artifact.systems.map(s=>s.key);
 assert.equal(v1642TopicSupplementBinds(t,'wrong',keys),true);
 for(const change of [c=>delete c.systems[keys.find(k=>c.systems[k])],c=>c.extra_rows={},c=>c.release='v1.6.41']){const c=structuredClone(t);change(c);assert.equal(v1642TopicSupplementBinds(c,'wrong',keys),false)}
});
test('v1.6.43 comparison radars have measured topic and use-case cells',{skip:manifest.review.verdict==='PENDING'},async()=>{
 const b=v1643BoardInput(await readOptionalJevbenchV1643Release());assert.equal(b.categories.revision,'v1.6.43');for(const row of b.artifact.systems.filter(s=>s.ranked))for(const dim of ['topics','usecases'])assert.ok(Object.keys(b.categories.systems[row.key]?.[dim]??{}).length);
});
