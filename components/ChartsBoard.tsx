"use client";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { hasScoreEvidence, type ClientData, type ClientModel } from "../lib/client-model";
import { SCORE_LABELS } from "../lib/types";
import { scoreLabel, scoreVersion } from "../lib/score-label";
import { orgColor } from "../lib/format";
import { modelPrice, scopedCatalogOffers, createOfferScope, priceContext, priceLabel, type PriceResult, type PriceSettings } from "../lib/cost";
import { NumFilter } from "./ui";
import { PriceValue, PriceAssumptions, priceNumber } from "./PriceValue";
import { useSettings } from "./SettingsContext";
import { preferredVariantIds, collapseModels, collapsedName, selectableModels } from "../lib/variants";

interface PoolEntry {
  m: ClientModel;
  price: PriceResult;
  sc: number | null;
  hasEvidence: boolean;
  offerCount: number;
}

function truncTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  const t = payload.value.length > 26 ? payload.value.slice(0, 25) + "…" : payload.value;
  return <text x={x} y={y} dy={3} textAnchor="end" fill="#9aa4b2" fontSize={11}><title>{payload.value}</title>{t}</text>;
}

export function ChartsBoard({ data }: { data: ClientData }) {
  const s = useSettings();
  const score = s.score;
  const priceSettings = useMemo<PriceSettings>(() => ({ priceMode: s.priceMode, inputWeight: s.inputWeight }), [s.priceMode, s.inputWeight]);
  const offerScope = useMemo(() => createOfferScope(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly), [s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly]);
  const [maxCost, setMaxCost] = useState("");
  const candidates = useMemo(() => selectableModels(data.models, s.hideDeprecated), [data.models, s.hideDeprecated]);
  const preferredId = useMemo(() => preferredVariantIds(candidates, score), [candidates, score]);

  const pool = useMemo<PoolEntry[]>(() => {
    const maxC = parseFloat(maxCost);
    let base = candidates;
    if (s.collapse) base = collapseModels(base, preferredId);
    if (s.openOnly) base = base.filter((m) => m.open_weights);
    if (s.featured) base = base.filter((m) => m.featured);
    if (s.familySet) base = base.filter((m) => s.familySet!.has(m.family_key));
    return base
      .map((m) => ({
        m,
        price: modelPrice(m, data, offerScope, priceSettings),
        sc: m.scores[score],
        hasEvidence: hasScoreEvidence(m, score),
        offerCount: scopedCatalogOffers(data.offersByModel[m.id], offerScope, priceContext(m, data, priceSettings)).length,
      }))
      .filter((x) => !offerScope.restricted || x.offerCount > 0)
      .filter((x) => (Number.isFinite(maxC) ? x.price.value != null && x.price.value <= maxC : true))
      // A composite with zero evidence is the neutral fallback 50, not a
      // measured score — it cannot satisfy a positive min-score filter.
      .filter((x) => (s.minScore > 0 ? x.hasEvidence && x.sc != null && x.sc >= s.minScore : true));
  }, [data, candidates, score, offerScope, priceSettings, s.collapse, s.featured, s.familySet, s.openOnly, s.minScore, maxCost, preferredId]);

  const leaderboard = useMemo(() =>
    pool.filter((x) => x.hasEvidence && x.sc != null).sort((a, b) => (b.sc as number) - (a.sc as number)).slice(0, 18)
      .map((x) => ({ name: collapsedName(x.m, s.collapse, preferredId), value: x.sc as number, org: x.m.org })),
    [pool, s.collapse, preferredId]);

  const cheapest = useMemo(() =>
    pool.filter((x) => x.price.value != null).sort((a, b) => (a.price.value as number) - (b.price.value as number)).slice(0, 18)
      .map((x) => ({ name: collapsedName(x.m, s.collapse, preferredId), value: x.price.value as number, org: x.m.org, price: x.price })),
    [pool, s.collapse, preferredId]);

  const openVsClosed = useMemo(() => {
    const groups = { Open: pool.filter((x) => x.m.open_weights), Closed: pool.filter((x) => !x.m.open_weights) };
    return Object.entries(groups).map(([k, arr]) => {
      const sc = arr.filter((x) => x.hasEvidence).map((x) => x.sc).filter((v): v is number => v != null);
      const priced = arr.filter((x) => x.price.value != null);
      const costSum = priced.reduce((a, x) => a + (x.price.value as number), 0);
      return {
        name: k,
        avgScore: sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : 0,
        avgCost: priced.length ? costSum / priced.length : null,
        costSum,
        priced,
      };
    });
  }, [pool]);

  const isElo = score.startsWith("designarena");
  const adjusted = s.priceMode === "adjusted";
  const unitShort = adjusted ? "USD/task" : "USD/1M";

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <span className="text-sm text-gray-400">Score: <b className="text-gray-200">{scoreLabel(score, data.sourceDates)}</b> · min {s.minScore} · costs: <b className="text-gray-200">{priceLabel(priceSettings)}</b></span>
        <NumFilter label={adjusted ? "Max $/task" : "Max $/1M"} value={maxCost} onChange={setMaxCost} placeholder="e.g. 5" />
        <span className="ml-auto text-xs text-gray-500">{pool.length} models within global provider filters</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={`Capability leaderboard — ${scoreLabel(score, data.sourceDates)}`}>
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

        <Panel title={`Cheapest models — ${priceLabel(priceSettings)}`}>
          <ResponsiveContainer width="100%" height={Math.max(360, cheapest.length * 26)}>
            <BarChart data={cheapest} layout="vertical" margin={{ left: 20, right: 64 }}>
              <CartesianGrid stroke="#222932" horizontal={false} />
              <XAxis type="number" stroke="#8a93a3" fontSize={11} tickFormatter={(v) => priceNumber(v)} />
              <YAxis type="category" dataKey="name" width={205} tick={truncTick} interval={0} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} formatter={(v: number) => [`${priceNumber(v)} ${unitShort}`, priceLabel(priceSettings)]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {cheapest.map((d, i) => <Cell key={i} fill={orgColor(d.org)} />)}
                <LabelList dataKey="value" position="right" fill="#cbd5e1" fontSize={11} formatter={(v: number) => priceNumber(v)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* The recharts tooltip is mouse-only, so every plotted price is also
              listed here with its exact inputs via the PriceValue expansion. */}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-gray-400">Plotted model costs (keyboard-accessible table, {cheapest.length} rows, {priceLabel(priceSettings)})</summary>
            <table className="dtable mt-2 w-full text-xs">
              <thead><tr>
                <th className="px-2 py-1 text-left text-gray-400">Model</th>
                <th className="px-2 py-1 text-right text-gray-400">{priceLabel(priceSettings)}</th>
              </tr></thead>
              <tbody>
                {cheapest.map((d, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">{d.name}</td>
                    <td className="px-2 py-1 text-right"><PriceValue price={d.price} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
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

        <Panel title={`Open weights vs closed — average cost (${priceLabel(priceSettings)})`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={openVsClosed} margin={{ left: 10, right: 20 }}>
              <CartesianGrid stroke="#222932" vertical={false} />
              <XAxis dataKey="name" stroke="#8a93a3" fontSize={12} />
              <YAxis stroke="#8a93a3" fontSize={11} tickFormatter={(v) => priceNumber(v)} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} formatter={(v: number) => [`${priceNumber(v)} ${unitShort}`, `Avg ${unitShort}`]} />
              <Bar dataKey="avgCost" name={`Avg cost ${unitShort}`} radius={[4, 4, 0, 0]}>
                <Cell fill="#7ee0c0" /><Cell fill="#5b9dff" />
                <LabelList dataKey="avgCost" position="top" fill="#cbd5e1" fontSize={11} formatter={(v: number) => priceNumber(v)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-gray-400">Constituent models behind each average — arithmetic mean = sum ÷ count</summary>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              {openVsClosed.map((g) => (
                <div key={g.name}>
                  <p className="mb-1 text-xs text-gray-300">
                    <b>{g.name}</b>: {g.priced.length ? <>{priceNumber(g.costSum)} ÷ {g.priced.length} = <b>{priceNumber(g.avgCost)}</b> <span className="text-gray-500">{unitShort} (arithmetic mean of the {g.priced.length} priced models below)</span></> : "No priced models; average unavailable."}
                  </p>
                  <table className="dtable w-full text-xs">
                    <tbody>
                      {g.priced.map((x) => (
                        <tr key={x.m.id}>
                          <td className="px-2 py-0.5">{collapsedName(x.m, s.collapse, preferredId)}</td>
                          <td className="px-2 py-0.5 text-right"><PriceValue price={x.price} compact /></td>
                        </tr>
                      ))}
                      {g.priced.length === 0 && <tr><td className="px-2 py-0.5 text-gray-500">No priced models in this group.</td></tr>}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </details>
        </Panel>
      </div>
      <PriceAssumptions />
    </div>
  );
}

const tip = { background: "#161b22", border: "1px solid #272e3a", borderRadius: 8, fontSize: 12, color: "#e6edf3" };
const tipLabel = { color: "#e6edf3", fontWeight: 600 };
const tipItem = { color: "#cbd5e1" };

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card p-4"><h2 className="mb-3 text-sm font-semibold text-gray-200">{title}</h2>{children}</div>;
}
