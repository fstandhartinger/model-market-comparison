import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, readJevbenchV161Release } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact, withLiveCategoryCells } from './jevbench-categories.mjs';
import { readCohortTopicCells, withCohortCategoryCells } from './jevbench-cohort-categories.mjs';
import { readOptionalJevbenchV1639Release } from './jevbench-v1639-release.mjs';
export const V1640_ROOT = 'data/raw/benchmarks/jevbench/v1.6';
export const V1640_MANIFEST = `${V1640_ROOT}/jevbench-v1.6.40-publication.json`;
export const V1640_NEW_KEYS = /*KEYS*/;
export const V1640_FILE_KEYS = ['results','categories','proof','history','history-carry'];
export const V1640_EXPECTED_HASHES = /*HASHES*/;
export const V1640_ROW_SPEC = /*ROWS*/;
export const V1640_PRICING_MODULE_SHA256 = 'aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7';
export const V1640_FIXED_G_MED = 9.839526770355711;
export const V1640_COST_CAP = 0.06459465517241379;
export const V1640_RANKED_NEW_KEYS = V1640_NEW_KEYS.filter(k=>V1640_ROW_SPEC[k].ranked);
export const V1640_UNRANKED_NEW_KEYS = V1640_NEW_KEYS.filter(k=>!V1640_ROW_SPEC[k].ranked);
const hash = b=>createHash('sha256').update(b).digest('hex');
const fail = x=>{throw new Error(`JevBench v1.6.40: ${x}`)};
const same = (a,b,x)=>{if(!isDeepStrictEqual(a,b))fail(x)};
const stripRank = a=>{const b=structuredClone(a);delete b.rank;delete b.ranks;return b};
const publicOnly = a=>{if(Array.isArray(a))return a.forEach(publicOnly);if(!a||typeof a!=='object')return;for(const [k,v] of Object.entries(a)){if(/^(task_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret)$/i.test(k))fail('item-level/private field');publicOnly(v)}};
export function validateJevbenchV1640Bundle({manifest,artifact,categories,proof,previous,previousManifestSha256}) {
 for(const v of [manifest,artifact,categories,proof])publicOnly(v);
 if(manifest.revision!=='v1.6.40'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('publication identity');
 if(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!/^[a-f0-9]{64}$/.test(manifest.review.receipt_sha256??''))fail('independent release review');
 if(previous?.manifest.revision!=='v1.6.39')fail('validated predecessor');
 same(manifest.predecessor,{revision:'v1.6.39',publication_sha256:previousManifestSha256},'predecessor binding');
 for(const k of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[k],previous.manifest[k],`history ${k}`);
 for(const f of V1640_FILE_KEYS){same(manifest.files[f]?.path,`${V1640_ROOT}/jevbench-v1.6.40-${f}.json`,'path '+f);same(manifest.files[f]?.sha256,V1640_EXPECTED_HASHES[f],'pinned release bytes '+f)}
 validateJevbenchV16Release({...artifact,revision:'v1.6.1',run_kind:'scheduled-refresh'},'v1.6.1');
 if(artifact.revision!=='v1.6.40'||artifact.G_med!==V1640_FIXED_G_MED)fail('release/frozen median');
 const by=new Map(artifact.systems.map(s=>[s.key,s]));
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1640_NEW_KEYS].sort(),'roster');
 for(const p of previous.artifact.systems){same(stripRank(by.get(p.key)),stripRank(p),'carried row '+p.key);same(categories.systems[p.key],previous.categories.systems[p.key],'carried category '+p.key)}
 for(const k of V1640_NEW_KEYS)same(by.get(k),V1640_ROW_SPEC[k],'new row '+k);
 for(const m of ['A','B','C','capability']){
  const ord=artifact.board[m].order;const rankable=artifact.systems.filter(s=>s.ranked);same([...ord].sort(),rankable.map(s=>s.key).sort(),'board membership '+m);
  const val=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];
  ord.forEach((k,i)=>{if(by.get(k).ranks[m]!==i+1||(m==='A'&&by.get(k).rank!==i+1))fail('rank '+k);if(i&&val(ord[i-1])<val(k))fail('sort '+m)});
 }
 if(categories.revision!=='v1.6.40'||categories.provisional!==false||categories.results_sha256!==manifest.files.results.sha256||categories.source_results_sha256!==artifact.source_sha256)fail('category binding');
 validateCategoryArtifact(categories,['families','usecases','languages']);
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V1640_NEW_KEYS].sort(),'category coverage');
 if(proof.revision!=='v1.6.40')fail('proof revision');
 if(proof.pricing_module_sha256!==V1640_PRICING_MODULE_SHA256)fail('pricing module pin');
 for(const k of V1640_NEW_KEYS){const p=proof.new_rows[k];const s=by.get(k);if(p.raw_sha256!==proof.raw_sha256[k]||p.usd_per_1000!==s.cost.usd_per_1000||p.ranked!==s.ranked||p.hosted_api!==true||p.scored_items!==1497||p.rows!==1497)fail('proof row '+k)}
 const a=proof.publication_approval;if(a.release_go?.decision!=='glide-api-release-go'||a.release_go.date!=='2026-10-22')fail('release GO authority');
 if(JSON.stringify(proof).includes('PLACEHOLDER')||JSON.stringify(artifact).includes('PLACEHOLDER'))fail('approval placeholder not filled');
 if(typeof proof.authority!=='string'||!proof.authority.startsWith(previous.proof.authority+' NEW in v1.6.40:'))fail('inherited authority unchanged');
 const newAuthority=proof.authority.slice(previous.proof.authority.length);
 const notes=artifact.measurement_notes.filter(n=>n.startsWith('Publication of v1.6.40:'));if(notes.length!==1)fail('public note must describe how the approval arrived');const note=notes[0];
 const claimsCard=/Telegram card #\d/.test(note)||/selected "[^"]*" on Telegram card/.test(note);
 if(claimsCard||a.top_five_preview!==null||a.button_tap!==false)fail('no-card approval provenance');
 if(a.top_five_effect==='none'){
  if('top_five_changed_by' in a||'top_five_authority' in a||!note.includes('no top-five list changes'))fail('no-card approval provenance');
 }else{
  const ch=a.top_five_changed_by;if(a.top_five_effect!=='changes'||!Array.isArray(ch)||!ch.length||!ch.every(k=>V1640_NEW_KEYS.includes(k)))fail('approval and top-five effect disagree');
  if(a.top_five_authority!=="Florian's release GO glide-api-release-go (22 Oct 2026) covers any top-five move; no top-five preview card sent, none claimed"||!note.includes("Florian's release instruction for this row (22 Oct 2026) covers any top-five move")||!newAuthority.includes('Publication authority: Florian\'s release GO for the hosted GLiDE row (glide-api-release-go, 22 Oct 2026) covers any top-five move; no Telegram preview card was sent'))fail('release GO binding');
 }
 same(Object.keys(a.asks).sort(),V1640_NEW_KEYS,'release asks');
 return {manifest,artifact,categories,proof};
}
async function load(path,root){const bytes=await readFile(`${root}/${path}`);return {value:JSON.parse(bytes.toString()),bytes,sha256:hash(bytes)}}
export async function readOptionalJevbenchV1640Release(root=process.cwd()){
 let pub;try{pub=await load(V1640_MANIFEST,root)}catch(e){if(e.code==='ENOENT')return null;throw e}
 const previous=await readOptionalJevbenchV1639Release(root);if(!previous)fail('missing predecessor');
 const pm=await load(`${V1640_ROOT}/jevbench-v1.6.39-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V1640_FILE_KEYS.map(async f=>[f,await load(`${V1640_ROOT}/jevbench-v1.6.40-${f}.json`,root)])));
 for(const f of V1640_FILE_KEYS)if(b[f].sha256!==pub.value.files[f]?.sha256)fail('bytes hash '+f);
 if(b.history.sha256!==previous.historical.sha256||b['history-carry'].sha256!==previous.historical.carrySha256)fail('immutable history');
 validateJevbenchV1640Bundle({manifest:pub.value,artifact:b.results.value,categories:b.categories.value,proof:b.proof.value,previous,previousManifestSha256:pm.sha256});
 // Archive comparisons use each row's stored cells, including the ruled topic/use-case supplement.
 // Keep the two restated original-draw rows' original cells; fresh rows replace any old base cells.
 const [base, topicCells] = await Promise.all([readJevbenchV161Release(root), readCohortTopicCells(root)]);
 const drawId='v1.6-regular-20261012', t=topicCells.draws[drawId];
 if(t?.release!=='v1.6.40'||t.results_sha256!==b.results.sha256)fail('comparison topic/results binding');
 const baseCats=withLiveCategoryCells(base.categories), freshKeys=new Set(Object.keys(b.categories.value.systems));
 const kept=Object.fromEntries(Object.entries(baseCats.systems).filter(([k])=>!freshKeys.has(k)));
 const cohort={rows:b.results.value.systems.map(row=>({row,draw:{id:drawId}})),categories:[{draw:drawId,categories:b.categories.value}]};
 const mergedCats=withCohortCategoryCells({...baseCats,systems:kept},cohort,topicCells);
 const visible=new Set(b.results.value.systems.map(s=>s.key));
 // Preserve the overlay builder's WeakMap-bound per-row sample limits.
 const comparisonCategories=mergedCats;
 comparisonCategories.revision='v1.6.40';
 comparisonCategories.systems=Object.fromEntries(Object.entries(mergedCats.systems).filter(([k])=>visible.has(k)));
 for(const s of b.results.value.systems.filter(s=>s.ranked))for(const dim of ['topics','usecases'])if(!Object.keys(comparisonCategories.systems[s.key]?.[dim]??{}).length)fail('missing comparison cells '+s.key+'.'+dim);
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,comparisonCategories,comparisonCategoriesSha256:hash(JSON.stringify(comparisonCategories)),proof:b.proof.value,proofSha256:b.proof.sha256,manifest:pub.value,historical:previous.historical};
}
export async function hasPublishedJevbenchV1640Release(root=process.cwd(),log=console.error){try{return Boolean(await readOptionalJevbenchV1640Release(root))}catch{log('JevBench v1.6.40 navigation omitted: publication validation failed');return false}}
export function v1640BoardInput(release){return {artifact:release.artifact,categories:release.comparisonCategories??release.categories,categoriesSha256:release.comparisonCategoriesSha256??release.categoriesSha256}}
