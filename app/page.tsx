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
  // R3.1: the claim is quantified from the dataset it describes, so it cannot drift
  // away from what the page actually shows.
  const benchmarks = ds.benchmark_results?.registry?.length ?? 0;
  const results = ds.benchmark_results?.observations?.length ?? 0;
  const updated = String(ds.generated_at ?? "").slice(0, 10) || "n/a";

  return (
    <div>
      {/* F-01 (Fable 5.1 design pass, 2026-09-13): compact hero — the recommendation list
          must be visible on the first screen. R3.1 claim decided in DESIGN-DIRECTIVES.md. */}
      <section className="bh-hero mb-4">
        <h1 className="bh-display">The most complete collection of AI model benchmarks.<br /><span>And the only place that shows what each model really costs you.</span></h1>
        <p className="bh-hero-line mt-2 text-sm text-gray-400">
          <span className="tabular">{results.toLocaleString()}</span> results · <span className="tabular">{benchmarks}</span> benchmarks · <span className="tabular">{ds.counts.models.toLocaleString()}</span> models · updated {updated} — every result with its source and date. Cost counts the provider you would actually use, its cache prices and hit rates, and the tokens the model burns per task.
        </p>
      </section>

      <HomeMode data={data} />
    </div>
  );
}
