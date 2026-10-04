# CR-283 — JevBench v1.5.8 (HELD)

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
