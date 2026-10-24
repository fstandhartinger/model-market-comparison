// JevBench v1.7.0 (10 s rule, full re-score): the whole-board restatement. One artifact set with every row of the live board re-scored under the
// 10-second limit (share treatment) from the recorded per-decision times, applied at the end of assembleJevBoard() after the unchanged v1.6 chain has
// produced the board it restates. Fail closed: the artifact is bound to that chain output row by row (previous == chain, identity and cost unchanged),
// so an old value cannot be shown as a new one and a later v1.6.x cohort release cannot slip past the restatement.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { jevLiveAllArtifact } from './jevbench-cohort-merge.mjs';
import { apiFullAddendumCategoryBounds, withRowPoolCategoryRows } from './jevbench-api-full-addenda.mjs';

export const V170_ROOT = 'data/raw/benchmarks/jevbench/v1.7';
export const V170_MANIFEST = `${V170_ROOT}/jevbench-v1.7.0-publication.json`;
export const V170_FILE_KEYS = ['results', 'categories', 'carry', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V170_FILE_KEYS.map(k => [k, `${V170_ROOT}/jevbench-v1.7.0-${k}.json`]));
/** The live board release this release restates (the template the builder dumped); a newer v1.6.x release on the chain fails the restatement closed. */
export const V170_BASE_RELEASE = "v1.6.43";
export const V170_BASE_REVISION = 'v1.6.1';
export const V170_LIMIT_S = 10;
export const V170_METHOD = Object.freeze({ label: 'v1.7', decision_limit_s: 10, rule: 'latency_s > 10.000 s -> failed', treatment: 'share' });
export const V170_RULE_TEXT = 'latency_s > limit -> failed';
export const V170_SPEED_BASIS = 'all decisions given (lane items in the raw), measured latency_s';
export const V170_CARRY_LABEL = 'measured before the 10 s rule (v1.5 method), not re-scored';
export const V170_PENDING_KEYS = ["chon-1.0-e4b", "nev-2b", "modernbert-jev-v2", "mghafiri-qwen3.5-0.8b-decision-model", "reflex-instinct-0.6b"];
export const V170_PENDING_WHY = "Re-measure pending under the 10 s rule: this row's per-decision times were recorded on a loaded CPU host, so they cannot be scored under the time limit. Shown with its v1.6 values until it is measured again.";
/** The pricing module in force for this release (live module aa2afcd5 of 22 Oct 2026; v1.6.40 is priced with it) and the one the predecessor release was published with. The Super Decider launch-list keys were added by the earlier re-freeze 81e3578f. */
export const V170_PRICING_MODULE_SHA256 = 'aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7';
export const V170_PRICING_ADDED_KEYS = Object.freeze(['singularity-super-decider', 'singularity-super-decider-thinking']);
export const V170_SCORER_V17_SHA256 = '6363458d208a52f4ad5aaf73027cad1b7e0358ff962e581d57a3cc462c8f1978';
export const V170_SCORER_V16_SHA256 = '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9';
/** The highest Telegram/board id used before this release; a top-five preview card must be newer. */
const LAST_CARD = 18126n;
/** Per row: kind (full | equated | pending | new | remeasured), scoring basis, raw sha256 and the independent over-limit count of the raw (n_over), decisions. */
export const V170_ROW_SPEC = Object.freeze({"base": "v1.6.43", "equated": ["classifier-dev-fast", "decision-machine-1", "deepseek-flash", "fastino-glide", "gemini-3.1-flash-lite", "gpt-5.6-luna", "gpt-6-luna", "gpt-6-luna-low", "instinct", "instinct-dual-4b", "jevact", "kushal-gemma4-31b-it-autoloops", "openai-decisions", "openjev-sglang", "qwen3.8-27b", "simplejev-qwen3.6-35b-a3b", "simplejev-qwen3.8-27b", "system-one-open", "vansa-3.4"], "gap_lift": ["shisa-de-1"], "n_over_total": 1410, "n_ranked": 256, "n_rows": 277, "new": ["ajev-gemma4-31b-lm6q", "aleria-judge-1.1.1", "arcbright-elf-1-31b", "bobcat-1.3", "elephant-1", "fastino-glide-1.2-open", "jez-large-1.0.0", "jez-small-1.0.0", "knowline-35b-a3b-gen1.5", "lumma-fev-27b", "mammoth-1", "nimble-v4-max-open", "seb-9b-v2", "singularity-super-decider", "singularity-super-decider-thinking", "standard_one_3b_sh_v4", "tern-35b-a3b", "wald-26b-a4b"], "pending": ["chon-1.0-e4b", "nev-2b", "modernbert-jev-v2", "mghafiri-qwen3.5-0.8b-decision-model", "reflex-instinct-0.6b"], "predecessor_pricing_module_sha256": "aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7", "remeasured": ["pjev-2b", "purplemist-mini-1.0", "vega-u-qwen3.5-4b", "verdin-4b"], "rows": {"ajev-gemma4-31b-lm6q": {"basis": "d1012r6d", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "81771b73811e870de7ad0056ab07abe4bfdb9da1437ab919fb23ec16d38b061d"}, "aleria-judge-1.1.1": {"basis": "d1012r6c", "kind": "new", "n_decisions": 1500, "n_over": 15, "raw_sha256": "ef332f118e67211c0d03801a24af3f1965da3da8b06c51c1c429cca2736f0fcd"}, "amos-1-large": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 21, "raw_sha256": "e0df00f9b25e01e62430b40d79c3eb0286ae21a2b2c633edb1fbbbd2e3ebf410"}, "amos-1-medium": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 10, "raw_sha256": "ede828c8a56c439b776a8b0bfb4a86940e586c2ea50832c1d3ec4e6b8c83bc0f"}, "aplomb-1": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 5, "raw_sha256": "581ec2de392f75837b11400c19f963c09d7a4329f6544c520a1b27ce133ddf9c"}, "apus-openjev-v1-35b-a3b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c9b02199702db5fa1e08f08ec06f3fde411a5157475bd510b373cc3c408fab04"}, "apus-openjev-v1-9b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "87079c8175b66e7a8be3663e802daee1639351bb12dc6cfd48ab62a3bd96ab4c"}, "arcbright-elf-1-12b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "91bd71714ec75e84c50a411724512be139928fac705fde03d3bc297e719de81f"}, "arcbright-elf-1-31b": {"basis": "d1012r6a", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "34e23ee40cfad1278ccd32daafb9a9ab323a18743cf4cba53087b335122709d1"}, "arsenelupin-v1.1": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "8c0bde3bc6faf59b768be089f2f1bcbbed5ed307739607e15f7edacdd47045f2"}, "attest-31b-v1.0": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "900b411ab91c6961574dc647875ceffaf2c1b780aded25951643a022e33b42d5"}, "autojev-27b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "b071c606de6a4aadd5c71b06bf085cacb34b46f844e087949a56e059780e7690"}, "basal-omni-1.0-ultra": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 15, "raw_sha256": "9f105a93363c82a2d9e6531bc861dae66770ddbb7ce409ba115a306cd15580e0"}, "bb-qwen3.5-4b-lora": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "5a99a666edb40cda59aa6c0b7967c32093492309a67d33d0a12cc63f4b8d84a2"}, "bespoke-nimble-9b-v3": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "80196539c4ebf1d2fe0e5de864e1c68c668ac83b8a41a73cb251865b3cb7d558"}, "bev-bonsai-27b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "fb36077d9eec649098d7314a192376356d464b05a552e4b961a85158694bf324"}, "bge-reranker-v2-m3": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "208e0fc2c7c76aa40b92a4d3bdb2e28bec6acac2dc841d8c750d4476f1d31242"}, "blink-4b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 2, "raw_sha256": "9c43d66d5542190054303d28fd28c0d22eb13b20f601c7116bbdebce6d1efb93"}, "blink-v0-3-26b-a4b-nvfp4": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "6d8bd9dc757bc20a0a7bdae1f4629f77a1ecf7d3055d77a502d630362e99158c"}, "bobcat-1.3": {"basis": "d1023r8a", "kind": "new", "n_decisions": 1500, "n_over": 15, "raw_sha256": "d882cb56d5b0a65b948950bf36e580191f9eb13069dd9d1657b2c34ef76fc8fb"}, "bobcat-flash-1.2": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 13, "raw_sha256": "a46c8998cd542331023a1c739825486994420af546f67266c7007b9a36c371ef"}, "bongard-mini": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "29db8fd9c8e338aeadebaf154e56d5a6d09d1ba460c10171e17b2858278e82ae"}, "celeris-1-decision": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "67104fd1ec5fb5cdc3a44f34b9b2e6df02c1696c7063585c14cd3736d349664d"}, "certo": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "97a096368baff179c50ccd0514012ee8ce7125a2c77baa4a17d84c985cbf2b5f"}, "chon-1.0-12b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 540, "raw_sha256": "021f57779d9573371819fc89581686f4d183cc992ada9e9b93f2920e0e9e9425"}, "chon-1.0-e4b": {"basis": "d1012", "kind": "pending", "raw_sha256": "e5258cc6e1d4cfa34fd4b2ee2ee1602941e3848b10012e7b3273db704f05d42f"}, "classifier-dev-fast": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "cc0da2fbc545cd44056fce4dbc8b1e17b6adbbe73146aa905c9abcfa6b0d3a87"}, "classone-gemma4-e2b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "be607cf96ee84608fdfabcc6f018a22b2a5228acdb36352d963f3dd0a9d72bbd"}, "classone-gemma4-e4b": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "d1424c166a35eea0baba89b25b8a586e399be97d4308271940f1b5d8f5400990"}, "classone-qwen3.5-2b": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c486aa47fecefc470a453fcf08ce1fb0aa881644d99d6c05f44937e471181aed"}, "classone-qwen3.5-4b": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "619a3eb2aba27ebe448332d3ab20eb0c972bb5ddb2a56145238b8bdd32537c61"}, "classone-qwen3.5-9b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "670c93bc2195912ce107aae3497a9a32c4443d229631b0241ec76ff100be621e"}, "clef": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "fcc860cfe2c4f8a3c813028afbd196a2214906c98797970385f661cbe913a635"}, "clef-flash": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "3cd0090a26875ad179dcbcb7df867f0fa0b4362bd1253694ca2900197087d0f7"}, "clef-omni": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "e5ee55edf4eee21d2f142e22abe0bc4d763f60ae58457cd52d66933ea28c7489"}, "clm-8b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 1, "raw_sha256": "5987af61b408d422508303be064843b58e2c6b3428a18678183ceb8c36ea786d"}, "coco-decision-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "cbba158eac8df81eba8c96e03e7aa34d8ee8f1ae62ec7a3b2cc08f50ae3f2d8b"}, "compass-0.2.0": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "17c8bf62c00debaa0025b5a86468e78ff79b4955f5a86cb04bed443ed5d14fbf"}, "cygnet": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "073ea5aab052053b8a04a6e8bec9070f1b0bec79b8678b922b20eb0a205fcc15"}, "decider-12b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 23, "raw_sha256": "8bce97638c4a20cf0a51d47559a3c5930749ea91a718bde6c04cb5cccc285456"}, "decider-12b-v1": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 23, "raw_sha256": "ea57273c3fc998e975a861d9cf02347fad7ae9890204b43e10a9c8b335adb106"}, "decider-2b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ec7a2a15338c1d8c9b2a6ed80cec72ae26b73902d330bb4ac335c267160f9d2a"}, "decider-35b-a3b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c4954779ccf9d117f912962850c0a469f2a9491164861596c7e4c41dc9924065"}, "decider-4b-v2": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "984c8ffa68262f89738928f46d139c2cfd0629ec3b9fe878cedceabdd7419d13"}, "decider-chat-gemma4-31b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 7, "raw_sha256": "d3cbbe7954f1c7782b1975c4dcc27eea66540cb12289d6de81d741da1e7e8417"}, "decisio-gemma-4-12b-v080": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "20f9e33bb5977d29ae90d5cfa97494c411d868ce15449997dc27bb41c9b2d837"}, "decisio-gemma-4-12b-v090": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ecceaa4d8a481fd9ad1e47f2108656cc14a0cc5939247bfc2045d8838516be3c"}, "decisio-gemma-4-31b-v080": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "3488203318811a1638d6299408fb409d5045654387f55f483e47909a4fe57595"}, "decision-2-0-vega-27b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c8c211ff80fe56f386c0e7b1212346b050a51843564e443958d2bcbd54521717"}, "decision-2b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "7b43095c7b9cb8741fdb1a81f606ba76beba5ee321589feeb1ed2d8d6aa65e5b"}, "decision-4b-v11": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "9ac1c2fbc04d79d7b44abe7a0073069b63f03f1bc5d26b4d0c22d92e9f5c5cad"}, "decision-4b-v12": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "0e6f88ca7bf86edd90c6e6b2de2b7c2a38d1e94ed62ce890b4d8e19703202913"}, "decision-fast": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "02b13eac42ed1a4eee793dc46f89ef6b5824260c91c4600dbab6cae4b070275b"}, "decision-machine-1": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "9fb20f7a1415fa931bb212eade8b88af31affff7800a8f45949b8b519e3bf2be"}, "decision2-lux-9b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "96a345a3859577fb5ff28b1a1009e6fe1620a2a0634fcb340ec711435d3fc14c"}, "decisor_4b": {"basis": "fastlane", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "5eea2aa8f4336bd46108d7ff11aef92029bf75d8c51bf66ebd19e232343a3dc3"}, "deck-4b-v1-0": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "4f2c1da69bf38d8be2d23902a09e747f6cec05526f4437fc18200b522f72b223"}, "deck31b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "f42da4c751fd4de7fa5ecd2933443d6880da819ca69d25f8f8e471ebaba1c9ef"}, "deem-0.8-v1": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "3f9b49ef1cdb9ec8bfec0078b8d8e244c02a1e3c2dacaa1077a3271a12169d20"}, "deepseek-flash": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 34, "raw_sha256": "c9078842b58b17d1e14e86c940cbe4291066ec8a620c430aac3b4385e656feb0"}, "diffusion-jev": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "68643bcb3ffe0ed80aebac43dda42d7fc390b241b66733e58f6867ce44ef6cb7"}, "drex-max": {"basis": "d1012b", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c0de81123e846e3a583aef52534e15f6ca9ba1b9c515209dbed002d8e7277fe1"}, "eikos-27b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "b616ed2310cebd3bf2ba4f89f3dca586a179923bc47e65e389f9194fa6bde2ae"}, "elephant-1": {"basis": "d1012r6e", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "0587ee81d162b31d99c9d58f20cf1c7b710fa852e6f15a96495095adc95e4afc"}, "evalengine-decision-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "69dfc7fbea3e454f17a1ae58ed4f88a6a1ab9cd740441328ac3503fad3d741e6"}, "exaone-4.0-1.2b-jev-v0.3": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "720d28970ef612fe5665426d87accdf33d5f2d25079bf4c7519c99baa2fa2493"}, "fastino-glide": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "a5736558e4af448fa482a03cbcbd4b119fc82c7695931ca18b671b86dfe1e724"}, "fastino-glide-1.2-open": {"basis": "d1023glide", "kind": "new", "n_decisions": 1497, "n_over": 0, "raw_sha256": "a9249d92742f2e75bd31653c1873f0becfa1a642c939672cecd4bf079f2f1063"}, "fastino-glide-api": {"basis": "d1022g", "kind": "full", "n_decisions": 1497, "n_over": 2, "raw_sha256": "5b818aef392079ea9f55dcf7091edec2a1e0f50709ca12e3c50e1a3934102cec"}, "fastino-gliner-2-5-decide": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "d16bfe5be620cab5043281f645f77a01b96afb3faf35739c7d7e8c3062feafa8"}, "gemini-3.1-flash-lite": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "96adf8183eaf9826b99e72a821469fa1fcc61783bc7b04ec2a95f0abcea883e8"}, "gev-26b-decide": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "5abd3f068aad00b3667b2d4e2ad5016444125033b0add27d1766168794d0ebb0"}, "goddragon-arbiter-4b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "267b7759a397f5758f786dd33e9429617856ab97ad373b9ff857668c1a7b0c5b"}, "gpt-5.6-luna": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 4, "raw_sha256": "5d37f643d12df8d42d02c44dc364058832ddc8298187ebc522f43050b9199cac"}, "gpt-6-luna": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 5, "raw_sha256": "36dce9d9c3ec86a404450d2d6b5e9d6f57a229474e17c5a78a5805689d481088"}, "gpt-6-luna-low": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 3, "raw_sha256": "c5fa6729c53fbe4fc0ec88af75ee26aa997274bc1ef4a820a8c468616c433e33"}, "gte-reranker-modernbert-base": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "6618d1f483c5db4f75d89910d63f14e6dc21d7ad3d5fadc36bdaea7f0fd91b8a"}, "gutsy-0.8b-v0.3": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 29, "raw_sha256": "4fde07db7a19e9f642a8fa7d5a701eeae0c6161339d46d84143f398e646cda28"}, "h2o-lightning-31b": {"basis": "d1012c", "kind": "full", "n_decisions": 1500, "n_over": 15, "raw_sha256": "93f00824bdadcbab56d4eb03c6f03df3dd97e749a80f375135e737b0eaf7b24a"}, "h2o-lightning-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "4b19dbf4aa30baf2cf003b507340ecd863328c7185dd03cbe92bd71c3f95fd7f"}, "hopper": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 22, "raw_sha256": "57bb7a2d7ffd33c217a9c7f140bc4f8e6f08317c6fd5853ede8ce890e78217e0"}, "hopper-12b-trained": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "913c3b27022210759977ca5f705e913e991e766e73a43fcd70c49e8258e5340c"}, "hyland-hs1": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 15, "raw_sha256": "6db633804aa6059c05c75c7647377e3b8406a5b74754a94b5815c33e5626df20"}, "imajev-2b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "6259931d6f68ff5d75091f8c24e101c2d1b8fc48dbd0cc086a904c48563ea4da"}, "imajev-4b-rtx5090-a2": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "9821b3a2207ada1927f31361b7f46f57cf720f0996e441aae3d12c02fa14903e"}, "imajev-9b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "90edc9548e818ddc6eb645f0e73f1446355b33b95e764462a966ef3d47b3d92e"}, "instinct": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "83e1676aa839fe8666ffd6623d701c421d5841083daf6792bd3e3ab4be9d6c5c"}, "instinct-dual-4b": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "8d8a87d185d8fb317472c636b36cbb1f0ac8f03abef8c751bdfa290a9aacc746"}, "iota-decide-4b": {"basis": "d1012b", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "2850e17ddcc3c2ef3a44592b6b377581562ad453ae1561e9d641184ff7ffd1c0"}, "jade": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "af1bc52f6f1fd7e99314d25b508a65acca02cc6034008e5a0526c81d1c005012"}, "janus-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c571f2a44c0e121b3d87e6f5170eb9ff1933798d74d0463453253fd29e9af16a"}, "jeb-35b-a3b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "b2128496c5cb3738eaaa034b2c2d377c679a91f44829bccb3c22082da9dd9dbf"}, "jebadiah-27b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 1, "raw_sha256": "7a2a76fe7aa41176bf8e6739118df4317d86f72560036ca81c415ff9ea83cd48"}, "jebadiah-9b-v2": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "79bf46d6529f270c0ada432c5141b9a772a7e74aede74886c70371b4c0558c36"}, "jebadiah-9b-v2-1": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "61ae20039465eaeb34784d41a6d8ebfac50891f59d5d15aa3d797443a55eb490"}, "jeff_1_0_large": {"basis": "fastlane", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "7db4d828a14d19477a61d242f673e08ff5bfceecaf50d6876f7e0b6d4510c851"}, "jev-1.13.0": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "8656ff45629530a69659bed2ac954b5f171b797c3475aefdf43e043ad9a27017"}, "jev-1.14.0": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "d78c8aa18b0aca996897b8db36fd0198b651e89f7d3092dd527382a4c3fa1c86"}, "jev-27b-autotrust": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "cf95ea812d025aba893f10140133aea49ab96da4176ae2324fd8896db91e5f28"}, "jev-local": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "e2ed03b20d0571d08b97f147f213bb3d43d03808dbd6c87bd940a641de2f7393"}, "jev-omni": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ff2656ebd07f115821a0750566bfd4386a639faf030a1e8c8513373e32d49ecd"}, "jev-qwen3.5-9b-base-nvfp4": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "a44abec9764f9a8cd3521217466bbe7b31ae440a96003bc21fb89920ca4a89bd"}, "jevact": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "67145bec630ccceb1b6cbf2ed3545a5fd7ece3aa60a4e43e06f395b75da7c9f5"}, "jevk5-v0.3-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 2, "raw_sha256": "d2046cfae9a9e187e5fbfc31adffb2f6f488a0b2c07906190a21883936d0647f"}, "jevk5-v02": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "9a41e274d58fe3c21440c48fc5991343d26890314c3e2d7a83b4e665f2b67cd9"}, "jevone": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "78f0cd85e0dc27bb0656e4ef77da781e2bc5f7db2c0bad282cabe513785ee911"}, "jevora-9b-v1": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 1, "raw_sha256": "122f58c4086b5e7a9f843bedd23f5c1f90fd056e66f12776bb4ea02c87765e03"}, "jez-large-1.0.0": {"basis": "d1012r6a", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "839b0f2c709a266119c063301b03c6ed4fd6a479e21b0c262612e699c8672291"}, "jez-small-1.0.0": {"basis": "d1012r6a", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "a8fb82f2357f370b874e471ce45ac30ca64d8f4ec55f2d2ba6672f9fbeba0310"}, "jiwo-0.8b": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "d88ecb1426bb4d4f334fd794d2df611e8ff0c2e68f215dd398391ecdc880e648"}, "jiwo-4b": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "6ed9c50c68d5d4f9aab7aa01dca03019b55a9bf25d9aa650027747e7ad398857"}, "jpt-35b-a3b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "0d5973d31cca49f1db1d1a4a74129c901ed18abf0b820eccb25be75187feb5ae"}, "jpt-4b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "808477c5a1df6bb401c96f67a7926f86fc1ef98a619d099b17f02dd7b442e61a"}, "jqv": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "b0b6b71ce6d34b26ba9566933743529ef41891522c4b474ef2bf0715d0385865"}, "jul-fast": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 5, "raw_sha256": "310cd0a9fcd76f269db9d492d26dc2021928f42bd48a9781edf4a3eced6e0746"}, "julia-1": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ab7f3eae43c230e757539b513d21c9df7c6309bd40d7f79d8706f614919421d0"}, "kahn1": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "878114c9614fa446fdf4f0b19f3f376f1e2d56189cb88d917850cee9b490f54c"}, "kettei-chub": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c6ce25fe51576843951a2209ac6232be4dd36ed6500a540fbc1d39b4272a31e8"}, "kettei-fat": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "3d2949448dbd7db8f422ea1ca8d3535174ce4b69901cce215925361e8f69de08"}, "kev-0.5b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c4fb6f08cecea70f656298aa20bb0cf871326f321b915b15b63f71cd635f32c7"}, "kev-0.6b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ee2f0df07a3fd0ee15061110a930dd9d083da3beb8b427c2ea25d8c7ac3e3565"}, "kev-27b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "4d27f48a9529cad67aae8a734a83bd190cb40c3ca48740394781362f59904d47"}, "kev-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "b336f8e4fcf9cd8e422221dc9e8afc4a1ae86aa775e96dd96d9b77cd32b05179"}, "kev-8b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "2d81c71b3ad4aebe25379fa895cf846c8d771d1352db57ddb40ea29c20aad758"}, "kev-9b-v2": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "6b711cfb67367dbe8b2de13f68a6624eb8a95e178a18b2cff5f48ff3ed9df8ec"}, "knowline-35b-a3b-gen1.5": {"basis": "d1023r8d", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "8c4596bcf207228fedc6e53ebd472ca2ae9190b014f723a0eb6fa2d80199c23c"}, "krino-2b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "fd2bc95717d359c101743ab6a3369884b415ce40d5a2829c399e1304fd67f8f3"}, "kushal-gemma4-31b-it-autoloops": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "18ef06f9a56b5d3e358f5a8ddd0bf942facf1bae52fb8b57b5336b8026c1be5f"}, "launchables-myles-g-12b": {"basis": "d1012b", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "3f0929728f39bd41cfff6c404d6ed8793e8202f393b68264d3b1fc449d6a54ab"}, "launchables-myles-g-31b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "e03a68d867d56fb517eabcb936aca02bb51e0435f71f35f3f2ab88c60c232ae6"}, "laya": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "13dcd6e6e05bb67fb7dd3cdd48dc82f97389d19d328f14dd8956e507aabcacb7"}, "laya-multilingual": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "9a9326104895151069b1587d70f582e80c2fadc1c8e53916c6ce35953197c757"}, "laya-typed-decisions": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "8bdf9a589a94f30be43afb6df0b5b13456339a19bfedd1db2ad051168bc0678d"}, "lev": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ee20ce50431271b7a049b67c0a74bb49c451845fa9bf89abb5ecd889d1f2f123"}, "lev-350m": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "9f0c852059d3783357c767ea5b3fa0f274abd86de08ef16709144507066ff8da"}, "liquid-d1": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "db15fb75b5624475c3a4a7639b8d31483202c00eb5d77b37cee83be50f850986"}, "liquid-d1-3b": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "224f23152788fa45d2622cc48244242c397557429dc38968bd38b549d4bdebf3"}, "liquid-d1-omni-600m": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "f2f1b042286e0deaa166616555df094cec4bef031fd5cfa05a127a88f42a3846"}, "liquid-d1-ultra": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "f69bf80f48267017cd1fa506787850b81602ddfcea93a1451a45323b50ff045b"}, "litjev": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "aa202657d94873553abfbc4c92b0ed6214946b5dbef5fa1fd293fe85bb7f8e9c"}, "localjev-qwen3.5-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ca14fc698f41b5b09e3dbe0330a9fb93b90b0807ed7d1a6d2771b6e48e46f187"}, "lumma-fev-27b": {"basis": "d1012r6e", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "12882c44f730dabe4f25431f106acea8e2db974f98296014505d49068254d067"}, "malkuth-2b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "b07bac525e72e3d92e18b84f4460eedeb61fb547fd9eb4356fe8c53a61404389"}, "malkuth-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "f05d799bb4e1e488c782c906999caa269c1a203a105941e10ce7002971e4f8e7"}, "mammoth-1": {"basis": "d1012r6d", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "0a6e841061f0a69a310e3bb231859a222bbab773d41d749897f49f6a3f85f1cd"}, "manchego-v21-v15": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "3339b566c1fea57c204062a9b469fad3a3e6bc93668d9ae8f981b2c37a04dc12"}, "mercury-decide": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "53bda4b610d997cc4d2e9e61907957f5060fcae113c8afbffd3ba62a3f3c9336"}, "messier-one-v0.2": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "5dfefaa28aa5ddd069012e0ac321a6d4373e7d3169db2d87967f5aaf3fd60138"}, "messier-one-v0.4": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "d2a0c4f797b9e607aebf26b613920a0573844b537aa0ea4aa288d677295a80eb"}, "metask-jev-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "fbc3878d542c0bda91861734aa60d0aa8837a1a2eccfb1a389d2ac57425e7d52"}, "metask-jev-rain-4b": {"basis": "fastlane", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "3d39159cd210bcc1599f900d0d3c689fd1c0afe511ac68cc1d451388f37a84d0"}, "metask_jev_rain_12b": {"basis": "fastlane", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "5f36da21bfff1af39432bb373fac169e9d6d601f88c6c0292e8d255c7dd94851"}, "metask_jev_rain_12b_trained": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 12, "raw_sha256": "9bd816fd308ea8719c977c1a5dcc659a42d5cf9cc3bad9a67969dd66adb8b018"}, "metask_jev_rain_31b_trained": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "89dc88765db2187e2db8baf27fcea03f00f7e17a6cc636b82b22065c7daa3d4a"}, "metask_jev_rain_31b_trained_v3": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "bda80d47f81fabe349214bde71816725f8d6efa032120ac6590f2d2b0fe2b708"}, "mghafiri-qwen3.5-0.8b-decision-model": {"basis": "pool", "kind": "pending", "raw_sha256": "2c6f813f22887965f0d5cb004a6d5916932772cc5efdcd330f394de2ce45eeaf"}, "microsoft-decision-1": {"basis": "msft", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "cadf99e94de455277604759b31028cfb14663f3b815555e5ea7909e0bb891c27"}, "microsoft-decision-1-a2-20261012": {"basis": "msfta2", "kind": "full", "n_decisions": 600, "n_over": 0, "raw_sha256": "c71e7876f88b752e23c4d74f328fcac663a713d071d0dab74cfcb5d7ae425ddb"}, "mirror": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "b5a4b5df0a9383176990daf00fba160ad9ee40113f0921f592b0560f2a576e89"}, "modernbert-jev-v2": {"basis": "a2", "kind": "pending", "raw_sha256": "ed2109fa116bd70d8148cc01e00c4691d4963afc4068eb4f12e0cdb879fe920b"}, "mxbai-rerank-base-v2": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c742dee05c670d10370080128523657ba9b01cdc694f33b20b60dfd30c61c5c6"}, "nagi-enormous": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "a9e0bd4689daaf08d8bfbaeb7bd1306363b56cb32648feec0f01df1e50c946aa"}, "nagi-huge": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "6ee3336abe61c827e5004f20646f35183465492d12404b2cd5d9813d9a51dcb9"}, "nemotron-deciffusion-8b-v2": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "b2d3d5047bb9fa49141d4ce9e724a93934508bf9f0760f1788c1345e242d2af7"}, "nemotron-diffusion-8b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "1b1164f400c978e0eeffec7ca3256bcfb19917c0178f113026307a1eac38e929"}, "nev-2b": {"basis": "d1012", "kind": "pending", "raw_sha256": "3ca90aef11ed254956211d443887fb8cd0a3577f2bbf995f9667416dd5ccd22b"}, "nimble-9b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "9307a2a2fd44194fbedadb20dedc2e40d374de4951983661a3d71de16bf61a03"}, "nimble-v4": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "9df0f0e4919deccb8448004ece256f7ba76f9160308b37378405add632f0f978"}, "nimble-v4-max": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "dddfc639b98a07599170850f3b71702c976891f3a67a1b52ba2101a0e30a1505"}, "nimble-v4-max-open": {"basis": "d1012", "kind": "new", "n_decisions": 1500, "n_over": 1, "raw_sha256": "a5da1f8bfba70caef465094037d96753ac4b78fa437efeea00345541785fe2fd"}, "ninfer-qwen3.8-27b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "a867ee84ddd0c3d77eaaf6b480abce48448fb00a3ad99ba6b1d3bd5ab16b222d"}, "ninfer-qwen3.8-flash-next": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "d2ab2f6ad1a567b389b6cfc264f9f934adfc47ec1c689acd78f2ec8c983f2e1a"}, "noma": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "664b7db62501f00141742b24c3ec593dcd9ec68f0cbf36acce3e3162a2690e2d"}, "open-alternative-jev": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "90c9a1e0a0eba3f8303ecb2905872ec163a2cb4c2639fc8daefcbba62460083c"}, "open-jev-deberta-v3-large": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "a070526cd9b6c091ded12feabe14f1a4ebb44e3def616dcd28f991fdb4377902"}, "open-jev-json-canvas-joshuasp": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "d917817081f87af5081d239ca2c9d250c54fa8c3476785546dc6fa6bd134cbb0"}, "open-jev-zefan-27b-v1.1": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ddc34fd5f87c7c2b2793ede8a35e2862b5008ff8bd98580b253c542a8995e933"}, "open-jev-zefan-2b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "736c1a6a755c5266443d0a66f1e5449736161882fa21e839687ffe9e3b85870b"}, "open-jev-zefan-9b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "6175ca0ef1e20ba101ad5d0ccb001ad2cd0040799ec77a703077dbff1a1189e7"}, "openai-decisions": {"basis": "a5", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "83c37a9258466d201a3a3fb30f5245bd2fa77f29f3c02b8594e68934a7bb77aa"}, "opendecision": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "7cec3fc80bdec8a75ef9f477626058c17392538cb17497bdde839769e6be83be"}, "openjev-sglang": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "16b2211d50e366983ff0094cc9cd19139fb0bdee7907d67f0240d1f03f900217"}, "openjev-thinking": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 1, "raw_sha256": "61676973d19b7640ae35443eca88699cde8f7ed5688ce20ae2d5c3e02c23fa92"}, "openjev-verdict": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "9cf92742176e1bbfcd253bc6d4328ebb3aba5e4b1ba8c376e4a278ae00f2dca0"}, "openjev-verdict-1.4": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "346057693e32c13174441cb7fa07e0baf7f42b5e25cbc8d87c99f545dc1ac61b"}, "opensourcejev-qwen35-4b-q4km": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "fd4b3449178bab8f249b7cf3d3834eb2390d3f40fa3e62a7583c8075f1f160bf"}, "phocinae-largha-150m-v1": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "cf24b4c0b9b2e117334d03931eb292b64f5b58a8476b7ed4e1651a049f3cc8ef"}, "pjev-2b": {"basis": "d1012g", "kind": "remeasured", "n_decisions": 1500, "n_over": 0, "raw_sha256": "22ed3a52fce4dae9d444759bda9e9b98ee0afd09e6b99e7f2125389eee1ecba9", "replaces_raw_sha256": "963d0e0274a8423a8e7b42777636de6de7ba07354e5547f7bc1680a640fe12cb"}, "plumb-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 2, "raw_sha256": "cea61bcc2b3aade2eac8ce065983b76110370e7468336ab716f1a5c065c30e8f"}, "pplx-decider-flash-v1.2": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 15, "raw_sha256": "1604aaf37d5f61c5adcac774792544132e1f955e428ae2130f2fcae5c044a638"}, "pplx-decider-v1-1-27b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 1, "raw_sha256": "9ad9985d34723ad5c8b33c096dcdb51d2127418759fa9ca65d49a3f33e392b43"}, "pplx-decider-v1.2": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 15, "raw_sha256": "959283133bde3c019e3f86cf2f51d8bbeda83a6c9b6171e20cfbc859d03e170e"}, "purplemist-flash-1.0": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "0ab8c2ea91900211c06addf86f406492ccf0171bd2f7b26aaae4a40874cd98c4"}, "purplemist-mini-1.0": {"basis": "d1012g", "kind": "remeasured", "n_decisions": 1500, "n_over": 0, "raw_sha256": "4096478a4661cc7b45dd558e3e6846fae992c279d03b00ba8ad0c3fb97501b16", "replaces_raw_sha256": "88999b4d567867ca466e89f062d197cbeeca7ff06ed11f99c1e8eba63ef46409"}, "quyet-1-0-large": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "b9f8d6aefccad03fe97de9fac1c05e8356c487cf99d386dc51351073094a8072"}, "quyet-1-0-medium": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "02a6400ffa7f6476980b8d8d39aba28e1400acf4363916e9f4cbb9abaa4aab93"}, "quyet-1-0-small": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "4c85e2b9832991275a3f5511c089e4d21d85bdd2e10aa9662584af6cfe1aacc4"}, "quyet-1-0-small-en": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "629be6b32216adfd24500732238d4e2601a99ac999acbaa6c972b0fe4b1c66bf"}, "quyet-1-0-tiny": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "d05f51ba130eecb9185e80b0a85eefddf849ba54a6ad9c8969d30315253b5fe9"}, "qwen3-reranker-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "3c40c77e03e93fe179f1a31c0bda4b1f733ce54e5372b925d8d9881576b9f7cc"}, "qwen3.8-27b": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 233, "raw_sha256": "e513ccfd7f429c1bfc4533c40ba34037b9951812bbddb6d01db7e0ef9753386f"}, "qwen35-9b-jev-data-mix-v2": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "7c950855f88a5e6c8c9f087a0da6e5076b3bb2931730cf9c7c5bdf8b3ccc87bd"}, "raw-phi-4-mini": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "fb2a5a2125c60e524c2d36fd95b360378116fba317ef8c35a4d94578d46f1921"}, "raw-qwen3-0.6b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "834a9e8ab18df357836066c43771a464a1b3cc2ef27897bc9e0209d64dfce69e"}, "raw-qwen3-1.7b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "870029e6c48c20bcbb6975a0d11f0a06782e6c5e8f99aa52d6e041875cfbdbc5"}, "raw-qwen3-4b-instruct-2507": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "48a3883972cb424f284a29e3c5f8034f42031bd975fafdb55417b7dffc554506"}, "raw-qwen3-8b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c1e95a283f49695df510bab603799e2223da9f6b6066dd6d1185f4115c0b7a95"}, "reflex-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 2, "raw_sha256": "61f6c56a108a9db809fb60d626d2597b5adb17c4e7ea5838413b2a74b7f7469f"}, "reflex-instinct-0.6b": {"basis": "d1012", "kind": "pending", "raw_sha256": "64e81d752a550a3d36f44f5596368c810b2e29f37e73c1df0820f669cdef0478"}, "rene-1-31b-fp8": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "a28a8f0068f38b548f064a6e678bf63b13304f9add0a67b448dcc8003c9f38f1"}, "respan-span-02": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "195ae84a9bc4070a553423d3df466e324e1dc9b88baf4c7d21a3a3497170d769"}, "roudone-decider-4b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "2248b5b19883ae1b6bd655d99f869194b2d2909735ca1350974f05aeeef5974a"}, "rsi-jev-v6.1-vl-27b": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "cd7f7a37cc7876fcb8ebc69bbe26e4034e8f7cba908a838eea8a1dea6158f612"}, "ryotide-gemma": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 15, "raw_sha256": "2a5386f1df609c4fc35ee1eedb4866cf8faa1343e0adaa754481efcf653ca8ec"}, "ryotide-qwen": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 2, "raw_sha256": "5c39172d462e454c078acd7d712d1cedab8382015ccc022410e9836a4c747d97"}, "ryotide_qwen9": {"basis": "fastlane", "kind": "full", "n_decisions": 1500, "n_over": 21, "raw_sha256": "ba610e51de275cfd94119118de0c231c87d0e41cb47c8b314f69ade13b3f909d"}, "sage-1.3.0": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "6072a9717b9df8407df60186f95ed8f5332fffbcc363a0bef7b58b56c5465170"}, "sage-1.4.0": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 15, "raw_sha256": "e7a2733a8f6b41729be92076dd5f067c442ef5f917330a2941263d095821763c"}, "seb-9b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "b3996413a3d83f25221f3ac3a7aa64984dbd13637fe15b3caebe518571082b15"}, "seb-9b-v2": {"basis": "d1023r8b", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c9e6f8e95510b52df255af27904d4531ab96f3951d79083c95357cd7b067cd9f"}, "semif-qwen3.5-4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "dcee7d7268a2b77fe9de890b29f5466cc3b0c7119e96a7b607787f057869882b"}, "shisa-de-1": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 1, "raw_sha256": "8d79723565fe8293ac364187153fa31e11dece836eb8ca4992b145b35485c90d"}, "simplejev-qwen3.5-0.8b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 14, "raw_sha256": "e90b75294d8db89e62b78d01971d395bda15bafa861c401959230d3406c5dff1"}, "simplejev-qwen3.6-35b-a3b": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "7cd32be5f5c8177492a086c471436c956ff89527c8b26c3705c4e939597ffd6e"}, "simplejev-qwen3.8-27b": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "f12f4c57ca739705117c34ceb3f847b59b15f9744120c83faf519a83ba9c123b"}, "simplejev-qwen3.8-27b-selfhost": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "a0d5467f884965882f742484830bcc080f9acc702178c43bff20bc52cd627b33"}, "singularity-super-decider": {"basis": "d1012sd", "kind": "new", "n_decisions": 1500, "n_over": 11, "raw_sha256": "ada91d0b290304670eba07789d140f1d1109d27e8385901ea59ea7b380a72b26"}, "singularity-super-decider-thinking": {"basis": "d1012sd", "kind": "new", "n_decisions": 1500, "n_over": 4, "raw_sha256": "e3e189a9e177646cd534cff311044d554dac7188af218d28c51efecfcfa7c543"}, "smalljev": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "3b0366cb4c2263d1847735e8a2f28b2cdee7c327eac648c2ec2ec7752b6aba0d"}, "spark-s1-4b-v6": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "7616314784d623842e80e3b4a3f67f57f9e5e68462397a2434ce5d82f78117ab"}, "spx-cd-flash": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "121e239704573fdce8566eb6b52635016f2c5af2f58e49974ba3b0795ed1f928"}, "spx-cd-omni": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "68cf60d1c0a0fb246c5faa3421da294cd43c57d4fa12254c215732c2cb0baeb5"}, "spx-cd-pro": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 1, "raw_sha256": "6ea839f6eba7a0bc86163f98b42084045ab98271f7d641e28a871e4ead5e0f9a"}, "standard_one_3b_sh": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "39203a7a3bd7ccb0f73d8e96ec70c20897ccea78c42d8cb071a5249f8754c54d"}, "standard_one_3b_sh_v4": {"basis": "d1023r8b", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "db68adaf82b8fdef8e9b78aa6490c162814c8f304062cf4f526a7dc5bf7adcea"}, "standard_one_8b_sh": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ca90bc49e8b63ee0c8a71d2a59fdc24cafb9245a43094be8001cedd37542e4eb"}, "standardone-8b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "d6a40c3cb1a6ae90d5ea7263b53fd3049bc84923dd594d86666b5973ed28d12f"}, "startlux-decision-v1.1-27b-autothink": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 12, "raw_sha256": "8fc7145c01b6854821d0458e56cbf4b67941b3cfa25b732efc317e448695e654"}, "startlux-decision-v1.1-27b-instant": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "18930e0fc47504edc6f2b699cd754d794b2ac0805e1b90d4fa15ff1e2d677a4b"}, "subq-snap-1.1": {"basis": "d1022s", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "5c00dc93acc4afe74679b55d1eb512bc51822d1772cf9d1f3590264127d77584"}, "subq-snap-preview": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "c701361496e6d374bac4bffddec697c686a3b505e42b5dcd74d20bf788d31952"}, "surogate-rune-26b-a4b-v3-v16": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "8e36dca40310ed0398572b7c84f907a6934fb5622d6d81c1f7f0f65bee419c9b"}, "swanone": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "4e477a4b89f32262714601b4ab04a6eee021f2fcc852025bfd6893344a683662"}, "system-one-open": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "1059a8be40a52bc4482c5bd40a45a368b53c2849acb4c370bc8735079c33e5a3"}, "system-one-sg": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "4a0b10b1211f976eec0d893e28ed924eaf7ae3594e13b244950bde446c2a51aa"}, "tacet-sonata": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 3, "raw_sha256": "b4eafd0fa806d51e9bacf529bfff09d728542aa830be28f0eb49a63b3245b506"}, "tde-general-large": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "62ea9354ae0419d257596284de56b376d7a03c1ef604443c157557046feda86d"}, "tern-35b-a3b": {"basis": "d1012r6b", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ed68ec849bf363dffbf6ff8d5aaf43b93c8bb296cd88c5cb682600e270a507ce"}, "torchcast-decision-12b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "02e7de415141abe4084f9a00ec35128f93216823b85853b8d20313e34b1c1d5d"}, "torchcast-decision-27b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 23, "raw_sha256": "c399b8943a5b862eed2678422d8fa4a1687b67f084dd32e4711a2d2fb25516a4"}, "torchcast-decision-4b-v1.1": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "89e6b22e66ae3e706404a3fb4b274de82fe98a9bb83612c865f45805d036ca93"}, "torchcast-decision-4b-v1.2": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ce49d5cd99c5fdfbf960cd6fe3e6af8040779a65a80362072305f700036d14a7"}, "torchcast-decision-4b-v1.3": {"basis": "d1023t", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "057cae292bed0489d85af357e9aa4589b979677deb273b806b35f16180b8f478"}, "trio-spark-v1.3": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "23db012ec50f2876526d8f52225585c0b2b49fb2cbb6ebbc5c13ddfdfbe844c9"}, "typecastlm": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "28e614ab86a813693d4aacf32b3429c640255fed294fbe5285addc6cd89d54f7"}, "typecastlm-1.4.0": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "a18ad95a857ed405be62d0f33d85351cdf121598e90fe9befcc3767946b075f5"}, "uniphore-4b-decider": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "4a175484c796fda013a4e8dff5d1b1c5040fc160f556fec0de7a3ed63ad9f285"}, "vansa-3.4": {"basis": "a4", "kind": "equated", "n_decisions": 600, "n_over": 0, "raw_sha256": "84165e0500a8ebbc881b3cd1115354b060b09c1d964d82e41df5245a2cb22c6e"}, "vega-u-qwen3.5-0.8b": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 15, "raw_sha256": "4ed9788a979c82d2ee377762efebf7fd9a5121da0f8ba90fa5ae07208db6ca83"}, "vega-u-qwen3.5-4b": {"basis": "d1012g", "kind": "remeasured", "n_decisions": 1500, "n_over": 15, "raw_sha256": "96b35b5086e8334b9bd78b2e7016a47e2afbf8b3e784b5001910eca9a7ab959d", "replaces_raw_sha256": "9de996b5ea261523aa04618b336a84aea3389ac1dbd8716ac59d850c6453960f"}, "vegaml-0.8b": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "48dbe477596845729706a27e663c87b7c012385b470dbfa3b44417733fc74d0d"}, "vegaml-4b": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 29, "raw_sha256": "d81688073a01da8be264d0747556559f9c5df689cd15613baa840042a3d6509f"}, "verdict-small": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "48478db8a80fe976a8e17ce8f350b1e1a560fa014d0b7e9781c69e4741a2dc36"}, "verdin-4b": {"basis": "d1012g", "kind": "remeasured", "n_decisions": 1500, "n_over": 0, "raw_sha256": "a09b8331c01577b3a0810cf9c7d11559abf33fdacd7838d5039f73427a637129", "replaces_raw_sha256": "deb42fab9795c17c6548a514ddf6ce3c8f279f3801aea46aa010ddcb8f0815b2"}, "vllm-sr-d3": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 15, "raw_sha256": "460ba4d8d52ae5eb404836416add5623f862e6b811bf24e978770da6ab3a924e"}, "vllm-sr-d3-turbo": {"basis": "d1012", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "bc8bf2ca65d045be2ec2025ddc7f1265786f76261d98471ba1ed1ca3b646f801"}, "wald-26b-a4b": {"basis": "d1023r8a", "kind": "new", "n_decisions": 1500, "n_over": 0, "raw_sha256": "028390538f0b3bba2e307fc10e460cd33fe1ada0ae334672ba726b685ed01185"}, "wald-4b-v2": {"basis": "fastlane", "kind": "full", "n_decisions": 1500, "n_over": 8, "raw_sha256": "02a8b47415657434dd2b201ab173406f37ac9977c5ee9f041632c54ba7ff1d36"}, "wald-4b-v2-1": {"basis": "a2", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "ad2ab071f36e9a26ecdb920cb5a4157167a5d19f49e754695ce555cb855acffb"}, "watersheep": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 1, "raw_sha256": "e5fb9de3247944b393b729f43be7d3d4dfd23579cff10997c1a006b9faefd962"}, "watt-flash-0.1": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "9a942dfd557ce31af5e3a253b60bb82730312dddde348f50b5eb8f2ead76e3bf"}, "winnow-12b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "cee0c2d7091eb77e60972f2ebe5aaabddceff8c93d355da158f05ee185be8da4"}, "wity-1": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 36, "raw_sha256": "931bc910658742136ecceb57956ac31d23da64b9d2ff4abe5193d66910bf483b"}, "wity-1-always": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 36, "raw_sha256": "70894ca1f7b8c65eaa762d8c7c4242dc1f7ed7bdf96ef505639e33b9f77f1f62"}, "wity-1-off": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "cf24b09718b39aff43e3bf01503543f52d37cab114e5314d1e00d64a7e55fdf9"}, "xor-26b-a4b": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 23, "raw_sha256": "a8da30bb951dc70429533ad905429ca0b4c10dac7b441a751408a0617bf685fd"}, "zerank-2": {"basis": "pool", "kind": "full", "n_decisions": 1500, "n_over": 0, "raw_sha256": "1cd85ff2624da748f99f4020f3a61c0f57b250460865868f638b251e811da98e"}}, "rows_over": 56});
/** The pricing module the base release was published with: the earlier one while the base predates the live module, the live one (aa2afcd5) with base v1.6.40. */
export const V170_PREDECESSOR_PRICING_MODULE_SHA256 = V170_ROW_SPEC.predecessor_pricing_module_sha256;
const SPEC = V170_ROW_SPEC.rows;
const GAP_LIFT = new Set(V170_ROW_SPEC.gap_lift);
const EQUATED = new Set(V170_ROW_SPEC.equated);
export const V170_NEW_KEYS = V170_ROW_SPEC.new ?? [];
const NEW = new Set(V170_NEW_KEYS);
/** Rows measured again on the same items on a GPU: each REPLACES its published CPU row in full (scores and times) and carries the CPU row as `previous`. */
export const V170_REMEASURED_KEYS = V170_ROW_SPEC.remeasured ?? [];
const REM = new Set(V170_REMEASURED_KEYS);

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const near = (a, b, t = 1e-9) => finite(a) && finite(b) && Math.abs(a - b) <= t;
const fail = message => { throw new Error(`JevBench v1.7.0: ${message}`); };
const sameSet = (a, b) => a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const same = (a, b, message) => { if (!isDeepStrictEqual(a, b)) fail(message); };
const json = v => JSON.parse(JSON.stringify(v));
const INTERNAL = /[\w.+-]+@[\w-]+\.[a-z]{2,}|\/home\/|\bworkers\/|\br1\d\d\/|\bpod id\b|PREREG|batchA|batchBCD|\bR12\d\b|_wrap\.py|bh-submit|ff14417c|UNLISTED|whatif|what-if|\br\d{3}\b/i;
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
// score_v15.composite and the sort-view weights, exactly as lib/jevbench-cohort-merge.mjs mirrors them.
const AXES = ['intelligence', 'calibration', 'speed', 'cost'];
const SORT_VIEWS = { 'Intelligence only': [1, 0, 0, 0], 'Emphasis on Accuracy 60:20:20': [0.6, 0, 0.2, 0.2], 'Emphasis on Speed 20:60:20': [0.2, 0, 0.6, 0.2],
  'Emphasis on Cost 20:20:60': [0.2, 0, 0.2, 0.6], 'Balanced 33:33:33': [1 / 3, 0, 1 / 3, 1 / 3] };
function composite(axes, weights, gate) {
  const sel = Object.entries(weights).filter(([, w]) => w > 0).map(([a, w]) => [axes[a], w]);
  if (!sel.length || sel.some(([v]) => v == null)) return null;
  let score = sel.some(([v]) => v <= 0) ? 0 : sel.reduce((t, [, w]) => t + w, 0) / sel.reduce((t, [v, w]) => t + w / v, 0);
  const i = axes.intelligence;
  if (i != null && i < gate) score *= (Math.max(0, i) / gate) ** 2;
  for (const a of ['speed', 'cost']) if (axes[a] != null && axes[a] < 50) score *= (Math.max(0, axes[a]) / 50) ** 2;
  return score;
}
// The Speed axis is the mean of score(p50) and score(p95), score(s) = 100 - 20 log10(s / 0.1 s) clipped to 0-100 (lib/jevbench-jev-class.mjs).
const speedScore = s => Math.max(0, Math.min(100, 100 - 20 * Math.log10(s / 0.1)));
const speedAxis = sp => (speedScore(sp.p50_s_adjusted) + speedScore(sp.p95_s_adjusted)) / 2;

/** Fields the 10 s rule re-scores. Everything else of a v1.7 row must equal the chain row. */
export const V170_RESCORED_TOP = ['axes', 'scores', 'views', 'jevbench_score', 'capability', 'composite_ci95', 'intelligence', 'calibration', 'validity', 'speed', 'noul_decisive',
  'rank', 'ranks', 'method', 'rescored_in', 'decision_limit', 'previous'];
export const V170_RESCORED_V16 = ['ci95', 'breakdowns', 'per_type', 'on_S', 'raw_on_A', 'equating_offset', 'g_med_used', 'n_sealed_side', 'ci95_n', 'offset_ci95', 'ci95_basis'];
/** A row measured first under v1.7.0 has no v1.6 value to compare with: it carries none of these. */
export const V170_NEW_ABSENT = ['previous', 'rescored_in'];
/** A re-measured row differs from the published CPU row in these fields besides the re-scored ones (endpoint, date, draw stamp, the disclosure). */
export const V170_REMEASURED_CHANGED = ['measured_in', 'remeasured_in', 'last_measured_on', 'draw', 'endpoint_kind', 'endpoint_condition', 'remeasure'];
const SPEED_TIMES = ['p50_s_raw', 'p95_s_raw', 'p50_s_adjusted', 'p95_s_adjusted'];
export const V170_PENDING_CHANGED = ['ranked', 'rank', 'ranks', 'listing', 'not_ranked_because', 'method', 'decision_limit', 'previous'];
export const V170_PREVIOUS_FIELDS = ['axes', 'scores', 'views', 'jevbench_score', 'capability', 'composite_ci95', 'speed'];
const strip = (row, top, v16 = []) => {
  const c = json(row);
  for (const f of top) delete c[f];
  if (c.v16) for (const f of v16) delete c.v16[f];
  return c;
};

/** `previous` of a row: the chain's published values plus the v1.6.37 feed numbering, built exactly as the builder builds it. */
export function jevV170Previous(chainRow, allRow, feedRow) {
  const pick = f => (chainRow[f] === undefined ? null : json(chainRow[f]));
  return {
    board_release: V170_BASE_RELEASE, method: 'v1.6', measured_in: chainRow.measured_in || chainRow.draw?.release || V170_BASE_REVISION,
    ...Object.fromEntries(V170_PREVIOUS_FIELDS.map(f => [f, pick(f)])),
    rank: feedRow.rank ?? null, ranks: allRow?.ranks == null ? null : json(allRow.ranks),
    open_board_rank: feedRow.open_board_rank ?? null, api_board_rank: feedRow.api_board_rank ?? null,
    capability_rank: feedRow.capability?.rank ?? null, capability_open_board_rank: feedRow.capability?.open_board_rank ?? null,
    capability_api_board_rank: feedRow.capability?.api_board_rank ?? null,
  };
}

const p_offset = s => s.v16?.equating_offset;                 // pool re-runs behind an equating offset move with the rule (A4/A5, the A2 supplement)
const NO_CHANGE_BOARD = '0 of 40 top-five lists change';
/** How the publication approval arrived (a changed top five needs the preview card). Returns the marker the authority must carry. */
function approvalOf(proof, artifact, boardNote, provisional) {
  const pa = proof.publication_approval;
  if (provisional && process.env.JEVBENCH_V170_BUILD_PASS1 === '1') return 'Florian top-five preview approval: PLACEHOLDER.';
  if (JSON.stringify(proof).includes('PLACEHOLDER') || JSON.stringify(artifact).includes('PLACEHOLDER')) fail('approval placeholder not filled');
  const go = pa?.go;
  if (!go || ['channel', 'quote', 'recorded_at', 'recorded_in'].some(k => typeof go[k] !== 'string' || !go[k].trim())) fail('publication GO provenance');
  const notes = artifact.measurement_notes.filter(n => n.startsWith('Publication of v1.7.0:'));
  if (notes.length !== 1) fail('public note must describe how the approval arrived');
  const note = notes[0];
  const noChange = boardNote.includes(NO_CHANGE_BOARD);
  const claimsCard = /Telegram card #\d/.test(note) || /selected "[^"]*" on Telegram card/.test(note);
  if (pa.top_five_effect === 'none') {
    if (!provisional && !noChange) fail('a no-card approval needs the generated no-change board note');
    if (pa.top_five_preview !== null || pa.button_tap !== false || Object.keys(pa).sort().join() !== 'button_tap,go,top_five_effect,top_five_preview') fail('no-card approval provenance');
    if (!note.includes('no top-five preview card') && !note.includes('No top-five list changes') || claimsCard) fail('public note must not claim a preview card');
    return `Florian publication approval: ${go.recorded_in}; no preview card; no button tap.`;
  }
  if (noChange || provisional || pa.top_five_effect !== 'changes') fail('approval and top-five effect disagree');
  const a = pa.top_five_preview;
  const id = a?.card_id;
  const canonical = typeof id === 'string' && /^\d+$/.test(id) && BigInt(id).toString() === id;
  if (!canonical || BigInt(id) <= LAST_CARD || typeof a.selection !== 'string' || !a.selection.trim() || !hex(a.preview_png_sha256)) fail('top-five preview approval card');
  if (!['telegram-button', 'direct-message'].includes(a.channel) || typeof a.button_tap !== 'boolean' || pa.button_tap !== a.button_tap
      || typeof a.recorded_at !== 'string' || !a.recorded_at || typeof a.recorded_in !== 'string' || !a.recorded_in
      || (a.channel === 'telegram-button') !== a.button_tap
      || Object.keys(pa).sort().join() !== 'button_tap,go,top_five_changed_by,top_five_effect,top_five_preview') fail('approval channel and provenance');
  const claimsTap = /selected "[^"]*" on Telegram card/.test(note);
  const saysNoTap = note.includes("The card's own button was not pressed.");
  if ((a.button_tap ? (!claimsTap || saysNoTap) : (claimsTap || !saysNoTap)) || !note.includes(`Telegram card #${id}`)
      || !note.includes(a.preview_png_sha256)) fail('public note must describe how the approval arrived');
  return a.button_tap
    ? `Florian top-five preview approval: Telegram card #${id}; selected "${a.selection}" (${a.recorded_at}); preview PNG SHA-256 ${a.preview_png_sha256}.`
    : `Florian top-five preview approval: ${a.channel} ${a.recorded_at}, recorded as Telegram card #${id} = "${a.selection}" (${a.recorded_in}; no button tap); preview PNG SHA-256 ${a.preview_png_sha256}.`;
}

export function validateJevbenchV170Bundle({ manifest, artifact, categories, carry, proof, predecessor, predecessorManifestSha256 }) {
  for (const value of [manifest, artifact, categories, carry, proof]) {
    publicOnly(value);
    const text = JSON.stringify(value);
    excluded(text);
  }
  // internal names or personal data in the TEXT THIS RELEASE ADDS (inherited published rows legitimately carry older wording such as "UNLISTED_BASE_MODELS")
  const added = [...(artifact?.measurement_notes ?? []), artifact?.label, artifact?.source_note, categories?.rule_note, carry?.label, proof?.authority?.split(' NEW in v1.7.0:')[1],
    ...(artifact?.systems ?? []).filter(x => x.not_ranked_because === V170_PENDING_WHY).map(x => x.not_ranked_because)];
  for (const text of added) if (typeof text === 'string' && INTERNAL.test(text)) fail(`personal e-mail or internal path in new public text: ${text.match(INTERNAL)[0]}`);
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.7.0' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!predecessor || predecessor.manifest?.revision !== V170_BASE_RELEASE || predecessor.manifest.review?.verdict !== 'PASS') fail(`validated ${V170_BASE_RELEASE} predecessor required`);
  same(manifest.predecessor, { revision: V170_BASE_RELEASE, publication_sha256: predecessorManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], predecessor.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity ---------------------------------------------------------------------
  if (artifact?.revision !== 'v1.7.0' || artifact.protocol !== 'jevbench::v1.7' || artifact.status !== 'published' || artifact.provisional !== false) fail('artifact identity');
  same(artifact.method, V170_METHOD, 'method label');
  if (artifact.restates?.board_release !== V170_BASE_RELEASE || !hex(artifact.restates.feed_sha256)) fail('restates binding');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const rows = artifact.systems;
  if (!Array.isArray(rows) || rows.length !== V170_ROW_SPEC.n_rows || rows.length !== artifact.roster_count) fail('row count');
  const by = new Map(rows.map(s => [s.key, s]));
  if (by.size !== rows.length) fail('duplicate row key');
  if (!sameSet([...by.keys()], Object.keys(SPEC))) fail('the row set differs from the build spec');
  if (!sameSet(V170_PENDING_KEYS, Object.entries(SPEC).filter(([, s]) => s.kind === 'pending').map(([k]) => k))) fail('pending set');
  if (!sameSet(V170_NEW_KEYS, Object.entries(SPEC).filter(([, s]) => s.kind === 'new').map(([k]) => k))) fail('new-row set');
  if (!sameSet(V170_REMEASURED_KEYS, Object.entries(SPEC).filter(([, s]) => s.kind === 'remeasured').map(([k]) => k))) fail('re-measured set');
  if (V170_REMEASURED_KEYS.some(k => V170_PENDING_KEYS.includes(k) || NEW.has(k))) fail('a re-measured row is neither pending nor new');
  const ranked = rows.filter(s => s.ranked);
  if (artifact.n_ranked !== ranked.length || ranked.length !== V170_ROW_SPEC.n_ranked) fail('ranked row count');
  const pendingSet = new Set(V170_PENDING_KEYS);

  // --- every row -------------------------------------------------------------------------------
  for (const s of rows) {
    const spec = SPEC[s.key];
    const isNew = spec.kind === 'new';
    const isRem = spec.kind === 'remeasured';
    const p = s.previous;
    if (isNew) {
      // measured first under v1.7.0: no v1.6 value exists, so none is shown (not even a null block); it is ranked with the re-scored rows
      for (const f of V170_NEW_ABSENT) if (f in s) fail(`a new row has no ${f}: ${s.key}`);
      if (s.method !== 'v1.7' || s.new_in !== 'v1.7.0' || s.measured_in !== 'v1.7.0' || s.draw?.release !== 'v1.7.0') fail(`new row marks (method, new_in, measured_in, draw.release): ${s.key}`);
      if (typeof s.underlying !== 'string' || !/MANDATORY DISCLOSURE|FIRST MEASUREMENT/.test(s.underlying) || typeof s.licence !== 'string' || !s.licence.trim()) fail(`a new row carries its mandatory disclosure and licence note: ${s.key}`);
      if (s.cost?.kind == null || typeof s.cost.basis !== 'string' || (finite(s.axes?.cost) ? !finite(s.cost.usd_per_1000) : (s.cost.usd_per_1000 != null || s.ranked || s.listing !== 'listed'))) fail(`new row cost: ${s.key}`);   // an unpriced new row is listed, with no cost figure
      if (/#\d{3,}|\bcustody\b/i.test(`${s.underlying} ${s.endpoint_condition} ${s.cost.basis}`)) fail(`internal reference in the public text of a new row: ${s.key}`);
    } else if (isRem) {
      // measured again in this release: the GPU row replaces the published CPU row, which stays visible as `previous` (method v1.6)
      if (!p || p.board_release !== V170_BASE_RELEASE || p.method !== 'v1.6') fail(`previous block ${s.key}`);
      if ('new_in' in s || 'rescored_in' in s) fail(`a re-measured row is neither new nor re-scored: ${s.key}`);
      if (s.method !== 'v1.7' || s.remeasured_in !== 'v1.7.0' || s.measured_in !== 'v1.7.0' || s.draw?.release !== 'v1.7.0') fail(`re-measured row marks (method, remeasured_in, measured_in, draw.release): ${s.key}`);
      if (s.endpoint_kind !== 'gpu' || typeof s.endpoint_condition !== 'string' || !s.endpoint_condition.trim()) fail(`a re-measured row states its GPU endpoint: ${s.key}`);
      const rm = s.remeasure;
      if (rm?.replaces?.board_release !== V170_BASE_RELEASE || rm.replaces.endpoint_kind === s.endpoint_kind || rm.replaces.in_full !== 'scores and times' || typeof rm.kind !== 'string' || rm.draw !== s.draw?.id
          || typeof rm.disclosure !== 'string' || !/re-measure on the same items/i.test(rm.disclosure) || !/re-measure on the same items/i.test(s.endpoint_condition)) fail(`re-measure disclosure: ${s.key}`);
      if (!s.ranked || s.listing !== 'ranked') fail(`a re-measured row is a full ranked row: ${s.key}`);
      // the GPU numbers are never combined with CPU numbers: no time of the CPU row, no CPU-only speed basis
      if (SPEED_TIMES.every(f => near(s.speed?.[f], p.speed?.[f]))) fail(`the re-measured row carries the CPU times: ${s.key}`);
      if (s.speed?.basis === p.speed?.basis && p.speed?.basis !== undefined) fail(`speed basis of the CPU row: ${s.key}`);
      const remText = `${s.endpoint_condition} ${rm.disclosure}`;
      if (INTERNAL.test(remText) || /#\d{3,}|\bcustody\b/i.test(remText)) fail(`internal reference in the re-measure text: ${s.key}`);
    } else {
      if (!p || p.board_release !== V170_BASE_RELEASE || p.method !== 'v1.6') fail(`previous block ${s.key}`);
      if (p.measured_in !== (s.measured_in || s.draw?.release || V170_BASE_REVISION)) fail(`measured_in is the measurement release: ${s.key}`);
      if ('new_in' in s || 'remeasured_in' in s || 'remeasure' in s) fail(`only a new row has new_in, only a re-measured row has remeasured_in: ${s.key}`);
    }
    if (typeof s.repo === 'string' && !s.repo.startsWith('https://') && s.repo !== '') fail(`repo ${s.key}`);
    if (pendingSet.has(s.key)) {
      // exact pending shape: every v1.6 number is shown as v1.6, the row is in no ranking and carries no v1.7 mark
      if (spec.kind !== 'pending' || s.method !== 'v1.6' || 'rescored_in' in s || s.decision_limit !== null) fail(`pending row mark ${s.key}`);
      if (s.ranked !== false || s.rank !== null || s.listing !== 'remeasure-pending') fail(`a pending row is never ranked: ${s.key}`);
      same(s.ranks, { A: null, B: null, C: null, capability: null }, `null ranks ${s.key}`);
      if (s.not_ranked_because !== V170_PENDING_WHY) fail(`pending reason ${s.key}`);
      for (const f of V170_PREVIOUS_FIELDS) same(s[f] ?? null, p[f], `a pending row shows its v1.6 ${f}: ${s.key}`);
      if (categories.systems?.[s.key]) fail(`a pending row has no v1.7 cells: ${s.key}`);
      continue;
    }
    if (spec.kind === 'pending') fail(`pending row ${s.key} not marked`);
    if (s.method !== 'v1.7' || (isNew || isRem ? 'rescored_in' in s : s.rescored_in !== 'v1.7.0')) fail(`method label ${s.key}`);
    const equated = EQUATED.has(s.key);
    if ((spec.kind === 'equated') !== equated) fail(`equated set ${s.key}`);
    const dl = s.decision_limit;
    const t = equated ? 0.02 : 1e-6;
    // 4. decision_limit
    if (dl?.limit_s !== 10 || dl.treatment !== 'share' || dl.rule !== V170_RULE_TEXT || dl.speed_basis !== V170_SPEED_BASIS) fail(`decision_limit ${s.key}`);
    if (!Number.isInteger(dl.n_over_limit) || !Number.isInteger(dl.n_over_limit_answered_ok) || !Number.isInteger(dl.speed_n) || dl.n_over_limit_answered_ok < 0
        || dl.n_over_limit_answered_ok > dl.n_over_limit || dl.n_over_limit > dl.speed_n) fail(`decision_limit counts ${s.key}`);
    if (dl.n_over_limit !== spec.n_over || dl.speed_n !== spec.n_decisions) fail(`over-limit count must equal the independent count of the raw: ${s.key}`);
    // 2. speed
    const sp = s.speed;
    if (sp?.basis !== V170_SPEED_BASIS || sp.n !== dl.speed_n || !['p50_s_raw', 'p95_s_raw', 'p50_s_adjusted', 'p95_s_adjusted'].every(f => finite(sp[f]) && sp[f] > 0)) fail(`speed block ${s.key}`);
    if (!near(speedAxis(sp), s.axes.speed, equated ? 0.02 : 1e-6)) fail(`Speed axis does not follow from the latencies: ${s.key}`);
    // 1. cost unchanged
    if (!isNew) same(s.axes.cost, p.axes.cost, `cost axis is unchanged: ${s.key}`);
    // 3. composites
    for (const a of ['intelligence', 'calibration']) if (!finite(s.axes[a])) fail(`axis ${a} ${s.key}`);
    if (!finite(s.capability) || !near(s.capability, (s.axes.intelligence + s.axes.calibration) / 2, equated ? 0.0051 : 1e-9)) fail(`capability is the mean of intelligence and calibration: ${s.key}`);
    const unpriced = !finite(s.axes.cost) || !finite(s.scores?.A);          // an unpriced row has no composite
    if (!unpriced) {
      for (const [o, { weights, intelligence_floor }] of Object.entries(artifact.options)) {
        const c = composite(s.axes, Object.fromEntries(AXES.map(a => [a, weights[a] / 100])), intelligence_floor);
        if (!near(c, s.scores[o], equated ? 0.05 : 1e-6)) fail(`score ${o} does not follow from the axes: ${s.key}`);
      }
      if (s.views && (isNew || p.views)) {
        for (const [name, w] of Object.entries(SORT_VIEWS)) {
          if (s.views[name] == null && (isNew || p.views[name] == null)) continue;
          if (!near(composite(s.axes, Object.fromEntries(AXES.map((a, i) => [a, w[i]])), 50), s.views[name], equated ? 0.05 : 1e-6)) fail(`view ${name} does not follow from the axes: ${s.key}`);
        }
      }
    }
    if (s.jevbench_score !== s.scores.A) fail(`headline score ${s.key}`);
    // 5./6. zero-timeout invariance and monotonicity (G_med is held fixed, so Intelligence and Calibration can only fall; exceptions are listed in the spec)
    if (!isNew && !isRem) {      // (a re-measured row is a new measurement of the same weights: its Intelligence and Calibration may move either way)
      const dI = s.axes.intelligence - p.axes.intelligence, dC = s.axes.calibration - p.axes.calibration;
      const eps = equated ? 0.0051 : 1e-9;
      if (dC > eps) fail(`Calibration can only fall under the time limit: ${s.key}`);
      if (dI > eps && !GAP_LIFT.has(s.key)) fail(`Intelligence can only fall under the time limit (disclosed gap effect aside): ${s.key}`);
      if (dI > 0.05) fail(`Intelligence rose by more than the disclosed gap effect: ${s.key}`);
      const pooled = equated || p_offset(s) != null;
      if (dl.n_over_limit === 0 && !pooled && (Math.abs(dI) > 1e-9 || Math.abs(dC) > 1e-9)) fail(`no decision over the limit, so Intelligence and Calibration must equal the v1.6 values: ${s.key}`);
    }
    // 7. intervals
    if (s.composite_ci95 != null && finite(s.scores?.A)) {          // an unpriced row has no composite and no composite interval
      if (!intervalOk(s.composite_ci95, s.scores)) fail(`interval does not contain its own point estimate: ${s.key}`);
      const ci = s.v16?.ci95;
      if (ci) {
        if (ci.B !== 1000 || !Number.isInteger(ci.seed)) fail(`interval B and seed ${s.key}`);
        same(ci.composite, s.composite_ci95, `interval fields agree ${s.key}`);
        if (!(ci.capability[0] <= s.capability + 1e-9 && s.capability <= ci.capability[1] + 1e-9)) fail(`capability interval ${s.key}`);
      }
    }
    // placement
    if (s.ranked) {
      if (!Number.isInteger(s.rank) || s.listing !== 'ranked') fail(`ranked row ${s.key}`);
    } else if (s.rank !== null) fail(`unranked row has no rank ${s.key}`);
  }
  // (a re-scored row's interval uses the seed it was published with: proven against the chain in withV170Restatement)

  // --- board -----------------------------------------------------------------------------------
  const rankedKeys = ranked.map(x => x.key);
  for (const o of ['A', 'B', 'C']) {
    const order = artifact.board?.[o]?.order ?? [];
    if (!sameSet(order, rankedKeys)) fail(`board membership ${o}`);
    const sc = order.map(k => by.get(k).scores[o]);
    if (sc.some((v, i) => i && v > sc[i - 1])) fail(`board order ${o} is sorted by score`);
    for (const x of ranked) if (x.ranks[o] !== order.indexOf(x.key) + 1) fail(`rank ${o} is not the board position: ${x.key}`);
  }
  const capabilityOrder = ranked.slice().sort((x, y) => x.ranks.capability - y.ranks.capability).map(x => x.key);
  const caps = ranked.map(x => x.ranks.capability).sort((a, b) => a - b);
  if (caps.some((v, i) => v !== i + 1)) fail('capability ranks are 1..n');
  for (let i = 1; i < capabilityOrder.length; i++) if (by.get(capabilityOrder[i]).capability > by.get(capabilityOrder[i - 1]).capability) fail('capability rank follows the Capability order');
  for (const x of ranked) if (x.rank !== x.ranks.A) fail(`rank is not the headline rank: ${x.key}`);
  for (const x of rows) if (!x.ranked && (x.rank !== null)) fail(`unranked row has a rank: ${x.key}`);

  // --- carry -----------------------------------------------------------------------------------
  if (carry?.label !== V170_CARRY_LABEL || carry.kind !== 'dated-carry' || !Array.isArray(carry.rows)) fail('carry label');
  if (carry.rows.some(r => r.ranked || by.has(r.key))) fail('carry rows are never ranked and never on the board');

  // --- notes -----------------------------------------------------------------------------------
  const notes = artifact.measurement_notes;
  if (!Array.isArray(notes) || notes.length < 6) fail('measurement notes');
  if (!notes[0].startsWith('Method v1.7:') || !notes[0].includes('10 seconds') || !notes[0].includes('wrong answer and as zero calibration')) fail('the method note states the rule in the agreed words');
  if (/worst calibration/i.test(JSON.stringify(notes))) fail('never "worst calibration" under the share treatment');
  if (!notes.some(n => n.startsWith('Re-measure pending:') && V170_PENDING_KEYS.every(k => n.includes(k)))) fail('the pending note must name all pending rows');
  if (!notes.some(n => n.startsWith('Dated carry:'))) fail('the dated-carry note is mandatory');
  if (!notes.some(n => n.startsWith('Equated API rows:'))) fail('the equated-rows note is mandatory');
  if (NEW.size && !notes.some(n => n.startsWith('New in v1.7.0:') && [...NEW].every(k => n.includes(`(${k})`)))) fail('the new-rows note must name every new row');
  if (!NEW.size && notes.some(n => n.startsWith('New in v1.7.0:'))) fail('a new-rows note without new rows');
  if (REM.size && !notes.some(n => n.startsWith('Re-measured in v1.7.0:') && [...REM].every(k => n.includes(`(${k})`)))) fail('the re-measured-rows note must name every re-measured row');
  if (!REM.size && notes.some(n => n.startsWith('Re-measured in v1.7.0:'))) fail('a re-measured-rows note without re-measured rows');
  const boardNotes = notes.filter(n => n.startsWith('Board effect'));
  if (boardNotes.length !== 1) fail('exactly one board-effect note');
  const boardNote = boardNotes[0];
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V170_BUILD_PASS1 !== '1' : !boardNote.includes('top-five')) fail('board effect: generated top-five note required; provisional build note forbidden');

  // --- proof ---------------------------------------------------------------------------------
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.7.0' || proof.method !== 'jevbench::v1.7' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  same(proof.rule?.treatment, 'share', 'proof treatment');
  same(proof.predecessor, { revision: V170_BASE_RELEASE, publication_sha256: predecessorManifestSha256 }, 'proof predecessor');
  same(proof.restates, artifact.restates, 'proof restates binding');
  if (proof.scorers?.score_v17 !== V170_SCORER_V17_SHA256 || proof.scorers.score_v16 !== V170_SCORER_V16_SHA256) fail('scorer pins');
  for (const k of ['run_under_v17', 'pins_v17', 'build_topics_v16', 'build_categories_v16', 'decisive_v16', 'a2_cells_v16']) if (!hex(proof.scorers?.[k])) fail(`scorer pin ${k}`);
  if (proof.pricing_module_sha256 !== V170_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V170_PREDECESSOR_PRICING_MODULE_SHA256) fail('pricing module pins (aa2afcd5 live; the predecessor release pin)');
  const refrozen = V170_PREDECESSOR_PRICING_MODULE_SHA256 !== V170_PRICING_MODULE_SHA256;
  if (proof.pricing_change?.rows_whose_price_changes !== 0 || !sameSet(proof.pricing_change?.added_keys ?? [], refrozen ? V170_PRICING_ADDED_KEYS : []) || !hex(proof.pricing_change?.receipt_sha256)) fail('pricing change record (one additive key since the base release, no price changes)');
  same(proof.pending?.keys, V170_PENDING_KEYS, 'proof pending set');
  if (!sameSet(Object.keys(proof.remeasured ?? {}), V170_REMEASURED_KEYS)) fail('proof re-measured set');
  for (const k of V170_REMEASURED_KEYS) {
    const q = proof.remeasured[k], spec = SPEC[k];
    if (!hex(q.replaces_raw_sha256) || q.replaces_raw_sha256 !== spec.replaces_raw_sha256 || q.raw_sha256 !== spec.raw_sha256 || q.replaces_raw_sha256 === q.raw_sha256 || q.draw !== by.get(k).draw?.id) fail(`proof re-measured record ${k}`);
  }
  const proofRows = new Map((proof.systems ?? []).map(r => [r.key, r]));
  if (proofRows.size !== rows.length || !sameSet([...proofRows.keys()], [...by.keys()])) fail('system proof coverage');
  for (const x of rows) {
    const q = proofRows.get(x.key), spec = SPEC[x.key];
    if (!hex(q.raw_sha256) || q.raw_sha256 !== spec.raw_sha256 || q.raw_sha256 !== proof.raw_sha256?.[x.key]) fail(`raw sha256 ${x.key}`);
    if (q.basis !== spec.basis || q.kind !== spec.kind || q.method !== x.method || q.rank !== x.rank) fail(`proof agrees with the row ${x.key}`);
    same(q.axes, x.axes, `proof row axes ${x.key}`);
    same(q.composite_A ?? null, x.scores?.A ?? null, `proof row composite ${x.key}`);
    if (x.method === 'v1.7' && q.n_over_limit !== x.decision_limit.n_over_limit) fail(`proof over-limit count ${x.key}`);
  }
  if (typeof proof.authority !== 'string' || !proof.authority.includes(' NEW in v1.7.0:')) fail('authority');
  const marker = approvalOf(proof, artifact, boardNote, provisional);
  if (!proof.authority.endsWith(marker)) fail('publication approval authority binding');

  // --- categories ----------------------------------------------------------------------------
  if (categories?.revision !== 'v1.7.0' || categories.provisional !== false || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  // the live category artifact mixes cells of several draws (each row's own draw counts), so the per-category item bound of validateCategoryArtifact does not apply:
  // check the dimension lists and the shape of every cell instead
  if (categories.kind !== 'category-aggregates' || !Number.isInteger(categories.min_n) || categories.min_n < 1) fail('category kind / min_n');
  const dims = ['families', 'usecases', 'languages', 'topics'];
  for (const dim of dims) {
    const cats = categories[dim];
    if (!Array.isArray(cats) || cats.length < 5 || new Set(cats.map(c => c.key)).size !== cats.length) fail(`category list ${dim}`);
  }
  for (const [key, row] of Object.entries(categories.systems ?? {})) {
    for (const dim of dims) {
      for (const [c, cell] of Object.entries(row[dim] ?? {})) {      // (the pages ignore cells of categories the list does not name, as for every published row)
        if (!Number.isInteger(cell.n) || cell.n < 1 || !finite(cell.competence)) fail(`category cell ${key}.${dim}.${c}`);
      }
    }
  }
  for (const x of rows) {
    const cell = categories.systems?.[x.key];
    if (pendingSet.has(x.key) && cell) fail(`pending row has cells: ${x.key}`);
  }
  // (cells of rows that are not on the board stay as published: dated-carry and superseded catalogue rows, never shown as v1.7)
  return { artifact, categories, carry, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** The restated release's own PASS publication and the immutable history bytes it was published with. Its rows are proven through the chain binding
 *  (the v1.6 chain loads the release itself, fully validated, and a restatement of a chain that lacks it fails the key-set check), so the release is not
 *  validated a second time here. */
async function readV170Predecessor(root) {
  const m = await load(`data/raw/benchmarks/jevbench/v1.6/jevbench-${V170_BASE_RELEASE}-publication.json`, root);
  if (m.value.revision !== V170_BASE_RELEASE || m.value.review?.verdict !== 'PASS') fail(`v1.7.0 needs the published ${V170_BASE_RELEASE} release it restates`);
  const history = await load(m.value.files.history.path, root), carry = await load(m.value.files['history-carry'].path, root);
  if (history.sha256 !== m.value.files.history.sha256 || carry.sha256 !== m.value.files['history-carry'].sha256) fail(`${V170_BASE_RELEASE} history bytes`);
  return { manifest: m.value, manifestSha256: m.sha256, historical: { sha256: history.sha256, carrySha256: carry.sha256 } };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV170Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V170_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const predecessor = await readV170Predecessor(root);
  const previousManifest = { sha256: predecessor.manifestSha256 };
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== predecessor.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== predecessor.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV170Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value, carry: bundle.carry.value,
    proof: bundle.proof.value, predecessor, predecessorManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256, carry: bundle.carry.value, carrySha256: bundle.carry.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value, historical: predecessor.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV170Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readJevbenchV170ForBoard(root)); }   // a PENDING (not yet PASS-reviewed) publication is simply not published; a PASS one with a defect is omitted and logged
  catch { log('JevBench v1.7.0 navigation omitted: publication validation failed'); return false; }
}

/**
 * The live board's view of the publication: an absent manifest or one whose independent review is not yet PASS (a build in progress) is "not published" and the
 * board stays on the validated v1.6 chain; a PASS-reviewed publication is validated in full and any defect throws (it must never fall back silently).
 */
export async function readJevbenchV170ForBoard(root = process.cwd()) {
  let manifest;
  try { manifest = (await load(V170_MANIFEST, root)).value; }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (manifest?.review?.verdict !== 'PASS') return null;
  return readOptionalJevbenchV170Release(root);
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v170BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}

/**
 * The binding to the chain. `chain` = what assembleJevBoard computed from the unchanged v1.6 data:
 * { merged, published, categories (the chain's, for its pool bounds), publishedCarry, isApi, releaseSha256 (the v1.6.1 results bytes), chainLatestRelease }.
 * Returns the restated { merged, published, categories, publishedCarry }; throws when the artifact is not bound to exactly this chain output.
 */
export async function withV170Restatement(chain, v170) {
  const { artifact } = v170;
  const { published, merged, publishedCarry, isApi } = chain;
  if (chain.chainLatestRelease !== V170_BASE_RELEASE) fail(`the chain is at ${chain.chainLatestRelease}, v1.7.0 restates ${V170_BASE_RELEASE}: rebuild v1.7.0 on the new board`);
  if (published.revision !== V170_BASE_REVISION) fail('the chain must be the v1.6.1-based live board');
  const chainRows = published.systems;
  const rows = artifact.systems;
  const chainKeys = new Set(chainRows.map(r => r.key));
  for (const k of V170_NEW_KEYS) if (chainKeys.has(k)) fail(`new row ${k} collides with a row of the live board: it is published already, rebuild v1.7.0 (the row becomes a re-scored row)`);
  const oldRows = rows.filter(r => !NEW.has(r.key));
  if (oldRows.length !== chainRows.length || !sameSet(oldRows.map(r => r.key), chainRows.map(r => r.key)) || rows.length !== chainRows.length + V170_NEW_KEYS.length) fail('the row set differs from the live board it restates (a row was added or removed after the build)');
  // v1.6.37 numbering: the same projection /api/jevbench/latest serves
  const { projectJevbenchFeed } = await import('./jevbench-agent-feed.mjs');
  const all = jevLiveAllArtifact(published, isApi);
  const feed = projectJevbenchFeed(all, chain.releaseSha256, { scopeArtifact: published, isApi, latestRelease: chain.chainLatestRelease });
  const feedSha = createHash('sha256').update(JSON.stringify(feed) + '\n').digest('hex');
  if (feedSha !== artifact.restates.feed_sha256) fail('restates.feed_sha256 is not the sha256 of the feed the live chain produces');
  const feedBy = new Map(feed.systems.map(s => [s.key, s]));
  const allBy = new Map(all.systems.map(s => [s.key, s]));
  const chainBy = new Map(chainRows.map(r => [r.key, r]));
  const pendingSet = new Set(V170_PENDING_KEYS);
  for (const row of rows) {
    if (NEW.has(row.key)) continue;                    // proven by the validator alone: nothing in the chain to bind it to
    const c = structuredClone(chainBy.get(row.key));
    const successor = ({standard_one_3b_sh:'standard_one_3b_sh_v4','seb-9b':'seb-9b-v2'})[row.key];
    if (successor && NEW.has(successor)) c.underlying = (c.underlying ?? '') + ` SUPERSEDED BY: ${successor} (/jev-models/${successor}); the predecessor measurement remains on this board.`;
    same(row.previous, jevV170Previous(c, allBy.get(row.key), feedBy.get(row.key)), `previous differs from the live chain row: ${row.key}`);
    if (pendingSet.has(row.key)) {
      same(strip(row, V170_PENDING_CHANGED), strip(c, V170_PENDING_CHANGED), `pending row differs from the chain outside its pending marks: ${row.key}`);
      continue;
    }
    const rem = REM.has(row.key);
    const topChanged = rem ? [...V170_RESCORED_TOP, ...V170_REMEASURED_CHANGED] : V170_RESCORED_TOP;
    // a re-measured row may carry cleaned wording in its cost.basis text (internal tags of the CPU row removed); every number of the cost object stays the published one
    const noBasis = (r) => (rem && r?.cost && typeof row.cost?.basis === 'string' && row.cost.basis.length > 0) ? { ...r, cost: { ...r.cost, basis: null } } : r;
    same(strip(noBasis(row), topChanged, V170_RESCORED_V16), strip(noBasis(c), topChanged, V170_RESCORED_V16), `identity, cost or presentation field differs from the chain row: ${row.key}`);
    if (rem) {
      // the GPU row replaces exactly the published CPU row: same weights pin, same draw and items, the endpoint kind is what changed
      if (row.remeasure.replaces.endpoint_kind !== c.endpoint_kind || row.endpoint_kind === c.endpoint_kind) fail(`the re-measured row must replace a row of another endpoint kind: ${row.key}`);
      same(row.draw.id, c.draw.id, `re-measured on the same draw: ${row.key}`);
      same(row.model_pin, c.model_pin, `re-measured with the same weights: ${row.key}`);
      same(row.previous.speed, c.speed, `the CPU times stay on the previous block: ${row.key}`);
    }
    same(row.axes.cost, c.axes?.cost, `cost axis differs from the chain row: ${row.key}`);
    same(Object.keys(row.axes).sort(), Object.keys(c.axes).sort(), `axes keys: ${row.key}`);
    for (const f of ['scores', 'views', 'noul_decisive', 'intelligence', 'calibration', 'validity', 'composite_ci95', 'v16']) {
      if ((c[f] === undefined) !== (row[f] === undefined) || (c[f] === null) !== (row[f] === null)) fail(`${f} presence differs from the chain row: ${row.key}`);
    }
    for (const f of ['scores', 'views']) if (c[f]) same(Object.entries(row[f]).map(([k, v]) => [k, v == null]).sort(), Object.entries(c[f]).map(([k, v]) => [k, v == null]).sort(), `${f} suppression pattern: ${row.key}`);
    if (c.noul_decisive) same(Object.keys(row.noul_decisive).sort(), Object.keys(c.noul_decisive).sort(), `noul_decisive fields: ${row.key}`);
    if (c.v16.ci95) same(row.v16.ci95.seed, c.v16.ci95.seed, `the interval uses the published seed: ${row.key}`);
    if (EQUATED.has(row.key)) same(Object.keys(row.intelligence).sort(), Object.keys(c.intelligence).sort(), `equated row keeps its shape: ${row.key}`);
    if (!row.ranked) same(row.ranks, c.ranks, `an unranked row keeps its published ranks field: ${row.key}`);
    // the board's own ranking inputs: every row of the chain that was ranked and is not pending stays ranked
    if (Boolean(c.ranked) !== Boolean(row.ranked)) fail(`ranked flag differs from the chain row: ${row.key}`);
  }
  // dated carry: the chain's rows byte for byte
  same(publishedCarry.rows, v170.carry.rows, 'dated carry rows differ from the chain');
  const board = { ...published.board, A: { ...published.board.A, order: artifact.board.A.order }, B: { ...published.board.B, order: artifact.board.B.order }, C: { ...published.board.C, order: artifact.board.C.order } };
  const restated = { ...published, systems: rows, board, n_ranked: artifact.n_ranked, roster_count: rows.length, restated_by: 'v1.7.0', method: artifact.method, restates: artifact.restates,
    v170_sha256: v170.sha256, measurement_notes: artifact.measurement_notes };
  const mergedRestated = { ...merged, systems: rows, board, n_ranked: artifact.n_ranked, roster_count: rows.length, restated_by: 'v1.7.0', method: artifact.method, restates: artifact.restates, v170_sha256: v170.sha256 };
  // the live category consumers address the board by its base revision (jevbenchCategoryView('v1.6.1', ...)): the restated cells keep that address and say who restated them,
  // and keep the per-row pool bounds the chain registered for the cells (the item counts are unchanged by the rule)
  const base = { ...v170.categories, revision: published.revision, restated_by: 'v1.7.0', systems: {} };
  const chainBounds = apiFullAddendumCategoryBounds(chain.categories) ?? {};
  const bounds = { ...chainBounds };
  // a row measured first under v1.7.0 on a draw that is already on the board has the category item counts of that draw (every plain cohort row of the draw carries the same bounds)
  for (const row of rows.filter(r => NEW.has(r.key))) {
    const counts = new Map();
    for (const c of chainRows) if (c.draw?.id === row.draw?.id && chainBounds[c.key]) counts.set(JSON.stringify(chainBounds[c.key]), (counts.get(JSON.stringify(chainBounds[c.key])) ?? 0) + 1);
    const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (!best) fail(`no category item counts for the draw of the new row ${row.key}`);
    bounds[row.key] = Object.freeze(JSON.parse(best[0]));
  }
  const categories = withRowPoolCategoryRows(base, v170.categories.systems, bounds);
  return { merged: mergedRestated, published: restated, categories, publishedCarry: v170.carry };
}
