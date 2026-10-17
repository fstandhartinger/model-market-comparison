// v1.6.27: two measured rows join the 51 full-draw rows of v1.6.26 on the same frozen draw.
//  * jev-1.14.0 (Jev 1.14.0, TypeSafe AI, hosted API; handoff board #20479; custody #20474; Florian's ask via the CoS, board
//    #20466): RANKED from TypeSafe's public list price (USD 0.042/M input, output free; the same tariff and launch-list path as
//    jev-1.13.0) through the scoped pricing re-freeze 6202ef78 (f661456e + this one key). The board's Jev-class reference stays
//    jev-1.13.0 as measured in v1.5.7: the frozen caps do not move.
//  * verdin-4b (Verdin-4B, Victor Bennett; handoff board #20504; custody #19800): self-hosted on the evaluator's shared CPU through
//    the author's documented CPU path (device deviation disclosed, Speed a lower bound), RANKED from its frozen base-model
//    reference; CC-BY-NC-4.0 weights (NC licence flag).
// Carried rows keep every point estimate. The approval must say how it arrived:
//  * no top-five change: Florian's direct-message GO, no preview card may be claimed;
//  * a top five changes: a filled preview-card approval; a PLACEHOLDER build does not load.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1626Release, V1626_ROOT, V1626_CARRIED_KEYS, V1626_NEW_KEYS, V1626_UNRANKED_CARRIED_KEYS, V1626_UNRANKED_NEW_KEYS,
         V1626_CARRIED_PRELIMINARY_KEYS, V1626_ABOVE_COST_CAP_KEYS, V1626_PRICING_MODULE_SHA256 } from './jevbench-v1626-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';
import { JEV_CLASS_REFERENCE_KEY, JEV_V16_FROZEN_LIMITS } from './jevbench-jev-class.mjs';

export const V1627_ROOT = V1626_ROOT;
export const V1627_MANIFEST = `${V1627_ROOT}/jevbench-v1.6.27-publication.json`;
export const V1627_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1627_FILE_KEYS.map(k => [k, `${V1627_ROOT}/jevbench-v1.6.27-${k}.json`]));
/** The two rows this release adds. */
export const V1627_JEV_KEY = 'jev-1.14.0';
export const V1627_RANKED_NEW_KEYS = ['jev-1.14.0', 'verdin-4b'];
export const V1627_UNRANKED_NEW_KEYS = [];
export const V1627_NEW_KEYS = [...V1627_RANKED_NEW_KEYS, ...V1627_UNRANKED_NEW_KEYS].sort();
export const V1627_OVER_CAP_NEW_KEYS = [];
/** Every full-draw row of v1.6.26. */
export const V1627_CARRIED_KEYS = [...V1626_CARRIED_KEYS, ...V1626_NEW_KEYS];
export const V1627_CARRIED_PRELIMINARY_KEYS = [...V1626_CARRIED_PRELIMINARY_KEYS];
/** Carried listed-but-not-ranked rows: reflex (#18761), the unpriced v1.6.22 / v1.6.24 / v1.6.26 rows. */
export const V1627_UNRANKED_CARRIED_KEYS = [...V1626_UNRANKED_CARRIED_KEYS, ...V1626_UNRANKED_NEW_KEYS];
export const V1627_ABOVE_COST_CAP_KEYS = [...V1626_ABOVE_COST_CAP_KEYS, ...V1627_OVER_CAP_NEW_KEYS];
export const V1627_FIXED_G_MED = 9.839526770355711;
export const V1627_COST_CAP = 0.06459465517241379;
export const V1627_DRAW_RELEASE = 'v1.6-regular-20261012';
/** The pricing re-freeze of this release (f661456e + jev-1.14.0 in LAUNCH_LIST_PRICE_API). */
export const V1627_PRICING_MODULE_SHA256 = '6202ef78a2c83cbffc9389cf1f37df70fe0c85ed03f4dd5c5f997f3d31aae13a';
export const V1627_TYPESAFE_PRICING_SHA256 = '936da17935076da8680c83b3ec83d1036a12a5aba406c5cc8ac5d4ea2496ae70';
/** The board's Jev-class reference: Jev 1.13.0 as measured in v1.5.7 (frozen caps = 2x); v1.6.27 does not change it. */
export const V1627_JEV_REFERENCE = Object.freeze({ key: 'jev-1.13.0', measured_in: 'v1.5.7', usd_per_1000: 0.032297327586206896, p50_s: 0.6164783202111721,
  cost_cap: 0.06459465517241379, latency_cap_s: 1.2329566404223442 });
export const V1627_GO_QUOTE = 'I really want all of the models we have evaluated to be online (even if they land in #5) on both JevBench and ImageJevBench';
export const V1627_GO = { channel: 'direct-message', where: 'laptop chat', date: '2026-10-16', recorded_at: '2026-10-16T12:50Z',
  recorded_in: 'DECISIONS.md 2026-10-16 12:50 UTC', quote: V1627_GO_QUOTE };
export const V1627_JEV_ASK = { key: 'jev-1.14.0',
  relay: 'board #20466 (2) (CoS, 16 Oct 2026 21:38Z: users asked where the new Jev API is; measure/add the current Jev API version in an upcoming release)',
  request: 'board #20469 (release lane asked add-requests for the full-set measurement)', handoff: 'board #20479', custody: '#20474' };
/** The latest Telegram card of this release job (#17730, the v1.6.25 + v1.6.26 preview); a v1.6.27 preview card must be newer. */
const LAST_CARD = 17730n;
const NO_CARD_MARKER = `Florian publication approval: direct-message ${V1627_GO.recorded_at} (${V1627_GO.recorded_in}); jev-1.14.0 on his ask (${V1627_JEV_ASK.relay}); no top-five preview card (no top-five list changes); no button tap.`;
const NO_CARD_TEXT = 'No top-five list changes (see the board-effect note), so no top-five preview card was sent and none is claimed; the GO arrived as a direct message and no Telegram button was pressed.';
const NO_CHANGE_BOARD = '0 of 21 top-five lists change';
const cost = (tin, tout, pin, pout) => 1000 * (tin * pin + tout * pout) / 1e6 / 1500;   // score_v16.common_basis_usd

/** Each new row's identity, measurement and the SHA-256 of its published texts (cost basis, endpoint condition): the public
 *  reads exactly these, so they are pinned here. */
export const V1627_ROW_SPEC = Object.freeze({
  "jev-1.14.0": {"ranked": true, "lane": "api", "kind": "api", "display": "Jev 1.14.0 (TypeSafe AI)", "author": "TypeSafe AI", "repo": "https://docs.typesafe.ai/models", "model_pin": "hosted-api:api.typesafe.ai/v1/systemone#jev-1.14.0", "licence": "Proprietary hosted API (no weights release)", "ok": 1485, "status_counts": {"200": 1485, "400": 15}, "input_tokens": 1134053, "output_tokens": 71566, "price": {"input": 0.042, "output": 0.0}, "raw": "d78c8aa18b0aca996897b8db36fd0198b651e89f7d3092dd527382a4c3fa1c86", "custody": "#20474", "handoff": "board #20479", "review_verdict": "PASS", "renormalised_rows": 12, "texts": {"cost_basis": "e69ab852704a3e8f039a685a53c25edc94642a374fbd0185e1a3a3dc2323f874", "endpoint_condition": "62cdef8b73bd388232f77faa30c7de28a4146bc33084cd5176e5babd45c1fca3"}, "disclosures": ["measured 16 Oct 2026", "independent review", "No paid order", "scored as wrong answers", "the raw is the scored copy", "NEW row on Florian's ask", "custody #20474", "provider `typesafe`", "No pre-registration was written", "HTTP 400: 15", "max_tokens_exceeded", "two-decimal precision", "sum to 0.99", "USD 0.042/M input, output free", "I-1", "6202ef78", "f661456e", "jev-latest", "jev-preview", "JEV REFERENCE UNCHANGED", "Jev 1.13.0", "v1.5.7", "without API adjustment", "not independently inspected", "936da17935076da8680c83b3ec83d1036a12a5aba406c5cc8ac5d4ea2496ae70", "d78c8aa18b0aca996897b8db36fd0198b651e89f7d3092dd527382a4c3fa1c86"]},
  "verdin-4b": {"ranked": true, "lane": "selfhosted", "kind": "cpu", "display": "Verdin-4B (Victor Bennett, Qwen3.5-4B + merged LoRA r16 + pointer head)", "author": "Victor Bennett (Hugging Face victorbennett; benchmarkheaven.com/submit ref E59F3C77)", "repo": "https://huggingface.co/victorbennett/Verdin-4B", "model_pin": "victorbennett/Verdin-4B@f35e9c184864a2fd6f286166783b0321d95f23b0", "licence": "Weights CC-BY-NC-4.0 (non-commercial; the repo's NOTICE and the model card state that part of the training mix - BeaverTails, the ANLI translations, RAGTruth's MS MARCO and Yelp-derived contexts - is non-commercial). Base model Qwen/Qwen3.5-4B Apache-2.0 (LICENSE.base). The author's Verdin engine, shipped in the same repo, Apache-2.0. LICENCE FLAG (NC): CC-BY-NC-4.0 (non-commercial) weights; listing a measured score is evaluation use.", "ok": 1485, "status_counts": {"200": 1485, "422": 15}, "input_tokens": 902188, "output_tokens": 0, "price": {"input": 0.030000000000000002, "output": 0.15}, "raw": "deb42fab9795c17c6548a514ddf6ce3c8f279f3801aea46aa010ddcb8f0815b2", "custody": "#19800", "handoff": "board #20504", "review_verdict": "PASS WITH FINDINGS", "renormalised_rows": 0, "texts": {"cost_basis": "e584ff933ee0553ed390640373675699fba8da848e041a440ea468bdb5b69c9d", "endpoint_condition": "b80ab825603975177449047a9089e98f736ce15c5497daf4606aeee463328150"}, "disclosures": ["measured 16 Oct 2026", "independent review", "No paid order", "scored as wrong answers", "the raw is the scored copy", "benchmarkheaven.com submission (ref E59F3C77)", "custody #19800", "HTTP 422: 15", "65,536-token", "SPEED IS A LOWER BOUND", "RTX 5090", "float32", "0.7922", "prefix-cache hit", "checked by count", "LICENCE (NC)", "CC-BY-NC-4.0", "used the answered instead of the full 1,500-item denominator", "x2 + 0.15 s", "deb42fab9795c17c6548a514ddf6ce3c8f279f3801aea46aa010ddcb8f0815b2"]},
});
export const V1627_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1627Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1627_BASE_DIMS] : [...V1627_BASE_DIMS];
}

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const textSha = v => typeof v === 'string' ? createHash('sha256').update(v, 'utf8').digest('hex') : null;
const fail = message => { throw new Error(`JevBench v1.6.27: ${message}`); };
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
function approvalOf(proof, artifact, boardNote, provisional) {
  const pa = proof.publication_approval;
  same(pa?.go, V1627_GO, 'publication GO provenance');
  same(pa?.jev_ask, V1627_JEV_ASK, 'jev-1.14.0 ask provenance');
  // A build made before a preview card was answered carries PLACEHOLDER fields; they are rejected wherever they appear.
  if (JSON.stringify(proof).includes('PLACEHOLDER') || JSON.stringify(artifact).includes('PLACEHOLDER')) fail('approval placeholder not filled');
  const notes = artifact.measurement_notes.filter(n => n.startsWith('Publication of v1.6.27:'));
  if (notes.length !== 1) fail('public note must describe how the approval arrived');
  const note = notes[0];
  if (!note.includes(V1627_GO_QUOTE) || !note.includes(V1627_GO.recorded_in) || !note.includes(V1627_JEV_ASK.relay)) fail('public note must describe how the approval arrived');
  const noChange = boardNote.includes(NO_CHANGE_BOARD);
  const causes = boardCauses(boardNote);
  const claimsCard = /Telegram card #\d/.test(note) || /selected "[^"]*" on Telegram card/.test(note);
  if (pa.top_five_effect === 'none') {
    if (!provisional && !noChange) fail('a no-card approval needs the generated no-change board note');
    if (pa.top_five_preview !== null || pa.button_tap !== false || Object.keys(pa).sort().join() !== 'button_tap,go,jev_ask,top_five_effect,top_five_preview') fail('no-card approval provenance');
    if (!note.includes(NO_CARD_TEXT) || claimsCard) fail('public note must not claim a preview card');
    return NO_CARD_MARKER;
  }
  if (noChange || provisional || !causes.length || pa.top_five_effect !== 'changes') fail('approval and top-five effect disagree');
  same([...pa.top_five_changed_by ?? []].sort(), [...causes].sort(), 'the approval must name exactly the rows the board note says changed the top fives');
  if (!causes.every(k => V1627_RANKED_NEW_KEYS.includes(k))) fail('only a new ranked row can change a top five');
  const a = pa.top_five_preview;
  const id = a?.card_id;
  const canonical = typeof id === 'string' && /^\d+$/.test(id) && BigInt(id).toString() === id;
  if (!canonical || BigInt(id) <= LAST_CARD || typeof a.selection !== 'string' || !a.selection.trim() || !hex(a.preview_png_sha256)) fail('top-five preview approval card');
  if (!['telegram-button', 'direct-message'].includes(a.channel) || typeof a.button_tap !== 'boolean' || pa.button_tap !== a.button_tap
      || typeof a.recorded_at !== 'string' || !a.recorded_at || typeof a.recorded_in !== 'string' || !a.recorded_in
      || (a.channel === 'telegram-button') !== a.button_tap
      || Object.keys(pa).sort().join() !== 'button_tap,go,jev_ask,top_five_changed_by,top_five_effect,top_five_preview') fail('approval channel and provenance');
  const claimsTap = /selected "[^"]*" on Telegram card/.test(note);
  const saysNoTap = note.includes("The card's own button was not pressed.");
  if ((a.button_tap ? (!claimsTap || saysNoTap) : (claimsTap || !saysNoTap)) || !note.includes(`Telegram card #${id}`)
      || !note.includes(a.preview_png_sha256)) fail('public note must describe how the approval arrived');
  return a.button_tap
    ? `Florian top-five preview approval: Telegram card #${id}; selected "${a.selection}" (${a.recorded_at}); preview PNG SHA-256 ${a.preview_png_sha256}.`
    : `Florian top-five preview approval: ${a.channel} ${a.recorded_at}, recorded as Telegram card #${id} = "${a.selection}" (${a.recorded_in}; no button tap); preview PNG SHA-256 ${a.preview_png_sha256}.`;
}

export function validateJevbenchV1627Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.27' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.26' || previous.proof?.revision !== 'v1.6.26') fail('validated v1.6.26 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.26', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.27' || artifact.run_kind !== 'regular-queue' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  const newKeys = allKeys.filter(k => !V1627_CARRIED_KEYS.includes(k) && !V1627_CARRIED_PRELIMINARY_KEYS.includes(k)).sort();
  if (!sameSet(newKeys, V1627_NEW_KEYS)) fail(`exactly the added rows: ${newKeys}`);
  if (!sameSet(allKeys, [...V1627_CARRIED_KEYS, ...V1627_NEW_KEYS, ...V1627_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + V1627_NEW_KEYS.length) fail('exactly the added rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + V1627_RANKED_NEW_KEYS.length) fail('ranked row count');
  const regularKeys = [...V1627_CARRIED_KEYS, ...V1627_NEW_KEYS];
  const unrankedKeys = [...V1627_UNRANKED_CARRIED_KEYS, ...V1627_UNRANKED_NEW_KEYS];
  if (!sameSet(V1627_UNRANKED_CARRIED_KEYS, V1627_CARRIED_KEYS.filter(k => !prior.get(k)?.ranked))) fail('carried unranked set');

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1627_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const spec = V1627_ROW_SPEC[s.key];
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
    if (!unpriced && s.cost.usd_per_1000 > V1627_COST_CAP && !V1627_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the new rows ---------------------------------------------------------------------------
  const inherited = Object.keys(previous.proof.new_rows ?? {});
  if (!sameSet(Object.keys(proof.new_rows ?? {}), [...inherited, ...V1627_NEW_KEYS])) fail('new-row provenance coverage');
  for (const k of inherited) same(proof.new_rows[k], previous.proof.new_rows[k], `inherited new-row provenance ${k}`);
  for (const [key, spec] of Object.entries(V1627_ROW_SPEC)) {
    const s = by.get(key), n = proof.new_rows[key];
    const api = spec.lane === 'api';
    for (const field of ['display', 'author', 'repo', 'licence', 'model_pin']) same(s[field], spec[field], `${key} registry ${field} verbatim`);
    if (textSha(s.cost?.basis) !== spec.texts.cost_basis) fail(`${key} registry cost_basis verbatim`);
    if (textSha(s.endpoint_condition) !== spec.texts.endpoint_condition) fail(`${key} registry endpoint_condition verbatim`);
    if (s.measured_in !== 'v1.6.27' || s.measurement_date_status !== 'measured' || s.last_measured_on !== '2026-10-16') fail(`${key} measurement stamp`);
    if (s.endpoint_kind !== spec.kind || s.api_flag !== api || s.v16.set !== 'S+P' || (api && s.v16.full_set_api !== true)) fail(`${key} lane/endpoint kind`);
    if (s.speed?.adjustment !== (api ? 'none (API)' : 'x2 + 0.15 s (assumption, not measured)')) fail(`${key} latency adjustment`);
    if (s.paid_fast_lane === true) fail(`${key} is not a paid row`);
    if (s.status.answered_ok !== spec.ok) fail(`${key} completeness`);
    const usd = cost(spec.input_tokens, spec.output_tokens, spec.price.input, spec.price.output);
    if (s.ranked !== true || s.listing !== 'ranked' || s.not_ranked_because || s.ranked_false_reason) fail(`${key} is ranked`);
    if (s.cost?.kind !== 'estimate' || s.cost.usd_per_1000 !== usd || usd > V1627_COST_CAP || s.cost.usage_estimated_rows !== 0) fail(`${key} cost: tariff x own tokens, inside the cap`);
    if (s.cost.basis.includes('OVER THE OFFICIAL COST CAP')) fail(`${key} over-cap disclosure`);
    if (!finite(s.axes.cost) || ['A', 'B', 'C'].some(o => !finite(s.scores?.[o]))) fail(`${key} cost axis and composites`);
    if (Object.values(s.views ?? {}).some(v => !finite(v))) fail(`${key}: a ranked row publishes its presets`);
    for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) if (!intervalOk(ci, s.scores)) fail(`new row interval does not contain its own point estimate: ${key}`);
    const capCi = s.v16?.ci95?.capability;
    if (!Array.isArray(capCi) || !(capCi[0] <= s.capability + 1e-9 && s.capability <= capCi[1] + 1e-9)) fail(`new row capability interval does not contain its own point estimate: ${key}`);
    const rowNote = artifact.measurement_notes.find(x => x.startsWith(`${key}: `)) ?? '';
    if (rowNote.length < 600) fail(`row note of ${key} is too thin to be the disclosure it claims to be`);
    for (const fragment of spec.disclosures) if (!rowNote.includes(fragment)) fail(`required disclosure "${fragment}" missing from the note of ${key}`);
    for (const text of [s.author, s.endpoint_condition, s.cost?.basis, s.licence, rowNote])
      if (typeof text === 'string' && INTERNAL.test(text)) fail(`${key}: personal e-mail or internal path in public text`);
    // provenance receipt
    if (!n || n.raw_sha256 !== proof.raw_sha256?.[key] || n.raw_sha256 !== spec.raw || n.original_raw_sha256 !== spec.raw
        || n.ar_scoring_copy_sha256 !== null || n.measured_in !== 'v1.6.27'
        || n.rows !== 1500 || n.answered_ok !== spec.ok || n.ranked !== true || n.paid_fast_lane !== false || n.endpoint_kind !== spec.kind
        || n.lane !== spec.lane || n.treatment !== 'ranked' || n.pricing_module_sha256 !== V1627_PRICING_MODULE_SHA256
        || n.custody !== spec.custody || n.handoff !== spec.handoff || n.measured_on !== '2026-10-16') fail(`${key} new-row provenance`);
    if (!hex(n.pre_score_review_sha256) || n.post_score_review_sha256 !== null || n.review_verdict !== spec.review_verdict
        || n.refused_long_items !== 15 || n.renormalised_rows !== spec.renormalised_rows) fail(`${key} measurement provenance`);
    if (n.input_tokens !== spec.input_tokens || n.output_tokens !== spec.output_tokens) fail(`${key} usage`);
    same(n.status_counts, spec.status_counts, `${key} HTTP status counts`);
    same(n.price_per_million, spec.price, `${key} tariff`);
    const recomputed = cost(n.input_tokens, n.output_tokens, n.price_per_million.input, n.price_per_million.output);
    if (n.usd_per_1000 !== recomputed || n.usd_per_1000 !== s.cost.usd_per_1000 || n.under_cost_cap !== true
        || Math.abs(n.cost_cap_ratio - n.usd_per_1000 / V1627_COST_CAP) > 1e-12) fail(`${key} cost binding`);
    if (s.speed.p50_s_raw !== n.p50_s_raw || s.speed.p95_s_raw !== n.p95_s_raw) fail(`${key} receipt latency`);
  }
  {   // the hosted Jev row: TypeSafe's public price, its own served model, and the reference left alone
    const key = V1627_JEV_KEY, n = proof.new_rows[key], s = by.get(key);
    if (n.exposure_logged_to_provider !== 'typesafe' || n.served_model !== key || n.refused_http_400 !== 15 || n.probabilities_two_decimal !== true
        || n.price_source?.saved_copy_sha256 !== V1627_TYPESAFE_PRICING_SHA256 || n.price_source?.page !== 'docs.typesafe.ai/models'
        || n.price_source?.same_tariff_as !== 'jev-1.13.0' || !hex(n.price_source?.api_reference_saved_copy_sha256)) fail(`${key} hosted-API provenance`);
    same(n.price_source.aliases_on_page, { 'jev-latest': 'jev-1.13.0', 'jev-preview': 'jev-1.14.0' }, `${key}: the version status on the vendor page`);
    same(n.florian_ask, V1627_JEV_ASK, `${key} ask provenance`);
    same(n.jev_class_reference, { ...V1627_JEV_REFERENCE, unchanged: true }, `${key}: the Jev-class reference is unchanged`);
    if (!s.cost.basis.includes(V1627_TYPESAFE_PRICING_SHA256.slice(0, 8)) || !s.cost.basis.includes('I-1') || !s.cost.basis.includes('jev-preview')) fail(`${key} cost basis names its evidence, interpretation and version status`);
  }
  {   // the self-hosted CPU row: device deviation and the NC licence travel with it
    const n = proof.new_rows['verdin-4b'];
    if (n.licence_non_commercial !== true || n.refused_http_422 !== 15 || n.device_deviation?.speed_is_lower_bound !== true
        || !hex(n.pre_registration_sha256) || !hex(n.validate_receipt_sha256)) fail('verdin-4b provenance');
    if (!by.get('verdin-4b').licence.includes('CC-BY-NC-4.0')) fail('verdin-4b licence flag');
  }
  // the Jev-class caps of every capped view stay the frozen v1.5.7 Jev 1.13.0 constants
  if (JEV_CLASS_REFERENCE_KEY !== V1627_JEV_REFERENCE.key || JEV_V16_FROZEN_LIMITS.cost !== V1627_JEV_REFERENCE.cost_cap
      || JEV_V16_FROZEN_LIMITS.latency !== V1627_JEV_REFERENCE.latency_cap_s || V1627_COST_CAP !== V1627_JEV_REFERENCE.cost_cap
      || Math.abs(2 * V1627_JEV_REFERENCE.usd_per_1000 - V1627_JEV_REFERENCE.cost_cap) > 1e-15
      || Math.abs(2 * V1627_JEV_REFERENCE.p50_s - V1627_JEV_REFERENCE.latency_cap_s) > 1e-15) fail('the Jev-class reference and its frozen caps must stay Jev 1.13.0 (v1.5.7)');

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
  for (const key of V1627_CARRIED_PRELIMINARY_KEYS) {
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
  const releaseNote = artifact.measurement_notes.find(x => x.startsWith('v1.6.27 ADDS ')) ?? '';
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
  for (const key of V1627_CARRIED_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried row present ${key}`);
    const rawOnAMoved = JSON.stringify(a.v16?.raw_on_A) !== JSON.stringify(b.v16?.raw_on_A);
    if (rawOnAMoved && !diagnosticMoved) fail(`raw_on_A moved while the API-basis diagnostic did not: ${key}`);
    if (rawOnAMoved && !releaseNote.includes(`${key}: intelligence`)) fail(`a moved raw_on_A must name its row in the notes: ${key}`);
    same(strip(b, rawOnAMoved), strip(a, rawOnAMoved), `carried row differs outside rank/ranks/composite_ci95/v16.ci95${rawOnAMoved ? '/v16.raw_on_A' : ''}: ${key}`);
    if (V1627_UNRANKED_CARRIED_KEYS.includes(key)) {
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    }
    const intervalMoved = !isDeepStrictEqual([b.composite_ci95, b.v16?.ci95], [a.composite_ci95, a.v16?.ci95]);
    if (intervalMoved && !intervalNames.includes(key)) fail(`a moved carried interval must name its row in the release note: ${key}`);
    for (const ci of (b.cost.kind === 'unpriced' ? [] : [b.composite_ci95, b.v16?.ci95?.composite])) {
      if (!intervalOk(ci, b.scores)) fail(`carried row interval does not contain its own point estimate: ${key}`);
    }
    if (a.ranked) {
      for (const o of ['A', 'B', 'C', 'capability']) {
        const shift = V1627_RANKED_NEW_KEYS.filter(nk => (o === 'capability' ? by.get(nk).capability > b.capability
          : artifact.board[o].order.indexOf(nk) < artifact.board[o].order.indexOf(key))).length;
        if (b.ranks[o] !== a.ranks[o] + shift) fail(`carried rank ${o} moved by more than the rows that moved above it: ${key}`);
        if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
      }
    }
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!releaseNote.includes('RANKS') || !releaseNote.includes('CONFIDENCE INTERVALS') || !releaseNote.includes('DIAGNOSTICS')
      || !V1627_NEW_KEYS.every(k => releaseNote.includes(k))) fail('the release note must count rank, interval and diagnostic moves');
  if (!releaseNote.includes('JEV REFERENCE UNCHANGED') || !releaseNote.includes('Jev 1.13.0') || !releaseNote.includes('v1.5.7')) fail('the release note must say that the Jev reference stays Jev 1.13.0 (v1.5.7) and why');
  if (!artifact.measurement_notes.some(x => x.includes('#18761') && x.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (diagnosticMoved) {
    const values = [previous.artifact.G_med_api_basis_P_vs_A, artifact.G_med_api_basis_P_vs_A].map(String);
    if (!artifact.measurement_notes.some(x => x.includes('API-basis median diagnostic') && values.every(v => x.includes(v)))) fail('a moved API-basis diagnostic must be disclosed with both values');
  }
  const added = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  const boardNotes = added.filter(x => x.startsWith('Board effect'));
  const boardNote = boardNotes.length === 1 ? boardNotes[0] : '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1627_BUILD_PASS1 !== '1'
      : !(boardNote.includes('top-five') && V1627_RANKED_NEW_KEYS.every(k => boardNote.includes(k)))) fail('board effect: generated top-five note required; provisional build note forbidden');
  if (artifact.G_med !== V1627_FIXED_G_MED || previous.artifact.G_med !== V1627_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  for (const f of ['draw_release', 'freeze_manifest_sha256', 'seed_commitment', 'draw_digests', 'baseline_sha256', 'a2_supplement']) same(artifact.v16?.[f], previous.artifact.v16?.[f], `draw provenance ${f}`);
  if (artifact.v16.draw_release !== V1627_DRAW_RELEASE) fail('draw identity');
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.27' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || proof.baseline_sha256 !== artifact.v16.baseline_sha256
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  same(artifact.v16.draw_digests, proof.draw_digests, 'draw digests bound to the proof');
  if (proof.pricing_module_sha256 !== V1627_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V1626_PRICING_MODULE_SHA256
      || previous.proof.pricing_module_sha256 !== V1626_PRICING_MODULE_SHA256) fail('pricing re-freeze binding');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  // null until v1.6.26 is sealed (stacked build); flip_verdict_v1627.py and freeze_v1627.py refuse a null binding
  if (proof.predecessor_seal_sha256 !== null && !hex(proof.predecessor_seal_sha256)) fail('predecessor seal binding');
  for (const k of ['refreshed_preview_go_card', 'refreshed_preview_approval', 'a2_supplement', 'scorer_sources_sha256']) same(proof[k], previous.proof[k], `inherited proof field ${k}`);
  if (typeof proof.authority !== 'string' || !proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.27:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of [...V1627_NEW_KEYS, '#20479', '#20474', '#20504', '#19800', '#20466', 'RANKED', 'no paid order', '6202ef78', 'f661456e',
    V1627_TYPESAFE_PRICING_SHA256.slice(0, 8), 'USD 0.042 per million input tokens', 'The Jev-class reference stays Jev 1.13.0', 'CC-BY-NC-4.0',
    'Speed a lower bound', V1627_GO_QUOTE, '2026-10-16 12:50 UTC']) {
    if (!newAuthority.includes(fragment)) fail(`new publication authority: ${fragment}`);
  }
  const marker = approvalOf(proof, artifact, boardNote, provisional);
  if (!newAuthority.includes(marker)) fail('publication approval authority binding');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), regularKeys)) fail('raw-output coverage');
  same(Object.fromEntries(V1627_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  const proofRows = proof.systems;
  if (!Array.isArray(proofRows) || !sameSet(proofRows.map(x => x.key), regularKeys)) fail('system proof coverage');
  const priorProof = new Map(previous.proof.systems.map(r => [r.key, r]));
  for (const x of artifact.systems) {
    if (V1627_CARRIED_PRELIMINARY_KEYS.includes(x.key)) continue;
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
    if (V1627_ROW_SPEC[x.key] && p.source_review_sha256 !== proof.new_rows[x.key].pre_score_review_sha256) fail(`independent review binding ${x.key}`);
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${x.key}`);
    const q = priorProof.get(x.key);
    if (q) for (const f of ['measured_by', 'source_review_sha256', 'source_review_note', 'raw_sha256', 'answered_ok']) same(p[f], q[f], `proof row provenance unchanged ${x.key}.${f}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1627_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && by.get(m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.27' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1627Dims(categories);
  if (!('topics' in categories) && !artifact.measurement_notes.some(x => x.includes('topic'))) fail('a release without the topic radar must say so in its measurement notes');
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) if (categories.lanes[key] !== (V1627_ROW_SPEC[key]?.lane ?? previous.categories.lanes[key])) fail(`category lane ${key}`);
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
  for (const key of V1627_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1627Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1627_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1626Release(root);
  if (!previous) fail('v1.6.27 needs the published v1.6.26 release it extends');
  const previousManifest = await load(`${V1627_ROOT}/jevbench-v1.6.26-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1627Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1627Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1627Release(root)); }
  catch { log('JevBench v1.6.27 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1627BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
