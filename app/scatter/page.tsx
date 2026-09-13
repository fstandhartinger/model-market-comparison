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
        Every model by real cost per task (cheaper to the right) and score. Upper-right is best
        value; the green line is the Pareto frontier.
      </p>
      <CostCapabilityScatter data={data} />
    </div>
  );
}
