"use client";
import { Fragment, useMemo, useState } from "react";
import { hasScoreEvidence, type ClientData, type ClientModel } from "../lib/client-model";
import { SCORE_LABELS } from "../lib/types";
import { scoreLabel, scoreVersion } from "../lib/score-label";
import { num, orgColor } from "../lib/format";
import { rankedOffers, createOfferScope, priceContext, priceLabel, type PriceSettings, type PriceResult } from "../lib/cost";
import { DataBar } from "./ui";
import { PriceValue, PriceAssumptions, priceNumber } from "./PriceValue";
import { useSettings } from "./SettingsContext";
import { preferredVariantIds, collapseModels, collapsedName, selectableModels } from "../lib/variants";

type Mode = "all" | "model";

interface Constituent { name: string; price: PriceResult }
interface Row {
  key: string; platform: string; provider: string;
  models_offered: number;        // models this provider prices (within peer set)
  avg_rank: number | null;       // avg price rank across those models (1 = cheapest)
  best_rank: number | null;
  avg_price: number | null;      // avg of per-model prices, active price mode
  avg_price_result: PriceResult | null;
  constituents: Constituent[];   // every per-model price behind avg_price
  policy_equivalent_models: number;
  model_price: number | null;    // price for the selected single model, active price mode
  model_price_result: PriceResult | null;
  model_rank: number | null;
  model_policy_equivalent: boolean;
}

/** Explainable arithmetic average of per-model prices: sum(costs)/count. Every
 *  constituent is listed in the row's expand, each with its own PriceValue. */
function averagePriceResult(constituents: Constituent[], settings: PriceSettings): PriceResult | null {
  const priced = constituents.filter((c) => c.price.value != null);
  if (!priced.length) return null;
  return {
    value: priced.reduce((x, c) => x + (c.price.value as number), 0) / priced.length,
    unit: priced[0].price.unit,
    label: `Average ${priceLabel(settings)}`,
    assumptions: [`Arithmetic average of the ${priced.length} per-model prices listed in this row's expand: sum(costs)/count. Each constituent keeps its own model context; expand the row or click a constituent to audit its inputs.`],
    effective: null,
    sources: [],
  };
}

/** Explainable delta of one provider's price vs the cheapest provider's. */
function deltaPriceResult(mine: PriceResult, cheapest: PriceResult, settings: PriceSettings): PriceResult {
  return {
    value: mine.value != null && cheapest.value != null ? mine.value - cheapest.value : null,
    unit: mine.unit,
    label: `Δ vs cheapest (${priceLabel(settings)})`,
    assumptions: [`This provider's price minus the cheapest provider's (${cheapest.provider ?? "cheapest"}). Both constituents are the underlined headline prices in this table; click each for its inputs and sources.`],
    effective: null,
    sources: [],
  };
}

export function ProvidersView({ data }: { data: ClientData }) {
  const s = useSettings();
  const score = s.score;
  const priceSettings = useMemo<PriceSettings>(() => ({ priceMode: s.priceMode, inputWeight: s.inputWeight }), [s.priceMode, s.inputWeight]);
  const offerScope = useMemo(() => createOfferScope(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly), [s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly]);
  const candidates = useMemo(() => selectableModels(data.models, s.hideDeprecated), [data.models, s.hideDeprecated]);
  const preferredId = useMemo(() => preferredVariantIds(candidates, score), [candidates, score]);
  const [mode, setMode] = useState<Mode>("model");
  const [scorePeersOnly, setScorePeersOnly] = useState(true);
  const [modelId, setModelId] = useState<string>("");
  const [modelQ, setModelQ] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const eligible = (m: ClientModel) => {
    if (s.openOnly && !m.open_weights) return false;
    if (s.featured && !m.featured) return false;
    if (s.familySet && !s.familySet.has(m.family_key)) return false;
    // A composite without benchmark evidence is the neutral fallback 50, not a
    // measured score — it must not satisfy a positive min-score filter.
    if (s.minScore > 0 && (!hasScoreEvidence(m, score) || (m.scores[score] as number) < s.minScore)) return false;
    return true;
  };

  // models eligible for the peer set
  const peerModels = useMemo(() => {
    const collapsed = s.collapse ? collapseModels(candidates, preferredId) : candidates;
    const filtered = collapsed.filter((m) => {
      if (scorePeersOnly && !hasScoreEvidence(m, score)) return false;
      if (!eligible(m)) return false;
      return rankedOffers(data.offersByModel[m.id], offerScope, priceContext(m, data, priceSettings)).length > 0;
    });
    if (!s.collapse) return filtered;

    const fams = new Map<string, ClientModel>();
    for (const m of filtered) {
      const previous = fams.get(m.family_key);
      if (!previous || (m.scores[score] ?? -Infinity) > (previous.scores[score] ?? -Infinity)) fams.set(m.family_key, m);
    }
    return [...fams.values()];
  }, [data, candidates, score, scorePeersOnly, offerScope, preferredId, priceSettings, s.collapse, s.featured, s.familySet, s.openOnly, s.minScore]);

  const modelOptions = useMemo(
    () => (s.collapse ? collapseModels(candidates, preferredId) : candidates)
      .filter((m) => rankedOffers(data.offersByModel[m.id], offerScope, priceContext(m, data, priceSettings)).length)
      .filter((m) => eligible(m))
      .sort((a, b) => (b.scores[score] ?? -Infinity) - (a.scores[score] ?? -Infinity)),
    [data, candidates, score, offerScope, preferredId, priceSettings, s.collapse, s.featured, s.familySet, s.openOnly, s.minScore]
  );
  const defaultModel = modelOptions.find((m) => m.family_key === "kimi-k2.6" && m.variant !== "non-reasoning")
    || modelOptions.find((m) => m.family_key === "kimi-k2.6") || modelOptions[0];
  const selectedModel = modelOptions.find((m) => m.id === modelId) || defaultModel;

  // Searchable model picker: composite-sorted, filtered by the search box.
  const pickerRows = useMemo(() => {
    let r = [...modelOptions];
    if (modelQ.trim()) { const t = modelQ.toLowerCase(); r = r.filter((m) => m.display_name.toLowerCase().includes(t) || m.org.toLowerCase().includes(t)); }
    return r.sort((a, b) => (b.scores.composite ?? -Infinity) - (a.scores.composite ?? -Infinity));
  }, [modelOptions, modelQ]);
  const pickerMaxComposite = Math.max(1, ...pickerRows.map((m) => m.scores.composite ?? 0));

  const rows = useMemo<Row[]>(() => {
    const agg = new Map<string, { ranks: number[]; prices: number[]; constituents: Constituent[]; policyEquivalentModels: number; platform: string; provider: string }>();
    const ensure = (key: string, platform: string, provider: string) => {
      if (!agg.has(key)) agg.set(key, { ranks: [], prices: [], constituents: [], policyEquivalentModels: 0, platform, provider });
      return agg.get(key)!;
    };
    // aggregate across peer-set families
    for (const fam of peerModels) {
      const ctx = priceContext(fam, data, priceSettings);
      const ranked = rankedOffers(data.offersByModel[fam.id], offerScope, ctx);
      ranked.forEach((o, idx) => {
        const a = ensure(o.key, o.platform, o.provider);
        a.ranks.push(idx + 1);
        a.prices.push(o.blended);
        a.constituents.push({ name: collapsedName(fam, s.collapse, preferredId), price: o.price });
        if (o.eu_policy_equivalent) a.policyEquivalentModels += 1;
      });
    }
    // single-model ranking
    const modelCtx = selectedModel ? priceContext(selectedModel, data, priceSettings) : null;
    const modelRanked = modelCtx ? rankedOffers(data.offersByModel[selectedModel!.id], offerScope, modelCtx) : [];
    const modelRankByKey = new Map<string, { rank: number; price: number; priceResult: PriceResult; policyEquivalent: boolean }>();
    modelRanked.forEach((o, i) => modelRankByKey.set(o.key, { rank: i + 1, price: o.blended, priceResult: o.price, policyEquivalent: !!o.eu_policy_equivalent }));

    const out: Row[] = [];
    for (const p of data.providers) {
      const a = agg.get(p.key);
      const mr = modelRankByKey.get(p.key);
      const avgRank = a && a.ranks.length ? a.ranks.reduce((x, y) => x + y, 0) / a.ranks.length : null;
      const avgResult = a ? averagePriceResult(a.constituents, priceSettings) : null;
      out.push({
        key: p.key, platform: p.platform, provider: p.provider,
        models_offered: a ? a.ranks.length : 0,
        avg_rank: avgRank,
        best_rank: a && a.ranks.length ? Math.min(...a.ranks) : null,
        avg_price: avgResult ? avgResult.value : null,
        avg_price_result: avgResult,
        constituents: a ? a.constituents : [],
        policy_equivalent_models: a?.policyEquivalentModels ?? 0,
        model_price: mr ? mr.price : null,
        model_price_result: mr ? mr.priceResult : null,
        model_rank: mr ? mr.rank : null,
        model_policy_equivalent: mr?.policyEquivalent ?? false,
      });
    }
    // sort by the active metric
    if (mode === "model") out.sort((x, y) => (x.model_price ?? Infinity) - (y.model_price ?? Infinity));
    else out.sort((x, y) => (x.avg_rank ?? Infinity) - (y.avg_rank ?? Infinity));
    return out;
  }, [data, peerModels, selectedModel, mode, offerScope, priceSettings, s.collapse, preferredId]);

  let shown = mode === "model" ? rows.filter((r) => r.model_price != null) : rows.filter((r) => r.models_offered > 0);
  const maxAvgRank = Math.max(1, ...shown.map((r) => r.avg_rank ?? 0));
  const maxAvgPrice = Math.max(1, ...shown.map((r) => r.avg_price ?? 0));
  const maxModelPrice = Math.max(1, ...shown.map((r) => r.model_price ?? 0));
  const cheapestResult = mode === "model" ? shown[0]?.model_price_result ?? null : null;

  const providersTable = (
    <div className="card overflow-x-auto">
        <table className="dtable w-full table-fixed text-sm">
          <colgroup><col style={{ width: "26%" }} /><col style={{ width: "20%" }} /><col style={{ width: "12%" }} /><col style={{ width: "21%" }} /><col style={{ width: "21%" }} /></colgroup>
          <thead><tr>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Provider</th>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Platform</th>
            <th className="px-3 py-2 text-right text-xs text-gray-400">{mode === "model" ? "Rank" : "Models"}</th>
            <th className="px-3 py-2 text-right text-xs text-gray-400">{mode === "model" ? priceLabel(priceSettings) : "Avg price rank"}</th>
            <th className="px-3 py-2 text-right text-xs text-gray-400">{mode === "model" ? "vs cheapest" : `Avg ${priceLabel(priceSettings)}`}</th>
          </tr></thead>
          <tbody>
            {shown.map((r) => {
              const isOpen = mode === "all" && expandedKey === r.key && r.constituents.length > 0;
              const pricedConsts = r.constituents.filter((c) => c.price.value != null);
              return (
                <Fragment key={r.key}>
                  <tr>
                    <td className="px-3 py-2 truncate font-medium">{r.provider}{((mode === "model" && r.model_policy_equivalent) || (mode === "all" && r.policy_equivalent_models > 0)) && <span title="Includes a company-approved equivalent whose Global inference may occur outside the EU" className="ml-1 rounded bg-sky-500/20 px-1 text-[9px] font-normal text-sky-300">{mode === "model" ? "EU equivalent" : `EU≈ ${r.policy_equivalent_models}`}</span>}</td>
                    <td className="px-3 py-2 truncate text-gray-400">{r.platform}</td>
                    <td className="px-3 py-2 text-right tabular">{mode === "model" ? `#${r.model_rank}` : r.models_offered}</td>
                    <td className="px-3 py-2">
                      {mode === "model"
                        ? (r.model_price_result ? <DataBar frac={(r.model_price ?? 0) / maxModelPrice} color="#7ee0c0" align="right"><span className="block text-right font-semibold"><PriceValue price={r.model_price_result} compact /></span></DataBar> : <span className="block text-right text-gray-600">—</span>)
                        : (r.avg_rank != null ? <DataBar frac={r.avg_rank / maxAvgRank} color="#5b9dff" align="right"><span className="block text-right font-semibold">{num(r.avg_rank, 2)}</span></DataBar> : <span className="block text-right text-gray-600">—</span>)}
                    </td>
                    <td className="px-3 py-2">
                      {mode === "model"
                        ? <span className="block text-right text-gray-400">{r.model_rank === 1 ? "cheapest" : (r.model_price_result && cheapestResult ? <>+<PriceValue price={deltaPriceResult(r.model_price_result, cheapestResult, priceSettings)} /></> : "—")}</span>
                        : (r.avg_price_result != null
                          ? <span className="flex items-center justify-end gap-1">
                              <DataBar frac={(r.avg_price ?? 0) / maxAvgPrice} color="#7ee0c0" align="right"><span className="block text-right"><PriceValue price={r.avg_price_result} compact /></span></DataBar>
                              <button type="button" onClick={() => setExpandedKey(isOpen ? null : r.key)} aria-expanded={isOpen}
                                aria-label={`Show the ${r.constituents.length} model prices behind ${r.provider}'s average`}
                                className="rounded border border-line px-1 text-[10px] text-gray-400 hover:text-accent">{isOpen ? "▾" : "▸"}</button>
                            </span>
                          : <span className="block text-right text-gray-600">—</span>)}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} className="bg-[#0c0f14] px-4 py-3 text-xs">
                        <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">Average {priceLabel(priceSettings)} — {pricedConsts.length} model constituents</div>
                        <p className="mb-2 text-gray-400">average = sum(costs)/count. Every per-model price below keeps its own model context — click one for its inputs, sources and assumptions.</p>
                        <table className="w-full text-xs">
                          <tbody>
                            {r.constituents.map((c) => (
                              <tr key={c.name}>
                                <td className="py-0.5 text-gray-300">{c.name}</td>
                                <td className="py-0.5 text-right">{c.price.value != null ? <PriceValue price={c.price} compact /> : <span className="text-gray-600">—</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {pricedConsts.length > 0 && (
                          <p className="mt-2 tabular text-gray-400">
                            sum(costs)/count = ({pricedConsts.map((c) => priceNumber(c.price.value)).join(" + ")}) / {pricedConsts.length} = {priceNumber(r.avg_price)} {r.avg_price_result?.unit}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
  );

  const modelPicker = (
    <div className="card flex flex-col">
      <div className="border-b border-line p-3">
        <input aria-label="Search provider models" value={modelQ} onChange={(e) => setModelQ(e.target.value)} placeholder="Search model / org…"
          className="w-full rounded-md border border-line bg-ink px-3 py-1.5 text-sm" />
        <p className="mt-1 text-[11px] text-gray-500">Pick a model — sorted by Composite (fixed inputs, including Coding Agent v1.4 from September 9, 2026).</p>
      </div>
      <div className="max-h-[70vh] overflow-y-auto">
        <table className="dtable w-full table-fixed text-sm">
          <colgroup><col style={{ width: "62%" }} /><col style={{ width: "38%" }} /></colgroup>
          <thead><tr>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Model</th>
            <th className="px-3 py-2 text-right text-xs text-gray-400">Composite ▼</th>
          </tr></thead>
          <tbody>
            {pickerRows.map((m) => {
              const c = m.scores.composite;
              const active = selectedModel?.id === m.id;
              return (
                <tr key={m.id} onClick={() => setModelId(m.id)} className={`cursor-pointer ${active ? "bg-accent/15" : ""}`}>
                  <td className="px-3 py-2 truncate">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: orgColor(m.org) }} /> <button type="button" aria-pressed={active} className="max-w-full truncate text-left font-medium" onClick={(e) => { e.stopPropagation(); setModelId(m.id); }}>{collapsedName(m, s.collapse, preferredId)}</button>
                    {m.open_weights && <span className="ml-1 text-[10px] text-accent2">open</span>}
                  </td>
                  <td className="px-3 py-2">
                    {c != null ? <DataBar frac={c / pickerMaxComposite} color={orgColor(m.org)} align="right"><span className="block text-right font-semibold">{num(c, 1)}</span></DataBar> : <span className="block text-right text-gray-600">—</span>}
                  </td>
                </tr>
              );
            })}
            {pickerRows.length === 0 && <tr><td colSpan={2} className="px-3 py-6 text-center text-gray-500">No models match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <span className="inline-flex items-center gap-2">
          <label className="text-sm text-gray-400">Rank by</label>
          <select aria-label="Rank providers by" value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
            <option value="model">A single model&apos;s offers</option>
            <option value="all">Avg price rank across models</option>
          </select>
        </span>
        {mode === "model" ? (
          <span className="text-sm text-gray-400">Selected: <b className="text-gray-200">{selectedModel ? collapsedName(selectedModel, s.collapse, preferredId) : "—"}</b></span>
        ) : (
          <>
            <span className="text-sm text-gray-400">Peer score: <b className="text-gray-200">{scoreLabel(score, data.sourceDates)}</b></span>
            <button aria-pressed={scorePeersOnly} onClick={() => setScorePeersOnly(!scorePeersOnly)}
              className={`rounded-md border px-3 py-1.5 text-sm ${scorePeersOnly ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
              {scorePeersOnly ? "✓ " : ""}{score === "composite" ? "Only models with benchmark evidence" : "Only models with this score"}
            </button>
          </>
        )}
        <span className="ml-auto text-xs text-gray-500">{shown.length} providers</span>
      </div>

      <PriceAssumptions />

      {mode === "model" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(320px,0.85fr)_minmax(420px,1.15fr)]">
          {modelPicker}
          <div>
            {providersTable}
            <p className="mt-3 text-xs text-gray-500">Providers ranked by {priceLabel(priceSettings)} for <b>{selectedModel?.display_name}</b>.</p>
          </div>
        </div>
      ) : (
        <>
          {providersTable}
          <p className="mt-3 text-xs text-gray-500">
            Avg price rank = the provider&apos;s average position (1 = cheapest) across every model it offers
            {scorePeersOnly ? (score === "composite" ? " that has benchmark evidence." : " that has the selected score.") : "."} Lower is cheaper.
            Avg price = average {priceLabel(priceSettings)} across those models; expand a row for every constituent.
          </p>
        </>
      )}
    </div>
  );
}
