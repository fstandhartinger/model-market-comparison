# JevBench v1.6.42: Torchcast Decision 4B (v1.3) (paid fast-lane order 9494e9ea), build report

Local candidate, ONE commit on branch `fusion/fastlane-torchcast4b-v13-native-20261023-v1642-build`, base origin/main `054204ae` (live v1.6.40, Fastino GLiDE). Review PENDING.
No push, PR, merge, deployment, seal write, message or spend. Recipe = v1.6.39 (self-hosted single paid row) on top of v1.6.40 (pricing aa2afcd5, lib/test hardening); scripts in this directory (copied from `r164/v1639` and re-pinned/adapted as `r168/v1640` did), full rerun: `rebuild_v1642.sh`.
**Version number: v1.6.42. v1.6.41 is NOT used (reserved for SubQ Snap 1.1).** If v1.6.41 reaches main first this release has to be restacked on it (rebuild, not just rebase: predecessor, supplement binding and release lists move).

## The row

| Field | Value |
|---|---|
| Key / display | `torchcast-decision-4b-v1.3` / "Torchcast Decision 4B (v1.3)" (Torchcast AI; repo `torchcast-ai/torchcast-decision-4b` @ `004acea2e23056bc79415cfa69b9f3ea4254e6d0`, tag v1.3.0; self-hosted, `endpoint_kind` gpu). New key next to `torchcast-decision-4b-v1.2` (no supersession; v1.2 stays listed as its own version) |
| Raw | sha256 `057cae292bed0489d85af357e9aa4589b979677deb273b806b35f16180b8f478` verified (mode 0600, sealed store, symlinked only, never copied); 1,500 rows, 1,500 HTTP 200 / ok, `probs_source` native on all, usage present on all rows; 982,889 input / 0 output tokens |
| Intelligence / Calibration / Speed / Cost axis | 67.147485 / 87.847168 / 92.638351 / 64.808370 |
| Capability | 77.497327 |
| Composite A / B / C | 76.189362 / 74.191287 / 76.189362 (95 % CI A 73.60-77.29, B 70.79-75.85) |
| Release ranks A / B / C / Capability | 3 / 6 / 3 / 20 of 67 ranked (field run alone gives A 2, B 5, C 2, Capability 19: the release inserts the new row into the predecessor's order, which already holds the hosted GLiDE row above it, exactly as v1.6.38/39 did) |
| Merged live board | open-weights board: composite A #1, B #2 (of 197); Capability official caps #11 of 140 (capped open board); combined board composite A/C #3 of 241 |
| **Cost per 1,000 decisions (scorer `--cost-basis`, common 1,485-item basis, 737,326 input tokens)** | **USD 0.01489547 = 0.2306x the 0.064595 cap** (release owner's recomputation USD 0.0148955 / 0.2306x reproduced by the unmodified scorer); all-1,500 figure USD 0.01965778 (resolve()) |
| Speed | raw p50 0.0336 s / p95 0.0560 s (full set), 0.0328 / 0.0513 s on the official 124-item subset; standard self-hosted x2 + 0.15 s adjustment |
| Decisions over 10 s | **0** (max 7.7282 s); no 10-second rule in v1.6.x anyway |
| Host | evaluator-owned Verda A100 SXM4 80GB VM (1A100.22V, FIN-02), offline container, cut proven before the sealed input, measured 23 Oct 2026; instance and volumes confirmed deleted, node shred rc 0, leak scan 0 hits |

Release: 78 rows listed, 67 ranked (v1.6.40: 77 / 66). All 77 carried published rows are byte-identical to v1.6.40 except `rank`/`ranks` (asserted by `build_publication_v1642.py` and `verify_v1642.py`), including the hosted GLiDE row. Unmodified frozen scorer `02132271` (O1S, B=1000, seed 16, fixed G_med 9.839526770355711, `--cost-basis` file from frozen-release-v1.6.40, sha 2125e620, 15 excluded ids), pricing module `aa2afcd5` (unchanged since v1.6.40).

**Field run:** one scorer invocation on the real 1,500-item gold with the 73 carried same-draw registry rows plus the new row (`batch/REGISTRY-FIELD.json`). The hosted GLiDE row of v1.6.40 (scored on its derived 1,497-item gold, 74th registry row) cannot be in a real-gold field run and is not; it is carried by bytes like every published row. The build asserts that all 73 field rows reproduce every published point estimate (scores, axes, capability, cost, speed, intelligence, calibration, noul_decisive) and category cells; published bootstrap intervals are retained. The new row's intervals use its field-run seeds. `REGISTRY-PUBLIC.json` (proof-bound) = the v1.6.40 sealed registry (74 rows) + the new row (75).

## Pricing evidence (frozen pricing_v15 aa2afcd5, read-only; `receipts/PRICING-PREFLIGHT.json`, `PRICING-DECISIONS.json`)

```
reference('torchcast-decision-4b-v1.3', {'base_model': 'Qwen/Qwen3.5-4B', 'source': 'selfhosted', 'price_in_per_m': None, 'price_out_per_m': None}, catalog_rates())
  -> ('deepinfra:Qwen/Qwen3.5-4B', (0.030000000000000002, 0.15))
resolve(...) -> market_reference deepinfra:Qwen/Qwen3.5-4B, counting_list_price False, rankable True, usd_per_1000 0.01965778 (all 1,500 items; 982,889 in / 0 out),
  note "ESTIMATE: exact base-model market reference (operator tariff excluded by 30-day rule); reference deepinfra:Qwen/Qwen3.5-4B frozen at the 25 Sep cut-off, deprecated afterwards (replaced by Qwen/Qwen3.5-9B); re-score if it changes (I-3)"
```
Effective prices USD 0.03/M input, 0.15/M output (the same float values the live v1.2 row carries), `cost_kind` estimate. Scorer result on the common basis: `cost.usd_per_1000` 0.01489547474747475, `common_basis.n_items` 1485 (the build asserts the scorer value equals the independent formula and the release owner's USD 0.0148955 / 0.2306x to 7 digits).

## Disclosures on the row (public text, aggregate-only; no internal ids, paths, board numbers or job names; checked by `final_sanity_v1642.py`)

Order id 9494e9ea (public paid order); measured as shipped with the author's own `torchcast_decision` server unchanged at tag v1.3.0 and its bundled `decision_config.json`; same runtime as v1.2 (official PyTorch 2.9.1 cu128 image digest-pinned, offline hash-locked overlay: transformers 5.8.1, flash-linear-attention 0.5.2, causal-conv1d 1.7.0; Python 3.11 instead of the documented 3.12); non-causal full attention as trained (causal runtimes give different probabilities); **new in v1.3:** new fine-tuned weights, calibration temperature 0.9 (v1.2: 1.0), CUDA graphs in the non-causal mode (speed only; graph and eager readouts bit-identical in our check); yes/no commit floor 0.801 (answer unchanged); prompts over 16,384 tokens keep head and tail of the state (documented); 0 output tokens; all 1,500 answered, none over 10 s; cost is a labelled estimate on the Qwen3.5-4B reference; self-hosted x2 + 0.15 s speed adjustment as for every self-hosted row; v1.2 remains listed. Licence line as the v1.2 row (Apache-2.0 weights/serving package, base Apache-2.0). Endpoint condition: Verda A100 SXM4 80GB VM, offline container, cut proven before the sealed input, raw p50/p95/max.
Author claims: the v1.2 row text carries none, so none are repeated here. The author's README for v1.3 states its own reads on public/internal items and (for v1.2) a leaderboard placement; neither is in the row (no leaderboard placement claims, per the brief).

## Top five: 7 of 40 lists change, all through `torchcast-decision-4b-v1.3`

40 lists = 36 merged-board variants (mixed/open/API x composites A/B/C + capability under official caps, no caps, cost-off+latency 2x, latency none, 7x/10x cost caps with and without latency cap) + 4 release-board lists; before = live v1.6.40 main tree (clean `git archive` of the base commit), after = PASS copy with v1.6.42. Full tables `receipts/TOPFIVE-V1642.md`, `receipts/topfive-diff.json`, interactive `preview/preview-full-ranking.html`.

| List | Position of the new row | Before | After | Drops |
|---|---|---|---|---|
| all/composites/A | 3 of 241 | kettei-fat, fastino-glide-api, liquid-d1-ultra, nimble-v4-max, drex-max | kettei-fat, fastino-glide-api, torchcast-decision-4b-v1.3, liquid-d1-ultra, nimble-v4-max | drex-max |
| all/composites/C | 3 of 241 | kettei-fat, fastino-glide-api, liquid-d1-ultra, nimble-v4-max, drex-max | kettei-fat, fastino-glide-api, torchcast-decision-4b-v1.3, liquid-d1-ultra, nimble-v4-max | drex-max |
| open/composites/A | 1 of 197 | h2o-lightning-4b, h2o-lightning-31b, torchcast-decision-4b-v1.2, decisio-gemma-4-31b-v080, basal-omni-1.0-ultra | torchcast-decision-4b-v1.3, h2o-lightning-4b, h2o-lightning-31b, torchcast-decision-4b-v1.2, decisio-gemma-4-31b-v080 | basal-omni-1.0-ultra |
| open/composites/B | 2 of 197 | h2o-lightning-31b, basal-omni-1.0-ultra, quyet-1-0-large, decisio-gemma-4-31b-v080, h2o-lightning-4b | h2o-lightning-31b, torchcast-decision-4b-v1.3, basal-omni-1.0-ultra, quyet-1-0-large, decisio-gemma-4-31b-v080 | h2o-lightning-4b |
| open/composites/C | 1 of 197 | h2o-lightning-4b, h2o-lightning-31b, torchcast-decision-4b-v1.2, decisio-gemma-4-31b-v080, basal-omni-1.0-ultra | torchcast-decision-4b-v1.3, h2o-lightning-4b, h2o-lightning-31b, torchcast-decision-4b-v1.2, decisio-gemma-4-31b-v080 | basal-omni-1.0-ultra |
| release/A | 3 of 67 | kettei-fat, fastino-glide-api, liquid-d1-ultra, nimble-v4-max, drex-max | kettei-fat, fastino-glide-api, torchcast-decision-4b-v1.3, liquid-d1-ultra, nimble-v4-max | drex-max |
| release/C | 3 of 67 | kettei-fat, fastino-glide-api, liquid-d1-ultra, nimble-v4-max, drex-max | kettei-fat, fastino-glide-api, torchcast-decision-4b-v1.3, liquid-d1-ultra, nimble-v4-max | drex-max |

Unchanged: combined composite B (new row #6), every capability list on every board (combined #19-#35, open #11-#19), the whole API board (self-hosted row), release B (#6) and release capability (#20). The new row is the open-weights board's composite A #1 and displaces `basal-omni-1.0-ultra` (A, C) and `h2o-lightning-4b` (B) from the open top five, and `drex-max` from the combined/release A and C top five.

**Publication authority:** a top-five change by a paid public fast-lane order is covered by the automatic paid publication exception (skill `jevbench-fast-lane`). Recorded in the proof exactly as v1.6.39 did: `publication_approval.top_five_effect = changes`, `top_five_changed_by = [torchcast-decision-4b-v1.3]`, `top_five_authority = "paid fast-lane publication exception; no top-five preview card sent, none claimed"`, `top_five_preview = null`, `button_tap = false`, `paid_fast_lane.orders = 9494e9ea`, plus the public measurement note. No card, button or PLACEHOLDER is claimed or present. Review stays PENDING (`review: {engine: PENDING, verdict: PENDING}`); the real tree is rejected by the loader until the lead flips it.

## What changed in the site tree

New: `data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.42-{results,categories,proof,history,history-carry,publication}.json`, `lib/jevbench-v1642-release.mjs`, `app/api/jevbench/v1.6.42/route.ts`, `app/jev-models/v1.6.42/page.tsx`, `test/jevbench-v1642-release.test.mjs` (18 cases), `test/fixtures/jevbench-v1642-ranks.json`. Edited by `wire_v1642.py` (idempotent, every replacement asserted): release list/nav/history availability/category revision lists/cohort reader/draw-equating, architecture and base-model provenance for the new key, shared cohort topic supplement re-bound to v1.6.42 (the new row's cells added; the 73 field rows' cells asserted unchanged; the hosted-GLiDE cells and its `derived_label_rows` note carried).
Test expectations that legitimately move (`update_tests_v1642.py`): latest-release labels v1.6.40 to v1.6.42 (merged-board, v1635-v1637 release tests, fresh-source list, page structure, ranks fixture references), `cr-303-feed-split` (the row enters the capped open Capability board at #11: open ranks below +1; combined Capability rank of torchcast-decision-12b +1), merged-board row count +1.

## Code changes beyond the release files (please review)
1. `lib/jevbench-v1640-release.mjs`: topic-supplement binding hardened as v1.6.39/40 did for their predecessors (`v1640TopicSupplementBinds` + pinned hash `a4ec273c...` of v1.6.40's carried cells; accepts a v1.6.42-bound supplement only with unchanged carried cells). The reader previously demanded `release === 'v1.6.40'`, so re-binding the shared supplement would have taken v1.6.40 (and everything stacked on it) down.
2. `lib/jevbench-v1639-release.mjs` and `lib/jevbench-v1638-release.mjs`: accepted supplement releases extended to include `v1.6.42` (same pinned hashes, which I re-derived: the v1.6.39 pin `b4c3267d...` reproduces from the committed supplement).
3. **Numbering gap 40 -> 42:** checked. Nothing assumes consecutive numbers: the release list, nav type union, history availability and `JEVBENCH_FRESH_V16_REVISIONS` are explicit lists (v1.6.19 was already a gap). The only change is that the fresh-source test's negative examples now read `'v1.6.41', 'v1.6.43'` (41 stays "not a release", the future 43 is the new unpublished example) and its title says v1.6.2 to v1.6.42. The new test also asserts a supplement stamped `v1.6.41` is rejected by the v1.6.40/39/38 readers.
4. No change to the frozen scorer, pricing module, `lib/jevbench-v16-release.mjs` or any frozen release.

## Gates (disposable PASS copy `r169t/v1642/pass` with a synthetic PASS manifest; real tree PENDING)

| Gate | Result (rc) |
|---|---|
| `tsc --noEmit` | 0 |
| `test/jevbench-v1642-release.test.mjs` | 18/18 (14 mutation rejections incl. approval card/button/authority/note, item leakage, unpriced ranked row, plus the supplement binding test), rc 0 |
| targeted suites (v1629-v1640 release tests, merged board, cohort supersession, SEO, system pages, feed, architecture, categories, fresh-source, page structure, cr-292/303/257) | 285/285, rc 0 |
| `npm run build` | 0 |
| full `node --test test/` at `--test-concurrency=3` (box loaded, load 15-18) | 3,655 tests, 3,654 pass, 1 skipped, 0 fail, 758 s, rc 0 (`receipts/fulltest.log`, `GATES-run.log`) |
| first attempts | `tsc` rc 2 once (an unescaped apostrophe in the release-list entry, fixed in `wire_v1642.py`), `targeted` rc 1 once (`cr-303-feed-split` open-rank expectations, fixed in `update_tests_v1642.py`); the retained logs are of the passing run from scratch |
| full `rebuild_v1642.sh` rerun (prepare, frozen scorer, topics, finalize, fixture, tests, pass copy, repro) | all 34 changed/new files outside `r169t/` byte-identical before/after (`receipts/REBUILD-before.sha256`, `REBUILD-after.sha256`, `REBUILD-FULL-RERUN.log`) |

Also: `verify_v1642.py --repro` PASS (deterministic rebuild; 77 carried rows byte-identical except placement); `loader_gates_v1642.mjs` (`receipts/LOADER-GATES.log`): synthetic PASS loads (78 rows), REAL PENDING rejected ("independent release review"); `run-authority-gates.sh`: flip/freeze dry runs pass (predecessor v1.6.40 PASS and sealed, v1.6.40 seal bound, live pricing aa2afcd5), synthetic PASS flip refused, REVISE flip refused, `freeze --write` refused, manifest unchanged, no seal written (`FLIP-*.log`, `FREEZE-*.log`); `localcheck_v1642.py` on a local `next start` of the PASS copy (own headless Chrome, not another session's): API bytes/hash, latest feed has exactly one `torchcast-decision-4b-v1.3` row, six pages (open, api, all, release, system page, archive v1.6.40) HTTP 200 with no page errors, preview with 3 radars, screenshots in `shots/single/`; `final_sanity_v1642.py origin/main` after the commit (see RESULT).

## v1.7 inputs
`r169t/v1642/v17-input/ENTRY-TORCHCAST-4B-V13.json` (registry entry, raw sha, receipts dir) and `BASIS-TORCHCAST-4B-V13.json` (price basis, common-basis numbers, latency facts, hardware, serving), copies in `/home/flori/jobs/fastlane-torchcast4b-v13-native-20261023/v1642/v17-input/`. Key facts: base `Qwen/Qwen3.5-4B` (reference `deepinfra:Qwen/Qwen3.5-4B`; `-Base` maps to the same), 0 decisions over 10 s (max 7.73 s), so a v1.7 10-second rule costs nothing.

## Open issues / doubts
1. Restack risk: if SubQ Snap 1.1 (v1.6.41) lands before this merges, v1.6.42 must be rebuilt on it (its predecessor, supplement binding, lists and ranks change); main moving otherwise needs only a rebase if no file overlap.
2. The field run does not contain the hosted GLiDE row (derived gold), so new-row ranks in the release depend on the predecessor tie order (A 3 vs field A 2), as in earlier stacked releases. Deliberate, same method as v1.6.38/39.
3. Public row text was written from the registry draft, the handoff receipts and the v1.2 row, not copied from the draft's internal notes (which cite board and decision numbers). Please have the critic read it against the v1.3 README (tag v1.3.0), the custody and host receipts.
4. Open-board result: the row is open-weights composite A #1 on the live board. Per the standing rule no model author is told a top-five/#1 claim before the review and publication; this report is internal.
5. Full suite ran at concurrency 3 on a loaded box in 758 s; a single `npm test` in the merge queue may exceed its 900 s limit again.
6. `.git/config` of `/opt/model-market-comparison`: before `7eb40a4e92ae68a48673568aa344eb5549becdf55c9d8df8d5da433d1b930cdc`, after: see RESULT.md. `git worktree add -b ...` writes a branch stanza; no `git config`/push command was run by this slice.
