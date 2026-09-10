# Recon findings (Claude, 2026-09-10) — read this before researching anything

These were the three riskiest unknowns in the brief. Two are solved; the third has a
starting point and a dead end you do not need to repeat.

---

## 1. Artificial Analysis: token-efficiency data is already in the homepage payload ✅

`scripts/fetch-live.mjs` already downloads `https://artificialanalysis.ai/` and parses the
RSC payload for model metadata (`parseArtificialAnalysisMetadata`, the `{"id":"…` objects).
**The same row objects also carry the token-efficiency data** the brief asks for. Verified
by fetching the homepage on 2026-09-10 and bracket-matching one row:

```json
{
  "id": "093b9df2-…", "slug": "gemini-3-5-flash-lite", "name": "Gemini 3.5 Flash-Lite",
  "price1mInputTokens": 0.3, "price1mOutputTokens": 2.5,
  "canonicalIntelligenceIndexTokenCount": {
    "input": 1296279040, "output": 59475163, "answer": 10635658, "reasoning": 48839505 },
  "intelligenceIndexOutputTokensPerTask": {
    "reasoning": 10405.15, "answer": 7101.55, "output": 17506.70 },
  "intelligenceIndexCostPerTask": …, "intelligenceIndexTimePerTask": …,
  "cacheHitPrice": …, "cacheHitDiscountPercent": …,
  "timeToFirstAnswerToken": { "input": …, "reasoning": …, "total": … },
  "intelligenceIndex": …, "intelligenceIndexIsEstimated": …, "isReasoning": …,
  "isOpenWeights": …, "deprecated": …, "sizeClass": …, "parameters": …,
  "price1mBlended0To100To1": …, "price1mBlended0To1To1": …, "price1mBlended0To3To1": …,
  "price1mBlended100To1To1": …, "price1mBlended7To2To1": …,
  … plus benchmark fields, see §2
}
```

**What this gives you directly:**

- **Brief §2 A2 (tokens per task)** — `intelligenceIndexOutputTokensPerTask.output`, split
  into `reasoning` and `answer`. This is exactly the "Output Tokens per Intelligence Index
  Task" chart Florian screenshotted.
- **Brief §2 A1 (input:output ratio)** — `canonicalIntelligenceIndexTokenCount` is the
  measured token budget of the whole Intelligence Index run: `input` vs `output` gives a
  real per-model I/O ratio (the sample above: 1.296e9 : 5.95e7 ≈ **21.8 : 1**, which is far
  more input-heavy than the blends the app currently uses, and much closer to agentic
  coding usage than a 3:1 blend). It also separates `answer` from `reasoning` output.
  AA's own blended-price fields (`price1mBlended*`) tell you which blends they publish.
- **Partial §2 A3** — `cacheHitPrice` and `cacheHitDiscountPercent` give the *price* side of
  caching per model. The *hit rate* per provider still has to come from OpenRouter.

**The catch:** on the homepage only the ~24 models currently selected for the chart carry
`intelligenceIndexOutputTokensPerTask` (23 occurrences on 2026-09-10; the UI says
"24 of 645 models"). Before writing a scraper for all 645, check in this order:

1. the AA **v2 API** you already have a key for — `evaluations` on
   `/api/v2/data/llms/models` did **not** contain token counts on 2026-09-10 (checked:
   only `median_output_tokens_per_second`, `median_time_to_first_token_seconds`,
   `median_time_to_first_answer_token`, `context_window_tokens`); look for a separate
   endpoint (efficiency/tokens/cost) before assuming it does not exist;
2. the dedicated chart page `https://artificialanalysis.ai/?intelligence-efficiency=output-tokens-per-task#intelligence-efficiency-tabs`
   and the leaderboard pages — the payload there may carry the full set or accept a
   filter/pagination parameter;
3. per-model pages `https://artificialanalysis.ai/models/<slug>`;
4. only then a paginated scrape, politely rate-limited.

Reuse the existing parser: unescape `\"` → `"`, then bracket-match from `{"id":"` with a
string-aware scanner (the code is already in `scripts/fetch-live.mjs`).

---

## 2. Free benchmarks lying on the floor ✅

The same AA row objects contain benchmark fields the app does **not** ingest yet. Observed
key names on 2026-09-10:

```
aime25, analystAgent, apexAgents, automationBenchPartialScore, briefcaseBreakdown,
briefcaseTotalCost, critpt, enterpriseOpsGym, gdpPdfAllPass, gdpval, gdpvalBreakdown,
gdpvalNormalized, gpqa, hle, ifbench, itBenchSre, lcr, livecodebench, mlcrOverall,
mmmuPro, omniscience, omniscienceBreakdown, scicode, tau2, tauBanking,
terminalbenchHard, terminalbenchV21, terminalbenchV40, indexCompute, timescaleData
```

Note `terminalbenchV21` **and** `terminalbenchV40` side by side — the versioning problem
from the brief is real and already present in this one source. Treat `terminalbench` as a
family with two distinct, non-comparable versions.

`timescaleData` looks like a historical series — worth inspecting; it may give score-over-
time for free, which would be a strong differentiator for the app.

This is the cheapest possible expansion of the benchmark universe: no new source, no new
scraper, just fields we already download and throw away. **Do it before the X sweep.**

---

## 3. OpenRouter caching / usage statistics ⚠️ starting point

- The public API (`/api/v1/models`, `/api/v1/models/{id}/endpoints`) gives prices, incl.
  cache read/write prices, plus `uptime_last_30m` — but **no cache-hit rate and no
  token-volume statistics**. We already ingest this.
- The frontend paths I probed on 2026-09-10 return HTML, not JSON:
  `GET https://openrouter.ai/api/frontend/stats/endpoint?permaslug=…&variant=standard`
  and `GET https://openrouter.ai/api/frontend/models/find?slug=…` — both served the SPA
  shell. Either the paths have changed or they need headers/cookies. **Do not burn tokens
  re-probing those two exact URLs.**
- Approach that is most likely to work: load `https://openrouter.ai/moonshotai/kimi-k3`
  (the page Florian named) and parse the **Next.js RSC payload embedded in the HTML**, the
  same technique that works for Artificial Analysis. The pricing/stats section is rendered
  from data that must be in that payload. Find the field names once, write them down in the
  skill, and the daily job becomes a cheap fetch-and-parse forever.
- Also check OpenRouter's public rankings/analytics pages for per-model token volumes,
  which would independently corroborate the input:output ratio from §1.
- Respect their robots.txt and rate limits; a handful of requests per day with a real
  User-Agent and a delay is fine, a crawl of every model page every day is not — cache and
  refresh in rotation.

---

## 4. Chutes fallback for typical LLM I/O ratios

`https://api.chutes.ai/openapi.json` is the documented entry point; `CHUTES_API_KEY` is
env-wide on both machines. Use it only as the fallback source for a *global* typical ratio
if per-model data is unavailable — §1 should make that unnecessary for most models.

---

## 5. Environment facts you would otherwise have to discover

- **Sandy**: `codex-cli 0.147.0`; `codex exec -m gpt-6-astra -c model_reasoning_effort="xhigh"`
  works (it prints a harmless "Model metadata … not found. Defaulting to fallback metadata"
  warning). Codex is authenticated **with an API key**, so your tokens are billed — hence
  the delegation rules. Node v20.19.4, npm 11.12.0. Disk `/` is at **90 % (46 G free)** —
  do not leave large artifacts around, and check before any big download.
- **Secrets on Sandy** (`/root/.config/dev-secrets.env` unless noted): `OPEN_ROUTER_API_KEY`
  (underscore between OPEN and ROUTER), `ARTIF_ANALYSIS_API_KEY`, `ELEVENLABS_API_KEY`,
  `DEEPSEEK_API_KEY`, `HF_API_KEY`, `GITHUB_PAT`, `SERPER_API_KEY`, `BRAVE_API_KEY`;
  `CHUTES_API_KEY`, `TG_BOT_TOKEN`, `TG_CHAT_ID` are in `/etc/environment`.
  **No Namecheap and no Cloudflare credentials exist anywhere** — DNS for
  benchmarkheaven.com must go through the Namecheap web UI or through Florian.
- `~/.config/opencode` exists on Sandy but `opencode` was not on PATH in a non-interactive
  shell on 2026-09-10 — check `~/.opencode/bin`, `~/.local/bin`, or install it.
- **Repo state on Sandy at handover:** `/opt/model-market-comparison` was on `1b02aee`
  ("Refresh market data…") with an uncommitted worktree (`data/dataset.json`,
  four `data/raw/*.json`, `lib/aa-metadata.mjs`, `scripts/fetch-live.mjs`) left over from a
  failed daily run, and the last daily summary reported a red test suite and an incomplete
  coding-agent scrape. **Phase 1 must clean this up first** — commit what is good, discard
  what is not, get `main` green, and only then start building.
- The Coolify app is `ggbs6upie6tqsousmrkw0vja`; `/opt/mmc-daily/redeploy.sh` triggers a
  deploy and waits for the live snapshot date. A GitHub webhook now also auto-deploys on
  push (verified 2026-09-08), so the explicit redeploy is a fallback, not the main path.

---

## 6. Worker-model reality check (measured 2026-09-10)

`bin/pick-worker-models.mjs` was run against the live OpenRouter catalog joined with our own
AA Intelligence Index. Result at handover:

- **No `:free` OpenRouter model currently clears the AA index ≥ 34 bar.** The free models
  that AA *has* scored are all below it (Inkling 32.2, Nemotron 3 Ultra 29.3, Gemma 4
  13.9/15.2 → excluded). The two Florian named, `nex-agi/nex-n2.5-pro:free` and
  `inclusionai/ling-3.0-flash-vl:free`, are simply **not scored by AA yet** — they are new.
  They are therefore listed as `free_unverified`: promising, but not to be trusted with
  data-bearing work until you have evidence. Smoke-test them against tasks with known
  answers (e.g. re-extract a page we already have verified data for and diff), and if they
  hold up, record that evidence in the skill and use them.
- **The safe default worker is `deepseek/deepseek-v4-flash-0731` at ~$0.07/$0.18 per 1M**
  with AA index 40.8 — near-free in practice, comfortably above the bar. `z-ai/glm-5.3-flash`
  (46.2, $0.15/$0.50) is the better-quality step up; `openai/gpt-5.6-luna` (43.4) is a good
  third family for critic passes.
- **Kimi K3 via Chutes is free for us** (`CHUTES_API_KEY`) and is the right choice for
  agentic file work through opencode (`worker.sh --agent`).
- Gauntlet rule in practice: the critic must come from a *different vendor family* than the
  producer — DeepSeek → GLM → GPT-Luna rotate nicely.

- Caveat on the picker: the 2026-09-08 `lib/aa-metadata.mjs` refactor **dropped
  `aa_metadata.openrouter_api_id`** from the dataset, so nothing in `data/dataset.json`
  now carries an explicit OpenRouter identifier (`offers` have no `or_model_id` either).
  `pick-worker-models.mjs` therefore joins by normalized slug/family name, which is
  approximate. **Restoring a real OpenRouter id on each model is a cheap, high-value fix**
  — do it in phase 2 while you are in the ingest code; it makes this picker exact and helps
  the caching-statistics join in §3 as well.
