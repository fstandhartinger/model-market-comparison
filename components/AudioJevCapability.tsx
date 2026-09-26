"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AudioJevRow } from '../lib/audiojev-preview.mjs';

// AudioJevBench preview (26 Sep 2026): same page order as /jev-models — Capability ranking first, then the
// cost-vs-Capability bubble chart — with one Jev-class filter shared by both. Presentation only.

const one = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));
const usd = (v: number) => (v === 0 ? 'Free' : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toPrecision(2)}`);
const secs = (v: number) => (v >= 1 ? `${v.toFixed(2)} s` : `${Math.round(v * 1000)} ms`);
const GROUP_COLOUR: Record<string, string> = { full: '#f59e0b', 'public-only': '#ec4899', partial: '#14b8a6' };
const GROUP_LABEL: Record<string, string> = { full: 'Full (sealed + public)', 'public-only': 'Public-only, provisional', partial: 'Partial coverage' };

function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(260, Math.round(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', update); return () => window.removeEventListener('resize', update); }
    const o = new ResizeObserver(update); o.observe(el);
    return () => o.disconnect();
  }, []);
  return { ref, width };
}

function Bubble({ kind, rows, limit }: { kind: 'cost' | 'latency'; rows: AudioJevRow[]; limit: number }) {
  const { ref, width: W } = useWidth(520);
  const [active, setActive] = useState<string | null>(null);
  const narrow = W < 440;
  const H = Math.round(Math.max(260, Math.min(420, W * (narrow ? 0.9 : 0.6))));
  const L = narrow ? 34 : 44, R = 14, T = 20, B = 44;
  const xOf = (r: AudioJevRow) => (kind === 'cost' ? r.usd : r.p50Adj);
  const plotted = rows.filter((r) => { const x = xOf(r); return x != null && x > 0 && r.capability != null; });
  const omitted = rows.filter((r) => !plotted.includes(r));
  const xs = [...plotted.map((r) => Math.log10(xOf(r) as number)), Math.log10(limit)];
  let xMin = Math.floor(Math.min(...xs) - 0.15), xMax = Math.ceil(Math.max(...xs) + 0.15);
  if (xMax - xMin < 1) xMax = xMin + 1;
  const x = (v: number) => L + ((Math.log10(v) - xMin) / (xMax - xMin)) * (W - L - R);
  const y = (v: number) => T + (1 - v / 100) * (H - T - B);
  const ticks: number[] = [];
  for (let e = xMin; e <= xMax; e++) ticks.push(10 ** e);
  const act = plotted.find((r) => r.key === active) ?? null;
  const title = kind === 'cost' ? 'Capability vs cost' : 'Capability vs median latency';
  return <figure className="bh-panel min-w-0 overflow-hidden p-3 sm:p-4" data-bh-audiojev-bubble={kind}>
    <figcaption className="text-sm font-semibold">{title}</figcaption>
    <p className="bh-muted mt-1 text-xs">{kind === 'cost' ? 'USD per 1,000 decisions, log scale.' : 'Adjusted median (p50) latency, log scale.'} Dashed line = Jev-class limit ({kind === 'cost' ? usd(limit) : secs(limit)}). Left and up is better. Tap a bubble for values.</p>
    <div ref={ref} className="relative mt-2 w-full min-w-0">
      <svg width={W} height={H} role="img" aria-label={`${title}; ${plotted.length} systems plotted`}>
        {[0, 25, 50, 75, 100].map((v) => <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="rgb(var(--line))" strokeWidth={1} />
          <text x={L - 6} y={y(v) + 3} fontSize={10} textAnchor="end" fill="var(--muted)">{v}</text>
        </g>)}
        {ticks.map((t) => <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={T} y2={H - B} stroke="rgb(var(--line))" strokeWidth={1} />
          <text x={x(t)} y={H - B + 14} fontSize={10} textAnchor="middle" fill="var(--muted)">{kind === 'cost' ? usd(t) : secs(t)}</text>
        </g>)}
        <line x1={x(limit)} x2={x(limit)} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="4 4" data-bh-audiojev-limit />
        <text x={Math.min(W - R - 70, x(limit) + 4)} y={T + 10} fontSize={10} fill="var(--muted)">Jev-class limit</text>
        <text x={(L + W - R) / 2} y={H - 8} fontSize={11} textAnchor="middle" fill="var(--muted)">{kind === 'cost' ? 'USD per 1,000 decisions' : 'Adjusted median latency'}</text>
        <text x={12} y={(T + H - B) / 2} fontSize={11} textAnchor="middle" fill="var(--muted)" transform={`rotate(-90 12 ${(T + H - B) / 2})`}>Capability</text>
        {plotted.map((r, i) => {
          const cx = x(xOf(r) as number), cy = y(r.capability as number);
          // Stack labels of bubbles that sit on (almost) the same spot instead of printing them on top of each other.
          const dy = 13 * plotted.slice(0, i).filter((o) => Math.abs(x(xOf(o) as number) - cx) < 40 && Math.abs(y(o.capability as number) - cy) < 12).length;
          return <g key={r.key} tabIndex={0} role="button" aria-label={`${r.key}: Capability ${one(r.capability)}`}
            onMouseEnter={() => setActive(r.key)} onFocus={() => setActive(r.key)} onClick={() => setActive(r.key)} style={{ cursor: 'pointer' }}>
            <circle cx={cx} cy={cy} r={narrow ? 6 : 8} fill={GROUP_COLOUR[r.group]} fillOpacity={r.jevClass ? 0.85 : 0.35} stroke={GROUP_COLOUR[r.group]} strokeWidth={active === r.key ? 3 : 1.5} />
            {!narrow && <text x={cx + 11} y={cy + 4 + dy} fontSize={11} fill="currentColor">{r.key.split(' (')[0]}</text>}
          </g>;
        })}
      </svg>
      {act && <div className="bh-panel mt-2 p-2 text-xs" data-bh-audiojev-bubble-detail>
        <b>{act.key}</b> · {GROUP_LABEL[act.group]} · Capability {one(act.capability)}{act.capabilityProvisional ? ' (provisional)' : ''} · Intelligence {one(act.intelligence ?? act.iPublic)} · Calibration {one(act.calibration)} · {act.usd == null ? 'no price' : `${usd(act.usd)}/1k${act.usdEstimate ? ' est.' : ''}`} · p50 {act.p50Adj == null ? '—' : secs(act.p50Adj)} · {act.jevClass ? 'Jev-class' : `outside: ${act.outsideBecause.join(', ')}`}
      </div>}
    </div>
    {omitted.length > 0 && <p className="bh-muted mt-2 text-xs">Not plotted (no {kind === 'cost' ? 'price' : 'latency'} or Capability): {omitted.map((r) => r.key).join(', ')}.</p>}
  </figure>;
}

export function AudioJevCapability({ rows, limits }: { rows: AudioJevRow[]; limits: { p50AdjS: number; usdPer1000: number } }) {
  const [classOnly, setClassOnly] = useState(true);
  const inClass = rows.filter((r) => r.jevClass);
  const visible = useMemo(() => (classOnly ? rows.filter((r) => r.jevClass) : rows), [rows, classOnly]);
  const lead = inClass.find((r) => r.group === 'full') ?? inClass[0];
  return <section id="audiojev-capability" className="mt-8 scroll-mt-6" aria-labelledby="audiojev-capability-title" data-bh-audiojev-capability>
    <p className="bh-eyebrow">AudioJevBench v0.1 preview · headline ranking</p>
    <h2 id="audiojev-capability-title" className="mt-1 text-2xl font-bold leading-snug sm:text-3xl">Capability ranking of Jev-class audio systems</h2>
    <p className="mt-2 max-w-4xl text-[15px] leading-snug">
      Capability averages <b>Intelligence</b> and <b>Calibration</b>.
      {lead ? <> <b>{lead.key}</b> leads the Jev-class systems with {one(lead.capability)}.</> : <> No system meets the Jev-class limits in this data yet.</>}
    </p>
    <p className="bh-muted mt-2 text-[13px] leading-snug">
      Jev-class = adjusted median latency ≤ {limits.p50AdjS.toFixed(1)} s <b>and</b> ≤ {usd(limits.usdPer1000)} per 1,000 decisions. {inClass.length} of {rows.length} systems with a Capability qualify.
    </p>
    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm" data-bh-audiojev-class-filter>
      <input type="checkbox" checked={classOnly} onChange={(e) => setClassOnly(e.target.checked)} />
      Show Jev-class systems only
    </label>

    <figure className="bh-panel mt-3 p-4 sm:p-5" data-bh-audiojev-capability-bars>
      {visible.length === 0 ? <p className="bh-muted text-sm" data-bh-audiojev-empty>
        No Jev-class system yet. <button type="button" className="text-accent underline" onClick={() => setClassOnly(false)}>Show all {rows.length} systems</button>
      </p> : <ol className="space-y-2.5" data-bh-audiojev-capability-list>{visible.map((r) => <li key={r.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.2rem] items-center gap-x-2 text-sm sm:grid-cols-[1.6rem_16rem_minmax(6rem,1fr)_3.5rem_5.5rem]" data-bh-audiojev-capability-row={r.key}>
        <span className="bh-muted text-right tabular-nums">{r.capabilityRank ?? '–'}</span>
        <span className="min-w-0 truncate" title={r.key}>{r.key}{r.capabilityProvisional && <span className="ml-1 rounded-full border border-line px-1.5 text-[10px] bh-muted">{r.group === 'public-only' ? 'public-only' : 'partial'}</span>}</span>
        <span className="col-span-3 col-start-1 row-start-2 h-[10px] rounded-sm bg-[rgb(var(--line))] sm:col-span-1 sm:col-start-3 sm:row-start-1" aria-hidden="true">
          <span className="block h-full rounded-sm" style={{ width: `${Math.max(0, Math.min(100, r.capability ?? 0))}%`, background: GROUP_COLOUR[r.group], opacity: r.jevClass ? 1 : 0.5 }} />
        </span>
        <b className="text-right tabular-nums">{one(r.capability)}</b>
        <span className="bh-muted hidden text-right font-mono text-xs sm:block">{r.usd == null ? '—' : `${usd(r.usd)}${r.usdEstimate ? '*' : ''}`}</span>
        {!r.jevClass && <span className="bh-muted col-span-3 col-start-2 text-[11px] sm:col-span-3">Outside: {r.outsideBecause.join(', ')}</span>}
      </li>)}</ol>}
      <p className="bh-muted mt-3 text-[11.5px] leading-snug"># counts Jev-class systems on the full (sealed + public) table only; public-only and partial-coverage rows are provisional and not numbered. Right column: USD per 1,000 decisions, * = estimated price.</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]" aria-label="Colour legend">
        {Object.entries(GROUP_LABEL).map(([g, label]) => <li key={g}><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: GROUP_COLOUR[g] }} />{label}</li>)}
      </ul>
    </figure>

    <div id="audiojev-bubbles" className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2" data-bh-audiojev-bubbles>
      {visible.length === 0 ? <p className="bh-muted text-sm lg:col-span-2">Charts are empty with the Jev-class filter on. Untick the filter to plot every system.</p> : <>
        <Bubble kind="cost" rows={visible} limit={limits.usdPer1000} />
        <Bubble kind="latency" rows={visible} limit={limits.p50AdjS} />
      </>}
    </div>
  </section>;
}
