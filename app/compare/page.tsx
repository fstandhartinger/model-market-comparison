import { getDataset } from "../../lib/data";
import { clientData } from "../../lib/client-model";
import { CompareView } from "../../components/CompareView";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const ds = await getDataset();
  const data = clientData(ds);
  return (
    <div>
      <h1 className="text-2xl font-bold">Compare — model → providers</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        Pick a model on the left (ranked by your chosen score); the right panel lists every provider
        that serves it with input, output and 10:1 blended price — with Excel-style data bars so you
        can compare at a glance. The cheapest provider is highlighted.
      </p>
      <CompareView data={data} />
    </div>
  );
}
