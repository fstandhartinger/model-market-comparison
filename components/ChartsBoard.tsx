"use client";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { hasScoreEvidence, type ClientData, type ClientModel } from "../lib/client-model";
import { SCORE_SHORT_LABELS } from "../lib/types";
import { orgColor } from "../lib/format";
import { modelPrice, scopedCatalogOffers, createOfferScope, priceContext, priceLabel, type PriceResult, type PriceSettings } from "../lib/cost";
import { NumFilter } from "./ui";
import { PriceValue, PriceAssumptions, priceNumber } from "./PriceValue";
import { useSettings } from "./SettingsContext";
import { CostCapabilityScatter } from "./CostCapabilityScatter";
import { preferredVariantIds, collapseModels, collapsedName, selectableModels } from "../lib/variants";

interface PoolEntry {
  m: ClientModel;
  price: PriceResult;
  sc: number | null;
  hasEvidence: boolean;
  offerCount: number;
}

/** F-09: bars are one accent colour; the organisation lives only in the 8 px dot before
 *  the label. The axis is 205 px wide, so the dot and label are anchored at its left edge. */
function orgTick(orgByName: Map<string, string>) {
  return function OrgTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
    const t = payload.value.length > 26 ? payload.value.slice(0, 25) + "…" : payload.value;
    const org = orgByName.get(payload.value);
    return <g>
      {org && <circle cx={x - 197} cy={y} r={4} fill={orgColor(org)} />}
      <text x={x - 188} y={y} dy={3} textAnchor="start" fill="#9aa4b2" fontSize={11}><title>{org ? `${payload.value} · ${org}` : payload.value}</title>{t}</text>
    </g>;
  };
}

const BAR_FILL = "rgb(var(--accent))";

/** F-09: every model as a dot on one axis per group, with the group mean as a tick — the
 *  spread is the point, which two average bars hid. Missing values are not drawn. */
function DotStrip({ label, groups, format, log }: { label: string; groups: { name: string; values: number[] }[]; format: (v: number) => string; log?: boolean }) {
  const usable = (v: number) => Number.isFinite(v) && (!log || v > 0);
  const all = groups.flatMap((g) => g.values).filter(usable);
  if (!all.length) return <p className="mb-4 text-xs text-gray-500">{label}: no values in view.</p>;
  let lo = Math.min(...all), hi = Math.max(...all);
  if (lo === hi) { lo = log ? lo / 1.5 : lo - 1; hi = log ? hi * 1.5 : hi + 1; }
  const pos = (v: number) => 100 * (log ? (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) : (v - lo) / (hi - lo));
  const clamp = (p: number) => Math.max(6, Math.min(94, p));
  return (
    <div className="mb-5">
      <div className="mb-1 flex justify-between gap-2 text-[11px] text-gray-500"><span>{label}</span><span className="tabular">{format(lo)} – {format(hi)}{log ? " · log scale" : ""}</span></div>
      {groups.map((g) => {
        const vals = g.values.filter(usable);
        const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        return (
          <div key={g.name} className="grid grid-cols-[5rem_1fr] items-center gap-2 pt-4">
            <span className="text-xs text-gray-400">{g.name} <span className="text-gray-600">({vals.length})</span></span>
            <div className="relative h-6 rounded bg-white/[0.03]" role="img" aria-label={`${g.name}: ${vals.length} models${mean != null ? `, mean ${format(mean)}` : ", no values"}`}>
              {vals.map((v, i) => <span key={i} className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/50" style={{ left: `${pos(v)}%` }} />)}
              {mean != null && <>
                <span className="absolute top-0 h-6 w-0.5 -translate-x-1/2 bg-gray-400" style={{ left: `${pos(mean)}%` }} />
                <span className="absolute -top-4 -translate-x-1/2 whitespace-nowrap text-[10px] tabular text-gray-400" style={{ left: `${clamp(pos(mean))}%` }}>mean {format(mean)}</span>
              </>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** F-59: below md the 205 px category axis eats the recharts chart, so each bar chart is
 *  replaced by plain rows — org dot, name, value, and a 6 px bar proportional to the panel max. */
function MobileBars({ rows, max, format }: { rows: { name: string; org: string; value: number }[]; max: number; format: (v: number) => string }) {
  return <>{rows.map((row, i) => (
    <div className="py-1.5" role="listitem" key={i}>
      <div className="flex items-center gap-2 text-[13px]">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: orgColor(row.org) }} />
        <span className="min-w-0 flex-1 truncate">{row.name}</span>
        <span className="tabular text-gray-400">{format(row.value)}</span>
      </div>
      <div className="mt-1 h-1.5 rounded bg-white/[0.06]"><div className="h-full rounded bg-accent/80" style={{ width: `${Math.max(0.5, 100 * row.value / max)}%` }} /></div>
    </div>
  ))}</>;
}

export function ChartsBoard({ data }: { data: ClientData }) {
  const s = useSettings();
  const score = s.score;
  const priceSettings = useMemo<PriceSettings>(() => ({ priceMode: s.priceMode, inputWeight: s.inputWeight }), [s.priceMode, s.inputWeight]);
  const offerScope = useMemo(() => createOfferScope(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly, !s.allowDataTraining), [s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly, s.allowDataTraining]);
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
      .filter((x) => (s.advancedMinScore > 0 ? x.hasEvidence && x.sc != null && x.sc >= s.advancedMinScore : true));
  }, [data, candidates, score, offerScope, priceSettings, s.collapse, s.featured, s.familySet, s.openOnly, s.advancedMinScore, maxCost, preferredId]);

  const leaderboard = useMemo(() =>
    pool.filter((x) => x.hasEvidence && x.sc != null).sort((a, b) => (b.sc as number) - (a.sc as number)).slice(0, 18)
      .map((x) => ({ name: collapsedName(x.m, s.collapse, preferredId), value: x.sc as number, org: x.m.org })),
    [pool, s.collapse, preferredId]);

  const cheapest = useMemo(() =>
    pool.filter((x) => x.price.value != null).sort((a, b) => (a.price.value as number) - (b.price.value as number)).slice(0, 18)
      .map((x) => ({ name: collapsedName(x.m, s.collapse, preferredId), value: x.price.value as number, org: x.m.org, price: x.price })),
    [pool, s.collapse, preferredId]);

  const leaderTick = useMemo(() => orgTick(new Map(leaderboard.map((d) => [d.name, d.org]))), [leaderboard]);
  const cheapTick = useMemo(() => orgTick(new Map(cheapest.map((d) => [d.name, d.org]))), [cheapest]);

  const openVsClosed = useMemo(() => {
    const groups = { Open: pool.filter((x) => x.m.open_weights), Closed: pool.filter((x) => !x.m.open_weights) };
    return Object.entries(groups).map(([k, arr]) => {
      // No measured score is not a zero: models without evidence are left out, not plotted at 0.
      const scores = arr.filter((x) => x.hasEvidence).map((x) => x.sc).filter((v): v is number => v != null);
      const priced = arr.filter((x) => x.price.value != null);
      const costSum = priced.reduce((a, x) => a + (x.price.value as number), 0);
      return { name: k, scores, costs: priced.map((x) => x.price.value as number), avgCost: priced.length ? costSum / priced.length : null, costSum, priced };
    });
  }, [pool]);

  const isElo = score.startsWith("designarena");
  const adjusted = s.priceMode === "adjusted";
  const unitShort = adjusted ? "USD/task" : "USD/1M";

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <span className="text-sm text-gray-400">Score <b className="text-gray-200">{SCORE_SHORT_LABELS[score]}</b> · Cost <b className="text-gray-200">{priceLabel(priceSettings)}</b> ·</span>
        <NumFilter label={adjusted ? "Max $/task" : "Max $/1M"} value={maxCost} onChange={setMaxCost} placeholder="e.g. 5" />
        <span className="ml-auto text-xs text-gray-500">{pool.length} models</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={`Capability leaderboard — ${SCORE_SHORT_LABELS[score]}`}>
          <div className="md:hidden" role="list" aria-label="Capability leaderboard">
            <MobileBars rows={leaderboard} max={isElo ? Math.max(...leaderboard.map((d) => d.value)) : 100} format={(v) => v.toFixed(isElo ? 0 : 1)} />
          </div>
          <div className="hidden md:block">
            <ResponsiveContainer width="100%" height={Math.max(360, leaderboard.length * 26)}>
              <BarChart data={leaderboard} layout="vertical" margin={{ left: 20, right: 44 }}>
                <CartesianGrid stroke="#222932" horizontal={false} />
                <XAxis type="number" stroke="#8a93a3" fontSize={11} domain={isElo ? ["dataMin - 20", "dataMax"] : [0, "auto"]} />
                <YAxis type="category" dataKey="name" width={205} tick={leaderTick} interval={0} />
                <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} />
                <Bar dataKey="value" fill={BAR_FILL} fillOpacity={0.8} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="value" position="right" fill="#8a93a3" fontSize={11} formatter={(v: number) => v.toFixed(isElo ? 0 : 1)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title={`Cheapest models — ${priceLabel(priceSettings)}`}>
          <div className="md:hidden" role="list" aria-label="Cheapest models">
            <MobileBars rows={cheapest} max={Math.max(...cheapest.map((d) => d.value))} format={priceNumber} />
          </div>
          <div className="hidden md:block">
            <ResponsiveContainer width="100%" height={Math.max(360, cheapest.length * 26)}>
              <BarChart data={cheapest} layout="vertical" margin={{ left: 20, right: 64 }}>
                <CartesianGrid stroke="#222932" horizontal={false} />
                <XAxis type="number" stroke="#8a93a3" fontSize={11} tickFormatter={(v) => priceNumber(v)} />
                <YAxis type="category" dataKey="name" width={205} tick={cheapTick} interval={0} />
                <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} formatter={(v: number) => [`${priceNumber(v)} ${unitShort}`, priceLabel(priceSettings)]} />
                <Bar dataKey="value" fill={BAR_FILL} fillOpacity={0.8} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="value" position="right" fill="#8a93a3" fontSize={11} formatter={(v: number) => priceNumber(v)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
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

        <Panel title="Open weights vs closed">
          <DotStrip label={SCORE_SHORT_LABELS[score]} format={(v) => v.toFixed(isElo ? 0 : 1)}
            groups={openVsClosed.map((g) => ({ name: g.name, values: g.scores }))} />
          <DotStrip label={`Cost (${unitShort})`} format={(v) => priceNumber(v)} log
            groups={openVsClosed.map((g) => ({ name: g.name, values: g.costs }))} />
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-gray-400">Constituent models behind each mean cost — arithmetic mean = sum ÷ count</summary>
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

        {/* F-09: the graphical home of the thesis in Advanced — the same value map as Simple,
            fed by the Advanced filter pool. */}
        <Panel title="Score vs cost">
          <CostCapabilityScatter data={data} compact advanced />
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
