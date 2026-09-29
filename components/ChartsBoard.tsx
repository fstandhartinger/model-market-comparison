"use client";
import { useMemo } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { compositeChartVisible, compositeCoverageLabel, coverageMarker, hasScoreEvidence, type ClientData, type ClientModel } from "../lib/client-model";
import { SCORE_PICKER_LABELS, SCORE_SHORT_LABELS, type ScoreKey } from "../lib/types";
import { orgColor, counted } from "../lib/format";
import { FIXED_BLENDS, SCORE_OPTIONS, modelPrice, scopedCatalogOffers, scopeFromSettings, priceContext, priceLabel, type PriceResult, type PriceSettings } from "../lib/cost";
import { ScoreCostSliders } from "./ShortlistControls";
import { SIMPLE_LIMIT, activeCostMeasure, costMeasureChoices, topCandidates } from "../lib/value-map.mjs";
import { PriceValue, PriceAssumptions, priceNumber } from "./PriceValue";
import { useSettings } from "./SettingsContext";
import { CostCapabilityScatter } from "./CostCapabilityScatter";
import { preferredVariantIds, collapseModels, collapsedName, selectableModels } from "../lib/variants";
import { IncompleteCompositeToggle } from "./IncompleteCompositeToggle";
import { compositeBarStyle } from "./CompositeDot";

interface PoolEntry {
  m: ClientModel;
  price: PriceResult;
  sc: number | null;
  hasEvidence: boolean;
  offerCount: number;
}

/** F-09: bars are one accent colour; the organisation lives only in the 8 px dot before
 *  the label. The axis is 205 px wide, so the dot and label are anchored at its left edge. */
/** CR-211: `coverageByName` holds the "N/7" of an incomplete Main Composite; it stays readable after truncation. */
function orgTick(orgByName: Map<string, string>, coverageByName: Map<string, string> = new Map()) {
  return function OrgTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
    const coverage = coverageByName.get(payload.value);
    const max = coverage ? 21 : 26;
    const t = payload.value.length > max ? payload.value.slice(0, max - 1) + "…" : payload.value;
    const org = orgByName.get(payload.value);
    return <g>
      {org && <circle cx={x - 197} cy={y} r={4} fill={orgColor(org)} />}
      <text x={x - 188} y={y} dy={3} textAnchor="start" fill="#9aa4b2" fontSize={11}><title>{`${payload.value}${org ? ` · ${org}` : ""}${coverage ? ` · incomplete Composite, ${coverage} inputs` : ""}`}</title>{t}{coverage && <tspan fill="rgb(var(--warn))" data-incomplete-composite={coverage}> {coverage}</tspan>}</text>
    </g>;
  };
}

const BAR_FILL = "rgb(var(--accent))";

/** F-09: every model as a dot on one axis per group, with the group mean as a tick — the
 *  spread is the point, which two average bars hid. Missing values are not drawn. */
/** CR-211: `incomplete[i]` holds the "N/7" of a value from a Main Composite with fewer than 7 of 7 inputs (null when
 *  complete) — CR-213: drawn half-filled at 4/7–6/7, hollow and dashed at 3/7 or fewer. */
function DotStrip({ label, groups, format, log, composite = false }: { label: string; groups: { name: string; values: number[]; incomplete?: (string | null)[]; pointLabels?: string[] }[]; format: (v: number) => string; log?: boolean; composite?: boolean }) {
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
        const marks = g.values.map((v, i) => ({ v, thin: g.incomplete?.[i] ?? null, pointLabel: g.pointLabels?.[i] })).filter((d) => usable(d.v));
        const vals = marks.map((d) => d.v);
        const thin = marks.filter((d) => d.thin).length;
        const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        return (
          <div key={g.name} className="grid grid-cols-[5rem_1fr] items-center gap-2 pt-4">
            <span className="text-xs text-gray-400">{g.name} <span className="text-gray-600">({vals.length})</span></span>
            <div className="relative h-6 rounded bg-line/40" role="img" aria-label={`${g.name}: ${counted(vals.length, "model")}${thin ? `, ${thin} with an incomplete Composite (fewer than 7 of 7 inputs), drawn half-filled or hollow` : ""}${mean != null ? `, mean ${format(mean)}` : ", no values"}`}>
              {marks.map((d, i) => <span key={i} className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${d.thin ? "border" : "bg-accent/50"}`} data-incomplete-composite={d.thin || undefined} data-composite-marker={d.thin ? coverageMarker(d.thin) : undefined} title={`${d.pointLabel ? `${d.pointLabel} · ` : ""}${format(d.v)}${d.thin ? " · incomplete Composite" : composite ? " · Composite inputs 7/7" : ""}`} style={{ left: `${pos(d.v)}%`, ...(d.thin ? compositeBarStyle(d.thin, "rgb(var(--accent))") : {}) }} />)}
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

/** F-72: costs span > 100×, so they sit on a log axis padded to the value map's round money
 *  ticks. Returns a 0–100 position; free/zero values are pinned at the left edge (F-39). */
const MONEY_TICKS = [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100, 300];
function logScale(values: number[]) {
  const positive = values.filter((v) => Number.isFinite(v) && v > 0);
  const min = positive.length ? Math.min(...positive) : 1, max = positive.length ? Math.max(...positive) : 1;
  let lo = [...MONEY_TICKS].reverse().find((t) => t <= min) ?? min / 1.25;
  let hi = MONEY_TICKS.find((t) => t >= max) ?? max * 1.25;
  if (lo >= hi) { lo = lo / 3; hi = hi * 3; }
  const pos = (v: number) => (v > 0 ? Math.max(0, Math.min(100, 100 * (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)))) : 0);
  return { pos, ticks: MONEY_TICKS.filter((t) => t >= lo && t <= hi) };
}
const moneyTick = (v: number) => `$${v}`;

/** F-59: below md the 205 px category axis eats the recharts chart, so each bar chart is
 *  replaced by plain rows — org dot, name, value, and a 6 px bar proportional to the panel max.
 *  F-72: with `log`, the second line is a track with a dot at the log position instead. */
function MobileBars({ rows, max, format, log }: { rows: { name: string; org: string; value: number; coverage?: string | null }[]; max: number; format: (v: number) => string; log?: boolean }) {
  const scale = log ? logScale(rows.map((r) => r.value)) : null;
  return <>{rows.map((row, i) => (
    <div className="py-1.5" role="listitem" key={i}>
      <div className="flex items-center gap-2 text-[13px]">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: orgColor(row.org) }} />
        <span className="min-w-0 flex-1 truncate">{row.name}</span>
        {row.coverage && <span className="bh-thin-tag" data-incomplete-composite={row.coverage} title={`Incomplete Composite: ${row.coverage.replace("/", " of ")} inputs`}><span aria-hidden="true">{row.coverage}</span><span className="sr-only">Incomplete Composite: {row.coverage.replace("/", " of ")} inputs</span></span>}
        <span className="tabular text-gray-400">{format(row.value)}</span>
      </div>
      {scale
        ? <div className="bh-cost-track relative mx-1 mt-1.5 h-0.5 rounded bg-line/50"><span className="bh-cost-dot absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${scale.pos(row.value)}%` }} /></div>
        : <div className="mt-1 h-1.5 rounded bg-line"><div className={`h-full rounded ${row.coverage ? "border" : "bg-accent/80"}`} style={{ width: `${Math.max(0.5, 100 * row.value / max)}%`, ...(row.coverage ? compositeBarStyle(row.coverage, "rgb(var(--accent))") : {}) }} /></div>}
    </div>
  ))}</>;
}

/** F-72: desktop "Cheapest models" — one 26 px row per model, org dot + name in a 205 px column,
 *  a muted track with a 7 px accent dot at the log position and the value to its right. */
function CostDotPlot({ rows, format, unit, label }: { rows: { name: string; org: string; value: number }[]; format: (v: number) => string; unit: string; label: string }) {
  const { pos, ticks } = logScale(rows.map((r) => r.value));
  return (
    <div className="bh-cost-plot text-[11px]" role="list" aria-label="Cheapest models">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-[205px] right-16" aria-hidden>
          {ticks.map((t) => <span key={t} className="absolute inset-y-0 w-px bg-line/40" style={{ left: `${pos(t)}%` }} />)}
        </div>
        {rows.map((row, i) => (
          <div key={i} role="listitem" className="grid h-[26px] grid-cols-[205px_1fr_4rem] items-center" title={`${row.name} · ${row.org} · ${format(row.value)} ${unit}`} aria-label={`${row.name}: ${format(row.value)} ${unit}`}>
            <span className="flex min-w-0 items-center gap-[5px] pr-2 text-[#9aa4b2]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: orgColor(row.org) }} />
              <span className="truncate">{row.name}</span>
            </span>
            <span className="bh-cost-track relative h-0.5 rounded bg-line/50">
              <span className="bh-cost-dot absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${pos(row.value)}%` }} />
              <span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-2 tabular text-gray-400" style={{ left: `${pos(row.value)}%` }}>{format(row.value)}</span>
            </span>
            <span />
          </div>
        ))}
      </div>
      <div className="relative ml-[205px] mr-16 mt-1 h-4 text-gray-500" aria-hidden>
        {ticks.map((t) => <span key={t} className="bh-cost-tick absolute -translate-x-1/2 tabular" style={{ left: `${pos(t)}%` }}>{moneyTick(t)}</span>)}
      </div>
      <div className="mt-1 text-right text-gray-500">{label} · log scale</div>
    </div>
  );
}

export function ChartsBoard({ data }: { data: ClientData }) {
  const s = useSettings();
  const score = s.score;
  const priceSettings = useMemo<PriceSettings>(() => ({ priceMode: s.priceMode, inputWeight: s.inputWeight, ioBasis: s.ioBasis }), [s.priceMode, s.inputWeight, s.ioBasis]);
  const offerScope = useMemo(() => scopeFromSettings(s, data.providers), [s.excludedSet, s.hostedIn, s.providerBasedIn, data.providers, s.allowDataTraining]);
  const candidates = useMemo(() => selectableModels(data.models, s.hideDeprecated), [data.models, s.hideDeprecated]);
  const preferredId = useMemo(() => preferredVariantIds(candidates, score), [candidates, score]);
  // CR-26.1: Simple's candidate rule — until Featured is set by hand, the top 30 families (AA Intelligence, then
  // ECI) inside every other filter; with Featured set by hand, that choice applies as before.
  const expand = !s.featuredTouched;

  // Everything the filters allow, before the two sliders — the field the slider histograms describe.
  const base = useMemo<PoolEntry[]>(() => {
    let models = candidates;
    if (s.collapse) models = collapseModels(models, preferredId);
    if (s.openOnly) models = models.filter((m) => m.open_weights);
    if (s.labAllowed) models = models.filter((m) => s.labAllowed!(m.org));
    if (!expand && s.featured) models = models.filter((m) => m.featured);
    if (s.familySet) models = models.filter((m) => s.familySet!.has(m.family_key));
    const rows = models
      .map((m) => ({
        m,
        price: modelPrice(m, data, offerScope, priceSettings),
        sc: m.scores[score],
        hasEvidence: hasScoreEvidence(m, score),
        offerCount: scopedCatalogOffers(data.offersByModel[m.id], offerScope, priceContext(m, data, priceSettings)).length,
      }))
      .filter((x) => !offerScope.restricted || x.offerCount > 0);
    return expand ? topCandidates(rows, (x) => x.m, SIMPLE_LIMIT) : rows;
  }, [data, candidates, score, offerScope, priceSettings, s.collapse, s.featured, expand, s.familySet, s.openOnly, s.labAllowed, preferredId]);

  const pool = useMemo(() => base
    .filter((x) => (s.maxCost != null ? x.price.value != null && x.price.value <= s.maxCost : true))
    // A composite with zero evidence is the neutral fallback 50, not a
    // measured score — it cannot satisfy a positive min-score filter.
    .filter((x) => (s.advancedMinScore > 0 ? x.hasEvidence && x.sc != null && x.sc >= s.advancedMinScore : true)),
  [base, s.maxCost, s.advancedMinScore]);
  const costChoices = costMeasureChoices(FIXED_BLENDS, s.inputWeight);

  // CR-211: on the Main Composite the score panels plot only 7/7 models unless the reader includes incomplete ones
  // (then marked "N/7"). The cost-only panels are not gated, and no other score is.
  const includeIncomplete = s.showIncompleteComposites;
  const scored = useMemo(() => pool.filter((x) => x.hasEvidence && x.sc != null), [pool]);
  const scoredShown = useMemo(() => scored.filter((x) => compositeChartVisible(x.m, score, includeIncomplete)), [scored, score, includeIncomplete]);
  const scoreHidden = scored.length - scoredShown.length;

  const leaderboard = useMemo(() =>
    [...scoredShown].sort((a, b) => (b.sc as number) - (a.sc as number)).slice(0, 18)
      .map((x) => ({ name: collapsedName(x.m, s.collapse, preferredId), value: x.sc as number, org: x.m.org, coverage: compositeCoverageLabel(x.m, score) })),
    [scoredShown, s.collapse, preferredId, score]);
  const leaderIncomplete = leaderboard.filter((d) => d.coverage).length;

  const cheapest = useMemo(() =>
    pool.filter((x) => x.price.value != null).sort((a, b) => (a.price.value as number) - (b.price.value as number)).slice(0, 18)
      .map((x) => ({ name: collapsedName(x.m, s.collapse, preferredId), value: x.price.value as number, org: x.m.org, price: x.price })),
    [pool, s.collapse, preferredId]);

  const leaderTick = useMemo(() => orgTick(new Map(leaderboard.map((d) => [d.name, d.org])), new Map(leaderboard.flatMap((d) => d.coverage ? [[d.name, d.coverage] as [string, string]] : []))), [leaderboard]);

  const openVsClosed = useMemo(() => {
    const groups = { Open: pool.filter((x) => x.m.open_weights), Closed: pool.filter((x) => !x.m.open_weights) };
    return Object.entries(groups).map(([k, arr]) => {
      // No measured score is not a zero: models without evidence are left out, not plotted at 0.
      // CR-211: the score strip follows the incomplete-Composite toggle; the cost strip does not.
      const scoredRows = arr.filter((x) => x.hasEvidence && x.sc != null && compositeChartVisible(x.m, score, includeIncomplete));
      const scores = scoredRows.map((x) => x.sc as number);
      const incomplete = scoredRows.map((x) => compositeCoverageLabel(x.m, score));
      const priced = arr.filter((x) => x.price.value != null);
      const costSum = priced.reduce((a, x) => a + (x.price.value as number), 0);
      const scoreRows = scoredRows.map((x) => ({ id: x.m.id, name: collapsedName(x.m, s.collapse, preferredId), value: x.sc as number, coverage: compositeCoverageLabel(x.m, score) }));
      return { name: k, scores, incomplete, scoreRows, costs: priced.map((x) => x.price.value as number), avgCost: priced.length ? costSum / priced.length : null, costSum, priced };
    });
  }, [pool, score, includeIncomplete, s.collapse, preferredId]);
  const stripIncomplete = openVsClosed.reduce((n, g) => n + g.incomplete.filter(Boolean).length, 0);

  const isElo = score.startsWith("designarena");
  const adjusted = s.priceMode === "adjusted";
  const unitShort = adjusted ? "USD/task" : "USD/1M";

  return (
    <div>
      {/* CR-26.1 (F-96): the value map leads Charts at full width — the Simple map's pieces (reversed cost axis,
          attractive quadrant, Pareto line, in-chart names, fitted Y axis, cogwheel, credits), with the score and
          cost pickers and both sliders in its header. The sliders set the floor and cap every panel below uses. */}
      <div className="card mb-4 p-3 lg:p-4" data-bh-charts-map>
        <ScoreCostSliders className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6"
          scores={base.filter((x) => x.hasEvidence).map((x) => x.sc).filter((v): v is number => v != null)}
          costs={base.map((x) => x.price.value).filter((v): v is number => v != null)}
          score={score} scoreName={SCORE_SHORT_LABELS[score]}
          minScore={s.advancedMinScore} setMinScore={s.setAdvancedMinScore}
          maxCost={s.maxCost} setMaxCost={s.setMaxCost}
          costUnit={adjusted ? "adjusted $/task" : "raw blended $/1M"}
          scoreChoices={SCORE_OPTIONS.map((k) => ({ id: k, label: SCORE_PICKER_LABELS[k] }))} onScore={(id) => s.setScore(id as ScoreKey)}
          costChoices={costChoices} costChoice={activeCostMeasure(costChoices, s.priceMode, s.inputWeight)}
          onCost={(id) => { const c = costChoices.find((x) => x.id === id); if (!c) return; if (c.patch.inputWeight != null) s.setInputWeight(c.patch.inputWeight); s.setPriceMode(c.patch.priceMode); s.setMaxCost(null); }} />
        <div className="mt-3">
          <CostCapabilityScatter data={data} compact advanced wide ids={expand ? base.map((x) => x.m.id) : undefined} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={`Capability leaderboard — ${SCORE_SHORT_LABELS[score]}`}>
          <IncompleteCompositeToggle score={score} hidden={scoreHidden} shown={leaderIncomplete} className="-mt-2 mb-2" />
          <div className="md:hidden" role="list" aria-label="Capability leaderboard">
            <MobileBars rows={leaderboard} max={isElo ? Math.max(...leaderboard.map((d) => d.value)) : 100} format={(v) => v.toFixed(isElo ? 0 : 1)} />
          </div>
          <div className="hidden md:block">
            <ResponsiveContainer width="100%" height={Math.max(360, leaderboard.length * 26)}>
              <BarChart data={leaderboard} layout="vertical" margin={{ left: 20, right: 44 }}>
                <CartesianGrid stroke="#222932" horizontal={false} />
                <XAxis type="number" stroke="#8a93a3" fontSize={11} domain={isElo ? ["dataMin - 20", "dataMax"] : [0, "auto"]} />
                <YAxis type="category" dataKey="name" width={205} tick={leaderTick} interval={0} />
                <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem}
                  labelFormatter={(name: string) => { const c = leaderboard.find((d) => d.name === name)?.coverage; return c ? `${name} · incomplete Composite, ${c} inputs` : score === "composite" ? `${name} · Composite inputs 7/7` : name; }} />
                <Bar dataKey="value" fill={BAR_FILL} fillOpacity={0.8} radius={[0, 4, 4, 0]}>
                  {leaderboard.map((d, i) => <Cell key={i} fillOpacity={d.coverage ? coverageMarker(d.coverage) === "half" ? 0.45 : 0.1 : 0.8} stroke={d.coverage ? BAR_FILL : undefined} strokeDasharray={d.coverage && coverageMarker(d.coverage) === "hollow" ? "3 2" : undefined} />)}
                  <LabelList dataKey="value" position="right" fill="#8a93a3" fontSize={11} formatter={(v: number) => v.toFixed(isElo ? 0 : 1)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel id="cheapest" title={`Cheapest models — ${priceLabel(priceSettings)}`}>
          <div className="md:hidden" role="list" aria-label="Cheapest models">
            <MobileBars rows={cheapest} max={Math.max(...cheapest.map((d) => d.value))} format={priceNumber} log />
            <p className="mt-1 text-right text-[11px] text-gray-500">{adjusted ? "Adjusted cost" : "Cost"} · log scale</p>
          </div>
          <div className="hidden md:block">
            <CostDotPlot rows={cheapest} format={priceNumber} unit={unitShort} label={adjusted ? "Adjusted cost" : "Cost"} />
          </div>
          {/* The recharts tooltip is mouse-only, so every plotted price is also
              listed here with its exact inputs via the PriceValue expansion. */}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-gray-400">Plotted model costs (keyboard-accessible table, {counted(cheapest.length, "row")}, {priceLabel(priceSettings)})</summary>
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

        <Panel id="open-vs-closed" title="Open weights vs closed">
          <IncompleteCompositeToggle score={score} hidden={scoreHidden} shown={stripIncomplete} className="-mt-2 mb-2" />
          <DotStrip label={SCORE_SHORT_LABELS[score]} format={(v) => v.toFixed(isElo ? 0 : 1)} composite={score === "composite"}
            groups={openVsClosed.map((g) => ({ name: g.name, values: g.scores, incomplete: g.incomplete, pointLabels: g.scoreRows.map((r) => `${r.name}${r.coverage ? ` · ${r.coverage}` : ""}`) }))} />
          {score === "composite" && includeIncomplete && stripIncomplete > 0 && <details className="mb-4 text-xs" data-bh-composite-strip-labels>
            <summary className="cursor-pointer text-gray-400">Composite points by model, with each input count</summary>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              {openVsClosed.map((g) => <div key={g.name}>
                <p className="mb-1 font-semibold text-gray-300">{g.name}</p>
                <ul className="space-y-1">
                  {g.scoreRows.map((r) => <li key={r.id} className="flex justify-between gap-3 text-gray-400"><span className="min-w-0 truncate">{r.name}</span><span className="shrink-0 tabular">{r.value.toFixed(1)}{r.coverage && <span className="ml-2 text-amber-300" data-incomplete-composite={r.coverage}>{r.coverage}</span>}</span></li>)}
                </ul>
              </div>)}
            </div>
          </details>}
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
      </div>
      <PriceAssumptions />
    </div>
  );
}

const tip = { background: "#161b22", border: "1px solid #272e3a", borderRadius: 8, fontSize: 12, color: "#e6edf3" };
const tipLabel = { color: "#e6edf3", fontWeight: 600 };
const tipItem = { color: "#cbd5e1" };

function Panel({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return <div id={id} className="card scroll-mt-4 p-4"><h2 className="mb-3 text-sm font-semibold text-gray-200">{title}</h2>{children}</div>;
}
