"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { paretoFrontier } from '../lib/pareto.mjs';
import { useJevV15VisibleKeys } from './useJevV15VisibleKeys';
import type { JevBubblePoint } from './JevBubbleChart';

// PREVIEW (Florian, 10 Oct 2026, not rolled out): Pareto views of the board, after the Decision Index charts —
// capability against cost and against median latency, both on a log axis, with the nondominated systems joined by a
// red frontier line and labelled, every other system faded, and the Jev-class cap shaded as the region beyond it.
// Rendered only when NEXT_PUBLIC_BH_PREVIEW_PARETO=1.

type Kind = 'cost' | 'latency';
type Placed = { p: JevBubblePoint; v: number; cx: number; cy: number };
type Box = { x: number; y: number; w: number; h: number };
const FRONTIER = '#e5484d';
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const usd = (v: number) => `$${Number(v.toPrecision(2))}`;
const secs = (v: number) => (v >= 1 ? `${v.toFixed(v >= 10 ? 0 : 1)} s` : `${Math.round(v * 1000)} ms`);
const fmt = (kind: Kind, v: number) => (kind === 'cost' ? usd(v) : secs(v));

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(260, Math.round(el.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function logTicks(min: number, max: number, pxPerDecade: number) {
  const out: number[] = [];
  const steps = pxPerDecade > 150 ? [1, 2, 5] : pxPerDecade > 90 ? [1, 3] : [1];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++)
    for (const m of steps) { const t = m * 10 ** e; if (t >= min * 0.999 && t <= max * 1.001) out.push(t); }
  return out;
}

function ParetoChart({ kind, points, limit, title, unit }: { kind: Kind; points: JevBubblePoint[]; limit: number; title: string; unit: string }) {
  const { ref, width: W } = useWidth();
  const narrow = W < 440;
  const H = Math.round(Math.max(320, Math.min(480, W * (narrow ? 1.05 : 0.7))));
  const L = narrow ? 34 : 44, R = 14, T = 16, B = 44;
  const [active, setActive] = useState<string | null>(null);
  const value = (p: JevBubblePoint) => (kind === 'cost' ? p.cost : p.latency);
  const plotted = useMemo(() => points.filter((p) => { const v = value(p); return v != null && Number.isFinite(v) && v > 0; }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, kind]);
  const omitted = points.length - plotted.length;
  const frontier = useMemo(() => paretoFrontier(plotted.map((p) => ({ id: p.key, x: value(p) as number, y: p.capability }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plotted, kind]);
  const onFrontier = useMemo(() => new Set(frontier.map((f) => f.id as string)), [frontier]);
  const values = plotted.map((p) => value(p) as number);
  const lo = 10 ** Math.floor(Math.log10(Math.min(...values, limit) * 0.9));
  const hi = 10 ** Math.ceil(Math.log10(Math.max(...values, limit) * 1.1));
  const yMin = Math.max(0, Math.floor(Math.min(...plotted.map((p) => p.capability)) / 10) * 10);
  const x = (v: number) => L + (W - L - R) * (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo));
  const y = (v: number) => T + (H - T - B) * (1 - (v - yMin) / (100 - yMin));
  const placed: Placed[] = plotted.map((p) => ({ p, v: value(p) as number, cx: x(value(p) as number), cy: y(p.capability) }));
  const line = frontier.map((f) => `${x(f.x).toFixed(1)},${y(f.y).toFixed(1)}`).join(' ');
  const fs = narrow ? 10 : 11;

  // Label every frontier point: try the eight compass positions, keep inside the plot, never over another label.
  const labels = useMemo(() => {
    const taken: Box[] = [];
    const room = narrow ? 17 : 26;
    return placed.filter((d) => onFrontier.has(d.p.key)).sort((a, b) => b.p.capability - a.p.capability).map((d) => {
      const text = d.p.name.length > room ? `${d.p.name.slice(0, room - 1).trimEnd()}…` : d.p.name;
      const w = text.length * fs * 0.58 + 4, h = fs + 3;
      const spots: [number, number, 'start' | 'end'][] = [];
      for (const dy of [0, -12, 12, -24, 24, -36, 36]) { spots.push([d.cx + 8, d.cy + dy, 'start']); spots.push([d.cx - 8, d.cy + dy, 'end']); }
      for (const s of spots) {
        const box: Box = { x: s[2] === 'start' ? s[0] : s[0] - w, y: s[1] - h / 2, w, h };
        if (box.x < L + 2 || box.x + box.w > W - R || box.y < T || box.y + box.h > H - B) continue;
        if (taken.some((t) => overlaps(t, box))) continue;
        taken.push(box);
        return { key: d.p.key, text, x: s[0], y: s[1], anchor: s[2], lx: d.cx, ly: d.cy };
      }
      return null;
    }).filter((l): l is NonNullable<typeof l> => l != null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed.map((d) => `${d.p.key}:${d.cx.toFixed(1)}:${d.cy.toFixed(1)}`).join('|'), narrow, W, H]);

  const hit = active ? placed.find((d) => d.p.key === active) : null;
  const dominator = hit && !onFrontier.has(hit.p.key)
    ? placed.filter((o) => o.v <= hit.v && o.p.capability > hit.p.capability).sort((a, b) => a.v - b.v)[0] ?? null : null;
  const nearest = (px: number, py: number) => {
    let best: string | null = null, bestD = Infinity;
    for (const d of placed) { const dist = Math.hypot(d.cx - px, d.cy - py); if (dist < bestD) { bestD = dist; best = d.p.key; } }
    return bestD <= 16 ? best : null;
  };
  const capX = x(limit);

  return <figure className="bh-panel min-w-0 p-3" data-bh-jev-pareto={kind}>
    <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>
    <div ref={ref} className="relative w-full">
      <svg width={W} height={H} role="img" aria-label={`${title}: ${frontier.length} systems on the Pareto frontier`}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setActive(nearest(e.clientX - r.left, e.clientY - r.top)); }}
        onPointerLeave={() => setActive(null)}
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setActive(nearest(e.clientX - r.left, e.clientY - r.top)); }}>
        {capX < W - R && <g data-bh-jev-pareto-cap>
          <rect x={Math.max(L, capX)} y={T} width={W - R - Math.max(L, capX)} height={H - T - B} fill="rgb(var(--warn) / .08)" />
          <line x1={capX} x2={capX} y1={T} y2={H - B} stroke="rgb(var(--warn))" strokeDasharray="4 4" strokeWidth={1.2} />
          <text x={W - R - 5} y={H - B - 6} textAnchor="end" fontSize={fs} fill="rgb(var(--warn))">{W - R - capX > 190 ? 'Outside the Jev-class cap (2× Jev)' : 'Over 2× Jev'}</text>
        </g>}
        {[yMin, ...Array.from({ length: Math.floor((100 - yMin) / 10) }, (_, i) => yMin + 10 * (i + 1))].map((t) => <g key={`y${t}`}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgb(var(--line) / .45)" strokeWidth={1} />
          <text x={L - 5} y={y(t) + 3.5} textAnchor="end" fontSize={fs} fill="var(--muted)">{t}</text>
        </g>)}
        {logTicks(lo, hi, (W - L - R) / (Math.log10(hi) - Math.log10(lo))).map((t) => <g key={`x${t}`}>
          <line x1={x(t)} x2={x(t)} y1={T} y2={H - B} stroke="rgb(var(--line) / .3)" strokeWidth={1} />
          <text x={x(t)} y={H - B + 14} textAnchor="middle" fontSize={fs} fill="var(--muted)">{fmt(kind, t)}</text>
        </g>)}
        <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" fontSize={fs} fill="var(--muted)">{unit} (log scale) — further left is better</text>
        <text transform={`translate(10 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fontSize={fs} fill="var(--muted)">Capability Score</text>
        {placed.filter((d) => !onFrontier.has(d.p.key)).map((d) => <circle key={d.p.key} cx={d.cx} cy={d.cy} r={narrow ? 3 : 3.6}
          fill="rgb(var(--accent) / .28)" stroke={d.p.isReference ? 'rgb(var(--accent))' : 'none'} strokeWidth={1.4} />)}
        <polyline points={line} fill="none" stroke={FRONTIER} strokeWidth={2.2} strokeLinejoin="round" data-bh-jev-pareto-line />
        {placed.filter((d) => onFrontier.has(d.p.key)).map((d) => <circle key={d.p.key} cx={d.cx} cy={d.cy} r={narrow ? 4.2 : 5}
          fill={FRONTIER} stroke="var(--surface)" strokeWidth={1.4} />)}
        {labels.filter((l) => Math.abs(l.y - l.ly) > 6).map((l) => <line key={`lead-${l.key}`} x1={l.lx} y1={l.ly} x2={l.anchor === 'start' ? l.x - 2 : l.x + 2} y2={l.y} stroke={FRONTIER} strokeOpacity={0.55} strokeWidth={1} />)}
        {labels.map((l) => <text key={l.key} x={l.x} y={l.y + fs / 3} textAnchor={l.anchor} fontSize={fs} fontWeight={600}
          fill="var(--text)" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke">{l.text}</text>)}
        {hit && <circle cx={hit.cx} cy={hit.cy} r={8} fill="none" stroke="var(--text)" strokeWidth={1.5} />}
      </svg>
      {hit && <div role="status" className="bh-panel pointer-events-none absolute z-10 max-w-[260px] p-2 text-xs shadow-lg"
        style={{ left: Math.min(Math.max(4, hit.cx + 12), W - 264), top: Math.max(4, hit.cy - 70) }}>
        <div className="font-semibold">{hit.p.name}</div>
        <div>Capability {hit.p.capability.toFixed(1)} · {kind === 'cost' ? `${usd(hit.v)} per 1,000 decisions` : `median ${secs(hit.v)}`}</div>
        <div className="bh-muted">{onFrontier.has(hit.p.key) ? 'On the Pareto frontier' : dominator ? `Beaten by ${dominator.p.name} (${fmt(kind, dominator.v)}, ${dominator.p.capability.toFixed(1)})` : ''}{hit.p.inClass ? '' : ' · outside Jev class'}</div>
      </div>}
    </div>
    <p className="bh-muted mt-2 text-xs">{frontier.length} of {placed.length} systems on the frontier: no other system is both {kind === 'cost' ? 'cheaper' : 'faster'} and more capable.{omitted > 0 ? ` ${omitted} without a positive ${kind === 'cost' ? 'price' : 'median latency'} are not plotted.` : ''}</p>
  </figure>;
}

export function JevParetoCharts({ points, costLimit, latencyLimit, scopeLabel }: { points: JevBubblePoint[]; costLimit: number; latencyLimit: number; scopeLabel?: string }) {
  const visibleKeys = useJevV15VisibleKeys(points.map((p) => p.key));
  const visible = useMemo(() => points.filter((p) => visibleKeys.has(p.key)), [points, visibleKeys]);
  return <section id="jev-pareto" className="mt-8 scroll-mt-6" aria-labelledby="jev-pareto-title" data-bh-jev-pareto>
    <div className="bh-eyebrow">Preview · not live</div>
    <h2 id="jev-pareto-title" className="text-xl font-semibold">Pareto frontier: capability against cost and speed{scopeLabel && ` (${scopeLabel})`}</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">The red line joins the systems nobody beats on both axes at once. Every other system is faded; hover or tap any point for its values and the system that beats it. The shaded band is beyond the Jev-class cap.</p>
    <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
      <ParetoChart kind="cost" points={visible} limit={costLimit} title="Capability vs cost ($ per 1,000 decisions)" unit="$ per 1,000 decisions" />
      <ParetoChart kind="latency" points={visible} limit={latencyLimit} title="Capability vs speed (median latency)" unit="Median latency" />
    </div>
  </section>;
}
