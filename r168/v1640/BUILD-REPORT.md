# JevBench v1.6.40 — one hosted-API row: Fastino GLiDE (`fastino-glide-api`), scored on 1,497 of 1,500 items

Base: origin/main 3859fdfc (v1.6.39 sealed + CR-538). ONE local commit, review PENDING (independent review not yet run), no approval placeholder: Florian's release GO `glide-api-release-go` (DECISIONS 22 Oct 2026 ~20:4xZ, covers any top-five move) is recorded in the proof; no preview card is claimed.
Pricing module `pricing_v15.py` sha256 aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7 (live; every v1.6.39-derived script re-pinned from a8a05890: prepare, score, build_publication, verify, final_sanity, freeze (new + predecessor sha), lib template, pricing_preflight (kept for history, not run), freeze seal note). Frozen scorer sha256 02132271… unmodified.

## Row
| | |
|---|---|
| Key / display | `fastino-glide-api` / "Fastino GLiDE (hosted API, 22 Oct 2026)"; new key, coexists with the 6 Oct row `fastino-glide` (not in the v1.6.39 results at all, lives on the merged board from v1.6.1; notes point to it). No supersession (data model cannot supersede a different key). |
| Raw | sealed `runs/api-full/fastino-glide-api.jsonl` sha256 5b818aef…02cec: 1,497 rows = exactly the derived-gold ids; 1,480 ok (served `glide_v2` on each), 15 HTTP 400 (prompt > 65,536 tokens; the same 15 items as the common-basis exclusions), 2 HTTP 502 (not retried) — all 17 counted wrong |
| Scoring | second invocation of the unmodified scorer on a derived release dir: only `frozen/gold.jsonl` lacks the 3 ids of `GLIDE-1.2-FASTINO-EXCLUSIONS-20261022.json` (sha 31b47af5…); frozen gold sha fcb94f49…, derived gold sha 9f1f8200… (`make_gold_1497.py`, deterministic; byte-identical to the predecessor's scratch derivation); inputs/manifest.json byte-copy; O1S, B=1000, seed 16, G_med fixed 9.839526770355711, common cost basis 2125e620 (15 longest excluded → basis 1,482 items) |
| Axes I / Cal / Speed / Cost | 76.392 / 93.011 / 87.305 / 59.111 |
| Capability | 84.702 |
| Composite A / B / C | 76.609 / 76.566 / 76.609 (95 % CI A 75.06–77.30) |
| Ranks (release) A / B / C / Capability | 2 / 2 / 2 / 4 (of 66 ranked, 77 listed) |
| Cost | USD 0.023065 per 1,000 (0.357x cap), tariff 0.04/M in, output free, I-1; failed rows priced at the 65,536-token ceiling (scorer rule); all-1,497 figure 0.049101 |
| Decisions > 10 s | 2 (21.15 s and 76.42 s, both answered 200s; the two 502 rows took 7.73 s and 2.56 s). Correction to the predecessor's note: the 502s are not the >10 s decisions. No 10 s rule in v1.6.x |
| Disclosures (row text) | scored on 1,497 of 1,500 (wording per ruling); 15 over-limit items and 2 gateway errors counted wrong; provider-hosted, `glide_v2`, not the open-weights 1.2; store:false + header `x-fastino-data-retention: not-stored` on all 1,480 answers and one non-item check; price change since the 6 Oct row (0.15→0.04, 40,000→65,536 limit); latency from Sandy under load; 1,197 sealed items sent |

## Gates (all on a disposable PASS copy `r168/v1640/pass`, real tree stays PENDING)
- tsc 0; release test (new `test/jevbench-v1640-release.test.mjs`, 21 tests incl. 17 mutation rejections) pass; targeted 265/265; `npm run build` 0; full `node --test test/` (concurrency 3): 3,622 tests, 3,621 pass, 1 skipped, 0 fail (675 s) — `receipts/GATES.txt`, `fulltest.log`.
- Full `rebuild_v1640.sh` rerun (prepare → derived gold → scorer → field check → topics → finalize → tests → repro): release/categories/proof/publication/history/topic-supplement/validator/ranks-fixture sha256 identical before/after (`REBUILD-before/after.sha256`, `REBUILD-FULL-RERUN.log`).
- Reproduction: 73 carried registry rows scored on the real 1,500-item gold reproduce every published point estimate, categories and noul-decisive; the 17 carried API rows scored ALONE (one-row invocation) equal their published rows (so a one-row invocation does not change an API row's numbers) — asserted in `build_publication_v1640.py`, 76 carried published rows byte-identical except rank/ranks.
- `loader_gates`: synthetic PASS loads, REAL PENDING rejected. `run-authority-gates.sh`: flip/freeze dry runs pass, synthetic flip / REVISE / `freeze --write` refused, manifest unchanged, no seal. `localcheck`: local `next start` of the PASS copy, API bytes+hash, latest feed, 6 pages 200 no page errors, preview 3 radars, screenshot of the new system page inspected.
- Top-five diff vs live v1.6.39 (40 lists): **22 change, all through this row**: combined board A/B/C composites + 5 capability lists; API board A/B/C composites + 8 capability lists; release board A/B/C + capability. No open-weights list changes. Detail `receipts/TOPFIVE-V1640.md`, card image `preview/card-v1640.png`.

## Code changes beyond the release files (please review)
1. `lib/jevbench-v16-release.mjs`: item-count check accepts a row carrying `custody_exclusion {items: 3, scored_items: expected−3, derived_gold_sha256, exclusion_list_sha256}` with exactly expected−3 rows; anything else still fails. (The generic validator otherwise demanded 1,500.)
2. `lib/jevbench-v1639-release.mjs`: topic-supplement binding hardened as v1.6.39 did for v1.6.38 (`v1639TopicSupplementBinds`, pinned hash of carried v1.6.39 cells); `lib/jevbench-v1638-release.mjs` now also accepts a v1.6.40-bound supplement (same pinned hash). Tests added/updated.
3. Test expectation updates: latest-live label v1.6.39→v1.6.40, +1 board row, combined Capability rank of torchcast-decision-12b +1; sort order of release set now `v1.6.4, v1.6.40, v1.6.9`.
4. Supplement carries `derived_label_rows` (labels sha aee4480b… = ruled labels minus the 3 ids, frozen labels be5a5209…): the unchanged topic builder needs labels = gold ids, so the same 3 ids are removed from a copy.

## v1.6.41 preview (SubQ Snap 1.1 on top of v1.6.40; not built, not committed)
Scripts (job level, `r168/v1641/`): `prepare_score_v1641.sh` (unmodified scorer, real gold, B=1000), `build_preview_tree_v1641.py` (disposable copy of the v1.6.40 PASS tree with the row inserted; bundle validation off in the copy only), `topfive_diff_v1641.py`, `make_card_v1641.py`. Result: Capability 81.911, composite A/B/C 75.746 / 75.748 / 75.746 (rank A 4 of 67), cost 0.020453/1k, **14 of 40 lists change** (combined A/B/C; API A/B/C + 5 capability lists + release A/B/C), SubQ 1.1 the only mover; no open list changes. S/P check not flagged (S−P −2.4 pp, CI −6.0…+1.2). Card text `r168/v1641/TOPFIVE-PREVIEW.md`, image `r168/v1641/preview/card-v1641.png`. A real v1.6.41 = sed of these v1.6.40 scripts (previous v1.6.40, key subq-snap-1.1, spec `r168/specs/subq-snap-1.1.json`, raw sha 5c00dc93…, API row, full 1,500 items, Florian GO card instead of release GO, frozen preview tariff 0.05 untouched).
