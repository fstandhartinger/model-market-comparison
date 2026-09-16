"use client";
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { BenchmarkView } from '../lib/benchmark-view.mjs';
import { SourceScore } from './BenchmarkEvidence';
import { humanVersion } from '../lib/version-label';

// CR-62.1: a model page server-rendered every row's evidence and the whole missing-coverage list inside
// closed <details>, which kept the page above the 300 KB link-preview limit. That content now loads when a
// row is opened, from the same one-model view the page used (`/api/benchmark-view?model=<id>`).
const views = new Map<string, Promise<BenchmarkView>>();
function modelView(modelId: string): Promise<BenchmarkView> {
  let p = views.get(modelId);
  if (!p) {
    p = fetch(`/api/benchmark-view?model=${encodeURIComponent(modelId)}`).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
    p.catch(() => views.delete(modelId));
    views.set(modelId, p);
  }
  return p;
}
function useModelView(modelId: string, open: boolean) {
  const [state, setState] = useState<{ view: BenchmarkView | null; error: boolean }>({ view: null, error: false });
  useEffect(() => {
    if (!open || state.view) return;
    let live = true;
    modelView(modelId).then((view) => { if (live) setState({ view, error: false }); }, () => { if (live) setState({ view: null, error: true }); });
    return () => { live = false; };
  }, [modelId, open, state.view]);
  return state;
}
const pending = (error: boolean) => <p className="bh-muted text-xs">{error ? 'The evidence could not be loaded — close and reopen to retry.' : 'Loading evidence…'}</p>;

export function LazyEvidenceRow({ modelId, axisId, summary, head }: { modelId: string; axisId: string; summary: ReactNode; head: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { view, error } = useModelView(modelId, open);
  const axis = view?.axes.find((a) => a.id === axisId);
  return <details className="group" onToggle={(e) => setOpen(e.currentTarget.open)}>
    {summary}
    <div className="space-y-3 pb-3 pl-5">
      {head}
      {open && (view && axis ? axis.scores.filter((r) => r.modelId === modelId).map((r) => <SourceScore key={r.id} view={view} axis={axis} row={r} />) : pending(error))}
    </div>
  </details>;
}

export function LazyMissingCoverage({ modelId, count }: { modelId: string; count: number }) {
  const [open, setOpen] = useState(false);
  const { view, error } = useModelView(modelId, open);
  const absent = view ? [...new Map(view.axes.filter((a) => !view.axes.some((present) => present.benchmarkId === a.benchmarkId && present.scores.some((r) => r.modelId === modelId))).map((a) => [a.benchmarkId, a])).values()] : [];
  return <details className="bh-panel p-5" onToggle={(e) => setOpen(e.currentTarget.open)}><summary className="font-medium">Missing coverage · {count} benchmark versions</summary><p className="bh-muted my-3 text-sm">No result does not mean a zero, or that the model was never tested. Collection failures and disputed versions retain their distinct status.</p>
    {open && (view ? <ul className="grid gap-3 md:grid-cols-2">{absent.map((a) => { const missing = view.missing.find((m) => m.model_id === modelId && m.benchmark_id === a.benchmarkId); return <li key={a.benchmarkId} className="rounded border border-line p-3 text-sm"><Link className="text-accent" href={`/benchmarks?benchmark=${encodeURIComponent(a.benchmarkId)}`}>{a.name} · {humanVersion(a.version).label}</Link><p className="bh-muted mt-1 text-xs">{missing ? `${missing.status.replaceAll('_', ' ')}: ${missing.reason}` : a.collection && a.collection.status !== 'collected' ? `${a.collection.status.replaceAll('_', ' ')}: ${a.collection.reason}` : 'Unknown: no published result matched to this configuration.'}</p></li>; })}</ul> : pending(error))}
  </details>;
}

export interface SheetRow { axisId: string; benchmarkId: string; name: string; suffix: string | null; versionLabel: string; pct: number | null; lowSample: boolean; value: string | null; date: string; cohort: string | null; description: string | null }

/** F-08b's release-post rows (one bar row per benchmark version); CR-62.1 renders them from compact props. */
export function SheetRows({ modelId, rows }: { modelId: string; rows: SheetRow[] }) {
  return <ul className="divide-y divide-[rgb(var(--line))]">
    {rows.map((a) => <li key={a.axisId}>
      <LazyEvidenceRow modelId={modelId} axisId={a.axisId} summary={<summary className="grid min-h-0 list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 !min-h-0 !py-1.5 text-sm md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_6.5rem_5.5rem]">
          {/* F-69: below md the name takes its own line and wraps; identifying text never truncates (design-system rule). */}
          <span className="col-span-2 min-w-0 md:col-span-1 md:truncate">
            <span aria-hidden="true" className="bh-row-chevron mr-1 group-open:rotate-90">›</span>
            <span className="font-medium">{a.name}</span>{a.suffix && <> <span className="bh-muted text-xs">{a.suffix}</span></>}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            {a.pct != null
              ? <><span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[rgb(var(--line)/.5)]" aria-hidden="true"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(2, a.pct)}%` }} /></span><span className="w-7 text-right text-xs tabular-nums text-gray-400" title="Percentile among models measured on this benchmark">{Math.round(a.pct)}</span></>
              : <span className="bh-muted text-xs">no percentile{a.lowSample ? ' · low sample' : ''}</span>}
          </span>
          <span className="text-right font-semibold tabular-nums">{a.value ?? '—'}</span>
          <span className="bh-muted hidden text-right text-xs tabular-nums md:block">{a.date}</span>
        </summary>} head={
          <p className="bh-muted text-xs">
            <Link className="text-accent hover:underline" href={`/benchmarks?benchmark=${encodeURIComponent(a.benchmarkId)}`}>{a.name} {a.suffix ?? a.versionLabel} ↗</Link>
            {a.cohort ? ` · ${a.cohort}` : ''}{a.description ? ` — ${a.description}` : ''}
          </p>} />
    </li>)}
  </ul>;
}
