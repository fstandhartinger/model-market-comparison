// Same-draw addendum on the 27 Oct 2026 regular draw (v1.6-regular-20261027), stacked on v1.7.13: five new self-hosted rows (one
// paid public order), measured but UNRANKED until the draw is equated (the v1.7.13 mechanism: ranked false + null ranks + listing
// 'unranked' + not_ranked_because). All other rows, ranks, order lists and cells are immutable.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { readOptionalJevbenchV1713Release } from './jevbench-v1713-release.mjs';
import { apiFullAddendumCategoryBounds, withRowPoolCategoryRows } from './jevbench-api-full-addenda.mjs';
export const V1714_ROOT = 'data/raw/benchmarks/jevbench/v1.7';
export const V1714_MANIFEST = `${V1714_ROOT}/jevbench-v1.7.14-publication.json`;
export const V1714_FILE_KEYS = ['results','categories','carry','proof','history','history-carry'];
export const V1714_EXPECTED_HASHES = /*HASHES*/;
export const V1714_NEW_ROWS = /*NEWROWS*/;
export const V1714_NEW_ROW_BOUNDS = /*BOUNDS*/;
export const V1714_SCORERS = /*SCORERS*/;
export const V1714_PRICE_REFERENCES = /*PRICES*/;
export const V1714_DRAW = 'v1.6-regular-20261027';
export const V1714_NEW_KEYS = Object.keys(V1714_NEW_ROWS).sort();
export const V1714_CHANGED_KEYS = [...V1714_NEW_KEYS];
export const V1714_UNRANKED_NEW_KEYS = [...V1714_NEW_KEYS];
export const V1714_NOT_RANKED_BECAUSE = "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale. This draw differs strongly from earlier draws (72% multilingual items). Shown unranked until the draw is equated.";
export const V1714_APPROVAL_STATUS = 'GO (standing; no top-five change; paid public order for Torchcast)';
const PAID_KEY = 'torchcast-decision-31b-v1.0';
const REFERENCE_G_MED = 2.573387642438244;
const hash = b => createHash('sha256').update(b).digest('hex');
const fail = m => { throw new Error(`JevBench v1.7.14: ${m}`); };
const same = (a,b,m) => { if (!isDeepStrictEqual(a,b)) fail(m); };
const hex = s => /^[a-f0-9]{64}$/.test(s ?? '');
function publicOnly(v) {
 if (!v || typeof v !== 'object') return;
 for (const [k,x] of Object.entries(v)) {
  if (/^(task_id|opaque_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret)$/i.test(k)) fail('private field');
  publicOnly(x);
 }
}
/** Candidate validation is explicit; public readers always require an independent PASS receipt (and a PASS v1.7.13). */
export function validateJevbenchV1714Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256}, {candidate=false}={}) {
 for (const v of [manifest,artifact,categories,carry,proof]) publicOnly(v);
 if (manifest.revision !== 'v1.7.14' || manifest.schema_version !== 1 || manifest.status !== 'published' || manifest.provisional !== false) fail('manifest identity');
 if (!candidate && (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256))) fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.7.13',publication_sha256:previousManifestSha256},'predecessor binding');
 if (previous?.artifact.revision !== 'v1.7.13' || (!candidate && previous.manifest.review.verdict !== 'PASS')) fail('validated predecessor');
 for (const f of V1714_FILE_KEYS) {
  same(manifest.files[f]?.path,`${V1714_ROOT}/jevbench-v1.7.14-${f}.json`,'file path '+f);
  same(manifest.files[f]?.sha256,V1714_EXPECTED_HASHES[f],'pinned bytes '+f);
 }
 for (const f of ['historical_revision','historical_results_sha256','historical_carry_sha256']) same(manifest[f],previous.manifest[f],'history binding '+f);
 if (artifact.revision !== 'v1.7.14' || artifact.run_kind !== 'same-draw-addendum' || artifact.provisional !== false) fail('artifact identity');
 same(artifact.method,previous.artifact.method,'unchanged method');
 same(artifact.G_med,previous.artifact.G_med,'frozen median');
 const rows=artifact.systems,by=new Map(rows.map(s=>[s.key,s]));
 if (by.size !== rows.length) fail('duplicate key');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1714_NEW_KEYS].sort(),'exact roster');
 if (artifact.roster_count!==rows.length || artifact.n_ranked!==rows.filter(s=>s.ranked).length) fail('counts');
 for (const p of previous.artifact.systems) {
  same(by.get(p.key),p,'carried row '+p.key);
  same(categories.systems[p.key],previous.categories.systems[p.key],'carried cells '+p.key);
  same(categories.lanes[p.key],previous.categories.lanes[p.key],'carried lane '+p.key);
 }
 const drawRow=previous.artifact.systems.find(s=>s.draw?.id===V1714_DRAW);
 if(!drawRow)fail('predecessor row on the draw');
 for (const k of V1714_NEW_KEYS) {
  const s=by.get(k);same(s,V1714_NEW_ROWS[k],'new self-hosted row '+k);
  if(s.ranked!==false||s.rank!==null||s.listing!=='unranked'||s.not_ranked_because!==V1714_NOT_RANKED_BECAUSE)fail('unranked provisional row '+k);
  same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks of the unranked row '+k);
  if(proof.new_rows[k].treatment!=='unranked')fail('unranked provisional row proof '+k);
  if(s.method!=='v1.7'||s.new_in!=='v1.7.14'||s.endpoint_kind!=='gpu'||s.paid_fast_lane!==(k===PAID_KEY)||s.draw?.id!==V1714_DRAW||s.draw.release!=='v1.7.14')fail('self-hosted identity '+k);
  for(const f of ['label','drawn_on','status','offset','offset_ci95'])same(s.draw[f],drawRow.draw[f],'same draw as the predecessor row '+f+' '+k);
  if(s.draw.offset?.I!==0||s.draw.offset?.C!==0)fail('offset 0 on a draw not yet equated '+k);
  if(s.v16.g_med_used!==REFERENCE_G_MED||s.draw.g_med!==REFERENCE_G_MED)fail('reference gap median '+k);
  if(s.status.rows!==1500||s.status.answered_ok!==1500||s.decision_limit.n_over_limit!==0||s.decision_limit.treatment!=='share'||s.decision_limit.limit_s!==10)fail('self-hosted coverage '+k);
  if(s.cost.kind!=='estimate'||s.cost.usage_estimated_rows!==0||s.cost.common_basis!==null)fail('estimated cost '+k);
  const repo=s.repo.replace(/^https:\/\/huggingface.co\//,'');
  if(!s.model_pin.startsWith(repo+'@')||/\{[A-Za-z_][A-Za-z0-9_]*\}/.test(JSON.stringify(s)))fail('model pin or public template '+k);
  if(s.v16.ci95.B!==1000)fail('frozen confidence method '+k);
  same(s.v16.ci95.composite,s.composite_ci95,'CI '+k);
  for(const f of ['axes','composite_ci95','decision_limit','model_pin'])same(proof.new_rows[k][f],s[f],'new row proof '+f+' '+k);
  const ref=V1714_PRICE_REFERENCES[k],c=proof.new_rows[k].cost;
  same(proof.new_rows[k].price_reference,ref,'base price '+k);
  if(c.basis_items!==1500||Math.abs(c.usd_per_1000-s.cost.usd_per_1000)>1e-15||Math.abs(s.cost.usd_per_1000-1000*(c.priced_input_tokens*ref.in+c.output_tokens*ref.out)/1e6/1500)>1e-12)fail('priced-input cost '+k);
  same(proof.new_rows[k].category_pool_bounds,V1714_NEW_ROW_BOUNDS[k],'category pool bounds '+k);
  if(!hex(proof.new_rows[k].raw_sha256)||!hex(proof.new_rows[k].scored_input_sha256))fail('self-hosted source pins '+k);
  if(/\/home\/|workers\/|#\d{4,}|Florian|\bPREREG\b|69f7a75d|54575fd5|auto-intake|custody|deputy|h2o141|tc31b|jevbench-add-requests|release.owner/i.test(JSON.stringify(s)))fail('internal self-hosted text '+k);
 }
 // Unranked: the board (every order list) is the predecessor's, and no unranked row is in any order list.
 same(artifact.board,previous.artifact.board,'unchanged order lists');
 same(artifact.n_ranked,previous.artifact.n_ranked,'unchanged ranked count');
 for (const k of V1714_UNRANKED_NEW_KEYS) for (const [m,b] of Object.entries(artifact.board)) if ((b?.order??[]).includes(k)) fail('unranked row in order list '+m+' '+k);
 for (const m of ['A','B','C','capability']) {
  const ord=artifact.board[m].order;
  same([...ord].sort(),rows.filter(s=>s.ranked).map(s=>s.key).sort(),'order membership '+m);
  const val=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];
  ord.forEach((k,i)=>{if(by.get(k).ranks[m]!==i+1||(m==='A'&&by.get(k).rank!==i+1))fail('rank '+k);if(i&&val(ord[i-1])<val(k))fail('sort '+m)});
 }
 same(carry,previous.carry,'dated carry');
 same(Object.keys(categories.systems).sort(),[...new Set([...Object.keys(previous.categories.systems),...V1714_CHANGED_KEYS])].sort(),'category roster');
 if (categories.revision!=='v1.7.14'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 // The draw has no topic labels: families, languages and use cases are required, topics must be absent.
 for (const k of V1714_CHANGED_KEYS) {
  if (categories.systems[k]?.topics !== undefined) fail('topics on a draw without topic labels '+k);
  for (const dim of ['families','languages','usecases']) {
   const cells=categories.systems[k]?.[dim];if(!cells||!Object.keys(cells).length)fail('missing cells '+k+' '+dim);
   for(const [c,x] of Object.entries(cells))if(!Number.isInteger(x.n)||x.n<1||x.n>1500||!Number.isFinite(x.competence)||(dim!=='families'&&x.n>(V1714_NEW_ROW_BOUNDS[k][dim][c]??0)))fail('cell '+k+' '+dim+' '+c);
  }
 }
 if(proof.revision!=='v1.7.14'||proof.carried_rows!==previous.artifact.systems.length)fail('proof identity');
 same(proof.carried_rows_equal_except,[],'carry exception (none: ranks unchanged)');
 same(proof.method,previous.artifact.method,'proof method');
 same(artifact.addendum.new_keys,V1714_NEW_KEYS,'addendum keys');
 same(artifact.addendum.same_draw,V1714_DRAW,'addendum draw');
 for(const f of ['scored_rows_sha256','entry_sha256','cells_sha256'])if(!hex(proof.source_inputs?.[f]))fail('input provenance '+f);
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(proof.pricing_module_sha256,'645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4','pricing pin');
 same(proof.scorers,V1714_SCORERS,'scorer pins (v1.7.13 tools, byte-identical)');
 same(proof.scorers,previous.proof?.scorers??proof.scorers,'scorer pins equal the predecessor');
 const a=proof.publication_approval;
 if(a?.fresh_baseline!=='v1.7.13'||a.top_five_effect!=='unchanged'||a.top_five_preview?.sha256!==proof.topfive_diff_sha256||!hex(proof.topfive_diff_sha256)||!a.top_five_preview?.path)fail('top-five preview binding');
 if(a.status!==V1714_APPROVAL_STATUS)fail('approval status');
 if(a.paid_public?.key!==PAID_KEY||a.paid_public?.visibility!=='public')fail('paid public basis');
 if(a.unranked_basis?.decision!=='v1713-h2o141-unranked-provisional')fail('unranked basis');
 return true;
}
async function load(p,root) { const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)}; }
export async function readOptionalJevbenchV1714Release(root=process.cwd()) {
 let publication;
 try {publication=await load(V1714_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV1713Release(root);
 if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V1714_ROOT}/jevbench-v1.7.13-publication.json`,root);
 const bundle=Object.fromEntries(await Promise.all(V1714_FILE_KEYS.map(async k=>[k,await load(`${V1714_ROOT}/jevbench-v1.7.14-${k}.json`,root)])));
 for(const [k,v] of Object.entries(bundle))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['history','history-carry','carry'])if(bundle[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k+' bytes');
 validateJevbenchV1714Bundle({manifest:publication.value,artifact:bundle.results.value,categories:bundle.categories.value,carry:bundle.carry.value,proof:bundle.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:bundle.results.value,bytes:bundle.results.bytes,sha256:bundle.results.sha256,categories:bundle.categories.value,categoriesSha256:bundle.categories.sha256,carry:bundle.carry.value,carrySha256:bundle.carry.sha256,proof:bundle.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1714ForBoard(root=process.cwd()) {
 let p;try{p=(await load(V1714_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(p?.review?.verdict!=='PASS')return null;
 return readOptionalJevbenchV1714Release(root);
}
export async function hasPublishedJevbenchV1714Release(root=process.cwd(),log=console.error) {
 try{return Boolean(await readJevbenchV1714ForBoard(root));}catch{log('JevBench v1.7.14 navigation omitted: publication validation failed');return false;}
}
export function v1714BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV1714Addendum(chain,release) {
 // Same draw as v1.7.13's row: the new rows carry that draw's pool sizes (pinned, equal to v1.7.13's bounds).
 const bounds={...apiFullAddendumCategoryBounds(chain.categories)};
 for(const k of V1714_CHANGED_KEYS)bounds[k]=structuredClone(V1714_NEW_ROW_BOUNDS[k]);
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.7.14',v1714_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.7.14',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
