// VisionJEV 1.0.0 on the unequated 27 Oct draw, unranked; all carried rows/cells/orders unchanged.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { readOptionalJevbenchV1720Release } from './jevbench-v1720-release.mjs';
import { apiFullAddendumCategoryBounds, withRowPoolCategoryRows } from './jevbench-api-full-addenda.mjs';
export const V1721_ROOT = 'data/raw/benchmarks/jevbench/v1.7';
export const V1721_MANIFEST = `${V1721_ROOT}/jevbench-v1.7.21-publication.json`;
export const V1721_FILE_KEYS = ['results','categories','carry','proof','history','history-carry'];
export const V1721_EXPECTED_HASHES = /*HASHES*/;
export const V1721_NEW_ROWS = /*NEWROWS*/;
export const V1721_NEW_ROW_BOUNDS = /*BOUNDS*/;
export const V1721_SCORERS = /*SCORERS*/;
export const V1721_PRICE_REFERENCES = /*PRICES*/;
export const V1721_REPRICED_PINS = /*TEXTFIX*/;
export const V1721_REPRICED = /*REPRICED*/;
export const V1721_COMMON_SET = /*COMMONSET*/;
export const V1721_CARRY_EXCEPT = /*TEXTEXCEPT*/;
export const V1721_DRAW = 'v1.6-regular-20261027';
export const V1721_NEW_KEYS = Object.keys(V1721_NEW_ROWS).sort();
export const V1721_CHANGED_KEYS = [...V1721_NEW_KEYS];
export const V1721_UNRANKED_NEW_KEYS = [...V1721_NEW_KEYS];
export const V1721_DRAW_KEYS = ["arcbright-elf-1-12b-r2", "chaoliangunsw-jev-style-2b-decision-v4", "decisio-gemma-4-12b-tuned-commit-think", "decisionnode-flash-0.9.1-rc1", "decisionnode-main-0.9.1-rc1", "h2o-lightning-4b-v1.4.1", "jeff_1_1_large", "jeff_1_1_qwen_4b", "microsoft-decision-1-r2", "strike-1", "torchcast-decision-31b-v1.0"];
export const V1721_NOTE_HEAD = "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured.";
export const V1721_NOTE_TAIL = "Shown unranked until then.";
export const V1721_NOT_RANKED_BECAUSE = V1721_NOTE_HEAD + ' ' + V1721_NOTE_TAIL;
export const V1721_H2O_EXTRA = 'On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.';
export const V1721_APPROVAL_STATUS = 'GO (standing; no top-five change)';
const NEW_KEY = 'visionjev-1.0.0-27b', MSFT = 'microsoft-decision-1-r2', H2O = 'h2o-lightning-4b-v1.4.1';
const COST_FIELDS = ['axes','composite_ci95','cost','jevbench_score','scores','v16','views'];
const REFERENCE_G_MED = 2.573387642438244;
const hash = b => createHash('sha256').update(b).digest('hex');
const fail = m => { throw new Error(`JevBench v1.7.21: ${m}`); };
const same = (a,b,m) => { if (!isDeepStrictEqual(a,b)) fail(m); };
const hex = s => /^[a-f0-9]{64}$/.test(s ?? '');
export const V1721_STRIKE_NOTE = "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.";
export const v1721NoteFor = k => k===NEW_KEY ? V1721_STRIKE_NOTE : {"arcbright-elf-1-12b-r2": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then.", "chaoliangunsw-jev-style-2b-decision-v4": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.", "decisio-gemma-4-12b-tuned-commit-think": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then.", "decisionnode-flash-0.9.1-rc1": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.", "decisionnode-main-0.9.1-rc1": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.", "h2o-lightning-4b-v1.4.1": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1. Shown unranked until then.", "jeff_1_1_large": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then.", "jeff_1_1_qwen_4b": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then.", "microsoft-decision-1-r2": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then.", "strike-1": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.", "torchcast-decision-31b-v1.0": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale: its first anchor runs used models weaker than this row, and stronger anchors are being measured. Shown unranked until then."}[k];
function publicOnly(v) {
 if (!v || typeof v !== 'object') return;
 for (const [k,x] of Object.entries(v)) {
  if (/^(task_id|opaque_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret)$/i.test(k)) fail('private field');
  publicOnly(x);
 }
}
/** Candidate validation is explicit; public readers always require an independent PASS receipt (and a PASS v1.7.20). */
export function validateJevbenchV1721Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256}, {candidate=false}={}) {
 for (const v of [manifest,artifact,categories,carry,proof]) publicOnly(v);
 if (manifest.revision !== 'v1.7.21' || manifest.schema_version !== 1 || manifest.status !== 'published' || manifest.provisional !== false) fail('manifest identity');
 if (!candidate && (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256))) fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.7.20',publication_sha256:previousManifestSha256},'predecessor binding');
 if (previous?.artifact.revision !== 'v1.7.20' || (!candidate && previous.manifest.review.verdict !== 'PASS')) fail('validated predecessor');
 for (const f of V1721_FILE_KEYS) {
  same(manifest.files[f]?.path,`${V1721_ROOT}/jevbench-v1.7.21-${f}.json`,'file path '+f);
  same(manifest.files[f]?.sha256,V1721_EXPECTED_HASHES[f],'pinned bytes '+f);
 }
 for (const f of ['historical_revision','historical_results_sha256','historical_carry_sha256']) same(manifest[f],previous.manifest[f],'history binding '+f);
 if (artifact.revision !== 'v1.7.21' || artifact.run_kind !== 'same-draw-addendum' || artifact.provisional !== false) fail('artifact identity');
 same(artifact.method,previous.artifact.method,'unchanged method');
 same(artifact.G_med,previous.artifact.G_med,'frozen median');
 const rows=artifact.systems,by=new Map(rows.map(s=>[s.key,s]));
 if (by.size !== rows.length) fail('duplicate key');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1721_NEW_KEYS].sort(),'exact roster');
 if (artifact.roster_count!==rows.length || artifact.n_ranked!==rows.filter(s=>s.ranked).length) fail('counts');
 // The cost exception covers exactly the predecessor's rows on the draw, each still unranked and unequated; only cost-dependent
 // fields (and Microsoft r2's disclosure ITEMS sentence) differ, each pinned before/after by the hash of its canonical JSON.
 same(previous.artifact.systems.filter(s=>s.draw?.id===V1721_DRAW).map(s=>s.key).sort(),V1721_DRAW_KEYS,'rows of the draw');
 for (const p of previous.artifact.systems) {
  same(by.get(p.key),p,'carried row '+p.key);
  same(categories.systems[p.key],previous.categories.systems[p.key],'carried cells '+p.key);
  same(categories.lanes[p.key],previous.categories.lanes[p.key],'carried lane '+p.key);
 }
 const drawRow=previous.artifact.systems.find(s=>s.key===H2O);
 if(!drawRow||drawRow.draw?.id!==V1721_DRAW)fail('predecessor row on the draw');
 for (const k of V1721_NEW_KEYS) {
  const s=by.get(k);same(s,V1721_NEW_ROWS[k],'new row '+k);
  if(s.ranked!==false||s.rank!==null||s.listing!=='unranked'||s.not_ranked_because!==v1721NoteFor(k))fail('unranked provisional row '+k);
  same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks of the unranked row '+k);
  if(proof.new_rows[k].treatment!=='unranked')fail('unranked provisional row proof '+k);
  if(s.method!=='v1.7'||s.new_in!=='v1.7.21'||s.endpoint_kind!=='gpu'||s.api_flag!==false||s.paid_fast_lane!==false||s.draw?.id!==V1721_DRAW||s.draw.release!=='v1.7.21')fail('hosted identity '+k);
  for(const f of ['label','drawn_on','status','offset','offset_ci95'])same(s.draw[f],drawRow.draw[f],'same draw as the predecessor rows '+f+' '+k);
  if(s.draw.status!=='anchor-runs-pending'||s.draw.offset?.I!==0||s.draw.offset?.C!==0)fail('offset 0 on a draw not equated '+k);
  if(s.v16.g_med_used!==REFERENCE_G_MED||s.draw.g_med!==REFERENCE_G_MED||s.v16.equating_offset!==null)fail('reference gap median '+k);
  if(s.status.rows!==1500||s.status.answered_ok!==1495||s.v16.n_items!==1500||s.decision_limit.n_over_limit!==0||s.decision_limit.treatment!=='share'||s.decision_limit.limit_s!==10||s.decision_limit.speed_n!==1500)fail('hosted coverage (1,500 items, 1,495 answered) '+k);
  if(s.cost.kind!=='estimate'||s.cost.usage_estimated_rows!==0||s.cost.common_basis?.n_items!==V1721_COMMON_SET.n||s.cost.common_basis?.rule!=='common')fail('estimate cost on the common set '+k);
  if(/\{[A-Za-z_][A-Za-z0-9_]*\}/.test(JSON.stringify(s))||!/all 1,500 items were sent; 5 exceeded the native 8,192-token input limit/.test(s.disclosure)||!/1,489 items every row on this draw answered \(same-items rule\)/.test(s.cost.basis))fail('public template or item count '+k);
  if(s.v16.ci95.B!==1000)fail('frozen confidence method '+k);
  same(s.v16.ci95.composite,s.composite_ci95,'CI '+k);
  for(const f of ['axes','composite_ci95','decision_limit','model_pin'])same(proof.new_rows[k][f],s[f],'new row proof '+f+' '+k);
  const ref=V1721_PRICE_REFERENCES[k],c=proof.new_rows[k].cost;
  same(proof.new_rows[k].price_reference,ref,'price reference '+k);
  if(ref.kind!=='estimate'||ref.listing!=='qwen/qwen3.8-27b'||ref.in!==0.42||ref.out!==3||c.kind!=='estimate'||c.output_tokens!==0||c.basis_items!==V1721_COMMON_SET.n||Math.abs(c.usd_per_1000-s.cost.usd_per_1000)>1e-15||Math.abs(s.cost.usd_per_1000-1000*(c.input_tokens_common*ref.in)/1e6/V1721_COMMON_SET.n)>1e-12||Math.abs(s.cost.common_basis.usd_per_1000_all_items-1000*(c.input_tokens_all*ref.in)/1e6/1500)>1e-12)fail('estimate cost '+k);
  same(proof.new_rows[k].category_pool_bounds,V1721_NEW_ROW_BOUNDS[k],'category pool bounds '+k);
  if(!hex(proof.new_rows[k].raw_sha256)||!hex(proof.new_rows[k].scored_input_sha256))fail('source pins '+k);
 }
 for (const k of [...V1721_NEW_KEYS,...V1721_DRAW_KEYS]) if(/\/home\/|workers\/|#\d{4,}|Florian|\bPREREG\b|d2b677de|9cde338c|9D88ECFA|auto-intake|custody|deputy|h2o141|tc31b|d1027-|jevbench-add-requests|release.owner/i.test(JSON.stringify(by.get(k))))fail('internal text '+k);
 // Unranked: the board (every order list) is the predecessor's, and no unranked row is in any order list.
 same(artifact.board,previous.artifact.board,'unchanged order lists');
 same(artifact.n_ranked,previous.artifact.n_ranked,'unchanged ranked count');
 for (const k of [...V1721_UNRANKED_NEW_KEYS,...V1721_DRAW_KEYS]) for (const [m,b] of Object.entries(artifact.board)) if ((b?.order??[]).includes(k)) fail('unranked row in order list '+m+' '+k);
 for (const m of ['A','B','C','capability']) {
  const ord=artifact.board[m].order;
  same([...ord].sort(),rows.filter(s=>s.ranked).map(s=>s.key).sort(),'order membership '+m);
  const val=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];
  ord.forEach((k,i)=>{if(by.get(k).ranks[m]!==i+1||(m==='A'&&by.get(k).rank!==i+1))fail('rank '+k);if(i&&val(ord[i-1])<val(k))fail('sort '+m)});
 }
 same(carry,previous.carry,'dated carry');
 same(Object.keys(categories.systems).sort(),[...new Set([...Object.keys(previous.categories.systems),...V1721_CHANGED_KEYS])].sort(),'category roster');
 if (categories.revision!=='v1.7.21'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 // The draw has no topic labels: families, languages and use cases are required, topics must be absent.
 for (const k of V1721_CHANGED_KEYS) {
  if (categories.systems[k]?.topics !== undefined) fail('topics on a draw without topic labels '+k);
  for (const dim of ['families','languages','usecases']) {
   const cells=categories.systems[k]?.[dim];if(!cells||!Object.keys(cells).length)fail('missing cells '+k+' '+dim);
   for(const [c,x] of Object.entries(cells))if(!Number.isInteger(x.n)||x.n<1||x.n>1500||!Number.isFinite(x.competence)||(dim!=='families'&&x.n>(V1721_NEW_ROW_BOUNDS[k][dim][c]??0)))fail('cell '+k+' '+dim+' '+c);
  }
 }
 if(proof.revision!=='v1.7.21'||proof.carried_rows!==previous.artifact.systems.length)fail('proof identity');
 same(proof.carried_rows_equal_except,V1721_CARRY_EXCEPT,'carry exception (draw-row cost fields only; ranks unchanged)');
 same(proof.exceptions,V1721_REPRICED_PINS,'cost change proof');
 same(V1721_REPRICED_PINS,{},'no carried-row exceptions');

 same(artifact.addendum.repriced_keys,[],'no re-costed rows');
 same(artifact.addendum.text_fixed_keys,[],'no note change');
 if(proof.cost_basis?.frozen_at!=='v1.7.16'||!proof.cost_basis?.rule.startsWith('fixed-common-cost-basis-d1027:')||proof.cost_basis?.n_items!==V1721_COMMON_SET.n||proof.cost_basis.set_sha256!==V1721_COMMON_SET.set_sha256||!hex(proof.cost_basis.cost_basis_sha256)||proof.cost_basis.scorer_flag!=='--cost-basis'||artifact.addendum.cost_basis?.set_sha256!==V1721_COMMON_SET.set_sha256)fail('same-items set binding');
 same(Object.keys(proof.cost_basis.per_row_membership).sort(),["arcbright-elf-1-12b-r2", "chaoliangunsw-jev-style-2b-decision-v4", "decisio-gemma-4-12b-tuned-commit-think", "h2o-lightning-4b-v1.4.1", "jeff_1_1_large", "jeff_1_1_qwen_4b", "microsoft-decision-1-r2", "strike-1", "torchcast-decision-31b-v1.0", "visionjev-1.0.0-27b"],'fixed-set membership roster');
 if(proof.same_draw?.status!=='anchor-runs-pending'||proof.same_draw.offset?.I!==0||proof.same_draw.offset?.C!==0||'equating' in proof)fail('draw not equated');
 same(proof.method,previous.artifact.method,'proof method');
 same(artifact.addendum.new_keys,V1721_NEW_KEYS,'addendum keys');
 same(artifact.addendum.same_draw,V1721_DRAW,'addendum draw');
 for(const f of ['scored_rows_sha256','entry_sha256','cells_sha256','recost_sha256'])if(!hex(proof.source_inputs?.[f]))fail('input provenance '+f);
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(proof.pricing_module_sha256,'645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4','pricing pin');
 same(proof.scorers,V1721_SCORERS,'scorer pins (v1.7.20 tools, byte-identical)');
 same(proof.scorers,previous.proof?.scorers??proof.scorers,'scorer pins equal the predecessor');
 const a=proof.publication_approval;
 if(a?.fresh_baseline!=='v1.7.20'||a.top_five_effect!=='unchanged'||a.top_five_preview?.sha256!==proof.topfive_diff_sha256||!hex(proof.topfive_diff_sha256)||!a.top_five_preview?.path)fail('top-five preview binding');
 if(a.status!==V1721_APPROVAL_STATUS)fail('approval status');
 if(a.unranked_basis?.decision!=='d1027-strong-anchors-needed'||a.cost_basis?.key!==V1721_DRAW)fail('unranked / same-items basis');
 return true;
}
async function load(p,root) { const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)}; }
export async function readOptionalJevbenchV1721Release(root=process.cwd()) {
 let publication;
 try {publication=await load(V1721_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV1720Release(root);
 if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V1721_ROOT}/jevbench-v1.7.20-publication.json`,root);
 const bundle=Object.fromEntries(await Promise.all(V1721_FILE_KEYS.map(async k=>[k,await load(`${V1721_ROOT}/jevbench-v1.7.21-${k}.json`,root)])));
 for(const [k,v] of Object.entries(bundle))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['history','history-carry','carry'])if(bundle[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k+' bytes');
 validateJevbenchV1721Bundle({manifest:publication.value,artifact:bundle.results.value,categories:bundle.categories.value,carry:bundle.carry.value,proof:bundle.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:bundle.results.value,bytes:bundle.results.bytes,sha256:bundle.results.sha256,categories:bundle.categories.value,categoriesSha256:bundle.categories.sha256,carry:bundle.carry.value,carrySha256:bundle.carry.sha256,proof:bundle.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1721ForBoard(root=process.cwd()) {
 let p;try{p=(await load(V1721_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(p?.review?.verdict!=='PASS')return null;
 return readOptionalJevbenchV1721Release(root);
}
export async function hasPublishedJevbenchV1721Release(root=process.cwd(),log=console.error) {
 try{return Boolean(await readJevbenchV1721ForBoard(root));}catch{log('JevBench v1.7.21 navigation omitted: publication validation failed');return false;}
}
export function v1721BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV1721Addendum(chain,release) {
 // Same draw as v1.7.13-v1.7.20: the new row carries its own pool sizes (pinned, the full draw's); the draw's earlier rows keep theirs.
 const bounds={...apiFullAddendumCategoryBounds(chain.categories)};
 for(const k of V1721_CHANGED_KEYS)bounds[k]=structuredClone(V1721_NEW_ROW_BOUNDS[k]);
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.7.21',v1721_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.7.21',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
