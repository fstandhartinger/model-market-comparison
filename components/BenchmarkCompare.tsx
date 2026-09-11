"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { latestScores, type BenchmarkView, type ViewAxis } from '../lib/benchmark-view.mjs';
import { BenchmarkRadar, SERIES_COLORS } from './BenchmarkRadar';
import { AnomalySummary, SourceScore } from './BenchmarkEvidence';

export function MissingCell({ view, axis, modelId }: { view: BenchmarkView; axis: ViewAxis; modelId: string }) {
  const known = view.missing.find((m) => m.model_id === modelId && m.benchmark_id === axis.benchmarkId);
  const collection = axis.collection;
  const hasOther = view.axes.some((a) => a.benchmarkId === axis.benchmarkId && a.id !== axis.id && a.scores.some((r) => r.modelId === modelId));
  const label = known ? known.status.replaceAll('_', ' ') : hasOther ? 'Other configuration only' : collection?.status === 'source_unreachable' ? 'Source unreachable' : collection?.status === 'contested' ? 'Contested' : collection?.status === 'not_published' ? 'Not published' : collection?.status === 'manual_required' ? 'Not collected' : 'Unknown / no published match';
  const reason = known?.reason || (hasOther ? 'A result exists in another harness or evaluation configuration; it is not substituted here.' : collection && collection.status !== 'collected' ? collection.reason : 'No observation is attached to this exact catalog configuration. This does not establish that the model was never tested.');
  return <details className="text-xs bh-muted"><summary>{label}</summary><p className="mt-2 max-w-xs">{reason}</p></details>;
}

export function BenchmarkCompare({ initialView, initialPicks, standalone = false }: { initialView: BenchmarkView; initialPicks: string[]; standalone?: boolean }) {
  const [view, setView] = useState(initialView), [picks, setPicks] = useState(initialPicks);
  const [search, setSearch] = useState(''), [axisSearch, setAxisSearch] = useState('');
  const defaults = initialView.axes.filter((a) => ['aa_coding_index', 'aa_intelligence_index', 'aa-gpqa-diamond', 'aa-hle', 'aa-scicode', 'aa-lcr'].includes(a.family)).map((a) => a.id).slice(0, 6);
  const [axesIds, setAxes] = useState(defaults), [showEmpty, setShowEmpty] = useState(false), [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [loadedKey, setLoadedKey] = useState(initialPicks.join('|'));
  useEffect(() => {
    const q = new URLSearchParams(location.search), incoming = q.getAll('model').filter((id) => initialView.models.some((m) => m.id === id));
    if (incoming.length) setPicks([...new Set(incoming)].slice(0, 4));
  }, [initialView.models]);
  useEffect(() => {
    if (picks.join('|') === loadedKey && !retry) return;
    const controller = new AbortController();
    setBusy(true); setError('');
    const q = new URLSearchParams(); picks.forEach((id) => q.append('model', id));
    fetch(`/api/benchmark-view?${q}`, { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error('Benchmark data could not be loaded.'); return r.json(); }).then((data) => {
      setView(data); setLoadedKey(picks.join('|')); setBusy(false);
      history.replaceState(null, '', `${location.pathname}${picks.length ? `?${q}` : ''}`);
    }).catch((e) => { if (e.name !== 'AbortError') { setError(e.message); setBusy(false); } });
    return () => controller.abort();
  }, [picks, retry, loadedKey]);
  const options = useMemo(() => view.models.filter((m) => `${m.name} ${m.org}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [view.models, search]);
  const selectedAxes = axesIds.map((id) => view.axes.find((a) => a.id === id)).filter((a): a is ViewAxis => !!a);
  const displayPicks = loadedKey !== picks.join('|') ? loadedKey.split('|').filter(Boolean) : picks;
  const visibleAxes = view.axes.filter((a) => (!category || a.category === category) && (!axisSearch || `${a.name} ${a.version} ${a.cohort}`.toLowerCase().includes(axisSearch.toLowerCase())) && (showEmpty || a.scores.some((r) => r.modelId && displayPicks.includes(r.modelId))));
  const categories = [...new Set(view.axes.map((a) => a.category))].sort();

  return <div className="space-y-6">
    <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]"><div className="min-w-0 space-y-4">
    <section className="bh-panel p-5" aria-label="Model selection">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="bh-eyebrow">BUILD YOUR COMPARISON</p><h2 className="text-lg font-semibold">Choose up to four models</h2></div><span className="bh-badge">{picks.length} / 4 selected</span></div>
      <p className="bh-muted mt-1 text-sm">Exact reasoning configurations. All catalog models are available; price and provider filters do not hide benchmark evidence.</p>
      <label className="mt-4 block text-sm">Find models<input className="bh-input mt-1 block w-full" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by model or creator" /></label>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{[0, 1, 2, 3].map((slot) => {
        const chosen = view.models.find((m) => m.id === picks[slot]);
        const rows = chosen && !options.some((m) => m.id === chosen.id) ? [chosen, ...options] : options;
        return <div key={slot} className="min-w-0 rounded-lg border border-line p-3" style={{ borderTop: `3px solid ${SERIES_COLORS[slot]}` }}><label className="block text-sm font-medium">Model {String.fromCharCode(65 + slot)}<select className="bh-input mt-2 w-full" disabled={slot > picks.length} value={picks[slot] || ''} onChange={(e) => setPicks((old) => { const next = [...old]; next[slot] = e.target.value; return next.filter(Boolean); })}><option value="">Choose a model</option>{rows.filter((m) => !picks.includes(m.id) || picks[slot] === m.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>{chosen && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><Link className="text-accent underline" href={`/models/${encodeURIComponent(chosen.id)}#benchmark-sheet`}>Benchmark sheet ↗</Link><button className="bh-button" onClick={() => setPicks((old) => old.filter((id) => id !== chosen.id))} aria-label={`Remove ${chosen.name}`}>Remove</button></div>}</div>;
      })}</div>
      {options.length === 0 && <p className="bh-muted mt-2 text-sm" role="status">No matching models. Clear the search to browse the catalog.</p>}
      <div role="status" className="min-h-6 pt-2 text-sm bh-muted">{busy ? 'Updating benchmark evidence; results still show the previous models…' : error ? error : `${picks.length} models selected. ${visibleAxes.length} evaluation rows in the full comparison.`}</div>
      {error && <button className="bh-button" onClick={() => setRetry((n) => n + 1)}>Retry loading</button>}
    </section>
    <details className="bh-panel p-5"><summary className="font-medium">Radar axes · {axesIds.length} / 8 selected</summary><p className="bh-muted mt-2 text-sm">Choose 3–8 axes. Every option names one benchmark version and evaluation group. Unmeasured selections remain empty.</p><div className="mt-4 grid max-h-80 gap-2 overflow-y-auto">{view.axes.map((a) => <label key={a.id} className="flex items-start gap-2 rounded p-2 text-sm hover:bg-accent/5"><input type="checkbox" className="mt-1" checked={axesIds.includes(a.id)} disabled={axesIds.length >= 8 && !axesIds.includes(a.id)} onChange={(e) => setAxes((old) => e.target.checked ? [...old, a.id].slice(0, 8) : old.filter((id) => id !== a.id))} /><span>{a.name}<span className="bh-muted block text-xs">Version {a.version} · {a.cohort} · {a.stats.n} measured peers</span></span></label>)}</div></details>
    </div><div className="min-w-0" aria-busy={busy}><BenchmarkRadar view={view} axes={selectedAxes} picks={displayPicks} /></div></div>
    <section className="bh-panel p-5" id="full-comparison" aria-busy={busy} aria-label="Full benchmark comparison">
      <p className="bh-eyebrow">EVERY COLLECTED BENCHMARK</p><h2 className="text-xl font-semibold">{standalone ? 'The numbers behind the profile' : 'Full benchmark comparison'}</h2>
      <p className="bh-muted mt-2 text-sm">Native units; versions and evaluation groups remain separate. Measured results take priority over vendor claims, then the latest observation. Small differences are not evidence of significance.</p>
      <div className="my-4 flex flex-wrap items-end gap-4"><label className="text-sm">Find a benchmark<input type="search" className="bh-input mt-1 block" value={axisSearch} onChange={(e) => setAxisSearch(e.target.value)} placeholder="Name, version, harness…" /></label><label className="text-sm">Category<select className="bh-input mt-1 block" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />Include rows without selected-model results</label></div>
      {!displayPicks.length ? <div className="bh-empty">Select a model to explore all benchmark results.</div> : !visibleAxes.length ? <div className="bh-empty">No benchmark rows match. Clear filters or include missing results.</div> : <div className="bh-table-wrap overflow-x-auto" tabIndex={0} role="region" aria-label="Full comparison table"><table className="bh-table w-full text-sm"><caption className="sr-only">All matching benchmark versions and model scores with evidence</caption><thead><tr><th scope="col">Benchmark / version</th>{displayPicks.map((id, i) => <th key={id} scope="col">{String.fromCharCode(65 + i)} · {view.models.find((m) => m.id === id)?.name}</th>)}</tr></thead>{categories.map((c) => {
        const rows = visibleAxes.filter((a) => a.category === c); if (!rows.length) return null;
        return <tbody key={c}><tr><th colSpan={displayPicks.length + 1} className="text-left bh-eyebrow bg-accent/5">{c}</th></tr>{rows.map((a) => <tr key={a.id}><th scope="row" className="max-w-xs text-left align-top font-medium"><Link href={`/benchmarks?benchmark=${encodeURIComponent(a.benchmarkId)}`} className="text-accent hover:underline">{a.name}</Link><div className="bh-muted mt-1 text-xs">Version {a.version}<br />{a.cohort}<br />{a.unit} · {a.higherBetter == null ? 'direction unknown' : a.higherBetter ? 'higher better' : 'lower better'}</div></th>{displayPicks.map((id) => { const row = latestScores(a.scores, 'all').find((r) => r.modelId === id); return <td key={id} className="min-w-48 align-top">{row ? <SourceScore view={view} axis={a} row={row} /> : <MissingCell view={view} axis={a} modelId={id} />}</td>; })}</tr>)}</tbody>;
      })}</table></div>}
    </section>
    {!busy && <div className="grid items-start gap-5 xl:grid-cols-2">{displayPicks.map((id) => <section key={id} className="bh-panel p-5"><h2 className="mb-4 font-semibold">{view.models.find((m) => m.id === id)?.name}</h2><AnomalySummary view={view} modelId={id} /></section>)}</div>}
  </div>;
}
