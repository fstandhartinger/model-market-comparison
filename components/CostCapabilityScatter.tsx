"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Customized,
} from "recharts";
import { hasScoreEvidence, type ClientData, type ClientModel } from "../lib/client-model";
import { SCORE_SHORT_LABELS } from "../lib/types";
import { scoreChartLabel } from "../lib/score-label";
import { orgColor } from "../lib/format";
import { modelPrice, createOfferScope, priceLabel, type PriceResult, type PriceSettings } from "../lib/cost";
import { Toggle } from "./ui";
import { PriceValue, PriceAssumptions, priceNumber } from "./PriceValue";
import { useSettings } from "./SettingsContext";
import { preferredVariantIds, collapseModels, collapsedName, selectableModels } from "../lib/variants";
import { paretoFrontier } from "../lib/pareto.mjs";

function PointShape(props: { cx?: number; cy?: number; fill?: string; payload?: { open?: boolean } }) {
  const { cx, cy, fill, payload } = props;
  if (cx == null || cy == null) return <g />;
  if (payload?.open) return <rect x={cx - 4.5} y={cy - 4.5} width={9} height={9} fill={fill} stroke="#0e1116" strokeWidth={0.5} />;
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#0e1116" strokeWidth={0.5} />;
}

// Halo ring drawn under Pareto-frontier members (the colored point sits on top).
function ParetoHalo(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return <g />;
  return <circle cx={cx} cy={cy} r={9} fill="none" stroke="#7ee0c0" strokeWidth={1.5} opacity={0.7} />;
}

// F-17: dots only — names are placed by <PointLabels>, which can see every label at once.
function CompactPointShape(props: { cx?: number; cy?: number; payload?: { pass: boolean } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return <g />;
  return <circle cx={cx} cy={cy} r={payload?.pass ? 5 : 4} fill="rgb(var(--accent))" opacity={payload?.pass ? 1 : 0.25} stroke="rgb(var(--ink))" strokeWidth={1} />;
}

/** Phones (below Tailwind's `sm`, 640 px): the compact map switches to its small fixed scale. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

/** F-17: round Y ticks (multiples of 5, or 10 on a wide range) from a floor up to `max`. */
function niceTicks(min: number, max: number): { domain: [number, number]; ticks: number[] } {
  const step = max - min > 25 ? 10 : 5;
  const lo = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= max; v += step) ticks.push(v);
  return { domain: [lo, max], ticks };
}

type LabelPoint = { x: number; y: number; name: string; id: string };
type AxisMap = Record<string, { scale: (v: number) => number }>;

/** F-17: greedy, collision-free point labels. `labels` arrive in priority order (frontier
 *  first, then by score). Each tries right of its dot, then above, below and left; a label
 *  that would leave the plot, overlap a placed label or cover another dot is dropped and
 *  the dot stays. On a narrow plot (phones) only frontier members are named. */
function PointLabels(props: { xAxisMap?: AxisMap; yAxisMap?: AxisMap; offset?: { left: number; top: number; width: number; height: number }; labels: LabelPoint[]; dots: { x: number; y: number }[]; frontier: Set<string> }) {
  const xAxis = props.xAxisMap && Object.values(props.xAxisMap)[0];
  const yAxis = props.yAxisMap && Object.values(props.yAxisMap)[0];
  const o = props.offset;
  if (!xAxis || !yAxis || !o) return null;
  const narrow = o.width < 400;
  const LINE = 12, GLYPH = 6, MAX = 12;
  const dots = props.dots.map((d) => ({ cx: xAxis.scale(d.x), cy: yAxis.scale(d.y) }));
  const placed: { l: number; t: number; r: number; b: number }[] = [];
  const out: { key: string; x: number; y: number; text: string }[] = [];
  for (const p of props.labels) {
    if (out.length >= MAX) break;
    if (narrow && !props.frontier.has(p.id)) continue;
    const text = p.name.length > 22 ? `${p.name.slice(0, 21)}…` : p.name;
    if (!text) continue;
    const cx = xAxis.scale(p.x), cy = yAxis.scale(p.y), w = text.length * GLYPH;
    const slots = [
      { l: cx + 8, t: cy - LINE / 2 },
      { l: cx - w / 2, t: cy - 8 - LINE },
      { l: cx - w / 2, t: cy + 8 },
      { l: cx - 8 - w, t: cy - LINE / 2 },
    ];
    const slot = slots.find(({ l, t }) => {
      const r = l + w, b = t + LINE;
      if (l < o.left || r > o.left + o.width || t < o.top || b > o.top + o.height) return false;
      if (placed.some((q) => l < q.r && q.l < r && t < q.b && q.t < b)) return false;
      return !dots.some((d) => !(Math.abs(d.cx - cx) < 0.5 && Math.abs(d.cy - cy) < 0.5) && d.cx > l - 4 && d.cx < r + 4 && d.cy > t - 4 && d.cy < b + 4);
    });
    if (!slot) continue;
    placed.push({ l: slot.l, t: slot.t, r: slot.l + w, b: slot.t + LINE });
    out.push({ key: p.id, x: slot.l, y: slot.t + LINE - 2, text });
  }
  return <g className="bh-point-labels">{out.map((l) => <text key={l.key} x={l.x} y={l.y} fill="var(--text)" fontSize={10}>{l.text}</text>)}</g>;
}

/** F-26: the fixed phone scale, limited to the plotted domain so no tick sits off the plot. */
function phoneCostTicks(lo: number, hi: number): number[] {
  const inRange = [3, 1, 0.3, 0.1].filter((v) => v >= lo && v <= hi);
  return inRange.length >= 2 ? inRange : logTicks(lo, hi).slice(0, 4);
}

/** F-39: a genuinely free route keeps its place on the log axis — pinned at the left edge. */
function pinFree<T extends { x: number }>(p: T, xFloor: number): T & { free?: boolean } {
  return p.x > 0 ? p : { ...p, x: xFloor, free: true };
}

function logTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) for (const m of [1, 3]) {
    const v = m * 10 ** e;
    if (v >= min * 0.9 && v <= max * 1.1) ticks.push(v);
  }
  return ticks.length ? ticks : [min, max];
}

/** `advanced` marks the compact map when it is embedded outside Simple (Charts): it follows
 *  Advanced's score minimum and keeps a readable height on phones. */
/** `measuredOnly` (Simple): the map must plot exactly the pool the list ranks — models whose
 *  task-token usage is measured. Without it the map shows an "assumed task" point the list refuses. */
export function CostCapabilityScatter({ data, compact = false, advanced = false, guided = false, measuredOnly = false }: { data: ClientData; compact?: boolean; advanced?: boolean; guided?: boolean; measuredOnly?: boolean }) {
  const router = useRouter();
  const s = useSettings();
  const score = s.score;
  const priceSettings = useMemo<PriceSettings>(() => ({ priceMode: s.priceMode, inputWeight: s.inputWeight }), [s.priceMode, s.inputWeight]);
  const offerScope = useMemo(() => createOfferScope(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly, !s.allowDataTraining), [s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly, s.allowDataTraining]);
  const [logX, setLogX] = useState(true);
  const [showPareto, setShowPareto] = useState(true);
  const narrow = useNarrow();
  // F-39 (Fable pass 5): the map keeps its logarithmic axis everywhere. A linear axis in
  // Simple crushed the sub-$3 field — where most of the shortlist sits — into a sliver with
  // overprinted tick labels. Free routes are not dropped for it (R5.10): they are pinned at
  // the left edge and named "free".
  const logCostAxis = logX;
  // F-40: only Simple's own map reads Simple's floor and cap; Guided results and Charts read Advanced's.
  const simplePair = compact && !advanced && !guided;
  const minScore = simplePair ? s.minScoreSimple : s.advancedMinScore;
  const maxCost = simplePair ? s.simpleMaxCost : s.maxCost;
  const candidates = useMemo(() => selectableModels(data.models, s.hideDeprecated), [data.models, s.hideDeprecated]);
  const preferredId = useMemo(() => preferredVariantIds(candidates, score), [candidates, score]);

  const allPoints = useMemo(() => {
    let pool = candidates;
    if (s.collapse) pool = collapseModels(pool, preferredId);
    if (s.openOnly) pool = pool.filter((m) => m.open_weights);
    if (s.featured) pool = pool.filter((m) => m.featured);
    if (s.familySet) pool = pool.filter((m) => s.familySet!.has(m.family_key));
    if (measuredOnly && s.priceMode === "adjusted") pool = pool.filter((m) => {
      const tokens = m.token_efficiency?.aa.tokens_per_task;
      return !!tokens && !tokens.stale && Number.isFinite(tokens.value.output) && tokens.value.output > 0;
    });
    return pool
      .map((m: ClientModel) => ({ m, price: modelPrice(m, data, offerScope, priceSettings), sc: m.scores[score], hasEvidence: hasScoreEvidence(m, score) }))
      .filter((x) => x.hasEvidence && x.sc != null && x.price.value != null && (x.price.value as number) >= 0)
      .map((x) => ({ x: x.price.value as number, y: x.sc as number, price: x.price, name: collapsedName(x.m, s.collapse, preferredId), org: x.m.org, id: x.m.id, open: x.m.open_weights, z: 100,
        pass: (x.sc as number) >= minScore && (maxCost == null || (x.price.value as number) <= maxCost) }));
  }, [data, candidates, score, offerScope, priceSettings, s.collapse, s.featured, s.familySet, s.openOnly, minScore, maxCost, preferredId, measuredOnly, s.priceMode]);

  const points = useMemo(() => allPoints.filter((p) => (compact || p.pass) && (!logCostAxis || p.x > 0)), [allPoints, logCostAxis, compact]);
  const zeroCount = allPoints.filter((p) => p.x === 0).length;
  const xFloor = useMemo(() => { const pos = allPoints.filter((p) => p.x > 0).map((p) => p.x); return pos.length ? Math.min(...pos) * 0.85 : 0.1; }, [allPoints]);
  const compactPoints = useMemo(() => allPoints.map((p) => pinFree(p, xFloor)), [allPoints, xFloor]);

  const byOrg = useMemo(() => {
    const g = new Map<string, typeof points>();
    for (const p of points) { if (!g.has(p.org)) g.set(p.org, []); g.get(p.org)!.push(p); }
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [points]);

  // Pareto frontier: models not dominated on (cheaper cost, higher capability).
  // F-17: only points that pass the current limits can be on the frontier — a dimmed point
  // with a halo would contradict the dimming.
  const pareto = useMemo(() => {
    const frontier = paretoFrontier(allPoints.filter((p) => p.pass)) as typeof allPoints;
    return compact ? frontier.map((p) => pinFree(p, xFloor)) : frontier.filter((p) => !logCostAxis || p.x > 0);
  }, [allPoints, logCostAxis, compact, xFloor]);

  const xs = (compact ? compactPoints : points).map((p) => p.x);
  const xMin = xs.length ? Math.min(...xs) : 0.1;
  const xMax = xs.length ? Math.max(...xs) : 100;
  const isElo = score.startsWith("designarena");
  const ys = (compact ? compactPoints : points).map((p) => p.y);
  const yMin = ys.length ? Math.min(...ys) : 80;
  const yCompact = niceTicks(Math.min(yMin - 3, 80), 100);
  // F-11: the full chart's Y axis follows the data (floor(min − 3) → 100, at least 20 wide)
  // so the points use the plot instead of huddling at the top of 0–100. F-17: round ticks.
  const yFull = niceTicks(Math.max(0, Math.min(Math.floor(yMin - 3), 80)), 100);

  if (compact) {
    // In Charts nothing is cut by a score line, so labelling every passing point stacks
    // names on top of each other; there only the frontier members are named.
    const frontierIds = new Set<string>(pareto.map((p: { id: string }) => p.id));
    const passing = compactPoints.filter((p) => p.pass);
    const failing = compactPoints.filter((p) => !p.pass);
    // Label priority: frontier members, then passing points by score. In Charts nothing is
    // cut by a score line, so only the frontier is named there.
    const labels = [...passing].filter((p) => !advanced || frontierIds.has(p.id))
      .sort((a, b) => Number(frontierIds.has(b.id)) - Number(frontierIds.has(a.id)) || b.y - a.y);
    // F-13: inside Simple's shortlist card the map has no card of its own, one header line.
    return <div className="bh-value-map" aria-label="Score versus adjusted cost value map">
      <div className="flex items-baseline justify-end gap-3 lg:mb-1">
        <span className="text-[11px] text-gray-500">{advanced ? "cheaper ← left · green line = Pareto frontier" : "Value map · cheaper ← left · green = Pareto"}</span>
      </div>
      <div aria-hidden="true" className={advanced ? "h-[260px] sm:h-[320px]" : "h-[200px] lg:h-[240px]"}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#222932" />
            {/* F-26: phones keep a small fixed scale — X at $3 · $1 · $0.3 · $0.1 (those inside the
                data range), Y only at the floor and 100 — in 10 px text with reserved axis space. */}
            <XAxis type="number" dataKey="x" name="Adjusted cost" scale={logCostAxis ? "log" : "linear"} domain={logCostAxis ? [Math.max(xMin * 0.85, Number.EPSILON), xMax * 1.15] : [0, Math.max(1, xMax * 1.15)]} ticks={logCostAxis ? (narrow ? phoneCostTicks(xMin * 0.85, xMax * 1.15) : logTicks(xMin, xMax)) : undefined} allowDataOverflow interval={0} tickFormatter={(v) => narrow ? `$${v}` : priceNumber(v)} stroke="#8a93a3" fontSize={narrow ? 10 : 11} height={narrow ? 18 : 30} tickSize={narrow ? 3 : 6} />
            <YAxis type="number" dataKey="y" name={SCORE_SHORT_LABELS[score]} domain={yCompact.domain} ticks={narrow ? [yCompact.domain[0], 100] : yCompact.ticks} interval={0} width={narrow ? 24 : 32} stroke="#8a93a3" fontSize={narrow ? 10 : 11} tickSize={narrow ? 3 : 6} tickFormatter={(v) => v.toFixed(0)} />
            <ZAxis type="number" dataKey="z" range={[50, 50]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<Dot />} />
            {/* Only frontier members get the halo and the connecting line — not every point. */}
            {showPareto && pareto.length > 0 && <Scatter data={pareto} line={pareto.length > 1 ? { stroke: "#7ee0c0", strokeWidth: 2 } : false} lineType="joint" shape={ParetoHalo} legendType="none" isAnimationActive={false} />}
            <Scatter data={failing} fill="rgb(var(--accent))" shape={CompactPointShape} legendType="none" isAnimationActive={false} />
            <Scatter data={passing} fill="rgb(var(--accent))" shape={CompactPointShape} legendType="none" isAnimationActive={false}
              onClick={(p) => p && router.push(`/models/${encodeURIComponent((p as { id: string }).id)}`)} style={{ cursor: "pointer" }} />
            <Customized component={<PointLabels labels={labels} dots={compactPoints} frontier={frontierIds} />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {advanced && <div className="flex justify-between text-[11px] text-gray-500"><span>{SCORE_SHORT_LABELS[score]} ↑</span><span>Adjusted cost · {logCostAxis ? "log scale" : "linear scale"}</span></div>}
    </div>;
  }

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <span className="text-sm text-gray-400">Capability (Y): <b className="text-gray-200">{SCORE_SHORT_LABELS[score]}</b></span>
        <Toggle label="Log cost axis" on={logX} set={setLogX} />
        <Toggle label="Pareto frontier" on={showPareto} set={setShowPareto} />
        <span className="ml-auto text-xs text-gray-500">
          {/* F-18: the count is what the filters allow, so it opens them. */}
          <button type="button" data-bh-filters-toggle onClick={s.openFilters} className="min-h-0 text-accent underline decoration-dotted underline-offset-2">{points.length} models</button> · cost: cheaper ← left{offerScope.restricted ? " · provider-filtered" : ""}</span>
      </div>

      {logX && zeroCount > 0 && <p className="mb-2 text-xs text-amber-300">{zeroCount} zero-cost models cannot appear on a logarithmic axis; switch to linear or open the model price table. Frontier calculations include these models.</p>}
      <div aria-hidden="true" className="card p-4" style={{ height: 580 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart accessibilityLayer={false} margin={{ top: 20, right: 40, bottom: 64, left: 30 }}>
            <CartesianGrid stroke="#222932" />
            <XAxis type="number" dataKey="x" name="Cost" reversed
              scale={logX ? "log" : "linear"}
              domain={logX ? [xMin * 0.85, xMax * 1.15] : [0, Math.max(1, xMax * 1.1)]}
              ticks={logX ? logTicks(xMin, xMax) : undefined}
              allowDataOverflow interval={0} minTickGap={1} tickMargin={10}
              tickFormatter={(v) => priceNumber(v)} stroke="#8a93a3" fontSize={12}>
              <Label value={`cheaper ←    ·    more expensive → (lowest ${priceLabel(priceSettings)})`} position="bottom" offset={32} fill="#8a93a3" fontSize={12} />
            </XAxis>
            <YAxis type="number" dataKey="y" name="Capability" stroke="#8a93a3" fontSize={12} domain={isElo ? ["auto", "auto"] : yFull.domain} ticks={isElo ? undefined : yFull.ticks} allowDataOverflow={false}>
              <Label value={scoreChartLabel(score, data.sourceDates)} angle={-90} position="left" offset={10} fill="#8a93a3" fontSize={12} style={{ textAnchor: "middle" }} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[60, 60]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<Dot />} />
            {showPareto && pareto.length > 0 && (
              <Scatter data={pareto} line={pareto.length > 1 ? { stroke: "#7ee0c0", strokeWidth: 2 } : false} lineType="joint"
                shape={ParetoHalo} legendType="none" isAnimationActive={false} />
            )}
            {byOrg.map(([org, pts]) => (
              <Scatter isAnimationActive={false} key={org} name={org} data={pts} fill={orgColor(org)} shape={PointShape}
                onClick={(p) => p && router.push(`/models/${encodeURIComponent((p as { id: string }).id)}`)} style={{ cursor: "pointer" }} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1.5"><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#aeb6c2" /></svg> closed lab</span>
        <span className="inline-flex items-center gap-1.5"><svg width="14" height="14"><rect x="2" y="2" width="10" height="10" fill="#aeb6c2" /></svg> open weights</span>
        <span className="mx-1 h-3 w-px bg-line" />
        {byOrg.map(([org]) => (
          <span key={org} className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: orgColor(org) }} />{org}</span>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Up is more capability; toward the <b>left</b> is better value. The
        <span className="text-accent2"> green Pareto frontier</span> marks and connects the best-value models —
        those no other model beats on both price and capability. Click any point to open the model detail.
      </p>
      <PriceAssumptions />

      {/* Keyboard/screen-reader equivalent of the scatter: the chart itself is
          mouse-only, so every plotted price is listed below with its exact
          inputs reachable through the same PriceValue expansion. */}
      <details className="card mt-4 p-3">
        <summary className="cursor-pointer text-sm text-gray-300">Model prices and scores (accessible table, {allPoints.length} rows)</summary>
        <div className="mt-2 max-h-96 overflow-y-auto">
          <table className="dtable w-full text-sm">
            <thead><tr>
              <th className="px-3 py-1 text-left text-xs text-gray-400">Model</th>
              <th className="px-3 py-1 text-right text-xs text-gray-400">{SCORE_SHORT_LABELS[score]}</th>
              <th className="px-3 py-1 text-right text-xs text-gray-400">{priceLabel(priceSettings)}</th>
            </tr></thead>
            <tbody>
              {[...allPoints].sort((a, b) => a.x - b.x).map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-1"><Link href={`/models/${encodeURIComponent(p.id)}`} className="text-accent underline">{p.name}</Link> <span className="text-gray-500">{p.org}{p.open ? " · open" : ""}</span></td>
                  <td className="px-3 py-1 text-right tabular">{p.y.toFixed(isElo ? 0 : 1)}</td>
                  <td className="px-3 py-1 text-right"><PriceValue price={p.price} compact /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function Dot({ active, payload }: { active?: boolean; payload?: { payload: { name: string; x: number; y: number; org: string; open: boolean; price: PriceResult } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs">
      <div className="font-semibold">{p.name}</div>
      <div className="text-gray-400">{p.org}{p.open ? " · open weights" : " · closed"}</div>
      <div className="mt-1">Capability: <span className="font-semibold">{p.y.toFixed(1)}</span></div>
      <div>Cheapest price: <PriceValue price={p.price} compact /></div>
    </div>
  );
}
