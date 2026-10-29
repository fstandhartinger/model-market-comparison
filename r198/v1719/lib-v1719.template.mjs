// DecisionNode complete hosted measurements, unranked and unpriced; immutable carried rows.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {readOptionalJevbenchV1718Release} from './jevbench-v1718-release.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';

export const V1719_ROOT='data/raw/benchmarks/jevbench/v1.7';
export const V1719_MANIFEST=`${V1719_ROOT}/jevbench-v1.7.19-publication.json`;
export const V1719_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V1719_EXPECTED_HASHES=/*HASHES*/;
export const V1719_NEW_ROWS=/*NEWROWS*/;
export const V1719_NEW_ROW_BOUNDS=/*BOUNDS*/;
export const V1719_NEW_CELLS=/*CELLS*/;
export const V1719_PROOF=/*PROOF*/;
export const V1719_NEW_KEYS=Object.keys(V1719_NEW_ROWS).sort();
export const V1719_APPROVAL_STATUS='GO (standing; no top-five change)';
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=m=>{throw Error('JevBench v1.7.19: '+m)};
const same=(a,b,m)=>{if(!isDeepStrictEqual(a,b))fail(m)};
const hex=s=>/^[a-f0-9]{64}$/.test(s??'');
function publicOnly(x){if(!x||typeof x!=='object')return;for(const [k,v] of Object.entries(x)){if(/^(task_id|opaque_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret)$/i.test(k))fail('private field');publicOnly(v)}}
export function validateJevbenchV1719Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256},{candidate=false}={}){
 for(const x of [manifest,artifact,categories,carry,proof])publicOnly(x);
 if(manifest.revision!=='v1.7.19'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('manifest identity');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!hex(manifest.review.receipt_sha256)))fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.7.18',publication_sha256:previousManifestSha256},'predecessor binding');
 if(previous?.artifact.revision!=='v1.7.18'||(!candidate&&previous.manifest.review.verdict!=='PASS'))fail('validated predecessor');
 for(const f of V1719_FILE_KEYS){same(manifest.files[f]?.path,`${V1719_ROOT}/jevbench-v1.7.19-${f}.json`,'file path '+f);same(manifest.files[f]?.sha256,V1719_EXPECTED_HASHES[f],'pinned bytes '+f)}
 for(const f of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[f],previous.manifest[f],'history '+f);
 if(artifact.revision!=='v1.7.19'||artifact.run_kind!=='same-draw-addendum'||artifact.provisional!==false)fail('artifact identity');
 same(artifact.method,previous.artifact.method,'method');same(artifact.G_med,previous.artifact.G_med,'median');
 const rows=artifact.systems,by=new Map(rows.map(s=>[s.key,s]));if(by.size!==rows.length)fail('duplicate key');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1719_NEW_KEYS].sort(),'roster');
 if(artifact.roster_count!==rows.length||artifact.n_ranked!==rows.filter(s=>s.ranked).length)fail('counts');
 for(const p of previous.artifact.systems){same(by.get(p.key),p,'carried row '+p.key);same(categories.systems[p.key],previous.categories.systems[p.key],'carried cells '+p.key);same(categories.lanes[p.key],previous.categories.lanes[p.key],'carried lane '+p.key);}
 same(artifact.board,previous.artifact.board,'unchanged orders');same(artifact.n_ranked,previous.artifact.n_ranked,'unchanged ranked count');same(proof.exceptions,{},'no carried exceptions');same(proof.carried_rows_equal_except,[],'no carried changes');
 same(proof,V1719_PROOF,'proof pins');same(proof.predecessor,manifest.predecessor,'proof predecessor');
 if(proof.carried_rows!==previous.artifact.systems.length)fail('carried count');
 for(const k of V1719_NEW_KEYS){const s=by.get(k);same(s,V1719_NEW_ROWS[k],'new row '+k);same(categories.systems[k],V1719_NEW_CELLS[k],'new cells '+k);same(categories.lanes[k],'api','new lane');
  if(s.ranked!==false||s.rank!==null||s.listing!=='unranked')fail('unranked '+k);same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks');
  if(s.api_flag!==true||s.endpoint_kind!=='api'||s.provider!=='bynn'||s.paid_fast_lane!==false||s.draw?.id!=='v1.6-regular-20261027'||s.draw.status!=='anchor-runs-pending')fail('hosted identity');
  same(s.draw.offset,{C:0,I:0},'unequated');if(s.v16.n_items!==1500||s.status.rows!==1500||s.status.answered_ok!==1495)fail('denominator');
  if(s.cost.kind!=='unpriced'||s.axes.cost!==null||s.cost.usd_per_1000!==null||s.cost.common_basis!==null||s.jevbench_score!==null||Object.values(s.composite_ci95).some(x=>x!==null))fail('unpriced');
  if(Object.values(s.scores).some(x=>x!==null)||Object.entries(s.views).some(([k,x])=>k!=='Intelligence only'&&x!==null))fail('cost-dependent composites');
  const p=proof.new_rows[k].price_reference;if(p.rankable!==false||p.market_reference!==null||p.market_rates_per_m!==null||p.usd_per_1000!==null||p.counting_list_price!==false)fail('frozen resolve');
  for(const [m,b]of Object.entries(artifact.board))if((b.order??[]).includes(k))fail('ordered '+m);
  if(categories.systems[k].topics!==undefined)fail('fabricated topics');for(const dim of ['families','languages','usecases'])if(!Object.keys(categories.systems[k][dim]??{}).length)fail('missing '+dim);
 }
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V1719_NEW_KEYS].sort(),'category roster');
 if(categories.revision!=='v1.7.19'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 same(carry,previous.carry,'immutable carry');
 same(artifact.addendum.new_keys,V1719_NEW_KEYS,'new keys');same(artifact.addendum.repriced_keys,[],'no recost');
 if(proof.publication_approval.status!==V1719_APPROVAL_STATUS||proof.publication_approval.top_five_effect!=='unchanged'||proof.publication_approval.fresh_baseline!=='v1.7.18'||proof.publication_approval.top_five_preview.sha256!==proof.topfive_diff_sha256)fail('approval');
 return true;
}
async function load(p,root) { const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)}; }
export async function readOptionalJevbenchV1719Release(root=process.cwd()) {
 let publication;
 try {publication=await load(V1719_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV1718Release(root);
 if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V1719_ROOT}/jevbench-v1.7.18-publication.json`,root);
 const bundle=Object.fromEntries(await Promise.all(V1719_FILE_KEYS.map(async k=>[k,await load(`${V1719_ROOT}/jevbench-v1.7.19-${k}.json`,root)])));
 for(const [k,v] of Object.entries(bundle))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['history','history-carry','carry'])if(bundle[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k+' bytes');
 validateJevbenchV1719Bundle({manifest:publication.value,artifact:bundle.results.value,categories:bundle.categories.value,carry:bundle.carry.value,proof:bundle.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:bundle.results.value,bytes:bundle.results.bytes,sha256:bundle.results.sha256,categories:bundle.categories.value,categoriesSha256:bundle.categories.sha256,carry:bundle.carry.value,carrySha256:bundle.carry.sha256,proof:bundle.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1719ForBoard(root=process.cwd()) {
 let p;try{p=(await load(V1719_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(p?.review?.verdict!=='PASS')return null;
 return readOptionalJevbenchV1719Release(root);
}
export async function hasPublishedJevbenchV1719Release(root=process.cwd(),log=console.error) {
 try{return Boolean(await readJevbenchV1719ForBoard(root));}catch{log('JevBench v1.7.19 navigation omitted: publication validation failed');return false;}
}
export function v1719BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV1719Addendum(chain,release) {
 const bounds={...apiFullAddendumCategoryBounds(chain.categories),...V1719_NEW_ROW_BOUNDS};
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.7.19',v1719_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.7.19',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
