"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { latestScores, normalize, type BenchmarkView, type ViewAxis } from '../lib/benchmark-view.mjs';
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
  const categorySnapshots = categories.map((name) => {
    const axes = visibleAxes.filter((axis) => axis.category === name);
    const models = displayPicks.map((id) => {
      const normalized = axes.map((axis) => {
        const row = latestScores(axis.scores).find((score) => score.modelId === id);
        return row && !row.lowSample ? normalize(row.value, axis.stats, axis.higherBetter) : null;
      }).filter((value): value is number => value != null);
      return { id, name: view.models.find((model) => model.id === id)?.name || id, measured: normalized.length, average: normalized.length ? normalized.reduce((sum, value) => sum + value, 0) / normalized.length : null };
    });
    return { name, axes, models };
  }).filter((snapshot) => snapshot.axes.length && snapshot.models.some((model) => model.measured));

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
    {displayPicks.length > 0 && <section className="bh-panel p-5" aria-label="Benchmark category snapshots">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="bh-eyebrow">RELEASE-STYLE SNAPSHOT</p><h2 className="text-xl font-semibold">Where each model is strongest</h2></div><span className="bh-badge">Measured results only</span></div>
      <p className="bh-muted mt-2 max-w-3xl text-sm">Each card averages the selected model&apos;s independently measured benchmark positions within one topic. The 0–100 scale is relative to the collected peer range for each exact benchmark; it is not a new score and missing results are excluded.</p>
      {!categorySnapshots.length ? <div className="bh-empty mt-4">No measured benchmark rows match the current selection.</div> : <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{categorySnapshots.map((snapshot) => <article key={snapshot.name} className="rounded-xl border border-line p-4">
        <div className="flex items-baseline justify-between gap-3"><h3 className="font-semibold">{snapshot.name}</h3><span className="bh-muted text-xs">{snapshot.axes.length} benchmark{snapshot.axes.length === 1 ? '' : 's'}</span></div>
        <ul className="mt-4 space-y-3">{snapshot.models.map((model) => <li key={model.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate">{model.name}</span><span className="tabular font-semibold">{model.average == null ? 'No measured result' : `${model.average.toFixed(0)} / 100`}</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={`${model.name} relative ${snapshot.name} position`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={model.average == null ? undefined : Math.round(model.average)}><div className="h-full rounded-full bg-accent" style={{ width: model.average == null ? '0%' : `${model.average}%` }} /></div>
          <p className="bh-muted mt-1 text-xs">{model.measured ? `${model.measured} of ${snapshot.axes.length} benchmark${snapshot.axes.length === 1 ? '' : 's'} measured` : 'No measured result in this topic'}</p>
        </li>)}</ul>
      </article>)}</div>}
    </section>}
    <section className="bh-panel p-5" id="full-comparison" aria-busy={busy} aria-label="Full benchmark comparison">
      <p className="bh-eyebrow">EVERY COLLECTED BENCHMARK</p><h2 className="text-xl font-semibold">{standalone ? 'The numbers behind the profile' : 'Full benchmark comparison'}</h2>
      <p className="bh-muted mt-2 text-sm">Native units; versions and evaluation groups remain separate. Measured results take priority over vendor claims, then the latest observation. A tinted cell marks the best measured relative position in that row; small differences are not evidence of significance.</p>
      <div className="my-4 flex flex-wrap items-end gap-4"><label className="text-sm">Find a benchmark<input type="search" className="bh-input mt-1 block" value={axisSearch} onChange={(e) => setAxisSearch(e.target.value)} placeholder="Name, version, harness…" /></label><label className="text-sm">Category<select className="bh-input mt-1 block" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />Include rows without selected-model results</label></div>
      {!displayPicks.length ? <div className="bh-empty">Select a model to explore all benchmark results.</div> : !visibleAxes.length ? <div className="bh-empty">No benchmark rows match. Clear filters or include missing results.</div> : <div className="bh-table-wrap overflow-x-auto" tabIndex={0} role="region" aria-label="Full comparison table"><table className="bh-table w-full text-sm"><caption className="sr-only">All matching benchmark versions and model scores with evidence</caption><thead><tr><th scope="col">Benchmark / version</th>{displayPicks.map((id, i) => <th key={id} scope="col">{String.fromCharCode(65 + i)} · {view.models.find((m) => m.id === id)?.name}</th>)}</tr></thead>{categories.map((c) => {
        const rows = visibleAxes.filter((a) => a.category === c); if (!rows.length) return null;
        return <tbody key={c}><tr><th colSpan={displayPicks.length + 1} className="text-left bh-eyebrow bg-accent/5">{c}</th></tr>{rows.map((a) => {
          const cells = displayPicks.map((id) => {
            const row = latestScores(a.scores, 'all').find((r) => r.modelId === id);
            const normalized = row && !row.lowSample ? normalize(row.value, a.stats, a.higherBetter) : null;
            return { id, row, normalized };
          });
          const best = cells.reduce<number | null>((max, cell) => cell.normalized == null ? max : max == null ? cell.normalized : Math.max(max, cell.normalized), null);
          return <tr key={a.id}><th scope="row" className="max-w-xs text-left align-top font-medium"><Link href={`/benchmarks?benchmark=${encodeURIComponent(a.benchmarkId)}`} className="text-accent hover:underline">{a.name}</Link><div className="bh-muted mt-1 text-xs">Version {a.version}<br />{a.cohort}<br />{a.unit} · {a.higherBetter == null ? 'direction unknown' : a.higherBetter ? 'higher better' : 'lower better'}</div></th>{cells.map(({ id, row, normalized }) => { const bestInRow = best != null && normalized != null && Math.abs(normalized - best) < 0.000001; return <td key={id} className={`min-w-48 align-top ${bestInRow ? 'bg-accent2/10' : ''}`}>{bestInRow && <span className="sr-only">Best measured relative position in this row. </span>}{row ? <SourceScore view={view} axis={a} row={row} /> : <MissingCell view={view} axis={a} modelId={id} />}</td>; })}</tr>;
        })}</tbody>;
      })}</table></div>}
    </section>
    {!busy && <div className="grid items-start gap-5 xl:grid-cols-2">{displayPicks.map((id) => <section key={id} className="bh-panel p-5"><h2 className="mb-4 font-semibold">{view.models.find((m) => m.id === id)?.name}</h2><AnomalySummary view={view} modelId={id} /></section>)}</div>}
  </div>;
}
