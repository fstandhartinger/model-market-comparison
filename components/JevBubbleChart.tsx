"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { JEV_TYPE_LABEL, jevLegendTypes, jevTypeVarName } from './jevTypes';

// Florian 25 Sep 2026: right under the Capability ranking, two bubble charts — Capability vs cost and Capability vs
// speed. Hover, focus or tap a bubble for its name and values; the top five Jev-class systems carry permanent labels.
// The chart draws at its real pixel width, so labels stay readable on a phone instead of shrinking with a viewBox.

export type JevBubblePoint = {
  key: string; name: string; cls: string; rank: number | null; ranked: boolean;
  capability: number; intelligence: number | null; calibration: number | null;
  cost: number | null; costKind: string; speed: number | null; latency: number | null; score: number | null;
  inClass: boolean; classRank: number | null; isReference: boolean; outsideBecause: string | null;
};

type Kind = 'cost' | 'speed';
const LABELLED = 5;
const one = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));
const usd = (v: number) => (v === 0 ? 'Free' : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toPrecision(2)}`);
const secs = (v: number) => (v >= 1 ? `${v.toFixed(v >= 10 ? 0 : 1)} s` : `${Math.round(v * 1000)} ms`);
const colour = (cls: string) => `rgb(var(${jevTypeVarName(cls)}))`;
// Speed = 100 − 20 log10(t / 0.1 s), with t the geometric mean of p50 and p95 latency: the axis is a log latency scale.
const speedToSeconds = (speed: number) => 0.1 * 10 ** ((100 - speed) / 20);

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(260, Math.round(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', update); return () => window.removeEventListener('resize', update); }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export function JevBubbleChart({ id, kind, points, costLimit, referenceName }: { id: string; kind: Kind; points: JevBubblePoint[]; costLimit: number; referenceName: string }) {
  const { ref, width: W } = useWidth(520);
  const narrow = W < 440;
  const H = Math.round(Math.max(300, Math.min(460, W * (narrow ? 0.95 : 0.72))));
  const L = narrow ? 38 : 48, R = kind === 'speed' ? 24 : 12, T = 14, B = narrow ? 50 : 46;
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  const plotted = useMemo(() => points.filter((p) => (kind === 'cost' ? p.cost != null && p.cost > 0 : p.speed != null)), [points, kind]);
  const omitted = points.length - plotted.length;
  const xValue = (p: JevBubblePoint) => (kind === 'cost' ? Math.log10(p.cost as number) : (p.speed as number));
  const [xMin, xMax] = useMemo(() => {
    const xs = plotted.map(xValue);
    if (kind === 'cost') return [Math.floor(Math.min(...xs) * 2) / 2, Math.ceil(Math.max(...xs) * 2) / 2];
    return [Math.max(0, Math.floor(Math.min(...xs) / 10) * 10), 100];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotted, kind]);
  const yMin = useMemo(() => Math.max(0, Math.floor(Math.min(...plotted.map((p) => p.capability)) / 10) * 10), [plotted]);
  const x = (v: number) => L + (W - L - R) * (v - xMin) / (xMax - xMin || 1);
  const y = (v: number) => T + (H - T - B) * (1 - (v - yMin) / (100 - yMin || 1));
  const radius = (p: JevBubblePoint) => 2.5 + (narrow ? 5 : 7) * Math.sqrt(Math.max(0, p.score ?? 0) / 100);

  const placed = useMemo(() => plotted.map((p) => ({ p, cx: x(xValue(p)), cy: y(p.capability), r: radius(p) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plotted, W, H, xMin, xMax, yMin]);
  // Draw the Jev-class systems last so they sit on top, and the larger bubbles first within each group.
  const drawOrder = useMemo(() => [...placed].sort((a, b) => Number(a.p.inClass) - Number(b.p.inClass) || b.r - a.r), [placed]);

  // Permanent labels: the top five Jev-class systems by Capability. Greedy placement around the bubble, avoiding the
  // other labels, the labelled bubbles and the plot edge; a leader line joins a label that had to move away.
  const labels = useMemo(() => {
    const leaders = placed.filter((d) => d.p.classRank != null && d.p.classRank <= LABELLED).sort((a, b) => (a.p.classRank ?? 0) - (b.p.classRank ?? 0));
    const taken: Box[] = leaders.map((d) => ({ x: d.cx - d.r, y: d.cy - d.r, w: 2 * d.r, h: 2 * d.r }));
    const fs = narrow ? 10.5 : 11.5;
    const out: { key: string; text: string; x: number; y: number; anchor: 'start' | 'end'; lx: number; ly: number; far: boolean }[] = [];
    for (const d of leaders) {
      const text = `${d.p.classRank}. ${d.p.name}`;
      const w = text.length * fs * 0.62 + 8, h = fs + 4;
      const pad = d.r + 3;
      const candidates: [number, number, 'start' | 'end'][] = [];
      for (const dx of [0, 18, 40, 70]) for (const dy of [0, -14, 14, -28, 28, -44, 44, -62, 62, -84, 84]) {
        candidates.push([d.cx + pad + dx, d.cy + dy, 'start']); candidates.push([d.cx - pad - dx, d.cy + dy, 'end']);
      }
      // Hard rules: inside the plot, no label over another label or a labelled bubble. Then prefer covering the fewest
      // other bubbles, then staying close to the point.
      let chosen: [number, number, 'start' | 'end'] | null = null, best = Infinity;
      for (const c of candidates) {
        const box: Box = { x: c[2] === 'start' ? c[0] : c[0] - w, y: c[1] - h / 2, w, h };
        if (box.x < L + 1 || box.x + box.w > W - R || box.y < T || box.y + box.h > H - B) continue;
        if (taken.some((t) => overlaps(t, box))) continue;
        const covered = placed.filter((o) => o.p.key !== d.p.key && overlaps(box, { x: o.cx - o.r, y: o.cy - o.r, w: 2 * o.r, h: 2 * o.r })).length;
        const cost = covered * 40 + Math.hypot(c[0] - d.cx, c[1] - d.cy);
        if (cost < best) { best = cost; chosen = c; }
      }
      if (chosen) taken.push({ x: chosen[2] === 'start' ? chosen[0] : chosen[0] - w, y: chosen[1] - h / 2, w, h });
      const c = chosen ?? candidates[0];
      out.push({ key: d.p.key, text, x: c[0], y: c[1], anchor: c[2], lx: d.cx, ly: d.cy, far: Math.hypot(c[0] - d.cx, c[1] - d.cy) > pad + 2 });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, narrow, W, H]);

  const nearest = (clientX: number, clientY: number, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    const px = clientX - rect.left, py = clientY - rect.top;
    let best: string | null = null, bestD = Infinity;
    for (const d of placed) {
      const dist = Math.hypot(d.cx - px, d.cy - py) - d.r;
      if (dist < bestD) { bestD = dist; best = d.p.key; }
    }
    return bestD <= 14 ? best : null;
  };

  const activeDot = placed.find((d) => d.p.key === active) ?? null;
  const xTicks: { v: number; label: string; sub?: string }[] = kind === 'cost'
    ? Array.from({ length: Math.floor(xMax) - Math.ceil(xMin) + 1 }, (_, i) => Math.ceil(xMin) + i).map((e) => ({ v: e, label: usd(10 ** e) }))
    : Array.from({ length: Math.floor((xMax - xMin) / 10) + 1 }, (_, i) => xMin + 10 * i).filter((v, i, all) => !narrow || i % 2 === 0 || i === all.length - 1).map((v) => ({ v, label: String(v), sub: `≈${secs(speedToSeconds(v))}` }));
  const yTicks = Array.from({ length: Math.floor((100 - yMin) / 10) + 1 }, (_, i) => yMin + 10 * i);
  const limitX = kind === 'cost' && costLimit > 0 ? x(Math.log10(costLimit)) : null;
  const title = kind === 'cost' ? 'Capability vs cost' : 'Capability vs speed';
  const hint = kind === 'cost' ? 'Upper left is best: more capable and cheaper.' : 'Upper right is best: more capable and faster.';

  return <figure className="bh-panel min-w-0 p-4 sm:p-5" data-bh-jev-bubble={kind} aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="text-lg font-semibold">{title}</h3>
    <p className="bh-muted mt-1 text-sm">{hint} {kind === 'cost' ? 'Cost is USD per 1,000 decisions on a log scale.' : 'Speed is the JevBench Speed axis; it is a log scale of latency, so each 20 points is 10× faster (typical latency under the numbers).'}</p>
    <div ref={ref} className="relative mt-3 w-full" onPointerLeave={(e) => { if (e.pointerType === 'mouse' && !pinned) setActive(null); }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block touch-manipulation select-none" role="img" aria-labelledby={`${id}-svg-title`}
        onPointerMove={(e) => { if (e.pointerType === 'mouse' && !pinned) setActive(nearest(e.clientX, e.clientY, e.currentTarget)); }}
        onClick={(e) => { const hit = nearest(e.clientX, e.clientY, e.currentTarget); setActive(hit); setPinned(hit != null); }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setActive(null); setPinned(false); } }}>
        <title id={`${id}-svg-title`}>{`${title}: ${plotted.length} systems. ${hint}`}</title>
        {yTicks.map((t) => <g key={`y${t}`}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgb(var(--line) / .7)" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fill="var(--muted)" fontSize="11">{t}</text>
        </g>)}
        {xTicks.map((t) => <g key={`x${t.v}`}>
          <line x1={x(t.v)} x2={x(t.v)} y1={T} y2={H - B} stroke="rgb(var(--line) / .55)" />
          <text x={x(t.v)} y={H - B + 15} textAnchor="middle" fill="var(--muted)" fontSize="11">{t.label}</text>
          {t.sub && <text x={x(t.v)} y={H - B + 27} textAnchor="middle" fill="var(--muted)" fontSize="9.5">{t.sub}</text>}
        </g>)}
        <text x={(L + W - R) / 2} y={H - 5} textAnchor="middle" fill="var(--text)" fontSize="11">{kind === 'cost' ? '$ per 1,000 decisions (log) · ← cheaper' : 'Speed axis · faster →'}</text>
        <text x={11} y={(T + H - B) / 2} textAnchor="middle" fill="var(--text)" fontSize="11" transform={`rotate(-90 11 ${(T + H - B) / 2})`}>Capability ↑</text>
        {limitX != null && limitX > L && limitX < W - R && <g data-bh-jev-bubble-limit>
          <line x1={limitX} x2={limitX} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="4 4" />
          <text x={limitX + 4} y={T + 10} fill="var(--muted)" fontSize="10">2× {referenceName} cost</text>
        </g>}
        {drawOrder.map(({ p, cx, cy, r }) => <circle key={p.key} cx={cx} cy={cy} r={r}
          fill={colour(p.cls)} fillOpacity={p.inClass ? 0.85 : 0.18} stroke={p.inClass ? 'var(--surface)' : colour(p.cls)} strokeWidth={p.isReference ? 2.5 : 1.25}
          tabIndex={0} role="button" aria-label={`${p.name}: Capability ${one(p.capability)}`} data-bh-jev-bubble-point={p.key}
          onFocus={() => setActive(p.key)} onBlur={() => { if (!pinned) setActive(null); }} />)}
        {labels.map((l) => <g key={`l${l.key}`} data-bh-jev-bubble-label={l.key} pointerEvents="none">
          {l.far && <line x1={l.lx} y1={l.ly} x2={l.x} y2={l.y} stroke="var(--muted)" strokeWidth="0.75" />}
          <text x={l.x} y={l.y + 4} textAnchor={l.anchor} fontSize={narrow ? 10.5 : 11.5} fontWeight="600" fill="var(--text)" stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">{l.text}</text>
        </g>)}
        {activeDot && <circle cx={activeDot.cx} cy={activeDot.cy} r={activeDot.r + 3} fill="none" stroke="var(--text)" strokeWidth="1.5" pointerEvents="none" />}
      </svg>
      {activeDot && <div role="tooltip" className="bh-jev-bubble-tip" data-bh-jev-bubble-tooltip={activeDot.p.key}
        style={{ left: Math.max(4, Math.min(W - 232, activeDot.cx + (activeDot.cx > W / 2 ? -236 : 14))), top: Math.max(4, Math.min(H - 150, activeDot.cy - 20)) } as CSSProperties}>
        <b className="block text-[13px] leading-tight">{activeDot.p.name}</b>
        <span className="block">Capability <b>{one(activeDot.p.capability)}</b> <span className="bh-muted">(I {one(activeDot.p.intelligence)} · C {one(activeDot.p.calibration)})</span></span>
        <span className="block">Cost {activeDot.p.cost == null ? '—' : `${usd(activeDot.p.cost)}${activeDot.p.costKind === 'estimate' ? ' est.' : ''}`} <span className="bh-muted">/ 1,000 decisions</span></span>
        <span className="block">Speed {one(activeDot.p.speed)}{activeDot.p.latency != null && <span className="bh-muted"> · median {secs(activeDot.p.latency)}</span>}</span>
        <span className="block">JevBench Score {one(activeDot.p.score)}{activeDot.p.rank != null ? <span className="bh-muted"> · official #{activeDot.p.rank}</span> : <span className="bh-muted"> · not ranked</span>}</span>
        <span className="block">{activeDot.p.inClass ? <>Jev-class{activeDot.p.classRank != null ? ` · Capability #${activeDot.p.classRank}` : ''}</> : <span className="bh-muted">Outside Jev-class: {activeDot.p.outsideBecause}</span>}</span>
      </div>}
    </div>
    <figcaption className="bh-muted mt-2 text-xs">{plotted.length} systems{omitted > 0 ? `; ${omitted} without ${kind === 'cost' ? 'a price' : 'a Speed value'} omitted` : ''}. <span className="hidden sm:inline">Hover or focus a bubble</span><span className="sm:hidden">Tap a bubble</span> for its values.</figcaption>
  </figure>;
}

export function JevBubbleCharts({ points, costLimit, referenceName }: { points: JevBubblePoint[]; costLimit: number; referenceName: string }) {
  const types = jevLegendTypes(points.map((p) => p.cls));
  return <section id="jev-bubbles" className="mt-8 scroll-mt-6" aria-labelledby="jev-bubbles-title" data-bh-jev-bubbles>
    <h2 id="jev-bubbles-title" className="text-xl font-semibold">Capability against cost and speed</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">Every measured system. Solid bubbles are Jev-class, faint ones are outside the limits; bubble size follows the official JevBench Score. The five most capable Jev-class systems are labelled.</p>
    <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
      <JevBubbleChart id="jev-bubble-cost" kind="cost" points={points} costLimit={costLimit} referenceName={referenceName} />
      <JevBubbleChart id="jev-bubble-speed" kind="speed" points={points} costLimit={costLimit} referenceName={referenceName} />
    </div>
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]" aria-label="Bubble colours and styles" data-bh-jev-bubble-legend>
      {types.map((t) => <li key={t}><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: colour(t) }} aria-hidden="true" />{JEV_TYPE_LABEL[t] ?? t}</li>)}
      <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border align-middle opacity-60" style={{ borderColor: 'var(--muted)' }} aria-hidden="true" />faint = outside Jev-class</li>
    </ul>
  </section>;
}
