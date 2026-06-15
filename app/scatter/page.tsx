import { getDataset } from "../../lib/data";
import { clientRows } from "../../lib/client-model";
import { CostCapabilityScatter } from "../../components/CostCapabilityScatter";

export const dynamic = "force-dynamic";

export default async function ScatterPage() {
  const ds = await getDataset();
  const rows = clientRows(ds);
  return (
    <div>
      <h1 className="text-2xl font-bold">Cost vs Capability</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        Every model plotted by price (x) against capability (y). The x-axis is the cheapest blended
        cost per million tokens at a 10:1 input/output mix; the y-axis is your chosen benchmark score.
        The best value sits in the upper-left.
      </p>
      <CostCapabilityScatter models={rows} />
    </div>
  );
}
