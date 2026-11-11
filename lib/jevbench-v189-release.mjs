// One measured but unranked row; independent review gates every public reader.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual as equal} from 'node:util';
import {readOptionalJevbenchV188Release} from './jevbench-v188-release.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';
export const V189_ROOT='data/raw/benchmarks/jevbench/v1.8';
export const V189_MANIFEST=`${V189_ROOT}/jevbench-v1.8.9-publication.json`;
export const V189_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V189_EXPECTED_HASHES={"carry": "271d1fc77a136a04a1eb6deb5480c52d4211eb2b66b2ac8bb31e80867e69003a", "categories": "dee4dbbc8b81bfa42d44d6bbcd91c5693d702f042f98f93f7037d7b6ff484c53", "history": "d5e91333d6acefef1506f2a6ce23f71220ac1eeac9ce2d4e817c88a0a979a38b", "history-carry": "f4d8ddfae4ac3b2741ca7cfdaa930b2afc1d9be612f4e6683a230aa23834e2ba", "proof": "3e3700cebe7760ba1f02c5f9028aa5e6e3e14d48b1a544f5463c40492c21783f", "results": "f3b85cf41f6349fd7c33dc4b43c1ebc111bc445e835302d868cb8150f12b911f"};
export const V189_NEW_ROWS={"karpo_decision_31b": {"api_flag": false, "api_subset": false, "author": "MachinePulse AI", "axes": {"calibration": 95.99730713206564, "cost": 57.9400170643567, "intelligence": 83.06083634077379, "speed": 88.29089098203782}, "capability": 89.52907173641972, "composite_ci95": {"A": [76.97183408288284, 78.89052096129261], "B": [77.34935119229758, 80.2301519727583], "C": [76.97183408288284, 78.89052096129261]}, "cost": {"basis": "GPU-time estimate from v1.8.0: one monthly-rented RTX PRO 6000 96 GB, USD 1.5235/hour; average load 70%. Architecture: dense gemma, 31B active parameters; throughput 10106.516129 tokens/s (architecture-class calibration, efficient-engine prefill). GPU-time cost USD 0.0252347746738464/1,000; old list-price estimate USD 0.0379665815983882/1,000 (google/gemma-4-31b-it at USD 0.09/M input and USD 0.34/M output). Applied min(old list-price estimate, GPU-time cost) = USD 0.0252347746738464/1,000. Estimated, not a bill.", "kind": "estimate", "usd_per_1000": 0.025234774673846376}, "decision_limit": {"limit_s": 10.0, "rule": "latency_s > limit -> failed", "treatment": "share"}, "disclosure": "Paid evaluation, published with the author's consent. Measured by us on an evaluator-owned rented GPU with the author's own serving code at the pinned commit, offline (no network) during the sealed run. As agreed for this evaluation, this row shows the standard scores only; the per-category breakdowns are not published. Failed or unanswered requests count as wrong answers.", "display": "Karpo-Decision-31B", "draw": {"drawn_on": "2026-10-27", "g_med": 2.573387642438244, "id": "v1.6-regular-20261027", "label": "Third regular draw", "measured_on": "2026-11-10", "offset": {"C": 0, "I": 0}, "offset_ci95": null, "release": "v1.8.9", "results_sha256": "52d18a627513d68abf7bf706bd1f1e65088d755e76af71b3000330082f4e7730", "status": "anchor-runs-pending"}, "endpoint_condition": "Evaluator-owned Verda GPU VM (RTX PRO 6000), offline read-only container (--network none); author's karpo_decision.serve.server unchanged at code commit 25c38826 (github.com/machinepulse-ai/karpo-decision), bf16 backbone + fp32 readout, one forward pass, no generation.", "endpoint_kind": "gpu", "full_coverage": true, "jevbench_score": 78.36721515667831, "key": "karpo_decision_31b", "last_measured_on": "2026-11-10", "licence": "Apache-2.0 (LICENSE in model and code repos); base google/gemma-4-31B-it Apache-2.0", "listing": "unranked", "measured_in": "v1.8.9", "measurement_date_status": "measured", "method": "v1.7", "model_pin": "MachinePulseAI/karpo-decision-31B@221bf1a011093807e29b77859f09499c2c365e34", "new_in": "v1.8.9", "not_ranked_because": "Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.", "paid_fast_lane": true, "publication_scope": "standard-axes-only", "rank": null, "ranked": false, "ranks": {"A": null, "B": null, "C": null, "capability": null}, "repo": "https://huggingface.co/MachinePulseAI/karpo-decision-31B", "scores": {"A": 78.36721515667831, "B": 79.26301778954858, "C": 78.36721515667831}, "speed": {"adjustment": "x2 + 0.15 s (assumption, not measured)", "p50_s_adjusted": 0.3143914080000286, "p50_s_raw": 0.0821957040000143, "p95_s_adjusted": 0.47145498600011704, "p95_s_raw": 0.16072749300005854}, "status": {"status": "complete"}, "support": {"choice": "native", "noul": "native", "score": "native"}, "underlying": "Paid evaluation, published with the author's consent. Measured by us on an evaluator-owned rented GPU with the author's own serving code at the pinned commit, offline (no network) during the sealed run. As agreed for this evaluation, this row shows the standard scores only; the per-category breakdowns are not published. Failed or unanswered requests count as wrong answers.", "v16": {"ci95": {"B": 1000, "C": [93.01795412038537, 95.99113346223155], "I": [78.64131102777266, 86.27284783343781], "capability": [86.17213729364292, 90.65262511838012], "composite": {"A": [76.97183408288284, 78.89052096129261], "B": [77.34935119229758, 80.2301519727583], "C": [76.97183408288284, 78.89052096129261]}, "seed": 16}, "complete": true, "equated": null, "equating_offset": null, "g_med_used": 2.573387642438244, "lane": "selfhosted"}, "views": {"Balanced 33:33:33": 73.84652898023006, "Emphasis on Accuracy 60:20:20": 77.2755363172459, "Emphasis on Cost 20:20:60": 66.53957533057967, "Emphasis on Speed 20:60:20": 79.01741893671546, "Intelligence only": 83.06083634077379}}};
export const V189_NEW_ROW_BOUNDS={"karpo_decision_31b": {}};
export const V189_EXPECTED_PROOF={"carried_rows": 339, "carried_rows_equal_except": [], "cost_basis": {"cost_basis_sha256": "b83bdfd14c263ffacfa572b304084154afca84c1f00083101a33783ae6f8b356", "frozen_at": "v1.7.16", "n_items": 1489, "rule": "fixed-common-cost-basis-d1027 (frozen at v1.7.16)", "set_sha256": "4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537"}, "exceptions": {"text_only_sha256": "37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570"}, "method": {"decision_limit_s": 10, "label": "v1.7", "rule": "latency_s > 10.000 s -> failed", "treatment": "share"}, "new_rows": {"karpo_decision_31b": {"axes": {"calibration": 95.99730713206564, "cost": 57.9400170643567, "intelligence": 83.06083634077379, "speed": 88.29089098203782}, "code_commit": "25c38826", "composite_ci95": {"A": [76.97183408288284, 78.89052096129261], "B": [77.34935119229758, 80.2301519727583], "C": [76.97183408288284, 78.89052096129261]}, "cost": {"active_b": 31, "architecture_class": "dense", "cost_common": 0.025234774673846376, "family": "gemma", "gpu_common": 0.025234774673846376, "list_common": 0.03796658159838818, "ref": {"authority": "frozen market reference and v1.8 GPU-time min", "in": 0.09, "listing": "google/gemma-4-31b-it", "module_sha256": "2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b", "out": 0.33999999999999997}, "throughput": 10106.516129032258}, "decision_limit": {"limit_s": 10.0, "rule": "latency_s > limit -> failed", "treatment": "share"}, "failure_treatment": "Failed or unanswered requests count as wrong answers.", "model_pin": "MachinePulseAI/karpo-decision-31B@221bf1a011093807e29b77859f09499c2c365e34", "price_reference": {"authority": "frozen market reference and v1.8 GPU-time min", "in": 0.09, "listing": "google/gemma-4-31b-it", "module_sha256": "2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b", "out": 0.33999999999999997}, "scored_input_sha256": "52d18a627513d68abf7bf706bd1f1e65088d755e76af71b3000330082f4e7730", "treatment": "unranked"}}, "predecessor": {"publication_sha256": "aa7ae8f0437d44d0afaa29c91367cec86c5868ece027ddd9d6ce2ed5420500df", "revision": "v1.8.8"}, "pricing_authority": "frozen market reference and v1.8 GPU-time min", "pricing_module_sha256": "2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b", "publication_approval": {"fresh_baseline": "v1.8.8", "status": "GO (standing; no top-five change; paid evaluation published with the author's written consent)", "top_five_effect": "unchanged"}, "remeasured_rows": {}, "repriced_rows": {}, "revision": "v1.8.9", "schema_version": 1, "scorers": {"a2_cells_v16": "afd034efe27bde12f2ebbfd12c4c0792c93214e1aa9a63deecb0e83a0184c990", "build_categories_v16": "40eb50f3d7fea2693b4478c4b89f8bfb957dd17776add491935742e3b9354e73", "build_topics_v16": "ec04ab598162bfc4340ffa7916a06573eb1222132c61e47ab772045bc67ced78", "decisive_v16": "80b9ccf43e58dddb1b2a77e0a33aba8a9f7337a3a9a639afc7264218bbf8918f", "noul_method_v16": "119e59486ab3300b972fbcbadb0fe1dceceb124287607375aa61c66063c607d0", "pins_v17": "b50cc00dd2cb0ba46157eb6a2bda620255f3ff54404025e992bc7962dfff2f8b", "run_under_v17": "efb194b2ea350db59be37e5e72af71f809f763a2476cd6f521adf6f4fd90a64f", "score_v15": "0931e05c6410b1b971201834397cb609cdb25f942723c50375632952f6dcc447", "score_v15_headlineA": "826f2cbcb57007ec8a161e6eb0111182b8a656c0638027c6c78022a858fd8e2c", "score_v16": "02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9", "score_v17": "6363458d208a52f4ad5aaf73027cad1b7e0358ff962e581d57a3cc462c8f1978"}, "source_inputs": {"inputs/ARCHITECTURE.json": "1a8a15bcd9be85e28d7e1a8e77e6e2278f108e0c4723771195d74597f0be44af", "inputs/BREAKDOWN-POLICY.json": "f3fa5881ae40c8b925191f12ad152f6a92cd2db51c0fe636f675c12409ed245b", "inputs/CLEANED-ROWS.json": "ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356", "inputs/ENTRIES.json": "8ea17f60667faa5ae7cbf31dd5df255c006061786516fe5905d357a18af93c09", "inputs/ENTRY-PINS.json": "790abd6b982200d63fd96ce5ed0b3686581f9d406829a3d97cca1d95effa9807", "inputs/PROVENANCE.json": "c5df2c6c7298c42341aa62c17de2c840cf4ef9dbc1b7e50f44dacfd8b9415a45", "inputs/PUBLIC-ROWS.json": "540ffd7a9eb008c8f7c3ec587f22000db9cfb66807d52a227a1b237bfe191c7e", "inputs/TEXT-EXCEPTIONS.json": "37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570", "src/cells.json": "710be6a57933caf7a362bc6fe8c8c988e7b23648042902abb96907cc8bc9c050", "src/scored.json": "183731ba7421ce7a1bd692113ef27212a635247fd5a60c3bbeba1b9d3764cb74", "src/usage.json": "b1f85b54e0bc63746c7d193dded52848ff31db2c437950965a98c83650dfcdfd"}, "topfive_diff_sha256": "2056b2f702210efa70074dd85d22b0112f485d67a7553163698bd98bd9542bfa"};
export const V189_TEXT_EXCEPTIONS=[];
export const V189_NEW_CELLS={"karpo_decision_31b": {}};
export const V189_BREAKDOWN_POLICY={"decision": "DECISIONS 2026-11-11 09:12 UTC v189-karpo-public-scope (release owner)", "reason": "Published from a private evaluation with the customer's consent; by scope of that consent only the standard axes are shown, no use-case, topic or language cells.", "withheld_dims": ["topics", "usecases", "languages"]};
export const V189_NEW_KEYS=Object.keys(V189_NEW_ROWS).sort();
export const V189_NOTE='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.';
const fail=m=>{throw Error('JevBench v1.8.9: '+m);};
const same=(a,b,m)=>{if(!equal(a,b))fail(m);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const hex=s=>/^[a-f0-9]{64}$/.test(s??'');
// The publication scope is intentionally narrower than the private scoring record.
export function validateV189PublicText(value){
 if(value?.model_pin!=='MachinePulseAI/karpo-decision-31B@221bf1a011093807e29b77859f09499c2c365e34')fail('pinned weights');
 const forbidden=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:worker|custody|custodian|deputy|Florian|CoS)\b|board #|order.id|fastlane-native|jevbench-add-requests|\/home\/|per.type|\btiers?\b|token totals|input tokens|output tokens|\bPREREG\b|\{[A-Z_]+\}/i;
 // Numeric strings are allowed only from the row's published measurements and setup.
 const published=V189_NEW_ROWS.karpo_decision_31b;
 const allowedNumbers=new Set(['10106.516129','1.5235','1,000','96','6000','31','2026']);
 const pins=new Set(['25c38826',published.draw.id]);
 function publishedValues(v){
  if(typeof v==='number')allowedNumbers.add(String(v));
  else if(typeof v==='string')for(const m of v.matchAll(/\b[a-f0-9]{40,64}\b/g))pins.add(m[0]);
  else if(v&&typeof v==='object')Object.values(v).forEach(publishedValues);
 }
 publishedValues(published);
 publishedValues(V189_EXPECTED_PROOF.new_rows.karpo_decision_31b);
 function unexpectedNumber(text){
  for(const pin of pins)text=text.replaceAll(pin,'');
  for(const m of text.matchAll(/(?<![\w]|\d\.)\d+(?:,\d{3})*(?:\.\d+)?(?!\w|\.\d)/g)){
   if((m[0].includes(',')||m[0].split('.')[0].length>=4)&&!allowedNumbers.has(m[0]))return true;
  }
  return false;
 }
 const privateKeys=/^(?:n|n_items|n_public|n_sealed_side|n_over_limit|n_over_limit_answered_ok|speed_n|rows|answered_ok|missing|parts|per_type|per_type_split|breakdowns|breakdowns_equated|noul_decisive|I_open|I_sealed|gap|input_tokens.*|output_tokens.*|usage_estimated_rows)$/;
 function walk(v,path=[]){
  if(typeof v==='string'&&(forbidden.test(v)||unexpectedNumber(v)))fail('restricted public wording '+path.join('.'));
  if(Array.isArray(v))v.forEach((x,i)=>walk(x,[...path,i]));
  else if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(privateKeys.test(k))fail('restricted field '+[...path,k].join('.'));walk(x,[...path,k]);}
 }
 walk(value);return true;
}
export function validateJevbenchV189Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256},{candidate=false}={}){
 if(manifest.revision!=='v1.8.9'||manifest.schema_version!==1||manifest.status!=='published'||manifest.provisional!==false)fail('manifest identity');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!hex(manifest.review.receipt_sha256)))fail('independent review PENDING');
 same(manifest.predecessor,{revision:'v1.8.8',publication_sha256:previousManifestSha256},'predecessor binding');
 if(previous?.artifact.revision!=='v1.8.8'||(!candidate&&previous.manifest.review.verdict!=='PASS'))fail('validated predecessor');
 for(const f of V189_FILE_KEYS){same(manifest.files[f]?.path,`${V189_ROOT}/jevbench-v1.8.9-${f}.json`,'file path '+f);same(manifest.files[f]?.sha256,V189_EXPECTED_HASHES[f],'pinned hash '+f);}
 for(const f of ['historical_revision','historical_results_sha256','historical_carry_sha256'])same(manifest[f],previous.manifest[f],'historical binding '+f);
 if(artifact.revision!=='v1.8.9'||artifact.run_kind!=='same-draw-addendum'||artifact.provisional!==false)fail('artifact identity');
 for(const f of ['method','G_med','n_ranked','board'])same(artifact[f],previous.artifact[f],'unchanged '+f);
 const by=new Map(artifact.systems.map(s=>[s.key,s]));
 if(by.size!==artifact.systems.length||artifact.roster_count!==by.size)fail('roster counts');
 same([...by.keys()].sort(),[...previous.artifact.systems.map(s=>s.key),...V189_NEW_KEYS].sort(),'exact roster');
 for(const s of previous.artifact.systems){const expected=structuredClone(s);for(const e of V189_TEXT_EXCEPTIONS.filter(e=>e.key===s.key)){const path=e.path.split('.');let o=expected;for(const f of path.slice(0,-1))o=o[f];const f=path.at(-1);if(o[f]!==e.before||hash(o[f])!==e.before_sha256||hash(e.after)!==e.after_sha256)fail('text exception hash '+s.key);o[f]=e.after;}same(by.get(s.key),expected,'carried row '+s.key);same(categories.systems[s.key],previous.categories.systems[s.key],'carried cells '+s.key);same(categories.lanes[s.key],previous.categories.lanes[s.key],'carried lane '+s.key);}
 for(const k of V189_NEW_KEYS){
  const s=by.get(k);validateV189PublicText(s);same(s,V189_NEW_ROWS[k],'new row '+k);
  if(s.ranked!==false||s.rank!==null||s.listing!=='unranked'||s.not_ranked_because!==V189_NOTE)fail('unranked '+k);
  same(s.ranks,{A:null,B:null,C:null,capability:null},'null ranks '+k);
  for(const b of Object.values(artifact.board))if(b.order?.includes(k))fail('unranked in list '+k);
  if(s.draw?.status!=='anchor-runs-pending'||s.draw.offset.I!==0||s.draw.offset.C!==0||s.draw.release!=='v1.8.9'||s.v16.equating_offset!==null)fail('not equated '+k);
  if(s.decision_limit.limit_s!==10||s.decision_limit.treatment!=='share'||s.v16.g_med_used!==2.573387642438244)fail('scoring method '+k);
  if(s.paid_fast_lane!==true||s.publication_scope!=='standard-axes-only')fail('publication scope '+k);
  same(s.status,{status:'complete'},'status without counts '+k);
  const p=proof.new_rows[k],u=p.cost;
  for(const f of ['axes','decision_limit','model_pin','composite_ci95'])same(p[f],s[f],'proof '+f+' '+k);
  if(s.cost.usd_per_1000!==u.cost_common||Math.abs(u.cost_common-Math.min(u.list_common,u.gpu_common))>1e-12)fail('GPU-time min cost '+k);
  if(u.ref.module_sha256!=='2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b'||u.active_b!==31||Math.abs(u.throughput-10106.516129032258)>1e-9)fail('public cost method '+k);
  for(const term of ['Verda GPU VM','RTX PRO 6000','--network none','25c38826','bf16','fp32','one forward pass','no generation'])if(!s.endpoint_condition.includes(term))fail('endpoint disclosure '+term);
  for(const term of ['Paid evaluation, published with the author','Failed or unanswered requests count as wrong answers.'])if(!s.disclosure.includes(term))fail('public disclosure '+term);
  for(const term of ['min(old list-price estimate, GPU-time cost)','Estimated, not a bill','USD 1.5235/hour','70%','dense gemma','31B'])if(!s.cost.basis.includes(term))fail('cost method '+term);
  if(s.api_flag!==false||s.endpoint_kind!=='gpu'||s.speed.adjustment!=='x2 + 0.15 s (assumption, not measured)'||s.cost.kind!=='estimate')fail('self-hosted identity '+k);
  same(categories.systems[k],V189_NEW_CELLS[k],'pinned category cells '+k);
  for(const dim of V189_BREAKDOWN_POLICY.withheld_dims)if(Object.keys(categories.systems[k][dim]??{}).length)fail('withheld category dimension '+dim);
  for(const dim of Object.keys(categories.systems[k]))if(!['topics','usecases','languages'].includes(dim))fail('unapproved category dimension '+dim);
  if(/\/home\/|workers\/|#\d{4,}|\bPREREG\b|custody|deputy|release.owner|Florian|Sandy|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\{[A-Z_]+\}/i.test(JSON.stringify(s)))fail('internal public text '+k);
 }
 same(carry,previous.carry,'immutable carry');
 same(Object.keys(categories.systems).sort(),[...Object.keys(previous.categories.systems),...V189_NEW_KEYS].sort(),'category roster');
 if(categories.revision!=='v1.8.9'||categories.results_sha256!==manifest.files.results.sha256)fail('category binding');
 same(proof,V189_EXPECTED_PROOF,'exact proof');
 if(proof.carried_rows!==previous.artifact.systems.length||!equal(proof.carried_rows_equal_except,V189_TEXT_EXCEPTIONS)||!hex(proof.exceptions.text_only_sha256))fail('enumerated text-only carry exceptions');
 if(proof.publication_approval.status!=="GO (standing; no top-five change; paid evaluation published with the author's written consent)"||proof.publication_approval.top_five_effect!=='unchanged')fail('standing approval');
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(artifact.addendum.new_keys,V189_NEW_KEYS,'addendum keys');
 return true;
}
async function load(p,root){const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)};}
// Build-time memo (CR-729): every page of `next build` reads the live board, and each release reader re-validates its whole
// predecessor chain, so the build cost grows with the square of the release count. Inside `next build` only (NEXT_PHASE),
// the fully validated v1.8.9 bundle is kept per root and per worker process and every caller gets a deep copy. Tests, the
// validator's negative controls and the runtime server never set NEXT_PHASE and keep the uncached, fully re-validated path.
const V189_BUILD_CACHE=new Map();
const v189BuildCacheOn=()=>process.env.NEXT_PHASE==='phase-production-build';
const copyV189Release=r=>{if(!r)return r;const{bytes,...rest}=r;return{...structuredClone(rest),bytes};};
export async function readOptionalJevbenchV189Release(root=process.cwd()){
 if(!v189BuildCacheOn())return readJevbenchV189ReleaseUncached(root);
 const key=String(root);
 if(!V189_BUILD_CACHE.has(key)){const p=readJevbenchV189ReleaseUncached(root);V189_BUILD_CACHE.set(key,p);p.catch(()=>V189_BUILD_CACHE.delete(key));}
 return copyV189Release(await V189_BUILD_CACHE.get(key));
}
async function readJevbenchV189ReleaseUncached(root){
 let publication;try{publication=await load(V189_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV188Release(root);if(!previous)fail('validated predecessor');
 const predecessor=await load(`${V189_ROOT}/jevbench-v1.8.8-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V189_FILE_KEYS.map(async k=>[k,await load(`${V189_ROOT}/jevbench-v1.8.9-${k}.json`,root)])));
 for(const[k,v]of Object.entries(b))if(v.sha256!==publication.value.files[k]?.sha256)fail('bytes hash '+k);
 for(const k of ['carry','history','history-carry'])if(b[k].sha256!==previous.manifest.files[k].sha256)fail('immutable '+k);
 validateJevbenchV189Bundle({manifest:publication.value,artifact:b.results.value,categories:b.categories.value,carry:b.carry.value,proof:b.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,carry:b.carry.value,carrySha256:b.carry.sha256,proof:b.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV189ForBoard(root=process.cwd()){
 let p;try{p=(await load(V189_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 return p?.review?.verdict==='PASS'?readOptionalJevbenchV189Release(root):null;
}
export async function hasPublishedJevbenchV189Release(root=process.cwd(),log=console.error){try{return Boolean(await readJevbenchV189ForBoard(root));}catch{log('JevBench v1.8.9 navigation omitted: publication validation failed');return false;}}
export function v189BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV189Addendum(chain,release){
 const bounds={...apiFullAddendumCategoryBounds(chain.categories),...structuredClone(V189_NEW_ROW_BOUNDS)};
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.8.9',v189_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.8.9',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
