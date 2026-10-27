// Three same-draw self-hosted additions on v1.7.9. All other scores, intervals and cells are immutable.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { readOptionalJevbenchV179Release } from './jevbench-v179-release.mjs';
import { apiFullAddendumCategoryBounds, withRowPoolCategoryRows } from './jevbench-api-full-addenda.mjs';
export const V1710_ROOT = 'data/raw/benchmarks/jevbench/v1.7';
export const V1710_MANIFEST = `${V1710_ROOT}/jevbench-v1.7.10-publication.json`;
export const V1710_FILE_KEYS = ['results','categories','carry','proof','history','history-carry'];
export const V1710_EXPECTED_HASHES = /*HASHES*/;
export const V1710_REMEASURED_ROWS = /*ROWS*/;
export const V1710_NEW_ROWS = /*NEWROWS*/;
export const V1710_NEW_KEYS = Object.keys(V1710_NEW_ROWS).sort();
export const V1710_CHANGED_KEYS = [...Object.keys(V1710_REMEASURED_ROWS), ...V1710_NEW_KEYS];
export const V1710_REMEASURED_KEYS = Object.keys(V1710_REMEASURED_ROWS).sort();
const hash = b => createHash('sha256').update(b).digest('hex');
const fail = m => { throw new Error(`JevBench v1.7.10: ${m}`); };
const same = (a,b,m) => { if (!isDeepStrictEqual(a,b)) fail(m); };
const stripRank = s => { const r = structuredClone(s); delete r.rank; delete r.ranks; return r; };
const linkKeys = ['singularity-super-decider','singularity-super-decider-thinking'];
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
export function validateJevbenchV1710Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256}, {candidate=false}={}) {
 for (const v of [manifest,artifact,categories,carry,proof]) publicOnly(v);
 if (manifest.revision !== 'v1.7.10' || manifest.schema_version !== 1 || manifest.status !== 'published' || manifest.provisional !== false) fail('manifest identity');
 if (!candidate && (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256))) fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.7.9',publication_sha256:previousManifestSha256},'predecessor binding');
 if (previous?.artifact.revision !== 'v1.7.9' || previous.manifest.review.verdict !== 'PASS') fail('validated predecessor');
 for (const f of V1710_FILE_KEYS) {
  same(manifest.files[f]?.path,`${V1710_ROOT}/jevbench-v1.7.10-${f}.json`,'file path '+f);
  same(manifest.files[f]?.sha256,V1710_EXPECTED_HASHES[f],'pinned bytes '+f);
 }
 for (const f of ['historical_revision','historical_results_sha256','historical_carry_sha256']) same(manifest[f],previous.manifest[f],'history binding '+f);
 if (artifact.revision !== 'v1.7.10' || artifact.run_kind !== 'same-draw-addendum' || artifact.provisional !== false) fail('artifact identity');
 same(artifact.method,previous.artifact.method,'unchanged method');
 same(artifact.G_med,previous.artifact.G_med,'frozen median');
 const rows=artifact.systems,by=new Map(rows.map(s=>[s.key,s]));
 if (by.size !== rows.length) fail('duplicate key');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V1710_NEW_KEYS].sort(),'exact roster');
 if (artifact.roster_count!==rows.length || artifact.n_ranked!==rows.filter(s=>s.ranked).length) fail('counts');
 for (const p of previous.artifact.systems) {
  const expected=stripRank(p);
  if(linkKeys.includes(p.key)){expected.repo=vendorUrl;same(by.get(p.key).source_url,vendorUrl,'vendor source '+p.key);}
  same(stripRank(by.get(p.key)),expected,'carried row '+p.key);
  same(categories.systems[p.key],previous.categories.systems[p.key],'carried cells '+p.key);
  same(categories.lanes[p.key],previous.categories.lanes[p.key],'carried lane '+p.key);
 }
 for (const k of V1710_NEW_KEYS) {
  const s=by.get(k);same(s,V1710_NEW_ROWS[k],'new self-hosted row '+k);
  if(s.method!=='v1.7'||s.new_in!=='v1.7.10'||s.endpoint_kind!=='gpu'||s.paid_fast_lane!==(k==='iota-decide-4b-v0.3')||s.draw.id!=='v1.6-regular-20261012')fail('self-hosted identity '+k);
  if(s.status.rows!==1500||s.status.answered_ok!==(k==='decisio-qwen3.6-35b-a3b-v090'?1485:1500)||s.decision_limit.n_over_limit!==0||s.decision_limit.treatment!=='share'||s.decision_limit.limit_s!==10)fail('self-hosted coverage '+k);
  if(s.cost.kind!=='estimate'||s.cost.usage_estimated_rows!==0)fail('estimated cost '+k);
  const repo=s.repo.replace(/^https:\/\/huggingface.co\//,'');
  if(!s.model_pin.startsWith((k==='decisio-qwen3.6-35b-a3b-v090'?'aminry/decisio':repo)+'@')||/\{[A-Za-z_][A-Za-z0-9_]*\}/.test(JSON.stringify(s)))fail('model pin or public template '+k);
  if(s.v16.ci95.B!==1000)fail('frozen confidence method '+k);
  same(s.v16.ci95.composite,s.composite_ci95,'CI '+k);
  for(const f of ['axes','composite_ci95','decision_limit','model_pin'])same(proof.new_rows[k][f],s[f],'new row proof '+f+' '+k);
  same(proof.new_rows[k].price_reference,{base:k.startsWith('decisio')?'Qwen/Qwen3.6-35B-A3B':'Qwen/Qwen3.5-4B',listing:k.startsWith('decisio')?'qwen/qwen3.6-35b-a3b':'deepinfra:Qwen/Qwen3.5-4B',in:k.startsWith('decisio')?0.15:0.03,out:k.startsWith('decisio')?1.0:0.15},'base price '+k);
  if(!hex(proof.new_rows[k].raw_sha256)||!hex(proof.new_rows[k].scored_input_sha256))fail('self-hosted source pins '+k);
  if(/\/home\/|workers\/|#\d{4,}|Florian|\bPREREG\b|b7099b77|53a5052f/.test(JSON.stringify(s)))fail('internal self-hosted text '+k);
 }
 for (const m of ['A','B','C','capability']) {
  const ord=artifact.board[m].order;
  same([...ord].sort(),rows.filter(s=>s.ranked).map(s=>s.key).sort(),'order membership '+m);
  const val=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];
  ord.forEach((k,i)=>{if(by.get(k).ranks[m]!==i+1||(m==='A'&&by.get(k).rank!==i+1))fail('rank '+k);if(i&&val(ord[i-1])<val(k))fail('sort '+m)});
  same(ord.filter(k=>!V1710_CHANGED_KEYS.includes(k)),(m==='capability'?previous.artifact.systems.filter(s=>s.ranked).sort((a,b)=>a.ranks.capability-b.ranks.capability).map(s=>s.key):previous.artifact.board[m].order).filter(k=>!V1710_CHANGED_KEYS.includes(k)),'carried tie order '+m);
 }
 same(carry,previous.carry,'dated carry');
 same(Object.keys(categories.systems).sort(),[...new Set([...Object.keys(previous.categories.systems),...V1710_CHANGED_KEYS])].sort(),'category roster');
 if (categories.revision!=='v1.7.10'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 // Mixed draws retain their own cell counts, as in the v1.7.9 validator.
 for (const k of V1710_CHANGED_KEYS) for (const dim of ['families','languages','topics','usecases']) {
  const cells=categories.systems[k]?.[dim];if(!cells||!Object.keys(cells).length)fail('missing cells '+k+' '+dim);
  for(const c of Object.values(cells))if(!Number.isInteger(c.n)||c.n<1||c.n>1500||!Number.isFinite(c.competence))fail('cell '+k+' '+dim);
 }
 if(proof.revision!=='v1.7.10'||proof.carried_rows!==previous.artifact.systems.length-V1710_REMEASURED_KEYS.length)fail('proof identity');
 same(proof.method,previous.artifact.method,'proof method');
 same(artifact.addendum.link_fixed_keys,linkKeys,'link keys');
 same(proof.link_fixed_rows,linkKeys,'link proof keys');
 same(proof.exceptions,Object.fromEntries(linkKeys.map(k=>[k,{repo:vendorUrl}])),'link proof exceptions');
 for(const f of ['scored_rows_sha256','entry_sha256','cells_sha256'])if(!hex(proof.source_inputs?.[f]))fail('input provenance '+f);
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(proof.pricing_module_sha256,'645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4','pricing pin');
 same(proof.scorers,previous.proof.scorers,'scorer pins');
 const a=proof.publication_approval;
 if(a?.fresh_baseline!=='v1.7.9'||a.top_five_effect!=='changed'||a.status!=='GO (fair top-five change, Florian rule 25 Oct 2026; paid public automatic publication)'||a.button_tap!==false||a.go?.channel!=='laptop chat'||a.go?.date!=='2026-10-25'||a.go?.quote!=='3 ja'||a.go?.recorded_in!=='DECISIONS.md 2026-10-25 setup-review-open-questions-answered'||a.top_five_preview?.sha256!==proof.topfive_diff_sha256||!hex(proof.topfive_diff_sha256)||!a.top_five_preview?.path||V1710_NEW_KEYS.some(k=>!a.asks?.some(x=>x.key===k&&x.admission&&x.handoff&&x.relay)))fail('standing top-five GO proof');
 if ((a.fairness_check?.verdict!=='FAIR'||!hex(a.fairness_check?.sha256)||!a.fairness_check?.path))fail('bound FAIR verdict required');
 if (a.fairness_check?.verdict!=='FAIR'||a.fairness_check?.sha256!=='0cbbcc7fa4e7404c898a24b0393773567dd7c1f14cbc27ec1455fa0914e0ae3d')fail('fairness verdict or receipt');
 if(a.paid_public?.key!=='iota-decide-4b-v0.3'||a.paid_public?.order!=='b6b2b557'||a.paid_public?.visibility!=='public')fail('paid public basis');
 return true;
}
async function load(p,root) { const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)}; }
export async function readOptionalJevbenchV1710Release(root=process.cwd()) {
 let publication;
 try {publication=await load(V1710_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV179Release(root);
 const predecessor=await load(`${V1710_ROOT}/jevbench-v1.7.9-publication.json`,root);
 const bundle=Object.fromEntries(await Promise.all(V1710_FILE_KEYS.map(async k=>[k,await load(`${V1710_ROOT}/jevbench-v1.7.10-${k}.json`,root)])));
 for(const [k,v] of Object.entries(bundle))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['history','history-carry','carry'])if(bundle[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k+' bytes');
 validateJevbenchV1710Bundle({manifest:publication.value,artifact:bundle.results.value,categories:bundle.categories.value,carry:bundle.carry.value,proof:bundle.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:bundle.results.value,bytes:bundle.results.bytes,sha256:bundle.results.sha256,categories:bundle.categories.value,categoriesSha256:bundle.categories.sha256,carry:bundle.carry.value,carrySha256:bundle.carry.sha256,proof:bundle.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1710ForBoard(root=process.cwd()) {
 let p;try{p=(await load(V1710_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(p?.review?.verdict!=='PASS')return null;
 return readOptionalJevbenchV1710Release(root);
}
export async function hasPublishedJevbenchV1710Release(root=process.cwd(),log=console.error) {
 try{return Boolean(await readJevbenchV1710ForBoard(root));}catch{log('JevBench v1.7.10 navigation omitted: publication validation failed');return false;}
}
export function v1710BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV1710Addendum(chain,release) {
 const bounds={...apiFullAddendumCategoryBounds(chain.categories)};
 for(const k of V1710_CHANGED_KEYS) {
  const row=release.artifact.systems.find(s=>s.key===k);
  const counts=new Map();
  for(const s of chain.published.systems)if(s.draw?.id===row.draw.id && bounds[s.key]){const b=JSON.stringify(bounds[s.key]);counts.set(b,(counts.get(b)??0)+1);}
  const [best]=[...counts].sort((a,b)=>b[1]-a[1]);if(!best)fail('category bounds '+k);
  bounds[k]=JSON.parse(best[0]);
 }
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.7.10',v1710_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.7.10',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
