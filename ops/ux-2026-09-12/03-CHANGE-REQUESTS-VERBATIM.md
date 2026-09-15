# Florian's change requests, verbatim (from 2026-09-14 on)

Same authority as `00-REQUIREMENTS-VERBATIM.md`: **if the brief (`04-CR-BRIEF.md`) and this text
disagree, this text wins.** Where a change request here contradicts `00-REQUIREMENTS-VERBATIM.md`,
**the newer text here wins** (the conflict is named in `04-CR-BRIEF.md`).

Florian announced more change requests will follow. Each new one is appended below as its own
dated section, verbatim, and gets its own block of checklist rows in `04-CR-BRIEF.md` and
`PROGRESS.md`. Standing instruction for all of them (Florian, 2026-09-14): implement them **on the
Hetzner server, in good quality, with the same gauntlet loop technique** as the rest of this
workstream.

---

## CR-20260914 — Benchmarks tab as release-style comparison table, presets, accounts, mobile header, simple-mode sections, default sort

Reference image: `ops/ux-2026-09-12/assets/cr-20260914-benchmarks-table-reference.png`
(Florian's `./tmp/benchmarks-table.png`).

<requirements>

Let's change how the benchmarks tab shows up. When it opens, I want it to show a table like the typical benchmark comparison table that you get for new model releases. Find an example here: ./tmp/benchmarks-table.png (you can use a different style that fits or web app design, but so that you get the idea). Additionally, to the table, I want a chart - a bar chart, that shows all the models and the most important benchmark scores.

In this table we auto select the top 5 models from the filter selection and these are shown in the columns. The user must have an extremely convenient way to change the selection of compared models, basically I'd love to offer the user multiple options how to select that list and one of it should be a compination of our filter panel and the simple overview page pareto diagram with the sliders. The rows are all the different benchmarks. Let's list them by category. For example, all the coding benchmarks are next to each other, then all the general reasoning ones, then all the math ones, and so on. The cells should show the benchmark results, but also, like in Excel, add a data bar background (but subtle) so that it's visually more obvious which benchmark is performing better. Also, the winning one in each row should be shown with bold numbers in this cell so that it's visually clear which one is the winning one.
The benchmark names column (very left column) should have some tags, to clarify which are top benchmarks (e.g. the AA Index ones, the DesignArena ones, the very well known ones) and which ones are more niche, or cmomunity owned ones.

Let's make sure this table is extensive in the number of rows. We kind of want to show off how many benchmarks we have. For example, we should include the Artificial Intelligence Index, but also include all the individual benchmark result values. This index consists of a couple of results from artificial analysis, not only one or two, because we don't only show the index results but also the detailed results. Of course, each cell should be clickable and lead to a detailed comparison page where you can see where the number comes from and the source, and maybe the model and its other results.  Also there should be options to reduce the table to a selected list of benchmarks, including some presets like All, Important ones, etc (come up with good ideas) and user should also be able to configure and save these presets. We'll also need presets for model list. Also the filter options should have presets. For presets let's always offer some nice ideas from us + allow custom presets).
Let's also add sign in with google and store users and store their settings and presets in their user accounts, alternatively we only store in local storage, but then lets notify the user with a toast that we suggest signing in so that these presets aren't lost and synced across browsers.

This page really needs to look excellent and very intuitive.

Another thing that I noticed is: on the main page in simple mode, on a mobile portrait screen: in this header bar, we currently only show "Filters" and "Menu".
I would have liked to see the "Benchmarks" menu option there as well. Improve this. Maybe it's a good idea to rename "Menu" to "More" and left of it put the "Benchmarks" option.
And then maybe in the layout of simple mode let's make this landing page section that currently focuses on the simple Price/Capability focused overview (tracbars for min capability and max price, pareto diagram, overview table) only, consist of two sections: this Price/Capability overview and the Benchmarks section, which should show kind of a simple version of that Benchmark list. But let's also make clear to the user that this is the simple version and a more sophisticated version exists and the user can switch to that one (but that one maybe is better suited for desktop browsers than mobile browsers - maybe we should show a quick toast somewhere).

Also, I think the default sorting of the overview table of models should be: descending by score.

Make sure all these things are being implemented on the Hetzner server. You can use Claude Code with Opus 5 for that, optionally give the UI a quick design pass using Fable 5.1 but let's use Fable 5.1 sparingly as it consumes our token budget too fast. Make sure also Hermes knows about my recent changes. We will now add more change requests, and for all of these, make sure they are being implemented on the Hetzner server, in good quality, and with the same gauntlet loop technique that we are also using for the other things. When you start these new changes requests, take a look at what is currently running regarding benchmark heaven to make sure that stuff and the new change requests don't collide. You may stop the old agent and start a new one that finishes the old ones stuff but also knows about the new tasks, if you think that's a good idea.

</requirements>

---

## CR-20260915 — Landing tagline, Pareto chart, benchmark table/cost modal, compare tab/radar, value signals/Benchmaxxing, subscription-cost modeling

Six messages, Telegram, 2026-09-15, 08:52–09:34 UTC. Standing instruction from CR-20260914
still applies: Hetzner server, gauntlet loop technique, Claude Code Opus 5 with Fable 5.1
sparingly.

<requirements>

### 08:52 UTC — landing tagline + Pareto chart

Let's use:

The most detailed cost–capability analysis in AI.
Every model. Every Benchmark. Actual Costs.

Anything you would critique about that?

Also: let's invert the X-Axis of the pareto chart and put a slight greenish background gradient (diagonal gradient going from fully transparent bottom left to pretty opaque green top right) into the topright quarter of the chart background, together with a subtle small note top right 'most attractive quadrant'

Also currently we say "get up to 15 recommended models". Let's extend this. Let's annotate maximum 15 models with their name in the chart, but let's add actually up to 30 models (if possible do so by a top 30 ranking of scores in AA Intelligence Index or ECI, while keeping all the other filter settings in place and just relaxing the "featured models" filter so that we include a larger list for this pareto chart and the overview table, even in simple mode.

### 08:54 UTC — benchmark table rows, category composites, more coding benchmarks, cost-modal simplification

some more change requests for benchmark heaven, this time regarding the benchmarks:

In the Benchmark Table (both in simple view and advanced view and the actual tab):
- let's add an extra row above all the other benchmarks and make that one kind of visually highlighted and that line should shouw our curently chosen Score (e.g. the Composite score of Benchmark Heaven) and call it "Benchmark Heaven Score (Main Composite Score)" - the part "(Main Composite Score)" can be in small font in second line of text.
- Let's make the category headers (e.g. "Composite indices" or "Coding" or "Agentic & tool use") a bit more emphasized, it doesn't stand out currently, maybe we should give it a sdifferent color or make the font bigger/bolder? Find a good looking design improvement. Also: let's treat each of these category headers as a different composite score and fill in the numbers in the cells - I think for the users it's interesting to see a composite, for example, for all the coding benchmarks
- I think we don't show enough benchmarks here. I noticed that the Coding section for example only contains a single benchmark (SciCode), which totally isn't what I want: I want this section to contain a lot of benchmarks, for example all the ones that are part of the AA Coding Index. We need to show e.g. FrontierCode, CursorBench 4.0, DeepSWE v1.1, Terminal-Bench 4.0, and SWE-Atlas-QnA and maybe others as well, if you find good sources for many of the new models, e.g. SWE-bench-Live, SWE-Lancer LiveCode  bench and SWE Bench (verified, Pro, etc, multiple variants) and Codeforces, BigCodeBench etc

also: I clicked on the price shown in the Cost cell of the overview table (simple mode) for the model GPT-6 Astra and the modal dialogs infos that came up had a couple of issues:
- we should state clearer that we use the tokens per task data from AA to calculate token efficiency, and the caching efficiency data from openrouter and the cheapest provider that survives the filter options and the strongest reasoning variant of the model found in benchmark data, and remove some of the complexity we show there. it's too much text currently, nobody will read all that.
- unter Assumptions and limitations there is a lot of text that would make me as a user feel very uncertain about the quality of the data and also it's really hard to understand what this section says. (currently it says: "Cache-hit rate missing/invalid: 0% assumed; no cache discount credited.
- Cache-read price missing/invalid: regular input price assumed; no read discount.
- Cache-write volume unmeasured: 0 additional billed write tokens assumed; write charges are excluded.
- Cache-write price missing/invalid: regular input price assumed (only charged if write tokens > 0).
- I/O ratio assigned from fallback evidence; assumed for this model and task.
- AA output/task combined with general usage I/O is a modeled workload, not a measured coding-agent bill.
- Selected catalog tier only; per-request context premiums, cache storage, tools, retries and taxes are not modeled."). So let's remove that section completely. Try to make sure to find cahe chit rates/prices and if you don't take industry typical assumptions instead of assuming 0% (whioch is unrealistic). Sources is good.

  - for Input/output ratio we currently show "Chutes LLM usage statistics" which is kind of looking highlighted because it's a link (and thus underlined and different color) and that feels weird, so let's change the text that currently says "Chutes LLM usae statistics" to "Proxied from public available LLM usage statistics from a inference provider [link]" and then only use the "[link]" section of that text for the  actual link.

let's make sure all this is implemented perfectly, using gauntlet loop prompting technique. if you need to add new benchmarks to the data intake / update list, go for it

### 09:01 UTC — compare tab defaults + radar

more change reuqests for benchmark heaven:
In the compare tab when I open it, it suggests a comparison of GPT-5.6 Sol (high) and Claude Sonnet 5, which is quite a random choice. Let's pre-populate the list with the two most capable models (currently Fable 5.1 and GPT-6 Astra). Also the Benchmark radar isn't ideal yet, it must be improved. for example I noticed that GPT-5.6 Sol shows as almost full in AA Coding Index, while only achieving a score of ~55. We need to scale the axis differently, for this case I think it's a benchmark that goes from 0-100 so 55 would be a bit more than half only. Also on hovering or tapping we need to show the actual score values. I also don't think the current selection of 6 axis is ideal. GPQA Diamond for example is saturated. Choose good, up to date benchmarks. The AA Indices, the ECI ones, the most important DesignArena ones, maybe some others. We should maybe also add some presents there, but this sounds like a good default. Let's also offer a toggle/switch to change from this simple radar to a super complex one like we use in Benchmaxxing screen

### 09:10 UTC — cost-cell value signal, Benchmaxxing defaults, signal-score styling, master-detail compare

one more note: the overview table has this cost column: I think we should color or highlight the notable cheap or expensive (in relation to their capability score) models in the cost cell somehow, maybe with color or a small tag or something that looks good.

another thing: in the Benchmaxxing screen the current default model selection isn't good. let's select up to date top models like the featured list or something by default. also let's make this just a preset and changable.

and Signal coli, and signal score must be way more expressive, it must look like a warning (e.g. a small tag/pill that looks like a warning if score above 25).
per-model report should not have its own model selector but instead react to the selected model in the table about - let's make it a master-detail like view. also let's allow comparing two models side by side with that chart optionally (compare mode)

### 09:11 UTC — subscription-cost modeling, first pass

I also researched the ChatGPT and Claude subscription rules. try to represent it clearer into our user interface and cost calculation mechanics:
Guidance for BenchmarkHeaven's cost model:
Individual ChatGPT Plus/Pro and Claude Pro/Max subscriptions can be used for commercial coding; they are not private-use-only. However, account-sharing, integration, and usage restrictions apply. They are not interchangeable with API access, and their variable allowances cannot reliably be converted into a fixed $/million-token price.
Keep clearly labeled API pricing as the default comparison, with a small "Subscription costs may differ" note and a collapsible explanation. Treat this as a secondary topic, not the opening question in guided mode. Explain that subscriptions can be substantially cheaper for heavy users, but effective cost depends on utilization, workload, and limits.
Optionally offer an assumption-based subscription estimate:
Average cost/task = (allocated monthly subscription fee + applicable extra usage charges) ÷ monthly completed tasks.
Let users select a plan and edit usage assumptions, with any defaults explicitly identified as assumptions--not guaranteed capacity. Only apply this to supported subscription workflows. Keep subscription estimates visibly distinct from API costs in comparisons, and do not invent token allowances or assume unlimited usage.

### 09:34 UTC — subscription-cost modeling, updated notes (this wording supersedes the 09:11 pass where they differ)

updated notes about the ChatGPT Plus/Pro and Claude Pro/Max subs:

ChatGPT Plus/Pro and Claude Pro/Max should not be treated as universally business-safe subscription equivalents to API usage. Commercial-use eligibility is provider-, plan-, region-, and contract-dependent. In particular, Claude Max/Pro may fall under consumer terms that can restrict business use in some jurisdictions, while Claude Team/Enterprise/API are the safer commercial categories. OpenAI's terms more explicitly contemplate business use, but subscription access still has account-sharing, resale, automation, and rate-limit restrictions.
For cost comparisons, keep API pricing as the clean default baseline. Add a small secondary section for subscriptions that says:
Subscription plans can make effective per-task cost much lower for heavy users, but they are not fixed token bundles and may have variable/session/weekly limits. Their effective $/task or $/1M-token cost therefore depends on utilization and cannot be stated as a universal number.
Optionally support an assumption-based estimate:
Effective cost/task = monthly subscription cost ÷ completed tasks per month
Let users choose the plan and usage assumptions, and clearly label the result as an estimate. Keep subscription economics separate from API pricing, and flag commercial-use eligibility where it is not clearly covered by business terms.

</requirements>

### Pointer files and wording check (Claude Code, 15 Sep 2026)

These six messages were also written out as five separate task briefs before this canonical
section existed. They remain useful as more detailed, implementation-oriented briefs — but
**this section above is the wording of record** if the two ever disagree:

- `/home/flori/benchmarkheaven-next-change-request-20260915/REQUEST.md` — tagline + Pareto
  chart. Difference: it renders the tagline as "Every model. Every benchmark. Actual costs."
  (lowercase "benchmark"/"costs"); Florian's own message capitalizes both ("Every Benchmark.
  Actual Costs."). The file itself flags this and asks to keep sentence capitalization unless
  a deliberate brand-style decision is documented — treat Florian's capitalization as correct
  unless he says otherwise.
- `/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/REQUEST.md` — benchmark
  table + cost modal. Difference: the replacement link text is corrected for grammar to
  "Proxied from publicly available LLM usage statistics from an inference provider [link]";
  Florian's message literally said "Proxied from public available LLM usage statistics from a
  inference provider [link]" (missing "-ly" and wrong article). The grammar fix is almost
  certainly what he wants, but the exact string differs from his message — worth a quick
  confirmation if being pedantic about "implement exactly as requested."
- `/home/flori/benchmarkheaven-compare-radar-20260915/REQUEST.md` — compare tab + radar. No
  material wording difference found; faithful paraphrase.
- `/home/flori/benchmarkheaven-value-benchmaxxing-20260915/REQUEST.md` — cost-cell value
  signal, Benchmaxxing defaults, signal-score styling, master-detail compare. No material
  wording difference; the file correctly flags "Signal coli" as unclear wording to resolve
  against the actual product UI rather than guessing what Florian meant.
- `/home/flori/benchmarkheaven-subscription-costs-20260915/REQUEST.md` — subscription-cost
  modeling. Correctly uses the updated 09:34 framing as the product rule and folds in the
  09:11 pass's extra-usage-charges nuance as an edge case rather than the default formula.


## CR-20260915b — EU-hosted filter: AWS Bedrock (Claude) and Azure Foundry (OpenAI)
Hermes Telegram chat, 15 Sep 2026 13:16 UTC, verbatim:

> regarding benchmark heaven: doublecheck the eu hosted filter stuff, as far as I know AWS Bedrock offers the Claude models in EU hosted (maybe not Fable 5/5.1, unsure about that, but the others I belive) and Azure Foundry offers the OpenAI models EU hosted.

Evidence: Hermes started an official-documentation audit at 13:17 UTC (/home/flori/jobs/benchmarkheaven-eu-hosting-audit-20260915). Use its findings per exact model and region (EU endpoint vs. EU data processing vs. EU control plane); verify anything it doesn't cover yourself.


## CR-20260915c — Simple value map: default minimum score so the cheapest top model is on the Pareto line
Laptop Claude Code chat, 15 Sep 2026 ~15:00 UTC, verbatim (context: Florian asked why the green Pareto line stops at GLM-5.3 in Simple's value map; answer: the frontier only uses models passing the minimum-score slider, default 86):

> ah I get it, it's because siof the minimum capability score slider. let's pre-default that slider value to a value that make the very rigtmost but top (on y axis) model be part of the line. (but don't put the capability value slider lower than 65)
