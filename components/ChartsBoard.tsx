"use client";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LabelList,
} from "recharts";
import type { ClientModel } from "../lib/client-model";
import { SCORE_LABELS, type ScoreKey } from "../lib/types";
import { usdPerM, orgColor } from "../lib/format";

const SCORE_OPTIONS: ScoreKey[] = [
  "aa_coding_index", "aa_intelligence_index", "designarena_frontend", "designarena_fullstack",
];

export function ChartsBoard({ models }: { models: ClientModel[] }) {
  const [score, setScore] = useState<ScoreKey>("aa_coding_index");
  const [featuredOnly, setFeaturedOnly] = useState(true);

  const pool = useMemo(
    () => models.filter((m) => (featuredOnly ? m.featured : true)),
    [models, featuredOnly]
  );

  const leaderboard = useMemo(() =>
    pool.filter((m) => m.scores[score] != null)
      .sort((a, b) => (b.scores[score] as number) - (a.scores[score] as number))
      .slice(0, 18)
      .map((m) => ({ name: m.display_name, value: m.scores[score] as number, org: m.org, id: m.id })),
    [pool, score]);

  const cheapest = useMemo(() =>
    pool.filter((m) => m.cost10to1 != null)
      .sort((a, b) => (a.cost10to1 as number) - (b.cost10to1 as number))
      .slice(0, 18)
      .map((m) => ({ name: m.display_name, value: m.cost10to1 as number, org: m.org })),
    [pool]);

  const openVsClosed = useMemo(() => {
    const groups = { Open: pool.filter((m) => m.open_weights), Closed: pool.filter((m) => !m.open_weights) };
    return Object.entries(groups).map(([k, arr]) => {
      const sc = arr.map((m) => m.scores[score]).filter((v): v is number => v != null);
      const co = arr.map((m) => m.cost10to1).filter((v): v is number => v != null);
      return {
        name: k,
        avgScore: sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : 0,
        avgCost: co.length ? co.reduce((a, b) => a + b, 0) / co.length : 0,
        count: arr.length,
      };
    });
  }, [pool, score]);

  const isElo = score.startsWith("designarena");

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <label className="text-sm text-gray-400">Score</label>
        <select value={score} onChange={(e) => setScore(e.target.value as ScoreKey)}
          className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
          {SCORE_OPTIONS.map((s) => <option key={s} value={s}>{SCORE_LABELS[s]}</option>)}
        </select>
        <button onClick={() => setFeaturedOnly(!featuredOnly)}
          className={`rounded-md border px-3 py-1.5 text-sm ${featuredOnly ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
          {featuredOnly ? "✓ " : ""}Featured only
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={`Capability leaderboard — ${SCORE_LABELS[score]}`}>
          <ResponsiveContainer width="100%" height={Math.max(360, leaderboard.length * 26)}>
            <BarChart data={leaderboard} layout="vertical" margin={{ left: 10, right: 40 }}>
              <CartesianGrid stroke="#222932" horizontal={false} />
              <XAxis type="number" stroke="#8a93a3" fontSize={11} domain={isElo ? ["dataMin - 20", "dataMax"] : [0, "auto"]} />
              <YAxis type="category" dataKey="name" width={150} stroke="#8a93a3" fontSize={11} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {leaderboard.map((d, i) => <Cell key={i} fill={orgColor(d.org)} />)}
                <LabelList dataKey="value" position="right" fill="#cbd5e1" fontSize={11}
                  formatter={(v: number) => v.toFixed(isElo ? 0 : 1)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Cheapest models — 10:1 blended $/1M tokens">
          <ResponsiveContainer width="100%" height={Math.max(360, cheapest.length * 26)}>
            <BarChart data={cheapest} layout="vertical" margin={{ left: 10, right: 50 }}>
              <CartesianGrid stroke="#222932" horizontal={false} />
              <XAxis type="number" stroke="#8a93a3" fontSize={11} tickFormatter={(v) => usdPerM(v)} />
              <YAxis type="category" dataKey="name" width={150} stroke="#8a93a3" fontSize={11} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} formatter={(v: number) => usdPerM(v)} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {cheapest.map((d, i) => <Cell key={i} fill={orgColor(d.org)} />)}
                <LabelList dataKey="value" position="right" fill="#cbd5e1" fontSize={11}
                  formatter={(v: number) => usdPerM(v)} />
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
  return (
    <div className="card p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-200">{title}</h2>
      {children}
    </div>
  );
}
