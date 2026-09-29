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
