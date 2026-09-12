import { getDataset } from "../../lib/data";


export default async function AboutPage() {
  const ds = await getDataset();
  // R4.4: the featured shortlist is derived at build time and published in the dataset,
  // so this page lists exactly what the site is filtering on — never a stale hand-list.
  const featured = ds.build_diagnostics?.featured_selection ?? null;
  const familyNames = new Map(ds.models.map((m) => [m.family_key, m.family_name || m.family_key]));
  const familyName = (key: string) => familyNames.get(key) ?? key;
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">About &amp; data sources</h1>
      <p className="mt-2 text-sm text-gray-400">
        Benchmark Heaven brings together pricing and benchmark data for open-source and frontier LLMs into one
        comparable view. Prices are normalized to USD per 1M tokens (input and output) unless a
        platform prices differently (GitHub Copilot&apos;s current token/AI-Credit rates and legacy request billing are shown on a separate product axis).
      </p>

      <h2 className="mt-6 mb-2 font-semibold">Sources</h2>
      <ul className="space-y-2 text-sm text-gray-300">
        <li><b>OpenRouter</b> — model catalog and per-provider endpoint pricing (live API).</li>
        <li><b>ArtificialAnalysis</b> — Intelligence &amp; Coding indices plus sub-benchmarks (LiveCodeBench, SciCode, Terminal-Bench Hard, τ²-Bench, GPQA, MMLU-Pro) via the v2 API.</li>
        <li><b>AA Coding Agent Index</b> — Composite retains v1.4, last collected {ds.sources.aa_coding_agents}. AA now publishes v1.5 with different benchmark components. We collect it separately and do not mix the versions.</li>
        <li>Some AA licensing and model identifiers are retained from earlier source publications. Their original dates are recorded per field in the downloadable dataset.</li>
        <li><b>Intelligence.ai / DesignArena</b> — Agentic Web Dev Frontend &amp; Full-Stack Elo leaderboards.</li>
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
        <li><b>Its cache behaviour.</b> Cached input is billed at that endpoint&apos;s cache-read price,
          uncached input at its normal input price, and cache writes at its write price. The cache-hit
          rate is the measured one for that exact endpoint where OpenRouter publishes it.</li>
        <li><b>The model&apos;s token efficiency.</b> How many output tokens this specific model
          variant needs per task, from Artificial Analysis&apos; measurements. A model that reasons at
          length pays for every one of those tokens.</li>
        <li><b>The input:output ratio</b> of real workloads on that model, from OpenRouter usage
          statistics. Where a model has no published per-model usage, we fall back to a documented
          global ratio and label the figure as an estimate rather than a measurement.</li>
      </ul>
      <p className="mt-3 text-sm text-gray-400">
        USD/task = [input × (1 − hit) × input price + input × hit × cache-read price + additional
        writes × write price + output × output price] ÷ 1,000,000. Where an input is unknown we say
        so instead of hiding it: missing task-token measurements assume 1,000 output tokens/task, an
        unknown cache-hit rate assumes 0 %, and unmeasured cache writes assume 0 tokens. Every such
        assumption is listed on the price itself — click any underlined price to see the exact
        inputs, sources and dates behind it. Raw list-price mode skips all of this and simply blends
        list prices at the fixed input:output ratio you choose.
      </p>

      <h3 id="score" className="mt-6 mb-2 font-semibold">The composite score</h3>
      <p className="text-sm text-gray-400">
        Benchmarks are not on a common scale, so we do not average raw scores. Each model&apos;s
        result on a benchmark becomes its <b>percentile</b> among all models measured on that same
        benchmark, and those percentiles are averaged — a hard benchmark and an easy one then count
        equally. The composite uses five slots: AA Coding, source-matched AA Coding Agent, AA
        Intelligence, DesignArena Frontend and DesignArena Full-Stack. AA values are clamped to
        0–100. A DesignArena board qualifies at an app-selected minimum of 200 battles, aligned with
        the source&apos;s typical preliminary/reliability threshold; its Elo is converted to the
        expected score against a fixed Elo 1000 opponent.
      </p>
      <p className="mt-3 text-sm text-gray-400">
        Thin evidence must not become an advantage. Every missing slot inherits that model&apos;s own
        mean observed percentile, producing a base score exactly equal to the mean of its available
        percentiles. A final dominance-safe projection then prevents missing data from reversing an
        otherwise unambiguous comparison: when one model covers every reliable slot of another
        measured model and is no worse in any shared slot, the catalog scores are adjusted by the
        smallest symmetric amount needed to keep the dominating model at least 0.1 points ahead. The
        unadjusted base and any adjustment are shown separately in model details. A model with no
        reliable observed slot receives the neutral fallback 50; its zero evidence coverage stays
        distinct from a measured score and is excluded from capability charts. The <b>#benchmarks</b>
        column counts the distinct versioned benchmarks a model has a usable result for, which is a
        broader set than the five composite slots.
      </p>

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

      <h3 id="identity" className="mt-6 mb-2 font-semibold">Matching models to prices</h3>
      <p className="text-sm text-gray-400">
        Coding Agent results are attached to an exact or explicitly audited model/reasoning identity;
        every harness result is retained and their median is used. Family-scoped Intelligence.ai /
        DesignArena results are attached exactly once to the deterministic collapsed-family
        representative rather than copied to effort siblings — the provenance note states explicitly
        that this does not identify the tested effort setting. Raw DesignArena score views continue
        to show Elo. Stable model ids and repositories are preferred over fuzzy names, so distinct
        releases, modes, context tiers and serving routes never share the wrong price. See the
        repository README and <code>data/SCRAPING.md</code> for how each source is collected and
        refreshed.
      </p>
    </div>
  );
}
