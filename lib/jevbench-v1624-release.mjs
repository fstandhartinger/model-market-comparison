// v1.6.24: eight measured rows join the 26 full-draw rows of v1.6.23 on the same frozen draw.
//  * Re-measure campaign Batch A (previously evaluated systems, earlier results on retired protocols only):
//    decision2-lux-9b, imajev-2b, arsenelupin-v1.1, noma priced from frozen base-model references and ranked; imajev-9b
//    ranked OVER the official cost cap (disclosed); bongard-mini unpriced (the frozen path raises on its base), listed and
//    NOT ranked (the v1.6.18 Nimble treatment).
//  * kettei-fat, kettei-chub (Sqwish, hosted API, PAID public fast-lane orders) priced from Sqwish's public launch list
//    price through the scoped pricing re-freeze 3948e3f1 (533d80f0 + these two keys) and ranked.
// Carried rows keep every point estimate (v1.6.18/v1.6.21/v1.6.22 rules). The approval must say how it arrived:
//  * no top-five change: Florian's direct-message GO and the paid fast-lane rule, no preview card may be claimed;
//  * only the paid rows change top fives: the paid fast-lane publication exception (v1.6.13 Attest), no card claimed;
//  * a non-paid row changes a top five: a filled preview-card approval; a PLACEHOLDER build does not load.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1623Release, V1623_ROOT, V1623_FULL_KEYS, V1623_UNRANKED_CARRIED_KEYS, V1623_CARRIED_PRELIMINARY_KEYS,
         V1623_ABOVE_COST_CAP_KEYS, V1623_PRICING_MODULE_SHA256 } from './jevbench-v1623-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1624_ROOT = V1623_ROOT;
export const V1624_MANIFEST = `${V1624_ROOT}/jevbench-v1.6.24-publication.json`;
export const V1624_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1624_FILE_KEYS.map(k => [k, `${V1624_ROOT}/jevbench-v1.6.24-${k}.json`]));
/** The eight rows this release adds. */
export const V1624_PAID_KEYS = ['kettei-chub', 'kettei-fat'];
export const V1624_REMEASURED_KEYS = ['arsenelupin-v1.1', 'bongard-mini', 'decision2-lux-9b', 'imajev-2b', 'imajev-9b', 'noma'];
export const V1624_UNRANKED_NEW_KEYS = ['bongard-mini'];
export const V1624_NEW_KEYS = [...V1624_PAID_KEYS, ...V1624_REMEASURED_KEYS].sort();
export const V1624_RANKED_NEW_KEYS = V1624_NEW_KEYS.filter(k => !V1624_UNRANKED_NEW_KEYS.includes(k));
/** Every full-draw row of v1.6.23. */
export const V1624_CARRIED_KEYS = [...V1623_FULL_KEYS];
export const V1624_CARRIED_PRELIMINARY_KEYS = [...V1623_CARRIED_PRELIMINARY_KEYS];
/** Carried listed-but-not-ranked rows: reflex (#18761) and the two unpriced v1.6.22 rows. */
export const V1624_UNRANKED_CARRIED_KEYS = [...V1623_UNRANKED_CARRIED_KEYS];
export const V1624_ABOVE_COST_CAP_KEYS = [...V1623_ABOVE_COST_CAP_KEYS, 'imajev-9b'];
export const V1624_FIXED_G_MED = 9.839526770355711;
export const V1624_COST_CAP = 0.06459465517241379;
export const V1624_DRAW_RELEASE = 'v1.6-regular-20261012';
/** The pricing re-freeze of this release (533d80f0 + kettei-fat, kettei-chub in LAUNCH_LIST_PRICE_API). */
export const V1624_PRICING_MODULE_SHA256 = '3948e3f16e5959ab74bd328db17c2859d8384036cbc18e443a3dcf5a815ea4d0';
export const V1624_SQWISH_PRICING_SHA256 = '698a29e5434a5e30146c6c91c118b3aec5f5f6425cb58cec34682ed640d7895c';
export const V1624_GO_QUOTE = 'I really want all of the models we have evaluated to be online (even if they land in #5) on both JevBench and ImageJevBench';
export const V1624_GO = { channel: 'direct-message', where: 'laptop chat', date: '2026-10-16', recorded_at: '2026-10-16T12:50Z',
  recorded_in: 'DECISIONS.md 2026-10-16 12:50 UTC', quote: V1624_GO_QUOTE };
export const V1624_PAID_QUOTE = 'fast lane runs fully autonomously end-to-end incl. publication, customer mail and an @airesearch12 post when the top 5 change; paid runs no longer need his top-5 preview';
export const V1624_PAID_RULE = { rule: 'paid fast-lane publication exception', date: '2026-09-29', recorded_at: '2026-09-29 ~00:25 Berlin',
  recorded_in: 'DECISIONS.md 29 Sep 2026 ~00:25 Berlin (Florian)', quote: V1624_PAID_QUOTE,
  precedent: 'v1.6.13 attest-31b-v1.0 (paid public fast-lane order 07d13315)', orders: { 'kettei-fat': 'a87f712c', 'kettei-chub': '6e10efe6' } };
/** v1.6.23's top-five preview card; a v1.6.24 card, if one is ever needed, must be newer. */
const LAST_CARD = 17708n;
const NO_CARD_MARKER = `Florian publication approval: direct-message ${V1624_GO.recorded_at} (${V1624_GO.recorded_in}) and the paid fast-lane rule of ${V1624_PAID_RULE.date} (${V1624_PAID_RULE.recorded_in}); no top-five preview card (no top-five list changes); no button tap.`;
const NO_CARD_TEXT = 'No top-five list changes (see the board-effect note), so no top-five preview card was sent and none is claimed; the GO arrived as a direct message and no Telegram button was pressed.';
const PAID_MARKER = `Florian publication approval: direct-message ${V1624_GO.recorded_at} (${V1624_GO.recorded_in}) for the add-request rows; paid fast-lane publication exception (${V1624_PAID_RULE.recorded_in}) for the top-five changes, which come only from kettei-fat and kettei-chub; no top-five preview card; no button tap.`;
const PAID_TEXT_HEAD = 'Every top-five change comes from the two paid fast-lane rows (kettei-fat, kettei-chub; public orders a87f712c and 6e10efe6); no other new row enters or leaves any top five.';
const PAID_TEXT_TAIL = 'so no top-five preview card was sent and none is claimed, and no Telegram button was pressed.';
const NO_CHANGE_BOARD = '0 of 21 top-five lists change';
const cost = (tin, tout, pin, pout) => 1000 * (tin * pin + tout * pout) / 1e6 / 1500;   // score_v16.common_basis_usd

const A_COMMON = ['RE-MEASURED on this draw', 'custody #20150', 'deputy #20098', 'independent post-run score review', 'No paid order',
  'RTX 5090', 'not comparable to the earlier measurement', 'Evaluated pin'];
/** Each new row's identity, measurement and the SHA-256 of its published texts (cost basis, endpoint condition,
 *  not-ranked reason): the public reads exactly these, so they are pinned here. */
export const V1624_ROW_SPEC = Object.freeze({
  'decision2-lux-9b': { ranked: true, lane: 'selfhosted', kind: 'gpu', display: 'Decision 2.0 Lux 9B (vLLM-SR, Qwen3.5-9B lineage)',
    author: 'vLLM Semantic Router Team (vllm-sr)', repo: 'https://huggingface.co/vllm-sr/Decision-2.0-Lux-9B',
    model_pin: 'vllm-sr/Decision-2.0-Lux-9B@78bf3c03d9147aeb30b641edfe0e30ed04887ca5', licence: 'Apache-2.0',
    ok: 1485, status_counts: { 200: 1500 }, input_tokens: 776349, output_tokens: 0, price: { input: 0.09999999999999999, output: 0.15 }, over_cap: false,
    raw: 'e13fb2c75d4c182366e26b5205fe27f2deabaefdd80602468eb8912ed08807d9', copy: '96a345a3859577fb5ff28b1a1009e6fe1620a2a0634fcb340ec711435d3fc14c',
    custody: '#20150', texts: { cost_basis: '55c9fea986cdeb89fe4dc19bcffc22a29793a4e8db5b559c18d47f827d2114e9', endpoint_condition: '82b22ceb293671934cf81ad57d93efa847034a3eb37c166f1a7553699eb21324' },
    disclosures: [...A_COMMON, 'HTTP 200 responses whose answer could not be parsed', 'public 231 items', 'supersedes the historical v1.5 measurement',
      'Speed is a lower bound', 'e13fb2c75d4c182366e26b5205fe27f2deabaefdd80602468eb8912ed08807d9'] },
  'imajev-9b': { ranked: true, lane: 'selfhosted', kind: 'gpu', display: 'Imajev-9B (mohit67890, Qwen3.5-9B LoRA)', author: 'mohit67890',
    repo: 'https://huggingface.co/mohit67890/imajev-9b', model_pin: 'mohit67890/imajev-9b@7301600591665b941d324b1a297e097b56724f9b',
    licence: 'Apache-2.0 (adapter; base Apache-2.0)',
    ok: 1485, status_counts: { 200: 1485, 422: 15 }, input_tokens: 3010517, output_tokens: 0, price: { input: 0.09999999999999999, output: 0.15 }, over_cap: true,
    raw: 'ebf9ea8cab0bbe34973080663f0f4a8851fcd310f35a1345e1ed269e1906c4b5', copy: '90edc9548e818ddc6eb645f0e73f1446355b33b95e764462a966ef3d47b3d92e',
    custody: '#20150', texts: { cost_basis: '139463b8ffbe9a05f91b07962f9c0b5ce1bfda7614b2159d163d7e6000d3b429', endpoint_condition: '41a1712bacd08976f6d864147435d7f4b302e98d1620f6b4f4bc34132a02af7c' },
    disclosures: [...A_COMMON, 'OVER THE OFFICIAL COST CAP', 'SUM of the four option-order passes', 'INPUT-BASIS SENSITIVITY', 'reconstructed',
      'quotes JevBench ranks of its own', 'ebf9ea8cab0bbe34973080663f0f4a8851fcd310f35a1345e1ed269e1906c4b5'] },
  'imajev-2b': { ranked: true, lane: 'selfhosted', kind: 'gpu', display: 'Imajev-2B (mohit67890, Qwen3.5-2B LoRA)', author: 'mohit67890',
    repo: 'https://huggingface.co/mohit67890/imajev-2b', model_pin: 'mohit67890/imajev-2b@66e4b8c808bae45ca98bed5edd2de6323bdb0576',
    licence: 'Apache-2.0 (adapter; base Apache-2.0)',
    ok: 1485, status_counts: { 200: 1485, 422: 15 }, input_tokens: 3010517, output_tokens: 0, price: { input: 0.02, output: 0.1 }, over_cap: false,
    raw: '39022d0cb2fad4ce56c5cac0960996a3c1bc4ab6264ceb7b28857092928548f5', copy: '6259931d6f68ff5d75091f8c24e101c2d1b8fc48dbd0cc086a904c48563ea4da',
    custody: '#20150', texts: { cost_basis: 'c2158aeeb7f471989312fca84548f54f27f5ecb719434369959562c76984d436', endpoint_condition: '41a1712bacd08976f6d864147435d7f4b302e98d1620f6b4f4bc34132a02af7c' },
    disclosures: [...A_COMMON, 'SUM of the four option-order passes', 'INPUT-BASIS SENSITIVITY', 'reconstructed', 'quotes JevBench ranks of its own',
      '39022d0cb2fad4ce56c5cac0960996a3c1bc4ab6264ceb7b28857092928548f5'] },
  'arsenelupin-v1.1': { ranked: true, lane: 'selfhosted', kind: 'gpu', display: 'ArseneLupin v1.1 (IBOU-SEARCH, Qwen3.5-4B LoRA)', author: 'IBOU-SEARCH',
    repo: 'https://huggingface.co/IBOU-SEARCH/ArseneLupin-v1.1', model_pin: 'IBOU-SEARCH/ArseneLupin-v1.1@411a6aefab87a4c155372c2a0a20777c2f5e1317',
    licence: 'Apache-2.0',
    ok: 1485, status_counts: { 200: 1485, 422: 15 }, input_tokens: 1011369, output_tokens: 0, price: { input: 0.030000000000000002, output: 0.15 }, over_cap: false,
    raw: '59d02a3d7bf85d11445e4f983fb12f545aff618d22c3691b3e48c27d91c54b36', copy: '8c0bde3bc6faf59b768be089f2f1bcbbed5ed307739607e15f7edacdd47045f2',
    custody: '#20150', texts: { cost_basis: 'c262d71781ffe0e5bd673258dcd453a87178c4ae81780589d82fb56c9a6c125f', endpoint_condition: '19258a20e25f3b68877a1c74c8a6b5fe16be162342f9fe416991131a9ea4b960' },
    disclosures: [...A_COMMON, 'counted offline', 'prompt_tokens 0', 'wire-name proxy', 'Training data are undisclosed',
      '59d02a3d7bf85d11445e4f983fb12f545aff618d22c3691b3e48c27d91c54b36'] },
  'noma': { ranked: true, lane: 'selfhosted', kind: 'gpu', display: 'Noma (Blackdrome AI Labs, Qwen3.5-4B-Base derivative)', author: 'BlackdromeAILabs',
    repo: 'https://huggingface.co/BlackdromeAILabs/noma', model_pin: 'BlackdromeAILabs/noma@fac0429688a137ce451a27ad34d05e9fd47fb624',
    licence: 'MPL-2.0 (weights and code)',
    ok: 1500, status_counts: { 200: 1500 }, input_tokens: 980756, output_tokens: 0, price: { input: 0.030000000000000002, output: 0.15 }, over_cap: false,
    raw: '958af0bc05f19bab24b4975813f0b2b40209b48f0981e03baf00370ce857c05c', copy: '664b7db62501f00141742b24c3ec593dcd9ec68f0cbf36acce3e3162a2690e2d',
    custody: '#20150', texts: { cost_basis: '01ae807ddf6b3fb7b9ea7933ea22c92d8efca53686d1ea12296825e9ccdd2fd0', endpoint_condition: '26b7b02f6184602fb8b1ce2c44302828f11ed44423dc8074278eb3c75398a0cf' },
    disclosures: [...A_COMMON, 'TRUNCATES', 'MPL-2.0', 'supersedes the historical v1.5 measurement', 'Speed is a lower bound',
      '958af0bc05f19bab24b4975813f0b2b40209b48f0981e03baf00370ce857c05c'] },
  'bongard-mini': { ranked: false, lane: 'selfhosted', kind: 'gpu', display: 'Bongard-mini (AgentBull, T5Gemma-2 4B-4B)', author: 'AgentBull (@0xDing)',
    repo: 'https://huggingface.co/AgentBull/bongard-mini', model_pin: 'AgentBull/bongard-mini@c81c5b883a5983669be84be98658eac940489613',
    licence: 'Gemma terms of use',
    ok: 1485, status_counts: { 200: 1485, 400: 15 }, input_tokens: 786538, output_tokens: 0, price: null, over_cap: false,
    raw: '76b9f06e3b1d4ae8b2cd91d4730e44dc3e5453aafee51a96ecaf03e6a7fe9aae', copy: '29db8fd9c8e338aeadebaf154e56d5a6d09d1ba460c10171e17b2858278e82ae',
    custody: '#20150', reason: 'google/t5gemma-2-4b-4b',
    texts: { cost_basis: '21320fdaf9ab071a44f99a6d2e06c637b15d25f7644591097945fd13144c9c77', endpoint_condition: 'ecf80efa8cc8e4bd4cb62187cd22c841194ba2724c52c19fe559e1a83e1ca3c4',
      not_ranked_because: '9ff993dfe6a21ba65225621c38edde58db3412260b78440a54cc23088f3491a5' },
    disclosures: [...A_COMMON, 'UNPRICED', 'google/t5gemma-2-4b-4b', 'NOT RANKED', 'Gemma terms of use', 'c81c5b88',
      '76b9f06e3b1d4ae8b2cd91d4730e44dc3e5453aafee51a96ecaf03e6a7fe9aae'] },
  'kettei-fat': { ranked: true, lane: 'api', kind: 'api', display: 'kettei-fat (Sqwish)', author: 'Sqwish', repo: 'https://docs.sqwish.ai',
    model_pin: 'hosted-api:api.sqwish.ai/v1/systemone#kettei-fat', licence: 'Proprietary hosted API (no weights release)',
    ok: 1485, status_counts: { 200: 1485, 422: 15 }, input_tokens: 650605, output_tokens: 0, price: { input: 0.06, output: 0.0 }, over_cap: false, order: 'a87f712c',
    raw: 'a01bf93701251d3f085440d6aa327821d80613c865c0d717a397ca2a153e924d', copy: '3d2949448dbd7db8f422ea1ca8d3535174ce4b69901cce215925361e8f69de08',
    custody: '#20263', texts: { cost_basis: 'bf4514dcbc4eefe694ae795c50fc867f1f7ea83c4a20b58043dd8d6dc9685e84', endpoint_condition: '6caaab4b4427e1512a8c191225f4c23c58e91fabd75080375642e5f8359accd4' },
    disclosures: ['Paid public fast-lane order a87f712c', '#20263', '#20305/#20306', '`sqwish` before dispatch', '15 HTTP 422 context_too_long',
      'scored as wrong answers', 'no fallback size answered', 'no API adjustment', 'COST-CEILING SENSITIVITY', 'I-1', V1624_SQWISH_PRICING_SHA256,
      'not independently inspected', 'a01bf93701251d3f085440d6aa327821d80613c865c0d717a397ca2a153e924d'] },
  'kettei-chub': { ranked: true, lane: 'api', kind: 'api', display: 'kettei-chub (Sqwish)', author: 'Sqwish', repo: 'https://docs.sqwish.ai',
    model_pin: 'hosted-api:api.sqwish.ai/v1/systemone#kettei-chub', licence: 'Proprietary hosted API (no weights release)',
    ok: 1485, status_counts: { 200: 1485, 422: 15 }, input_tokens: 650605, output_tokens: 0, price: { input: 0.04, output: 0.0 }, over_cap: false, order: '6e10efe6',
    raw: 'a6f5eaac7938b9cc59e7a397cfa28037160c3f6ce538c1ef0734f1d956c2be52', copy: 'c6ce25fe51576843951a2209ac6232be4dd36ed6500a540fbc1d39b4272a31e8',
    custody: '#20263', texts: { cost_basis: '69d2b3dbf313796fde18857e07db94b6180141476b1a6d66d51970042b85243a', endpoint_condition: '18c12a21d1fba229ea748b396a52dae5d23ea661d81bfcb921d8a52f011cd57e' },
    disclosures: ['Paid public fast-lane order 6e10efe6', '#20263', '#20305/#20306', '`sqwish` before dispatch', '15 HTTP 422 context_too_long',
      'scored as wrong answers', 'no fallback size answered', 'no API adjustment', 'COST-CEILING SENSITIVITY', 'I-1', V1624_SQWISH_PRICING_SHA256,
      'not independently inspected', 'a6f5eaac7938b9cc59e7a397cfa28037160c3f6ce538c1ef0734f1d956c2be52'] },
});
export const V1624_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1624Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1624_BASE_DIMS] : [...V1624_BASE_DIMS];
}

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const textSha = v => typeof v === 'string' ? createHash('sha256').update(v, 'utf8').digest('hex') : null;
const fail = message => { throw new Error(`JevBench v1.6.24: ${message}`); };
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
  const m = boardNote.match(/Top-five changes caused by: ([^.(]+)/);
  return m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : [];
}

/** How the publication approval arrived. Returns the marker the authority must carry. */
function approvalOf(proof, artifact, boardNote, provisional) {
  const pa = proof.publication_approval;
  same(pa?.go, V1624_GO, 'publication GO provenance');
  same(pa?.paid_fast_lane, V1624_PAID_RULE, 'paid fast-lane rule provenance');
  // A build made before a preview card was answered carries PLACEHOLDER fields; they are rejected wherever they appear.
  if (JSON.stringify(proof).includes('PLACEHOLDER') || JSON.stringify(artifact).includes('PLACEHOLDER')) fail('approval placeholder not filled');
  const notes = artifact.measurement_notes.filter(n => n.startsWith('Publication of v1.6.24:'));
  if (notes.length !== 1) fail('public note must describe how the approval arrived');
  const note = notes[0];
  if (!note.includes(V1624_GO_QUOTE) || !note.includes(V1624_GO.recorded_in) || !note.includes(V1624_PAID_RULE.recorded_in)) fail('public note must describe how the approval arrived');
  const noChange = boardNote.includes(NO_CHANGE_BOARD);
  const causes = boardCauses(boardNote);
  const claimsCard = /Telegram card #\d/.test(note) || /selected "[^"]*" on Telegram card/.test(note);
  if (pa.top_five_effect === 'none') {
    // No top five changes: no preview card exists, and none may be claimed anywhere.
    if (!provisional && !noChange) fail('a no-card approval needs the generated no-change board note');
    if (pa.top_five_preview !== null || pa.button_tap !== false || Object.keys(pa).sort().join() !== 'button_tap,go,paid_fast_lane,top_five_effect,top_five_preview') fail('no-card approval provenance');
    if (!note.includes(NO_CARD_TEXT) || claimsCard) fail('public note must not claim a preview card');
    return NO_CARD_MARKER;
  }
  if (noChange || provisional || !causes.length) fail('approval and top-five effect disagree');
  same([...pa.top_five_changed_by ?? []].sort(), [...causes].sort(), 'the approval must name exactly the rows the board note says changed the top fives');
  if (pa.top_five_effect === 'changes-paid-only') {
    // Only the paid fast-lane rows change top fives: Florian's standing paid rule, no preview card (v1.6.13 Attest).
    if (!causes.every(k => V1624_PAID_KEYS.includes(k)) || !boardNote.includes('(paid fast-lane rows only)')) fail('the paid fast-lane exception covers only top-five changes caused by the paid rows');
    if (pa.top_five_preview !== null || pa.button_tap !== false
        || Object.keys(pa).sort().join() !== 'button_tap,go,paid_fast_lane,top_five_changed_by,top_five_effect,top_five_preview') fail('paid fast-lane approval provenance');
    if (!note.includes(PAID_TEXT_HEAD) || !note.includes(PAID_TEXT_TAIL) || !note.includes(V1624_PAID_QUOTE) || claimsCard) fail('public note must state the paid fast-lane exception and claim no card');
    return PAID_MARKER;
  }
  if (pa.top_five_effect !== 'changes' || causes.every(k => V1624_PAID_KEYS.includes(k))) fail('approval and top-five effect disagree');
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

export function validateJevbenchV1624Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.24' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.23' || previous.proof?.revision !== 'v1.6.23') fail('validated v1.6.23 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.23', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.24' || artifact.run_kind !== 'regular-queue' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  const newKeys = allKeys.filter(k => !V1624_CARRIED_KEYS.includes(k) && !V1624_CARRIED_PRELIMINARY_KEYS.includes(k)).sort();
  if (!sameSet(newKeys, V1624_NEW_KEYS)) fail(`exactly the added rows: ${newKeys}`);
  if (!sameSet(allKeys, [...V1624_CARRIED_KEYS, ...V1624_NEW_KEYS, ...V1624_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + V1624_NEW_KEYS.length) fail('exactly the added rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + V1624_RANKED_NEW_KEYS.length) fail('ranked row count');
  const regularKeys = [...V1624_CARRIED_KEYS, ...V1624_NEW_KEYS];
  const unrankedKeys = [...V1624_UNRANKED_CARRIED_KEYS, ...V1624_UNRANKED_NEW_KEYS];
  if (!sameSet(V1624_UNRANKED_CARRIED_KEYS, V1624_CARRIED_KEYS.filter(k => !prior.get(k)?.ranked))) fail('carried unranked set');

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1624_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const spec = V1624_ROW_SPEC[s.key];
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
    if (!unpriced && s.cost.usd_per_1000 > V1624_COST_CAP && !V1624_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the new rows ---------------------------------------------------------------------------
  const inherited = Object.keys(previous.proof.new_rows ?? {});
  if (!sameSet(Object.keys(proof.new_rows ?? {}), [...inherited, ...V1624_NEW_KEYS])) fail('new-row provenance coverage');
  for (const k of inherited) same(proof.new_rows[k], previous.proof.new_rows[k], `inherited new-row provenance ${k}`);
  for (const [key, spec] of Object.entries(V1624_ROW_SPEC)) {
    const s = by.get(key), n = proof.new_rows[key];
    const paid = V1624_PAID_KEYS.includes(key);
    for (const field of ['display', 'author', 'repo', 'licence', 'model_pin']) same(s[field], spec[field], `${key} registry ${field} verbatim`);
    if (textSha(s.cost?.basis) !== spec.texts.cost_basis) fail(`${key} registry cost_basis verbatim`);
    if (textSha(s.endpoint_condition) !== spec.texts.endpoint_condition) fail(`${key} registry endpoint_condition verbatim`);
    if (!spec.ranked && textSha(s.not_ranked_because) !== spec.texts.not_ranked_because) fail(`${key} registry ranking reason verbatim`);
    if (s.measured_in !== 'v1.6.24' || s.measurement_date_status !== 'measured' || s.last_measured_on !== '2026-10-16') fail(`${key} measurement stamp`);
    if (s.endpoint_kind !== spec.kind || s.api_flag !== (spec.kind === 'api') || s.v16.set !== 'S+P') fail(`${key} lane/endpoint kind`);
    if (spec.kind === 'api' ? (s.v16.full_set_api !== true || s.v16.equated !== null || s.speed?.adjustment !== 'none (API)')
                            : s.speed?.adjustment !== 'x2 + 0.15 s (assumption, not measured)') fail(`${key} latency adjustment`);
    if ((s.paid_fast_lane === true) !== paid) fail(`${key} paid fast-lane flag`);
    if (s.status.answered_ok !== spec.ok) fail(`${key} completeness`);
    if (spec.ranked) {
      const usd = cost(spec.input_tokens, spec.output_tokens, spec.price.input, spec.price.output);
      if (s.ranked !== true || s.listing !== 'ranked' || s.not_ranked_because || s.ranked_false_reason) fail(`${key} is ranked`);
      if (s.cost?.kind !== 'estimate' || s.cost.usd_per_1000 !== usd || (usd > V1624_COST_CAP) !== spec.over_cap || s.cost.usage_estimated_rows !== 0) fail(`${key} cost: tariff x own tokens, cap side as stated`);
      if (s.cost.basis.includes('OVER THE OFFICIAL COST CAP') !== spec.over_cap) fail(`${key} over-cap disclosure`);
      if (paid && (!s.cost.basis.includes(V1624_SQWISH_PRICING_SHA256.slice(0, 8)) || !s.cost.basis.includes('I-1'))) fail(`${key} cost basis names its evidence and interpretation`);
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
        || n.ar_scoring_copy_sha256 !== (paid ? null : spec.copy) || n.measured_in !== 'v1.6.24'
        || n.rows !== 1500 || n.answered_ok !== spec.ok || n.ranked !== spec.ranked || n.paid_fast_lane !== paid || n.endpoint_kind !== spec.kind
        || n.treatment !== (spec.ranked ? (spec.over_cap ? 'ranked_over_cap' : 'ranked') : 'listed_unpriced') || n.pricing_module_sha256 !== V1624_PRICING_MODULE_SHA256
        || !String(n.custody).includes(spec.custody) || n.measured_on !== '2026-10-16') fail(`${key} new-row provenance`);
    if (paid ? (n.order !== spec.order || n.exposure_logged_to_provider !== 'sqwish' || n.refused_http_422 !== 15 || !hex(n.scoring_copy_receipt_sha256)
                || n.price_source?.saved_copy_sha256 !== V1624_SQWISH_PRICING_SHA256 || n.pre_score_review_sha256 !== null)
             : (!hex(n.pre_score_review_sha256) || !hex(n.post_score_review_sha256) || n.remeasure?.custody !== '#20150' || n.remeasure?.gpu !== 'deputy #20098')) fail(`${key} measurement provenance`);
    if (n.input_tokens !== spec.input_tokens || n.output_tokens !== spec.output_tokens) fail(`${key} usage`);
    same(n.status_counts, spec.status_counts, `${key} HTTP status counts`);
    if (spec.ranked) {
      same(n.price_per_million, spec.price, `${key} tariff`);
      const recomputed = cost(n.input_tokens, n.output_tokens, n.price_per_million.input, n.price_per_million.output);
      if (n.usd_per_1000 !== recomputed || n.usd_per_1000 !== s.cost.usd_per_1000 || n.under_cost_cap !== !spec.over_cap
          || Math.abs(n.cost_cap_ratio - n.usd_per_1000 / V1624_COST_CAP) > 1e-12) fail(`${key} cost binding`);
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
  for (const key of V1624_CARRIED_PRELIMINARY_KEYS) {
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
  const releaseNote = artifact.measurement_notes.find(x => x.startsWith('v1.6.24 ADDS ')) ?? '';
  const clauseStart = releaseNote.indexOf('Carried rows whose intervals moved:');
  if (clauseStart < 0) fail('the release note must carry the "Carried rows whose intervals moved:" clause');
  const intervalNames = releaseNote.slice(clauseStart + 'Carried rows whose intervals moved:'.length).split('DIAGNOSTICS')[0]
    .split(/[,\s]+/).map(x => x.replace(/\.$/, ''));
  const rankClause = releaseNote.split('RANKS:')[1]?.split('CONFIDENCE INTERVALS:')[0] ?? '';
  for (const key of V1624_CARRIED_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried row present ${key}`);
    const rawOnAMoved = JSON.stringify(a.v16?.raw_on_A) !== JSON.stringify(b.v16?.raw_on_A);
    if (rawOnAMoved && !diagnosticMoved) fail(`raw_on_A moved while the API-basis diagnostic did not: ${key}`);
    if (rawOnAMoved && !releaseNote.includes(`${key}: intelligence`)) fail(`a moved raw_on_A must name its row in the notes: ${key}`);
    same(strip(b, rawOnAMoved), strip(a, rawOnAMoved), `carried row differs outside rank/ranks/composite_ci95/v16.ci95${rawOnAMoved ? '/v16.raw_on_A' : ''}: ${key}`);
    if (V1624_UNRANKED_CARRIED_KEYS.includes(key)) {
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    }
    const intervalMoved = !isDeepStrictEqual([b.composite_ci95, b.v16?.ci95], [a.composite_ci95, a.v16?.ci95]);
    if (intervalMoved && !intervalNames.includes(key)) fail(`a moved carried interval must name its row in the release note: ${key}`);
    for (const ci of (b.cost.kind === 'unpriced' ? [] : [b.composite_ci95, b.v16?.ci95?.composite])) {
      if (!intervalOk(ci, b.scores)) fail(`carried row interval does not contain its own point estimate: ${key}`);
    }
    if (a.ranked) {
      for (const o of ['A', 'B', 'C', 'capability']) {
        const above = V1624_RANKED_NEW_KEYS.filter(nk => (o === 'capability' ? by.get(nk).capability > b.capability
          : artifact.board[o].order.indexOf(nk) < artifact.board[o].order.indexOf(key))).length;
        if (b.ranks[o] !== a.ranks[o] + above) fail(`carried rank ${o} moved by more than the rows that joined above it: ${key}`);
        if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
      }
    }
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!releaseNote.includes('RANKS') || !releaseNote.includes('CONFIDENCE INTERVALS') || !releaseNote.includes('DIAGNOSTICS')
      || !V1624_NEW_KEYS.every(k => releaseNote.includes(k))) fail('the release note must count rank, interval and diagnostic moves');
  if (!artifact.measurement_notes.some(x => x.includes('#18761') && x.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (diagnosticMoved) {
    const values = [previous.artifact.G_med_api_basis_P_vs_A, artifact.G_med_api_basis_P_vs_A].map(String);
    if (!artifact.measurement_notes.some(x => x.includes('API-basis median diagnostic') && values.every(v => x.includes(v)))) fail('a moved API-basis diagnostic must be disclosed with both values');
  }
  const added = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  const boardNotes = added.filter(x => x.startsWith('Board effect'));
  const boardNote = boardNotes.length === 1 ? boardNotes[0] : '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1624_BUILD_PASS1 !== '1'
      : !(boardNote.includes('top-five') && V1624_RANKED_NEW_KEYS.every(k => boardNote.includes(k)))) fail('board effect: generated top-five note required; provisional build note forbidden');
  if (artifact.G_med !== V1624_FIXED_G_MED || previous.artifact.G_med !== V1624_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  for (const f of ['draw_release', 'freeze_manifest_sha256', 'seed_commitment', 'draw_digests', 'baseline_sha256', 'a2_supplement']) same(artifact.v16?.[f], previous.artifact.v16?.[f], `draw provenance ${f}`);
  if (artifact.v16.draw_release !== V1624_DRAW_RELEASE) fail('draw identity');
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.24' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || proof.baseline_sha256 !== artifact.v16.baseline_sha256
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  same(artifact.v16.draw_digests, proof.draw_digests, 'draw digests bound to the proof');
  if (proof.pricing_module_sha256 !== V1624_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V1623_PRICING_MODULE_SHA256
      || previous.proof.pricing_module_sha256 !== V1623_PRICING_MODULE_SHA256) fail('pricing re-freeze binding');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  for (const k of ['repriced_rows', 'refreshed_preview_go_card', 'refreshed_preview_approval', 'a2_supplement', 'scorer_sources_sha256']) same(proof[k], previous.proof[k], `inherited proof field ${k}`);
  if (typeof proof.authority !== 'string' || !proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.24:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of [...V1624_NEW_KEYS, '#20322', '#20098', '#20150', '#20263', '#20305/#20306', 'a87f712c', '6e10efe6', 'RANKED', 'NOT ranked',
    'over the official cap', '`sqwish` before dispatch', '3948e3f1', 'PAID', 'no paid order', V1624_GO_QUOTE, '2026-10-16 12:50 UTC', V1624_PAID_RULE.recorded_in]) {
    if (!newAuthority.includes(fragment)) fail(`new publication authority: ${fragment}`);
  }
  const marker = approvalOf(proof, artifact, boardNote, provisional);
  if (!newAuthority.includes(marker)) fail('publication approval authority binding');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), regularKeys)) fail('raw-output coverage');
  same(Object.fromEntries(V1624_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  const proofRows = proof.systems;
  if (!Array.isArray(proofRows) || !sameSet(proofRows.map(x => x.key), regularKeys)) fail('system proof coverage');
  const priorProof = new Map(previous.proof.systems.map(r => [r.key, r]));
  for (const x of artifact.systems) {
    if (V1624_CARRIED_PRELIMINARY_KEYS.includes(x.key)) continue;
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
    if (V1624_ROW_SPEC[x.key] && p.source_review_sha256 !== proof.new_rows[x.key].pre_score_review_sha256) fail(`independent pre-score review binding ${x.key}`);
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${x.key}`);
    const q = priorProof.get(x.key);
    if (q) for (const f of ['measured_by', 'source_review_sha256', 'source_review_note', 'raw_sha256', 'answered_ok']) same(p[f], q[f], `proof row provenance unchanged ${x.key}.${f}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1624_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && by.get(m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.24' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1624Dims(categories);
  if (!('topics' in categories) && !artifact.measurement_notes.some(x => x.includes('topic'))) fail('a release without the topic radar must say so in its measurement notes');
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) if (categories.lanes[key] !== (V1624_ROW_SPEC[key]?.lane ?? previous.categories.lanes[key])) fail(`category lane ${key}`);
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
  for (const key of V1624_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1624Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1624_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1623Release(root);
  if (!previous) fail('v1.6.24 needs the published v1.6.23 release it extends');
  const previousManifest = await load(`${V1624_ROOT}/jevbench-v1.6.23-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1624Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1624Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1624Release(root)); }
  catch { log('JevBench v1.6.24 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1624BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
