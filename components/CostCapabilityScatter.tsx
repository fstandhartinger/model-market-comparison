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
import { modelPrice, scopeFromSettings, priceLabel, type PriceResult, type PriceSettings } from "../lib/cost";
import { Toggle } from "./ui";
import { PriceValue, PriceAssumptions, priceNumber } from "./PriceValue";
import { useSettings } from "./SettingsContext";
import { GearIcon } from "./GearIcon";
import { preferredVariantIds, collapseModels, collapsedName, selectableModels } from "../lib/variants";
import { paretoFrontier } from "../lib/pareto.mjs";
import { COST_AXIS, LABEL_LIMIT, QUADRANT_NOTE, annotationBox, attractiveQuadrant, costAxisCaption, labelCandidates, placeLabels, valueMapYDomain } from "../lib/value-map.mjs";
import { AaCredit } from "./AaCredit";
import { EpochCredit } from "./EpochCredit";

type PlotOffset = { left: number; top: number; width: number; height: number };

/** 2026-09-15: a restrained green wash over the top-right quarter — transparent at that quarter's
 *  bottom-left, greener toward the chart's top-right corner — and the quadrant's small note in the
 *  top margin. Rendered before the scatters, so every point and line draws on top of it. */
function AttractiveQuadrant(props: { offset?: PlotOffset; gradientId: string; fontSize?: number }) {
  const q = attractiveQuadrant(props.offset);
  const note = annotationBox(props.offset, props.fontSize ?? 10);
  if (!q || !note) return null;
  return <g className="bh-quadrant" aria-hidden="true">
    <defs><linearGradient id={props.gradientId} x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" className="bh-quadrant-from" /><stop offset="1" className="bh-quadrant-to" />
    </linearGradient></defs>
    <rect x={q.x} y={q.y} width={q.width} height={q.height} fill={`url(#${props.gradientId})`} pointerEvents="none" />
    <text x={note.x} y={note.y} textAnchor="end" fontSize={props.fontSize ?? 10} className="bh-quadrant-note">{QUADRANT_NOTE}</text>
  </g>;
}

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

/** Pass 17 (Fable): a 200 px phone map shows three Y ticks — floor, the round tick nearest the middle, top. */
function phoneYTicks(domain: [number, number], ticks: number[]): number[] {
  const [lo, hi] = domain, mid = (lo + hi) / 2;
  const inner = ticks.filter((t) => t > lo && t < hi);
  if (!inner.length) return [lo, hi];
  const m = inner.reduce((b, t) => (Math.abs(t - mid) < Math.abs(b - mid) ? t : b), inner[0]);
  return [lo, m, hi];
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
 *  first, then by score). Each tries right of its dot, then above, below and left, then the
 *  four corner-aligned variants (F-67); a label that would leave the plot, overlap a placed
 *  label or cover another dot is dropped and the dot stays. `headroom` lets a label use the
 *  chart's top margin, so the best model — sitting on the top edge — keeps its name.
 *  On a narrow plot (phones) only frontier members are named. */
function PointLabels(props: { xAxisMap?: AxisMap; yAxisMap?: AxisMap; offset?: { left: number; top: number; width: number; height: number }; labels: LabelPoint[]; dots: { x: number; y: number }[]; frontier: Set<string>; headroom?: number }) {
  const xAxis = props.xAxisMap && Object.values(props.xAxisMap)[0];
  const yAxis = props.yAxisMap && Object.values(props.yAxisMap)[0];
  const o = props.offset;
  if (!xAxis || !yAxis || !o) return null;
  const out = placeLabels({
    labels: props.labels.map((p) => ({ id: p.id, name: p.name, cx: xAxis.scale(p.x), cy: yAxis.scale(p.y) })),
    dots: props.dots.map((d) => ({ cx: xAxis.scale(d.x), cy: yAxis.scale(d.y) })),
    offset: o, frontier: props.frontier, headroom: props.headroom ?? 0, max: LABEL_LIMIT,
  });
  return <g className="bh-point-labels">{out.map((l) => <text key={l.key} x={l.x} y={l.y} fill="var(--text)" fontSize={10} paintOrder="stroke" stroke="var(--surface)" strokeWidth={3} strokeLinejoin="round">{l.text}</text>)}</g>;
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
/** `ids` (Simple): the exact models the overview table considers; the map then plots only those. */
/** `wide` (Charts, CR-26.1): the compact map at full card width — taller, named like Simple's map, one caption line. */
export function CostCapabilityScatter({ data, compact = false, advanced = false, guided = false, measuredOnly = false, wide = false, ids }: { data: ClientData; compact?: boolean; advanced?: boolean; guided?: boolean; measuredOnly?: boolean; wide?: boolean; ids?: string[] }) {
  const router = useRouter();
  const s = useSettings();
  const score = s.score;
  const priceSettings = useMemo<PriceSettings>(() => ({ priceMode: s.priceMode, inputWeight: s.inputWeight }), [s.priceMode, s.inputWeight]);
  const offerScope = useMemo(() => scopeFromSettings(s, data.providers), [s.excludedSet, s.hostedIn, s.providerBasedIn, data.providers, s.allowDataTraining]);
  const [logX, setLogX] = useState(true);
  const [showPareto, setShowPareto] = useState(true);
  // CR-32.5: the compact map's own chart settings (cogwheel), persisted per browser.
  const [mapPrefs, setMapPrefs] = useState<{ fullY: boolean; labels: boolean; pareto: boolean }>({ fullY: false, labels: true, pareto: true });
  const [prefsOpen, setPrefsOpen] = useState(false);
  useEffect(() => { try { const raw = localStorage.getItem("bh.valueMap.v1"); if (raw) { const v = JSON.parse(raw); setMapPrefs({ fullY: v.fullY === true, labels: v.labels !== false, pareto: v.pareto !== false }); } } catch { /* ignore */ } }, []);
  const updatePrefs = (patch: Partial<typeof mapPrefs>) => setMapPrefs((old) => { const next = { ...old, ...patch }; try { localStorage.setItem("bh.valueMap.v1", JSON.stringify(next)); } catch { /* ignore */ } return next; });
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

  const idKey = ids?.join(",");
  const allPoints = useMemo(() => {
    let pool = candidates;
    const only = idKey != null ? new Set(idKey ? idKey.split(",") : []) : null;
    if (only) pool = pool.filter((m) => only.has(m.id));
    if (s.collapse) pool = collapseModels(pool, preferredId);
    if (s.openOnly) pool = pool.filter((m) => m.open_weights);
    if (s.labAllowed) pool = pool.filter((m) => s.labAllowed!(m.org));
    if (s.featured && !only) pool = pool.filter((m) => m.featured);
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
  }, [data, candidates, score, offerScope, priceSettings, s.collapse, s.featured, s.familySet, s.openOnly, s.labAllowed, minScore, maxCost, preferredId, measuredOnly, s.priceMode, idKey]);

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
  // CR-32.4: the compact map's Y axis fits the plotted scores (100 only when the best is >= 90; Elo-aware).
  const yCompact = valueMapYDomain(ys, { elo: isElo, full: mapPrefs.fullY });
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
    // 2026-09-15: at most LABEL_LIMIT names; unnamed points keep their tooltip and table row.
    // Every candidate is offered in priority order; placement stops after LABEL_LIMIT names fit.
    const labels = labelCandidates(passing.filter((p) => !advanced || wide || frontierIds.has(p.id)), frontierIds, Number.POSITIVE_INFINITY);
    // F-13: inside Simple's shortlist card the map has no card of its own, one header line.
    return <div className="bh-value-map" role="img" aria-label={`Score versus adjusted cost value map: ${compactPoints.length} models. Higher scores are further up and cheaper models further right, so the most attractive models sit in the top-right quadrant.`}>
      <div className="relative flex items-center justify-end gap-2 lg:mb-1">
        <span className="text-[11px] text-gray-500">{advanced && !wide ? "cheaper → right · green line = Pareto frontier" : `Value map · ${compactPoints.length} models · cheaper → right · green line = Pareto`} · <AaCredit /> · <EpochCredit /></span>
        <button type="button" aria-label="Chart settings" aria-expanded={prefsOpen} aria-controls="bh-value-map-settings" data-value-map-settings onClick={() => setPrefsOpen((o) => !o)}
          className="inline-flex h-7 min-h-0 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-accent/10 hover:text-accent">
          <GearIcon />
        </button>
        {prefsOpen && <div id="bh-value-map-settings" role="group" aria-label="Value map settings" tabIndex={-1}
          onKeyDown={(e) => { if (e.key === "Escape") setPrefsOpen(false); }}
          className="absolute right-0 top-full z-30 mt-1 w-56 space-y-2 rounded-lg border border-line bg-[var(--surface)] p-3 text-xs shadow-xl">
          <label className="flex items-center justify-between gap-2"><span>Y axis: full 0–100 scale</span><input type="checkbox" checked={mapPrefs.fullY} onChange={(e) => updatePrefs({ fullY: e.target.checked })} data-pref="fullY" /></label>
          <label className="flex items-center justify-between gap-2"><span>Model names</span><input type="checkbox" checked={mapPrefs.labels} onChange={(e) => updatePrefs({ labels: e.target.checked })} data-pref="labels" /></label>
          <label className="flex items-center justify-between gap-2"><span>Pareto line</span><input type="checkbox" checked={mapPrefs.pareto} onChange={(e) => updatePrefs({ pareto: e.target.checked })} data-pref="pareto" /></label>
          <button type="button" className="text-accent underline" onClick={() => setPrefsOpen(false)}>Done</button>
        </div>}
      </div>
      <div aria-hidden="true" className={wide ? "h-[240px] sm:h-[420px]" : advanced ? "h-[260px] sm:h-[320px]" : "h-[200px] lg:h-[240px]"}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 22, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#222932" />
            {/* F-26: phones keep a small fixed scale — X at $3 · $1 · $0.3 · $0.1 (those inside the
                data range), Y only at the floor and 100 — in 10 px text with reserved axis space. */}
            <XAxis type="number" dataKey="x" name="Adjusted cost" reversed={COST_AXIS.reversed} scale={logCostAxis ? "log" : "linear"} domain={logCostAxis ? [Math.max(xMin * 0.85, Number.EPSILON), xMax * 1.15] : [0, Math.max(1, xMax * 1.15)]} ticks={logCostAxis ? (narrow ? phoneCostTicks(xMin * 0.85, xMax * 1.15) : logTicks(xMin, xMax)) : undefined} allowDataOverflow interval={0} tickFormatter={(v) => narrow ? `$${v}` : priceNumber(v)} stroke="#8a93a3" fontSize={narrow ? 10 : 11} height={narrow ? 18 : 30} tickSize={narrow ? 3 : 6} />
            <YAxis type="number" dataKey="y" name={SCORE_SHORT_LABELS[score]} domain={yCompact.domain} ticks={narrow ? phoneYTicks(yCompact.domain, yCompact.ticks) : yCompact.ticks} interval={0} width={narrow ? 24 : 32} stroke="#8a93a3" fontSize={narrow ? 10 : 11} tickSize={narrow ? 3 : 6} tickFormatter={(v) => v.toFixed(0)} />
            <ZAxis type="number" dataKey="z" range={[50, 50]} />
            <Customized component={<AttractiveQuadrant gradientId="bh-quadrant-compact" />} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<Dot />} />
            {/* Only frontier members get the halo and the connecting line — not every point. */}
            {mapPrefs.pareto && pareto.length > 0 && <Scatter data={pareto} line={pareto.length > 1 ? { stroke: "#7ee0c0", strokeWidth: 2 } : false} lineType="joint" shape={ParetoHalo} legendType="none" isAnimationActive={false} />}
            <Scatter data={failing} fill="rgb(var(--accent))" shape={CompactPointShape} legendType="none" isAnimationActive={false} />
            <Scatter data={passing} fill="rgb(var(--accent))" shape={CompactPointShape} legendType="none" isAnimationActive={false}
              onClick={(p) => p && router.push(`/models/${encodeURIComponent((p as { id: string }).id)}`)} style={{ cursor: "pointer" }} />
            {mapPrefs.labels && <Customized component={<PointLabels labels={labels} dots={compactPoints} frontier={frontierIds} headroom={20} />} />}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {advanced && !wide && <div className="flex justify-between text-[11px] text-gray-500"><span>{SCORE_SHORT_LABELS[score]} ↑</span><span>Adjusted cost · {logCostAxis ? "log scale" : "linear scale"}</span></div>}
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
          <button type="button" data-bh-filters-toggle onClick={s.openFilters} className="min-h-0 text-accent underline decoration-dotted underline-offset-2">{points.length} models</button> · cost: cheaper → right{offerScope.restricted ? " · provider-filtered" : ""}</span>
      </div>

      {logX && zeroCount > 0 && <p className="mb-2 text-xs text-amber-300">{zeroCount} zero-cost models cannot appear on a logarithmic axis; switch to linear or open the model price table. Frontier calculations include these models.</p>}
      <div aria-hidden="true" className="card p-4" style={{ height: 580 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart accessibilityLayer={false} margin={{ top: 20, right: 40, bottom: 64, left: 30 }}>
            <CartesianGrid stroke="#222932" />
            <XAxis type="number" dataKey="x" name="Cost" reversed={COST_AXIS.reversed}
              scale={logX ? "log" : "linear"}
              domain={logX ? [xMin * 0.85, xMax * 1.15] : [0, Math.max(1, xMax * 1.1)]}
              ticks={logX ? logTicks(xMin, xMax) : undefined}
              allowDataOverflow interval={0} minTickGap={1} tickMargin={10}
              tickFormatter={(v) => priceNumber(v)} stroke="#8a93a3" fontSize={12}>
              <Label value={costAxisCaption(`lowest ${priceLabel(priceSettings)}`)} position="bottom" offset={32} fill="#8a93a3" fontSize={12} />
            </XAxis>
            <YAxis type="number" dataKey="y" name="Capability" stroke="#8a93a3" fontSize={12} domain={isElo ? ["auto", "auto"] : yFull.domain} ticks={isElo ? undefined : yFull.ticks} allowDataOverflow={false}>
              <Label value={scoreChartLabel(score, data.sourceDates)} angle={-90} position="left" offset={10} fill="#8a93a3" fontSize={12} style={{ textAnchor: "middle" }} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[60, 60]} />
            <Customized component={<AttractiveQuadrant gradientId="bh-quadrant-full" fontSize={11} />} />
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
        Up is more capability; toward the <b>right</b> is cheaper, so the shaded top-right quadrant holds the most attractive models. The
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
