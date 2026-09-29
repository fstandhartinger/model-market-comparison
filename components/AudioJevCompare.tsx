"use client";
import { useState } from 'react';
import type { AudioJevRow } from '../lib/audiojev-preview.mjs';

// CR-214: direct comparison of two AudioJevBench systems, head to head on every published aggregate.
const one = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));
const usd = (v: number | null) => (v == null ? '—' : v === 0 ? 'Free' : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toPrecision(2)}`);
const secs = (v: number | null) => (v == null ? '—' : v >= 1 ? `${v.toFixed(2)} s` : `${Math.round(v * 1000)} ms`);
const GROUP_SHORT: Record<string, string> = { full: 'full coverage', 'public-only': 'public-only, provisional', partial: 'partial coverage' };

type Metric = { label: string; get: (r: AudioJevRow) => number | null; fmt: (v: number | null) => string; better: 'high' | 'low'; bar?: boolean };
const METRICS: Metric[] = [
  { label: 'Composite score (B)', get: (r) => r.headline, fmt: one, better: 'high', bar: true },
  { label: 'Capability', get: (r) => r.capability, fmt: one, better: 'high', bar: true },
  { label: 'Intelligence', get: (r) => r.intelligence, fmt: one, better: 'high', bar: true },
  { label: 'Public Intelligence', get: (r) => r.iPublic, fmt: one, better: 'high', bar: true },
  { label: 'Sealed Intelligence', get: (r) => r.iSealed, fmt: one, better: 'high', bar: true },
  { label: 'Calibration', get: (r) => r.calibration, fmt: one, better: 'high', bar: true },
  { label: 'Speed axis', get: (r) => r.speed, fmt: one, better: 'high', bar: true },
  { label: 'Cost axis', get: (r) => r.cost, fmt: one, better: 'high', bar: true },
  { label: 'Median latency (adj.)', get: (r) => r.p50Adj, fmt: secs, better: 'low' },
  { label: 'USD per 1,000 decisions', get: (r) => r.usd, fmt: usd, better: 'low' },
];

const RADAR_AXES: Array<{ label: string; get: (r: AudioJevRow) => number | null }> = [
  { label: 'Intelligence', get: (r) => r.intelligence ?? r.iPublic },
  { label: 'Calibration', get: (r) => r.calibration },
  { label: 'Speed', get: (r) => r.speed },
  { label: 'Cost', get: (r) => r.cost },
];

function AudioRadar({ a, b }: { a: AudioJevRow; b: AudioJevRow }) {
  const axes = RADAR_AXES.filter((axis) => axis.get(a) != null && axis.get(b) != null);
  if (axes.length < 3) return <p className="bh-muted mt-4 text-sm">A radar needs at least three shared measured axes; compare the available values in the table below.</p>;
  const cx = 260, cy = 176, radius = 112, labelRadius = 150;
  const point = (index: number, value: number, r = radius) => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / axes.length;
    const d = r * Math.max(0, Math.min(100, value)) / 100;
    return [cx + Math.cos(angle) * d, cy + Math.sin(angle) * d] as const;
  };
  const polygon = (row: AudioJevRow) => axes.map((axis, index) => point(index, axis.get(row) ?? 0).join(',')).join(' ');
  const colorA = 'rgb(var(--jev-t-jev))', colorB = 'rgb(var(--jev-t-rebuild))';
  return <figure className="bh-panel mt-4 p-3 sm:p-4" data-bh-audiojev-radar>
    <figcaption className="text-base font-semibold">Head-to-head radar</figcaption>
    <p className="bh-muted mt-1 text-xs">Up to four 0–100 axes; farther from the centre is better. Public-only rows use public Intelligence, and unmeasured axes are omitted.</p>
    <svg viewBox="0 0 520 300" className="mx-auto mt-2 block w-full max-w-2xl" role="img" aria-label={`Head-to-head radar comparing ${a.name} and ${b.name} across ${axes.map((x) => x.label).join(', ')}`}>
      <title>{`Head-to-head radar: ${a.name} and ${b.name}`}</title>
      {[20, 40, 60, 80, 100].map((level) => <polygon key={level} points={axes.map((_, index) => point(index, level).join(',')).join(' ')} fill="none" stroke="rgb(var(--line))" strokeWidth="1" />)}
      {axes.map((axis, index) => {
        const [x, y] = point(index, 100);
        const [lx, ly] = point(index, 100, labelRadius);
        return <g key={axis.label}>
          <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgb(var(--line))" strokeWidth="1" />
          <text x={lx} y={ly + 4} textAnchor={Math.abs(lx - cx) < 18 ? 'middle' : lx < cx ? 'end' : 'start'} fill="currentColor" fontSize="13">{axis.label}</text>
        </g>;
      })}
      <polygon points={polygon(a)} fill={colorA} fillOpacity=".16" stroke={colorA} strokeWidth="2.5" />
      <polygon points={polygon(b)} fill={colorB} fillOpacity=".14" stroke={colorB} strokeWidth="2.5" />
      {axes.map((axis, index) => {
        const [ax, ay] = point(index, axis.get(a) ?? 0);
        const [bx, by] = point(index, axis.get(b) ?? 0);
        return <g key={`${axis.label}-points`}><circle cx={ax} cy={ay} r="3.5" fill={colorA} /><circle cx={bx} cy={by} r="3.5" fill={colorB} /></g>;
      })}
    </svg>
    <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-1 text-xs">
      <span className="flex max-w-full items-center gap-2"><span className="h-0.5 w-4 shrink-0" style={{ background: colorA }} /><span className="truncate">{a.name}</span></span>
      <span className="flex max-w-full items-center gap-2"><span className="h-0.5 w-4 shrink-0" style={{ background: colorB }} /><span className="truncate">{b.name}</span></span>
    </div>
  </figure>;
}

function Side({ r, tone }: { r: AudioJevRow; tone: string }) {
  return <div className="min-w-0">
    <p className="truncate font-semibold" style={{ color: tone }}>{r.name}</p>
    <p className="bh-muted truncate text-[11px]">{r.config ? `${r.config} · ` : ''}{GROUP_SHORT[r.group]}{r.rank != null && r.group === 'full' ? ` · composite #${r.rank}` : ''}</p>
  </div>;
}

export function AudioJevCompare({ rows, defaults }: { rows: AudioJevRow[]; defaults: [string, string] }) {
  const [aKey, setA] = useState(defaults[0]);
  const [bKey, setB] = useState(defaults[1]);
  const a = rows.find((r) => r.key === aKey) ?? rows[0];
  const b = rows.find((r) => r.key === bKey) ?? rows[1] ?? rows[0];
  if (!a || !b) return null;
  const toneA = 'rgb(var(--jev-t-jev))', toneB = 'rgb(var(--jev-t-rebuild))';
  const mixed = a.group !== 'full' || b.group !== 'full';
  const select = (value: string, set: (v: string) => void, label: string) => <label className="flex min-w-0 flex-col gap-1 text-sm">
    <span className="bh-muted text-xs">{label}</span>
    <select className="min-h-10 w-full min-w-0 rounded-lg border border-line bg-[var(--surface)] px-2 py-1.5" value={value} onChange={(e) => set(e.target.value)} data-bh-audiojev-compare-select={label}>
      {(['full', 'public-only', 'partial'] as const).map((g) => <optgroup key={g} label={GROUP_SHORT[g]}>
        {rows.filter((r) => r.group === g).map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
      </optgroup>)}
    </select>
  </label>;
  return <section id="audiojev-compare" className="mt-10 scroll-mt-6" aria-labelledby="audiojev-compare-title" data-bh-audiojev-compare>
    <h2 id="audiojev-compare-title" className="text-2xl font-semibold">Direct comparison</h2>
    <p className="bh-muted mt-1 max-w-3xl text-sm">Pick two systems and compare every published aggregate side by side. The better value in each row is bold.</p>
    <div className="bh-panel mt-4 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {select(a.key, setA, 'System A')}
        {select(b.key, setB, 'System B')}
      </div>
      {mixed && <p className="mt-3 rounded-lg border border-amber-600 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="note" data-bh-audiojev-compare-caveat>
        <b>Not like for like.</b> Public-only rows are measured on public items only and partial rows on sound events only, so their Intelligence and Capability are not directly comparable with full-coverage rows.
      </p>}
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-line pb-3">
        <Side r={a} tone={toneA} /><Side r={b} tone={toneB} />
      </div>
      <AudioRadar a={a} b={b} />
      <dl className="mt-2 divide-y divide-[rgb(var(--line))]">
        {METRICS.map((m) => {
          const va = m.get(a), vb = m.get(b);
          if (va == null && vb == null) return null;
          const winA = va != null && (vb == null || (m.better === 'high' ? va > vb : va < vb));
          const winB = vb != null && (va == null || (m.better === 'high' ? vb > va : vb < va));
          return <div key={m.label} className="py-2.5" data-bh-audiojev-compare-metric={m.label}>
            <dt className="bh-muted text-xs">{m.label}</dt>
            <dd className="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              {([[va, winA, toneA], [vb, winB, toneB]] as const).map(([v, win, tone], i) => <span key={i} className="flex min-w-0 items-center gap-2">
                <span className={`w-14 shrink-0 tabular-nums ${win ? 'font-bold' : ''}`}>{m.fmt(v)}</span>
                {m.bar && <span className="h-2 min-w-0 flex-1 rounded-sm bg-[rgb(var(--line)/.5)]" aria-hidden="true"><span className="block h-full rounded-sm" style={{ width: `${Math.max(0, Math.min(100, v ?? 0))}%`, background: tone }} /></span>}
              </span>)}
            </dd>
          </div>;
        })}
      </dl>
    </div>
  </section>;
}
