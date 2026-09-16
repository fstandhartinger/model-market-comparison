import { ScatterLoader } from "../../components/deferred/ScatterLoader";
import { pageDataVersion } from "../../lib/page-data";


export default async function ScatterPage() {
  const version = await pageDataVersion();
  return (
    <div>
      <h1 className="text-2xl font-bold">Cost vs Capability</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        Every model by real cost per task (cheaper to the right) and score. Upper-right is best
        value; the green line is the Pareto frontier.
      </p>
      <ScatterLoader version={version} />
    </div>
  );
}
