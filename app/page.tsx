import { getDataset } from "../lib/data";
import { clientData, type ClientBenchmaxxing } from "../lib/client-model";
import { HomeMode } from "../components/HomeMode";
import { getBenchmarkView } from "../lib/benchmark-data";
import { scoreBenchmaxxing } from "../lib/benchmax.mjs";


export default async function Home() {
  const ds = await getDataset();
  // Overview carries the same deterministic top-decile tag as the dedicated
  // Benchmaxxing page. Keep this server-side so the client table receives only
  // display data and never recomputes benchmark scores.
  const view = await getBenchmarkView();
  const datasetIds = new Set(ds.models.map((m) => m.id));
  const reports = view.models.filter((m) => datasetIds.has(m.id)).map((m) => [m.id, scoreBenchmaxxing(view, m.id)] as const)
    .filter(([, report]) => report.status === "scored")
    .sort((a, b) => (b[1].score ?? -1) - (a[1].score ?? -1) || a[0].localeCompare(b[0]));
  const signalIds = new Set(reports.slice(0, Math.max(1, Math.ceil(reports.length * 0.1))).map(([id]) => id));
  const benchmaxxing: Record<string, ClientBenchmaxxing> = Object.fromEntries(reports.map(([id, report]) => [id, { score: report.score ?? null, signal: signalIds.has(id) }]));
  const data = clientData(ds, benchmaxxing);
  const featured = data.models.filter((r) => r.featured).length;
  // R3.1: the claim is quantified from the dataset it describes, so it cannot drift
  // away from what the page actually shows.
  const benchmarks = ds.benchmark_results?.registry?.length ?? 0;
  const results = ds.benchmark_results?.observations?.length ?? 0;

  return (
    <div>
      <section className="bh-hero mb-6">
        <p className="bh-eyebrow">Benchmark Heaven / Model intelligence</p>
        <h1 className="bh-display mt-3">Every benchmark result for every model,<br /><span>and what each one actually costs.</span></h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-400">
          {results.toLocaleString()} published results across {benchmarks} versioned benchmarks and{" "}
          {ds.counts.models.toLocaleString()} models — collected in one place, each with its source and date.
          Then the part no price list tells you: what a task really costs once the provider, its caching
          and the model&apos;s own token appetite are counted.
        </p>
        <div className="bh-stat-row mt-4 flex flex-wrap gap-3">
          <Stat label="Benchmark results" value={results} />
          <Stat label="Benchmarks" value={benchmarks} />
          <Stat label="Models" value={ds.counts.models} />
          <Stat label="Featured" value={featured} />
          <Stat label="Provider channels" value={ds.counts.providers} />
        </div>
      </section>

      <HomeMode data={data} />
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
