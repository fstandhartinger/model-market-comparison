"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { latestScores, cohortLabel, cohortSubLabel, sortRankingScores, rankingPosition, rankingTopValue, type BenchmarkView, type ViewAxis } from '../lib/benchmark-view.mjs';
import { SourceScore } from './BenchmarkEvidence';
import { humanVersion, versionHeading } from '../lib/version-label';
import { counted } from '../lib/format';

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const PAGE = 25;
const NO_SCORES: ViewAxis['scores'] = [];

/** F-27: the result reads first (value, unit, date); source link and evidence live in a per-row
 *  expand, so a phone table is Rank · Model · Result and a desktop page stays scannable. */
function ResultCell({ view, axis, row, topValue, compareHref }: { view: BenchmarkView; axis: ViewAxis; row: ViewAxis['scores'][number]; topValue: number | null; compareHref?: string }) {
  // A higher-is-better board whose best shown value is 0 or below has nothing to scale against: no bar, never a full one
  // (Blueprint-Bench 2 prints scores at or below its random baseline as 0).
  const barWidth = row.basis === 'preliminary' || axis.unit === 'Elo' || topValue == null ? null : axis.higherBetter === false ? (row.value > 0 ? Math.min(100, (topValue / row.value) * 100) : 100) : topValue > 0 ? Math.min(100, (row.value / topValue) * 100) : null;
  return <>
    <p className="font-semibold tabular">{row.value.toLocaleString('en-US', { maximumSignificantDigits: 4 })} <span className="bh-muted text-xs font-normal">{axis.unit}</span>{row.date ? <span className="bh-muted ml-2 hidden text-xs font-normal sm:inline">{row.date.slice(0, 10)}</span> : null}</p>{barWidth != null ? <span aria-hidden="true" className="mt-1 block h-1 rounded bg-accent" style={{ width: `${Math.max(4, barWidth)}%` }} /> : null}
    <details className="mt-0.5 text-xs"><summary className="!min-h-0 !py-0.5 text-accent">Source &amp; evidence</summary><div className="mt-2 min-w-0"><SourceScore view={view} axis={axis} row={row} />{compareHref && <Link className="mt-2 inline-block text-accent underline" href={compareHref}>Compare →</Link>}</div></details>
  </>;
}

export function BenchmarkRanking({ initialView, axisList }: { initialView: BenchmarkView; axisList: ViewAxis[] }) {
  const [view, setView] = useState(initialView), [benchmark, setBenchmark] = useState(initialView.axes[0].benchmarkId), [axisId, setAxisId] = useState(initialView.axes[0].id);
  const [q, setQ] = useState(''), [openOnly, setOpenOnly] = useState(false), [limit, setLimit] = useState(PAGE), [category, setCategory] = useState('');
  // F-65: evidence basis and "not matched" are *choices* that may be unset; unset means the automatic
  // opening rule below (a board never opens empty). Changing the board resets both to automatic.
  const [basisChoice, setBasisChoice] = useState<string | null>(null), [unmatchedChoice, setUnmatchedChoice] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const definitions = useMemo(() => [...new Map(axisList.map((a) => [a.benchmarkId, a])).values()].sort((a, b) => a.name.localeCompare(b.name)), [axisList]);
  const groups = axisList.filter((a) => a.benchmarkId === benchmark);
  const changeBenchmark = (id: string) => { setBenchmark(id); setBasisChoice(null); setUnmatchedChoice(null); const first = axisList.filter((a) => a.benchmarkId === id).sort((a, b) => b.stats.n - a.stats.n)[0]; if (first) setAxisId(first.id); };
  useEffect(() => { const id = new URLSearchParams(location.search).get('benchmark'); if (id && axisList.some((a) => a.benchmarkId === id)) changeBenchmark(id); }, [axisList]); // URL is initial navigation input.
  useEffect(() => {
    if (view.axes[0]?.id === axisId && !retry) return;
    const controller = new AbortController(); setBusy(true); setError(''); setLimit(PAGE); setBasisChoice(null); setUnmatchedChoice(null);
    fetch(`/api/benchmark-view?axis=${encodeURIComponent(axisId)}`, { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error('Benchmark results could not be loaded.'); return r.json(); }).then((v) => {
      setView(v); setBusy(false); history.replaceState(null, '', `/benchmarks?benchmark=${encodeURIComponent(v.axes[0].benchmarkId)}`);
    }).catch((e) => { if (e.name !== 'AbortError') { setError(e.message); setBusy(false); } });
    return () => controller.abort();
  }, [axisId, retry]);
  const axis = axisList.find((a) => a.id === axisId)!;
  const loadedScores = view.axes[0]?.id === axisId ? view.axes[0].scores : NO_SCORES;
  const auto = useMemo(() => {
    const measuredMatched = latestScores(loadedScores, 'measured').filter((r) => r.modelId).length;
    if (measuredMatched > 0) return { basis: 'measured', unmatched: false };
    const all = latestScores(loadedScores, 'all');
    if (all.some((r) => r.modelId)) return { basis: 'all', unmatched: false };
    if (all.length > 0) return { basis: 'all', unmatched: true };
    return { basis: 'measured', unmatched: false };
  }, [loadedScores]);
  const basis = basisChoice ?? auto.basis, unmatched = unmatchedChoice ?? auto.unmatched;
  const basisWidened = basisChoice == null && auto.basis !== 'measured', unmatchedWidened = unmatchedChoice == null && auto.unmatched;
  // The notice must name the evidence that is actually shown: a board of measured-but-unmatched rows
  // (e.g. BullshitBench) is not "self-reported" just because no row joined a catalog model yet.
  const hasSelfReported = (rowsList: ViewAxis['scores']) => rowsList.some((r) => String(r.basis).includes('self'));
  const allRows = latestScores(loadedScores, basis);
  const models = new Map(view.models.map((m) => [m.id, m]));
  const rows = sortRankingScores(
    allRows.filter((r) => (unmatched || r.modelId)
      && (!openOnly || (r.modelId && models.get(r.modelId)?.open))
      && `${r.modelId ? models.get(r.modelId)?.name : r.name} ${r.modelId ? models.get(r.modelId)?.org : ''}`.toLowerCase().includes(q.toLowerCase())),
    axis.higherBetter,
  );
  const matched = new Set(allRows.map((r) => r.modelId).filter(Boolean)).size;
  const unmatchedCount = allRows.filter((r) => !r.modelId).length;
  // F-156 (pass 29): a board that opens on a few matched rows says how many results it publishes; the checkbox says how many it hides.
  const matchedRows = allRows.length - unmatchedCount;
  const topValue = rankingTopValue(rows, axis.higherBetter);
  const direction = axis.higherBetter == null ? 'direction unknown; numeric order only' : axis.higherBetter ? 'higher is better' : 'lower is better';
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
    <section className="bh-panel p-5">
      <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <label className="text-sm">Category<select className="bh-input mt-1 w-full sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{[...new Set(axisList.map((a) => a.category))].sort().map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="min-w-0 text-sm">Benchmark and version<select className="bh-input mt-1 w-full" value={benchmark} onChange={(e) => changeBenchmark(e.target.value)}>{definitions.filter((a) => !category || a.category === category || a.benchmarkId === benchmark).map((a) => <option key={a.benchmarkId} value={a.benchmarkId}>{a.name} · {humanVersion(a.version).label}</option>)}</select></label>
      </div>
      {groups.length > 1 && <label className="mt-3 block text-sm">Evaluation group / harness<select className="bh-input mt-1 w-full" value={axisId} onChange={(e) => setAxisId(e.target.value)}>{groups.map((a) => <option key={a.id} value={a.id}>{cohortLabel(a.cohort)}{a.stats.n > 0 ? ` · ${a.stats.n} measured catalog peers` : ""}</option>)}</select></label>}
      <div className="mt-5">
        <p className="bh-eyebrow">{axis.category}</p><h2 className="text-2xl font-semibold">{axis.name}</h2>
        <p className="bh-muted mt-1 text-sm">{[versionHeading(axis.version), cohortSubLabel(axis.cohort)].filter(Boolean).join(' · ')} · <a href={axis.url} target="_blank" rel="noreferrer" className="bh-link text-accent">Primary source ↗</a></p>
      </div>
      <p className="bh-muted mt-3 max-w-3xl text-sm">{axis.description} {axis.publicationScope ? `Public sample: ${counted(axis.publicationScope.published_tasks, 'published task')} × ${counted(axis.publicationScope.runs_per_task, 'run')} × ${counted(axis.publicationScope.configurations, 'configuration')} = ${counted(axis.publicationScope.rollouts, 'rollout')}. ${axis.publicationScope.note}` : axis.detailNote ? axis.detailNote : ''} <span role="status">{busy ? '…' : matched === 0 && rows.length > 0 ? `${counted(rows.length, 'published result')} · not yet matched to catalog models · unit: ${axis.unit} · ${direction}` : unmatchedCount > 0 ? `${matchedRows} of ${counted(allRows.length, 'published result')} ${allRows.length === 1 ? 'is' : 'are'} matched to catalog models · unit: ${axis.unit} · ${direction}` : `${matched} of ${view.models.length} catalog configurations have a result · unit: ${axis.unit} · ${direction}`}</span></p>
      <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-sm">Search models<input type="search" className="bh-input mt-1 block" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Model or creator" /></label><label className="text-sm">Evidence<select className="bh-input mt-1 block" value={basis} onChange={(e) => { setBasisChoice(e.target.value); setLimit(PAGE); }}><option value="measured">Measured only</option><option value="self_reported">Self-reported only</option><option value="all">All · prefer measured</option></select></label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />Open weights</label>{unmatchedCount > 0 ? <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={unmatched} onChange={(e) => setUnmatchedChoice(e.target.checked)} />Include results not matched to a catalog model ({unmatchedCount})</label> : null}<p role="status" className="bh-muted ml-auto text-sm">{busy ? 'Loading this benchmark…' : error || counted(rows.length, 'result')}</p></div>
      {error && <button className="bh-button mt-3" onClick={() => setRetry((n) => n + 1)}>Retry loading</button>}
      {!busy && !error && (basisWidened || unmatchedWidened) && rows.length > 0 && <p role="status" className="bh-muted mt-3 text-sm">{basisWidened && unmatchedWidened ? (hasSelfReported(rows) ? 'Showing self-reported results, listed under the names the source publishes — none is matched to a catalog model yet.' : 'Listed under the names the source publishes — none of these independently measured results is matched to a catalog model yet.') : basisWidened ? 'Showing self-reported results too — no independent measurement exists for this board yet.' : `Listed under the names the source publishes — none of these ${counted(rows.length, 'result')} is matched to a catalog model yet.`}</p>}
      {busy ? <div className="bh-empty min-h-80" aria-busy="true">Loading ranked results…</div> : rows.length ? <div className="bh-table-wrap overflow-x-auto" tabIndex={0} role="region" aria-label="Benchmark ranking table"><table className="bh-table w-full text-sm [&>tbody>tr>td]:!py-2 [&>tbody>tr>th]:!py-2 [&>thead>tr>th]:!py-2"><caption className="sr-only">{axis.name}, {humanVersion(axis.version).label}, {cohortLabel(axis.cohort)}. Rank is within the filtered results; ties share a rank.</caption><thead><tr><th scope="col">Rank</th><th scope="col">Model / configuration</th><th scope="col">Result</th></tr></thead><tbody>{rows.slice(0, limit).map((r, i) => {
        const m = r.modelId ? models.get(r.modelId) : null, rank = rankingPosition(rows, r, axis.higherBetter);
        return <tr key={r.id}><td className="align-top tabular bh-muted">{rank ?? '—'}</td><th scope="row" className={`max-w-md text-left align-top ${i === 0 ? 'font-semibold' : 'font-medium'}`}>{m ? <Link href={`/models/${encodeURIComponent(m.id)}#benchmark-sheet`} className="hover:underline">{m.name}</Link> : r.name}<p className="bh-muted mt-1 text-xs font-normal">{m ? `${m.org}${m.open ? ' · open weights' : ''}` : matched === 0 ? 'As named by the source' : 'As named by the source · not matched to a catalog model'}{r.harness ? ` · harness ${cohortLabel(r.harness)}` : ''}{r.variant ? ` · ${r.variant}` : ''}{r.basis === 'preliminary' ? ' · preliminary · not ranked' : ''}</p></th><td className="align-top"><ResultCell view={view} axis={axis} row={r} topValue={topValue} compareHref={m ? `/compare?model=${encodeURIComponent(m.id)}` : undefined} /></td></tr>;
      })}</tbody></table></div> : <div className="bh-empty min-h-56"><h3 className="font-semibold">No results in this view</h3><p className="mt-2">{axis.collection?.status !== 'collected' ? axis.collection?.reason : q || openOnly ? 'No result matches your search or the open-weights filter.' : 'Nothing is published for this view yet. Missing evidence is never a zero.'}</p><p className="mt-2 text-xs">Collection status: {axis.collection?.status || 'unknown'}</p></div>}
      {rows.length > limit && <button className="bh-button mt-4" onClick={() => setLimit((n) => n + PAGE)}>Show more ({rows.length - limit} remaining)</button>}
      {!busy && (estimatedRows.length > 0 || incomparable.length > 0 || recompute.length > 0) && <section className="mt-8 border-t border-line pt-5" aria-label="Historic configurations">
        <h3 className="text-lg font-semibold">Historic configurations on this version</h3>
        <p className="bh-muted mt-1 max-w-3xl text-sm">These configurations are no longer measured on {axis.name} · {humanVersion(axis.version).label}. Each value is a labelled estimate bridged through configurations measured on both versions — it is not a measurement. Spread and bridge count bound the uncertainty.</p>
        {estimatedRows.length > 0 && <div className="bh-table-wrap mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Historic estimates table"><table className="bh-table w-full text-sm"><caption className="sr-only">Relative estimates for historic configurations, with bridge count and spread.</caption><thead><tr><th scope="col">Rank</th><th scope="col">Model / configuration</th><th scope="col">Relative estimate</th></tr></thead><tbody>{estimatedRows.slice(0, limit).map((e) => {
          const rank = estimatedRows.findIndex((v) => v.value === e.value) + 1;
          const m = e.modelId ? models.get(e.modelId) : null;
          return <tr key={e.id}><td className="align-top tabular bh-muted">{axis.higherBetter == null ? '—' : rank}</td><th scope="row" className="max-w-md text-left align-top font-medium">{m ? <Link href={`/models/${encodeURIComponent(m.id)}#benchmark-sheet`} className="hover:underline">{m.name}</Link> : e.name}<p className="bh-muted mt-1 text-xs font-normal">historic · no current measurement{e.cohort && e.cohort !== axis.cohort ? ` · ${cohortLabel(e.cohort)}` : ''}{e.variant ? ` · ${e.variant}` : ''}</p></th><td className="align-top tabular"><span className="font-semibold">{(e.value as number).toLocaleString('en-US', { maximumSignificantDigits: 4 })} {axis.unit}</span>{e.sourceValue != null && <p className="bh-muted mt-1 text-xs">source value {e.sourceValue.toLocaleString('en-US', { maximumSignificantDigits: 4 })} on {e.sourceBenchmarkId}</p>}<p className="mt-1 inline-block rounded border border-line px-2 py-0.5 text-xs">relative estimate · {e.bridgeCount} bridge {e.bridgeCount === 1 ? 'model' : 'models'}{spreadPct(e) ? ` · ±${spreadPct(e)} bridge spread` : ''}</p></td></tr>;
        })}</tbody></table></div>}
        {estimatedRows.length > limit && <button className="bh-button mt-4" onClick={() => setLimit((n) => n + PAGE)}>Show more estimates ({estimatedRows.length - limit} remaining)</button>}
        {(incomparable.length > 0 || recompute.length > 0) && <details className="mt-4"><summary className="cursor-pointer text-sm font-medium">{incomparable.length + recompute.length} historic {incomparable.length + recompute.length === 1 ? 'configuration is' : 'configurations are'} not comparable</summary><ul className="mt-3 space-y-2 text-sm">{incomparable.slice(0, 200).map((e) => <li key={e.id}><span className="font-medium">{histLabel(e)}</span>{e.cohort ? ` · ${cohortLabel(e.cohort)}` : ''} <span className="bh-muted">— retained from {e.sourceBenchmarkId}; {e.reason || 'not comparable under the bridge policy'}.</span></li>)}{recompute.map((e) => <li key={e.id}><span className="font-medium">{histLabel(e)}</span>{e.cohort ? ` · ${cohortLabel(e.cohort)}` : ''} <span className="bh-muted">— derived index: {e.reason || 'recompute from its inputs instead of bridging'}.</span></li>)}</ul>{incomparable.length > 200 && <p className="bh-muted mt-2 text-xs">Showing the first 200 of {incomparable.length}.</p>}</details>}
      </section>}
      <p className="mt-4 text-xs bh-muted">Ranks stay within this version and evaluation group. Model prompts, evaluation dates and reasoning settings may differ. Source identities can describe whole agent systems. Inspect evidence before treating results as directly equivalent. Statistical significance is not inferred from rank.</p>
    </section>
  </div>;
}
