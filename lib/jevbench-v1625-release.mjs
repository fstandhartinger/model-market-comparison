// v1.6.25: four measured rows join the 34 full-draw rows of v1.6.24 on the same frozen draw.
//  * jebadiah-9b-v2-1 (Frontier Infra, add request GitHub #220): self-hosted on the author's own server, priced from its
//    frozen base-model reference Qwen/Qwen3.5-9B and ranked.
//  * celeris-1-decision (Celeris, hosted API, PAID public fast-lane order 70c4455b) priced from Celeris's public list price
//    through the scoped pricing re-freeze 32556e54 (3948e3f1 + this one key) and ranked.
//  * startlux-decision-v1.1-27b-instant / -autothink (StartLux Labs, Florian's own request of 16 Oct 2026): self-hosted on
//    the author's own server, priced from the frozen base-model reference Qwen/Qwen3.8-27B, OVER the cost cap (disclosed)
//    and ranked; weights CC BY-NC 4.0 (non-commercial licence flag on both rows).
// Carried rows keep every point estimate (v1.6.18/v1.6.21/v1.6.22/v1.6.24 rules). The approval must say how it arrived:
//  * no top-five change: Florian's direct-message GO and the paid fast-lane rule, no preview card may be claimed;
//  * only the paid row changes top fives: the paid fast-lane publication exception (v1.6.13 Attest, v1.6.24 kettei), no card claimed;
//  * a non-paid row changes a top five: a filled preview-card approval; a PLACEHOLDER build does not load.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1624Release, V1624_ROOT, V1624_CARRIED_KEYS, V1624_NEW_KEYS, V1624_UNRANKED_CARRIED_KEYS, V1624_UNRANKED_NEW_KEYS,
         V1624_CARRIED_PRELIMINARY_KEYS, V1624_ABOVE_COST_CAP_KEYS, V1624_PRICING_MODULE_SHA256 } from './jevbench-v1624-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1625_ROOT = V1624_ROOT;
export const V1625_MANIFEST = `${V1625_ROOT}/jevbench-v1.6.25-publication.json`;
export const V1625_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1625_FILE_KEYS.map(k => [k, `${V1625_ROOT}/jevbench-v1.6.25-${k}.json`]));
/** The four rows this release adds. */
export const V1625_PAID_KEYS = ['celeris-1-decision'];
export const V1625_ADD_REQUEST_KEYS = ['jebadiah-9b-v2-1'];
export const V1625_STARTLUX_KEYS = ['startlux-decision-v1.1-27b-autothink', 'startlux-decision-v1.1-27b-instant'];
export const V1625_UNRANKED_NEW_KEYS = [];
export const V1625_NEW_KEYS = [...V1625_PAID_KEYS, ...V1625_ADD_REQUEST_KEYS, ...V1625_STARTLUX_KEYS].sort();
export const V1625_RANKED_NEW_KEYS = V1625_NEW_KEYS.filter(k => !V1625_UNRANKED_NEW_KEYS.includes(k));
/** Every full-draw row of v1.6.24. */
export const V1625_CARRIED_KEYS = [...V1624_CARRIED_KEYS, ...V1624_NEW_KEYS];
export const V1625_CARRIED_PRELIMINARY_KEYS = [...V1624_CARRIED_PRELIMINARY_KEYS];
/** Carried listed-but-not-ranked rows: reflex (#18761), the two unpriced v1.6.22 rows and the unpriced v1.6.24 bongard-mini. */
export const V1625_UNRANKED_CARRIED_KEYS = [...V1624_UNRANKED_CARRIED_KEYS, ...V1624_UNRANKED_NEW_KEYS];
export const V1625_ABOVE_COST_CAP_KEYS = [...V1624_ABOVE_COST_CAP_KEYS, ...V1625_STARTLUX_KEYS];
export const V1625_FIXED_G_MED = 9.839526770355711;
export const V1625_COST_CAP = 0.06459465517241379;
export const V1625_DRAW_RELEASE = 'v1.6-regular-20261012';
/** The pricing re-freeze of this release (3948e3f1 + celeris-1-decision in LAUNCH_LIST_PRICE_API). */
export const V1625_PRICING_MODULE_SHA256 = '32556e546e062fb9e7e6c4c26c602acff9878aaa20261725d7c3e7ee93dfaf4b';
export const V1625_CELERIS_PRICING_SHA256 = 'c3ed0fdc8cbb2bffc9743f73c8be33d3ad0ae12188f4f8fcf6f2586256a94f2b';
export const V1625_CELERIS_DOC_PRICING_SHA256 = 'ff4b658d61fbfb053109196c09480afce85a896b2c0661f41acb9506a26b65de';
export const V1625_GO_QUOTE = 'I really want all of the models we have evaluated to be online (even if they land in #5) on both JevBench and ImageJevBench';
export const V1625_GO = { channel: 'direct-message', where: 'laptop chat', date: '2026-10-16', recorded_at: '2026-10-16T12:50Z',
  recorded_in: 'DECISIONS.md 2026-10-16 12:50 UTC', quote: V1625_GO_QUOTE };
export const V1625_PAID_QUOTE = 'fast lane runs fully autonomously end-to-end incl. publication, customer mail and an @airesearch12 post when the top 5 change; paid runs no longer need his top-5 preview';
export const V1625_PAID_RULE = { rule: 'paid fast-lane publication exception', date: '2026-09-29', recorded_at: '2026-09-29 ~00:25 Berlin',
  recorded_in: 'DECISIONS.md 29 Sep 2026 ~00:25 Berlin (Florian)', quote: V1625_PAID_QUOTE,
  precedent: 'v1.6.13 attest-31b-v1.0 (paid public fast-lane order 07d13315); v1.6.24 kettei-fat / kettei-chub', orders: { 'celeris-1-decision': '70c4455b' } };
/** Florian's own request for the StartLux rows (asks ledger A144) and his GPU approval. */
export const V1625_SL_QUOTE = "if we don't have it on jevbench, add it";
export const V1625_SL_ASK = { channel: 'direct-message', where: 'laptop chat', date: '2026-10-16', asked_at: '2026-10-16T19:00Z',
  recorded_in: 'Florian asks ledger A144 (board #20441)', quote: V1625_SL_QUOTE,
  gpu_approval: 'Telegram card #17713, button "Both rows (recommended)" (16 Oct 2026 19:3xZ)', custody: '#20395', keys: V1625_STARTLUX_KEYS };
/** The StartLux GPU card #17713 (v1.6.23's top-five preview was #17708); a v1.6.25 preview card, if one is needed, must be newer. */
const LAST_CARD = 17713n;
const NO_CARD_MARKER = `Florian publication approval: direct-message ${V1625_GO.recorded_at} (${V1625_GO.recorded_in}), his StartLux ask ${V1625_SL_ASK.asked_at} (${V1625_SL_ASK.recorded_in}) and the paid fast-lane rule of ${V1625_PAID_RULE.date} (${V1625_PAID_RULE.recorded_in}); no top-five preview card (no top-five list changes); no button tap.`;
const NO_CARD_TEXT = 'No top-five list changes (see the board-effect note), so no top-five preview card was sent and none is claimed; the GO arrived as a direct message and no Telegram button was pressed.';
const PAID_MARKER = `Florian publication approval: direct-message ${V1625_GO.recorded_at} (${V1625_GO.recorded_in}) for the add-request rows and his StartLux ask ${V1625_SL_ASK.asked_at} (${V1625_SL_ASK.recorded_in}); paid fast-lane publication exception (${V1625_PAID_RULE.recorded_in}) for the top-five changes, which come only from celeris-1-decision; no top-five preview card; no button tap.`;
const PAID_TEXT_HEAD = 'Every top-five change comes from the paid fast-lane row (celeris-1-decision; public order 70c4455b); no other new row enters or leaves any top five.';
const PAID_TEXT_TAIL = 'so no top-five preview card was sent and none is claimed, and no Telegram button was pressed.';
const NO_CHANGE_BOARD = '0 of 21 top-five lists change';
const SL_LICENCE = 'Weights CC BY-NC 4.0 (non-commercial: commercial use needs a separate licence from StartLux Labs; listing a measured score is evaluation use); inference package Apache-2.0';
const cost = (tin, tout, pin, pout) => 1000 * (tin * pin + tout * pout) / 1e6 / 1500;   // score_v16.common_basis_usd

/** Each new row's identity, measurement and the SHA-256 of its published texts (cost basis, endpoint condition): the
 *  public reads exactly these, so they are pinned here. */
export const V1625_ROW_SPEC = Object.freeze({
  'jebadiah-9b-v2-1': { ranked: true, lane: 'selfhosted', kind: 'gpu', display: 'Jebadiah 9B v2.1 (Frontier Infra, Qwen3.5-9B LoRA)',
    author: 'Frontier Infra', repo: 'https://huggingface.co/frontier-infra/jebadiah-9b-v2-1',
    model_pin: 'frontier-infra/jebadiah-9b-v2-1@c5e49fab7ec8e9923e1f907d85911a53fb8e9c32', licence: 'Apache-2.0 (weights and base)',
    ok: 1485, status_counts: { 200: 1485, 422: 15 }, input_tokens: 750303, output_tokens: 1485, price: { input: 0.09999999999999999, output: 0.15 }, over_cap: false,
    raw: '61ae20039465eaeb34784d41a6d8ebfac50891f59d5d15aa3d797443a55eb490', copy: '61ae20039465eaeb34784d41a6d8ebfac50891f59d5d15aa3d797443a55eb490',
    custody: '#20323', texts: { cost_basis: 'f0f8739f543800a40477c00b65216421af332f39bcb44542874508648bf29a4a', endpoint_condition: 'dd5a333f6ff64a8bdac49af6d58e3626c8445079ce456f46e9117c7e2bb34d0a' },
    disclosures: ['NEW add-request row (GitHub issue #220)', 'custody #20323', 'deputy #20315', 'independent pre-score review', 're-review',
      'every pre-registered prediction matched', 'No paid order', 'scripts/', '--allow-contract-mismatch was NOT used', '8,192-token prompt cap',
      'scored as wrong answers', 'output_tokens is 1 per answered request', '51.53', 'T1e', 'standard read', 'temperatures.json',
      'RTX 5090', 'lower bound', 'different model from the published jebadiah-27b row', 'Evaluated pin',
      '61ae20039465eaeb34784d41a6d8ebfac50891f59d5d15aa3d797443a55eb490'] },
  'celeris-1-decision': { ranked: true, lane: 'api', kind: 'api', display: 'Celeris-1 Decision (Celeris)', author: 'Celeris', repo: 'https://docs.celeris.ai',
    model_pin: 'hosted-api:inference.celeris.ai/celeris-1-decision/v1/systemone#celeris-1-decision', licence: 'Proprietary hosted API (no weights release)',
    ok: 1500, status_counts: { 200: 1500 }, input_tokens: 1968382, output_tokens: 0, price: { input: 0.04, output: 0.0 }, over_cap: false, order: '70c4455b',
    raw: '67104fd1ec5fb5cdc3a44f34b9b2e6df02c1696c7063585c14cd3736d349664d', copy: '67104fd1ec5fb5cdc3a44f34b9b2e6df02c1696c7063585c14cd3736d349664d',
    custody: '#20414', texts: { cost_basis: 'b614a65811c743a08582837b37ab789325d721f4683deaff0f54dbe1258f70db', endpoint_condition: 'a4cfa414e1dc69e612c4c349a0f13fe2a9ab90743666b11e38382e8391e3ef91' },
    disclosures: ['Paid public fast-lane order 70c4455b', '#20414', '#19242', '`celeris` (no proxy) before dispatch', '1,500 of 1,500 answered',
      '131,072-token context window', 'two-decimal precision', 'TOKEN COUNTING', 'everything the model reads', 'x the 650,605 that Sqwish reports',
      'no API adjustment', 'I-1', V1625_CELERIS_PRICING_SHA256, V1625_CELERIS_DOC_PRICING_SHA256, '14 Oct 2026 ruling', 'activation waitlist',
      'not independently inspected', '67104fd1ec5fb5cdc3a44f34b9b2e6df02c1696c7063585c14cd3736d349664d'] },
  'startlux-decision-v1.1-27b-instant': { ranked: true, lane: 'selfhosted', kind: 'gpu', display: 'StartLux-Decision v1.1 27B Instant (StartLux Labs, Qwen3.8-27B fine-tune)',
    author: 'StartLux Labs', repo: 'https://huggingface.co/startlux-models/StartLux-Decision-v1.1-27B-Instant',
    model_pin: 'startlux-models/StartLux-Decision-v1.1-27B-Instant@32e7d35d74db615c4a059181efbf21c5421f3561', licence: SL_LICENCE,
    ok: 1485, status_counts: { 200: 1485, 422: 15 }, input_tokens: 737990, output_tokens: 0, price: { input: 0.42, output: 3.0 }, over_cap: true,
    raw: '18930e0fc47504edc6f2b699cd754d794b2ac0805e1b90d4fa15ff1e2d677a4b', copy: '18930e0fc47504edc6f2b699cd754d794b2ac0805e1b90d4fa15ff1e2d677a4b',
    custody: '#20395', texts: { cost_basis: 'dbf7283bf7b3d55525ffb606cb841f175ff4ba161afa23c5e9727696cde57ff7', endpoint_condition: 'b130ce3c9197e94e0b8256bddcb5b7e2c8616968cdeb87b5fa68080a59fe3ab9' },
    disclosures: ['NEW row added on Florian', 'custody #20395', 'independent code review', 'pre-run review', 'pre-score review',
      'every pre-registered prediction matched', 'No paid order', 'JevBench had no StartLux row before', 'torchcast-decision-27b', 'LICENCE (NC)',
      'CC BY-NC 4.0', 'non-commercial', 'over the 65,536-token context', 'scored as wrong answers', 'none_check', 'H200', 'OVER THE OFFICIAL COST CAP',
      "are the author's own runs", 'outside the official cost-capped views', 'Evaluated pin', 'INSTANT', 'think_mode never', 'prefix-bidirectional',
      '18930e0fc47504edc6f2b699cd754d794b2ac0805e1b90d4fa15ff1e2d677a4b'] },
  'startlux-decision-v1.1-27b-autothink': { ranked: true, lane: 'selfhosted', kind: 'gpu', display: 'StartLux-Decision v1.1 27B AutoThink (StartLux Labs, Qwen3.8-27B fine-tune, gate 0.6)',
    author: 'StartLux Labs', repo: 'https://huggingface.co/startlux-models/StartLux-Decision-v1.1-27B-AutoThink',
    model_pin: 'startlux-models/StartLux-Decision-v1.1-27B-AutoThink@dd62d5cd84a483d75bdd548880bbf08bdd3f67a4', licence: SL_LICENCE,
    ok: 1485, status_counts: { 200: 1485, 422: 15 }, input_tokens: 737990, output_tokens: 72063, price: { input: 0.42, output: 3.0 }, over_cap: true,
    raw: '8fc7145c01b6854821d0458e56cbf4b67941b3cfa25b732efc317e448695e654', copy: '8fc7145c01b6854821d0458e56cbf4b67941b3cfa25b732efc317e448695e654',
    custody: '#20395', texts: { cost_basis: 'a68ac0b3aa807100359dc927c94f4b1339991ec33f1ffa9755edf3c5772369b9', endpoint_condition: 'b130ce3c9197e94e0b8256bddcb5b7e2c8616968cdeb87b5fa68080a59fe3ab9' },
    disclosures: ['NEW row added on Florian', 'custody #20395', 'independent code review', 'pre-run review', 'pre-score review',
      'every pre-registered prediction matched', 'No paid order', 'JevBench had no StartLux row before', 'torchcast-decision-27b', 'LICENCE (NC)',
      'CC BY-NC 4.0', 'non-commercial', 'over the 65,536-token context', 'scored as wrong answers', 'none_check', 'H200', 'OVER THE OFFICIAL COST CAP',
      "are the author's own runs", 'outside the official cost-capped views', 'Evaluated pin', 'SERVER DEFAULT gate 0.6', 'gate 0.9, which was NOT measured', '279 of 1,485 answered questions (18.8%) thought',
      '72,063 thought tokens', 'Latency includes the thought time', '8fc7145c01b6854821d0458e56cbf4b67941b3cfa25b732efc317e448695e654'] },
});
export const V1625_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1625Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1625_BASE_DIMS] : [...V1625_BASE_DIMS];
}

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const textSha = v => typeof v === 'string' ? createHash('sha256').update(v, 'utf8').digest('hex') : null;
const fail = message => { throw new Error(`JevBench v1.6.25: ${message}`); };
const sameSet = (a, b) => a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const same = (a, b, message) => { if (!isDeepStrictEqual(a, b)) fail(message); };
const INTERNAL = /[\w.+-]+@[\w-]+\.[a-z]{2,}|\/home\/|\bworkers\/|\br1\d\d\/|\bpod id\b|PREREG|batchA/i;
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
  // keys may contain dots (startlux-decision-v1.1-...): the list ends at " (" or at the sentence end ". "
  const m = boardNote.match(/Top-five changes caused by: (.+?)(?: \(|\. )/);
  return m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : [];
}

/** How the publication approval arrived. Returns the marker the authority must carry. */
function approvalOf(proof, artifact, boardNote, provisional) {
  const pa = proof.publication_approval;
  same(pa?.go, V1625_GO, 'publication GO provenance');
  same(pa?.paid_fast_lane, V1625_PAID_RULE, 'paid fast-lane rule provenance');
  same(pa?.startlux_request, V1625_SL_ASK, 'StartLux request provenance');
  // A build made before a preview card was answered carries PLACEHOLDER fields; they are rejected wherever they appear.
  if (JSON.stringify(proof).includes('PLACEHOLDER') || JSON.stringify(artifact).includes('PLACEHOLDER')) fail('approval placeholder not filled');
  const notes = artifact.measurement_notes.filter(n => n.startsWith('Publication of v1.6.25:'));
  if (notes.length !== 1) fail('public note must describe how the approval arrived');
  const note = notes[0];
  if (!note.includes(V1625_GO_QUOTE) || !note.includes(V1625_GO.recorded_in) || !note.includes(V1625_PAID_RULE.recorded_in)
      || !note.includes(V1625_SL_QUOTE) || !note.includes(V1625_SL_ASK.recorded_in)) fail('public note must describe how the approval arrived');
  const noChange = boardNote.includes(NO_CHANGE_BOARD);
  const causes = boardCauses(boardNote);
  const claimsCard = /Telegram card #\d/.test(note) || /selected "[^"]*" on Telegram card/.test(note);
  if (pa.top_five_effect === 'none') {
    // No top five changes: no preview card exists, and none may be claimed anywhere.
    if (!provisional && !noChange) fail('a no-card approval needs the generated no-change board note');
    if (pa.top_five_preview !== null || pa.button_tap !== false || Object.keys(pa).sort().join() !== 'button_tap,go,paid_fast_lane,startlux_request,top_five_effect,top_five_preview') fail('no-card approval provenance');
    if (!note.includes(NO_CARD_TEXT) || claimsCard) fail('public note must not claim a preview card');
    return NO_CARD_MARKER;
  }
  if (noChange || provisional || !causes.length) fail('approval and top-five effect disagree');
  same([...pa.top_five_changed_by ?? []].sort(), [...causes].sort(), 'the approval must name exactly the rows the board note says changed the top fives');
  if (pa.top_five_effect === 'changes-paid-only') {
    // Only the paid fast-lane rows change top fives: Florian's standing paid rule, no preview card (v1.6.13 Attest).
    if (!causes.every(k => V1625_PAID_KEYS.includes(k)) || !boardNote.includes('(paid fast-lane rows only)')) fail('the paid fast-lane exception covers only top-five changes caused by the paid rows');
    if (pa.top_five_preview !== null || pa.button_tap !== false
        || Object.keys(pa).sort().join() !== 'button_tap,go,paid_fast_lane,startlux_request,top_five_changed_by,top_five_effect,top_five_preview') fail('paid fast-lane approval provenance');
    if (!note.includes(PAID_TEXT_HEAD) || !note.includes(PAID_TEXT_TAIL) || !note.includes(V1625_PAID_QUOTE) || claimsCard) fail('public note must state the paid fast-lane exception and claim no card');
    return PAID_MARKER;
  }
  if (pa.top_five_effect !== 'changes' || causes.every(k => V1625_PAID_KEYS.includes(k))) fail('approval and top-five effect disagree');
  const a = pa.top_five_preview;
  const id = a?.card_id;
  const canonical = typeof id === 'string' && /^\d+$/.test(id) && BigInt(id).toString() === id;
  if (!canonical || BigInt(id) <= LAST_CARD || typeof a.selection !== 'string' || !a.selection.trim() || !hex(a.preview_png_sha256)) fail('top-five preview approval card');
  if (!['telegram-button', 'direct-message'].includes(a.channel) || typeof a.button_tap !== 'boolean' || pa.button_tap !== a.button_tap
      || typeof a.recorded_at !== 'string' || !a.recorded_at || typeof a.recorded_in !== 'string' || !a.recorded_in
      || (a.channel === 'telegram-button') !== a.button_tap) fail('approval channel and provenance');
  const claimsTap = /selected "[^"]*" on Telegram card/.test(note);
  const saysNoTap = note.includes("The card's own button was not pressed.");
  if ((a.button_tap ? (!claimsTap || saysNoTap) : (claimsTap || !saysNoTap)) || !note.includes(`Telegram card #${id}`)
      || !note.includes(a.preview_png_sha256)) fail('public note must describe how the approval arrived');
  return a.button_tap
    ? `Florian top-five preview approval: Telegram card #${id}; selected "${a.selection}" (${a.recorded_at}); preview PNG SHA-256 ${a.preview_png_sha256}.`
    : `Florian top-five preview approval: ${a.channel} ${a.recorded_at}, recorded as Telegram card #${id} = "${a.selection}" (${a.recorded_in}; no button tap); preview PNG SHA-256 ${a.preview_png_sha256}.`;
}

export function validateJevbenchV1625Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.25' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.24' || previous.proof?.revision !== 'v1.6.24') fail('validated v1.6.24 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.24', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.25' || artifact.run_kind !== 'regular-queue' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  const newKeys = allKeys.filter(k => !V1625_CARRIED_KEYS.includes(k) && !V1625_CARRIED_PRELIMINARY_KEYS.includes(k)).sort();
  if (!sameSet(newKeys, V1625_NEW_KEYS)) fail(`exactly the added rows: ${newKeys}`);
  if (!sameSet(allKeys, [...V1625_CARRIED_KEYS, ...V1625_NEW_KEYS, ...V1625_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + V1625_NEW_KEYS.length) fail('exactly the added rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + V1625_RANKED_NEW_KEYS.length) fail('ranked row count');
  const regularKeys = [...V1625_CARRIED_KEYS, ...V1625_NEW_KEYS];
  const unrankedKeys = [...V1625_UNRANKED_CARRIED_KEYS, ...V1625_UNRANKED_NEW_KEYS];
  if (!sameSet(V1625_UNRANKED_CARRIED_KEYS, V1625_CARRIED_KEYS.filter(k => !prior.get(k)?.ranked))) fail('carried unranked set');

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1625_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const spec = V1625_ROW_SPEC[s.key];
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
    if (unpriced && isNew && (s.axes.cost !== null || s.cost.usd_per_1000 !== null || ['A', 'B', 'C'].some(o => s.scores?.[o] !== null))) fail(`an unpriced row has no cost axis and no composite: ${s.key}`);
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9) fail(`capability is the mean of intelligence and calibration: ${s.key}`);
    if (unrankedKeys.includes(s.key)) {
      if (s.ranked !== false || s.rank !== null || s.listing !== 'listed') fail(`listed-not-ranked row ${s.key}`);
      same(s.ranks, { A: null, B: null, C: null, capability: null }, `null ranks ${s.key}`);
      if (typeof s.not_ranked_because !== 'string' || s.not_ranked_because.length < 60) fail(`stated reason for not ranking ${s.key}`);
      if (isNew && !s.not_ranked_because.includes(spec.reason)) fail(`the ruling behind the missing rank must be named: ${s.key}`);
    } else if (!s.ranked || s.listing !== 'ranked' || !Number.isInteger(s.rank)) {
      fail(`every other full-draw row is ranked: ${s.key}`);
    }
    if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repo ${s.key}`);
    const apiPin = s.endpoint_kind === 'api';
    if (typeof s.model_pin !== 'string' || !(/@[a-f0-9]{40}$/.test(s.model_pin) || (apiPin && (/@[a-f0-9]{8,40}$/.test(s.model_pin) || /^hosted-api:/.test(s.model_pin))))) fail(`pinned revision ${s.key}`);
    if (!unpriced && (!finite(s.cost?.usd_per_1000) || s.cost.usd_per_1000 <= 0)) fail(`cost figure ${s.key}`);
    if (typeof s.cost?.basis !== 'string' || s.cost.basis.length < 80) fail(`documented cost basis ${s.key}`);
    if (!unpriced && s.cost.usd_per_1000 > V1625_COST_CAP && !V1625_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the new rows ---------------------------------------------------------------------------
  const inherited = Object.keys(previous.proof.new_rows ?? {});
  if (!sameSet(Object.keys(proof.new_rows ?? {}), [...inherited, ...V1625_NEW_KEYS])) fail('new-row provenance coverage');
  for (const k of inherited) same(proof.new_rows[k], previous.proof.new_rows[k], `inherited new-row provenance ${k}`);
  for (const [key, spec] of Object.entries(V1625_ROW_SPEC)) {
    const s = by.get(key), n = proof.new_rows[key];
    const paid = V1625_PAID_KEYS.includes(key);
    for (const field of ['display', 'author', 'repo', 'licence', 'model_pin']) same(s[field], spec[field], `${key} registry ${field} verbatim`);
    if (V1625_STARTLUX_KEYS.includes(key) && !(s.licence.includes('CC BY-NC 4.0') && s.licence.includes('non-commercial'))) fail(`${key}: the non-commercial licence flag`);
    if (textSha(s.cost?.basis) !== spec.texts.cost_basis) fail(`${key} registry cost_basis verbatim`);
    if (textSha(s.endpoint_condition) !== spec.texts.endpoint_condition) fail(`${key} registry endpoint_condition verbatim`);
    if (!spec.ranked && textSha(s.not_ranked_because) !== spec.texts.not_ranked_because) fail(`${key} registry ranking reason verbatim`);
    if (s.measured_in !== 'v1.6.25' || s.measurement_date_status !== 'measured' || s.last_measured_on !== '2026-10-16') fail(`${key} measurement stamp`);
    if (s.endpoint_kind !== spec.kind || s.api_flag !== (spec.kind === 'api') || s.v16.set !== 'S+P') fail(`${key} lane/endpoint kind`);
    if (spec.kind === 'api' ? (s.v16.full_set_api !== true || s.v16.equated !== null || s.speed?.adjustment !== 'none (API)')
                            : s.speed?.adjustment !== 'x2 + 0.15 s (assumption, not measured)') fail(`${key} latency adjustment`);
    if ((s.paid_fast_lane === true) !== paid) fail(`${key} paid fast-lane flag`);
    if (s.status.answered_ok !== spec.ok) fail(`${key} completeness`);
    if (spec.ranked) {
      const usd = cost(spec.input_tokens, spec.output_tokens, spec.price.input, spec.price.output);
      if (s.ranked !== true || s.listing !== 'ranked' || s.not_ranked_because || s.ranked_false_reason) fail(`${key} is ranked`);
      if (s.cost?.kind !== 'estimate' || s.cost.usd_per_1000 !== usd || (usd > V1625_COST_CAP) !== spec.over_cap || s.cost.usage_estimated_rows !== 0) fail(`${key} cost: tariff x own tokens, cap side as stated`);
      if (s.cost.basis.includes('OVER THE OFFICIAL COST CAP') !== spec.over_cap) fail(`${key} over-cap disclosure`);
      if (paid && (!s.cost.basis.includes(V1625_CELERIS_PRICING_SHA256.slice(0, 8)) || !s.cost.basis.includes(V1625_CELERIS_DOC_PRICING_SHA256.slice(0, 8))
                   || !s.cost.basis.includes('I-1') || !s.cost.basis.includes('activation waitlist'))) fail(`${key} cost basis names its evidence and interpretation`);
      if (!finite(s.axes.cost) || ['A', 'B', 'C'].some(o => !finite(s.scores?.[o]))) fail(`${key} cost axis and composites`);
      if (Object.values(s.views ?? {}).some(v => !finite(v))) fail(`${key}: a ranked row publishes its presets`);
      for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) if (!intervalOk(ci, s.scores)) fail(`new row interval does not contain its own point estimate: ${key}`);
    } else {
      if (s.cost?.kind !== 'unpriced' || s.cost.usd_per_1000 !== null) fail(`${key} is unpriced`);
      if (Object.values(s.views ?? {}).some(v => v !== null) || !Object.keys(s.views ?? {}).length) fail(`${key}: a listed-not-ranked row publishes null presets`);
    }
    const capCi = s.v16?.ci95?.capability;
    if (!Array.isArray(capCi) || !(capCi[0] <= s.capability + 1e-9 && s.capability <= capCi[1] + 1e-9)) fail(`new row capability interval does not contain its own point estimate: ${key}`);
    const rowNote = artifact.measurement_notes.find(x => x.startsWith(`${key}: `)) ?? '';
    if (rowNote.length < 600) fail(`row note of ${key} is too thin to be the disclosure it claims to be`);
    for (const fragment of spec.disclosures) if (!rowNote.includes(fragment)) fail(`required disclosure "${fragment}" missing from the note of ${key}`);
    // public text carries no personal e-mail address and no internal job path, pod id or Sandy filesystem path (receipts keep them)
    for (const text of [s.author, s.endpoint_condition, s.cost?.basis, s.not_ranked_because, s.licence, rowNote])
      if (typeof text === 'string' && INTERNAL.test(text)) fail(`${key}: personal e-mail or internal path in public text`);
    // provenance receipt
    if (!n || n.raw_sha256 !== proof.raw_sha256?.[key] || n.raw_sha256 !== spec.copy || n.original_raw_sha256 !== spec.raw
        || n.ar_scoring_copy_sha256 !== (paid ? null : spec.copy) || n.measured_in !== 'v1.6.25'
        || n.rows !== 1500 || n.answered_ok !== spec.ok || n.ranked !== spec.ranked || n.paid_fast_lane !== paid || n.endpoint_kind !== spec.kind
        || n.treatment !== (spec.ranked ? (spec.over_cap ? 'ranked_over_cap' : 'ranked') : 'listed_unpriced') || n.pricing_module_sha256 !== V1625_PRICING_MODULE_SHA256
        || !String(n.custody).includes(spec.custody) || n.measured_on !== '2026-10-16') fail(`${key} new-row provenance`);
    if (paid ? (n.order !== spec.order || n.exposure_logged_to_provider !== 'celeris' || n.refused_http_422 !== 0 || !hex(n.run_receipt_sha256)
                || n.price_source?.saved_copy_sha256 !== V1625_CELERIS_PRICING_SHA256 || n.price_source?.docs_saved_copy_sha256 !== V1625_CELERIS_DOC_PRICING_SHA256
                || n.pre_score_review_sha256 !== null || n.probabilities_two_decimal_rows !== 1500 || !finite(n.token_count_context?.input_tokens_vs_kettei_fat))
             : V1625_STARTLUX_KEYS.includes(key)
             ? (!hex(n.pre_score_review_sha256) || n.post_score_review_sha256 !== null || n.florian_request?.custody !== '#20395'
                || n.florian_request?.quote !== V1625_SL_QUOTE || n.florian_request?.gpu !== V1625_SL_ASK.gpu_approval || n.florian_request?.handoff !== 'board #20440'
                || !hex(n.florian_request?.package_review_sha256) || !hex(n.florian_request?.prerun_review_sha256) || !hex(n.florian_request?.validate_receipt_sha256)
                || n.florian_request?.pre_registered_predictions_matched !== true || n.licence_non_commercial !== true || n.over_cost_cap !== true
                || (key.endsWith('-autothink') ? (n.autothink?.gate_measured !== 0.6 || n.autothink?.gate_of_card_results !== 0.9 || n.autothink?.gate_0_9_measured !== false
                                                  || n.autothink?.thought_tokens !== spec.output_tokens) : 'autothink' in n))
             : (!hex(n.pre_score_review_sha256) || n.post_score_review_sha256 !== null || n.add_request?.custody !== '#20323' || n.add_request?.gpu !== 'deputy #20315'
                || n.add_request?.request !== 'GitHub #220' || !hex(n.add_request?.stage2_review_sha256) || n.add_request?.re_review_sha256 !== n.pre_score_review_sha256
                || !hex(n.add_request?.validate_receipt_sha256) || n.add_request?.pre_registered_predictions_matched !== true)) fail(`${key} measurement provenance`);
    if (n.input_tokens !== spec.input_tokens || n.output_tokens !== spec.output_tokens) fail(`${key} usage`);
    same(n.status_counts, spec.status_counts, `${key} HTTP status counts`);
    if (spec.ranked) {
      same(n.price_per_million, spec.price, `${key} tariff`);
      const recomputed = cost(n.input_tokens, n.output_tokens, n.price_per_million.input, n.price_per_million.output);
      if (n.usd_per_1000 !== recomputed || n.usd_per_1000 !== s.cost.usd_per_1000 || n.under_cost_cap !== !spec.over_cap
          || Math.abs(n.cost_cap_ratio - n.usd_per_1000 / V1625_COST_CAP) > 1e-12) fail(`${key} cost binding`);
    } else if (n.price_per_million !== null || n.usd_per_1000 !== null || n.cost_cap_ratio !== null) fail(`${key}: an unpriced row carries no price`);
    if (s.speed.p50_s_raw !== n.p50_s_raw || s.speed.p95_s_raw !== n.p95_s_raw) fail(`${key} receipt latency`);
  }

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
  for (const key of V1625_CARRIED_PRELIMINARY_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the carried rows keep every point estimate ----------------------------------------------
  // What may differ on a carried row, and nothing else: its placement (rank, ranks), its bootstrap intervals
  // (composite_ci95, v16.ci95 - new keys shift roster positions and with them the per-row bootstrap seeds) and, only
  // when the API-basis diagnostic moved, v16.raw_on_A. Every move must be named in the release note.
  const diagnosticMoved = artifact.G_med_api_basis_P_vs_A !== previous.artifact.G_med_api_basis_P_vs_A;
  const strip = (row, allowRawOnA) => {
    const copy = JSON.parse(JSON.stringify(row));
    delete copy.composite_ci95; delete copy.rank; delete copy.ranks;
    if (copy.v16) { delete copy.v16.ci95; if (allowRawOnA) delete copy.v16.raw_on_A; }
    return copy;
  };
  const releaseNote = artifact.measurement_notes.find(x => x.startsWith('v1.6.25 ADDS ')) ?? '';
  const clauseStart = releaseNote.indexOf('Carried rows whose intervals moved:');
  if (clauseStart < 0) fail('the release note must carry the "Carried rows whose intervals moved:" clause');
  const intervalNames = releaseNote.slice(clauseStart + 'Carried rows whose intervals moved:'.length).split('DIAGNOSTICS')[0]
    .split(/[,\s]+/).map(x => x.replace(/\.$/, ''));
  const rankClause = releaseNote.split('RANKS:')[1]?.split('CONFIDENCE INTERVALS:')[0] ?? '';
  for (const key of V1625_CARRIED_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried row present ${key}`);
    const rawOnAMoved = JSON.stringify(a.v16?.raw_on_A) !== JSON.stringify(b.v16?.raw_on_A);
    if (rawOnAMoved && !diagnosticMoved) fail(`raw_on_A moved while the API-basis diagnostic did not: ${key}`);
    if (rawOnAMoved && !releaseNote.includes(`${key}: intelligence`)) fail(`a moved raw_on_A must name its row in the notes: ${key}`);
    same(strip(b, rawOnAMoved), strip(a, rawOnAMoved), `carried row differs outside rank/ranks/composite_ci95/v16.ci95${rawOnAMoved ? '/v16.raw_on_A' : ''}: ${key}`);
    if (V1625_UNRANKED_CARRIED_KEYS.includes(key)) {
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    }
    const intervalMoved = !isDeepStrictEqual([b.composite_ci95, b.v16?.ci95], [a.composite_ci95, a.v16?.ci95]);
    if (intervalMoved && !intervalNames.includes(key)) fail(`a moved carried interval must name its row in the release note: ${key}`);
    for (const ci of (b.cost.kind === 'unpriced' ? [] : [b.composite_ci95, b.v16?.ci95?.composite])) {
      if (!intervalOk(ci, b.scores)) fail(`carried row interval does not contain its own point estimate: ${key}`);
    }
    if (a.ranked) {
      for (const o of ['A', 'B', 'C', 'capability']) {
        const above = V1625_RANKED_NEW_KEYS.filter(nk => (o === 'capability' ? by.get(nk).capability > b.capability
          : artifact.board[o].order.indexOf(nk) < artifact.board[o].order.indexOf(key))).length;
        if (b.ranks[o] !== a.ranks[o] + above) fail(`carried rank ${o} moved by more than the rows that joined above it: ${key}`);
        if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
      }
    }
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!releaseNote.includes('RANKS') || !releaseNote.includes('CONFIDENCE INTERVALS') || !releaseNote.includes('DIAGNOSTICS')
      || !V1625_NEW_KEYS.every(k => releaseNote.includes(k))) fail('the release note must count rank, interval and diagnostic moves');
  if (!artifact.measurement_notes.some(x => x.includes('#18761') && x.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (diagnosticMoved) {
    const values = [previous.artifact.G_med_api_basis_P_vs_A, artifact.G_med_api_basis_P_vs_A].map(String);
    if (!artifact.measurement_notes.some(x => x.includes('API-basis median diagnostic') && values.every(v => x.includes(v)))) fail('a moved API-basis diagnostic must be disclosed with both values');
  }
  const added = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  const boardNotes = added.filter(x => x.startsWith('Board effect'));
  const boardNote = boardNotes.length === 1 ? boardNotes[0] : '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1625_BUILD_PASS1 !== '1'
      : !(boardNote.includes('top-five') && V1625_RANKED_NEW_KEYS.every(k => boardNote.includes(k)))) fail('board effect: generated top-five note required; provisional build note forbidden');
  if (artifact.G_med !== V1625_FIXED_G_MED || previous.artifact.G_med !== V1625_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  for (const f of ['draw_release', 'freeze_manifest_sha256', 'seed_commitment', 'draw_digests', 'baseline_sha256', 'a2_supplement']) same(artifact.v16?.[f], previous.artifact.v16?.[f], `draw provenance ${f}`);
  if (artifact.v16.draw_release !== V1625_DRAW_RELEASE) fail('draw identity');
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.25' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || proof.baseline_sha256 !== artifact.v16.baseline_sha256
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  same(artifact.v16.draw_digests, proof.draw_digests, 'draw digests bound to the proof');
  if (proof.pricing_module_sha256 !== V1625_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V1624_PRICING_MODULE_SHA256
      || previous.proof.pricing_module_sha256 !== V1624_PRICING_MODULE_SHA256) fail('pricing re-freeze binding');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  for (const k of ['repriced_rows', 'refreshed_preview_go_card', 'refreshed_preview_approval', 'a2_supplement', 'scorer_sources_sha256']) same(proof[k], previous.proof[k], `inherited proof field ${k}`);
  if (typeof proof.authority !== 'string' || !proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.25:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of [...V1625_NEW_KEYS, 'GitHub #220', '#20374', '#20315', '#20323', '#20414', '#19242', '70c4455b', 'RANKED',
    '`celeris` before dispatch', '32556e54', '3948e3f1', 'PAID', 'no paid order', 'r114 Option A', V1625_GO_QUOTE, '2026-10-16 12:50 UTC', V1625_PAID_RULE.recorded_in,
    'A144', '#17713', '#20395', '#20440', 'Qwen/Qwen3.8-27B', 'over the official cost cap', 'CC BY-NC 4.0', V1625_SL_QUOTE]) {
    if (!newAuthority.includes(fragment)) fail(`new publication authority: ${fragment}`);
  }
  const marker = approvalOf(proof, artifact, boardNote, provisional);
  if (!newAuthority.includes(marker)) fail('publication approval authority binding');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), regularKeys)) fail('raw-output coverage');
  same(Object.fromEntries(V1625_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  const proofRows = proof.systems;
  if (!Array.isArray(proofRows) || !sameSet(proofRows.map(x => x.key), regularKeys)) fail('system proof coverage');
  const priorProof = new Map(previous.proof.systems.map(r => [r.key, r]));
  for (const x of artifact.systems) {
    if (V1625_CARRIED_PRELIMINARY_KEYS.includes(x.key)) continue;
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
    if (V1625_ROW_SPEC[x.key] && p.source_review_sha256 !== proof.new_rows[x.key].pre_score_review_sha256) fail(`independent pre-score review binding ${x.key}`);
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${x.key}`);
    const q = priorProof.get(x.key);
    if (q) for (const f of ['measured_by', 'source_review_sha256', 'source_review_note', 'raw_sha256', 'answered_ok']) same(p[f], q[f], `proof row provenance unchanged ${x.key}.${f}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1625_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && by.get(m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.25' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1625Dims(categories);
  if (!('topics' in categories) && !artifact.measurement_notes.some(x => x.includes('topic'))) fail('a release without the topic radar must say so in its measurement notes');
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) if (categories.lanes[key] !== (V1625_ROW_SPEC[key]?.lane ?? previous.categories.lanes[key])) fail(`category lane ${key}`);
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
  for (const key of V1625_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1625Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1625_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1624Release(root);
  if (!previous) fail('v1.6.25 needs the published v1.6.24 release it extends');
  const previousManifest = await load(`${V1625_ROOT}/jevbench-v1.6.24-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1625Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1625Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1625Release(root)); }
  catch { log('JevBench v1.6.25 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1625BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
