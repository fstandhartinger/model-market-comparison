"use client";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import type { ClientData } from "../lib/client-model";
import { SCORE_LABELS } from "../lib/types";
import { usdPerM, orgColor } from "../lib/format";
import { modelCost, effectiveAllowed, isHiddenModel } from "../lib/cost";
import { NumFilter } from "./ui";
import { useSettings } from "./SettingsContext";
import { preferredVariantIds, collapseModels } from "../lib/variants";

function truncTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  const t = payload.value.length > 26 ? payload.value.slice(0, 25) + "…" : payload.value;
  return <text x={x} y={y} dy={3} textAnchor="end" fill="#9aa4b2" fontSize={11}><title>{payload.value}</title>{t}</text>;
}

export function ChartsBoard({ data }: { data: ClientData }) {
  const s = useSettings();
  const score = s.score;
  const allowed = useMemo(() => effectiveAllowed(s.providerSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly), [s.providerSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly]);
  const [maxCost, setMaxCost] = useState("");
  const preferredId = useMemo(() => preferredVariantIds(data.models), [data.models]);

  const pool = useMemo(() => {
    const maxC = parseFloat(maxCost);
    let base = data.models;
    if (s.collapse) base = collapseModels(base, preferredId);
    base = base.filter((m) => !isHiddenModel(m.family_key, s.hideGptOpus, s.hideFable));
    if (s.featured) base = base.filter((m) => m.featured);
    if (s.familySet) base = base.filter((m) => s.familySet!.has(m.family_key));
    return base
      .map((m) => ({ m, cost: modelCost(m, data, allowed), sc: m.scores[score] }))
      .filter((x) => (Number.isFinite(maxC) ? x.cost != null && x.cost <= maxC : true))
      .filter((x) => (s.minScore > 0 ? x.sc == null || x.sc >= s.minScore : true));
  }, [data, score, s.collapse, s.featured, s.familySet, s.hideGptOpus, s.hideFable, s.minScore, maxCost, allowed, preferredId]);

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
        <span className="text-sm text-gray-400">Score: <b className="text-gray-200">{SCORE_LABELS[score]}</b> · min {s.minScore}</span>
        <NumFilter label="Max $/1M" value={maxCost} onChange={setMaxCost} placeholder="e.g. 5" />
        <span className="ml-auto text-xs text-gray-500">{pool.length} models</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={`Capability leaderboard — ${SCORE_LABELS[score]}`}>
          <ResponsiveContainer width="100%" height={Math.max(360, leaderboard.length * 26)}>
            <BarChart data={leaderboard} layout="vertical" margin={{ left: 20, right: 44 }}>
              <CartesianGrid stroke="#222932" horizontal={false} />
              <XAxis type="number" stroke="#8a93a3" fontSize={11} domain={isElo ? ["dataMin - 20", "dataMax"] : [0, "auto"]} />
              <YAxis type="category" dataKey="name" width={205} tick={truncTick} interval={0} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} />
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
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} formatter={(v: number) => usdPerM(v)} />
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
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} />
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
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} formatter={(v: number) => usdPerM(v)} />
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

const tip = { background: "#161b22", border: "1px solid #272e3a", borderRadius: 8, fontSize: 12, color: "#e6edf3" };
const tipLabel = { color: "#e6edf3", fontWeight: 600 };
const tipItem = { color: "#cbd5e1" };

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card p-4"><h2 className="mb-3 text-sm font-semibold text-gray-200">{title}</h2>{children}</div>;
}
