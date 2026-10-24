import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, readJevbenchV161Release } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact, withLiveCategoryCells } from './jevbench-categories.mjs';
import { readCohortTopicCells, withCohortCategoryCells } from './jevbench-cohort-categories.mjs';
import { readOptionalJevbenchV1642Release } from './jevbench-v1642-release.mjs';
export const V1643_ROOT = 'data/raw/benchmarks/jevbench/v1.6';
export const V1643_MANIFEST = `${V1643_ROOT}/jevbench-v1.6.43-publication.json`;
export const V1643_NEW_KEYS = /*KEYS*/;
export const V1643_FILE_KEYS = ['results','categories','proof','history','history-carry'];
export const V1643_EXPECTED_HASHES = /*HASHES*/;
export const V1643_ROW_SPEC = /*ROWS*/;
export const V1643_REFRESHED_PREVIEW = /*PREVIEW*/;
export const V1643_REFRESHED_PREVIEW_SHA256 = /*PREVIEW_SHA*/;
export const V1643_FRESH_GO_RECEIPT_SHA256 = /*GO_RECEIPT_SHA*/;
export const V1643_PRICING_MODULE_SHA256 = 'aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7';
export const V1643_FIXED_G_MED = 9.839526770355711;
export const V1643_COST_CAP = 0.06459465517241379;
export const V1643_RANKED_NEW_KEYS = V1643_NEW_KEYS.filter(k=>V1643_ROW_SPEC[k].ranked);
export const V1643_UNRANKED_NEW_KEYS = V1643_NEW_KEYS.filter(k=>!V1643_ROW_SPEC[k].ranked);
const hash = b=>createHash('sha256').update(b).digest('hex');
const fail = x=>{throw new Error(`JevBench v1.6.43: ${x}`)};
const same = (a,b,x)=>{if(!isDeepStrictEqual(a,b))fail(x)};
const stripRank = a=>{const b=structuredClone(a);delete b.rank;delete b.ranks;return b};
const parseCanonicalUtc = value=>{
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value))return null;
 const ms=Date.parse(value);if(!Number.isFinite(ms))return null;
 return new Date(ms).toISOString().replace(/\.000Z$/,'Z')===value?ms:null;
};
const publicOnly = a=>{if(Array.isArray(a))return a.forEach(publicOnly);if(!a||typeof a!=='object')return;for(const [k,v] of Object.entries(a)){if(/^(task_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret)$/i.test(k))fail('item-level/private field');publicOnly(v)}};
export function validateJevbenchV1643Bundle({manifest,artifact,categories,proof,previous,previousManifestSha256}) {
 for(const v of [manifest,artifact,categories,proof])publicOnly(v);
 if(manifest.revision!=='v1.6.43'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('publication identity');
 if(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!/^[a-f0-9]{64}$/.test(manifest.review.receipt_sha256??''))fail('independent release review');
 if(previous?.manifest.revision!=='v1.6.42')fail('validated predecessor');
 same(manifest.predecessor,{revision:'v1.6.42',publication_sha256:previousManifestSha256},'predecessor binding');
 for(const k of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[k],previous.manifest[k],`history ${k}`);
 for(const f of V1643_FILE_KEYS){same(manifest.files[f]?.path,`${V1643_ROOT}/jevbench-v1.6.43-${f}.json`,'path '+f);same(manifest.files[f]?.sha256,V1643_EXPECTED_HASHES[f],'pinned release bytes '+f)}
 validateJevbenchV16Release({...artifact,revision:'v1.6.1',run_kind:'scheduled-refresh'},'v1.6.1');
 if(artifact.revision!=='v1.6.43'||artifact.G_med!==V1643_FIXED_G_MED)fail('release/frozen median');
 const by=new Map(artifact.systems.map(s=>[s.key,s]));
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1643_NEW_KEYS].sort(),'roster');
 for(const p of previous.artifact.systems){same(stripRank(by.get(p.key)),stripRank(p),'carried row '+p.key);same(categories.systems[p.key],previous.categories.systems[p.key],'carried category '+p.key)}
 for(const k of V1643_NEW_KEYS)same(by.get(k),V1643_ROW_SPEC[k],'new row '+k);
 for(const m of ['A','B','C','capability']){
  const ord=artifact.board[m].order;const rankable=artifact.systems.filter(s=>s.ranked);same([...ord].sort(),rankable.map(s=>s.key).sort(),'board membership '+m);
  const val=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];
  ord.forEach((k,i)=>{if(by.get(k).ranks[m]!==i+1||(m==='A'&&by.get(k).rank!==i+1))fail('rank '+k);if(i&&val(ord[i-1])<val(k))fail('sort '+m)});
 }
 if(categories.revision!=='v1.6.43'||categories.provisional!==false||categories.results_sha256!==manifest.files.results.sha256||categories.source_results_sha256!==artifact.source_sha256)fail('category binding');
 validateCategoryArtifact(categories,['families','usecases','languages']);
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V1643_NEW_KEYS].sort(),'category coverage');
 if(proof.revision!=='v1.6.43')fail('proof revision');
 if(proof.pricing_module_sha256!==V1643_PRICING_MODULE_SHA256)fail('pricing module pin');
 for(const k of V1643_NEW_KEYS){const p=proof.new_rows[k];const s=by.get(k);if(p.raw_sha256!==proof.raw_sha256[k]||p.usd_per_1000!==s.cost.usd_per_1000||p.ranked!==s.ranked||p.paid_fast_lane!==false)fail('proof row '+k)}
 const a=proof.publication_approval;
 if(Object.hasOwn(proof,'refreshed_preview_approval')||Object.hasOwn(proof,'refreshed_preview_go_card'))fail('stale inherited preview authority');
 same(proof.refreshed_preview,V1643_REFRESHED_PREVIEW,'refreshed preview asset binding');
 same(a?.refreshed_preview,V1643_REFRESHED_PREVIEW,'approval preview binding');
 if(a?.status!=='PASS')fail('publication authority PENDING');
 if(a.fresh_baseline!=='v1.6.42'||a.top_five_effect!=='changes')fail('fresh approval baseline/effect');
 same(a.top_five_changed_by,V1643_NEW_KEYS,'top-five causes');
 same(a.historical_preview,{card_id:'18406',baseline:'v1.6.40',button:'Publish (recommended)',approved_at_utc:'2026-10-23T16:40:00Z'},'historical approval record');
 const go=a.fresh_go;
 const sentAt=parseCanonicalUtc(V1643_REFRESHED_PREVIEW.sent_at_utc);
 const answerAt=parseCanonicalUtc(go?.answered_at_utc);
 if(!V1643_REFRESHED_PREVIEW.sent_card_id||!/^\d+$/.test(V1643_REFRESHED_PREVIEW.sent_card_id)||!sentAt||!/^([a-f0-9]{64})$/.test(V1643_REFRESHED_PREVIEW.dispatch_receipt_sha256??'')||!/^([a-f0-9]{64})$/.test(V1643_REFRESHED_PREVIEW.dispatch_action_sha256??''))fail('fresh request dispatch receipt');
 if(!go||go.card_id!==V1643_REFRESHED_PREVIEW.sent_card_id||go.reply_to_card_id!==V1643_REFRESHED_PREVIEW.sent_card_id||go.from_user!=='florian'||typeof go.answer_event_id!=='string'||!go.answer_event_id||!(go.channel==='written'?(go.button===null&&go.decisions_key==='subq-snap-v1643-go'&&go.answer_event_id==='decisions:subq-snap-v1643-go'):(go.channel===undefined&&go.button==='Publish (recommended)'))||!answerAt||answerAt<sentAt||answerAt>Date.now())fail('fresh approval answer');
 if(go.dispatch_receipt_sha256!==V1643_REFRESHED_PREVIEW.dispatch_receipt_sha256||go.dispatch_action_sha256!==V1643_REFRESHED_PREVIEW.dispatch_action_sha256||!/^([a-f0-9]{64})$/.test(go.answer_receipt_sha256??'')||go.answer_receipt_sha256!==V1643_FRESH_GO_RECEIPT_SHA256)fail('fresh answer receipt binding');
 if(go.preview_binding_sha256!==V1643_REFRESHED_PREVIEW_SHA256)fail('fresh approval is not bound to the refreshed preview');
 if(JSON.stringify(proof).includes('PLACEHOLDER'))fail('approval placeholder');
 if(!proof.authority.startsWith(previous.proof.authority+' NEW in v1.6.43:'))fail('inherited authority unchanged');
 const note=artifact.measurement_notes.filter(n=>n.startsWith('Publication of v1.6.43:'));
 if(note.length!==1||!note[0].includes('top-five comparison uses the v1.6.42 baseline')||!note[0].includes('current approval is recorded in the proof')||!note[0].includes('release review remains a separate gate'))fail('public approval note');
 for(const k of V1643_NEW_KEYS){
  const text=by.get(k).underlying+' '+by.get(k).endpoint_condition+' '+by.get(k).cost.basis;
  if(/18406|board|\/home\//i.test(text))fail('internal provenance in row');
 }
 return {manifest,artifact,categories,proof};
}
async function load(path,root){const bytes=await readFile(`${root}/${path}`);return {value:JSON.parse(bytes.toString()),bytes,sha256:hash(bytes)}}
export async function readOptionalJevbenchV1643Release(root=process.cwd()){
 let pub;try{pub=await load(V1643_MANIFEST,root)}catch(e){if(e.code==='ENOENT')return null;throw e}
 const previous=await readOptionalJevbenchV1642Release(root);if(!previous)fail('missing predecessor');
 const pm=await load(`${V1643_ROOT}/jevbench-v1.6.42-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V1643_FILE_KEYS.map(async f=>[f,await load(`${V1643_ROOT}/jevbench-v1.6.43-${f}.json`,root)])));
 for(const f of V1643_FILE_KEYS)if(b[f].sha256!==pub.value.files[f]?.sha256)fail('bytes hash '+f);
 if(b.history.sha256!==previous.historical.sha256||b['history-carry'].sha256!==previous.historical.carrySha256)fail('immutable history');
 validateJevbenchV1643Bundle({manifest:pub.value,artifact:b.results.value,categories:b.categories.value,proof:b.proof.value,previous,previousManifestSha256:pm.sha256});
 // Archive comparisons use each row's stored cells, including the ruled topic/use-case supplement.
 // Keep the two restated original-draw rows' original cells; fresh rows replace any old base cells.
 const [base, topicCells] = await Promise.all([readJevbenchV161Release(root), readCohortTopicCells(root)]);
 const drawId='v1.6-regular-20261012', t=topicCells.draws[drawId];
 if(t?.release!=='v1.6.43'||t.results_sha256!==b.results.sha256)fail('comparison topic/results binding');
 const baseCats=withLiveCategoryCells(base.categories), freshKeys=new Set(Object.keys(b.categories.value.systems));
 const kept=Object.fromEntries(Object.entries(baseCats.systems).filter(([k])=>!freshKeys.has(k)));
 const cohort={rows:b.results.value.systems.map(row=>({row,draw:{id:drawId}})),categories:[{draw:drawId,categories:b.categories.value}]};
 const mergedCats=withCohortCategoryCells({...baseCats,systems:kept},cohort,topicCells);
 const visible=new Set(b.results.value.systems.map(s=>s.key));
 // Preserve the overlay builder's WeakMap-bound per-row sample limits.
 const comparisonCategories=mergedCats;
 comparisonCategories.revision='v1.6.43';
 comparisonCategories.systems=Object.fromEntries(Object.entries(mergedCats.systems).filter(([k])=>visible.has(k)));
 for(const s of b.results.value.systems.filter(s=>s.ranked))for(const dim of ['topics','usecases'])if(!Object.keys(comparisonCategories.systems[s.key]?.[dim]??{}).length)fail('missing comparison cells '+s.key+'.'+dim);
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,comparisonCategories,comparisonCategoriesSha256:hash(JSON.stringify(comparisonCategories)),proof:b.proof.value,proofSha256:b.proof.sha256,manifest:pub.value,historical:previous.historical};
}
export async function hasPublishedJevbenchV1643Release(root=process.cwd(),log=console.error){try{return Boolean(await readOptionalJevbenchV1643Release(root))}catch{log('JevBench v1.6.43 navigation omitted: publication validation failed');return false}}
export function v1643BoardInput(release){return {artifact:release.artifact,categories:release.comparisonCategories??release.categories,categoriesSha256:release.comparisonCategoriesSha256??release.categoriesSha256}}
