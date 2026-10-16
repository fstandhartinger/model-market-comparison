// v1.6.26: thirteen re-measured rows join the 38 full-draw rows of v1.6.25 on the same frozen draw, and nimble-v4-max is re-priced.
//  * Re-measure campaign Batch BCD (add-requests run 129, handoff board #20455; custody #20324): blink-4b, compass-0.2.0,
//    jebadiah-9b-v2, jpt-4b, ryotide-qwen, shisa-de-1 ranked; jeb-35b-a3b and nagi-enormous ranked OVER the cost cap
//    (disclosed); jevora-9b-v1, kev-9b-v2, nagi-huge, ryotide-gemma, tde-general-large listed but not ranked (no listing
//    decision for their bases in the frozen pricing module).
//  * nimble-v4-max (Bespoke Labs, hosted API; no new measurement): Bespoke's public price fell from USD 0.09 to 0.04 per M
//    input; re-priced from its own tokens through the scoped pricing re-freeze f661456e (32556e54 + that one documented
//    tariff; comments only). Only its cost and what follows from it may differ (the v1.6.20 / v1.6.23 repriced-row rule).
//  * nimble-v4 is deprecated by the vendor (told us in a chat, 16 Oct 2026); its row is unchanged (ranked, priced). The vendor
//    statement is a proof field, a release note and a listing note in the live merged-board row data
//    (data/jevbench-listing-corrections.json; the current board UI does not render it).
// Carried rows keep every point estimate. The approval must say how it arrived:
//  * no top-five change: Florian's direct-message GO, no preview card may be claimed;
//  * a top five changes: a filled preview-card approval; a PLACEHOLDER build does not load.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1625Release, V1625_ROOT, V1625_CARRIED_KEYS, V1625_NEW_KEYS, V1625_UNRANKED_CARRIED_KEYS, V1625_UNRANKED_NEW_KEYS,
         V1625_CARRIED_PRELIMINARY_KEYS, V1625_ABOVE_COST_CAP_KEYS, V1625_PRICING_MODULE_SHA256 } from './jevbench-v1625-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1626_ROOT = V1625_ROOT;
export const V1626_MANIFEST = `${V1626_ROOT}/jevbench-v1.6.26-publication.json`;
export const V1626_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1626_FILE_KEYS.map(k => [k, `${V1626_ROOT}/jevbench-v1.6.26-${k}.json`]));
/** The thirteen rows this release adds (re-measure campaign Batch BCD). */
export const V1626_RANKED_NEW_KEYS = ['blink-4b', 'compass-0.2.0', 'jeb-35b-a3b', 'jebadiah-9b-v2', 'jpt-4b', 'nagi-enormous', 'ryotide-qwen', 'shisa-de-1'];
export const V1626_UNRANKED_NEW_KEYS = ['jevora-9b-v1', 'kev-9b-v2', 'nagi-huge', 'ryotide-gemma', 'tde-general-large'];
export const V1626_NEW_KEYS = [...V1626_RANKED_NEW_KEYS, ...V1626_UNRANKED_NEW_KEYS].sort();
export const V1626_OVER_CAP_NEW_KEYS = ['jeb-35b-a3b', 'nagi-enormous'];
/** The carried row re-priced in this release (no new measurement). */
export const V1626_REPRICED_KEYS = ['nimble-v4-max'];
export const V1626_DEPRECATED_KEY = 'nimble-v4';
export const V1626_DEPRECATION_TEXT = 'Bespoke told us in a chat on 16 Oct 2026 that Nimble-v4 is deprecated; its pricing page still lists it (only nimble-v3 is marked deprecated there)';
/** Every full-draw row of v1.6.25. */
export const V1626_CARRIED_KEYS = [...V1625_CARRIED_KEYS, ...V1625_NEW_KEYS];
export const V1626_CARRIED_PRELIMINARY_KEYS = [...V1625_CARRIED_PRELIMINARY_KEYS];
/** Carried listed-but-not-ranked rows: reflex (#18761), the two unpriced v1.6.22 rows and the unpriced v1.6.24 bongard-mini. */
export const V1626_UNRANKED_CARRIED_KEYS = [...V1625_UNRANKED_CARRIED_KEYS, ...V1625_UNRANKED_NEW_KEYS];
/** nimble-v4-max leaves this list: at the new tariff it is inside the cap. */
export const V1626_ABOVE_COST_CAP_KEYS = [...V1625_ABOVE_COST_CAP_KEYS.filter(k => !V1626_REPRICED_KEYS.includes(k)), ...V1626_OVER_CAP_NEW_KEYS];
export const V1626_FIXED_G_MED = 9.839526770355711;
export const V1626_COST_CAP = 0.06459465517241379;
export const V1626_DRAW_RELEASE = 'v1.6-regular-20261012';
/** The pricing re-freeze of this release (32556e54 + the nimble-v4-max tariff documentation; identical code). */
export const V1626_PRICING_MODULE_SHA256 = 'f661456e3edf0497239ef29431569c65bc0f34d9969495c03e7820e4fd51fd15';
export const V1626_NIMBLE_PRICING_SHA256 = '4d46184d27edc66a08e77f06505084a6e7acfeba4cb952830391aec7ca892576';
export const V1626_NIMBLE_PREVIOUS_PRICING_SHA256 = '03b0626140b8fb0a80f48754742bd4d553d5632ff78ce5790770a12e2bd58562';
export const V1626_GO_QUOTE = 'I really want all of the models we have evaluated to be online (even if they land in #5) on both JevBench and ImageJevBench';
export const V1626_GO = { channel: 'direct-message', where: 'laptop chat', date: '2026-10-16', recorded_at: '2026-10-16T12:50Z',
  recorded_in: 'DECISIONS.md 2026-10-16 12:50 UTC', quote: V1626_GO_QUOTE };
export const V1626_REPRICE_AUTH = { key: 'nimble-v4-max', source: 'Bespoke Labs public pricing page docs.bespokelabs.ai/nimble/pricing',
  fetched: '2026-10-16T21:40Z', saved_copy_sha256: V1626_NIMBLE_PRICING_SHA256, previous_fetched: '2026-10-16T15:58Z',
  previous_saved_copy_sha256: V1626_NIMBLE_PREVIOUS_PRICING_SHA256,
  relay: 'board #20466 (CoS, 16 Oct 2026 21:38Z: re-price v4-max, mark v4 deprecated, top-5 rule applies)',
  vendor_message: 'Bespoke Labs, X group chat, 16 Oct 2026 ~20:23Z (relayed on board #20466)' };
/** The latest Telegram card of this release job (#17727); a v1.6.26 preview card, if one is needed, must be newer. */
const LAST_CARD = 17727n;
const NO_CARD_MARKER = `Florian publication approval: direct-message ${V1626_GO.recorded_at} (${V1626_GO.recorded_in}); the nimble-v4-max re-price follows the vendor's public price (${V1626_REPRICE_AUTH.relay}); no top-five preview card (no top-five list changes); no button tap.`;
const NO_CARD_TEXT = 'No top-five list changes (see the board-effect note), so no top-five preview card was sent and none is claimed; the GO arrived as a direct message and no Telegram button was pressed.';
const NO_CHANGE_BOARD = '0 of 21 top-five lists change';
const cost = (tin, tout, pin, pout) => 1000 * (tin * pin + tout * pout) / 1e6 / 1500;   // score_v16.common_basis_usd

/** Each new row's identity, measurement and the SHA-256 of its published texts (cost basis, endpoint condition, ranking
 *  reason): the public reads exactly these, so they are pinned here; and the re-priced row's tariff, tokens and texts. */
export const V1626_ROW_SPEC = Object.freeze({
  "blink-4b": {"ranked": true, "lane": "selfhosted", "kind": "gpu", "display": "blink-4b (thegovind, Qwen3.5-4B derivative)", "author": "thegovind", "repo": "https://huggingface.co/thegovind/blink-4b", "model_pin": "thegovind/blink-4b@c243abdd2d79478db510dcdc60a88087c18547c0", "licence": "other (weights non-commercial, research and evaluation only)", "ok": 1500, "status_counts": {"200": 1500}, "input_tokens": 1994295, "output_tokens": 0, "price": {"input": 0.030000000000000002, "output": 0.15}, "over_cap": false, "raw": "9c43d66d5542190054303d28fd28c0d22eb13b20f601c7116bbdebce6d1efb93", "copy": "9c43d66d5542190054303d28fd28c0d22eb13b20f601c7116bbdebce6d1efb93", "custody": "#20324", "texts": {"cost_basis": "67220136ce8b88335b4d320a046a1920258d6f59233fe4c8589d4410a676b047", "endpoint_condition": "72bfd1fab5b5171acbc303c0a04e43987e60f39a5305e797526073ee692f0f36"}, "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "non-commercial", "It answers all 15 long items", "issue #81", "9c43d66d5542190054303d28fd28c0d22eb13b20f601c7116bbdebce6d1efb93"]},
  "compass-0.2.0": {"ranked": true, "lane": "selfhosted", "kind": "gpu", "display": "Compass 0.2.0 (adimyth, Qwen3.5-4B LoRA)", "author": "adimyth", "repo": "https://huggingface.co/adimyth/compass-lora-v2", "model_pin": "adimyth/compass-lora-v2@bfa8af07916df491fde171d1da0d6d761304f2f3", "licence": "Apache-2.0", "ok": 1500, "status_counts": {"200": 1500}, "input_tokens": 2466776, "output_tokens": 0, "price": {"input": 0.030000000000000002, "output": 0.15}, "over_cap": false, "raw": "17c8bf62c00debaa0025b5a86468e78ff79b4955f5a86cb04bed443ed5d14fbf", "copy": "17c8bf62c00debaa0025b5a86468e78ff79b4955f5a86cb04bed443ed5d14fbf", "custody": "#20324", "texts": {"cost_basis": "23e3f3a145b7b1458fdb489fbd5af1b809e35ab30b9cadc862d7ec19f997774e", "endpoint_condition": "4cad83b26d64568d1103060edbcbccfb40e196edbdb7290d7c5177022f58e21c"}, "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "It answers all 15 long items", "Speed is a lower bound", "17c8bf62c00debaa0025b5a86468e78ff79b4955f5a86cb04bed443ed5d14fbf"]},
  "jeb-35b-a3b": {"ranked": true, "lane": "selfhosted", "kind": "gpu", "display": "JEB-35B-A3B (szybkie.ai, Qwen3.6-35B-A3B LoRA)", "author": "szybkie-ai", "repo": "https://huggingface.co/szybkie-ai/jeb-35b-a3b", "model_pin": "szybkie-ai/jeb-35b-a3b@dfac7afaed21ffff638ae4588402db560376aeac", "licence": "Apache-2.0", "ok": 1485, "status_counts": {"200": 1485, "529": 15}, "input_tokens": 781043, "output_tokens": 1485, "price": {"input": 0.15, "output": 1.0}, "over_cap": true, "raw": "b2128496c5cb3738eaaa034b2c2d377c679a91f44829bccb3c22082da9dd9dbf", "copy": "b2128496c5cb3738eaaa034b2c2d377c679a91f44829bccb3c22082da9dd9dbf", "custody": "#20324", "texts": {"cost_basis": "80f9bcc1b68a6e7b0a1917fbb2ad0dd76002399c5bbbcaf2d6dec3db96261d5c", "endpoint_condition": "b2217985d36d2bcef967e6f5a031ca73d234efb1e6b4f05eed5ad04af7cefbdd"}, "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "HTTP 529", "OVER THE OFFICIAL COST CAP", "outside the official cost-capped views", "FP8", "b2128496c5cb3738eaaa034b2c2d377c679a91f44829bccb3c22082da9dd9dbf"]},
  "jebadiah-9b-v2": {"ranked": true, "lane": "selfhosted", "kind": "gpu", "display": "Jebadiah 9B v2 (Frontier Infra, Qwen3.5-9B LoRA)", "author": "frontier-infra", "repo": "https://huggingface.co/frontier-infra/jebadiah-9b-v2", "model_pin": "frontier-infra/jebadiah-9b-v2@bc63609af6434fdf18ed8b89e19df96db5a24944", "licence": "Apache-2.0", "ok": 1485, "status_counts": {"200": 1485, "422": 15}, "input_tokens": 750303, "output_tokens": 1485, "price": {"input": 0.09999999999999999, "output": 0.15}, "over_cap": false, "raw": "79bf46d6529f270c0ada432c5141b9a772a7e74aede74886c70371b4c0558c36", "copy": "79bf46d6529f270c0ada432c5141b9a772a7e74aede74886c70371b4c0558c36", "custody": "#20324", "texts": {"cost_basis": "6cc6bccd859e6996d46524f01df35f6bb4d84695986a5208ab89513355fab907", "endpoint_condition": "828ec51b6e7ecfb54958592e9421723e1f8c538a0e6d858074e42355f09db83e"}, "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "8,192-token prompt limit", "temperatures.json", "79bf46d6529f270c0ada432c5141b9a772a7e74aede74886c70371b4c0558c36"]},
  "jevora-9b-v1": {"ranked": false, "lane": "selfhosted", "kind": "gpu", "display": "jevora-9b-v1 (kadirbekovvv / doxanocap, Qwen3.5-9B-Base derivative)", "author": "kadirbekovvv", "repo": "https://huggingface.co/kadirbekovvv/jevora-9b-v1", "model_pin": "kadirbekovvv/jevora-9b-v1@c644b9c7a3b67b7acc3279523e3bee69a4be473d", "licence": "Apache-2.0", "ok": 1452, "status_counts": {"422": 48, "None": 1452}, "input_tokens": 681813, "output_tokens": 0, "price": null, "over_cap": false, "raw": "122f58c4086b5e7a9f843bedd23f5c1f90fd056e66f12776bb4ea02c87765e03", "copy": "122f58c4086b5e7a9f843bedd23f5c1f90fd056e66f12776bb4ea02c87765e03", "custody": "#20324", "texts": {"cost_basis": "9fa2b0a172c841b7217a36018eb3454ac9cdce5e168dfd7fc71b1aac2e8fb297", "endpoint_condition": "f75132eea069e1d9ccf64f12189faa624aeb3d86c53ea1528adc633811406395", "not_ranked_because": "2e360891b3f8acc1221321d254367e5ef5525434540d727d24c2f08d34790d10"}, "reason": "unpriced: the frozen pricing path has no market-listing deci", "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "UNMERGED", "1,024-token window", "48 failed requests", "NOT RANKED", "Qwen/Qwen3.5-9B-Base", "122f58c4086b5e7a9f843bedd23f5c1f90fd056e66f12776bb4ea02c87765e03"]},
  "jpt-4b": {"ranked": true, "lane": "selfhosted", "kind": "gpu", "display": "JPT-4B (kirp, Qwen3.5-4B LoRA)", "author": "kirp", "repo": "https://huggingface.co/kirp/jpt-4b", "model_pin": "kirp/jpt-4b@05285d2d4f0cd954666ed88095f511c80665bc4c", "licence": "CC-BY-NC-4.0 (weights, non-commercial)", "ok": 1485, "status_counts": {"200": 1485, "422": 15}, "input_tokens": 764418, "output_tokens": 1485, "price": {"input": 0.030000000000000002, "output": 0.15}, "over_cap": false, "raw": "808477c5a1df6bb401c96f67a7926f86fc1ef98a619d099b17f02dd7b442e61a", "copy": "808477c5a1df6bb401c96f67a7926f86fc1ef98a619d099b17f02dd7b442e61a", "custody": "#20324", "texts": {"cost_basis": "70132e01c1fe908fb393a7d6810e018c31ed308c81c788b9ceb10fc79c1747b3", "endpoint_condition": "2ceb76c5c43bd4c492464105635cb73d37011d3bf375d7489f7a6c11f7a03ddd"}, "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "CC BY-NC 4.0", "non-commercial", "808477c5a1df6bb401c96f67a7926f86fc1ef98a619d099b17f02dd7b442e61a"]},
  "kev-9b-v2": {"ranked": false, "lane": "selfhosted", "kind": "gpu", "display": "Kev-9B v2 (Jared Palmer, Qwen3.5-9B-Base LoRA + pointer head)", "author": "jaredpalmer", "repo": "https://huggingface.co/jaredpalmer/kev-9b", "model_pin": "jaredpalmer/kev-9b@b5d8c18e44c60888d138b65cb6507ff0a5a448a0", "licence": "Apache-2.0", "ok": 1485, "status_counts": {"200": 1485, "422": 15}, "input_tokens": 662682, "output_tokens": 164737, "price": null, "over_cap": false, "raw": "6b711cfb67367dbe8b2de13f68a6624eb8a95e178a18b2cff5f48ff3ed9df8ec", "copy": "6b711cfb67367dbe8b2de13f68a6624eb8a95e178a18b2cff5f48ff3ed9df8ec", "custody": "#20324", "texts": {"cost_basis": "d255b33d30e25156f2c4ed5268d1269097e52859062adba63ed5c33aa0aa7eba", "endpoint_condition": "30f79bd8d823a4702cc792c6127ca58a378e6ffe22944049506ed0cee713c47e", "not_ranked_because": "2e360891b3f8acc1221321d254367e5ef5525434540d727d24c2f08d34790d10"}, "reason": "unpriced: the frozen pricing path has no market-listing deci", "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "supersedes the historical v1.5 measurement", "/jev-models/v1.5.7", "NOT RANKED", "Qwen/Qwen3.5-9B-Base", "164,737", "6b711cfb67367dbe8b2de13f68a6624eb8a95e178a18b2cff5f48ff3ed9df8ec"]},
  "nagi-enormous": {"ranked": true, "lane": "selfhosted", "kind": "gpu", "display": "Nagi-ENORMOUS 27B (nagisanzenin, Qwen3.8-27B LoRA)", "author": "nagisanzenin", "repo": "https://huggingface.co/nagisanzeninz/Nagi-ENORMOUS", "model_pin": "nagisanzeninz/Nagi-ENORMOUS@0d8e052d698461ecd49c4f39a09f6bd0179a1d5c", "licence": "Apache-2.0", "ok": 1485, "status_counts": {"200": 1485, "422": 15}, "input_tokens": 762436, "output_tokens": 0, "price": {"input": 0.42, "output": 3.0}, "over_cap": true, "raw": "a9e0bd4689daaf08d8bfbaeb7bd1306363b56cb32648feec0f01df1e50c946aa", "copy": "a9e0bd4689daaf08d8bfbaeb7bd1306363b56cb32648feec0f01df1e50c946aa", "custody": "#20324", "texts": {"cost_basis": "6916ba5584274ff8b9af446d7ff6211c78c162df789ed27caade3543ea154ce0", "endpoint_condition": "46da2ab53a7bd8ce3c1cfc87c54a9687d10be8b874e605abefc66163184327ff"}, "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "OVER THE OFFICIAL COST CAP", "outside the official cost-capped views", "release gate failed", "a9e0bd4689daaf08d8bfbaeb7bd1306363b56cb32648feec0f01df1e50c946aa"]},
  "nagi-huge": {"ranked": false, "lane": "selfhosted", "kind": "gpu", "display": "Nagi-HUGE 12B (nagisanzenin, Gemma-4-12B LoRA)", "author": "nagisanzenin", "repo": "https://huggingface.co/nagisanzeninz/Nagi-HUGE", "model_pin": "nagisanzeninz/Nagi-HUGE@3e0a58b19116afca7abf7f854d82ba85f5de5c4b", "licence": "Apache-2.0", "ok": 1485, "status_counts": {"200": 1485, "422": 15}, "input_tokens": 764280, "output_tokens": 0, "price": null, "over_cap": false, "raw": "6ee3336abe61c827e5004f20646f35183465492d12404b2cd5d9813d9a51dcb9", "copy": "6ee3336abe61c827e5004f20646f35183465492d12404b2cd5d9813d9a51dcb9", "custody": "#20324", "texts": {"cost_basis": "2ed0429c8c5d0a9b0b52cd049f2a26ac23da2deaae6db08047773280f168ff5e", "endpoint_condition": "145bb77e8f68aa15d518950659a624820482b69259bf74cf1a2ef10c9d9e598e", "not_ranked_because": "bfc636f7304161bb626113d5ebfe91fd0f7c2b6380341f8ec90b336a3078a8ed"}, "reason": "unpriced: google/gemma-4-12B-it is in the frozen module's UN", "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "NOT RANKED", "google/gemma-4-12B-it", "UNLISTED_BASE_MODELS", "6ee3336abe61c827e5004f20646f35183465492d12404b2cd5d9813d9a51dcb9"]},
  "ryotide-gemma": {"ranked": false, "lane": "selfhosted", "kind": "gpu", "display": "RYOTIDE-Gemma (csabag, Gemma-4-E4B stock weights)", "author": "csabag", "repo": "https://github.com/csabag/ryotide", "model_pin": "csabag/ryotide@6bbb615a170dc16b83ca62373aa7ada7bf3ea27e", "licence": "per base model (stock weights; code licence not checked)", "ok": 1500, "status_counts": {"200": 1500}, "input_tokens": 2095834, "output_tokens": 0, "price": null, "over_cap": false, "raw": "2a5386f1df609c4fc35ee1eedb4866cf8faa1343e0adaa754481efcf653ca8ec", "copy": "2a5386f1df609c4fc35ee1eedb4866cf8faa1343e0adaa754481efcf653ca8ec", "custody": "#20324", "texts": {"cost_basis": "cb5ab01acc50e0fcde4dca08b62e3c044a2eafafb926642ed5b86dbaf4adb014", "endpoint_condition": "5910550a82a19b2d61c2e4ebe47d5d9c0779c403b7b30ba8eb4192e56e4b77a8", "not_ranked_because": "7ee9471c59a3713e234c6872285f1424aa8562e012ed4eee11b35cbeb201cae1"}, "reason": "unpriced: the frozen pricing path has no market-listing deci", "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "NOT RANKED", "google/gemma-4-E4B-it", "It answers all 15 long items", "2a5386f1df609c4fc35ee1eedb4866cf8faa1343e0adaa754481efcf653ca8ec"]},
  "ryotide-qwen": {"ranked": true, "lane": "selfhosted", "kind": "gpu", "display": "RYOTIDE-Qwen (csabag, Qwen3.5-4B stock weights)", "author": "csabag", "repo": "https://github.com/csabag/ryotide", "model_pin": "csabag/ryotide@6bbb615a170dc16b83ca62373aa7ada7bf3ea27e", "licence": "per base model (stock weights; code licence not checked)", "ok": 1500, "status_counts": {"200": 1500}, "input_tokens": 2083222, "output_tokens": 0, "price": {"input": 0.030000000000000002, "output": 0.15}, "over_cap": false, "raw": "5c39172d462e454c078acd7d712d1cedab8382015ccc022410e9836a4c747d97", "copy": "5c39172d462e454c078acd7d712d1cedab8382015ccc022410e9836a4c747d97", "custody": "#20324", "texts": {"cost_basis": "67220136ce8b88335b4d320a046a1920258d6f59233fe4c8589d4410a676b047", "endpoint_condition": "5b0bf3085b9999da4a16edffd0bc8e6b2665c6b3bbb79739119d1fc683177976"}, "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "It answers all 15 long items", "5c39172d462e454c078acd7d712d1cedab8382015ccc022410e9836a4c747d97"]},
  "shisa-de-1": {"ranked": true, "lane": "selfhosted", "kind": "gpu", "display": "shisa-de-1 (shisa-ai, Gemma-4-26B-A4B)", "author": "shisa-ai", "repo": "https://huggingface.co/shisa-ai/shisa-de-1", "model_pin": "shisa-ai/shisa-de-1@9111f4746a96d6cdf9f1a23a88afd5b57244508b", "licence": "Apache-2.0", "ok": 1485, "status_counts": {"200": 1485, "None": 15}, "input_tokens": 779620, "output_tokens": 0, "price": {"input": 0.09, "output": 0.3}, "over_cap": false, "raw": "8d79723565fe8293ac364187153fa31e11dece836eb8ca4992b145b35485c90d", "copy": "8d79723565fe8293ac364187153fa31e11dece836eb8ca4992b145b35485c90d", "custody": "#20324", "texts": {"cost_basis": "c971bc1299dfaef81f5d97f71041bbbe774ab5b178f89c440014a5ff098e8911", "endpoint_condition": "6a335d95e3d2a46a7e9ab9d5efa8852e39f467a57cfdaae9e0d88b0a8efa54b8"}, "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "EVALUATOR's adapter", "no HTTP status", "8d79723565fe8293ac364187153fa31e11dece836eb8ca4992b145b35485c90d"]},
  "tde-general-large": {"ranked": false, "lane": "selfhosted", "kind": "gpu", "display": "TDE general large v0.1 (tdelab, ModernBERT-large encoder)", "author": "tdelab", "repo": "https://huggingface.co/tdelab/tde-general-large-v0.1", "model_pin": "tdelab/tde-general-large-v0.1@2d697981fc217d50c27d042079549c555bc08e27", "licence": "Apache-2.0", "ok": 1500, "status_counts": {"200": 1500}, "input_tokens": 672464, "output_tokens": 0, "price": null, "over_cap": false, "raw": "c13ccb5845969b971153d0ee187412cdf840a137d950c9fc67cc0a40bf325087", "copy": "62ea9354ae0419d257596284de56b376d7a03c1ef604443c157557046feda86d", "custody": "#20324", "texts": {"cost_basis": "4491584266ca4566a6d61f5d165566dec3d82ecee29cced7423b97f795309609", "endpoint_condition": "f6f5988d7a4bda6af6d3f2d747687a4ae92fdccf619ae8927a5da55ed8fea6e3", "not_ranked_because": "5e3f0fccc979c976fd58d44d6ba94c094693c9b7e987fb212622f7fb8c29b1c7"}, "reason": "unpriced: answerdotai/ModernBERT-large is in the frozen modu", "disclosures": ["RE-MEASURED on this draw", "Batch BCD", "custody #20324", "independent", "No paid order", "H100", "Evaluated pin", "LICENCE", "NOT RANKED", "OFFLINE", "UNLISTED_BASE_MODELS", "It answers all 15 long items", "c13ccb5845969b971153d0ee187412cdf840a137d950c9fc67cc0a40bf325087"]},
});
export const V1626_REPRICE_SPEC = Object.freeze({
  "nimble-v4-max": {"price": {"input": 0.04, "output": 0.0}, "previous_price": {"input": 0.09, "output": 0.0}, "input_tokens": 1935351, "output_tokens": 3000, "ok": 1500, "over_cap": false, "cost_basis": "8d267cf1b26831b4ebc7edb060da321f87fba429b6c52b66728ee52ad01874de", "evidence": "4d46184d27edc66a08e77f06505084a6e7acfeba4cb952830391aec7ca892576", "previous_evidence": "03b0626140b8fb0a80f48754742bd4d553d5632ff78ce5790770a12e2bd58562", "page": "docs.bespokelabs.ai/nimble/pricing", "disclosures": ["no new measurement", "USD 0.04 per million input tokens", "listed USD 0.09", "I-1", "f661456e", "32556e54", "now INSIDE the official cost-capped views", "Capability unchanged", "intervals are re-drawn", "4d46184d27edc66a08e77f06505084a6e7acfeba4cb952830391aec7ca892576", "03b0626140b8fb0a80f48754742bd4d553d5632ff78ce5790770a12e2bd58562"]},
});
export const V1626_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1626Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1626_BASE_DIMS] : [...V1626_BASE_DIMS];
}

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const clone = v => JSON.parse(JSON.stringify(v));
const textSha = v => typeof v === 'string' ? createHash('sha256').update(v, 'utf8').digest('hex') : null;
const fail = message => { throw new Error(`JevBench v1.6.26: ${message}`); };
const sameSet = (a, b) => a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const same = (a, b, message) => { if (!isDeepStrictEqual(a, b)) fail(message); };
const INTERNAL = /[\w.+-]+@[\w-]+\.[a-z]{2,}|\/home\/|\bworkers\/|\br1\d\d\/|\bpod id\b|PREREG|batchA|batchBCD|R129|_wrap\.py/i;
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
/** A re-priced row's measurement: everything except the cost, what follows from it and its intervals (the v1.6.23 rule;
 *  the interval block also moves because the roster seed moved). */
function frozenMeasurement(row) {
  const copy = clone(row);
  for (const key of ['cost', 'scores', 'composite_ci95', 'jevbench_score', 'listing', 'rank', 'ranked', 'ranks',
    'views', 'repriced_in', 'not_ranked_because', 'ranked_false_reason']) delete copy[key];
  if (copy.axes) delete copy.axes.cost;
  if (copy.v16) delete copy.v16.ci95;
  return copy;
}

/** The keys the generated board note names as the cause of its top-five changes. */
function boardCauses(boardNote) {
  const m = boardNote.match(/Top-five changes caused by: (.+?)(?: \(|\. )/);
  return m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : [];
}

/** How the publication approval arrived. Returns the marker the authority must carry. */
function approvalOf(proof, artifact, boardNote, provisional) {
  const pa = proof.publication_approval;
  same(pa?.go, V1626_GO, 'publication GO provenance');
  same(pa?.reprice, V1626_REPRICE_AUTH, 're-price provenance');
  // A build made before a preview card was answered carries PLACEHOLDER fields; they are rejected wherever they appear.
  if (JSON.stringify(proof).includes('PLACEHOLDER') || JSON.stringify(artifact).includes('PLACEHOLDER')) fail('approval placeholder not filled');
  const notes = artifact.measurement_notes.filter(n => n.startsWith('Publication of v1.6.26:'));
  if (notes.length !== 1) fail('public note must describe how the approval arrived');
  const note = notes[0];
  if (!note.includes(V1626_GO_QUOTE) || !note.includes(V1626_GO.recorded_in) || !note.includes(V1626_REPRICE_AUTH.relay)) fail('public note must describe how the approval arrived');
  const noChange = boardNote.includes(NO_CHANGE_BOARD);
  const causes = boardCauses(boardNote);
  const claimsCard = /Telegram card #\d/.test(note) || /selected "[^"]*" on Telegram card/.test(note);
  if (pa.top_five_effect === 'none') {
    if (!provisional && !noChange) fail('a no-card approval needs the generated no-change board note');
    if (pa.top_five_preview !== null || pa.button_tap !== false || Object.keys(pa).sort().join() !== 'button_tap,go,reprice,top_five_effect,top_five_preview') fail('no-card approval provenance');
    if (!note.includes(NO_CARD_TEXT) || claimsCard) fail('public note must not claim a preview card');
    return NO_CARD_MARKER;
  }
  if (noChange || provisional || !causes.length || pa.top_five_effect !== 'changes') fail('approval and top-five effect disagree');
  same([...pa.top_five_changed_by ?? []].sort(), [...causes].sort(), 'the approval must name exactly the rows the board note says changed the top fives');
  if (!causes.every(k => V1626_RANKED_NEW_KEYS.includes(k) || V1626_REPRICED_KEYS.includes(k))) fail('only a new ranked row or the re-priced row can change a top five');
  const a = pa.top_five_preview;
  const id = a?.card_id;
  const canonical = typeof id === 'string' && /^\d+$/.test(id) && BigInt(id).toString() === id;
  if (!canonical || BigInt(id) <= LAST_CARD || typeof a.selection !== 'string' || !a.selection.trim() || !hex(a.preview_png_sha256)) fail('top-five preview approval card');
  if (!['telegram-button', 'direct-message'].includes(a.channel) || typeof a.button_tap !== 'boolean' || pa.button_tap !== a.button_tap
      || typeof a.recorded_at !== 'string' || !a.recorded_at || typeof a.recorded_in !== 'string' || !a.recorded_in
      || (a.channel === 'telegram-button') !== a.button_tap
      || Object.keys(pa).sort().join() !== 'button_tap,go,reprice,top_five_changed_by,top_five_effect,top_five_preview') fail('approval channel and provenance');
  const claimsTap = /selected "[^"]*" on Telegram card/.test(note);
  const saysNoTap = note.includes("The card's own button was not pressed.");
  if ((a.button_tap ? (!claimsTap || saysNoTap) : (claimsTap || !saysNoTap)) || !note.includes(`Telegram card #${id}`)
      || !note.includes(a.preview_png_sha256)) fail('public note must describe how the approval arrived');
  return a.button_tap
    ? `Florian top-five preview approval: Telegram card #${id}; selected "${a.selection}" (${a.recorded_at}); preview PNG SHA-256 ${a.preview_png_sha256}.`
    : `Florian top-five preview approval: ${a.channel} ${a.recorded_at}, recorded as Telegram card #${id} = "${a.selection}" (${a.recorded_in}; no button tap); preview PNG SHA-256 ${a.preview_png_sha256}.`;
}

export function validateJevbenchV1626Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.26' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.25' || previous.proof?.revision !== 'v1.6.25') fail('validated v1.6.25 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.25', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.26' || artifact.run_kind !== 'regular-queue' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  const newKeys = allKeys.filter(k => !V1626_CARRIED_KEYS.includes(k) && !V1626_CARRIED_PRELIMINARY_KEYS.includes(k)).sort();
  if (!sameSet(newKeys, V1626_NEW_KEYS)) fail(`exactly the added rows: ${newKeys}`);
  if (!sameSet(allKeys, [...V1626_CARRIED_KEYS, ...V1626_NEW_KEYS, ...V1626_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + V1626_NEW_KEYS.length) fail('exactly the added rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + V1626_RANKED_NEW_KEYS.length) fail('ranked row count');
  const regularKeys = [...V1626_CARRIED_KEYS, ...V1626_NEW_KEYS];
  const unrankedKeys = [...V1626_UNRANKED_CARRIED_KEYS, ...V1626_UNRANKED_NEW_KEYS];
  if (!sameSet(V1626_UNRANKED_CARRIED_KEYS, V1626_CARRIED_KEYS.filter(k => !prior.get(k)?.ranked))) fail('carried unranked set');
  if (!V1626_REPRICED_KEYS.every(k => V1626_CARRIED_KEYS.includes(k)) || !V1626_CARRIED_KEYS.includes(V1626_DEPRECATED_KEY)) fail('re-priced and vendor-status rows are carried rows');

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1626_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const spec = V1626_ROW_SPEC[s.key];
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
    if (!unpriced && s.cost.usd_per_1000 > V1626_COST_CAP && !V1626_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the new rows ---------------------------------------------------------------------------
  const inherited = Object.keys(previous.proof.new_rows ?? {});
  if (!sameSet(Object.keys(proof.new_rows ?? {}), [...inherited, ...V1626_NEW_KEYS])) fail('new-row provenance coverage');
  for (const k of inherited) same(proof.new_rows[k], previous.proof.new_rows[k], `inherited new-row provenance ${k}`);
  for (const [key, spec] of Object.entries(V1626_ROW_SPEC)) {
    const s = by.get(key), n = proof.new_rows[key];
    for (const field of ['display', 'author', 'repo', 'licence', 'model_pin']) same(s[field], spec[field], `${key} registry ${field} verbatim`);
    if (textSha(s.cost?.basis) !== spec.texts.cost_basis) fail(`${key} registry cost_basis verbatim`);
    if (textSha(s.endpoint_condition) !== spec.texts.endpoint_condition) fail(`${key} registry endpoint_condition verbatim`);
    if (!spec.ranked && textSha(s.not_ranked_because) !== spec.texts.not_ranked_because) fail(`${key} registry ranking reason verbatim`);
    if (s.measured_in !== 'v1.6.26' || s.measurement_date_status !== 'measured' || s.last_measured_on !== '2026-10-16') fail(`${key} measurement stamp`);
    if (s.endpoint_kind !== spec.kind || s.api_flag !== false || s.v16.set !== 'S+P') fail(`${key} lane/endpoint kind`);
    if (s.speed?.adjustment !== 'x2 + 0.15 s (assumption, not measured)') fail(`${key} latency adjustment`);
    if (s.paid_fast_lane === true) fail(`${key} is not a paid row`);
    if (s.status.answered_ok !== spec.ok) fail(`${key} completeness`);
    if (spec.ranked) {
      const usd = cost(spec.input_tokens, spec.output_tokens, spec.price.input, spec.price.output);
      if (s.ranked !== true || s.listing !== 'ranked' || s.not_ranked_because || s.ranked_false_reason) fail(`${key} is ranked`);
      if (s.cost?.kind !== 'estimate' || s.cost.usd_per_1000 !== usd || (usd > V1626_COST_CAP) !== spec.over_cap || s.cost.usage_estimated_rows !== 0) fail(`${key} cost: tariff x own tokens, cap side as stated`);
      if (s.cost.basis.includes('OVER THE OFFICIAL COST CAP') !== spec.over_cap) fail(`${key} over-cap disclosure`);
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
    for (const text of [s.author, s.endpoint_condition, s.cost?.basis, s.not_ranked_because, s.licence, rowNote])
      if (typeof text === 'string' && INTERNAL.test(text)) fail(`${key}: personal e-mail or internal path in public text`);
    // provenance receipt
    if (!n || n.raw_sha256 !== proof.raw_sha256?.[key] || n.raw_sha256 !== spec.copy || n.original_raw_sha256 !== spec.raw
        || n.ar_scoring_copy_sha256 !== spec.copy || n.measured_in !== 'v1.6.26'
        || n.rows !== 1500 || n.answered_ok !== spec.ok || n.ranked !== spec.ranked || n.paid_fast_lane !== false || n.endpoint_kind !== spec.kind
        || n.treatment !== (spec.ranked ? (spec.over_cap ? 'ranked_over_cap' : 'ranked') : 'listed_unpriced') || n.pricing_module_sha256 !== V1626_PRICING_MODULE_SHA256
        || !String(n.custody).includes(spec.custody) || n.measured_on !== '2026-10-16') fail(`${key} new-row provenance`);
    if (!hex(n.pre_score_review_sha256) || !hex(n.post_score_review_sha256) || n.remeasure?.campaign !== 'Batch BCD' || n.remeasure?.handoff !== 'board #20455'
        || n.remeasure?.custody !== '#20324' || n.remeasure?.admission !== '#20340' || n.remeasure?.cap !== '#20286'
        || n.remeasure?.supersedes_historical !== (key === 'kev-9b-v2' ? 'v1.5 supplement' : null)
        || ((spec.raw !== spec.copy) !== hex(n.scoring_copy_receipt_sha256))) fail(`${key} measurement provenance`);
    if (n.input_tokens !== spec.input_tokens || n.output_tokens !== spec.output_tokens) fail(`${key} usage`);
    same(n.status_counts, spec.status_counts, `${key} HTTP status counts`);
    if (spec.ranked) {
      same(n.price_per_million, spec.price, `${key} tariff`);
      const recomputed = cost(n.input_tokens, n.output_tokens, n.price_per_million.input, n.price_per_million.output);
      if (n.usd_per_1000 !== recomputed || n.usd_per_1000 !== s.cost.usd_per_1000 || n.under_cost_cap !== !spec.over_cap
          || Math.abs(n.cost_cap_ratio - n.usd_per_1000 / V1626_COST_CAP) > 1e-12) fail(`${key} cost binding`);
    } else if (n.price_per_million !== null || n.usd_per_1000 !== null || n.cost_cap_ratio !== null) fail(`${key}: an unpriced row carries no price`);
    if (s.speed.p50_s_raw !== n.p50_s_raw || s.speed.p95_s_raw !== n.p95_s_raw) fail(`${key} receipt latency`);
  }

  // --- the re-priced row ------------------------------------------------------------------------
  const releaseNote = artifact.measurement_notes.find(x => x.startsWith('v1.6.26 ADDS ')) ?? '';
  const repriced = proof.repriced_rows ?? {};
  if (!sameSet(Object.keys(repriced), Object.keys(previous.proof.repriced_rows ?? {}))) fail('repriced-row provenance coverage');
  for (const k of Object.keys(previous.proof.repriced_rows ?? {})) if (!V1626_REPRICED_KEYS.includes(k)) same(repriced[k], previous.proof.repriced_rows[k], `inherited repriced row ${k}`);
  for (const [key, spec] of Object.entries(V1626_REPRICE_SPEC)) {
    const s = by.get(key), a = prior.get(key), n = repriced[key];
    const usd = cost(spec.input_tokens, spec.output_tokens, spec.price.input, spec.price.output);
    if (s.ranked !== true || s.listing !== 'ranked' || s.not_ranked_because || s.ranked_false_reason) fail(`${key} is ranked`);
    if (s.repriced_in !== 'v1.6.26' || s.measured_in !== a.measured_in || s.last_measured_on !== a.last_measured_on
        || s.measurement_date_status !== a.measurement_date_status) fail(`${key} measurement date / reprice marker`);
    same(frozenMeasurement(s), frozenMeasurement(a), `${key}: a measured value or identity field changed in a re-price`);
    if (s.cost?.kind !== 'estimate' || s.cost.usd_per_1000 !== usd || (usd > V1626_COST_CAP) !== spec.over_cap) fail(`${key} cost: public tariff x own tokens`);
    if (a.cost.usd_per_1000 !== cost(spec.input_tokens, spec.output_tokens, spec.previous_price.input, spec.previous_price.output)) fail(`${key}: the previous cost is the previous tariff`);
    if (s.status.answered_ok !== spec.ok) fail(`${key} completeness`);
    if (textSha(s.cost.basis) !== spec.cost_basis) fail(`${key} cost basis verbatim`);
    if (s.cost.basis.includes('OVER THE OFFICIAL COST CAP') !== spec.over_cap) fail(`${key} over-cap disclosure`);
    if (!s.cost.basis.includes(spec.evidence.slice(0, 8)) || !s.cost.basis.includes(spec.previous_evidence.slice(0, 8)) || !s.cost.basis.includes('I-1')) fail(`${key} cost basis names its evidence and interpretation`);
    if (!finite(s.axes.cost) || ['A', 'B', 'C'].some(o => !finite(s.scores?.[o]))) fail(`${key} cost axis and composites`);
    if (Object.values(s.views ?? {}).some(v => !finite(v))) fail(`${key}: a ranked row publishes its presets`);
    for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) if (!intervalOk(ci, s.scores)) fail(`repriced row interval does not contain its own point estimate: ${key}`);
    if (INTERNAL.test(s.cost.basis)) fail(`${key}: personal e-mail or internal path in public text`);
    const rowNote = artifact.measurement_notes.find(x => x.startsWith(`${key} RE-PRICED in v1.6.26: `)) ?? '';
    if (rowNote.length < 400) fail(`price note of ${key} is too thin to be the disclosure it claims to be`);
    for (const fragment of spec.disclosures) if (!rowNote.includes(fragment)) fail(`required disclosure "${fragment}" missing from the price note of ${key}`);
    if (INTERNAL.test(rowNote)) fail(`${key}: personal e-mail or internal path in public text`);
    if (!releaseNote.includes(key) || !releaseNote.includes('RE-PRICED')) fail(`the release note must name ${key}`);
    if (!n || n.no_new_measurement !== true || n.repriced_in !== 'v1.6.26' || n.raw_sha256 !== previous.proof.raw_sha256?.[key]
        || n.raw_sha256 !== proof.raw_sha256?.[key] || n.measured_in !== a.measured_in || n.last_measured_on !== a.last_measured_on
        || n.pricing_module_sha256 !== V1626_PRICING_MODULE_SHA256 || n.predecessor_pricing_module_sha256 !== V1625_PRICING_MODULE_SHA256
        || n.price_source?.saved_copy_sha256 !== spec.evidence || n.price_source?.previous_saved_copy_sha256 !== spec.previous_evidence
        || n.price_source?.page !== spec.page) fail(`${key} reprice provenance`);
    same(n.previous_repricing, previous.proof.repriced_rows[key], `${key}: the earlier re-price record is kept verbatim`);
    if (n.input_tokens !== spec.input_tokens || n.output_tokens !== spec.output_tokens) fail(`${key} usage`);
    same(n.price_per_million, spec.price, `${key} tariff`);
    const recomputed = cost(n.input_tokens, n.output_tokens, n.price_per_million.input, n.price_per_million.output);
    if (n.usd_per_1000 !== recomputed || n.usd_per_1000 !== s.cost.usd_per_1000 || n.under_cost_cap !== !spec.over_cap
        || n.treatment !== (spec.over_cap ? 'ranked_over_cap' : 'ranked') || Math.abs(n.cost_cap_ratio - n.usd_per_1000 / V1626_COST_CAP) > 1e-12) fail(`${key} cost binding`);
    same(n.previous, { cost: a.cost, axes: a.axes, scores: a.scores, rank: a.rank, ranks: a.ranks }, `${key} previous proof state`);
    same(n.current, { cost: s.cost, axes: s.axes, scores: s.scores, rank: s.rank, ranks: s.ranks }, `${key} current proof state`);
  }

  // --- the vendor-status row (no number changes) ------------------------------------------------
  {
    const key = V1626_DEPRECATED_KEY, vs = proof.vendor_status?.[key];
    if (!vs || vs.status !== 'deprecated by the vendor' || vs.date !== '2026-10-16' || vs.pricing_page_still_lists !== true
        || vs.pricing_page_saved_copy_sha256 !== V1626_NIMBLE_PRICING_SHA256 || !String(vs.listing_note).includes(V1626_DEPRECATION_TEXT)) fail('vendor status provenance');
    for (const k of Object.keys(previous.proof.vendor_status ?? {})) same(proof.vendor_status[k], previous.proof.vendor_status[k], `inherited vendor status ${k}`);
    if (!sameSet(Object.keys(proof.vendor_status), [...Object.keys(previous.proof.vendor_status ?? {}), key])) fail('vendor status coverage');
    if (!releaseNote.includes(V1626_DEPRECATION_TEXT) || !artifact.measurement_notes.some(x => x.startsWith(`${key} VENDOR STATUS: `) && x.includes(V1626_DEPRECATION_TEXT))) fail('the vendor status must be stated in the notes');
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
  for (const key of V1626_CARRIED_PRELIMINARY_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the carried rows keep every point estimate ----------------------------------------------
  // What may differ on a carried row (other than the re-priced one), and nothing else: its placement (rank, ranks), its
  // bootstrap intervals (composite_ci95, v16.ci95 - new keys shift roster positions and with them the per-row bootstrap seeds)
  // and, only when the API-basis diagnostic moved, v16.raw_on_A. Every move must be named in the release note.
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
  const prevOrder = o => previous.artifact.board[o].order;
  for (const key of V1626_CARRIED_KEYS) {
    if (V1626_REPRICED_KEYS.includes(key)) continue;   // validated above
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried row present ${key}`);
    const rawOnAMoved = JSON.stringify(a.v16?.raw_on_A) !== JSON.stringify(b.v16?.raw_on_A);
    if (rawOnAMoved && !diagnosticMoved) fail(`raw_on_A moved while the API-basis diagnostic did not: ${key}`);
    if (rawOnAMoved && !releaseNote.includes(`${key}: intelligence`)) fail(`a moved raw_on_A must name its row in the notes: ${key}`);
    same(strip(b, rawOnAMoved), strip(a, rawOnAMoved), `carried row differs outside rank/ranks/composite_ci95/v16.ci95${rawOnAMoved ? '/v16.raw_on_A' : ''}: ${key}`);
    if (V1626_UNRANKED_CARRIED_KEYS.includes(key)) {
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    }
    const intervalMoved = !isDeepStrictEqual([b.composite_ci95, b.v16?.ci95], [a.composite_ci95, a.v16?.ci95]);
    if (intervalMoved && !intervalNames.includes(key)) fail(`a moved carried interval must name its row in the release note: ${key}`);
    for (const ci of (b.cost.kind === 'unpriced' ? [] : [b.composite_ci95, b.v16?.ci95?.composite])) {
      if (!intervalOk(ci, b.scores)) fail(`carried row interval does not contain its own point estimate: ${key}`);
    }
    if (a.ranked) {
      for (const o of ['A', 'B', 'C', 'capability']) {
        let shift = V1626_RANKED_NEW_KEYS.filter(nk => (o === 'capability' ? by.get(nk).capability > b.capability
          : artifact.board[o].order.indexOf(nk) < artifact.board[o].order.indexOf(key))).length;
        // the re-priced row keeps its Capability; on a composite board it may have moved past this row in either direction
        if (o !== 'capability') for (const rk of V1626_REPRICED_KEYS) {
          shift += Number(artifact.board[o].order.indexOf(rk) < artifact.board[o].order.indexOf(key)) - Number(prevOrder(o).indexOf(rk) < prevOrder(o).indexOf(key));
        }
        if (b.ranks[o] !== a.ranks[o] + shift) fail(`carried rank ${o} moved by more than the rows that moved above it: ${key}`);
        if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
      }
    }
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!releaseNote.includes('RANKS') || !releaseNote.includes('CONFIDENCE INTERVALS') || !releaseNote.includes('DIAGNOSTICS')
      || !V1626_NEW_KEYS.every(k => releaseNote.includes(k))) fail('the release note must count rank, interval and diagnostic moves');
  if (!releaseNote.includes('supersedes its historical v1.5 measurement')) fail('kev-9b-v2 supersedes its v1.5 supplement measurement: say so');
  if (!artifact.measurement_notes.some(x => x.includes('#18761') && x.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (diagnosticMoved) {
    const values = [previous.artifact.G_med_api_basis_P_vs_A, artifact.G_med_api_basis_P_vs_A].map(String);
    if (!artifact.measurement_notes.some(x => x.includes('API-basis median diagnostic') && values.every(v => x.includes(v)))) fail('a moved API-basis diagnostic must be disclosed with both values');
  }
  const added = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  const boardNotes = added.filter(x => x.startsWith('Board effect'));
  const boardNote = boardNotes.length === 1 ? boardNotes[0] : '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1626_BUILD_PASS1 !== '1'
      : !(boardNote.includes('top-five') && [...V1626_RANKED_NEW_KEYS, ...V1626_REPRICED_KEYS].every(k => boardNote.includes(k)))) fail('board effect: generated top-five note required; provisional build note forbidden');
  if (artifact.G_med !== V1626_FIXED_G_MED || previous.artifact.G_med !== V1626_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  for (const f of ['draw_release', 'freeze_manifest_sha256', 'seed_commitment', 'draw_digests', 'baseline_sha256', 'a2_supplement']) same(artifact.v16?.[f], previous.artifact.v16?.[f], `draw provenance ${f}`);
  if (artifact.v16.draw_release !== V1626_DRAW_RELEASE) fail('draw identity');
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.26' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || proof.baseline_sha256 !== artifact.v16.baseline_sha256
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  same(artifact.v16.draw_digests, proof.draw_digests, 'draw digests bound to the proof');
  if (proof.pricing_module_sha256 !== V1626_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V1625_PRICING_MODULE_SHA256
      || previous.proof.pricing_module_sha256 !== V1625_PRICING_MODULE_SHA256) fail('pricing re-freeze binding');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  // null until v1.6.25 is sealed (stacked build); flip_verdict_v1626.py and freeze_v1626.py refuse a null binding
  if (proof.predecessor_seal_sha256 !== null && !hex(proof.predecessor_seal_sha256)) fail('predecessor seal binding');
  for (const k of ['refreshed_preview_go_card', 'refreshed_preview_approval', 'a2_supplement', 'scorer_sources_sha256']) same(proof[k], previous.proof[k], `inherited proof field ${k}`);
  if (typeof proof.authority !== 'string' || !proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.26:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of [...V1626_NEW_KEYS, ...V1626_REPRICED_KEYS, '#20455', '#20286', '#20340', '#20324', 'Batch BCD', 'RANKED', 'LISTED UNPRICED',
    'over the official cost cap', 'no paid order', 'f661456e', '32556e54', 'RE-PRICED', 'USD 0.04 instead of 0.09', V1626_NIMBLE_PRICING_SHA256.slice(0, 8),
    V1626_DEPRECATION_TEXT, V1626_GO_QUOTE, '2026-10-16 12:50 UTC', '#20466']) {
    if (!newAuthority.includes(fragment)) fail(`new publication authority: ${fragment}`);
  }
  const marker = approvalOf(proof, artifact, boardNote, provisional);
  if (!newAuthority.includes(marker)) fail('publication approval authority binding');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), regularKeys)) fail('raw-output coverage');
  same(Object.fromEntries(V1626_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  const proofRows = proof.systems;
  if (!Array.isArray(proofRows) || !sameSet(proofRows.map(x => x.key), regularKeys)) fail('system proof coverage');
  const priorProof = new Map(previous.proof.systems.map(r => [r.key, r]));
  for (const x of artifact.systems) {
    if (V1626_CARRIED_PRELIMINARY_KEYS.includes(x.key)) continue;
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
    if (V1626_ROW_SPEC[x.key] && p.source_review_sha256 !== proof.new_rows[x.key].pre_score_review_sha256) fail(`independent pre-score review binding ${x.key}`);
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${x.key}`);
    const q = priorProof.get(x.key);
    if (q) for (const f of ['measured_by', 'source_review_sha256', 'source_review_note', 'raw_sha256', 'answered_ok']) same(p[f], q[f], `proof row provenance unchanged ${x.key}.${f}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1626_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && by.get(m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.26' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1626Dims(categories);
  if (!('topics' in categories) && !artifact.measurement_notes.some(x => x.includes('topic'))) fail('a release without the topic radar must say so in its measurement notes');
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) if (categories.lanes[key] !== (V1626_ROW_SPEC[key]?.lane ?? previous.categories.lanes[key])) fail(`category lane ${key}`);
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
  for (const key of V1626_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1626Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1626_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1625Release(root);
  if (!previous) fail('v1.6.26 needs the published v1.6.25 release it extends');
  const previousManifest = await load(`${V1626_ROOT}/jevbench-v1.6.25-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1626Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1626Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1626Release(root)); }
  catch { log('JevBench v1.6.26 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1626BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
