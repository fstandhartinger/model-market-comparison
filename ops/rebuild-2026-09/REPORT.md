# Benchmark Heaven rebuild report

## Phase 01 — foundations (2026-09-10)

Owner: Codex GPT-6 Astra on Sandy, `flori`, ChatGPT subscription authentication verified. Budget advice favored Codex (Claude usage 90%); bulk document drafts and tooling/test tasks were delegated through the project worker wrapper; only reviewed, complete artifacts were accepted.

### Inherited state and data repair

- Reconciled with `origin/main` after `git fetch`: both were `02519e5`; no merge/rebase or force push needed. Preserved the inherited patch under `/tmp/bh-phase01/inherited.patch` before editing.
- Baseline: **68/78 tests passed, 10 failed**. No existing test pins or Composite calculations were changed to get green.
- `data/raw/openrouter.json`: kept the legitimate September 10 refresh (431 → 435 catalog rows). A later live catalog already contained two additional IDs; the committed source is a dated snapshot, not an assertion that the catalog stopped changing.
- `data/raw/designarena.json`: kept the legitimate September 10 refresh. Live board ID checks matched all 41 frontend and 43 fullstack rows.
- `data/raw/artificialanalysis.json`: re-fetched 644 API models with repaired Flight/slug parsing. Ten evaluation rows differed from the previous committed snapshot. The source had removed license/HF/OpenRouter metadata fields; preserve prior source values only for the same UUID and slug, with original dates per field. Retained fields: 359 license names, 357 license URLs, 357 HF URLs, 337 OpenRouter IDs. Explicit current nulls clear previous values.
- `data/raw/aa-coding-agents.json`: rejected the inherited 13-row overwrite of the 68-row snapshot. Restored all 68 previous rows exactly, preserved collection date **2026-09-09**, and labelled the version **1.4** and retained status.
- `lib/aa-metadata.mjs` / `scripts/fetch-live.mjs`: retained the legitimate slug-join idea, replaced first-key-dependent extraction and metadata loss with reusable Flight JSON parsing and dated per-field retention. No source JavaScript is evaluated.
- `data/dataset.json`: rebuilt from accepted raw sources. Catalog: **835 models, 650 families, 89 providers, 2,786 offers**, versus 2,784 offers in the prior committed snapshot. Stable model coverage was restored instead of accepting the broken intermediate catalog.

### The Coding Agent finding and daily repair

The 13 rows were not merely a failed extraction. [AA's current methodology](https://artificialanalysis.ai/methodology/coding-agents-benchmarking) documents **v1.5**, with DeepSWE v1.1, Terminal-Bench 4.0 and SWE-Atlas-QnA. It is a different benchmark from the retained v1.4 source. The [full current board](https://artificialanalysis.ai/agents/coding-agents) supplies 13 complete `benchmarkRows`, including Flight references. The previous homepage recipe silently treated these as the same index.

`node scripts/fetch-aa-coding-agents.mjs` now fetches the full board into `data/raw/aa-coding-agents-v1.5.json`. It checks the version, full-array identity, minimum/prior counts, unique source IDs, model/harness names, component set, completeness, score range and equal-weight arithmetic. It validates before atomic replacement. Network/parse/partial/version failures preserve the prior file and exit nonzero.

Manual live run succeeded with **13 complete v1.5 rows**. An independent Python extraction from the homepage matched all 13 exact identities, harnesses and scores against the dedicated-board collector. Versioned v1.5 data is staged for phases 04–06; it does not enter the current Composite. `/about`, API source dates and `source_status` explain the retained source. Do not label v1.4 as freshly collected.

The daily wrapper/prompt now live in `ops/daily/` and are installed identically under `/opt/mmc-daily/`. The prompt calls the tested collector, checks current v1.5 freshness separately from retained v1.4, and requires build/tests/typecheck before pushing. The runner removes API-key overrides, checks ChatGPT auth, and delegates a root invocation to `flori`. No cron interval changed. The full redesigned gauntlet daily run remains phase 08; the collector itself was actually run in this phase.

### Delegation and method

- DeepSeek V4 Flash 0731 supplied first drafts of `COVERAGE.md` and `GAUNTLET.md`; owner corrected the I/O priority, removed an invented runner from the method draft, and made the templates specific to real data/code/UI checks.
- Actual `deepseek/deepseek-v4.1-flash` and `nex-agi/nex-n2.5-pro:free` both returned the expected JSON in known-answer smoke tests: `{ "sum": 42, "missing": null, "versions_equal": false }`. Transport success does not imply AA qualification.
- Opencode was already installed at `/home/flori/.opencode/bin/opencode`; Kimi K3 was confirmed in the Chutes live catalog. An initial audit was stopped by opencode's external-directory permission gate. No permission was weakened; the subsequent tooling task was scoped to repository files. That long task ended naturally with exit 0 but no final artifact or implementation. It was not accepted and no manual stop was performed. Astra implemented the wrapper repairs. The bounded end-to-end Kimi run then read the requested repository file and returned correct JSON in about 19 seconds; the opencode export confirmed the actual Chutes/Kimi model. Installed opencode version: 1.18.18.
- `GAUNTLET.md` cites the original method and research, distinguishes the project's three-round cap from the original open-ended approach, requires different producer/critic families and actual source evidence, and includes defensive prompts for rows, code and rendered UI. Text-only completion cannot certify screenshots.
- `COVERAGE.md` maps all original wishes and the binding xplainervideo follow-up. Phase instructions now explicitly preserve OpenRouter → Chutes I/O priority, existing blends, version isolation, provider identity, all-runtime installation on both machines, and actual explainer-video delivery.

### Verification before final review

- Repaired existing suite: **78/78 pass**; new parser/retention regressions bring it to **83/83 pass** before worker tests.
- `npm run build` passed; `npx tsc --noEmit -p .` passed; **9/9 production prerender checks** passed.
- Built `/about` contains both benchmark versions, the actual retained date, and the metadata provenance notice.
- No benchmark score was created by a worker. New Coding Agent values are extracted from the source and independently cross-checked.

### Remaining scope and uncertainty

- v1.4 cannot honestly receive new collection dates after upstream moves to v1.5. The historical snapshot remains the unchanged Composite input; new versioned UI ingestion belongs to phases 04–06.
- Retained AA metadata is explicitly historical. Phase 02 can add efficient re-verification, but must preserve field-level dates rather than relabel old observations.
- Model catalogs/prices and AA scores change; smoke-tested unscored models remain unsuitable for unattended data-bearing jobs until qualification evidence exists.
- No redesign, rebrand, new domain, full daily gauntlet automation, cross-machine skill rollout or final video is claimed delivered in phase 01.

This phase receives DONE only after the final critic round, deterministic gates and the final pushed deployment are verified.

### Critic round 1

Reviewer: `z-ai/glm-5.3-flash`, different from code owner OpenAI and documentation draft producer DeepSeek. [Full review](evidence/phase-01-critic-round1.json). It checked all 13 new rows and all 39 component scores/weights against supplied primary-source extracts, recomputed index arithmetic, checked metadata retention, version separation and coverage/method docs. It reported two minor findings: direct writes in the existing DA/OR collectors, and missing fixtures for several implemented failure guards.

Owner fixes: all four raw-source writers now share `writeJSONAtomic`; added ambiguity, component identity, component weight/range and serialization-failure preservation cases. All seven targeted parser/metadata tests pass. Later packets included the literal Flight version marker, current webhook receipt and the complete current artifact.

### Worker qualification and execution receipts

[All three backend receipts](evidence/phase-01-worker-smokes.json) include returned content, actual model identity, source qualification, input/output hashes and usage where returned. The final wrapper successfully exercised opencode/Kimi K3 on Chutes, `nex-agi/nex-n2.5-pro:free` on OpenRouter, and actual `deepseek/deepseek-v4.1-flash` on OpenRouter. The reported V4.1 smoke charge was **$0.00013662**; the free-model charge was **$0**. Chutes usage/cost is not returned by this wrapper; OpenRouter catalog prices in the Kimi qualification record are reference prices, not Chutes charges.

The picker uses the minimum AA index across all matched reasoning variants, not the best variant. Explicit OpenRouter IDs take priority; a fallback needs an exact family/version slug and matching organization. Unknown scores, unsupported `:batch` variants, absent prices and known scores below 34 cannot become ordinary workers. At verification there were **no qualified free OpenRouter candidates**. DeepSeek V4 Flash 0731 was qualified at **34.5**; Kimi K3's low/max variants yielded a conservative **34.5**. Actual V4.1 and the requested free model were unscored in this snapshot: they can run only the fixed, bounded known-answer transport test until qualification evidence exists. They did not perform data work or reviews.

Critic pinning cannot bypass the different-family rule, including aliases. The default critic excludes every explicit producer family; missing producer identity fails closed. Calls have time/token limits and reject empty, truncated, error or wrong-model responses; opencode must return a final artifact and a matching execution export. Large completion packets are read directly from a file, avoiding shell argument limits. Successful output receives a hash-bound metadata sidecar. Failed calls preserve the previous artifact. Synthetic transport tests cover these failure cases and a >160 KB embedded packet; policy tests cover version/organization identity, weak or missing variants, malformed prices and smoke isolation. Latest suite before round 2: **89/89 pass**.

### Deployment evidence

The repaired core commit `c635ffbf8e1a02cc64acf4924393761a2b258aeb` triggered webhook deployment `dthkqo8rdum9s7rqfz0dmxnl`, which finished successfully. [Live receipt](evidence/phase-01-core-deployment.json): HTTPS 200, the complete `/api/dataset` response equals the committed snapshot after removing only the runtime `_source` field, and live `/about` shows both versions and the true retained date. Counts: 835 models / 650 families / 89 providers / 2,786 offers. The final tooling/docs release is verified below.

### Review transport failure and additional owner checks

Round 2 used `z-ai/glm-5.3-flash` with the complete packet and a 16,384-token bound. It ended with `finish_reason: length`; the wrapper rejected it without writing a review artifact. This is a failed review, never a zero-findings round. Two delegated test-draft requests also failed (truncated response, then the explicit 300-second timeout); no partial test code landed.

While waiting, owner inspection tightened version detection to the current Performance section rather than any historical version mention. A new fixture proves that an old v1.5 string cannot qualify a current v1.6 board. The final live collector succeeded again and produced the identical 13 rows. Added a critic-family regression covering explicit pins and vendor aliases. Clarified that model execution, catalog requests and opencode export have separate bounded timeouts. Round 3 includes these exact changes and the current primary-source section. It uses a different eligible reviewer family after the truncated GLM attempt.

### Critic round 3 — clean

Actual reviewer: **google/gemini-3.7-flash**, conservative AA index **36.9**, from a different family than every producer. [Review](evidence/phase-01-critic-round3.json), [execution receipt](evidence/phase-01-critic-round3.meta.json), [frozen artifact manifest](evidence/phase-01-critic-round3-manifest.json). Verdict: **pass**, **0 findings**, **no missing evidence**; F1 and F2 verified fixed. It checked all 13 rows/components, version isolation, metadata provenance, every raw writer, worker policy/receipts, original-request coverage and primary research. The returned charge was $0.0529602975. Owner checked the JSON contract and output hash and independently verified the reported fixes. No unresolved phase-01 blocker remains.

Accepted residue: upstream Flight structures can change and will require an explicit parser update if the collector rejects them; unscored worker models remain restricted; the full daily gauntlet orchestration is phase 08. These limits are visible and do not silently weaken validation. The failed round-2 completion is recorded above, not counted as a clean review.

### Final release checks

[Final deterministic receipt](evidence/phase-01-final-checks.json): dataset build, **90/90 tests**, TypeScript typecheck, production build, **9/9 prerender checks**, and whitespace validation all passed after the final code changes. The live collector succeeded after the stronger current-section version gate. Installed daily files still match the tracked copies. Release `9571976` contains the reviewed worker tooling, coverage/method/report, evidence and the additional version guard. Its deployment was verified as recorded below.

### Phase 01 released

Committed and pushed `c635ffb` (data/daily repair) and `9571976` (worker tooling, method, coverage, review evidence and final guard). [Final implementation deployment receipt](evidence/phase-01-release-deployment.json): webhook deployment `dmyzkzc21deldsmrtob0jggd` finished; HTTPS root/API return 200; live dataset equals the complete committed snapshot apart from `_source`; live About retains both versions and the original date. `HEAD` and `origin/main` agree. A final documentation-only commit records this receipt; it does not change the tested application or dataset. The phase status is marked DONE only after that closing push/deployment is verified as well.

Phase-01 deliverables are complete. Phases 02–09 remain planned; see [coverage](COVERAGE.md). No Telegram completion announcement or final video is claimed for this foundations phase.

## Phase 02 — token and caching efficiency pipeline (2026-09-10)

Owner: Codex GPT-6 Astra. Bulk AA collection/parser/tests/recipe and OpenRouter payload research were assigned through `worker.sh --agent` to Chutes/Kimi K3. Both workers wrote useful drafts but timed out at their 1,800-second limit without a final response. They are **failed worker completions**, not clean reviews. Exported session metadata verifies the actual model; [worker receipt](evidence/phase-02-workers.json). Owner independently reviewed the drafts, repaired them, and matched their numbers to primary responses before adoption.

### Data and consumer contract

- New raw sources: `aa-efficiency.json`, `openrouter-efficiency.json`, `chutes-efficiency.json`. All three collectors validate before atomic replacement. Source dates, exact identities, explicit gaps and provenance survive into `data/dataset.json`.
- AA: **138 measured efficiency rows**, each with exact UUID/slug/effort, output tokens per task (reasoning/answer/output) and canonical input/output/answer/reasoning counts. **136** attach to the existing 835-model dataset. Two newer UUIDs (DeepSeek V4.1 Flash and Ling-3.0-flash-VL) remain in `efficiency.aa_unmatched`, not attached by approximate name. Three very different model pages expose the identical 138-row set; the homepage/chart only has 23. No 645-page crawl was needed. Denominators are explicit: 644 API catalog rows, 636 scored rows in the observed page, 645 in the UI. The unobserved remainder is “not published in the collected payload,” not “never measured.”
- OpenRouter I/O: eight initial model pages and twenty weekly ranking entries provide empirical usage for **52 built model rows** through exact SKU/canonical-slug linkage. Effort variants can share an explicitly scoped all-configurations workload; benchmark task tokens never propagate across AA UUIDs. The remaining **783** model rows use the labelled Chutes fallback. GPT-6 Astra's page lacks a complete seven-day window and does not receive an invented empirical ratio.
- Chutes: the public, unpaginated `/invocations/stats/llm` endpoint supplies chute/day counts. September 3–9, seven completed UTC days: **112 token-positive rows / 556 returned, 16 chutes, 20.809869890608653 input tokens per output token**. Chutes counters are self-reported, their quotient is derived, and its application to a different model is assumed. The cohort includes published anonymized aggregates and is general Chutes traffic, not a coding-agent-only sample.
- Caching: `efficiency.openrouter_endpoints[or_model_id][endpoint_tag]` contains **1,275 catalog pairs**, **104 cache-hit observations**, **927 read-price observations**, **274 write-price observations**. Ten tags are ambiguous and have no pair-level metric. The cache API's `endpointId` joins the page UUID, which resolves the exact routing tag; base provider slugs and display names never establish equivalence. The raw source preserves additional observations that cannot safely join.
- Public API documentation names every new path and basis. No existing URL/file/field, list price, benchmark score or Composite meaning changed. An independent deep comparison removes only the additions and `generated_at`, then proves the complete previous dataset is unchanged. Historical AA/OpenRouter/HF metadata dates and the retained v1.4 Coding Agent source remain intact.

### Collection findings and owner corrections

The OpenRouter worker discovered daily model usage and a useful weekly rankings cross-check, but incorrectly concluded endpoint cache rates were not public and drafted a recipe forbidding bundle inspection. Owner rejected those claims. Public JS identifies the working `/api/frontend/v1/stats/effective-pricing` route with `shape=v7`; real JSON returns `providerSummaries[].cacheHitRate`. Fireworks, Fireworks US and Fireworks Fast demonstrate the UUID join. Cache response `providerSlug` is a base slug; page `provider_slug` is the routing tag. Duplicate routing tags can exist even with different UUIDs, so their pair metrics are withheld.

Owner tightened AA duplicate/ref handling, safe integer validation, actual reference fixtures, robots/429 behavior and coverage wording. The initial draft overstated three sampled pages as proof of all measurements; the final recipe states the observed limit. Price parsing rejects boolean/empty/nonfinite coercion. Missing cache prices mean unknown, not free or unsupported. Cache-only failures retain prior data only for identical UUID/tag/provider with original dates. Rotated workload observations older than 30 days use the global fallback; cache and fallback staleness remain explicit.

Node's OpenRouter transport failed twice before a response. Plain public curl requests with the same project User-Agent worked; the collector uses that transport without cookies, authentication or control bypass. No source protection was bypassed. Failed attempts are distinguished from pages not yet visited.

### Daily integration, storage and skills

`fetch-live.mjs aa` now includes AA efficiency. `fetch-live.mjs or` includes the weekly rankings, four model pages in oldest-attempt rotation (plus their cache requests), then Chutes. `npm run data:efficiency` is the standalone recovery entry point. The tracked daily prompt is installed under `/opt/mmc-daily/prompt.md`; no schedule or persistent job was changed. Full daily gauntlet orchestration remains phase 08.

Three staged skills document exact URLs, fields, parsing snippets, units, identity rules, failure behavior and completeness checks. They passed the skill validator; installation to all agent runtimes on both machines remains phase 09. Optional Postgres seeding now keeps top-level additive metadata in `dataset_meta.extensions`; a legacy seed falls back to the bundled snapshot. Production remains bundled JSON.

### Primary-source verification and limitations

[Source audit](evidence/phase-02-source-verification.json) supplies actual source extracts, hashes, all model assignments, cache-price source/conversion rows, and independently recomputed receipts: all **138 AA rows**, **104 published cache rates**, **20 ranking rows**, **112 included Chutes rows**, and the complete legacy dataset comparison. Kimi's weekly ranking exactly equals the page's seven completed daily totals (67.90980986999436:1), independently corroborating the weekly interpretation.

OpenRouter's cache summary omits its underlying numerator/denominator and exact interval. `summary_window` remains null; accompanying chart dates are not relabelled as that interval. No source isolates typical coding-agent sessions. Chutes exposes no independent expected row count; full-array, identity, date and numeric checks cannot prove upstream telemetry completeness. These uncertainties are carried in the dataset/docs and must remain visible in the phase-03 cost explainer. AA Coding Agent v1.5 telemetry remains supplementary, version-specific benchmark evidence. Cost calculation, default adjusted UI, branding and skill rollout are not claimed delivered in this pipeline phase.

Critic rounds, final checks and release verification follow below.

### Critic round 1 — clean

Reviewer **google/gemini-3.7-flash**, a different family from all producers, qualified at conservative AA Intelligence Index 36.9. [Original review](evidence/phase-02-critic-round1.json), [parsed JSON](evidence/phase-02-critic-round1-parsed.json), [execution receipt](evidence/phase-02-critic-round1.json.meta.json), [frozen manifest](evidence/phase-02-critic-round1-manifest.json). Verdict **pass**, **0 findings**, **no missing evidence**. The reviewer explicitly covered all required data populations, source identity/units, sparse coverage, historical preservation, optional DB behavior, daily integration, recipes and check receipts. The returned charge was **$0.313244415**. The source response's outer Markdown fence was removed only in a separate parsed copy; the original response/hash remain intact.

Owner verified the JSON contract, execution identity, output hash and frozen code/raw-source/docs hashes. The critic's two uncertainty notes match the already documented cache-summary and Chutes-completeness limitations; neither requires invented data or blocks this partial-coverage pipeline. No second round was needed. No unresolved phase-02 correctness finding remains.

### Final release checks

[Final receipt](evidence/phase-02-final-checks.json): dataset rebuild, **111/111 tests**, TypeScript typecheck, production build, **9/9 prerender checks**, whitespace validation, three skill validations and installed daily-prompt comparison all passed. The final dataset rebuild advanced `generated_at`; all frozen source and artifact projections were independently rechecked and are identical. All code, raw-source and documentation hashes were unchanged from the clean critic when checked. The legacy dataset remains deeply equal after removing only the additive fields and build timestamp. Release outcome is recorded after deployment below.

### Phase 02 released

Implementation commit **3decc0b39d70dcfb0eed4f88c29b8d72dec6371d** is pushed to `main`. Webhook deployment **rq14jttgoox9xavg4qfjpxsv** finished successfully. [Live receipt](evidence/phase-02-release-deployment.json): public root and dataset return HTTPS 200, health is OK, CORS is `*`, and the **complete live dataset equals the committed snapshot** apart from runtime `_source`. The Kimi model-detail API also returns exactly the committed efficiency object. Counts remain 835 models / 650 families / 89 providers / 2,786 offers.

A closing documentation-only commit records that receipt and this report; it changes no tested application/data artifact. Its webhook completion is checked before the external phase-02 status receives `DONE`. The next phase may implement costs/UI using the explicit provenance, missing-data and workload-scope distinctions above. No phase-02 blocker remains. Cross-runtime skill installation, the full daily gauntlet and the final project Telegram/video remain in their assigned later phases.

## Phase 03 — Effective task costs and adjusted UI default (2026-09-10)

Implemented `lib/effective-cost.mjs` as pure USD/task arithmetic with named resolved inputs, four dollar terms, an own-token per-million equivalent, and explicit fallbacks for every missing/invalid input. `lib/cost.ts` supplies exact-effort AA task measurements, OpenRouter usage before Chutes fallback, endpoint-scoped cache observations, source dates and assumptions. Cached pricing never transfers from an OpenRouter route to a direct offer. Unknown rates receive no discount; unmeasured additional write volume is zero, visibly assumed. AA output/task × general app traffic is a modeled workload, not a measured coding-agent invoice. The equivalent per-million number stays in the explainer; ranking by it would cancel verbosity.

Every interactive price view now uses the selected scenario: model explorer, compare, scatter, charts, provider rankings, provider explorer, EU table and model-detail offers. New settings use `mmc.settings.v6`, adjusted on by default, with a clearly labelled raw list-price switch and all fixed scenarios (output-only, 1:1, 3:1, 10:1, 100:1, input-only). The explorer sorts cheapest first and combines the selected benchmark/minimum with a default measured-task-token filter; turning it off exposes fallback workloads labelled “assumed task”. Unmeasured 1,000-token scenarios cannot silently outrank measured long reasoning tasks in that default search. Individual prices open native accessible dialogs; chart tables and provider/group breakdowns expose every constituent. Zero-cost scatter points are available on the linear axis and in the table, with an explicit notice on logarithmic axes. Empty cost averages are unavailable, not zero.

The five source/arithmetic checks are documented in `docs/effective-cost.md` and `evidence/phase-03-five-model-checks.json`: DeepSeek V4 Pro/max $0.970328, GPT-5.6 Sol/max $1.203159, Kimi K3/max $2.029332, Gemini 3.5 Flash/high $2.197448, Sonnet 5/max $14.119974 per modeled task under the default non-Chinese-provider scope. Python recomputation agrees with the JS terms. Exact AA fields, OR weekly counters and cache summaries were checked against today's archived primary extracts, winning OR tariffs were fetched again, and the official Google global Standard table was archived. Sonnet's large estimate is explained by its measured 117.8k output/task and absent exact cache-hit telemetry, not by claiming it never caches. A real preexisting bug was found and fixed: the Sol OpenRouter override substituted first-party $4/$20 while retaining the endpoint's discounted $0.20 cache meter. Its exact public endpoint publishes $2/$10/$0.20; the override is retired with its history retained. Native first-party offers were not changed. API data paths/units and Composite inputs are unchanged; no daily collector path changed.

Delegation: bulk UI work ran through `worker.sh --agent` on `chutes/moonshotai/Kimi-K3-TEE`. The first run exited 143 with partial changes; two bounded follow-ups produced the provider views and charts, but one runner rejected malformed opencode export JSON and the other timed out. None is recorded as a clean worker execution. Actual model identity was recovered from a valid first-session export and read-only local opencode message metadata for the two follow-ups. Astra reviewed the retained code and completed the EU/detail/copy wiring, keyboard controls, missing-average handling and clipping fix. Recovery records retain these distinctions.

Gauntlet: core rounds 1 (DeepSeek V4 Flash 0731, 8,192 completion tokens) and 2 (GLM 5.3 Flash, 16,384) returned incomplete-length responses, not clean reviews. Round 3 used the prior phases' known-good different-family critic `google/gemini-3.7-flash` with 32,768 tokens and returned **pass, zero findings**, covering the engine, adapter, fallbacks, source joins, docs and all five numerical checks. Its reported artifact hash did not match a supplied digest; Astra did not trust it and instead recomputed every file digest and bound the full packet to the actual worker input-hash receipt. No model is credited with executing tests or recomputing hashes. The separate UI behavior/source review and owner pixel review are recorded in phase-03 UI evidence; text-only worker transport cannot inspect screenshot pixels.

Verification so far: production build successful; `npm test` **126/126**; TypeScript clean; nine production-prerender checks pass. The 23 cost/projection tests cover the four dollar terms, output-verbosity scaling, own-token normalization, zero/null/invalid/overflow paths, every fixed blend and partial-price fallback, exact route selection, stale telemetry, Chutes/AA fallbacks, and provider/EU/TEE isolation. Browser controls checks verify fresh default, all six rendered choices, raw/adjusted persistence across reload, v5 reset, invalid-v6 recovery, a ≥40 AA Intelligence query sorted by cost, Enter/Escape dialog behavior/focus return, and no document overflow at 390px. All eight views were exercised in adjusted and raw modes; aggregates exposed their constituent prices and empty chart groups remained unavailable. A clipped Compare model button found by real pointer interaction was fixed and rechecked on the final production artifact.

Uncertainty/residue: task/traffic population mismatch; unpublished OR hit-rate denominator and summary interval; missing direct-provider hit statistics; assumed additional write volume; task aggregates without a per-request context-length distribution; taxes/tool/retry/storage charges excluded. Missing AA task costs remain illustrative 1,000-token scenarios, excluded from the overview's default measured-task ranking. Core worker transport failures and the critic's unreliable self-reported hash remain documented operational issues for the later automation phase. Mobile navigation still uses the existing expanded layout; phase 06 owns the broader UI redesign. No unsupported measured value was substituted for missing data.

### UI critic and final acceptance

UI round 1: actual **google/gemini-3.7-flash**, AA qualification 36.9, returned **pass with zero findings** for the frozen implementation, all eight rendered price routes, fixed-blend arithmetic, storage migration, explanations, aggregates and five source-backed checks. [Original review](evidence/phase-03-ui-critic-round1.json), [owner adjudication](evidence/phase-03-ui-critic-round1-parsed.json), [execution receipt](evidence/phase-03-ui-critic-round1.json.meta.json), [frozen manifest](evidence/phase-03-ui-round1-manifest.json). The returned charge was $0.17209962. Owner recomputed all frozen file hashes and verified the actual worker input/output hashes; the supplied manifest digest was echoed correctly this round. Component inspection and actual route behavior are covered; unchanged wrapper files absent from the packet are not credited with a full-file critic review.

The critic explicitly reported missing pixel access in its text-only transport. Owner closed that separate gate by inspecting the actual screenshots with an image-capable tool: [visual review and image hashes](evidence/phase-03-owner-visual-review.json), [minimum-score screen](evidence/phase-03-min-score-screen.png), [inputs dialog](evidence/phase-03-final-explainer.png), [Compare](evidence/phase-03-compare.png), [provider constituents](evidence/phase-03-providers.png), [mobile](evidence/phase-03-mobile.png). No outstanding correctness finding remains. The broader mobile navigation redesign stays in phase 06.

[Final checks](evidence/phase-03-final-checks.json) retain command output: dataset build, **126/126 tests**, typecheck, production build, **9/9 prerender checks**, and whitespace validation. [Rendered controls](evidence/phase-03-browser-controls.json) and [eight-view receipt](evidence/phase-03-browser-views.json) retain actual accessibility trees and dialog text. All six displayed fixed-blend prices additionally match [independent arithmetic](evidence/phase-03-browser-blend-arithmetic.json) using the freshly verified Sol endpoint. Actual execution scripts are retained as text evidence. These checks ran on the final production artifact, including the Compare pointer-target fix; no application code changed after the UI freeze. Deployment verification follows after the push.
