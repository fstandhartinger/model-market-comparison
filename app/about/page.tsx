import { getDataset } from "../../lib/data";
import { AaCredit } from '../../components/AaCredit';
import { EpochCredit } from '../../components/EpochCredit';
import { previewMetadata } from "../../lib/seo";
import { BENCHMAXX_TIER_TABLE } from "../../lib/benchmax.mjs";
import { BENCHMAXX_COMPOSITE_WEIGHT } from "../../lib/composite.mjs";
import { getBenchmarkView } from "../../lib/benchmark-data";


export const metadata = previewMetadata({ path: "/about", documentTitle: "About & data sources", title: "How Benchmark Heaven works — sources & methodology",
  description: "Where every benchmark result and price comes from, how the adjusted cost per task is calculated, and how publishers can ask for removal." });

export default async function AboutPage() {
  const ds = await getDataset();
  const view = await getBenchmarkView();
  // R4.4: the featured shortlist is derived at build time and published in the dataset,
  // so this page lists exactly what the site is filtering on — never a stale hand-list.
  const featured = ds.build_diagnostics?.featured_selection ?? null;
  const familyNames = new Map(ds.models.map((m) => [m.family_key, m.family_name || m.family_key]));
  const familyName = (key: string) => familyNames.get(key) ?? key;
  // CR-69.1: the Benchmaxxing tier table, one row per board (a family@version key names that version only).
  const registryName = (key: string) => {
    const [family, version] = key.split("@");
    const rows = view.axes.filter((b) => b.family === family && (version ? b.version === version : !BENCHMAXX_TIER_TABLE.tiers[`${family}@${b.version}`]));
    if (!rows.length) return key;
    const names = [...new Set(rows.map((b) => b.name))];
    return names.length === 1 ? names[0] : names[0].replace(/\s+v?\d+(\.\d+)*(?=\s*\(|$)/, "");
  };
  const tierLabel: Record<string, string> = { headline: "Headline", heldout: "Held-out", domain: "Domain (not used)", secondary: "Secondary (not used)", aggregate: "Index (not used)", judged: "Judged (not used)" };
  const tierOrder = ["headline", "heldout", "domain", "secondary", "aggregate", "judged"];
  const tierRows = Object.entries(BENCHMAXX_TIER_TABLE.tiers).map(([key, t]) => ({ key, name: registryName(key), ...t }))
    .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier) || a.name.localeCompare(b.name));
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">About &amp; data sources</h1>
      <p className="mt-2 text-sm text-gray-400">
        Benchmark Heaven brings together pricing and benchmark data for open-source and frontier LLMs into one
        comparable view. Prices are normalized to USD per 1M tokens (input and output) unless a
        platform prices differently (GitHub Copilot&apos;s current token/AI-Credit rates and legacy request billing are shown on a separate product axis).
      </p>

      <h2 id="open-source" className="mt-6 mb-2 font-semibold">Open source &amp; hobby project</h2>
      <p className="text-sm text-gray-400">
        Benchmark Heaven is <strong>open source</strong> under the{" "}
        <a href="https://github.com/fstandhartinger/model-market-comparison/blob/main/LICENSE" className="text-accent">MIT licence</a>
        {" "}<strong>and a hobby project</strong> — built to give the world better tools to decide which LLM to choose for the job.
        The code lives at{" "}
        <a href="https://github.com/fstandhartinger/model-market-comparison" className="text-accent">github.com/fstandhartinger/model-market-comparison</a>.
        The licence covers this code only: the benchmark results, prices and other data collected here are third-party data under their own
        terms (see <a href="#sources" className="text-accent">Sources</a> below — Artificial Analysis requires attribution, Epoch AI is CC BY,
        DesignArena is shown under a documented risk decision), and nothing collected here is relicensed by the MIT licence.
        The site is still in beta: data and features change daily.
      </p>

      {/* CR-61.1 (Florian 2026-09-16): the removal-on-request note, verbatim wording from the change request. */}
      <h2 id="removal" className="mt-6 mb-2 font-semibold">Data sources &amp; removal on request</h2>
      <p className="text-sm text-gray-400">
        Benchmark Heaven is a free, open-source, non-commercial hobby project. Benchmark results are shown with attribution and
        links to their original publishers (Artificial Analysis, Epoch AI, DesignArena, OpenRouter, …). If you publish benchmark
        data and would like your numbers removed or shown differently, email{" "}
        <a href="mailto:info@productivity-boost.com" className="text-accent">info@productivity-boost.com</a> and we will act promptly.
      </p>

      <h2 id="agents" className="mt-6 mb-2 font-semibold">For agents</h2>
      <p className="text-sm text-gray-400">
        Two ways in. <b>Headless or server-side</b>: the public HTTP API — no key, CORS open, documented in{" "}
        <a href="https://github.com/fstandhartinger/model-market-comparison/blob/main/API.md#for-agents-webmcp" className="text-accent">API.md</a>.{" "}
        <b>In a browser tab</b>: in browsers with WebMCP (<code>navigator.modelContext</code>), every page of this site registers three
        read-only tools — <code>search_benchmarks</code>, <code>get_benchmark_results</code> and <code>get_model_benchmark_summary</code>.
        They work only while a benchmarkheaven.com tab is open and the browser supports WebMCP; they are not a remote MCP server.
        They return published results only: the value in the benchmark&apos;s own unit, its basis (measured, self-reported, derived,
        preliminary), benchmark version and the source with its retrieval date. A missing result is <code>null</code>, never an
        estimate. At most 25 benchmarks, 50 results or 10 models per call, with cursors for more. The tools send no cookies,
        store nothing and cannot change anything; other sites cannot use them from an embedded frame.
      </p>

      <h2 id="sources" className="mt-6 mb-2 font-semibold">Sources</h2>
      <ul className="space-y-2 text-sm text-gray-300">
        <li><b>OpenRouter</b> — model catalog and per-provider endpoint pricing (live API).</li>
        <li><b>ArtificialAnalysis</b> — Intelligence &amp; Coding indices plus sub-benchmarks (LiveCodeBench, SciCode, Terminal-Bench Hard, τ²-Bench, GPQA, MMLU-Pro) via the v2 API.</li>
        <li><b>AA Coding Agent Index</b> — Composite retains v1.4, last collected {ds.sources.aa_coding_agents}. AA now publishes v1.5 with different benchmark components. We collect it separately and do not mix the versions.</li>
        <li>Some AA licensing and model identifiers are retained from earlier source publications. Their original dates are recorded per field in the downloadable dataset.</li>
        <li><b>DesignArena</b> (Arcada Labs) — agentic Web Apps &amp; Full-Stack Elo leaderboards, read from
          the site&apos;s own public leaderboard endpoint. DesignArena publishes no API documentation or data licence,
          so this is not an official feed and we do not present it as one. We show these two boards and collect
          nothing further from this source; that scope is recorded in the repository and would only change with the
          source&apos;s documented permission.</li>
        <li id="lisanbench"><b>LisanBench</b> — word-chain benchmark by Lisan al Gaib (<a href="https://x.com/scaling01" className="text-accent">@scaling01</a>),
          read from the files <a href="https://lisanbench.com/" className="text-accent">lisanbench.com</a> itself loads. Its{" "}
          <a href="https://github.com/voice-from-the-outer-world/lisan-bench" className="text-accent">repository</a> publishes usage terms rather
          than an open-source licence: results are shared with credit to the creator and a link to the repository.</li>
        <li id="aggregators"><b>Benchmark aggregators</b> (Lumina Bench, BenchLM, LLM Stats, Vellum, CodeSOTA and others) — used
          only to discover benchmarks and to check where a published result came from. No number on this site is taken
          from these aggregators: each comes from the organisation that ran the benchmark, or from the model&apos;s developer
          and is then labelled self-reported, and one result is never counted twice through two routes.</li>
        <li><b>AWS Bedrock</b> — on-demand token pricing, European regions (eu-central-1 where available).</li>
        <li><b>Azure AI Foundry</b> — retail token meters plus model-card serving-region checks. A billing/resource region alone is not treated as proof that inference stays in the EU. By company policy, only Azure Direct Global DeepSeek V4 Pro and Kimi K2.7 Code are additionally eligible as EU-hosted equivalents; they remain marked Global because inference may occur outside the EU.</li>
        <li><b>Google Vertex AI</b> — pay-as-you-go token pricing for Gemini and Model Garden partner models (Claude, Llama, Mistral, DeepSeek, Qwen); offers are marked EU-hosted only where the model supports a documented European serving location.</li>
        <li><b>TensorX, Inceptron, Scaleway, IONOS, Mistral, Nebius, OVHcloud, STACKIT &amp; T-Systems</b> — direct European serverless/managed catalogs. TensorX is the broadest in-EU host for GLM/Kimi/DeepSeek/MiniMax; Inceptron serves GLM/Kimi/MiniMax from Finland; Scaleway and OVHcloud serve from France; STACKIT and T-Systems publish German/EU catalogs. Nebius is EU-capable but mixes EU, US and UK serving regions, so every model offer is checked separately. See the <a href="/eu" className="text-accent">EU &amp; Sovereign</a> tab.</li>
        <li><b>GitHub Copilot</b> — current 26-model AI-Credit/token-price catalog plus the 25-model legacy premium-request multiplier table. The UI&apos;s separate per-request field applies only to eligible legacy annual Pro/Pro+ plans.</li>
        <li><b>Anthropic / Claude Code</b> — all 11 currently callable first-party API models, their cache/batch/list prices, active promotions and Claude Code Enterprise terms.</li>
      </ul>

      <h2 id="featured" className="mt-6 mb-2 font-semibold">What are &ldquo;Featured&rdquo; models?</h2>
      <p className="text-sm text-gray-400">
        <span className="text-warn">★ Featured</span> is the shortlist the recommendation views
        start from. It is not hand-picked: it is the{" "}
        <b>top {featured?.top_n ?? 20} model families of the Artificial Analysis Intelligence
        Index</b>, ranked by the best score any of their reasoning-effort variants reaches, with
        models their vendor has deprecated left out. Because the set is derived from the chart on
        every data refresh, it follows new releases by itself instead of waiting for someone to
        edit a list.
      </p>
      {featured && (
        <ol className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-gray-300 sm:grid-cols-2">
          {featured.families.map((f) => (
            <li key={f.family_key} className="flex items-baseline justify-between gap-3 border-b border-line/40 py-0.5">
              <span><span className="mr-2 text-xs text-gray-600">{f.rank}.</span>{familyName(f.family_key)}</span>
              <span className="tabular text-xs text-gray-500">
                {f.aa_intelligence_index.toFixed(1)}
                {f.reason === "pinned" && <span className="ml-1 text-warn" title="Explicitly requested, featured regardless of rank">pinned</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-gray-500">
        Turn the &ldquo;Featured&rdquo; filter off on any page to explore all {ds.counts.models}{" "}
        tracked models. Featured status belongs to the family, so every reasoning variant of a
        featured family is included. One family can be pinned into the set on request — today that
        is {featured?.pins?.length ? featured.pins.map(familyName).join(", ") : "none"} — and pinned
        entries are labelled above. Ranking by index means a family can leave the list when a newer
        model outranks it; the ranks shown here are the ones in the current dataset, dated{" "}
        {new Date(ds.generated_at).toISOString().slice(0, 10)}.
      </p>

      <h2 className="mt-6 mb-2 font-semibold">Snapshot</h2>
      <div className="card p-4 text-sm">
        <div>Dataset generated: <span className="tabular">{new Date(ds.generated_at).toUTCString()}</span></div>
        <div className="mt-1">Models: {ds.counts.models} · families: {ds.counts.families} · offers: {ds.counts.offers} · providers: {ds.counts.providers}</div>
        <div className="mt-2 text-xs text-gray-500">Per-source collection dates:</div>
        <ul className="mt-1 text-xs text-gray-400">
          {Object.entries(ds.sources).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
        </ul>
      </div>

      <h2 id="methodology" className="mt-8 mb-2 text-lg font-semibold">How we calculate</h2>
      <p className="text-sm text-gray-400">
        Two numbers on this site are ours rather than a source&apos;s: the <b>adjusted cost</b> of a task
        and the <b>composite score</b> of a model. Everything else is reproduced as published. This
        section explains both in full, so any figure on the site can be traced back to its inputs.
      </p>

      <h3 id="adjusted-cost" className="mt-6 mb-2 font-semibold">Adjusted cost per task</h3>
      <p className="text-sm text-gray-400">
        A price per million tokens does not tell you what a model costs you, because two models
        need very different numbers of tokens for the same job, and because what you actually pay
        depends on which provider serves you and how much of your input that provider can read from
        cache. The adjusted cost folds all of that into one number — modelled USD for one task:
      </p>
      <ul className="mt-2 space-y-1.5 text-sm text-gray-300">
        <li><b>Which provider.</b> Of all the routes that survive your filters, we cost the cheapest
          one, using that exact endpoint&apos;s published prices — not a platform average.</li>
        <li><b>Its cache behaviour.</b> Cached input is billed at that endpoint&apos;s cache-read price and
          uncached input at its normal input price; where the route publishes a cache-write price above its
          input price (explicit caching, such as Anthropic&apos;s 1.25×), the uncached input is assumed to be
          written to the cache once at that price. The cache-hit rate is the measured one for that exact
          endpoint where OpenRouter publishes it.</li>
        <li><b>The model&apos;s token efficiency.</b> How many output tokens this specific model
          variant needs per task, from Artificial Analysis&apos; measurements (<AaCredit />). A model that reasons at
          length pays for every one of those tokens.</li>
        <li><b>One common workload.</b> Input tokens per task = the model&apos;s output tokens × one
          input:output ratio that is the same for every model: the documented global ratio from public
          LLM usage statistics (Chutes, last 7 days). Two models with the same prices and the same
          tokens per task therefore cost the same. Under Options → <i>Task workload</i> you can switch to
          <i>As used on OpenRouter</i>, which takes each model&apos;s own traffic mix instead — that says who
          uses a model (long agent sessions push the ratio from 3:1 up to 115:1), not what a task costs,
          and can make a model look several times pricier.</li>
      </ul>
      <p className="mt-3 text-sm text-gray-400">
        USD/task = [input × (1 − hit) × input price + input × hit × cache-read price + input × (1 − hit)
        × (write price − input price) + output × output price] ÷ 1,000,000, the write term only where a
        write price above the input price is published and a cache-hit rate is applied. Where an input is
        unknown we say so instead of hiding it: missing task-token measurements assume 1,000 output
        tokens/task; a route that publishes a cache-read price but has no cache-hit measurement of its
        own — on OpenRouter or direct from a provider — gets the typical rate (the median of OpenRouter
        endpoints that publish a cache-read price), so a model is credited the same caching share wherever
        it is sold; a route without a cache-read price gets no cache-hit rate and no discount. Every such
        assumption is listed on the price itself — click any underlined price to see the exact
        inputs, sources and dates behind it. Raw list-price mode skips all of this and simply blends
        list prices at the fixed input:output ratio you choose.
      </p>

      {/* CR-63.19: the third headline feature beside adjusted cost and the score. */}
      <h3 id="value-map" className="mt-6 mb-2 font-semibold">The value map and its green line</h3>
      <p className="text-sm text-gray-400">
        The value map plots each model&apos;s capability score against its adjusted cost per task; cheaper models sit to
        the right, so the most attractive models are in the top-right corner. The green line joins the models that no
        cheaper model beats on capability &mdash; the Pareto frontier &mdash; with one small tolerance (Florian,
        17 Sep 2026): a model stays on the line unless a model at the same price or cheaper is ahead of it by more than
        half a point of capability, that is 0.5 % of the score scale (on Elo boards, which have no fixed scale, 0.5 % of
        the plotted range). Without it, two models that are a tenth of a point apart &mdash; a difference no benchmark
        resolves and nobody can see on the chart &mdash; would look like a clear win for one of them.
      </p>
      <h3 id="benchmaxxing" className="mt-6 mb-2 font-semibold">Benchmaxxing signal</h3>
      <p className="text-sm text-gray-400">
        We split benchmarks into public &ldquo;headline&rdquo; tests that labs quote in launch posts and &ldquo;held-out&rdquo; tests whose
        questions are private, brand-new or newer than the models; indexes built from other boards, judge- or vote-graded
        boards and legal, finance and medical specialist boards are left out. For every headline/held-out pair in the same
        topic (for example GPQA Diamond against CritPt in science), the model is ranked among the models that took both tests,
        and the score is the average of how much higher it ranks on the headline test, in percentile points. With few pairs
        the score is pulled toward zero. Tags come in three levels on the published score (one decimal): <b>light</b> from
        +3.0, <b>medium</b> from +6.0 and <b>very strong</b> from +12.0, and the level follows that score alone. How much
        evidence stands behind a tag is shown next to it, never used to hide it: a tag built on fewer than ten comparisons,
        or one whose gap does not stay above zero when its benchmarks are resampled, is marked <b>◔ uncertain</b> and says
        which of the two it is.
      </p>
      <p className="mt-2 text-sm text-gray-400">
        How to read it: plus means better on famous public tests than on tests nobody can train for, minus the other way
        round, and zero means no sign. Differences between topics — strong at coding, weaker at maths — are specialisation
        and do not count. In detail: n is the number of distinct headline boards plus held-out boards in the model&apos;s pairs
        minus one; a score needs n ≥ 6 and pairs in at least two topics; the pull toward zero is n / (n + k) with k estimated
        from the catalog (how much score variance falls as n grows, clamped to 6–50); the interval resamples the model&apos;s
        headline and held-out boards separately, 400 times, and a tag whose 80 % interval reaches below zero is marked
        uncertain rather than dropped (Florian, 17 Sep 2026). It is a screen, not proof: a positive gap fits benchmark-targeted training, but
        it also fits a model that is simply weaker at long agent work, which several held-out boards lean toward. Model
        names, labs, openness and prices are never inputs; a tier is decided from benchmark facts alone.{" "}
        <a href="/benchmaxxing" className="text-accent">See the flagged models and their radars</a>.
      </p>
      <details id="benchmaxxing-tiers" className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium">Benchmark tiers used by the signal ({tierRows.length} boards)</summary>
        <p className="mt-2 text-xs text-gray-400">A board without an entry counts as secondary and is not used until it gets a deliberate tier.</p>
        <div className="bh-table-wrap mt-2">
          <table className="bh-table w-full text-sm" data-bmx-tier-table>
            <thead><tr><th scope="col" className="text-left">Board</th><th scope="col" className="text-left">Tier</th><th scope="col" className="text-left">Reason</th></tr></thead>
            <tbody>{tierRows.map((t) => <tr key={t.key}><th scope="row" className="text-left font-medium">{t.name}</th><td className="whitespace-nowrap">{tierLabel[t.tier] ?? t.tier}</td><td className="text-gray-400">{t.reason}</td></tr>)}</tbody>
          </table>
        </div>
      </details>

      <h3 id="score" className="mt-6 mb-2 font-semibold">The composite score</h3>
      {/* CR-35.4: Epoch AI's recommended citation (CC BY). */}
      <p className="mb-2 text-xs text-gray-500" data-epoch-citation>Epoch ECI and Software Engineering ECI: Epoch AI, &lsquo;Epoch Capabilities Index&rsquo;. Published online at epoch.ai. Retrieved from &lsquo;https://epoch.ai/eci&rsquo; [online resource]. Accessed 2026-09-15. <EpochCredit /></p>
      <p className="text-sm text-gray-400">
        Benchmarks are not on a common scale, so we do not average raw scores. The composite is
        rank-based: each result becomes a <b>percentile on one common scale</b>, and those are averaged.
        The scale is the AA Intelligence Index, which covers the widest field of models. The other
        benchmarks cover different fields — DesignArena and the Coding Agent Index test mostly frontier
        models — so a plain percentile there would put the same model 20–30 points lower and punish a
        model for being measured on a selective board. Each of them is therefore <b>linked</b> to the common
        scale through the models measured on both: a result that ranks at the same position among those
        models as a given AA Intelligence percentile counts as that percentile. Differences at the top are
        rank differences, so 99 against 97 is not a 2 % capability gap. The composite uses seven slots: AA Coding, source-matched AA Coding Agent v1.4 (the pinned 9 September snapshot; AA now publishes v1.5, which the Benchmarks table shows), AA
        Intelligence, Epoch general ECI, Epoch Software Engineering ECI, DesignArena Web Apps (agentic) and
        DesignArena Full-Stack. The DesignArena inputs are its agentic{" "}
        <a className="text-accent underline" href="https://www.designarena.ai/leaderboard/webapps">Web Apps</a> and{" "}
        <a className="text-accent underline" href="https://www.designarena.ai/leaderboard/fullstack">Full-Stack</a> boards; the page
        DesignArena calls Frontend is a different, broader board with its own ratings. AA values are clamped to
        0–100. A DesignArena board qualifies at an app-selected minimum of 200 battles, aligned with
        the source&apos;s typical preliminary/reliability threshold; its Elo is converted to the
        expected score against a fixed Elo 1000 opponent. That conversion keeps every model in the same order, so it
        does not change the composite, which uses ranks only. Percentiles are taken over every model row in the
        catalogue, deprecated ones included, so hiding deprecated models with a filter does not move anyone&apos;s score.
      </p>
      {/* CR-65.1: which slots may be shared inside a model family. */}
      <p className="mt-3 text-sm text-gray-400" data-family-scope>
        Effort settings are scored separately. The three Artificial Analysis slots (AA Coding, AA Intelligence and
        the Coding Agent Index) are measured per effort setting, so a result counts only for the configuration that
        was measured — a non-reasoning setting never borrows its max setting&apos;s index. Epoch ECI, Software ECI
        and DesignArena publish one result per model family, so that result is shared with the family&apos;s other
        settings and marked as attached. It is shared only when the family&apos;s published values agree (otherwise
        only the family representative&apos;s value is used), never as a family maximum and never from a retired
        configuration.
      </p>
      <p className="mt-3 text-sm text-gray-400">
        Thin evidence must not become an advantage. Every missing slot inherits that model&apos;s own
        mean observed percentile, producing a base score exactly equal to the mean of its available
        percentiles. A final dominance-safe projection then prevents missing data from reversing an
        otherwise unambiguous comparison: when one model covers every reliable slot of another
        measured model and is no worse in any shared slot, the less-covered model is lowered to 0.1 points
        below it; the better-measured model is never moved, so adding a thinly measured row cannot change a
        well-measured score. The unadjusted base and any adjustment are shown separately in model details,
        and the model page says &ldquo;dominance-adjusted from&rdquo; when the change exceeds one point. Models with fewer
        than three of the seven inputs (exact or attached) are ranked by their score like every other model, but
        carry a &ldquo;Thin data&rdquo; badge with their input count: treat their position as uncertain. A model with no
        reliable observed slot receives the neutral fallback 50; its zero evidence coverage stays
        distinct from a measured score and is excluded from capability charts. The <b>#benchmarks</b>
        column counts the distinct versioned benchmarks a model has a usable result for, which is a
        broader set than the seven composite slots.
      </p>
      {/* CR-74.4 (Florian 2026-09-17): the marginal Benchmaxxing penalty. */}
      <p className="mt-3 text-sm text-gray-400" data-bh-composite-benchmaxxing-about>
        The score takes the <a className="text-accent underline" href="#benchmaxxing">Benchmaxxing signal</a> into account, marginally:
        a model whose headline benchmarks run ahead of its held-out ones loses {BENCHMAXX_COMPOSITE_WEIGHT} point per percentile point of that
        positive signal (w = {BENCHMAXX_COMPOSITE_WEIGHT}, applied after the steps above); a negative or missing signal earns no bonus. The weight is kept marginal: it is the smallest
        round value at which the signal changes the #1 spot on the 17 September 2026 data. The Options checkbox
        &ldquo;Include Benchmaxxing signal in the score&rdquo; (on by default) switches it off everywhere the score is used.
      </p>

      {/* CR-25.6: the category composites offered as selectable scores. */}
      <h4 id="category-scores" className="mt-4 mb-2 font-semibold">Category scores</h4>
      <p className="text-sm text-gray-400">
        Besides the composite you can pick a <b>category score</b> — Coding, Agentic &amp; tool use, Science or
        Long context. Each is the <b>weighted average</b> of that category&apos;s <b>anchor benchmarks</b>, on a 0–100 scale:
        a saturated anchor counts at half the weight of the others (see Saturated below).
        The anchor set is fixed and published here, so two models&apos; category scores always cover the same
        benchmarks; a model is scored only when it has a result on every anchor, otherwise it has no score for that
        category rather than an average over an easier subset. Each benchmark counts at its newest published version.
        A category is only offered when at least two of its benchmarks are on a 0–100-style, higher-is-better scale
        and are measured for at least 60 % of the featured model families — which is why Reasoning and Vision, with
        one qualifying benchmark each today, have no category score. Category scores are raw benchmark results, not
        percentiles, and every category has its own anchors — compare models within one category, not a Coding score
        with a Science score.
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm text-gray-400" data-category-anchors>
        {(ds.category_scores?.categories ?? []).map((c) => <li key={c.key}><b>{c.label}</b>: {c.rows.map((r) => r.name).join(", ")}</li>)}
      </ul>
      <h3 id="data-policy" className="mt-6 mb-2 font-semibold">Provider data policy</h3>
      <p className="text-sm text-gray-400">
        &ldquo;Trains or keeps your data&rdquo; is taken from OpenRouter&apos;s published provider
        table: a provider passes when it appears under both of OpenRouter&apos;s own filters,
        &ldquo;Does not train&rdquo; and &ldquo;Zero retention&rdquo;. While the option is unchecked,
        providers that fail that test are removed from every evaluation on this site. Two things are
        stated openly rather than hidden. <b>Chutes</b> is treated as satisfying both, because
        OpenRouter miscategorises it. And providers that OpenRouter does not list at all — the
        European sovereign hosts among them — have no published verdict to read; they are kept and
        marked as unknown, because we will not assert a data policy we have not read.
      </p>

      <h3 id="subscriptions" className="mt-6 mb-2 font-semibold">Subscriptions and company use</h3>
      <p className="text-sm text-gray-400">
        Every cost ranking on this site uses API prices; that is the clean baseline. Subscriptions
        such as ChatGPT Plus/Pro or Claude Pro/Max are a separate topic, in the folded note
        &ldquo;Subscription costs may differ&rdquo; below the ranking. They can make the effective cost
        per task much lower for heavy users, but they are not fixed token bundles: session, weekly and
        other limits vary and are mostly unpublished, so their effective cost per task depends on how
        much you use them and is never a universal number. They are not universally business-safe
        equivalents of API access either: account sharing, resale and automation are restricted, rate
        limits apply, and commercial-use eligibility depends on the provider, the plan, the region and
        the contract. We read the terms served to us (EEA): Anthropic&apos;s consumer terms (Claude
        Pro/Max) say &ldquo;Non-commercial use only&rdquo;, and Google says &ldquo;Only personal Google
        Accounts can sign up for Google AI plans&rdquo;, so with &ldquo;buying for a company&rdquo; set
        those plans are set aside and business seats are shown instead; Team, Enterprise and API access
        are the safer commercial categories. Cursor&apos;s terms explicitly allow use on behalf of an
        entity. GitHub steers organisations to Copilot Business without forbidding individual plans, so
        that is flagged as depending on plan and contract. OpenAI and xAI refuse automated reads of their
        pages; we do not work around that, so their prices and terms are marked as not collected. For
        a plan whose price we have, you can estimate its cost per task yourself: (monthly fee + any
        extra usage charges) ÷ the tasks you complete per month. Every input is your assumption and the
        result is labelled as a subscription estimate, apart from API costs. The plan list also shows the
        break-even point — the plan&apos;s price divided by the adjusted API cost per task of that
        vendor&apos;s best-scoring model in your view.
      </p>

      <h3 id="identity" className="mt-6 mb-2 font-semibold">Matching models to prices</h3>
      <p className="text-sm text-gray-400">
        Coding Agent results are attached to an exact or explicitly audited model/reasoning identity;
        every harness result is retained and their median is used; like the AA indices it is never
        copied to another effort setting. Family-scoped Epoch ECI and Intelligence.ai / DesignArena
        results are stored once on the deterministic collapsed-family representative; the composite
        and the model pages share them with the family&apos;s other settings as attached values (see
        the composite score above), and the provenance note states explicitly that this does not
        identify the tested effort setting. Raw DesignArena score views continue
        to show Elo. Stable model ids and repositories are preferred over fuzzy names, so distinct
        releases, modes, context tiers and serving routes never share the wrong price. See the
        repository README and <code>data/SCRAPING.md</code> for how each source is collected and
        refreshed.
      </p>

      <h3 id="benchmark-tags" className="mt-6 mb-2 font-semibold">Benchmark tags and the comparison table</h3>
      <p className="text-sm text-gray-400">
        The Benchmarks table groups every benchmark into one category and tags its name. <strong>AA</strong> marks
        results measured by Artificial Analysis; <strong>Arena</strong> marks human head-to-head votes scored as Elo.
        <strong> Headline</strong>, <strong>Niche</strong> and <strong>Community</strong> describe prominence, not
        quality: headline benchmarks are the ones model release posts and technical reports usually cite, niche ones
        come from a company or research lab and are rarely cited, community ones are run by an independent person or
        project. These tiers are editorial: one model drafted them, a different model reviewed them, and both the tags
        and the categories live in <code>data/benchmark-taxonomy.json</code>. A table cell shows the latest published
        result for that exact model configuration — measured results are preferred, a developer&apos;s own report is
        marked †, and a missing result stays a dash. Bars compare values within one row only; the bold value is the
        row&apos;s best, and ties are all bold.
      </p>
      {/* F-102: one counting rule, stated once, for every "N benchmarks" on the site. */}
      <p className="mt-2 text-sm text-gray-400">
        Wherever this site counts benchmarks, it counts <strong>boards</strong>: one benchmark family at one
        version, with at least one published result. A board can occupy several rows of the comparison table —
        one per harness a benchmark was run through, plus the measured cost a run of it reported — and those rows
        are still one benchmark. The registry lists every version we have ever read, including versions no
        current model has a result for, so it can be larger than the number the page shows.
      </p>
      <p className="mt-3 text-sm text-gray-400">
        Two further tags are not editorial. <strong>Saturated</strong> — &ldquo;Top models sit near this
        benchmark&apos;s ceiling; it separates weaker models, not the best.&rdquo; — is measured from the results we
        hold: the benchmark is on a bounded, higher-is-better scale, we have independently measured results for at
        least five models, and the mean of the five best results is at or above 90&nbsp;% of the benchmark&apos;s
        ceiling. Nothing is asserted from a claim, and a benchmark we cannot assess (an Elo board, an open points
        scale, fewer than five measured models) is not called unsaturated — it simply carries no tag.
        <strong> Judged</strong> — &ldquo;A preference or judge score, not task accuracy.&rdquo; — marks benchmarks
        whose number ranks or rates outputs by preference or quality: human head-to-head votes, an Elo from a judge
        panel, a rubric graded by a judge model. A judge that only checks whether an answer is correct (an equality
        checker, a majority vote on accuracy) is not judged, because the ground truth still decides. Each Judged
        classification quotes the benchmark&apos;s own registry text; the classifications and the quotes live in
        <code> data/benchmark-caveats.json</code> and a test fails if a quote is not found verbatim in its source.
      </p>
      <p className="mt-3 text-sm text-gray-400">
        Both tags change how a <strong>category composite</strong> is built. A preference or judge score never
        averages with task accuracy: when a category shows both kinds, only the task-accuracy rows make its
        composite (a category whose qualifying rows are all judged gets a composite of those, and says so). A
        saturated benchmark still counts, at half the weight of an unsaturated one — today that applies to GPQA
        Diamond inside the Science category score, which is therefore a weighted mean of CritPt and GPQA Diamond
        rather than a plain average. The same rule governs the selectable category scores in
        <code> data/category-score-anchors.json</code>; a judged benchmark may not be an anchor at all, and the
        build fails rather than silently changing a published score if one is ever reclassified. None of the seven
        slots of the Benchmark Heaven Main Composite is saturated today; two of them (DesignArena Web Apps and
        Full-Stack) are preference scores, and they enter as their own separate, percentile-normalised slots rather
        than averaged into task accuracy.
      </p>
      <p className="mt-3 text-sm text-gray-400">
        Where the benchmark&apos;s own source states a task or question date window, or a contamination control (a
        private or held-out set, a semi-private set, a periodically refreshed task set), the benchmark&apos;s (i)
        repeats it. Where the source states nothing, the field says exactly that — we do not infer a date window
        from a benchmark&apos;s name. Every row also names the version it is and the date we last verified its
        results from the source.
      </p>
    </div>
  );
}
