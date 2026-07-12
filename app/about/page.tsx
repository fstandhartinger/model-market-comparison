import { getDataset } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const ds = await getDataset();
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">About &amp; data sources</h1>
      <p className="mt-2 text-sm text-gray-400">
        This tool merges pricing and benchmark data for open-source and frontier LLMs into one
        comparable view. Prices are normalized to USD per 1M tokens (input and output) unless a
        platform prices differently (GitHub Copilot&apos;s current token/AI-Credit rates and legacy request billing are shown on a separate product axis).
      </p>

      <h2 className="mt-6 mb-2 font-semibold">Sources</h2>
      <ul className="space-y-2 text-sm text-gray-300">
        <li><b>OpenRouter</b> — model catalog and per-provider endpoint pricing (live API).</li>
        <li><b>ArtificialAnalysis</b> — Intelligence &amp; Coding indices plus sub-benchmarks (LiveCodeBench, SciCode, Terminal-Bench Hard, τ²-Bench, GPQA, MMLU-Pro) via the v2 API.</li>
        <li><b>DesignArena</b> — Agentic Web Dev Frontend &amp; Full-Stack Elo leaderboards.</li>
        <li><b>AWS Bedrock</b> — on-demand token pricing, European regions (eu-central-1 where available).</li>
        <li><b>Azure AI Foundry</b> — retail token meters plus model-card serving-region checks. A billing/resource region alone is not treated as proof that inference stays in the EU.</li>
        <li><b>Google Vertex AI</b> — pay-as-you-go token pricing for Gemini and Model Garden partner models (Claude, Llama, Mistral, DeepSeek, Qwen); offers are marked EU-hosted only where the model supports a documented European serving location.</li>
        <li><b>TensorX, Inceptron, Scaleway, IONOS, Mistral, Nebius, OVHcloud, STACKIT &amp; T-Systems</b> — direct European serverless/managed catalogs. TensorX is the broadest in-EU host for GLM/Kimi/DeepSeek/MiniMax; Inceptron serves GLM/Kimi/MiniMax from Finland; Scaleway and OVHcloud serve from France; STACKIT and T-Systems publish German/EU catalogs. Nebius is EU-capable but mixes EU, US and UK serving regions, so every model offer is checked separately. See the <a href="/eu" className="text-accent">EU &amp; Sovereign</a> tab.</li>
        <li><b>GitHub Copilot</b> — current 26-model AI-Credit/token-price catalog plus the 25-model legacy premium-request multiplier table. The UI&apos;s separate per-request field applies only to eligible legacy annual Pro/Pro+ plans.</li>
        <li><b>Anthropic / Claude Code</b> — all 11 currently callable first-party API models, their cache/batch/list prices, active promotions and Claude Code Enterprise terms.</li>
      </ul>

      <h2 className="mt-6 mb-2 font-semibold">What are &ldquo;Featured&rdquo; models?</h2>
      <p className="text-sm text-gray-400">
        <span className="text-warn">★ Featured</span> marks the specific models this tool was
        commissioned to track closely — the current frontier and leading open-weight families that
        matter most for the price/capability comparison. Filtering to &ldquo;Featured&rdquo; (the
        default on most pages) hides the long tail of older or niche models so the charts and tables
        stay focused. The featured set is:
      </p>
      <ul className="mt-2 grid grid-cols-1 gap-1 text-sm text-gray-300 sm:grid-cols-2">
        <li>• GPT-5.6 Sol/Terra/Luna, GPT-5.5 &amp; GPT-5.4 (incl. Mini/Nano, low→xhigh effort)</li>
        <li>• Claude Opus 4.8 / 4.7 / 4.6</li>
        <li>• Claude Sonnet 4.6 / 5 &amp; Claude Fable 5</li>
        <li>• Kimi K2.5 / K2.6 / K2.7-Coding</li>
        <li>• GLM 5.1 / 5.2</li>
        <li>• MiniMax M2.5 / M2.7 / M3</li>
        <li>• Xiaomi MiMo-V2.5-Pro</li>
        <li>• DeepSeek V4 Pro</li>
      </ul>
      <p className="mt-2 text-xs text-gray-500">
        Turn the &ldquo;Featured&rdquo; filter off on any page to explore all {ds.counts.models}{" "}
        tracked models. Featured status is derived from the model&apos;s family, so every reasoning
        variant of a featured family (e.g. each GPT-5.5 effort level) is included.
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

      <h2 className="mt-6 mb-2 font-semibold">Methodology</h2>
      <p className="text-sm text-gray-400">
        The &ldquo;10:1 blended&rdquo; cost is <code className="text-accent2">(10·input + 1·output) / 11</code> per 1M tokens,
        approximating a read-heavy workload. The cheapest such cost across all providers is used for the
        cost axis. Capability scores are shown as published; AA indices are 0–100, DesignArena values are Elo.
        The Composite score averages five equally weighted, fixed slots: AA Coding, source-matched AA Coding Agent,
        AA Intelligence, DesignArena Frontend and DesignArena Full-Stack. AA values are clamped to 0–100. A DesignArena
        board qualifies with at least 500 battles; its Elo is converted to the expected score against a fixed Elo 1000
        opponent. Each observed slot is converted to its percentile among the current catalog&apos;s unique observed values.
        A missing slot contributes the median-neutral percentile 50 while the denominator remains five, and a model with
        no observed slot has no Composite. There is no catalog-chain or dominance adjustment. Coding Agent results are
        attached to an exact or explicitly audited model/reasoning identity; every harness
        result is retained and their median is used. DesignArena results are attached once rather than copied to effort
        siblings. Raw DesignArena score views continue to show Elo. Stable model ids and repositories are preferred over
        fuzzy names so distinct releases, modes, context tiers and serving routes do not share the wrong price.
        See the repository README and <code>data/SCRAPING.md</code> for how each source is collected and refreshed.
      </p>
    </div>
  );
}
