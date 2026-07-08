import { getDataset } from "../../lib/data";
import { clientData } from "../../lib/client-model";
import { ProviderExplorer } from "../../components/ProviderExplorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Provider explorer — Model Market Comparison" };

export default async function ProviderExplorerPage() {
  const ds = await getDataset();
  const data = clientData(ds);
  return (
    <div>
      <h1 className="text-2xl font-bold">Provider explorer</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        Browse the <b>provider directory</b> on the left — each tagged <span className="text-amber-300">Hyperscaler</span> /
        {" "}<span className="text-emerald-300">EU</span> / <span className="text-sky-300">Non-US</span>, with its model count and HQ.
        Click a provider to see <b>every model it offers</b> and its price; click a model to compare that provider&apos;s
        price against <b>all other providers</b> of the same model, ranked cheapest-first (10:1 blended).
      </p>
      <ProviderExplorer data={data} />
    </div>
  );
}
