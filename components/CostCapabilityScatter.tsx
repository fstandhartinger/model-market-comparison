"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label,
} from "recharts";
import type { ClientData } from "../lib/client-model";
import { SCORE_LABELS } from "../lib/types";
import { usdPerM, orgColor } from "../lib/format";
import { modelCost, effectiveAllowed, isUnauthorizedModel } from "../lib/cost";
import { Toggle } from "./ui";
import { useSettings } from "./SettingsContext";
import { preferredVariantIds, collapseModels } from "../lib/variants";

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

function logTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  for (let e = -3; e <= 3; e++) for (const m of [1, 3]) {
    const v = m * 10 ** e;
    if (v >= min * 0.9 && v <= max * 1.1) ticks.push(v);
  }
  return ticks.length ? ticks : [min, max];
}

export function CostCapabilityScatter({ data }: { data: ClientData }) {
  const router = useRouter();
  const s = useSettings();
  const score = s.score;
  const allowed = useMemo(() => effectiveAllowed(s.providerSet, s.excludeChinese, data.providers), [s.providerSet, s.excludeChinese, data.providers]);
  const [logX, setLogX] = useState(true);
  const [showPareto, setShowPareto] = useState(true);
  const preferredId = useMemo(() => preferredVariantIds(data.models), [data.models]);

  const points = useMemo(() => {
    let pool = data.models;
    if (s.collapse) pool = collapseModels(pool, preferredId);
    if (s.excludeUnauthorized) pool = pool.filter((m) => !isUnauthorizedModel(m.family_key));
    if (s.featured) pool = pool.filter((m) => m.featured);
    if (s.familySet) pool = pool.filter((m) => s.familySet!.has(m.family_key));
    return pool
      .map((m) => ({ m, cost: modelCost(m, data, allowed), sc: m.scores[score] }))
      .filter((x) => x.sc != null && x.cost != null && (x.cost as number) > 0 && (x.sc as number) >= s.minScore)
      .map((x) => ({ x: x.cost as number, y: x.sc as number, name: x.m.display_name, org: x.m.org, id: x.m.id, open: x.m.open_weights, z: 100 }));
  }, [data, score, allowed, s.collapse, s.featured, s.familySet, s.excludeUnauthorized, s.minScore, preferredId]);

  const byOrg = useMemo(() => {
    const g = new Map<string, typeof points>();
    for (const p of points) { if (!g.has(p.org)) g.set(p.org, []); g.get(p.org)!.push(p); }
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [points]);

  // Pareto frontier: models not dominated on (cheaper cost, higher capability).
  // Sort by cost ascending; keep a point when its capability beats all cheaper points.
  const pareto = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.x - b.x || b.y - a.y);
    const front: typeof points = [];
    let bestY = -Infinity;
    for (const p of sorted) { if (p.y > bestY) { front.push(p); bestY = p.y; } }
    return front;
  }, [points]);

  const xs = points.map((p) => p.x);
  const xMin = xs.length ? Math.min(...xs) : 0.1;
  const xMax = xs.length ? Math.max(...xs) : 100;
  const isElo = score.startsWith("designarena");

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <span className="text-sm text-gray-400">Capability (Y): <b className="text-gray-200">{SCORE_LABELS[score]}</b></span>
        <Toggle label="Log cost axis" on={logX} set={setLogX} />
        <Toggle label="Pareto frontier" on={showPareto} set={setShowPareto} />
        <span className="ml-auto text-xs text-gray-500">{points.length} models · X inverted: cheaper → right{allowed ? " · provider-filtered" : ""}</span>
      </div>

      <div className="card p-4" style={{ height: 580 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 40, bottom: 64, left: 30 }}>
            <CartesianGrid stroke="#222932" />
            <XAxis type="number" dataKey="x" name="Cost" reversed
              scale={logX ? "log" : "linear"}
              domain={logX ? [xMin * 0.85, xMax * 1.15] : [0, xMax * 1.1]}
              ticks={logX ? logTicks(xMin, xMax) : undefined}
              allowDataOverflow interval={0} minTickGap={1} tickMargin={10}
              tickFormatter={(v) => usdPerM(v)} stroke="#8a93a3" fontSize={12}>
              <Label value="← more expensive    ·    cheaper → (cheapest blended $/1M, 10:1)" position="bottom" offset={32} fill="#8a93a3" fontSize={12} />
            </XAxis>
            <YAxis type="number" dataKey="y" name="Capability" stroke="#8a93a3" fontSize={12} domain={isElo ? ["auto", "auto"] : [0, "auto"]}>
              <Label value={SCORE_LABELS[score]} angle={-90} position="left" offset={10} fill="#8a93a3" fontSize={12} style={{ textAnchor: "middle" }} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[60, 60]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<Dot />} />
            {showPareto && pareto.length > 1 && (
              <Scatter data={pareto} line={{ stroke: "#7ee0c0", strokeWidth: 2 }} lineType="joint"
                shape={ParetoHalo} legendType="none" isAnimationActive={false} />
            )}
            {byOrg.map(([org, pts]) => (
              <Scatter key={org} name={org} data={pts} fill={orgColor(org)} shape={PointShape}
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
        <span className="text-accent2"> green Pareto line</span> connects the best-value models —
        those no other model beats on both price and capability. Click any point to open the model detail.
      </p>
    </div>
  );
}

function Dot({ active, payload }: { active?: boolean; payload?: { payload: { name: string; x: number; y: number; org: string; open: boolean } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs">
      <div className="font-semibold">{p.name}</div>
      <div className="text-gray-400">{p.org}{p.open ? " · open weights" : " · closed"}</div>
      <div className="mt-1">Capability: <span className="font-semibold">{p.y.toFixed(1)}</span></div>
      <div>Cheapest 10:1 cost: <span className="font-semibold">{usdPerM(p.x)}</span> / 1M</div>
    </div>
  );
}
