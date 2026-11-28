// Two measured, priced but unranked hosted API rows on a supplementary set; independent review gates every public reader.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual as equal} from 'node:util';
import {readOptionalJevbenchV1823Release,readJevbenchV1823Candidate} from './jevbench-v1823-release.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';
export const V1824_ROOT='data/raw/benchmarks/jevbench/v1.8';
export const V1824_MANIFEST=`${V1824_ROOT}/jevbench-v1.8.24-publication.json`;
export const V1824_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V1824_EXPECTED_HASHES=/*HASHES*/;
export const V1824_NEW_ROWS=/*ROWS*/;
export const V1824_NEW_ROW_BOUNDS=/*BOUNDS*/;
export const V1824_EXPECTED_PROOF=/*PROOF*/;
export const V1824_TEXT_EXCEPTIONS=/*TEXT_EXCEPTIONS*/;
export const V1824_NEW_CELLS=/*CELLS*/;
export const V1824_BREAKDOWN_POLICY=/*SCOPE*/;
export const V1824_NEW_KEYS=Object.keys(V1824_NEW_ROWS).sort();
export const V1824_NOTE=/*NOTE*/;
export const V1824_COST_NOTE=/*COST_NOTE*/;
const fail=m=>{throw Error('JevBench v1.8.24: '+m);};
const same=(a,b,m)=>{if(!equal(a,b))fail(m);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const hex=s=>/^[a-f0-9]{64}$/.test(s??'');
// The publication scope is intentionally narrower than the private scoring record.
export function validateV1824PublicText(value){
 if(!Object.values(V1824_NEW_ROWS).some(s=>s.model_pin===value?.model_pin))fail('pinned model');
 const forbidden=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|fastlane-native|jevbench-add-requests|\/home\/|\b(?:custody|deputy|Florian|PREREG)\b/i;
 if(forbidden.test(JSON.stringify(value)))fail('private wording');
 const forbiddenKeys=new Set(['visibility','order','order_id','pod_id','raw_file','answered_ok','missing']);
 function walk(v){if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(forbiddenKeys.has(k))fail('private field '+k);walk(x);}}
 walk(value);return true;
}
export function validateJevbenchV1824Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256},{candidate=false}={}){
 if(manifest.revision!=='v1.8.24'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('manifest identity');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||/synthetic|pending/i.test(manifest.review.engine)||!hex(manifest.review.receipt_sha256)))fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.8.23',publication_sha256:previousManifestSha256},'predecessor binding');
 if(previous?.artifact.revision!=='v1.8.23'||(!candidate&&previous.manifest.review.verdict!=='PASS'))fail('validated predecessor');
 for(const f of V1824_FILE_KEYS){same(manifest.files[f]?.path,`${V1824_ROOT}/jevbench-v1.8.24-${f}.json`,'file path '+f);same(manifest.files[f]?.sha256,V1824_EXPECTED_HASHES[f],'pinned hash '+f);}
 for(const f of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[f],previous.manifest[f],'historical binding '+f);
 if(artifact.revision!=='v1.8.24'||artifact.run_kind!=='api-supplement-addendum'||artifact.provisional!==false)fail('artifact identity');
 for(const f of ['method','G_med','n_ranked','board'])same(artifact[f],previous.artifact[f],'unchanged '+f);
 same(artifact.not_measured,previous.artifact.not_measured,'unchanged not-measured roster');
 const by=new Map(artifact.systems.map(s=>[s.key,s]));
 if(by.size!==artifact.systems.length||artifact.roster_count!==by.size)fail('roster counts');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1824_NEW_KEYS].sort(),'exact roster');
 for(const s of previous.artifact.systems){
 const row=by.get(s.key),rest=row&&{...row};
 for(const e of V1824_TEXT_EXCEPTIONS.filter(x=>x.key===s.key)){
  if(!row||rest[e.path]!==e.after||hash(rest[e.path])!==e.after_sha256||hash(e.before)!==e.before_sha256)fail('text exception '+s.key+'.'+e.path);
  rest[e.path]=e.before;
 }
 same(rest,s,'carried row '+s.key);
 same(categories.systems[s.key],previous.categories.systems[s.key],'carried cells '+s.key);
 same(categories.lanes[s.key],previous.categories.lanes[s.key],'carried lane '+s.key);
 }
 for(const k of V1824_NEW_KEYS){
  const s=by.get(k);validateV1824PublicText(s);same(s,V1824_NEW_ROWS[k],'new row '+k);
  if(s.ranked!==false||s.rank!==null||s.listing!=='unranked'||s.not_ranked_because!==V1824_NOTE)fail('unranked '+k);
  same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks '+k);
  for(const b of Object.values(artifact.board))if(b.order?.includes(k))fail('unranked in list '+k);
  // Hosted API rows on the 600-item supplementary set: no draw block, no equating; Intelligence, Calibration and every composite are null.
  if(s.draw!==undefined||s.published_scores!==undefined)fail('no draw or equated block '+k);
  if(s.v16.equated!==null||s.v16.equating_offset!==null||s.v16.g_med_used!==null||s.v16.lane!=='api'||s.v16.n_items!==600||s.v16.n_public!==300||s.v16.n_sealed_side!==300||s.v16.equating_flag!==V1824_NOTE)fail('unequated supplement '+k);
  if(s.axes.intelligence!==null||s.axes.calibration!==null||s.capability!==null||s.jevbench_score!==null||s.composite_ci95!==null)fail('null Intelligence, Calibration and composite '+k);
  if(!Object.values(s.scores).every(v=>v===null)||!Object.values(s.views).every(v=>v===null)||!Number.isFinite(s.axes.cost)||!Number.isFinite(s.axes.speed))fail('null scores, shown speed and cost '+k);
  for(const f of ['intelligence','calibration','validity','planned_weight_denominator','addendum'])if(f in s)fail('withheld field '+f+' '+k);
  if('raw_on_A' in s.v16)fail('withheld raw_on_A '+k);
  const expected=V1824_NEW_ROWS[k],p=proof.new_rows[k],u=p.cost;
  if(s.decision_limit.limit_s!==10||s.decision_limit.treatment!=='share'||s.decision_limit.speed_n!==600||s.speed.n!==600||s.speed.adjustment!=='none (API)')fail('scoring method '+k);
  same(s.status,{status:'complete'},'status without internal counts '+k);
  same(s.http_status,k==='urun-sense'?{'200':597,'502':3}:{'200':600},'HTTP completeness '+k);
  for(const f of ['axes','decision_limit','model_pin','composite_ci95','http_status'])same(p[f],s[f],'proof '+f+' '+k);
  if(u.n_items!==600||u.ok_rows+u.non_ok_rows_in_denominator!==600||u.base_model!==null||u.source!=='api'||u.output_tokens!==0||u.api_pricing_v15_sha256!==proof.api_pricing_module_sha256)fail('cost proof binding '+k);
  // Authoritative price: the frozen API pricing table figure over all 600 items; kind 'tariff' (no estimate label); axis recomputed by the frozen formula.
  if(s.cost.usd_per_1000!==u.cost_all||u.cost_all!==1000*(u.input_tokens*u.in_per_m+u.output_tokens*u.out_per_m)/1e6/600||s.cost.kind!=='tariff'||s.cost.common_basis!==null||s.cost.usage_estimated_rows!==0)fail('priced list-price cost '+k);
  if(/\best\b|estimate/i.test(s.cost.basis))fail('no estimate label '+k);
  for(const term of [V1824_COST_NOTE,String(u.cost_all),String(u.input_tokens.toLocaleString('en-US')),String(u.in_per_m)])if(!s.cost.basis.includes(term))fail('cost wording '+term);
  if(k==='urun-sense'&&(!s.disclosure.includes("Measured through the provider's sense-latest model alias.")||!s.disclosure.includes('3 of 600 requests returned HTTP 502; they count as wrong answers and all 600 items remain in the denominator.')))fail('urun approved text');
  if(k==='alibaba-decision-model-sg'&&!s.cost.basis.includes('The API bills input tokens only and reports no output token count; cost uses input tokens.'))fail('alibaba approved text');
  if(s.api_flag!==true||s.endpoint_kind!=='api'||s.base_model!==null||s.paid_fast_lane!==false||s.new_in!=='v1.8.24'||s.measured_in!=='v1.8.24')fail('hosted API identity '+k);
  if(s.underlying!==s.disclosure)fail('public disclosure '+k);
  same(categories.systems[k],V1824_NEW_CELLS[k],'pinned category cells '+k);
  same(categories.lanes[k],s.v16.lane,'lane '+k);
  for(const dim of V1824_BREAKDOWN_POLICY.withheld_dims)if(Object.keys(categories.systems[k][dim]??{}).length)fail('withheld category dimension '+dim);
  for(const dim of Object.keys(categories.systems[k]))if(!['topics','families','usecases','languages'].includes(dim))fail('unapproved category dimension '+dim);
  if(/\/home\/|workers\/|#\d{4,}|\bPREREG\b|custody|deputy|release.owner|Florian|Sandy|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\{[A-Z_]+\}/i.test(JSON.stringify(s)))fail('internal public text '+k);
 }
 same(carry,previous.carry,'immutable carry');
 same(Object.keys(categories.systems).sort(),[...new Set([...Object.keys(previous.categories.systems),...V1824_NEW_KEYS])].sort(),'category roster');
 if(categories.revision!=='v1.8.24'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 same(proof,V1824_EXPECTED_PROOF,'exact proof');
 if(proof.carried_rows!==previous.artifact.systems.length||!equal(proof.carried_rows_equal_except,V1824_TEXT_EXCEPTIONS)||!hex(proof.exceptions.text_only_sha256))fail('enumerated text-only carry exceptions');
 if(!/^(PENDING|GO \(.+\))$/.test(proof.publication_approval.status)||proof.publication_approval.top_five_effect!=='unchanged'||proof.publication_approval.fairness_review_required!==false||!String(proof.publication_approval.scope).startsWith('row-only:'))fail('standing approval');
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(proof.equating,previous.proof.equating,'unchanged equating');
 same(proof.scorers,previous.proof.scorers,'unchanged scorers');
 same(proof.pricing_module_sha256,'16f71aec341fdc5d0ed8ccab1c166f93eb7a98f1fe7440c3c4548c035f3f8ab0','reviewed pricing re-freeze');
 same(artifact.addendum.new_keys,V1824_NEW_KEYS,'addendum keys');
 same(artifact.addendum.supplement,{n_items:600,sealed_items:300,public_items:300,rule:'every one of the 600 items counts in cost and speed; failed requests stay in the denominator',equated:false},'supplement addendum');
 same(artifact.addendum.cost_basis,previous.artifact.addendum.cost_basis,'unchanged d1027 cost basis');
 same(proof.cost_basis,previous.proof.cost_basis,'unchanged cost basis');
 same(proof.supplement,{...artifact.addendum.supplement,status:'no equated reference; Intelligence, Calibration and composite are null',decision_limit:{limit_s:10,treatment:'share'}},'supplement proof');
 if(!hex(proof.api_pricing_module_sha256)||!proof.api_pricing_module_sha256.startsWith('29d90b4d'))fail('API pricing module pin');
 return true;
}
async function load(p,root){const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)};}
// Build-time memo (CR-729): every page of `next build` reads the live board, and each release reader re-validates its whole
// predecessor chain, so the build cost grows with the square of the release count. Inside `next build` only (NEXT_PHASE),
// the fully validated v1.8.24 bundle is kept per root and per worker process and every caller gets a deep copy. Tests, the
// validator's negative controls and the runtime server never set NEXT_PHASE and keep the uncached, fully re-validated path.
const V1824_BUILD_CACHE=new Map();
const v1824BuildCacheOn=()=>process.env.NEXT_PHASE==='phase-production-build';
const copyV1824Release=r=>{if(!r)return r;const{bytes,...rest}=r;return{...structuredClone(rest),bytes};};
export async function readOptionalJevbenchV1824Release(root=process.cwd()){
 if(!v1824BuildCacheOn())return readJevbenchV1824ReleaseUncached(root);
 const key=String(root);
 if(!V1824_BUILD_CACHE.has(key)){const p=readJevbenchV1824ReleaseUncached(root);V1824_BUILD_CACHE.set(key,p);p.catch(()=>V1824_BUILD_CACHE.delete(key));}
 return copyV1824Release(await V1824_BUILD_CACHE.get(key));
}
export async function readJevbenchV1824Candidate(root=process.cwd()){return readJevbenchV1824ReleaseUncached(root,{candidate:true});}
async function readJevbenchV1824ReleaseUncached(root,opts={}){
 let publication;try{publication=await load(V1824_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await (opts.candidate?readJevbenchV1823Candidate(root):readOptionalJevbenchV1823Release(root));if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V1824_ROOT}/jevbench-v1.8.23-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V1824_FILE_KEYS.map(async k=>[k,await load(`${V1824_ROOT}/jevbench-v1.8.24-${k}.json`,root)])));
 for(const[k,v]of Object.entries(b))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['carry','history','history-carry'])if(b[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k);
 validateJevbenchV1824Bundle({manifest:publication.value,artifact:b.results.value,categories:b.categories.value,carry:b.carry.value,proof:b.proof.value,previous,previousManifestSha256:predecessor.sha256},opts);
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,carry:b.carry.value,carrySha256:b.carry.sha256,proof:b.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1824ForBoard(root=process.cwd()){
 let p;try{p=(await load(V1824_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 return p?.review?.verdict==='PASS'?readOptionalJevbenchV1824Release(root):null;
}
export async function hasPublishedJevbenchV1824Release(root=process.cwd(),log=console.error){try{return Boolean(await readJevbenchV1824ForBoard(root));}catch{log('JevBench v1.8.24 navigation omitted: publication validation failed');return false;}}
export const V1824_BREAKDOWN_NOTE='Breakdown values are shown for cells with at least 30 scored items; more items are being added.';
// Display adapter only: frozen category artifacts and all score/rank fields stay untouched.
export function v1824CategoryDisplay(categories){
 const systems=Object.fromEntries(Object.entries(categories.systems).map(([k,r])=>[k,{...r,...Object.fromEntries((V1824_NEW_KEYS.includes(k)?['topics','families','usecases','languages']:['topics','usecases','languages']).filter(d=>r[d]).map(d=>[d,Object.fromEntries(Object.entries(r[d]).filter(([,c])=>c.n>=30 && (c.coverage_n??c.n)>=30))]))}]));
 return withRowPoolCategoryRows({...categories,systems:{},min_n:30,display_min_n:30,rules:[...(categories.rules??[]),V1824_BREAKDOWN_NOTE]},systems,apiFullAddendumCategoryBounds(categories)??{});
}
// Project legacy row breakdowns at the same display floor; never mutate the frozen results.
const dropSmallRowBreakdowns=(value,inBreakdowns=false)=>{
 if(!value||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(v=>dropSmallRowBreakdowns(v,inBreakdowns));
 return Object.fromEntries(Object.entries(value).filter(([k,v])=>!(inBreakdowns&&v&&typeof v==='object'&&Number.isInteger(v.n)&&v.n<30)).map(([k,v])=>[k,dropSmallRowBreakdowns(v,inBreakdowns||k==='breakdowns')]));
};
export function v1824BoardInput(release,chain){
 const bounds={...apiFullAddendumCategoryBounds(chain?.categories),...structuredClone(V1824_NEW_ROW_BOUNDS)};
 const categories=withRowPoolCategoryRows({...release.categories,systems:{}},release.categories.systems,bounds);
 return {artifact:{...release.artifact,systems:release.artifact.systems.map(s=>dropSmallRowBreakdowns(s))},categories:v1824CategoryDisplay(categories)};
}
export function withV1824Addendum(chain,release){
 const update=a=>({...a,systems:release.artifact.systems.map(s=>dropSmallRowBreakdowns(s)),board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,not_measured:release.artifact.not_measured,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.8.24',v1824_sha256:release.sha256});
 const {categories}=v1824BoardInput(release,chain);
 const adapted=withRowPoolCategoryRows({...categories,revision:chain.published.revision,restated_by:'v1.8.24',systems:{}},categories.systems,apiFullAddendumCategoryBounds(categories));
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories:adapted,publishedCarry:release.carry};
}
