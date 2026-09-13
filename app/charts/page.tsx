import { getDataset } from "../../lib/data";
import { clientData } from "../../lib/client-model";
import { ChartsBoard } from "../../components/ChartsBoard";


export default async function ChartsPage() {
  const ds = await getDataset();
  const data = clientData(ds);
  return (
    <div>
      <h1 className="text-2xl font-bold">Charts</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        <a href="/compare" className="text-accent">Leaderboard</a>, cheapest models, open vs closed, and{" "}
        <a href="/scatter" className="text-accent">score against cost</a> — all under your current filters.
      </p>
      <ChartsBoard data={data} />
    </div>
  );
}
