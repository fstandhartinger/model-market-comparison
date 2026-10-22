# JevBench v1.6.39: H2O-Lightning-31B (paid fast-lane order 5fa1a5f0), build report

Local candidate, ONE commit on branch `fusion/jevbench-add-requests-20260919-r164-v1639-build`, base origin/main `86e8505b` (v1.6.38, CR-535). Review PENDING.
No push, PR, merge, deployment, seal write, message or spend. Recipe = v1.6.38 (copied and adapted in this directory); scripts: `rebuild_v1639.sh`.

## The row

| Field | Value |
|---|---|
| Key / display | `h2o-lightning-31b` / H2O-Lightning-31B v1.0.7 (H2O.ai, Gemma-4-31B-it fine-tune, vLLM + h2oai overlay, one-engine FP8 profile, self-hosted) |
| Raw | sha256 `93f00824bdadcbab56d4eb03c6f03df3dd97e749a80f375135e737b0eaf7b24a` verified; 1,500 rows, 1,500 HTTP 200 / ok; 1,917,924 input, 1,500 output (1 each) tokens; never copied into the site tree |
| Intelligence / Calibration / Speed / Cost axis | 80.150120 / 90.188826 / 89.842483 / 50.572661 |
| Capability | 85.169473 |
| Composite A / B / C | 73.436864 / 74.688016 / 73.436864 (95 % CI A 72.20-74.23, B 73.01-75.87) |
| Release ranks A / B / C / Capability | 8 / 4 / 8 / 3 of 65 ranked (field run alone gives A 7; the release inserts new rows into the predecessor's order, exactly as v1.6.38 did) |
| Merged live board (open, Capability official caps) | #2 of 139 (composite A #2, B #1 of 196 open-weights) |
| Cost per 1,000 decisions (official, common 1,485-item basis) | **USD 0.044420 = 0.688 x the official cap (0.064595)** |
| Speed | raw p50 0.063 s / p95 0.113 s on the official 124-item subset, standard self-hosted x2 + 0.15 s adjustment |
| Decisions over 10 s | **15** (max 39.08 s); no 10-second rule in v1.6.39 |

Release: 76 rows listed, 65 ranked (v1.6.38 had 75 / 64). All 75 carried published rows are byte-identical to v1.6.38 except `rank`/`ranks`; the field run reproduces all 72 same-draw point estimates (build asserts equality of scores/axes/capability/cost/speed/intelligence/calibration/noul_decisive, then keeps published intervals). Unmodified frozen scorer `02132271` (O1S, B=1000, seed 16, fixed G_med 9.839526770355711, `--cost-basis cost-basis-v1630.json` 2125e620), pricing module `a8a05890` (unchanged since v1.6.38).

## LEAD ATTENTION: the row is UNDER the official cost cap, not over it

The handoff expected "about USD 0.115/1k over all 1,500, over the official cap, ranked with the standard over-cap disclosure, like Aleria". That number is what the frozen
`resolve()` returns over all 1,500 items (USD 0.11541544/1k). But this row answered the 15 longest items in full (76,497-81,692 tokens, 1.19 M of its 1.92 M input tokens), and the v1.6.30 common cost basis (the unmodified scorer's `--cost-basis`) leaves those 15 items out of every row's cost axis. On the common 1,485 items the row costs **USD 0.044420/1k = 0.688 x cap, inside the official cost-capped views** (727,319 input / 1,485 output tokens). The scorer, not the build, decides this. So the public row carries NO over-cap disclosure; instead its cost basis text states both numbers (all-item USD 0.115415 and common-basis USD 0.044420) and that the 15 longest items count for no row's cost. This is why the row reaches Capability #3 on the capped combined board. If the lead would rather show the all-item figure, that needs a rule change, not a build flag.

## Pricing evidence (frozen pricing_v15 a8a05890, read-only)

Base-name capitalisation: the live 31B rows (`basal-omni-1.0-ultra`, `metask_jev_rain_31b_trained(_v3)`, `launchables-myles-g-31b`) declare `google/gemma-4-31B-it` (capital B). Run with that spelling the frozen module resolves; the lowercase spelling RAISES ("base model lacks an explicit market-listing decision"). Used: capital B. Receipt `receipts/PRICING-PREFLIGHT.json` (script `pricing_preflight_v1639.py`):

```
reference('h2o-lightning-31b', {'base_model': 'google/gemma-4-31B-it', 'source': 'selfhosted', 'price_in_per_m': None, 'price_out_per_m': None}, catalog_rates())
  -> ('google/gemma-4-31b-it', (0.09, 0.33999999999999997))
resolve(...) -> market_reference google/gemma-4-31b-it, counting_list_price False, rankable True, usd_per_1000 0.11541544 (all 1,500 items),
                note "ESTIMATE: exact base-model market reference (operator tariff excluded by 30-day rule)", tokens 1,917,924 in / 1,500 out
reference(... 'google/gemma-4-31b-it' ...) -> ValueError: base model lacks an explicit market-listing decision
```
Effective prices 0.09/0.34 per M, cost_kind estimate, applied to the server-reported usage. Common basis: (727,319 x 0.09 + 1,485 x 0.34) / 1e6 x 1000 / 1485 = 0.0444199.

## Disclosures on the row (public text, aggregate-only, no internal ids)

Measured as shipped (author's `run_default.sh` one-engine profile, FP8, two-way by default; other configurations would differ); all 1,500 answered in full, none refused/cut; 15 decisions over 10 s; the author's README figure 214/231 on the public items (own client) stated as the author's and not comparable, scorer's standard public-vs-sealed gap applies; training-data statement not checked; customer statements unverified; licence H2O Model Non-Commercial Licence v1.1 (benchmarking/publishing allowed); measured accuracy on the 15 longest items 7/15 (46.7 %) vs 1,313/1,485 (88.4 %); hardware, network cut (container + host, proven before sealed input and before scored run), serial, determinism 50/50; pod-side input shred timed out and VM and volume verified absent afterwards.

## Top five: 20 of 40 lists change, all through h2o-lightning-31b

40 lists = 36 merged-board variants (mixed/open/API x composites A/B/C + capability under official caps, no caps, cost-off+latency 2x, latency none, + 7x/10x cost caps with and without latency cap) + 4 release-board lists, before = live v1.6.38 main tree, after = pass copy with v1.6.39. Full tables: `receipts/TOPFIVE-V1639.md`, `receipts/topfive-diff.json`, interactive `preview/preview-full-ranking.html`. Changed lists (row's new position, before top five, after top five, who drops out):

| List | Position | Before | After | Drops |
|---|---|---|---|---|
| all/composites/B | 4 of 239 | kettei-fat, drex-max, liquid-d1-ultra, subq-snap-preview, nimble-v4-max | kettei-fat, drex-max, liquid-d1-ultra, h2o-lightning-31b, subq-snap-preview | nimble-v4-max |
| all/capability/official_caps | 3 of 167 | kettei-fat, chon-1.0-12b, drex-max, basal-omni-1.0-ultra, quyet-1-0-large | kettei-fat, chon-1.0-12b, h2o-lightning-31b, drex-max, basal-omni-1.0-ultra | quyet-1-0-large |
| all/capability/cost_off_latency_2x | 3 of 208 | kettei-fat, chon-1.0-12b, drex-max, vllm-sr-d3, pplx-decider-v1-1-27b | kettei-fat, chon-1.0-12b, h2o-lightning-31b, drex-max, vllm-sr-d3 | pplx-decider-v1-1-27b |
| all/capability/latency_none | 3 of 185 | kettei-fat, chon-1.0-12b, drex-max, basal-omni-1.0-ultra, quyet-1-0-large | kettei-fat, chon-1.0-12b, h2o-lightning-31b, drex-max, basal-omni-1.0-ultra | quyet-1-0-large |
| all/extra_capability/cost_7x | 3 of 199 | kettei-fat, chon-1.0-12b, drex-max, vllm-sr-d3, pplx-decider-v1-1-27b | kettei-fat, chon-1.0-12b, h2o-lightning-31b, drex-max, vllm-sr-d3 | pplx-decider-v1-1-27b |
| all/extra_capability/cost_10x | 3 of 205 | kettei-fat, chon-1.0-12b, drex-max, vllm-sr-d3, pplx-decider-v1-1-27b | kettei-fat, chon-1.0-12b, h2o-lightning-31b, drex-max, vllm-sr-d3 | pplx-decider-v1-1-27b |
| open/composites/A | 2 of 196 | h2o-lightning-4b, torchcast-decision-4b-v1.2, decisio-gemma-4-31b-v080, basal-omni-1.0-ultra, quyet-1-0-large | h2o-lightning-4b, h2o-lightning-31b, torchcast-decision-4b-v1.2, decisio-gemma-4-31b-v080, basal-omni-1.0-ultra | quyet-1-0-large |
| open/composites/B | 1 of 196 | basal-omni-1.0-ultra, quyet-1-0-large, decisio-gemma-4-31b-v080, h2o-lightning-4b, torchcast-decision-4b-v1.2 | h2o-lightning-31b, basal-omni-1.0-ultra, quyet-1-0-large, decisio-gemma-4-31b-v080, h2o-lightning-4b | torchcast-decision-4b-v1.2 |
| open/composites/C | 2 of 196 | h2o-lightning-4b, torchcast-decision-4b-v1.2, decisio-gemma-4-31b-v080, basal-omni-1.0-ultra, quyet-1-0-large | h2o-lightning-4b, h2o-lightning-31b, torchcast-decision-4b-v1.2, decisio-gemma-4-31b-v080, basal-omni-1.0-ultra | quyet-1-0-large |
| open/capability/official_caps | 2 of 139 | chon-1.0-12b, basal-omni-1.0-ultra, quyet-1-0-large, jeff_1_0_large, metask_jev_rain_31b_trained_v3 | chon-1.0-12b, h2o-lightning-31b, basal-omni-1.0-ultra, quyet-1-0-large, jeff_1_0_large | metask_jev_rain_31b_trained_v3 |
| open/capability/no_caps | 2 of 196 | chon-1.0-12b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo, startlux-decision-v1.1-27b-instant | chon-1.0-12b, h2o-lightning-31b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo | startlux-decision-v1.1-27b-instant |
| open/capability/cost_off_latency_2x | 2 of 174 | chon-1.0-12b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo, startlux-decision-v1.1-27b-instant | chon-1.0-12b, h2o-lightning-31b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo | startlux-decision-v1.1-27b-instant |
| open/capability/latency_none | 2 of 155 | chon-1.0-12b, basal-omni-1.0-ultra, quyet-1-0-large, jeff_1_0_large, metask_jev_rain_31b_trained_v3 | chon-1.0-12b, h2o-lightning-31b, basal-omni-1.0-ultra, quyet-1-0-large, jeff_1_0_large | metask_jev_rain_31b_trained_v3 |
| open/extra_capability/cost_7x | 2 of 167 | chon-1.0-12b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo, startlux-decision-v1.1-27b-instant | chon-1.0-12b, h2o-lightning-31b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo | startlux-decision-v1.1-27b-instant |
| open/extra_capability/cost_10x | 2 of 172 | chon-1.0-12b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo, startlux-decision-v1.1-27b-instant | chon-1.0-12b, h2o-lightning-31b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo | startlux-decision-v1.1-27b-instant |
| open/extra_capability/rank_field | 2 of 196 | chon-1.0-12b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo, startlux-decision-v1.1-27b-instant | chon-1.0-12b, h2o-lightning-31b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo | startlux-decision-v1.1-27b-instant |
| open/extra_capability/cost_7x_latency_none | 2 of 184 | chon-1.0-12b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo, startlux-decision-v1.1-27b-instant | chon-1.0-12b, h2o-lightning-31b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo | startlux-decision-v1.1-27b-instant |
| open/extra_capability/cost_10x_latency_none | 2 of 192 | chon-1.0-12b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo, startlux-decision-v1.1-27b-instant | chon-1.0-12b, h2o-lightning-31b, vllm-sr-d3, pplx-decider-v1-1-27b, vllm-sr-d3-turbo | startlux-decision-v1.1-27b-instant |
| release/B | 4 of 65 | kettei-fat, drex-max, liquid-d1-ultra, subq-snap-preview, nimble-v4-max | kettei-fat, drex-max, liquid-d1-ultra, h2o-lightning-31b, subq-snap-preview | nimble-v4-max |
| release/capability | 3 of 65 | kettei-fat, chon-1.0-12b, drex-max, vllm-sr-d3, vllm-sr-d3-turbo | kettei-fat, chon-1.0-12b, h2o-lightning-31b, drex-max, vllm-sr-d3 | vllm-sr-d3-turbo |

No API-board list changes (self-hosted row). Composite A/C top fives are unchanged on the combined and release boards (rank 9 / 8).

**Publication authority:** a top-five change by a paid public fast-lane order is covered by the automatic paid publication exception (skill `jevbench-fast-lane`: "Paid runs publish automatically ... a fast-lane release that changes the public top-5 needs no separate preview/GO"). Recorded in the proof: `publication_approval.top_five_effect = changes`, `top_five_changed_by = [h2o-lightning-31b]`, `top_five_authority = "paid fast-lane publication exception; ..."`, `top_five_preview = null`, `button_tap = false`, `paid_fast_lane.orders = 5fa1a5f0`, and a public measurement note. **No Telegram preview card exists or is claimed and no PLACEHOLDER is present**; the v1.6.38 card-approval fields (needed there only because of a deputy pricing ruling) are not used. The release validator (`lib/jevbench-v1639-release.mjs`) accepts either "none" or "changes + paid exception" and rejects any claimed card/button. Review stays PENDING (`review: {engine: PENDING, verdict: PENDING}`); the real tree is rejected by the loader until the lead flips it.

## What changed in the site tree

New: `data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.39-{results,categories,proof,history,history-carry,publication}.json`, `lib/jevbench-v1639-release.mjs`, `app/api/jevbench/v1.6.39/route.ts`, `app/jev-models/v1.6.39/page.tsx`, `test/jevbench-v1639-release.test.mjs` (17 cases), `test/fixtures/jevbench-v1639-ranks.json`. Edited (wiring as v1.6.38): release list/nav/history availability/category revision lists/cohort reader/draw-equating, architecture and base-model provenance for the new key, shared cohort topic supplement re-bound to v1.6.39 (new row's cells added, 75 carried rows' cells asserted unchanged). Tests whose expectations legitimately move because the row enters the OPEN board at #2: `cr-303-feed-split` (open ranks below +1; combined rank +1), `jevbench-v1630-open-fold` (Jev 1.13.0 now sits behind the fold without its pin; the pin assertions are unchanged), plus the latest-release label bumps (merged-board, v1635-v1637 release tests, fresh-source list, page structure).

**One lib change outside the new release:** `lib/jevbench-v1638-release.mjs` bound the shared topic supplement to v1.6.38's results hash; once the supplement is re-bound to v1.6.39 that predecessor reader would fail closed and take v1.6.39 down with it. It now also accepts a supplement bound to the stacked successor v1.6.39 (strict check kept while v1.6.38 is newest). Applied by `wire_v1639.py`, idempotent.

## Gates (disposable PASS copy with a synthetic PASS manifest; real tree PENDING)

| Gate | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| new release test `test/jevbench-v1639-release.test.mjs` | 17/17 |
| targeted suites (v1629-v1639 release tests, merged board, cohort supersession, SEO, system pages, feed, architecture, categories, fresh-source, page structure, cr-292/303/257) | 226/226, 0 fail |
| `npm run build` | exit 0, 542 pages (v1.6.38: 538) |
| full `node --test test/` at concurrency 3 (box loaded) | 3,580 tests, 3,579 passed, 1 skipped, 0 failed, 629 s |
| full end-to-end rerun `rebuild_v1639.sh` (prepare, frozen scorer, finalize, fixture, tests, pass copy, repro) | release, categories, proof, publication, history, topic supplement, validator and ranks fixture byte-identical to the gated build (`receipts/REBUILD-before/after.sha256`) |

The first gate attempt stopped after the targeted step on 2 expected failures (open-board rank expectations in `cr-303-feed-split` and the open-fold pin test, both consequences of the row entering the open board at #2); the expectations were updated in `update_tests_v1639.py` and the gates rerun from scratch (logs of the passing run are the retained ones).

## Reproduction, loaders, authority

- `python3 -B verify_v1639.py --repro`: PASS deterministic rebuild (release, topic supplement and validator bytes identical), PASS 76 rows / 75 carried byte-identical except placement.
- `loader_gates_v1639.mjs`: synthetic PASS loads (76 rows), REAL PENDING rejected ("independent release review").
- `run-authority-gates.sh`: flip/freeze dry runs pass (predecessor v1.6.38 PASS and sealed, v1.6.38 seal bound), synthetic PASS flip, REVISE flip and `freeze --write` refused, manifest unchanged, no seal written.
- `localcheck_v1639.py` on a local `next start` of the PASS copy: API bytes/hash, latest feed has one h2o-lightning-31b row, all six pages (open, api, all, release, system page, archive v1.6.38) 200 with no page errors, preview with 3 radars; screenshots in `shots/single/`.
- Frozen releases untouched; `final_sanity_v1639.py origin/main` PASS (see below).
- `.git/config` of /opt/model-market-comparison: before `8a8e6fbbc39b91288bb0a59cdef298fc540580afb04e07647ba6097b0f7804f6` (start of this slice), after `0646fc298c675f831aba9542892250890b5fff227aaf2af73f6d0dad6a6de1c7`. It changed: creating the worktree with `git worktree add -b ... origin/main` writes a `[branch "fusion/...r164-v1639-build"]` tracking stanza, and other jobs also write it. No `git config`/push command was run by this slice.

## v1.7 inputs

`r164/v1639/v17-input/ENTRY-H2O31B.json` (registry entry + raw sha + receipts dir) and `BASIS-H2O31B.json` (price basis, common-basis numbers, latency facts). Key facts for v1.7: the 15 decisions over 10 s are EXACTLY the 15 common-basis-excluded longest items (34.89-39.08 s; every other decision <= 0.26 s), so a 10-second rule hits precisely those 15; base spelling must be `google/gemma-4-31B-it`.

## Open issues / doubts

1. Over-cap premise in the handoff is wrong under the common cost basis (see above); the row is ranked and inside the cap.
2. The author's `row-completion.json` / `node-shred.json` read `complete: false, cleanup_verified: false` (pod-side shred timed out); the handoff states VM and volume absent. The public text says shred timed out and VM/volume verified absent; the lead should confirm that wording against the delivery owner's teardown receipt before publication.
3. Scores differ in tie-order rank from the field run (A 7 vs release 8) by design, as in v1.6.38.
4. No full-suite flakes were investigated beyond what the gates report; box was loaded (concurrency 3).
5. Raw never leaves the custody store; `batch/` (ignored) holds symlinks and the scorer aggregates.
