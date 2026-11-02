// One measured but unranked row; independent review gates every public reader.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual as equal} from 'node:util';
import {readOptionalJevbenchV185Release} from './jevbench-v185-release.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';
export const V186_ROOT='data/raw/benchmarks/jevbench/v1.8';
export const V186_MANIFEST=`${V186_ROOT}/jevbench-v1.8.6-publication.json`;
export const V186_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V186_EXPECTED_HASHES=/*HASHES*/;
export const V186_NEW_ROWS=/*ROWS*/;
export const V186_NEW_ROW_BOUNDS=/*BOUNDS*/;
export const V186_EXPECTED_PROOF=/*PROOF*/;
export const V186_TEXT_EXCEPTIONS=/*TEXT_EXCEPTIONS*/;
export const V186_NEW_KEYS=Object.keys(V186_NEW_ROWS).sort();
export const V186_NOTE='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.';
const fail=m=>{throw Error('JevBench v1.8.6: '+m);};
const same=(a,b,m)=>{if(!equal(a,b))fail(m);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const hex=s=>/^[a-f0-9]{64}$/.test(s??'');
// Strict path-aware public text validation: one exact clause exception only.
export const V186_ALLEC_CLAUSE='(The allec weights are plantwaterer/allec@e54027aa; no separate allec row is published on this board.)';
export const V186_ALLEC_SENTENCE='same weights as the earlier allec entry; short requests are read in several option orders and averaged.';
export const V186_ALLEC_CLAUSE_SHA256=hash(V186_ALLEC_CLAUSE);
export function validateV186PublicText(value){
 if(!value?.model_pin||typeof value.model_pin!=='string'||!value.model_pin.includes('@'))fail('missing model pin');
 const allec=value?.key==='allec-oavg';
 if(allec){
  const text=value.disclosure;
  if(typeof text!=='string'||text.split(V186_ALLEC_CLAUSE).length!==2||text.split(V186_ALLEC_SENTENCE).length!==2||!text.includes('Serving description: '+V186_ALLEC_SENTENCE+' '+V186_ALLEC_CLAUSE))fail('mandatory allec clause binding');
 }
 let allowed=0;
 function walk(v,path){
  if(typeof v==='string'){
   if(/0\.0645|x cap|cost cap USD|0\.15 s/i.test(v))fail('release-level numbers in row prose');
   const forbidden=/worker|lead|custody|custodian|release.owner|measurement review|deputy|board|#\d+|Florian|\bCoS\b|order.id|jevbench-add-requests|fastlane-native|r226-v186|code_revision|smoke-stop|at the time of drafting|internally measured export|eligible for intake|class C deviation|TTL-fit|pair-fit|accepted root pricing reference|pre-registration review|provider decide \(proxy aws\)|Disposition is for|\bPREREG\b|\{/ig;
   const start=allec&&path.length===1&&path[0]==='disclosure'?v.indexOf(V186_ALLEC_CLAUSE):-1;
   const board=start>=0?start+V186_ALLEC_CLAUSE.indexOf('board'):-1;
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
export function validateJevbenchV186Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256},{candidate=false}={}){
 if(manifest.revision!=='v1.8.6'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('manifest identity');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!hex(manifest.review.receipt_sha256)))fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.8.5',publication_sha256:previousManifestSha256},'predecessor binding');
 if(previous?.artifact.revision!=='v1.8.5'||(!candidate&&previous.manifest.review.verdict!=='PASS'))fail('validated predecessor');
 for(const f of V186_FILE_KEYS){same(manifest.files[f]?.path,`${V186_ROOT}/jevbench-v1.8.6-${f}.json`,'file path '+f);same(manifest.files[f]?.sha256,V186_EXPECTED_HASHES[f],'pinned hash '+f);}
 for(const f of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[f],previous.manifest[f],'historical binding '+f);
 if(artifact.revision!=='v1.8.6'||artifact.run_kind!=='same-draw-addendum'||artifact.provisional!==false)fail('artifact identity');
 for(const f of ['method','G_med','n_ranked','board'])same(artifact[f],previous.artifact[f],'unchanged '+f);
 const by=new Map(artifact.systems.map(s=>[s.key,s]));
 if(by.size!==artifact.systems.length||artifact.roster_count!==by.size)fail('roster counts');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V186_NEW_KEYS].sort(),'exact roster');
 for(const s of previous.artifact.systems){const expected=structuredClone(s);for(const e of V186_TEXT_EXCEPTIONS.filter(e=>e.key===s.key)){const path=e.path.split('.');let o=expected;for(const f of path.slice(0,-1))o=o[f];const f=path.at(-1);if(o[f]!==e.before||hash(o[f])!==e.before_sha256||hash(e.after)!==e.after_sha256)fail('text exception hash '+s.key);o[f]=e.after;}same(by.get(s.key),expected,'carried row '+s.key);same(categories.systems[s.key],previous.categories.systems[s.key],'carried cells '+s.key);same(categories.lanes[s.key],previous.categories.lanes[s.key],'carried lane '+s.key);}
 for(const k of V186_NEW_KEYS){
  const s=by.get(k);validateV186PublicText(s);same(s,V186_NEW_ROWS[k],'new row '+k);
  if(s.ranked!==false||s.rank!==null||s.listing!=='unranked'||s.not_ranked_because!==V186_NOTE)fail('unranked '+k);
  same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks '+k);
  for(const b of Object.values(artifact.board))if(b.order?.includes(k))fail('unranked in list '+k);
  if(s.draw?.status!=='anchor-runs-pending'||s.draw.offset.I!==0||s.draw.offset.C!==0||s.draw.release!=='v1.8.6'||s.v16.equating_offset!==null)fail('not equated '+k);
  if(s.v16.n_items!==( ['allec-oavg'].includes(k)?1125:1500)||s.status.rows!==1500||s.decision_limit.limit_s!==10||s.decision_limit.treatment!=='share'||s.v16.g_med_used!==2.573387642438244)fail('scoring method '+k);
  if(s.cost.common_basis?.n_items!==1489||s.cost.common_basis.rule!=='common')fail('common cost basis '+k);
  if(s.paid_fast_lane!==true)fail('paid public identity '+k);
  const p=proof.new_rows[k],u=p.cost;
  for(const f of ['axes','decision_limit','model_pin','composite_ci95'])same(p[f],s[f],'proof '+f+' '+k);
  if(Math.abs(s.cost.usd_per_1000-u.cost_common)>1e-12||Math.abs(s.cost.common_basis.usd_per_1000_all_items-u.cost_all)>1e-12)fail('cost binding '+k);
  const estimate=(ti,to,n,ri,ro)=>1000*(ti*ri+to*ro)/1e6/n;
  const listCommon=estimate(u.input_tokens_common,u.output_tokens_common,1489,u.ref.in,u.ref.out);
  const listAll=estimate(u.input_tokens_all,u.output_tokens_all,1500,u.ref.in,u.ref.out);
  const gpuRate=u.gpu.hourly_usd/(3600*u.gpu.average_load*u.gpu.throughput_tokens_s)*1e6;
  const gpuCommon=estimate(u.input_tokens_common,u.output_tokens_common,1489,gpuRate,gpuRate);
  const gpuAll=estimate(u.input_tokens_all,u.output_tokens_all,1500,gpuRate,gpuRate);
  if(Math.abs(u.list_common-listCommon)>1e-12||Math.abs(u.list_all-listAll)>1e-12||Math.abs(u.gpu_common-gpuCommon)>1e-12||Math.abs(u.gpu_all-gpuAll)>1e-12)fail('token cost arithmetic '+k);
  if(u.gpu.architecture_class!=='dense gemma'||u.gpu.throughput_tokens_s!==10106.516129||u.gpu.active_parameters_b!==31||u.ref.base!=='google/gemma-4-31B-it'||u.ref.in!==.09||u.ref.out!==.34||u.gpu_common>=u.list_common||Math.abs(u.cost_common-Math.min(u.list_common,u.gpu_common))>1e-12||Math.abs(u.cost_all-Math.min(u.list_all,u.gpu_all))>1e-12)fail('dense-Gemma GPU-time min cost '+k);
  if(!s.endpoint_condition.includes('1/50 argmax flip')||!s.endpoint_condition.includes('597,680 processed tokens')||!s.endpoint_condition.includes('964,173 untrimmed')||!s.endpoint_condition.includes('5 trimmed items')||!s.endpoint_condition.includes('9-second'))fail('MetaDecision run disclosure '+k);
  if(!s.disclosure.includes('per-type temperatures')||!s.disclosure.includes('840-token drafting-prompt limit'))fail('public tuning disclosure '+k);
 if(s.api_flag!==false||s.endpoint_kind!=='gpu'||s.cost.kind!=='estimate')fail('self-hosted identity '+k);
  same(p.category_pool_bounds,V186_NEW_ROW_BOUNDS[k],'pool bounds '+k);
  if(categories.systems[k]?.topics!==undefined)fail('topics absent on draw '+k);
  for(const dim of ['families','languages','usecases']){
   const cells=categories.systems[k]?.[dim];if(!cells||!Object.keys(cells).length)fail('missing cells '+k+' '+dim);
   for(const [c,x]of Object.entries(cells))if(!Number.isInteger(x.n)||x.n<1||x.n>1500||!Number.isFinite(x.competence)||(dim!=='families'&&x.n>(V186_NEW_ROW_BOUNDS[k][dim][c]??0)))fail('cell bounds '+k);
  }
  if(/\/home\/|workers\/|#\d{4,}|\bPREREG\b|custody|deputy|release.owner|Florian|Sandy|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\{[A-Z_]+\}/i.test(JSON.stringify(s)))fail('internal public text '+k);
 }
 same(carry,previous.carry,'immutable carry');
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V186_NEW_KEYS].sort(),'category roster');
 if(categories.revision!=='v1.8.6'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 same(proof,V186_EXPECTED_PROOF,'exact proof');
 if(proof.carried_rows!==previous.artifact.systems.length||!equal(proof.carried_rows_equal_except,V186_TEXT_EXCEPTIONS)||!hex(proof.exceptions.text_only_sha256))fail('enumerated text-only carry exceptions');
 if(proof.publication_approval.status!=='GO (standing; no top-five change; paid public order 580d6afe)'||proof.publication_approval.top_five_effect!=='unchanged')fail('standing approval');
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(artifact.addendum.new_keys,V186_NEW_KEYS,'addendum keys');
 return true;
}
async function load(p,root){const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)};}
export async function readOptionalJevbenchV186Release(root=process.cwd()){
 let publication;try{publication=await load(V186_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV185Release(root);if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V186_ROOT}/jevbench-v1.8.5-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V186_FILE_KEYS.map(async k=>[k,await load(`${V186_ROOT}/jevbench-v1.8.6-${k}.json`,root)])));
 for(const[k,v]of Object.entries(b))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['carry','history','history-carry'])if(b[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k);
 validateJevbenchV186Bundle({manifest:publication.value,artifact:b.results.value,categories:b.categories.value,carry:b.carry.value,proof:b.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,carry:b.carry.value,carrySha256:b.carry.sha256,proof:b.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV186ForBoard(root=process.cwd()){
 let p;try{p=(await load(V186_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 return p?.review?.verdict==='PASS'?readOptionalJevbenchV186Release(root):null;
}
export async function hasPublishedJevbenchV186Release(root=process.cwd(),log=console.error){try{return Boolean(await readJevbenchV186ForBoard(root));}catch{log('JevBench v1.8.6 navigation omitted: publication validation failed');return false;}}
export function v186BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV186Addendum(chain,release){
 const bounds={...apiFullAddendumCategoryBounds(chain.categories),...structuredClone(V186_NEW_ROW_BOUNDS)};
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.8.6',v186_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.8.6',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
