# v1.8.18 scoring-free boundary analysis

**PROVISIONAL; no v1.8.18 release build.** All nine rows were provisionally ranked before any release-data edits. Accepted measurement aggregates only.

## Method and scope

The 40 predecessor lists reproduce exactly. Point composites reproduce within 1e-9 for all 47 d1027 rows. Every scenario changes the common shift for every d1027 row with accepted published scores, including the existing ranked field. All other scores and ranking eligibility are carried forward. The production scope/class helpers and frozen jevComposite produce each list. The inherited four held rows and two unpriced rows remain unranked.

The v1.8.10 review treated I/C endpoints separately and four leave-one-out offsets as robustness checks; joint I+C endpoints were stress tests. Both are shown. Family/language correction checks from the original fairness review were not recomputed: this brief forbids rescoring and no accepted corrections exist for these nine rows. These are provisional classifications for independent review.

Unlike the first v1.8.10 recommendation, this conservative proposal also holds rows whose top-five membership appears only at favourable endpoints. That interpretation follows the brief’s instruction to flag every crossing. An alternative that checks only point-held top-five places would rank Quyet Large and Sieve, yielding 322 ranked instead of 320. Neither alternative has been bound.

| Row | A | B | C | Capability | Point top-five places | Classification | Proposed |
|---|---:|---:|---:|---:|---:|---|---|
| Minimodels Decision 1.0 (candy-cane) | 71.877221 | 72.334833 | 71.877221 | 82.474913 | 0 | ROBUST_OUT | rank |
| Starlord-27B-v2.0-preview | 77.414262 | 77.009417 | 77.414262 | 84.480177 | 1 | BOUNDARY | hold |
| H2O-Lightning-31B v1.3.4 (@c35ed950) | 79.253413 | 80.337213 | 79.253413 | 87.855777 | 23 | ROBUST_IN_TOP5 | rank |
| Quyet-1.2-Large | 76.645874 | 76.210416 | 76.645874 | 81.741923 | 0 | BOUNDARY | hold |
| Quyet-1.2-Small | 24.618215 | 20.810157 | 17.095982 | 56.596278 | 0 | ROBUST_OUT | rank |
| Starlord-4B-preview | 72.073501 | 68.918064 | 68.860855 | 64.947806 | 0 | ROBUST_OUT | rank |
| Sieve-31B-v3 | 72.944054 | 73.798901 | 72.944054 | 84.933007 | 0 | BOUNDARY | hold |
| SubQ Snap 1.2 | 78.405858 | 77.800752 | 78.405858 | 83.841254 | 3 | BOUNDARY | hold |
| Cue-Reflex-4B v0.2 | 72.672251 | 66.959186 | 52.383442 | 64.655356 | 0 | ROBUST_OUT | rank |

Proposed count: 315 + 5 = **320**. Configuration is in PROPOSED-CONFIG.json. No T3 exception is proposed for a candidate: H2O has no induced boundary in the precedent scenario set. Existing carried-row T3 texts are retained; their numerical places must be re-reviewed on a completed candidate.

## Interpretation differences requiring the lead’s decision

H2O has 23 point top-five places and zero membership crossings under the separate-axis/LOO set. Sixteen lists cross the line if joint-CI endpoints are made binding. Under a literal all-11-scenario rule H2O is BOUNDARY and would also be held (319 ranked under this proposal); under the v1.8.10 stress-test distinction it is ROBUST_IN_TOP5.

T1 and T2 are reproduced verbatim in PROPOSED-TEXTS.json. T1’s phrase “its top-five places” is imprecise for the two rows that have no point top-five place (Quyet Large and Sieve). If the lead holds them for favourable-scenario crossings, that wording needs a scoped ruling; I have not silently rewritten the mandated text.

## Special cases

H2O: retained accepted scorer aggregates give public-300 I 85.623988, sealed I 90.117771, raw gap -4.493783. The predecessor H2O-31B v1.0.7 has public I 79.976567 and sealed I 78.619495. The new version gains 5.647420 on shared public items, unlike H2O-4B v1.4.1’s public decrease. The new gap normalized to the equating point is 1.276000, close to the old row’s +1.357072 gap. The sealed values compare different item populations and are not a same-draw version comparison. No row-specific sign reversal like the old H2O-4B case is supported here. This covers only the text row; A218’s ImageJevBench and customer-mail obligations remain with the lead.

Quyet Small: public I 44.943311, sealed I 28.634576, gap 16.308736, gap-penalty factor 0.942647. Equated I is 31.794078. The unpenalized four-axis harmonic mean 60.884127, multiplied by (I/50)^2 = 0.404345, exactly reproduces A 24.618215. The low A follows the accepted Intelligence floor and public/sealed gap, despite high Speed/Cost; it is arithmetically plausible.

SubQ is a hosted API (api_flag true, endpoint_kind api), receives no self-hosted latency adjustment and uses its accepted launch-list cost 0.014913069173942242 USD/1,000 decisions. Its point API Composite A/B/C places are robust as memberships; its other board/favourable-scenario and capped-Capability crossings motivate the conservative whole-row hold. It is never put into the open-weights ranking.

## Every primary-list place per candidate

Ranges include all 11 WHATIF scenarios. “Boundary” uses the separate-axis/LOO set; “stress” flags an additional joint-endpoint crossing. Out-of-scope ranks are null.

### Minimodels Decision 1.0 (candy-cane)

| Primary list | Point | All-scenario range | Separate-axis/LOO range | Boundary | Joint stress crossing |
|---|---:|---|---|---|---|
| all/composites/A | 87 | [68, 93] | [77, 90] | False | False |
| all/composites/B | 53 | [37, 65] | [40, 60] | False | False |
| all/composites/C | 66 | [59, 73] | [60, 72] | False | False |
| all/capability/official_caps | 21 | [9, 42] | [16, 35] | False | False |
| all/capability/no_caps | 25 | [13, 47] | [20, 40] | False | False |
| all/capability/cost_off_latency_2x | 21 | [9, 43] | [16, 36] | False | False |
| all/capability/latency_none | 21 | [9, 42] | [16, 35] | False | False |
| all/extra_capability/cost_7x | 21 | [9, 43] | [16, 36] | False | False |
| all/extra_capability/cost_10x | 21 | [9, 43] | [16, 36] | False | False |
| all/extra_capability/rank_field | 25 | [13, 47] | [20, 40] | False | False |
| all/extra_capability/cost_7x_latency_none | 24 | [12, 46] | [19, 39] | False | False |
| all/extra_capability/cost_10x_latency_none | 24 | [12, 46] | [19, 39] | False | False |
| open/composites/A | 69 | [52, 73] | [60, 71] | False | False |
| open/composites/B | 39 | [26, 47] | [28, 45] | False | False |
| open/composites/C | 49 | [44, 54] | [44, 53] | False | False |
| open/capability/official_caps | 15 | [8, 32] | [11, 27] | False | False |
| open/capability/no_caps | 15 | [8, 33] | [11, 28] | False | False |
| open/capability/cost_off_latency_2x | 15 | [8, 33] | [11, 28] | False | False |
| open/capability/latency_none | 15 | [8, 32] | [11, 27] | False | False |
| open/extra_capability/cost_7x | 15 | [8, 33] | [11, 28] | False | False |
| open/extra_capability/cost_10x | 15 | [8, 33] | [11, 28] | False | False |
| open/extra_capability/rank_field | 15 | [8, 33] | [11, 28] | False | False |
| open/extra_capability/cost_7x_latency_none | 15 | [8, 33] | [11, 28] | False | False |
| open/extra_capability/cost_10x_latency_none | 15 | [8, 33] | [11, 28] | False | False |
| api/composites/A | — | — | — | False | False |
| api/composites/B | — | — | — | False | False |
| api/composites/C | — | — | — | False | False |
| api/capability/official_caps | — | — | — | False | False |
| api/capability/no_caps | — | — | — | False | False |
| api/capability/cost_off_latency_2x | — | — | — | False | False |
| api/capability/latency_none | — | — | — | False | False |
| api/extra_capability/cost_7x | — | — | — | False | False |
| api/extra_capability/cost_10x | — | — | — | False | False |
| api/extra_capability/rank_field | — | — | — | False | False |
| api/extra_capability/cost_7x_latency_none | — | — | — | False | False |
| api/extra_capability/cost_10x_latency_none | — | — | — | False | False |
| release/A | 87 | [68, 93] | [77, 90] | False | False |
| release/B | 53 | [37, 65] | [40, 60] | False | False |
| release/C | 66 | [59, 73] | [60, 72] | False | False |
| release/capability | 25 | [13, 47] | [20, 40] | False | False |

### Starlord-27B-v2.0-preview

| Primary list | Point | All-scenario range | Separate-axis/LOO range | Boundary | Joint stress crossing |
|---|---:|---|---|---|---|
| all/composites/A | 13 | [12, 16] | [12, 15] | False | False |
| all/composites/B | 9 | [6, 16] | [6, 13] | False | False |
| all/composites/C | 12 | [10, 15] | [10, 13] | False | False |
| all/capability/official_caps | 12 | [6, 28] | [6, 16] | False | False |
| all/capability/no_caps | 16 | [10, 33] | [10, 20] | False | False |
| all/capability/cost_off_latency_2x | 12 | [6, 29] | [6, 16] | False | False |
| all/capability/latency_none | 12 | [6, 28] | [6, 16] | False | False |
| all/extra_capability/cost_7x | 12 | [6, 29] | [6, 16] | False | False |
| all/extra_capability/cost_10x | 12 | [6, 29] | [6, 16] | False | False |
| all/extra_capability/rank_field | 16 | [10, 33] | [10, 20] | False | False |
| all/extra_capability/cost_7x_latency_none | 15 | [9, 32] | [9, 19] | False | False |
| all/extra_capability/cost_10x_latency_none | 15 | [9, 32] | [9, 19] | False | False |
| open/composites/A | 7 | [7, 9] | [7, 9] | False | False |
| open/composites/B | 5 | [4, 8] | [4, 7] | True | True |
| open/composites/C | 7 | [6, 9] | [6, 9] | False | False |
| open/capability/official_caps | 9 | [6, 21] | [6, 11] | False | False |
| open/capability/no_caps | 9 | [6, 22] | [6, 11] | False | False |
| open/capability/cost_off_latency_2x | 9 | [6, 22] | [6, 11] | False | False |
| open/capability/latency_none | 9 | [6, 21] | [6, 11] | False | False |
| open/extra_capability/cost_7x | 9 | [6, 22] | [6, 11] | False | False |
| open/extra_capability/cost_10x | 9 | [6, 22] | [6, 11] | False | False |
| open/extra_capability/rank_field | 9 | [6, 22] | [6, 11] | False | False |
| open/extra_capability/cost_7x_latency_none | 9 | [6, 22] | [6, 11] | False | False |
| open/extra_capability/cost_10x_latency_none | 9 | [6, 22] | [6, 11] | False | False |
| api/composites/A | — | — | — | False | False |
| api/composites/B | — | — | — | False | False |
| api/composites/C | — | — | — | False | False |
| api/capability/official_caps | — | — | — | False | False |
| api/capability/no_caps | — | — | — | False | False |
| api/capability/cost_off_latency_2x | — | — | — | False | False |
| api/capability/latency_none | — | — | — | False | False |
| api/extra_capability/cost_7x | — | — | — | False | False |
| api/extra_capability/cost_10x | — | — | — | False | False |
| api/extra_capability/rank_field | — | — | — | False | False |
| api/extra_capability/cost_7x_latency_none | — | — | — | False | False |
| api/extra_capability/cost_10x_latency_none | — | — | — | False | False |
| release/A | 13 | [12, 16] | [12, 15] | False | False |
| release/B | 9 | [6, 16] | [6, 13] | False | False |
| release/C | 12 | [10, 15] | [10, 13] | False | False |
| release/capability | 16 | [10, 33] | [10, 20] | False | False |

### H2O-Lightning-31B v1.3.4 (@c35ed950)

| Primary list | Point | All-scenario range | Separate-axis/LOO range | Boundary | Joint stress crossing |
|---|---:|---|---|---|---|
| all/composites/A | 3 | [2, 6] | [3, 3] | False | True |
| all/composites/B | 1 | [1, 1] | [1, 1] | False | False |
| all/composites/C | 3 | [2, 5] | [3, 3] | False | False |
| all/capability/official_caps | 3 | [3, 9] | [3, 4] | False | True |
| all/capability/no_caps | 7 | [6, 13] | [6, 8] | False | False |
| all/capability/cost_off_latency_2x | 3 | [3, 9] | [3, 4] | False | True |
| all/capability/latency_none | 3 | [3, 9] | [3, 4] | False | True |
| all/extra_capability/cost_7x | 3 | [3, 9] | [3, 4] | False | True |
| all/extra_capability/cost_10x | 3 | [3, 9] | [3, 4] | False | True |
| all/extra_capability/rank_field | 7 | [6, 13] | [6, 8] | False | False |
| all/extra_capability/cost_7x_latency_none | 6 | [6, 12] | [6, 7] | False | False |
| all/extra_capability/cost_10x_latency_none | 6 | [6, 12] | [6, 7] | False | False |
| open/composites/A | 2 | [1, 3] | [2, 2] | False | False |
| open/composites/B | 1 | [1, 1] | [1, 1] | False | False |
| open/composites/C | 2 | [1, 3] | [2, 2] | False | False |
| open/capability/official_caps | 3 | [3, 6] | [3, 3] | False | True |
| open/capability/no_caps | 3 | [3, 6] | [3, 3] | False | True |
| open/capability/cost_off_latency_2x | 3 | [3, 6] | [3, 3] | False | True |
| open/capability/latency_none | 3 | [3, 6] | [3, 3] | False | True |
| open/extra_capability/cost_7x | 3 | [3, 6] | [3, 3] | False | True |
| open/extra_capability/cost_10x | 3 | [3, 6] | [3, 3] | False | True |
| open/extra_capability/rank_field | 3 | [3, 6] | [3, 3] | False | True |
| open/extra_capability/cost_7x_latency_none | 3 | [3, 6] | [3, 3] | False | True |
| open/extra_capability/cost_10x_latency_none | 3 | [3, 6] | [3, 3] | False | True |
| api/composites/A | — | — | — | False | False |
| api/composites/B | — | — | — | False | False |
| api/composites/C | — | — | — | False | False |
| api/capability/official_caps | — | — | — | False | False |
| api/capability/no_caps | — | — | — | False | False |
| api/capability/cost_off_latency_2x | — | — | — | False | False |
| api/capability/latency_none | — | — | — | False | False |
| api/extra_capability/cost_7x | — | — | — | False | False |
| api/extra_capability/cost_10x | — | — | — | False | False |
| api/extra_capability/rank_field | — | — | — | False | False |
| api/extra_capability/cost_7x_latency_none | — | — | — | False | False |
| api/extra_capability/cost_10x_latency_none | — | — | — | False | False |
| release/A | 3 | [2, 6] | [3, 3] | False | True |
| release/B | 1 | [1, 1] | [1, 1] | False | False |
| release/C | 3 | [2, 5] | [3, 3] | False | False |
| release/capability | 7 | [6, 13] | [6, 8] | False | False |

### Quyet-1.2-Large

| Primary list | Point | All-scenario range | Separate-axis/LOO range | Boundary | Joint stress crossing |
|---|---:|---|---|---|---|
| all/composites/A | 20 | [15, 28] | [18, 22] | False | False |
| all/composites/B | 12 | [8, 23] | [9, 20] | False | False |
| all/composites/C | 17 | [15, 26] | [16, 20] | False | False |
| all/capability/official_caps | 28 | [12, 48] | [19, 38] | False | False |
| all/capability/no_caps | 32 | [16, 54] | [23, 43] | False | False |
| all/capability/cost_off_latency_2x | 28 | [12, 50] | [19, 39] | False | False |
| all/capability/latency_none | 28 | [12, 48] | [19, 38] | False | False |
| all/extra_capability/cost_7x | 28 | [12, 50] | [19, 39] | False | False |
| all/extra_capability/cost_10x | 28 | [12, 50] | [19, 39] | False | False |
| all/extra_capability/rank_field | 32 | [16, 54] | [23, 43] | False | False |
| all/extra_capability/cost_7x_latency_none | 31 | [15, 53] | [22, 42] | False | False |
| all/extra_capability/cost_10x_latency_none | 31 | [15, 53] | [22, 42] | False | False |
| open/composites/A | 14 | [11, 18] | [12, 14] | False | False |
| open/composites/B | 7 | [5, 14] | [5, 12] | True | True |
| open/composites/C | 12 | [11, 17] | [11, 13] | False | False |
| open/capability/official_caps | 21 | [9, 36] | [13, 29] | False | False |
| open/capability/no_caps | 21 | [9, 37] | [13, 30] | False | False |
| open/capability/cost_off_latency_2x | 21 | [9, 37] | [13, 30] | False | False |
| open/capability/latency_none | 21 | [9, 36] | [13, 29] | False | False |
| open/extra_capability/cost_7x | 21 | [9, 37] | [13, 30] | False | False |
| open/extra_capability/cost_10x | 21 | [9, 37] | [13, 30] | False | False |
| open/extra_capability/rank_field | 21 | [9, 37] | [13, 30] | False | False |
| open/extra_capability/cost_7x_latency_none | 21 | [9, 37] | [13, 30] | False | False |
| open/extra_capability/cost_10x_latency_none | 21 | [9, 37] | [13, 30] | False | False |
| api/composites/A | — | — | — | False | False |
| api/composites/B | — | — | — | False | False |
| api/composites/C | — | — | — | False | False |
| api/capability/official_caps | — | — | — | False | False |
| api/capability/no_caps | — | — | — | False | False |
| api/capability/cost_off_latency_2x | — | — | — | False | False |
| api/capability/latency_none | — | — | — | False | False |
| api/extra_capability/cost_7x | — | — | — | False | False |
| api/extra_capability/cost_10x | — | — | — | False | False |
| api/extra_capability/rank_field | — | — | — | False | False |
| api/extra_capability/cost_7x_latency_none | — | — | — | False | False |
| api/extra_capability/cost_10x_latency_none | — | — | — | False | False |
| release/A | 20 | [15, 28] | [18, 22] | False | False |
| release/B | 12 | [8, 23] | [9, 20] | False | False |
| release/C | 17 | [15, 26] | [16, 20] | False | False |
| release/capability | 32 | [16, 54] | [23, 43] | False | False |

### Quyet-1.2-Small

| Primary list | Point | All-scenario range | Separate-axis/LOO range | Boundary | Joint stress crossing |
|---|---:|---|---|---|---|
| all/composites/A | 213 | [193, 223] | [193, 223] | False | False |
| all/composites/B | 216 | [195, 225] | [195, 225] | False | False |
| all/composites/C | 215 | [195, 224] | [195, 224] | False | False |
| all/capability/official_caps | 198 | [178, 214] | [184, 210] | False | False |
| all/capability/no_caps | 223 | [198, 239] | [208, 235] | False | False |
| all/capability/cost_off_latency_2x | 207 | [184, 223] | [192, 219] | False | False |
| all/capability/latency_none | 205 | [184, 221] | [191, 217] | False | False |
| all/extra_capability/cost_7x | 206 | [184, 222] | [191, 218] | False | False |
| all/extra_capability/cost_10x | 207 | [184, 223] | [192, 219] | False | False |
| all/extra_capability/rank_field | 223 | [198, 239] | [208, 235] | False | False |
| all/extra_capability/cost_7x_latency_none | 220 | [196, 236] | [205, 232] | False | False |
| all/extra_capability/cost_10x_latency_none | 221 | [196, 237] | [206, 233] | False | False |
| open/composites/A | 171 | [154, 179] | [154, 179] | False | False |
| open/composites/B | 172 | [154, 180] | [154, 180] | False | False |
| open/composites/C | 171 | [154, 179] | [154, 179] | False | False |
| open/capability/official_caps | 163 | [144, 179] | [150, 175] | False | False |
| open/capability/no_caps | 174 | [152, 190] | [160, 186] | False | False |
| open/capability/cost_off_latency_2x | 167 | [146, 183] | [153, 179] | False | False |
| open/capability/latency_none | 168 | [148, 184] | [155, 180] | False | False |
| open/extra_capability/cost_7x | 167 | [146, 183] | [153, 179] | False | False |
| open/extra_capability/cost_10x | 167 | [146, 183] | [153, 179] | False | False |
| open/extra_capability/rank_field | 174 | [152, 190] | [160, 186] | False | False |
| open/extra_capability/cost_7x_latency_none | 174 | [152, 190] | [160, 186] | False | False |
| open/extra_capability/cost_10x_latency_none | 174 | [152, 190] | [160, 186] | False | False |
| api/composites/A | — | — | — | False | False |
| api/composites/B | — | — | — | False | False |
| api/composites/C | — | — | — | False | False |
| api/capability/official_caps | — | — | — | False | False |
| api/capability/no_caps | — | — | — | False | False |
| api/capability/cost_off_latency_2x | — | — | — | False | False |
| api/capability/latency_none | — | — | — | False | False |
| api/extra_capability/cost_7x | — | — | — | False | False |
| api/extra_capability/cost_10x | — | — | — | False | False |
| api/extra_capability/rank_field | — | — | — | False | False |
| api/extra_capability/cost_7x_latency_none | — | — | — | False | False |
| api/extra_capability/cost_10x_latency_none | — | — | — | False | False |
| release/A | 213 | [193, 223] | [193, 223] | False | False |
| release/B | 216 | [195, 225] | [195, 225] | False | False |
| release/C | 215 | [195, 224] | [195, 224] | False | False |
| release/capability | 223 | [198, 239] | [208, 235] | False | False |

### Starlord-4B-preview

| Primary list | Point | All-scenario range | Separate-axis/LOO range | Boundary | Joint stress crossing |
|---|---:|---|---|---|---|
| all/composites/A | 81 | [47, 104] | [64, 94] | False | False |
| all/composites/B | 88 | [63, 110] | [70, 103] | False | False |
| all/composites/C | 87 | [42, 109] | [56, 107] | False | False |
| all/capability/official_caps | 139 | [121, 163] | [130, 151] | False | False |
| all/capability/no_caps | 158 | [136, 183] | [147, 170] | False | False |
| all/capability/cost_off_latency_2x | 145 | [127, 169] | [136, 157] | False | False |
| all/capability/latency_none | 144 | [124, 169] | [133, 156] | False | False |
| all/extra_capability/cost_7x | 145 | [127, 169] | [136, 157] | False | False |
| all/extra_capability/cost_10x | 145 | [127, 169] | [136, 157] | False | False |
| all/extra_capability/rank_field | 158 | [136, 183] | [147, 170] | False | False |
| all/extra_capability/cost_7x_latency_none | 156 | [134, 181] | [145, 168] | False | False |
| all/extra_capability/cost_10x_latency_none | 156 | [134, 181] | [145, 168] | False | False |
| open/composites/A | 63 | [34, 82] | [49, 74] | False | False |
| open/composites/B | 67 | [47, 84] | [53, 78] | False | False |
| open/composites/C | 64 | [30, 81] | [42, 79] | False | False |
| open/capability/official_caps | 110 | [92, 130] | [101, 119] | False | False |
| open/capability/no_caps | 117 | [96, 138] | [106, 126] | False | False |
| open/capability/cost_off_latency_2x | 112 | [94, 132] | [103, 121] | False | False |
| open/capability/latency_none | 113 | [93, 134] | [102, 122] | False | False |
| open/extra_capability/cost_7x | 112 | [94, 132] | [103, 121] | False | False |
| open/extra_capability/cost_10x | 112 | [94, 132] | [103, 121] | False | False |
| open/extra_capability/rank_field | 117 | [96, 138] | [106, 126] | False | False |
| open/extra_capability/cost_7x_latency_none | 117 | [96, 138] | [106, 126] | False | False |
| open/extra_capability/cost_10x_latency_none | 117 | [96, 138] | [106, 126] | False | False |
| api/composites/A | — | — | — | False | False |
| api/composites/B | — | — | — | False | False |
| api/composites/C | — | — | — | False | False |
| api/capability/official_caps | — | — | — | False | False |
| api/capability/no_caps | — | — | — | False | False |
| api/capability/cost_off_latency_2x | — | — | — | False | False |
| api/capability/latency_none | — | — | — | False | False |
| api/extra_capability/cost_7x | — | — | — | False | False |
| api/extra_capability/cost_10x | — | — | — | False | False |
| api/extra_capability/rank_field | — | — | — | False | False |
| api/extra_capability/cost_7x_latency_none | — | — | — | False | False |
| api/extra_capability/cost_10x_latency_none | — | — | — | False | False |
| release/A | 81 | [47, 104] | [64, 94] | False | False |
| release/B | 88 | [63, 110] | [70, 103] | False | False |
| release/C | 87 | [42, 109] | [56, 107] | False | False |
| release/capability | 158 | [136, 183] | [147, 170] | False | False |

### Sieve-31B-v3

| Primary list | Point | All-scenario range | Separate-axis/LOO range | Boundary | Joint stress crossing |
|---|---:|---|---|---|---|
| all/composites/A | 67 | [51, 80] | [56, 70] | False | False |
| all/composites/B | 33 | [22, 47] | [24, 44] | False | False |
| all/composites/C | 55 | [45, 63] | [49, 56] | False | False |
| all/capability/official_caps | 9 | [5, 25] | [5, 14] | True | True |
| all/capability/no_caps | 13 | [9, 29] | [9, 18] | False | False |
| all/capability/cost_off_latency_2x | 9 | [5, 25] | [5, 14] | True | True |
| all/capability/latency_none | 9 | [5, 25] | [5, 14] | True | True |
| all/extra_capability/cost_7x | 9 | [5, 25] | [5, 14] | True | True |
| all/extra_capability/cost_10x | 9 | [5, 25] | [5, 14] | True | True |
| all/extra_capability/rank_field | 13 | [9, 29] | [9, 18] | False | False |
| all/extra_capability/cost_7x_latency_none | 12 | [8, 28] | [8, 17] | False | False |
| all/extra_capability/cost_10x_latency_none | 12 | [8, 28] | [8, 17] | False | False |
| open/composites/A | 51 | [37, 62] | [42, 53] | False | False |
| open/composites/B | 22 | [14, 35] | [15, 32] | False | False |
| open/composites/C | 40 | [32, 46] | [36, 40] | False | False |
| open/capability/official_caps | 7 | [5, 19] | [5, 9] | True | True |
| open/capability/no_caps | 7 | [5, 19] | [5, 9] | True | True |
| open/capability/cost_off_latency_2x | 7 | [5, 19] | [5, 9] | True | True |
| open/capability/latency_none | 7 | [5, 19] | [5, 9] | True | True |
| open/extra_capability/cost_7x | 7 | [5, 19] | [5, 9] | True | True |
| open/extra_capability/cost_10x | 7 | [5, 19] | [5, 9] | True | True |
| open/extra_capability/rank_field | 7 | [5, 19] | [5, 9] | True | True |
| open/extra_capability/cost_7x_latency_none | 7 | [5, 19] | [5, 9] | True | True |
| open/extra_capability/cost_10x_latency_none | 7 | [5, 19] | [5, 9] | True | True |
| api/composites/A | — | — | — | False | False |
| api/composites/B | — | — | — | False | False |
| api/composites/C | — | — | — | False | False |
| api/capability/official_caps | — | — | — | False | False |
| api/capability/no_caps | — | — | — | False | False |
| api/capability/cost_off_latency_2x | — | — | — | False | False |
| api/capability/latency_none | — | — | — | False | False |
| api/extra_capability/cost_7x | — | — | — | False | False |
| api/extra_capability/cost_10x | — | — | — | False | False |
| api/extra_capability/rank_field | — | — | — | False | False |
| api/extra_capability/cost_7x_latency_none | — | — | — | False | False |
| api/extra_capability/cost_10x_latency_none | — | — | — | False | False |
| release/A | 67 | [51, 80] | [56, 70] | False | False |
| release/B | 33 | [22, 47] | [24, 44] | False | False |
| release/C | 55 | [45, 63] | [49, 56] | False | False |
| release/capability | 13 | [9, 29] | [9, 18] | False | False |

### SubQ Snap 1.2

| Primary list | Point | All-scenario range | Separate-axis/LOO range | Boundary | Joint stress crossing |
|---|---:|---|---|---|---|
| all/composites/A | 6 | [5, 11] | [5, 9] | True | True |
| all/composites/B | 7 | [4, 11] | [4, 8] | True | True |
| all/composites/C | 6 | [5, 10] | [5, 8] | True | True |
| all/capability/official_caps | 16 | [7, 33] | [9, 21] | False | False |
| all/capability/no_caps | 20 | [11, 38] | [13, 25] | False | False |
| all/capability/cost_off_latency_2x | 16 | [7, 34] | [9, 21] | False | False |
| all/capability/latency_none | 16 | [7, 33] | [9, 21] | False | False |
| all/extra_capability/cost_7x | 16 | [7, 34] | [9, 21] | False | False |
| all/extra_capability/cost_10x | 16 | [7, 34] | [9, 21] | False | False |
| all/extra_capability/rank_field | 20 | [11, 38] | [13, 25] | False | False |
| all/extra_capability/cost_7x_latency_none | 19 | [10, 37] | [12, 24] | False | False |
| all/extra_capability/cost_10x_latency_none | 19 | [10, 37] | [12, 24] | False | False |
| open/composites/A | — | — | — | False | False |
| open/composites/B | — | — | — | False | False |
| open/composites/C | — | — | — | False | False |
| open/capability/official_caps | — | — | — | False | False |
| open/capability/no_caps | — | — | — | False | False |
| open/capability/cost_off_latency_2x | — | — | — | False | False |
| open/capability/latency_none | — | — | — | False | False |
| open/extra_capability/cost_7x | — | — | — | False | False |
| open/extra_capability/cost_10x | — | — | — | False | False |
| open/extra_capability/rank_field | — | — | — | False | False |
| open/extra_capability/cost_7x_latency_none | — | — | — | False | False |
| open/extra_capability/cost_10x_latency_none | — | — | — | False | False |
| api/composites/A | 3 | [2, 5] | [2, 5] | False | False |
| api/composites/B | 4 | [2, 6] | [2, 4] | False | True |
| api/composites/C | 3 | [2, 4] | [2, 4] | False | False |
| api/capability/official_caps | 6 | [1, 8] | [3, 6] | True | True |
| api/capability/no_caps | 10 | [5, 12] | [7, 10] | False | True |
| api/capability/cost_off_latency_2x | 6 | [1, 8] | [3, 6] | True | True |
| api/capability/latency_none | 6 | [1, 8] | [3, 6] | True | True |
| api/extra_capability/cost_7x | 6 | [1, 8] | [3, 6] | True | True |
| api/extra_capability/cost_10x | 6 | [1, 8] | [3, 6] | True | True |
| api/extra_capability/rank_field | 10 | [5, 12] | [7, 10] | False | True |
| api/extra_capability/cost_7x_latency_none | 9 | [4, 11] | [6, 9] | False | True |
| api/extra_capability/cost_10x_latency_none | 9 | [4, 11] | [6, 9] | False | True |
| release/A | 6 | [5, 11] | [5, 9] | True | True |
| release/B | 7 | [4, 11] | [4, 8] | True | True |
| release/C | 6 | [5, 10] | [5, 8] | True | True |
| release/capability | 20 | [11, 38] | [13, 25] | False | False |

### Cue-Reflex-4B v0.2

| Primary list | Point | All-scenario range | Separate-axis/LOO range | Boundary | Joint stress crossing |
|---|---:|---|---|---|---|
| all/composites/A | 72 | [31, 133] | [41, 133] | False | False |
| all/composites/B | 106 | [79, 136] | [85, 136] | False | False |
| all/composites/C | 126 | [105, 139] | [108, 139] | False | False |
| all/capability/official_caps | 142 | [126, 168] | [133, 153] | False | False |
| all/capability/no_caps | 161 | [141, 188] | [150, 172] | False | False |
| all/capability/cost_off_latency_2x | 148 | [132, 174] | [139, 159] | False | False |
| all/capability/latency_none | 147 | [129, 174] | [136, 158] | False | False |
| all/extra_capability/cost_7x | 148 | [132, 174] | [139, 159] | False | False |
| all/extra_capability/cost_10x | 148 | [132, 174] | [139, 159] | False | False |
| all/extra_capability/rank_field | 161 | [141, 188] | [150, 172] | False | False |
| all/extra_capability/cost_7x_latency_none | 159 | [139, 186] | [148, 170] | False | False |
| all/extra_capability/cost_10x_latency_none | 159 | [139, 186] | [148, 170] | False | False |
| open/composites/A | 55 | [21, 105] | [29, 105] | False | False |
| open/composites/B | 81 | [59, 107] | [64, 107] | False | False |
| open/composites/C | 97 | [78, 108] | [80, 108] | False | False |
| open/capability/official_caps | 113 | [97, 135] | [104, 121] | False | False |
| open/capability/no_caps | 120 | [101, 143] | [109, 128] | False | False |
| open/capability/cost_off_latency_2x | 115 | [99, 137] | [106, 123] | False | False |
| open/capability/latency_none | 116 | [98, 139] | [105, 124] | False | False |
| open/extra_capability/cost_7x | 115 | [99, 137] | [106, 123] | False | False |
| open/extra_capability/cost_10x | 115 | [99, 137] | [106, 123] | False | False |
| open/extra_capability/rank_field | 120 | [101, 143] | [109, 128] | False | False |
| open/extra_capability/cost_7x_latency_none | 120 | [101, 143] | [109, 128] | False | False |
| open/extra_capability/cost_10x_latency_none | 120 | [101, 143] | [109, 128] | False | False |
| api/composites/A | — | — | — | False | False |
| api/composites/B | — | — | — | False | False |
| api/composites/C | — | — | — | False | False |
| api/capability/official_caps | — | — | — | False | False |
| api/capability/no_caps | — | — | — | False | False |
| api/capability/cost_off_latency_2x | — | — | — | False | False |
| api/capability/latency_none | — | — | — | False | False |
| api/extra_capability/cost_7x | — | — | — | False | False |
| api/extra_capability/cost_10x | — | — | — | False | False |
| api/extra_capability/rank_field | — | — | — | False | False |
| api/extra_capability/cost_7x_latency_none | — | — | — | False | False |
| api/extra_capability/cost_10x_latency_none | — | — | — | False | False |
| release/A | 72 | [31, 133] | [41, 133] | False | False |
| release/B | 106 | [79, 136] | [85, 136] | False | False |
| release/C | 126 | [105, 139] | [108, 139] | False | False |
| release/capability | 161 | [141, 188] | [150, 172] | False | False |

## Every carried top-five place changed because of the nine candidates

Comparison uses the same scenario with and without the nine promotions; this isolates their effect from the offset’s own effect. The JSON includes every scenario, list and carried row, including numerical place changes within the top five.

| Scenario | List | Carried row | Before | After |
|---|---|---|---:|---:|
| point | all/composites/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| point | all/composites/A | Super Decider | 4 | 5 |
| point | all/composites/A | Myles-G 12B (Launchables) | 5 | 7 |
| point | all/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| point | all/composites/B | Super Decider | 2 | 3 |
| point | all/composites/B | decide-1.1 (decide.sh, API) | 3 | 4 |
| point | all/composites/B | kettei-fat (Sqwish) | 4 | 5 |
| point | all/composites/B | Karpo-Decision-31B | 5 | 6 |
| point | all/composites/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| point | all/composites/C | Super Decider | 4 | 5 |
| point | all/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 7 |
| point | all/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| point | all/capability/official_caps | kettei-fat (Sqwish) | 4 | 5 |
| point | all/capability/official_caps | Super Decider (thinking) | 5 | 6 |
| point | all/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| point | all/capability/cost_off_latency_2x | kettei-fat (Sqwish) | 4 | 5 |
| point | all/capability/cost_off_latency_2x | Super Decider (thinking) | 5 | 6 |
| point | all/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| point | all/capability/latency_none | kettei-fat (Sqwish) | 4 | 5 |
| point | all/capability/latency_none | Super Decider (thinking) | 5 | 6 |
| point | all/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| point | all/extra_capability/cost_7x | kettei-fat (Sqwish) | 4 | 5 |
| point | all/extra_capability/cost_7x | Super Decider (thinking) | 5 | 6 |
| point | all/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| point | all/extra_capability/cost_10x | kettei-fat (Sqwish) | 4 | 5 |
| point | all/extra_capability/cost_10x | Super Decider (thinking) | 5 | 6 |
| point | open/composites/A | Torchcast Decision 31B v1.0 | 2 | 3 |
| point | open/composites/A | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| point | open/composites/A | Arcbright Elf 1 12B (r2) | 4 | 5 |
| point | open/composites/A | Wald 26B-A4B (Gemma 4 26B-A4B) | 5 | 6 |
| point | open/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| point | open/composites/B | Karpo-Decision-31B | 2 | 3 |
| point | open/composites/B | Torchcast Decision 4B (v1.3) | 3 | 4 |
| point | open/composites/B | H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted) | 4 | 6 |
| point | open/composites/B | Fastino GLiDE 1.2 (open weights, self-hosted) | 5 | 8 |
| point | open/composites/C | Torchcast Decision 31B v1.0 | 2 | 3 |
| point | open/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| point | open/composites/C | Arcbright Elf 1 12B (r2) | 4 | 5 |
| point | open/composites/C | Wald 26B-A4B (Gemma 4 26B-A4B) | 5 | 6 |
| point | open/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| point | open/capability/official_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| point | open/capability/official_caps | KnowLine 31B-Gen1 | 5 | 6 |
| point | open/capability/no_caps | Karpo-Decision-31B | 3 | 4 |
| point | open/capability/no_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| point | open/capability/no_caps | KnowLine 31B-Gen1 | 5 | 6 |
| point | open/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| point | open/capability/cost_off_latency_2x | baselabs mammoth-1 (27B) | 4 | 5 |
| point | open/capability/cost_off_latency_2x | KnowLine 31B-Gen1 | 5 | 6 |
| point | open/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| point | open/capability/latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| point | open/capability/latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| point | open/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| point | open/extra_capability/cost_7x | baselabs mammoth-1 (27B) | 4 | 5 |
| point | open/extra_capability/cost_7x | KnowLine 31B-Gen1 | 5 | 6 |
| point | open/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| point | open/extra_capability/cost_10x | baselabs mammoth-1 (27B) | 4 | 5 |
| point | open/extra_capability/cost_10x | KnowLine 31B-Gen1 | 5 | 6 |
| point | open/extra_capability/rank_field | Karpo-Decision-31B | 3 | 4 |
| point | open/extra_capability/rank_field | baselabs mammoth-1 (27B) | 4 | 5 |
| point | open/extra_capability/rank_field | KnowLine 31B-Gen1 | 5 | 6 |
| point | open/extra_capability/cost_7x_latency_none | Karpo-Decision-31B | 3 | 4 |
| point | open/extra_capability/cost_7x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| point | open/extra_capability/cost_7x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| point | open/extra_capability/cost_10x_latency_none | Karpo-Decision-31B | 3 | 4 |
| point | open/extra_capability/cost_10x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| point | open/extra_capability/cost_10x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| point | api/composites/A | Myles-G 12B (Launchables) | 3 | 4 |
| point | api/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 4 | 5 |
| point | api/composites/A | kettei-fat (Sqwish) | 5 | 6 |
| point | api/composites/B | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| point | api/composites/B | Drex Max (Nace AI) | 5 | 6 |
| point | api/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 3 | 4 |
| point | api/composites/C | kettei-fat (Sqwish) | 4 | 5 |
| point | api/composites/C | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| point | release/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| point | release/A | Super Decider | 4 | 5 |
| point | release/A | Myles-G 12B (Launchables) | 5 | 7 |
| point | release/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| point | release/B | Super Decider | 2 | 3 |
| point | release/B | decide-1.1 (decide.sh, API) | 3 | 4 |
| point | release/B | kettei-fat (Sqwish) | 4 | 5 |
| point | release/B | Karpo-Decision-31B | 5 | 6 |
| point | release/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| point | release/C | Super Decider | 4 | 5 |
| point | release/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 7 |
| I_ci_low | all/composites/A | Super Decider | 3 | 4 |
| I_ci_low | all/composites/A | Torchcast Decision 31B v1.0 | 4 | 5 |
| I_ci_low | all/composites/A | Myles-G 12B (Launchables) | 5 | 6 |
| I_ci_low | all/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| I_ci_low | all/composites/B | Super Decider | 2 | 3 |
| I_ci_low | all/composites/B | kettei-fat (Sqwish) | 3 | 4 |
| I_ci_low | all/composites/B | Torchcast Decision 4B (v1.3) | 4 | 5 |
| I_ci_low | all/composites/B | decide-1.1 (decide.sh, API) | 5 | 6 |
| I_ci_low | all/composites/C | Super Decider | 3 | 4 |
| I_ci_low | all/composites/C | Torchcast Decision 31B v1.0 | 4 | 5 |
| I_ci_low | all/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 6 |
| I_ci_low | all/capability/official_caps | kettei-fat (Sqwish) | 3 | 4 |
| I_ci_low | all/capability/official_caps | Super Decider (thinking) | 4 | 5 |
| I_ci_low | all/capability/official_caps | Karpo-Decision-31B | 5 | 6 |
| I_ci_low | all/capability/cost_off_latency_2x | kettei-fat (Sqwish) | 3 | 4 |
| I_ci_low | all/capability/cost_off_latency_2x | Super Decider (thinking) | 4 | 5 |
| I_ci_low | all/capability/cost_off_latency_2x | Karpo-Decision-31B | 5 | 6 |
| I_ci_low | all/capability/latency_none | kettei-fat (Sqwish) | 3 | 4 |
| I_ci_low | all/capability/latency_none | Super Decider (thinking) | 4 | 5 |
| I_ci_low | all/capability/latency_none | Karpo-Decision-31B | 5 | 6 |
| I_ci_low | all/extra_capability/cost_7x | kettei-fat (Sqwish) | 3 | 4 |
| I_ci_low | all/extra_capability/cost_7x | Super Decider (thinking) | 4 | 5 |
| I_ci_low | all/extra_capability/cost_7x | Karpo-Decision-31B | 5 | 6 |
| I_ci_low | all/extra_capability/cost_10x | kettei-fat (Sqwish) | 3 | 4 |
| I_ci_low | all/extra_capability/cost_10x | Super Decider (thinking) | 4 | 5 |
| I_ci_low | all/extra_capability/cost_10x | Karpo-Decision-31B | 5 | 6 |
| I_ci_low | open/composites/A | Torchcast Decision 31B v1.0 | 2 | 3 |
| I_ci_low | open/composites/A | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| I_ci_low | open/composites/A | Wald 26B-A4B (Gemma 4 26B-A4B) | 4 | 5 |
| I_ci_low | open/composites/A | Torchcast Decision 4B (v1.2) | 5 | 6 |
| I_ci_low | open/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| I_ci_low | open/composites/B | Torchcast Decision 4B (v1.3) | 2 | 3 |
| I_ci_low | open/composites/B | Karpo-Decision-31B | 3 | 4 |
| I_ci_low | open/composites/B | H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted) | 4 | 5 |
| I_ci_low | open/composites/B | Fastino GLiDE 1.2 (open weights, self-hosted) | 5 | 6 |
| I_ci_low | open/composites/C | Torchcast Decision 31B v1.0 | 2 | 3 |
| I_ci_low | open/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| I_ci_low | open/composites/C | Wald 26B-A4B (Gemma 4 26B-A4B) | 4 | 5 |
| I_ci_low | open/composites/C | Torchcast Decision 4B (v1.2) | 5 | 6 |
| I_ci_low | open/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| I_ci_low | open/capability/official_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| I_ci_low | open/capability/official_caps | KnowLine 31B-Gen1 | 5 | 6 |
| I_ci_low | open/capability/no_caps | Karpo-Decision-31B | 3 | 4 |
| I_ci_low | open/capability/no_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| I_ci_low | open/capability/no_caps | KnowLine 31B-Gen1 | 5 | 6 |
| I_ci_low | open/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| I_ci_low | open/capability/cost_off_latency_2x | baselabs mammoth-1 (27B) | 4 | 5 |
| I_ci_low | open/capability/cost_off_latency_2x | KnowLine 31B-Gen1 | 5 | 6 |
| I_ci_low | open/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| I_ci_low | open/capability/latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| I_ci_low | open/capability/latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| I_ci_low | open/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| I_ci_low | open/extra_capability/cost_7x | baselabs mammoth-1 (27B) | 4 | 5 |
| I_ci_low | open/extra_capability/cost_7x | KnowLine 31B-Gen1 | 5 | 6 |
| I_ci_low | open/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| I_ci_low | open/extra_capability/cost_10x | baselabs mammoth-1 (27B) | 4 | 5 |
| I_ci_low | open/extra_capability/cost_10x | KnowLine 31B-Gen1 | 5 | 6 |
| I_ci_low | open/extra_capability/rank_field | Karpo-Decision-31B | 3 | 4 |
| I_ci_low | open/extra_capability/rank_field | baselabs mammoth-1 (27B) | 4 | 5 |
| I_ci_low | open/extra_capability/rank_field | KnowLine 31B-Gen1 | 5 | 6 |
| I_ci_low | open/extra_capability/cost_7x_latency_none | Karpo-Decision-31B | 3 | 4 |
| I_ci_low | open/extra_capability/cost_7x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| I_ci_low | open/extra_capability/cost_7x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| I_ci_low | open/extra_capability/cost_10x_latency_none | Karpo-Decision-31B | 3 | 4 |
| I_ci_low | open/extra_capability/cost_10x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| I_ci_low | open/extra_capability/cost_10x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| I_ci_low | api/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 6 |
| I_ci_low | api/composites/B | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| I_ci_low | api/composites/B | Drex Max (Nace AI) | 5 | 6 |
| I_ci_low | api/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 4 | 5 |
| I_ci_low | api/composites/C | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| I_ci_low | release/A | Super Decider | 3 | 4 |
| I_ci_low | release/A | Torchcast Decision 31B v1.0 | 4 | 5 |
| I_ci_low | release/A | Myles-G 12B (Launchables) | 5 | 6 |
| I_ci_low | release/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| I_ci_low | release/B | Super Decider | 2 | 3 |
| I_ci_low | release/B | kettei-fat (Sqwish) | 3 | 4 |
| I_ci_low | release/B | Torchcast Decision 4B (v1.3) | 4 | 5 |
| I_ci_low | release/B | decide-1.1 (decide.sh, API) | 5 | 6 |
| I_ci_low | release/C | Super Decider | 3 | 4 |
| I_ci_low | release/C | Torchcast Decision 31B v1.0 | 4 | 5 |
| I_ci_low | release/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 6 |
| I_ci_high | all/composites/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| I_ci_high | all/composites/A | Arcbright Elf 1 12B (r2) | 4 | 6 |
| I_ci_high | all/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 7 |
| I_ci_high | all/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| I_ci_high | all/composites/B | decide-1.1 (decide.sh, API) | 2 | 3 |
| I_ci_high | all/composites/B | Karpo-Decision-31B | 3 | 5 |
| I_ci_high | all/composites/B | Super Decider | 4 | 7 |
| I_ci_high | all/composites/B | kettei-fat (Sqwish) | 5 | 8 |
| I_ci_high | all/composites/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| I_ci_high | all/composites/C | Arcbright Elf 1 12B (r2) | 4 | 6 |
| I_ci_high | all/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 7 |
| I_ci_high | all/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | all/capability/official_caps | kettei-fat (Sqwish) | 4 | 7 |
| I_ci_high | all/capability/official_caps | Super Decider (thinking) | 5 | 8 |
| I_ci_high | all/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | all/capability/cost_off_latency_2x | kettei-fat (Sqwish) | 4 | 7 |
| I_ci_high | all/capability/cost_off_latency_2x | Super Decider (thinking) | 5 | 8 |
| I_ci_high | all/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | all/capability/latency_none | kettei-fat (Sqwish) | 4 | 7 |
| I_ci_high | all/capability/latency_none | Super Decider (thinking) | 5 | 8 |
| I_ci_high | all/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | all/extra_capability/cost_7x | kettei-fat (Sqwish) | 4 | 7 |
| I_ci_high | all/extra_capability/cost_7x | Super Decider (thinking) | 5 | 8 |
| I_ci_high | all/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | all/extra_capability/cost_10x | kettei-fat (Sqwish) | 4 | 7 |
| I_ci_high | all/extra_capability/cost_10x | Super Decider (thinking) | 5 | 8 |
| I_ci_high | open/composites/A | Torchcast Decision 31B v1.0 | 2 | 3 |
| I_ci_high | open/composites/A | Arcbright Elf 1 12B (r2) | 3 | 4 |
| I_ci_high | open/composites/A | z3-mini-soup-preview (Zils AI) | 4 | 5 |
| I_ci_high | open/composites/A | Jeff-1.1-Qwen-4B (jgeuter) | 5 | 6 |
| I_ci_high | open/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| I_ci_high | open/composites/B | Karpo-Decision-31B | 2 | 3 |
| I_ci_high | open/composites/B | Torchcast Decision 4B (v1.3) | 3 | 6 |
| I_ci_high | open/composites/B | Arcbright Elf 1 12B (r2) | 4 | 7 |
| I_ci_high | open/composites/B | Jeff-1.1-Qwen-4B (jgeuter) | 5 | 8 |
| I_ci_high | open/composites/C | Torchcast Decision 31B v1.0 | 2 | 3 |
| I_ci_high | open/composites/C | Arcbright Elf 1 12B (r2) | 3 | 4 |
| I_ci_high | open/composites/C | z3-mini-soup-preview (Zils AI) | 4 | 5 |
| I_ci_high | open/composites/C | Jeff-1.1-Qwen-4B (jgeuter) | 5 | 6 |
| I_ci_high | open/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | open/capability/official_caps | Piccolo 27B (agentscope-ai) | 4 | 7 |
| I_ci_high | open/capability/official_caps | baselabs mammoth-1 (27B) | 5 | 8 |
| I_ci_high | open/capability/no_caps | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | open/capability/no_caps | Piccolo 27B (agentscope-ai) | 4 | 7 |
| I_ci_high | open/capability/no_caps | baselabs mammoth-1 (27B) | 5 | 8 |
| I_ci_high | open/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | open/capability/cost_off_latency_2x | Piccolo 27B (agentscope-ai) | 4 | 7 |
| I_ci_high | open/capability/cost_off_latency_2x | baselabs mammoth-1 (27B) | 5 | 8 |
| I_ci_high | open/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | open/capability/latency_none | Piccolo 27B (agentscope-ai) | 4 | 7 |
| I_ci_high | open/capability/latency_none | baselabs mammoth-1 (27B) | 5 | 8 |
| I_ci_high | open/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | open/extra_capability/cost_7x | Piccolo 27B (agentscope-ai) | 4 | 7 |
| I_ci_high | open/extra_capability/cost_7x | baselabs mammoth-1 (27B) | 5 | 8 |
| I_ci_high | open/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | open/extra_capability/cost_10x | Piccolo 27B (agentscope-ai) | 4 | 7 |
| I_ci_high | open/extra_capability/cost_10x | baselabs mammoth-1 (27B) | 5 | 8 |
| I_ci_high | open/extra_capability/rank_field | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | open/extra_capability/rank_field | Piccolo 27B (agentscope-ai) | 4 | 7 |
| I_ci_high | open/extra_capability/rank_field | baselabs mammoth-1 (27B) | 5 | 8 |
| I_ci_high | open/extra_capability/cost_7x_latency_none | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | open/extra_capability/cost_7x_latency_none | Piccolo 27B (agentscope-ai) | 4 | 7 |
| I_ci_high | open/extra_capability/cost_7x_latency_none | baselabs mammoth-1 (27B) | 5 | 8 |
| I_ci_high | open/extra_capability/cost_10x_latency_none | Karpo-Decision-31B | 3 | 4 |
| I_ci_high | open/extra_capability/cost_10x_latency_none | Piccolo 27B (agentscope-ai) | 4 | 7 |
| I_ci_high | open/extra_capability/cost_10x_latency_none | baselabs mammoth-1 (27B) | 5 | 8 |
| I_ci_high | api/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 2 | 3 |
| I_ci_high | api/composites/A | Super Decider | 3 | 4 |
| I_ci_high | api/composites/A | Myles-G 12B (Launchables) | 4 | 5 |
| I_ci_high | api/composites/A | kettei-fat (Sqwish) | 5 | 6 |
| I_ci_high | api/composites/B | Super Decider | 2 | 3 |
| I_ci_high | api/composites/B | kettei-fat (Sqwish) | 3 | 4 |
| I_ci_high | api/composites/B | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 4 | 5 |
| I_ci_high | api/composites/B | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| I_ci_high | api/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 2 | 3 |
| I_ci_high | api/composites/C | Super Decider | 3 | 4 |
| I_ci_high | api/composites/C | kettei-fat (Sqwish) | 4 | 5 |
| I_ci_high | api/composites/C | Microsoft-Decision-1 (updated weights, Oct 2026) | 5 | 6 |
| I_ci_high | api/capability/official_caps | Super Decider | 3 | 4 |
| I_ci_high | api/capability/official_caps | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| I_ci_high | api/capability/official_caps | Drex Max (Nace AI) | 5 | 6 |
| I_ci_high | api/capability/cost_off_latency_2x | Super Decider | 3 | 4 |
| I_ci_high | api/capability/cost_off_latency_2x | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| I_ci_high | api/capability/cost_off_latency_2x | Drex Max (Nace AI) | 5 | 6 |
| I_ci_high | api/capability/latency_none | Super Decider | 3 | 4 |
| I_ci_high | api/capability/latency_none | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| I_ci_high | api/capability/latency_none | Drex Max (Nace AI) | 5 | 6 |
| I_ci_high | api/extra_capability/cost_7x | Super Decider | 3 | 4 |
| I_ci_high | api/extra_capability/cost_7x | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| I_ci_high | api/extra_capability/cost_7x | Drex Max (Nace AI) | 5 | 6 |
| I_ci_high | api/extra_capability/cost_10x | Super Decider | 3 | 4 |
| I_ci_high | api/extra_capability/cost_10x | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| I_ci_high | api/extra_capability/cost_10x | Drex Max (Nace AI) | 5 | 6 |
| I_ci_high | release/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| I_ci_high | release/A | Arcbright Elf 1 12B (r2) | 4 | 6 |
| I_ci_high | release/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 7 |
| I_ci_high | release/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| I_ci_high | release/B | decide-1.1 (decide.sh, API) | 2 | 3 |
| I_ci_high | release/B | Karpo-Decision-31B | 3 | 5 |
| I_ci_high | release/B | Super Decider | 4 | 7 |
| I_ci_high | release/B | kettei-fat (Sqwish) | 5 | 8 |
| I_ci_high | release/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| I_ci_high | release/C | Arcbright Elf 1 12B (r2) | 4 | 6 |
| I_ci_high | release/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 7 |
| C_ci_low | all/composites/A | Super Decider | 3 | 4 |
| C_ci_low | all/composites/A | Torchcast Decision 31B v1.0 | 4 | 5 |
| C_ci_low | all/composites/A | Myles-G 12B (Launchables) | 5 | 6 |
| C_ci_low | all/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| C_ci_low | all/composites/B | Super Decider | 2 | 3 |
| C_ci_low | all/composites/B | kettei-fat (Sqwish) | 3 | 4 |
| C_ci_low | all/composites/B | decide-1.1 (decide.sh, API) | 4 | 5 |
| C_ci_low | all/composites/B | Karpo-Decision-31B | 5 | 6 |
| C_ci_low | all/composites/C | Super Decider | 3 | 4 |
| C_ci_low | all/composites/C | Torchcast Decision 31B v1.0 | 4 | 5 |
| C_ci_low | all/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 6 |
| C_ci_low | all/capability/official_caps | Super Decider (thinking) | 4 | 5 |
| C_ci_low | all/capability/official_caps | Karpo-Decision-31B | 5 | 6 |
| C_ci_low | all/capability/cost_off_latency_2x | Super Decider (thinking) | 4 | 5 |
| C_ci_low | all/capability/cost_off_latency_2x | Karpo-Decision-31B | 5 | 6 |
| C_ci_low | all/capability/latency_none | Super Decider (thinking) | 4 | 5 |
| C_ci_low | all/capability/latency_none | Karpo-Decision-31B | 5 | 6 |
| C_ci_low | all/extra_capability/cost_7x | Super Decider (thinking) | 4 | 5 |
| C_ci_low | all/extra_capability/cost_7x | Karpo-Decision-31B | 5 | 6 |
| C_ci_low | all/extra_capability/cost_10x | Super Decider (thinking) | 4 | 5 |
| C_ci_low | all/extra_capability/cost_10x | Karpo-Decision-31B | 5 | 6 |
| C_ci_low | open/composites/A | Torchcast Decision 31B v1.0 | 2 | 3 |
| C_ci_low | open/composites/A | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| C_ci_low | open/composites/A | Wald 26B-A4B (Gemma 4 26B-A4B) | 4 | 5 |
| C_ci_low | open/composites/A | Arcbright Elf 1 12B (r2) | 5 | 6 |
| C_ci_low | open/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| C_ci_low | open/composites/B | Karpo-Decision-31B | 2 | 3 |
| C_ci_low | open/composites/B | Torchcast Decision 4B (v1.3) | 3 | 4 |
| C_ci_low | open/composites/B | H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted) | 4 | 6 |
| C_ci_low | open/composites/B | Fastino GLiDE 1.2 (open weights, self-hosted) | 5 | 7 |
| C_ci_low | open/composites/C | Torchcast Decision 31B v1.0 | 2 | 3 |
| C_ci_low | open/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| C_ci_low | open/composites/C | Wald 26B-A4B (Gemma 4 26B-A4B) | 4 | 5 |
| C_ci_low | open/composites/C | Arcbright Elf 1 12B (r2) | 5 | 6 |
| C_ci_low | open/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| C_ci_low | open/capability/official_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| C_ci_low | open/capability/official_caps | KnowLine 31B-Gen1 | 5 | 6 |
| C_ci_low | open/capability/no_caps | Karpo-Decision-31B | 3 | 4 |
| C_ci_low | open/capability/no_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| C_ci_low | open/capability/no_caps | KnowLine 31B-Gen1 | 5 | 6 |
| C_ci_low | open/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| C_ci_low | open/capability/cost_off_latency_2x | baselabs mammoth-1 (27B) | 4 | 5 |
| C_ci_low | open/capability/cost_off_latency_2x | KnowLine 31B-Gen1 | 5 | 6 |
| C_ci_low | open/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| C_ci_low | open/capability/latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| C_ci_low | open/capability/latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| C_ci_low | open/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| C_ci_low | open/extra_capability/cost_7x | baselabs mammoth-1 (27B) | 4 | 5 |
| C_ci_low | open/extra_capability/cost_7x | KnowLine 31B-Gen1 | 5 | 6 |
| C_ci_low | open/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| C_ci_low | open/extra_capability/cost_10x | baselabs mammoth-1 (27B) | 4 | 5 |
| C_ci_low | open/extra_capability/cost_10x | KnowLine 31B-Gen1 | 5 | 6 |
| C_ci_low | open/extra_capability/rank_field | Karpo-Decision-31B | 3 | 4 |
| C_ci_low | open/extra_capability/rank_field | baselabs mammoth-1 (27B) | 4 | 5 |
| C_ci_low | open/extra_capability/rank_field | KnowLine 31B-Gen1 | 5 | 6 |
| C_ci_low | open/extra_capability/cost_7x_latency_none | Karpo-Decision-31B | 3 | 4 |
| C_ci_low | open/extra_capability/cost_7x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| C_ci_low | open/extra_capability/cost_7x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| C_ci_low | open/extra_capability/cost_10x_latency_none | Karpo-Decision-31B | 3 | 4 |
| C_ci_low | open/extra_capability/cost_10x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| C_ci_low | open/extra_capability/cost_10x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| C_ci_low | api/composites/A | kettei-fat (Sqwish) | 4 | 5 |
| C_ci_low | api/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 6 |
| C_ci_low | api/composites/B | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| C_ci_low | api/composites/B | Drex Max (Nace AI) | 5 | 6 |
| C_ci_low | api/composites/C | kettei-fat (Sqwish) | 3 | 4 |
| C_ci_low | api/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 4 | 5 |
| C_ci_low | api/composites/C | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| C_ci_low | release/A | Super Decider | 3 | 4 |
| C_ci_low | release/A | Torchcast Decision 31B v1.0 | 4 | 5 |
| C_ci_low | release/A | Myles-G 12B (Launchables) | 5 | 6 |
| C_ci_low | release/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| C_ci_low | release/B | Super Decider | 2 | 3 |
| C_ci_low | release/B | kettei-fat (Sqwish) | 3 | 4 |
| C_ci_low | release/B | decide-1.1 (decide.sh, API) | 4 | 5 |
| C_ci_low | release/B | Karpo-Decision-31B | 5 | 6 |
| C_ci_low | release/C | Super Decider | 3 | 4 |
| C_ci_low | release/C | Torchcast Decision 31B v1.0 | 4 | 5 |
| C_ci_low | release/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 6 |
| C_ci_high | all/composites/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| C_ci_high | all/composites/A | Arcbright Elf 1 12B (r2) | 4 | 6 |
| C_ci_high | all/composites/A | Super Decider | 5 | 7 |
| C_ci_high | all/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| C_ci_high | all/composites/B | decide-1.1 (decide.sh, API) | 2 | 3 |
| C_ci_high | all/composites/B | Super Decider | 3 | 4 |
| C_ci_high | all/composites/B | Karpo-Decision-31B | 4 | 5 |
| C_ci_high | all/composites/B | kettei-fat (Sqwish) | 5 | 7 |
| C_ci_high | all/composites/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| C_ci_high | all/composites/C | Arcbright Elf 1 12B (r2) | 4 | 6 |
| C_ci_high | all/composites/C | Super Decider | 5 | 7 |
| C_ci_high | all/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | all/capability/official_caps | kettei-fat (Sqwish) | 4 | 7 |
| C_ci_high | all/capability/official_caps | Super Decider (thinking) | 5 | 8 |
| C_ci_high | all/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | all/capability/cost_off_latency_2x | kettei-fat (Sqwish) | 4 | 7 |
| C_ci_high | all/capability/cost_off_latency_2x | Super Decider (thinking) | 5 | 8 |
| C_ci_high | all/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | all/capability/latency_none | kettei-fat (Sqwish) | 4 | 7 |
| C_ci_high | all/capability/latency_none | Super Decider (thinking) | 5 | 8 |
| C_ci_high | all/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | all/extra_capability/cost_7x | kettei-fat (Sqwish) | 4 | 7 |
| C_ci_high | all/extra_capability/cost_7x | Super Decider (thinking) | 5 | 8 |
| C_ci_high | all/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | all/extra_capability/cost_10x | kettei-fat (Sqwish) | 4 | 7 |
| C_ci_high | all/extra_capability/cost_10x | Super Decider (thinking) | 5 | 8 |
| C_ci_high | open/composites/A | Torchcast Decision 31B v1.0 | 2 | 3 |
| C_ci_high | open/composites/A | Arcbright Elf 1 12B (r2) | 3 | 4 |
| C_ci_high | open/composites/A | Jeff-1.1-Qwen-4B (jgeuter) | 4 | 5 |
| C_ci_high | open/composites/A | z3-mini-soup-preview (Zils AI) | 5 | 6 |
| C_ci_high | open/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| C_ci_high | open/composites/B | Karpo-Decision-31B | 2 | 3 |
| C_ci_high | open/composites/B | Torchcast Decision 4B (v1.3) | 3 | 5 |
| C_ci_high | open/composites/B | H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted) | 4 | 7 |
| C_ci_high | open/composites/B | Fastino GLiDE 1.2 (open weights, self-hosted) | 5 | 8 |
| C_ci_high | open/composites/C | Torchcast Decision 31B v1.0 | 2 | 3 |
| C_ci_high | open/composites/C | Arcbright Elf 1 12B (r2) | 3 | 4 |
| C_ci_high | open/composites/C | Jeff-1.1-Qwen-4B (jgeuter) | 4 | 5 |
| C_ci_high | open/composites/C | Karpo-Decision-31B | 5 | 7 |
| C_ci_high | open/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | open/capability/official_caps | Piccolo 27B (agentscope-ai) | 4 | 7 |
| C_ci_high | open/capability/official_caps | baselabs mammoth-1 (27B) | 5 | 8 |
| C_ci_high | open/capability/no_caps | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | open/capability/no_caps | Piccolo 27B (agentscope-ai) | 4 | 7 |
| C_ci_high | open/capability/no_caps | baselabs mammoth-1 (27B) | 5 | 8 |
| C_ci_high | open/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | open/capability/cost_off_latency_2x | Piccolo 27B (agentscope-ai) | 4 | 7 |
| C_ci_high | open/capability/cost_off_latency_2x | baselabs mammoth-1 (27B) | 5 | 8 |
| C_ci_high | open/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | open/capability/latency_none | Piccolo 27B (agentscope-ai) | 4 | 7 |
| C_ci_high | open/capability/latency_none | baselabs mammoth-1 (27B) | 5 | 8 |
| C_ci_high | open/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | open/extra_capability/cost_7x | Piccolo 27B (agentscope-ai) | 4 | 7 |
| C_ci_high | open/extra_capability/cost_7x | baselabs mammoth-1 (27B) | 5 | 8 |
| C_ci_high | open/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | open/extra_capability/cost_10x | Piccolo 27B (agentscope-ai) | 4 | 7 |
| C_ci_high | open/extra_capability/cost_10x | baselabs mammoth-1 (27B) | 5 | 8 |
| C_ci_high | open/extra_capability/rank_field | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | open/extra_capability/rank_field | Piccolo 27B (agentscope-ai) | 4 | 7 |
| C_ci_high | open/extra_capability/rank_field | baselabs mammoth-1 (27B) | 5 | 8 |
| C_ci_high | open/extra_capability/cost_7x_latency_none | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | open/extra_capability/cost_7x_latency_none | Piccolo 27B (agentscope-ai) | 4 | 7 |
| C_ci_high | open/extra_capability/cost_7x_latency_none | baselabs mammoth-1 (27B) | 5 | 8 |
| C_ci_high | open/extra_capability/cost_10x_latency_none | Karpo-Decision-31B | 3 | 4 |
| C_ci_high | open/extra_capability/cost_10x_latency_none | Piccolo 27B (agentscope-ai) | 4 | 7 |
| C_ci_high | open/extra_capability/cost_10x_latency_none | baselabs mammoth-1 (27B) | 5 | 8 |
| C_ci_high | api/composites/A | Super Decider | 2 | 3 |
| C_ci_high | api/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 3 | 4 |
| C_ci_high | api/composites/A | Myles-G 12B (Launchables) | 4 | 5 |
| C_ci_high | api/composites/A | kettei-fat (Sqwish) | 5 | 6 |
| C_ci_high | api/composites/B | kettei-fat (Sqwish) | 3 | 4 |
| C_ci_high | api/composites/B | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| C_ci_high | api/composites/B | Drex Max (Nace AI) | 5 | 6 |
| C_ci_high | api/composites/C | Super Decider | 2 | 3 |
| C_ci_high | api/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 3 | 4 |
| C_ci_high | api/composites/C | kettei-fat (Sqwish) | 4 | 5 |
| C_ci_high | api/composites/C | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| C_ci_high | api/capability/official_caps | Super Decider | 3 | 4 |
| C_ci_high | api/capability/official_caps | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| C_ci_high | api/capability/official_caps | Drex Max (Nace AI) | 5 | 6 |
| C_ci_high | api/capability/cost_off_latency_2x | Super Decider | 3 | 4 |
| C_ci_high | api/capability/cost_off_latency_2x | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| C_ci_high | api/capability/cost_off_latency_2x | Drex Max (Nace AI) | 5 | 6 |
| C_ci_high | api/capability/latency_none | Super Decider | 3 | 4 |
| C_ci_high | api/capability/latency_none | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| C_ci_high | api/capability/latency_none | Drex Max (Nace AI) | 5 | 6 |
| C_ci_high | api/extra_capability/cost_7x | Super Decider | 3 | 4 |
| C_ci_high | api/extra_capability/cost_7x | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| C_ci_high | api/extra_capability/cost_7x | Drex Max (Nace AI) | 5 | 6 |
| C_ci_high | api/extra_capability/cost_10x | Super Decider | 3 | 4 |
| C_ci_high | api/extra_capability/cost_10x | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| C_ci_high | api/extra_capability/cost_10x | Drex Max (Nace AI) | 5 | 6 |
| C_ci_high | release/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| C_ci_high | release/A | Arcbright Elf 1 12B (r2) | 4 | 6 |
| C_ci_high | release/A | Super Decider | 5 | 7 |
| C_ci_high | release/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| C_ci_high | release/B | decide-1.1 (decide.sh, API) | 2 | 3 |
| C_ci_high | release/B | Super Decider | 3 | 4 |
| C_ci_high | release/B | Karpo-Decision-31B | 4 | 5 |
| C_ci_high | release/B | kettei-fat (Sqwish) | 5 | 7 |
| C_ci_high | release/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| C_ci_high | release/C | Arcbright Elf 1 12B (r2) | 4 | 6 |
| C_ci_high | release/C | Super Decider | 5 | 7 |
| joint_ci_low | all/composites/B | Super Decider | 1 | 2 |
| joint_ci_low | all/composites/B | Torchcast Decision 31B v1.0 | 2 | 3 |
| joint_ci_low | all/composites/B | kettei-fat (Sqwish) | 3 | 4 |
| joint_ci_low | all/composites/B | Torchcast Decision 4B (v1.3) | 4 | 5 |
| joint_ci_low | all/composites/B | decide-1.1 (decide.sh, API) | 5 | 6 |
| joint_ci_low | all/composites/C | kettei-fat (Sqwish) | 5 | 6 |
| joint_ci_low | open/composites/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| joint_ci_low | open/composites/A | Wald 26B-A4B (Gemma 4 26B-A4B) | 4 | 5 |
| joint_ci_low | open/composites/A | Torchcast Decision 4B (v1.2) | 5 | 6 |
| joint_ci_low | open/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| joint_ci_low | open/composites/B | Torchcast Decision 4B (v1.3) | 2 | 3 |
| joint_ci_low | open/composites/B | H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted) | 3 | 4 |
| joint_ci_low | open/composites/B | Karpo-Decision-31B | 4 | 5 |
| joint_ci_low | open/composites/B | Fastino GLiDE 1.2 (open weights, self-hosted) | 5 | 6 |
| joint_ci_low | open/composites/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| joint_ci_low | open/composites/C | Wald 26B-A4B (Gemma 4 26B-A4B) | 4 | 5 |
| joint_ci_low | open/composites/C | Torchcast Decision 4B (v1.2) | 5 | 6 |
| joint_ci_low | api/composites/A | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| joint_ci_low | api/composites/C | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| joint_ci_low | api/composites/C | d1-ultra (Liquid AI) | 5 | 6 |
| joint_ci_low | release/B | Super Decider | 1 | 2 |
| joint_ci_low | release/B | Torchcast Decision 31B v1.0 | 2 | 3 |
| joint_ci_low | release/B | kettei-fat (Sqwish) | 3 | 4 |
| joint_ci_low | release/B | Torchcast Decision 4B (v1.3) | 4 | 5 |
| joint_ci_low | release/B | decide-1.1 (decide.sh, API) | 5 | 6 |
| joint_ci_low | release/C | kettei-fat (Sqwish) | 5 | 6 |
| joint_ci_high | all/composites/A | Torchcast Decision 4B (v1.3) | 2 | 3 |
| joint_ci_high | all/composites/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| joint_ci_high | all/composites/A | Arcbright Elf 1 12B (r2) | 4 | 6 |
| joint_ci_high | all/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 7 |
| joint_ci_high | all/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| joint_ci_high | all/composites/B | decide-1.1 (decide.sh, API) | 2 | 3 |
| joint_ci_high | all/composites/B | Karpo-Decision-31B | 3 | 5 |
| joint_ci_high | all/composites/B | Super Decider | 4 | 7 |
| joint_ci_high | all/composites/B | kettei-fat (Sqwish) | 5 | 9 |
| joint_ci_high | all/composites/C | Torchcast Decision 4B (v1.3) | 2 | 3 |
| joint_ci_high | all/composites/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| joint_ci_high | all/composites/C | Arcbright Elf 1 12B (r2) | 4 | 6 |
| joint_ci_high | all/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 7 |
| joint_ci_high | all/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | all/capability/official_caps | Piccolo 27B (agentscope-ai) | 4 | 8 |
| joint_ci_high | all/capability/official_caps | kettei-fat (Sqwish) | 5 | 10 |
| joint_ci_high | all/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | all/capability/cost_off_latency_2x | Piccolo 27B (agentscope-ai) | 4 | 8 |
| joint_ci_high | all/capability/cost_off_latency_2x | kettei-fat (Sqwish) | 5 | 10 |
| joint_ci_high | all/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | all/capability/latency_none | Piccolo 27B (agentscope-ai) | 4 | 8 |
| joint_ci_high | all/capability/latency_none | kettei-fat (Sqwish) | 5 | 10 |
| joint_ci_high | all/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | all/extra_capability/cost_7x | Piccolo 27B (agentscope-ai) | 4 | 8 |
| joint_ci_high | all/extra_capability/cost_7x | kettei-fat (Sqwish) | 5 | 10 |
| joint_ci_high | all/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | all/extra_capability/cost_10x | Piccolo 27B (agentscope-ai) | 4 | 8 |
| joint_ci_high | all/extra_capability/cost_10x | kettei-fat (Sqwish) | 5 | 10 |
| joint_ci_high | open/composites/A | Torchcast Decision 4B (v1.3) | 1 | 2 |
| joint_ci_high | open/composites/A | Torchcast Decision 31B v1.0 | 2 | 3 |
| joint_ci_high | open/composites/A | Arcbright Elf 1 12B (r2) | 3 | 4 |
| joint_ci_high | open/composites/A | z3-mini-soup-preview (Zils AI) | 4 | 5 |
| joint_ci_high | open/composites/A | Jeff-1.1-Qwen-4B (jgeuter) | 5 | 6 |
| joint_ci_high | open/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| joint_ci_high | open/composites/B | Karpo-Decision-31B | 2 | 3 |
| joint_ci_high | open/composites/B | Torchcast Decision 4B (v1.3) | 3 | 6 |
| joint_ci_high | open/composites/B | Arcbright Elf 1 12B (r2) | 4 | 7 |
| joint_ci_high | open/composites/B | Jeff-1.1-Qwen-4B (jgeuter) | 5 | 8 |
| joint_ci_high | open/composites/C | Torchcast Decision 4B (v1.3) | 1 | 2 |
| joint_ci_high | open/composites/C | Torchcast Decision 31B v1.0 | 2 | 3 |
| joint_ci_high | open/composites/C | Arcbright Elf 1 12B (r2) | 3 | 4 |
| joint_ci_high | open/composites/C | z3-mini-soup-preview (Zils AI) | 4 | 5 |
| joint_ci_high | open/composites/C | Jeff-1.1-Qwen-4B (jgeuter) | 5 | 6 |
| joint_ci_high | open/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | open/capability/official_caps | Piccolo 27B (agentscope-ai) | 4 | 7 |
| joint_ci_high | open/capability/official_caps | oenogarum (plantwaterer; commercially restricted) | 5 | 10 |
| joint_ci_high | open/capability/no_caps | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | open/capability/no_caps | Piccolo 27B (agentscope-ai) | 4 | 7 |
| joint_ci_high | open/capability/no_caps | oenogarum (plantwaterer; commercially restricted) | 5 | 10 |
| joint_ci_high | open/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | open/capability/cost_off_latency_2x | Piccolo 27B (agentscope-ai) | 4 | 7 |
| joint_ci_high | open/capability/cost_off_latency_2x | oenogarum (plantwaterer; commercially restricted) | 5 | 10 |
| joint_ci_high | open/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | open/capability/latency_none | Piccolo 27B (agentscope-ai) | 4 | 7 |
| joint_ci_high | open/capability/latency_none | oenogarum (plantwaterer; commercially restricted) | 5 | 10 |
| joint_ci_high | open/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | open/extra_capability/cost_7x | Piccolo 27B (agentscope-ai) | 4 | 7 |
| joint_ci_high | open/extra_capability/cost_7x | oenogarum (plantwaterer; commercially restricted) | 5 | 10 |
| joint_ci_high | open/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | open/extra_capability/cost_10x | Piccolo 27B (agentscope-ai) | 4 | 7 |
| joint_ci_high | open/extra_capability/cost_10x | oenogarum (plantwaterer; commercially restricted) | 5 | 10 |
| joint_ci_high | open/extra_capability/rank_field | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | open/extra_capability/rank_field | Piccolo 27B (agentscope-ai) | 4 | 7 |
| joint_ci_high | open/extra_capability/rank_field | oenogarum (plantwaterer; commercially restricted) | 5 | 10 |
| joint_ci_high | open/extra_capability/cost_7x_latency_none | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | open/extra_capability/cost_7x_latency_none | Piccolo 27B (agentscope-ai) | 4 | 7 |
| joint_ci_high | open/extra_capability/cost_7x_latency_none | oenogarum (plantwaterer; commercially restricted) | 5 | 10 |
| joint_ci_high | open/extra_capability/cost_10x_latency_none | Karpo-Decision-31B | 3 | 4 |
| joint_ci_high | open/extra_capability/cost_10x_latency_none | Piccolo 27B (agentscope-ai) | 4 | 7 |
| joint_ci_high | open/extra_capability/cost_10x_latency_none | oenogarum (plantwaterer; commercially restricted) | 5 | 10 |
| joint_ci_high | api/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 2 | 3 |
| joint_ci_high | api/composites/A | Super Decider | 3 | 4 |
| joint_ci_high | api/composites/A | Myles-G 12B (Launchables) | 4 | 5 |
| joint_ci_high | api/composites/A | kettei-fat (Sqwish) | 5 | 6 |
| joint_ci_high | api/composites/B | Super Decider | 2 | 3 |
| joint_ci_high | api/composites/B | kettei-fat (Sqwish) | 3 | 4 |
| joint_ci_high | api/composites/B | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 4 | 5 |
| joint_ci_high | api/composites/B | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| joint_ci_high | api/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 2 | 3 |
| joint_ci_high | api/composites/C | Super Decider | 3 | 4 |
| joint_ci_high | api/composites/C | kettei-fat (Sqwish) | 4 | 5 |
| joint_ci_high | api/composites/C | Microsoft-Decision-1 (updated weights, Oct 2026) | 5 | 6 |
| joint_ci_high | api/capability/official_caps | kettei-fat (Sqwish) | 1 | 2 |
| joint_ci_high | api/capability/official_caps | Super Decider (thinking) | 2 | 3 |
| joint_ci_high | api/capability/official_caps | decide-1.1 (decide.sh, API) | 3 | 4 |
| joint_ci_high | api/capability/official_caps | Super Decider | 4 | 5 |
| joint_ci_high | api/capability/official_caps | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| joint_ci_high | api/capability/no_caps | kettei-fat (Sqwish) | 5 | 6 |
| joint_ci_high | api/capability/cost_off_latency_2x | kettei-fat (Sqwish) | 1 | 2 |
| joint_ci_high | api/capability/cost_off_latency_2x | Super Decider (thinking) | 2 | 3 |
| joint_ci_high | api/capability/cost_off_latency_2x | decide-1.1 (decide.sh, API) | 3 | 4 |
| joint_ci_high | api/capability/cost_off_latency_2x | Super Decider | 4 | 5 |
| joint_ci_high | api/capability/cost_off_latency_2x | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| joint_ci_high | api/capability/latency_none | kettei-fat (Sqwish) | 1 | 2 |
| joint_ci_high | api/capability/latency_none | Super Decider (thinking) | 2 | 3 |
| joint_ci_high | api/capability/latency_none | decide-1.1 (decide.sh, API) | 3 | 4 |
| joint_ci_high | api/capability/latency_none | Super Decider | 4 | 5 |
| joint_ci_high | api/capability/latency_none | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| joint_ci_high | api/extra_capability/cost_7x | kettei-fat (Sqwish) | 1 | 2 |
| joint_ci_high | api/extra_capability/cost_7x | Super Decider (thinking) | 2 | 3 |
| joint_ci_high | api/extra_capability/cost_7x | decide-1.1 (decide.sh, API) | 3 | 4 |
| joint_ci_high | api/extra_capability/cost_7x | Super Decider | 4 | 5 |
| joint_ci_high | api/extra_capability/cost_7x | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| joint_ci_high | api/extra_capability/cost_10x | kettei-fat (Sqwish) | 1 | 2 |
| joint_ci_high | api/extra_capability/cost_10x | Super Decider (thinking) | 2 | 3 |
| joint_ci_high | api/extra_capability/cost_10x | decide-1.1 (decide.sh, API) | 3 | 4 |
| joint_ci_high | api/extra_capability/cost_10x | Super Decider | 4 | 5 |
| joint_ci_high | api/extra_capability/cost_10x | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| joint_ci_high | api/extra_capability/rank_field | kettei-fat (Sqwish) | 5 | 6 |
| joint_ci_high | api/extra_capability/cost_7x_latency_none | kettei-fat (Sqwish) | 4 | 5 |
| joint_ci_high | api/extra_capability/cost_7x_latency_none | Super Decider (thinking) | 5 | 6 |
| joint_ci_high | api/extra_capability/cost_10x_latency_none | kettei-fat (Sqwish) | 4 | 5 |
| joint_ci_high | api/extra_capability/cost_10x_latency_none | Super Decider (thinking) | 5 | 6 |
| joint_ci_high | release/A | Torchcast Decision 4B (v1.3) | 2 | 3 |
| joint_ci_high | release/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| joint_ci_high | release/A | Arcbright Elf 1 12B (r2) | 4 | 6 |
| joint_ci_high | release/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 7 |
| joint_ci_high | release/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| joint_ci_high | release/B | decide-1.1 (decide.sh, API) | 2 | 3 |
| joint_ci_high | release/B | Karpo-Decision-31B | 3 | 5 |
| joint_ci_high | release/B | Super Decider | 4 | 7 |
| joint_ci_high | release/B | kettei-fat (Sqwish) | 5 | 9 |
| joint_ci_high | release/C | Torchcast Decision 4B (v1.3) | 2 | 3 |
| joint_ci_high | release/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| joint_ci_high | release/C | Arcbright Elf 1 12B (r2) | 4 | 6 |
| joint_ci_high | release/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 7 |
| leave_out_quyet-1-0-large | all/composites/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_quyet-1-0-large | all/composites/A | Super Decider | 4 | 6 |
| leave_out_quyet-1-0-large | all/composites/A | Arcbright Elf 1 12B (r2) | 5 | 7 |
| leave_out_quyet-1-0-large | all/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_quyet-1-0-large | all/composites/B | decide-1.1 (decide.sh, API) | 2 | 3 |
| leave_out_quyet-1-0-large | all/composites/B | Super Decider | 3 | 4 |
| leave_out_quyet-1-0-large | all/composites/B | Karpo-Decision-31B | 4 | 5 |
| leave_out_quyet-1-0-large | all/composites/B | kettei-fat (Sqwish) | 5 | 7 |
| leave_out_quyet-1-0-large | all/composites/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_quyet-1-0-large | all/composites/C | Super Decider | 4 | 6 |
| leave_out_quyet-1-0-large | all/composites/C | Arcbright Elf 1 12B (r2) | 5 | 7 |
| leave_out_quyet-1-0-large | all/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | all/capability/official_caps | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_quyet-1-0-large | all/capability/official_caps | Super Decider (thinking) | 5 | 7 |
| leave_out_quyet-1-0-large | all/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | all/capability/cost_off_latency_2x | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_quyet-1-0-large | all/capability/cost_off_latency_2x | Super Decider (thinking) | 5 | 7 |
| leave_out_quyet-1-0-large | all/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | all/capability/latency_none | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_quyet-1-0-large | all/capability/latency_none | Super Decider (thinking) | 5 | 7 |
| leave_out_quyet-1-0-large | all/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | all/extra_capability/cost_7x | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_quyet-1-0-large | all/extra_capability/cost_7x | Super Decider (thinking) | 5 | 7 |
| leave_out_quyet-1-0-large | all/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | all/extra_capability/cost_10x | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_quyet-1-0-large | all/extra_capability/cost_10x | Super Decider (thinking) | 5 | 7 |
| leave_out_quyet-1-0-large | open/composites/A | Torchcast Decision 31B v1.0 | 2 | 3 |
| leave_out_quyet-1-0-large | open/composites/A | Arcbright Elf 1 12B (r2) | 3 | 4 |
| leave_out_quyet-1-0-large | open/composites/A | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 4 | 5 |
| leave_out_quyet-1-0-large | open/composites/A | z3-mini-soup-preview (Zils AI) | 5 | 6 |
| leave_out_quyet-1-0-large | open/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_quyet-1-0-large | open/composites/B | Karpo-Decision-31B | 2 | 3 |
| leave_out_quyet-1-0-large | open/composites/B | Torchcast Decision 4B (v1.3) | 3 | 5 |
| leave_out_quyet-1-0-large | open/composites/B | H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted) | 4 | 7 |
| leave_out_quyet-1-0-large | open/composites/B | Fastino GLiDE 1.2 (open weights, self-hosted) | 5 | 8 |
| leave_out_quyet-1-0-large | open/composites/C | Torchcast Decision 31B v1.0 | 2 | 3 |
| leave_out_quyet-1-0-large | open/composites/C | Arcbright Elf 1 12B (r2) | 3 | 4 |
| leave_out_quyet-1-0-large | open/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 4 | 5 |
| leave_out_quyet-1-0-large | open/composites/C | Jeff-1.1-Qwen-4B (jgeuter) | 5 | 6 |
| leave_out_quyet-1-0-large | open/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | open/capability/official_caps | baselabs mammoth-1 (27B) | 4 | 7 |
| leave_out_quyet-1-0-large | open/capability/official_caps | KnowLine 31B-Gen1 | 5 | 8 |
| leave_out_quyet-1-0-large | open/capability/no_caps | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | open/capability/no_caps | baselabs mammoth-1 (27B) | 4 | 7 |
| leave_out_quyet-1-0-large | open/capability/no_caps | KnowLine 31B-Gen1 | 5 | 8 |
| leave_out_quyet-1-0-large | open/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | open/capability/cost_off_latency_2x | baselabs mammoth-1 (27B) | 4 | 7 |
| leave_out_quyet-1-0-large | open/capability/cost_off_latency_2x | KnowLine 31B-Gen1 | 5 | 8 |
| leave_out_quyet-1-0-large | open/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | open/capability/latency_none | baselabs mammoth-1 (27B) | 4 | 7 |
| leave_out_quyet-1-0-large | open/capability/latency_none | KnowLine 31B-Gen1 | 5 | 8 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_7x | baselabs mammoth-1 (27B) | 4 | 7 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_7x | KnowLine 31B-Gen1 | 5 | 8 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_10x | baselabs mammoth-1 (27B) | 4 | 7 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_10x | KnowLine 31B-Gen1 | 5 | 8 |
| leave_out_quyet-1-0-large | open/extra_capability/rank_field | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | open/extra_capability/rank_field | baselabs mammoth-1 (27B) | 4 | 7 |
| leave_out_quyet-1-0-large | open/extra_capability/rank_field | KnowLine 31B-Gen1 | 5 | 8 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_7x_latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_7x_latency_none | baselabs mammoth-1 (27B) | 4 | 7 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_7x_latency_none | KnowLine 31B-Gen1 | 5 | 8 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_10x_latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_10x_latency_none | baselabs mammoth-1 (27B) | 4 | 7 |
| leave_out_quyet-1-0-large | open/extra_capability/cost_10x_latency_none | KnowLine 31B-Gen1 | 5 | 8 |
| leave_out_quyet-1-0-large | api/composites/A | Super Decider | 2 | 3 |
| leave_out_quyet-1-0-large | api/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 3 | 4 |
| leave_out_quyet-1-0-large | api/composites/A | Myles-G 12B (Launchables) | 4 | 5 |
| leave_out_quyet-1-0-large | api/composites/A | kettei-fat (Sqwish) | 5 | 6 |
| leave_out_quyet-1-0-large | api/composites/B | kettei-fat (Sqwish) | 3 | 4 |
| leave_out_quyet-1-0-large | api/composites/B | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| leave_out_quyet-1-0-large | api/composites/B | Drex Max (Nace AI) | 5 | 6 |
| leave_out_quyet-1-0-large | api/composites/C | Super Decider | 2 | 3 |
| leave_out_quyet-1-0-large | api/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 3 | 4 |
| leave_out_quyet-1-0-large | api/composites/C | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_quyet-1-0-large | api/composites/C | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| leave_out_quyet-1-0-large | api/capability/official_caps | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| leave_out_quyet-1-0-large | api/capability/official_caps | Drex Max (Nace AI) | 5 | 6 |
| leave_out_quyet-1-0-large | api/capability/cost_off_latency_2x | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| leave_out_quyet-1-0-large | api/capability/cost_off_latency_2x | Drex Max (Nace AI) | 5 | 6 |
| leave_out_quyet-1-0-large | api/capability/latency_none | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| leave_out_quyet-1-0-large | api/capability/latency_none | Drex Max (Nace AI) | 5 | 6 |
| leave_out_quyet-1-0-large | api/extra_capability/cost_7x | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| leave_out_quyet-1-0-large | api/extra_capability/cost_7x | Drex Max (Nace AI) | 5 | 6 |
| leave_out_quyet-1-0-large | api/extra_capability/cost_10x | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| leave_out_quyet-1-0-large | api/extra_capability/cost_10x | Drex Max (Nace AI) | 5 | 6 |
| leave_out_quyet-1-0-large | release/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_quyet-1-0-large | release/A | Super Decider | 4 | 6 |
| leave_out_quyet-1-0-large | release/A | Arcbright Elf 1 12B (r2) | 5 | 7 |
| leave_out_quyet-1-0-large | release/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_quyet-1-0-large | release/B | decide-1.1 (decide.sh, API) | 2 | 3 |
| leave_out_quyet-1-0-large | release/B | Super Decider | 3 | 4 |
| leave_out_quyet-1-0-large | release/B | Karpo-Decision-31B | 4 | 5 |
| leave_out_quyet-1-0-large | release/B | kettei-fat (Sqwish) | 5 | 7 |
| leave_out_quyet-1-0-large | release/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_quyet-1-0-large | release/C | Super Decider | 4 | 6 |
| leave_out_quyet-1-0-large | release/C | Arcbright Elf 1 12B (r2) | 5 | 7 |
| leave_out_torchcast-decision-27b | all/composites/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_torchcast-decision-27b | all/composites/A | Super Decider | 4 | 5 |
| leave_out_torchcast-decision-27b | all/composites/A | Myles-G 12B (Launchables) | 5 | 6 |
| leave_out_torchcast-decision-27b | all/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_torchcast-decision-27b | all/composites/B | Super Decider | 2 | 3 |
| leave_out_torchcast-decision-27b | all/composites/B | kettei-fat (Sqwish) | 3 | 4 |
| leave_out_torchcast-decision-27b | all/composites/B | decide-1.1 (decide.sh, API) | 4 | 5 |
| leave_out_torchcast-decision-27b | all/composites/B | Karpo-Decision-31B | 5 | 6 |
| leave_out_torchcast-decision-27b | all/composites/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_torchcast-decision-27b | all/composites/C | Super Decider | 4 | 5 |
| leave_out_torchcast-decision-27b | all/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 7 |
| leave_out_torchcast-decision-27b | all/capability/official_caps | kettei-fat (Sqwish) | 3 | 4 |
| leave_out_torchcast-decision-27b | all/capability/official_caps | Karpo-Decision-31B | 4 | 5 |
| leave_out_torchcast-decision-27b | all/capability/official_caps | Super Decider (thinking) | 5 | 6 |
| leave_out_torchcast-decision-27b | all/capability/cost_off_latency_2x | kettei-fat (Sqwish) | 3 | 4 |
| leave_out_torchcast-decision-27b | all/capability/cost_off_latency_2x | Karpo-Decision-31B | 4 | 5 |
| leave_out_torchcast-decision-27b | all/capability/cost_off_latency_2x | Super Decider (thinking) | 5 | 6 |
| leave_out_torchcast-decision-27b | all/capability/latency_none | kettei-fat (Sqwish) | 3 | 4 |
| leave_out_torchcast-decision-27b | all/capability/latency_none | Karpo-Decision-31B | 4 | 5 |
| leave_out_torchcast-decision-27b | all/capability/latency_none | Super Decider (thinking) | 5 | 6 |
| leave_out_torchcast-decision-27b | all/extra_capability/cost_7x | kettei-fat (Sqwish) | 3 | 4 |
| leave_out_torchcast-decision-27b | all/extra_capability/cost_7x | Karpo-Decision-31B | 4 | 5 |
| leave_out_torchcast-decision-27b | all/extra_capability/cost_7x | Super Decider (thinking) | 5 | 6 |
| leave_out_torchcast-decision-27b | all/extra_capability/cost_10x | kettei-fat (Sqwish) | 3 | 4 |
| leave_out_torchcast-decision-27b | all/extra_capability/cost_10x | Karpo-Decision-31B | 4 | 5 |
| leave_out_torchcast-decision-27b | all/extra_capability/cost_10x | Super Decider (thinking) | 5 | 6 |
| leave_out_torchcast-decision-27b | open/composites/A | Torchcast Decision 31B v1.0 | 2 | 3 |
| leave_out_torchcast-decision-27b | open/composites/A | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| leave_out_torchcast-decision-27b | open/composites/A | Wald 26B-A4B (Gemma 4 26B-A4B) | 4 | 5 |
| leave_out_torchcast-decision-27b | open/composites/A | Arcbright Elf 1 12B (r2) | 5 | 6 |
| leave_out_torchcast-decision-27b | open/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_torchcast-decision-27b | open/composites/B | Karpo-Decision-31B | 2 | 3 |
| leave_out_torchcast-decision-27b | open/composites/B | Torchcast Decision 4B (v1.3) | 3 | 4 |
| leave_out_torchcast-decision-27b | open/composites/B | H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted) | 4 | 6 |
| leave_out_torchcast-decision-27b | open/composites/B | Fastino GLiDE 1.2 (open weights, self-hosted) | 5 | 7 |
| leave_out_torchcast-decision-27b | open/composites/C | Torchcast Decision 31B v1.0 | 2 | 3 |
| leave_out_torchcast-decision-27b | open/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| leave_out_torchcast-decision-27b | open/composites/C | Wald 26B-A4B (Gemma 4 26B-A4B) | 4 | 5 |
| leave_out_torchcast-decision-27b | open/composites/C | Arcbright Elf 1 12B (r2) | 5 | 6 |
| leave_out_torchcast-decision-27b | open/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| leave_out_torchcast-decision-27b | open/capability/official_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_torchcast-decision-27b | open/capability/official_caps | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_torchcast-decision-27b | open/capability/no_caps | Karpo-Decision-31B | 3 | 4 |
| leave_out_torchcast-decision-27b | open/capability/no_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_torchcast-decision-27b | open/capability/no_caps | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_torchcast-decision-27b | open/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| leave_out_torchcast-decision-27b | open/capability/cost_off_latency_2x | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_torchcast-decision-27b | open/capability/cost_off_latency_2x | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_torchcast-decision-27b | open/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_torchcast-decision-27b | open/capability/latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_torchcast-decision-27b | open/capability/latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_7x | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_7x | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_10x | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_10x | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_torchcast-decision-27b | open/extra_capability/rank_field | Karpo-Decision-31B | 3 | 4 |
| leave_out_torchcast-decision-27b | open/extra_capability/rank_field | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_torchcast-decision-27b | open/extra_capability/rank_field | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_7x_latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_7x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_7x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_10x_latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_10x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_torchcast-decision-27b | open/extra_capability/cost_10x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_torchcast-decision-27b | api/composites/A | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_torchcast-decision-27b | api/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 6 |
| leave_out_torchcast-decision-27b | api/composites/B | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| leave_out_torchcast-decision-27b | api/composites/B | Drex Max (Nace AI) | 5 | 6 |
| leave_out_torchcast-decision-27b | api/composites/C | kettei-fat (Sqwish) | 3 | 4 |
| leave_out_torchcast-decision-27b | api/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 4 | 5 |
| leave_out_torchcast-decision-27b | api/composites/C | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| leave_out_torchcast-decision-27b | release/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_torchcast-decision-27b | release/A | Super Decider | 4 | 5 |
| leave_out_torchcast-decision-27b | release/A | Myles-G 12B (Launchables) | 5 | 6 |
| leave_out_torchcast-decision-27b | release/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_torchcast-decision-27b | release/B | Super Decider | 2 | 3 |
| leave_out_torchcast-decision-27b | release/B | kettei-fat (Sqwish) | 3 | 4 |
| leave_out_torchcast-decision-27b | release/B | decide-1.1 (decide.sh, API) | 4 | 5 |
| leave_out_torchcast-decision-27b | release/B | Karpo-Decision-31B | 5 | 6 |
| leave_out_torchcast-decision-27b | release/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_torchcast-decision-27b | release/C | Super Decider | 4 | 5 |
| leave_out_torchcast-decision-27b | release/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 7 |
| leave_out_decider-12b | all/composites/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_decider-12b | all/composites/A | Super Decider | 4 | 5 |
| leave_out_decider-12b | all/composites/A | Myles-G 12B (Launchables) | 5 | 7 |
| leave_out_decider-12b | all/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_decider-12b | all/composites/B | Super Decider | 2 | 3 |
| leave_out_decider-12b | all/composites/B | decide-1.1 (decide.sh, API) | 3 | 4 |
| leave_out_decider-12b | all/composites/B | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_decider-12b | all/composites/B | Karpo-Decision-31B | 5 | 6 |
| leave_out_decider-12b | all/composites/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_decider-12b | all/composites/C | Super Decider | 4 | 5 |
| leave_out_decider-12b | all/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 7 |
| leave_out_decider-12b | all/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | all/capability/official_caps | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_decider-12b | all/capability/official_caps | Super Decider (thinking) | 5 | 6 |
| leave_out_decider-12b | all/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | all/capability/cost_off_latency_2x | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_decider-12b | all/capability/cost_off_latency_2x | Super Decider (thinking) | 5 | 6 |
| leave_out_decider-12b | all/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | all/capability/latency_none | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_decider-12b | all/capability/latency_none | Super Decider (thinking) | 5 | 6 |
| leave_out_decider-12b | all/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | all/extra_capability/cost_7x | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_decider-12b | all/extra_capability/cost_7x | Super Decider (thinking) | 5 | 6 |
| leave_out_decider-12b | all/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | all/extra_capability/cost_10x | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_decider-12b | all/extra_capability/cost_10x | Super Decider (thinking) | 5 | 6 |
| leave_out_decider-12b | open/composites/A | Torchcast Decision 31B v1.0 | 2 | 3 |
| leave_out_decider-12b | open/composites/A | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| leave_out_decider-12b | open/composites/A | Arcbright Elf 1 12B (r2) | 4 | 5 |
| leave_out_decider-12b | open/composites/A | Wald 26B-A4B (Gemma 4 26B-A4B) | 5 | 6 |
| leave_out_decider-12b | open/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_decider-12b | open/composites/B | Karpo-Decision-31B | 2 | 3 |
| leave_out_decider-12b | open/composites/B | Torchcast Decision 4B (v1.3) | 3 | 4 |
| leave_out_decider-12b | open/composites/B | H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted) | 4 | 6 |
| leave_out_decider-12b | open/composites/B | Fastino GLiDE 1.2 (open weights, self-hosted) | 5 | 8 |
| leave_out_decider-12b | open/composites/C | Torchcast Decision 31B v1.0 | 2 | 3 |
| leave_out_decider-12b | open/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| leave_out_decider-12b | open/composites/C | Arcbright Elf 1 12B (r2) | 4 | 5 |
| leave_out_decider-12b | open/composites/C | Wald 26B-A4B (Gemma 4 26B-A4B) | 5 | 6 |
| leave_out_decider-12b | open/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | open/capability/official_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_decider-12b | open/capability/official_caps | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_decider-12b | open/capability/no_caps | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | open/capability/no_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_decider-12b | open/capability/no_caps | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_decider-12b | open/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | open/capability/cost_off_latency_2x | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_decider-12b | open/capability/cost_off_latency_2x | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_decider-12b | open/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | open/capability/latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_decider-12b | open/capability/latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_decider-12b | open/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | open/extra_capability/cost_7x | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_decider-12b | open/extra_capability/cost_7x | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_decider-12b | open/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | open/extra_capability/cost_10x | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_decider-12b | open/extra_capability/cost_10x | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_decider-12b | open/extra_capability/rank_field | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | open/extra_capability/rank_field | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_decider-12b | open/extra_capability/rank_field | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_decider-12b | open/extra_capability/cost_7x_latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | open/extra_capability/cost_7x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_decider-12b | open/extra_capability/cost_7x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_decider-12b | open/extra_capability/cost_10x_latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_decider-12b | open/extra_capability/cost_10x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_decider-12b | open/extra_capability/cost_10x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_decider-12b | api/composites/A | Myles-G 12B (Launchables) | 3 | 4 |
| leave_out_decider-12b | api/composites/A | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_decider-12b | api/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 5 | 6 |
| leave_out_decider-12b | api/composites/B | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| leave_out_decider-12b | api/composites/B | Drex Max (Nace AI) | 5 | 6 |
| leave_out_decider-12b | api/composites/C | kettei-fat (Sqwish) | 3 | 4 |
| leave_out_decider-12b | api/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 4 | 5 |
| leave_out_decider-12b | api/composites/C | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| leave_out_decider-12b | release/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_decider-12b | release/A | Super Decider | 4 | 5 |
| leave_out_decider-12b | release/A | Myles-G 12B (Launchables) | 5 | 7 |
| leave_out_decider-12b | release/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_decider-12b | release/B | Super Decider | 2 | 3 |
| leave_out_decider-12b | release/B | decide-1.1 (decide.sh, API) | 3 | 4 |
| leave_out_decider-12b | release/B | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_decider-12b | release/B | Karpo-Decision-31B | 5 | 6 |
| leave_out_decider-12b | release/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_decider-12b | release/C | Super Decider | 4 | 5 |
| leave_out_decider-12b | release/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 7 |
| leave_out_h2o-lightning-4b-v1.1 | all/composites/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | all/composites/A | Super Decider | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | all/composites/A | Myles-G 12B (Launchables) | 5 | 7 |
| leave_out_h2o-lightning-4b-v1.1 | all/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_h2o-lightning-4b-v1.1 | all/composites/B | Super Decider | 2 | 3 |
| leave_out_h2o-lightning-4b-v1.1 | all/composites/B | decide-1.1 (decide.sh, API) | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | all/composites/B | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | all/composites/B | Karpo-Decision-31B | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | all/composites/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | all/composites/C | Super Decider | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | all/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 7 |
| leave_out_h2o-lightning-4b-v1.1 | all/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | all/capability/official_caps | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | all/capability/official_caps | Super Decider (thinking) | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | all/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | all/capability/cost_off_latency_2x | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | all/capability/cost_off_latency_2x | Super Decider (thinking) | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | all/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | all/capability/latency_none | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | all/capability/latency_none | Super Decider (thinking) | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | all/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | all/extra_capability/cost_7x | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | all/extra_capability/cost_7x | Super Decider (thinking) | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | all/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | all/extra_capability/cost_10x | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | all/extra_capability/cost_10x | Super Decider (thinking) | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/A | Torchcast Decision 31B v1.0 | 2 | 3 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/A | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/A | Arcbright Elf 1 12B (r2) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/A | Wald 26B-A4B (Gemma 4 26B-A4B) | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/B | Karpo-Decision-31B | 2 | 3 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/B | Torchcast Decision 4B (v1.3) | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/B | H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted) | 4 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/B | Fastino GLiDE 1.2 (open weights, self-hosted) | 5 | 8 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/C | Torchcast Decision 31B v1.0 | 2 | 3 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/C | Arcbright Elf 1 12B (r2) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | open/composites/C | Wald 26B-A4B (Gemma 4 26B-A4B) | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/official_caps | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/official_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/official_caps | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/no_caps | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/no_caps | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/no_caps | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/cost_off_latency_2x | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/cost_off_latency_2x | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/cost_off_latency_2x | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | open/capability/latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_7x | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_7x | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_7x | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_10x | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_10x | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_10x | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/rank_field | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/rank_field | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/rank_field | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_7x_latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_7x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_7x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_10x_latency_none | Karpo-Decision-31B | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_10x_latency_none | baselabs mammoth-1 (27B) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | open/extra_capability/cost_10x_latency_none | KnowLine 31B-Gen1 | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | api/composites/A | Myles-G 12B (Launchables) | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | api/composites/A | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | api/composites/A | kettei-fat (Sqwish) | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | api/composites/B | Fastino GLiDE (hosted API, 22 Oct 2026) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | api/composites/B | Drex Max (Nace AI) | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | api/composites/C | SD-JEV-4B-v12.1.0 (Kego, author-hosted API) | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | api/composites/C | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | api/composites/C | Fastino GLiDE (hosted API, 22 Oct 2026) | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | release/A | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | release/A | Super Decider | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | release/A | Myles-G 12B (Launchables) | 5 | 7 |
| leave_out_h2o-lightning-4b-v1.1 | release/B | Torchcast Decision 31B v1.0 | 1 | 2 |
| leave_out_h2o-lightning-4b-v1.1 | release/B | Super Decider | 2 | 3 |
| leave_out_h2o-lightning-4b-v1.1 | release/B | decide-1.1 (decide.sh, API) | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | release/B | kettei-fat (Sqwish) | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | release/B | Karpo-Decision-31B | 5 | 6 |
| leave_out_h2o-lightning-4b-v1.1 | release/C | Torchcast Decision 31B v1.0 | 3 | 4 |
| leave_out_h2o-lightning-4b-v1.1 | release/C | Super Decider | 4 | 5 |
| leave_out_h2o-lightning-4b-v1.1 | release/C | H2O-Lightning-4B v1.1 (H2O.ai, Qwen3.5-4B fine-tune, stock vLLM + open shim) | 5 | 7 |
