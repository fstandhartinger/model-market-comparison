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
        platform prices differently (GitHub Copilot is per premium request).
      </p>

      <h2 className="mt-6 mb-2 font-semibold">Sources</h2>
      <ul className="space-y-2 text-sm text-gray-300">
        <li><b>OpenRouter</b> — model catalog and per-provider endpoint pricing (live API).</li>
        <li><b>ArtificialAnalysis</b> — Intelligence &amp; Coding indices plus sub-benchmarks (LiveCodeBench, SciCode, Terminal-Bench Hard, τ²-Bench, GPQA, MMLU-Pro) via the v2 API.</li>
        <li><b>DesignArena</b> — Agentic Web Dev Frontend &amp; Full-Stack Elo leaderboards.</li>
        <li><b>AWS Bedrock</b> — on-demand token pricing, European regions (eu-central-1 where available).</li>
        <li><b>Azure AI Foundry</b> — token pricing for EU deployments (Sweden Central / West Europe).</li>
        <li><b>Google Vertex AI</b> — pay-as-you-go token pricing for Gemini and Model Garden partner models (Claude, Llama, Mistral, DeepSeek, Qwen); EU region (europe-west4).</li>
        <li><b>GitHub Copilot</b> — premium-request multipliers (commercial, June 2026+). Priced per request, shown separately.</li>
        <li><b>Anthropic / Claude Code</b> — list token pricing for Opus 4.6/4.7/4.8, Sonnet 4.6, Fable 5.</li>
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
        <li>• GPT-5.5 &amp; GPT-5.4 (incl. Mini/Nano, low→xhigh effort)</li>
        <li>• Claude Opus 4.8 / 4.7 / 4.6</li>
        <li>• Claude Sonnet 4.6 &amp; Claude Fable 5</li>
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
        Model names are normalized across sources, so a model&apos;s benchmark and its provider prices line up.
        See the repository README and <code>data/SCRAPING.md</code> for how each source is collected and refreshed.
      </p>
    </div>
  );
}
