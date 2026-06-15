import { getDataset } from "../../lib/data";
import { clientRows } from "../../lib/client-model";
import { ChartsBoard } from "../../components/ChartsBoard";

export const dynamic = "force-dynamic";

export default async function ChartsPage() {
  const ds = await getDataset();
  const rows = clientRows(ds);
  return (
    <div>
      <h1 className="text-2xl font-bold">Charts</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        Capability leaderboards, cheapest-model rankings, and an open-weights vs closed comparison.
        Switch the score and toggle the featured set. For the price/capability scatter, see{" "}
        <a href="/scatter" className="text-accent">Cost vs Capability</a>.
      </p>
      <ChartsBoard models={rows} />
    </div>
  );
}
