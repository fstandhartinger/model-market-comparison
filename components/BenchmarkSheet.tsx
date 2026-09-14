import Link from 'next/link';
import type { BenchmarkView } from '../lib/benchmark-view.mjs';
import { latestScores } from '../lib/benchmark-view.mjs';
import { AnomalySummary, SourceScore } from './BenchmarkEvidence';
import { InfoTip } from './InfoTip';
import { humanVersion } from '../lib/version-label';
import type { CompositeAttachment, CompositeSlot } from '../lib/client-model';

const nativeValue = (value: number, unit: string | null) => {
  const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
  return `${Number(value.toFixed(digits))}${unit ? ` ${unit}` : ''}`;
};

/** F-08b: a release-post style sheet — one bar row per benchmark version, the model's catalog
 *  percentile as the bar, native value and date beside it; provenance in the row's expand.
 *  `percentiles` are computed on the full catalog view (this view is filtered to one model). */
export function BenchmarkSheet({ view, modelId, percentiles, attachments = {} }: { view: BenchmarkView; modelId: string; percentiles: Record<string, number | null>; attachments?: Partial<Record<CompositeSlot, CompositeAttachment>> }) {
  const axes = view.axes.filter((a) => a.scores.some((r) => r.modelId === modelId));
  const versions = new Set(axes.filter((a) => !a.id.startsWith('aa_coding_index') && !a.id.startsWith('aa_intelligence_index') && !a.id.startsWith('frontend') && !a.id.startsWith('fullstack')).map((a) => a.benchmarkId)).size;
  const categories = [...new Set(axes.map((a) => a.category))].sort();
  const absent = [...new Map(view.axes.filter((a) => !axes.some((present) => present.benchmarkId === a.benchmarkId)).map((a) => [a.benchmarkId, a])).values()];
  const attachedEntries = Object.values(attachments);
  return <section id="benchmark-sheet" className="mt-8 scroll-mt-6 space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold">Benchmark sheet</h2><p className="bh-muted mt-1 text-sm">{versions} of {view.registryCount} registered benchmark versions · bars show the percentile among all models measured on each benchmark.</p>{attachedEntries.length > 0 && <div className="bh-muted mt-2 text-xs" role="note" aria-label="Composite attached inputs"><span className="font-medium text-gray-300">Composite attachments</span> <span>(used in the score, not counted as exact benchmarks):</span><ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{attachedEntries.map((attachment) => <li key={attachment.label} className="inline-flex items-center gap-1"><span>{attachment.label} · attached</span><InfoTip title={`${attachment.label} attachment`} label={`explain ${attachment.label} attachment`}>{attachment.note}</InfoTip></li>)}</ul></div>}</div><Link className="bh-button" href={`/compare?model=${encodeURIComponent(modelId)}`}>Compare this model ↗</Link></div>
    <div className="grid items-start gap-5 lg:grid-cols-2">
    {categories.map((category) => <section key={category} className="bh-panel min-w-0 p-4" aria-label={`${category} benchmarks`}>
      <h3 className="mb-2 text-base font-semibold">{category}</h3>
      <ul className="divide-y divide-[rgb(var(--line))]">
        {axes.filter((a) => a.category === category).map((a) => {
          const rows = a.scores.filter((r) => r.modelId === modelId);
          const shown = latestScores(rows)[0] ?? rows[0];
          const pct = percentiles[a.id] ?? null;
          return <li key={a.id}>
            <details className="group">
              <summary className="grid min-h-0 list-none grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-3 !min-h-0 !py-1.5 text-sm md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_6.5rem_5.5rem]">
                <span className="min-w-0 truncate">
                  <span aria-hidden="true" className="bh-row-chevron mr-1 group-open:rotate-90">›</span>
                  <span className="font-medium">{a.name}</span>{humanVersion(a.version).kind === 'semantic' && <> <span className="bh-muted text-xs">{humanVersion(a.version).label}</span></>}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  {pct != null
                    ? <><span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[rgb(var(--line)/.5)]" aria-hidden="true"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(2, pct)}%` }} /></span><span className="w-7 text-right text-xs tabular-nums text-gray-400" title="Percentile among models measured on this benchmark">{Math.round(pct)}</span></>
                    : <span className="bh-muted text-xs">no percentile{shown?.lowSample ? ' · low sample' : ''}</span>}
                </span>
                <span className="text-right font-semibold tabular-nums">{shown ? nativeValue(shown.value, a.unit) : '—'}</span>
                <span className="bh-muted hidden text-right text-xs tabular-nums md:block">{shown?.date ? shown.date.slice(0, 10) : ''}</span>
              </summary>
              <div className="space-y-3 pb-3 pl-5">
                <p className="bh-muted text-xs">
                  <Link className="text-accent hover:underline" href={`/benchmarks?benchmark=${encodeURIComponent(a.benchmarkId)}`}>{a.name} {humanVersion(a.version).label} ↗</Link>
                  {a.cohort ? ` · ${a.cohort}` : ''}{a.description ? ` — ${a.description}` : ''}
                </p>
                {rows.map((r) => <SourceScore key={r.id} view={view} axis={a} row={r} />)}
              </div>
            </details>
          </li>;
        })}
      </ul>
    </section>)}
    </div>
    {!axes.length && <div className="bh-empty">No verified benchmark observation is attached to this exact configuration yet. Provider pricing can still be available.</div>}
    <AnomalyPanel view={view} modelId={modelId} />
    <details className="bh-panel p-5"><summary className="font-medium">Missing coverage · {absent.length} benchmark versions</summary><p className="bh-muted my-3 text-sm">No result does not mean a zero, or that the model was never tested. Collection failures and disputed versions retain their distinct status.</p><ul className="grid gap-3 md:grid-cols-2">{absent.map((a) => { const missing = view.missing.find((m) => m.model_id === modelId && m.benchmark_id === a.benchmarkId); return <li key={a.benchmarkId} className="rounded border border-line p-3 text-sm"><Link className="text-accent" href={`/benchmarks?benchmark=${encodeURIComponent(a.benchmarkId)}`}>{a.name} · {humanVersion(a.version).label}</Link><p className="bh-muted mt-1 text-xs">{missing ? `${missing.status.replaceAll('_', ' ')}: ${missing.reason}` : a.collection && a.collection.status !== 'collected' ? `${a.collection.status.replaceAll('_', ' ')}: ${a.collection.reason}` : 'Unknown: no published result matched to this configuration.'}</p></li>; })}</ul></details>
  </section>;
}

// F-08a: the anomaly panel renders nothing without flags, so its card must not render empty.
function AnomalyPanel({ view, modelId }: { view: BenchmarkView; modelId: string }) {
  const panel = AnomalySummary({ view, modelId });
  return panel ? <div className="bh-panel p-5">{panel}</div> : null;
}
