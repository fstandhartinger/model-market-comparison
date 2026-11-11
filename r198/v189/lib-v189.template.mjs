// One measured but unranked row; independent review gates every public reader.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual as equal} from 'node:util';
import {readOptionalJevbenchV188Release} from './jevbench-v188-release.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';
export const V189_ROOT='data/raw/benchmarks/jevbench/v1.8';
export const V189_MANIFEST=`${V189_ROOT}/jevbench-v1.8.9-publication.json`;
export const V189_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V189_EXPECTED_HASHES=/*HASHES*/;
export const V189_NEW_ROWS=/*ROWS*/;
export const V189_NEW_ROW_BOUNDS=/*BOUNDS*/;
export const V189_EXPECTED_PROOF=/*PROOF*/;
export const V189_TEXT_EXCEPTIONS=/*TEXT_EXCEPTIONS*/;
export const V189_NEW_CELLS=/*CELLS*/;
export const V189_BREAKDOWN_POLICY=/*SCOPE*/;
export const V189_NEW_KEYS=Object.keys(V189_NEW_ROWS).sort();
export const V189_NOTE='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.';
const fail=m=>{throw Error('JevBench v1.8.9: '+m);};
const same=(a,b,m)=>{if(!equal(a,b))fail(m);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const hex=s=>/^[a-f0-9]{64}$/.test(s??'');
// The publication scope is intentionally narrower than the private scoring record.
export function validateV189PublicText(value){
 if(value?.model_pin!=='MachinePulseAI/karpo-decision-31B@221bf1a011093807e29b77859f09499c2c365e34')fail('pinned weights');
 const forbidden=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:worker|custody|custodian|deputy|Florian|CoS)\b|board #|order.id|fastlane-native|jevbench-add-requests|\/home\/|per.type|\btiers?\b|token totals|input tokens|output tokens|\bPREREG\b|\{[A-Z_]+\}/i;
 // Numeric strings are allowed only from the row's published measurements and setup.
 const published=V189_NEW_ROWS.karpo_decision_31b;
 const allowedNumbers=new Set(['10106.516129','1.5235','1,000','96','6000','31','2026']);
 const pins=new Set(['25c38826',published.draw.id]);
 function publishedValues(v){
  if(typeof v==='number')allowedNumbers.add(String(v));
  else if(typeof v==='string')for(const m of v.matchAll(/\b[a-f0-9]{40,64}\b/g))pins.add(m[0]);
  else if(v&&typeof v==='object')Object.values(v).forEach(publishedValues);
 }
 publishedValues(published);
 publishedValues(V189_EXPECTED_PROOF.new_rows.karpo_decision_31b);
 function unexpectedNumber(text){
  for(const pin of pins)text=text.replaceAll(pin,'');
  for(const m of text.matchAll(/(?<![\w.])\d+(?:,\d{3})*(?:\.\d+)?(?![\w.])/g)){
   if((m[0].includes(',')||m[0].split('.')[0].length>=4)&&!allowedNumbers.has(m[0]))return true;
  }
  return false;
 }
 const privateKeys=/^(?:n|n_items|n_public|n_sealed_side|n_over_limit|n_over_limit_answered_ok|speed_n|rows|answered_ok|missing|parts|per_type|per_type_split|breakdowns|breakdowns_equated|noul_decisive|I_open|I_sealed|gap|input_tokens.*|output_tokens.*|usage_estimated_rows)$/;
 function walk(v,path=[]){
  if(typeof v==='string'&&(forbidden.test(v)||unexpectedNumber(v)))fail('restricted public wording '+path.join('.'));
  if(Array.isArray(v))v.forEach((x,i)=>walk(x,[...path,i]));
  else if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(privateKeys.test(k))fail('restricted field '+[...path,k].join('.'));walk(x,[...path,k]);}
 }
 walk(value);return true;
}
export function validateJevbenchV189Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256},{candidate=false}={}){
 if(manifest.revision!=='v1.8.9'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('manifest identity');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!hex(manifest.review.receipt_sha256)))fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.8.8',publication_sha256:previousManifestSha256},'predecessor binding');
 if(previous?.artifact.revision!=='v1.8.8'||(!candidate&&previous.manifest.review.verdict!=='PASS'))fail('validated predecessor');
 for(const f of V189_FILE_KEYS){same(manifest.files[f]?.path,`${V189_ROOT}/jevbench-v1.8.9-${f}.json`,'file path '+f);same(manifest.files[f]?.sha256,V189_EXPECTED_HASHES[f],'pinned hash '+f);}
 for(const f of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[f],previous.manifest[f],'historical binding '+f);
 if(artifact.revision!=='v1.8.9'||artifact.run_kind!=='same-draw-addendum'||artifact.provisional!==false)fail('artifact identity');
 for(const f of ['method','G_med','n_ranked','board'])same(artifact[f],previous.artifact[f],'unchanged '+f);
 const by=new Map(artifact.systems.map(s=>[s.key,s]));
 if(by.size!==artifact.systems.length||artifact.roster_count!==by.size)fail('roster counts');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V189_NEW_KEYS].sort(),'exact roster');
 for(const s of previous.artifact.systems){const expected=structuredClone(s);for(const e of V189_TEXT_EXCEPTIONS.filter(e=>e.key===s.key)){const path=e.path.split('.');let o=expected;for(const f of path.slice(0,-1))o=o[f];const f=path.at(-1);if(o[f]!==e.before||hash(o[f])!==e.before_sha256||hash(e.after)!==e.after_sha256)fail('text exception hash '+s.key);o[f]=e.after;}same(by.get(s.key),expected,'carried row '+s.key);same(categories.systems[s.key],previous.categories.systems[s.key],'carried cells '+s.key);same(categories.lanes[s.key],previous.categories.lanes[s.key],'carried lane '+s.key);}
 for(const k of V189_NEW_KEYS){
  const s=by.get(k);validateV189PublicText(s);same(s,V189_NEW_ROWS[k],'new row '+k);
  if(s.ranked!==false||s.rank!==null||s.listing!=='unranked'||s.not_ranked_because!==V189_NOTE)fail('unranked '+k);
  same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks '+k);
  for(const b of Object.values(artifact.board))if(b.order?.includes(k))fail('unranked in list '+k);
  if(s.draw?.status!=='anchor-runs-pending'||s.draw.offset.I!==0||s.draw.offset.C!==0||s.draw.release!=='v1.8.9'||s.v16.equating_offset!==null)fail('not equated '+k);
  if(s.decision_limit.limit_s!==10||s.decision_limit.treatment!=='share'||s.v16.g_med_used!==2.573387642438244)fail('scoring method '+k);
  if(s.paid_fast_lane!==true||s.publication_scope!=='standard-axes-only')fail('publication scope '+k);
  same(s.status,{status:'complete'},'status without counts '+k);
  const p=proof.new_rows[k],u=p.cost;
  for(const f of ['axes','decision_limit','model_pin','composite_ci95'])same(p[f],s[f],'proof '+f+' '+k);
  if(s.cost.usd_per_1000!==u.cost_common||Math.abs(u.cost_common-Math.min(u.list_common,u.gpu_common))>1e-12)fail('GPU-time min cost '+k);
  if(u.ref.module_sha256!=='2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b'||u.active_b!==31||Math.abs(u.throughput-10106.516129032258)>1e-9)fail('public cost method '+k);
  for(const term of ['Verda GPU VM','RTX PRO 6000','--network none','25c38826','bf16','fp32','one forward pass','no generation'])if(!s.endpoint_condition.includes(term))fail('endpoint disclosure '+term);
  for(const term of ['Paid evaluation, published with the author','Failed or unanswered requests count as wrong answers.'])if(!s.disclosure.includes(term))fail('public disclosure '+term);
  for(const term of ['min(old list-price estimate, GPU-time cost)','Estimated, not a bill','USD 1.5235/hour','70%','dense gemma','31B'])if(!s.cost.basis.includes(term))fail('cost method '+term);
  if(s.api_flag!==false||s.endpoint_kind!=='gpu'||s.speed.adjustment!=='x2 + 0.15 s (assumption, not measured)'||s.cost.kind!=='estimate')fail('self-hosted identity '+k);
  same(categories.systems[k],V189_NEW_CELLS[k],'pinned category cells '+k);
  for(const dim of V189_BREAKDOWN_POLICY.withheld_dims)if(Object.keys(categories.systems[k][dim]??{}).length)fail('withheld category dimension '+dim);
  for(const dim of Object.keys(categories.systems[k]))if(!['topics','usecases','languages'].includes(dim))fail('unapproved category dimension '+dim);
  if(/\/home\/|workers\/|#\d{4,}|\bPREREG\b|custody|deputy|release.owner|Florian|Sandy|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\{[A-Z_]+\}/i.test(JSON.stringify(s)))fail('internal public text '+k);
 }
 same(carry,previous.carry,'immutable carry');
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V189_NEW_KEYS].sort(),'category roster');
 if(categories.revision!=='v1.8.9'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 same(proof,V189_EXPECTED_PROOF,'exact proof');
 if(proof.carried_rows!==previous.artifact.systems.length||!equal(proof.carried_rows_equal_except,V189_TEXT_EXCEPTIONS)||!hex(proof.exceptions.text_only_sha256))fail('enumerated text-only carry exceptions');
 if(proof.publication_approval.status!=="GO (standing; no top-five change; paid evaluation published with the author's written consent)"||proof.publication_approval.top_five_effect!=='unchanged')fail('standing approval');
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(artifact.addendum.new_keys,V189_NEW_KEYS,'addendum keys');
 return true;
}
async function load(p,root){const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)};}
// Build-time memo (CR-729): every page of `next build` reads the live board, and each release reader re-validates its whole
// predecessor chain, so the build cost grows with the square of the release count. Inside `next build` only (NEXT_PHASE),
// the fully validated v1.8.9 bundle is kept per root and per worker process and every caller gets a deep copy. Tests, the
// validator's negative controls and the runtime server never set NEXT_PHASE and keep the uncached, fully re-validated path.
const V189_BUILD_CACHE=new Map();
const v189BuildCacheOn=()=>process.env.NEXT_PHASE==='phase-production-build';
const copyV189Release=r=>{if(!r)return r;const{bytes,...rest}=r;return{...structuredClone(rest),bytes};};
export async function readOptionalJevbenchV189Release(root=process.cwd()){
 if(!v189BuildCacheOn())return readJevbenchV189ReleaseUncached(root);
 const key=String(root);
 if(!V189_BUILD_CACHE.has(key)){const p=readJevbenchV189ReleaseUncached(root);V189_BUILD_CACHE.set(key,p);p.catch(()=>V189_BUILD_CACHE.delete(key));}
 return copyV189Release(await V189_BUILD_CACHE.get(key));
}
async function readJevbenchV189ReleaseUncached(root){
 let publication;try{publication=await load(V189_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV188Release(root);if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V189_ROOT}/jevbench-v1.8.8-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V189_FILE_KEYS.map(async k=>[k,await load(`${V189_ROOT}/jevbench-v1.8.9-${k}.json`,root)])));
 for(const[k,v]of Object.entries(b))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['carry','history','history-carry'])if(b[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k);
 validateJevbenchV189Bundle({manifest:publication.value,artifact:b.results.value,categories:b.categories.value,carry:b.carry.value,proof:b.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,carry:b.carry.value,carrySha256:b.carry.sha256,proof:b.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV189ForBoard(root=process.cwd()){
 let p;try{p=(await load(V189_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 return p?.review?.verdict==='PASS'?readOptionalJevbenchV189Release(root):null;
}
export async function hasPublishedJevbenchV189Release(root=process.cwd(),log=console.error){try{return Boolean(await readJevbenchV189ForBoard(root));}catch{log('JevBench v1.8.9 navigation omitted: publication validation failed');return false;}}
export function v189BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV189Addendum(chain,release){
 const bounds={...apiFullAddendumCategoryBounds(chain.categories),...structuredClone(V189_NEW_ROW_BOUNDS)};
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.8.9',v189_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.8.9',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
