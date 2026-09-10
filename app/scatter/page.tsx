import { getDataset } from "../../lib/data";
import { clientData } from "../../lib/client-model";
import { CostCapabilityScatter } from "../../components/CostCapabilityScatter";


export default async function ScatterPage() {
  const ds = await getDataset();
  const data = clientData(ds);
  return (
    <div>
      <h1 className="text-2xl font-bold">Cost vs Capability</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        Every model plotted by price (x) against capability (y). The x-axis is inverted — cheaper to
        the right — and defaults to the cheapest modeled USD per task. The global toggle restores raw list prices per million tokens using your chosen fixed input/output blend;
        the y-axis is your chosen benchmark score. The best value sits in the upper-right.
      </p>
      <CostCapabilityScatter data={data} />
    </div>
  );
}
