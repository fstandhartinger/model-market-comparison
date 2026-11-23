// One measured but unranked row; independent review gates every public reader.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual as equal} from 'node:util';
import {readOptionalJevbenchV1819Release,readJevbenchV1819Candidate} from './jevbench-v1819-release.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';
export const V1820_ROOT='data/raw/benchmarks/jevbench/v1.8';
export const V1820_MANIFEST=`${V1820_ROOT}/jevbench-v1.8.20-publication.json`;
export const V1820_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V1820_EXPECTED_HASHES=/*HASHES*/;
export const V1820_NEW_ROWS=/*ROWS*/;
export const V1820_NEW_ROW_BOUNDS=/*BOUNDS*/;
export const V1820_EXPECTED_PROOF=/*PROOF*/;
export const V1820_TEXT_EXCEPTIONS=/*TEXT_EXCEPTIONS*/;
export const V1820_NEW_CELLS=/*CELLS*/;
export const V1820_BREAKDOWN_POLICY=/*SCOPE*/;
export const V1820_NEW_KEYS=Object.keys(V1820_NEW_ROWS).sort();
export const V1820_DRAW='v1.6-regular-20261122';
export const V1820_NOTE='Measured on the 22 Nov 2026 draw, which is not yet equated to the reference scale; anchor runs for that draw are pending. Shown unranked until then.';
const fail=m=>{throw Error('JevBench v1.8.20: '+m);};
const same=(a,b,m)=>{if(!equal(a,b))fail(m);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const hex=s=>/^[a-f0-9]{64}$/.test(s??'');
// The publication scope is intentionally narrower than the private scoring record.
export function validateV1820PublicText(value){
 if(!Object.values(V1820_NEW_ROWS).some(s=>s.model_pin===value?.model_pin))fail('pinned model');
 const forbidden=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|fastlane-native|jevbench-add-requests|\/home\/|\b(?:custody|deputy|Florian|PREREG)\b/i;
 if(forbidden.test(JSON.stringify(value)))fail('private wording');
 const forbiddenKeys=new Set(['visibility','order','order_id','pod_id','raw_file','answered_ok','missing']);
 function walk(v){if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(forbiddenKeys.has(k))fail('private field '+k);walk(x);}}
 walk(value);return true;
}
export function validateJevbenchV1820Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256},{candidate=false}={}){
 if(manifest.revision!=='v1.8.20'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('manifest identity');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||/synthetic|pending/i.test(manifest.review.engine)||!hex(manifest.review.receipt_sha256)))fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.8.19',publication_sha256:previousManifestSha256},'predecessor binding');
 if(previous?.artifact.revision!=='v1.8.19'||(!candidate&&previous.manifest.review.verdict!=='PASS'))fail('validated predecessor');
 for(const f of V1820_FILE_KEYS){same(manifest.files[f]?.path,`${V1820_ROOT}/jevbench-v1.8.20-${f}.json`,'file path '+f);same(manifest.files[f]?.sha256,V1820_EXPECTED_HASHES[f],'pinned hash '+f);}
 for(const f of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[f],previous.manifest[f],'historical binding '+f);
 if(artifact.revision!=='v1.8.20'||artifact.run_kind!=='same-draw-addendum'||artifact.provisional!==false)fail('artifact identity');
 for(const f of ['method','G_med','n_ranked','board'])same(artifact[f],previous.artifact[f],'unchanged '+f);
 const by=new Map(artifact.systems.map(s=>[s.key,s]));
 if(by.size!==artifact.systems.length||artifact.roster_count!==by.size)fail('roster counts');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1820_NEW_KEYS].sort(),'exact roster');
 for(const s of previous.artifact.systems){
 same(by.get(s.key),s,'carried row '+s.key);
 same(categories.systems[s.key],previous.categories.systems[s.key],'carried cells '+s.key);
 same(categories.lanes[s.key],previous.categories.lanes[s.key],'carried lane '+s.key);
 }
 for(const k of V1820_NEW_KEYS){
  const s=by.get(k);validateV1820PublicText(s);same(s,V1820_NEW_ROWS[k],'new row '+k);
  if(s.ranked!==false||s.rank!==null||s.listing!=='unranked'||s.not_ranked_because!==V1820_NOTE)fail('unranked '+k);
  same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks '+k);
  for(const b of Object.values(artifact.board))if(b.order?.includes(k))fail('unranked in list '+k);
  // First row on the 22 Nov draw: anchor runs are pending, so offset 0 and no equating block; scores are the scorer's own numbers.
  same(s.draw,{id:V1820_DRAW,label:'Fourth regular draw',drawn_on:'2026-11-22',status:'anchor-runs-pending',offset:{I:0,C:0},offset_ci95:null,release:'v1.8.20',measured_on:'2026-11-22',g_med:2.573387642438244,g_med_note:s.draw?.g_med_note,results_sha256:proof.new_rows[k].scored_input_sha256},'new draw binding '+k);
  if(!/^Carried over from the 27 Oct draw/.test(s.draw.g_med_note))fail('G_med note '+k);
  if(s.v16.equated!==null||s.v16.equating_offset!==null||s.published_scores!==undefined||s.v16.g_med_used!==2.573387642438244)fail('unequated draw '+k);
  if(s.capability!==(s.axes.intelligence+s.axes.calibration)/2)fail('capability '+k);
  if(s.decision_limit.limit_s!==10||s.decision_limit.treatment!=='share'||s.decision_limit.n_over_limit!==5||s.decision_limit.n_over_limit_answered_ok!==5||s.decision_limit.speed_n!==1500)fail('scoring method '+k);
  if(s.paid_fast_lane!==true)fail('paid fast-lane row '+k);
  same(s.status,{status:'complete'},'status without counts '+k);
  const p=proof.new_rows[k],u=p.cost;
  for(const f of ['axes','decision_limit','model_pin','composite_ci95'])same(p[f],s[f],'proof '+f+' '+k);
  if(s.cost.usd_per_1000!==u.cost_all||u.cost_all!==Math.min(u.gpu_all,u.list_all)||u.binding!=='gpu'||u.n_items!==1500||u.input_tokens!==1036329||u.output_tokens!==0||s.cost.common_basis!==undefined||s.cost.kind!=='estimate')fail('GPU-time cost over all items '+k);
  if(u.ref.module_sha256!==proof.pricing_module_sha256||u.ref.listing!=='deepinfra:Qwen/Qwen3.5-4B'||Math.abs(u.ref.in-0.03)>=1e-15||Math.abs(u.ref.out-0.15)>=1e-15||u.reference_params_sha256!=='83f722dda177748a26ab1ecff3b86e812a30cb501ae9c49054833d14db4a3530')fail('cost reference '+k);
  for(const term of ['serve_systemone.py','CUDA-graph engine','12 padded buckets up to 4,096 tokens','131,072 tokens per joint request','b4b4facd'])if(!s.endpoint_condition.includes(term))fail('endpoint disclosure '+term);
  for(const term of ['22 Nov 2026','Not yet equated','anchor runs on this draw are pending','27 Oct draw','5 of 1,500 decisions','share rule','0.801','author\'s HTTP server','raw softmax','only the question type and the two probabilities','Calibration and Noul scores','exactly p = 0.5','131,072','4,096','non-commercial','Failed or unanswered requests count as wrong answers'])if(!s.disclosure.includes(term))fail('public disclosure '+term);
  if(s.underlying!==s.disclosure)fail('underlying text '+k);
  for(const term of ['GPU-time estimate from v1.8.0','Architecture: small qwen, 4B active parameters','throughput 61525 tokens/s','deepinfra:Qwen/Qwen3.5-4B at USD 0.03/M input and USD 0.15/M output','Applied min(old list-price estimate, GPU-time cost)','Estimated, not a bill.'])if(!s.cost.basis.includes(term))fail('cost method '+term);
  if(s.model_pin!==p.model_pin||p.code_commit!==s.model_pin.split('@')[1]||s.base_model!=='Qwen/Qwen3.5-4B'||s.api_flag!==false||s.endpoint_kind!=='gpu'||s.v16.lane!=='selfhosted'||s.speed.adjustment!=='x2 + 0.15 s (assumption, not measured)'||s.author!=='xsdfasfgsa (Hugging Face)'||s.repo!=='https://huggingface.co/xsdfasfgsa/Starlord-4B-v2.0-preview')fail('self-hosted identity '+k);
  same(categories.systems[k],V1820_NEW_CELLS[k],'pinned category cells '+k);
  same(categories.lanes[k],'selfhosted','lane '+k);
  for(const dim of V1820_BREAKDOWN_POLICY.withheld_dims)if(Object.keys(categories.systems[k][dim]??{}).length)fail('withheld category dimension '+dim);
  for(const dim of Object.keys(categories.systems[k]))if(!['topics','usecases','languages'].includes(dim))fail('unapproved category dimension '+dim);
  if(/\/home\/|workers\/|#\d{4,}|\bPREREG\b|custody|deputy|release.owner|Florian|Sandy|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\{[A-Z_]+\}/i.test(JSON.stringify(s)))fail('internal public text '+k);
 }
 same(carry,previous.carry,'immutable carry');
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V1820_NEW_KEYS].sort(),'category roster');
 if(categories.revision!=='v1.8.20'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 same(proof,V1820_EXPECTED_PROOF,'exact proof');
 if(proof.carried_rows!==previous.artifact.systems.length||!equal(proof.carried_rows_equal_except,V1820_TEXT_EXCEPTIONS)||!hex(proof.exceptions.text_only_sha256))fail('enumerated text-only carry exceptions');
 if(!/^(PENDING|GO \(.+\))$/.test(proof.publication_approval.status)||proof.publication_approval.top_five_effect!=='unchanged'||proof.publication_approval.fairness_review_required!==false||!String(proof.publication_approval.scope).startsWith('row-only:'))fail('standing approval');
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(proof.equating,previous.proof.equating,'unchanged equating');
 same(proof.scorers,previous.proof.scorers,'unchanged scorers');
 same(proof.pricing_module_sha256,'16f71aec341fdc5d0ed8ccab1c166f93eb7a98f1fe7440c3c4548c035f3f8ab0','reviewed pricing re-freeze');
 same(artifact.addendum.new_keys,V1820_NEW_KEYS,'addendum keys');
 if(artifact.addendum.new_draw!==V1820_DRAW||artifact.addendum.new_draw_cost_basis?.n_items!==1500)fail('new draw addendum');
 same(artifact.addendum.cost_basis,previous.artifact.addendum.cost_basis,'unchanged d1027 cost basis');
 same(proof.cost_basis,previous.proof.cost_basis,'unchanged cost basis');
 same(proof.new_draw,{draw:V1820_DRAW,status:'anchor-runs-pending',offset:{I:0,C:0},g_med_fixed:2.573387642438244,g_med_source:proof.new_draw?.g_med_source,cost_basis:artifact.addendum.new_draw_cost_basis,decision_limit:{limit_s:10,treatment:'share'},reference_params_sha256:'83f722dda177748a26ab1ecff3b86e812a30cb501ae9c49054833d14db4a3530'},'new draw proof');
 return true;
}
async function load(p,root){const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)};}
// Build-time memo (CR-729): every page of `next build` reads the live board, and each release reader re-validates its whole
// predecessor chain, so the build cost grows with the square of the release count. Inside `next build` only (NEXT_PHASE),
// the fully validated v1.8.20 bundle is kept per root and per worker process and every caller gets a deep copy. Tests, the
// validator's negative controls and the runtime server never set NEXT_PHASE and keep the uncached, fully re-validated path.
const V1820_BUILD_CACHE=new Map();
const v1820BuildCacheOn=()=>process.env.NEXT_PHASE==='phase-production-build';
const copyV1820Release=r=>{if(!r)return r;const{bytes,...rest}=r;return{...structuredClone(rest),bytes};};
export async function readOptionalJevbenchV1820Release(root=process.cwd()){
 if(!v1820BuildCacheOn())return readJevbenchV1820ReleaseUncached(root);
 const key=String(root);
 if(!V1820_BUILD_CACHE.has(key)){const p=readJevbenchV1820ReleaseUncached(root);V1820_BUILD_CACHE.set(key,p);p.catch(()=>V1820_BUILD_CACHE.delete(key));}
 return copyV1820Release(await V1820_BUILD_CACHE.get(key));
}
export async function readJevbenchV1820Candidate(root=process.cwd()){return readJevbenchV1820ReleaseUncached(root,{candidate:true});}
async function readJevbenchV1820ReleaseUncached(root,opts={}){
 let publication;try{publication=await load(V1820_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await (opts.candidate?readJevbenchV1819Candidate(root):readOptionalJevbenchV1819Release(root));if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V1820_ROOT}/jevbench-v1.8.19-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V1820_FILE_KEYS.map(async k=>[k,await load(`${V1820_ROOT}/jevbench-v1.8.20-${k}.json`,root)])));
 for(const[k,v]of Object.entries(b))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['carry','history','history-carry'])if(b[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k);
 validateJevbenchV1820Bundle({manifest:publication.value,artifact:b.results.value,categories:b.categories.value,carry:b.carry.value,proof:b.proof.value,previous,previousManifestSha256:predecessor.sha256},opts);
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,carry:b.carry.value,carrySha256:b.carry.sha256,proof:b.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1820ForBoard(root=process.cwd()){
 let p;try{p=(await load(V1820_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 return p?.review?.verdict==='PASS'?readOptionalJevbenchV1820Release(root):null;
}
export async function hasPublishedJevbenchV1820Release(root=process.cwd(),log=console.error){try{return Boolean(await readJevbenchV1820ForBoard(root));}catch{log('JevBench v1.8.20 navigation omitted: publication validation failed');return false;}}
export const V1820_BREAKDOWN_NOTE='Breakdown values are shown for cells with at least 30 scored items; more items are being added.';
// Display adapter only: frozen category artifacts and all score/rank fields stay untouched.
export function v1820CategoryDisplay(categories){
 const systems=Object.fromEntries(Object.entries(categories.systems).map(([k,r])=>[k,{...r,...Object.fromEntries(['topics','usecases','languages'].filter(d=>r[d]).map(d=>[d,Object.fromEntries(Object.entries(r[d]).filter(([,c])=>c.n>=30 && (c.coverage_n??c.n)>=30))]))}]));
 return withRowPoolCategoryRows({...categories,systems:{},min_n:30,display_min_n:30,rules:[...(categories.rules??[]),V1820_BREAKDOWN_NOTE]},systems,apiFullAddendumCategoryBounds(categories)??{});
}
// Project legacy row breakdowns at the same display floor; never mutate the frozen results.
const dropSmallRowBreakdowns=(value,inBreakdowns=false)=>{
 if(!value||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(v=>dropSmallRowBreakdowns(v,inBreakdowns));
 return Object.fromEntries(Object.entries(value).filter(([k,v])=>!(inBreakdowns&&v&&typeof v==='object'&&Number.isInteger(v.n)&&v.n<30)).map(([k,v])=>[k,dropSmallRowBreakdowns(v,inBreakdowns||k==='breakdowns')]));
};
export function v1820BoardInput(release,chain){
 const bounds={...apiFullAddendumCategoryBounds(chain?.categories),...structuredClone(V1820_NEW_ROW_BOUNDS)};
 const categories=withRowPoolCategoryRows({...release.categories,systems:{}},release.categories.systems,bounds);
 return {artifact:{...release.artifact,systems:release.artifact.systems.map(s=>dropSmallRowBreakdowns(s))},categories:v1820CategoryDisplay(categories)};
}
export function withV1820Addendum(chain,release){
 const update=a=>({...a,systems:release.artifact.systems.map(s=>dropSmallRowBreakdowns(s)),board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.8.20',v1820_sha256:release.sha256});
 const {categories}=v1820BoardInput(release,chain);
 const adapted=withRowPoolCategoryRows({...categories,revision:chain.published.revision,restated_by:'v1.8.20',systems:{}},categories.systems,apiFullAddendumCategoryBounds(categories));
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories:adapted,publishedCarry:release.carry};
}
