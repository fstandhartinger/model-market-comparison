# Original-request coverage — Benchmark Heaven

> Phase 01 audit: DeepSeek first draft, corrected and reviewed by Astra.
> Status convention: **Planned** = not yet completed. **Phase 1 verified** = the foundations documented in `REPORT.md`; later product work is still planned.
> “Completion evidence required” is an acceptance criterion, not an observation.
> Phase 1 execution and deployment evidence is in `REPORT.md`; future evidence requirements below are not completion claims.

Phase 1 foundations and phases 02–05 have release evidence in `REPORT.md`. Phase 06 is implemented and live-verified, with final release receipts in `REPORT.md`. Phase 07 has DNS/TLS and rebrand receipts. Phase 08 has a successful installed daily run and published-data receipts. Phase 09 (below) re-checked every row against the deployed product and gave final verdicts. This table only updates the wishes verified by the current phase; the report carries prior phase detail.

---

## Every wish in §11 and its binding follow-up

| ID | Original wish (abbreviated) | Phase(s) | Completion evidence required | Status |
|---|---|---|---|---|
| W1 | Token & caching-efficiency adjusted costs, **default ON** | 2, 3, 8 | `data/dataset.json` contains I/O ratio, tokens/task, cache-hit/cache-price fields with provenance; effective-cost formula per §2-A4 implemented with unit tests; UI default shows adjusted price with toggle; daily refresh updates the inputs; deploy verified | Phase 3 adjusted-price UI retained; phase 08 daily inputs published and verified, with dated partial coverage; see REPORT.md |
| W2 | Realistic input:output ratio; base case = agentic coding (Claude Code/Codex/opencode); try OpenRouter per-model first, Chutes API otherwise | 2, 3 | Per-model ratio with explicit basis (OpenRouter observation, Chutes global fallback, or explicitly labelled AA benchmark proxy); OpenRouter attempt documented; Chutes fallback flagged; existing fixed blends remain selectable; UI explains which basis was used | Planned |
| W3 | Tokens-per-task verbosity from AA “Output Tokens per Intelligence Index Task”; collect per model during collection and updates | 2, 8 | AA `intelligenceIndexOutputTokensPerTask` captured for the maximum politely reachable model set; coverage caveat recorded; daily refresh re-collects; parser tests cover missing/malformed payloads | Phase 08 verified: 141 AA token-efficiency rows refreshed; missing/retained metadata remains explicit; see REPORT.md |
| W4 | Caching efficiency per **model × provider**; cache-hit rate scraped from OpenRouter pricing pages; cache read/write prices stored | 2, 8 | Store keyed by `(or_model_id, provider/endpoint)` with `cache_hit_rate`, `cache_read_price`, `cache_write_price`, provenance; partial coverage designed; tests | Phase 08 verified: endpoint-keyed cache prices and rotated page checks; unavailable hit rates remain unknown, retained pages keep their dates |
| W5 | All new data integrated into the Model Market Comparison dataset and refreshed on every regular update | 2, 8 | Schema/API/CHANGELOG updated; daily job refreshes these fields; end-to-end dry run output is shown in the phase report | Phase 08 verified: installed normal run published a41df419 and passed live equality on all three hosts; source gaps recorded |
| W6 | Default UI shows adjusted prices; user can answer “cheapest model at min benchmark score” | 3, 6 | Adjusted price is default; toggle to raw list price exists; one-screen min-score filter with adjusted cost; per-row explainer of assumptions; five-model sanity check documented | Phase 3 price task retained and Phase 6 browser-verified; released, see REPORT.md |
| W7 | Complete rebuild task handed to Codex GPT-6 Astra xHigh on Sandy Hetzner, with re-test and deploy at end | 1, 9 | Phase statuses in `/opt/benchmarkheaven/state/`; final verification checklist in `REPORT.md`; live deploy on benchmarkheaven.com verified | Phase 1 verified; rest planned |
| W8 | Astra may delegate token-heavy work to free/cheap workers; Astra stays quality gate | 1, 8 | `bin/worker.sh` verified end-to-end against all three backends; `bin/pick-worker-models.mjs` returns AA-index-filtered list; daily job uses dynamic worker selection; critic rounds documented | Phase 1 backends plus phase 08 dynamic selection and actual producer/critic receipts verified; Astra owns phase acceptance |
| W9 | Final update via `/notify-telegram` | 8, 9 | Telegram notification sent at completion; daily quiet policy implemented | Phase 08 quiet daily policy verified, including one permitted top-five entrant alert; final completion notification remains phase 09 |
| W10 | Claude Code near weekly limit → task goes as completely as possible to Codex | 1, 9 | Execution logs show Codex drives all rebuild phases; Claude is only used for the explainer-video handoff; no main rebuild work assigned to Claude | Phase 1 verified; rest planned |
| W11 | Radar charts on `/compare` and as own tab; up to 4 models; axes = collected benchmarks (AA, DesignArena, registry) | 6 | Radar implemented and rendered in both places; axis selection; normalization method documented; missing axes handled honestly; keyboard accessible | Phase 6 implemented; four-model/axis/keyboard and rendered evidence verified; released, see REPORT.md |
| W12 | Collect further benchmarks from Twitter; start with `https://x.com/search?q=benchmark&src=typed_query`; use logged-in Chrome | 4, 9 | Registry entries from sweep; “where results appear” captured; logs show **xplainervideo**, never airesearch12 | Planned |
| W13 | Goal: most complete benchmark collection of the AI Twitter universe; exclusions documented | 4, 5, 8 | Broad registry populated; saturated/superseded and excluded benchmarks recorded with reasons; coverage visible in UI | Phase 08 checks the existing 73-entry registry and supported recipes; manual/contested and retained sources remain explicit; final breadth audit is phase 09 |
| W14 | Composite may stay as-is; current Composite sources are reliable; new benchmarks additive | 4, 5, 6 | Existing Composite definition unchanged; regression guard added; new benchmarks only in new views/columns, not in Composite | Phase 6 verified: unchanged Composite bytes/inputs, dated v1.4 and separate v1.5 |
| W15 | Use Grok in X UI with the specified prompt; run more prompts/subagents to prune, detect saturation, and check versions | 4 | Grok session records; excluded-benchmark list with reasons; version-currency notes | Planned |
| W16 | Research gauntlet-loop technique online; use it for data, UI, design, docs; aim for world-best overview | 1–9 | `ops/rebuild-2026-09/GAUNTLET.md`; critic rounds per phase; residue documented; bounded rounds per artifact | Phase 1 verified; rest planned |
| W17 | Daily updates via Sandy cron with gauntlet loops; continuously discover free OpenRouter models; never use models below AA Intelligence Index 34 | 8 | Daily job rebuilt and dry-run end-to-end; dynamic picker filters AA ≥ 34; worker/cost log; Telegram quiet policy | Phase 08 verified: installed 05:17 UTC cron, successful normal publication, AA >=34 dynamic worker selection and quiet notifications; see normal-run evidence |
| W18 | For every benchmark, record where results actually appear (Tweets, websites, HF, GitHub) | 4, 8 | Registry `how_to_collect` / `primary_url` fields populated; recipes executed by daily refresh | Phase 08 verified: 75 source checks/captures and supported recipes executed; reachable protocol pages are distinguished from fresh scores |
| W19 | One-sentence English summary + category per benchmark | 4 | Registry `one_sentence_description` and `category` fields populated | Planned |
| W20 | New UI sections: per-model full score list, model-vs-model comparison, inverse per-benchmark view listing models | 6 | Pages/routes implemented; scores shown with version, source, date, self-reported flag, links; sparse coverage handled | Phase 6 implemented and browser-verified; released, see REPORT.md |
| W21 | Handle missing scores elegantly; never mix benchmark versions (Terminal-Bench 4.0 ≠ 3.0) | 4, 5, 6 | Sparse-data states distinguished; version identity enforced; version shown in UI; version-isolation tests | Phase 6 verified: version/group isolation, explicit missing states, no zero imputation |
| W22 | General app revamp to “absolutely perfect standards” | 6 | Usability/accessibility checklist; critic review against rendered output/screenshots; performance checks | Phase 6 checklist and rendered/keyboard/performance verification; critic/release acceptance in REPORT.md |
| W23 | Anomaly/outlier highlighting per model; explainable; guard against noise | 6 | Anomaly view implemented; method described (e.g. z-score vs own profile and peer distribution); small-sample guard | Phase 6 measured-peer/profile heuristics implemented and tested; released, see REPORT.md |
| W24 | Rebrand to Benchmark Heaven; domain benchmarkheaven.com; hosting stays on Sandy PaaS; real branding | 7, 9 | DNS A record; Coolify domain/TLS; old host still works; brand assets; metadata/README updated | Phase 7 branding and all three HTTPS hosts published and verified; unchanged consumer data/contracts; final release acceptance in REPORT.md |
| W25 | Collect self-reported benchmark scores; mark them as such; critic verifies; flag divergence vs measured later | 5, 6 | `basis: self_reported` rows with source URL; critic verification log; divergence surfaced in UI | Phase 5 sources retained; Phase 6 claim flags and pair UI implemented; zero verified live pairs, no invented deltas |
| W26 | Pass structured brief + verbatim original prompt to Codex; re-verify completeness | 1, 9 | `COVERAGE.md` maintained; Phase 9 re-reads §11 line by line; discrepancies reported in `REPORT.md` | Phase 1 verified; rest planned |
| W27 | At the end: update via `/notify-telegram` **and** an `/explainer-video` about the end result | 9 | German completion Telegram sent (message_id 13546); narrated video produced on Sandy and delivered via `@cursor_noti_bot` sendVideo; brief + artifact (`benchmarkheaven-de.mp4`, sha256) retained | Complete |
| W28 | Efficient collection recipes saved as user-level skills everywhere: local machine and Sandy, Claude Code, Codex and opencode | 2, 8, 9 | Token/I/O/cache collection skills written; installed in each of the six runtime/machine combinations; discovery and successful invocation receipts; repository copies alone do not count | Repository recipe/worker-selection skills prepared; installation and discovery across all six machine/runtime combinations remain phase 09 |
| F1 | Binding follow-up: use **xplainervideo** for all X/Grok interactions, **NOT airesearch12** | 4, 9 | Operational logs and final audit show only xplainervideo; no airesearch12 usage in any phase artifact | Planned |

---

## Phase 09 completion audit (2026-09-11)

Owner line-by-line re-read of §11 and the binding follow-up against the deployed
product, the committed registry/dataset bytes, and the per-phase release receipts in
`REPORT.md`. Rows accepted in earlier phases are cited by their receipt rather than
re-derived from scratch. Live state re-checked this phase: both hosts resolve to
Sandy and return HTTPS 200, and live `/api/meta` reports 839 models / 654 families /
90 providers / 2801 offers. Source dates are mixed by source: `2026-09-11` for
OpenRouter, DesignArena, the three efficiency snapshots and Artificial Analysis
Coding Agent **v1.5**; `2026-09-09` for the frozen Artificial Analysis Coding Agent
**v1.4** (`aa_coding_agents`); `2026-09-08` for the cloud and Chutes catalogues;
`2026-07-12` for provider metadata. Raw payload:
`evidence/phase-09/live-verification.json`. The 05:17 UTC cron produced today's
published snapshot `a41df419`.

| ID | Phase 09 verdict | Basis |
|---|---|---|
| W1 | Complete | Adjusted price is the default; phase 03/06 receipts; live homepage exposes adjusted prices. |
| W2 | Complete | `dataset.efficiency`: OpenRouter per-model empirical ratio for 51 models, Chutes global fallback (`derived`, 21.03) for 788, both with source+url+date+basis; existing blends retained. |
| W3 | Complete | `data/raw/aa-efficiency.json` (`collected_at 2026-09-11T06:32:14.403Z`) holds `count: 141` and `coverage.published_rows: 141`; the `collect-aa-efficiency` skill note dated 2026-09-10 records the earlier 138-row snapshot. |
| W4 | Complete | `openrouter_endpoints`: 1,288 model×provider pairs; 939 cache-read and 274 cache-write prices; unknown hit rates stay `null`. |
| W5 | Complete | New fields ship in `data/dataset.json` and the public API; daily job republishes them (phase 08 run). |
| W6 | Complete | Adjusted default + raw toggle + min-score filter; phase 03/06 browser evidence. |
| W7 | Complete with deviation | Phases 01–08 were driven and accepted by Codex on Sandy with re-test/deploy per phase; phase 09 ran on OpenCode/DeepSeek V4.1 Flash because the Codex quota was exhausted (recorded in the runner header). See deviations. |
| W8 | Complete | `bin/worker.sh` + `pick-worker-models.mjs`; phase 08 daily run used dynamic AA ≥ 34 selection; `evidence/phase-08/normal-run/worker-calls.json` records 33 calls. Per-model qualification is evidenced by the pick-time `benchmarkheaven-daily/runs/2026-09-11T06-32-03-542Z-839690/reports/worker-catalog.json` (`min_index: 34`): the four models actually used — deepseek-v4-flash-0731 (AA 34.5), z-ai/glm-5.3-flash (41.9), deepseek-v4-pro-0813 (36.3), google/gemini-3.7-flash (36.9) — are all ≥ 34, with the highest used output price $3.75/M (below the $4/M ceiling); see `evidence/phase-09/critic-residue.md`. |
| W9 | Complete | Daily quiet policy verified in phase 08; final German completion Telegram delivered 2026-09-11 (message_id 13546). |
| W10 | Complete with deviation | Codex drove phases 01–08; Claude was used only for the explainer-video handoff. Phase 09 ran on OpenCode per the same quota constraint. |
| W11 | Complete | Radar on `/compare` and `/radar`, 4-model selection, versions shown; phase 06 receipts. |
| W12 | Complete (scoped) | Phase 04 X sweep used **xplainervideo** only, found the @Whats_AI editorial-writing board, imported no numbers; registry `how_to_collect` populated for all 73 entries. |
| W13 | Complete as scoped | 73-entry registry with explicit exclusions/saturated/superseded ledger; phase 08 checked 75 sources. "Complete benchmark-universe freshness" is not claimed. |
| W14 | Complete | v1.4 Composite bytes/inputs unchanged; Coding Agent v1.5 kept separate (phase 06/08). |
| W15 | Complete (scoped) | Grok prompts recorded in phase-04 `grok-answer*.txt`; exclusions have reasons. |
| W16 | Complete | `GAUNTLET.md` + per-phase critic rounds; this phase ran a closing critic round. |
| W17 | Complete | Installed 05:17 UTC cron; AA ≥ 34 picker; quiet policy (phase 08 normal run). |
| W18 | Complete | `primary_url` / `how_to_collect` on all 73 entries; recipes executed by the daily refresh. |
| W19 | Complete | `one_sentence_description` and `category` populated on all 73 entries. |
| W20 | Complete | Per-model score list, model-vs-model, inverse per-benchmark views (phase 06). |
| W21 | Complete | Version isolation, explicit sparse states, no zero imputation (phase 06). |
| W22 | Complete | Phase 06 usability/accessibility/performance checklist; critic review of rendered output. |
| W23 | Complete | Measured-peer/profile anomaly heuristics with small-sample guard (phase 06). |
| W24 | Complete | `benchmarkheaven.com` + www + old host all HTTPS 200 on Sandy; brand assets and metadata shipped (phase 07). |
| W25 | Complete (scoped) | 519 `basis: self_reported` observations with source URLs and 767 `basis: derived` observations (both counts recomputed from `data/raw/benchmarks/scores.json` and `dataset.benchmark_results.observations`); claim flags/pair UI shipped. Zero live measured-vs-self-reported divergences found, so none are displayed (no invented deltas). |
| W26 | Complete | This audit: §11 read line by line; discrepancies recorded below. |
| W27 | Complete | `EXPLAINER-VIDEO-BRIEF.md` written and used in place; the narrated German video (49 s, 1920×1080, H.264 + AAC) was produced on Sandy with the `explainer-video` skill and delivered to Florian via `@cursor_noti_bot` `sendVideo`, followed by the German completion Telegram (`message_id 13546`). Artifact and sha256 retained under `evidence/phase-09/`. See corrections item 6. |
| W28 | **Partial** | Six skills published in `ops/skills/` and installed on Sandy under `~/.claude/skills`, `~/.codex/skills` and `~/.config/opencode/skills`; file presence and SHA-256 per runtime are in [the install receipt](evidence/phase-09/skills-install.json). [Runtime-discovery evidence](evidence/phase-09/runtime-discovery.json) (produced by `bin/verify-skills-discovery.mjs`) shows the running **opencode** session enumerated all six skills (a real discovery test), while **Claude Code** and **Codex** are path-/frontmatter-verified only (Claude invocation skipped to conserve quota; Codex 0.154.0 has no list command). Not installed on Florian's WSL machine — unreachable from Sandy; that blocker remains. See corrections item 5. |
| F1 | Complete | No `airesearch12` interaction appears in any phase artifact; the only mentions are the original brief quote and the binding correction. |

### Deviations from the original request

- **W7/W10 — quality gate identity.** §11 asked for Codex GPT-6 Astra to carry and own the
  rebuild. Phases 01–08 were in fact produced and accepted by that owner with per-phase
  re-test and deploy. Phase 09 (the final verification, skills, report and Telegram pass)
  ran as OpenCode with `openrouter/deepseek/deepseek-v4.1-flash` because the Codex quota
  was exhausted; this is an execution-environment change, not a change of acceptance
  standard, and it is recorded rather than hidden.
- **W13/W15 — breadth.** The registry is 73 verified entries with an explicit exclusion
  ledger, not a claim to have captured the entire AI-Twitter universe. This is stated as
  a coverage limit in `REPORT.md` phase 04/08.
- **W25 — divergence flags.** The mechanism exists and is tested, but with zero verified
  live measured–self-reported pairs there is nothing real to display; no delta was
  fabricated.

---

## Corrections applied to the phase instructions

1. **I/O source priority (phase 02):** §11 explicitly asks for OpenRouter per-model empirical usage, then Chutes typical LLM usage. The structured brief promoted AA benchmark token ratios to the default. Restore the original priority. AA ratios remain useful cross-checks or clearly labelled benchmark proxies if actual usage is unavailable; never describe them as observed user workloads. The worker draft also put AA ahead of Chutes; owner corrected that error.
2. **Selectable blends (phase 03):** preserve existing fixed blends as alternative scenarios, in addition to the adjusted default and raw-price toggle.
3. **Provider identity (phase 02):** retain provider name along with model ID and endpoint tag; do not join unrelated endpoints just because their provider labels match.
4. **Composite/version protection (phases 04–06, 08):** the 2026-09-10 source moved Coding Agent Index from v1.4 to v1.5. Keep v1.4 dated and separate for the unchanged Composite. Collect v1.5 separately and ingest into versioned new views. No implicit score migration. Every radar axis, ranking and comparison displays its benchmark version.
5. **Skills on both machines (phase 09):** repository copies/handoff are intermediate artifacts. Completion requires installation and discovery evidence for Claude Code, Codex and opencode on Sandy AND Florian's machine. If a machine is unavailable, mark the installation incomplete with the specific blocker.
6. **Explainer video delivery (phase 09):** the master brief assigns production to Florian's local Claude session, while the original asks for a delivered video. Prepare an explicit video brief, deliver that handoff, and verify the video reaches Florian. A prepared brief alone is not completion. Record an outstanding blocker honestly rather than mark the entire rebuild complete.
7. **Unknown AA worker scores (phase 01/08):** the fixed known-answer smoke test verifies transport, not AA qualification, including the requested free and near-free backends. It has a price/token cap and accepts no custom task. Models with no AA score remain excluded from unattended data-bearing work. Known scores below 34 are excluded even from pinned and smoke paths.

All original wishes have phase owners. No new product features are claimed complete by this phase-01 mapping. Phase 09 must re-check every row against the actual deployed product and delivery receipts. The binding xplainervideo correction supersedes the original airesearch12 account reference everywhere, including vendor-release searches in phase 05.

---

## Phase 11 addendum — new source, no wish verdict changed (2026-09-12)

Florian's request after phase 09 (Real-SWE, Specific Labs) is a **new source**, not a new
wish, so it adds coverage without changing any W1–W28 or F1 verdict above. It is ingested
under the same binding contract (`docs/benchmark-ingestion.md`): hash-bound bytes, a
registry entry (`realswe::snapshot-2026-09-12` plus the separate `realswe-cost::`
board), `basis: measured`, no invented numbers and the public-10-task limit stated.
The harness dimension and the dated history state are the phase-11-specific deliverables;
the machine-readable `cause` for `not_comparable` rows closes the phase-10 night-review
addendum. See `REPORT.md` → "Phase 11" and `CHANGELOG.md`.
