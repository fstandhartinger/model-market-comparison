"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label,
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

function CompactPointShape(props: { cx?: number; cy?: number; payload?: { name: string; pass: boolean } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return <g />;
  return <g>
    <circle cx={cx} cy={cy} r={payload?.pass ? 5 : 4} fill="rgb(var(--accent))" opacity={payload?.pass ? 1 : 0.25} stroke="rgb(var(--ink))" strokeWidth={1} />
    {payload?.pass && <text x={cx + 8} y={cy + 4} fill="rgb(var(--text))" fontSize={10}>{payload.name.length > 22 ? `${payload.name.slice(0, 21)}…` : payload.name}</text>}
  </g>;
}

function logTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) for (const m of [1, 3]) {
    const v = m * 10 ** e;
    if (v >= min * 0.9 && v <= max * 1.1) ticks.push(v);
  }
  return ticks.length ? ticks : [min, max];
}

export function CostCapabilityScatter({ data, compact = false }: { data: ClientData; compact?: boolean }) {
  const router = useRouter();
  const s = useSettings();
  const score = s.score;
  const priceSettings = useMemo<PriceSettings>(() => ({ priceMode: s.priceMode, inputWeight: s.inputWeight }), [s.priceMode, s.inputWeight]);
  const offerScope = useMemo(() => createOfferScope(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly), [s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly]);
  const [logX, setLogX] = useState(true);
  const [showPareto, setShowPareto] = useState(true);
  const minScore = compact ? s.minScoreSimple : s.minScoreApplied;
  const candidates = useMemo(() => selectableModels(data.models, s.hideDeprecated), [data.models, s.hideDeprecated]);
  const preferredId = useMemo(() => preferredVariantIds(candidates, score), [candidates, score]);

  const allPoints = useMemo(() => {
    let pool = candidates;
    if (s.collapse) pool = collapseModels(pool, preferredId);
    if (s.openOnly) pool = pool.filter((m) => m.open_weights);
    if (s.featured) pool = pool.filter((m) => m.featured);
    if (s.familySet) pool = pool.filter((m) => s.familySet!.has(m.family_key));
    return pool
      .map((m: ClientModel) => ({ m, price: modelPrice(m, data, offerScope, priceSettings), sc: m.scores[score], hasEvidence: hasScoreEvidence(m, score) }))
      .filter((x) => x.hasEvidence && x.sc != null && x.price.value != null && (x.price.value as number) >= 0)
      .map((x) => ({ x: x.price.value as number, y: x.sc as number, price: x.price, name: collapsedName(x.m, s.collapse, preferredId), org: x.m.org, id: x.m.id, open: x.m.open_weights, z: 100,
        pass: (x.sc as number) >= minScore && (s.maxCost == null || (x.price.value as number) <= s.maxCost) }));
  }, [data, candidates, score, offerScope, priceSettings, s.collapse, s.featured, s.familySet, s.openOnly, minScore, s.maxCost, preferredId]);

  const points = useMemo(() => allPoints.filter((p) => (compact || p.pass) && (!logX || p.x > 0)), [allPoints, logX, compact]);
  const compactPoints = useMemo(() => allPoints.filter((p) => !logX || p.x > 0), [allPoints, logX]);
  const zeroCount = allPoints.filter((p) => p.x === 0).length;

  const byOrg = useMemo(() => {
    const g = new Map<string, typeof points>();
    for (const p of points) { if (!g.has(p.org)) g.set(p.org, []); g.get(p.org)!.push(p); }
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [points]);

  // Pareto frontier: models not dominated on (cheaper cost, higher capability).
  const pareto = useMemo(() => paretoFrontier(allPoints).filter((p: { x: number }) => !logX || p.x > 0), [allPoints, logX]);

  const xs = (compact ? compactPoints : points).map((p) => p.x);
  const xMin = xs.length ? Math.min(...xs) : 0.1;
  const xMax = xs.length ? Math.max(...xs) : 100;
  const isElo = score.startsWith("designarena");
  const ys = (compact ? compactPoints : points).map((p) => p.y);
  const yMin = ys.length ? Math.min(...ys) : 80;
  const yDomain = [Math.min(yMin - 3, 80), 100] as [number, number];

  if (compact) {
    const passing = compactPoints.filter((p) => p.pass);
    const failing = compactPoints.filter((p) => !p.pass);
    return <div className="card p-3" aria-label="Score versus adjusted cost value map">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">Value map</h2>
        <span className="text-[11px] text-gray-500">cheaper → right · green line = Pareto frontier</span>
      </div>
      <div aria-hidden="true" className="h-[80px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 120, bottom: 36, left: 24 }}>
            <CartesianGrid stroke="#222932" />
            <XAxis type="number" dataKey="x" name="Adjusted cost" reversed scale="log" domain={[xMin * 0.85, xMax * 1.15]} ticks={logTicks(xMin, xMax)} allowDataOverflow interval={0} tickFormatter={(v) => priceNumber(v)} stroke="#8a93a3" fontSize={11} />
            <YAxis type="number" dataKey="y" name={SCORE_SHORT_LABELS[score]} domain={yDomain} stroke="#8a93a3" fontSize={11} tickFormatter={(v) => v.toFixed(0)} />
            <ZAxis type="number" dataKey="z" range={[50, 50]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<Dot />} />
            {showPareto && <Scatter data={compactPoints} line={compactPoints.length > 1 ? { stroke: "#7ee0c0", strokeWidth: 2 } : false} lineType="joint" shape={ParetoHalo} legendType="none" isAnimationActive={false} />}
            <Scatter data={failing} fill="rgb(var(--accent))" shape={CompactPointShape} legendType="none" isAnimationActive={false} />
            <Scatter data={passing} fill="rgb(var(--accent))" shape={CompactPointShape} legendType="none" isAnimationActive={false}
              onClick={(p) => p && router.push(`/models/${encodeURIComponent((p as { id: string }).id)}`)} style={{ cursor: "pointer" }} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-[11px] text-gray-500"><span>{SCORE_SHORT_LABELS[score]} ↑</span><span>Adjusted cost · log scale</span></div>
    </div>;
  }

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <span className="text-sm text-gray-400">Capability (Y): <b className="text-gray-200">{SCORE_SHORT_LABELS[score]}</b></span>
        <Toggle label="Log cost axis" on={logX} set={setLogX} />
        <Toggle label="Pareto frontier" on={showPareto} set={setShowPareto} />
        <span className="ml-auto text-xs text-gray-500">{points.length} models · X inverted: cheaper → right{offerScope.restricted ? " · provider-filtered" : ""}</span>
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
              <Label value={`← more expensive    ·    cheaper → (cheapest ${priceLabel(priceSettings)})`} position="bottom" offset={32} fill="#8a93a3" fontSize={12} />
            </XAxis>
            <YAxis type="number" dataKey="y" name="Capability" stroke="#8a93a3" fontSize={12} domain={isElo ? ["auto", "auto"] : [0, "auto"]}>
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
        Up &amp; to the <b>right</b> is better: more capability for less money. The
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
