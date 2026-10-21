// v1.6.36: Myles-G 31B and HS1 (paid fast lane, vendor-hosted API), Arbiter-4B and Decider-4B (free queue); carried estimates frozen; the new rows are priced under the pricing module 1f4d1f7b.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1635Release, V1635_ROOT, V1635_CARRIED_KEYS, V1635_NEW_KEYS, V1635_UNRANKED_CARRIED_KEYS, 
         V1635_CARRIED_PRELIMINARY_KEYS, V1635_ABOVE_COST_CAP_KEYS, V1635_PRICING_MODULE_SHA256 } from './jevbench-v1635-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1636_ROOT = V1635_ROOT;
export const V1636_MANIFEST = `${V1636_ROOT}/jevbench-v1.6.36-publication.json`;
export const V1636_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1636_FILE_KEYS.map(k => [k, `${V1636_ROOT}/jevbench-v1.6.36-${k}.json`]));
export const V1636_LK = 'launchables-myles-g-31b', V1636_HY = 'hyland-hs1', V1636_AR = 'goddragon-arbiter-4b', V1636_DE = 'roudone-decider-4b';
export const V1636_NEW_KEYS = [V1636_AR, V1636_DE, V1636_HY, V1636_LK].sort();
export const V1636_RANKED_NEW_KEYS = [...V1636_NEW_KEYS];
export const V1636_UNRANKED_NEW_KEYS = [];
export const V1636_API_NEW_KEYS = [V1636_HY, V1636_LK];
export const V1636_OVER_CAP_NEW_KEYS = [];
/** Every full-draw row of v1.6.35. */
export const V1636_CARRIED_KEYS = [...V1635_CARRIED_KEYS, ...V1635_NEW_KEYS];
export const V1636_CARRIED_PRELIMINARY_KEYS = [...V1635_CARRIED_PRELIMINARY_KEYS];
/** Carried listed-but-not-ranked rows: reflex (#18761), the unpriced v1.6.22 / v1.6.24 / v1.6.26 rows. */
export const V1636_UNRANKED_CARRIED_KEYS = [...V1635_UNRANKED_CARRIED_KEYS, ];
export const V1636_ABOVE_COST_CAP_KEYS = [...V1635_ABOVE_COST_CAP_KEYS, ...V1636_OVER_CAP_NEW_KEYS];
export const V1636_FIXED_G_MED = 9.839526770355711;
export const V1636_COST_CAP = 0.06459465517241379;
export const V1636_DRAW_RELEASE = 'v1.6-regular-20261012';
/** No re-freeze in this release. The four new rows are priced by reference() under the module in force since the 20 Oct additive re-freeze (1f4d1f7b); their bases resolve identically under the 6202ef78 module of v1.6.35, and every carried row keeps its published price. */
export const V1636_PRICING_MODULE_SHA256 = '1f4d1f7b1ce97ab27b938043444b9c2757e4a9dbecc799a803122588401f5bf1';
export const V1636_GO_QUOTE = 'I really want all of the models we have evaluated to be online (even if they land in #5) on both JevBench and ImageJevBench';
export const V1636_GO = { channel: 'direct-message', where: 'laptop chat', date: '2026-10-16', recorded_at: '2026-10-16T12:50Z',
  recorded_in: 'DECISIONS.md 2026-10-16 12:50 UTC', quote: V1636_GO_QUOTE };
export const V1636_ASKS = {"launchables-myles-g-31b":{"key":"launchables-myles-g-31b","relay":"Paid public fast-lane order 46550a0f","handoff":"board #22784","admission":"#22713 (ratified #22745)"},
  "hyland-hs1":{"key":"hyland-hs1","relay":"Paid public fast-lane order 880b09e8","handoff":"board #22782","admission":"#22746"},
  "goddragon-arbiter-4b":{"key":"goddragon-arbiter-4b","relay":"Free queue submission 574B4820","handoff":"board #22756","admission":"#22339"},
  "roudone-decider-4b":{"key":"roudone-decider-4b","relay":"Free queue submission E94B190D","handoff":"board #22756","admission":"#22339"}};
export const V1636_PAID_KEYS = [V1636_HY, V1636_LK];
export const V1636_PAID_RULE = {"date": "2026-09-29", "orders": {"launchables-myles-g-31b": "46550a0f", "hyland-hs1": "880b09e8"}, "precedent": "v1.6.13 attest-31b-v1.0 (paid public fast-lane order 07d13315); v1.6.24 kettei-fat / kettei-chub; v1.6.25 celeris-1-decision; v1.6.32 chon-1.0-12b", "quote": "fast lane runs fully autonomously end-to-end incl. publication, customer mail and an @airesearch12 post when the top 5 change; paid runs no longer need his top-5 preview", "recorded_at": "2026-09-29 ~00:25 Berlin", "recorded_in": "DECISIONS.md 29 Sep 2026 ~00:25 Berlin (Florian)", "rule": "paid fast-lane publication exception"};
const cost = (tin, tout, pin, pout) => 1000 * (tin * pin + tout * pout) / 1e6 / 1500;   // score_v16.common_basis_usd

/** Each new row's identity, measurement and the SHA-256 of its published texts (cost basis, endpoint condition): the public
 *  reads exactly these, so they are pinned here. */
export const V1636_ROW_SPEC = Object.freeze({"goddragon-arbiter-4b": {"refused": 15, "ranked": true, "lane": "selfhosted", "kind": "gpu", "display": "Arbiter-4B (Goddragon, NeoHorse 4B pointer model, author server, self-hosted)", "author": "Goddragon (Hugging Face)", "repo": "https://huggingface.co/Goddragon/Arbiter-4B", "model_pin": "Goddragon/Arbiter-4B@8fd20568f359f4156de55f016027efdc841d690a", "licence": "Apache-2.0 (HF metadata and LICENSE), public, not gated", "ok": 1485, "status_counts": {"200": 1485, "422": 15}, "input_tokens": 662682, "output_tokens": 0, "price": {"input": 0.030000000000000002, "output": 0.15}, "usd_common": 0.013387515151515154, "raw": "267b7759a397f5758f786dd33e9429617856ab97ad373b9ff857668c1a7b0c5b", "copy": "267b7759a397f5758f786dd33e9429617856ab97ad373b9ff857668c1a7b0c5b", "custody": "#22339 (consumed; receipts #22731)", "handoff": "board #22756", "review_verdict": "PASS WITH FINDINGS", "texts": {"cost_basis": "d35942d8824072ce36f414c275c4feb5901f63fa31027495a31e87ec814ce1c8", "endpoint_condition": "8c29945660c5e54175c9c33e24354d12ec707a5e6f7e3fa7e1f69093d2e0245a", "underlying": "7a087f51e39fda621fb1f81647aeb2761031acdf2fb840606813c8439c831f27"}, "axes": {"calibration": 77.19519806916665, "cost": 66.19900073922123, "intelligence": 27.391250053452495, "speed": 92.16491010646149}, "scores": {"A": 15.917217056211483, "B": 13.406692451289457, "C": 11.053622955702421}, "speed": {"adjustment": "x2 + 0.15 s (assumption, not measured)", "n": 124, "p50_s_adjusted": 0.24398728700034553, "p50_s_raw": 0.046993643500172766, "p95_s_adjusted": 0.24896700299996155, "p95_s_raw": 0.04948350149998077}, "capability": 52.29322406130957, "disclosures": ["CONTEXT CAP", "SAME FAMILY", "unverified", "A100", "ESTIMATE", "BASE:", "Qwen/Qwen3.5-4B", "TokenRhythm/NeoHorse-Jev-4B", "the raw is the scored copy"], "runtime": {"context_cap_tokens": 8192, "answered_beyond_context_cap": 0, "truncated_long_items": 0, "native_probabilities": true}, "paid": false}, "hyland-hs1": {"refused": 0, "ranked": true, "lane": "api", "kind": "api", "display": "HS1 0.1.2 (Hyland)", "author": "Hyland", "repo": "https://www.hyland.com", "model_pin": "hosted-api:hyland.com/hyland-hs1/v1/systemone#hyland-hs1", "licence": "Proprietary hosted API (no weights release); declared base Gemma 4 26B-A4B-it is under the Gemma 4 licence", "ok": 1500, "status_counts": {"200": 1500}, "input_tokens": 2012340, "output_tokens": 0, "price": {"input": 0.09, "output": 0.3}, "usd_common": 0.04973636363636364, "raw": "bc7a460b1c70bafda695f762e76dbbe1b526df38b2dde7ca6890e7152cea90f0", "copy": "6db633804aa6059c05c75c7647377e3b8406a5b74754a94b5815c33e5626df20", "custody": "#22746 (scope #22743; duplicate ruling #22760)", "handoff": "board #22782, #22786", "review_verdict": null, "texts": {"cost_basis": "61911c0c0af47b67f976e6feca00951ff3ca86ef6c2310f4dc4b24e7d96dca0a", "endpoint_condition": "8cf8e7bee387696a130b589d08f94d28cde71d9e2f8cc654ecaf2cc38ee4ac92", "underlying": "28b593548987ce608fc9f813fa32642a1398f14ad96b3a470ad09101f38da600"}, "axes": {"calibration": 76.49930909839343, "cost": 49.09977911142268, "intelligence": 53.57948799459325, "speed": 93.74328417303443}, "scores": {"A": 61.450719939462154, "B": 59.20850453421004, "C": 49.002878617843415}, "speed": {"adjustment": "none (API)", "n": 124, "p50_s_adjusted": 0.19411396997747943, "p50_s_raw": 0.19411396997747943, "p95_s_adjusted": 0.21757790509145708, "p95_s_raw": 0.21757790509145708}, "capability": 65.03939854649335, "disclosures": ["DUPLICATE REQUESTS, FIRST ANSWER SCORED", "first answer per item is scored", "10,762 curated rows", "FP8", "USD 0.056", "ESTIMATE", "as for attest-31b-v1.0", "public-vs-sealed gap rule", "FULL LENGTH", "Original raw sha256", "scoring copy sha256", "Vendor-hosted API"], "runtime": {"context_cap_tokens": 131072, "answered_beyond_context_cap": 0, "truncated_long_items": 0, "native_probabilities": true}, "paid": true}, "launchables-myles-g-31b": {"refused": 0, "ranked": true, "lane": "api", "kind": "api", "display": "Myles-G 31B (Launchables)", "author": "Launchables", "repo": "https://www.launchables.ai/licensing", "model_pin": "hosted-api:api.launchables.ai/m/myles-g-31b#myles-g-31b", "licence": "Proprietary hosted API (no public weights release; the merged adapter is gated on Hugging Face); declared base google/gemma-4-31B-it is under the Gemma 4 licence", "ok": 1500, "status_counts": {"200": 1500}, "input_tokens": 907107, "output_tokens": 1500, "price": {"input": 0.09, "output": 0.33999999999999997}, "usd_common": 0.0426199393939394, "raw": "e03a68d867d56fb517eabcb936aca02bb51e0435f71f35f3f2ab88c60c232ae6", "copy": "e03a68d867d56fb517eabcb936aca02bb51e0435f71f35f3f2ab88c60c232ae6", "custody": "#22713 (ratified #22745; deputy #22720, #22793)", "handoff": "board #22784", "review_verdict": null, "texts": {"cost_basis": "1f098d303c3bebdc11878a2f298843b5733154c5ad3849bf44aacd9ef1d4f7e1", "endpoint_condition": "954dbc5a67398a4bc5d2a1d1565c244f38de8a666466d712c642ead354e6d0d9", "underlying": "ef08e1818ae5423bb01a0f66079d242c5409390b4421575b63cf166ab51c1580"}, "axes": {"calibration": 83.99531596546265, "cost": 51.11161516579885, "intelligence": 73.64186833978687, "speed": 86.60775159362743}, "scores": {"A": 70.6763821133842, "B": 71.25021746899355, "C": 70.6763821133842}, "speed": {"adjustment": "none (API)", "n": 124, "p50_s_adjusted": 0.4372560594929382, "p50_s_raw": 0.4372560594929382, "p95_s_adjusted": 0.49944653444108555, "p95_s_raw": 0.49944653444108555}, "capability": 78.81859215262476, "disclosures": ["TRUNCATION ON THE 15 LONGEST ITEMS", "scored as answered", "12,456 to 15,166", "16,384", "launchables/myles-g-31b@0093c518", "google/gemma-4-31B-it@842da379", "proprietary", "231 public items", "public-vs-sealed gap rule", "GBP 0.005", "USD 0.0066734", "ESTIMATE", "warm-up", "as for attest-31b-v1.0", "Vendor-hosted API", "the raw is the scored copy"], "runtime": {"context_cap_tokens": 16384, "answered_beyond_context_cap": 0, "truncated_long_items": 15, "native_probabilities": true}, "paid": true}, "roudone-decider-4b": {"refused": 15, "ranked": true, "lane": "selfhosted", "kind": "gpu", "display": "Decider-4B (roudone, NeoHorse 4B pointer model, author server, self-hosted)", "author": "roudone (Hugging Face)", "repo": "https://huggingface.co/roudone/Decider-4B", "model_pin": "roudone/Decider-4B@a9a6a7924f9a6300c43b873df56414c087666083", "licence": "Apache-2.0 (HF metadata and LICENSE), public, not gated", "ok": 1485, "status_counts": {"200": 1485, "422": 15}, "input_tokens": 662682, "output_tokens": 0, "price": {"input": 0.030000000000000002, "output": 0.15}, "usd_common": 0.013387515151515154, "raw": "2248b5b19883ae1b6bd655d99f869194b2d2909735ca1350974f05aeeef5974a", "copy": "2248b5b19883ae1b6bd655d99f869194b2d2909735ca1350974f05aeeef5974a", "custody": "#22339 (consumed; receipts #22731)", "handoff": "board #22756", "review_verdict": "PASS WITH FINDINGS", "texts": {"cost_basis": "d35942d8824072ce36f414c275c4feb5901f63fa31027495a31e87ec814ce1c8", "endpoint_condition": "8c29945660c5e54175c9c33e24354d12ec707a5e6f7e3fa7e1f69093d2e0245a", "underlying": "a625441e432ceb8d36fd1e51421d6e0b0962abc04cab554918d7ea27469adb71"}, "axes": {"calibration": 86.57628518330837, "cost": 66.19900073922123, "intelligence": 27.068221597395038, "speed": 92.04108849933448}, "scores": {"A": 15.743016217593315, "B": 13.153182490278192, "C": 10.932650151106468}, "speed": {"adjustment": "x2 + 0.15 s (assumption, not measured)", "n": 124, "p50_s_adjusted": 0.2460378610002408, "p50_s_raw": 0.048018930500120405, "p95_s_adjusted": 0.25403245620000237, "p95_s_raw": 0.05201622810000117}, "capability": 56.822253390351705, "disclosures": ["CONTEXT CAP", "SAME FAMILY", "unverified", "A100", "ESTIMATE", "BASE:", "Qwen/Qwen3.5-4B", "TokenRhythm/NeoHorse-1-4B", "the raw is the scored copy"], "runtime": {"context_cap_tokens": 8192, "answered_beyond_context_cap": 0, "truncated_long_items": 0, "native_probabilities": true}, "paid": false}});
export const V1636_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1636Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1636_BASE_DIMS] : [...V1636_BASE_DIMS];
}

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const textSha = v => typeof v === 'string' ? createHash('sha256').update(v, 'utf8').digest('hex') : null;
const fail = message => { throw new Error(`JevBench v1.6.36: ${message}`); };
const sameSet = (a, b) => a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const same = (a, b, message) => { if (!isDeepStrictEqual(a, b)) fail(message); };
const INTERNAL = /[\w.+-]+@[\w-]+\.[a-z]{2,}|\/home\/|\bworkers\/|\br1\d\d\/|\bpod id\b|PREREG|batchA|batchBCD|\bR12\d\b|_wrap\.py|bh-submit|ff14417c/i;
function excluded(text) {
  if (JEVBENCH_V16_EXCLUDED_KEYS.some(key => text.includes(JSON.stringify(key))) || mentionsPrivateSystem(text)) fail('private-only system');
}
const forbidden = /^(?:item_ids?|item_text|question(?:_text)?|golds?|expected|predictions?|predicted|per_item|item_results|prompt|task_id|input_text|item_state|raw_response|raw_inputs|seed_value|secret|token|password)$/i;
function publicOnly(value) {
  if (Array.isArray(value)) return value.forEach(publicOnly);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.test(key)) fail(`private/item-level field ${key}`);
    publicOnly(child);
  }
}
const intervalOk = (ci, scores) => ['A', 'B', 'C'].every(o => {
  const pair = ci?.[o];
  return Array.isArray(pair) && pair.length === 2 && finite(pair[0]) && finite(pair[1]) && pair[0] <= pair[1]
    && scores[o] >= pair[0] - 1e-9 && scores[o] <= pair[1] + 1e-9;
});

/** The keys the generated board note names as the cause of its top-five changes. */
function boardCauses(boardNote) {
  const m = boardNote.match(/Top-five changes caused by: (.+?)(?: \(|\. )/);
  return m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : [];
}

/** How the publication approval arrived. Returns the marker the authority must carry. */
const LAST_CARD = 17911n;
const NO_CHANGE_BOARD = '0 of 40 top-five lists change';
const NO_CARD_TEXT = 'no top-five preview card';
const NO_CARD_MARKER = 'Florian publication approval: standing GO, 16 Oct 2026 12:50Z; no preview card; no button tap.';
function approvalOf(proof, artifact, boardNote, provisional) {
 const pa=proof.publication_approval;
 same(pa?.go,V1636_GO,'standing GO');same(pa?.asks,V1636_ASKS,'request provenance');same(pa?.paid_fast_lane,V1636_PAID_RULE,'paid exception');
 if(pa.top_five_preview!==null || pa.button_tap!==false) fail('paid exception and standing GO have no card');
 const marker='Florian publication approval: paid_fast_lane, 29 Sep 2026 automatic paid publication rule; no preview card; no button tap.';
 if(provisional && process.env.JEVBENCH_V1636_BUILD_PASS1==='1') return marker;
 const causes=boardCauses(boardNote);if(causes.some(k=>!V1636_PAID_KEYS.includes(k))) fail('STOP: a free-queue row changes a top five');
 if(pa.top_five_effect!==(causes.length?'changes-paid-only':'none')) fail('paid top-five effect');
 if(causes.length)same(pa.top_five_changed_by,[...causes].sort(),'paid causes');
 return marker;
}

export function validateJevbenchV1636Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.36' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.35' || previous.proof?.revision !== 'v1.6.35') fail('validated v1.6.35 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.35', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.36' || artifact.run_kind !== 'regular-queue' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  const newKeys = allKeys.filter(k => !V1636_CARRIED_KEYS.includes(k) && !V1636_CARRIED_PRELIMINARY_KEYS.includes(k)).sort();
  if (!sameSet(newKeys, V1636_NEW_KEYS)) fail(`exactly the added rows: ${newKeys}`);
  if (!sameSet(allKeys, [...V1636_CARRIED_KEYS, ...V1636_NEW_KEYS, ...V1636_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + V1636_NEW_KEYS.length) fail('exactly the added rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + V1636_RANKED_NEW_KEYS.length) fail('ranked row count');
  const regularKeys = [...V1636_CARRIED_KEYS, ...V1636_NEW_KEYS];
  const unrankedKeys = [...V1636_UNRANKED_CARRIED_KEYS, ...V1636_UNRANKED_NEW_KEYS];
  if (!sameSet(V1636_UNRANKED_CARRIED_KEYS, V1636_CARRIED_KEYS.filter(k => !prior.get(k)?.ranked))) fail('carried unranked set');

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1636_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const spec = V1636_ROW_SPEC[s.key];
    const isNew = Boolean(spec);
    const expectedLane = isNew ? spec.lane : prior.get(s.key).v16.lane;
    if (s.v16?.lane !== expectedLane) fail(`lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.full_coverage !== true) fail(`full coverage ${s.key}`);
    const unpriced = s.cost?.kind === 'unpriced';
    if (unpriced && !(isNew ? !spec.ranked : prior.get(s.key).cost.kind === 'unpriced')) fail(`only a row with a stated unpriced ruling may be unpriced: ${s.key}`);
    for (const axis of ['intelligence', 'calibration', 'speed', ...(unpriced ? [] : ['cost'])]) {
      if (!finite(s.axes?.[axis])) fail(`axis ${axis} ${s.key}`);
    }
    if (unpriced && s.ranked) fail(`an unpriced row has no composite and cannot be ranked: ${s.key}`);
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9) fail(`capability is the mean of intelligence and calibration: ${s.key}`);
    if (unrankedKeys.includes(s.key)) {
      if (s.ranked !== false || s.rank !== null || s.listing !== 'listed') fail(`listed-not-ranked row ${s.key}`);
      same(s.ranks, { A: null, B: null, C: null, capability: null }, `null ranks ${s.key}`);
      if (typeof s.not_ranked_because !== 'string' || s.not_ranked_because.length < 60) fail(`stated reason for not ranking ${s.key}`);
    } else if (!s.ranked || s.listing !== 'ranked' || !Number.isInteger(s.rank)) {
      fail(`every other full-draw row is ranked: ${s.key}`);
    }
    if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repo ${s.key}`);
    const apiPin = s.endpoint_kind === 'api';
    if (typeof s.model_pin !== 'string' || !(/@[a-f0-9]{40}$/.test(s.model_pin) || (apiPin && (/@[a-f0-9]{8,40}$/.test(s.model_pin) || /^hosted-api:/.test(s.model_pin))))) fail(`pinned revision ${s.key}`);
    if (!unpriced && (!finite(s.cost?.usd_per_1000) || s.cost.usd_per_1000 <= 0)) fail(`cost figure ${s.key}`);
    if (typeof s.cost?.basis !== 'string' || s.cost.basis.length < 80) fail(`documented cost basis ${s.key}`);
    if (!unpriced && s.cost.usd_per_1000 > V1636_COST_CAP && !V1636_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the new rows ---------------------------------------------------------------------------
  const inherited = Object.keys(previous.proof.new_rows ?? {});
  if (!sameSet(Object.keys(proof.new_rows ?? {}), [...inherited, ...V1636_NEW_KEYS])) fail('new-row provenance coverage');
  for (const k of inherited) same(proof.new_rows[k], previous.proof.new_rows[k], `inherited new-row provenance ${k}`);
  for (const [key, spec] of Object.entries(V1636_ROW_SPEC)) {
    const s = by.get(key), n = proof.new_rows[key];
    for(const f of ['axes','scores','speed','capability']) same(s[f],spec[f],`${key} point estimates ${f}`);
    for (const field of ['display', 'author', 'repo', 'licence', 'model_pin']) same(s[field], spec[field], `${key} registry ${field} verbatim`);
    if (textSha(s.cost?.basis) !== spec.texts.cost_basis) fail(`${key} registry cost_basis verbatim`);
    if (textSha(s.underlying) !== spec.texts.underlying) fail(`${key} model disclosure verbatim`);
    if (textSha(s.endpoint_condition) !== spec.texts.endpoint_condition) fail(`${key} registry endpoint_condition verbatim`);
    if (!spec.ranked && textSha(s.not_ranked_because) !== spec.texts.not_ranked_because) fail(`${key} registry ranking reason verbatim`);
    if (s.measured_in !== 'v1.6.36' || s.measurement_date_status !== 'measured' || s.last_measured_on !== '2026-10-21') fail(`${key} measurement stamp`);
    const apiRow = V1636_API_NEW_KEYS.includes(key);
    if (s.endpoint_kind !== spec.kind || s.api_flag !== apiRow || s.v16.set !== 'S+P' || s.v16.lane !== (apiRow ? 'api' : 'selfhosted') || s.v16.full_set_api !== apiRow || spec.lane !== s.v16.lane) fail(`${key} lane/endpoint kind`);
    if (s.speed?.adjustment !== (apiRow ? 'none (API)' : 'x2 + 0.15 s (assumption, not measured)')) fail(`${key} latency adjustment`);
    if ((s.paid_fast_lane === true) !== V1636_PAID_KEYS.includes(key)) fail(`${key} paid flag`);
    if (s.status.answered_ok !== spec.ok) fail(`${key} completeness`);
    if (spec.ranked) {
      const usd = spec.usd_common;
      if (s.ranked !== true || s.listing !== 'ranked' || s.not_ranked_because || s.ranked_false_reason) fail(`${key} is ranked`);
      if (s.cost?.kind !== 'estimate' || s.cost.usd_per_1000 !== usd || (usd > V1636_COST_CAP) !== V1636_OVER_CAP_NEW_KEYS.includes(key) || s.cost.usage_estimated_rows !== 0) fail(`${key} cost: tariff x own tokens, on the common basis`);
      if (s.cost.basis.includes('OVER THE OFFICIAL COST CAP') !== V1636_OVER_CAP_NEW_KEYS.includes(key)) fail(`${key} over-cap disclosure`);
      if (!finite(s.axes.cost) || ['A', 'B', 'C'].some(o => !finite(s.scores?.[o]))) fail(`${key} cost axis and composites`);
      if (Object.values(s.views ?? {}).some(v => !finite(v))) fail(`${key}: a ranked row publishes its presets`);
      for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) if (!intervalOk(ci, s.scores)) fail(`new row interval does not contain its own point estimate: ${key}`);
    } else {
      if (s.cost?.kind !== 'unpriced' || s.cost.usd_per_1000 !== null || s.axes.cost !== null || ['A', 'B', 'C'].some(o => s.scores?.[o] !== null)) fail(`${key} is unpriced`);
      if (Object.values(s.views ?? {}).some(v => v !== null) || !Object.keys(s.views ?? {}).length) fail(`${key}: a listed-not-ranked row publishes null presets`);
    }
    const capCi = s.v16?.ci95?.capability;
    if (!Array.isArray(capCi) || !(capCi[0] <= s.capability + 1e-9 && s.capability <= capCi[1] + 1e-9)) fail(`new row capability interval does not contain its own point estimate: ${key}`);
    const rowNote = artifact.measurement_notes.find(x => x.startsWith(`${key}: `)) ?? '';
    if (rowNote.length < 600) fail(`row note of ${key} is too thin to be the disclosure it claims to be`);
    for (const fragment of spec.disclosures) if (!rowNote.includes(fragment)) fail(`required disclosure "${fragment}" missing from the note of ${key}`);
    for (const text of [s.author, s.endpoint_condition, s.cost?.basis, s.not_ranked_because, s.licence, rowNote])
      if (typeof text === 'string' && INTERNAL.test(text)) fail(`${key}: personal e-mail or internal path in public text`);
    // provenance receipt
    const copied = spec.raw !== spec.copy;
    if (!n || n.raw_sha256 !== proof.raw_sha256?.[key] || n.raw_sha256 !== spec.copy || n.original_raw_sha256 !== spec.raw
        || n.ar_scoring_copy_sha256 !== (copied ? spec.copy : null) || n.measured_in !== 'v1.6.36'
        || n.rows !== 1500 || n.answered_ok !== spec.ok || n.ranked !== spec.ranked || n.paid_fast_lane !== V1636_PAID_KEYS.includes(key) || n.endpoint_kind !== spec.kind
        || n.lane !== spec.lane || n.treatment !== (V1636_OVER_CAP_NEW_KEYS.includes(key) ? 'ranked_over_cap' : spec.ranked ? 'ranked' : 'listed_unpriced') || n.pricing_module_sha256 !== V1636_PRICING_MODULE_SHA256
        || n.custody !== spec.custody || n.handoff !== spec.handoff || n.measured_on !== '2026-10-21') fail(`${key} new-row provenance`);
    same(n.request, V1636_ASKS[key], `${key} request provenance`);
    if ((spec.review_verdict ? !hex(n.pre_score_review_sha256) : n.pre_score_review_sha256 !== null) || n.review_verdict !== spec.review_verdict || n.refused_long_items !== (spec.refused ?? 0) || n.refused_http_422 !== (spec.status_counts['422'] ?? 0)
        || n.post_score_review_sha256 !== null || (!copied) !== (n.scoring_copy_receipt_sha256 === undefined)) fail(`${key} measurement provenance`);
    if (n.input_tokens !== spec.input_tokens || n.output_tokens !== spec.output_tokens) fail(`${key} usage`);
    same(n.status_counts, spec.status_counts, `${key} HTTP status counts`);
    if (spec.ranked) {
      same(n.price_per_million, spec.price, `${key} tariff`);
      const recomputed = spec.usd_common;
      if (n.usd_per_1000 !== recomputed || n.usd_per_1000 !== s.cost.usd_per_1000 || n.under_cost_cap !== !V1636_OVER_CAP_NEW_KEYS.includes(key)
          || Math.abs(n.cost_cap_ratio - n.usd_per_1000 / V1636_COST_CAP) > 1e-12) fail(`${key} cost binding`);
    } else if (n.price_per_million !== null || n.usd_per_1000 !== null || n.cost_cap_ratio !== null || n.under_cost_cap !== null) fail(`${key}: an unpriced row carries no price`);
    if (s.speed.p50_s_raw !== n.p50_s_raw || s.speed.p95_s_raw !== n.p95_s_raw) fail(`${key} receipt latency`);
  }
  for(const key of V1636_NEW_KEYS){
    const n=proof.new_rows[key],s=by.get(key);
    same(n.common_basis,s.cost.common_basis,'common cost basis');
    if(n.usd_per_1000_all_items!==cost(n.input_tokens,n.output_tokens,n.price_per_million.input,n.price_per_million.output))fail('all-items cost');
    const rt=V1636_ROW_SPEC[key].runtime;
    for(const f of ['truncated_long_items','context_cap_tokens','answered_beyond_context_cap','native_probabilities'])if(n[f]!==rt[f])fail(`${key} runtime provenance ${f}`);
  }

  for (const row of artifact.systems) {
    if (row.key === 'seb-9b') {
      if (row.supersedes_base_row !== 'v1.6.1') fail('Seb must supersede exactly v1.6.1');
    } else if ('supersedes_base_row' in row) fail('only Seb may supersede a base row');
  }

  // --- inherited re-price and vendor-status records ------------------------------------------------
  same(proof.repriced_rows, previous.proof.repriced_rows, 'inherited repriced rows unchanged');
  same(proof.vendor_status, previous.proof.vendor_status, 'inherited vendor status unchanged');

  if (artifact.sample?.open !== 300 || artifact.sample.sealed !== 1200 || artifact.sample.total !== 1500) fail('scoring denominator');
  if (artifact.v16?.counts?.S !== 1200 || artifact.v16.counts.P !== 300 || artifact.v16.counts.selfhosted_input !== 1500) fail('fresh input counts');
  const ranked = artifact.systems.filter(x => x.ranked).map(x => x.key).sort();
  for (const o of ['A', 'B', 'C', 'capability']) if (!sameSet(artifact.board?.[o]?.order ?? [], ranked)) fail(`board membership ${o}`);
  const capabilityOrder = artifact.systems.filter(x => x.ranked).slice().sort((x, y) => y.capability - x.capability).map(x => x.key);
  for (const x of artifact.systems) {
    if (!x.ranked) continue;
    for (const o of ['A', 'B', 'C']) if (x.ranks?.[o] !== (artifact.board?.[o]?.order ?? []).indexOf(x.key) + 1) fail(`rank ${o} is not the board position: ${x.key}`);
    if (x.ranks?.capability !== capabilityOrder.indexOf(x.key) + 1) fail(`capability rank is not the capability order: ${x.key}`);
    if (x.rank !== x.ranks.A) fail(`rank is not the headline rank: ${x.key}`);
  }
  for (const key of unrankedKeys) if (ranked.includes(key)) fail('a row without an official placement may not enter a ranked board');

  // --- the A2 alias is carried through unchanged ---------------------------------------------
  for (const key of V1636_CARRIED_PRELIMINARY_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the carried rows keep every point estimate ----------------------------------------------
  // What may differ on a carried row, and nothing else: its placement (rank, ranks), its bootstrap intervals (composite_ci95,
  // v16.ci95 - new keys shift roster positions and with them the per-row bootstrap seeds) and, only when the API-basis
  // diagnostic moved, v16.raw_on_A. Every move must be named in the release note.
  const releaseNote = artifact.measurement_notes.find(x => x.startsWith('v1.6.36 ADDS ')) ?? '';
  const diagnosticMoved = artifact.G_med_api_basis_P_vs_A !== previous.artifact.G_med_api_basis_P_vs_A;
  const strip = (row, allowRawOnA) => {
    const copy = JSON.parse(JSON.stringify(row));
    delete copy.composite_ci95; delete copy.rank; delete copy.ranks;
    if (copy.v16) { delete copy.v16.ci95; if (allowRawOnA) delete copy.v16.raw_on_A; }
    return copy;
  };
  const clauseStart = releaseNote.indexOf('Carried rows whose intervals moved:');
  if (clauseStart < 0) fail('the release note must carry the "Carried rows whose intervals moved:" clause');
  const intervalNames = releaseNote.slice(clauseStart + 'Carried rows whose intervals moved:'.length).split('DIAGNOSTICS')[0]
    .split(/[,\s]+/).map(x => x.replace(/\.$/, ''));
  const rankClause = releaseNote.split('RANKS:')[1]?.split('CONFIDENCE INTERVALS:')[0] ?? '';
  for (const key of V1636_CARRIED_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried row present ${key}`);
    const rawOnAMoved = JSON.stringify(a.v16?.raw_on_A) !== JSON.stringify(b.v16?.raw_on_A);
    if (rawOnAMoved && !diagnosticMoved) fail(`raw_on_A moved while the API-basis diagnostic did not: ${key}`);
    if (rawOnAMoved && !releaseNote.includes(`${key}: intelligence`)) fail(`a moved raw_on_A must name its row in the notes: ${key}`);
    same(strip(b, rawOnAMoved), strip(a, rawOnAMoved), `carried row differs outside rank/ranks/composite_ci95/v16.ci95${rawOnAMoved ? '/v16.raw_on_A' : ''}: ${key}`);
    if (V1636_UNRANKED_CARRIED_KEYS.includes(key)) {
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    }
    const intervalMoved = !isDeepStrictEqual([b.composite_ci95, b.v16?.ci95], [a.composite_ci95, a.v16?.ci95]);
    if (intervalMoved && !intervalNames.includes(key)) fail(`a moved carried interval must name its row in the release note: ${key}`);
    for (const ci of (b.cost.kind === 'unpriced' ? [] : [b.composite_ci95, b.v16?.ci95?.composite])) {
      if (!intervalOk(ci, b.scores)) fail(`carried row interval does not contain its own point estimate: ${key}`);
    }
    if (a.ranked) {
      for (const o of ['A', 'B', 'C', 'capability']) {
        const shift = V1636_RANKED_NEW_KEYS.filter(nk => (o === 'capability' ? by.get(nk).capability > b.capability
          : artifact.board[o].order.indexOf(nk) < artifact.board[o].order.indexOf(key))).length;
        if (b.ranks[o] !== a.ranks[o] + shift) fail(`carried rank ${o} moved by more than the rows that moved above it: ${key}`);
        if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
      }
    }
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!releaseNote.includes('RANKS') || !releaseNote.includes('CONFIDENCE INTERVALS') || !releaseNote.includes('DIAGNOSTICS')
      || !V1636_NEW_KEYS.every(k => releaseNote.includes(k))) fail('the release note must count rank, interval and diagnostic moves');
  if (!releaseNote.includes('NO re-freeze in this release') || !releaseNote.includes('1f4d1f7b') || !releaseNote.includes('6202ef78')) fail('the release note must say that nothing was re-frozen and name both pricing modules');
  if (!artifact.measurement_notes.some(x => x.includes('#18761') && x.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (diagnosticMoved) {
    const values = [previous.artifact.G_med_api_basis_P_vs_A, artifact.G_med_api_basis_P_vs_A].map(String);
    if (!artifact.measurement_notes.some(x => x.includes('API-basis median diagnostic') && values.every(v => x.includes(v)))) fail('a moved API-basis diagnostic must be disclosed with both values');
  }
  const added = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  const boardNotes = added.filter(x => x.startsWith('Board effect'));
  const boardNote = boardNotes.length === 1 ? boardNotes[0] : '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1636_BUILD_PASS1 !== '1'
      : !(boardNote.includes('top-five') && V1636_NEW_KEYS.every(k => boardNote.includes(k)))) fail('board effect: generated top-five note required; provisional build note forbidden');
  if (artifact.G_med !== V1636_FIXED_G_MED || previous.artifact.G_med !== V1636_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  for (const f of ['draw_release', 'freeze_manifest_sha256', 'seed_commitment', 'draw_digests', 'baseline_sha256', 'a2_supplement']) same(artifact.v16?.[f], previous.artifact.v16?.[f], `draw provenance ${f}`);
  if (artifact.v16.draw_release !== V1636_DRAW_RELEASE) fail('draw identity');
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.36' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || proof.baseline_sha256 !== artifact.v16.baseline_sha256
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  same(artifact.v16.draw_digests, proof.draw_digests, 'draw digests bound to the proof');
  if (proof.pricing_module_sha256 !== V1636_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V1635_PRICING_MODULE_SHA256
      || previous.proof.pricing_module_sha256 !== V1635_PRICING_MODULE_SHA256 || V1636_PRICING_MODULE_SHA256 === V1635_PRICING_MODULE_SHA256) fail('pricing module pins (1f4d1f7b for the new rows, 6202ef78 predecessor)');
  same(proof.repriced_rows, previous.proof.repriced_rows, 'no carried row repriced');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  // Publication requires the stacked predecessor to be reviewed and sealed.
  if (!hex(proof.predecessor_seal_sha256)) fail('predecessor seal binding: stacked candidate must be sealed before publication');
  same(proof.cost_basis_sha256,previous.proof.cost_basis_sha256,'unchanged common cost basis');
  same(artifact.v16.cost_basis,previous.artifact.v16.cost_basis,'unchanged common cost rule');
  for (const k of ['refreshed_preview_go_card', 'refreshed_preview_approval', 'a2_supplement', 'scorer_sources_sha256']) same(proof[k], previous.proof[k], `inherited proof field ${k}`);
  if (typeof proof.authority !== 'string' || !proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.36:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of [...V1636_NEW_KEYS, '#22784', '#22782', '#22756', 'RANKED', '1f4d1f7b', '6202ef78', 'NO pricing re-freeze', V1636_GO_QUOTE]) {
    if (!newAuthority.includes(fragment)) fail(`new publication authority: ${fragment}`);
  }
  const marker = approvalOf(proof, artifact, boardNote, provisional);
  if (!newAuthority.includes(marker)) fail('publication approval authority binding');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), regularKeys)) fail('raw-output coverage');
  same(Object.fromEntries(V1636_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  const proofRows = proof.systems;
  if (!Array.isArray(proofRows) || !sameSet(proofRows.map(x => x.key), regularKeys)) fail('system proof coverage');
  const priorProof = new Map(previous.proof.systems.map(r => [r.key, r]));
  for (const x of artifact.systems) {
    if (V1636_CARRIED_PRELIMINARY_KEYS.includes(x.key)) continue;
    const p = proofRows.find(r => r.key === x.key);
    if (!p || p.rows !== 1500 || p.status !== 'complete' || !hex(p.raw_sha256) || p.raw_sha256 !== proof.raw_sha256[x.key]) fail(`system proof ${x.key}`);
    if (p.model_pin !== x.model_pin || p.rank !== x.rank || p.display !== x.display) fail(`proof agrees with the row ${x.key}`);
    same(p.composite_A ?? null, x.scores?.A ?? null, `proof agrees with the row ${x.key}`);
    same(p.axes, x.axes, `proof row axes ${x.key}`);
    same(p.capability, x.capability, `proof row Capability ${x.key}`);
    same(p.usd_per_1000, x.cost?.usd_per_1000 ?? null, `proof row cost ${x.key}`);
    same(p.noul_decisive, x.noul_decisive, `proof row decisive ${x.key}`);
    if (typeof p.measured_by !== 'string' || !p.measured_by.trim()) fail(`measuring operator ${x.key}`);
    if (p.source_review_sha256 !== null && !hex(p.source_review_sha256)) fail(`source review hash ${x.key}`);
    if (V1636_ROW_SPEC[x.key] && p.source_review_sha256 !== proof.new_rows[x.key].pre_score_review_sha256) fail(`independent review binding ${x.key}`);
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${x.key}`);
    const q = priorProof.get(x.key);
    if (q) for (const f of ['measured_by', 'source_review_sha256', 'source_review_note', 'raw_sha256', 'answered_ok']) same(p[f], q[f], `proof row provenance unchanged ${x.key}.${f}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1636_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && by.get(m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.36' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1636Dims(categories);
  if (!('topics' in categories) && !artifact.measurement_notes.some(x => x.includes('topic'))) fail('a release without the topic radar must say so in its measurement notes');
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) if (categories.lanes[key] !== (V1636_ROW_SPEC[key]?.lane ?? previous.categories.lanes[key])) fail(`category lane ${key}`);
  validateCategoryArtifact(categories, dims);
  if (!sameSet(Object.keys(categories.systems), regularKeys)) fail('category cohort');
  for (const key of regularKeys) for (const dim of dims) {
    for (const c of categories[dim]) {
      const cell = categories.systems[key]?.[dim]?.[c.key];
      if (c.n >= categories.min_n && !cell) fail(`missing category ${key}.${dim}.${c.key}`);
      if (c.n < categories.min_n && cell) fail(`below-min_n category must be omitted: ${key}.${dim}.${c.key}`);
      if (cell && (!Number.isInteger(cell.n) || cell.n < categories.min_n || !finite(cell.competence))) fail(`category cell ${key}.${dim}.${c.key}`);
    }
  }
  for (const key of V1636_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1636Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1636_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1635Release(root);
  if (!previous) fail('v1.6.36 needs the published v1.6.35 release it extends');
  const previousManifest = await load(`${V1636_ROOT}/jevbench-v1.6.35-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1636Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1636Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1636Release(root)); }
  catch { log('JevBench v1.6.36 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1636BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
