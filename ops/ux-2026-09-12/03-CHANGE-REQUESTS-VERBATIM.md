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
