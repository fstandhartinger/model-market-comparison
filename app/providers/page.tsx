import { getDataset } from "../../lib/data";
import { clientData } from "../../lib/client-model";
import { ProvidersView } from "../../components/ProvidersView";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const ds = await getDataset();
  const data = clientData(ds);
  const platforms = new Map<string, number>();
  for (const p of ds.providers) platforms.set(p.platform, (platforms.get(p.platform) || 0) + 1);

  return (
    <div>
      <h1 className="text-2xl font-bold">Providers &amp; price ranking</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        Every inference provider and pricing platform tracked, ranked by how cheap they are.
        Rank either by a provider&apos;s average price position across all the models it offers
        (optionally limited to models that have the selected benchmark), or by a single model&apos;s
        prices across providers. Data bars make the comparison visual.
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        {[...platforms.entries()].sort((a, b) => b[1] - a[1]).map(([p, n]) => (
          <div key={p} className="card px-4 py-2">
            <div className="text-lg font-semibold tabular">{n}</div>
            <div className="text-xs text-gray-500">{p}</div>
          </div>
        ))}
      </div>

      <ProvidersView data={data} />
    </div>
  );
}
