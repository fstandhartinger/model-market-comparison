"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BaseModelDisplay } from './BaseModelDisplay';
import { imageJevSystemPath, imageJevAuthorUrl } from '../lib/imagejev-system-links.mjs';

type Row = {
  key: string;
  name: string;
  api_flag: boolean;
  score: number;
  rank: number;
  inference_setting?: string;
  prior_exposure?: string;
  tracks: Record<string, any>;
  pricing_alternative?: { label: string; rank_if_applied: number; tracks: Record<string, any> };
};

type SortKey = 'rank' | 'composite' | 'intelligence' | 'cost' | 'p50';
type Filter = 'all' | 'local' | 'api' | 'gated';

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const number = (value: number) => Number(value).toFixed(2);
const usd = (value: number | null) => value == null ? '—' : value === 0 ? 'Free' : `USD ${value.toFixed(4)}`;
const time = (value: unknown) => Number.isFinite(value) ? `${(value as number).toFixed(3)} s` : '—';
const gapPp = (value: unknown) => {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number((value as number).toFixed(1));
  const normalized = rounded === 0 ? 0 : rounded;
  return `${normalized > 0 ? '+' : ''}${normalized.toFixed(1)} pp`;
};

function gated(row: Row) {
  const gates = row.tracks.core.composite?.gates ?? {};
  return ['intelligence', 'speed', 'cost'].some((axis) => Number.isFinite(gates[axis]) && gates[axis] < 1);
}

function sortValue(row: Row, key: SortKey): number {
  const core = row.tracks.core;
  if (key === 'rank') return row.rank;
  if (key === 'composite') return core.composite.score;
  if (key === 'intelligence') return core.axes.intelligence;
  if (key === 'cost') return core.cost?.usd_per_1000 ?? Infinity;
  return core.speed?.raw_p50_s ?? core.speed?.p50_s_raw ?? core.speed?.p50_s ?? Infinity;
}

function SortHeading({ label, sort, current, descending, onSort, className = '' }: {
  label: string; sort: SortKey; current: SortKey; descending: boolean; onSort: (key: SortKey) => void; className?: string;
}) {
  const ariaSort = current === sort ? (descending ? 'descending' : 'ascending') : 'none';
  return <th scope="col" aria-sort={ariaSort} className={`${className} p-2 text-right`}>
    <button type="button" className="min-h-9 whitespace-nowrap font-semibold hover:text-accent" onClick={() => onSort(sort)}>{label}</button>
  </th>;
}

function SystemCell({ row, compactMobile }: { row: Row; compactMobile: boolean }) {
  const authorUrl = imageJevAuthorUrl(row.key);
  const detailClass = compactMobile ? 'hidden sm:block' : 'block';
  const config = row.inference_setting?.trim();
  let settingLabel = row.api_flag ? 'Hosted API · pinned request settings' : 'Local GPU · pinned image configuration';
  if (row.api_flag && config?.includes('request settings ')) {
    try {
      const settings = JSON.parse(config.slice(config.indexOf('request settings ') + 'request settings '.length));
      if (settings.max_concurrency === 1 && Number.isFinite(settings.timeout_s)) {
        settingLabel = `Hosted API · one request at a time · ${settings.timeout_s} s timeout`;
      }
    } catch { /* The exact retained configuration is still available below. */ }
  }
  const gates = row.tracks.core.composite?.gates ?? {};
  const gateNames = ['intelligence', 'speed', 'cost'].filter((axis) => Number.isFinite(gates[axis]) && gates[axis] < 1);
  return <th scope="row" className="sticky left-10 z-[1] w-40 min-w-40 max-w-40 break-words sm:left-14 sm:w-72 sm:min-w-52 sm:max-w-72 bg-[var(--surface)] px-3 py-2 text-left font-semibold shadow-[inset_-1px_0_0_rgb(var(--line))]">
    <span className="block">{row.name}{row.api_flag && <span className="bh-thin-tag ml-1.5">API</span>}</span>
    <BaseModelDisplay benchmark="imagejevbench" systemKey={row.key} className="mt-1 block text-[11px] font-normal leading-tight" />
    <Link href={imageJevSystemPath(row.key, 'v0.2.0')} className="block text-[11px] font-normal text-accent underline" data-bh-mm-system-details={row.key}>details</Link>
    {authorUrl && <a href={authorUrl} target="_blank" rel="noopener noreferrer" className="block text-[11px] font-normal text-accent underline" data-bh-mm-author-site={row.key}>Author website</a>}
    <span className={`${detailClass} bh-muted mt-0.5 text-xs font-normal`}>{settingLabel}</span>
    <details className={`${detailClass} bh-muted mt-1 text-xs font-normal`} data-bh-imagejev-v02-configuration-details>
      <summary className="cursor-pointer text-accent">Configuration details</summary>
      <div className="mt-2 space-y-1 [overflow-wrap:anywhere]">
        {config && <p>Setting: {config}</p>}
        {row.prior_exposure && <p>{row.prior_exposure}</p>}
        <p>Timing coverage: {pct(row.tracks.core.speed?.latency_coverage ?? 0)} · Cost coverage: {pct(row.tracks.core.cost?.coverage ?? 0)} · Probability coverage: {pct(0.35 * row.tracks.core.public.probability_coverage + 0.65 * row.tracks.core.sealed.probability_coverage)}</p>
        {row.tracks.core.cost?.source && <p>Cost basis: {row.tracks.core.cost.source}</p>}
      </div>
    </details>
    {gateNames.length > 0 && <span className="bh-muted mt-0.5 block text-xs font-normal">Gated: {gateNames.join(', ')}</span>}
    {row.pricing_alternative && <span className="bh-muted mt-0.5 block text-xs font-normal" data-bh-imagejev-v02-table-alt={row.key}>Ranked at its stated API price · {row.pricing_alternative.label}: {row.pricing_alternative.tracks.core.composite.score.toFixed(2)} (would be #{row.pricing_alternative.rank_if_applied})</span>}
  </th>;
}

export function ImageJevV02RankingTable({ systems }: { systems: Row[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('composite');
  const [descending, setDescending] = useState(true);
  // CSS keeps the complete table on desktop and makes it compact by default below 640 px.
  const [compactMobile, setCompactMobile] = useState(true);
  const compact = compactMobile ? 'hidden sm:table-cell' : '';
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return systems.filter((row) => {
      const identity = `${row.name} ${row.inference_setting ?? ''}`.toLowerCase();
      if (needle && !identity.includes(needle)) return false;
      if (filter === 'api' && !row.api_flag) return false;
      if (filter === 'local' && row.api_flag) return false;
      if (filter === 'gated' && !gated(row)) return false;
      return true;
    }).sort((a, b) => {
      const left = sortValue(a, sort), right = sortValue(b, sort);
      const leftMissing = !Number.isFinite(left), rightMissing = !Number.isFinite(right);
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      const difference = left - right;
      if (difference) return descending ? -difference : difference;
      return a.rank - b.rank;
    });
  }, [systems, query, filter, sort, descending]);
  const changeSort = (key: SortKey) => {
    if (key === sort) setDescending((value) => !value);
    else { setSort(key); setDescending(key !== 'rank'); }
  };

  return <section className="mt-4" aria-label="Measured CORE ranking table" data-bh-imagejev-v02-core-table>
    <div className="flex flex-wrap items-center gap-2" data-bh-imagejev-v02-table-controls>
      <label className="min-w-52 flex-1 text-sm"><span className="sr-only">Search measured systems by name or setting</span>
        <input type="search" className="bh-input min-h-10 w-full" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search name or setting" aria-label="Search measured systems by name or setting" />
      </label>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter measured systems">
        {(['all', 'local', 'api', 'gated'] as const).map((value) => <button key={value} type="button" className="bh-jev-preset min-h-10 capitalize" aria-pressed={filter === value} onClick={() => setFilter(value)} data-bh-imagejev-v02-filter={value}>{value === 'all' ? 'All systems' : value === 'api' ? 'API' : value}</button>)}
      </div>
      <div className="flex gap-1" role="group" aria-label="Table density">
        <button type="button" className="bh-jev-preset min-h-10" aria-pressed={compactMobile} onClick={() => setCompactMobile(true)} data-bh-imagejev-v02-columns="compact">Compact</button>
        <button type="button" className="bh-jev-preset min-h-10" aria-pressed={!compactMobile} onClick={() => setCompactMobile(false)} data-bh-imagejev-v02-columns="all">All columns</button>
      </div>
      <label className="min-h-10 text-sm sm:hidden">Sort by
        <select className="bh-input ml-2 min-h-10" value={sort} onChange={(event) => { const key = event.currentTarget.value as SortKey; setSort(key); setDescending(key !== 'rank'); }} aria-label="Sort measured systems by">
          <option value="composite">Composite</option><option value="rank">Rank</option><option value="intelligence">Intelligence</option><option value="cost">Cost</option><option value="p50">p50 latency</option>
        </select>
      </label>
    </div>
    <p className="bh-muted mt-2 text-xs" aria-live="polite" data-bh-imagejev-v02-row-count>{visible.length} of {systems.length} measured systems</p>
    <p className="bh-muted mt-1 text-xs">Scroll or swipe the table for more columns. On mobile, Compact shows rank, system and composite; All columns shows the axes, timing and cost.</p>
    <div className="mt-2 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-0 text-left sm:min-w-[590px] text-sm" data-bh-imagejev-v02-measured-table aria-label="Measured CORE ranking">
        <thead><tr className="border-b border-line">
          <SortHeading label="#" sort="rank" current={sort} descending={descending} onSort={changeSort} className="sticky left-0 z-[2] w-10 min-w-10 bg-[var(--surface)] sm:w-14 sm:min-w-14 shadow-[inset_-1px_0_0_rgb(var(--line))]" />
          <th scope="col" className="sticky left-10 z-[2] w-40 min-w-40 max-w-40 sm:left-14 sm:w-72 sm:min-w-52 sm:max-w-72 bg-[var(--surface)] px-3 py-2 text-left shadow-[inset_-1px_0_0_rgb(var(--line))]">System</th>
          <SortHeading label="Composite" sort="composite" current={sort} descending={descending} onSort={changeSort} />
          <SortHeading label="Intelligence" sort="intelligence" current={sort} descending={descending} onSort={changeSort} className={compact} />
          <th scope="col" className={`${compact} p-2 text-right`}>Calibration</th><th scope="col" className={`${compact} p-2 text-right`}>Speed</th><th scope="col" className={`${compact} p-2 text-right`}>Cost</th>
          <th scope="col" className={`${compact} p-2 text-right`}>Public acc.</th><th scope="col" className={`${compact} p-2 text-right`}>Sealed acc.</th>
          <th scope="col" className={`${compact} p-2 text-right`}>Matched gap</th>
          <SortHeading label="USD / 1,000" sort="cost" current={sort} descending={descending} onSort={changeSort} className={compact} />
          <SortHeading label="p50 / p95" sort="p50" current={sort} descending={descending} onSort={changeSort} className={compact} />
          <th scope="col" className={`${compact} border-l border-line p-2 text-right text-xs font-medium bh-muted`}>CU diag.</th><th scope="col" className={`${compact} p-2 text-right text-xs font-medium bh-muted`}>BU diag.</th>
        </tr></thead>
        <tbody>{visible.map((row) => {
          const core = row.tracks.core;
          const p50 = core.speed?.raw_p50_s ?? core.speed?.p50_s_raw ?? core.speed?.p50_s;
          const p95 = core.speed?.raw_p95_s ?? core.speed?.p95_s_raw ?? core.speed?.p95_s;
          const cu = row.tracks['computer-use']?.composite?.score;
          const bu = row.tracks['browser-use']?.composite?.score;
          return <tr key={row.key} className="border-t border-line align-top" data-bh-imagejev-v02-measured-row={row.key}>
            <td className="sticky left-0 z-[1] w-10 min-w-10 bg-[var(--surface)] sm:w-14 sm:min-w-14 px-3 py-2 text-right font-bold tabular-nums shadow-[inset_-1px_0_0_rgb(var(--line))]">{row.rank}</td>
            <SystemCell row={row} compactMobile={compactMobile} />
            <td className="px-3 py-2 text-right font-bold tabular-nums">{number(core.composite.score)}</td><td className={`${compact} px-3 py-2 text-right tabular-nums`}>{number(core.axes.intelligence)}</td>
            <td className={`${compact} px-3 py-2 text-right tabular-nums`}>{number(core.axes.calibration)}</td><td className={`${compact} px-3 py-2 text-right tabular-nums`}>{number(core.axes.speed)}</td><td className={`${compact} px-3 py-2 text-right tabular-nums`}>{number(core.axes.cost)}</td>
            <td className={`${compact} px-3 py-2 text-right tabular-nums`}>{core.public.correct}/{core.public.n} · {pct(core.public.accuracy)}</td><td className={`${compact} px-3 py-2 text-right tabular-nums`}>{core.sealed.correct}/{core.sealed.n} · {pct(core.sealed.accuracy)}</td>
            <td className={`${compact} px-3 py-2 text-right tabular-nums`}>{gapPp(core.matched_gap_pp)}</td>
            <td className={`${compact} px-3 py-2 text-right tabular-nums`}>{usd(core.cost?.usd_per_1000 ?? null)}</td><td className={`${compact} px-3 py-2 text-right tabular-nums whitespace-nowrap`}>{time(p50)} / {time(p95)}</td>
            <td className={`${compact} border-l border-line px-3 py-2 text-right tabular-nums`}>{Number.isFinite(cu) ? number(cu) : '—'}</td><td className={`${compact} px-3 py-2 text-right tabular-nums`}>{Number.isFinite(bu) ? number(bu) : '—'}</td>
          </tr>;
        })}</tbody>
      </table>
      {!visible.length && <p className="bh-muted p-4 text-sm">No measured CORE systems match these controls.</p>}
    </div>
  </section>;
}
