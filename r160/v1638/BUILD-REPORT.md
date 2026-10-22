# JevBench v1.6.38: pricing admission blocked

No release candidate was built. The assigned frozen pricing gates supply no rankable price for either new row. No axes, composites, capability, official cost, or ranks are claimed. One local evidence commit only; no push, PR, publication, author contact, or board post.

## Verified inputs

Fetched origin/main: `50c8b2c4f41f58cb9781f205ca678f58998e58c1`, identical to the assigned branch base (v1.6.37 plus announcement). The handoff's job-relative raw paths do not exist. The RUN-RECEIPT files point to the sealed draw's `runs/api-full/` directory; those paths were used read-only for pricing inputs. No item text or individual predictions were printed or copied into this tree.

| Row | Raw SHA256 | Rows / HTTP status | Tokens input / output |
|---|---|---|---|
| drex-max | c0de81123e846e3a583aef52534e15f6ca9ba1b9c515209dbed002d8e7277fe1 | 1500 / 1498 x 200, 2 x 529 | 1942633 / 264615 |
| launchables-myles-g-12b | 3f0929728f39bd41cfff6c404d6ed8793e8202f393b68264d3b1fc449d6a54ab | 1500 / 1500 x 200 | 989607 / 1500 |

Pricing SHA verified: `1f4d1f7b1ce97ab27b938043444b9c2757e4a9dbecc799a803122588401f5bf1`. Scorer SHA verified: `02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9`. Neither changed; no scorer invocation occurred. This remains a v1.6-method task: the 10-second rule was NOT applied; both handoff run receipts report zero decisions over 10 seconds.

## Exact frozen pricing evidence

The order notes (read through a SELECT, printing only base-model mentions) identify Myles-G 12B as Google's Gemma 4 12B plus a merged LoRA. The canonical base spelling is the existing registry spelling `google/gemma-4-12B-it`. Drex has no declared public base, as in the carry precedent.

```
reference('drex-max', {'base_model': None, 'source': 'api',
  'price_in_per_m': 0.06, 'price_out_per_m': 0.0}, catalog_rates()) -> None
reference('launchables-myles-g-12b', {'base_model': 'google/gemma-4-12B-it',
  'source': 'api', 'price_in_per_m': 0.00200202,
  'price_out_per_m': 0.0}, catalog_rates()) -> None
```

Neither call raises. Gemma 4 12B is explicitly UNLISTED in the frozen module; it is not in BASE_REFERENCES or DEEPINFRA_BASE_REFERENCES. Both exact row keys are absent from AGE_QUALIFIED_API and LAUNCH_LIST_PRICE_API. Running the frozen `resolve(key, entry, raw_rows, catalog)` returns, for BOTH:

```
counting_list_price: false
market_reference: null
rankable: false
usd_per_1000: null
note: no eligible 30-day list price or base-model estimate
```

The GBP 0.0015/M rate was supplied ONLY to test eligibility, converted using the v1.6.36 receipt's ECB factor 1.33468. The gate rejects it; it is not an official cost. The receipt preserves the exact full calls and outputs. No rate was invented or installed.

## Precedent conflict that needs lead resolution

- The live tree has `drex_v1_5` in `data/jevbench-carry-additions.json`, a dated, never-ranked v1.5 carry row priced at USD 0.05/M input, no base floor. It does not establish frozen-module eligibility for the new key `drex-max`. No `drex-v2.0` row was found in the current site's JevBench results. The historical private registry spelling `drex-v1.5` exists in `r52/score/control/REGISTRY.json`; it likewise carries a public tariff, not a `reference()` result.
- The v1.6.36 Myles-G 31B registry entry resolves its exact base `google/gemma-4-31B-it` to `google/gemma-4-31b-it` at USD 0.09/0.34 per M. That reference does not cover the 12B base.
- Existing `arcbright-elf-1-12b` in the v1.6.36 registry uses a separately disclosed nearest-listed-sibling estimate `google/gemma-3-12b-it`, USD 0.05/0.15 per M, while explicitly recording the true Gemma 4 12B base as UNLISTED. That is not the 31B exact-base recipe or a return value of the requested frozen `reference()` call. I did not silently substitute it.
- DECISIONS.md 21 Oct 09:5xZ / board #22800 calls for adding Myles-G 31B to LAUNCH_LIST_PRICE_API through the independent re-freeze path, while the assigned frozen file and v1.6.36 template still use the base estimate. This requires reconciliation by the lead; this slice is expressly read-only on pricing.

Conservative interpretation: stop before making a release which would claim eligible prices the specified frozen module does not supply. Lead can provide a precise approved sibling/launch-price treatment, or a revised brief for listed-but-unpriced rows. No separate Florian top-five approval is required for these paid rows under the fast-lane skill; that exception does not create a price reference.

## Checks and remaining work

`python3 r160/v1638/pricing_preflight_v1638.py` exits 2 intentionally after both raw hashes, row counts, uniqueness counts, status counts, usage totals, frozen module/scorer hashes, and unpriced gate outcomes pass assertions. Console output: both `raw SHA PASS`, `reference() -> None`, `rankable=False`, then `BLOCKED`.

Not run: scoring/byte reproduction, release construction, 40-list top-five diff, preview, tsc, new release test, targeted/full suites, build, PASS-copy loaders, authority dry-runs, repro, final release sanity. These are not claimed to pass. Current published manifests are untouched; no v1.6.38 manifest, approval, or seal exists. The only new files are this report, the reproducible pricing preflight, and aggregate receipts.

Shared git config SHA: see receipts/GIT-CONFIG.json. First captured after fetch/preflight (not before-session), identical afterward; no git config command was used. No large data or temporary batch copies were created; deletions: none.


---

# Build2 — three paid fast-lane rows (21 Oct 2026)

This section supersedes the first attempt's pricing stop under the lead's explicit revised decisions. The first attempt above remains unchanged. Local candidate only: independent review PENDING; no push, PR, merge, deployment, seal write, author contact or external message.

## Priced Drex variant A

|Row|I|Calibration|Speed|Cost axis|Capability|A / B / C|Rank A / B / C / Capability|USD / 1k|× cost cap|
|---|---:|---:|---:|---:|---:|---|---|---:|---:|
|drex-max|78.890215|89.567950|89.806510|55.336763|84.229083|75.405156 / 76.077315 / 75.405156|4 / 2 / 4 / 3|0.030815878788|0.477065|
|iota-decide-4b|29.414053|84.834626|87.467014|62.970342|57.124340|18.937474 / 16.157256 / 13.151024|45 / 46 / 45 / 47|0.017152282828|0.265537|
|launchables-myles-g-12b|57.254091|84.048729|85.649326|57.357383|70.651410|68.406562 / 65.841520 / 62.288563|15 / 20 / 19 / 25|0.026388855219|0.408530|

75 release rows, 64 ranked (variant A). The full frozen-scorer field has 72 same-draw rows (69 carried + 3 new); H2O-Lightning-4B and Kahn1 remain the v1.6.37 restatements of their original-draw v1.6.1 rows, and A2 remains unranked. Every one of the 72 predecessor public rows is byte-identical after removing only rank/ranks. In particular, published intervals, diagnostics, costs, disclosures and categories stay unchanged. The field run verifies every carried same-draw point estimate exactly. New intervals use the full-field sorted-roster seeds (B=1000, seed 16).

## Pricing and provenance

- Unmodified scorer SHA 02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9, O1S, fixed G_med 9.839526770355711, unchanged cost-basis-v1630 SHA 2125e620c75a89c4ab2ae48f6f51c3c545a617d9ec78a57084ea069cfa44b28d. No 10-second rule in this v1.6-method release. Each new raw has exactly 0 decisions >10 seconds (all raw latency fields checked).
- Frozen pricing module remains 1f4d1f7b1ce97ab27b938043444b9c2757e4a9dbecc799a803122588401f5bf1, read-only. Exact calls/results and effective registry prices are in PRICING-DECISIONS.json. API `reference()` calls return None; the lead explicitly authorises the sibling estimate for Myles and the Drex I-1 list treatment. Drex text is written as if that launch list line exists, per brief; the lead owns the separate reviewed re-freeze/re-pin. No claim that the currently installed module already admits Drex.
- Drex: public USD 0.06/M input, output 0; saved pricing-page sha prefix 95d1c429, fetched 21 Oct 20:18Z. 1,498 HTTP 200 + 2 HTTP 529 overloaded failures, retained. Public items used for checkpoint selection. Common usage 762,693 input / 262,045 output (output is free).
- Myles: true declared base google/gemma-4-12B-it remains explicitly UNLISTED. Same-base precedents arcbright-elf-1-12b, chon-1.0-12b and metask_jev_rain_12b_trained justify nearest-listed Gemma 3 12B sibling ESTIMATE USD 0.05/0.15/M. GBP 0.0015/M input list price is information only and not counted. 1,500 HTTP 200; common usage 779,294 / 1,485. Same-author second exposure after Myles-G 31B; public set treated as seen.
- RAW DISCREPANCY: Myles' 15 longest-item provider usage is 12,511–15,221 input tokens, not the brief's 15,108–15,221; other items max 1,829. The checked raw range is disclosed, not the inaccurate brief range. All 15 are answered/scored as answered under #22794. Aggregate correctness split is computed with the frozen scorer and disclosed.
- Iota: raw SHA 2850e17ddcc3c2ef3a44592b6b377581562ad453ae1561e9d641184ff7ffd1c0, 1,500 HTTP 200, usage 1,094,798 input / 0 output; common input 849,038. Model macrocosm-os/iota-decide-4b @ bd88855a7e3379468537e0142d5f0ada079aca41, renamed repo, first-party /v1/systemone bridge, Verda A100 80 GB, network none. endpoint_kind=gpu, lane=selfhosted, standard x2 + 0.15 s assumption, exactly as seb-9b / v1.6.36 self-hosted rows. 15 states truncated by the model to 16,384 tokens; answered per #22794. Training/license/bridge disclosures retained from handoff.
- Iota provisional I/C/S reproduce EXACTLY. Provisional Cost 59.79 / A 18.721070 used all 1,500 items (USD 0.02189596/1k); official common basis excludes the 15 longest (USD 0.017152282828/1k), so Cost becomes 62.970342 / A 18.937474. Difference is cost basis, not field fitting. Receipt IOTA-SINGLE-VS-FIELD.json.

## 40-list top-five effect and paid authority

Board effect: the three paid fast-lane rows were compared on the merged-board top fives before/after v1.6.38 over all 36 mixed, open-weights and API variants (including 7x/10x cost caps with no latency cap) plus 4 release-board lists: 22 of 40 top-five lists change. Top-five changes caused by: drex-max (paid fast-lane publication exception). 

- all/composites/A
- all/composites/B
- all/composites/C
- all/capability/official_caps
- all/capability/cost_off_latency_2x
- all/capability/latency_none
- all/extra_capability/cost_7x
- all/extra_capability/cost_10x
- api/composites/A
- api/composites/B
- api/composites/C
- api/capability/official_caps
- api/capability/cost_off_latency_2x
- api/capability/latency_none
- api/extra_capability/cost_7x
- api/extra_capability/cost_10x
- api/extra_capability/cost_7x_latency_none
- api/extra_capability/cost_10x_latency_none
- release/A
- release/B
- release/C
- release/capability

Only Drex causes these changes. The `jevbench-fast-lane` skill explicitly says paid runs publish automatically, including top-five changes; all three orders are paid public. No new Florian GO, card or button is invented. The late deputy A pricing decision is noted; its generic normal top-five language does not replace the explicit paid exception in the brief/skill. The real manifest stays independent-review PENDING. Interactive full rankings, 40 before/after lists and axis/use-case comparison radars are in preview/preview-full-ranking.html.

## Rebuild and verification

`bash r160/v1638/rebuild_v1638.sh` builds A; append `--drex-unpriced` for B. Both use the unmodified frozen scorer. Sealed raws remain at their receipt locations, referenced by private ignored symlinks under batch/runs; no sealed input or per-item output is committed. `batch`, `pass`, and Python caches are ignored.

Final per-variant gate results and outstanding lead handoff are appended after the runs below.

## Variant B and cross-run reproduction

The `--drex-unpriced` full frozen-scorer run leaves Drex listed with Intelligence 78.890215, Calibration 89.567950, Speed 89.806510, Capability 84.229083, but Cost axis/USD/composites/ranks all null and `ranked=false`; no board order includes it. Variant B has 75 rows, 63 ranked, and **0/40 top-five changes**. Myles-G 12B ranks A/B/C/Capability = 14/19/18/24; Iota = 44/45/44/46. Every one of the other **71 scorer rows reproduces byte-for-byte except placement between the independent A and B full runs**, including bootstrap intervals and diagnostics. Receipt FIELD-A-VS-B.json. Both runs use the exact same 72-key roster, B=1000, seed 16 and held median.

Variant B loader accepts only the disposable synthetic PASS; the real PENDING loader rejects. Flip/freeze dry runs pass; real synthetic flip, REVISE receipt and seal writes are refused; no manifest or seal is changed. Deterministic rebuild reproduces every release file, topic supplement and validator byte. These checks are recorded in LOADERS-B, AUTHORITY-B and REPRO-SANITY-B. Broader gate summaries follow after completion.

Additional price evidence: all three named same-base precedents were independently checked at 0.05/0.15/M (MYLES-SAME-BASE-PRECEDENTS.json). The true-base `reference()` returns None, as above. An extra exploratory `reference()` call on the *sibling spelling* google/gemma-3-12b-it raises “base model lacks an explicit market-listing decision”; it is not a declared-base call or an accepted module reference. The effective rate is the lead's explicit published-precedent decision, not a claim that frozen `reference()` supplies it. No rate or price module was changed.

The first attempt's Git config receipt is retained verbatim as receipts/GIT-CONFIG-FIRST-ATTEMPT.json; receipts/GIT-CONFIG.json records build2's fresh before/after check. The first report section and its pricing preflight receipt/script are retained.

## Visual finding fixed for variant B

The first B render exposed a shared caption defect: the unranked Drex model page said “API offering, ranked on the API leaderboard” while its cards correctly had no Cost/Composite/rank. The model route now conditions that caption on the actual ranked flag; the shared SEO formatter and comparison status do the same (positive ranked-API wording unchanged), with English/German regression assertions. This is necessary to make the unpriced flag truthful in the user flow. The superseded B full-test run was stopped by exact owned PID; its log is retained. Final B production build/render/full tests run after the fix. No score, axis, rank or category cell changes.

The interactive preview contains measured axes, the release-bound capability-topic radar, and TypeSafe use-case radar; unavailable cells are omitted. All merged-ranking rivals can be selected for axis comparisons; cross-draw category omissions are stated rather than inventing cells.

## Archive radar wiring

Visual/source review found the inherited archive page passed only its basic category artifact, so its topic radar would be omitted. The v1.6.38 reader now builds a separate comparison view through the same measured-cell helpers used on the live board. It keeps H2O/Kahn1's original-draw cells, overlays the 72 same-draw rows from their stored category/topic artifacts, and retains the overlay helper's per-row sample bounds. The raw category artifact and all carried cells stay byte-identical. The comparison view has a deterministic SHA; its source topic supplement is bound to this release's exact results hash. A regression validates both dimensions for every ranked row and runs the actual category-view validator. Final focused suite: 16/16 passed (12 release tests + 4 SEO caption tests). Final browser check asserts both radar headings and the unranked API caption.

The new API row conditions say “from Sandy” without the predecessor template's country parenthesis: these run receipts do not establish that country, so the unverified copied location is omitted. This is metadata only; price, usage, latency and every score are unchanged.

## Final variant B gates

After the caption/radar fixes and location copyedit: production build PASS (538 pages); 16/16 focused release+SEO tests; 208/208 targeted tests; full Node suite **3,552 tests, 3,551 passed, 1 skipped, 0 failed** (714,951 ms). Loader, PENDING rejection, authority/refusal dry runs, deterministic rebuild and browser/API checks PASS. The final browser checks verify exact API bytes/hash, one row per new key in the latest feed, all eight page routes, both archive radars, correct unranked Drex text and three preview radars. GATES-B-FINAL.json and the individual B logs retain the evidence. Older superseded runs remain as labelled history.

## Shared Git configuration audit

Fresh build2 before SHA was `80cc458cff0d3e92161d0ea7b1a07be6c8ad2fa3e6eab32efe7afa1e96a43eaf`; after was `2f84144d6008cdb08bce3174817db29f4eb44d2cca235317278e8f03a205d78f` (shared config mtime 22:13:06Z). It changed during the run. This worker ran no `git config` or `push` command and inherited neither GIT_DIR nor GIT_COMMON_DIR. The two disposable test repos have their own .git/config files. No shared configuration was restored or overwritten. The change is recorded honestly in GIT-CONFIG.json; its origin is not established by this slice.

The first-attempt worktree disappeared during the job; its report prefix was re-verified against Git blob c2de682f, and its receipts/script remain retained here. No current recipe depends on that old worktree.


## Final variant A gates and local handoff

Default priced A is restored and final: production build PASS (538 pages), TypeScript PASS, 12/12 release tests, 208/208 targeted tests; full Node suite **3,552 tests, 3,551 passed, 1 skipped, 0 failed** (414,760 ms). API bytes/hash, latest feed, eight routes, both archive radars and three preview radars pass; screenshots visually checked. Loader accepts the synthetic PASS and rejects real PENDING. Authority/refusal and byte-for-byte deterministic rebuild/sanity pass. GATES-A-FINAL.json and individual A-final logs retain outputs.

Final default result SHA: 4f1b23f84061ca1e5b8942985f2200a8ad1514617c2a59e43e4ca874fde18d5a. Both complete frozen-scorer variants and their receipts are retained; the one-flag rebuild remains available. Separate lead I-1 re-freeze/install/re-pin and independent release review remain pending. No real seal was written.

Cleanup: stopped only the owned localhost server and removed the two job-local disposable test repos r160/v1638/pass and pass-A (about 7.4 GB combined), plus generated Python bytecode. Retained final artifacts, scorer aggregates, receipts, hashes, logs, screenshots and previews. No shared cache, sealed raw or other job data was deleted. This slice makes one local commit only; no push, PR, merge, deployment, credentials change or external message.


## Rebuild on the re-frozen pricing module (r160-v1638-rebuild, 22 Oct 2026)

Base unchanged (50c8b2c4); this is one commit on top of df955334. Variant A (Drex Max priced) is the worktree state; variant C (no Drex row) was built in a separate scratch checkout and its summary receipts are kept here as `receipts/C-*`. Variant B (Drex unpriced) is dropped: its receipts and previews are removed; `prepare_v1638.py --drex-unpriced` still exists but is neither rebuilt nor verified. Receipts without a variant letter are from this rebuild; logs named `*-A-final*`, `*-A-initial*`, `GATES-A-*`, `FINALIZE-A`, `PREPARE-A`, `SCORE-A` belong to the first build (df955334, old module pin 1f4d1f7b) and are kept only as history.

**Pricing module.** Live `harness/pricing_v15.py` sha256 `a8a05890ddab2d39d1a1bd543f2b5c83842bdc70aa54766788bc89b7a8a448d7` (one additive key, `drex-max`, in `LAUNCH_LIST_PRICE_API`). `pricing_preflight_v1638.py` now exits 0: `drex-max` resolves `counting_list_price: true`, rankable, 0.06/0.0 per 1M, USD 0.030815878788 per 1,000 on the common 1,485-item basis (762,693 input / 262,045 output tokens); Myles-G 12B resolves as before (declared base unlisted, unrankable under the module itself, the build uses the published same-base sibling estimate 0.05/0.15); iota uses the frozen Qwen3.5-4B reference 0.03/0.15.

**Drex tariff page.** `curl -L https://drex.nace.ai/docs/drex/reference/pricing` fetched 2026-10-22T01:12:18Z, HTTP 200 via redirect to console.nace.ai, sha256 `95d1c42912eebc4c6dcf24c830b92ad21fc0c7beef49e42675db8d235b92cbf0` (identical to the 21 Oct copy).

**Re-pinned to a8a05890:** `score_v1638.sh`, `pricing_preflight_v1638.py`, `prepare_v1638.py`, `verify_v1638.py`, `lib-v1638.template.mjs` (and the generated `lib/jevbench-v1638-release.mjs`, which now also checks `proof.pricing_module_sha256` against it); proof `pricing_module_sha256` = a8a05890 (the v1.6.37 value 1f4d1f7b is kept as `predecessor_pricing_module_sha256`); Myles and iota cost-basis text cite a8a05890; Drex cost-basis text now says it is counted as an operator launch list price by the module and records both tariff fetches. `build_publication_v1638.py` asserts the live module sha. Left on 1f4d1f7b on purpose: older rows' own text, `receipts/IOTA-SINGLE-VS-FIELD.json` (a record of the author's earlier single-row run) and the first-build `report_build2.py`.

**Public text trimmed.** No board/issue numbers, "deputy", "CoS", review sha, "I-1" or job names remain in the three rows' public text, their measurement notes or the proof rows. Truncations read "scored as answered, as for earlier provider-truncated rows". Proof custody/handoff fields are plain words. A prepare-time assertion fails on `#NNNN|deputy|CoS|review sha` in any of the three entries. Older rows' text is untouched.

**Scorer output.** All 72 scored rows reproduce the previous scorer output; only the three new rows' cost text changed (scores, capability, intervals identical). Full chain re-run end to end with `rebuild_v1638.sh` (last step = second pass, `verify_v1638.py --repro`): release/lib/topic bytes identical before and after (`receipts/REBUILD-A-FULL-RERUN.log`).

| Row | A / B / C | Capability | Ranks A / B / C / Cap | USD per 1,000 |
|---|---|---:|---|---:|
| Drex Max | 75.405156 / 76.077315 / 75.405156 | 84.229083 | 4 / 2 / 4 / 3 | 0.030815878788 |
| Myles-G 12B | 68.406562 / 65.841520 / 62.288563 | 70.651410 | 15 / 20 / 19 / 25 | 0.026388855219 |
| iota-decide-4b | 18.937474 / 16.157256 / 13.151024 | 57.124340 | 45 / 46 / 45 / 47 | 0.017152282828 |

**Variant A.** 75 listed / 64 ranked; 22 of 40 top-five lists change, all through Drex Max (full list in `receipts/TOPFIVE-V1638.md`, `receipts/topfive-diff.json`). Result sha256 `f708b267ea22e6af3ddb4fcb9bd292720f2f0c639d9ea6ca11f436f34c661c33`. Gates on the disposable PASS copy: tsc 0; release 12/12; targeted 208/208; production build 538 pages; full Node suite 3,569 tests, 3,568 passed, 1 skipped, 0 failed (453 s, second run; the first run had 1 failure, `worker-catalog-retry.test.mjs`, a timing flake under load that passes alone and on rerun; its log is kept as `fulltest-A-run1-1flake.log`); loader gate PASS with real PENDING rejected; authority gates PASS (flip/freeze dry runs, synthetic PASS/REVISE flip and seal writes refused, manifest unchanged, no seal); `verify_v1638.py --repro` PASS; `localcheck_v1638.py` PASS (API bytes/hash, latest feed, eight routes, radars, no page errors). The full-suite test count differs from the first build's 3,552; the cause was not investigated.

**Variant C** (`--without-drex`, scratch checkout `workers/r160-v1638-rebuild/variantC/wt`, base 50c8b2c4 plus these scripts): 74 listed / 63 ranked; Myles-G 12B ranks 14 / 19 / 18 / 24 and iota-decide-4b 44 / 45 / 44 / 46 (A / B / C / Capability); **0 of 40 top-five lists change**. Result sha256 `ca5c044baff96eb9bdc12cf39420b54ac99c767776adc64216f1a0cff67e9dc5` (all file hashes in `receipts/C-ARTIFACT-SHA256.txt`). Gates: tsc 0; release 12/12; targeted 208/208; production build 537 pages; loader PASS (PENDING rejected); authority gates PASS; `--repro` PASS. No full suite and no browser check for C (not requested). C has no Drex page, architecture row or release-page text.

**GO-card material (A)** in `preview/`: `card-v1638.png` (sha256 `23cf47ae5dec385f1403bee90909e682faad6fdd8567c225c9d6915b16afb28e`; one image: 22 changed lists grouped into 11 rows with Drex Max's position, before and after top fives, the three new rows' A/B/C/Capability/cost, and the 0/40 fallback line), `CARD-DETAILS.md` (tables of at most 8 rows; sha256 `703ed1cb40d82f8642f641413aed8fd49c431bd0c6d1450b979fca07c3d0c2a1`), `preview-full-ranking.html` (interactive: all 40 lists, full rankings, head-to-head axis, topic and use-case radars), `TOPFIVE-PREVIEW.md`. Generated by `card_v1638.py` from the built artifacts. Manifest review stays PENDING; approval fields PLACEHOLDER/PENDING.

**Shared git config.** `/opt/model-market-comparison/.git/config` sha256 `db6a412e0f932c980a0215003a0f336b9b8ae1cb1a9c9c6fc7a2916eac9a14d8` at start and at the end of this job (no change during the run; it differs from the `2f84144d…` recorded by the first build, i.e. it changed between jobs). No git config or push command was run.

**Cleanup.** Removed the disposable PASS copies (`r160/v1638/pass` in the worktree and in the scratch checkout), bytecode and `/tmp` scratch; kept receipts, previews, hashes and logs. The scratch checkout `workers/r160-v1638-rebuild/variantC/wt` (about 2.4 GB) is kept for the lead's C fallback; remove it after the decision.
