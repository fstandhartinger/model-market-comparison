"use client";
// CR-84.2: accuracy against $/1k decisions. Only complete runs (one evaluated set) are peers here; a route with no
// per-token tariff sits in its own band at the left with a hollow marker instead of being drawn at $0.
import { useLayoutEffect, useRef, useState } from "react";
import type { JevRow } from "./types";
import { pct, usd } from "./format";

export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el); setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

type Box = { x: number; y: number; w: number; h: number };
const hit = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const MONEY_TICKS = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2];

/** Greedy label placement: eight slots around the point, then up to three rows further out; a label that fits nowhere is dropped (F-67). */
export function placeLabels(pts: { x: number; y: number; text: string }[], bounds: Box, obstacles: Box[], font = 12) {
  const placed: Box[] = [];
  const cw = font * 0.58, h = font + 2, r = 7;
  return pts.map((p) => {
    const w = p.text.length * cw;
    const slots: [number, number, "start" | "end" | "middle"][] = [
      [r, -h / 2, "start"], [-r - w, -h / 2, "end"], [-w / 2, -r - h, "middle"], [-w / 2, r, "middle"],
      [r, -r - h + 2, "start"], [r, r - 2, "start"], [-r - w, -r - h + 2, "end"], [-r - w, r - 2, "end"],
      [r, -h * 1.9, "start"], [r, h * 0.9, "start"], [-r - w, -h * 1.9, "end"], [-r - w, h * 0.9, "end"],
      [-w / 2, -r - h * 2, "middle"], [-w / 2, r + h, "middle"], [r, -h * 2.9, "start"], [r, h * 1.9, "start"], [-r - w, -h * 2.9, "end"], [-r - w, h * 1.9, "end"],
    ];
    for (const [dx, dy, anchor] of slots) {
      const b = { x: p.x + dx, y: p.y + dy, w, h };
      if (b.x < bounds.x || b.y < bounds.y || b.x + w > bounds.x + bounds.w || b.y + h > bounds.y + bounds.h) continue;
      if (placed.some((q) => hit(b, q)) || obstacles.some((q) => hit(b, q))) continue;
      placed.push(b);
      const tx = anchor === "start" ? b.x : anchor === "end" ? b.x + w : b.x + w / 2;
      // A label moved a row or more away gets a leader line to the nearest point of its box.
      const lx = Math.min(Math.max(p.x, b.x), b.x + w), ly = Math.min(Math.max(p.y, b.y), b.y + h);
      return { tx, ty: b.y + h - 3, anchor, far: Math.abs(dy) > h, lx, ly };
    }
    return null;
  });
}

export function JevScatter({ rows, partial }: { rows: JevRow[]; partial: JevRow[] }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<string | null>(null);
  const phone = W < 520;
  const H = phone ? 320 : 440, m = { l: 44, r: 12, t: 12, b: 40 }, band = phone ? 64 : 92, gap = 14;
  const priced = rows.filter((r) => r.cost != null && r.accuracy != null);
  const free = rows.filter((r) => r.cost == null && r.accuracy != null);
  const costs = priced.map((r) => r.cost!);
  const lo = Math.max(...MONEY_TICKS.filter((t) => t <= Math.min(...costs)), 0.005), hi = Math.min(...MONEY_TICKS.filter((t) => t >= Math.max(...costs)), 2);
  const ticks = MONEY_TICKS.filter((t) => t >= lo && t <= hi);
  const yLo = Math.floor(Math.min(...rows.map((r) => r.ciLo ?? r.accuracy!)) * 10) / 10, yHi = 1;
  const x0 = m.l + band + gap, x1 = W - m.r;
  const X = (c: number) => x0 + ((Math.log10(c) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (x1 - x0);
  const Y = (a: number) => m.t + (1 - (a - yLo) / (yHi - yLo)) * (H - m.t - m.b);
  const yTicks = phone ? [yLo, Math.round(((yLo + yHi) / 2) * 100) / 100, yHi] : Array.from({ length: Math.round((yHi - yLo) / 0.1) + 1 }, (_, i) => Math.round((yLo + i * 0.1) * 100) / 100);
  const pts = [
    ...priced.map((r) => ({ r, x: X(r.cost!), y: Y(r.accuracy!), hollow: false })),
    ...free.map((r) => ({ r, x: m.l + band / 2, y: Y(r.accuracy!), hollow: true })),
  ].sort((a, b) => a.y - b.y);
  const labels = placeLabels(pts.map((p) => ({ x: p.x, y: p.y, text: p.r.short })), { x: m.l, y: 0, w: W - m.l, h: H - m.b }, pts.map((p) => ({ x: p.x - 5, y: p.y - 5, w: 10, h: 10 })), phone ? 11 : 12);
  const act = pts.find((p) => p.r.key === active);
  // min-w-0 + overflow-hidden: the measured box must not grow to fit the SVG it sizes, or it keeps the fallback width.
  return <div ref={ref} className="relative w-full min-w-0 overflow-hidden" data-bh-jev-scatter>
    <svg width={W} height={H} role="group" aria-label="Accuracy against dollars per 1,000 decisions" className="block overflow-visible">
      <rect x={m.l} y={m.t} width={band} height={H - m.t - m.b} fill="rgb(var(--line) / .18)" rx={6} />
      <text x={m.l + band / 2} y={H - m.b + 16} textAnchor="middle" fontSize={11} fill="var(--muted)">{phone ? "no" : "no per-token"}</text>
      <text x={m.l + band / 2} y={H - m.b + 29} textAnchor="middle" fontSize={11} fill="var(--muted)">tariff</text>
      {yTicks.map((t) => <g key={t}><line x1={m.l} x2={x1} y1={Y(t)} y2={Y(t)} stroke="rgb(var(--line) / .5)" strokeDasharray={t === yHi ? undefined : "2 3"} /><text x={m.l - 6} y={Y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{Math.round(t * 100)}%</text></g>)}
      {ticks.map((t, i) => <g key={t}><line x1={X(t)} x2={X(t)} y1={m.t} y2={H - m.b} stroke="rgb(var(--line) / .35)" /><text x={X(t)} y={H - m.b + 16} textAnchor={i === 0 ? "start" : "middle"} fontSize={11} fill="var(--muted)">{`$${t}`}</text></g>)}
      <text x={(x0 + x1) / 2} y={H - 4} textAnchor="middle" fontSize={11} fill="var(--muted)">$ per 1,000 decisions (log scale)</text>
      {pts.map((p, i) => {
        const L = labels[i]; const baseline = p.r.cls === "llm-baseline";
        const ci = p.r.ciLo != null && p.r.ciHi != null;
        return <g key={p.r.key} tabIndex={0} role="img" data-bh-jev-point={p.r.key}
          aria-label={`${p.r.display}: accuracy ${pct(p.r.accuracy)} (95% ${pct(p.r.ciLo)} to ${pct(p.r.ciHi)}), ${p.r.cost == null ? "no per-token tariff" : `${usd(p.r.cost)} per 1,000 decisions`}`}
          onFocus={() => setActive(p.r.key)} onBlur={() => setActive(null)} onMouseEnter={() => setActive(p.r.key)} onMouseLeave={() => setActive(null)} onClick={() => setActive((a) => (a === p.r.key ? null : p.r.key))}
          className="cursor-pointer outline-none [&:focus-visible>.ring]:opacity-100">
          {ci && <line x1={p.x} x2={p.x} y1={Y(p.r.ciHi!)} y2={Y(p.r.ciLo!)} stroke="rgb(var(--accent) / .45)" strokeWidth={2} />}
          <circle className="ring opacity-0" cx={p.x} cy={p.y} r={11} fill="none" stroke="rgb(var(--accent))" strokeWidth={2} />
          {baseline
            ? <rect x={p.x - 5} y={p.y - 5} width={10} height={10} fill={p.hollow ? "var(--surface)" : "rgb(var(--accent))"} stroke="rgb(var(--accent))" strokeWidth={2} />
            : <circle cx={p.x} cy={p.y} r={5.5} fill={p.hollow ? "var(--surface)" : "rgb(var(--accent))"} stroke="rgb(var(--accent))" strokeWidth={2} />}
          <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
          {L?.far && <line x1={p.x} y1={p.y} x2={L.lx} y2={L.ly} stroke="var(--muted)" strokeWidth={1} />}
          {L && <text x={L.tx} y={L.ty} textAnchor={L.anchor} fontSize={phone ? 11 : 12} fill="var(--text)" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke" style={{ pointerEvents: "none" }}>{p.r.short}</text>}
        </g>;
      })}
    </svg>
    {act && <div role="status" className="pointer-events-none absolute z-10 w-56 rounded-lg border border-line bg-[var(--surface)] p-2 text-xs shadow-xl" style={{ left: Math.min(Math.max(act.x - 112, 0), W - 224), top: act.y > H / 2 ? act.y - 86 : act.y + 16 }}>
      <b>{act.r.display}</b><br />Accuracy {pct(act.r.accuracy)} <span className="text-gray-500">(95% {pct(act.r.ciLo)}–{pct(act.r.ciHi)})</span><br />{act.r.cost == null ? `No per-token tariff — ${act.r.costReason}` : `${usd(act.r.cost)} per 1,000 decisions`}
    </div>}
    <p className="mt-1 text-xs text-gray-500">● Jev and open rebuilds · ■ instruction-model baselines · hollow = no per-token tariff (not $0) · bars = 95% interval.{partial.length > 0 && <> {partial.map((r) => r.short).join(", ")} stopped early ({partial.map((r) => `${r.nAttempted}/${r.nPlanned}`).join(", ")}) and is left out: a different set of decisions is not a peer.</>}</p>
  </div>;
}
