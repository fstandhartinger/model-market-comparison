"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Label,
} from "recharts";
import type { ClientModel } from "../lib/client-model";
import { SCORE_LABELS, type ScoreKey } from "../lib/types";
import { usdPerM, orgColor } from "../lib/format";

const SCORE_OPTIONS: ScoreKey[] = [
  "aa_coding_index",
  "aa_intelligence_index",
  "designarena_frontend",
  "designarena_fullstack",
];

export function CostCapabilityScatter({ models }: { models: ClientModel[] }) {
  const router = useRouter();
  const [score, setScore] = useState<ScoreKey>("aa_coding_index");
  const [featuredOnly, setFeaturedOnly] = useState(true);
  const [logX, setLogX] = useState(true);

  const points = useMemo(() => {
    return models
      .filter((m) => (featuredOnly ? m.featured : true))
      .filter((m) => m.scores[score] != null && m.cost10to1 != null && (m.cost10to1 as number) > 0)
      .map((m) => ({
        x: m.cost10to1 as number,
        y: m.scores[score] as number,
        name: m.display_name,
        org: m.org,
        id: m.id,
        open: m.open_weights,
        z: 100,
      }));
  }, [models, score, featuredOnly]);

  // group by org so each org gets its colour + legend entry
  const byOrg = useMemo(() => {
    const g = new Map<string, typeof points>();
    for (const p of points) { if (!g.has(p.org)) g.set(p.org, []); g.get(p.org)!.push(p); }
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [points]);

  const isElo = score.startsWith("designarena");

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <label className="text-sm text-gray-400">Capability (Y)</label>
        <select value={score} onChange={(e) => setScore(e.target.value as ScoreKey)}
          className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
          {SCORE_OPTIONS.map((s) => <option key={s} value={s}>{SCORE_LABELS[s]}</option>)}
        </select>
        <button onClick={() => setFeaturedOnly(!featuredOnly)}
          className={`rounded-md border px-3 py-1.5 text-sm ${featuredOnly ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
          {featuredOnly ? "✓ " : ""}Featured only
        </button>
        <button onClick={() => setLogX(!logX)}
          className={`rounded-md border px-3 py-1.5 text-sm ${logX ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
          {logX ? "✓ " : ""}Log cost axis
        </button>
        <span className="ml-auto text-xs text-gray-500">{points.length} models · cost = (10·input + 1·output) / 11</span>
      </div>

      <div className="card p-4" style={{ height: 560 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 20 }}>
            <CartesianGrid stroke="#222932" />
            <XAxis
              type="number" dataKey="x" name="Cost"
              scale={logX ? "log" : "linear"} domain={logX ? ["auto", "auto"] : [0, "auto"]}
              tickFormatter={(v) => usdPerM(v)} stroke="#8a93a3" fontSize={12}
            >
              <Label value="Cost →  cheapest blended $/1M tokens (10:1 input:output)" position="bottom" offset={20} fill="#8a93a3" fontSize={12} />
            </XAxis>
            <YAxis type="number" dataKey="y" name="Capability" stroke="#8a93a3" fontSize={12}
              domain={isElo ? ["auto", "auto"] : [0, "auto"]}>
              <Label value={`Capability →  ${SCORE_LABELS[score]}`} angle={-90} position="left" offset={0} fill="#8a93a3" fontSize={12} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[60, 60]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<Dot />} />
            {byOrg.map(([org, pts]) => (
              <Scatter key={org} name={org} data={pts} fill={orgColor(org)}
                onClick={(p) => p && router.push(`/models/${encodeURIComponent((p as { id: string }).id)}`)}
                style={{ cursor: "pointer" }} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
        {byOrg.map(([org]) => (
          <span key={org} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: orgColor(org) }} />{org}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Up &amp; to the left is better: more capability per dollar. Click any point to open the model detail.
        Cost uses each model&apos;s cheapest token offer across all providers.
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
      <div className="text-gray-400">{p.org}{p.open ? " · open weights" : ""}</div>
      <div className="mt-1">Capability: <span className="font-semibold">{p.y.toFixed(1)}</span></div>
      <div>Cheapest 10:1 cost: <span className="font-semibold">{usdPerM(p.x)}</span> / 1M</div>
    </div>
  );
}
