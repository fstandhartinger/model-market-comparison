import { getDataset } from "../lib/data";
import { clientData } from "../lib/client-model";
import { HomeMode } from "../components/HomeMode";


export default async function Home() {
  const ds = await getDataset();
  const data = clientData(ds);
  const featured = data.models.filter((r) => r.featured).length;

  return (
    <div>
      <section className="bh-hero mb-6">
        <p className="bh-eyebrow">Benchmark Heaven / Model intelligence</p>
        <h1 className="bh-display mt-3">Every model benchmark result,<br /><span>and the cost you will actually pay.</span></h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-400">
          A broad, versioned collection of model benchmarks in one place, paired with transparent adjusted task-cost estimates.
          Start with a short recommendation list; open Advanced when you need every filter, provider route and assumption.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Stat label="Models" value={ds.counts.models} />
          <Stat label="Featured" value={featured} />
          <Stat label="Model families" value={ds.counts.families} />
          <Stat label="Provider offers" value={ds.counts.offers} />
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
