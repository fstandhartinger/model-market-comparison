"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { SLIDER_MAX, costToSlider, logPosition, nearestHitId, pickChart, sliderToCost } from "../lib/pick-chart.mjs";
import { formatValue } from "../lib/benchmark-matrix.mjs";
import { seriesColor, seriesLetter } from "./BenchmarkBars";

type Candidate = { id: string; display_name: string; org: string; scores: Record<string, number | null | undefined>; cost: number | null };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const money = (v: number) => formatValue(v, "USD");
/** Axis ticks are round numbers (1 and 3 × 10ⁿ): no trailing ".00". */
const tickMoney = (v: number) => `$${Number(v.toPrecision(2)).toLocaleString("en-US")}`;

/** CR-2.2: pick compared models straight from score vs adjusted cost. The global filters decide the
 *  candidates; the two sliders narrow them; a click or tap on a point adds or removes its column. */
export function PickFromChart({ candidates, score, scoreLabel, ids, onToggle, max, nameOf }: {
  candidates: Candidate[]; score: string; scoreLabel: string; ids: string[]; onToggle: (id: string) => void; max: number; nameOf: (id: string) => string;
}) {
  const [minScore, setMinScore] = useState<number | null>(null);
  const [maxCost, setMaxCost] = useState<number | null>(null);
  const [wrap, width] = useWidth<HTMLDivElement>();
  const chart = useMemo(() => pickChart(candidates, score, { minScore, maxCost }), [candidates, score, minScore, maxCost]);
  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  // A new score is a new scale.
  useEffect(() => { setMinScore(null); }, [score]);

  const narrow = width > 0 && width < 560;
  const H = narrow ? 260 : 320, M = { l: narrow ? 34 : 44, r: 14, t: 14, b: 34 };
  const pw = Math.max(0, width - M.l - M.r), ph = H - M.t - M.b;
  const X = (x: number) => M.l + logPosition(x, chart.xDomain) * pw;
  const Y = (y: number) => M.t + (1 - (y - chart.yDomain[0]) / (chart.yDomain[1] - chart.yDomain[0])) * ph;
  const passing = chart.points.filter((p) => p.pass).length;
  const frontier = chart.frontier.map((id) => chart.points.find((p) => p.id === id)!).filter(Boolean);
  const full = ids.length >= max;
  const selectedIndex = new Map(ids.map((id, j) => [id, j]));
  // Unselected first, selected on top (in column order), so a chosen model is never hidden.
  const ordered = [...chart.points].sort((a, b) => (selectedIndex.has(a.id) ? 1 : 0) - (selectedIndex.has(b.id) ? 1 : 0) || (selectedIndex.get(a.id) ?? 0) - (selectedIndex.get(b.id) ?? 0));
  const xTicks = narrow ? chart.xTicks.filter((_, i) => i % 2 === 0) : chart.xTicks;
  const hitR = narrow ? 14 : 10;
  // Tap resolution: among the (possibly overlapping) hit areas containing the tap, the point whose
  // centre is nearest the tap wins — a selected neighbour drawn on top can no longer swallow it.
  const onSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const coord = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const id = nearestHitId(chart.points.map((p) => ({ id: p.id, x: X(p.x), y: Y(p.y) })), coord, hitR);
    if (id == null) return;
    const selected = selectedIndex.has(id);
    if (!selected && full) return;
    onToggle(id);
  };

  return <div className="bh-pick space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="flex items-baseline justify-between gap-2"><span>Minimum {scoreLabel}</span><span className="tabular font-semibold">{minScore == null ? "any" : formatValue(minScore, "points")}</span></span>
        <input type="range" className="mt-1 w-full" aria-label={`Minimum ${scoreLabel} for chart candidates`}
          min={Math.floor(chart.scoreRange[0])} max={Math.ceil(chart.scoreRange[1])} step={1}
          value={minScore ?? Math.floor(chart.scoreRange[0])} onChange={(e) => { const v = Number(e.target.value); setMinScore(v <= Math.floor(chart.scoreRange[0]) ? null : v); }} />
      </label>
      <label className="block text-sm">
        <span className="flex items-baseline justify-between gap-2"><span>Maximum adjusted cost / task</span><span className="tabular font-semibold">{maxCost == null ? "no limit" : money(maxCost)}</span></span>
        <input type="range" className="mt-1 w-full" aria-label="Maximum adjusted cost per task for chart candidates"
          min={0} max={SLIDER_MAX} step={1} value={costToSlider(maxCost, chart.costRange)} onChange={(e) => setMaxCost(sliderToCost(Number(e.target.value), chart.costRange))} />
      </label>
    </div>
    <p className="bh-muted text-xs" role="status">
      <span className="tabular font-semibold text-[color:var(--text)]">{passing}</span> of {chart.points.length} priced candidates within the limits
      {chart.unpriced > 0 && <> · {chart.unpriced} without a price are not plotted</>}
      {" · "}{full ? `${max} of ${max} columns — remove one to add another` : "click or tap a point to add or remove it"}
    </p>
    <div ref={wrap} style={{ height: H }} className="relative w-full">
      {width > 0 && <svg width={width} height={H} role="group" aria-label={`${scoreLabel} against adjusted cost per task, log scale. ${ids.length} models selected.`} className="block overflow-visible" onClick={onSvgClick}>
        {chart.yTicks.map((t) => <g key={`y${t}`}><line x1={M.l} x2={M.l + pw} y1={Y(t)} y2={Y(t)} stroke="rgb(var(--line))" strokeOpacity={0.5} /><text x={M.l - 6} y={Y(t) + 3} textAnchor="end" fontSize={10} fill="var(--muted)">{t}</text></g>)}
        {xTicks.map((t) => <g key={`x${t}`}><line x1={X(t)} x2={X(t)} y1={M.t} y2={M.t + ph} stroke="rgb(var(--line))" strokeOpacity={0.35} /><text x={X(t)} y={H - M.b + 14} textAnchor="middle" fontSize={10} fill="var(--muted)">{tickMoney(t)}</text></g>)}
        <text x={M.l + pw} y={H - 4} textAnchor="end" fontSize={10} fill="var(--muted)">Adjusted cost / task · log scale · cheaper ←</text>
        {frontier.length > 1 && <polyline points={frontier.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")} fill="none" stroke="rgb(var(--accent2))" strokeWidth={2} strokeLinejoin="round" />}
        {ordered.map((p) => {
          const j = selectedIndex.get(p.id), selected = j != null, c = byId.get(p.id);
          const disabled = !selected && full;
          const label = `${nameOf(p.id)} (${c?.org ?? ""}): ${scoreLabel} ${formatValue(p.y, "points")}, ${p.free ? "free route" : money(p.cost)} per task${selected ? `, column ${seriesLetter(j)} — press to remove` : disabled ? " — columns full" : " — press to add"}`;
          return <g key={p.id} role="button" tabIndex={p.pass || selected ? 0 : -1} aria-pressed={selected} aria-disabled={disabled || undefined} aria-label={label}
            className="bh-pick-point" data-id={p.id} data-selected={selected || undefined} data-pass={p.pass || undefined}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !disabled) { e.preventDefault(); onToggle(p.id); } }}>
            <title>{label}</title>
            <circle cx={X(p.x)} cy={Y(p.y)} r={hitR} fill="transparent" />
            {selected
              ? <><circle cx={X(p.x)} cy={Y(p.y)} r={7} fill={seriesColor(j)} stroke="var(--surface)" strokeWidth={2} />
                  <text x={X(p.x) + 10} y={Y(p.y) - 8} fontSize={11} fontWeight={700} fill="var(--text)" paintOrder="stroke" stroke="var(--surface)" strokeWidth={3}>{seriesLetter(j)}</text></>
              : <circle cx={X(p.x)} cy={Y(p.y)} r={4} fill="rgb(var(--accent))" fillOpacity={p.pass ? 0.55 : 0.12} stroke="var(--surface)" strokeWidth={1.5} />}
          </g>;
        })}
      </svg>}
    </div>
    <p className="bh-muted text-xs">Candidates are the models your filters allow, at their cheapest adjusted cost within those filters. The green line joins the models no other candidate beats on both score and cost. Lettered points are the table&apos;s columns.</p>
  </div>;
}
