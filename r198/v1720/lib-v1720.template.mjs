// Lychee paid-priority result; frozen d1012 scoring and original custody binding.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {readOptionalJevbenchV1719Release} from './jevbench-v1719-release.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';
import {validateKnowlineDecisiveness} from './jevbench-knowline-diagnostic.mjs';
export const V1720_ROOT='data/raw/benchmarks/jevbench/v1.7';
export const V1720_MANIFEST=`${V1720_ROOT}/jevbench-v1.7.20-publication.json`;
export const V1720_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V1720_EXPECTED_HASHES=/*HASHES*/;
export const V1720_NEW_ROWS=/*NEWROWS*/;
export const V1720_NEW_ROW_BOUNDS=/*BOUNDS*/;
export const V1720_NEW_CELLS=/*CELLS*/;
export const V1720_PROOF=/*PROOF*/;
export const V1720_NEW_KEYS=Object.keys(V1720_NEW_ROWS).sort();
export const V1720_APPROVAL_STATUS='GO (standing; no top-five change)';
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=m=>{throw Error('JevBench v1.7.20: '+m)};
const same=(a,b,m)=>{if(!isDeepStrictEqual(a,b))fail(m)};
const hex=s=>/^[a-f0-9]{64}$/.test(s??'');
function publicOnly(x){if(!x||typeof x!=='object')return;for(const [k,v] of Object.entries(x)){if(/^(task_id|opaque_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret)$/i.test(k))fail('private field');publicOnly(v)}}
export function validateJevbenchV1720Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256},{candidate=false}={}){
 for(const x of [manifest,artifact,categories,carry,proof])publicOnly(x);
 if(manifest.revision!=='v1.7.20'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('manifest identity');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!hex(manifest.review.receipt_sha256)))fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.7.19',publication_sha256:previousManifestSha256},'predecessor binding');
 if(previous?.artifact.revision!=='v1.7.19'||(!candidate&&previous.manifest.review.verdict!=='PASS'))fail('validated predecessor');
 for(const f of V1720_FILE_KEYS){same(manifest.files[f]?.path,`${V1720_ROOT}/jevbench-v1.7.20-${f}.json`,'file path '+f);same(manifest.files[f]?.sha256,V1720_EXPECTED_HASHES[f],'pinned bytes '+f)}
 for(const f of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[f],previous.manifest[f],'history '+f);
 if(artifact.revision!=='v1.7.20'||artifact.run_kind!=='same-draw-addendum'||artifact.provisional!==false)fail('artifact identity');
 same(artifact.method,previous.artifact.method,'method');same(artifact.G_med,previous.artifact.G_med,'median');
 const rows=artifact.systems,by=new Map(rows.map(s=>[s.key,s]));if(by.size!==rows.length)fail('duplicate key');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1720_NEW_KEYS].sort(),'roster');
 if(artifact.roster_count!==rows.length||artifact.n_ranked!==rows.filter(s=>s.ranked).length)fail('counts');
 const changes={};
 for(const p of previous.artifact.systems){
  const s=by.get(p.key),a={...s},b={...p};delete a.rank;delete a.ranks;delete b.rank;delete b.ranks;same(a,b,'carried row '+p.key);
  same(categories.systems[p.key],previous.categories.systems[p.key],'carried cells '+p.key);same(categories.lanes[p.key],previous.categories.lanes[p.key],'carried lane '+p.key);
  const diff={};for(const f of ['rank','ranks'])if(!isDeepStrictEqual(s[f],p[f]))diff[f]={before:p[f],after:s[f]};if(Object.keys(diff).length)changes[p.key]=diff;
 }
 for(const m of ['A','B','C','capability']){
  // Independent insertion starts from the predecessor order, retaining its ties and relative order.
  const val=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];
  const order=[...previous.artifact.board[m].order];
  for(const k of [...V1720_NEW_KEYS].sort((a,b)=>val(b)-val(a)||a.localeCompare(b))){const i=order.findIndex(p=>val(p)<val(k));order.splice(i<0?order.length:i,0,k)}
  same(artifact.board[m].order,order,'independent insertion '+m);
  same(order.filter(k=>!V1720_NEW_KEYS.includes(k)),previous.artifact.board[m].order,'relative order '+m);
  order.forEach((k,i)=>{if(by.get(k).ranks[m]!==i+1||(m==='A'&&by.get(k).rank!==i+1))fail('rank '+m+' '+k)});
 }
 same(proof.exceptions,changes,'rank changes pinned by value');same(proof.carried_rows_equal_except,['rank','ranks'],'rank-only allowance');
 same(proof,V1720_PROOF,'proof pins');same(proof.predecessor,manifest.predecessor,'proof predecessor');
 if(proof.carried_rows!==previous.artifact.systems.length)fail('carried count');
 for(const k of V1720_NEW_KEYS){const s=by.get(k);validateKnowlineDecisiveness(s);
  if(!s.ranked||!s.paid_fast_lane||s.listing!=='ranked_over_cap'||s.cost.kind!=='estimate'||s.cost.usd_per_1000<=0.06459465517241379)fail('ranked paid over-cap estimate');
  if(!s.disclosure.includes("Measured on 13 Oct 2026 as a paid priority evaluation; published at the customer's request.")||!s.licence.includes('non-commercial use only'))fail('paid consent or licence disclosure');
  same(s,V1720_NEW_ROWS[k],'new row '+k);same(categories.systems[k],V1720_NEW_CELLS[k],'new cells '+k);same(categories.lanes[k],'selfhosted','new lane');

  for(const dim of ['families','languages','topics','usecases'])if(!Object.keys(categories.systems[k][dim]??{}).length)fail('missing '+dim);
 }
 for(const s of rows)validateKnowlineDecisiveness(s);
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V1720_NEW_KEYS].sort(),'category roster');
 if(categories.revision!=='v1.7.20'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 same(carry,previous.carry,'immutable carry');
 same(artifact.addendum.new_keys,V1720_NEW_KEYS,'new keys');same(artifact.addendum.repriced_keys,[],'no recost');
 if(proof.publication_approval.status!==V1720_APPROVAL_STATUS||proof.publication_approval.top_five_effect!=='unchanged'||proof.publication_approval.fresh_baseline!=='v1.7.19'||proof.publication_approval.top_five_preview.sha256!==proof.topfive_diff_sha256)fail('approval');
 return true;
}
async function load(p,root) { const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)}; }
export async function readOptionalJevbenchV1720Release(root=process.cwd()) {
 let publication;
 try {publication=await load(V1720_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV1719Release(root);
 if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V1720_ROOT}/jevbench-v1.7.19-publication.json`,root);
 const bundle=Object.fromEntries(await Promise.all(V1720_FILE_KEYS.map(async k=>[k,await load(`${V1720_ROOT}/jevbench-v1.7.20-${k}.json`,root)])));
 for(const [k,v] of Object.entries(bundle))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['history','history-carry','carry'])if(bundle[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k+' bytes');
 validateJevbenchV1720Bundle({manifest:publication.value,artifact:bundle.results.value,categories:bundle.categories.value,carry:bundle.carry.value,proof:bundle.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:bundle.results.value,bytes:bundle.results.bytes,sha256:bundle.results.sha256,categories:bundle.categories.value,categoriesSha256:bundle.categories.sha256,carry:bundle.carry.value,carrySha256:bundle.carry.sha256,proof:bundle.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1720ForBoard(root=process.cwd()) {
 let p;try{p=(await load(V1720_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(p?.review?.verdict!=='PASS')return null;
 return readOptionalJevbenchV1720Release(root);
}
export async function hasPublishedJevbenchV1720Release(root=process.cwd(),log=console.error) {
 try{return Boolean(await readJevbenchV1720ForBoard(root));}catch{log('JevBench v1.7.20 navigation omitted: publication validation failed');return false;}
}
export function v1720BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV1720Addendum(chain,release) {
 const bounds={...apiFullAddendumCategoryBounds(chain.categories),...V1720_NEW_ROW_BOUNDS};
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.7.20',v1720_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.7.20',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
