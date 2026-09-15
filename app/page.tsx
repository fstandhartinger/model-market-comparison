import { getDataset } from "../lib/data";
import { clientData, type ClientBenchmaxxing } from "../lib/client-model";
import { HomeMode } from "../components/HomeMode";
import { getBenchmarkView } from "../lib/benchmark-data";
import { benchmaxxingSignals } from "../lib/benchmax.mjs";
import { buildBenchmarkComparison } from "../lib/benchmark-comparison.mjs";
import { getBenchmarkMatrixPage } from "../lib/benchmark-matrix-data";
import { importantMatrix } from "../lib/benchmark-matrix.mjs";


export default async function Home() {
  const ds = await getDataset();
  // Overview carries the same tag as the dedicated Benchmaxxing page (one shared
  // implementation over the whole catalog). Server-side, so the client table receives
  // only display data and never recomputes benchmark scores.
  const view = await getBenchmarkView();
  const { reports, tagged } = benchmaxxingSignals(view);
  const benchmaxxing: Record<string, ClientBenchmaxxing> = Object.fromEntries(reports.map(([id, report]) => [id, { score: report.score ?? null, signal: tagged.has(id) }]));
  const data = { ...clientData(ds, benchmaxxing), comparison: buildBenchmarkComparison(view) };
  // R3.1: the claim is quantified from the dataset it describes, so it cannot drift
  // away from what the page actually shows.
  const benchmarks = ds.benchmark_results?.registry?.length ?? 0;
  const results = ds.benchmark_results?.observations?.length ?? 0;
  const updated = String(ds.generated_at ?? "").slice(0, 10) || "n/a";
  // CR-7.1: the simple Benchmarks section gets only the "Important" rows, not the full matrix.
  const benchMatrix = importantMatrix((await getBenchmarkMatrixPage()).matrix);

  return (
    <div>
      {/* F-01 (Fable 5.1 design pass, 2026-09-13): compact hero — the recommendation list
          must be visible on the first screen. R3.1 claim decided in DESIGN-DIRECTIVES.md. */}
      <section className="bh-hero mb-4">
        {/* CR-10.1 (Florian 2026-09-15): verbatim, with his capitalisation ("Every Benchmark. Actual Costs."). */}
        <h1 className="bh-display">The most detailed cost–capability analysis in AI.<br /><span>Every model. Every Benchmark. Actual Costs.</span></h1>
        <p className="bh-hero-line mt-2 text-sm text-gray-400">
          <span className="tabular">{results.toLocaleString()}</span> results · <span className="tabular">{benchmarks}</span> benchmarks · <span className="tabular">{ds.counts.models.toLocaleString()}</span> models · updated {updated}
        </p>
      </section>

      <HomeMode data={data} matrix={benchMatrix} />
    </div>
  );
}
