// Four cost corrections on v1.7.10. Measurements, non-cost axes and category cells are immutable.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { readOptionalJevbenchV1710Release } from './jevbench-v1710-release.mjs';
import { apiFullAddendumCategoryBounds, withRowPoolCategoryRows } from './jevbench-api-full-addenda.mjs';
export const V1711_ROOT = 'data/raw/benchmarks/jevbench/v1.7';
export const V1711_MANIFEST = `${V1711_ROOT}/jevbench-v1.7.11-publication.json`;
export const V1711_FILE_KEYS = ['results','categories','carry','proof','history','history-carry'];
export const V1711_EXPECTED_HASHES = /*HASHES*/;
export const V1711_PRICE_REFERENCES = /*REFERENCES*/;
export const V1711_RECOUNT_BINDINGS = /*RECOUNTS*/;
export const V1711_REMEASURED_ROWS = /*ROWS*/;
export const V1711_NEW_ROWS = /*NEWROWS*/;
export const V1711_NEW_KEYS = Object.keys(V1711_NEW_ROWS).sort();
export const V1711_CHANGED_KEYS = [...Object.keys(V1711_REMEASURED_ROWS), ...V1711_NEW_KEYS];
export const V1711_REMEASURED_KEYS = Object.keys(V1711_REMEASURED_ROWS).sort();
const hash = b => createHash('sha256').update(b).digest('hex');
const fail = m => { throw new Error(`JevBench v1.7.11: ${m}`); };
const same = (a,b,m) => { if (!isDeepStrictEqual(a,b)) fail(m); };
const stripRank = s => { const r = structuredClone(s); delete r.rank; delete r.ranks; return r; };
const linkKeys = [];
const vendorUrl = 'https://singularitycompute.com/super-decider';
const hex = s => /^[a-f0-9]{64}$/.test(s ?? '');
function publicOnly(v) {
 if (!v || typeof v !== 'object') return;
 for (const [k,x] of Object.entries(v)) {
  if (/^(task_id|opaque_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret)$/i.test(k)) fail('private field');
  publicOnly(x);
 }
}
/** Candidate validation is explicit; public readers always require an independent PASS receipt. */
export function validateJevbenchV1711Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256}, {candidate=false}={}) {
 for (const v of [manifest,artifact,categories,carry,proof]) publicOnly(v);
 if (manifest.revision !== 'v1.7.11' || manifest.schema_version !== 1 || manifest.status !== 'published' || manifest.provisional !== false) fail('manifest identity');
 if (!candidate && (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256))) fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.7.10',publication_sha256:previousManifestSha256},'predecessor binding');
 if (previous?.artifact.revision !== 'v1.7.10' || previous.manifest.review.verdict !== 'PASS') fail('validated predecessor');
 for (const f of V1711_FILE_KEYS) {
  same(manifest.files[f]?.path,`${V1711_ROOT}/jevbench-v1.7.11-${f}.json`,'file path '+f);
  same(manifest.files[f]?.sha256,V1711_EXPECTED_HASHES[f],'pinned bytes '+f);
 }
 for (const f of ['historical_revision','historical_results_sha256','historical_carry_sha256']) same(manifest[f],previous.manifest[f],'history binding '+f);
 if (artifact.revision !== 'v1.7.11' || artifact.run_kind !== 'same-draw-addendum' || artifact.provisional !== false) fail('artifact identity');
 same(artifact.method,previous.artifact.method,'unchanged method');
 same(artifact.G_med,previous.artifact.G_med,'frozen median');
 const rows=artifact.systems,by=new Map(rows.map(s=>[s.key,s]));
 if (by.size !== rows.length) fail('duplicate key');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1711_NEW_KEYS].sort(),'exact roster');
 if (artifact.roster_count!==rows.length || artifact.n_ranked!==rows.filter(s=>s.ranked).length) fail('counts');
 for (const p of previous.artifact.systems) {
  const row=by.get(p.key), expected=stripRank(p), actual=stripRank(row);
  if(V1711_CHANGED_KEYS.includes(p.key)) {
   same(row,V1711_REMEASURED_ROWS[p.key],'corrected row spec '+p.key);
   for(const f of ['cost','scores','views','jevbench_score','composite_ci95','cost_basis','price_basis']){delete expected[f];delete actual[f];}
   delete expected.axes.cost;delete actual.axes.cost;
   delete expected.v16.ci95.composite;delete actual.v16.ci95.composite;
   const r=proof.repriced_rows[p.key];
   same(r?.price_reference,V1711_PRICE_REFERENCES[p.key],'price reference '+p.key);
   same(r?.audit_sha256,V1711_RECOUNT_BINDINGS[p.key],'recount pin '+p.key);
   if(!hex(r?.audit_sha256)||!hex(r?.raw_sha256)||!hex(r?.scored_sha256)||r.measurement_changed!==false)fail('recount/source pins '+p.key);
   if(row.cost.kind!==p.cost.kind||row.cost.kind!=='estimate'||row.cost.common_basis.n_items!==p.cost.common_basis.n_items)fail('cost kind or own basis '+p.key);
   if(!row.model_pin||row.model_pin!==p.model_pin)fail('model pin '+p.key);
   const prose=row.cost.basis;
   if(/\{[A-Za-z_][A-Za-z0-9_]*\}|PLACEHOLDER/.test(prose))fail('public template '+p.key);
   if(/\/home\/|workers\/|board\s*#|#\d{4,}|Florian|release.owner|\blead\b|deputy/i.test(prose))fail('internal public text '+p.key);
   if(!prose.includes('Billed on engine-processed input')||!prose.includes('residual 0')||!prose.includes('corrected in v1.7.11'))fail('engine cost disclosure '+p.key);
   same(row.v16.ci95.composite,row.composite_ci95,'corrected CI '+p.key);
  }
  same(actual,expected,'carried row '+p.key);
  same(categories.systems[p.key],previous.categories.systems[p.key],'carried cells '+p.key);
  same(categories.lanes[p.key],previous.categories.lanes[p.key],'carried lane '+p.key);
 }
 for (const m of ['A','B','C','capability']) {
  const ord=artifact.board[m].order;
  same([...ord].sort(),rows.filter(s=>s.ranked).map(s=>s.key).sort(),'order membership '+m);
  const val=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];
  ord.forEach((k,i)=>{if(by.get(k).ranks[m]!==i+1||(m==='A'&&by.get(k).rank!==i+1))fail('rank '+k);if(i&&val(ord[i-1])<val(k))fail('sort '+m)});
  same(ord.filter(k=>!V1711_CHANGED_KEYS.includes(k)),(m==='capability'?previous.artifact.systems.filter(s=>s.ranked).sort((a,b)=>a.ranks.capability-b.ranks.capability).map(s=>s.key):previous.artifact.board[m].order).filter(k=>!V1711_CHANGED_KEYS.includes(k)),'carried tie order '+m);
 }
 same(carry,previous.carry,'dated carry');
 same(Object.keys(categories.systems).sort(),Object.keys(previous.categories.systems).sort(),'category roster');
 if (categories.revision!=='v1.7.11'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 if(proof.revision!=='v1.7.11'||proof.carried_rows!==previous.artifact.systems.length-4)fail('proof identity');
 same(proof.method,previous.artifact.method,'proof method');
 same(artifact.addendum.repriced_keys,V1711_CHANGED_KEYS.slice().sort(),'repriced keys');
 same(proof.link_fixed_rows,[],'no link changes');
 for(const f of ['scored_rows_sha256','entry_sha256','recount_bindings_sha256'])if(!hex(proof.source_inputs?.[f]))fail('input provenance '+f);
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(proof.pricing_module_sha256,'645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4','pricing pin');
 same(proof.scorers,previous.proof.scorers,'scorer pins');
 const a=proof.publication_approval;
 if(a?.fresh_baseline!=='v1.7.10'||a.button_tap!==false||a.top_five_preview?.sha256!==proof.topfive_diff_sha256||!hex(proof.topfive_diff_sha256)||V1711_CHANGED_KEYS.some(k=>!a.asks?.some(x=>x.key===k&&x.admission==='cost correction only, no new measurement'&&x.handoff==='board #28484/#28489'&&x.relay==='release-owner rule #27240')))fail('approval provenance');
 if(a.top_five_effect==='unchanged') {
  if(a.status!=='GO (standing, no top-five change)')fail('standing GO');
 } else {
  if(a.top_five_effect!=='changed'||a.status!=='GO (fair top-five change, Florian rule 25 Oct 2026)'||a.go?.quote!=='3 ja')fail('fair top-five GO');
  const fair=a.fairness_check;
  if(!fair?.path||(fair.verdict!=='FAIR'&&!(candidate&&fair.verdict==='PENDING')))fail('bound FAIR verdict required');
  if(fair.verdict==='FAIR'&&!hex(fair.sha256))fail('FAIR receipt pin');
 }
 return true;
}
async function load(p,root) { const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)}; }
export async function readOptionalJevbenchV1711Release(root=process.cwd()) {
 let publication;
 try {publication=await load(V1711_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV1710Release(root);
 const predecessor=await load(`${V1711_ROOT}/jevbench-v1.7.10-publication.json`,root);
 const bundle=Object.fromEntries(await Promise.all(V1711_FILE_KEYS.map(async k=>[k,await load(`${V1711_ROOT}/jevbench-v1.7.11-${k}.json`,root)])));
 for(const [k,v] of Object.entries(bundle))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['history','history-carry','carry'])if(bundle[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k+' bytes');
 validateJevbenchV1711Bundle({manifest:publication.value,artifact:bundle.results.value,categories:bundle.categories.value,carry:bundle.carry.value,proof:bundle.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:bundle.results.value,bytes:bundle.results.bytes,sha256:bundle.results.sha256,categories:bundle.categories.value,categoriesSha256:bundle.categories.sha256,carry:bundle.carry.value,carrySha256:bundle.carry.sha256,proof:bundle.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1711ForBoard(root=process.cwd()) {
 let p;try{p=(await load(V1711_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(p?.review?.verdict!=='PASS')return null;
 return readOptionalJevbenchV1711Release(root);
}
export async function hasPublishedJevbenchV1711Release(root=process.cwd(),log=console.error) {
 try{return Boolean(await readJevbenchV1711ForBoard(root));}catch{log('JevBench v1.7.11 navigation omitted: publication validation failed');return false;}
}
export function v1711BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV1711Addendum(chain,release) {
 const bounds={...apiFullAddendumCategoryBounds(chain.categories)};
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.7.11',v1711_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.7.11',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
