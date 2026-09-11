import { getDataset } from "../lib/data";
import { clientData } from "../lib/client-model";
import { ModelExplorer } from "../components/ModelExplorer";


export default async function Home() {
  const ds = await getDataset();
  const data = clientData(ds);
  const featured = data.models.filter((r) => r.featured).length;

  return (
    <div>
      <section className="bh-hero mb-6">
        <p className="bh-eyebrow">Benchmark Heaven / Model intelligence</p>
        <h1 className="bh-display mt-3">Benchmarks in perspective.<br /><span>Costs in context.</span></h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-400">
          Find the model that meets your benchmark threshold, then compare estimated task costs across providers.
          Adjusted prices are on by default. Explore versioned results, check their sources, and see where evidence is missing.
          Raw list prices and fixed input/output blends remain selectable.
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
