import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, readJevbenchV161Release } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact, withLiveCategoryCells } from './jevbench-categories.mjs';
import { readCohortTopicCells, withCohortCategoryCells } from './jevbench-cohort-categories.mjs';
import { readOptionalJevbenchV1637Release } from './jevbench-v1637-release.mjs';
export const V1638_ROOT = 'data/raw/benchmarks/jevbench/v1.6';
export const V1638_MANIFEST = `${V1638_ROOT}/jevbench-v1.6.38-publication.json`;
export const V1638_NEW_KEYS = ['drex-max','iota-decide-4b','launchables-myles-g-12b'];
export const V1638_FILE_KEYS = ['results','categories','proof','history','history-carry'];
export const V1638_EXPECTED_HASHES = /*HASHES*/;
export const V1638_ROW_SPEC = /*ROWS*/;
export const V1638_PRICING_MODULE_SHA256 = '1f4d1f7b1ce97ab27b938043444b9c2757e4a9dbecc799a803122588401f5bf1';
export const V1638_FIXED_G_MED = 9.839526770355711;
export const V1638_COST_CAP = 0.06459465517241379;
export const V1638_RANKED_NEW_KEYS = V1638_NEW_KEYS.filter(k=>V1638_ROW_SPEC[k].ranked);
export const V1638_UNRANKED_NEW_KEYS = V1638_NEW_KEYS.filter(k=>!V1638_ROW_SPEC[k].ranked);
const hash = b=>createHash('sha256').update(b).digest('hex');
const fail = x=>{throw new Error(`JevBench v1.6.38: ${x}`)};
const same = (a,b,x)=>{if(!isDeepStrictEqual(a,b))fail(x)};
const stripRank = a=>{const b=structuredClone(a);delete b.rank;delete b.ranks;return b};
const publicOnly = a=>{if(Array.isArray(a))return a.forEach(publicOnly);if(!a||typeof a!=='object')return;for(const [k,v] of Object.entries(a)){if(/^(task_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret)$/i.test(k))fail('item-level/private field');publicOnly(v)}};
export function validateJevbenchV1638Bundle({manifest,artifact,categories,proof,previous,previousManifestSha256}) {
 for(const v of [manifest,artifact,categories,proof])publicOnly(v);
 if(manifest.revision!=='v1.6.38'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('publication identity');
 if(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!/^[a-f0-9]{64}$/.test(manifest.review.receipt_sha256??''))fail('independent release review');
 if(previous?.manifest.revision!=='v1.6.37')fail('validated predecessor');
 same(manifest.predecessor,{revision:'v1.6.37',publication_sha256:previousManifestSha256},'predecessor binding');
 for(const k of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[k],previous.manifest[k],`history ${k}`);
 for(const f of V1638_FILE_KEYS){same(manifest.files[f]?.path,`${V1638_ROOT}/jevbench-v1.6.38-${f}.json`,'path '+f);same(manifest.files[f]?.sha256,V1638_EXPECTED_HASHES[f],'pinned release bytes '+f)}
 validateJevbenchV16Release({...artifact,revision:'v1.6.1',run_kind:'scheduled-refresh'},'v1.6.1');
 if(artifact.revision!=='v1.6.38'||artifact.G_med!==V1638_FIXED_G_MED)fail('release/frozen median');
 const by=new Map(artifact.systems.map(s=>[s.key,s]));
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1638_NEW_KEYS].sort(),'roster');
 for(const p of previous.artifact.systems){same(stripRank(by.get(p.key)),stripRank(p),'carried row '+p.key);same(categories.systems[p.key],previous.categories.systems[p.key],'carried category '+p.key)}
 for(const k of V1638_NEW_KEYS)same(by.get(k),V1638_ROW_SPEC[k],'new row '+k);
 for(const m of ['A','B','C','capability']){
  const ord=artifact.board[m].order;const rankable=artifact.systems.filter(s=>s.ranked);same([...ord].sort(),rankable.map(s=>s.key).sort(),'board membership '+m);
  const val=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];
  ord.forEach((k,i)=>{if(by.get(k).ranks[m]!==i+1||(m==='A'&&by.get(k).rank!==i+1))fail('rank '+k);if(i&&val(ord[i-1])<val(k))fail('sort '+m)});
 }
 if(categories.revision!=='v1.6.38'||categories.provisional!==false||categories.results_sha256!==manifest.files.results.sha256||categories.source_results_sha256!==artifact.source_sha256)fail('category binding');
 validateCategoryArtifact(categories,['families','usecases','languages']);
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V1638_NEW_KEYS].sort(),'category coverage');
 if(proof.revision!=='v1.6.38')fail('proof revision');
 for(const k of V1638_NEW_KEYS){const p=proof.new_rows[k];const s=by.get(k);if(p.raw_sha256!==proof.raw_sha256[k]||p.usd_per_1000!==s.cost.usd_per_1000||p.ranked!==s.ranked||p.paid_fast_lane!==true||p.over_10s!==0)fail('proof row '+k)}
 const a=proof.publication_approval;if(a.paid_fast_lane?.rule!=='paid fast-lane publication exception'||a.top_five_preview!==null||a.button_tap!==false)fail('paid publication authority');
 same(Object.keys(a.paid_fast_lane.orders).sort(),V1638_NEW_KEYS,'paid orders');
 return {manifest,artifact,categories,proof};
}
async function load(path,root){const bytes=await readFile(`${root}/${path}`);return {value:JSON.parse(bytes.toString()),bytes,sha256:hash(bytes)}}
export async function readOptionalJevbenchV1638Release(root=process.cwd()){
 let pub;try{pub=await load(V1638_MANIFEST,root)}catch(e){if(e.code==='ENOENT')return null;throw e}
 const previous=await readOptionalJevbenchV1637Release(root);if(!previous)fail('missing predecessor');
 const pm=await load(`${V1638_ROOT}/jevbench-v1.6.37-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V1638_FILE_KEYS.map(async f=>[f,await load(`${V1638_ROOT}/jevbench-v1.6.38-${f}.json`,root)])));
 for(const f of V1638_FILE_KEYS)if(b[f].sha256!==pub.value.files[f]?.sha256)fail('bytes hash '+f);
 if(b.history.sha256!==previous.historical.sha256||b['history-carry'].sha256!==previous.historical.carrySha256)fail('immutable history');
 validateJevbenchV1638Bundle({manifest:pub.value,artifact:b.results.value,categories:b.categories.value,proof:b.proof.value,previous,previousManifestSha256:pm.sha256});
 // Archive comparisons use each row's stored cells, including the ruled topic/use-case supplement.
 // Keep the two restated original-draw rows' original cells; fresh rows replace any old base cells.
 const [base, topicCells] = await Promise.all([readJevbenchV161Release(root), readCohortTopicCells(root)]);
 const drawId='v1.6-regular-20261012', t=topicCells.draws[drawId];
 if(t?.release!=='v1.6.38'||t.results_sha256!==b.results.sha256)fail('comparison topic/results binding');
 const baseCats=withLiveCategoryCells(base.categories), freshKeys=new Set(Object.keys(b.categories.value.systems));
 const kept=Object.fromEntries(Object.entries(baseCats.systems).filter(([k])=>!freshKeys.has(k)));
 const cohort={rows:b.results.value.systems.map(row=>({row,draw:{id:drawId}})),categories:[{draw:drawId,categories:b.categories.value}]};
 const mergedCats=withCohortCategoryCells({...baseCats,systems:kept},cohort,topicCells);
 const visible=new Set(b.results.value.systems.map(s=>s.key));
 // Preserve the overlay builder's WeakMap-bound per-row sample limits.
 const comparisonCategories=mergedCats;
 comparisonCategories.revision='v1.6.38';
 comparisonCategories.systems=Object.fromEntries(Object.entries(mergedCats.systems).filter(([k])=>visible.has(k)));
 for(const s of b.results.value.systems.filter(s=>s.ranked))for(const dim of ['topics','usecases'])if(!Object.keys(comparisonCategories.systems[s.key]?.[dim]??{}).length)fail('missing comparison cells '+s.key+'.'+dim);
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,comparisonCategories,comparisonCategoriesSha256:hash(JSON.stringify(comparisonCategories)),proof:b.proof.value,proofSha256:b.proof.sha256,manifest:pub.value,historical:previous.historical};
}
export async function hasPublishedJevbenchV1638Release(root=process.cwd(),log=console.error){try{return Boolean(await readOptionalJevbenchV1638Release(root))}catch{log('JevBench v1.6.38 navigation omitted: publication validation failed');return false}}
export function v1638BoardInput(release){return {artifact:release.artifact,categories:release.comparisonCategories??release.categories,categoriesSha256:release.comparisonCategoriesSha256??release.categoriesSha256}}
