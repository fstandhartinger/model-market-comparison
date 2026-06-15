import { getDataset } from "../../lib/data";
import { clientData } from "../../lib/client-model";
import { CompareView } from "../../components/CompareView";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const ds = await getDataset();
  const data = clientData(ds);
  return (
    <div>
      <h1 className="text-2xl font-bold">Compare models head-to-head</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        Pick one or two models (A and B) on the left. The panel compares their benchmark scores and
        cheapest 10:1 price prominently — the better value in each row is highlighted — and lists the
        cheapest providers for each, side by side. Filters at the top (score, providers, models) apply here too.
      </p>
      <CompareView data={data} />
    </div>
  );
}
