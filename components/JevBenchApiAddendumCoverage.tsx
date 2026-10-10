import { coverageStatus } from '../lib/jevbench-api-full-addenda.mjs';

type Cell = { key: string; label: string; n: number; answered_ok: number; coverage_n?: number; errors: number; competence: number | null; types: string[]; pool: string };
type Entry = { key: string; release: string; row: { display: string }; provenance: { parent: string; source_url: string }; coverage: Record<string, Cell[]> };
export function JevBenchApiAddendumCoverage({ entries }: { entries: Entry[] }) {
  if (!entries.length) return null;
  return <section className="mt-8" data-bh-api-full-addendum-coverage>
    <h2 className="text-xl font-bold">Fresh full-set API addenda</h2>
    <p className="bh-muted text-sm">These separately sourced measurements use their own accepted sealed draw. Frozen historical exports remain unchanged. All 50 topic, use-case and language labels are retained; official cells need 15 items and numeric radar spokes need 30.</p>
    <p className="bh-muted text-sm">Valid answers and completed coverage are shown separately. An accepted model/input refusal can count toward coverage while remaining a failed scored answer; authentication, rate-limit and service failures do not.</p>
    {entries.map(e => <details key={e.key} className="mt-4">
      <summary className="cursor-pointer font-semibold">{e.row.display} · {e.release} · all 50 cells</summary>
      <p className="text-sm">Parent: {e.provenance.parent} · <a className="underline" href={e.provenance.source_url}>Published aggregate source</a></p>
      {Object.entries(e.coverage).map(([dim, cells]) => <div key={dim} className="mt-3">
        <h3 className="font-semibold">{dim}</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>Category</th><th>Items</th><th>Valid answers</th><th>Completed coverage</th><th>Errors</th><th>Official competence</th><th>Sample status</th><th>Types / pool</th></tr></thead>
          <tbody>{cells.map(c => <tr key={c.key}><td>{c.label}</td><td>{c.n}</td><td>{c.answered_ok}</td><td>{c.coverage_n ?? c.answered_ok}</td><td>{c.errors}</td><td>{c.competence === null ? 'N/A' : c.competence.toFixed(2)}</td><td>{coverageStatus(c)}</td><td>{c.types.join(', ')} / {c.pool}</td></tr>)}</tbody>
        </table></div>
      </div>)}
    </details>)}
  </section>;
}
