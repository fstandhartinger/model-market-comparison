// v1.6.30: the v1.6.1 common cost basis applies to draw v1.6-regular-20261012; no row added or removed; carried point estimates of
// Intelligence, Calibration, Speed and Capability frozen; only cost and what follows from it may move; pricing module unchanged.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1629Release, V1629_ROOT, V1629_CARRIED_KEYS, V1629_NEW_KEYS, V1629_UNRANKED_CARRIED_KEYS, V1629_UNRANKED_NEW_KEYS,
         V1629_CARRIED_PRELIMINARY_KEYS, V1629_ABOVE_COST_CAP_KEYS, V1629_PRICING_MODULE_SHA256 } from './jevbench-v1629-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1630_ROOT = V1629_ROOT;
export const V1630_MANIFEST = `${V1630_ROOT}/jevbench-v1.6.30-publication.json`;
export const V1630_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1630_FILE_KEYS.map(k => [k, `${V1630_ROOT}/jevbench-v1.6.30-${k}.json`]));
/** No row is added or removed. */
export const V1630_NEW_KEYS = [];
/** Every full-draw row of v1.6.29. */
export const V1630_CARRIED_KEYS = [...V1629_CARRIED_KEYS, ...V1629_NEW_KEYS];
export const V1630_CARRIED_PRELIMINARY_KEYS = [...V1629_CARRIED_PRELIMINARY_KEYS];
export const V1630_UNRANKED_CARRIED_KEYS = [...V1629_UNRANKED_CARRIED_KEYS, ...V1629_UNRANKED_NEW_KEYS];
/** Moving inside the official cost cap on the common basis. */
export const V1630_CAP_ENTRANTS = ['amos-1-medium', 'subq-snap-preview'];
export const V1630_ABOVE_COST_CAP_KEYS = V1629_ABOVE_COST_CAP_KEYS.filter(k => !V1630_CAP_ENTRANTS.includes(k));
export const V1630_FIXED_G_MED = 9.839526770355711;
export const V1630_COST_CAP = 0.06459465517241379;
export const V1630_DRAW_RELEASE = 'v1.6-regular-20261012';
/** No re-freeze in this release: the pricing module 6202ef78 stays in force. */
export const V1630_PRICING_MODULE_SHA256 = V1629_PRICING_MODULE_SHA256;
export const V1630_COST_BASIS_SHA256 = '2125e620c75a89c4ab2ae48f6f51c3c545a617d9ec78a57084ea069cfa44b28d';
export const V1630_SUPERSEDED_COST_BASIS_SHA256 = '0976523dc55a9df96422815b814f9020400894a9cdf4884395d27d90ad999e52';
export const V1630_N_BASIS = 1485;
export const V1630_N_LEFT_OUT = 15;
export const V1630_COST_RULE_GENERAL = 'On every draw, very long items that a ranked row refuses because they exceed its context length are left out of cost for all rows: cost per 1,000 decisions is computed on the same remaining items for every row. A refused item still counts as a wrong answer for Intelligence.';
export const V1630_COST_RULE_HISTORY = 'First published as the v1.6.1 cost rule (5 Oct 2026; 23 items on that draw). From v1.6.30 it applies to draw v1.6-regular-20261012: the 15 items the Jev reference refused with max_tokens_exceeded are left out and 1,485 remain. Rows of draw v1.6-regular-20261010-a2 still show the all-items cost they were published with until a following release re-costs them under this rule.';
export const V1630_GO = { channel: 'direct-message', where: 'laptop chat', date: '2026-10-19', recorded_at: '2026-10-19T16:40Z',
  recorded_in: 'DECISIONS.md 2026-10-19 16:40 UTC', quote_excerpt: 'entscheide das bitte gleich und dann passe die regel auch gleich an',
  summary: 'Florian delegated the decision on applying the v1.6.1 same-items cost rule to draw v1.6-regular-20261012 and on generalising its wording; the decision was recorded as YES by the chief of staff under that delegation.' };
export const V1630_COST_RULE = { rule: 'v1.6.1 common cost basis applied to draw v1.6-regular-20261012', decision: 'DECISIONS.md 2026-10-19 16:40Z', relay: 'board #21769',
  n_items: V1630_N_BASIS, n_left_out: V1630_N_LEFT_OUT, min_input_tokens_left_out: 76358, min_input_tokens_note: 'at least 76,358 input tokens as counted by the rows that answered them',
  left_out_are: 'the 15 items the Jev reference jev-1.14.0 refused with max_tokens_exceeded, which the other rows that did not answer them refused or failed on', cost_basis_sha256: V1630_COST_BASIS_SHA256,
  supersedes_cost_basis_sha256: V1630_SUPERSEDED_COST_BASIS_SHA256, supersedes: 'v1.6.10 freeze of this draw (cost-basis.json: no item is excluded)',
  generalised_rule: V1630_COST_RULE_GENERAL,
  unchanged: 'refusals still count as wrong answers for Intelligence; Intelligence, Calibration, Speed and Capability are unchanged' };
/** The latest Telegram card seen at build time; a v1.6.30 top-five preview card must be newer. */
const LAST_CARD = 17896n;
const cost = (tin, tout, pin, pout, n) => 1000 * (tin * pin + tout * pout) / 1e6 / n;   // score_v16.common_basis_usd

/** The 48 token-priced rows: the common-basis figure, the all-items figure it replaces (= the v1.6.29 figure) and the SHA-256 of the published
 *  cost basis text. The public reads exactly these, so they are pinned here. */
export const V1630_RECOST_SPEC = Object.freeze({
  "amos-1-large": {"usd": 0.21462339393939392, "usd_all": 0.5428432799999999, "basis_sha256": "be0a6dfbb3a9e551dec97f0194f75dd3c8210a5ef9f96a23a10756dc121f35b5"},
  "amos-1-medium": {"usd": 0.05110080808080808, "usd_all": 0.12924839999999999, "basis_sha256": "ef16c9053948cf6f6557eef3f2e649d226c6769bc31b54d959b388203cecbac1"},
  "arsenelupin-v1.1": {"usd": 0.02043169696969697, "usd_all": 0.02022738, "basis_sha256": "0a31c1cb8187b8fd2c4c80096621331a5069f740e0135845597c77be167e173f"},
  "attest-31b-v1.0": {"usd": 0.04388872727272727, "usd_all": 0.043449839999999997, "basis_sha256": "68b5a238dc8f859bc49fbec38cc2b00769785b064f93093ab6e1cd7d9e4c61ba"},
  "basal-omni-1.0-ultra": {"usd": 0.045102, "usd_all": 0.04465098000000001, "basis_sha256": "a221c20dec4931fafa04542f1b9fc171bc062d8dc4b7a9a4a5cfc9ff6df1bd5b"},
  "blink-4b": {"usd": 0.01644121212121212, "usd_all": 0.03988590000000001, "basis_sha256": "9c9c93d38b75f08314a2c36f560b37ce528fbdccf4c224a0ad612f5ce8094352"},
  "celeris-1-decision": {"usd": 0.020936161616161617, "usd_all": 0.05249018666666667, "basis_sha256": "de0f60655ae9bb32fcf6f11e82377590a152a1d0db65f635bed1f4758ce1281d"},
  "compass-0.2.0": {"usd": 0.025904262626262626, "usd_all": 0.04933552, "basis_sha256": "aa25ec2c5b149aaf5f173b319a1a81d77fbccf0ebaa7db13bfb4c13696a77783"},
  "decision2-lux-9b": {"usd": 0.05227939393939394, "usd_all": 0.0517566, "basis_sha256": "d8b1024276d0f8fcb508cc4beda20130a577637c7a1ecd430cac1527cac16249"},
  "imajev-2b": {"usd": 0.040545683501683506, "usd_all": 0.040140226666666674, "basis_sha256": "e1a895822bbbd1f87dfb507ed8b821030d781918c7626410152e9264d164f7fd"},
  "imajev-9b": {"usd": 0.20272841750841747, "usd_all": 0.20070113333333328, "basis_sha256": "01101f0c65ec504ec4d04e0cb9ecc9e78ffb269ea9d5b16c07996f7994c5ee7c"},
  "jeb-35b-a3b": {"usd": 0.07989323232323232, "usd_all": 0.0790943, "basis_sha256": "af32cb25c840a73a719d40441e2ba657d33a20d2d8a259a1ab64c9bb9392826a"},
  "jebadiah-9b-v2": {"usd": 0.05067545454545454, "usd_all": 0.05016869999999999, "basis_sha256": "0eeb4a0bfa370bf2e36700ca0f307ac4665ff9c21783bd397a98e169d3e8600b"},
  "jebadiah-9b-v2-1": {"usd": 0.05067545454545454, "usd_all": 0.05016869999999999, "basis_sha256": "a804a14bb613fe615527f027d52a39a847781db6ae06ddb999328de95619095f"},
  "jev-1.14.0": {"usd": 0.032074226262626265, "usd_all": 0.031753484, "basis_sha256": "ff206af665d44b695afd1f32d99870d1e70ae1790edb2f7fbbaf9d1612ebe4cb"},
  "jpt-4b": {"usd": 0.01559278787878788, "usd_all": 0.01543686, "basis_sha256": "6640273fa01ed906fc2914fdba19a3315e79cb8241e2c789164091d93b5ff810"},
  "julia-1": {"usd": 0.0021964107744107744, "usd_all": 0.0021744466666666668, "basis_sha256": "5c87eef84aa815d1b79304931e36b500335111543d5905546e68ba73fe53f33f"},
  "kettei-chub": {"usd": 0.017524713804713803, "usd_all": 0.017349466666666667, "basis_sha256": "e05e04e8ec9367a5858f8749d0c672e62d4f97b7ded1b0890f3869c279d3b1f2"},
  "kettei-fat": {"usd": 0.0262870707070707, "usd_all": 0.026024199999999994, "basis_sha256": "f71289151c21151ead06f58444179f8613e417921d15d685eb708d14adf34754"},
  "krino-2b": {"usd": 0.019951676767676764, "usd_all": 0.03297833333333333, "basis_sha256": "1b3e98e7c2b2d806f43b2e15a5032777ab1168fde920bf10018a01787afc981e"},
  "liquid-d1-ultra": {"usd": 0.01805677575757576, "usd_all": 0.017876208, "basis_sha256": "622620b513611084f382454e976a1b41b6638632b20564ad215d4e73f22afa5c"},
  "messier-one-v0.4": {"usd": 0.01976717171717172, "usd_all": 0.022117700000000004, "basis_sha256": "7918e379342898ff9e5275238e347f2482007ae9fe649532c6dbeaf03447e593"},
  "metask_jev_rain_12b_trained": {"usd": 0.03782087542087542, "usd_all": 0.041404166666666666, "basis_sha256": "c2f68edeb9c6cc4f96515557fac125e882e8e17253efd9172008fc9ce0fa30b7"},
  "metask_jev_rain_31b_trained": {"usd": 0.04387442424242424, "usd_all": 0.04921078, "basis_sha256": "be0cbe97a63779dcc118f9fc3a78a0ebe80b691e537b65d5f277d47db32bd0e4"},
  "metask_jev_rain_31b_trained_v3": {"usd": 0.04906177777777778, "usd_all": 0.05434626, "basis_sha256": "5b3344d060476e890408f74fd37bedf63e6842c6bd96c51c107c39f68a7b5e91"},
  "nagi-enormous": {"usd": 0.21563846464646463, "usd_all": 0.21348208, "basis_sha256": "12b63e87d86f60f63a288ddb58169530089d9200bccc2df0693ffe8779714cbe"},
  "nev-2b": {"usd": 0.00923437037037037, "usd_all": 0.009142026666666666, "basis_sha256": "d68e16e0e2f4bf2345acb21eb53689176e834f9b475ce842ae51b9f7f86ef0f5"},
  "nimble-v4": {"usd": 0.020350383838383838, "usd_all": 0.05160936000000001, "basis_sha256": "f7feb11bec27b232946db0be55eae9ee9e5785f8c0cb3d5af9a36b0b594c06fe"},
  "nimble-v4-max": {"usd": 0.020350383838383838, "usd_all": 0.05160936000000001, "basis_sha256": "271636bb72462f86e468fa1f4e44b8b5d944fdf4efab898da34b5830a7e24753"},
  "noma": {"usd": 0.01854450505050505, "usd_all": 0.019615120000000003, "basis_sha256": "bc6abb934e3722329bb35e21838761f92342467c50056ff2b54214ff0ab0d0fb"},
  "phocinae-largha-150m-v1": {"usd": 0.0014336531986531987, "usd_all": 0.0014397966666666667, "basis_sha256": "c90fb47401a35eb6a09d3ae40e17ea4bc8928ba07ae7d8b40d96f5d5f7acbd0c"},
  "pjev-2b": {"usd": 0.01643789898989899, "usd_all": 0.01627352, "basis_sha256": "7854a08be038adc182efdb16076a17a25e9dfe26625bb0e6f945fe11fda14117"},
  "purplemist-mini-1.0": {"usd": 0.00943423569023569, "usd_all": 0.009339893333333333, "basis_sha256": "30951023604404bc5d434e7d7ebc3b74ae3004cf438c133e2859e46c671002d0"},
  "reflex-instinct-0.6b": {"usd": 0.004712175084175084, "usd_all": 0.006301273333333334, "basis_sha256": "81de737293701c2cf68d995a754eeea95f455740a1814bddecc6479ed6881e0e"},
  "respan-span-02": {"usd": 0.06773656565656565, "usd_all": 0.0670592, "basis_sha256": "43b2227e709a1a2268c4801caeabf34f5d3fc2b1c0e04304ea38c471dd5c58f1"},
  "ryotide-qwen": {"usd": 0.018226101010101012, "usd_all": 0.04166444, "basis_sha256": "b6be026c68411bdffb15fbee9b309ea367c565d0dec2d2946dd590b943ef57ad"},
  "sage-1.4.0": {"usd": 0.022423872053872054, "usd_all": 0.022199633333333333, "basis_sha256": "083756e3b74a9e516ecc13a154fc20800ae870cee05f4e712e0fb93b51f8c4fd"},
  "shisa-de-1": {"usd": 0.04724969696969697, "usd_all": 0.046777200000000005, "basis_sha256": "8a27ac3dd478cd81ad2ba82db1bc943f01e0b1659b249ed2b9ac5dd3dec2c937"},
  "standard_one_3b_sh": {"usd": 0.05151420875420875, "usd_all": 0.05099906666666666, "basis_sha256": "e9261ed60068caa813a964a28bcdae484433ce663d2fd6859b7495baaab24f98"},
  "startlux-decision-v1.1-27b-autothink": {"usd": 0.35430626262626264, "usd_all": 0.3507632, "basis_sha256": "e398c14bbe7084749da2497ea3b25943436b9783e79cf1ba2652cf4bd0a8bd8f"},
  "startlux-decision-v1.1-27b-instant": {"usd": 0.20872444444444446, "usd_all": 0.20663720000000002, "basis_sha256": "49f1e1c1bdeb03495a85de54515fec0fe93e34c0706084cd1a8eee8244cb3b5d"},
  "subq-snap-preview": {"usd": 0.025715993265993265, "usd_all": 0.06479016666666666, "basis_sha256": "f15f6c6738b665bc252181ecb3c23ca9553db231df57e6437673dc4d0049dc1e"},
  "torchcast-decision-4b-v1.1": {"usd": 0.014895474747474746, "usd_all": 0.01965778, "basis_sha256": "05f865c70a073f35393de2a2d6b562f635fce7e2ca96e2e5c3b6a286f90a2ce2"},
  "torchcast-decision-4b-v1.2": {"usd": 0.01489547474747475, "usd_all": 0.019657780000000003, "basis_sha256": "2a4938bcd95b81a5602434998179d24e563f39c08e18babc355ea0bc251d828f"},
  "uniphore-4b-decider": {"usd": 0.01520488888888889, "usd_all": 0.015052840000000001, "basis_sha256": "ba0d377b27d4a5146d135b80eaa66705e3c8fa3475a99291c8346bd651d4c836"},
  "vega-u-qwen3.5-0.8b": {"usd": 0.0049297710437710435, "usd_all": 0.012253273333333332, "basis_sha256": "f7462bc0cc9896684426b02262cf8b09f63327a2ae99138033296a64f601ebc2"},
  "verdin-4b": {"usd": 0.018226020202020205, "usd_all": 0.018043760000000002, "basis_sha256": "1fb0fdfccbdde72d644f7913e4b241e32c96b1e10f29046a60ae5f11406ba5c0"},
  "vllm-sr-d3": {"usd": 0.21811434343434347, "usd_all": 0.5463374, "basis_sha256": "3a9bcf55061ba52e8ed44ca78d88128fdbff262f8fd06a93d818c7483ed2f31c"},
});
export const V1630_RECOSTED_KEYS = Object.keys(V1630_RECOST_SPEC).sort();
export const V1630_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1630Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1630_BASE_DIMS] : [...V1630_BASE_DIMS];
}

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const textSha = v => typeof v === 'string' ? createHash('sha256').update(v, 'utf8').digest('hex') : null;
const fail = message => { throw new Error(`JevBench v1.6.30: ${message}`); };
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
const NO_CHANGE_BOARD = '0 of 21 top-five lists change';
const NO_CARD_TEXT = 'No top-five list changes (see the board-effect note), so no top-five preview card was sent and none is claimed; the decision arrived as a direct message and no Telegram button was pressed.';
const NO_CARD_MARKER = `Florian publication approval: direct-message ${V1630_GO.recorded_at} (${V1630_GO.recorded_in}); the cost-rule decision is recorded as ${V1630_COST_RULE.relay}; no top-five preview card (no top-five list changes); no button tap.`;

/** How the publication approval arrived. Returns the marker the authority must carry. */
function approvalOf(proof, artifact, boardNote, provisional) {
  const pa = proof.publication_approval;
  same(pa?.go, V1630_GO, 'publication GO provenance');
  same(pa?.cost_rule, V1630_COST_RULE, 'cost-rule decision provenance');
  // A build made before the preview card was answered carries PLACEHOLDER fields; they are rejected wherever they appear.
  if (JSON.stringify(proof).includes('PLACEHOLDER') || JSON.stringify(artifact).includes('PLACEHOLDER')) fail('approval placeholder not filled');
  const notes = artifact.measurement_notes.filter(n => n.startsWith('Publication of v1.6.30:'));
  if (notes.length !== 1) fail('public note must describe how the approval arrived');
  const note = notes[0];
  if (!note.includes(V1630_GO.recorded_in) || !note.includes(V1630_COST_RULE.relay) || !note.includes('applies the v1.6.1 common cost basis to this draw')) fail('public note must describe how the approval arrived');
  const noChange = boardNote.includes(NO_CHANGE_BOARD);
  const causes = boardCauses(boardNote);
  const claimsCard = /Telegram card #\d/.test(note) || /selected "[^"]*" on Telegram card/.test(note);
  if (pa.top_five_effect === 'none') {
    if (!provisional && !noChange) fail('a no-card approval needs the generated no-change board note');
    if (pa.top_five_preview !== null || pa.button_tap !== false || Object.keys(pa).sort().join() !== 'button_tap,cost_rule,go,top_five_effect,top_five_preview') fail('no-card approval provenance');
    if (!note.includes(NO_CARD_TEXT) || claimsCard) fail('public note must not claim a preview card');
    return NO_CARD_MARKER;
  }
  if (noChange || provisional || !causes.length || pa.top_five_effect !== 'changes') fail('approval and top-five effect disagree');
  same([...pa.top_five_changed_by ?? []].sort(), [...causes].sort(), 'the approval must name exactly the rows the board note says changed the top fives');
  if (!causes.every(k => V1630_RECOSTED_KEYS.includes(k))) fail('only a re-costed row can change a top five in this release');
  const a = pa.top_five_preview;
  const id = a?.card_id;
  const canonical = typeof id === 'string' && /^\d+$/.test(id) && BigInt(id).toString() === id;
  if (!canonical || BigInt(id) <= LAST_CARD || typeof a.selection !== 'string' || !a.selection.trim() || !hex(a.preview_png_sha256)) fail('top-five preview approval card');
  if (!['telegram-button', 'direct-message'].includes(a.channel) || typeof a.button_tap !== 'boolean' || pa.button_tap !== a.button_tap
      || typeof a.recorded_at !== 'string' || !a.recorded_at || typeof a.recorded_in !== 'string' || !a.recorded_in
      || (a.channel === 'telegram-button') !== a.button_tap
      || Object.keys(pa).sort().join() !== 'button_tap,cost_rule,go,top_five_changed_by,top_five_effect,top_five_preview') fail('approval channel and provenance');
  const claimsTap = /selected "[^"]*" on Telegram card/.test(note);
  const saysNoTap = note.includes("The card's own button was not pressed.");
  if ((a.button_tap ? (!claimsTap || saysNoTap) : (claimsTap || !saysNoTap)) || !note.includes(`Telegram card #${id}`)
      || !note.includes(a.preview_png_sha256)) fail('public note must describe how the approval arrived');
  return a.button_tap
    ? `Florian top-five preview approval: Telegram card #${id}; selected "${a.selection}" (${a.recorded_at}); preview PNG SHA-256 ${a.preview_png_sha256}.`
    : `Florian top-five preview approval: ${a.channel} ${a.recorded_at}, recorded as Telegram card #${id} = "${a.selection}" (${a.recorded_in}; no button tap); preview PNG SHA-256 ${a.preview_png_sha256}.`;
}

/** The Cost axis and the composites follow from the cost by the published formulas (score_v16). */
function followsFromCost(artifact, s) {
  const expectedAxis = Math.max(0, Math.min(100, 100 - 30 * Math.log10(s.cost.usd_per_1000 / 0.001)));
  if (Math.abs(s.axes.cost - expectedAxis) > 1e-9) fail(`Cost axis does not follow from the cost: ${s.key}`);
  for (const o of ['A', 'B', 'C']) {
    const { weights, intelligence_floor: floor } = artifact.options[o];
    const ax = { intelligence: s.axes.intelligence, calibration: s.axes.calibration, speed: s.axes.speed, cost: s.axes.cost };
    if (Object.values(ax).some(v => !(v > 0))) continue;
    const wsum = Object.values(weights).reduce((t, w) => t + w, 0);
    const h = wsum / Object.entries(weights).reduce((t, [a, w]) => t + w / ax[a], 0);
    const composite = h * Math.min(1, ax.intelligence / floor) ** 2 * Math.min(1, ax.speed / 50) ** 2 * Math.min(1, ax.cost / 50) ** 2;
    if (Math.abs(composite - s.scores[o]) > 1e-9) fail(`composite ${o} does not follow from the axes: ${s.key}`);
  }
}

export function validateJevbenchV1630Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.30' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.29' || previous.proof?.revision !== 'v1.6.29') fail('validated v1.6.29 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.29', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.30' || artifact.run_kind !== 'regular-queue' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  if (!sameSet(allKeys, [...V1630_CARRIED_KEYS, ...V1630_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort: no row is added or removed');
  if (artifact.systems.length !== previous.artifact.systems.length) fail('no row is added or removed');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked) fail('ranked row count');
  const regularKeys = [...V1630_CARRIED_KEYS];
  const unrankedKeys = [...V1630_UNRANKED_CARRIED_KEYS];
  if (!sameSet(V1630_UNRANKED_CARRIED_KEYS, V1630_CARRIED_KEYS.filter(k => !prior.get(k)?.ranked))) fail('carried unranked set');
  const unpricedKeys = V1630_CARRIED_KEYS.filter(k => prior.get(k).cost.kind === 'unpriced');
  if (unpricedKeys.length !== 9 || !sameSet([...unpricedKeys, ...V1630_RECOSTED_KEYS], V1630_CARRIED_KEYS)) fail('48 token-priced rows re-costed and 9 unpriced rows unchanged');

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1630_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    if (s.v16?.lane !== prior.get(s.key).v16.lane) fail(`lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.full_coverage !== true) fail(`full coverage ${s.key}`);
    const unpriced = s.cost?.kind === 'unpriced';
    if (unpriced !== (prior.get(s.key).cost.kind === 'unpriced')) fail(`only a row with a stated unpriced ruling may be unpriced: ${s.key}`);
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
    if (!unpriced && s.cost.usd_per_1000 > V1630_COST_CAP && !V1630_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- no new row, and the inherited provenance is unchanged -------------------------------------
  same(proof.new_rows, previous.proof.new_rows, 'inherited new-row provenance unchanged (no row is added)');
  same(proof.repriced_rows, previous.proof.repriced_rows, 'inherited repriced rows unchanged');
  same(proof.vendor_status, previous.proof.vendor_status, 'inherited vendor status unchanged');

  // --- the common cost basis ---------------------------------------------------------------------
  const cb = artifact.v16?.cost_basis;
  if (cb?.file_sha256 !== V1630_COST_BASIS_SHA256 || cb.n_excluded !== V1630_N_LEFT_OUT || typeof cb.rule !== 'string' || !cb.rule.startsWith('v1.6.1 common cost basis applied to this draw')
      || !cb.rule.includes('1,485') || !cb.rule.includes('max_tokens_exceeded')) fail('the results carry the cost basis the scorer ran with');
  const costBasisNote = `COMMON COST BASIS (v1.6.30): cost per 1,000 decisions is computed on the common 1,485 items of this draw, leaving out the 15 very long items (at least 76,358 input tokens as counted by the rows that answered them). They are the 15 items the Jev reference refused with max_tokens_exceeded, which the other rows that did not answer them refused or failed on;`;
  for (const key of V1630_RECOSTED_KEYS) {
    const spec = V1630_RECOST_SPEC[key], s = by.get(key), a = prior.get(key);
    if (s.cost.kind !== a.cost.kind || s.cost.usage_estimated_rows !== 0 || a.cost.usage_estimated_rows !== 0) fail(`${key} cost kind unchanged`);
    if (a.cost.usd_per_1000 !== spec.usd_all) fail(`${key}: the all-items figure is the v1.6.29 figure`);
    if (s.cost.usd_per_1000 !== spec.usd) fail(`${key}: common-basis cost pinned`);
    same(s.cost.common_basis, { n_items: V1630_N_BASIS, rule: 'common', usd_per_1000_all_items: spec.usd_all }, `${key} common basis block`);
    if (s.cost.usd_per_1000 === a.cost.usd_per_1000) fail(`${key} must be re-costed`);
    if (textSha(s.cost.basis) !== spec.basis_sha256) fail(`${key} cost basis text verbatim`);
    if (!s.cost.basis.includes(costBasisNote) || !s.cost.basis.includes(`USD ${spec.usd.toFixed(6)} per 1,000 decisions`) || !s.cost.basis.includes(`${spec.usd_all.toFixed(6)} over all 1,500 items`)) fail(`${key} cost basis states the common-basis figure and the all-items figure`);
    if (/full 1,500|Full 1,500|1,500-row|1,500-item denominator/.test(s.cost.basis)) fail(`${key} cost basis still states the all-items basis as the cost basis`);
    const over = s.cost.basis.includes('OVER THE OFFICIAL COST CAP');
    if (V1630_CAP_ENTRANTS.includes(key)) {
      if (over || !s.cost.basis.includes('INSIDE THE OFFICIAL COST CAP') || s.cost.usd_per_1000 > V1630_COST_CAP) fail(`${key} moves inside the official cost cap`);
    } else if (over && s.cost.usd_per_1000 <= V1630_COST_CAP) fail(`${key} over-cap disclosure on a row inside the cap`);
    if (INTERNAL.test(s.cost.basis) && !INTERNAL.test(a.cost.basis)) fail(`${key}: personal e-mail or internal path in new public text`);
    followsFromCost(artifact, s);
    for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) if (!intervalOk(ci, s.scores)) fail(`re-costed row interval does not contain its own point estimate: ${key}`);
    if (s.ranked && Object.values(s.views ?? {}).some(v => !finite(v))) fail(`${key}: a ranked row publishes its presets`);
    const n = proof.recosted_rows?.[key];
    if (!n || n.no_new_measurement !== true || n.recosted_in !== 'v1.6.30' || n.raw_sha256 !== previous.proof.raw_sha256[key] || n.raw_sha256 !== proof.raw_sha256[key]
        || n.cost_basis_items !== V1630_N_BASIS || n.usd_per_1000_common !== s.cost.usd_per_1000 || n.usd_per_1000_all_items !== spec.usd_all
        || n.under_cost_cap !== (s.cost.usd_per_1000 <= V1630_COST_CAP) || Math.abs(n.cost_cap_ratio - s.cost.usd_per_1000 / V1630_COST_CAP) > 1e-12
        || n.ranked !== a.ranked || n.measured_in !== a.measured_in || n.last_measured_on !== a.last_measured_on) fail(`${key} re-cost provenance`);
    same(n.previous, { cost: a.cost, axes: a.axes, scores: a.scores, rank: a.rank, ranks: a.ranks }, `${key} previous values recorded verbatim`);
    same(n.current, { cost: s.cost, axes: s.axes, scores: s.scores, rank: s.rank, ranks: s.ranks }, `${key} current values recorded verbatim`);
  }
  if (!sameSet(Object.keys(proof.recosted_rows ?? {}), V1630_RECOSTED_KEYS)) fail('re-cost provenance coverage');
  // the cap status changes are exactly the two stated ones
  const underNow = V1630_RECOSTED_KEYS.filter(k => by.get(k).ranked && by.get(k).cost.usd_per_1000 <= V1630_COST_CAP);
  const underBefore = V1630_RECOSTED_KEYS.filter(k => prior.get(k).ranked && prior.get(k).cost.usd_per_1000 <= V1630_COST_CAP);
  if (!sameSet(underNow.filter(k => !underBefore.includes(k)), V1630_CAP_ENTRANTS) || underBefore.some(k => !underNow.includes(k))) fail('cost-cap status changes are exactly the stated ones');

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
  for (const key of V1630_CARRIED_PRELIMINARY_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the carried rows: what may differ, and nothing else --------------------------------------
  // Unpriced rows are byte-identical. A token-priced row may differ in cost (usd_per_1000, common_basis, basis text), axes.cost, scores,
  // composite_ci95, v16.ci95.composite, jevbench_score, views and its placement (rank, ranks, never ranks.capability). Intelligence,
  // Calibration, Speed, Capability, their intervals, status, speed and identity stay exact.
  const releaseNote = artifact.measurement_notes.find(x => x.startsWith('v1.6.30 APPLIES THE COMMON COST BASIS TO THIS DRAW.')) ?? '';
  const MOVABLE = ['rank', 'ranks', 'composite_ci95', 'cost', 'scores', 'jevbench_score', 'views'];
  const strip = row => {
    const copy = JSON.parse(JSON.stringify(row));
    for (const f of MOVABLE) delete copy[f];
    if (copy.axes) delete copy.axes.cost;
    if (copy.v16?.ci95) delete copy.v16.ci95.composite;
    return copy;
  };
  const rankClause = releaseNote.split('RANKS:')[1]?.split('CONFIDENCE INTERVALS:')[0] ?? '';
  let intervalMoves = 0;
  for (const key of V1630_CARRIED_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried row present ${key}`);
    if (unpricedKeys.includes(key)) { same(b, a, `an unpriced row is unchanged: ${key}`); continue; }
    same(strip(b), strip(a), `carried row differs outside cost and what follows from it: ${key}`);
    for (const f of ['intelligence', 'calibration', 'speed', 'status', 'capability']) same(b[f], a[f], `${f} is unchanged: ${key}`);
    for (const ax of ['intelligence', 'calibration', 'speed']) if (b.axes[ax] !== a.axes[ax]) fail(`axis ${ax} unchanged: ${key}`);
    same([b.v16.ci95.I, b.v16.ci95.C, b.v16.ci95.capability, b.v16.raw_on_A], [a.v16.ci95.I, a.v16.ci95.C, a.v16.ci95.capability, a.v16.raw_on_A], `I/C/Capability intervals unchanged: ${key}`);
    if (!isDeepStrictEqual([b.composite_ci95, b.v16.ci95.composite], [a.composite_ci95, a.v16.ci95.composite])) intervalMoves++;
    if (V1630_UNRANKED_CARRIED_KEYS.includes(key)) {
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    } else {
      if (b.ranks.capability !== a.ranks.capability) fail(`Capability rank does not depend on cost: ${key}`);
      for (const o of ['A', 'B', 'C']) if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
    }
  }
  if (intervalMoves !== V1630_RECOSTED_KEYS.length) fail('exactly the re-costed rows have a re-drawn composite interval');
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  for (const fragment of ['1,485', 'very long items', 'max_tokens_exceeded', V1630_COST_RULE_GENERAL, V1630_COST_RULE_HISTORY, 'published v1.6.1 rule', 'UNCHANGED', 'refusals still count as wrong answers',
                          'Intelligence, Calibration, Speed and Capability', 'RANKS:', 'CONFIDENCE INTERVALS:', 'DIAGNOSTICS:', 'COST CAP:', ...V1630_CAP_ENTRANTS,
                          'SUPERSEDED', V1630_SUPERSEDED_COST_BASIS_SHA256.slice(0, 8), V1630_COST_BASIS_SHA256.slice(0, 8), 'NO pricing change', '6202ef78']) {
    if (!releaseNote.includes(fragment)) fail(`the release note must say: ${fragment}`);
  }
  if (INTERNAL.test(releaseNote)) fail('personal e-mail or internal path in the release note');
  if (!artifact.measurement_notes.some(x => x.includes('#18761') && x.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (artifact.G_med_api_basis_P_vs_A !== previous.artifact.G_med_api_basis_P_vs_A) fail('the API-basis diagnostic does not depend on cost');
  same(artifact.v16.equating, previous.artifact.v16.equating, 'equating does not depend on cost');
  const added = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  const boardNotes = added.filter(x => x.startsWith('Board effect'));
  const boardNote = boardNotes.length === 1 ? boardNotes[0] : '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1630_BUILD_PASS1 !== '1' : !boardNote.includes('top-five')) fail('board effect: generated top-five note required; provisional build note forbidden');
  if (artifact.G_med !== V1630_FIXED_G_MED || previous.artifact.G_med !== V1630_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  for (const f of ['draw_release', 'freeze_manifest_sha256', 'seed_commitment', 'draw_digests', 'baseline_sha256', 'a2_supplement']) same(artifact.v16?.[f], previous.artifact.v16?.[f], `draw provenance ${f}`);
  if (artifact.v16.draw_release !== V1630_DRAW_RELEASE) fail('draw identity');
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.30' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || proof.baseline_sha256 !== artifact.v16.baseline_sha256 || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  if (proof.cost_basis_sha256 !== V1630_COST_BASIS_SHA256 || proof.superseded_cost_basis_sha256 !== V1630_SUPERSEDED_COST_BASIS_SHA256
      || previous.proof.cost_basis_sha256 !== V1630_SUPERSEDED_COST_BASIS_SHA256) fail('the v1.6.10 cost-basis freeze is superseded by the v1.6.30 cost basis');
  if (proof.cost_basis?.file_sha256 !== V1630_COST_BASIS_SHA256 || proof.cost_basis.n_items !== V1630_N_BASIS || proof.cost_basis.n_left_out !== V1630_N_LEFT_OUT
      || proof.cost_basis.supersedes_sha256 !== V1630_SUPERSEDED_COST_BASIS_SHA256 || proof.cost_basis.generalised_rule !== V1630_COST_RULE_GENERAL
      || proof.cost_basis.min_input_tokens_note !== V1630_COST_RULE.min_input_tokens_note
      || proof.cost_basis.rule !== cb.rule || proof.cost_basis.priced_rows_recosted !== 48 || proof.cost_basis.unpriced_rows_unchanged !== 9) fail('proof cost-basis block');
  same(artifact.v16.draw_digests, proof.draw_digests, 'draw digests bound to the proof');
  if (proof.pricing_module_sha256 !== V1630_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V1629_PRICING_MODULE_SHA256
      || previous.proof.pricing_module_sha256 !== V1629_PRICING_MODULE_SHA256 || V1630_PRICING_MODULE_SHA256 !== V1629_PRICING_MODULE_SHA256) fail('pricing module stays in force (no re-freeze)');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  if (!hex(proof.predecessor_seal_sha256)) fail('predecessor seal binding');
  for (const k of ['refreshed_preview_go_card', 'refreshed_preview_approval', 'a2_supplement', 'scorer_sources_sha256']) same(proof[k], previous.proof[k], `inherited proof field ${k}`);
  if (typeof proof.authority !== 'string' || !proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.30:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of ['common cost basis', V1630_COST_BASIS_SHA256, V1630_SUPERSEDED_COST_BASIS_SHA256, 'SUPERSEDED', V1630_COST_RULE.relay, V1630_GO.recorded_in, V1630_COST_RULE_GENERAL,
                          'NO pricing re-freeze', '6202ef78']) {
    if (!newAuthority.includes(fragment)) fail(`new publication authority: ${fragment}`);
  }
  const marker = approvalOf(proof, artifact, boardNote, provisional);
  if (!newAuthority.includes(marker)) fail('publication approval authority binding');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), regularKeys)) fail('raw-output coverage');
  same(proof.raw_sha256, previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  const proofRows = proof.systems;
  if (!Array.isArray(proofRows) || !sameSet(proofRows.map(x => x.key), regularKeys)) fail('system proof coverage');
  const priorProof = new Map(previous.proof.systems.map(r => [r.key, r]));
  for (const x of artifact.systems) {
    if (V1630_CARRIED_PRELIMINARY_KEYS.includes(x.key)) continue;
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
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${x.key}`);
    const q = priorProof.get(x.key);
    for (const f of ['measured_by', 'source_review_sha256', 'source_review_note', 'raw_sha256', 'answered_ok']) same(p[f], q[f], `proof row provenance unchanged ${x.key}.${f}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1630_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && by.get(m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.30' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1630Dims(categories);
  if (!('topics' in categories) && !artifact.measurement_notes.some(x => x.includes('topic'))) fail('a release without the topic radar must say so in its measurement notes');
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) if (categories.lanes[key] !== previous.categories.lanes[key]) fail(`category lane ${key}`);
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
  for (const key of V1630_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1630Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1630_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1629Release(root);
  if (!previous) fail('v1.6.30 needs the published v1.6.29 release it extends');
  const previousManifest = await load(`${V1630_ROOT}/jevbench-v1.6.29-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1630Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1630Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1630Release(root)); }
  catch { log('JevBench v1.6.30 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1630BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
