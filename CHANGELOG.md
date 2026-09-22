# Changelog

For downstream consumers (forks, apps syncing data from this repo or the live API):
the **data locations have not moved**. What changed recently is the hosting URL and
some app internals — details per release below.

## 2026-09-22 — GPT-6 Sol and GPT-6 Luna: OpenAI's own launch numbers (CR-126)

**Six new self-reported observations; no field, path or unit changed, and no existing value touched.** OpenAI
announced GPT-6 Sol and GPT-6 Luna on 2026-09-22 and published a handful of results for them in the launch post.
The catalog rows, the live price and Artificial Analysis's measured scores for both families arrived with CR-125;
this change adds what only the vendor publishes.

Six numbers OpenAI prints as text about its own two new models enter as `basis: self_reported` on five new
`openai-…` registry identities, each joined to the reasoning-effort configuration the post names: AutomationBench
1.0.6 33.2 % and the published USD 0.27 cost per task on `gpt-6-sol::xhigh` (the cost is a separate Efficiency
axis, `openai-automationbench-cost::1.0.6`), Agents' Last Exam V1 56.4 % and DeepSWE v1.1 68.8 % on
`gpt-6-sol::max`, DeepSWE v1.1 66.6 % on `gpt-6-luna::max`, and OSWorld 2.0 offline (release v2026.08.08, partial
reward) 60.5 % on `gpt-6-sol::xhigh`. A lab's own run of a public benchmark is a different implementation from the
board's, so these identities stay separate from `osworld-2::v2026.08.08`, `aa-automationbench::1.0.6` and every
other operator's run, and none of them enters the Composite or a category score.

Everything the post does not measure itself stays out, with its reason recorded in the refusals: every competitor
cell (OpenAI states competitor scores were taken from publicly available reports, which makes them secondary
quotes), GPT-6 Luna's AutomationBench and OSWorld figures (only a percentage-point change and a cost ratio are
printed) and the FrontierCode, factuality and alignment figures (charts with no printed datapoint values).

Evidence is the launch post's own bytes plus the two model cards and the pricing page, each with its hash. The two
model cards confirm the API ids `gpt-6-sol` and `gpt-6-luna`, the 1,050,000-token context window, 128,000 max
output tokens and the published Standard short-context price the live sources also carry (Sol USD 2 / 10, Luna
USD 0.10 / 0.50 per 1M tokens). `scripts/capture-vendor-documents.py` receives HTTP 403 from openai.com although
`https://openai.com/robots.txt` allows the path; its receipt stays in the run manifest, and the post was loaded
once in the shared desktop Chrome with the document response retained unchanged. A critic from a different model
family reviewed all six rows.

## 2026-09-22 — GPT-6 Sol and GPT-6 Luna measured by Artificial Analysis; Opus 5.5 speed (CR-125)

**Selective same-day refresh of the Artificial Analysis and OpenRouter price sources; no field, path or unit changed.**
Re-running `node scripts/fetch-live.mjs aa` and `node scripts/fetch-live.mjs or-prices` (the regular collectors,
outside the daily schedule) brings OpenAI's GPT-6 Sol and GPT-6 Luna, released 2026-09-22, into the catalog with
Artificial Analysis's independent measurements (`basis: measured`): `gpt-6-sol::max/xhigh/high/medium/low/non-reasoning`
(AA Intelligence Index 47.5 / 44.1 / 42.8 / 39.8 / 33.9 / 28.1) and `gpt-6-luna::…` (37.3 / 33.9 / 32.1 / 29.5 / 20.9 /
18.3), each with AA's HLE, SciCode and long-context scores and AA's reference price (Sol USD 2 / 10, Luna USD 0.10 /
0.50 per 1M tokens). OpenRouter now lists `openai/gpt-6-sol`, `openai/gpt-6-luna` (plus their `-pro` SKUs) and
`anthropic/claude-opus-5.5`, so these models get live provider offers. AA now also publishes speed for Claude Opus 5.5
at xhigh / high / medium / low (97.8 / 67.2 / 78.3 / 73.0 output tokens per second; max still unpublished and null).
AA has not yet published token-efficiency (tokens per task) for GPT-6 Sol or Luna; those fields stay null. The
Opus 5.5 launch test now checks the Anthropic launch-price offer alongside the new OpenRouter endpoints.

## 2026-09-22 — Claude Opus 5.5: Artificial Analysis's measured numbers (CR-124)

**Same-day refresh of the Artificial Analysis source; no field, path or unit changed.** Artificial Analysis
published its independent measurements of Claude Opus 5.5 a few hours after launch. Re-running the regular AA
collector (`node scripts/fetch-live.mjs aa`: API v2 models plus the model-page token-efficiency payload) brings
all five effort settings AA measured into the catalog as `claude-opus-5.5::max`, `::xhigh`, `::high`,
`::medium` and `::low` (`basis: measured`), replacing CR-123's hand-curated launch row as announced there.
AA Intelligence Index: 57.6 (max), 56.0 (xhigh), 53.6 (high), 51.2 (medium), 42.3 (low); with them come AA's
HLE, SciCode and long-context scores, its reference price (USD 4 / 20 per 1M tokens) and its measured output
tokens per Intelligence Index task (119,166 at max). AA has not published output speed or time to first token
for Opus 5.5 yet (served as 0), so both stay null. The same refresh updates AA values for other models that
changed since this morning's daily run (661 AA models, 154 token-efficiency rows). Anthropic's self-reported
CR-123 observations are unchanged. AA's per-benchmark model-page fields (`aa-observed-fields.json`, e.g.
GDPval-AA, Terminal-Bench 4.0, Omniscience) are not part of this change; that snapshot is refreshed by the
daily pipeline after its protocol review.

## 2026-09-22 — Claude Opus 5.5: Anthropic's own launch numbers (CR-123)

**New model row, new self-reported observations; nothing moved or removed.** Anthropic announced Claude Opus 5.5
on 2026-09-22. The catalog gains `claude-opus-5.5::max` — the configuration Anthropic evaluates in (adaptive
thinking at max effort) — with its published API price (USD 4 input / 20 output / 0.20 cache read / 5 cache write
per 1M tokens; fast mode at 8 / 40 is a separate product and is not carried). The row is hand-curated in
`data/raw/manual.json` on launch day and is replaced automatically once a live source carries the family; a
manual entry may now name its `variant`, so the id matches what the live sources will use.

Sixteen numbers Anthropic publishes about Opus 5.5 enter as `basis: self_reported` on sixteen new
`anthropic-…` registry identities: nine from the launch post's benchmark table (Terminal-Bench 4.0 66.4,
FrontierCode v1.1 Main 54.4, CursorBench 4.0 57.8, GDPval-AA v2.1 1846 Elo, AutomationBench 40.0,
Humanity's Last Exam with tools 67.7, Terminal-Bench-Science 0.1 58.7, OSWorld 2.0 partial 81.8,
Chartography with tools 89.0) and seven from the system card's Table 8.1.A (SWE-bench Pro 89.9,
Multilingual 93.9, Multimodal 61.4, HLE without tools 64.4, OSWorld 2.0 strict 48.7, HealthBench
Professional 65.6, AA-Briefcase v1.1 1822 Elo). They never touch the Composite or a category score,
keep `comparison_key: null`, and the product shows them with its usual developer-reported marker.

Each row records what the vendor discloses: the effort it was measured at (Terminal-Bench 4.0 at xhigh, the
rest at max), who ran it (AutomationBench by Zapier; GDPval-AA and AA-Briefcase independently by Artificial
Analysis), tools on or off for HLE, partial versus strict for OSWorld, that HealthBench Professional's table
value is the length-adjusted score (raw 77.1), and that production safeguards could route a task to a fallback
model. Evidence: the launch post's bytes and the system card's text layer, both hashed, under
`data/raw/benchmarks/daily-evidence/2026-09-22-claude-opus-5-5/`; a critic from a different model family
reviewed all 16 rows against those captures.

## 2026-09-22 — Compare links for models that are not in the data yet (CR-122)

`/compare?model=<id>&model=<id>` now keeps an id the catalog does not have yet: the page names it readably
(`gpt-6-sol` → "GPT-6 Sol"), marks it "Coming soon — numbers land here as soon as they are published" and keeps it
in the URL, so the same link shows real numbers once the model is collected. Ids are matched tolerantly (case,
dots/dashes, `vendor/` prefix, date suffix, bare family key such as `claude-opus-5`). Shared links get their own
title, description and preview image (new `GET /api/og/compare?model=…&model=…`, 1200×630 PNG). `/compare` is now
rendered per request. No data, path, field or unit changed.

## 2026-09-22 — Lumina Bench ledger paused by Lumina

`data/raw/lumina-ledger.json` gains an optional top-level `availability` object (`state: "paused_by_source"`,
`since`, `checked_at`, `evidence_url`, `notice`, `manifest_status`) while Lumina's bulk downloads are paused
(its data page: "Public bulk downloads are paused."). `families` and `ledger` are unchanged — they still describe
the 2026-09-01 ledger. The field disappears when the downloads return. No value on the site came from Lumina, so
no score changes.

## 2026-09-22 — MathArena USAMO 2026 (judged, secondary, retired, non-Composite)

One new registry id (Math): `matharena-usamo::2026` (the six proof problems of USAMO 2026, 9 rows), from MathArena's
own competition table. Proofs are graded 0–7 by MathArena's LLM judges against a model-written rubric (MathArena's
`configs/judges/`), so the rows carry the `Judged` tag and never average with task-accuracy rows; three judge models
are also graded on the board, which the registry notes say. MathArena marks the competition Deprecated, so it is
`status: "retained"` (tagged retired). 4 rows join a catalog configuration exactly. No path, field or unit changed.

## 2026-09-22 — MathArena AIME 2026 (secondary, retired, non-Composite)

One new registry id (Math), collected daily from MathArena's own competition table like the HMMT and Apex boards:
`matharena-aime::2026` (AIME I and II 2026, 30 problems, 31 rows). Values are the published accuracy in percent
(`basis: measured`); the 95% interval, cost, tokens and MathArena's "released after competition" flag stay in each
row's `protocol`. MathArena marks the competition Deprecated, so the registry lists it `status: "retained"` and the
site tags it retired. One row whose accuracy includes item-response-theory estimates is not ingested (it appears in
`public-observations.json` `rejected`). 7 rows join a catalog configuration exactly; the rest keep the source's own
name. It is a different edition from Artificial Analysis's `aa-aime::2025` and is never merged with it. No path,
field or unit changed.

## 2026-09-22 — MathArena HMMT and Apex competitions (secondary, retired, non-Composite)

Four new registry ids (Math), collected daily from MathArena's own competition tables like the ArXivMath editions:
`matharena-hmmt::2026-02` (HMMT February 2026, 33 problems, 31 rows), `matharena-hmmt::2025-11` (HMMT November 2025,
30 problems, 23 rows), `matharena-apex::2025` (12 problems, 48 rows) and `matharena-apex-shortlist::2025` (47
problems, 38 rows). Values are the published accuracy in percent (`basis: measured`); the 95% interval, cost, tokens
and MathArena's "released after competition" flag stay in each row's `protocol`. MathArena marks all four
competitions Deprecated, so the registry lists them `status: "retained"` and the site tags them retired. Three rows
whose accuracy "includes estimated scores for questions we did not run" (item response theory) are not ingested; they
appear in `public-observations.json` `rejected` with that reason. 46 rows join a catalog configuration exactly; the
rest keep the source's own name (`subject.model_id: null`). No path, field or unit changed.

## 2026-09-21 — Four duplicate catalog models merged

Four models were listed twice: the benchmarked row and a benchmark-less twin that a cloud, EU or Epoch catalog spells
with or without the size suffix. The twins are gone and their offers and scores now sit on the canonical row:

| Removed id | Now part of |
|---|---|
| `nemotron-3-ultra::default` | `nemotron-3-ultra-550b-a55b::reasoning` (Azure AI Foundry offer, Epoch ECI 146.27) |
| `nemotron-3.5-lightning-30b-a3b::default` | `nemotron-3.5-lightning::default` (TrustedTokens EU offer) |
| `llama-4-maverick-17b::default` | `llama-4-maverick::default` (AWS Bedrock, Azure AI Foundry offers) |
| `llama-4-scout-17b::default` | `llama-4-scout::default` (AWS Bedrock offer) |

`GET /api/models/{id}` for a removed id no longer resolves. Nemotron 3 Ultra's Composite now includes Epoch ECI. Five
board rows labelled "Nemotron 3 Ultra" without a reasoning setting (SimpleBench, Toolathlon-Verified, Epoch's chess
puzzles, mystery game puzzles and GPQA Diamond runs) keep the source's own name (`subject.model_id: null`): the
merged family's only configuration is reasoning, and a label without a setting joins only a single default
configuration. No path, field or unit changed.

## 2026-09-21 — Blueprint-Bench 2 (secondary, non-Composite)

New registry id `blueprint-bench::2` (Vision): Andon Labs' floor-plan benchmark, collected daily from the
leaderboard table on the maintainer's own page. Values are the published 0–1 connectivity-similarity score (`unit:
points`, `basis: measured`, random baseline 0, perfect 1), unconverted. Rows the page prints as `0.000**` (at or below
the random baseline) carry `"marker"` in their `protocol`. 26 rows; the page names no reasoning setting, so 2 join
catalog configurations and the rest keep the source's own names. Same endpoints; no path, field or unit changed.

## 2026-09-21 — Context Arena MRCR v2 (secondary, non-Composite)

New registry id `context-arena-mrcr-v2::8-needle` (Long-context): Context Arena's runs of Google DeepMind's MRCR v2,
8 needles, collected daily from the board JSON the site's own app requests. The value is the cumulative average up
to 128k tokens in percent (`basis: derived`, `source_basis: measured`, derivation = source fraction × 100); AUC
@128k/@1M, per-bin scores and run counts are in each row's `protocol`. 183 rows, 48 joined to catalog
configurations. Same endpoints (`/api/benchmark-scores?benchmark_id=…`, `/api/benchmark-matrix`, `/api/dataset`);
no path, field or unit changed.

## 2026-09-20 — AA efficiency refresh tolerates confirmed source-wide retirement

The AA token-efficiency collector now accepts a smaller published model population only when a second public AA
model page reproduces the exact parsed rows. This preserves fail-closed behavior for partial pages while allowing
source-wide retirements to refresh honestly. The 2026-09-20 pages independently confirmed 145 rows (down from 156),
with a scored denominator of 644; no API shape or raw data location changed.

## 2026-09-19 — /jev-models: the Main Composite Score chart first, with adjustable weights

`/jev-models` now opens with the JevBench Main Composite Score as a native bar chart (bars coloured by system type,
Capability / Speed / Cost beside each bar, formula and footnotes) and four named weightings — Emphasis on Accuracy
60:20:20 (the default and the official score), Emphasis on Speed 20:60:20, Emphasis on Cost 20:20:60, Balanced
33:33:33 — plus custom sliders. Other weights re-score and re-rank in the browser from the published sub-scores and are
labelled "not the official score" (chart title, badge, table header, reset). `?w=20-20-60` shares a weighting. Every
system links to its repository or vendor page. The published numbers and the API are unchanged.

## 2026-09-19 — JevBench v1.1: one Main Score; v1.0 moves to /jev-models/v1

`/jev-models` now shows JevBench v1.1 (314 decisions in easy / standard / judge tiers, 11 systems incl. Needle 3):
Main Score = 0.6 × Capability + 0.2 × Speed + 0.2 × Cost with the sub-scores, tiers, latency and cost sortable
beside it and a sensitivity table under six weightings. The artifact is committed at
`data/raw/benchmarks/jevbench/v1.1/jevbench-v1.1-results.json` (sha256 `1e280185…`, = `results/v1.1/` at tag
`v1.1`) and served verbatim at `GET /api/jevbench/v1.1`. Registry gains `jevbench::v1.1`; `jevbench::v1` stays
published (`GET /api/jevbench`, page `/jev-models/v1`) with `superseded_by` set. The artifact's
`capability.pooled_accuracy` exceeds 1 and is not shown.

## 2026-09-19 — JevBench v1: our own benchmark and the "Jev-class models" page

**New page, new registry identity, one new public JSON.** `/jev-models` (nav: More → Jev-class models) shows
JevBench v1, Benchmark Heaven's own measurement of typed-decision models (Jev and its open rebuilds against small
instruction models): five independently sortable axes (smart, cheap, fast, reliable, open), no combined score.
The publication-safe artifact is committed at `data/raw/benchmarks/jevbench/v1/jevbench-v1-results.json`
(sha256 `38fc5f1d…`, byte-identical to `results/` in github.com/fstandhartinger/jevbench) and served verbatim
at `GET /api/jevbench` with an `X-Content-SHA256` header. The registry gains `jevbench::v1` (category Other,
collection status `manual_required`); its results are not joined to catalog models and do not enter any
composite. `lib/jevbench.mjs` refuses an artifact carrying item text, labels or per-item predictions, and a
zero price where the route has no billable account.

## 2026-09-19 — Two new benchmark identities: FrontierSWE v2 and PostTrainBench v1.1

**New versioned benchmark identities, same file locations and API shape.** FrontierSWE v2 joins as
`frontierswe::2` (34 hand-written real-world software tasks; mean@5 in percent with best@5/worst@5 bounds,
5 trials per task under a 20-hour budget, published by the Proximal team with open task repos) from the
leaderboard front page's own Next.js flight payload; Epoch AI's FrontierSWE relay CSV restates 12 overlapping
rows byte-exactly and is the only stated effort evidence, so 8 of the 14 rows join exact catalog
configurations (Claude Fable 5.1 max, GPT-5.6 Sol max, GLM-5.3 max, Kimi K3 max, Grok 4.6 xhigh, Gemini 3.7
Flash high, Muse Spark 1.2 xhigh, Inkling xhigh) and the five later additions without any stated setting
(GPT-6 Astra at the top, four more) stay visible as unmatched source identities. PostTrainBench joins as
`posttrainbench::1.1` (agents retrain four small base models for 7 benchmark families; the leaderboard
average is the published weighted mean) from the site's own `scores.js` + `config.js` (the config states each
agent's scaffold and reasoning effort, which lands in every row's protocol and the join reads it live); 7 of
13 rows join exact catalog configurations (Fable 5 max, GPT-5.6 Sol max, Claude Opus 4.8 high and max, GLM
5.2 max, GPT-5.5 xhigh, Grok 4.5 high) and the rest refuse honestly (unstated effort for Kimi K3, Opus 5 and
the OpenCode Gemini run; no catalog configuration for Opus 4.7 xHigh and GPT 5.4 High; Locus is an external
system, not a model). Attribution unchanged: FrontierSWE by the Proximal team (robots.txt allows our
identity; relay by Epoch AI), PostTrainBench by aisa-group (Ben Rank et al.; MIT harness; the site's footer
states "Verified by Epoch AI").

## 2026-09-18 — Five new benchmark identities: VulcanBench Frontier v4 and four KernelBench-CUDA problem boards

**New versioned benchmark identities, same file locations and API shape.** VulcanBench's current suite joins as
`vulcanbench-frontier::4` (23 behavioural-reconstruction tasks; combined score 50% functional hidden tests /
8.5% lint-complexity / 8.5% security / 33% judged Code quality; renamed from "VulcanBench-SWE v4", task set and
URLs unchanged) from the maintainer's own board CSV — one row per model × reasoning-effort column, Claude
Fable 5.1 (max) on top at 91.84%. KernelBench-CUDA joins as one identity per problem
(`kernelbench-cuda-glm52-fused-moe::rtx-pro-6000`, `-deepseek-nsa::rtx-pro-6000`, `-megaqwen-decode::rtx-pro-6000`,
`-grid-mingru-sps::rtx-pro-6000`); the version is the hardware (scores are fractions of that card's roofline —
unbounded, Claude Opus 5 reaches 196.10% of roofline on the MinGRU sim). Only cells the site itself counts
(correct and audited) score; flagged, suspect, `bug` and unaudited cells, and any cell absent from the published
ranked list, never enter (the ranked list still holds the rejected cells — the site's own validity rule wins).
All 24 VulcanBench columns join exact catalog configurations (its "extra-high" tier is the catalog's xhigh);
20 KernelBench cells join (Claude Opus 5/4.8 max, Claude Fable 5.1 max, Grok 4.6 xhigh, Gemini 3.8 Flash high,
GLM-5.3 Flash), the remaining 34 rows — bare names of multi-configuration families, a `ultra` tier that exists
nowhere in the catalog, kinetic-0715 — stay visible as unmatched source identities, never estimated. Attribution
unchanged: VulcanBench by Morgan Linton (robots.txt explicitly welcomes crawlers and AI answer engines), and
KernelBench-CUDA by Elliot Arledge (values from the maintainer's own repository, which the site renders).

## 2026-09-18 — Three new benchmark identities: ArXivMath & BrokenArXiv 08/2026 (MathArena), WeirdML v3

**New versioned benchmark identities, same file locations and API shape.** MathArena's August 2026
editions join as their own identities (monthly editions are never averaged): `matharena-arxivmath::2026-08`
(57 problems, 7 model rows) and `matharena-brokenarxiv::2026-08` (56 problems, 7 model rows, graded 0–3 per
the edition's own description, so judged separately from June's 0–2). WeirdML's third version joins as
`weirdml::3` from the maintainer's own prepared data (5 published configurations; effective score, not
comparable with v2's Average Max Accuracy). Attribution unchanged: CC-BY-SA-4.0 with credit to MathArena
(SRI Lab, ETH Zurich; INSAIT), and WeirdML by Håvard Tveit Ihle. Isolated unjoined rows stay visible as
unmatched source identities, never estimated (data honesty rules).

## 2026-09-16 — MIT licence (code only)

**No data change.** The repository now carries an [MIT licence](LICENSE) (`license` field
in `package.json`, README "Licence" section), making the open-source claim on the site true.
The licence covers the **code only**; the collected benchmark results, prices and other data
remain third-party data under their own terms (Artificial Analysis, Epoch AI CC BY, DesignArena,
OpenRouter, benchmark maintainers, provider catalogs — see the site's Sources & methodology page).

## 2026-09-16 — Best-of rows in the comparison matrix; link-preview copy

**No data file changed shape; one API response gained fields.** `GET /api/benchmark-matrix` (and the comparison tables)
now merge the Claude Code and Codex runs of one board — ApprenticeBench API and CUA, FrontierCode 1.1, τ^τ-bench and
their cost rows — into one row per board holding each model's best recorded result, and merge AA Coding Agent Index
v1.4 and v1.5 the same way (Florian, CR-41.1). A cost row follows the run its score row picked. Each merged row lists
its runs and which run each value comes from (`bestOf`, `boards`; see API.md); the benchmark count is unchanged (99),
and every run keeps its own result page, observation and history. The site's Open Graph, Twitter and description
tags and the share image `public/brand/og-image.png` now carry the hero's copy ("The most detailed cost–capability
analysis in AI. Every model. Every Benchmark. Actual Costs."); the image URL gained `?v=2` so scrapers fetch it anew.

## 2026-09-16 — Lumina Bench discovery feed (no values)

**New file, no change to any existing data.** `data/raw/lumina-ledger.json` is a daily discovery and provenance feed
from Lumina Bench's public ledger: one record per benchmark family (435) with counts of results by who the cited
source is — the evaluator, a model vendor, an aggregator, or a Lumina estimate — and the diff whenever the ledger's
hash changes. It carries **no scores**; a consumer must not read it as results. Reviewed decisions per family live in
`data/lumina-feed-policy.json`. Details: `data/raw/lumina-ledger.method.md`.

## 2026-09-16 — τ^τ-bench (Hyper-τ) release v1

**One new board, no shape change.** `hyper-tau-bench::release-v1`: Sierra's τ^τ-bench, where a coding agent (the
Developer, in a harness such as Codex or Claude Code) builds a customer-service agent from realistic evidence and is
scored by that agent's pass rate on 53 held-out τ³-bench tasks. Value = `overall`, which the README defines as the
mean across all 53 tasks; the collector checks that each overall equals the task-weighted mean of the domain scores
(35 of the 53 tasks are banking, which is why overall sits far below the airline/retail scores). Collected daily from
the MIT repository's `manifest.json` and one `submission.json` per row; a new submission needs a reviewed plan change.
Domain scores, build time and cost, serve-credit ratio, date and the maintainer-baseline flag stay in the protocol.
6 rows, 4 join; Kimi K3 (max) appears under two harnesses and joins neither. Never a Composite input.

## 2026-09-16 — LisanBench v0.2.0

**One new board, no shape change.** `lisanbench::0.2.0`: Lisan al Gaib's (@scaling01) word-chain benchmark — from each
of 50 pinned starting words a model builds the longest chain of dictionary words that each differ from the last by one
letter, without repeats; the first broken rule ends the chain. The value is the page's default **Path Length**: valid
transitions per starting word, averaged over the model's trials, summed over the 50 words (points, higher is better, no
ceiling). Collected daily from the files the page itself loads (`data/core.json`, `data/rankings.json`) plus the
repository README as the method source; the collector fails closed on another word list, dictionary or score
definition, and when a score is not the sum of its published per-word averages. Most rows ran 150 trials; seven list
149, 250 or 300, and every row keeps its own trial count, difficulty-weighted score, best-trial sum, validity rate,
output tokens and run cost in its protocol. 154 observations, 52 join a catalog configuration; token budgets
(`:thinking-16k`), a bare `:thinking` and `:free` routes are not reviewed settings and stay unjoined. Not a Composite
input; tier Community; category Instruction following. The repository carries usage terms, not an open-source licence:
credit @scaling01 and link https://github.com/voice-from-the-outer-world/lisan-bench when reusing these numbers.
Parser support: plan entries may now name a `detail_source` supporting capture (refreshed daily like `method_source`).

## 2026-09-16 — SWE-rebench (one task window) and GSO

**Two new boards, no shape change.** `swe-rebench::2026-05-15..2026-07-01`: Nebius' SWE-rebench, 111 fresh GitHub
issues from 65 repositories created between 15 May and 1 July 2026, resolved rate averaged over five runs in the
maintainers' fixed ReAct-style scaffold (tool mode). The page renders every historical window in one 7.8 MB
payload; a window is a different task set, so each window is its own identity, and only this window's extraction
is committed (`scripts/extract-swe-rebench-window.py`, with the full page's sha256). SEM, Pass@5, cost and tokens
per problem, and the source's own potential-contamination marker (the model was released after the window's
first task — true for most frontier rows in this window) stay in each observation's protocol. Agent products
(Claude Code, Codex, Junie, Cursor) are not models and are not ingested. 13 rows, 8 join a catalog configuration
(`parseSweRebenchLabel`); GLM-5.2 [high] has no catalog `high` configuration and labels without a setting whose
model has several configurations are refused. Manual snapshot.

`gso::opt1-102`: GSO (software optimisation, 102 tasks), Opt@1 as the page ranks it, from the page's own
`assets/leaderboard.json`, collected daily. The Hack-Adjusted score and the run date stay in the protocol; the
page's changelog changed the protocol for runs from 2026-04-27 (larger iteration budget) and 2026-07-12
(network-isolated tasks). Opt@10 rows are another protocol and are skipped. 28 rows, 10 join (`parseGsoId`);
"Gemini 3 Flash"/"Gemini 3 Pro" are not mapped because the catalog holds preview and release families under
those names. For a consumer: 41 new observations, two registry entries, and the count of benchmarks the site
reports rises by two (three with τ^τ-bench above). Neither is a Composite input.

## 2026-09-16 — FrontierMath v2 (Tiers 1–3 and Tier 4) and SimpleQA Verified, as Epoch AI runs them

**Three new boards, no shape change.** From Epoch AI's Benchmarking Hub archive
(`https://epoch.ai/data/benchmark_data.zip`, CC BY 4.0), the CSV members of three benchmarks Epoch runs
itself: `frontiermath-tiers-1-3::v2` (106 rows) and `frontiermath-tier-4::v2` (62 rows) — Epoch's private v2
problem sets released 2026-06-12, which supersede the 2025 sets as different identities — and
`simpleqa-verified::snapshot-2026-09-16` (80 rows; Google DeepMind's benchmark, Epoch's runs, no published
version so the identity is dated). Value = Epoch's declared score column "Best score (across scorers)", a
fraction; mean score, standard error, start time and the Epoch run id stay in the protocol. Manual snapshots
like DeepSWE (the archive changes with every Epoch update), never fetched by the daily run. Joins use the
DeepSWE label rule (`<slug>_<effort>`, exact catalog configuration): 101 of 248 rows. Epoch never lets
crawlers see the FrontierMath sample problems and neither do we. For a consumer: 248 new observations,
three registry entries, and the count of benchmarks the site reports rises by three. Never a Composite
input; attribute Epoch AI.

## 2026-09-16 — MathArena: ArXivMath and BrokenArXiv, June 2026 editions

**Two new boards, no shape change.** `matharena-arxivmath::2026-06` (48 research-level problems from arXiv
papers submitted in June 2026) and `matharena-brokenarxiv::2026-06` (54 plausible but false statements from
the same month; a model scores by refusing to prove them). Both are run by MathArena (SRI Lab, ETH Zurich,
with INSAIT) and collected from the leaderboard page's own table endpoint
(`/competition_tables/<competition>`); value = accuracy in percent. The 95 % interval, cost, output tokens and
MathArena's own "model was released after competition release" flag stay in each observation's protocol —
the flag says a model may have seen the problems, it corrects nothing. Each monthly edition is its own
identity; editions are never averaged. Data CC-BY-SA-4.0 (Hugging Face `MathArena/*`); attribute MathArena.
11 of 22 rows per board join a catalog configuration (`parseMathArenaLabel`, reviewed names, the parenthesis
is the stated setting); "Kimi K3 (Think)" and labels without a setting whose model has several (or a
non-default) configurations are refused. For a consumer: 44 new observations, two registry entries, and the
count of benchmarks the site reports rises by two. Never a Composite input.

`scripts/capture-benchmark-sources.py` now follows HTTP 308 redirects like 307 (Python 3.10 does not):
MathArena answers `robots.txt` with a 308 to a 404, which previously stopped the capture before any request.

## 2026-09-16 — OSWorld 2.0, the first board from the source audit (one identity per task release)

**Two new boards, no shape change.** OSWorld 2.0 (XLANG Lab, University of Hong Kong): a computer-use agent
completes 108 long-horizon real-world workflows; value = binary accuracy in percent at the source's default
500-step budget on the full task set, collected from the leaderboard page's own data file
(`official-results.json`, Apache-2.0 project). Each result release is a **task release** with different task
files, so each is its own identity and they are never compared directly: `osworld-2::v2026.06.24` (10 rows)
and `osworld-2::v2026.08.08` (6 rows). The offline subset and the 150/300-step budgets are different
protocols and are not ingested. Each row is one model x reasoning setting x tool setting; the tool setting
(`batch tool`, `batched tool`, `standard`, spelled as the source spells it) is `subject.harness`.
4 + 6 rows join a catalog configuration (`lib/board-identity.mjs`, `parseOsworld2Id`); Claude Opus 4.8 and
4.7 max appear under two tool settings and join neither row, Qwen 3.7-Plus "thinking" and "Kimi 2.6" are
refused rather than guessed. Never a Composite input.

**Correction, same day.** The first build of this entry (`52719ba`, live for about an hour) published all
16 rows under `osworld-2::v2026.06.24`, mixing the two task releases. Anthropic's Claude Fable 5.1 page
states that the August 2026 task files differ and the numbers "aren't directly comparable to previously
published OSWorld 2.0 results"; an independent review surfaced the sentence and it was checked on the page
before the split. The two history states written by that build (`20260916-31bc236e`, `20260916-c8572ee5`)
were withdrawn rather than kept as a record of a mislabelled identity.

## 2026-09-16 — Twelve benchmarks we already collected now have rows, and DesignArena's scope is recorded

**More data, no shape change.** Boards whose leaderboards label a model with a slug rather than a product
name were collected for weeks and reached nobody: nothing joined
`anthropic/claude-opus-4.8@reasoning=xhigh` or `claude-fable-5-1|Claude Code|max` to a catalog
configuration. `lib/board-identity.mjs` now does, under the same rule the coding boards already used — the
label must state the exact model *and* a setting that exists as a catalog configuration; a label that
states no setting joins only a family the catalog holds as a single default configuration; a configuration
named twice on one board joins neither row. Where a source publishes the setting it ran (Vals AI's
`reasoning_effort` / `compute_effort`), that published field decides, not the slug.

For a consumer: `data/dataset.json` keeps its shape and no field was renamed. There are simply more
observations with a `subject.model_id` (the identity map grew 197 → 825 entries), so
`benchmark_results.coverage.by_model[id].capability_available` rises (7,384 → 7,829 cells across the
catalog) and twelve more boards appear in the comparison matrix: BullshitBench V1/V2, ApprenticeBench API
and CUA, and the eight Vals Index boards. The count of benchmarks the site reports went 77 → 89 under the
unchanged F-102 rule (a benchmark is a board; harness cohorts and cost twins are rows of it). The
FrontierCode and CursorBench **cost** boards are joined too and, being category `Efficiency`, still do not
count as benchmarks — exactly as documented for `capability_available`.

**DesignArena's collection scope is now a recorded decision** (`data/source-policies.json`, new). The two
boards we publish — Agentic Web Dev Frontend and Full-Stack Elo — stay under an explicit documented-risk
decision by the site owner; the collector reads its permitted boards and endpoints from that file and
refuses anything else. The raw snapshot's `source` field changed wording from "Intelligence.ai leaderboard
API (formerly DesignArena)" to "DesignArena public leaderboard (the site's own leaderboard endpoint; no
published API documentation or data licence)" and gained an `access_policy` block; no value changed.

## 2026-09-16 — Saturated and judged benchmarks are labelled, and weigh differently (CR-38.2 / CR-38.3)

**One breaking value change: `cat_science`.** Benchmarks now carry two measured caveats.

*Saturated* is computed from the results we hold, never asserted: a benchmark on a bounded,
higher-is-better scale, with independently measured results for at least five models, whose five best
results average at least 90 % of its ceiling. Six boards qualify today — AIME 2025 (AA), GPQA Diamond
(AA and the OpenRouter run), τ²-Bench Telecom (AA), Harvey LAB-AA and Terminal-Bench v2.1 (AA). A
benchmark we cannot assess (Elo, an open points scale, fewer than five measured models) carries no tag
and is **not** called unsaturated.

*Judged* marks a score set by preference or by a judge's rating rather than by task accuracy — human
head-to-head votes, an Elo from a judge panel, a rubric graded by a judge model. The classification and
the verbatim quote from each benchmark's own registry text live in the new
`data/benchmark-caveats.json`; a test fails if a quote is not found in its cited source.

Both change composites. A judged row never averages with task accuracy: where a category shows both,
only the task-accuracy rows make its composite. A saturated row still counts, at half weight. For the
selectable category scores that means **`cat_science` is now `(CritPt + 0.5 × GPQA Diamond) / 1.5`**,
roughly ten points below earlier builds; `cat_coding`, `cat_agentic` and `cat_long_context` are
unchanged, and no slot of the Benchmark Heaven Main Composite is saturated. Nothing moved: no field was
removed or renamed, and `data/dataset.json` keeps its shape.

## 2026-09-16 — Labs' own published benchmark numbers, re-verified against the documents (CR-30.1)

**New self-reported observations; nothing moved or removed.** Benchmark numbers that model labs
published about their own models in system cards, model cards and technical reports now reach the
registry as `basis: self_reported` observations on five existing identities (SWE-bench Verified,
SWE-bench Multilingual, SWE-bench Multimodal, LongBench v2, Terminal-Bench 4.0). They are never part
of the Composite or of any category score, keep `comparison_key: null`, and the product shows them
with the same self-reported marker as before (the `†` in the benchmark tables, the "Self-reported
only" evidence filter).

The 2026-09-15 scout extraction is a lead, not a source: every value is re-verified against our own
bounded capture of the primary document, and the observation's locator records the exact document
line the value was found in, so any cell can be re-read without the source. Release PDFs are
retained as their text layer with the original document's SHA-256 recorded (16-27 MB of PDF does not
belong in a repository); HTML and Markdown cards are retained byte-for-byte. Each row still carries
its own independent critic approval in `score-approvals.json`.

Downstream: no schema change. `benchmark_results.observations` gains rows with ids prefixed
`self-reported:`; rows whose catalog configuration is unresolved keep `model_id: null` and remain
unmatched source identities. New files: `data/raw/benchmarks/self-reported-candidates.json`,
`self-reported-identity-map.json` and the captures under `data/raw/benchmarks/self-reported/`.

## 2026-09-16 — DesignArena results sit on the effort the source actually names (CR-28.2)

**Values move between configurations of the same family; no value changes.** Intelligence.ai's
(DesignArena's) own model registry states the tested effort for some results — "GPT-6 Astra
(xhigh)", "GPT-5.6 Sol (Medium)", "Muse Spark 1.3 (xhigh)". The build discarded that label and
attached the result to a statically chosen family representative. It now joins exactly the catalog
configuration the source names, and `designarena_attachment_note` says which of the two rules
applied. Two published efforts of one family also no longer compete for one slot: GPT-5.6 Sol's
xhigh board rows (Elo 1269 / 1278) were being dropped in favour of its Medium rows and are back.
Downstream: `models[].designarena` appears on a different `id` for those families; nothing moved in
the schema, and a family whose source row names no effort keeps the family-scoped rule unchanged.

## 2026-09-16 — OpenRouter's own benchmark runs and their measured cost (CR-34.2 / CR-34.3)

**New benchmark boards, new coverage field; nothing moved or removed.** Twelve versioned registry
entries at `snapshot-2026-09-15`: OpenRouter's own GPQA Diamond and τ²-Bench Airline runs and the
four search boards (BrowseComp, DeepSearchQA, HLE, WideSearch), each with a `…-cost` twin in
category `Efficiency` carrying OpenRouter's measured `avg_cost_per_task` in USD. These are separate
registry identities from Artificial Analysis' same-named boards and are never merged with them.

Observations now may carry `published_stddev` and `sample_size`; `benchmark_results.coverage.by_model`
gains `capability_available` and `total_capability_benchmarks`, which exclude `Efficiency` (cost)
boards — that pair is what the product's "#benchmarks" column counts. `available` is unchanged.
`data/raw/openrouter-benchmarks.json` gains `own_data` and `own_response_sha256` (the
`include_run_config=true` own-run response). See `data/raw/openrouter-benchmarks.method.md`.

## 2026-09-15 — Category scores as selectable scores (CR-25.6)

**New dataset fields, nothing moved or removed.** `models[].category_scores` (`cat_coding`,
`cat_agentic`, `cat_science`, `cat_long_context`, 0–100) and `dataset.category_scores` (the anchor
benchmarks behind them). The four keys also work as `GET /api/models?score=…`. A model only gets a
category score when it has a result on every anchor benchmark of that category, so the key is missing
rather than averaged over a smaller set; anchors count at their newest published version. See API.md
and `/about#category-scores`.

## 2026-09-15 — Options panel: positive regional choices, Labs filter (CR-25.4 / CR-25.5 / CR-36.3)

No data location, route, public API field or dataset value changed. App settings only:

- **Regional choices are positive lists** — "Hosted in", "Provider company based in" and "Model lab
  based in", each over China / EU / US / Other, all selected by default. They replace the switches
  "EU-hosted only", "Exclude Chinese providers" and "Non-US provider only" with identical results
  (a unit test compares both on every provider in the dataset). Stored settings, saved filter presets
  and account settings carrying the old switches are migrated on load.
- **Shared links:** the `?f=` filter code now writes `hostedIn:EU`, `providerBasedIn:…`,
  `labBasedIn:…` and `labs:…`; links with the old `euHostedOnly:1`, `excludeChinese:1` and
  `nonUsOnly:1` keys still open the same view.
- **Model lab country** (`LAB_COUNTRIES` in `lib/regions.mjs`) lists only labs whose home country is
  well documented; every other lab counts as Other, never guessed.
- Models, Providers and the new Labs picker are compact searchable lists; the provider quick-pick
  links of the old dropdown are gone (the filter presets cover those cases).

## 2026-09-15 — New raw capture: OpenRouter Benchmarks API (CR-34.1; no values displayed yet)

No data location, route, public API field or benchmark value changed; `data/dataset.json` is
untouched. One new raw snapshot joins the daily refresh:

- **`data/raw/openrouter-benchmarks.json`** — `GET https://openrouter.ai/api/v1/benchmarks`
  (documented public API, the project's existing key from the environment, two requests/day;
  robots.txt allows). 1,518 rows / 250 models as of 2026-09-15T12:01Z: OpenRouter's own runs
  (`gpqa_diamond` 131, `tau_bench_verified_airline` 123, search benchmarks `search_browsecomp` /
  `search_dsqa` / `search_hle` / `search_widesearch` with engine+surface labels and measured
  `avg_cost_per_task`), plus relayed Artificial Analysis (148) and DesignArena (1,102) rows kept
  for cross-checks only — their own primary sources stay primary for every displayed value.
- **Terms evaluated before any value ships** (`data/raw/openrouter-benchmarks.method.md`): the
  page carries no licence; the API's own meta defines `citation` as "Required attribution when
  republishing this data" per source. Display attribution (once values ship): "OpenRouter
  Benchmarks" → https://openrouter.ai/benchmarks. Media benchmarks deliberately not ingested
  (CR-34.6 decision); the AA Agentic Index stays on hold (CR-35.3) until Florian reports AA's
  answer. Ingesting the own-run rows into taxonomy/UI (CR-34.2/34.3/34.5) is the next step.
- Fail-closed validator `lib/openrouter-benchmarks.mjs` with unit tests.

## 2026-09-15 — New provider: TrustedTokens (TNG, DE-sovereign, EUR→USD)

No data location, route or public API field was removed; no benchmark value changed. One new
offer source joins the dataset (providers 91 → 92, offers 2,861 → 2,882 across variant rows);
every existing offer is unchanged.

- **`sources.trustedtokens`** is a new key. Thirteen public models from
  `https://trustedtokens.eu/api/service/models` (the unauthenticated payload the `/models` page
  itself loads; robots.txt allows all) with EUR per-token prices normalized to per-1M EUR and
  converted to USD at the ECB daily reference rate (1 EUR = 1.1539 USD, 2026-09-15).
- Eleven models joined their existing families (GLM 5.3/5.2/5.3-Flash, DeepSeek V4 Flash 0731 /
  V4.1 Flash / V4 Pro 0813, Qwen3.5 397B / Qwen3.6 35B / Qwen3.8 27B, gpt-oss-120b, gemma-4-31b-it).
  Two are genuinely new families: **DeepSeek TNG R1T2 Chimera** (TNG's own model merge) and
  **NVIDIA Nemotron 3.5 Lightning 30B A3B**. `zai-org/GLM-5.2` stays in the dataset with
  `catalog_status: "deprecated"`.
- Offers carry `eu_hosted: true`, `hosting_class: "sovereign_germany"` and a B2B caveat in
  `notes`: prices bill against included monthly plan credit (no free tier, no public
  self-serve signup) — audited operator/hosting evidence in
  `data/raw/trustedtokens.method.md`. Collector: `scripts/fetch-trustedtokens-catalog.mjs`
  (daily); parser + fail-closed rules: `lib/trustedtokens-catalog.mjs`.

## 2026-09-15 — New `/api/benchmark-matrix`; Benchmaxxing verdict per model family

No data location, route or public API field was removed; no benchmark value changed.

- **New route** `GET /api/benchmark-matrix?models=<ids>` (see API.md): the comparison matrix for up to ten models.
- **`/api/benchmaxxing?report=`**: an axis percentile now needs a cohort of at least three model families. Axes whose
  exact cohort holds fewer (e.g. two effort variants of one model on a single harness) return `value: null`,
  `missing: true` instead of a mechanical 0 or 100. Scored models 178 before and after; the tagged set is unchanged.
- **Benchmaxxing score and tag shown per model** (Overview, Benchmaxxing page) are the model family's: one
  representative variant (most measured axes) carries the score, and the tag covers every variant of a tagged family.
- **Settings / share URLs:** `teeOnly` ('Strong confidential guarantees') is no longer a filter key; a stored or
  shared `teeOnly` is ignored. The offer-level `tee` flag in the dataset is unchanged.

## 2026-09-15 — FrontierCode, CursorBench and SWE-Bench Pro results joined to catalog models

No data location, route or public API field was removed; no benchmark value changed. 110 self-reported
observations that were listed only under their source labels now carry a catalog `subject.model_id`:
FrontierCode 1.1 68, CursorBench 4.0 39, SWE-Bench Pro Public 3. `coverage.by_model[*].available` rises accordingly.

- Exact rules only (`lib/coding-identity.mjs`): the label states the model and an effort that exists as a catalog
  configuration ("Extra High" = `xhigh`); without an effort only a single `::default` configuration joins. The
  other rows stay unmatched with their reason in `ops/benchmark-table-2026-09-15/identity-map-review.json`.
- The cost boards `frontiercode-cost::1.1` and `cursorbench-cost::4.0` stay unjoined for now, so a cost metric never
  counts as a benchmark in `#benchmarks`.
- Each join is an entry in `data/raw/benchmarks/identity-map.json` with `basis: "self_reported"` and a `review`
  receipt (packet + verdict digests, critic `chutes/moonshotai/Kimi-K3-TEE`, producer `anthropic/claude-opus-5`).
  Joined observations gain `join_note` and `identity_review`. The value approval in `score-approvals.json` still
  binds the unjoined row; ingest fails closed if a receipt is missing, altered or rejects the join.
- These results stay self-reported (marked † in tables), never enter the Composite or the Benchmaxxing signal
  (both read measured results only), and now appear in the Coding rows of the benchmark tables.

## 2026-09-15 — EU-hosted filter re-checked per offer (Azure Europe Data Zone)

No data location, route or public API field was removed. Two offer rows changed in `data/raw/azure-foundry.json`
(offers 2,863 → 2,861):

- **Removed** `GPT-6 Astra (EU Data Zone)` (region `eu`, $12/$60): Microsoft's region-availability page lists GPT-6
  Astra under Data Zone Standard / Provisioned in US regions only; in Europe it is Global. The Global row stays.
- **Added** `DeepSeek-V4 Flash (EU Data Zone)` (region `eu`, `eu_hosted: true`, $0.21/$0.56 per 1M; Retail meters
  `V4 Flash Inp/Outp DZ Tokens`): Data Zone Standard in seven EU regions for version 2026-04-23.
- Consumers filtering on `eu_hosted` see GPT-6 Astra without an EU Azure route and DeepSeek-V4 Flash with one.
  AWS Bedrock Claude EU geo rows and the two Azure Global `eu_policy_equivalent` rows are unchanged.

## 2026-09-15 — Compare radar, value tags, Benchmaxxing master-detail, subscription note

No data location, route or public API field was removed; no dataset value changed.

- **`GET /api/benchmark-view`** gains an additive `indexAxes` array: Epoch ECI and Epoch Software ECI as
  dated snapshot axes (`epoch_eci::snapshot-<date>`, `epoch_eci_software::snapshot-<date>`, unit `ECI`),
  filtered to the requested models like `axes`. They are kept out of `axes` on purpose, so the Benchmaxxing
  signal and the full comparison, which iterate `axes`, are unchanged.
- **/compare and /radar** open on the two most capable current families by AA Intelligence Index (derived from
  data). The radar draws each benchmark on its own scale (0–100 indices, percentages, registry ranges); only
  open-ended Elo / ECI use the measured range. New default axes; a Detailed topic radar toggle.
- **Overview Cost cell:** a small "cheaper" / "pricier" tag for models ≥2× off the typical cost for their score
  among the rows shown (robust line of log cost against score). Presentation only.
- **/benchmaxxing:** the table is a preset (Featured by default); the report follows the selected row (`?model=`,
  one or two ids for compare mode); signals above 25 render as a warning pill.
- **Subscriptions:** API pricing stays the baseline; the subscription panel is a folded "Subscription costs may
  differ" note with an assumption-based estimate ((monthly fee + extra usage) ÷ tasks per month). Guided mode
  asks the optional company question last.

## 2026-09-15 — Coding benchmarks, Benchmark Heaven score row, typical cache-hit baseline

No data location, route or public API field was removed.

- **New registry identities (measured, secondary, never Composite inputs):** `deepswe::snapshot-2026-09-15`
  (Datacurve's DeepSWE as republished by Epoch AI, CC-BY 4.0; Pass@1 fraction) and Scale AI's
  `swe-atlas-qna`, `swe-atlas-test-writing`, `swe-atlas-refactoring` (`::snapshot-2026-09-15`, percent).
  Captures and robots files: `data/raw/benchmarks/daily-evidence/2026-09-15-coding/`. The three SWE Atlas boards
  join the daily refresh; DeepSWE is a reviewed manual snapshot (`refresh: "manual"` in the collection plan) that
  the daily run neither fetches nor re-parses, because Epoch publishes it only inside a multi-benchmark ZIP.
- **Reviewed identity map:** `data/raw/benchmarks/identity-map.json` joins those measured rows to catalog
  configurations only where the source label states the exact model and effort (rules and tests:
  `lib/coding-identity.mjs`). Rows without a stated effort, duplicate harness rows and unknown names stay
  unmatched (`ops/benchmark-table-2026-09-15/identity-map-review.json`). Self-reported boards are untouched.
- **Taxonomy 2026-09-15:** Terminal-Bench rows display under Coding; a new `aa_input` tag marks inputs to the
  AA Coding / Coding Agent indices.
- **Adjusted cost:** a route without its own usable cache-hit observation now uses the typical baseline
  (median of fresh OpenRouter endpoints that publish a cache-read price) instead of 0 %; it changes cost only
  where the route bills cheaper cache reads. Adjusted `$/task` values and cheapest-route choices can change.
- **Daily refresh:** unattended producer/critic calls get 600 s (`BH_WORKER_TIMEOUT` default; was 180 s).

## 2026-09-15 — Catalog ids: AA Coding Agent "Opus 5 / Fable 5.1" rows join their catalog configurations

No data location, route or public API field was removed.

- **Model ids removed:** the seven harness-only ids `opus-5::{low,medium,high,xhigh,max,non-reasoning}` and
  `fable-5.1-with-fallback::max`, which AA's Coding Agent Index labels had produced because the dataset build
  had no family alias for them. Their results now attach to the real catalog configurations
  `claude-opus-5::*` and `claude-fable-5.1::max` (the v1.5 example: `Opus 5 (max)` → `claude-opus-5::max`).
  Retained history stays immutable; `data/dataset.json` applies an old→new id remap when states are read
  (`RETAINED_ID_PREFIX_REMAP`), so a row retained under an old id keeps its historical bridge.
- **13 formerly unmatched Coding Agent rows joined** to catalog configurations (e.g. DeepSeek V4 Flash 0731,
  GLM-5.2 on the Agent Index boards); `benchmark_results.historical.counts.estimated` 90 → 88 because those
  two DeepSeek configurations are now measured on v1.5 instead of bridge-estimated.
- **Naming:** coding-agent-only configurations now follow the catalog convention ("Claude Opus 4.7 (Adaptive
  Reasoning, Medium Effort)", "Claude Opus 5 (Non-reasoning)") instead of AA's short agent label.
- Catalog counts: 838 models, 658 families, 91 providers, 2,863 offers (was 844/660/91/2,846).

## 2026-09-15 — Historical estimates: no false drop-outs; bridge disclosed in "better than model X"

No data location, route or public API field was removed.

- **Correction:** `benchmark_results.historical.estimates` held 87 `estimated` rows for configurations that are
  still published. Older retained states had matched them to a catalog id the current matcher no longer assigns
  (e.g. GPT-6 Astra (Non-reasoning) on 15 AA boards), so their keys differed and they read "no longer published".
  A retained row is now skipped when its source identity (the `source:` key or the AA model UUID in its locator)
  is on the current board with the same harness and effort. `counts.estimated` 177 → 90; `not_comparable`
  unchanged at 482. Every removed row was checked against the current board.
- Advanced → "better than model X": when the reference value is bridged, the status line now says which
  snapshot (or older version) it came from, how many anchor models and hops the bridge used, and the anchor
  spread; for a category median it says how many of its benchmarks are bridged.

## 2026-09-15 — BU Bench V1 (Browser Use) added as a secondary benchmark (E2)

No data location, route or public API field was removed.

- **New registry identity** `bu-bench-v1::snapshot-2026-09-09` (category Agentic, tag `niche`): 9 runs from the
  `official_results/` files of `github.com/browser-use/benchmark` at commit `421390ea`, 100 web tasks each.
  Value = `tasks_successful / tasks_completed` (basis `derived`, source basis `self_reported`: Browser Use
  benchmarks its own framework, cloud browser and bu models), critic-reviewed like other vendor rows. Each
  `model|framework version|browser` label stays an unmatched source identity. The files' `total_cost` is not
  ingested (most runs record 0.0), and BU Bench V2 is not ingested because its results exist only as a plot image.
- Collector gains the `bu_official_results` parser kind (one JSON file per run; each row cites its own run file).

## 2026-09-15 — BullshitBench V1 and V2 added as secondary benchmarks (E2)

No data location, route or public API field was removed.

- **Two new registry identities** `bullshitbench-v1::snapshot-2026-09-10` (55 prompts, 194 rows) and
  `bullshitbench-v2::snapshot-2026-09-10` (100 prompts, 214 rows), category Safety/Alignment, tag
  `community`, basis `measured`, never Composite inputs. Value = the published `green_rate` (clear pushback
  over all attempts) from the maintainer's canonical leaderboard CSVs in `github.com/petergpt/bullshit-benchmark`
  at commit `2678ac29` (MIT). Each `model@reasoning` label stays a separate, unmatched source identity; no
  effort alias is inferred.
- Rows land in `data/raw/benchmarks/public-observations.json`, `scores.json` and `data/dataset.json`
  (`benchmark_coverage.total_benchmarks` 92 → 94). Capture recipe in `collection-plan.json`; the csv parser
  gains optional `require_header` / `require_values` version guards.

## 2026-09-15 — Speed and context shown; AA "not speed-tested" zeros become null (P2)

No data location, route or public API field was removed.

- **`models[].aa_speed.output_tps` and `models[].aa_speed.ttft_s`** are now `null` when Artificial Analysis
  has not speed-tested a model. AA's API sends `0` for both fields on those models (460 of 650 AA rows on
  2026-09-14, always as a pair); earlier datasets copied the zeros. Consumers that treated `0` as a
  measurement should treat `null` as "not measured". No other model field changed.
- **`GET /api/benchmark-view`**: each `models[]` entry gains `outputTps`, `ttftS` and `contextTokens`
  (from `aa_speed` and `aa_metadata.context_window_tokens`, `null` when unknown), and the view gains
  `speedDate` (= `sources.artificialanalysis`). Additive.
- UI: model pages show output speed, time to first token and context window under the title (moved out of
  the Composite card); Compare has a "Speed and context" table for the selected models.

## 2026-09-14 — Google Vertex collector; provider metadata cross-check (R9.1)

No data location, route or public API field was removed.

- **`data/raw/google-vertex.json`** is now refreshed daily by `scripts/fetch-google-vertex-catalog.mjs`
  (one GET of the server-rendered public pricing page). New fields: per row `price_ref` (`section`,
  `label`, and `pane`/`region` where the page has them) and `price_checked_at`; top level
  `price_collection`, `response_sha256` and `diff` (price changes, unlisted, unreadable, suspicious and
  unreferenced page rows). 68 of 69 rows confirmed with no price change; Gemini 3 Flash keeps its
  2026-09-08 check (the page has no output row for it). Added from the same page: Grok 4.6 (2.00/6.00 USD
  per 1M tokens, global) and GLM-5.2 (1.40/4.40, global). `/api/meta` dates `google_vertex` 2026-09-14.
- **`data/raw/provider-meta.json`** stays hand-curated. `scripts/check-provider-meta.mjs` (daily, after the
  OpenRouter data-policy fetch) cross-checks `country` against OpenRouter's provider table and never
  changes a curated value. New fields: `judgments_checked_at` (date of the last first-party check of
  `eu_hosted`, `non_us`, `hyperscaler` and notes, 2026-07-12), `country_disputes` (explained disagreements
  with OpenRouter, e.g. Cohere in Canada, Zhipu/Moonshot/MiniMax listed there under Singapore entities) and
  `openrouter_crosscheck`. `collected_at`, and with it `sources.provider_meta`, is now the date of the
  OpenRouter table checked against; `source_status.provider_meta` states both dates.

## 2026-09-14 — Azure AI Foundry collector; Epoch ECI result pages; AA unrated Elo in history (R9.1, CR-1.8, F-78)

No data location, route or public API field was removed.

- **`data/raw/azure-foundry.json`** is now refreshed daily by `scripts/fetch-azure-foundry-catalog.mjs`
  (Azure Retail Prices API, native USD). New fields: per row `retail_meters` (`product`, `input`,
  `output` — the exact Retail meters that price the row); top level `meters_checked_at`,
  `lifecycle_checked_at` (lifecycle and EU Data Zone availability stay a documented manual check, now
  2026-09-08), `ignored_meter_bases` (meters deliberately not offered, with reasons), `retail_collection`,
  `response_sha256` and `diff` (removed rows, price changes, suspicious meters, uncovered new meters).
  `/api/meta` dates `azure_foundry` 2026-09-14.
- **`data/raw/aws-bedrock.json`** is now refreshed daily by `scripts/fetch-aws-bedrock-catalog.mjs` (AWS
  Price List bulk API: `AmazonBedrock` and `AmazonBedrockFoundationModels`). New fields: per row
  `price_meters` (`offer`, `region`, `input`, `output`, and `service` for Marketplace-billed models); top
  level `meters_checked_at`, `unmetered_checked_at` (the five Bedrock Mantle GPT-5.x rows, which no public
  Price List carries, still 2026-09-08), `price_list_versions`, `price_list_collection`, `response_sha256`
  and `diff`. No Bedrock price changed; `/api/meta` dates `aws_bedrock` 2026-09-14.
- **Price changes from the source:** GPT-5.6 Sol on Azure 5.00/30.00 → 4.00/20.00 USD per 1M tokens
  (Global) and 5.50/33.00 → 4.40/22.00 (EU Data Zone), effective 2026-09-01. GPT-6 Astra's two Azure rows
  were unpriced and now carry 10.00/50.00 (Global) and 12.00/60.00 (EU Data Zone).
- **`/benchmarks/result`** now also accepts the Epoch ECI row ids (`epoch_eci::snapshot-<date>`,
  `epoch_eci_software::snapshot-<date>`), so every comparison-table cell opens a page with its source
  and date. Software ECI is labelled as our refit of Epoch AI's published results.
- **`benchmark_results.historical`:** retained history states no longer turn Artificial Analysis'
  unrated placeholder (Elo 0) into bridged estimates — 56 AA-Briefcase estimates removed
  (`counts.estimated` 233 → 177).

## 2026-09-14 — Optional accounts (Sign in with Google), privacy, terms and Impressum (CR-5)

No data location, field or public API response changed. New, all same-origin only (no public CORS):

- `GET|PUT|DELETE /api/account` — the signed-in visitor's saved presets and settings; `DELETE` removes
  the account and its data. Not a data API: it answers `{ "enabled": false }` where accounts are off.
- `/api/auth/*` — Auth.js sign-in routes (Google only).
- Pages `/account`, `/privacy`, `/terms`, `/impressum`.
- `GET /api/health` gains `accounts` (true when sign-in is configured and its database answers).

Accounts use their own database via `ACCOUNTS_DATABASE_URL` (schema `db/accounts/001_init.sql`), never
`DATABASE_URL`, which keeps meaning the optional dataset database. Forks without the four account
variables (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ACCOUNTS_DATABASE_URL`) run exactly as
before, with presets kept in the browser.

## 2026-09-14 — Vals Index v2 and FrontierCode 1.1 secondary benchmarks (E2)

Eleven new registry identities, all non-Composite, with the page captures and robots files under
`data/raw/benchmarks/daily-evidence/2026-09-13-{vals-index,frontiercode}/`:

- **Vals AI (independent evaluator, `measured`):** `vals-index::2` plus its seven published
  components `vals-index-{finance-agent,emb,terminal-bench-2.1,vibe-code-bench,code-migration,legal-research,hlab}::2`
  (percent, 56 models each) and `vals-index-cost::2` (USD per test, 55 models; Nemotron 3 Ultra has
  no published cost and is recorded as rejected, not zero). Parsed from the page's own Astro island
  props (new collector kind `astro_props`, version guard "Vals Index" v2). Vals' Terminal-Bench 2.1
  run is its own identity and never joins the AA or Harbor Terminal-Bench rows.
- **Cognition FrontierCode 1.1 Main (`self_reported`):** `frontiercode::1.1` (score, stored ×100
  from the published fraction as `derived`) and `frontiercode-cost::1.1` (mean USD per rollout),
  98 model × effort runs each, parsed from the leaderboard page's own `data.json` (new collector
  kind `effort_runs_json`). Every row passed a different-family critic review before approval.

Model labels stay source labels (`subject.model_id: null`); no catalog join or effort inference.
No existing field, observation or URL changed.

## 2026-09-14 — Bounded Artificial Analysis publication lag

The live collector now records API-versus-leaderboard counts and missing metadata model IDs
in each Artificial Analysis snapshot. A maximum of four missing leaderboard rows is tolerated
for a short publication lag; missing metadata stays explicitly null and a fifth row still fails
closed. The 2026-09-14 refresh reached this gate successfully, then stopped at an independent
OpenRouter endpoint-removal review, so no partial dataset was published.

## 2026-09-13 — Honest positioning and Simple threshold (R3.1, R5.3)

The landing claim now stays source-linked and coverage-qualified: Benchmark Heaven presents
the tracked benchmark collection and a realistic modeled cost per task grounded in provider
prices, caching and token efficiency. The unsupported exclusive comparison with other
products was removed from the page, metadata, footer and social image. Simple mode now starts
at a minimum Composite score of **86** (strictly above the requested 85 threshold); Advanced
and Guided settings remain independent.

## 2026-09-13 — Executable source refresh audit (R9.1 remains open)

The daily-refreshable DesignArena, OpenRouter, Epoch ECI, efficiency, and OpenRouter
provider-policy snapshots were refreshed from their public sources and the dataset was
rebuilt and tested. Artificial Analysis failed closed on a live API/leaderboard row-count
mismatch, so its retained snapshot was not replaced. Curated provider catalogs remain
explicitly dated at their last audited collection; they were not relabelled as fresh.
See [the refresh audit](data/research/refresh-2026-09-13.md) and the evidence receipt for
the exact commands, source dates, and remaining gap.

## 2026-09-13 — Subscriptions beside the per-task cost (R6.3)

**New data file: `data/raw/subscriptions.json`.** Flat-rate plans (Claude, Google AI,
ChatGPT, SuperGrok, GitHub Copilot, Cursor, plus Claude Team/Enterprise and Copilot
Business/Enterprise) with monthly list price, the vendor's published company-use verdict
(`allowed` / `not_allowed` / `unclear`) with a verbatim quote and source URL, and a plain
statement of what quota is (not) published. Prices were re-read from the vendors' own pages
on 2026-09-13; OpenAI and xAI refuse automated reads, so their prices are `null` and marked
not collected. `lib/subscriptions.mjs` never converts a monthly price into a per-task price —
no vendor publishes an included task count — and instead reports the break-even task count
against the vendor's best-scoring model in view. "I'm buying for a company" now hides the
consumer plans whose terms exclude business use. No existing dataset field or API changed.

## 2026-09-13 — CursorBench 4.0 secondary benchmark slice (E2)

The benchmark registry and score API now include Cursor's published CursorBench 4.0 table as
two separate, non-Composite identities: `cursorbench::4.0` (score, percent, higher is better)
and `cursorbench-cost::4.0` (cost per task, USD, lower is better). Each identity retains all 43
published model/effort rows, the exact SSR source capture, robots evidence and source locator.
These are `self_reported` vendor claims; source labels remain unmatched when no exact catalog
checkpoint/effort identity is published, rather than being guessed. The daily recipe uses the
robots-allowed HTML page and refuses a changed version/table shape.

## 2026-09-13 — Advanced comparison filter (H3)

Advanced mode now includes a folded **Better than a model** filter. Choose a reference
model and either a benchmark or category median; the table keeps only models above that
reference. Current measured values win. Retained bridge estimates can participate only when
they are explicitly marked approximate; missing and low-sample values remain unknown and
are excluded. This is a UI-only change: no dataset paths, benchmark rows, or public API
contracts changed.

## 2026-09-12 — Benchmark comparison snapshots on /compare (R8.1)

`/compare` gains release-post-style topic cards: each selected model's normalized measured
positions are averaged per topic, with exact coverage shown, and the full comparison table
highlights the best measured relative position per benchmark. The 0–100 card values are
explicitly not a new score. Missing and low-sample rows are excluded rather than drawn as
zero. In the same change the `/charts` open-vs-closed comparison stopped plotting a group
without measured scores as 0 (it is now unavailable). UI only — no dataset path, benchmark
row or API field changed.

## 2026-09-12 — Featured set derived from the AA Intelligence Index (R4.4)

`featured` is no longer a hand-kept family regex. It is now the **top 20 model families by
best AA Intelligence Index across variants**, deprecated families excluded, plus documented
pins (DeepSeek V4.1 Flash is pinned). The rule and the resulting list are published in
`dataset.json` under `build_diagnostics.featured_selection` and rendered on `/about#featured`.
Consequence for consumers that read `models[].featured`: the set is now 20 families (58
model rows on 2026-09-13) and follows the index (Gemini families can be featured; families
just outside the cut, e.g. Claude Sonnet 5, are not). The `FEATURED_RE` notes further down
describe the old mechanism. The cut-off is `FEATURED_TOP_N` in `scripts/build-dataset.mjs`.

## 2026-09-12 — Epoch Capabilities Index in the Composite (E1)

**Scoring change.** The Composite now has **seven** equal percentile slots: the previous five
plus Epoch AI's general ECI and Software Engineering ECI. Composite values from before this
change are not comparable with values after it; historical Composite values are never bridged
(`source_status.composite.status` is `recompute_required_on_definition_change`). New raw file
`data/raw/epoch-eci.json` (collected from Epoch's official exports; Software ECI is refit
from the published performance/difficulty exports with Epoch's sigmoid method and at least
two software benchmarks). Models gain `benchmarks.epoch_eci` and
`benchmarks.epoch_eci_software` (130 and 77 models on 2026-09-13) plus
`epoch_eci_attachment_note`; the API accepts `score=epoch_eci` and `score=epoch_eci_software`;
`composite_coverage` now counts out of 7. Family attachment is conservative: source models
without a unique catalog match stay unmatched rather than guessed.

## 2026-09-12 — Provider data policy, grouped settings, self-explaining table

**New data file for downstream consumers: `data/raw/openrouter-data-policy.json`.**
A daily snapshot of OpenRouter's published provider table, reduced to the two facets that
site exposes as filters: `does_not_train` and `zero_retention`. Each entry also carries the
derived `private` verdict (both true), the provider's headquarters, and any `override`.
Every parse is cross-checked against the counts OpenRouter prints for its own filters and
the collector fails rather than publishing a table it cannot reconcile. Collect it with
`npm run data:policy`.

- `dataset.json` additions (all optional, nothing removed or renamed):
  - offers gain `or_provider_slug` and `data_private`. `data_private` is **tri-state** —
    `true`/`false` mean OpenRouter publishes a verdict; **absent means unknown**, which is
    not the same as `false` and must not be rendered as "trains on your data".
  - `providers[]` gain `data_private` (worst known verdict across that channel's routes).
  - `sources.openrouter_data_policy` records when the snapshot was taken.
- **Chutes is an explicit, recorded override**: OpenRouter miscategorises it, so it is
  treated as satisfying both guarantees. The reason ships inside the snapshot itself.
- New UI filter "Trains or keeps your data" (off by default → such providers are excluded
  from every figure). Providers OpenRouter does not list are kept and labelled unknown.
- Fixed I/O blend gains **20:1 (the new default)** and **30:1**. The previous default of 20
  was not a selectable blend, so the stored value was rejected on load; the settings key
  moved to `mmc.settings.v7` to discard those payloads.
- `defaultMinFor("composite")` is now **86**, matching the shipped default, so "reset" no
  longer widened the list it was restoring.
- Overview table: sorts by score descending by default, the header shows the active score
  name, `#benchmarks` now counts distinct benchmarks with a result (previously it showed
  the 0–5 composite slot coverage), and `#benchmarks` is sortable.
- `/about` is restructured into anchored sections — `#adjusted-cost`, `#score`,
  `#data-policy`, `#identity` — and is where the long cost paragraph now lives.

## 2026-09-12 — Benchmaxxing tab: cross-benchmark estimates (~1 day after phase 11)

- New public tab `/benchmaxxing` ("Benchmaxxing") with navigation entry and read-only API
  `GET /api/benchmaxxing?model=<id>` / `?axis=<axisId>`. It estimates results on exact
  benchmark versions where a catalog model has **no result of any kind**, from an ordinary
  least-squares fit across catalog models measured on **both exact versions** (native units,
  roughly 95% prediction intervals; published only when the pair shares at least 12 measured
  catalog models and |Pearson r| ≥ 0.5; measured results only, low-sample and unmatched
  identities excluded).
- Every estimate is labelled **estimated · not a measurement**: it carries a roughly 95%
  prediction interval (residual noise × sample-size/leverage factor), the predictor value,
  `n` / `r` / `R²`, an extrapolation flag, and the observed cohort range for grounding.
  Versions and cohorts are never mixed or pooled, and estimates live only on this tab —
  they never enter rankings, radar charts or the Composite.
- The tab also adds carefully qualified **bottom-decile tags**: the worst decile of the
  measured catalog cohort on one exact benchmark version (at least 20 measured catalog
  peers, direction-adjusted, measured results only), with the model-level tag
  "Bottom decile on N axes" requiring at least 4 axes across at least 2 benchmark families.
  Missing benchmarks never count against a model; versions are never pooled; the tag is not
  a claim of overall worst.
- No raw benchmark path, score, ID, unit or Composite input changed; one additive UI tab,
  one additive read-only API, and targeted tests were added.

## 2026-09-12 — Phase 11: Real-SWE (Specific Labs) source

- Added the Real-SWE coding-agent board (`https://realswe.withspecific.com/`, canonical
  `https://withspecific.com/benchmarks/real-swe`) as a hash-bound, network-free source.
  The date identifies the snapshot: `realswe::snapshot-2026-09-12` (unit **percent**,
  higher-better, category Coding) and a separate `realswe-cost::snapshot-2026-09-12`
  (unit **USD per rollout**, lower-better, category Efficiency) — the cost is never folded
  into the score. Eight model+harness configurations × 10 public tasks × 8 runs = **640**
  scored rollouts, the source's own cross-check and the collector's.
- Model and harness are scored together and stay separate in the product: every
  observation keeps `subject.harness`, the presentation adapter groups one axis per
  benchmark+harness cohort, and two harnesses of the same model can never merge into one
  value. All rows carry `model_id: null` because the source publishes no catalog identity;
  they surface as unmatched source identities until a human mapping exists.
- Observations carry the native unit, basis `measured` (Specific Labs is the independent
  evaluator, not the vendor), a 95 % `confidence_interval`, and full source provenance.
  Cost rows carry a USD unit plus a `cost_provenance` block that flags the two
  lower-bound configurations (incomplete usage: Grok 4.6 and Kimi K3). Task-level pass
  counts (bestanden/8 per model) and the failure taxonomy (PASS 172,
  MISSED_REQUIREMENT 190, UNVERIFIED_ASSUMPTION 118, INTEGRATION_ERROR 136, REGRESSION 18,
  WRONG_FILE 6) are retained under `benchmark_results.details`, not as invented scores.
- The public sample limit is explicit, not hidden: `details.publication_scope` records
  10 published tasks / 8 runs / 8 configurations / 640 rollouts, and the UI prints
  "Public sample" on the axis. Only the 10-task sample is public; the values are never
  described as "all tasks".
- Collector `scripts/collect-realswe.mjs`, parser `lib/realswe.mjs` and tests
  `test/realswe.test.mjs` reproduce the snapshot from the stored bytes with no network
  access; `ingestion-lock.json` pins the page and chunk SHA-256, and the parser refuses
  drifted bytes. The `not_comparable` historical rows now carry a machine-readable
  `cause`/`cause_value` (`insufficient_bridges` / `spread_too_wide`) so the UI can explain
  why no estimate is published.
- No evidence file, score, ID, unit or API path was removed; the change is additive.
  Regression tests assert Real-SWE leaves the Composite slots and the AA v1.4/v1.5 Coding
  entries untouched.

## 2026-09-12 — Phase 10: historical retention and bridge comparison

### 2026-09-13 history extension

- Retained states now also include the six headline boards that live on model rows rather
  than in the registry: AA Intelligence/Coding, Epoch general/software ECI and both
  DesignArena Elo boards. They use stable history-only IDs and retain upstream source
  identities, raw snapshot hashes and locators without changing the 75-benchmark coverage
  denominator.
- Historical bridge projections now expose multi-hop `hops`, `path` and
  `chain_iqr_relative` fields through `/api/benchmark-view`; the direct hop remains preferred
  and every intermediate hop is subject to the same uncertainty gate.

- Every accepted score snapshot is now projected to an immutable, write-once dated state
  under `data/raw/benchmarks/history/states/<state_id>.json` with `index.json` as the
  ordered index; the id is `<yyyymmdd>-<content_sha256[0..8]>`, so identical observations
  dedupe and a re-run is a no-op. The daily refresh appends the state after the accepted
  scores write; `dataset.json` carries only state metadata.
- A model whose value vanished from the current board but exists in an older dated state
  or an older version of the same family receives a **labelled estimate** (`method:
  bridge-median-ratio`), never a measurement: median over ≥ 3 bridge configurations,
  with min/q1/q3/max spread, IQR relative to the median and the bridge count. Fewer than
  three bridges or an IQR above 25 % of the median yields `not_comparable` with
  `value: null`. Elo boards shift ranks (`bridge-rank-shift`), derived/composite indices
  are `recompute_required`, and a version change cites `source_benchmark_id` or
  `source_state_id`. `not_comparable` rows now expose `cause` (`insufficient_bridges` /
  `spread_too_wide`) and the concrete `cause_value`.
- `lib/benchmark-history.mjs`, `scripts/build-benchmark-history.mjs`,
  `test/benchmark-history.test.mjs` and `data/SCHEMA.md` document and test the policy;
  the UI/API attach estimates to their axis (`axis.estimates`) and never merge them into
  measured scores. No schema path, ID or unit was removed.

## 2026-09-11 — Phase 09: completion audit and published skills

- Owner verification pass over the live product: `benchmarkheaven.com` (and `www`) and the
  compatibility host both resolve and serve the current dataset; `/api/health`, `/api/meta`
  and all shipped routes return 200; branding and build date are current on both hosts.
  Health reports `{"ok":true,"db":false}` — no `DATABASE_URL` is configured and the product
  serves the committed static dataset, so `db:false` is expected here.
- Published the project's operational skills canonically under `ops/skills/` and installed
  them on the Sandy build server for Claude Code, Codex and opencode. Added two skills:
  `maintain-benchmarkheaven-registry` and `run-benchmarkheaven-gauntlet`; the existing
  collection/worker skills are copied unchanged except for phase-09 description-trigger
  edits to `collect-openrouter-efficiency` and `collect-chutes-io-ratio`. Installation
  receipt with SHA-256 hashes:
  `ops/rebuild-2026-09/evidence/phase-09/skills-install.json`.
- Added `ops/rebuild-2026-09/EXPLAINER-VIDEO-BRIEF.md` (source-backed narrative and
  screenshot plan) and produced the narrated German explainer video from it on Sandy
  (6 beats, 49 s, 1920×1080 H.264/AAC, 2.93 MB, retained at
  `ops/rebuild-2026-09/evidence/phase-09/benchmarkheaven-de.mp4`). Delivered to Florian
  via `@cursor_noti_bot` `sendVideo`, with the German completion Telegram
  (`message_id 13546`).
- **Known gap:** Florian's WSL machine was unreachable from Sandy, so the skills are not
  installed there; documented in `COVERAGE.md` (W28) and the receipt.
- Re-verification (attempt 3): canonical checks re-run green (build 839/654/90/2801,
  178 tests, `tsc` exit 0) and all three hosts still 200. Added
  `bin/verify-skills-discovery.mjs`, which re-hashes every installed skill and records a
  real runtime-discovery test for opencode (Claude Code/Codex path-verified only);
  evidence in `evidence/phase-09/runtime-discovery.json`. Also added `run-phase.sh`/`tick.sh`
  self-healing so a clean `rc=0` run that leaves the status on `RUNNING` is marked `DONE`
  (previously it burned a retry). The WSL gap above is unchanged.

## 2026-09-11 — Daily automation

- Replaced the daily Codex prompt loop with staged collection, dynamic AA >=34
  OpenRouter worker selection and different-family source review.
- Added efficiency/cache, registry and public/vendor benchmark refresh checks;
  incomplete candidates preserve prior values and observation dates. Coding Agent
  v1.5 is current; the dated v1.4 Composite input remains unchanged.
- Runtime moved to `/opt/benchmarkheaven-daily/`; `/opt/mmc-daily/` remains a symlink
  and the 05:17 UTC schedule is unchanged. Public API and consumer data paths remain
  compatible. New audit files live under `data/raw/benchmarks/daily-evidence/` and
  `daily-checks.json`; expiring reviewed source withdrawals are recorded separately.
- No routine success notifications. Confirmed-send deduplication, weekly failure
  alerts, notable data events and subscription-only operator escalation.

## 2026-09-11 — New domain: Benchmark Heaven at benchmarkheaven.com

- **The product is renamed Benchmark Heaven** (formerly Model Market Comparison).
- **New primary base URL: `https://benchmarkheaven.com`.**
- **The previous base URL `https://model-market-comparison.app.mintapis.com` remains
  valid as a compatibility URL and serves the same endpoints and dataset.** No consumer
  migration is required; both hosts stay attached.
- **Nothing else moved:** the GitHub repo, repo file paths, JSON schema, model/offer/
  benchmark IDs, units, the Composite definition and settings storage keys are unchanged. Browser preferences are per origin, so
  saved filters/theme on the old hostname are not transferred to the new hostname.
- The fetch scripts' HTTP User-Agent now identifies the collector as Benchmark Heaven;
  the contacted GitHub project URL inside it is unchanged.
- New Observatory mark, favicon, touch icon, light/dark identity, serif display typography,
  social card, metadata, README header, and branded fork-sync/Telegram templates.
- Older entries below keep the previously correct hostnames as their historical record.

## 2026-09-10 — Phase 04: benchmark discovery

- Added a versioned benchmark registry with verified publication routes, scoring semantics,
  provenance and an exclusion ledger, including public and independent writing/RP boards.
- Retained AA's previously discarded benchmark fields as raw observations with a fail-closed
  extractor. Coding Agent Index v1.4 and v1.5 remain separate; the legacy date is unchanged.
- Dataset builds validate registry evidence. Public API scores and Composite inputs are unchanged.

## 2026-09-10 — Phase 03: effective task costs

- Comparisons default to modeled USD/task, combining exact-variant task tokens, usage I/O and exact-endpoint cache statistics, with every fallback explained.
- Raw list prices and six fixed I/O scenarios remain selectable; settings move to `mmc.settings.v6`.
- The explorer starts at cheapest adjusted cost and measured task-token data; minimum benchmark scores make the cost/capability question directly filterable.
- Every selected price has a keyboard/touch explainer; charts and averages expose their constituent prices.
- Retired a Sol override that mixed first-party list rates with OpenRouter cached rates. Raw API units and data paths remain unchanged. See [cost policy and five-model checks](docs/effective-cost.md).

## Where to find the data (canonical, stable)

- **In the repo** (updated ~daily by an automated refresh commit to `main`):
  - `data/dataset.json` — the full built dataset (models, families, offers, scores, sources).
  - `data/raw/*.json` — per-source snapshots (ArtificialAnalysis, OpenRouter, DesignArena, per-provider catalogs, `manual.json` overrides).
  - `data/gateways.json` — gateway comparison data.
- **Live API** (same JSON shapes as the repo, CORS `*`; see [API.md](API.md)):
  - Base URL: **`https://benchmarkheaven.com`** (compatibility: `https://model-market-comparison.app.mintapis.com`)
  - `GET /api/dataset` · `GET /api/models` · `GET /api/providers` · `GET /api/meta` · `GET /api/health`

## 2026-09-10 — rebuild phase 02

- Add `models[].token_efficiency` with dated AA output-tokens-per-task/canonical benchmark counts and workload I/O evidence. Exact OpenRouter usage takes priority; the Chutes global fallback is explicitly assumed. AA ratios remain benchmark proxies.
- Add `efficiency.openrouter_endpoints[or_model_id][endpoint_tag]` with provider names, exact endpoint identities, cache-hit statistics, dated cache read/write prices and sparse-coverage statuses. Base provider labels never join endpoint telemetry.
- Add explicit coverage, unmatched AA rows, provenance and failed/uncollected-attempt records. Preserve all historical metadata field dates, existing prices, score meanings, URLs and file locations.
- Add three atomic collectors, parser/identity/failure tests and reusable collection skills. Daily refresh gains AA efficiency, one weekly OpenRouter ranking plus four model pages in rotation, and seven completed days of Chutes aggregate usage.
- Optional Postgres seeding adds `dataset_meta.extensions` to retain additive metadata; production continues to serve bundled JSON. See [API.md](API.md#phase-02-additions--token-and-caching-evidence-2026-09-10) for the full schema. Adjusted costs and UI follow in subsequent phases.

## 2026-09-10 — rebuild phase 01

- Repair AA metadata parsing for slug-based Flight records and retain historical identifiers/licensing with their original per-field source dates. Refresh AA, OpenRouter and DesignArena; restore all 68 v1.4 Coding Agent rows.
- AA changed the Coding Agent benchmark to v1.5. Collect it into `data/raw/aa-coding-agents-v1.5.json` with strict validation and atomic writes. Preserve the existing Composite and v1.4 collection date; explain the separation in `/about` and `source_status`.
- Track daily runner/prompt in `ops/daily/`; use the tested collector and subscription-only Codex auth. No data URLs or existing score fields moved.

## 2026-09-08

- **New featured models:** GPT-6 Astra, GLM-5.3 Flash, Muse Spark 1.3, Qwen3.8 Max 0902
  (`FEATURED_RE` in `scripts/build-dataset.mjs`).
- Provider catalogs refreshed, including the previously unfinished AWS/Azure/Vertex,
  Claude direct, Copilot and T-Systems checks. AA / DesignArena / OpenRouter /
  Coding-Agent snapshots refreshed. See [audit details](data/research/refresh-2026-09-08.md).
- `scripts/fetch-live.mjs`: the ArtificialAnalysis fetch now tolerates up to 3 API models
  whose leaderboard metadata hasn't rolled out yet (ships them with null metadata instead
  of aborting the refresh). Empty/broken feeds and larger mismatches still fail.
  `aa_metadata.available`, `aa_metadata.is_open_weights` and `aa_metadata.deprecated`
  expose missing metadata; existing top-level booleans stay compatible.
- Cron was active at 05:17 UTC daily; today's failed fetch was the blocker. Its server
  prompt now builds before testing, so production prerender checks use current output.
- **Auto-deploy verified:** GitHub pushes now trigger Coolify via webhook; older
  documentation saying pushes do not deploy was stale. Explicit redeploy is a fallback.
- **No DB/schema migration**: production serves bundled JSON without `DATABASE_URL`.
  Routes and repo file paths are unchanged. Check individual `sources` dates, not
  just `generated_at`. The daily cron refreshes the four live benchmark/router sources;
  manual provider catalogs retain separate audit dates.
- Copilot: 29 current token entries / 19 legacy multiplier entries. Claude direct:
  13 callable models; Opus 4.1 retired, Fable/Mythos 5.1 cache pricing captured,
  cancelled Sonnet 5 price increase removed.
- Azure Astra is documented but direct prices remain null until a named Retail meter
  is published. OpenRouter Azure prices remain separate. Qwen3.8 Max 0902 has prices
  but no exact benchmark yet; no score copied from bare Qwen3.8 Max.

## 2026-08-26

- **Hosting/base URL changed:** the reference deployment moved from Render
  (`model-market-comparison.onrender.com`, suspended 2026-08-25) to
  **`https://model-market-comparison.app.mintapis.com`** (Sandy/Coolify). All API routes
  and JSON shapes are unchanged — only the host is new. See [DEPLOYMENT.md](DEPLOYMENT.md).
- **Filters removed:** the "Hide GPT-5.5 / Opus 4.8" and "Hide Fable" global toggles are
  gone; `isHiddenModel` no longer exists in `lib/cost.ts`. Persisted settings key bumped
  `mmc.settings.v4` → **`mmc.settings.v5`**.
- Deep catalog audit (AWS Bedrock EU-Geo Claude prices corrected, FX refresh, delistings);
  featured-set regex hardened with `(?!-)` lookaheads; `scripts/top5.mjs` added
  (top-5-by-Composite snapshot used by the daily refresh notifier).

## Earlier

The daily data-refresh commits ("Refresh …") only touch `data/` (and occasionally test
pins) and never change API routes or file locations. For app-level history before this
file existed, see `git log`.

## 2026-09-11 — Phase 06 benchmark explorer

- Added `/benchmarks` rankings, a standalone `/radar`, and up to four exact configurations on `/compare`, with source scales, versioned evaluation groups, selectable axes and explicit sparse coverage.
- Added complete per-model benchmark sheets, conservative explainable profile signals, and protocol-compatible divergence displays.
- Revamped navigation, light/dark themes, keyboard focus and disclosures; retained adjusted-cost and provider comparisons. Coding Agent v1.4 and its September 9 Composite source remain unchanged; v1.5 is separately visible.
- Added the compact benchmark presentation endpoint and exact observation lookup; canonical source/dataset fields and paths remain compatible. No benchmark value was changed or invented.

- Phase 06 release follow-up: update Next.js to 15.5.25 and compatible PostCSS 8 resolution; clean npm audit reports no remaining findings. Benchmark data and Composite definitions are unchanged.
