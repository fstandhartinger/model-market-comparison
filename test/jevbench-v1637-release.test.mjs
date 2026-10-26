import { hasPublishedJevbenchV179Release } from '../lib/jevbench-v179-release.mjs';
import { hasPublishedJevbenchV178Release } from '../lib/jevbench-v178-release.mjs';
import { hasPublishedJevbenchV177Release } from '../lib/jevbench-v177-release.mjs';
import { hasPublishedJevbenchV176Release } from '../lib/jevbench-v176-release.mjs';
import { hasPublishedJevbenchV175Release } from '../lib/jevbench-v175-release.mjs';
import { hasPublishedJevbenchV174Release } from '../lib/jevbench-v174-release.mjs';
import { hasPublishedJevbenchV173Release } from '../lib/jevbench-v173-release.mjs';
import { hasPublishedJevbenchV172Release } from '../lib/jevbench-v172-release.mjs';
import { hasPublishedJevbenchV171Release } from '../lib/jevbench-v171-release.mjs';
import test from 'node:test';
import {hasPublishedJevbenchV170Release} from '../lib/jevbench-v170-release.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readOptionalJevbenchV1637Release,validateJevbenchV1637Bundle,V1637_ROW_SPEC} from '../lib/jevbench-v1637-release.mjs';
import {readOptionalJevbenchV1636Release} from '../lib/jevbench-v1636-release.mjs';
import {readJevbenchV161Release} from '../lib/jevbench-v16-release.mjs';
const r=await readOptionalJevbenchV1637Release(),previous=await readOptionalJevbenchV1636Release(),base161=(await readJevbenchV161Release()).artifact;
const H2O='h2o-lightning-4b',KAHN='kahn1',KEYS=[H2O,KAHN];
const previousManifestSha256=createHash('sha256').update(await readFile('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.36-publication.json')).digest('hex');
const base={manifest:r.manifest,artifact:r.artifact,categories:r.categories,proof:r.proof,previous,previousManifestSha256,base161};
const rejects=(edit,pattern)=>{const b=structuredClone(base);edit(b);assert.throws(()=>validateJevbenchV1637Bundle(b),pattern);};
const row=(b,k)=>b.artifact.systems.find(s=>s.key===k);
const pub=k=>base161.systems.find(s=>s.key===k);
test('v1.6.37 restates exactly the two v1.6.1 rows and adds nothing else',()=>{
 assert.equal(r.artifact.systems.length,72);assert.equal(r.artifact.n_ranked,61);
 assert.deepEqual(r.artifact.systems.filter(s=>!previous.artifact.systems.some(p=>p.key===s.key)).map(s=>s.key).sort(),KEYS.sort());
 assert.deepEqual(Object.keys(r.proof.new_rows).sort(),Object.keys(previous.proof.new_rows).sort());assert.deepEqual(r.proof.new_rows,previous.proof.new_rows);
 assert.deepEqual(r.artifact.v16.cost_basis,previous.artifact.v16.cost_basis);assert.equal(r.proof.cost_basis_sha256,previous.proof.cost_basis_sha256);assert.equal(r.artifact.G_med,9.839526770355711);
 assert.equal(r.proof.pricing_module_sha256,'1f4d1f7b1ce97ab27b938043444b9c2757e4a9dbecc799a803122588401f5bf1');assert.equal(r.proof.predecessor_pricing_module_sha256,r.proof.pricing_module_sha256);
 for(const k of Object.keys(previous.proof.repriced_rows))assert.deepEqual(r.proof.repriced_rows[k],previous.proof.repriced_rows[k],k);
});
test('h2o-lightning-4b: price corrected to the frozen Qwen/Qwen3.5-4B reference, nothing else of the published row changes',()=>{
 const s=row(base,H2O),b=pub(H2O),n=r.proof.repriced_rows[H2O];
 assert.equal(b.cost.usd_per_1000,0.021055837438423645);assert.equal(s.cost.usd_per_1000,0.015791878078817736);
 assert.equal(1000*(854867*0.030000000000000002+0)/1e6/1624,s.cost.usd_per_1000);
 assert.equal(s.cost.kind,'estimate');assert.equal(s.cost.common_basis,null);assert.equal(s.cost.usage_estimated_rows,0);
 assert.match(s.cost.basis,/USD 0\.04 per 1M input/);assert.match(s.cost.basis,/USD 0\.03 per 1M input and USD 0\.15 per 1M output \(DeepInfra, 25 Sep 2026 snapshot\)/);assert.match(s.cost.basis,/Corrected in v1\.6\.37, no new measurement/);
 for(const a of ['intelligence','calibration','speed'])assert.equal(s.axes[a],b.axes[a]);assert.equal(s.capability,b.capability);
 assert.deepEqual([s.axes.cost,s.scores.A,s.scores.B,s.scores.C],[64.04698652895101,73.82224524014528,70.5813765538927,73.82224524014528]);
 assert.deepEqual(s.composite_ci95.A,[70.99731037439084,75.13409530573585]);assert.deepEqual(s.composite_ci95,s.v16.ci95.composite);
 for(const f of ['I','C','capability','B','seed'])assert.deepEqual(s.v16.ci95[f],b.v16.ci95[f]);
 assert.equal(s.supersedes_base_row,'v1.6.1');assert.equal(s.repriced_in,'v1.6.37');assert.equal(s.measured_in,'v1.6.1');assert.equal(s.last_measured_on,'2026-10-04');
 assert.equal(n.no_new_measurement,true);assert.equal(n.input_tokens,854867);assert.equal(n.raw_sha256,'4b19dbf4aa30baf2cf003b507340ecd863328c7185dd03cbe92bd71c3f95fd7f');assert.match(n.ci_method,/^exact:/);
 assert.deepEqual(n.price_per_million,{input:0.030000000000000002,output:0.15});assert.deepEqual(n.previous_price_per_million,{input:0.04,output:0});
 const note=r.artifact.measurement_notes.find(x=>x.startsWith(H2O+': '));assert.match(note,/REPRICED row, no new measurement/);assert.match(note,/exact \(same items and seed/);
});
test('kahn1: same correction on its own-estimate tokens; the false snapshot attribution of 0.04 is gone',()=>{
 const s=row(base,KAHN),b=pub(KAHN),n=r.proof.repriced_rows[KAHN];
 assert.equal(b.cost.usd_per_1000,0.06129480295566502);assert.equal(s.cost.usd_per_1000,0.04597110221674877);assert.equal(n.input_tokens,2488569);
 assert.deepEqual([s.axes.cost,s.scores.A,s.scores.B,s.scores.C],[50.12545250055582,37.0242246815327,33.799163379528274,25.711267139953264]);
 assert.doesNotMatch(s.cost.basis,/x USD 0\.04 per 1M input \(deepinfra/);assert.match(s.cost.basis,/x USD 0\.03 per 1M input and USD 0\.15 per 1M output \(deepinfra:Qwen\/Qwen3\.5-4B, frozen 25 Sep 2026 snapshot\)/);
 for(const a of ['intelligence','calibration','speed'])assert.equal(s.axes[a],b.axes[a]);assert.equal(s.capability,b.capability);assert.equal(s.v16.ci95.seed,60);
 assert.equal(n.raw_sha256,'878114c9614fa446fdf4f0b19f3f376f1e2d56189cb88d917850cee9b490f54c');
});
test('all 70 carried rows keep every stored value; only rank and ranks move, by the restated rows above them',()=>{
 for(const p of previous.artifact.systems){const s=r.artifact.systems.find(s=>s.key===p.key),a=structuredClone(p),b=structuredClone(s);delete a.rank;delete a.ranks;delete b.rank;delete b.ranks;assert.deepEqual(b,a,p.key);}
 assert.deepEqual(row(base,'microsoft-decision-1-a2-20261012'),previous.artifact.systems.find(s=>s.key==='microsoft-decision-1-a2-20261012'));
 for(const o of ['A','B','C','capability'])assert.deepEqual(r.artifact.board[o].order.filter(k=>!KEYS.includes(k)),previous.artifact.board[o].order);
});
test('the two other Qwen3.5-4B rows with the USD 0.04 inherited basis are untouched',()=>{
 for(const k of ['localjev-qwen3.5-4b','metask-jev-4b'])assert.ok(!r.artifact.systems.some(s=>s.key===k),k);
});
test('v1.6.37 rejects altered price, usage, markers, text, intervals, approval and carried rows',()=>{
 rejects(b=>{row(b,H2O).cost.usd_per_1000+=1e-9},/cost|registry|proof/);
 rejects(b=>{b.proof.repriced_rows[H2O].input_tokens++},/usage/);
 rejects(b=>{b.proof.repriced_rows[KAHN].price_per_million={input:0.04,output:0}},/tariff/);
 rejects(b=>{row(b,H2O).supersedes_base_row='v1.6.0'},/supersession|supersede/);
 rejects(b=>{delete row(b,KAHN).supersedes_base_row},/supersession|supersede/);
 rejects(b=>{row(b,'kettei-fat').supersedes_base_row='v1.6.1'},/only Seb/);
 rejects(b=>{row(b,H2O).cost.basis=row(b,H2O).cost.basis.replace('Corrected in v1.6.37, no new measurement','Note')},/registry cost_basis verbatim/);
 rejects(b=>{row(b,H2O).axes.cost+=0.01},/Cost axis|equals the published/);
 rejects(b=>{row(b,H2O).axes.intelligence+=0.01},/equals the published v1\.6\.1 row|capability/);
 rejects(b=>{row(b,H2O).scores.A+=0.01},/score A|corrected point|follow/);
 rejects(b=>{row(b,H2O).composite_ci95.A[1]+=1},/interval fields agree|interval/);
 rejects(b=>{row(b,H2O).v16.ci95.I[0]+=1},/equals the published v1\.6\.1 row/);
 rejects(b=>{row(b,H2O).measured_in='v1.6.37'},/markers/);
 rejects(b=>{row(b,'kettei-fat').axes.intelligence++},/capability|carried|axes/);
 rejects(b=>{row(b,'kettei-fat').composite_ci95.A[0]-=0.1},/carried row differs/);
 rejects(b=>{b.proof.repriced_rows['subq-snap-preview'].usd_per_1000+=1},/inherited repriced row/);
 rejects(b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith('v1.6.37 RESTATES ')?n.replace('NO new measurement','a new measurement'):n)},/release note/);
 rejects(b=>{b.proof.publication_approval.top_five_preview.card_id='12345'},/preview approval card/);
 rejects(b=>{b.proof.publication_approval.top_five_changed_by=[KAHN]},/must name exactly/);
 rejects(b=>{b.manifest.review.verdict='PENDING'},/independent release review/);
 rejects(b=>{b.proof.predecessor_seal_sha256=null},/predecessor seal/);
 rejects(b=>{b.proof.pricing_module_sha256='0'.repeat(64)},/pricing module/);
 rejects(b=>{b.categories.systems[H2O]=structuredClone(b.categories.systems['seb-9b'])},/category cohort|no cells/);
});
test('the corrected price is recomputed from tokens, the frozen tariff and the number of decisions',()=>{
 for(const [k,spec] of Object.entries(V1637_ROW_SPEC))assert.equal(spec.usd,1000*(spec.tokens*0.030000000000000002+0*0.15)/1e6/spec.decisions,k);
});
test('v1.6.37 archived route keeps shared board, method and history',async()=>{
 const page=await readFile('app/jev-models/v1.6.37/page.tsx','utf8');assert.match(page,/readOptionalJevbenchV1637Release\(\)/);assert.match(page,/v1637BoardInput\(release\)/);assert.ok(page.indexOf('<JevBenchV16Board')<page.indexOf('data-bh-jev1637-method'));assert.match(page,/USD 0\.04 per 1M input/);
});
import { readCohortRows, jevWithCohortRows } from '../lib/jevbench-cohort-merge.mjs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { readJevbenchAgentFeed } from '../lib/jevbench-agent-feed.mjs';
import { readJevbenchSeoData } from '../lib/jevbench-seo.mjs';
import { jevbenchLlmsFull } from '../lib/jevbench-llms-full.mjs';
test('live boards and the agent feed resolve each restated row exactly once with the corrected figures; the frozen archive keeps the published ones',async()=>{
 const {artifact}=await readCurrentJevbench();const m=jevWithCohortRows(artifact,await readCohortRows());
 for(const k of KEYS){const rows=m.systems.filter(s=>s.key===k);assert.equal(rows.length,1,k);assert.equal(rows[0].ranked,true);assert.equal(rows[0].draw.release,'v1.6.43');assert.equal(rows[0].cost.usd_per_1000,V1637_ROW_SPEC[k].usd);for(const b of Object.values(m.board))assert.equal(b.order.filter(x=>x===k).length,1,k);}
 assert.equal(artifact.systems.find(s=>s.key===H2O).cost.usd_per_1000,0.021055837438423645);assert.equal(artifact.systems.find(s=>s.key===KAHN).cost.usd_per_1000,0.06129480295566502);
 for(const k of ['localjev-qwen3.5-4b','metask-jev-4b'])assert.deepEqual(m.systems.find(s=>s.key===k),artifact.systems.find(s=>s.key===k),k);
 const {feed}=await readJevbenchAgentFeed();for(const k of KEYS){const f=feed.systems.filter(s=>s.key===k);assert.equal(f.length,1,k);assert.equal(f[0].price.usd_per_1000_decisions,V1637_ROW_SPEC[k].usd);}
});
test('SEO model, comparison and full-text pages follow the merged feed with corrected costs and the re-measured Seb',async()=>{
 const data=await readJevbenchSeoData();
 // v1.7.0 restates the v1.6.1 board once published (same rows, same costs); before that the board follows v1.6.40.
 assert.equal(data.artifact.revision,(await hasPublishedJevbenchV179Release()) ? 'v1.7.9' : (await hasPublishedJevbenchV178Release()) ? 'v1.7.8' : (await hasPublishedJevbenchV177Release()) ? 'v1.7.7' : (await hasPublishedJevbenchV176Release()) ? 'v1.7.6' : (await hasPublishedJevbenchV175Release()) ? 'v1.7.5' : (await hasPublishedJevbenchV174Release())?'v1.7.4':(await hasPublishedJevbenchV173Release())?'v1.7.3':(await hasPublishedJevbenchV172Release())?'v1.7.2':(await hasPublishedJevbenchV171Release())?'v1.7.1':(await hasPublishedJevbenchV170Release())?'v1.7.0':'v1.6.43');assert.equal(data.artifact.base_revision,'v1.6.1');
 for(const k of KEYS){const rows=data.systems.filter(s=>s.key===k);assert.equal(rows.length,1,k);assert.equal(rows[0].cost.usd_per_1000,V1637_ROW_SPEC[k].usd);}
 assert.equal(data.systems.filter(s=>s.key==='seb-9b').length,1);
 const llms=await jevbenchLlmsFull();
 for(const k of KEYS){const lines=llms.split('\n').filter(line=>line.includes(`| ${k} |`));assert.equal(lines.length,1,k);assert.ok(lines[0].includes(String(V1637_ROW_SPEC[k].usd)),k);}
 assert.equal(data.systems.find(s=>s.key===H2O).cost.usd_per_1000,V1637_ROW_SPEC[H2O].usd);assert.equal(data.systems.find(s=>s.key===KAHN).cost.usd_per_1000,V1637_ROW_SPEC[KAHN].usd);
 assert.ok(data.comparisons.some(p=>p.key===H2O));assert.ok(data.modelKeys.includes(H2O));
 assert.ok(!JSON.stringify(data.systems.filter(s=>KEYS.includes(s.key))).includes('0.0210558'));assert.ok(!JSON.stringify(data.systems.filter(s=>KEYS.includes(s.key))).includes('0.0612948'));
});
