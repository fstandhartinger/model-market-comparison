// Aggregate cost restatement. Every changed carried field is pinned; prior releases are immutable.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {readOptionalJevbenchPREVRelease} from './jevbench-PREV-release.mjs';
import {withRowPoolCategoryRows,apiFullAddendumCategoryBounds} from './jevbench-api-full-addenda.mjs';
import {jevComposite} from './jevbench-cohort-merge.mjs';
import {JEV_V16_FROZEN_LIMITS} from './jevbench-jev-class.mjs';
export const V180_ROOT='data/raw/benchmarks/jevbench/v1.8';
export const V180_MANIFEST=`${V180_ROOT}/jevbench-v1.8.0-publication.json`;
export const V180_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V180_EXPECTED_HASHES=/*HASHES*/;
export const V180_EXCEPTIONS=/*EXCEPTIONS*/;
export const V180_BOARD_EXCEPTIONS=/*BOARDEXCEPTIONS*/;
export const V180_COST_SPEC=/*COSTSPEC*/;
export const V180_HISTORY_NOTE=/*NOTE*/;
const same=(a,b,n)=>{if(!isDeepStrictEqual(a,b))throw Error('v1.8.0 '+n);};
const hash=v=>createHash('sha256').update(v).digest('hex');
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function validateV180Approval(a){
 if(a?.status!=='GO'||!Number.isInteger(a.card)||a.card<=0||!a.selection?.trim()||!a.go_quote?.trim()||!/^\d{4}-\d\d-\d\dT.*Z$/.test(a.recorded_at??'')||!hex(a.preview_sha256)||!hex(a.comparison_sha256)||!hex(a.artifact_sha256))throw Error('v1.8.0 publication approval PENDING or incomplete');
 return true;
}
export function validateJevbenchV180Bundle({manifest,artifact,categories,carry,proof,history,historyCarry,previous,previousManifestSha256},{candidate=false}={}){
 same(manifest.revision,'v1.8.0','identity');same(manifest.status,'published','status');same(manifest.provisional,false,'provisional');
 if(!candidate){
  if(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!hex(manifest.review.receipt_sha256))throw Error('v1.8.0 independent review PENDING');
  validateV180Approval(proof.publication_approval);same(proof.publication_approval.artifact_sha256,manifest.files.results.sha256,'approved artifact');same(proof.top_five_comparison?.receipt_sha256,proof.publication_approval.comparison_sha256,'approved comparison');same(previous.manifest.review.verdict,'PASS','predecessor review');
 }
 same(manifest.predecessor,{revision:'PREVIOUS',publication_sha256:previousManifestSha256},'predecessor binding');same(artifact.revision,'v1.8.0','artifact revision');
 for(const f of V180_FILE_KEYS){same(manifest.files[f]?.path,`${V180_ROOT}/jevbench-v1.8.0-${f}.json`,'file path');same(manifest.files[f]?.sha256,V180_EXPECTED_HASHES[f],'pinned '+f);}
 same(proof.predecessor,manifest.predecessor,'proof predecessor');same(proof.exceptions,V180_EXCEPTIONS,'field exception pins');same(proof.repriced_rows,V180_COST_SPEC,'cost specifications');same(proof.board_exceptions,V180_BOARD_EXCEPTIONS,'board exception pins');
 same(JEV_V16_FROZEN_LIMITS,{cost:0.06459465517241379,latency:1.2329566404223442},'caps');
 same(proof.gpu_time_cost_basis.gpu_usd_h,1.5235,'GPU price');same(proof.gpu_time_cost_basis.load,.70,'load');same(proof.gpu_time_cost_basis.cap_tok_s,100000,'throughput cap');
 same(proof.gpu_time_cost_basis.cap_cost_unchanged,JEV_V16_FROZEN_LIMITS.cost,'cost cap');same(proof.gpu_time_cost_basis.cap_latency_unchanged,JEV_V16_FROZEN_LIMITS.latency,'latency cap');
 const expected=structuredClone(previous.artifact.systems),by=new Map(artifact.systems.map(s=>[s.key,s]));
 for(const c of V180_EXCEPTIONS){
  same(c.reason,'v1.8.0 GPU-time cost basis','exception reason');
  const ps=c.path.replace('results.systems','').replace(/\[(\d+)\]/g,'.$1').split('.').filter(Boolean),field=ps.pop(),obj=ps.reduce((v,k)=>v[k],expected);
  same(obj[field]??null,c.old,'before exception '+c.path);obj[field]=c.new;
 }
 same(artifact.systems,expected,'carried rows except pinned cost fields');
 const stripRoot=x=>{const z=structuredClone(x);for(const f of ['systems','board','revision','label','source_note','source_sha256','measurement_notes','addendum'])delete z[f];return z;};
 same(stripRoot(artifact),stripRoot(previous.artifact),'all other release fields unchanged');
 same(artifact.addendum.new_keys,[],'no new rows');same(artifact.addendum.remeasured_keys,[],'no new measurement');same(artifact.addendum.repriced_keys,Object.keys(V180_COST_SPEC).sort(),'repriced keys');same(artifact.addendum.method_change,true,'cost methodology revision');

 const board=structuredClone(previous.artifact.board);
 for(const c of V180_BOARD_EXCEPTIONS){const o=c.path.split('.')[2];same(board[o].order,c.old,'old board order');board[o].order=c.new;}
 same(artifact.board,board,'only pinned board orders changed');
 for(const o of Object.keys(board)){const order=artifact.systems.filter(s=>s.ranked&&Number.isFinite(s.scores?.[o])).sort((a,b)=>b.scores[o]-a.scores[o]||a.key.localeCompare(b.key)).map(s=>s.key);same(artifact.board[o].order,order,'sorted composite board '+o);}

 for(const s of previous.artifact.systems){
  const n=by.get(s.key);if(!n)throw Error('v1.8.0 missing row');
  if(V180_COST_SPEC[s.key]){
   const spec=V180_COST_SPEC[s.key],u=spec.usage;
   if(spec.throughput_source==='D5'&&(!spec.load_mode||spec.tok_s===spec.class_tok_s))throw Error('v1.8.0 D5 throughput source');
   const g=1.5235*(u.input_tokens+u.output_tokens)/u.n_items*1000/(3600*spec.tok_s*.70);
   if(Math.abs(n.cost.usd_per_1000-Math.min(s.cost.usd_per_1000,g))>1e-12||n.cost.usd_per_1000>s.cost.usd_per_1000)throw Error('v1.8.0 min() cost rule');
   for(const part of ['EUR 999/month','730 hours','28 Oct 2026','1.5235/hour','70%','Architecture:','tokens/s','tokens/decision','old list-price cost','min('])if(!n.cost.basis.includes(part))throw Error('v1.8.0 missing cost basis '+part);
   if(spec.throughput_source==='D5'&&!n.cost.basis.includes('load_mode='+spec.load_mode))throw Error('v1.8.0 D5 mode disclosure');
   for(const f of ['intelligence','calibration','speed','capability','decision_limit','previous','draw','measured_in','ranked'])same(n[f],s[f],'fixed '+f+' '+s.key);
   const strip=row=>{const z=structuredClone(row);for(const f of ['rank','ranks','scores','views','jevbench_score','composite_ci95'])delete z[f];if(z.axes)delete z.axes.cost;if(z.cost)for(const f of ['usd_per_1000','basis','composite_interval_note'])delete z.cost[f];if(z.v16?.ci95)delete z.v16.ci95.composite;return z;};
   same(strip(n),strip(s),'only cost-derived fields changed '+s.key);
   const axis=Math.min(100,Math.max(0,100-30*Math.log10(n.cost.usd_per_1000/.001)));
   if(Math.abs(n.axes.cost-axis)>1e-10)throw Error('v1.8.0 Cost axis');
   for(const [name,opt]of Object.entries(artifact.options)){const expected=jevComposite(n.axes,opt.weights,opt.intelligence_floor);if(Math.abs(n.scores[name]-expected)>1e-9)throw Error('v1.8.0 composite formula '+s.key);}

  }else{
   const a=structuredClone(s),b=structuredClone(n);for(const f of ['rank','ranks']){delete a[f];delete b[f];}same(a,b,'API/encoder/unresolved immutable '+s.key);
  }
 }
 same(artifact.systems.length,previous.artifact.systems.length,'roster');same(artifact.n_ranked,previous.artifact.n_ranked,'ranked flags');same(artifact.method,previous.artifact.method,'10-second method');same(artifact.G_med,previous.artifact.G_med,'frozen median');
 same(categories.systems,previous.categories.systems,'category cells');same(categories.lanes,previous.categories.lanes,'lanes');same(categories.results_sha256,manifest.files.results.sha256,'category binding');
 same(carry,previous.carry,'carry');same(history,previous.historical.artifact,'history');same(historyCarry,previous.historical.carry,'history carry');
 same(artifact.measurement_notes,[...previous.artifact.measurement_notes,V180_HISTORY_NOTE],'release notes');same(proof.scorers,previous.proof.scorers,'scorer pins');same(proof.pricing_module_sha256,previous.proof.pricing_module_sha256,'original pricing pins');
 for(const s of artifact.systems)if(V180_COST_SPEC[s.key]&&/Florian|agent board|release.lane|\/home\/flori|\br198\//i.test(s.cost.basis))throw Error('v1.8.0 public text leak');
 return true;
}
async function load(p,root){const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)};}
export async function readOptionalJevbenchV180Release(root=process.cwd()){
 let publication;try{publication=await load(V180_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchPREVRelease(root);if(!previous)throw Error('v1.8.0 validated predecessor');
 const pred=await load('data/raw/benchmarks/jevbench/v1.7/jevbench-PREVIOUS-publication.json',root);
 const b=Object.fromEntries(await Promise.all(V180_FILE_KEYS.map(async k=>[k,await load(`${V180_ROOT}/jevbench-v1.8.0-${k}.json`,root)])));
 for(const [k,v]of Object.entries(b))same(v.sha256,publication.value.files[k]?.sha256,'bytes '+k);
 validateJevbenchV180Bundle({manifest:publication.value,artifact:b.results.value,categories:b.categories.value,carry:b.carry.value,proof:b.proof.value,history:b.history.value,historyCarry:b['history-carry'].value,previous,previousManifestSha256:pred.sha256});
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,carry:b.carry.value,carrySha256:b.carry.sha256,proof:b.proof.value,manifest:publication.value,historical:{...previous.historical,artifact:b.history.value,carry:b['history-carry'].value}};
}
export async function readJevbenchV180ForBoard(root=process.cwd()){
 let p;try{p=(await load(V180_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(p.review?.verdict!=='PASS')return null;return readOptionalJevbenchV180Release(root);
}
export async function hasPublishedJevbenchV180Release(root=process.cwd(),log=console.error){try{return Boolean(await readJevbenchV180ForBoard(root));}catch{log('JevBench v1.8.0 navigation omitted: publication validation failed');return false;}}
export function v180BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV180Addendum(chain,release){
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,amendments:release.artifact.amendments,restated_by:'v1.8.0',v180_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.8.0',systems:{}},release.categories.systems,apiFullAddendumCategoryBounds(chain.categories));
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
