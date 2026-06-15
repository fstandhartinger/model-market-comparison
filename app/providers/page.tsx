import { getDataset } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const ds = await getDataset();
  const platforms = new Map<string, number>();
  for (const p of ds.providers) platforms.set(p.platform, (platforms.get(p.platform) || 0) + 1);

  return (
    <div>
      <h1 className="text-2xl font-bold">Providers &amp; platforms</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        Every inference provider and pricing platform tracked, with how many model families each one
        prices. OpenRouter entries are individual inference providers; AWS Bedrock, Azure AI Foundry,
        Anthropic and GitHub Copilot are first-party platforms.
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        {[...platforms.entries()].sort((a, b) => b[1] - a[1]).map(([p, n]) => (
          <div key={p} className="card px-4 py-2">
            <div className="text-lg font-semibold tabular">{n}</div>
            <div className="text-xs text-gray-500">{p}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="grid w-full text-sm">
          <thead><tr>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Provider</th>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Platform</th>
            <th className="px-3 py-2 text-right text-xs text-gray-400">Model families priced</th>
          </tr></thead>
          <tbody>
            {ds.providers.map((p, i) => (
              <tr key={i}>
                <td className="px-3 py-2">{p.provider}</td>
                <td className="px-3 py-2 text-gray-400">{p.platform}</td>
                <td className="px-3 py-2 text-right tabular font-semibold">{p.model_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
