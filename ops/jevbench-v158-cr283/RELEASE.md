# CR-283 — JevBench v1.5.8 (HELD)

**Combined scope (4 Oct 2026, owner jevbench-v16-run-20261001, board #11 #10266):** wity-1 below, plus six rows from two paid public fast-lane orders. See the section "Fast-lane rows" at the end. The wity-only top-five statements in the next paragraphs describe build.py's intermediate state; the final orders are in `TOP-FIVE.json`.

One ranked row joins v1.5.7: **wity-1 (Wity, reasoning auto)**, build f65ce826a455, measured on 4 October 2026 at the operator's hosted production API. Two completed configurations, **reasoning always** and **reasoning off**, are labelled variants with scores but no ranks. Only auto enters the A/B/C orders and Capability ranking. This is an addendum on the frozen v1.5 1,624-decision protocol and G_med 5.186627500079243. Existing rows retain every value except ranks; previous paired markers remain only for pairs still adjacent.

**Top-five change. Held for Florian's GO on the screenshot preview (lead job wity-jevbench-results-20261003).** This worker does not publish, push, merge or open a PR. `TOP-FIVE.json` derives both releases' A/B/C top fives and Capability via the actual `jevClassRows` classifier. Only wity-1 enters, at #1 in all four orders; always/off are absent from every order. Existing entrants retain their relative order.

| Configuration | A score | A/B/C ranks | Capability score | Capability rank |
|---|---:|---|---:|---|
| auto (main row) | 73.74884310922342 | 1 / 1 / 1 | 84.51241464650256 | 1 |
| always (variant) | 73.87835688020117 | not ranked | 85.27088917727465 | not ranked |
| off (variant) | 70.08007435649631 | not ranked | 71.92891058093306 | not ranked |

API price is USD 0.042/M input, output free: USD 0.02441896551724138 per 1,000 decisions from 944,200 measured input tokens. The striped alternative is the frozen Qwen3.6-35B-A3B reference (USD 0.15/M input, 1.00/M output), applied to the same tokens: USD 0.08721059113300492 per 1,000 decisions. Base identity is operator self-reported, not independently verified. Auto is inside the Capability caps at API price. Its adjusted p50 is 0.9533328972756863 seconds.

The API default is off; our requests explicitly set each reasoning mode. Auto is the operator's requested main row. Every mode has 1,624 clean responses with X-Wity-Build f65ce826a455 and matching pre/post `/health` build identity. Measured windows on 4 October 2026 UTC: auto 08:16–09:01, always 09:01–09:51, off 08:06–08:15. Auto and always ran alone, sequentially; approximately the first 70 off decisions ran alongside two other streams, and the remainder ran alone. This condition is disclosed on the off row.

## Reproduction

`build.py` verifies every SHA in the input receipt: adapter, runner, frozen input, three specs, three raw files and six stored aggregates. It also verifies the frozen scorer sources, projects only system-level aggregates, checks all previous result fields except rank/ranks for identity, and writes `HASH-VERIFICATION.json`. Parent artifact and each source aggregate are hashed in the release artifact. Raw outputs and sealed item text remain private and are never committed.

`rescore.py` invokes the hash-pinned frozen A3 stack offline once for each of the three modes at both API and base prices. All six complete output files reproduce **byte-identically**, including the three modes' scores, axes and bootstrap intervals. `RESCORE-RECEIPT.json` records these checks. No inference or production API requests were performed.

`categories.py` reproduces all 24 split/type/tier cells and their counts for each mode before generating topic and TypeSafe use-case aggregates. All 113 prior category entries are unchanged. `CATEGORY-VERIFICATION.json` records 72 verified cells across the three new rows. Both radar dimensions cover all three modes.

The existing re-evaluation planner was run without a ledger write. `REEVALUATION-PLAN.json` discloses its historical v1.5.4 roster limitation and records this measured addendum; unrelated image/audio ledger snapshots are omitted.

## Rendering and gates

Current page/feed pointers select v1.5.8; historical routes stay pinned. A new `variant` listing avoids calling completed configurations partial or wrappers. Variants render separately below the comparison section and in the full table; each links to a detail page with all A/B/C scores, empty rank cells and its configuration note. Ranked visualizations continue to use only ranked rows. Both radar label maps and the shared not-ranked label maps recognize “variant”. The page retains the Capability chart, synchronized speed/cost charts, composite chart, direct comparison with both category radars, full table, method notes, presets, What-If and revision history. Scoring helpers are unchanged.

TypeScript, the production build and the full suite passed: 2,000 tests, 1,999 passed, one pre-existing snapshot-calibration skip and zero failures. Fresh screenshots are `desktop-top.png`, `wity-row.png`, `wity-variants.png` and `mobile-top.png` in `workers/v158-build/screenshots/`. At a 390px viewport the document/body widths were 380px with no horizontal overflow. Gate results and fresh local production screenshots are recorded in `workers/v158-build/RESULT.md`. This release remains held for lead review and Florian's GO.

The separate base-model display overlay adds only the three Wity keys, each explicitly self-reported with no invented public citation. The scorer's historical adapter label is replaced in the presentation row by the receipt's actual `WityReasoningAdapter` spec for its mode; numeric scoring is unchanged. `EXISTING-ROWS-VERIFICATION.json` proves preservation of 114 prior result rows, three unmeasured rows and 113 category rows.

## Fast-lane rows (A10, A11)

Two paid public fast-lane orders of 4 Oct 2026 join as ranked rows on the same frozen protocol: **torchcast-decision-12b** (order b113eac1, A10; torchcast-ai/torchcast-decision-12b@49107b55, Gemma-4-12B fine-tune, cc-by-nc-4.0) and the five **Quyet 1.0** systems (order 3643732b, A11; chinhnc/Quyet-1.0-{Large,Medium,Small,Small-EN,Tiny} at the revisions in each row's model pin, quyet 1.0.0 runtime from github.com/ncchinh/quyet@f9bddb97, apache-2.0). Both source reviews passed (fast-lane job review/). Each ran 1,624/1,624 decisions on an evaluator-owned Lium H100 inside `docker --network none`.

`build_fastlane.py` (run after build.py) checks every raw output and meta file against its delivered `OFFICIAL-SCORE.json`, checks the scorer pins, re-runs the pinned official scorer offline once per system and requires the delivered aggregate to reproduce exactly (all six do; `FASTLANE-RESCORE-RECEIPT.json`). It then projects the rows, re-ranks A/B/C, asserts every v1.5.7 row is unchanged except ranks and that existing rows keep their relative order in every order and in the Capability class, and rewrites `TOP-FIVE.json` against v1.5.7. The Capability caps are unchanged and no prior row leaves the class. `categories_fastlane.py` (run after categories.py) reproduces all 24 split/type/tier cells per row before writing topic and use-case aggregates. Base models are cited from each model card at the measured revision.

Cost is an estimate at the base-model reference price (self-hosted open weights have no tariff); the basis text is on each row. Speed uses the self-hosted adjustment (x2 + 0.15 s). The three Quyet encoders (Small, Small-EN, Tiny) score Intelligence 0 (chance-corrected, floored), so their composite is 0 under the Intelligence gate; they are ranked at the bottom, as the method requires.

Top fives after this release (v1.5.7 -> v1.5.8): A torchcast, wity-1, Cygnet, Winnow-12B, Jev 1.13.0; B torchcast, wity-1, Winnow-12B, Cygnet, Quyet-1.0-Large; C torchcast, wity-1, Cygnet, Winnow-12B, Jev 1.13.0; Capability wity-1, Quyet-1.0-Large, torchcast, Jev 1.13.0, Winnow-12B. **Top-five change: held for Florian's GO on the combined preview.** No rank wording to any model author before publication.

Reproduce: `python3 ops/jevbench-v158-cr283/build.py && python3 ops/jevbench-v158-cr283/build_fastlane.py && python3 ops/jevbench-v158-cr283/categories.py && python3 ops/jevbench-v158-cr283/categories_fastlane.py`. Gates on 4 Oct 2026: tsc clean, next build ok, 2,001 tests (2,000 pass, 1 pre-existing skip).
