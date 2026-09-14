import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBenchmarkView } from '../../../lib/benchmark-data';
import { getBenchmarkMatrixPage } from '../../../lib/benchmark-matrix-data';
import { latestScores } from '../../../lib/benchmark-view.mjs';
import { formatValue, resultHref, rowWinners } from '../../../lib/benchmark-matrix.mjs';
import { SourceScore } from '../../../components/BenchmarkEvidence';
import { humanVersion } from '../../../lib/version-label';

export const metadata: Metadata = { title: 'Benchmark result' };

const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'source'; } };

// CR-1.8: one comparison-table cell, with where the number comes from, the same benchmark for the
// other compared models, and the model's other results. Every value here is a dataset value.
export default async function BenchmarkResultPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const axisId = typeof p.axis === 'string' ? p.axis : '';
  const modelId = typeof p.model === 'string' ? p.model : '';
  const pinned = p.pinned === '1';
  const view = await getBenchmarkView();
  const { matrix, filterData } = await getBenchmarkMatrixPage();
  const models = new Map(filterData.models.map((m) => [m.id, m]));
  const axis = view.axes.find((a) => a.id === axisId);
  if (!axis || !models.has(modelId)) notFound();
  const latest = new Map(latestScores(axis.scores, 'all').filter((r) => r.modelId).map((r) => [r.modelId as string, r]));
  const row = latest.get(modelId);
  if (!row) notFound();
  const compared = (typeof p.models === 'string' ? p.models.split(',') : []).filter((id) => models.has(id)).slice(0, 10);
  if (!compared.includes(modelId)) compared.unshift(modelId);
  const model = models.get(modelId)!;
  const win = rowWinners(compared.map((id) => latest.get(id)?.value ?? null), axis.higherBetter ?? null);
  const back = pinned ? `/benchmarks?models=${compared.map(encodeURIComponent).join(',')}` : '/benchmarks';
  const groupLabel = new Map(matrix.groups.map((g) => [g.id, g.label]));
  const others = (matrix.values[modelId] ?? []).map(([i, v]) => ({ row: matrix.rows[i], v })).filter((o) => o.row.id !== axisId);
  const direction = axis.higherBetter == null ? 'direction not published' : axis.higherBetter ? 'higher is better' : 'lower is better';

  return <div className="max-w-4xl">
    <nav aria-label="Breadcrumb" className="text-sm"><Link href={back} className="text-accent hover:underline">← Back to the comparison</Link></nav>
    <header className="bh-page-head mt-3">
      <p className="bh-eyebrow">{axis.category} · {humanVersion(axis.version).label}{axis.cohort !== 'Published board' ? ` · ${axis.cohort}` : ''}</p>
      <h1 className="text-3xl font-bold tracking-tight">{axis.name}</h1>
      {axis.description && <p className="bh-muted mt-2 max-w-2xl">{axis.description}</p>}
    </header>

    <section className="bh-panel p-5" aria-labelledby="bh-result-model">
      <h2 id="bh-result-model" className="bh-muted text-sm">{model.org} · <Link href={`/models/${encodeURIComponent(modelId)}`} className="text-accent hover:underline">{model.display_name}</Link></h2>
      <p className="mt-1 text-4xl font-bold tabular" data-bh-result-value>{formatValue(row.value, axis.unit)}</p>
      <p className="bh-muted mt-1 text-sm">Unit: {axis.unit} · {direction}</p>
      <div className="mt-4 border-t border-line pt-4"><SourceScore view={view} axis={axis} row={row} /></div>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {axis.url && <a href={axis.url} target="_blank" rel="noreferrer" className="text-accent underline">Benchmark&apos;s primary source ↗</a>}
        <Link href={`/benchmarks?benchmark=${encodeURIComponent(axis.benchmarkId)}`} className="text-accent underline">Every model on this benchmark</Link>
      </p>
    </section>

    <section className="mt-8" aria-labelledby="bh-result-compared">
      <h2 id="bh-result-compared" className="text-lg font-semibold">The compared models on {axis.name}</h2>
      <div className="bh-table-wrap mt-3 overflow-x-auto" role="region" aria-label="Compared models" tabIndex={0}>
        <table className="bh-table w-full text-sm">
          <thead><tr><th scope="col">Model</th><th scope="col" className="text-right">Result</th><th scope="col">Basis · observed · source</th></tr></thead>
          <tbody>{compared.map((id, j) => {
            const r = latest.get(id), m = models.get(id)!, src = r ? view.sources[r.source] : null;
            return <tr key={id} aria-current={id === modelId ? 'true' : undefined} className={id === modelId ? 'bg-accent/5' : ''}>
              <th scope="row" className="text-left font-medium">{r && id !== modelId ? <Link href={resultHref(axisId, id, compared, pinned)} className="hover:underline">{m.display_name}</Link> : m.display_name}<span className="bh-muted block text-xs font-normal">{m.org}</span></th>
              <td className={`text-right tabular ${win[j] ? 'font-bold' : ''}`}>{r ? formatValue(r.value, axis.unit) : '—'}</td>
              <td className="bh-muted text-xs">{r ? <>{r.basis.replaceAll('_', ' ')} · {r.date?.slice(0, 10) ?? 'date unavailable'}{src ? <> · <a href={src.url} target="_blank" rel="noreferrer" className="text-accent underline">{host(src.url)} ↗</a></> : null}</> : 'No published result — never a zero'}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>

    {others.length > 0 && <section className="mt-8" aria-labelledby="bh-result-others">
      <h2 id="bh-result-others" className="text-lg font-semibold">{model.display_name}: {others.length} other results</h2>
      <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">{others.map(({ row: o, v }) => <li key={o.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-sm">
        <span className="min-w-0">{o.ranking ? <Link href={resultHref(o.id, modelId, compared, pinned)} className="hover:underline">{o.name}</Link> : o.name}<span className="bh-muted block text-xs">{groupLabel.get(o.group)}{o.cohort ? ` · ${o.cohort}` : ''}</span></span>
        <span className="tabular shrink-0">{formatValue(v, o.unit)}</span>
      </li>)}</ul>
    </section>}
  </div>;
}
