// Nine-row ranking review and one accepted measured row; independent review gates every public reader.
import {jevComposite} from './jevbench-cohort-merge.mjs';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual as equal} from 'node:util';
import {readOptionalJevbenchV1817Release,readJevbenchV1817Candidate} from './jevbench-v1817-release.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';
export const V1818_ROOT='data/raw/benchmarks/jevbench/v1.8';
export const V1818_MANIFEST=`${V1818_ROOT}/jevbench-v1.8.18-publication.json`;
export const V1818_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V1818_EXPECTED_HASHES=/*HASHES*/;
export const V1818_NEW_ROWS=/*ROWS*/;
export const V1818_NEW_ROW_BOUNDS=/*BOUNDS*/;
export const V1818_EXPECTED_PROOF=/*PROOF*/;
export const V1818_TEXT_EXCEPTIONS=/*TEXT_EXCEPTIONS*/;
export const V1818_NEW_CELLS=/*CELLS*/;
export const V1818_BREAKDOWN_POLICY=/*SCOPE*/;
export const V1818_NEW_KEYS=Object.keys(V1818_NEW_ROWS).sort();
export const V1818_NOTE='Added after the v1.8.10 ranking review; it is ranked at the next review.';
export const V1818_T1='Measured on the 27 Oct 2026 draw and shown on the reference scale by anchor equating with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points). Not ranked yet: its top-five places lie within the uncertainty of that shift (95% interval -5.9 to +1.1 Intelligence points). Ranking follows when more anchor runs narrow the interval.';
export const V1818_T2='Measured on the 27 Oct 2026 draw; shown on the reference scale by anchor equating with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points; 95% interval of the Intelligence shift -5.9 to +1.1).';
const fail=m=>{throw Error('JevBench v1.8.18: '+m);};
const same=(a,b,m)=>{if(!equal(a,b))fail(m);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const hex=s=>/^[a-f0-9]{64}$/.test(s??'');
// The publication scope is intentionally narrower than the private scoring record.
export function validateV1818PublicText(value){
 if(value?.model_pin!=='oidlabs/cue-reflex-4B@a36bd3ec3020f567d43ffb95ba6323a44d6a0ccf')fail('pinned weights');
 const forbidden=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|fastlane-native|jevbench-add-requests|\/home\/|\b(?:custody|deputy|Florian|PREREG)\b/i;
 if(forbidden.test(JSON.stringify(value)))fail('private wording');
 const forbiddenKeys=new Set(['visibility','order','order_id','pod_id','raw_file','answered_ok','missing']);
 function walk(v){if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(forbiddenKeys.has(k))fail('private field '+k);walk(x);}}
 walk(value);return true;
}
export function validateJevbenchV1818Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256},{candidate=false}={}){
 if(manifest.revision!=='v1.8.18'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('manifest identity');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||/synthetic|pending/i.test(manifest.review.engine)||!hex(manifest.review.receipt_sha256)))fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.8.17',publication_sha256:previousManifestSha256},'predecessor binding');
 if(previous?.artifact.revision!=='v1.8.17'||(!candidate&&previous.manifest.review.verdict!=='PASS'))fail('validated predecessor');
 for(const f of V1818_FILE_KEYS){same(manifest.files[f]?.path,`${V1818_ROOT}/jevbench-v1.8.18-${f}.json`,'file path '+f);same(manifest.files[f]?.sha256,V1818_EXPECTED_HASHES[f],'pinned hash '+f);}
 for(const f of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[f],previous.manifest[f],'historical binding '+f);
 if(artifact.revision!=='v1.8.18'||artifact.run_kind!=='same-draw-addendum'||artifact.provisional!==false)fail('artifact identity');
 for(const f of ['method','G_med'])same(artifact[f],previous.artifact[f],'unchanged '+f);
 const by=new Map(artifact.systems.map(s=>[s.key,s]));
 if(by.size!==artifact.systems.length||artifact.roster_count!==by.size)fail('roster counts');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1818_NEW_KEYS].sort(),'exact roster');
 const cfg=proof.rank_review.configuration,reviewed=new Set([...cfg.ranked,...cfg.held]);
 const textByKey=new Map(V1818_TEXT_EXCEPTIONS.map(e=>[e.key,e]));
 const strip=(row,fields)=>Object.fromEntries(Object.entries(row).filter(([k])=>!fields.includes(k)));
 for(const prior of previous.artifact.systems){
  const row=by.get(prior.key),fields=['rank','ranks'];
  if(reviewed.has(prior.key))fields.push('ranked','listing','not_ranked_because','listing_note');
  if(textByKey.has(prior.key)){
   const e=textByKey.get(prior.key);same(prior.listing_note,e.before,'prior T3 note');same(row.listing_note,e.after,'candidate T3 note');fields.push('listing_note');
  }
  same(strip(row,fields),strip(prior,fields),'carried non-ranking fields '+prior.key);
  same(categories.systems[prior.key],previous.categories.systems[prior.key],'carried cells '+prior.key);
  same(categories.lanes[prior.key],previous.categories.lanes[prior.key],'carried lane '+prior.key);
 }
 if(artifact.n_ranked!==previous.artifact.n_ranked+cfg.ranked.length||artifact.n_ranked!==artifact.systems.filter(s=>s.ranked).length)fail('ranked count');
 for(const k of reviewed){
  const row=by.get(k),ranked=cfg.ranked.includes(k);
  if(row.ranked!==ranked||row.listing!==(ranked?'ranked':'unranked'))fail('review disposition '+k);
  if(ranked){if(!row.listing_note?.startsWith(V1818_T2)||row.not_ranked_because)fail('ranked text '+k);}
  else if(row.not_ranked_because!==V1818_T1)fail('held text '+k);
 }
 const close=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-9;
 for(const k of V1818_NEW_KEYS){
  const row=by.get(k);validateV1818PublicText(row);same(row,V1818_NEW_ROWS[k],'new row '+k);
  if(row.draw.status!=='equated'||!close(row.draw.offset.I,-2.884891186577587)||!close(row.draw.offset.C,-1.8542447151797177)||row.draw.release!=='v1.8.18')fail('equating '+k);
  for(const [a,o]of [['intelligence','I'],['calibration','C']])if(!close(row.axes[a],Math.min(100,Math.max(0,row.published_scores.axes[a]+row.draw.offset[o]))))fail('equated axis '+a);
  if(!close(row.capability,(row.axes.intelligence+row.axes.calibration)/2))fail('capability');
  if(row.decision_limit.limit_s!==10||row.decision_limit.treatment!=='share'||!close(row.v16.g_med_used,2.573387642438244))fail('method');
  same(row.status,{status:'complete'},'status without private counts');
  const pr=proof.new_rows[k],u=pr.cost;
  for(const f of ['axes','decision_limit','model_pin','composite_ci95'])same(pr[f],row[f],'proof '+f);
  if(!close(row.cost.usd_per_1000,u.cost_common)||!close(u.cost_common,Math.min(u.list_common,u.gpu_common))||row.cost.common_basis.n_items!==1489)fail('min list/GPU cost');
  if(row.base_model!=='google/gemma-4-E4B-it'||row.api_flag!==false||row.endpoint_kind!=='gpu'||row.v16.lane!=='selfhosted'||row.paid_fast_lane!==true)fail('self-hosted identity');
  for(const term of ['yes/no confidence rule','0.199','0.801','HTTP 422'])if(!row.notes.includes(term))fail('confidence-rule disclosure '+term);
  same(categories.systems[k],V1818_NEW_CELLS[k],'new category cells');
  for(const dim of Object.keys(categories.systems[k]))if(!['topics','usecases','languages'].includes(dim))fail('unapproved dimension');
 }
 for(const row of artifact.systems){
  for(const [o,b]of Object.entries(artifact.board)){
   const index=b.order.indexOf(row.key),rank=index<0?null:index+1;
   if(row.ranks[o]!==rank||(o==='A'&&row.rank!==rank))fail('rank position '+row.key);
   if(row.ranked!==(index>=0))fail('rank eligibility '+row.key);
  }
  if(reviewed.has(row.key))for(const[o,{weights,intelligence_floor}]of Object.entries(artifact.options)){
   const val=jevComposite(row.axes,Object.fromEntries(Object.entries(weights).map(([a,v])=>[a,v/100])),intelligence_floor);
   if(!close(val,row.scores[o]))fail('composite '+row.key+o);
  }
 }
 for(const[o,b]of Object.entries(artifact.board)){
  const val=k=>o==='capability'?by.get(k).capability:by.get(k).scores[o];
  if(new Set(b.order).size!==b.order.length)fail('duplicate order');
  for(let i=1;i<b.order.length;i++)if(val(b.order[i])>val(b.order[i-1])+1e-9)fail('order '+o);
 }
 same(carry,previous.carry,'immutable carry');
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V1818_NEW_KEYS].sort(),'category roster');
 if(categories.revision!=='v1.8.18'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 same(proof,V1818_EXPECTED_PROOF,'exact proof');
 if(proof.carried_rows!==previous.artifact.systems.length||!equal(proof.carried_rows_equal_except.carried_text,V1818_TEXT_EXCEPTIONS)||!hex(proof.exceptions.text_only_sha256))fail('enumerated text-only carry exceptions');
 if(proof.publication_approval.scope!=='nine-row ranking review, Cue addition and Starlord base disclosure'||proof.publication_approval.fresh_baseline!=='v1.8.17')fail('scoped candidate authority');
 if(!candidate&&(proof.publication_approval.fairness_review_required!==false||proof.rank_review.fairness_review!=='PASS'))fail('independent fairness review PENDING');
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(proof.equating,previous.proof.equating,'unchanged equating');
 same(proof.scorers,previous.proof.scorers,'unchanged scorers');
 same(proof.pricing_module_sha256,previous.proof.pricing_module_sha256,'unchanged pricing');
 same(artifact.addendum.new_keys,V1818_NEW_KEYS,'addendum keys');
 return true;
}
async function load(p,root){const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)};}
// Build-time memo (CR-729): every page of `next build` reads the live board, and each release reader re-validates its whole
// predecessor chain, so the build cost grows with the square of the release count. Inside `next build` only (NEXT_PHASE),
// the fully validated v1.8.18 bundle is kept per root and per worker process and every caller gets a deep copy. Tests, the
// validator's negative controls and the runtime server never set NEXT_PHASE and keep the uncached, fully re-validated path.
const V1818_BUILD_CACHE=new Map();
const v1818BuildCacheOn=()=>process.env.NEXT_PHASE==='phase-production-build';
const copyV1818Release=r=>{if(!r)return r;const{bytes,...rest}=r;return{...structuredClone(rest),bytes};};
export async function readOptionalJevbenchV1818Release(root=process.cwd()){
 if(!v1818BuildCacheOn())return readJevbenchV1818ReleaseUncached(root);
 const key=String(root);
 if(!V1818_BUILD_CACHE.has(key)){const p=readJevbenchV1818ReleaseUncached(root);V1818_BUILD_CACHE.set(key,p);p.catch(()=>V1818_BUILD_CACHE.delete(key));}
 return copyV1818Release(await V1818_BUILD_CACHE.get(key));
}
export async function readJevbenchV1818Candidate(root=process.cwd()){return readJevbenchV1818ReleaseUncached(root,{candidate:true});}
async function readJevbenchV1818ReleaseUncached(root,opts={}){
 let publication;try{publication=await load(V1818_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await (opts.candidate?readJevbenchV1817Candidate(root):readOptionalJevbenchV1817Release(root));if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V1818_ROOT}/jevbench-v1.8.17-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V1818_FILE_KEYS.map(async k=>[k,await load(`${V1818_ROOT}/jevbench-v1.8.18-${k}.json`,root)])));
 for(const[k,v]of Object.entries(b))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['carry','history','history-carry'])if(b[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k);
 validateJevbenchV1818Bundle({manifest:publication.value,artifact:b.results.value,categories:b.categories.value,carry:b.carry.value,proof:b.proof.value,previous,previousManifestSha256:predecessor.sha256},opts);
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,carry:b.carry.value,carrySha256:b.carry.sha256,proof:b.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1818ForBoard(root=process.cwd()){
 let p;try{p=(await load(V1818_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 return p?.review?.verdict==='PASS'?readOptionalJevbenchV1818Release(root):null;
}
export async function hasPublishedJevbenchV1818Release(root=process.cwd(),log=console.error){try{return Boolean(await readJevbenchV1818ForBoard(root));}catch{log('JevBench v1.8.18 navigation omitted: publication validation failed');return false;}}
export const V1818_BREAKDOWN_NOTE='Breakdown values are shown for cells with at least 30 scored items; more items are being added.';
// Display adapter only: frozen category artifacts and all score/rank fields stay untouched.
export function v1818CategoryDisplay(categories){
 const systems=Object.fromEntries(Object.entries(categories.systems).map(([k,r])=>[k,{...r,...Object.fromEntries(['topics','usecases','languages'].filter(d=>r[d]).map(d=>[d,Object.fromEntries(Object.entries(r[d]).filter(([,c])=>c.n>=30 && (c.coverage_n??c.n)>=30))]))}]));
 return withRowPoolCategoryRows({...categories,systems:{},min_n:30,display_min_n:30,rules:[...(categories.rules??[]),V1818_BREAKDOWN_NOTE]},systems,apiFullAddendumCategoryBounds(categories)??{});
}
// Project legacy row breakdowns at the same display floor; never mutate the frozen results.
const dropSmallRowBreakdowns=(value,inBreakdowns=false)=>{
 if(!value||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(v=>dropSmallRowBreakdowns(v,inBreakdowns));
 return Object.fromEntries(Object.entries(value).filter(([k,v])=>!(inBreakdowns&&v&&typeof v==='object'&&Number.isInteger(v.n)&&v.n<30)).map(([k,v])=>[k,dropSmallRowBreakdowns(v,inBreakdowns||k==='breakdowns')]));
};
export function v1818BoardInput(release,chain){
 const bounds={...apiFullAddendumCategoryBounds(chain?.categories),...structuredClone(V1818_NEW_ROW_BOUNDS)};
 const categories=withRowPoolCategoryRows({...release.categories,systems:{}},release.categories.systems,bounds);
 return {artifact:{...release.artifact,systems:release.artifact.systems.map(s=>dropSmallRowBreakdowns(s))},categories:v1818CategoryDisplay(categories)};
}
export function withV1818Addendum(chain,release){
 const update=a=>({...a,systems:release.artifact.systems.map(s=>dropSmallRowBreakdowns(s)),board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.8.18',v1818_sha256:release.sha256});
 const {categories}=v1818BoardInput(release,chain);
 const adapted=withRowPoolCategoryRows({...categories,revision:chain.published.revision,restated_by:'v1.8.18',systems:{}},categories.systems,apiFullAddendumCategoryBounds(categories));
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories:adapted,publishedCarry:release.carry};
}
