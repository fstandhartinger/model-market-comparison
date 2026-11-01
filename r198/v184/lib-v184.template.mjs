// One measured but unranked row; independent review gates every public reader.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual as equal} from 'node:util';
import {readOptionalJevbenchV183Release} from './jevbench-v183-release.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';
export const V184_ROOT='data/raw/benchmarks/jevbench/v1.8';
export const V184_MANIFEST=`${V184_ROOT}/jevbench-v1.8.4-publication.json`;
export const V184_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V184_EXPECTED_HASHES=/*HASHES*/;
export const V184_NEW_ROWS=/*ROWS*/;
export const V184_NEW_ROW_BOUNDS=/*BOUNDS*/;
export const V184_EXPECTED_PROOF=/*PROOF*/;
export const V184_TEXT_EXCEPTIONS=/*TEXT_EXCEPTIONS*/;
export const V184_NEW_KEYS=Object.keys(V184_NEW_ROWS).sort();
export const V184_NOTE='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.';
const fail=m=>{throw Error('JevBench v1.8.4: '+m);};
const same=(a,b,m)=>{if(!equal(a,b))fail(m);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const hex=s=>/^[a-f0-9]{64}$/.test(s??'');
// Strict path-aware public text validation: one exact clause exception only.
export const V184_ALLEC_CLAUSE='(The allec weights are plantwaterer/allec@e54027aa; no separate allec row is published on this board.)';
export const V184_ALLEC_SENTENCE='same weights as the earlier allec entry; short requests are read in several option orders and averaged.';
export const V184_ALLEC_CLAUSE_SHA256=hash(V184_ALLEC_CLAUSE);
export function validateV184PublicText(value){
 if(!value?.model_pin||typeof value.model_pin!=='string'||!value.model_pin.includes('@'))fail('missing model pin');
 const allec=value?.key==='allec-oavg';
 if(allec){
  const text=value.disclosure;
  if(typeof text!=='string'||text.split(V184_ALLEC_CLAUSE).length!==2||text.split(V184_ALLEC_SENTENCE).length!==2||!text.includes('Serving description: '+V184_ALLEC_SENTENCE+' '+V184_ALLEC_CLAUSE))fail('mandatory allec clause binding');
 }
 let allowed=0;
 function walk(v,path){
  if(typeof v==='string'){
   if(/0\.0645|x cap|cost cap USD|0\.15 s/i.test(v))fail('release-level numbers in row prose');
   const forbidden=/worker|lead|custody|custodian|release.owner|measurement review|deputy|board|#\d+|Florian|\bCoS\b|order.id|jevbench-add-requests|fastlane-native|r208-v184|code_revision|smoke-stop|at the time of drafting|internally measured export|eligible for intake|class C deviation|TTL-fit|pair-fit|accepted root pricing reference|pre-registration review|provider decide \(proxy aws\)|Disposition is for|\bPREREG\b|\{/ig;
   const start=allec&&path.length===1&&path[0]==='disclosure'?v.indexOf(V184_ALLEC_CLAUSE):-1;
   const board=start>=0?start+V184_ALLEC_CLAUSE.indexOf('board'):-1;
   for(const match of v.matchAll(forbidden)){
    if(start>=0&&match[0]==='board'&&match.index===board)allowed++;
    else fail('internal public wording at '+path.join('.'));
   }
  }else if(Array.isArray(v)){v.forEach((x,i)=>walk(x,[...path,i]));}
  else if(v&&typeof v==='object'){for(const[k,x]of Object.entries(v))walk(x,[...path,k]);}
 }
 walk(value,[]);
 if(allowed!==(allec?1:0))fail('allec exception count');
 return true;
}
export function validateJevbenchV184Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256},{candidate=false}={}){
 if(manifest.revision!=='v1.8.4'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('manifest identity');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!hex(manifest.review.receipt_sha256)))fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.8.3',publication_sha256:previousManifestSha256},'predecessor binding');
 if(previous?.artifact.revision!=='v1.8.3'||(!candidate&&previous.manifest.review.verdict!=='PASS'))fail('validated predecessor');
 for(const f of V184_FILE_KEYS){same(manifest.files[f]?.path,`${V184_ROOT}/jevbench-v1.8.4-${f}.json`,'file path '+f);same(manifest.files[f]?.sha256,V184_EXPECTED_HASHES[f],'pinned hash '+f);}
 for(const f of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[f],previous.manifest[f],'historical binding '+f);
 if(artifact.revision!=='v1.8.4'||artifact.run_kind!=='same-draw-addendum'||artifact.provisional!==false)fail('artifact identity');
 for(const f of ['method','G_med','n_ranked','board'])same(artifact[f],previous.artifact[f],'unchanged '+f);
 const by=new Map(artifact.systems.map(s=>[s.key,s]));
 if(by.size!==artifact.systems.length||artifact.roster_count!==by.size)fail('roster counts');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V184_NEW_KEYS].sort(),'exact roster');
 for(const s of previous.artifact.systems){const expected=structuredClone(s);for(const e of V184_TEXT_EXCEPTIONS.filter(e=>e.key===s.key)){const path=e.path.split('.');let o=expected;for(const f of path.slice(0,-1))o=o[f];const f=path.at(-1);if(o[f]!==e.before||hash(o[f])!==e.before_sha256||hash(e.after)!==e.after_sha256)fail('text exception hash '+s.key);o[f]=e.after;}same(by.get(s.key),expected,'carried row '+s.key);same(categories.systems[s.key],previous.categories.systems[s.key],'carried cells '+s.key);same(categories.lanes[s.key],previous.categories.lanes[s.key],'carried lane '+s.key);}
 for(const k of V184_NEW_KEYS){
  const s=by.get(k);validateV184PublicText(s);same(s,V184_NEW_ROWS[k],'new row '+k);
  if(s.ranked!==false||s.rank!==null||s.listing!=='unranked'||s.not_ranked_because!==V184_NOTE)fail('unranked '+k);
  same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks '+k);
  for(const b of Object.values(artifact.board))if(b.order?.includes(k))fail('unranked in list '+k);
  if(s.draw?.status!=='anchor-runs-pending'||s.draw.offset.I!==0||s.draw.offset.C!==0||s.draw.release!=='v1.8.4'||s.v16.equating_offset!==null)fail('not equated '+k);
  if(s.v16.n_items!==( ['allec-oavg'].includes(k)?1125:1500)||s.status.rows!==1500||s.decision_limit.limit_s!==10||s.decision_limit.treatment!=='share'||s.v16.g_med_used!==2.573387642438244)fail('scoring method '+k);
  if(s.cost.common_basis?.n_items!==1489||s.cost.common_basis.rule!=='common')fail('common cost basis '+k);
  if(s.paid_fast_lane!==false)fail('paid public identity '+k);
  const p=proof.new_rows[k],u=p.cost;
  for(const f of ['axes','decision_limit','model_pin','composite_ci95'])same(p[f],s[f],'proof '+f+' '+k);
  if(Math.abs(s.cost.usd_per_1000-u.cost_common)>1e-12||Math.abs(s.cost.common_basis.usd_per_1000_all_items-u.cost_all)>1e-12)fail('cost binding '+k);
  const estimate=(ti,to,n)=>1000*(ti*u.ref.in+to*u.ref.out)/1e6/n;
  if(Math.abs(u.estimate_common-estimate(u.input_tokens_common,u.output_tokens_common,1489))>1e-12||Math.abs(u.estimate_all-estimate(u.input_tokens_all,u.output_tokens_all,1500))>1e-12)fail('token arithmetic '+k);
  if(u.family!=='granite'||u.architecture_class!=='uncalibrated'||u.throughput!==null||u.gpu_common!==null||u.gpu_all!==null||u.cost_common!==u.estimate_common||u.cost_all!==u.estimate_all||u.cost_basis_kind!=='sibling-estimate-uncalibrated-architecture')fail('outside calibrated class fallback '+k);
  if(u.ref.reference_kind!=='sibling'||u.ref.listing!=='granite-4.2-8b'||u.ref.in!==.06||u.ref.out!==.25||u.ref.declared_base!=='ibm-granite/granite-4.1-8b')fail('Granite sibling estimate '+k);
  if(s.api_flag!==false||s.endpoint_kind!=='gpu'||s.cost.kind!=='estimate')fail('self-hosted identity '+k);
  same(p.category_pool_bounds,V184_NEW_ROW_BOUNDS[k],'pool bounds '+k);
  if(categories.systems[k]?.topics!==undefined)fail('topics absent on draw '+k);
  for(const dim of ['families','languages','usecases']){
   const cells=categories.systems[k]?.[dim];if(!cells||!Object.keys(cells).length)fail('missing cells '+k+' '+dim);
   for(const [c,x]of Object.entries(cells))if(!Number.isInteger(x.n)||x.n<1||x.n>1500||!Number.isFinite(x.competence)||(dim!=='families'&&x.n>(V184_NEW_ROW_BOUNDS[k][dim][c]??0)))fail('cell bounds '+k);
  }
  if(/\/home\/|workers\/|#\d{4,}|\bPREREG\b|custody|deputy|release.owner|Florian|Sandy|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\{[A-Z_]+\}/i.test(JSON.stringify(s)))fail('internal public text '+k);
 }
 same(carry,previous.carry,'immutable carry');
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V184_NEW_KEYS].sort(),'category roster');
 if(categories.revision!=='v1.8.4'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 same(proof,V184_EXPECTED_PROOF,'exact proof');
 if(proof.carried_rows!==previous.artifact.systems.length||!equal(proof.carried_rows_equal_except,V184_TEXT_EXCEPTIONS)||!hex(proof.exceptions.text_only_sha256))fail('enumerated text-only carry exceptions');
 if(proof.publication_approval.status!=='GO (standing; no top-five change)'||proof.publication_approval.top_five_effect!=='unchanged')fail('standing approval');
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(artifact.addendum.new_keys,V184_NEW_KEYS,'addendum keys');
 return true;
}
async function load(p,root){const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)};}
export async function readOptionalJevbenchV184Release(root=process.cwd()){
 let publication;try{publication=await load(V184_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV183Release(root);if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V184_ROOT}/jevbench-v1.8.3-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V184_FILE_KEYS.map(async k=>[k,await load(`${V184_ROOT}/jevbench-v1.8.4-${k}.json`,root)])));
 for(const[k,v]of Object.entries(b))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['carry','history','history-carry'])if(b[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k);
 validateJevbenchV184Bundle({manifest:publication.value,artifact:b.results.value,categories:b.categories.value,carry:b.carry.value,proof:b.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,carry:b.carry.value,carrySha256:b.carry.sha256,proof:b.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV184ForBoard(root=process.cwd()){
 let p;try{p=(await load(V184_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 return p?.review?.verdict==='PASS'?readOptionalJevbenchV184Release(root):null;
}
export async function hasPublishedJevbenchV184Release(root=process.cwd(),log=console.error){try{return Boolean(await readJevbenchV184ForBoard(root));}catch{log('JevBench v1.8.4 navigation omitted: publication validation failed');return false;}}
export function v184BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV184Addendum(chain,release){
 const bounds={...apiFullAddendumCategoryBounds(chain.categories),...structuredClone(V184_NEW_ROW_BOUNDS)};
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.8.4',v184_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.8.4',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
