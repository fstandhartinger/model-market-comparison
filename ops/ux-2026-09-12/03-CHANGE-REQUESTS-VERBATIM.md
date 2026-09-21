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


## CR-20260915d — Compare, Benchmaxxing, per-model report, More menu, overview cost cell, Options dialog, Charts value map, providers, full benchmark list, data checks
Laptop Claude Code chat, 15 Sep 2026 ~15:20 UTC, verbatim (typos kept):

> some layout issues in the compare section:
> - tooltips on radar values is transparent/seethrough
> - we have to chant ghe scaing of the exes of the radar somehow, because otherwise for models like fable 5.1 and GPT-6 astra its almost no visual difference (I don't knw, maybe adjust the scale depending on the two models values? we could skip the 0-25 points section as its almost irrelevant for new models.
> - DesignArena Frontend is not ideal there, Fable 5.1 is missing there and that model is super important, let's use DesignArena Full-Stack instead
> - for "Full benchmark comparison" section: columns for the models must be same width
> - in the Benchmaxxing tab don't show multiple reasoning variants of one model. it would look weird if one model is marked as "benchmaxxed" while another reasoning variant of the same model (same weights, same training run in the ai lab) is not
> - in this benchmaxxing table change the signal bar (the yellow one) so that differences can be seen stronger (I think currently the max value existing is something like 30? lets reduce it based on the values that are actually existing in the list.
> - in PER-MODEL REPORT: this AA Coding Agent Index value of zero for Muse Spark 1.3 can't be right (see third image). also: lets put one sentence there somehow: the more jagged, the more benchmaxxed. and: can we remove these radial lines for all the axes of this radial charts with the many axes= or at least make these less visible? the bright gray looks too high contrast on darkmode background.
> - the More menu pops up in the wrong spot, fix that
> - in the overview section in the table of the model score and cost comparisons in the cost cells if it says something like "↓
> 11× cheaper" the bubble curently breaks the layout (it moxes the cost bar lower, let's have that "↓
> 11× cheaper" left of the price not below it.
> - in filter section lets remove that "✓ Strong confidential guarantees" filter, I think it's not a well agreed on perspecive
> - also in filter section "✓ I'm buying for a company
> i" in my opinion doesn't fit nicely into the "Data Confidentiality" section.
> - in the regional settings let'S harmonize the way we show the filtering for the three regions and get rid of the (i) for EU-hosted. I think we should make it postively expressed instead of negatively: Hosted in "China", "EU", "US", "Other" and by default all of them are checked. and then additionally add filter featuers like inference provider company based in: "China", "EU", "US", "Other" and the same for model lab located in "China", "EU", "US", "Other"
> I also thing Models dropdown and Provides dropdowns are placed weirdly in this filter dialog, let's put these into an extra section: Models and Providers and add a third axis Labs (labs are the companies that trained a model, Providers are the inference provider companies, sometimes the same as the lab)
> In the score dropdown add the category composite scores like e.g. Coding
> - the cost vs Capability diagram must be improved a lot, take all of the advacements we made for the pareto diagram on the overview page and add them here (including labels within the chart) and add some more convenience features and easy score selection.
> - the "Filters" should maybe be renamed from Filters to Options? Because things like the Score selector is not really a filter, it's a choice
> - let's see if we can add trustedtokens.eu to the provider list
> - in the benchmarks list in the overview start page, show all of the benchmarks we have, not only 22. by the way for GPT-6 Astra I saw that the DesignArena Frontend and Full-Stack values are missing even though I know they exist on designarenas page. try to improve that and start extra agents that doublecheck if all the scraped values are correct

Florian attached three screenshots (described here because agents can't see them):
1. Compare tab radar tooltip for axis "DesignArena Full-Stack · published 2026-09-14": GPT-6 Astra (high) 1350 Elo · 100/100 within the measured range 995–1350 Elo; Claude Fable 5.1 (Adaptive Reasoning, High E…) 1342 Elo · 98/100. The tooltip box has a transparent background: radar grid lines and the axis label "7. Humanity's Last Exam" show through the text, making it hard to read.
2. Compare radar with 8 axes (1 AA Intelligence Index, 2 AA Coding Index, 3 Epoch ECI, 4 Epoch Software ECI, 5 DesignArena Frontend, 6 DesignArena Full-Stack, 7 Humanity's Last Exam, 8 Terminal-Bench v4.0), rings 25/50/75/100 on a 0–100 scale. Fable 5.1 (solid blue) and GPT-6 Astra (dashed green) overlap almost everywhere (both ~55–60 on AA Intelligence, ~75 AA Coding, ~88 Epoch ECI, ~90 Epoch Software ECI); on DesignArena Frontend only GPT-6 Astra has a point near 100 — Fable 5.1 has no value there, so its polygon cuts across.
3. Per-model report tooltip: "Artificial Analysis Coding Agent Index v1.4 · v1.4 — Muse Spark 1.3 (xhigh) 0.641775036414302 fraction · percentile 0.0 · observed 2026-09-09" — an unformatted raw fraction and a percentile of 0.0, plotted as zero on the radar.
Supervisor note: a separate read-only data-verification job (`/home/flori/jobs/bh-data-verification-20260915/`) checks scraped values (incl. GPT-6 Astra DesignArena, Muse Spark 1.3 AA Coding Agent Index, trustedtokens.eu); apply its verified corrections (CORRECTIONS.json) through the normal data pipeline with provenance.


## CR-20260915e — Simple slider label = Benchmark Heaven Main Composite Score; outlier tags in the Simple benchmark table
Laptop Claude Code chat, 15 Sep 2026 ~15:40 UTC, verbatim (typos kept):

> one more thing: the simple mode slider for capability score by default shows up as "Minimum Capability Score (Composite)" - can we brand it (and its tooltip behind the i) more as  "Minimum Capability Score 
> (Benchmark Heaven Main Composite Score)" and "((Benchmark Heaven Main Composite Score)" is in the second line, and we use the scor that we also have in the top row of the Simple View Benchmark results table.
> Oh and in that table: let's mark scores that are outstatndingly well or bad in comparison to the other models in the same row with a small tag, each.


## CR-20260915f — More benchmarks: self-reported scores from release papers
Laptop Claude Code chat, 15 Sep 2026 ~15:50 UTC, verbatim:

> also can we please try to find more benchmarks? go through all the technical release papers of these models and scrape extensively which self reported scores they report, try to find more benchmarks we can include in our app - work should be mostly done on the sandy hetzner of course, but I really want to stress that point

Supervisor note: research runs as job `/home/flori/jobs/bh-self-reported-scout-20260915/` (Opus 5 + Kimi K3 workers, no repo edits). The loop ingests its verified output.


## CR-20260915g — Simple benchmark table: 'simplified list' hint; (i) per benchmark
Laptop Claude Code chat, 15 Sep 2026 ~16:00 UTC, verbatim (typos kept):

> also, when in simple mode the "Benchmarks" link in the header is clicked and we have scrolled to the benchmarks table - or alternatively when the user has scrolled tothat benchmark table manually, I'd like to have a brief note popping up, attention seeking, for a short moment, and then disappear, saying "this is a simplified list" next to the button "Open the full comparison".
>
> also can we please have an (i) next to each of the benchmark names in that benchmark table? with a tooltip (mae sure z-index and opacity of the tooltip is right) that quickly explains what the tooltip is about and what type of scores thi benchmark delivers?


## CR-20260915h — Simple view: score and cost pickers at the sliders, shorter (i) texts, value-map Y axis range + chart settings
Laptop Claude Code chat, 15 Sep 2026 ~16:10 UTC, verbatim (typos kept; "MA adjusted cost" = "Max adjusted cost", "chat" = "chart"):

> oh and one more thing: the place in the simple view, where the "Minimum Capability Score" is shown: provide a dropdown there (just show a small arrow triangle pointing downwards next to the text) and there a popup for selecting another score should come up, e.g. one of the other composites (like we have in that benchmark table in the category sections) and also some selected other scores like AA Intelligence Index, AA Coding Index, the two main ECI ones, the most important DesignArena ones etc.
> And similar for the MA adjusted cost / task: there also we should offer that the user can select other cost measurements, e.g. plain cost per million tokens.
> And: the tooltip text in the (i') next to Max adjusted cost: make the text way shorter and simpler, better to understand, e.g. bullet points. Similar for the other (i) tooltip for the capability score.
> By the way: the Y axis of that pareto chart always seems to go up to 100 - I think we don't have to do that for scores where the highest value is well below 100. We might offer a small cogwheel button for the chat to configure that kind of options though


## CR-20260915i — Shortlist column chart; Main Composite row always first
Laptop Claude Code chat, 15 Sep 2026 ~16:20 UTC, verbatim:

> and one more thing: above the table of the "Benchmarks for your shortlist" section lets show one bar chart (actually a column chart) showing all these models with the "Benchmark Heaven Score (Main Composite Score)" and just to clarify: the top row in the table should always be the Main Composite Score one, not depending on which Score is currently selected in the filters (future Options) section. But: if another score is selected there than the Main Composite Score, then add another row with the selected one right below the Main Composite Score row. And for that new Column Chart: Lets again add a dropdown selector there for choosing the type of Score to have the diagram displayed for.

Note: this supersedes CR-12.1's behaviour where the top row showed 'the current selected score'.


## CR-20260915j — OpenRouter Benchmarks API as an additional source
Laptop Claude Code chat, 15 Sep 2026 ~16:30 UTC, verbatim:

> have we checked this https://openrouter.ai/benchmarks and this https://openrouter.ai/docs/api/api-reference/benchmarks/list-benchmarks for good additional sources of benchmarks? I think if there is something we don't have yet, we should include it

Supervisor check 15 Sep ~16:30 UTC: the repo does not use this API yet (only /api/v1/models and endpoints). `GET https://openrouter.ai/api/v1/benchmarks` (Bearer OPEN_ROUTER_API_KEY; meta as_of 2026-09-15T12:01Z, 250 models, 1,518 rows) has three sources: (1) `openrouter` — OpenRouter's own independent, reproducible runs: gpqa_diamond (131 models), tau_bench_verified_airline (123), search_browsecomp / search_dsqa / search_hle / search_widesearch (search-engine + tool configurations, 2–4 rows each), with accuracy, accuracy_stddev, total_tasks, **avg_cost_per_task** (measured) and last_run_timestamp; the web page also lists Image and Video media benchmarks (8 benchmarks, 2.46M task evaluations). (2) `design-arena` — 1,102 rows, arena 'models', categories website, codecategories, uicomponent, dataviz, gamedev, 3d, svg, asciiart, graphicdesign, image, imageediting, logo, audio: elo, win_rate, avg_generation_time_ms, tournament_stats. Note: GPT-6 Astra has NO design-arena rows here either (only AA + gpqa_diamond); Fable 5.1 has website/codecategories/uicomponent/dataviz/gamedev/3d/svg/asciiart. (3) `artificial-analysis` — 148 rows: intelligence_index, coding_index and **agentic_index** (not in our taxonomy yet).


## CR-20260915k — Artificial Analysis attribution (terms uncertain); BETA / Work in progress tag
Laptop Claude Code chat, 15 Sep 2026 ~16:40 UTC, verbatim:

> It's not completely clear if we are allowed to show the Artificial Analysis Composite index values, because our page might look like a competing product to them which is excluded from accepted use of their api. the minimum we'd have to add is an attribution (please do that). Also add a tag somewhere prominent, e.g. (BETA - Work In Progress) to make clear this is a site under construction.
> I'll write them to ask if I a allowed to do that

Supervisor check 15 Sep ~16:40 UTC, https://artificialanalysis.ai/api-reference → 'Attribution & Sharing of Data': "Attribution is required for all use of our free API. Please provide attribution to https://artificialanalysis.ai/ . If you wish to include our logo in your materials, you can download our brand kit … Use of the API is subject to our Terms of Use and Data Platform Terms." Florian is asking Artificial Analysis for permission. Until he reports back: do NOT add new AA-derived metrics (CR-34.4 Agentic Index is ON HOLD), and don't remove existing AA values either — attribution now, decision later.


### CR-20260915k addendum — Epoch AI (ECI) licence, checked 15 Sep 2026 ~16:50 UTC
Florian: "can you check also ECI?"

https://epoch.ai/benchmarks/eci (Citations): "Epoch AI's data is free to use, distribute, and reproduce provided the source and authors are credited under the Creative Commons Attribution license." Suggested citation: Epoch AI, 'Epoch Capabilities Index'. Published online at epoch.ai. Retrieved from 'https://epoch.ai/eci' [online resource]. Accessed <date>. https://epoch.ai/benchmarks (licence FAQ): same CC-BY statement, plus: "Benchmark questions and answers are the property of their respective creators. This hub also includes data sourced from external projects, which retains its original licensing. Users are responsible for complying with the license terms of the specific data they use, and should credit the original sources as indicated."
=> ECI and Epoch-run results: allowed with attribution (no permission needed). Externally sourced rows in Epoch's hub: check and credit the original source.


## CR-20260915l — Compare: polished model picker, one entry per model (best of its reasoning variants); Options panel dropdowns
Laptop Claude Code chat, 15 Sep 2026 ~17:00 UTC, verbatim (typos kept):

> For Compare models tabl when using the Add models search field: the doropdown looks weird, we need to make it more beautiful. also we should add one reasoning variant for each model only and take the highest score for each benchmark each we had or all these reasoning variants of each model.
> Actually the dropdown for model selectio nshould be polished, and have better usability. improve ux and ui.
>
> also model dropdown and provider dropdown in the optios panel are too bix, they can't be fully shown. revamp how these dropdowns are structured and sized, improve ux here


## CR-20260915m — More benchmarks from Lumina Bench into the scraper/updater
Laptop Claude Code chat, 15 Sep 2026 ~18:10 UTC, verbatim:

> I found a lot of additional benchmarks, let's include what we don't have already into our scraper and updater: https://luminabench.com/

Supervisor check 15 Sep ~18:10 UTC: Lumina Bench is an aggregator (435 benchmark families, 321 with results, 15,598 sourced result records, methodology 2.3; many families imported from BenchLM as `benchlm-*`). robots.txt allows all. Public **data ledger** (updated 1 Sep 2026): https://luminabench.com/downloads/luminabench-ledger-manifest.json, -benchmark-definitions.{csv,json}, -benchmark-results.{csv,json} (12 MB), -sources.{csv,json} (873 sources with fields url, sourceType, authority, publishedAt, retrievedAt, **licence, attribution, redistributionStatus**, verificationStatus), -models, -model-configurations, -operations, -image/-video/-voice, full ZIP/XLSX. No site-wide data licence found. => Use Lumina as a discovery and provenance index; take values from primary sources (or from Lumina only where the source's licence/redistribution status allows and Lumina is credited). Intake job: /home/flori/jobs/bh-lumina-intake-20260915/.


## CR-20260915n — Integrate ~55 further benchmark sources and hubs
Laptop Claude Code chat, 15 Sep 2026 ~18:55 UTC, verbatim:

> one more thing regarding benchmark heaven: 
>
> I found lots more pages where we scrape benchmarks from: integrate all of them into benchmark heaven.
>
> Broad benchmark collections and comparison hubs
> Website	Full URL	What it offers
> ★ Artificial Analysis	https://artificialanalysis.ai/evaluations	Independent evaluations spanning reasoning, agents, professional work, and hallucination.
> ★ Epoch AI	https://epoch.ai/benchmarks	Benchmark database, difficult evaluations, and capability trends over time.
> Lumina Bench	https://luminabench.com/	Cross-benchmark rankings for coding, reasoning, agents, research, and mathematics.
> ★ Scale Labs / SEAL	https://labs.scale.com/leaderboard	Frontier, agentic, and safety benchmarks explicitly targeting saturation problems.
> ★ Vals AI	https://www.vals.ai/home	Independently run evaluations of economically valuable and real-world tasks.
> ★ LiveBench	https://livebench.ai/	Refreshed, objectively scored tasks across multiple capability categories.
> Stanford HELM	https://crfm.stanford.edu/helm/	Collections covering capabilities, safety, multimodality, medicine, and finance.
> ★ BenchmarkList	https://benchmarklist.com/	Benchmark discovery directory with recent releases and model results.
> The Aggregate	https://theaggregate.ai/benchmarks	Large public-benchmark catalog plus aggregated rankings and daily changes.
> BenchLM	https://benchlm.ai/	Broad benchmark aggregation; distinguishes supported from estimated rankings.
> Vellum	https://www.vellum.ai/llm-leaderboard	Curated comparisons explicitly excluding outdated benchmarks such as MMLU.
> LLM Stats	https://llm-stats.com/	Public benchmark results alongside model speed and pricing.
> LM Council	https://lmcouncil.ai/benchmarks	Source-dated benchmark snapshots curated by AI Explained.
> CodeSOTA	https://www.codesota.com/	Source-linked benchmark registry across coding, agents, and other modalities.
> ★ Kaggle Benchmarks	https://www.kaggle.com/benchmarks	Platform for discovering and running official and community evaluations.
> OpenCompass	https://rank.opencompass.org.cn/leaderboard-llm-v2	Broad evaluation platform comparing open-weight and API models.
> FlagEval	https://flageval.baai.ac.cn/	BAAI's multidimensional model-evaluation platform.
> EuroEval	https://euroeval.com/leaderboards	Benchmark collections across 30+ European languages.
> Arena	https://arena.ai/	Human-preference rankings across modalities; distinct from objective task accuracy.
> Hugging Face — Find a Leaderboard	https://huggingface.co/spaces/OpenEvals/find-a-leaderboard	Discovery tool for specialized community leaderboards; freshness varies.
> Reasoning, science, factuality, and long context
> Website	Full URL	What to look at
> ★ MathArena	https://matharena.ai/	Research mathematics, formal proofs, and fresh competitions—not just AIME.
> ★ ARC Prize	https://arcprize.org/leaderboard	ARC-AGI series; particularly newer interactive ARC-AGI-3 evaluations.
> Humanity's Last Exam	https://lastexam.ai/	Expert-level questions; also links to the HLE-Rolling initiative.
> ★ CritPt	https://critpt.com/	Research-level physics reasoning challenges.
> SciCode	https://scicode-bench.github.io/	Scientist-curated coding tasks derived from real research problems.
> SimpleBench	https://simple-bench.com/	Commonsense reasoning questions designed around misleading traps.
> LisanBench	https://lisanbench.com/	Constrained word-chain tasks testing planning and instruction following.
> ★ EQ-Bench	https://eqbench.com/	Collection including EQ-Bench 4, creative writing, Judgemark, and Spiral-Bench.
> Giskard Phare	https://phare.giskard.ai/	Multilingual hallucination, bias, harm, and jailbreak-resistance evaluations.
> Context Arena	https://contextarena.ai/	Long-context performance comparisons, including MRCR.
> Google FACTS	https://www.kaggle.com/benchmarks/google/facts	Factuality suite covering grounding, search, parametric knowledge, and multimodality.
> Agents, coding, and professional work
> Website	Full URL	What to look at
> ★ Mercor APEX	https://www.mercor.com/apex/	Professional-work benchmark family: agents, accounting, software engineering, and more.
> ★ Andon Labs	https://andonlabs.com/	Long-running agent evaluations: Vending-Bench, Blueprint-Bench, and Drone-Bench.
> ★ METR Time Horizons	https://metr.org/time-horizons/	Autonomous task completion measured against human task duration.
> ★ Terminal-Bench	https://www.tbench.ai/	Terminal-based agent work; the previous list highlighted version 4.0.
> ★ ProgramBench	https://programbench.com/	Rebuilding whole programs from binaries and documentation; substantial remaining headroom.
> ★ SlopCodeBench	https://www.scbench.ai/	Correctness and code degradation across successive requirement changes.
> ★ SWE-rebench	https://swe-rebench.com/	Time-windowed repository tasks, with recurring model and agent evaluations.
> SWE-bench	https://www.swebench.com/	Benchmark family including multilingual and multimodal tracks—not only Verified.
> LiveCodeBench	https://livecodebench.github.io/	Date-filterable coding problems; use recent windows rather than historical averages.
> GSO	https://livecodebench.github.io/gso.html	Challenging software-performance optimization tasks.
> Berkeley Function Calling Leaderboard	https://gorilla.cs.berkeley.edu/leaderboard.html	BFCL V4: tool calling, multi-turn interactions, and agentic evaluation.
> τ-bench	https://taubench.com/	Agent–user interactions and tool workflows; includes the newer τ³ generation.
> ★ OSWorld 2.0	https://osworld-v2.xlang.ai/	Long-horizon, real-world computer-use tasks.
> ★ WebArena-x	https://webarena.dev/	Collection including WebArena-Infinity, VisualWebArena, and TheAgentCompany.
> DeepResearch Bench	https://deepresearch-bench.github.io/	Research-agent evaluation focused on research output quality.
> CodeClash	https://codeclash.ai/	Goal-oriented coding tournaments; the previous list noted results from November 2025.
> More collections—rather than just score tables
> Website	Full URL	What it offers
> ★ Inspect Evals	https://ukgovernmentbeis.github.io/inspect_evals/	Runnable evaluation collection maintained with UK AISI and collaborators.
> ★ Harbor Hub	https://hub.harborframework.com/	Catalog of agent benchmarks, tasks, and executable environments.
> EvalEval Evaluation Cards	https://evalcards.evalevalai.com/evals	Benchmark-family directory and structured evaluation-methodology information.
>
> For avoiding saturation: check the test version and task dates, not merely whether the leaderboard recently added new models.

Supervisor note: research runs as job `/home/flori/jobs/bh-source-intake-20260915/` (per-source audit: data access, terms/licence, benchmarks, versions/task dates, overlap). Artificial Analysis: attribution done, new AA metrics still ON HOLD (CR-35.3) until Florian reports AA's answer. Arena = human preference, keep separate from task accuracy. Lumina (CR-37) and OpenRouter API (CR-34) already queued.

---

## CR-20260916 — DesignArena collector: documented-risk decision

Florian's decision, Telegram: **“i choose b”** in response to the documented DesignArena access issue.

<requirements>

Keep the two existing DesignArena boards (Frontend and Full-Stack Elo) as visible Benchmark Heaven product data under a documented risk decision. Do not expand DesignArena collection or add new endpoints/boards. Do not silently stop or remove the existing collector/data solely because of this decision.

The evidence is `/opt/benchmarkheaven/state/ux-evidence/iter78-designarena-terms/`: DesignArena robots.txt disallows `/api/`; Arcada Labs terms say access/download is via a normal browser and expressly prohibit software, tools, agents, or data-mining tools. The existing daily collector uses `POST /api/leaderboard` and `POST /api/registry`; no public API documentation or license was found.

Implement the decision as a durable, visible operational guard: scope is exactly the two existing boards; record the source/legal-access risk and evidence path; block any future DesignArena endpoint/board expansion pending a new explicit Florian decision or documented permission. Preserve data provenance/date and ensure the user-facing source/methodology wording is accurate and does not falsely claim an official API or licensed feed. Revisit only if an official API, license, or permission becomes documented.

</requirements>

---

## CR-20260916b — Simple shortlist benchmark-chart readability

Florian's change request, Telegram, 16 Sep 2026, verbatim:

<requirements>

regarding the bar chat at "Simple view Benchmarks for your shortlist" on the overview: can we make the model names show up as diagonal, not vertical at the moment? would make them easier to read. Also please change the y-Axis start-/end-value so that the differences between the values become more visible. Currently the y-Axis begins at 0, but in many cases the lowest value in the chart would be maybe carry a value of 65, which makes all the bar look very similar in height. I'd like to have a cogwheel to configure y-Axis being nulled, though, if a user regards it as a chart crime not to do that. (in my opinion it isn't a chart crime in this case, because these benchmark values often can't be interpreted as straight linear continuous measurements in the sense that "50 is half as good as 100").

</requirements>

Implementation clarification: preserve truthful scale communication. The default may use a data-driven, non-zero y-axis range only when it visibly states the displayed range and gives enough visual context to prevent an implied zero baseline. The cogwheel must offer a clearly named zero-baseline option and persist the user choice; it must work on desktop and mobile, in light and dark themes. Add tests and independent live verification before marking accepted.

---

## CR-20260916c — Merge agent/version variants in benchmark-table display

Florian's change request, Telegram, 16 Sep 2026, verbatim:

<requirements>

another thing I'd like to have adjusted: "ApprenticeBench API (NeoCognition)" gets shown seperately in the table in different rows, e.g. for Claude Code and Codex. I think we should merge these in the display and take the highest score each. In reality usually a model is either tested with Codex or with Claude Code, so it makes most sense to have the values in one row.
Similar for AA Coding Agent Index: let's unify these rows and take the best score a model has achieved, no matter which version (v1.4 or v1.5) or agent (Claude Code or Codex).

</requirements>

Implementation clarification: this is a presentation-level best-record aggregation. Preserve every raw result, version, agent/harness, date, source, and provenance; never overwrite or relabel raw measurements. Merge only results with a compatible metric/unit and direction. The unified row must say that it shows each model's best recorded result, and its detail/provenance view must identify the selected source version and agent/harness. Apply consistently in Simple, Advanced, and the Benchmarks tab, with tests and independent live verification.

---

## CR-20260916d — Stronger table signals and provider links

Florian's change request, Telegram, 16 Sep 2026, verbatim:

<requirements>

also: the tags/bubbles we add to the table with the score and cost columns: these are great. maybe we can even extend this a bit: I think we should show the pricier/cheaper tags a little bit more often, and in two intensity levels. Fable 5.1 in my opinion should also get as pricier tag (but maybe a weaker version than the tag we show for Fable 5) and GLM-5.3 should maybe also get a cheaper tag, but a weaker one than GLM-5.3-Flash, and maybe we can also add that Benchmaxxing signal tag in a weak and a strong (strong would be what we currently have at GLM-5.2) form. And a click on it should lead to the benchmaxxing view with this model seslected and the view scrolled to the radar chart section, so that the user understands immediately intuitively why we regard it as benchmaxxed.
And I also noticed, if a model in this table is expanded, in the provider list it would be good if there could be links as well, either to the providers webpage or to a provider detail page in our app.

</requirements>

Implementation clarification: derive weak/strong cheap, expensive, and Benchmaxxing signal levels from documented current data thresholds rather than hard-coding individual models; use text/icon and accessible explanations, not color alone. The examples above are acceptance examples only when their current data still meets the documented thresholds. A signal pill must be a keyboard-accessible deep link to `/benchmaxxing` with the model selected and the radar section focused/scrolled into view, while preserving understandable back navigation. In expanded offer/provider lists, link to an in-app provider detail page when available; otherwise link to the verified official provider website. Do not manufacture URLs; preserve offer/provider provenance. Test and independently live-verify on desktop/mobile and light/dark.

---

## CR-20260916e — Data revalidation, matched expansion panes, Benchmaxxing quick radar

Florian's change request, Telegram, 16 Sep 2026, verbatim:

<requirements>

Then also start another round of checks if all scraped numbers are correct. And the provider list currently has the wrong height, I see a scrollbar there for GLM-5.2 because we have may providers, but the height of this provider table is not even same height as the Benchmarks listing left of it (but it should be).
Also I think in the Benchmaxxing view we should consider showing that radar chart with the potentially jagged lines not only in the master-detail style way (selected row in table and below table the radar chart) but also using an expandable row mechanism similar to how rows in the model capability/cost table in simple overview can be expanded. Maxbe we then place a rather simple version of the radar chart and the score and the comment how we interpret that jaggedness as benchmaxxing signal and then put there a link to that more complete and more detailed section on the same page (anchor link or similar) if the user wants to explore this data in greater detail.

</requirements>

Implementation clarification: run a new independent source-data revalidation round after the change, covering every currently collected source group and every published scraped numeric value against its retained primary-source capture/contract; record coverage, mismatches, exclusions, and remedies. Fail closed for any unverified or mismatched value; do not call the revalidation complete until every published scraped number is accounted for. In each expanded overview row, the provider/offers pane and the benchmark pane must share the same visible height at applicable desktop widths; if either side needs overflow, use a deliberate matched-height layout with an internal scroll area and no clipped content. On Benchmaxxing, add an accessible expandable per-model row that exposes a compact radar, the signal score, and a plain-language jaggedness interpretation; its detail link must select that model and move focus/scroll to the existing full radar/report section on the same page. Keep the existing master-detail flow. Test and independently live-verify all states, desktop/mobile, light/dark.

---

## CR-20260916f — Sort-aware value-signal framing

Florian's change request, Telegram, 16 Sep 2026, verbatim:

<requirements>

one more thought regarding the tags in the model capability/cost table: the tags for high price or cheap prive are only really interesting in the default sorting of the table, when the models are sorted descending by capabilities. If the user switches sorting to price (descrending) it would be more appropriate to put high/low capability tags into the capability column for rows that kidn of violate the expected price-capability-ratio. It would basically be the same signal and affect the same models, but the perspective and thus the message would be a slightly different one. let's do it like this

</requirements>

Implementation clarification: when the active table sort is composite capability descending, render the existing cost-relative badges in the adjusted-cost column. When the user actively sorts by adjusted cost descending, render the equivalent same-model/value signal in the capability column with clear capability-relative wording rather than cost-relative wording; do not show both versions at once. Recompute/re-render correctly after sorting, preserve weak/strong levels and the documented threshold/provenance explanation, announce the changed context accessibly, and test keyboard sorting plus desktop/mobile/light/dark states.

---

## CR-20260916g — Correct the social link-preview slogan

Florian's report, Telegram, 16 Sep 2026: the Benchmark Heaven link preview still shows the old slogan.

Live evidence, 16 Sep 2026: both `https://benchmarkheaven.com/` and `https://www.benchmarkheaven.com/` still serve the retired social description: “Every AI model benchmark we can find, in one place. And what each model really costs you.” This is a real metadata defect, not merely a cached Telegram card.

Implementation clarification: replace the canonical Open Graph, Twitter, standard description, and any wording embedded in the share image with the already accepted current Benchmark Heaven brand copy: “The most detailed cost–capability analysis in AI.” and “Every Benchmark. Actual Costs.” Ensure canonical and www responses agree and validate output with scraper-style fetches after deployment. Check whether Telegram has cached previews already issued; explain plainly that already-sent cards can remain cached and verify a newly shared URL/card where cache behavior permits. Do not claim the old Telegram message itself can be retroactively changed.

---

## CR-20260916h — Regression: restore overview-table value badges

Florian's report, Telegram, 16 Sep 2026: “now it seems these tags (cheaper / pricier etc) are completely gone in the model capability/cost table. home they come back soon”.

Live verification, 16 Sep 2026: on the default score-descending Overview table, no cheaper/pricier badges are currently rendered beside costs, including rows that had them in the verified earlier presentation. The current source code contains a value-signal renderer, so investigate the real live data/threshold/filter path rather than merely adding static labels.

Implementation clarification: treat this as a priority regression. Restore data-derived cost-relative value badges in the default composite-capability descending table before adding the planned sort-aware reframing. Preserve the existing no-hard-coded-model rule; add regression coverage against current fixture/live-equivalent data that proves qualifying expensive and cheap rows render, including the strong-tier examples when their actual inputs meet the documented thresholds. Independently live-verify after deploy that badges are visible in the default table and that the later price-sort framing changes their placement/wording without suppressing the signal.

---

## CR-20260916i — Make the strong value-tag level visibly stronger

Florian's report, Telegram, 16 Sep 2026: “I can now see the pricier/cheaper tags a little bit more often, and in two intensity levels, as I wished, but the visual style of the more intense level looks less visual intense than the other one, so please reverse the two visual styles or adjust them any other way to fix this.”

Implementation clarification: the semantic strong/weak classification must remain correct. Change the presentation so **strong** has plainly greater visual emphasis than weak at a glance, in both cheap and pricey colors and in light/dark. A suitable solution is a stronger fill plus clear border and heavier type for strong, while weak has a lower-contrast outline or subtle fill; reverse styles only if that produces the same unambiguous hierarchy. Retain distinct arrow/text cues and sufficient non-colour contrast. Add visual regression coverage and independently compare live weak vs strong examples at desktop and mobile widths before accepting.

---

## CR-20260916j — Benchmaxxing tag must navigate instead of expanding the row

Florian's report, Telegram, 16 Sep 2026: clicking the Overview-table “Benchmaxxing signal” tag should go to the corresponding model on the Benchmaxxing page, but currently the table row expand/collapse handler wins.

Live source verification, 16 Sep 2026: the signal is currently a non-interactive `span` inside a `tr` whose click handler toggles expansion, so it cannot navigate.

Implementation clarification: make the signal a real keyboard-accessible link or button-link to the corresponding Benchmaxxing model report (with the exact model identity encoded safely). Its click and keyboard activation must stop propagation so it never expands/collapses the Overview row. It must land on the intended selected-model section, handle direct load and back/forward predictably, and preserve standard row expansion when any non-link part of that row is clicked. Add automated interaction coverage plus independent live checks for mouse, Enter/Space, mobile tap, and browser back.

---

## CR-20260916k — Directly curate the Simple-view chart and benchmark table

Florian's request, Telegram, 16 Sep 2026: in the Simple view section containing the shortlist score chart and benchmark table, make adding/removing models easier; support reordering in the table; and consider dragging a bar or its name from the chart into the table, or another UX that solves this cleanly.

Current source verification, 16 Sep 2026: the chart and table derive their top five models automatically from the filtered shortlist; chart labels only navigate to a model page, and the table has no curation controls. This means a reader cannot directly choose, remove, add, or reorder the displayed comparison set.

Implementation clarification: design and ship one coherent, low-clutter **“Edit shortlist”** interaction shared by the chart and table. It must let a user: (1) remove any currently displayed model; (2) add another eligible model through searchable/type-ahead selection; (3) set table/chart order explicitly, with accessible move controls and keyboard operation; and (4) make clear that both chart and table reflect one shared selection/order. Drag-and-drop from a chart bar/name to the shortlist is welcome as a progressive desktop enhancement only if it is robust, but must not be the sole route: equivalent buttons/type-ahead and touch/keyboard paths are required. Cap the Simple comparison at a documented sensible limit, explain what happens when it is full, preserve the original automatic shortlist as a one-click reset, persist a user’s temporary curation locally without silently changing global filters, and retain links to the model and full comparison. Test mouse, touch, keyboard, screen reader labels, narrow phones, wide desktop, light/dark, reload persistence, and reset.

---

## CR-20260916l — Current free routes need a separate status, not a misleading $0 paid chart price

Florian's question, Telegram, 16 Sep 2026: “in the charts section in Cheapest models — Adjusted $/task why do we list GLM-5.2 as $0? Is this really possible? Is it currently offerend for free somewhere (maybe a special deal on OpenRouter?) maybe in these cases we should try to show a tag (e.g. currently also available for free) and still show the paid price”.

**Verified diagnosis:** the dataset carries a zero-price OpenRouter endpoint for GLM-5.2 (`Decart`, `decart/fp4`), so the current cheapest-route calculation produces $0. The current public OpenRouter endpoint catalog no longer lists that endpoint or another $0 GLM-5.2 endpoint. Its current model-level listed rate is $1.40 input / $4.40 output per 1M tokens; its cheapest current listed endpoint is DeepInfra at $0.4875 input / $1.56 output per 1M tokens.

**Implementation clarification:** Treat a zero-price API route as volatile availability/promotion evidence, never as the ordinary paid price. Independently revalidate it on every refresh, excluding it when absent, stale, quota-bound, invitation-only, or unusable through the normal paid API. The **Cheapest models — Adjusted $/task** panel must plot and rank the cheapest currently verified *paid* adjusted task price, so a $0 promotion never pins a model to the zero/left edge. Where a zero-price route is current and broadly usable, show a compact **“Free route currently available”** tag beside the model; link/name the provider and explain that limits and availability may apply, and never imply that the model is universally free. Where it is expired/unconfirmed, show no tag while retaining raw historic provenance without presenting it as current pricing. Apply the rule in all cost rankings, tables and value maps, not solely GLM-5.2. Add regression coverage for a vanished free endpoint, a verified current free endpoint alongside a paid chart value, and a model with only a valid zero-price route; expose paid/free provenance in the accessible expanded price table and preserve correct behavior under provider, privacy and region filters. The design authority should choose the least visually noisy implementation before the implementation run.


## CR-20260916a — Make the open-source claim true: add a licence
Laptop Claude Code chat, 16 Sep 2026 ~15:45 UTC (launch ad brief), verbatim excerpt: "lets make clear this is open source and a hobby project, to give the world better tools to decide which LLM to choose best for the job".
Supervisor check: https://github.com/fstandhartinger/model-market-comparison is PUBLIC but has **no LICENSE** file (GitHub licenseInfo null) — legally source-available, not open source. Default choice: MIT (Florian may overrule). Third-party data keeps its own terms (Artificial Analysis, Epoch AI CC BY, DesignArena, OpenRouter …) — the licence covers our code, not their data.

---

## CR-20260916m — Include LisanBench

Florian's change request, Telegram, 16 Sep 2026, verbatim:

<requirements>

lets include https://lisanbench.com/ into our benchmark list

</requirements>

Implementation clarification: treat the official LisanBench site and the linked first-party
project/repository as discovery only until the source, benchmark version, test methodology,
leaderboard licence/terms, model identity, score scale/direction, evaluation date, and result-level
provenance have all been independently established. Prefer an official downloadable result or
documented official API; do not scrape/reuse a third-party aggregator as the published score source
unless its terms explicitly permit it and the primary-source relationship is retained. Add every
verified LisanBench result via the normal intake pipeline with raw capture and provenance untouched;
show it as missing rather than estimating absent model results. Add clear benchmark metadata and an
accurate category (only after methodology review), source/version/date tooltip/detail evidence, a
refresh recipe with fail-closed staleness handling, tests, and independent live verification. If
reuse or collection is not permitted, document the evidence and decision without publishing the
scores.

---

## CR-20260916n — Information popovers must keep links usable

User feedback forwarded by Florian, 16 Sep 2026, verbatim:

<requirements>

the information buttons are ragebait you need to fix them

inside them are links for "how we calculate" but the information window doesnt stay open

like you move your cursor and it disappears

</requirements>

Screenshot context: on the dark-mode Overview table, the `SCORE ⓘ` information control opens a
methodology panel containing **How we calculate**, Artificial Analysis, and Epoch AI links. Moving
the pointer from the trigger towards that panel dismisses it before a link can be reached.

Implementation clarification: every informational popover/tooltip in the product which contains an
interactive element must remain open while focus or pointer is on either the trigger or its panel,
with no gap/`mouseleave` race between them. Its links must be normally clickable/tappable; keyboard
users must be able to open it, Tab through its interactive content, activate a link, and dismiss it
predictably (including Escape), while focus returns sensibly. Touch must have an explicit usable
open/close path rather than hover-only behavior. Non-interactive short tooltips may retain ordinary
brief behavior, but do not apply that behavior to panels with links. Avoid trapping users, blocking
table sorting, or creating stale/overlapping panels. Cover Score and Adjusted Cost first, audit every
other interactive info panel for the same shared primitive/bug, add interaction regression tests,
and independently verify the deployed result by mouse pointer, keyboard, touch-width emulation,
light/dark, desktop and mobile.

---

## CR-20260916o — Include the individual Epoch benchmark results, not only ECI

Florian's change request, Telegram, 16 Sep 2026, verbatim:

<requirements>

do we already include the individual benchmarks from Epoch? not only the ECI? if we don't let's add that

</requirements>

Implementation clarification: audit the complete current Epoch AI Benchmarking Hub/catalog and
the ECI input/evaluation records. The product already has the general ECI and Software Engineering
ECI, plus selected individual Epoch-published boards (including DeepSWE, FrontierMath v2 tiers and
SimpleQA Verified); this is not proof that all individual results are covered. Produce an auditable
one-row-per-benchmark inventory: current inclusion/collector state, maintained benchmark/version,
methodology/metric/direction, source/capture date, whether Epoch ran it or republished an external
project's results, and the original project's reuse terms where applicable. Ingest every additional
individual benchmark whose official Epoch result data and applicable reuse rights are verified,
using separate stable benchmark identities and normal raw/provenance retention—never collapse raw
benchmark scores into ECI or fabricate gaps. If an external-origin board has no verified right to
republish, retain the audit decision but do not publish its values merely because Epoch hosts a
copy. Surface verified boards in the benchmark list/table with accurate source/attribution and
methodology/date detail; assign categories and composite treatment according to the documented
taxonomy rather than treating them all as ECI. Add a source-health/refresh plan, parser and
provenance tests, and independent live verification.

---

## CR-20260916p — View switcher must not shift the page horizontally

Tester feedback forwarded by Florian, 16 Sep 2026, verbatim:

<requirements>

when you click these buttons the whole site shifts left and right

</requirements>

Screenshot context: changing the Overview view selector between **Simple**, **Guided**, and
**Advanced** visibly moves the whole page left/right.

Implementation clarification: eliminate the horizontal layout jump on every view change, without
breaking responsive or overlay-scrollbar environments. Diagnose whether the cause is scrollbar
appearance, mode-dependent container geometry, or another layout reflow; fix the root cause rather
than adding a one-off transform. The page shell/header/main alignment must have an identical x
position before and after each switch. Test Simple → Guided → Advanced → Simple with content heights
that both require and do not require vertical scrolling, on desktop scrollbars that consume layout
width and at narrow/mobile widths. Preserve normal scrolling, no horizontal page overflow, focus and
selected-mode behavior, and respect reduced-motion preferences (the correction itself must not use
a distracting compensating animation). Add regression coverage and independently live-verify.

---

## CR-20260916q — Let browser agents read Benchmark Heaven through WebMCP

Florian's change request, Telegram, 16 Sep 2026, verbatim:

<requirements>

let's add WebMCP to the benchmarkheaven project - people should be able to read benchmarks from there via their agents

</requirements>

Implementation clarification: add a **read-only WebMCP integration** to the public Benchmark
Heaven site for compatible browser agents. Do not represent WebMCP as a conventional remote MCP
server: the current proposed WebMCP model requires an open browser context/tab and browser support.
Keep the existing documented public HTTP APIs as the headless/programmatic route; document this
distinction plainly for users and agents.

Feature-detect the supported WebMCP API and degrade silently and completely safely in unsupported
browsers (no polyfill that impersonates browser mediation, no user-visible broken widget). Register
small, bounded, read-only tools with precise JSON schemas and source/date/protocol-bearing results:

1. `search_benchmarks` — discover benchmark identities by text/category, returning a capped,
   paginated compact list with metric, unit/direction, maintained version, source and as-of date.
2. `get_benchmark_results` — request one canonical benchmark identity plus a bounded model selection
   or page cursor, returning only published results and their exact provenance/methodology links.
3. `get_model_benchmark_summary` — request a canonical catalog model identity (and optionally a
   bounded list of benchmark identities), returning scores only with value/unit, run configuration
   where material, benchmark source/version/date and explicit null/unavailable state—not inferred
   scores.

The tools must delegate to the same published projection/data semantics used by the site rather than
duplicating a dataset in client code; they must never expose credentials, internal/raw unreviewed
records, unpublished model data or more data than strict result limits allow. Validate all input,
escape/display untrusted source metadata safely in resulting UI, give actionable structured errors,
and avoid endpoint abuse through request caps, pagination and appropriate existing rate/security
controls. Address WebMCP's origin-isolation and `tools` permissions-policy requirements explicitly
and prove it runs only in the intended top-level/same-origin context.

Add a concise “For agents” documentation page explaining availability, browser-tab requirement,
tool schemas/examples, result limits, source/attribution, currency and freshness caveats, privacy,
and the existing API path for headless/server agents. Add unit/contract tests plus a real compatible
browser test using the WebMCP inspector or equivalent—not merely checking `window` existence. An
independent agent must verify each tool against live deployed data, including an unsupported-browser
fallback, desktop/mobile and light/dark. No write actions, login, analytics identity or agent-tracking
may be introduced.


### CR-20260916b addendum (16 Sep ~19:20 UTC): exact DeepSWE numbers from Cline's post
Florian forwarded a screenshot of @cline's post (16 Sep 18:47 UTC, 'Union Alpha (stealth model) is now free in Cline … near GPT-6 Astra and Opus 5 performance for ~18x lower expected cost'). Bar chart 'DeepSWE score and cost, Source: OpenRouter': GPT-6 Astra 74 % ($6.50/task), Opus 5 74 % ($11.80), **Union Alpha 73 % (~$0.65, expected pricing)**, GLM-5.3 69 % ($4.00), DeepSeek V4 Pro 63 % ($1.65). Use 73 % as the DeepSWE value (source: OpenRouter via Cline post + Alex Atallah post), cost still 'expected', not measured.


## CR-20260916d — Link previews (X chat, WhatsApp, Telegram) don't show for benchmarkheaven.com
Laptop chat 16 Sep 2026 ~21:20 UTC, verbatim: "do we have that feature working properly that makes a webpage show in a chat app like WhatsApp or X chat with a text and image etc? for https://benchmarkheaven.com/? Because at the moment I don't see it in X.chat"
Supervisor findings: og:title/description/image (1200×630 PNG, 56 KB, HTTP 200) and twitter:card=summary_large_image are present and correct in <head>. BUT the homepage HTML is **8.25 MB** (dataset inlined into the server-rendered payload); link-preview crawlers of X, WhatsApp (~300 KB limit), Telegram and Facebook abort on such pages, so no card. Also: no og:url, no twitter:site; /robots.txt returns the HTML app (no real robots.txt); sitemap.xml missing. X caches a failed card fetch for days — after the fix, share the URL with a fresh query string (e.g. ?launch=1) or post a new link.


## CR-20260916r — Pre-release UI/UX gauntlet (launch 17 Sep ~17:00 UTC) → CR-63
(Requested as "CR-20260916e"; that letter is already used by the data-revalidation section above, so this section takes the next free letter, r. Rows: **CR-63.x**.)

Florian, laptop chat, 16 Sep 2026 evening, verbatim:

<requirements>

finishing touches on the ui/ux … challenge all the ui … have great models actually use the website, look at the screenshots, discuss if things should be polished. let's not make too drastic changes, the main thing is pretty great now, but let's see if we find issues that we want to fix and maybe some improvements or inconsistencies

benchmaxxing tab should be moved up in priority, I think it's the top feature besides the completeness of our benchmark collection and the adjusted cost calculation

</requirements>

Also: send screenshots of the improvements via Telegram when done.

How the findings were produced (16 Sep 2026 ~21:30–23:00 UTC, supervisor gauntlet job `~/jobs/bh-ux-gauntlet-20260916/`): the live site
was used headless as three users (first-time visitor on a 390 px phone, a developer comparing models on a 1440 px
desktop, a CTO checking EU hosting and cost): /, /benchmarks, /compare, /charts, /benchmaxxing, /eu, /about, a model page,
Options panel, More menu, Guided/Advanced, empty search, 404, 320 px, light and dark (~110 screenshots in
`~/jobs/bh-ux-gauntlet-20260916/shots/`). A second opinion per page came from Gemini 3.8 Flash (vision, real screenshots;
`reviews/gemini-*.json`), and one Fable 5.1 design pass covered the five main screens (`reviews/fable-design-pass.md`).
Model claims that did not hold up against the screenshots or the code were dropped. Scope: polish only, no redesigns. Checklist: `04-CR-BRIEF.md` → "CR-20260916r".


## CR-20260916g — Hold on new Artificial Analysis metrics LIFTED: include the AA Agentic Index
Laptop chat 16 Sep 2026 ~21:45 UTC, verbatim (German): "Heißt das wir haben den Agentic Index aktuell nicht mit drin? Falls das so ist, bitte lass ihn uns wieder mit in die liste der Werte aufnehmen, die wir in unserer benchmarkliste haben. Es macht jetzt eh schon keinen unterschied mehr, ob wir einen score mehr oder weniger von denen anzeigen. da habe ich lieber alle" → The hold from CR-35.3 (no new AA-derived metrics until AA answers) is lifted. Add the Artificial Analysis Agentic Index (CR-34.4) and any other AA metric we can source, all with the existing attribution.


## CR-20260916h — Remove cost/efficiency-type metrics from the Benchmaxxing analysis and radar
Laptop chat 16 Sep 2026 ~22:30 UTC, verbatim: "we have to remove cost per task type benchmarks from the benchmaxxing check - i noticed them in the radar, because they show up as very low values. they don't make sense for the benchmaxxing analysis concept"
Screenshot: per-model Benchmaxxing radar for Claude Fable 5.1, category 'Efficiency'; tooltip 'Vals Index v2 cost per test (Vals AI) · v2 — 28.9 USD · percentile 0 · observed 2026-09-13' plotted as a spike toward the centre (percentile 0), dragging the shape down.
Supervisor note: cost-like metric names found in the taxonomy (first 25): ["CR-1.3 / CR-1.7: presentation metadata for the Benchmarks comparison table. Groups map registry categories to display groups; overrides are keyed by the benchmark id before '::' (or the snapshot key). Tiers are editorial tags, drafted by one engine and reviewed by another. Nothing here changes a score. 2026-09-15: aa_input_keys marks Coding Agent Index constituents; Terminal-Bench rows display under Coding. score_ranges: the published 0–100 scale of unregistered snapshot index axes, used only to decide whether a row may enter a category composite. 2026-09-16: OpenRouter's own reproducible runs (CR-34.2) enter as their own registry families; their -cost families are the measured spend of the same run and sit under Cost & efficiency. All of them are tier 'niche': release posts cite Artificial Analysis' GPQA Diamond and tau2-Bench, not OpenRouter's own re-runs, and the Simple table must not show two different GPQA numbers side by side. 2026-09-16 (CR-38.2/38.3, F-98): the tags 'saturated' and 'judged' are not editorial — 'saturated' is computed from the results we hold (saturationOf in lib/benchmark-matrix.mjs) and 'judged' comes from data/benchmark-caveats.json, where every classification quotes its own source. Both affect category composites: a judged row never averages with task accuracy, a saturated row weighs half.", 'Cost & efficiency', 'Efficiency', 'apprenticebench-api-cost', 'apprenticebench-cua-cost', 'cursorbench-cost', 'efficiency', 'frontiercode-cost', 'openrouter-gpqa-diamond-cost', 'openrouter-search-browsecomp-cost', 'openrouter-search-dsqa-cost', 'openrouter-search-hle-cost', 'openrouter-search-widesearch-cost', 'openrouter-tau2-bench-airline-cost', 'realswe-cost', 'vals-index-cost']


## CR-20260916s — Pre-release data & math gauntlet (launch 17 Sep ~17:00 UTC) → CR-65
(Requested as "CR-20260916f"; that letter is already used by the sort-aware value-signal section above, so this section takes the next free letter, s. Rows: **CR-65.x**.)

Florian, laptop chat, 16 Sep 2026 evening, verbatim:

<requirements>

very very important: the whole data collection and the math behind things like the composite scores and the benchmaxxing must be sound (even taking into account complicated cases like missing scores etc). And the benchmaxxing radar chart should be also doublechecked to make sure this is really looking great and tells the story perfectly.

challenge all the data

</requirements>

How the findings were produced (16 Sep 2026 ~21:25–23:15 UTC, supervisor gauntlet job `~/jobs/bh-data-math-gauntlet-20260916/`, critic only — no code changed):
every number was recomputed with the site's own code on `data/dataset.json` (local composite = live API for all 839 rows; re-run on the
22:40 build with CR-64). Math: `MATH-AUDIT.md` (formulas as implemented, worked examples, a null simulation for the Benchmaxxing signal),
independently re-checked by Kimi K3, which confirmed every finding in substance and added three (`work/kimi-math/review.md`). Data: two Kimi K3
workers checked 1,337 stored values for 38 models against the primary sources (93 % exact); every mismatch was re-checked live by Claude
Opus 5 and 11 worker claims were rejected (`DATA-AUDIT.md`, `CORRECTIONS.json`). Radar: live screenshots 1440/390 (`shots/`).
Checklist: `04-CR-BRIEF.md` → "CR-20260916s".


## CR-20260916t — Daily data pipeline: reliable, free, critic-checked → CR-66
Florian, 16 Sep 2026 (overnight job brief), verbatim:

<requirements>
have another look at how our daily (or maybe even more often) data update and data collection agent jobs are set up and if these will
really be able to update the data very reliably (no wrong data — maybe we should really have full gauntlet loop like critics agents there) and still
ideally free (based on LLMs in opencode that don't produce costs, or at least very affordable ones) — maybe also in Codex using very cheap models
like GPT-5.6 Luna, which should be ok.
</requirements>

How this was handled (16 Sep 2026 ~23:00–00:30 UTC, job `~/jobs/bh-pipeline-reliability-20260916/`, outside the repo):
audit in `PIPELINE-AUDIT.md` (the scheduled 05:17 run failed on all six days 11–16 Sep; every publication was a manual repair run).
Built outside the repo, live since 16 Sep 23:30 UTC: `/opt/benchmarkheaven-daily/gated-run.sh` (cron 05:17, catch-up 07:17) and
`/opt/benchmarkheaven-daily/gate/` — git hooks in the daily staging checkout (injected via `GIT_CONFIG_*`) that re-derive every
OpenRouter price and AA score row from the captured source bodies, apply blast-radius gates, let a free collector model (Qwen3.8 /
Kimi K3 on Chutes) and a different-family free critic (Union Alpha) review 8 sampled rows, and block the push unless PASS; a diff
digest per run; `notify now` on the second failure in a row; a no-LLM 6-hourly price watch. The rows below are the repo parts.
Checklist: `04-CR-BRIEF.md` → "CR-20260916t".


## CR-20260917 — Repair today's failed data update; add visitor analytics
Florian, Hermes chat, 17 Sep 2026, verbatim:

> Fix it please. Also integrate some Analytics stuff into the page, I want to Count visitors. And: do we need a cookie banner?

Context: the scheduled 05:17 UTC daily refresh and its earlier retry both failed. The most recent failure says the live source contract rejected `aa_coding_v15`: one disputed row was quarantined; the critic could not overrule producer uncertainty; nothing became eligible to publish. The public site is therefore still showing the 16 Sep data. Do not weaken the evidence, critic, or publication gate merely to make a run pass. Trace the contested source row to its primary capture; correct it if the source is clear, otherwise withhold only the unproven value with a recorded reason. Then produce a fresh accepted, published daily dataset and independently verify it live. Include a regression fixture for this exact disagreement class and ensure a transient one-row dispute cannot prevent unrelated, fully sourced updates from publishing safely.

Add visitor measurement, choosing the most privacy-preserving practical design: no advertising, cross-site tracking, fingerprinting, user profiles, or reuse of the Google sign-in identity. Prefer first-party, aggregate/cookieless measurement with EU processing and a minimal retention period. It must show useful aggregate visitor counts (at minimum visits, unique visits if lawfully measured, top pages and referrers) to the operator without exposing visitor-level data. Before deployment, audit the selected implementation against current German/EU rules, especially TDDDG §25 and GDPR. Update the live privacy policy to say exactly what is collected, why, where it is processed, retention and how to object/contact.

A cookie banner is required if the chosen analytics accesses or stores non-essential information on a visitor's device, or otherwise needs consent. Do not rely on the label "cookieless": assess unique identifiers, local/browser storage, fingerprinting and any third-party transfer. If, after the audit, the chosen implementation genuinely needs no consent, do not add a nuisance banner; document the technical/legal basis and verify that the implementation has no non-essential device access. If consent is required, add an accessible equal-choice consent banner before analytics loads, with Reject as easy as Accept, granular information, withdrawal and proof of the choice; analytics stays off until opt-in.

Use the existing Benchmark Heaven work loop and independent live verification. Do not expose analytics credentials or visitor data in git, evidence, prompts or logs.


## CR-20260917b — Benchmaxxing tag doubt: GPT-6 Astra tagged, GLM-5.2 not, DeepSeek V4 Pro looks more jagged → CR-68
Florian, Claude Code chat, 17 Sep 2026 ~10:15 UTC, verbatim:

> also doublecheck for me why GPT-6 Astra gets a benchmaxxing tag in benchmark heaven and open source models like GLM-5.2 don't? I think something's wrong here. The Benchmaxxing radar chart doesn't look particularly jagged for GPT-6 Astra, in comparison to DeepSeek-V4-Pro for example, which ends up with a lower Benchmaxxing score. I think it can't be quite right. Explain this to me

Analysis by Claude Code (17 Sep 10:40 UTC, recomputed with the site's own `lib/benchmax.mjs` on the live view):
- The code does what it is written to do; no arithmetic bug. The flag comes from *within-topic* disagreement only.
- GPT-6 Astra: raw spread 17.2 (catalog mean 13.0), level 91 → ×1.15 → 19.7 → shrunk (k = 50, the cap) → 15.1.
  DeepSeek V4 Pro 0813: raw 21.2, level 64 → ×0.90 → 19.0 → 14.8. GLM-5.2: raw 11.9 → 12.3 (rank 125/133).
  Astra and DeepSeek are equal within noise; the level correction flips their order.
- Astra's whole signal comes from three **vertical-domain boards from Vals** sitting inside general topics:
  Finance Agent v2 (p40) and HLAB legal agent (p47) inside "Agentic" next to Terminal-Bench (p96–100);
  Legal Research Bench (p56) inside "Knowledge" next to HLE/Omniscience/SimpleQA (p99–100).
  Being average at legal/finance work is domain specialisation, not benchmaxxing.
- "Vals Index v2" is paired against its own components (Terminal-Bench 2.1 (Vals), Finance Agent v2, …) — double counting.
- DeepSeek's radar looks jagged mainly *between* topics (domain specialization 57 vs 20.6), which by design is not counted — the radar
  invites the wrong reading. Its strongest real evidence is a same-benchmark runner disagreement: Terminal-Bench 2.1 p14 (Vals) vs p79 (AA).
- Shrinkage sits at its cap (k = 50): across the catalog, differences in unevenness are barely distinguishable from coverage noise.
  The top 20 scores span 15.5–13.8 while intervals are ±1.5–2.

## CR-20260917c — Benchmaxxing score recalibrated: public headline boards vs held-out boards → CR-69 (supersedes CR-68.1, 68.2, 68.4)
Florian, 17 Sep 2026, verbatim:

> regarding the Benchmaxxing score: I don't know what exactly needs to be changed, but I can tell you from my experience with all the models: If the calculation mechanism manages to score Models like GPT-6 Astra and Fable 5.1 or Opus 5 or GPT-5.6-Sol rather low in the Benchmaxxing score and typical chinese open models (Except Kimi K3 which is sound) like GLM-5.2 or DeepSeek-V4.1-Flash or MiniMax-M3 or especially all the second tier chinese open models (like Nex-N2.5-Pro or Ling and Ring and Hy3 models by tencent or xiaomi models like MiMo-2.5) rather high in the scrore, then the score looks a lot more correct to me. I don't know what needs to be changed, but there a re a number of reasonable things I could imagine, e.g. we maybe shouldn't treat every benchmark with the same weight in the benchmaxxing radar, e.g. some are "headline" benchmarks, others are secondary/less trusted ones. Also maybe some of the agentic type of benchmarks should rather be counted not into the agentic category, e.g. Harveys Legal Agent benchmark maybe should rather go into Konwledge because Legal is more like a Knowledge topic. Also maybe some benchmarks should be excluded there, I am unsure. In general including more benchmarks seems great, but if some make the numer look unreasonable, let's experiment with excluding some second or third tier benchmarks from the calculation. also it's questionable how to compute the extent of this "jaggedness" that we think is the best indicator for benchmaxxing. I guess percentiles of benchmarkscores within the comparison group of other models are great, but maybe direct numeric result value comparison or mean quadratic distsances or something else are better. experiment until you found a combination that results more in what I expect and then give me a very simple, brief 3 sentence explanation on how that algorithm would look.

Calibration by Claude Code, job `~/jobs/bh-benchmaxxing-calibration-20260917/` (RESULT.md, EXPERIMENTS.md, benchmark-tiers.json, final.json), 17 Sep ~11:10 UTC:
- ~30 variants compared on the live view. Every tweak of the current *unevenness* measure (domain topics, no aggregates, RMS, z-scores, no level adjustment) orders only 20–64 % of Florian's (LOW, HIGH) pairs correctly — unevenness cannot tell benchmaxxing from specialisation. A **signed direction** (rank on public headline boards minus rank on held-out boards, same topic) orders 91 % (calibration half 83 %, held-out half 100 %); random tier labels give 47 % (max 0.83 over 60 shuffles). No lab, country, openness, price or name is an input.
- Three sentences for the site: (1) Benchmarks are split into public "headline" tests labs quote in launch posts and "held-out" tests whose questions are private, brand-new or newer than the models; indexes, judge-graded boards and legal/finance/medical specialist boards are left out. (2) For every headline/held-out pair in the same topic, the model is ranked among the models that took both tests, and the score is the average of how much higher it ranks on the headline test. (3) With few pairs the score is pulled toward zero, and the ⚠ tag needs the top tenth (fifth for the light tag), at least ten comparisons, and a gap that stays above zero when its benchmarks are resampled.


## CR-20260917d — Thinly evidenced models: sort them in place, marked, not in a separate section → CR-70
Florian, Claude Code chat, 17 Sep 2026 ~12:40 UTC, verbatim (with a screenshot of the video/ledger item "Dünne Datenlage nicht mehr oben — eigene Gruppe „zu wenig Belege“"):

> Zu Benchmark Heaven: lass uns die dünn belegten Modelle nicht in einem seperaten Abschnitt der Tabelle ablagern, sondern direkt unter den anderen modellen in der sortierung - sie müssen halt irgendwie markiert sein, damit man die hoche unsicherheit durch bisher geringe vorliegende benchmarkdaten irgendwie erkennen kann

(English: don't park thinly evidenced models in a separate table section; sort them directly among the other models by their score, but mark them clearly so the high uncertainty from little benchmark data is visible.)


## CR-20260917e — Benchmaxxing tab: no "strongest signals" mode, Featured default, absolute thresholds, several rows open → CR-71
Florian, Claude Code chat, 17 Sep 2026 ~13:20 UTC, verbatim:

> Regarding the benchmarking tab in Benchmark Heaven:
> - Let's remove the strongest signals mode. It looks a bit like calling out these labs. I don't want to have that.
> - Let's use feature models as the default that opens when the page is opened.
> - Let's define a signal of more than +5 as a weak benchmarking warning, and +10 or higher as the strong type of warning.
> - Let's allow opening more than only one row with the expand and collapse feature. I think it is valuable if the user can see two different radar diagrams at once and compare them right in the table.


## CR-20260917f — Mobile hero typography: no orphaned final word → CR-72
Florian, Hermes chat, 17 Sep 2026, verbatim:

> Can we make the font size if these two header sentences adjust in mobile portrait so that it doesn't wrap for 1 word? Looks weird.

The two hero sentences are the live landing copy: “The most detailed cost–capability analysis in AI.” and “Every model. Every Benchmark. Actual Costs.” On mobile portrait, neither sentence may leave a single final word stranded on its own line. Use responsive typography/layout that remains readable rather than a fixed desktop-sized headline or a manual breakpoint-specific line break. Preserve the exact approved copy, semantic heading structure, desktop/tablet layout, zoom/reflow, and accessibility.


## CR-20260917g — Make the data-update mechanism substantially more efficient without weakening it → CR-73
Florian, Hermes chat, 17 Sep 2026, verbatim:

> Kann man den Mechanismus effizienter machen?

Measured baseline: the successful 17 Sep run took 113 minutes. The two dominant stages were `review-live` (34.6 min) and `refresh-benchmarks` (71.1 min); the remainder, including build, tests and the hash-bound publication gate, was comparatively small. It made 46 LLM worker calls, including several malformed/timeout retries and paid fallbacks. The improvement must be based on a profiler and preserve the same or stronger source, parser, blast-radius, independent-critic and hash-bound publication guarantees. Do not make a run look faster by skipping changed data, treating failed reviews as passes, lowering source evidence requirements, or publishing an unreviewed candidate.

Aim for an incremental pipeline: unchanged, hash-identical source captures reuse their prior verified decision; only changed source units and their dependent derived rows are rebuilt and independently checked. Parallelise independent fetch/parse/review work only where it cannot race the staging checkout or change the deterministic published result. Keep bounded retries and quarantine unproven rows, but prevent one slow/malformed worker from serially stalling unrelated verified units. Prefer the approved free producer/critic routes; paid fallback remains only when the existing qualification/health rules require it, and receipts must show actual calls and cost.

Record per-stage and per-source timing, cache hit/miss, retry, model/cost and critical-path data in every run report. Define a realistic target from the profiler, then prove it with two consecutive unattended full runs plus a changed-source run; compare output and gate decisions against an uncached baseline. Keep the current prices-only fast path and make its time budget observable too. A second engine must independently verify both correctness and the measured speedup live.


## CR-20260917i — Fix missing/clipped model-table headers on phone → CR-79
Florian, Hermes chat, 17 Sep 2026, verbatim:

> Fix the headers

The attached 390 px phone screenshot shows the card below “Most capable models and what they really cost” with its column-header row visually broken: the Model column is blank, and the score/cost labels are clipped so only fragments of their explanatory text are visible. This is not an intentional compact layout. Restore a clear, visible, correctly aligned header for every displayed column: Model (including the provider context), Benchmark Heaven Score / main composite score, and adjusted cost per task / its modelling basis. The labels may be compact on a phone, but their primary names must not be hidden, white-on-white, overlapped, clipped, or reduced to an unexplained fragment. Preserve the actual table semantics, sort controls, screen-reader labels, desktop/tablet layout, horizontal overflow handling and row alignment; do not hide the header as a workaround.

Acceptance: independent fresh live inspection on both public hosts at 360, 390 and 430 px portrait in light and dark themes. Capture browser geometry or screenshots demonstrating each visible header has a non-zero rendered box, non-empty visible text, sufficient contrast, no overlap/cropping and alignment with its data column; test sort by keyboard and touch. Add a regression test that would fail if a phone header becomes clipped/empty again.


## CR-20260917h — Launch sprint: 3 Benchmaxxing tag levels, Top 50 mode, composite with marginal Benchmaxxing component, advanced-mode fixes → CR-74
(Filed as CR-20260917h/CR-74 because CR-20260917f/g and CR-72/73 were already used by the supervisor's hero-typography and daily-efficiency requests.)
Florian, 17 Sep 2026 ~17:30 UTC, verbatim (German):

> lass uns die schwellen für die Benchmaxxing tags noch mal ändern: ab +3 das leichte tag, ab +6 ein mittelstarkes und ab +12 ein sehr starkes benchmaxxing warnungs tag.
> und lass uns in der "Featured models" ansicht (die ja jetzt dann der neue default wird) per default alle anzeigen (also das was bisher passiert, wenn man auf "Show all 17 in this list" klickt). Lass uns neben "Featured models" und "All scored" auch noch einen dritten modus (zwischen den beiden) einführen: "Top 50" (und zwar sind das die top 50 Modelle nach "(Benchmark Heaven Main Composite Score", wie wir ihn auf der Overview seite verwenden).
> Noch was zum "Benchmark Heaven Main Composite Score": Lass uns hier ganz leicht auch noch das Benchmaxxing signal bercksichtigen, aber nur marginal - gerade so viel, dass eventuell sich der Spitzenplatz im Ranking von aktuell Fable 5.1 auf Platz 1 und GPT-6 Astra auf Platz 2 um dreht, sodass GPT-6 Astra auf Platz 1 kommt und Fable 5.1 auf Platz 2. Aber nicht noch stärker berücksichtigen. Gib in den Options eine Checkbox, ob der Benchmaxxing Anteil in den score einfließen soll oder nicht (per default: ja).
> Mir sind noch kleine Sachen aufgefallen: in benchmaxxing die checkbox wo man die 238 achen einblenden kann, sollte weg - die charts in diesem modus sehen sehr komisch aus weil selbst bei sehr bekannten Modellen dann der großteil der achsen leer ist.
> In der overview bei advanced mode, wenn man einen der dropdowns "Better than a model ▾" oder "Evidence ▾" öffnet (also das popup öffnet), dann verschiebt sich die ganze Zeile. Außerdem, zeige bei diesem Advanced mode außerdem bitte die ganzen options, also alles was in dem popup kommt, wenn man in der Headerleiste auf "Options" klickt.
> Können wir auch schauen, ob das Entfernen der Trennung der Modelle in der Haupt model capability/cost Tabelle zwischen denen im Abschnitts "Insufficient evidence" und den restlichen Modellen ein hoch priorisiertes Thema ist? Ich hätte das gerne noch drin, bevor wir ausliefern.
> ... wir müssen jetzt auf jeden Fall noch ein paar Themen fertig bekommen, mindestens das mit den Änderungen bei Benchmaxxing und den "Insufficient evidence" Modellen (nicht mehr in eigenem Abschnitt).
> Eventuell kannst du Dinge auch effizient in mehrere Subagenten aufteilen und parallel erledigen lassen, z.b. je Thema ein Subagent, dann der Subagent (Opus 5) ggf noch beliebig viele Subagenten mit kostenlosen oder günstigen opencode Modellen, damit wir da möglichst schnell voran kommen.
> Vielleicht können wir für die Beschleunigung auch noch den Gauntlet Loop vorübergehend (für die nächsten paar Stunden) etwas weniger streng gestalten.


## CR-20260917i — Home page: plain-language section headers, green-line caption, "Capability Score" column → CR-75
(Filed as CR-20260917i/CR-75 because CR-20260917g/h and CR-73/74 were already used by the daily-efficiency request and the launch sprint.)
Florian, 17 Sep 2026 ~17:45 UTC, verbatim (English), with a 390 px screenshot of benchmarkheaven.com Simple mode:

> one more important change request: a friend told me he didn't immediately understand the page that opens when naviagating to benchmarkheaven.com. I think the reason is we are lacking simle explanatory headers/captions above the section with the pareto chart and the section with the model list and capcbility score and cost columns.
> I guess these headers would say something like (please find better phrasing if needed):
> - "Strongest model for each price"
> - "Most capable models and their actual costs"
> And maybe directly below the pareto chart a short sentence saying something like: "all models on the green line are leading by capability in their cost class" (or better phrased if you have a good idea - it should be short and easy to grasp)
> And I think that column that just shows "Score" currently, and below that in parentheses "(Composite)" - maybe we can rename "Score" to "Capability Score" and instead of just "Composite" show that full title "Benchmark Heaven Main Composite Score)", maybe in two lines - or if you think that's too much text, maybe just "Main Composite Score".


## CR-20260917i — Value map needs subtle axis labels → CR-76
Florian, Claude Code chat, 17 Sep 2026 ~21:55 UTC, verbatim:

> Wenn du das hast, vielleicht kannst du auch noch eine kleine subtile Achsbeschriftung beim Pareto Chart auf der Overvieseite einbauen, man sieht im Moment am Diagramm nicht, dass die eine Achse capability und die andere cost per task ist.

(English: add small, subtle axis labels to the value map on the Overview page — right now you cannot see that one axis is capability and the other is cost per task.)


## CR-20260917j — Benchmaxxing tags follow the score; Pareto line with a grace band → CR-77
Florian, Claude Code chat, 17 Sep 2026 ~21:40 UTC, verbatim:

> Noch eine dringende änderung:
> In der benchmaxxing Tabelle ist "DeepSeek V4.1 Flash" gelistet mit einem Benchmaxxing Signal von +6.4, aber es wird Benchmaxxing warning tag angezeigt. Es müsste der medium tag angezeigt werden (? light ≥ +3, ⚠ medium ≥ +6, ⚠⚠ very strong ≥ +12)
> Da steht auch noch "each needs ≥ 10 comparisons and an interval above zero" - liegt es daran? Wenn ja, ich glaube wir sollten es trotzdem ändern, ich würde den benchmaxxing tag gerne bei DeepSeek V4.1 Flash sehen.
> Wenn ich auf Top 50 umschalte fällt das gleiche Problem auch bei Gemini 3.7 Flash und Muse Spark 1.2 auf und bei DeepSeek V4.1 Flash auch noch mal, sowie Muse Spark 1.1 und weiteren Modellen.
> Behebe das mit Priorität.
> Und dann: lass uns im pareto chart auf der startseite auch Fable 5.1 teil der Linie sein, es hat fast exakt den gleichen Score wie GPT-6 Astra, lass uns einen gewissen Grace-Delta-Abstand akzeptieren für die Linie, sodass auch Fable 5.1 mit Teil der Linie ist.
> Erledige das sofort, informiere mich vie /notify-telegram wenn es live ist.

(English: the Benchmaxxing tag must follow the score alone — DeepSeek V4.1 Flash at +6.4 must carry the medium tag, and the same for Gemini 3.7 Flash, Muse Spark 1.1/1.2 and the other models in Top 50 that reach a threshold but are held back by the "≥ 10 comparisons and an interval above zero" guards. And: the homepage Pareto line must accept a grace delta on the capability axis so Claude Fable 5.1, which is only 0.13 points behind GPT-6 Astra, is part of the green line.)


## CR-20260917j — Mix the old within-topic jaggedness back into the Benchmaxxing score → CR-78
Florian, Claude Code chat, 17 Sep 2026 ~22:20 UTC, verbatim:

> how would the benchmaxxing score list look, if we'd mix that jaggedness of scores within one benchmark category into the final score a little bit again? Wich models from the top 50 would be shown as light/medium/severely benchmexxed by the signal?
> [after seeing the simulation] yes, mix that jaggedness back into the score

Simulation by Claude Code (17 Sep, live view, 171 scored models): jaggedness = the pre-CR-69 measure (mean absolute
within-topic common-cohort percentile difference over all comparable pairs, weighted by each topic's degrees of freedom);
catalog mean 13.1, sd 4.5. Blended = signal + 0.3 × (jaggedness − 13.1). Top-50 tag counts: light 8, medium 8, severe 1
(today: 8 / 8 / 0). Only three level changes, all upward: Muse Spark 1.1 medium → severe (11.7 → 13.8),
Qwen3.7 Max light → medium (5.8 → 7.7), Gemini 3.6 Flash untagged → light (2.4 → 3.2); Hy3 moves down (5.8 → 4.3).
No frontier model (GPT-6 Astra, Opus 5, Fable 5.1, GPT-5.6 Sol, Kimi K3) is tagged at this weight.


## CR-20260918a — Muse Spark 1.3 missing from the homepage leaderboard → CR-80
Florian, Claude Code chat, 18 Sep 2026 ~14:40 UTC, verbatim:

> Why isn't Muse Spark 1.3 showing up in the leaderboard on the benchmarkheaven.com startpage? Make sure it is

Diagnosis (Claude Code, live /api/page-data/home): `muse-spark-1.3::max` has composite 95.08 (xhigh 94.78) but `offer_count` 0 — no priced offer
in the catalog — so the homepage table/value map (which need a cost) drop it. Same for all Muse Spark versions (Meta).


## CR-20260918b — Add WeirdML v3 → CR-81
Florian, Claude Code chat, 18 Sep 2026 ~14:50 UTC, verbatim:

> when done: add this to benchmark heaven. https://x.com/htihle/status/2100892831187443782

The post (Håvard Ihle @htihle, 18 Sep 10:20 UTC, thread 1/8): "Introducing WeirdML v3, a fully agentic benchmark featuring 11 complex hand-made
tasks. Models must explore and understand unfamiliar data, develop ML and data analysis pipelines and produce results despite limited data,
unspecified goals and/or very limited feedback." Results image in the post; the thread continues 2/8–8/8 (quotes WeirdML v2: 19 tasks, API costs tracked).


## CR-20260918c — New benchmarks from Florian's X bookmark folder "evals" (BrokenArXiv, ArXivMath and 2 more) → CR-82
Filed automatically by the bookmark intake (`/opt/benchmarkheaven/bin/bookmarks_intake.py`), 18 Sep 2026 15:24 UTC. Standing rule, Florian 18 Sep 2026, verbatim:

> new rule for benchmark heaven: it should look into https://x.com/i/history/bookmarks/2098158441952907558 once a day and check if there are new evals/benchmarks it doesn't have in its list yet, and then add them

Source folder: (from seen.jsonl)

### BrokenArXiv — https://x.com/j_dekoninck/status/2100180792601420138
Bookmarked post by Jasper Dekoninck (@j_dekoninck), posted Wed Sep 16 11:11:35 +0000 2026. Post text, verbatim:

> We are releasing the latest version of BrokenArXiv and ArXivMath! These benchmarks now focus on conjectures that were refuted in the last month on ArXiv, and models are executed within a harness instead of directly via API.
>
> Performance remains impressive, with GPT-6 Astra on top https://t.co/UCJHeE1Szl

Media in the post: `https://pbs.twimg.com/media/HSVXTRJbIAAmU_j.jpg` (results are often only in the image — read it).
Registry check: family registered (matharena-brokenarxiv::2026-06); the post states no version; the post (2026-09-16) announces a release newer than the pinned version (2026-06-01), so the version has to be read off the primary source.

### ArXivMath — https://x.com/j_dekoninck/status/2100180792601420138
Bookmarked post by Jasper Dekoninck (@j_dekoninck), posted Wed Sep 16 11:11:35 +0000 2026. Post text, verbatim:

> We are releasing the latest version of BrokenArXiv and ArXivMath! These benchmarks now focus on conjectures that were refuted in the last month on ArXiv, and models are executed within a harness instead of directly via API.
>
> Performance remains impressive, with GPT-6 Astra on top https://t.co/UCJHeE1Szl

Media in the post: `https://pbs.twimg.com/media/HSVXTRJbIAAmU_j.jpg` (results are often only in the image — read it).
Registry check: family registered (matharena-arxivmath::2026-06); the post states no version; the post (2026-09-16) announces a release newer than the pinned version (2026-06-01), so the version has to be read off the primary source.

### VulcanBench-SWE v4 — https://x.com/morganlinton/status/2098909653149401222
Bookmarked post by Morgan (@morganlinton), posted Sat Sep 12 23:00:31 +0000 2026. Post text, verbatim:

> Muse Spark 1.3 is the slowest model I've benchmarked on VulcanBench so far. I don't quite know what is going on, but it took 51.3 hours, on it's lowest effort level, to complete the 23 tasks in VulcanBench-SWE v4.
>
> For comparison, it took Astra 1.6 hours on Low Effort to complete the same 23 tasks.
>
> Also only 10/23 full passes so pretty disappointing on the accuracy side. Not sure what's going on with Muse, going through the traces to try to understand this better.
>
> I can't continue running the benchmark until the Sept 14th as I hit a usage limit on my $50 Muse Code plan.
>
> For comparison, I was able to run every effort level, with Astra, on my $100 plan and still have room to spare.
>
> If anyone from Meta wants to look at the traces with me you're welcome to, this is a weird one.
>
> At this rate, it might take me a month or longer to benchmark this model. For comparison, exact same full effort sweep took ~12 hours with Astra.
>
> For some reason I thought Muse Spark would be faster/more token efficient than Astra...but it's not remotely close.

Media in the post: `https://pbs.twimg.com/media/HSDSIVobYAAq99G.jpg` (results are often only in the image — read it).
Registry check: not in the registry and not in any change request.

### KernelBench-CUDA — https://x.com/elliotarledge/status/2098577337407484408
Bookmarked post by Elliot Arledge (@elliotarledge), posted Sat Sep 12 01:00:01 +0000 2026. Post text, verbatim:

> DeepSeek V4.1 Flash on KernelBench-CUDA. DeepSeek Native Sparse Attention for RTX PRO 6000 at 0.50 of the dense-equivalent roofline, fourth on the board. Fable 5.1 is 1.06, Opus 5 is 1.04, Fable 5 is 0.73. The ceiling bills dense attention, so the honest unit is time: 0.059 to 0.736 ms across the six shapes.
>
> Inline PTX on SM120: `mma.sync` bf16, `ldmatrix`, xor-swizzled `cp.async`, and an fp32 block-scoring top-8 prologue fused into the attention kernel with the reference's exact tie-break. Then it leaves the sparsity on the table: at 8K context the semantics need about 14% of the causal block triangle and this kernel executes 78% of it. That over-compute is the whole gap to the top three.
>
> Rest of this deck:
> GLM-5.2 Fused MoE: 9.5% of roofline, Opus 5 is 10.7%
> MegaQwen Decode: 5.4% of roofline, Opus 5 is 6.6%
> Grid + MinGRU: 29% of roofline, Opus 5 is 196%
>
> For this model for DeepSeek, I have not used it much, so I figure I'll at least test it before using it, but it's been a decent general task delegator for now. I haven't really pushed the limits of the model except for this benchmark.
>
> https://t.co/BiHtR9p04C

Links in the post: `https://kernelbench.com/cuda`
Media in the post: `https://pbs.twimg.com/media/HR-NoEobsAAm-Fl.png` (results are often only in the image — read it).
Registry check: not in the registry and not in any change request.


## CR-20260919a — New benchmarks from Florian's X bookmark folder "evals" (RSI-Exam) → CR-83
Filed automatically by the bookmark intake (`/opt/benchmarkheaven/bin/bookmarks_intake.py`), 19 Sep 2026 06:45 UTC. Standing rule, Florian 18 Sep 2026, verbatim:

> new rule for benchmark heaven: it should look into https://x.com/i/history/bookmarks/2098158441952907558 once a day and check if there are new evals/benchmarks it doesn't have in its list yet, and then add them

Source folder: https://x.com/i/history/bookmarks/2098158441952907558

### RSI-Exam — https://x.com/HuaxiuYaoML/status/2100959310624825688
Bookmarked post by Huaxiu Yao (@HuaxiuYaoML), posted Fri Sep 18 14:45:08 +0000 2026. Post text, verbatim:

> 📊 RSI-Exam now has more frontier models on the board: Fable 5.1 @AnthropicAI, Muse Spark @AIatMeta, and Seed-Evolving-0909 @ByteDanceSeed_.
>
> 🥇 GPT-6-astra still #1 at 0.5126
> 🆕 Fable 5.1 lands straight at #2 (0.4813)
>
> As of this release, still nobody has reached the frontier-calibrated reference.
>
>  🔗 https://t.co/8uvx0jMr0K

Links in the post: `http://rsi-exam.ai`
Media in the post: `https://pbs.twimg.com/media/HSgZxCpWYAA3Q0P.jpg` (results are often only in the image — read it).
Registry check: not in the registry and not in any change request.


<!-- Seeded 2026-09-19 07:15 UTC by the work iteration (claude-opus) from ops/ux-2026-09-12/jevbench/CR-20260919a.md, delivered by the supervisor as an untracked folder. Its heading said "→ CR-83", but the bookmark intake had already taken CR-20260919a / CR-83 for RSI-Exam an hour earlier; this one is numbered CR-84. Text below is the file verbatim. -->
## CR-20260919a (JevBench, second file of that date) — "Jev-class models": our own benchmark gets its own section → CR-84 (file said CR-83; renumbered, see note)

Florian, X post 18 Sep 2026, verbatim (quoting @stochasticchasm, "all these open jev recreations
remind me of people chaining 5 web search tool calls together and calling it open deep research"):

> we need a Jev benchmark - to see which of the Jevs is actually good => smart + cheap + fast + reliable + ideally open

Florian to Claude Code, same day, verbatim:

> Wenn das Ergebnis gut wird, kannst du gerne einen starken launch post machen. Und eventuell gleich noch recherchieren wer die Marktmitbewerber sind und einen Benchmark implementieren und umsetzen und auf Benchmark Heaven eine eigene Sektion Jev Models hinzufügen und dann kann BenchmarkHeaven darüber posten.

**The benchmark exists and has been run.** JevBench v1: 9 systems x 242 typed decisions, measured
on 19 Sep 2026 from this server. This CR is the page, the data and the registry entry - the
measurement work is done and is not asking anything of this loop.

Delivered next to this file, all self-contained:

| File | What it is |
|---|---|
| `jevbench/SPEC.md` | The complete page, data-contract and acceptance specification |
| `jevbench/jevbench-v1-results.json` | The publication-safe results artifact (aggregates only; no item text, no label, no per-item prediction) |
| `jevbench/registry-entry.json` | The proposed `jevbench::v1` registry entry, every field populated |
| `jevbench/charts/` | Reference renderings of the three charts, for layout only - the page should draw its own from the JSON |
| `jevbench/PAGE-COPY.md` | Ready English copy: lead, method, limits, per-row credits and links |

Route `/jev-models`, nav label **Jev-class models**. Suggested data home:
`data/raw/benchmarks/jevbench/v1/jevbench-v1-results.json`.

Three things that matter more than the layout:

1. **It is our own benchmark, and the page has to say so in the lead**, not in a footnote.
   Benchmark Heaven is measuring here, not aggregating someone else's leaderboard.
2. **Five axes, five sortable columns, no combined winner.** Smart, cheap, fast, reliable, open.
   The whole point of Florian's brief is the trade-off between them; a single composite would
   delete it.
3. **Nothing on the page may invent a number.** A route with no billable account carries a null
   price and the page must render "no per-token tariff", never `$0.00`. Systems we could not run
   get an availability row with the concrete reason, outside the ranking.

Registry: category `Other` for now - there is no decision-model category. If a new category is
worth the UI work, "Decision models" is the accurate label and would also fit later entrants.


## CR-20260919a — DeepSeek V4.1 Flash has almost no scores → CR-85
Florian, Claude Code chat, 19 Sep 2026 ~09:00 UTC, verbatim: "wieso hat DeepSeek V4.1 Flash keine scores auf benchmark heaven"

Diagnosis (Claude Code): live row `deepseek-v4.1-flash::max` shows only composite 71.3 from ONE input (AA Intelligence Index 39.5, coverage 1/7, 0 attached), no coding/agentic/category scores, although it has 16 benchmark results. Cause at the source: in `data/raw/artificialanalysis.json` (AA API) the model (released 2026-09-10) has intelligence_index 39.5, hle 0.392, scicode 0.519, lcr 0.84 and **null** for coding_index, livecodebench, terminalbench, tau2 etc. The older DeepSeek V4 Flash 0731 has a full set (coding index 69.1, coding agent 49.8, agentic 41.7, Epoch ECI). The composite and the Benchmaxxing tag (medium) of V4.1 Flash therefore rest on very thin evidence.


<!-- Seeded 2026-09-19 ~08:45 UTC by the work iteration (claude-opus, iteration 117) from ops/ux-2026-09-12/jevbench/v1.1/CR-20260919-jevbench-v1.1.md, delivered by the supervisor as an untracked folder. Numbered CR-86 (CR-85 is DeepSeek V4.1 Flash). Text below is the file verbatim. -->
## CR-20260919 (JevBench v1.1) → CR-86 — Main Score, three sub-benchmarks, easy tier, Needle 3 → follow-up to CR-84

Florian, 19 Sep 2026 ~07:20 UTC, verbatim:

> Regarding Needle vs Jev and the Jev benchmark: [...] Would it make sense to add a few simpler tasks to the benchmark so that Needle also at least can solve a few of the Jev Benchmark tasks and doesn't land at a 0% score? I reckon it would be unfair to rate it as 0 because almost certainly some other Jev lookalike projects will be even worse and thus should end up with a lower score than Needle 3.

Florian, 19 Sep 2026 ~07:35 UTC, verbatim (German):

> Zu Jev Bench: Wir brauchen ganz klar nicht nur capability (Accuracy) sondern auch Speed und Cost als Achsen des Benchmarks, alles drei sollten sub-benchmarks des JevBench sein und der JevBench Main Score ist dann ein Composite Score der all diese Faktoren kombiniert.

**This supersedes one point of CR-84:** CR-84's file said "five axes, no combined winner". Florian
has now decided the opposite for the headline: JevBench has **one Main Score**, a documented
composite of three sub-benchmarks. The sub-scores stay visible and sortable, so the trade-off is
not hidden. Everything else in CR-84 (own benchmark said in the lead, no invented numbers,
availability rows outside the ranking) still holds.

**The measurement is done.** v1.1 = v1.0's 242 decisions (unchanged) + a new 72-decision easy tier,
11 systems, measured 19 Sep 2026. Nothing here asks the loop to run a model.

Delivered next to this file (`ops/ux-2026-09-12/jevbench/v1.1/`):

| File | What it is |
|---|---|
| `jevbench-v1.1-results.json` | Publication-safe artifact (aggregates only). Suggested home: `data/raw/benchmarks/jevbench/v1.1/jevbench-v1.1-results.json` |
| `PAGE-COPY-v1.1.md` | Ready English copy for the new sections |
| `charts/` | Reference renderings (main score, sub-benchmarks, tiers, sensitivity) - layout reference only; the page draws its own from the JSON |
| `registry-entry-v1.1.json` | `jevbench::v1.1` registry entry |

### What the page needs

1. **Main Score first.** Default sort of the `/jev-models` table = `main_score` desc. Columns:
   Main, Capability, Speed, Cost, then Easy / Standard / Judge tier accuracy, p50 / p95 latency,
   $ per 1,000 decisions. All sortable, nulls last in both directions.
2. **The formula on the page, in words, next to the table:** "Main Score = 0.6 x Capability + 0.2 x
   Speed + 0.2 x Cost", with the normalisation (`scoring.*` strings in the JSON are the approved text).
3. **Sensitivity table** (`systems[].rank_under`, `systems[].sensitivity`, `sensitivity_weightings`):
   rank and score under the six weightings; highlight cells whose rank differs from the headline.
4. **Estimated costs are visibly estimates:** `cost.kind == "estimate"` renders with a "~" and an
   "est." tag and `cost.basis` as the tooltip/footnote. `kind == "unknown"` renders "no tariff", never
   $0.00.
5. **Needle 3 rows:** `has_distribution == false` → the calibration cells read "no calibrated
   distribution", never blank and never 0. The "options as tools" mode is a separate, asterisked row
   with its note (`systems[].note`).
6. **Partial runs** (`ranked == false`): shown below the ranked rows, hatched/greyed, no rank number,
   with the reason.
7. **Version:** the page shows v1.1 by default and links v1.0 (`jevbench-v1-results.json` stays as
   published). Never mix v1.0 and v1.1 numbers in one column.

### Acceptance

- Every number on the page is read from the JSON; a reviewer can pick any row and recompute its Main
  Score from `capability.score`, `speed.score`, `cost.score` with the published weights.
- No `$0.00` and no blank calibration cell anywhere.
- The sensitivity table exists and matches `rank_under`.
- Mobile: the table scrolls horizontally with the system name column pinned (per the 15 Sep mobile directive).

Registry: `jevbench::v1.1`, category `Other` (same as v1). Source: https://github.com/fstandhartinger/jevbench (tag `v1.1`).

<!-- Filed 2026-09-19 ~08:58 UTC by a Claude Code supervisor job (not the loop). High priority: Florian wants this before the JevBench v1.1 launch tweet, which links this page. -->
## CR-20260919b (JevBench page) → CR-87 — Main Score is the hero; adjustable Capability:Speed:Cost weights — HIGH PRIORITY

Florian, Claude Code chat, 19 Sep 2026 ~10:40 Berlin (08:40 UTC), verbatim:
> Also: Can we please have a link to benchmarkheaven.com page (https://benchmarkheaven.com/jev-models) in that post and can we please adjust https://benchmarkheaven.com/jev-models so that the composite score is the main message, not the "Smart" column? also add a way to the page to configure the 60:40:40 mix of Accuracy:Speed:Costs - some uses may regard cost as more important, others speed, others accuracy.

Supervisor notes (not Florian's words):
- He most likely looked at the page before CR-86 went live at 08:45 UTC (v1.0 had no combined score). CR-86 already sorts by Main Score; this CR makes the Main Score unmistakably the headline and adds the weight controls.
- "Smart" / "Accuracy" = the benchmark's **Capability** sub-benchmark. Use the benchmark's own names everywhere (Main Score, Capability, Speed, Cost); no "Smart" wording anywhere on the page.
- "60:40:40": the published JevBench v1.1 weights are **60 : 20 : 20** (Main = 0.6·Capability + 0.2·Speed + 0.2·Cost, `jevbench/composite.py`). The default must stay the published weights; the supervisor asks Florian separately whether he wants the official mix changed. Do not change the official score in this CR.

### CR-87 addendum (Florian, Claude Code chat, 19 Sep 2026 ~08:55 UTC, verbatim)
> It would be good if that jev-models page could also contain a bar chart like the one you sent me on telegram [the "JevBench v1.1 – Main Score" horizontal bar chart: Main Score bars coloured by type (Jev closed / open rebuild / instruction model / small tool-calling model / partial run hatched), Capab./Speed/Cost columns with "est." marks, formula line and footnotes]. I think people that saw my post on X and then visited the benchmark heaven page would expect to find that diagram there. so please add it. along with the other changes we just discussed.
> also: once the user changed the weighting of Accuracy/Speed/Price (default: "60:20:20") we need to show pretty clearly in the charts that this is not the default Composite Index config anymore. Let's add some presets and give them names. Let's call them:
> - JevBench Main Composite Score - Emphasis on Accuracy ("60:20:20") - the default
> - JevBench Main Composite Score - Emphasis on Speed ("20:60:20")
> - JevBench Main Composite Score - Emphasis on Cost ("20:20:60")
> - JevBench Main Composite Score - Balanced ("33:33:33")
> We should also add links to the benchmarked projects on the page.

(The bracketed description of the Telegram chart was added by the supervisor. Florian confirms the default is 60:20:20 — the "60:40:40" above was a slip; the official weights stay as published. His four named presets replace the preset list in CR-87.2.)

### CR-87 addendum 2 (Florian, Claude Code chat, 19 Sep 2026 ~09:10 UTC, verbatim, German)
> Zur Kostenspalte auf der Seite: Wir müssen natürlich für jedes der Modelle den Preis wissen. Wenn wir ihn nicht öffentlich nachschlagen können, setze realistische Preise an, so wie üblicherweise Modelle bepreist werden, die eine dementsprechende Hardware brauchen und bei einem größeren Inference Provider gehostet werden (Inference Provider können billiger anbieten als es kostet wenn man auf Minutenbasis bei runpod hardware mietet, weil die mieten ja größere Kontingente von GPUs und auf längere Zeiträume, oder sie besitzen die Hardware gar).
> Die Namen würde ich auch gerne noch mal anpassen:
> JevBench Main Composite Score – (Emphasis on Accuracy 60:20:20)
> JevBench Composite Score - Emphasis on Speed (20:60:20)
> JevBench Composite Score – Emphasis on Cost (20:20:60)
> JevBench Composite Score – Balanced (33:33:33)
> sende mir eine Telegram Message wenn diese Änderungen alle durch sind.
> ich will dann gerne auch noch mal vergleichsweise sehen, wie Jev im Vergleich zum Feld abschneidet, wenn wir JevBench Composite Score – Balanced (33:33:33) zum Main-Score machen würden

### CR-87 addendum 3 (Florian, Claude Code chat, 19 Sep 2026 ~09:20 UTC, verbatim, German)
> Ja, dann lass uns zum Balanced Score als Main Score wechseln.
> Und dann mach natürlich auch noch mal eine Version von dem neuen Harold Video - mit den aktualisierten Ergebnissen.
> Die Kostenbewertung darf nicht bei DeBERTa und Needle auf dem gleichen Wert von 100.0 stehen, wenn deren realistische Preise nicht identisch sind.
> Auch das Explainer Video müssen wir dann natürlich noch mal anpassen, damit es zu den neuen Ergebnissen passt.

(Supervisor: addendum 3 supersedes the default in addendum 2 — the Main Score is now "JevBench Main Composite Score – (Balanced 33:33:33)"; the others are "JevBench Composite Score – Emphasis on Accuracy (60:20:20)", "– Emphasis on Speed (20:60:20)", "– Emphasis on Cost (20:20:60)". Scoring change published as JevBench v1.1.1 (hosted-provider prices) and v1.1.2 (Balanced weights, Cost scale $0.001–$10) in github.com/fstandhartinger/jevbench.)

## CR-20260919c (JevBench page) → CR-88 — hide /jev-models while JevBench v1.2 is work in progress — HIGH PRIORITY

Florian, Claude Code chat, 19 Sep 2026 ~10:10 UTC, verbatim, German:
> Lass uns auch vorerst die Jev Seite aus dem Menü von Benchmark Heaven entfernen und auf der Seite jev-bench einen dicken "work in progress" disclaimer platzieren. das nehmen wir dann weg, wenn wir fertig sind. Ich will nicht dass Leute den unfertigen Stand veröffentlichen.

Supervisor notes (not Florian's words): implemented by the supervisor job ~/jobs/jevbench-v1-2-hard-20260919 while the loop was paused.
- CR-88.1: remove "Jev-class models" from the header menu (desktop More + phone menu) and `/jev-models`, `/jev-models/v1` from the sitemap.
- CR-88.2: a big "Work in progress — results are preliminary, please don't share or cite them yet" banner at the top of `/jev-models` and `/jev-models/v1`, plus `robots: noindex, nofollow`. The pages stay reachable by URL.
- Reverse both only when Florian says JevBench v1.2 is final (the same job files the reversal). Iterations: do not remove the banner or re-add the menu link on your own.

## CR-20260919d (Support link) → CR-89 — "Support Benchmark Heaven" link: footer, About page, FUNDING.yml, README

Florian, Claude Code chat, 19 Sep 2026 ~10:15 UTC, verbatim, German:
> und noch was, können wir auf dem Repo von benchmarkheaven und vom jevbench und auch auf dem autorouter repo und auch auf der benchmarkheaven seite eine Spenden-Möglichkeit einbauen? Ich bin eine 1-Personen Hobby Person, die Kosten sind nicht ohne für mich.

Supervisor notes (not Florian's words), filed by ~/jobs/support-links-20260919:
- The payment link already exists (pay-what-you-want Stripe link on Florian's company account, EUR, preset 5 €, 1–500 €): **https://donate.stripe.com/fZu00i9ro0wmdF88sg1Jm01**. Use exactly this URL; do not create another one.
- Wording: **"Support"** ("Support Benchmark Heaven", "Support this project"), never "donation"/"donate"/"Spende" — payments go to a company and are not tax-deductible donations. Where there is room, one short line: "Payments go to productivity-boost.com Betriebs UG (haftungsbeschränkt) & Co. KG, the one-person company behind these projects."
- Same link is already live on whichmodel.app.mintapis.com and bonsai-swarm.app.mintapis.com (footer + page paragraph) and in FUNDING.yml of bonsai-swarm, auto-router-demo, jevbench, auto-model-router.



## CR-20260919c — /jev-models: difficulty filter, per-task view, topic radar → CR-90
Florian, Claude Code chat, 19 Sep 2026 ~12:00 UTC, verbatim:

> two more ideas for the Jev benchmark result page: we could also add a trackbar for easy/medium/hard tasks - or maybe it would be better some other user interface widget than a trackbar - that allows the user to configure if they want to see the normal benchmark results (where all tasks are included, easy+medium+hard) or only the results of where easy or easy+medium are included, so that people can wonder if their own usecase they want to make an informed decision for (based on our evaluation results) is maybe easy enough to go for one of the open Jev alternatives that may be cheaper+faster but just don't score as well for the harder tasks.
> We should maybe somewhere further down in the page also show a nice scatterplot (or something else apropriate) that explains which tasks of the easy/medium/hard category each of the models managed to get right.
> Just like with changed weighting we should show a warning then, so that it's clear that these changed settings make the results be "not the default setting" of the benchmark results.
> And second thought, but if not easy, we don't have to do it: if our tasks can easily be categorized into different topics (e.g. math, coding, reasoning, science, etc) we could even show nice radar charts that let the users know which jev like model is good in which category of tasks.


## CR-20260919f (JevBench page) → CR-91 — JevBench v1.1.3: the GPU round's rows (data only, page stays WORK IN PROGRESS)

<!-- Numbering note (loop, Fable pass 24, 2026-09-19 ~16:40 UTC): this file's "CR-91" label collides with the committed CR-91 (= JevBench v1.2 page data, 769c214, renumbered from a mis-numbered CR-89). Both are superseded by CR-92: the v1.2 final artifact carries five of these six GPU-round rows (SemIf, open-alternative-jev in the author's order, system-one on Qwen3-8B, Bespoke Nimble 9B, OpenJev razorback16); the reversed-order open-alternative-jev row was dropped by CR-92.3. No ledger rows seeded; the v1.1.3 artifact is kept next to this file for the record. -->

Florian, 19 Sep 2026, verbatim (job brief of `~/jobs/jevbench-gpu-round-20260919`):

> I also think we should then run another round of benchmarks, this time including some of the models we couldn't evaluate yet because they need a GPU. You can use up to 15 € of runpod budget for testing these models via runpod.

Supervisor notes (not Florian's words):
- **The measurement is done**; nothing here asks the loop to run a model. v1.1.3 = the frozen v1.1 task set (314 decisions) and the
  v1.1.2 scoring, unchanged, plus six GPU-round rows: OpenJev on DiffusionGemma 26B-A4B (razorback16), SemIf (Qwen3.5-4B),
  open-alternative-jev (now complete, replacing its 6-decision partial v1.1 row), open-alternative-jev with the author's yes/no order
  (post-hoc, asterisked like Needle 3's tools mode), system-one on Qwen3-8B (Sean Goedecke), Bespoke Nimble 9B. v1.1.2 rows are byte-identical in
  content; only `rank_under` changes. Source: github.com/fstandhartinger/jevbench tag `v1.1.3`.
- `jevbench-v1.1.3-results.json` here keeps `protocol: jevbench::v1.1` and passes `lib/jevbench-v11.mjs` `validateJevbenchV11` unchanged
  (checked 19 Sep ~12:30 UTC). New optional fields per row: `round`, `posthoc`, `serving`, `repo_commit`, `speed.hardware`,
  `speed.measured_where`, `speed.gpu_side` (p50/p95 with the client on the GPU, and answer agreement), `gpu_rental_for_this_run`.
- **CR-91.1** Page data: if the page still shows v1.1.x when the loop gets here, switch `/jev-models` to this artifact (suggested home
  `data/raw/benchmarks/jevbench/v1.1/jevbench-v1.1.3-results.json`, update `JEVBENCH_V11_ARTIFACT`/`SHA256`). **If JevBench v1.2
  (job `jevbench-v1-2-hard-20260919`, CR-88 and after) has already landed, skip CR-91.1**: that job carries these rows into v1.2.
- **CR-91.2** GPU rows get a small "(GPU)" tag and a tooltip with `speed.hardware` + `speed.measured_where`; `posthoc == true` rows get the `*`
  and their `note`, as Needle 3 tools mode does.
- **Do not** remove the WORK IN PROGRESS banner or re-add the menu link (CR-88). No posting.
- Acceptance: every number read from the JSON; a reviewer can recompute any Main Score from the three sub-scores; `validateJevbenchV11` passes.

Files: `ops/ux-2026-09-12/jevbench/v1.1.3/` (artifact, charts, this CR).


## CR-20260919g (JevBench page) → CR-92 — JevBench v1.2 final: the JevBench Score is the default; WIP banner off, page back in menu + sitemap

Florian, Claude Code chat, 19 Sep 2026 ~13:20 UTC, verbatim, German (after using the JevBench Score Lab):
> ok, so machen wir es jetzt. So will ich es implementiert haben und dann entfernen wir einen der beiden open-alternative-jev Einträge (du entscheidest welcher) und dann produzierst du auch das Harold video für den launch und das explainer video für den launch und sendest mir dann alles auf meinen /notify-telegram wenn alles bereit ist, sodass ich nur noch antworten muss um den Post live gehen zu lassen

Supervisor notes (not Florian's words): implemented by ~/jobs/jevbench-final-launch-20260919 with the loop paused (paused-until 17:30 UTC).
- **CR-92.1** Default = "JevBench Score": Intelligence (hard 30 %, easy 14 %, standard 28 %, judge 28 %), Calibration, Speed, Cost —
  25 % each, geometric mean. One-line explanation under the title. Artifact = jevbench repo `results/v1.2/` at tag `v1.2`
  (`data/raw/benchmarks/jevbench/v1.2/`, validated by `lib/jevbench-v12.mjs`, which recomputes every axis and score).
- **CR-92.2** Speed honesty line wherever Speed is shown: latency of self-hosted and demo endpoints is adjusted ×2 (+0.15 s on our own
  servers) — an assumption, not a measurement; raw p50/p95 in the table. "est." prices stay labelled.
- **CR-92.3** One open-alternative-jev row (author's option order), named "open-alternative-jev (Qwen3.5-4B, IkerMoel)", with the
  option-order footnote; the reversed-order row is gone from rankings and charts. Partial runs below the ranking, no rank number.
- **CR-92.4** Custom weights + the earlier presets (Balanced 33:33:33, Emphasis on Accuracy/Speed/Cost; recomputed as geometric means,
  Calibration 0) with the "not the default" badge.
- **CR-92.5** Reverse CR-88: WIP banner and noindex removed from /jev-models and /jev-models/v1; "Jev-class models" back in the menu;
  both URLs back in the sitemap (Florian approved the result).
- Supersedes CR-91.1-.5 (v1.2-wip page data). CR-90 (difficulty filter, per-task grid, topic radar) stays open; its data file is now
  `ops/ux-2026-09-12/jevbench/v1.2-final/jevbench-v1.2-per-task.json` (one open-alternative-jev row).


## CR-20260919h (JevBench page) → CR-93 — JevBench v1.2.1: djev (Maisa, diffusion-gemma) added

Florian, 19 Sep 2026 ~16:50 UTC, forwarding an X DM from David Villalón (Maisa) about djev (https://djev.dev), verbatim:
> Add this please

Supervisor notes (not Florian's words): implemented by ~/jobs/djev-jevbench-20260919 with the loop paused. Details and
verification: `ops/ux-2026-09-12/jevbench/v1.2.1/CR-93.md`.
- **CR-93.1** Artifact = jevbench repo `results/v1.2/` at tag `v1.2.1`; new row "djev (Maisa, diffusion-gemma)", #3 with 74.3; no other row changed.
- **CR-93.2** Cost kind "announced" shown with its tag and basis; † footnote (free preview, open-sourcing planned).
- **CR-93.3** Revision v1.2.1 on the page; legend "Jev rebuild (open, or open source planned)".


## CR-20260919i (JevBench page) → CR-94 — /jev-models: two-system radars (score axes, subject topics) + a clearer latency-adjustment limitation

Florian, 19 Sep 2026 ~17:30 UTC, verbatim:
> can you add radar charts to https://benchmarkheaven.com/jev-models where two models can be compared by all four axis of our composite score? and maybe also radar charts where two models can be compared regarding the topic area of the tasks it failed/succeeded (e.g. math, coding, science, etc)? And: in the section Limit the sentence "The latency adjustment for self-hosted and demo endpoints (×2, +0.15 s on our own servers) is an assumption about production load, not a measurement. Raw latencies are in the table and the repo." - maybe you can explain a bit better why we did that, e.g. a link to the Semi Analysis post (https://newsletter.semianalysis.com/p/nvidia-blackwell-perf-tco-analysis) to argue that we assume the official Jev endpoints are assumed to be under high load given the public interest, and the self-hosted tests were ran on parallelism=1 and thus likely faster than if would have been on a machine that is under full load. it's a limitation though that this is not an exact number but an assumption, and the +0.15 s, explain them by the infrastructure overhead that our own tests on self-hosted services lacked, e.g. authentication, load balancing, logging.

Supervisor notes (not Florian's words): implemented by ~/jobs/jev-models-radar-20260919 with the loop paused. Checklist in 04 (CR-94).
Completes CR-90.3 (topic radar): topic labels now exist (jevbench repo `datasets/topics.json`, method `datasets/TOPICS.md`).

## CR-20260919j (JevBench page) → CR-95 — JevBench v1.2.2: the five systems readers asked for

Florian, 19 Sep 2026 ~17:10 UTC, addendum to the job that let Harold answer the replies under the JevBench posts, verbatim:
> For requests to add you can also just agree and try to include the model yourself

Supervisor notes (not Florian's words): implemented by ~/jobs/jevbench-add-requests-20260919 with the loop paused. Details and
verification: `ops/ux-2026-09-12/jevbench/v1.2.2/CR-95.md`.
- **CR-95.1** Artifact = jevbench repo `results/v1.2/` at tag `v1.2.2`; five new rows — classifier.dev (fast tier) #1 with 84.8,
  Laya #5 with 70.1, jeff #9 with 66.9, openJev Verdict #11 with 66.1, GLiNER2 #18 with 52.9. No earlier row's score changed.
- **CR-95.2** Two new system types with their own colour and legend: "Service built on Jev" (classifier.dev) and "Zero-shot
  classifier (not a Jev rebuild)" (GLiNER2). † footnote on each new row.
- **CR-95.3** Because a service built on Jev now leads, the headline says why in one line: same Intelligence, a flat plan price
  instead of a per-token tariff, faster from our server, lower Calibration.
- **CR-95.4** Revision v1.2.2 on the page; topic radars cover the new rows (topics artifact re-pinned).


## CR-20260920a (JevBench page) → CR-96 — JevBench v1.2.3: the cost correction, and a Cost column nobody can read as per-token

Florian, Telegram, 20 Sep 2026 ~06:50 UTC, with two screenshots (a reply by Seva Leonov @vsevolodl under the results post,
"dude, Jev is 4.2 cents per 1m, not per 1k 🤦", and a Google snippet of the TypeSafe blog), verbatim:
> check this - do we have the wrong pricing? if yes, fix all of it.

Supervisor notes (not Florian's words): implemented by ~/jobs/jevbench-price-check-20260920 with the loop paused. Details and
verification: `ops/ux-2026-09-12/jevbench/v1.2.3/CR-96.md`.
- **The tariff was right.** docs.typesafe.ai/models: "Jev 1.13 … Price (per Btok / per Mtok) $42 / $0.042", "Charged per input
  token. Output tokens are free." JevBench has used exactly that since v1.0. Our column is $ per 1,000 **decisions**, and one Jev
  decision is 950 input tokens on average: 950 × 1,000 × $0.042 / 1,000,000 = $0.0399 per 1,000 decisions.
- **Three arithmetic mistakes of our own were found and fixed** (repo tag `v1.2.3`): the 242-decision standard+judge run was
  averaged twice in the v1.1-tier price (556 rows instead of 314); rows priced from the gemini-3.1-flash-lite token counts used
  that run's standard+judge-only average (452 tokens/decision) for all 314 v1.1 decisions instead of its 314-decision average
  (383); and requests whose answer came back unparseable were left unpriced although they were billed (9 DeepSeek decisions).
- **CR-96.1** Artifact = tag `v1.2.3`. Fifteen rows 1.5–11 % cheaper, DeepSeek V4.1 Flash 2.6 % more expensive; scores move by
  ≤ 0.3 points; **no rank changed**. Jev 1.13.0 $0.0406 → $0.0399, 75.3 → 75.4.
- **CR-96.2** The unit travels with the artifact (`cost_unit`) and `lib/jevbench-v12.mjs` refuses an artifact without it.
- **CR-96.3** Table header, a note under the table, the Cost bullet, a panel above the cost section and the repo charts all say
  "$ per 1,000 decisions — not per 1,000 tokens", with the worked example.
- **CR-96.4** The correction is disclosed on the page: all three mistakes and every before/after price.


## CR-20260920b (JevBench page) → CR-97 — classifier.dev out of the ranking, into an honorable mention (JevBench v1.2.4)

Florian, 20 Sep 2026, German, verbatim:
> Lass uns classifier.dev vorerst aus der Liste nehmen und darunter auflisten und erklären, wieso wir es nicht im
> Ranking haben - weil es kein eigenes Modell ist sondern das Original Jev zu einem günstigeren Preis (wahrscheinlich
> weil das free Kontingent aus der Waitlist oder von vercel verwendet wird) und mit einem orchestrierungsansatz (bin
> mir nicht sicher, wie man das nennt - best of N oder review oder gremium oder so, also das was auf der classifier.dev
> Seite als der classifier.dev smart Ansatz beschrieben wird). Das darf schon gern als honorable mention gelistet sein
> auf unserer Benchmarkliste, aber bitte nicht als #1 auf dem ranking.

Supervisor notes (not Florian's words): implemented by ~/jobs/jevbench-classifierdev-honorable-20260920 with the loop
paused, on top of CR-96 (live on both hosts first). Details, every quote and its source:
`ops/ux-2026-09-12/jevbench/v1.2.4/CR-97.md`.
- **The facts come from classifier.dev's own pages, read 20 Sep 2026.** Fast tier: "The fast tier is Jev, TypeSafe's
  decision model" and an API response of `"model": "jev-1.13.0"`. Smart tier (which we never ran): "The smart tier is
  Jev plus a reasoning model re-asking only the answers Jev put under 0.7 confidence" — **escalation on low
  confidence, a model cascade**, not best-of-N, not self-consistency, not a committee; it escalates to
  gemini-3.8-flash. Price: free (20,000 fast classifications a day, what our run used) or Pro $20/month for 200,000 a
  day. **Their pages do not say how the flat rate is funded**, so the page says the price comes from their flat-rate
  plan and that we do not know their cost basis — Florian's waitlist/Vercel hunch is not published.
- **CR-97.1** Artifact = tag `v1.2.4`. Every row carries a `listing` (ranked / honorable_mention / partial) and only a
  ranked row carries a rank; the loader refuses an artifact that breaks that or an honorable mention that does not
  name the ranked system whose model it runs.
- **CR-97.2** General rule, published with the data and stated in the method section: *a service that runs another
  entrant's model is listed with all of its scores and axes, but is not ranked against the models.*
- **CR-97.3** New section under the ranking, "Honorable mentions — services built on another entrant's model":
  classifier.dev with its 84.8, all four axes and its price, no rank, "Runs on Jev (TypeSafe)", why it is not ranked,
  the flat-rate caveat ($0.0033 assumes the Pro plan at full use; $0.033 at a tenth of it) and the honest finding
  (97.3 % vs Jev's 94.5 % on judge items, 70.5 % vs 74.1 % on hard ones). The service is credited, not criticised.
- **CR-97.4** Supersedes CR-95.3 (the "why a Jev service leads" bullet). **Jev 1.13.0 is #1 at 75.4**; every row below
  classifier.dev moves up one place. No measurement, axis, price or score changed.

## CR-20260920d (JevBench page) → CR-99 — hard-only view + custom evaluation offer

Florian, 20 Sep 2026, verbatim:
> For the jev bench page: let's add a special mode 'Hard only' for 'Explore by task
> difficulty'. I think it's intereting to show what happens if people only throw hard results into the ring.
> Let's also add a small badge on the page, that appears like a toast message and then also disappears after a while -
> which is an offering that says something like (find a good phrasing): Which Jev-class model is best for your usecase?
> We offer the service to evaluate all the participants on your data set and tell you which option is best in cost and
> performance for your usecase. Flat fee $1000/evaluation (except for cases where it's too much effort, in which case
> we'd make an offer) and then there should be a link to click so that people get into an extra page that explains the
> details, and there people should be able to just contact us via our florian.standhartinger@gmail.com mail address to
> get into contact and ask for a quote. ... Don't make this toast pop-up too intrusive; it should appear a few seconds
> after someone lands on the page and then disappear again after a few seconds, but as it disappears, the animation
> should clearly indicate where the link is that people can use to request custom evaluation jobs, etc. It shouldn't
> seem too intrusive, but it should be noticeable enough that people who look at the numbers for a few seconds will
> notice it. It should also be possible to click it away, possibly with an option to 'don't show this again.'
> We could also offer 'consulting,' not just evaluations. However, the toast should also be minimalistic/simple—not too
> much text; details can be provided on a separate page.

## CR-20260920e (JevBench page) → CR-100 — opaque custom-evaluation toast

Florian, 20 Sep 2026, verbatim:
> That new toasts background is tranparent, not opaque as it should be. fix it

Supervisor notes (not Florian's words): `--surface` and `--text` are complete hex colours, so the CR-99 toast uses
them directly rather than wrapping them in `rgb(...)`. The permanent custom-evaluation badge is unchanged.


## CR-20260920f (JevBench page) → CR-102 — custom-evaluation toast UX and offer framing

Florian, phone screenshot, 20 Sep 2026, verbatim:
> Lets improve the ux of how this toast appears and disappears. I also don't like so much how that 'CUSTOM EVALUATION'
> bubble is placed below the 'JevBench v1.2 · our own benchmark' header in mobile portrait mode. Lets make it show right
> of it, like it does in desktop mode. Even if it means we have to make it smaller (adjust to available space and screen
> width). Ans let's add a space left and right of the 'CUSTOM EVALUATION' text, currently that text looks too narrowly
> squeezed into the bubbles outer border. And when the toast disappears, I generally like how it moves towards that
> bubble, but it seems to get transparent on its way out a bit too fast, so that a user that doesn't watch the screen
> with extremely high attention likely wouldn't notice where the toast goes. And maybe we can give that bubble a tiny
> wiggle, right after the toast has disappeared. And: I find it looks a bit odd when that toast moves with the scolling
> in mobile mode. I think it's better to have it fixed at the bottom of the screen instead. Also: let's for now remove
> the $1000 offer from the detail page, and not reveal yet, that we are offering that as a paid service so clearly
> (also don't hide it, just offer our consulting and custom eval - rest will be duscussed vis mail). Also mention our
> open source repo wnd hiw to do it yourself. Make us look like a open source / free / community service

## CR-20260920g (JevBench page) → CR-103 — custom-evaluation pill label

Florian, 20 Sep 2026, verbatim:
> Can we rename the text in the bubble from CUSTOM EVALUATION to YOU NEED A CUSTOM EVAL?

## CR-20260920h (JevBench page) → CR-104 — responsive custom-eval pill wording

Florian, 20 Sep 2026, verbatim:
> Lets rename "YOU NEED A CUSTOM EVAL" to "NEED CUSTOM EVAL ON YOUR DATA?" or "NEED A CUSTOM EVAL?"


## CR-20260920i (JevBench) → CR-105 — publish JevBench v1.2.6

JevBench readiness review, 20 Sep 2026. Verbatim source file: `ops/ux-2026-09-12/jevbench/v1.2.6/CR-105.md`:

> Publish three complete measurements on the unchanged frozen v1.2 task set: openJev Verdict 1.4, SimpleJev
> Qwen3.8-27B and SimpleJev Qwen3.6-35B-A3B. Refresh the availability audit without altering any prior
> measurement, and keep djev-spark out of the table because it is a serving wrapper around the already
> represented DiffusionGemma system rather than new weights.
>
> Acceptance:
> - pin results, public-task and topic artifacts from public JevBench tag `v1.2.6` by SHA-256;
> - show Verdict 1.4 at 72.5 (#4), SimpleJev Qwen3.8-27B at 67.3 (#9), and SimpleJev Qwen3.6-35B-A3B at 63.8 (#16);
> - link Verdict 1.4 to the author's Hugging Face model and preserve the earlier Verdict row unchanged;
> - preserve the hard-only view, custom-evaluation offer/toast, labels, prior rows and scoring rules;
> - publish the current, concrete reason for every remaining unmeasured candidate;
> - verify both production hosts after deployment.

Verbatim source file: `ops/ux-2026-09-12/jevbench/v1.2.6/CR-105.md` (dated 20 September 2026). Supervisor note
(not Florian's words): the shipping commits `5d06d5ac` and `98325468` carry no `Co-Authored-By` trailer, so the
implementing engine is unrecorded; the rows were seeded into the ledger by opencode-kimi iteration 141, which
also live re-verified the deploy on both hosts (`bin/verify-cr-105.mjs`, 26/26 across both hosts at `98325468`).
A review gate still owes the engine attribution before the rows can read `verified`.

## CR-20260920j (JevBench page) → CR-106 — longer custom-evaluation toast and subtle tint

Florian, 20 Sep 2026, verbatim:
> this toast on our eval page ('Need custom eval on your data? JevBench is open source: run it yourself, or ask us to
> help. See your options'), can we show it 2 seconds longer? And maybe we give it a slightly different color?

## CR-20260920k (JevBench) → CR-107 — publish JevBench v1.2.7

JevBench run-3 measurement round, 20 September 2026. Verbatim source file: `ops/ux-2026-09-12/jevbench/v1.2.7/CR-107.md`:

> Publish the fourth round of reader-requested additions on the unchanged frozen v1.2 task set: the two GLiNER2.5
> checkpoints we can run ourselves (small, 74M, and multi, 287M) as complete ranked rows, and jqv — a stock
> Qwen3-32B read as a decision model, submitted with a public endpoint in issue #6 — as a partial row that is shown
> but not ranked, because its endpoint runs on the submitter's own machine and the held-out hard items were
> deliberately not sent there. No earlier measurement, axis, price or rank rule changes.
>
> Acceptance:
> - pin results, public-task and topic artifacts from public JevBench tag `v1.2.7` by SHA-256;
> - show GLiNER2.5 multi at 63.1 (#19) and GLiNER2.5 small at 62.1 (#21), each linked to its Hugging Face checkpoint;
> - show jqv at 67.2 without a rank, marked as a partial run, with its coverage (425 of 534 decisions) and the
>   reason readable on the page;
> - leave the earlier GLiNER2 row (gliner2.5-base, 53.0) and every other earlier row untouched;
> - preserve the hard-only view, the custom-evaluation offer/toast, labels, prior rows and the scoring rules;
> - publish the current, concrete reason for every remaining unmeasured candidate, including OpenDecision;
> - verify both production hosts after deployment.

Supervisor note (not Florian's words): implemented by the job `~/jobs/jevbench-add-requests-20260919` (run 3,
Claude Opus 5) in an isolated worktree, with the UX loop paused via `paused-until` while iteration 142 was still
running in `/opt/model-market-comparison`; the pause was released after both hosts verified. The measurement round
itself is in that job's `RESULT.md`.

## CR-20260921a (JevBench) → CR-108 — publish JevBench v1.2.8

JevBench run-4 measurement round, 21 September 2026. Verbatim source file: `ops/ux-2026-09-12/jevbench/v1.2.8/CR-108.md`:

> Publish the run-4 round of reader-requested additions on the unchanged frozen v1.2 task set: every entrant that could
> be reached ran all 534 decisions (held-out items included) through its author's own server, one request at a time. jqv
> is re-run in full on our own GPU from its now-public serving code, so its v1.2.7 partial row becomes a complete,
> ranked row. decision-machine-1 is a closed decision model behind a production API; it gets its own class ("Closed
> decision model (API only, not Jev)") instead of being shown as an open Jev rebuild. No earlier measurement, axis, price
> or rank rule changes.
>
> Acceptance:
>
> - pin results, public-task and topic artifacts from public JevBench tag `v1.2.8` by SHA-256;
> - show every new row with its score and rank from the artifact, each name linked to its project;
> - show decision-machine-1 in the new class with its own legend entry and colour (light and dark);
> - jqv is ranked and complete (hard coverage 1.0); the "425 of 534" partial note is gone;
> - leave every earlier row's score untouched;
> - the "who could not be measured" list drops the systems now measured (Decider 2B, Reflex, OpenDecision, LitJev) and adds
>   Werr and DIY Jev with their concrete reasons;
> - preserve the hard-only view, the custom-evaluation offer/toast, labels and scoring rules;
> - verify both production hosts after deployment, desktop and phone, light and dark.

Supervisor note (not Florian's words): implemented by the job `~/jobs/jevbench-add-requests-20260919` (run 4,
Claude Opus 5) in an isolated worktree, with the UX loop paused via `paused-until` from 06:00 UTC; the pause is released
after both hosts verified. The measurement round itself is in that job's `RESULT.md`. Verifier:
`node ops/ux-2026-09-12/bin/verify-cr-108.mjs ops/ux-2026-09-12/jevbench/v1.2.8/verify-cr-108-expect.json <host>...`.
