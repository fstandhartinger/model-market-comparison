// Same-draw GPU replacement on v1.7.2. All other scores, intervals and cells are immutable.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { readOptionalJevbenchV172Release } from './jevbench-v172-release.mjs';
import { apiFullAddendumCategoryBounds, withRowPoolCategoryRows } from './jevbench-api-full-addenda.mjs';
export const V173_ROOT = 'data/raw/benchmarks/jevbench/v1.7';
export const V173_MANIFEST = `${V173_ROOT}/jevbench-v1.7.3-publication.json`;
export const V173_FILE_KEYS = ['results','categories','carry','proof','history','history-carry'];
export const V173_EXPECTED_HASHES = /*HASHES*/;
export const V173_REMEASURED_ROWS = /*ROWS*/;
export const V173_NEW_ROWS = /*NEWROWS*/;
export const V173_NEW_KEYS = Object.keys(V173_NEW_ROWS).sort();
export const V173_CHANGED_KEYS = [...Object.keys(V173_REMEASURED_ROWS), ...V173_NEW_KEYS];
export const V173_REMEASURED_KEYS = Object.keys(V173_REMEASURED_ROWS).sort();
const hash = b => createHash('sha256').update(b).digest('hex');
const fail = m => { throw new Error(`JevBench v1.7.3: ${m}`); };
const same = (a,b,m) => { if (!isDeepStrictEqual(a,b)) fail(m); };
const stripRank = s => { const r = structuredClone(s); delete r.rank; delete r.ranks; return r; };
const hex = s => /^[a-f0-9]{64}$/.test(s ?? '');
function publicOnly(v) {
 if (!v || typeof v !== 'object') return;
 for (const [k,x] of Object.entries(v)) {
  if (/^(task_id|opaque_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret)$/i.test(k)) fail('private field');
  publicOnly(x);
 }
}
/** Candidate validation is explicit; public readers always require an independent PASS receipt. */
export function validateJevbenchV173Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256}, {candidate=false}={}) {
 for (const v of [manifest,artifact,categories,carry,proof]) publicOnly(v);
 if (manifest.revision !== 'v1.7.3' || manifest.schema_version !== 1 || manifest.status !== 'published' || manifest.provisional !== false) fail('manifest identity');
 if (!candidate && (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256))) fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.7.2',publication_sha256:previousManifestSha256},'predecessor binding');
 if (previous?.artifact.revision !== 'v1.7.2' || previous.manifest.review.verdict !== 'PASS') fail('validated predecessor');
 for (const f of V173_FILE_KEYS) {
  same(manifest.files[f]?.path,`${V173_ROOT}/jevbench-v1.7.3-${f}.json`,'file path '+f);
  same(manifest.files[f]?.sha256,V173_EXPECTED_HASHES[f],'pinned bytes '+f);
 }
 for (const f of ['historical_revision','historical_results_sha256','historical_carry_sha256']) same(manifest[f],previous.manifest[f],'history binding '+f);
 if (artifact.revision !== 'v1.7.3' || artifact.run_kind !== 'same-draw-addendum' || artifact.provisional !== false) fail('artifact identity');
 same(artifact.method,previous.artifact.method,'unchanged method');
 same(artifact.G_med,previous.artifact.G_med,'frozen median');
 const rows=artifact.systems,by=new Map(rows.map(s=>[s.key,s]));
 if (by.size !== rows.length) fail('duplicate key');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V173_NEW_KEYS].sort(),'exact roster');
 if (artifact.roster_count!==rows.length || artifact.n_ranked!==rows.filter(s=>s.ranked).length) fail('counts');
 for (const p of previous.artifact.systems) {
  if(V173_REMEASURED_KEYS.includes(p.key))continue;
  same(stripRank(by.get(p.key)),stripRank(p),'carried row '+p.key);
  same(categories.systems[p.key],previous.categories.systems[p.key],'carried cells '+p.key);
  same(categories.lanes[p.key],previous.categories.lanes[p.key],'carried lane '+p.key);
 }
 for (const k of V173_REMEASURED_KEYS) {
  const s=by.get(k);
  same(s,V173_REMEASURED_ROWS[k],'GPU row '+k);
  if (s.method!=='v1.7' || s.remeasured_in!=='v1.7.3' || s.measured_in!=='v1.7.3' || s.paid_fast_lane!==false || !s.previous || s.draw.id!=='v1.6-regular-20261012') fail('GPU measurement identity '+k);
  if (s.v16.ci95.B!==1000 || s.decision_limit.limit_s!==10 || s.decision_limit.treatment!=='share' || s.decision_limit.n_over_limit!==0) fail('scoring method '+k);
  same(s.v16.ci95.composite,s.composite_ci95,'CI '+k);
  if (Math.abs(s.capability-(s.axes.intelligence+s.axes.calibration)/2)>1e-9) fail('Capability '+k);
  if (/\/home\/|workers\/|#\d{4,}|\bPREREG\b|\br181\b|\br168\b/.test(JSON.stringify(s))) fail('internal row text '+k);
  const old=previous.artifact.systems.find(r=>r.key===k);
  same(s.previous, {...Object.fromEntries(Object.entries(old).filter(([f])=>f!=='previous')), board_release:'v1.7.2'},'CPU history '+k);
  same(s.cost,{...old.cost,kind:'estimate'},'replacement cost value/basis unchanged; estimate label '+k);
  same(s.model_pin,old.model_pin,'same weights '+k);
  same(s.remeasure.replaces,{board_release:'v1.7.2',endpoint_kind:'cpu',in_full:'scores and times'},'v1.7.0 replacement mapping '+k);
  if(s.remeasure.kind!=='re-measure on the same items')fail('replacement kind '+k);
  same(s.remeasure.supersedes_base_row,{key:k,endpoint_kind:'cpu',raw_sha256:'e5258cc6e1d4cfa34fd4b2ee2ee1602941e3848b10012e7b3273db704f05d42f'},'CPU provenance '+k);
  if(old.endpoint_kind!=='cpu'||old.ranked||s.endpoint_kind!=='gpu'||s.listing!=='ranked'||s.cost.usd_per_1000>0.06459465517241379)fail('GPU replacement treatment '+k);
  const p=proof.remeasured_rows[k];
  if (!hex(p.raw_sha256) || !hex(p.scored_input_sha256)) fail('source pins '+k);
  for (const f of ['axes','composite_ci95','decision_limit','model_pin']) same(p[f],s[f],'proof '+k+' '+f);
  same(p.treatment,s.listing,'proof listing '+k);
 }
 for (const k of V173_NEW_KEYS) {
  const s=by.get(k);same(s,V173_NEW_ROWS[k],'new hosted row '+k);
  if(s.method!=='v1.7'||s.new_in!=='v1.7.3'||s.endpoint_kind!=='api'||s.paid_fast_lane!==false||s.base_model!==null||s.draw.id!=='v1.6-regular-20261012')fail('hosted identity '+k);
  if(s.status.rows!==1500||s.status.answered_ok!==1496||s.decision_limit.n_over_limit!==14||s.decision_limit.treatment!=='share')fail('hosted coverage '+k);
  if(s.cost.kind!=='mixed'||s.cost.usage_estimated_rows!==4)fail('hosted fallback cost '+k);
  same(proof.new_rows[k].axes,s.axes,'new row proof axes '+k);
  same(proof.new_rows[k].composite_ci95,s.composite_ci95,'new row proof CI '+k);
  same(proof.new_rows[k].decision_limit,s.decision_limit,'new row proof decision limit '+k);
  same(proof.new_rows[k].explicit_ref,{key:'scaledown:classify-1 (vendor list price)',in:0.05,out:0},'vendor price '+k);
  if(!hex(proof.new_rows[k].raw_sha256)||!hex(proof.new_rows[k].scored_input_sha256))fail('hosted source pins '+k);
  if(/\/home\/|workers\/|#\d{4,}|Florian/.test(JSON.stringify(s)))fail('internal hosted text '+k);
 }
 for (const m of ['A','B','C','capability']) {
  const ord=artifact.board[m].order;
  same([...ord].sort(),rows.filter(s=>s.ranked).map(s=>s.key).sort(),'order membership '+m);
  const val=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];
  ord.forEach((k,i)=>{if(by.get(k).ranks[m]!==i+1||(m==='A'&&by.get(k).rank!==i+1))fail('rank '+k);if(i&&val(ord[i-1])<val(k))fail('sort '+m)});
  same(ord.filter(k=>!V173_CHANGED_KEYS.includes(k)),(m==='capability'?previous.artifact.systems.filter(s=>s.ranked).sort((a,b)=>a.ranks.capability-b.ranks.capability).map(s=>s.key):previous.artifact.board[m].order),'carried tie order '+m);
 }
 same(carry,previous.carry,'dated carry');
 same(Object.keys(categories.systems).sort(),[...new Set([...Object.keys(previous.categories.systems),...V173_CHANGED_KEYS])].sort(),'category roster');
 if (categories.revision!=='v1.7.3'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 // Mixed draws retain their own cell counts, as in the v1.7.2 validator.
 for (const k of V173_CHANGED_KEYS) for (const dim of ['families','languages','topics','usecases']) {
  const cells=categories.systems[k]?.[dim];if(!cells||!Object.keys(cells).length)fail('missing cells '+k+' '+dim);
  for(const c of Object.values(cells))if(!Number.isInteger(c.n)||c.n<1||c.n>1500||!Number.isFinite(c.competence))fail('cell '+k+' '+dim);
 }
 if(proof.revision!=='v1.7.3'||proof.carried_rows!==previous.artifact.systems.length-V173_REMEASURED_KEYS.length)fail('proof identity');
 same(proof.method,previous.artifact.method,'proof method');
 for(const f of ['scored_rows_sha256','entry_sha256','cells_sha256'])if(!hex(proof.source_inputs?.[f]))fail('input provenance '+f);
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(proof.pricing_module_sha256,previous.proof.pricing_module_sha256,'pricing pin');
 same(proof.scorers,previous.proof.scorers,'scorer pins');
 const a=proof.publication_approval;
 if(a?.fresh_baseline!=='v1.7.2'||a.top_five_effect!=='changed'||a.status!=='GO (fair top-five change, Florian rule 25 Oct 2026)'||a.button_tap!==false||a.go?.channel!=='laptop chat'||a.go?.date!=='2026-10-25'||a.go?.quote!=='3 ja'||a.go?.recorded_in!=='DECISIONS.md 2026-10-25 setup-review-open-questions-answered'||a.top_five_preview?.sha256!==proof.topfive_diff_sha256||!a.top_five_preview?.path||V173_CHANGED_KEYS.some(k=>!a.asks?.some(x=>x.key===k&&x.admission&&x.handoff&&x.relay)))fail('fair top-five GO proof');
 const fair=a.fairness_check;
 if(!fair?.path||!['PENDING','FAIR'].includes(fair.verdict)||(fair.verdict==='FAIR'&&!hex(fair.sha256)))fail('fairness receipt');
 if(!candidate && fair.verdict!=='FAIR')fail('fairness PENDING: non-PENDING FAIR verdict required');
 return true;
}
async function load(p,root) { const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)}; }
export async function readOptionalJevbenchV173Release(root=process.cwd()) {
 let publication;
 try {publication=await load(V173_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV172Release(root);
 const predecessor=await load(`${V173_ROOT}/jevbench-v1.7.2-publication.json`,root);
 const bundle=Object.fromEntries(await Promise.all(V173_FILE_KEYS.map(async k=>[k,await load(`${V173_ROOT}/jevbench-v1.7.3-${k}.json`,root)])));
 for(const [k,v] of Object.entries(bundle))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['history','history-carry','carry'])if(bundle[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k+' bytes');
 validateJevbenchV173Bundle({manifest:publication.value,artifact:bundle.results.value,categories:bundle.categories.value,carry:bundle.carry.value,proof:bundle.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:bundle.results.value,bytes:bundle.results.bytes,sha256:bundle.results.sha256,categories:bundle.categories.value,categoriesSha256:bundle.categories.sha256,carry:bundle.carry.value,carrySha256:bundle.carry.sha256,proof:bundle.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV173ForBoard(root=process.cwd()) {
 let p;try{p=(await load(V173_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(p?.review?.verdict!=='PASS')return null;
 return readOptionalJevbenchV173Release(root);
}
export async function hasPublishedJevbenchV173Release(root=process.cwd(),log=console.error) {
 try{return Boolean(await readJevbenchV173ForBoard(root));}catch{log('JevBench v1.7.3 navigation omitted: publication validation failed');return false;}
}
export function v173BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV173Addendum(chain,release) {
 const bounds={...apiFullAddendumCategoryBounds(chain.categories)};
 for(const k of V173_CHANGED_KEYS) {
  const row=release.artifact.systems.find(s=>s.key===k);
  const counts=new Map();
  for(const s of chain.published.systems)if(s.draw?.id===row.draw.id && bounds[s.key]){const b=JSON.stringify(bounds[s.key]);counts.set(b,(counts.get(b)??0)+1);}
  const [best]=[...counts].sort((a,b)=>b[1]-a[1]);if(!best)fail('category bounds '+k);
  bounds[k]=JSON.parse(best[0]);
 }
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.7.3',v173_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.7.3',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
