// One measured but unranked row; independent review gates every public reader.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual as equal} from 'node:util';
import {readOptionalJevbenchV1815Release,readJevbenchV1815Candidate} from './jevbench-v1815-release.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';
export const V1816_ROOT='data/raw/benchmarks/jevbench/v1.8';
export const V1816_MANIFEST=`${V1816_ROOT}/jevbench-v1.8.16-publication.json`;
export const V1816_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V1816_EXPECTED_HASHES=/*HASHES*/;
export const V1816_NEW_ROWS=/*ROWS*/;
export const V1816_NEW_ROW_BOUNDS=/*BOUNDS*/;
export const V1816_EXPECTED_PROOF=/*PROOF*/;
export const V1816_TEXT_EXCEPTIONS=/*TEXT_EXCEPTIONS*/;
export const V1816_NEW_CELLS=/*CELLS*/;
export const V1816_BREAKDOWN_POLICY=/*SCOPE*/;
export const V1816_NEW_KEYS=Object.keys(V1816_NEW_ROWS).sort();
export const V1816_NOTE='Added after the v1.8.10 ranking review; it is ranked at the next review.';
const fail=m=>{throw Error('JevBench v1.8.16: '+m);};
const same=(a,b,m)=>{if(!equal(a,b))fail(m);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const hex=s=>/^[a-f0-9]{64}$/.test(s??'');
// The publication scope is intentionally narrower than the private scoring record.
export function validateV1816PublicText(value){
 if(value?.model_pin!=='sthanika-ai/Sieve-31B-v3@ed0a046788205f0457918af8dbae3c6e8c3ee9f5')fail('pinned weights');
 const forbidden=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|fastlane-native|jevbench-add-requests|\/home\/|\b(?:custody|deputy|Florian|PREREG)\b/i;
 if(forbidden.test(JSON.stringify(value)))fail('private wording');
 const forbiddenKeys=new Set(['visibility','order','order_id','pod_id','raw_file','answered_ok','missing']);
 function walk(v){if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(forbiddenKeys.has(k))fail('private field '+k);walk(x);}}
 walk(value);return true;
}
export function validateJevbenchV1816Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256},{candidate=false}={}){
 if(manifest.revision!=='v1.8.16'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('manifest identity');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!hex(manifest.review.receipt_sha256)))fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.8.15',publication_sha256:previousManifestSha256},'predecessor binding');
 if(previous?.artifact.revision!=='v1.8.15'||(!candidate&&previous.manifest.review.verdict!=='PASS'))fail('validated predecessor');
 for(const f of V1816_FILE_KEYS){same(manifest.files[f]?.path,`${V1816_ROOT}/jevbench-v1.8.16-${f}.json`,'file path '+f);same(manifest.files[f]?.sha256,V1816_EXPECTED_HASHES[f],'pinned hash '+f);}
 for(const f of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[f],previous.manifest[f],'historical binding '+f);
 if(artifact.revision!=='v1.8.16'||artifact.run_kind!=='same-draw-addendum'||artifact.provisional!==false)fail('artifact identity');
 for(const f of ['method','G_med','n_ranked','board'])same(artifact[f],previous.artifact[f],'unchanged '+f);
 const by=new Map(artifact.systems.map(s=>[s.key,s]));
 if(by.size!==artifact.systems.length||artifact.roster_count!==by.size)fail('roster counts');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1816_NEW_KEYS].sort(),'exact roster');
 for(const s of previous.artifact.systems){
 same(by.get(s.key),s,'carried row '+s.key);
 same(categories.systems[s.key],previous.categories.systems[s.key],'carried cells '+s.key);
 same(categories.lanes[s.key],previous.categories.lanes[s.key],'carried lane '+s.key);
 }
 for(const k of V1816_NEW_KEYS){
  const s=by.get(k);validateV1816PublicText(s);same(s,V1816_NEW_ROWS[k],'new row '+k);
  if(s.ranked!==false||s.rank!==null||s.listing!=='unranked'||s.not_ranked_because!==V1816_NOTE)fail('unranked '+k);
  same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks '+k);
  for(const b of Object.values(artifact.board))if(b.order?.includes(k))fail('unranked in list '+k);
  if(s.draw?.status!=='equated'||s.draw.offset.I!==-2.884891186577587||s.draw.offset.C!==-1.8542447151797177||s.draw.release!=='v1.8.16'||s.v16.equating_offset!==null)fail('equating '+k);
  for(const [a,o] of [['intelligence','I'],['calibration','C']])if(s.axes[a]!==Math.min(100,Math.max(0,s.published_scores.axes[a]+s.draw.offset[o])))fail('equated axis '+a);
  if(s.capability!==(s.axes.intelligence+s.axes.calibration)/2)fail('equated capability');
  if(s.decision_limit.limit_s!==10||s.decision_limit.treatment!=='share'||s.v16.g_med_used!==2.573387642438244)fail('scoring method '+k);
  if(s.paid_fast_lane!==true)fail('public paid row '+k);
  same(s.status,{status:'complete'},'status without counts '+k);
  const p=proof.new_rows[k],u=p.cost;
  for(const f of ['axes','decision_limit','model_pin','composite_ci95'])same(p[f],s[f],'proof '+f+' '+k);
  if(s.cost.usd_per_1000!==u.cost_common||Math.abs(u.cost_common-Math.min(u.list_common,u.gpu_common))>1e-12)fail('GPU-time min cost '+k);
  if(u.ref.module_sha256!=='1b3c52fbeb5543c44c5d2c093002c60b469e4356a7f96116fc4228a345bd10b2'||u.active_b!==31||u.family!=='gemma'||u.architecture_class!=='dense'||Math.abs(u.throughput-10106.516129032258)>1e-9)fail('public cost method '+k);
  for(const term of ['Verda GPU VM','--network none','native LettersEngine','1e64657c','BF16 Gemma-4-31B','orders=2','output_tokens=0'])if(!s.endpoint_condition.includes(term))fail('endpoint disclosure '+term);
  for(const term of ['Paid public evaluation.','Failed or unanswered requests count as wrong answers.'])if(!s.disclosure.includes(term))fail('public disclosure '+term);
  for(const term of ['min(old list-price estimate, GPU-time cost)','Estimated, not a bill','USD 1.5235/hour','70%','dense gemma','31B'])if(!s.cost.basis.includes(term))fail('cost method '+term);
  if(s.api_flag!==false||s.endpoint_kind!=='gpu'||s.speed.adjustment!=='x2 + 0.15 s (assumption, not measured)'||s.cost.kind!=='estimate')fail('self-hosted identity '+k);
  same(categories.systems[k],V1816_NEW_CELLS[k],'pinned category cells '+k);
  for(const dim of V1816_BREAKDOWN_POLICY.withheld_dims)if(Object.keys(categories.systems[k][dim]??{}).length)fail('withheld category dimension '+dim);
  for(const dim of Object.keys(categories.systems[k]))if(!['topics','usecases','languages'].includes(dim))fail('unapproved category dimension '+dim);
  if(/\/home\/|workers\/|#\d{4,}|\bPREREG\b|custody|deputy|release.owner|Florian|Sandy|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\{[A-Z_]+\}/i.test(JSON.stringify(s)))fail('internal public text '+k);
 }
 same(carry,previous.carry,'immutable carry');
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V1816_NEW_KEYS].sort(),'category roster');
 if(categories.revision!=='v1.8.16'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 same(proof,V1816_EXPECTED_PROOF,'exact proof');
 if(proof.carried_rows!==previous.artifact.systems.length||!equal(proof.carried_rows_equal_except,V1816_TEXT_EXCEPTIONS)||!hex(proof.exceptions.text_only_sha256))fail('enumerated text-only carry exceptions');
 if(proof.publication_approval.status!=='GO (standing; paid public evaluation; unranked row only)'||proof.publication_approval.top_five_effect!=='unchanged')fail('standing approval');
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(proof.equating,previous.proof.equating,'unchanged equating');
 same(proof.scorers,previous.proof.scorers,'unchanged scorers');
 same(proof.pricing_module_sha256,previous.proof.pricing_module_sha256,'unchanged pricing');
 same(artifact.addendum.new_keys,V1816_NEW_KEYS,'addendum keys');
 return true;
}
async function load(p,root){const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)};}
// Build-time memo (CR-729): every page of `next build` reads the live board, and each release reader re-validates its whole
// predecessor chain, so the build cost grows with the square of the release count. Inside `next build` only (NEXT_PHASE),
// the fully validated v1.8.16 bundle is kept per root and per worker process and every caller gets a deep copy. Tests, the
// validator's negative controls and the runtime server never set NEXT_PHASE and keep the uncached, fully re-validated path.
const V1816_BUILD_CACHE=new Map();
const v1816BuildCacheOn=()=>process.env.NEXT_PHASE==='phase-production-build';
const copyV1816Release=r=>{if(!r)return r;const{bytes,...rest}=r;return{...structuredClone(rest),bytes};};
export async function readOptionalJevbenchV1816Release(root=process.cwd()){
 if(!v1816BuildCacheOn())return readJevbenchV1816ReleaseUncached(root);
 const key=String(root);
 if(!V1816_BUILD_CACHE.has(key)){const p=readJevbenchV1816ReleaseUncached(root);V1816_BUILD_CACHE.set(key,p);p.catch(()=>V1816_BUILD_CACHE.delete(key));}
 return copyV1816Release(await V1816_BUILD_CACHE.get(key));
}
export async function readJevbenchV1816Candidate(root=process.cwd()){return readJevbenchV1816ReleaseUncached(root,{candidate:true});}
async function readJevbenchV1816ReleaseUncached(root,opts={}){
 let publication;try{publication=await load(V1816_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await (opts.candidate?readJevbenchV1815Candidate(root):readOptionalJevbenchV1815Release(root));if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V1816_ROOT}/jevbench-v1.8.15-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V1816_FILE_KEYS.map(async k=>[k,await load(`${V1816_ROOT}/jevbench-v1.8.16-${k}.json`,root)])));
 for(const[k,v]of Object.entries(b))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['carry','history','history-carry'])if(b[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k);
 validateJevbenchV1816Bundle({manifest:publication.value,artifact:b.results.value,categories:b.categories.value,carry:b.carry.value,proof:b.proof.value,previous,previousManifestSha256:predecessor.sha256},opts);
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,carry:b.carry.value,carrySha256:b.carry.sha256,proof:b.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1816ForBoard(root=process.cwd()){
 let p;try{p=(await load(V1816_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 return p?.review?.verdict==='PASS'?readOptionalJevbenchV1816Release(root):null;
}
export async function hasPublishedJevbenchV1816Release(root=process.cwd(),log=console.error){try{return Boolean(await readJevbenchV1816ForBoard(root));}catch{log('JevBench v1.8.16 navigation omitted: publication validation failed');return false;}}
export const V1816_BREAKDOWN_NOTE='Breakdown values are shown for cells with at least 30 scored items; more items are being added.';
// Display adapter only: frozen category artifacts and all score/rank fields stay untouched.
export function v1816CategoryDisplay(categories){
 const systems=Object.fromEntries(Object.entries(categories.systems).map(([k,r])=>[k,{...r,...Object.fromEntries(['topics','usecases','languages'].filter(d=>r[d]).map(d=>[d,Object.fromEntries(Object.entries(r[d]).filter(([,c])=>c.n>=30 && (c.coverage_n??c.n)>=30))]))}]));
 return withRowPoolCategoryRows({...categories,systems:{},min_n:30,display_min_n:30,rules:[...(categories.rules??[]),V1816_BREAKDOWN_NOTE]},systems,apiFullAddendumCategoryBounds(categories)??{});
}
// Project legacy row breakdowns at the same display floor; never mutate the frozen results.
const dropSmallRowBreakdowns=(value,inBreakdowns=false)=>{
 if(!value||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(v=>dropSmallRowBreakdowns(v,inBreakdowns));
 return Object.fromEntries(Object.entries(value).filter(([k,v])=>!(inBreakdowns&&v&&typeof v==='object'&&Number.isInteger(v.n)&&v.n<30)).map(([k,v])=>[k,dropSmallRowBreakdowns(v,inBreakdowns||k==='breakdowns')]));
};
export function v1816BoardInput(release,chain){
 const bounds={...apiFullAddendumCategoryBounds(chain?.categories),...structuredClone(V1816_NEW_ROW_BOUNDS)};
 const categories=withRowPoolCategoryRows({...release.categories,systems:{}},release.categories.systems,bounds);
 return {artifact:{...release.artifact,systems:release.artifact.systems.map(s=>dropSmallRowBreakdowns(s))},categories:v1816CategoryDisplay(categories)};
}
export function withV1816Addendum(chain,release){
 const update=a=>({...a,systems:release.artifact.systems.map(s=>dropSmallRowBreakdowns(s)),board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.8.16',v1816_sha256:release.sha256});
 const {categories}=v1816BoardInput(release,chain);
 const adapted=withRowPoolCategoryRows({...categories,revision:chain.published.revision,restated_by:'v1.8.16',systems:{}},categories.systems,apiFullAddendumCategoryBounds(categories));
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories:adapted,publishedCarry:release.carry};
}
