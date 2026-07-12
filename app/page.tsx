import { getDataset } from "../lib/data";
import { clientData } from "../lib/client-model";
import { ModelExplorer } from "../components/ModelExplorer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ds = await getDataset();
  const data = clientData(ds);
  const featured = data.models.filter((r) => r.featured).length;

  return (
    <div>
      <section className="mb-6">
        <h1 className="text-2xl font-bold">LLM Price &amp; Capability Comparison</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-400">
          Open-source and frontier LLMs ranked by capability and priced across providers —
          OpenRouter inference providers, hyperscalers, EU-native APIs, Chutes, GitHub Copilot and
          the Anthropic / Claude Code list price. Capability is measured with ArtificialAnalysis indices
          and Intelligence.ai / DesignArena Elo. Pick a score, then sort by cheapest 10:1 blended cost.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Stat label="Models" value={ds.counts.models} />
          <Stat label="Featured" value={featured} />
          <Stat label="Model families" value={ds.counts.families} />
          <Stat label="Provider offers" value={ds.counts.offers} />
          <Stat label="Provider channels" value={ds.counts.providers} />
        </div>
      </section>

      <ModelExplorer data={data} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card px-4 py-2">
      <div className="text-lg font-semibold tabular">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
