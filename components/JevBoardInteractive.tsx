"use client";
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  JevScoreBar, HeatLegend, heatLevel, heatScales, heatStyle, one, percent, percentagePoints, seconds, dollars, shortName,
  apiExplanation, typeVar, METRIC_LABEL, type BarMetric, type HeatColumn, type HeatScales, type JevBoardViewRow,
} from './JevBoardShared';
import { JEV_TYPE_LABEL, jevLegendTypes } from './jevTypes';
import { JEV_AXES, OFFICIAL_WEIGHTS, isOfficialWeights, weightedJevScore, type JevAxis, type JevWeights } from '../lib/jevbench-axis-weights.mjs';
import { withFieldNames } from './jevFieldNames';

// CR-151 (Florian 25 Sep 2026): the score chart and the axes table become readable in more than one way. Axis cells are
// shaded by their standing within the column, both views sort and filter, and a "View by" switch above the chart says
// plainly that the official ranking is one of several ways to read the field.

const CHART_TOP = 20;

// ---- Filtering ----

type Filters = { q: string; type: string; open: '' | 'open' | 'closed'; api: '' | 'flagged' | 'unflagged'; fresh: boolean };
const NO_FILTERS: Filters = { q: '', type: '', open: '', api: '', fresh: false };
const isFiltered = (f: Filters) => f.q.trim() !== '' || f.type !== '' || f.open !== '' || f.api !== '' || f.fresh;

function applyFilters(rows: JevBoardViewRow[], f: Filters) {
  const q = f.q.trim().toLowerCase();
  return rows.filter((row) => (!q || `${row.display} ${row.author} ${row.key}`.toLowerCase().includes(q))
    && (!f.type || row.class === f.type)
    && (!f.open || (f.open === 'open') === row.openSource)
    && (!f.api || (f.api === 'flagged') === row.api_flag)
    && (!f.fresh || row.isNew));
}

function FilterBar({ rows, filters, setFilters, shown, newLabel, idPrefix }: { rows: JevBoardViewRow[]; filters: Filters; setFilters: (f: Filters) => void; shown: number; newLabel: string | null; idPrefix: string }) {
  // Phones show the search box and one toggle; the selects open on demand so the ranking starts near the top.
  const [more, setMore] = useState(false);
  const active = [filters.type, filters.open, filters.api].filter(Boolean).length + (filters.fresh ? 1 : 0);
  const types = jevLegendTypes(rows.map((r) => r.class));
  const hasNew = newLabel !== null && rows.some((r) => r.isNew);
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  return <div className={`bh-jev-filters mt-3 ${more ? 'is-open' : ''}`} role="search" aria-label="Filter systems" data-bh-jev-filters={idPrefix}>
    <label className="bh-jev-filter-search">
      <span className="sr-only">Search systems by name or author</span>
      <input type="search" className="bh-input" placeholder="Search name" value={filters.q} onChange={(e) => set({ q: e.target.value })} data-bh-jev-filter="q" />
    </label>
    <button type="button" className="bh-jev-filter-toggle sm:hidden" aria-expanded={more} onClick={() => setMore(!more)} data-bh-jev-filter-toggle>Filters{active ? ` (${active})` : ''} {more ? '▲' : '▼'}</button>
    <label className="bh-jev-filter-more"><span className="sr-only">System type</span>
      <select className="bh-input" value={filters.type} onChange={(e) => set({ type: e.target.value })} data-bh-jev-filter="type">
        <option value="">All types</option>
        {types.map((t) => <option key={t} value={t}>{JEV_TYPE_LABEL[t] ?? `${t} (description pending)`}</option>)}
      </select></label>
    <label className="bh-jev-filter-more"><span className="sr-only">Open code or weights</span>
      <select className="bh-input" value={filters.open} onChange={(e) => set({ open: e.target.value as Filters['open'] })} data-bh-jev-filter="open">
        <option value="">Open and closed</option>
        <option value="open">Open code or weights</option>
        <option value="closed">Closed only</option>
      </select></label>
    <label className="bh-jev-filter-more"><span className="sr-only">API flag</span>
      <select className="bh-input" value={filters.api} onChange={(e) => set({ api: e.target.value as Filters['api'] })} data-bh-jev-filter="api">
        <option value="">With and without API flag</option>
        <option value="flagged">API-flagged only</option>
        <option value="unflagged">Without API flag</option>
      </select></label>
    {hasNew && <label className="bh-jev-filter-check bh-jev-filter-more"><input type="checkbox" checked={filters.fresh} onChange={(e) => set({ fresh: e.target.checked })} data-bh-jev-filter="new" /> New in {newLabel}</label>}
    <span className="bh-muted text-xs" aria-live="polite" data-bh-jev-filter-count>{shown === rows.length ? `All ${rows.length} systems` : `${shown} of ${rows.length} systems`}</span>
    {isFiltered(filters) && <button type="button" className="bh-inline-btn text-xs text-accent underline" onClick={() => setFilters(NO_FILTERS)} data-bh-jev-filter-reset>Clear filters</button>}
  </div>;
}

// ---- Sorting ----

type SortKey = 'rank' | 'name' | 'score' | 'intelligence' | 'calibration' | 'speed' | 'cost' | 'usd' | 'public' | 'sealed' | 'gap' | 'latency';
type Sort = { key: SortKey; dir: 'asc' | 'desc' };
const SORT_LABEL: Record<SortKey, string> = { rank: 'official rank', name: 'name', score: 'JevBench Score', intelligence: 'Intelligence', calibration: 'Calibration', speed: 'Speed', cost: 'Cost axis', usd: '$ per 1,000 decisions', public: 'public accuracy', sealed: 'sealed accuracy', gap: 'public − sealed gap', latency: 'p50 latency' };
// First click sorts best-first: highest axis/accuracy, cheapest price, fastest latency, smallest gap, A→Z.
const FIRST_DIR: Record<SortKey, Sort['dir']> = { rank: 'asc', name: 'asc', score: 'desc', intelligence: 'desc', calibration: 'desc', speed: 'desc', cost: 'desc', usd: 'asc', public: 'desc', sealed: 'desc', gap: 'asc', latency: 'asc' };
const OFFICIAL: Sort = { key: 'rank', dir: 'asc' };

const sortValue = (row: JevBoardViewRow, key: SortKey): number | string | null => {
  switch (key) {
    case 'name': return shortName(row.display).toLowerCase();
    case 'rank': return row.rank ?? null;
    case 'score': return row.jevbench_score;
    case 'usd': return row.cost?.usd_per_1000 ?? null;
    case 'public': return row.public_accuracy;
    case 'sealed': return row.sealed_accuracy;
    case 'gap': return row.public_minus_sealed_gap_pp;
    case 'latency': return row.speed?.p50_s_raw ?? null;
    default: return row.axes?.[key] ?? null;
  }
};

/** Missing values always sink to the end; ties keep the official order. The official order lists unranked rows after
 *  the ranked ones, by score. */
function sortRows(rows: JevBoardViewRow[], sort: Sort, official: Map<string, number>) {
  const byOfficial = (a: JevBoardViewRow, b: JevBoardViewRow) => (official.get(a.key) ?? 0) - (official.get(b.key) ?? 0);
  // Reversing the official order keeps the unranked rows last: they have no rank to reverse.
  if (sort.key === 'rank') return [...rows].sort((a, b) => a.ranked !== b.ranked ? (a.ranked ? -1 : 1) : sort.dir === 'asc' || !a.ranked ? byOfficial(a, b) : byOfficial(b, a));
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = sortValue(a, sort.key), y = sortValue(b, sort.key);
    if (x == null || y == null) return x == null && y == null ? byOfficial(a, b) : x == null ? 1 : -1;
    const c = typeof x === 'string' ? x.localeCompare(String(y)) : (x as number) - (y as number);
    return c !== 0 ? sign * c : byOfficial(a, b);
  });
}

const dirWords = (sort: Sort) => sort.key === 'name' ? (sort.dir === 'asc' ? 'A to Z' : 'Z to A')
  : sort.key === 'rank' ? (sort.dir === 'asc' ? '#1 first' : 'last rank first')
  : sort.key === 'usd' ? (sort.dir === 'asc' ? 'cheapest first' : 'most expensive first')
  : sort.key === 'latency' ? (sort.dir === 'asc' ? 'fastest first' : 'slowest first')
  : sort.key === 'gap' ? (sort.dir === 'asc' ? 'smallest gap first' : 'largest gap first')
  : sort.dir === 'desc' ? 'highest first' : 'lowest first';

function useSort(initial: Sort) {
  const [sort, setSort] = useState<Sort>(initial);
  const toggle = (key: SortKey) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: FIRST_DIR[key] });
  return { sort, setSort, toggle };
}

function SortArrow({ active, dir }: { active: boolean; dir: Sort['dir'] }) {
  return <span className={`bh-sort-arrow ${active ? 'is-active' : ''}`} aria-hidden="true">{active ? (dir === 'desc' ? '▼' : '▲') : '↕'}</span>;
}

function SortButton({ k, label, sort, toggle, className = '', title }: { k: SortKey; label: ReactNode; sort: Sort; toggle: (k: SortKey) => void; className?: string; title?: string }) {
  const active = sort.key === k;
  return <button type="button" className={`bh-sort-btn ${active ? 'is-active' : ''} ${className}`} onClick={() => toggle(k)} title={title ?? `Sort by ${SORT_LABEL[k]}`}
    aria-label={`Sort by ${SORT_LABEL[k]}${active ? `, currently ${dirWords(sort)}` : ''}`} data-bh-jev-sort={k} data-bh-jev-sort-dir={active ? sort.dir : undefined}>
    {label}<SortArrow active={active} dir={sort.dir} />
  </button>;
}

// ---- Weight sliders (Florian 25 Sep 2026): above and below the chart, both driving the same weights ----

const AXIS_NAME: Record<JevAxis, string> = { intelligence: 'Intelligence', calibration: 'Calibration', speed: 'Speed', cost: 'Cost' };
export type JevPreset = { name: string; weights: JevWeights };
const sameWeights = (a: JevWeights, b: JevWeights) => { const ta = JEV_AXES.reduce((t, k) => t + a[k], 0), tb = JEV_AXES.reduce((t, k) => t + b[k], 0); return ta > 0 && tb > 0 && JEV_AXES.every((k) => Math.abs(a[k] / ta - b[k] / tb) < 1e-6); };
const share = (w: JevWeights, axis: JevAxis) => { const total = JEV_AXES.reduce((t, k) => t + w[k], 0); return total ? Math.round((100 * w[axis]) / total) : 0; };

function JevWeightSliders({ position, weights, setWeights, presets }: { position: 'above' | 'below'; weights: JevWeights; setWeights: (w: JevWeights) => void; presets: JevPreset[] }) {
  const official = isOfficialWeights(weights);
  return <div className={`bh-jev-weights ${position === 'above' ? 'mt-4' : 'mt-4'}`} role="group" aria-label={`Axis weights (${position} the chart)`} data-bh-jev-weights={position}>
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="text-sm font-semibold">Weights:</span>
      {presets.map((p) => <button key={p.name} type="button" className="bh-jev-preset" aria-pressed={sameWeights(weights, p.weights)} onClick={() => setWeights(p.weights)} data-bh-jev-preset={p.name}>{p.name}</button>)}
      {official ? <span className="bh-jevc-official ml-1">Official</span> : <span className="bh-jevc-notdefault ml-1">Custom — not the official ranking</span>}
    </div>
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
      {JEV_AXES.map((axis) => <label key={axis} className="block text-[12.5px]">
        <span className="flex justify-between"><span>{AXIS_NAME[axis]}</span><b className="tabular">{share(weights, axis)}%</b></span>
        <input type="range" min={0} max={100} step={5} value={weights[axis]} aria-valuetext={`${share(weights, axis)} percent`}
          onChange={(e) => setWeights({ ...weights, [axis]: Number(e.target.value) })} data-bh-jev-weight={axis} />
      </label>)}
    </div>
    {position === 'below' && <p className="bh-muted mt-1 text-[11.5px] leading-snug">Weights are relative: each axis counts in proportion to its slider. The score stays a weighted harmonic mean with the low-axis gates; an axis at 0 drops out together with its gate. Only equal weights give the official JevBench Score and rank.</p>}
  </div>;
}

const weightsFromUrl = (value: string | null): JevWeights | null => {
  const parts = (value ?? '').split(/[-,]/).map(Number);
  if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v) || v < 0 || v > 100) || parts.every((v) => v === 0)) return null;
  return { intelligence: parts[0], calibration: parts[1], speed: parts[2], cost: parts[3] };
};

// ---- The score chart with the View by switch ----

type View = 'overall' | 'intelligence' | 'calibration' | 'speed' | 'cost';
const VIEWS: [View, string][] = [['overall', 'Overall'], ['intelligence', 'Intelligence'], ['calibration', 'Calibration'], ['speed', 'Speed'], ['cost', 'Cost']];
const viewOf = (sort: Sort): View => sort.key === 'intelligence' || sort.key === 'calibration' || sort.key === 'speed' || sort.key === 'cost' ? sort.key : sort.key === 'usd' ? 'cost' : 'overall';
const metricOf = (view: View): BarMetric => (view === 'overall' ? 'score' : view);
const GENERAL_LLM = 'llm-baseline';

export type JevFairness = { leadName: string; topName: string; leadInt: number; topInt: number; leadsOn: string[] } | null;

export function JevScoreChart({ revision, rows: officialRows, rankedCount, newLabel, fairness, approvedNote = null, capabilityHref, presets = [], compactMobile = false }: { revision: string; rows: JevBoardViewRow[]; rankedCount: number; newLabel: string | null; fairness: JevFairness; approvedNote?: string | null; capabilityHref: string | null; presets?: JevPreset[]; compactMobile?: boolean }) {
  // Florian 25 Sep 2026: weight sliders. Equal weights are the official score; any other mix re-scores every row with
  // the same formula and re-sorts by it, clearly marked as not the official ranking.
  const [weights, setWeightsState] = useState<JevWeights>(OFFICIAL_WEIGHTS);
  const custom = !isOfficialWeights(weights);
  const rows = useMemo(() => custom ? officialRows.map((r) => ({ ...r, jevbench_score: weightedJevScore(r.axes, weights) })) : officialRows, [officialRows, weights, custom]);
  const heat = useMemo(() => heatScales(rows), [rows]);
  const official = useMemo(() => new Map(officialRows.map((r, i) => [r.key, i])), [officialRows]);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const { sort, setSort, toggle } = useSort(OFFICIAL);
  const view = viewOf(sort);
  const metric = metricOf(view);
  // CR-153 (Florian 25 Sep 2026): the Intelligence view ranks the Jev-class field; general-purpose LLMs (GPT-6 Luna,
  // DeepSeek and the other instruction-model baselines) reach Intelligence 93–97 and are hidden there unless asked for.
  const [hideLlms, setHideLlms] = useState(true);
  const llmCount = useMemo(() => rows.filter((r) => r.class === GENERAL_LLM).length, [rows]);
  const hidingLlms = view === 'intelligence' && hideLlms && llmCount > 0;
  const shown = useMemo(() => sortRows(applyFilters(rows, filters), sort, official).filter((r) => !hidingLlms || r.class !== GENERAL_LLM), [rows, filters, sort, official, hidingLlms]);
  const unranked = rows.filter((r) => !r.ranked).length;
  const types = jevLegendTypes(rows.map((r) => r.class));

  const setWeights = (next: JevWeights) => {
    const nextCustom = !isOfficialWeights(next);
    setWeightsState(next);
    if (nextCustom && sort.key === 'rank') setSort({ key: 'score', dir: 'desc' });
    if (!nextCustom && sort.key === 'score' && sort.dir === 'desc') setSort(OFFICIAL);
    const url = new URL(window.location.href);
    if (nextCustom) url.searchParams.set('w', JEV_AXES.map((a) => next[a]).join('-')); else url.searchParams.delete('w');
    window.history.replaceState(window.history.state, '', url.toString());
  };
  // ?view=intelligence opens that view, so a reader can share it; ?w=40-20-20-20 restores custom weights.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get('view');
    const w = weightsFromUrl(params.get('w'));
    if (w && !isOfficialWeights(w)) { setWeightsState(w); setSort({ key: 'score', dir: 'desc' }); }
    if (wanted && VIEWS.some(([v]) => v === wanted) && wanted !== 'overall') setSort({ key: wanted as SortKey, dir: 'desc' });
  }, [setSort]);
  const choose = (next: View) => {
    setSort(next === 'overall' ? (custom ? { key: 'score', dir: 'desc' } : OFFICIAL) : { key: next, dir: 'desc' });
    const url = new URL(window.location.href);
    if (next === 'overall') url.searchParams.delete('view'); else url.searchParams.set('view', next);
    window.history.replaceState(window.history.state, '', url.toString());
  };

  const top = shown.slice(0, CHART_TOP);
  const rest = shown.slice(CHART_TOP);
  // Two configurations can share a short name (GPT-6 Luna and its low-effort setting); those rows keep the full name.
  const collide = useMemo(() => { const seen = new Map<string, number>(); for (const r of rows) seen.set(shortName(r.display), (seen.get(shortName(r.display)) ?? 0) + 1); return seen; }, [rows]);
  const bar = (row: JevBoardViewRow) => <JevScoreBar key={row.key} row={row} metric={metric} heat={heat} isNew={row.isNew} name={(collide.get(shortName(row.display)) ?? 0) > 1 ? row.display : undefined} />;
  const status = `${shown.length} of ${rows.length} systems, sorted by ${SORT_LABEL[sort.key]}, ${dirWords(sort)}.`;

  return <figure className="bh-panel mt-6 p-4 sm:p-5" data-bh-jev14-chart data-bh-jev14-view={view} data-bh-jev14-compact={compactMobile ? '1' : undefined} aria-labelledby="jev14-chart-title">
    {/* F-193 (main, 25 Sep): on the live board a phone hides the chart eyebrow and tightens spacing. */}
    <p className="bh-eyebrow" data-bh-jev14-chart-eyebrow>JevBench {revision}</p>
    <h2 id="jev14-chart-title" className="mt-1 text-xl font-bold leading-snug sm:text-2xl">JevBench Score: {rankedCount} ranked systems</h2>
    <p className="bh-muted mt-1 text-sm">{custom ? <span className="bh-jevc-notdefault mr-2">Custom weights</span> : <span className="bh-jevc-official mr-2">Official</span>}· four axes 0–100, {custom ? 'your weights' : 'equal-weight'} harmonic mean · <a href="#jev14-changes" className="text-accent underline">What changed in v1.4 ↓</a></p>
    <JevWeightSliders position="above" weights={weights} setWeights={setWeights} presets={presets} />

    <div className="bh-jev-viewby mt-4" data-bh-jev-viewby>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5" role="group" aria-label="View the field by">
        <span className="text-sm font-semibold">View by:</span>
        {VIEWS.map(([v, label]) => <button key={v} type="button" className="bh-viewby-btn" aria-pressed={view === v} onClick={() => choose(v)} data-bh-jev-view={v}>{label}</button>)}
        {capabilityHref && <a className="bh-viewby-btn is-jump" href={capabilityHref} data-bh-jev-view="capability" title="Back to the Capability ranking at the top of the page">Capability ↑</a>}
      </div>
      {/* CR-152 put the release's approved top-five sentence (artifact.top_five_note) above the chart; CR-151 shows it
          verbatim beside the switch it points to. The computed sentence is the fallback for releases without one. */}
      {approvedNote ? <p className="mt-2 text-[13px] leading-snug" data-bh-jev14-top-five-note>
        {approvedNote}{' '}
        {view === 'intelligence'
          ? <button type="button" className="bh-inline-btn whitespace-nowrap font-semibold text-accent underline" onClick={() => { choose('overall'); if (custom) setWeights(OFFICIAL_WEIGHTS); setSort(OFFICIAL); }} data-bh-jev14-sort-official>Back to the official order</button>
          : <button type="button" className="bh-inline-btn whitespace-nowrap font-semibold text-accent underline" onClick={() => choose('intelligence')} data-bh-jev14-sort-intelligence>Sort by Intelligence ↓</button>}
      </p> : fairness ? <p className="bh-muted mt-2 text-[13px] leading-snug" data-bh-jev-fairness>
        Among the top five, <b className="text-[color:var(--text)]">{fairness.topName}</b> is still the strongest reasoner (Intelligence {one(fairness.topInt)} vs {one(fairness.leadInt)}){fairness.leadsOn.length > 0 ? <>; <b className="text-[color:var(--text)]">{fairness.leadName}</b> leads on {joinWords(fairness.leadsOn)}</> : null}. JevBench weighs Intelligence, Calibration, Speed and Cost equally —{' '}
        <button type="button" className="bh-inline-btn text-accent underline" onClick={() => choose('intelligence')} data-bh-jev-fairness-sort>view by Intelligence</button> for raw reasoning.
      </p> : null}
      {!approvedNote && !fairness && <p className="bh-muted mt-2 text-[13px] leading-snug" data-bh-jev-viewby-hint>The official order weighs Intelligence, Calibration, Speed and Cost equally. Each button re-sorts the same systems by one axis<span className="hidden sm:inline">, and the column headings sort too</span>.</p>}
      {view !== 'overall' && <p className="mt-2 text-[13px]" data-bh-jev-view-note><span className="bh-jevc-notdefault">Not the official order</span> <span className="bh-muted">Bars show {METRIC_LABEL[metric]} (0–100). The bold number stays the JevBench Score and # the official rank.</span></p>}
      {view === 'intelligence' && llmCount > 0 && <p className="mt-2 text-[13px]" data-bh-jev-llm-toggle-row>
        <label className="bh-jev-filter-check inline-flex min-h-[32px] cursor-pointer items-center gap-2 py-1 pr-1 font-semibold"><input type="checkbox" className="h-5 w-5" checked={hideLlms} onChange={(e) => setHideLlms(e.target.checked)} data-bh-jev-hide-llms /> Hide general-purpose LLMs</label>{' '}
        <span className="bh-muted" data-bh-jev-llm-toggle-note>{hideLlms ? `Hides the ${llmCount} general-purpose LLM baselines (e.g. GPT-6 Luna, DeepSeek); the bars below leave them out.` : `Showing the ${llmCount} general-purpose LLM baselines (e.g. GPT-6 Luna, DeepSeek) too.`}</span>
      </p>}
    </div>

    <FilterBar rows={rows} filters={filters} setFilters={setFilters} shown={shown.length} newLabel={newLabel} idPrefix="chart" />
    <p className="bh-muted mt-2 text-[11.5px] leading-snug"><HeatLegend /></p>

    <div className="mt-3 hidden grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_21rem] items-end gap-x-2 text-[11px] sm:grid" role="group" aria-label="Sort the chart" data-bh-jev14-chart-sort>
      <SortButton k="rank" label="#" sort={sort} toggle={toggle} className="justify-end" />
      <SortButton k="name" label="System" sort={sort} toggle={toggle} className="justify-end" />
      <span />
      <SortButton k="score" label="Score" sort={sort} toggle={toggle} className="justify-end" />
      <span className="grid grid-cols-[1fr_1fr_1fr_1fr_2.1fr] gap-x-1 text-right font-mono">
        <SortButton k="intelligence" label="Intel." sort={sort} toggle={toggle} className="justify-end" />
        <SortButton k="calibration" label="Calib." sort={sort} toggle={toggle} className="justify-end" />
        <SortButton k="speed" label="Speed" sort={sort} toggle={toggle} className="justify-end" />
        <SortButton k="cost" label="Cost" sort={sort} toggle={toggle} className="justify-end" />
        <SortButton k="usd" label="$/1k" sort={sort} toggle={toggle} className="justify-end" title="Sort by US dollars per 1,000 decisions" />
      </span>
    </div>
    <p className="sr-only" aria-live="polite" data-bh-jev-sort-status>{status}</p>
    {shown.length === 0 && <p className="bh-muted mt-3 text-sm" data-bh-jev-filter-empty>No system matches these filters.</p>}
    <ol className="mt-2 space-y-2.5 sm:mt-1" data-bh-jev14-bars>{top.map(bar)}</ol>
    {rest.length > 0 && <details className="mt-2.5" data-bh-jev14-bars-more>
      <summary className="cursor-pointer text-sm font-semibold text-accent">{isFiltered(filters) || hidingLlms ? `Show all ${shown.length} matching systems` : `Show all ${rows.length} systems (${rest.filter((r) => r.ranked).length} more ranked, ${rest.filter((r) => !r.ranked).length} more not ranked)`}</summary>
      <ol className="mt-2.5 space-y-2.5">{rest.map(bar)}</ol>
    </details>}
    <div className="mt-2 hidden grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_21rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
      <span /><span /><span className="bh-muted flex justify-between tabular"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></span>
    </div>
    <JevWeightSliders position="below" weights={weights} setWeights={setWeights} presets={presets} />
    <p className="mt-3 text-center text-[13px] sm:text-sm" data-bh-jev14-formula>
      {custom
        ? <>Score = 1 / (w<sub>I</sub>/I + w<sub>C</sub>/C + w<sub>S</sub>/S + w<sub>K</sub>/K) with w = {JEV_AXES.map((a) => `${share(weights, a)}%`).join(' / ')} <span className="bh-muted">(× (axis / 50)² for a weighted Intelligence, Speed or Cost below 50). # stays the official rank.</span></>
        : <>Score = 4 / (1/I + 1/C + 1/S + 1/K) <span className="bh-muted">(each 0–100; × (axis / 50)² for Intelligence, Speed or Cost below 50)</span></>}
    </p>
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]" aria-label="Legend" data-bh-jev14-legend>
      {types.map((t) => <li key={t} style={typeVar(t)} data-bh-jev14-class={t} data-bh-jev14-class-labelled={JEV_TYPE_LABEL[t] ? '1' : '0'}><span className="bh-jevc-swatch mr-1.5" />{JEV_TYPE_LABEL[t] ?? <code title="Class named in the artifact; description pending">{t}</code>}</li>)}
      {unranked > 0 && <li><span className="bh-jevc-swatch is-partial mr-1.5" />Shown, not ranked</li>}
    </ul>
    <figcaption className="bh-muted mt-3 text-[11.5px] leading-snug">I, C, S, K = Intelligence, Calibration, Speed, Cost; ~ est. = <a href="#jev-costs" className="text-accent underline">estimated cost</a>; ann. = announced price; API = the operator&apos;s endpoint saw sealed item text, without answers{newLabel ? <>; new = first listed in {newLabel}</> : null}; $/1k = US dollars per 1,000 decisions. <span className="hidden sm:inline">Click a column heading to sort. </span>Names link to each project.</figcaption>
  </figure>;
}

const joinWords = (words: string[]) => words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;

// ---- The axes table ----

function NoteMarker({ row, note }: { row: JevBoardViewRow; note: string }) {
  return <details className="bh-jev14-note" data-bh-jev14-note={row.key}>
    <summary title={note} aria-label={`Note on ${shortName(row.display)}`}>†</summary>
    <span className="bh-jev14-note-body" role="note">{withFieldNames(note)}</span>
  </details>;
}

function SystemName({ row }: { row: JevBoardViewRow }) {
  const name = shortName(row.display);
  const rawVariant = row.display.startsWith(name) ? row.display.slice(name.length).replace(/^[ ,]*\(?|\)$/g, '') : '';
  const variant = rawVariant && !row.author.includes(rawVariant) ? rawVariant : '';
  const page = `/jev-models/${encodeURIComponent(row.key)}`;
  // Florian 25 Sep 2026: the name opens the model's best source; the system page stays one click away ("details").
  const href = row.repo ?? page;
  const NameLink = ({ children }: { children: ReactNode }) => row.repo
    ? <a href={row.repo} target="_blank" rel="noopener noreferrer" title={row.display} data-bh-jev-source={row.key}>{children}</a>
    : <Link href={page} title={row.display}>{children}</Link>;
  const cut = name.lastIndexOf(' ');
  // The † stays outside the link but shares a no-wrap box with the final word.
  return <div>
    <span className="font-semibold" title={row.display}>
      {cut > 0 && <NameLink>{name.slice(0, cut + 1)}</NameLink>}
      <span className="whitespace-nowrap">
        <NameLink>{cut > 0 ? name.slice(cut + 1) : name}</NameLink>
        {row.note && <NoteMarker row={row} note={row.note} />}
      </span>
    </span>
    {row.priority_run === true && <span className="bh-thin-tag ml-2 align-middle" data-bh-jev14-priority-run={row.key}>priority run</span>}
    {row.api_flag && <span className="bh-thin-tag bh-flag-tag ml-2 align-middle" data-bh-jev14-api-flag={row.key} title={row.api_exposure_note ?? apiExplanation} aria-label={apiExplanation}>API</span>}
    {row.isNew && <span className="bh-new-tag ml-2 align-middle" data-bh-jev14-new={row.key}>new</span>}
    <span className="bh-muted block text-[11px] leading-tight">by {row.author}{variant ? ` · ${variant}` : ''}{href !== page && <> · <Link href={page} className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent" data-bh-jev-details={row.key}>details</Link></>}</span>
  </div>;
}

function CostValue({ row }: { row: JevBoardViewRow }) {
  const value = dollars(row.cost?.usd_per_1000);
  const kind = row.cost?.kind;
  return <span title={row.cost?.basis} className="whitespace-nowrap">
    {kind === 'estimate' ? `~${value}` : value}
    {kind === 'estimate' && <span className="bh-thin-tag bh-est-tag ml-1" data-bh-jev14-est={row.key}>est.</span>}
    {kind === 'announced' && <span className="bh-thin-tag ml-1">announced</span>}
  </span>;
}

function HeatTd({ heat, column, row, children, className = '' }: { heat: HeatScales; column: HeatColumn; row: JevBoardViewRow; children: ReactNode; className?: string }) {
  const level = heatLevel(heat, column, row);
  return <td className={`tabular ${level == null ? '' : 'bh-heat'} ${className}`} style={heatStyle(level)}>{children}</td>;
}

const endpointLabel = (kind: string | undefined) => kind === 'api' ? 'API' : kind === 'gpu' ? 'RunPod GPU' : kind === 'demo' ? 'author demo' : kind === 'cpu' ? 'CPU' : kind ?? '—';

function Row({ row, heat }: { row: JevBoardViewRow; heat: HeatScales }) {
  return <tr id={`jev14-row-${row.key}`} data-bh-jev14-row={row.key} data-bh-jev14-ranked={row.ranked ? '1' : '0'} className={row.ranked ? '' : 'bh-jev11-partial'}>
    <td className="bh-muted tabular">{row.rank ?? '—'}</td>
    <th scope="row" className="bh-jev-sticky text-left font-normal"><SystemName row={row} />
      {!row.ranked && <span className="bh-thin-tag bh-partial-tag mt-1 inline-block" title={row.not_ranked_because ?? undefined} data-bh-jev14-partial={row.key}>{row.listing.replace(/_/g, ' ')} · not ranked</span>}
    </th>
    <HeatTd heat={heat} column="score" row={row}><b className="text-lg" data-bh-jev14-score>{one(row.jevbench_score)}</b></HeatTd>
    <HeatTd heat={heat} column="intelligence" row={row}>{one(row.axes?.intelligence)}</HeatTd>
    <HeatTd heat={heat} column="calibration" row={row}>{one(row.axes?.calibration)}</HeatTd>
    <HeatTd heat={heat} column="speed" row={row}>{one(row.axes?.speed)}</HeatTd>
    <HeatTd heat={heat} column="cost" row={row}>{one(row.axes?.cost)}</HeatTd>
    <HeatTd heat={heat} column="public" row={row}>{percent(row.public_accuracy)}</HeatTd>
    <HeatTd heat={heat} column="sealed" row={row}>{percent(row.sealed_accuracy)}</HeatTd>
    <td className="tabular whitespace-nowrap">{percentagePoints(row.public_minus_sealed_gap_pp)}</td>
    <HeatTd heat={heat} column="usd" row={row}><CostValue row={row} /></HeatTd>
    <HeatTd heat={heat} column="latency" row={row} className="whitespace-nowrap"><span title={row.speed?.adjustment ?? undefined}>{seconds(row.speed?.p50_s_raw)}</span></HeatTd>
    <td className="text-[12px]" title={row.endpoint_condition}>{endpointLabel(row.endpoint_kind)}</td>
  </tr>;
}

function Th({ k, sort, toggle, children, sticky = false }: { k: SortKey; sort: Sort; toggle: (k: SortKey) => void; children: ReactNode; sticky?: boolean }) {
  const active = sort.key === k;
  return <th scope="col" className={sticky ? 'bh-jev-sticky' : undefined} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
    <SortButton k={k} label={children} sort={sort} toggle={toggle} className="text-left" />
  </th>;
}

export function JevAxesTable({ rows, publicDecisions, sealedDecisions, newLabel }: { rows: JevBoardViewRow[]; publicDecisions: number; sealedDecisions: number; newLabel: string | null }) {
  const heat = useMemo(() => heatScales(rows), [rows]);
  const official = useMemo(() => new Map(rows.map((r, i) => [r.key, i])), [rows]);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const { sort, toggle } = useSort(OFFICIAL);
  const shown = useMemo(() => sortRows(applyFilters(rows, filters), sort, official), [rows, filters, sort, official]);
  const captionId = useId();
  return <>
    <FilterBar rows={rows} filters={filters} setFilters={setFilters} shown={shown.length} newLabel={newLabel} idPrefix="table" />
    <p className="bh-muted mt-2 text-xs"><HeatLegend latency /> Badges: <span className="bh-thin-tag bh-flag-tag">API</span> sealed text went to the operator&apos;s endpoint · <span className="bh-thin-tag bh-est-tag">est.</span> estimated price · <span className="bh-thin-tag">announced</span> price not yet bookable · <span className="bh-thin-tag bh-partial-tag">not ranked</span> partial run or honorable mention{newLabel ? <> · <span className="bh-new-tag">new</span> first listed in {newLabel}</> : null}.</p>
    <div className="bh-table-wrap mt-3">
      <table className="bh-table bh-jev-table" data-bh-jev14-table aria-describedby={captionId}>
        <thead><tr>
          <Th k="rank" sort={sort} toggle={toggle}>#</Th><Th k="name" sort={sort} toggle={toggle} sticky>System</Th><Th k="score" sort={sort} toggle={toggle}>JevBench Score</Th>
          <Th k="intelligence" sort={sort} toggle={toggle}>Intelligence</Th><Th k="calibration" sort={sort} toggle={toggle}>Calibration</Th><Th k="speed" sort={sort} toggle={toggle}>Speed</Th><Th k="cost" sort={sort} toggle={toggle}>Cost axis</Th>
          <Th k="public" sort={sort} toggle={toggle}><>Public accuracy<br /><span className="bh-muted text-[11px]">n = {publicDecisions}</span></></Th>
          <Th k="sealed" sort={sort} toggle={toggle}><>Sealed accuracy<br /><span className="bh-muted text-[11px]">n = {sealedDecisions}</span></></Th>
          <Th k="gap" sort={sort} toggle={toggle}>Public − sealed gap</Th><Th k="usd" sort={sort} toggle={toggle}>$/1k decisions</Th><Th k="latency" sort={sort} toggle={toggle}>p50 latency</Th><th scope="col">Endpoint</th>
        </tr></thead>
        <tbody>{shown.map((row) => <Row key={row.key} row={row} heat={heat} />)}</tbody>
      </table>
      {shown.length === 0 && <p className="bh-muted p-4 text-sm">No system matches these filters.</p>}
    </div>
    <p id={captionId} className="sr-only" aria-live="polite">{`${shown.length} of ${rows.length} systems, sorted by ${SORT_LABEL[sort.key]}, ${dirWords(sort)}.`}</p>
  </>;
}
