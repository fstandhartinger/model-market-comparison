"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { JEV_TYPE_LABEL, jevLegendTypes, jevTypeVarName } from './jevTypes';
import { speedFromLatency } from '../lib/jevbench-jev-class.mjs';

// Florian 25 Sep 2026: right under the Capability ranking, two bubble charts — Capability vs cost and Capability vs
// speed. Hover, focus or tap a bubble for its name and values; the top five Jev-class systems carry permanent labels.
// The chart draws at its real pixel width, so labels stay readable on a phone instead of shrinking with a viewBox.

export type JevBubblePoint = {
  key: string; name: string; cls: string; rank: number | null; ranked: boolean;
  capability: number; intelligence: number | null; calibration: number | null;
  cost: number | null; costKind: string; speed: number | null; latency: number | null; medianSpeed: number | null; score: number | null;
  inClass: boolean; classRank: number | null; isReference: boolean; outsideBecause: string | null;
};

type Kind = 'cost' | 'speed';
type View = { zoom: number; panX: number; panY: number };
const RESET_VIEW: View = { zoom: 1, panX: 0, panY: 0 };
const LABELLED = 5;
const one = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));
const usd = (v: number) => (v === 0 ? 'Free' : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toPrecision(2)}`);
const secs = (v: number) => (v >= 1 ? `${v.toFixed(v >= 10 ? 0 : 1)} s` : `${Math.round(v * 1000)} ms`);
const colour = (cls: string) => `rgb(var(${jevTypeVarName(cls)}))`;
// Speed = 100 − 20 log10(t / 0.1 s), with t the geometric mean of p50 and p95 latency: the axis is a log latency scale.
const speedToSeconds = (speed: number) => 0.1 * 10 ** ((100 - speed) / 20);

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
type Seg = { x1: number; y1: number; x2: number; y2: number };
// Proper segment crossing (shared endpoints and collinear touches do not count), the same test the
// F-205 verifier runs on the rendered leader lines.
const side = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
const segCross = (p: Seg, q: Seg) => {
  const d1 = side(p.x1, p.y1, p.x2, p.y2, q.x1, q.y1), d2 = side(p.x1, p.y1, p.x2, p.y2, q.x2, q.y2);
  const d3 = side(q.x1, q.y1, q.x2, q.y2, p.x1, p.y1), d4 = side(q.x1, q.y1, q.x2, q.y2, p.x2, p.y2);
  return d1 !== d2 && d3 !== d4 && d1 !== 0 && d3 !== 0;
};

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

export function JevBubbleChart({ id, kind, points, costLimit, referenceName, active, setActive, pinned, setPinned, expanded, setExpanded }: {
  id: string; kind: Kind; points: JevBubblePoint[]; costLimit: number; referenceName: string;
  active: string | null; setActive: (key: string | null) => void; pinned: boolean; setPinned: (value: boolean) => void;
  expanded: boolean; setExpanded: (value: boolean) => void;
}) {
  const { ref, width: W } = useWidth(520);
  const [viewportHeight, setViewportHeight] = useState(700);
  // F-205 reads "under 640 px" as the viewport, not the chart: at 1440 the two-up grid gives each chart about
  // 625 px, and the directive keeps the 1440 placement as it is. 1440 is the pre-measurement default so the
  // desktop path renders first and no column flashes before the first measurement.
  const [viewportWidth, setViewportWidth] = useState(1440);
  useEffect(() => {
    const update = () => { setViewportHeight(window.innerHeight); setViewportWidth(window.innerWidth); };
    update(); window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const narrow = W < 440;
  const H = expanded ? Math.max(360, Math.min(900, viewportHeight - 210)) : Math.round(Math.max(300, Math.min(460, W * (narrow ? 0.95 : 0.72))));
  const L = narrow ? 38 : 48, R = kind === 'speed' ? 24 : 12, T = 30, B = narrow ? 50 : 46;
  const [view, setView] = useState<View>(RESET_VIEW);
  const expandButton = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; moved: boolean; distance: number | null } | null>(null);
  useEffect(() => {
    if (!expanded) { setView(RESET_VIEW); return; }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', escape); };
  }, [expanded, setExpanded]);

  const plotted = useMemo(() => points.filter((p) => (kind === 'cost' ? p.cost != null && p.cost > 0 : p.speed != null)), [points, kind]);
  const omitted = points.length - plotted.length;
  const reference = points.find((p) => p.isReference);
  // CR-176.3: the Speed axis in this chart is the median-latency Speed (the adjusted p50 the Jev-class gate
  // uses), not the published composite Speed axis (a p50/p95 blend). A row with median ≪ 2× Jev but p95 ≫ p50
  // passes the p50 gate yet scores low on the blend, so plotting the blend puts it on the wrong side of the line.
  // Plotting, the gate and the line all use the one median definition now; v1.3 carryovers with no recorded
  // median fall back to the composite Speed axis, exactly as the Jev-class rule does.
  const plotSpeed = (p: JevBubblePoint) => (p.medianSpeed != null ? p.medianSpeed : (p.speed as number));
  const latencyLimit = reference != null ? (reference.latency != null ? speedFromLatency(2 * reference.latency) : (reference.speed != null ? reference.speed - 20 * Math.log10(2) : null)) : null;
  const xValue = (p: JevBubblePoint) => (kind === 'cost' ? Math.log10(p.cost as number) : plotSpeed(p));
  const [xMin, xMax] = useMemo(() => {
    const xs = plotted.map(xValue);
    if (kind === 'cost') {
      if (costLimit > 0) xs.push(Math.log10(costLimit));
      return [Math.floor((Math.min(...xs) - 0.1) * 2) / 2, Math.ceil((Math.max(...xs) + 0.1) * 2) / 2];
    }
    if (latencyLimit != null) xs.push(latencyLimit);
    return [Math.max(0, Math.floor((Math.min(...xs) - 5) / 10) * 10), 100];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotted, kind, costLimit, latencyLimit]);
  const yMin = useMemo(() => Math.max(0, Math.floor(Math.min(...plotted.map((p) => p.capability)) / 10) * 10), [plotted]);
  const plotCenterX = (L + W - R) / 2, plotCenterY = (T + H - B) / 2;
  // Both charts improve toward the upper right. The cost domain stays logarithmic, with its visual direction reversed.
  const baseX = (v: number) => L + (W - L - R) * (kind === 'cost' ? (xMax - v) : (v - xMin)) / (xMax - xMin || 1);
  const baseY = (v: number) => T + (H - T - B) * (1 - (v - yMin) / (100 - yMin || 1));
  const x = (v: number) => plotCenterX + (baseX(v) - plotCenterX) * view.zoom + view.panX;
  const y = (v: number) => plotCenterY + (baseY(v) - plotCenterY) * view.zoom + view.panY;
  const radius = (p: JevBubblePoint) => 2.5 + (narrow ? 5 : 7) * Math.sqrt(Math.max(0, p.score ?? 0) / 100);

  const placed = useMemo(() => plotted.map((p) => ({ p, cx: x(xValue(p)), cy: y(p.capability), r: radius(p) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plotted, W, H, xMin, xMax, yMin, view.zoom, view.panX, view.panY]);
  // Draw the Jev-class systems last so they sit on top, and the larger bubbles first within each group.
  const drawOrder = useMemo(() => [...placed].sort((a, b) => Number(a.p.inClass) - Number(b.p.inClass) || b.r - a.r), [placed]);

  // Permanent labels: the top five Jev-class systems by Capability.
  // F-205: under 640 px the five labels are a single right-aligned column in the plot's upper half, one per row,
  // ordered top-to-bottom by their point's y, each with a straight leader to its bubble; rows are swapped until no
  // two leaders cross (at most ten swaps), and if no crossing-free placement exists only the top three are labelled.
  // At 640 px and above the greedy placement around the bubble stays, now also rejecting a crossing leader.
  const stacked = viewportWidth < 640;
  const labels = useMemo(() => {
    const leaders = placed.filter((d) => d.p.classRank != null && d.p.classRank <= LABELLED).sort((a, b) => (a.p.classRank ?? 0) - (b.p.classRank ?? 0));
    const taken: Box[] = leaders.map((d) => ({ x: d.cx - d.r, y: d.cy - d.r, w: 2 * d.r, h: 2 * d.r }));
    const drawnLeaders: Seg[] = [];
    const fs = narrow ? 10.5 : 11.5;
    const out: { key: string; text: string; x: number; y: number; anchor: 'start' | 'end'; lx: number; ly: number; far: boolean; ex?: number; ey?: number }[] = [];
    if (stacked) {
      // A row has to clear the text box the browser actually draws: the glyph cell (~1.3 em) plus the 3 px halo
      // stroke this label carries, so the pitch is fs + 9 rather than the 13 px of a bare line of text.
      const rowH = Math.round(fs + 9);
      const xEnd = W - R - 4;
      const room = Math.max(60, xEnd - (L + 16));
      const items = leaders.map((d) => {
        let text = `${d.p.classRank}. ${d.p.name}`;
        let w = text.length * fs * 0.62 + 8;
        if (w > room) {
          const keep = Math.max(6, Math.floor((room - 12) / (fs * 0.62)));
          text = `${text.slice(0, keep).trimEnd()}…`;
          w = text.length * fs * 0.62 + 8;
        }
        return { d, text, w };
      });
      const place = (chosen: typeof items) => {
        const gutter = Math.max(L + 4, xEnd - Math.max(...chosen.map((i) => i.w)) - 6);
        const top = T + 12;
        const rows = new Array<number>(chosen.length).fill(0);
        [...chosen.keys()].sort((a2, b2) => chosen[a2].d.cy - chosen[b2].d.cy).forEach((item, row) => { rows[item] = row; });
        const seg = (i: number): Seg => ({ x1: chosen[i].d.cx, y1: chosen[i].d.cy, x2: gutter, y2: top + rows[i] * rowH });
        for (let pass = 0; pass < 10; pass++) {
          let swapped = false;
          for (let i = 0; i < chosen.length && !swapped; i++) for (let j = i + 1; j < chosen.length && !swapped; j++) {
            if (!segCross(seg(i), seg(j))) continue;
            const t = rows[i]; rows[i] = rows[j]; rows[j] = t; swapped = true;
          }
          if (!swapped) break;
        }
        let crossings = 0;
        for (let i = 0; i < chosen.length; i++) for (let j = i + 1; j < chosen.length; j++) if (segCross(seg(i), seg(j))) crossings++;
        return { crossings, rows, gutter, top };
      };
      let chosen = items, laid = place(items);
      // The directive's fallback: if five cannot be placed without a crossing, label the top three.
      if (laid.crossings > 0 && items.length > 3) { chosen = items.slice(0, 3); laid = place(chosen); }
      return chosen.map((it, i) => ({
        key: it.d.p.key, text: it.text, x: xEnd, y: laid.top + laid.rows[i] * rowH, anchor: 'end' as const,
        lx: it.d.cx, ly: it.d.cy, far: true, ex: laid.gutter, ey: laid.top + laid.rows[i] * rowH,
      }));
    }
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
        const leader: Seg = { x1: d.cx, y1: d.cy, x2: c[0], y2: c[1] };
        if (drawnLeaders.some((other) => segCross(leader, other))) continue;
        const covered = placed.filter((o) => o.p.key !== d.p.key && overlaps(box, { x: o.cx - o.r, y: o.cy - o.r, w: 2 * o.r, h: 2 * o.r })).length;
        const cost = covered * 40 + Math.hypot(c[0] - d.cx, c[1] - d.cy);
        if (cost < best) { best = cost; chosen = c; }
      }
      if (chosen) { taken.push({ x: chosen[2] === 'start' ? chosen[0] : chosen[0] - w, y: chosen[1] - h / 2, w, h }); drawnLeaders.push({ x1: d.cx, y1: d.cy, x2: chosen[0], y2: chosen[1] }); }
      const c = chosen ?? candidates[0];
      out.push({ key: d.p.key, text, x: c[0], y: c[1], anchor: c[2], lx: d.cx, ly: d.cy, far: Math.hypot(c[0] - d.cx, c[1] - d.cy) > pad + 2 });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, narrow, stacked, W, H, L, R, T, B]);

  const nearest = (clientX: number, clientY: number, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    const px = clientX - rect.left, py = clientY - rect.top;
    let best: string | null = null, bestD = Infinity;
    for (const d of placed) {
      if (d.cx < L || d.cx > W - R || d.cy < T || d.cy > H - B) continue;
      const dist = Math.hypot(d.cx - px, d.cy - py) - d.r;
      if (dist < bestD) { bestD = dist; best = d.p.key; }
    }
    return bestD <= 14 ? best : null;
  };

  const select = (key: string | null) => { setActive(key); setPinned(key != null); };
  const zoomAt = useCallback((factor: number, atX: number, atY: number) => setView((old) => {
    const zoom = Math.max(1, Math.min(8, old.zoom * factor));
    const ratio = zoom / old.zoom;
    return { zoom, panX: (atX - plotCenterX) - (atX - plotCenterX - old.panX) * ratio,
      panY: (atY - plotCenterY) - (atY - plotCenterY - old.panY) * ratio };
  }), [plotCenterX, plotCenterY]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!expanded || !svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.001), event.clientX - rect.left, event.clientY - rect.top);
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [expanded, zoomAt]);
  const pointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size === 1) gesture.current = { ...point, moved: false, distance: null };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { ...point, moved: true, distance: Math.hypot(a.x - b.x, a.y - b.y) };
    }
  };
  const pointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && pointers.current.size === 0 && !pinned) setActive(nearest(event.clientX, event.clientY, event.currentTarget));
    const old = pointers.current.get(event.pointerId);
    if (!old) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    pointers.current.set(event.pointerId, point);
    if (!expanded) return;
    if (Math.hypot(point.x - (gesture.current?.x ?? point.x), point.y - (gesture.current?.y ?? point.y)) > 4) {
      if (gesture.current) gesture.current.moved = true;
    }
    if (pointers.current.size === 1) {
      const dx = point.x - old.x, dy = point.y - old.y;
      if (dx || dy) setView((current) => ({ ...current, panX: current.panX + dx, panY: current.panY + dy }));
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current?.distance && distance > 0) zoomAt(distance / gesture.current.distance, (a.x + b.x) / 2, (a.y + b.y) / 2);
      if (gesture.current) gesture.current.distance = distance;
    }
  };
  const pointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const moved = gesture.current?.moved;
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    if (!moved && pointers.current.size === 0) select(nearest(event.clientX, event.clientY, event.currentTarget));
  };

  const activeDot = placed.find((d) => d.p.key === active) ?? null;
  // CR-176.1/.2: the dashed limit line's caption sits on the LEFT of the line, with small direction arrows
  // across the top of the chart explaining which side is which. On a phone a short caption is used so it
  // stays left of the line without crossing the axis.
  const separator = (value: number | null, marker: string, fullLabel: string, shortLabel: string, leftArrow: string, rightArrow: string) => {
    if (value == null || value <= L || value >= W - R) return null;
    const widthOf = (text: string) => text.length * (narrow ? 5.2 : 6) + 4;
    const label = value - 5 - widthOf(fullLabel) >= L ? fullLabel : shortLabel;
    const hborder = 4;
    return <g data-bh-jev-separator={marker} {...(marker === 'cost' ? { 'data-bh-jev-bubble-limit': '' } : { 'data-bh-jev-bubble-latency-limit': '' })}>
      <line x1={value} x2={value} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="4 4" />
      <text x={Math.max(hborder, value - 5)} y={T + 25} textAnchor="end" fill="var(--muted)" fontSize="10"
        stroke="var(--surface)" strokeWidth="3" paintOrder="stroke" data-bh-jev-separator-label>{label}</text>
      {value - 6 - widthOf(leftArrow) >= hborder ? <text x={value - 6} y={T - 9} textAnchor="end" fill="var(--muted)" fontSize="10">{leftArrow}</text>
        : value - 6 >= hborder ? <text x={value - 4} y={T - 9} textAnchor="end" fill="var(--muted)" fontSize="10">←</text> : null}
      {value + 6 + widthOf(rightArrow) <= W - hborder ? <text x={value + 6} y={T - 9} textAnchor="start" fill="var(--muted)" fontSize="10">{rightArrow}</text>
        : value + 6 <= W - hborder ? <text x={value + 4} y={T - 9} textAnchor="start" fill="var(--muted)" fontSize="10">→</text> : null}
    </g>;
  };
  const xTicks: { v: number; label: string; sub?: string }[] = kind === 'cost'
    ? Array.from({ length: Math.floor(xMax) - Math.ceil(xMin) + 1 }, (_, i) => Math.ceil(xMin) + i).map((e) => ({ v: e, label: usd(10 ** e) }))
    : Array.from({ length: Math.floor((xMax - xMin) / 10) + 1 }, (_, i) => xMin + 10 * i).filter((v, i, all) => !narrow || i % 2 === 0 || i === all.length - 1).map((v) => ({ v, label: String(v), sub: `≈${secs(speedToSeconds(v))}` }));
  const yTicks = Array.from({ length: Math.floor((100 - yMin) / 10) + 1 }, (_, i) => yMin + 10 * i);
  const limitX = kind === 'cost' && costLimit > 0 ? x(Math.log10(costLimit)) : null;
  // Doubling the latency represented by the logarithmic Speed score moves it down by 20 log10(2) points.
  const latencyLimitX = kind === 'speed' && latencyLimit != null ? x(latencyLimit) : null;
  const title = kind === 'cost' ? 'Capability vs cost' : 'Capability vs speed';
  const hint = kind === 'cost' ? 'Upper right is best: more capable and cheaper.' : 'Upper right is best: more capable and faster.';

  return <figure className={`bh-panel min-w-0 p-4 sm:p-5 ${expanded ? 'fixed inset-0 z-[100] overflow-y-auto rounded-none' : ''}`}
    style={expanded ? { background: 'var(--surface)' } : undefined} data-bh-jev-bubble={kind} data-bh-expanded={expanded} aria-labelledby={`${id}-title`}
    role={expanded ? 'dialog' : undefined} aria-modal={expanded ? true : undefined}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 id={`${id}-title`} className="text-lg font-semibold">{title}</h3>
      <div className="flex gap-2">
        {expanded && <button type="button" className="bh-jev-preset" onClick={() => setView(RESET_VIEW)} data-bh-jev-bubble-reset>Reset view</button>}
        <button ref={expandButton} type="button" className="bh-jev-preset" data-bh-jev-bubble-expand
          onClick={() => { setExpanded(!expanded); if (expanded) requestAnimationFrame(() => expandButton.current?.focus()); }}>
          {expanded ? 'Close fullscreen' : 'Expand / Show fullscreen'}
        </button>
      </div>
    </div>
    <p className="bh-muted mt-1 text-sm">{hint} {kind === 'cost' ? 'Cost is USD per 1,000 decisions on a log scale. The dashed line is 2× Jev’s cost.' : 'Speed here is the median-latency speed — the same adjusted median (p50) latency the Jev-class limit uses — a log scale, so each 20 points is 10× faster (median under the numbers). The dashed line is 2× Jev’s median latency.'}</p>
    {expanded && <p className="bh-muted mt-1 text-xs">Wheel or pinch to zoom. Drag to pan. Use Reset view to return to the full chart.</p>}
    <div ref={ref} className="relative mt-3 w-full" onPointerLeave={(e) => { if (e.pointerType === 'mouse' && !pinned && pointers.current.size === 0) setActive(null); }}>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={`block select-none ${expanded ? 'cursor-grab touch-none active:cursor-grabbing' : 'touch-manipulation'}`}
        role="img" aria-labelledby={`${id}-svg-title`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
        onPointerCancel={(e) => { pointers.current.delete(e.pointerId); gesture.current = null; }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setActive(null); setPinned(false); } }}>
        <title id={`${id}-svg-title`}>{`${title}: ${plotted.length} systems. ${hint}`}</title>
        <defs>
          <linearGradient id={`${id}-quadrant`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" className="bh-quadrant-from" /><stop offset="1" className="bh-quadrant-to" />
          </linearGradient>
          <clipPath id={`${id}-plot-clip`}><rect x={L} y={T} width={W - L - R} height={H - T - B} /></clipPath>
        </defs>
        <g className="bh-quadrant" aria-hidden="true">
          <rect x={plotCenterX} y={T} width={W - R - plotCenterX} height={plotCenterY - T} fill={`url(#${id}-quadrant)`} pointerEvents="none" />
          <text x={W - R - 6} y={T - 9} textAnchor="end" fontSize="10" className="bh-quadrant-note">Most attractive quadrant</text>
        </g>
        {yTicks.map((t) => <g key={`y${t}`}>
          {y(t) >= T && y(t) <= H - B && <><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgb(var(--line) / .7)" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fill="var(--muted)" fontSize="11">{t}</text></>}
        </g>)}
        {xTicks.map((t) => <g key={`x${t.v}`}>
          {x(t.v) >= L && x(t.v) <= W - R && <><line x1={x(t.v)} x2={x(t.v)} y1={T} y2={H - B} stroke="rgb(var(--line) / .55)" />
            <text x={x(t.v)} y={H - B + 15} textAnchor="middle" fill="var(--muted)" fontSize="11">{t.label}</text>
            {t.sub && <text x={x(t.v)} y={H - B + 27} textAnchor="middle" fill="var(--muted)" fontSize="10">{t.sub}</text>}</>}
        </g>)}
        <text x={plotCenterX} y={H - 5} textAnchor="middle" fill="var(--text)" fontSize="11">{kind === 'cost' ? '$ per 1,000 decisions (log)' : 'Median-latency speed'}</text>
        <text x={11} y={plotCenterY + 7} textAnchor="middle" fill="var(--text)" fontSize="11" transform={`rotate(-90 11 ${plotCenterY + 7})`}>Capability</text>
        <text x={11} y={plotCenterY - 39} textAnchor="middle" fill="var(--text)" fontSize="13" aria-label="Capability up">↑</text>
        {separator(limitX, 'cost', `2× ${referenceName} cost`, `2× ${referenceName}`, '← pricier', 'cheaper →')}
        {separator(latencyLimitX, 'latency', `2× ${referenceName} latency`, `2× ${referenceName}`, '← slower', 'faster →')}
        <g clipPath={`url(#${id}-plot-clip)`}>{drawOrder.map(({ p, cx, cy, r }) => <circle key={p.key} cx={cx} cy={cy} r={r}
          fill={colour(p.cls)} fillOpacity={p.inClass ? 0.85 : 0.18} stroke={p.inClass ? 'var(--surface)' : colour(p.cls)} strokeWidth={p.isReference ? 2.5 : 1.25}
          tabIndex={0} role="button" aria-label={`${p.name}: Capability ${one(p.capability)}`} data-bh-jev-bubble-point={p.key} data-bh-highlighted={active === p.key}
          onFocus={() => setActive(p.key)} onBlur={() => { if (!pinned) setActive(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(p.key); } }} />)}
        {labels.map((l) => <g key={`l${l.key}`} data-bh-jev-bubble-label={l.key} pointerEvents="none">
          {l.far && <line x1={l.lx} y1={l.ly} x2={l.ex ?? l.x} y2={l.ey ?? l.y} stroke="var(--muted)" strokeWidth="0.75" />}
          <text x={l.x} y={l.y + 4} textAnchor={l.anchor} fontSize={narrow ? 10.5 : 11.5} fontWeight="600" fill="var(--text)" stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">{l.text}</text>
        </g>)}
        {activeDot && <circle cx={activeDot.cx} cy={activeDot.cy} r={activeDot.r + 3} fill="none" stroke="var(--text)" strokeWidth="1.5" pointerEvents="none" />}</g>
      </svg>
      {activeDot && activeDot.cx >= L && activeDot.cx <= W - R && activeDot.cy >= T && activeDot.cy <= H - B && <div role="tooltip" className="bh-jev-bubble-tip" data-bh-jev-bubble-tooltip={activeDot.p.key}
        style={{ left: Math.max(4, Math.min(W - 232, activeDot.cx + (activeDot.cx > W / 2 ? -236 : 14))), top: Math.max(4, Math.min(H - 150, activeDot.cy - 20)) } as CSSProperties}>
        <b className="block text-[13px] leading-tight">{activeDot.p.name}</b>
        <span className="block">Capability <b>{one(activeDot.p.capability)}</b> <span className="bh-muted">(I {one(activeDot.p.intelligence)} · C {one(activeDot.p.calibration)})</span></span>
        <span className="block">Cost {activeDot.p.cost == null ? '—' : `${usd(activeDot.p.cost)}${activeDot.p.costKind === 'estimate' ? ' est.' : ''}`} <span className="bh-muted">/ 1,000 decisions</span></span>
        <span className="block">Speed {kind === 'speed' ? one(plotSpeed(activeDot.p)) : one(activeDot.p.speed)}{kind === 'speed' && activeDot.p.medianSpeed != null && <span className="bh-muted"> (median)</span>}{kind === 'speed' && activeDot.p.medianSpeed == null && <span className="bh-muted"> (Speed-axis fallback)</span>}{activeDot.p.latency != null && <span className="bh-muted"> · median {secs(activeDot.p.latency)}</span>}</span>
        <span className="block">JevBench Score {one(activeDot.p.score)}{activeDot.p.rank != null ? <span className="bh-muted"> · official #{activeDot.p.rank}</span> : <span className="bh-muted"> · not ranked</span>}</span>
        <span className="block">{activeDot.p.inClass ? <>Jev-class{activeDot.p.classRank != null ? ` · Capability #${activeDot.p.classRank}` : ''}</> : <span className="bh-muted">Outside Jev-class: {activeDot.p.outsideBecause}</span>}</span>
      </div>}
    </div>
    <figcaption className="bh-muted mt-2 text-xs">{plotted.length} systems{omitted > 0 ? `; ${omitted} without ${kind === 'cost' ? 'a price' : 'a Speed value'} omitted` : ''}. <span className="hidden sm:inline">Hover or focus a bubble</span><span className="sm:hidden">Tap a bubble</span> for its values.</figcaption>
  </figure>;
}

export function JevBubbleCharts({ points, costLimit, referenceName }: { points: JevBubblePoint[]; costLimit: number; referenceName: string }) {
  const [showOutside, setShowOutside] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [expandedKind, setExpandedKind] = useState<Kind | null>(null);
  const visible = useMemo(() => showOutside ? points : points.filter((p) => p.inClass), [points, showOutside]);
  const types = jevLegendTypes(points.map((p) => p.cls));
  return <section id="jev-bubbles" className="mt-8 scroll-mt-6" aria-labelledby="jev-bubbles-title" data-bh-jev-bubbles>
    <h2 id="jev-bubbles-title" className="text-xl font-semibold">Capability against cost and speed</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">Jev-class systems are shown by default. Bubble size follows the official JevBench Score. The five most capable Jev-class systems are labelled.</p>
    <label className="mt-3 flex min-h-10 w-fit cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={showOutside} onChange={(e) => { setShowOutside(e.target.checked); setActive(null); setPinned(false); }} data-bh-jev-bubble-show-outside />
      Show models that don&apos;t qualify as Jev-class
    </label>
    <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
      <JevBubbleChart id="jev-bubble-cost" kind="cost" points={visible} costLimit={costLimit} referenceName={referenceName}
        active={active} setActive={setActive} pinned={pinned} setPinned={setPinned} expanded={expandedKind === 'cost'} setExpanded={(value) => setExpandedKind(value ? 'cost' : null)} />
      <JevBubbleChart id="jev-bubble-speed" kind="speed" points={visible} costLimit={costLimit} referenceName={referenceName}
        active={active} setActive={setActive} pinned={pinned} setPinned={setPinned} expanded={expandedKind === 'speed'} setExpanded={(value) => setExpandedKind(value ? 'speed' : null)} />
    </div>
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]" aria-label="Bubble colours and styles" data-bh-jev-bubble-legend>
      {types.map((t) => <li key={t}><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: colour(t) }} aria-hidden="true" />{JEV_TYPE_LABEL[t] ?? t}</li>)}
      <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border align-middle opacity-60" style={{ borderColor: 'var(--muted)' }} aria-hidden="true" />faint = outside Jev-class</li>
    </ul>
  </section>;
}
