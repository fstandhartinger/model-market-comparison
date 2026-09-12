"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { latestScores, type BenchmarkView, type ViewAxis } from '../lib/benchmark-view.mjs';
import { SourceScore } from './BenchmarkEvidence';

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export function BenchmarkRanking({ initialView, axisList }: { initialView: BenchmarkView; axisList: ViewAxis[] }) {
  const [view, setView] = useState(initialView), [benchmark, setBenchmark] = useState(initialView.axes[0].benchmarkId), [axisId, setAxisId] = useState(initialView.axes[0].id);
  const [q, setQ] = useState(''), [basis, setBasis] = useState('measured'), [openOnly, setOpenOnly] = useState(false), [unmatched, setUnmatched] = useState(false), [limit, setLimit] = useState(50), [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const definitions = useMemo(() => [...new Map(axisList.map((a) => [a.benchmarkId, a])).values()].sort((a, b) => a.name.localeCompare(b.name)), [axisList]);
  const groups = axisList.filter((a) => a.benchmarkId === benchmark);
  const changeBenchmark = (id: string) => { setBenchmark(id); const first = axisList.filter((a) => a.benchmarkId === id).sort((a, b) => b.stats.n - a.stats.n)[0]; if (first) setAxisId(first.id); };
  useEffect(() => { const id = new URLSearchParams(location.search).get('benchmark'); if (id && axisList.some((a) => a.benchmarkId === id)) changeBenchmark(id); }, [axisList]); // URL is initial navigation input.
  useEffect(() => {
    if (view.axes[0]?.id === axisId && !retry) return;
    const controller = new AbortController(); setBusy(true); setError(''); setLimit(50);
    fetch(`/api/benchmark-view?axis=${encodeURIComponent(axisId)}`, { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error('Benchmark results could not be loaded.'); return r.json(); }).then((v) => {
      setView(v); setBusy(false); history.replaceState(null, '', `/benchmarks?benchmark=${encodeURIComponent(v.axes[0].benchmarkId)}`);
    }).catch((e) => { if (e.name !== 'AbortError') { setError(e.message); setBusy(false); } });
    return () => controller.abort();
  }, [axisId, retry]);
  const axis = axisList.find((a) => a.id === axisId)!;
  const allRows = view.axes[0]?.id === axisId ? latestScores(view.axes[0].scores, basis) : [];
  const models = new Map(view.models.map((m) => [m.id, m]));
  const rows = allRows.filter((r) => (unmatched || r.modelId) && (!openOnly || (r.modelId && models.get(r.modelId)?.open)) && `${r.modelId ? models.get(r.modelId)?.name : r.name} ${r.modelId ? models.get(r.modelId)?.org : ''}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (axis.higherBetter === false ? a.value - b.value : b.value - a.value) || a.name.localeCompare(b.name));
  const matched = new Set(allRows.map((r) => r.modelId).filter(Boolean)).size;
  const historicalAxis = view.axes[0]?.id === axisId ? view.axes[0] : null;
  const estFilter = (e: NonNullable<ViewAxis['estimates']>[number]) => {
    if (openOnly && !(e.modelId && models.get(e.modelId)?.open)) return false;
    const label = `${e.modelId ? models.get(e.modelId)?.name : e.name} ${e.modelId ? models.get(e.modelId)?.org : ''} ${e.cohort ?? ''}`;
    return label.toLowerCase().includes(q.toLowerCase());
  };
  const estimates = (historicalAxis?.estimates ?? []).filter(estFilter);
  const estimatedRows = estimates.filter((e) => e.status === 'estimated' && finite(e.value)).sort((a, b) => (axis.higherBetter === false ? (a.value as number) - (b.value as number) : (b.value as number) - (a.value as number)));
  const incomparable = estimates.filter((e) => e.status === 'not_comparable');
  const recompute = estimates.filter((e) => e.status === 'recompute_required');
  const histLabel = (e: NonNullable<ViewAxis['estimates']>[number]) => (e.modelId && models.get(e.modelId) ? models.get(e.modelId)!.name : e.name);
  const spreadPct = (e: NonNullable<ViewAxis['estimates']>[number]) => (e.spread?.iqr_relative != null ? `${(100 * e.spread.iqr_relative).toFixed(0)}%` : null);
  return <div className="space-y-6">
    <section className="bh-panel p-5"><p className="bh-eyebrow">PICK A BENCHMARK</p><div className="mt-3 grid gap-4 md:grid-cols-[1fr_3fr]">
      <label className="text-sm">Category<select className="bh-input mt-1 w-full" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{[...new Set(axisList.map((a) => a.category))].sort().map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="min-w-0 text-sm">Benchmark and version<select className="bh-input mt-1 w-full" value={benchmark} onChange={(e) => changeBenchmark(e.target.value)}>{definitions.filter((a) => !category || a.category === category || a.benchmarkId === benchmark).map((a) => <option key={a.benchmarkId} value={a.benchmarkId}>{a.name} · {a.version}</option>)}</select></label>
    </div>{groups.length > 1 && <label className="mt-4 block text-sm">Evaluation group / harness<select className="bh-input mt-1 w-full" value={axisId} onChange={(e) => setAxisId(e.target.value)}>{groups.map((a) => <option key={a.id} value={a.id}>{a.cohort} · {a.stats.n} measured catalog peers</option>)}</select></label>}
    </section>
    <section className="bh-panel p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="bh-eyebrow">{axis.category}</p><h2 className="text-2xl font-semibold">{axis.name}</h2><p className="bh-muted mt-1 text-sm">Version {axis.version} · {axis.cohort}</p></div><a href={axis.url} target="_blank" rel="noreferrer" className="bh-button">Primary source ↗</a></div>
      <p className="mt-4 max-w-3xl text-sm bh-muted">{axis.description}</p>
      <div className="my-5 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-line p-3"><p className="text-2xl font-semibold tabular">{busy ? '…' : matched} <span className="text-sm font-normal bh-muted">/ {view.models.length}</span></p><p className="text-xs bh-muted">Catalog configurations with a result</p></div><div className="rounded-lg border border-line p-3"><p className="text-2xl font-semibold tabular">{busy ? '…' : allRows.filter((r) => !r.modelId).length}</p><p className="text-xs bh-muted">Source identities not yet matched</p></div><div className="rounded-lg border border-line p-3"><p className="text-lg font-semibold">{axis.unit}</p><p className="text-xs bh-muted">{axis.higherBetter == null ? 'Direction unknown; numeric order only' : axis.higherBetter ? 'Higher is better' : 'Lower is better'} · native source scale</p></div></div>
      <div className="flex flex-wrap items-end gap-4"><label className="text-sm">Search models<input type="search" className="bh-input mt-1 block" value={q} onChange={(e) => { setQ(e.target.value); setLimit(50); }} placeholder="Model or creator" /></label><label className="text-sm">Evidence<select className="bh-input mt-1 block" value={basis} onChange={(e) => { setBasis(e.target.value); setLimit(50); }}><option value="measured">Measured only</option><option value="self_reported">Self-reported only</option><option value="all">All · prefer measured</option></select></label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />Open weights</label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={unmatched} onChange={(e) => setUnmatched(e.target.checked)} />Include unmatched source identities</label></div>
      <p role="status" className="my-4 text-sm bh-muted">{busy ? 'Loading this benchmark…' : error || `${rows.length} results match these filters. Coverage above uses the evidence filter before model filters.`}</p>{error && <button className="bh-button" onClick={() => setRetry((n) => n + 1)}>Retry loading</button>}
      {busy ? <div className="bh-empty min-h-80" aria-busy="true">Loading ranked results…</div> : rows.length ? <div className="bh-table-wrap overflow-x-auto" tabIndex={0} role="region" aria-label="Benchmark ranking table"><table className="bh-table w-full text-sm"><caption className="sr-only">{axis.name}, version {axis.version}, {axis.cohort}. Rank is within the filtered results; ties share a rank.</caption><thead><tr><th scope="col">Rank</th><th scope="col">Model / configuration</th><th scope="col">Result and provenance</th><th scope="col">Explore</th></tr></thead><tbody>{rows.slice(0, limit).map((r, i) => {
        const m = r.modelId ? models.get(r.modelId) : null, rank = rows.findIndex((v) => v.value === r.value) + 1;
        return <tr key={r.id}><td className="align-top tabular bh-muted">{axis.higherBetter == null ? '—' : rank}</td><th scope="row" className="max-w-md text-left align-top font-medium">{m ? <Link href={`/models/${encodeURIComponent(m.id)}#benchmark-sheet`} className="hover:underline">{m.name}</Link> : r.name}<p className="bh-muted mt-1 text-xs font-normal">{m ? `${m.org}${m.open ? ' · open weights' : ''}` : 'Unmatched source identity; excluded from model coverage and radar peers'}{r.variant ? ` · ${r.variant}` : ''}</p></th><td className="min-w-56 align-top"><SourceScore view={view} axis={axis} row={r} /></td><td className="align-top">{m && <Link className="text-accent underline" href={`/compare?model=${encodeURIComponent(m.id)}`}>Compare ↗</Link>}</td></tr>;
      })}</tbody></table></div> : <div className="bh-empty min-h-56"><h3 className="font-semibold">No results in this view</h3><p className="mt-2">{axis.collection?.status !== 'collected' ? axis.collection?.reason : 'Try including self-reported results or unmatched source identities, or clear the model filters. Missing evidence is never a zero.'}</p><p className="mt-2 text-xs">Collection status: {axis.collection?.status || 'unknown'}</p></div>}
      {rows.length > limit && <button className="bh-button mt-4" onClick={() => setLimit((n) => n + 50)}>Show 50 more ({rows.length - limit} remaining)</button>}
      {!busy && (estimatedRows.length > 0 || incomparable.length > 0 || recompute.length > 0) && <section className="mt-8 border-t border-line pt-5" aria-label="Historic configurations">
        <h3 className="text-lg font-semibold">Historic configurations on this version</h3>
        <p className="bh-muted mt-1 max-w-3xl text-sm">These configurations are no longer measured on {axis.name} · {axis.version}. Each value is a labelled estimate bridged through configurations measured on both versions — it is not a measurement. Spread and bridge count bound the uncertainty.</p>
        {estimatedRows.length > 0 && <div className="bh-table-wrap mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Historic estimates table"><table className="bh-table w-full text-sm"><caption className="sr-only">Relative estimates for historic configurations, with bridge count and spread.</caption><thead><tr><th scope="col">Rank</th><th scope="col">Model / configuration</th><th scope="col">Relative estimate</th></tr></thead><tbody>{estimatedRows.slice(0, limit).map((e) => {
          const rank = estimatedRows.findIndex((v) => v.value === e.value) + 1;
          const m = e.modelId ? models.get(e.modelId) : null;
          return <tr key={e.id}><td className="align-top tabular bh-muted">{axis.higherBetter == null ? '—' : rank}</td><th scope="row" className="max-w-md text-left align-top font-medium">{m ? <Link href={`/models/${encodeURIComponent(m.id)}#benchmark-sheet`} className="hover:underline">{m.name}</Link> : e.name}<p className="bh-muted mt-1 text-xs font-normal">historic · no current measurement{e.cohort && e.cohort !== axis.cohort ? ` · ${e.cohort}` : ''}{e.variant ? ` · ${e.variant}` : ''}</p></th><td className="min-w-56 align-top tabular"><span className="font-semibold">{(e.value as number).toLocaleString('en-US', { maximumSignificantDigits: 4 })} {axis.unit}</span>{e.sourceValue != null && <p className="bh-muted mt-1 text-xs">source value {e.sourceValue.toLocaleString('en-US', { maximumSignificantDigits: 4 })} on {e.sourceBenchmarkId}</p>}<p className="mt-1 inline-block rounded border border-line px-2 py-0.5 text-xs">relative estimate · {e.bridgeCount} bridge {e.bridgeCount === 1 ? 'model' : 'models'}{spreadPct(e) ? ` · ±${spreadPct(e)} bridge spread` : ''}</p></td></tr>;
        })}</tbody></table></div>}
        {estimatedRows.length > limit && <button className="bh-button mt-4" onClick={() => setLimit((n) => n + 50)}>Show 50 more estimates ({estimatedRows.length - limit} remaining)</button>}
        {(incomparable.length > 0 || recompute.length > 0) && <details className="mt-4"><summary className="cursor-pointer text-sm font-medium">{incomparable.length + recompute.length} historic {incomparable.length + recompute.length === 1 ? 'configuration is' : 'configurations are'} not comparable</summary><ul className="mt-3 space-y-2 text-sm">{incomparable.slice(0, 200).map((e) => <li key={e.id}><span className="font-medium">{histLabel(e)}</span>{e.cohort ? ` · ${e.cohort}` : ''} <span className="bh-muted">— retained from {e.sourceBenchmarkId}; {e.reason || 'not comparable under the bridge policy'}.</span></li>)}{recompute.map((e) => <li key={e.id}><span className="font-medium">{histLabel(e)}</span>{e.cohort ? ` · ${e.cohort}` : ''} <span className="bh-muted">— derived index: {e.reason || 'recompute from its inputs instead of bridging'}.</span></li>)}</ul>{incomparable.length > 200 && <p className="bh-muted mt-2 text-xs">Showing the first 200 of {incomparable.length}.</p>}</details>}
      </section>}
      <p className="mt-4 text-xs bh-muted">Ranks stay within this version and evaluation group. Model prompts, evaluation dates and reasoning settings may differ. Source identities can describe whole agent systems. Inspect evidence before treating results as directly equivalent. Statistical significance is not inferred from rank.</p>
    </section>
  </div>;
}
