"use client";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import type { ClientData } from "../lib/client-model";
import { SCORE_LABELS, type ScoreKey } from "../lib/types";
import { usdPerM, orgColor } from "../lib/format";
import { DEFAULT_SCORE, modelCost } from "../lib/cost";
import { ScoreSelect, Toggle, ProviderFilter, NumFilter } from "./ui";

function truncTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  const t = payload.value.length > 26 ? payload.value.slice(0, 25) + "…" : payload.value;
  return <text x={x} y={y} dy={3} textAnchor="end" fill="#9aa4b2" fontSize={11}><title>{payload.value}</title>{t}</text>;
}

export function ChartsBoard({ data }: { data: ClientData }) {
  const [score, setScore] = useState<ScoreKey>(DEFAULT_SCORE);
  const [featuredOnly, setFeaturedOnly] = useState(true);
  const [maxCost, setMaxCost] = useState("");
  const [minScore, setMinScore] = useState("");
  const [providerSel, setProviderSel] = useState<Set<string>>(new Set());
  const allowed = providerSel.size ? providerSel : null;

  const pool = useMemo(() => {
    const maxC = parseFloat(maxCost), minS = parseFloat(minScore);
    return data.models
      .filter((m) => (featuredOnly ? m.featured : true))
      .map((m) => ({ m, cost: modelCost(m, data, allowed), sc: m.scores[score] }))
      .filter((x) => (Number.isFinite(maxC) ? x.cost != null && x.cost <= maxC : true))
      .filter((x) => (Number.isFinite(minS) ? (x.sc ?? -Infinity) >= minS : true));
  }, [data, score, featuredOnly, maxCost, minScore, allowed]);

  const leaderboard = useMemo(() =>
    pool.filter((x) => x.sc != null).sort((a, b) => (b.sc as number) - (a.sc as number)).slice(0, 18)
      .map((x) => ({ name: x.m.display_name, value: x.sc as number, org: x.m.org })),
    [pool]);

  const cheapest = useMemo(() =>
    pool.filter((x) => x.cost != null).sort((a, b) => (a.cost as number) - (b.cost as number)).slice(0, 18)
      .map((x) => ({ name: x.m.display_name, value: x.cost as number, org: x.m.org })),
    [pool]);

  const openVsClosed = useMemo(() => {
    const groups = { Open: pool.filter((x) => x.m.open_weights), Closed: pool.filter((x) => !x.m.open_weights) };
    return Object.entries(groups).map(([k, arr]) => {
      const sc = arr.map((x) => x.sc).filter((v): v is number => v != null);
      const co = arr.map((x) => x.cost).filter((v): v is number => v != null);
      return { name: k, avgScore: sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : 0, avgCost: co.length ? co.reduce((a, b) => a + b, 0) / co.length : 0 };
    });
  }, [pool]);

  const isElo = score.startsWith("designarena");

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <ScoreSelect value={score} onChange={setScore} />
        <ProviderFilter providers={data.providers} selected={providerSel} setSelected={setProviderSel} />
        <NumFilter label="Min capability" value={minScore} onChange={setMinScore} placeholder="e.g. 1200" />
        <NumFilter label="Max $/1M" value={maxCost} onChange={setMaxCost} placeholder="e.g. 5" />
        <Toggle label="Featured only" on={featuredOnly} set={setFeaturedOnly} />
        <span className="ml-auto text-xs text-gray-500">{pool.length} models</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={`Capability leaderboard — ${SCORE_LABELS[score]}`}>
          <ResponsiveContainer width="100%" height={Math.max(360, leaderboard.length * 26)}>
            <BarChart data={leaderboard} layout="vertical" margin={{ left: 20, right: 44 }}>
              <CartesianGrid stroke="#222932" horizontal={false} />
              <XAxis type="number" stroke="#8a93a3" fontSize={11} domain={isElo ? ["dataMin - 20", "dataMax"] : [0, "auto"]} />
              <YAxis type="category" dataKey="name" width={205} tick={truncTick} interval={0} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {leaderboard.map((d, i) => <Cell key={i} fill={orgColor(d.org)} />)}
                <LabelList dataKey="value" position="right" fill="#cbd5e1" fontSize={11} formatter={(v: number) => v.toFixed(isElo ? 0 : 1)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Cheapest models — 10:1 blended $/1M tokens">
          <ResponsiveContainer width="100%" height={Math.max(360, cheapest.length * 26)}>
            <BarChart data={cheapest} layout="vertical" margin={{ left: 20, right: 54 }}>
              <CartesianGrid stroke="#222932" horizontal={false} />
              <XAxis type="number" stroke="#8a93a3" fontSize={11} tickFormatter={(v) => usdPerM(v)} />
              <YAxis type="category" dataKey="name" width={205} tick={truncTick} interval={0} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} formatter={(v: number) => usdPerM(v)} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {cheapest.map((d, i) => <Cell key={i} fill={orgColor(d.org)} />)}
                <LabelList dataKey="value" position="right" fill="#cbd5e1" fontSize={11} formatter={(v: number) => usdPerM(v)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Open weights vs closed — average capability">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={openVsClosed} margin={{ left: 10, right: 20 }}>
              <CartesianGrid stroke="#222932" vertical={false} />
              <XAxis dataKey="name" stroke="#8a93a3" fontSize={12} />
              <YAxis stroke="#8a93a3" fontSize={11} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} />
              <Bar dataKey="avgScore" name="Avg score" radius={[4, 4, 0, 0]}>
                <Cell fill="#7ee0c0" /><Cell fill="#5b9dff" />
                <LabelList dataKey="avgScore" position="top" fill="#cbd5e1" fontSize={11} formatter={(v: number) => v.toFixed(1)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Open weights vs closed — average cost">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={openVsClosed} margin={{ left: 10, right: 20 }}>
              <CartesianGrid stroke="#222932" vertical={false} />
              <XAxis dataKey="name" stroke="#8a93a3" fontSize={12} />
              <YAxis stroke="#8a93a3" fontSize={11} tickFormatter={(v) => usdPerM(v)} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} formatter={(v: number) => usdPerM(v)} />
              <Bar dataKey="avgCost" name="Avg cost" radius={[4, 4, 0, 0]}>
                <Cell fill="#7ee0c0" /><Cell fill="#5b9dff" />
                <LabelList dataKey="avgCost" position="top" fill="#cbd5e1" fontSize={11} formatter={(v: number) => usdPerM(v)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

const tip = { background: "#161b22", border: "1px solid #272e3a", borderRadius: 8, fontSize: 12 };

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card p-4"><h2 className="mb-3 text-sm font-semibold text-gray-200">{title}</h2>{children}</div>;
}
