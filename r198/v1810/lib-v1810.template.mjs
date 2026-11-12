// v1.8.10: the 27 Oct 2026 regular draw (v1.6-regular-20261027) is EQUATED with four strong anchor systems and its rows are RANKED.
// Each row of the draw = published + the draw's anchor offset (Intelligence/Calibration, clipped 0..100); Capability = mean of the equated
// axes; composites and sort views follow from the equated axes by the frozen formula (jevComposite = score_v15.composite); the published
// numbers stay in published_scores and the confidence intervals are the ones measured on the draw before equating. Rows without a price stay unranked,
// and four rows whose top-five places lie within the uncertainty of the draw shift (or depend on the draw's item mix) are held unranked (FAIR_SUBSET).
// Every other row is unchanged except rank/ranks (and the display name of the one row its vendor renamed), which move only because the newly ranked rows join the order lists (removing them
// gives back v1.8.9's lists exactly). Independent review AND a bound FAIR fairness verdict gate every public reader.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual as equal} from 'node:util';
import {readOptionalJevbenchV189Release,validateV189PublicText} from './jevbench-v189-release.mjs';
import {jevComposite} from './jevbench-cohort-merge.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';
export const V1810_ROOT='data/raw/benchmarks/jevbench/v1.8';
export const V1810_MANIFEST=`${V1810_ROOT}/jevbench-v1.8.10-publication.json`;
export const V1810_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V1810_EXPECTED_HASHES=/*HASHES*/;
export const V1810_EQUATED_ROWS=/*EQROWS*/;
export const V1810_EQUATING=/*EQUATING*/;
export const V1810_RANKED_KEYS=/*RANKED*/;
export const V1810_UNRANKED=/*UNRANKED*/;
export const V1810_HELD=/*HELD*/;
export const V1810_RENAMES=/*RENAMES*/;
export const V1810_SCORERS=/*SCORERS*/;
export const V1810_DRAW='v1.6-regular-20261027';
export const V1810_OFFSET=Object.freeze({I:-2.884891186577587,C:-1.8542447151797177});
export const V1810_EQUATED_KEYS=Object.keys(V1810_EQUATED_ROWS).sort();
export const V1810_NOTE_UNPRICED='Measured on the 27 Oct 2026 draw; shown on the reference scale by anchor equating with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points).';
export const V1810_NOTE='Measured on the 27 Oct 2026 draw; shown on the reference scale by anchor equating with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points; 95% interval of the Intelligence shift -5.9 to +1.1).';
export const V1810_H2O_EXTRA='On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.';
export const V1810_HELD_TEXT='Measured on the 27 Oct 2026 draw and shown on the reference scale by anchor equating with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points). Not ranked yet: its top-five places lie within the uncertainty of that shift (95% interval -5.9 to +1.1 Intelligence points). Ranking follows when more anchor runs narrow the interval.';
export const V1810_H2O_HELD_TEXT='Measured on the 27 Oct 2026 draw and shown on the reference scale by anchor equating with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points). Not ranked: on that draw it scores 5.8 points above H2O-Lightning-4B v1.1 on the sealed items but 4.2 points below it on the 300 public items both answered, so its higher score there depends on how that draw\'s items are built, which the anchor shift cannot correct. '+V1810_H2O_EXTRA;
export const V1810_BOUNDARY={karpo_decision_31b:'Its #5 place on Composite B among all systems is within the uncertainty of the draw shift.','arcbright-elf-1-12b-r2':'Its #4 place on the open-weights Composite A and C lists is within the uncertainty of the draw shift.'};
export const V1810_META_KEY='metadecision-31b-rain';
export const V1810_META_NOTE='On this draw it scores 13.3 points higher on the sealed items than on the 300 public items, more than any row measured on the reference draw; its #2 Capability places hold even if that gap is set to the reference-draw median.';
export const V1810_HIST='Equated the 27 Oct regular draw with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points) and ranked 31 of its rows; four stay unranked because their top-five places lie within the uncertainty of the shift; renamed AutoTrust\'s JEV-27B to AutoTrust-Decider-Pro-27B at the vendor\'s request.';
export const V1810_NO_PRICE_NOTE=/*NOPRICE*/;
export const V1810_APPROVAL_STATUS='GO (fair top-five change, Florian rule 25 Oct 2026; strong-anchor equating of the 27 Oct draw)';
export const V1810_FAIR_PATH='workers/r276-v1810-recheck/RESULT.json';
const H2O='h2o-lightning-4b-v1.4.1',KARPO='karpo_decision_31b';
const REFERENCE_G_MED=2.573387642438244;
const EQ_FIELDS=['axes','scores','views','jevbench_score','capability','published_scores','ranked','rank','ranks','listing','not_ranked_because','listing_note','disclosure','underlying','draw'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=m=>{throw new Error(`JevBench v1.8.10: ${m}`);};
const same=(a,b,m)=>{if(!equal(a,b))fail(m);};
const hex=s=>/^[a-f0-9]{64}$/.test(s??'');
const near=(a,b)=>(a==null&&b==null)||(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-9);
const clip=x=>Math.min(100,Math.max(0,x));
const omit=(o,fields)=>Object.fromEntries(Object.entries(o).filter(([k])=>!fields.includes(k)));
const SORT_VIEWS={'Intelligence only':[1,0,0,0],'Emphasis on Accuracy 60:20:20':[0.6,0,0.2,0.2],'Emphasis on Speed 20:60:20':[0.2,0,0.6,0.2],'Emphasis on Cost 20:20:60':[0.2,0,0.2,0.6],'Balanced 33:33:33':[1/3,0,1/3,1/3]};
const AXES=['intelligence','calibration','speed','cost'];
const INTERNAL=/\/home\/|workers\/|#\d{4,}|Florian|\bPREREG\b|auto-intake|custody|deputy|jevbench-add-requests|release.owner|\bboard #|\{[A-Za-z_][A-Za-z0-9_]*\}/i;
const INTERNAL_CS=/\bDECISIONS\b/;
const STALE=/not yet equated|until (?:that|the) draw is equated|shown as published, offset 0|\(offset 0\)|stronger anchor|first anchor runs|Shown unranked until/i;
function publicOnly(v){
 if(!v||typeof v!=='object')return;
 for(const [k,x] of Object.entries(v)){
  if(/^(task_id|opaque_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret)$/i.test(k))fail('private field');
  publicOnly(x);
 }
}
function strings(v,out=[]){if(typeof v==='string')out.push(v);else if(Array.isArray(v))v.forEach(x=>strings(x,out));else if(v&&typeof v==='object')Object.values(v).forEach(x=>strings(x,out));return out;}
/** The equating rule: published + offset on Intelligence/Calibration; everything derived follows from the equated axes. */
export function checkEquatedRow(s,published,options){
 same(s.published_scores,published,'published numbers kept '+s.key);
 if(!near(s.axes.intelligence,clip(published.axes.intelligence+V1810_OFFSET.I))||!near(s.axes.calibration,clip(published.axes.calibration+V1810_OFFSET.C)))fail('equated axes '+s.key);
 for(const a of ['speed','cost'])if(s.axes[a]!==published.axes[a])fail('unequated axis '+a+' '+s.key);
 if(!near(s.capability,(s.axes.intelligence+s.axes.calibration)/2))fail('equated capability '+s.key);
 for(const [o,{weights,intelligence_floor}] of Object.entries(options))if(!near(s.scores[o],jevComposite(s.axes,Object.fromEntries(AXES.map(a=>[a,weights[a]/100])),intelligence_floor)))fail('equated composite '+o+' '+s.key);
 for(const [n,w] of Object.entries(SORT_VIEWS))if(!near(s.views[n],jevComposite(s.axes,Object.fromEntries(AXES.map((a,k)=>[a,w[k]])),50)))fail('equated view '+n+' '+s.key);
 if(s.jevbench_score!==s.scores.A)fail('headline '+s.key);
 if(s.draw?.id!==V1810_DRAW||s.draw.status!=='equated')fail('equated draw '+s.key);
 if(s.draw.ci_basis!=='measured on the draw before equating')fail('interval basis label '+s.key);
 same(s.draw.offset,{...V1810_OFFSET},'draw offset '+s.key);same(s.draw.offset_ci95,V1810_EQUATING.offset_ci95,'draw offset interval '+s.key);
 const priced=Object.keys(options).every(o=>s.scores[o]!=null);
 if(V1810_RANKED_KEYS.includes(s.key)){
  if(!priced||s.ranked!==true||s.listing!=='ranked'||'not_ranked_because' in s||V1810_HELD.includes(s.key))fail('equated row ranked '+s.key);
  if(s.listing_note!==[V1810_NOTE,V1810_BOUNDARY[s.key],s.key===V1810_META_KEY?V1810_META_NOTE:null].filter(Boolean).join(' '))fail('public note '+s.key);
 }else if(V1810_HELD.includes(s.key)){
  if(!priced||s.ranked!==false||s.listing!=='unranked'||s.rank!==null||'listing_note' in s||s.not_ranked_because!==(s.key===H2O?V1810_H2O_HELD_TEXT:V1810_HELD_TEXT)||!(s.key in V1810_UNRANKED))fail('held row stays unranked '+s.key);
  same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks '+s.key);
 }else{
  if(priced||s.ranked!==false||s.listing!=='unranked'||s.rank!==null||s.not_ranked_because!==V1810_NO_PRICE_NOTE||s.listing_note!==V1810_NOTE_UNPRICED||!(s.key in V1810_UNRANKED))fail('row stays unranked for its price '+s.key);
  same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks '+s.key);
 }
 for(const t of [s.listing_note,s.not_ranked_because,s.disclosure,s.underlying])if(typeof t==='string'&&(INTERNAL.test(t)||INTERNAL_CS.test(t)||STALE.test(t)))fail('public text '+s.key);
}
/** Candidate validation is explicit; public readers always require an independent PASS receipt and a bound FAIR fairness verdict. */
export function validateJevbenchV1810Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256},{candidate=false}={}){
 for(const v of [manifest,artifact,categories,carry,proof])publicOnly(v);
 if(manifest.revision!=='v1.8.10'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('manifest identity');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!hex(manifest.review.receipt_sha256)))fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.8.9',publication_sha256:previousManifestSha256},'predecessor binding');
 if(previous?.artifact.revision!=='v1.8.9'||(!candidate&&previous.manifest.review.verdict!=='PASS'))fail('validated predecessor');
 for(const f of V1810_FILE_KEYS){
  same(manifest.files[f]?.path,`${V1810_ROOT}/jevbench-v1.8.10-${f}.json`,'file path '+f);
  same(manifest.files[f]?.sha256,V1810_EXPECTED_HASHES[f],'pinned bytes '+f);
 }
 for(const f of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[f],previous.manifest[f],'history binding '+f);
 if(artifact.revision!=='v1.8.10'||artifact.run_kind!=='same-draw-addendum'||artifact.provisional!==false)fail('artifact identity');
 for(const f of ['method','G_med','options','noul_method','protocol','types','tier_weights','headline'])same(artifact[f],previous.artifact[f],'unchanged '+f);
 const rows=artifact.systems,by=new Map(rows.map(s=>[s.key,s]));
 if(by.size!==rows.length)fail('duplicate key');
 same([...by.keys()].sort(),previous.artifact.systems.map(s=>s.key).sort(),'exact roster');
 if(artifact.roster_count!==rows.length||artifact.n_ranked!==rows.filter(s=>s.ranked).length||artifact.n_ranked!==previous.artifact.n_ranked+V1810_RANKED_KEYS.length)fail('counts');
 same(previous.artifact.systems.filter(s=>s.draw?.id===V1810_DRAW).map(s=>s.key).sort(),V1810_EQUATED_KEYS,'rows of the equated draw');
 same([...V1810_RANKED_KEYS,...Object.keys(V1810_UNRANKED)].sort(),V1810_EQUATED_KEYS,'ranked + unranked partition');
 if(!V1810_HELD.every(k=>k in V1810_UNRANKED)||V1810_HELD.length!==4||V1810_RANKED_KEYS.length!==31)fail('31 ranked, 4 held');
 for(const p of previous.artifact.systems){
  const now=by.get(p.key);
  if(V1810_EQUATED_KEYS.includes(p.key)){
   same(omit(now,EQ_FIELDS),omit(p,EQ_FIELDS),'carried row '+p.key);
   same(Object.fromEntries(EQ_FIELDS.filter(f=>f in now&&f!=='rank'&&f!=='ranks').map(f=>[f,now[f]])),omit(V1810_EQUATED_ROWS[p.key],['ranks','rank']),'equated row spec '+p.key);
   checkEquatedRow(now,{axes:p.axes,scores:p.scores,capability:p.capability},artifact.options);
   same(omit(now.draw,['status','offset','offset_ci95','ci_basis']),omit(p.draw,['status','offset','offset_ci95']),'draw block '+p.key);
   const pins=proof.equated_rows?.[p.key]?.disclosure_draw_sentence;
   if(!pins)fail('draw sentence pin '+p.key);
   for(const f of ['disclosure','underlying'])for(const x of pins[f]??[])if(!hex(x.before_sha256)||!hex(x.after_sha256))fail('draw sentence pin hash '+p.key);
  }else if(p.key in V1810_RENAMES){
   same(omit(now,['rank','ranks','display']),omit(p,['rank','ranks','display']),'carried row '+p.key);
   if(p.display!==V1810_RENAMES[p.key].before||now.display!==V1810_RENAMES[p.key].after||now.key!==p.key)fail('display rename '+p.key);
  }else same(omit(now,['rank','ranks']),omit(p,['rank','ranks']),'carried row '+p.key);
  same(categories.systems[p.key],previous.categories.systems[p.key],'carried cells '+p.key);
  same(categories.lanes[p.key],previous.categories.lanes[p.key],'carried lane '+p.key);
 }
 if(by.get(KARPO)&&V1810_EQUATED_KEYS.includes(KARPO))validateV189PublicText(by.get(KARPO));
 for(const k of V1810_EQUATED_KEYS){const j=JSON.stringify(omit(by.get(k),['published_scores']));if(INTERNAL.test(j)||INTERNAL_CS.test(j))fail('internal text '+k);}
 // Ranks: every order list is sorted, holds exactly the ranked rows, gives each its rank, and minus the newly ranked rows equals v1.8.9's.
 for(const m of ['A','B','C','capability']){
  const ord=artifact.board[m].order;
  same([...ord].sort(),rows.filter(s=>s.ranked).map(s=>s.key).sort(),'order membership '+m);
  same(ord.filter(k=>!V1810_RANKED_KEYS.includes(k)),previous.artifact.board[m].order,'order lists without the newly ranked rows '+m);
  const val=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];
  ord.forEach((k,i)=>{if(by.get(k).ranks[m]!==i+1||(m==='A'&&by.get(k).rank!==i+1))fail('rank '+k);if(i&&val(ord[i-1])<val(k))fail('sort '+m)});
 }
 same(artifact.board,Object.fromEntries(Object.entries(artifact.board).map(([m,b])=>[m,{...previous.artifact.board[m],order:b.order}])),'board metadata');
 same(carry,previous.carry,'dated carry');
 same(Object.keys(categories.systems).sort(),Object.keys(previous.categories.systems).sort(),'category roster');
 same(omit(categories,['revision','results_sha256','source_results_sha256']),omit(previous.categories,['revision','results_sha256','source_results_sha256']),'cells unchanged');
 if(categories.revision!=='v1.8.10'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 if(proof.revision!=='v1.8.10'||proof.carried_rows!==previous.artifact.systems.length)fail('proof identity');
 same(proof.equating,V1810_EQUATING,'equating binding');
 if(!hex(V1810_EQUATING.files?.equating?.sha256)||V1810_EQUATING.anchors?.length!==4||V1810_EQUATING.status!=='equated')fail('equating provenance');
 same(V1810_EQUATING.offset,{...V1810_OFFSET},'equating offset');
 same(Object.keys(proof.equated_rows).sort(),V1810_EQUATED_KEYS,'equated row proof roster');
 for(const [k,r] of Object.entries(proof.equated_rows))if(r.treatment!==(V1810_RANKED_KEYS.includes(k)?'ranked':V1810_HELD.includes(k)?'held':'unranked'))fail('treatment '+k);
 same(proof.held_rows,[...V1810_HELD].sort(),'held rows');same(proof.display_renames,V1810_RENAMES,'display renames');
 same(artifact.addendum.held_keys,[...V1810_HELD].sort(),'addendum held keys');same(artifact.addendum.display_renamed_keys,Object.keys(V1810_RENAMES).sort(),'addendum renamed keys');
 same(proof.ranked_rows,[...V1810_RANKED_KEYS].sort(),'ranked rows');same(proof.unranked_rows,V1810_UNRANKED,'unranked rows');
 same(artifact.addendum.equated_keys,V1810_EQUATED_KEYS,'addendum equated keys');
 same(artifact.addendum.ranked_keys,[...V1810_RANKED_KEYS].sort(),'addendum ranked keys');
 same(artifact.addendum.new_keys,[],'addendum keys');
 same(artifact.addendum.same_draw,V1810_DRAW,'addendum draw');
 if(!hex(proof.source_inputs?.equating_sha256)||proof.source_inputs.equating_sha256!==V1810_EQUATING.files.equating.sha256||artifact.source_sha256!==proof.source_inputs.equating_sha256)fail('input provenance');
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(proof.pricing_module_sha256,previous.proof.pricing_module_sha256,'pricing pin');
 same(proof.scorers,V1810_SCORERS,'scorer pins (v1.8.9 tools, byte-identical)');
 same(proof.scorers,previous.proof.scorers,'scorer pins equal the predecessor');
 for(const f of ['new_rows','remeasured_rows','repriced_rows','exceptions'])same(proof[f],{},'no '+f);
 const a=proof.publication_approval;
 if(a?.fresh_baseline!=='v1.8.9'||a.button_tap!==false||a.top_five_preview?.sha256!==proof.topfive_diff_sha256||!hex(proof.topfive_diff_sha256)||!a.top_five_preview?.path)fail('top-five preview binding');
 if(a.equating_basis?.decision!=='d1027-equated-strong4-57394')fail('release basis');
 if(a.top_five_effect!=='changed'||a.status!==V1810_APPROVAL_STATUS||a.go?.quote!=='3 ja'||a.go?.date!=='2026-10-25')fail('fair top-five GO');
 const fair=a.fairness_check;
 if(fair?.path!==V1810_FAIR_PATH||(fair.verdict!=='FAIR'&&!(candidate&&fair.verdict==='PENDING')))fail('bound FAIR verdict required');
 if(fair.verdict==='FAIR'&&!hex(fair.sha256))fail('FAIR receipt pin');
 return true;
}
async function load(p,root){const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)};}
// Build-time memo (CR-729): inside `next build` only (NEXT_PHASE) the fully validated v1.8.10 bundle is kept per root and per worker process.
const V1810_BUILD_CACHE=new Map();
const v1810BuildCacheOn=()=>process.env.NEXT_PHASE==='phase-production-build';
const copyV1810Release=r=>{if(!r)return r;const{bytes,...rest}=r;return{...structuredClone(rest),bytes};};
export async function readOptionalJevbenchV1810Release(root=process.cwd()){
 if(!v1810BuildCacheOn())return readJevbenchV1810ReleaseUncached(root);
 const key=String(root);
 if(!V1810_BUILD_CACHE.has(key)){const p=readJevbenchV1810ReleaseUncached(root);V1810_BUILD_CACHE.set(key,p);p.catch(()=>V1810_BUILD_CACHE.delete(key));}
 return copyV1810Release(await V1810_BUILD_CACHE.get(key));
}
async function readJevbenchV1810ReleaseUncached(root){
 let publication;try{publication=await load(V1810_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV189Release(root);if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V1810_ROOT}/jevbench-v1.8.9-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V1810_FILE_KEYS.map(async k=>[k,await load(`${V1810_ROOT}/jevbench-v1.8.10-${k}.json`,root)])));
 for(const[k,v]of Object.entries(b))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['carry','history','history-carry'])if(b[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k);
 validateJevbenchV1810Bundle({manifest:publication.value,artifact:b.results.value,categories:b.categories.value,carry:b.carry.value,proof:b.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,carry:b.carry.value,carrySha256:b.carry.sha256,proof:b.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1810ForBoard(root=process.cwd()){
 let p;try{p=(await load(V1810_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 return p?.review?.verdict==='PASS'?readOptionalJevbenchV1810Release(root):null;
}
export async function hasPublishedJevbenchV1810Release(root=process.cwd(),log=console.error){try{return Boolean(await readJevbenchV1810ForBoard(root));}catch{log('JevBench v1.8.10 navigation omitted: publication validation failed');return false;}}
export function v1810BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV1810Addendum(chain,release){
 const bounds={...apiFullAddendumCategoryBounds(chain.categories)};
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.8.10',v1810_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.8.10',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
