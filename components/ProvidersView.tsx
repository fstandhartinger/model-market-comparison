"use client";
import { useMemo, useState } from "react";
import { hasScoreEvidence, type ClientData } from "../lib/client-model";
import { SCORE_LABELS } from "../lib/types";
import { usdPerM, num, orgColor } from "../lib/format";
import { rankedOffers, createOfferScope, isHiddenModel } from "../lib/cost";
import { DataBar } from "./ui";
import { useSettings } from "./SettingsContext";
import { preferredVariantIds, collapseModels, collapsedName, selectableModels } from "../lib/variants";

type Mode = "all" | "model";

interface Row {
  key: string; platform: string; provider: string;
  models_offered: number;        // models this provider prices (within peer set)
  avg_rank: number | null;       // avg price rank across those models (1 = cheapest)
  best_rank: number | null;
  avg_price: number | null;      // avg blended $/1M
  model_price: number | null;    // blended price for the selected single model
  model_rank: number | null;
}

export function ProvidersView({ data }: { data: ClientData }) {
  const s = useSettings();
  const score = s.score;
  const offerScope = useMemo(() => createOfferScope(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly), [s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly]);
  const candidates = useMemo(() => selectableModels(data.models, s.hideDeprecated), [data.models, s.hideDeprecated]);
  const preferredId = useMemo(() => preferredVariantIds(candidates, score), [candidates, score]);
  const [mode, setMode] = useState<Mode>("model");
  const [scorePeersOnly, setScorePeersOnly] = useState(true);
  const [modelId, setModelId] = useState<string>("");
  const [modelQ, setModelQ] = useState("");

  const eligible = (m: ClientData["models"][number]) => {
    if (isHiddenModel(m.family_key, s.hideGptOpus, s.hideFable)) return false;
    if (s.openOnly && !m.open_weights) return false;
    if (s.featured && !m.featured) return false;
    if (s.familySet && !s.familySet.has(m.family_key)) return false;
    if (s.minScore > 0 && (m.scores[score] == null || (m.scores[score] as number) < s.minScore)) return false;
    return true;
  };

  // models eligible for the peer set
  const peerModels = useMemo(() => {
    const collapsed = s.collapse ? collapseModels(candidates, preferredId) : candidates;
    const filtered = collapsed.filter((m) => {
      if (scorePeersOnly && !hasScoreEvidence(m, score)) return false;
      if (!eligible(m)) return false;
      return rankedOffers(data.offersByModel[m.id], offerScope).length > 0;
    });
    if (!s.collapse) return filtered;

    const fams = new Map<string, (typeof data.models)[number]>();
    for (const m of filtered) {
      const previous = fams.get(m.family_key);
      if (!previous || (m.scores[score] ?? -Infinity) > (previous.scores[score] ?? -Infinity)) fams.set(m.family_key, m);
    }
    return [...fams.values()];
  }, [data, candidates, score, scorePeersOnly, offerScope, preferredId, s.collapse, s.featured, s.familySet, s.hideGptOpus, s.hideFable, s.openOnly, s.minScore]);

  const modelOptions = useMemo(
    () => (s.collapse ? collapseModels(candidates, preferredId) : candidates)
      .filter((m) => rankedOffers(data.offersByModel[m.id], offerScope).length)
      .filter((m) => eligible(m))
      .sort((a, b) => (b.scores[score] ?? -Infinity) - (a.scores[score] ?? -Infinity)),
    [data, candidates, score, offerScope, preferredId, s.collapse, s.featured, s.familySet, s.hideGptOpus, s.hideFable, s.openOnly, s.minScore]
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
    const agg = new Map<string, { ranks: number[]; prices: number[]; platform: string; provider: string }>();
    const ensure = (key: string, platform: string, provider: string) => {
      if (!agg.has(key)) agg.set(key, { ranks: [], prices: [], platform, provider });
      return agg.get(key)!;
    };
    // aggregate across peer-set families
    for (const fam of peerModels) {
      const ranked = rankedOffers(data.offersByModel[fam.id], offerScope);
      ranked.forEach((o, idx) => {
        const a = ensure(o.key, o.platform, o.provider);
        a.ranks.push(idx + 1);
        a.prices.push(o.blended);
      });
    }
    // single-model ranking
    const modelRanked = selectedModel ? rankedOffers(data.offersByModel[selectedModel.id], offerScope) : [];
    const modelRankByKey = new Map<string, { rank: number; price: number }>();
    modelRanked.forEach((o, i) => modelRankByKey.set(o.key, { rank: i + 1, price: o.blended }));

    const out: Row[] = [];
    for (const p of data.providers) {
      const a = agg.get(p.key);
      const mr = modelRankByKey.get(p.key);
      const avgRank = a && a.ranks.length ? a.ranks.reduce((x, y) => x + y, 0) / a.ranks.length : null;
      out.push({
        key: p.key, platform: p.platform, provider: p.provider,
        models_offered: a ? a.ranks.length : 0,
        avg_rank: avgRank,
        best_rank: a && a.ranks.length ? Math.min(...a.ranks) : null,
        avg_price: a && a.prices.length ? a.prices.reduce((x, y) => x + y, 0) / a.prices.length : null,
        model_price: mr ? mr.price : null,
        model_rank: mr ? mr.rank : null,
      });
    }
    // sort by the active metric
    if (mode === "model") out.sort((x, y) => (x.model_price ?? Infinity) - (y.model_price ?? Infinity));
    else out.sort((x, y) => (x.avg_rank ?? Infinity) - (y.avg_rank ?? Infinity));
    return out;
  }, [data, peerModels, selectedModel, mode, offerScope]);

  let shown = mode === "model" ? rows.filter((r) => r.model_price != null) : rows.filter((r) => r.models_offered > 0);
  const maxAvgRank = Math.max(1, ...shown.map((r) => r.avg_rank ?? 0));
  const maxAvgPrice = Math.max(1, ...shown.map((r) => r.avg_price ?? 0));
  const maxModelPrice = Math.max(1, ...shown.map((r) => r.model_price ?? 0));

  const providersTable = (
    <div className="card overflow-x-auto">
        <table className="dtable w-full table-fixed text-sm">
          <colgroup><col style={{ width: "26%" }} /><col style={{ width: "20%" }} /><col style={{ width: "12%" }} /><col style={{ width: "21%" }} /><col style={{ width: "21%" }} /></colgroup>
          <thead><tr>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Provider</th>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Platform</th>
            <th className="px-3 py-2 text-right text-xs text-gray-400">{mode === "model" ? "Rank" : "Models"}</th>
            <th className="px-3 py-2 text-right text-xs text-gray-400">{mode === "model" ? "Blended $/1M" : "Avg price rank"}</th>
            <th className="px-3 py-2 text-right text-xs text-gray-400">{mode === "model" ? "vs cheapest" : "Avg blended $/1M"}</th>
          </tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key}>
                <td className="px-3 py-2 truncate font-medium">{r.provider}</td>
                <td className="px-3 py-2 truncate text-gray-400">{r.platform}</td>
                <td className="px-3 py-2 text-right tabular">{mode === "model" ? `#${r.model_rank}` : r.models_offered}</td>
                <td className="px-3 py-2">
                  {mode === "model"
                    ? <DataBar frac={(r.model_price ?? 0) / maxModelPrice} color="#7ee0c0" align="right"><span className="block text-right font-semibold">{usdPerM(r.model_price)}</span></DataBar>
                    : (r.avg_rank != null ? <DataBar frac={r.avg_rank / maxAvgRank} color="#5b9dff" align="right"><span className="block text-right font-semibold">{num(r.avg_rank, 2)}</span></DataBar> : <span className="block text-right text-gray-600">—</span>)}
                </td>
                <td className="px-3 py-2">
                  {mode === "model"
                    ? <span className="block text-right text-gray-400">{r.model_rank === 1 ? "cheapest" : `+${usdPerM((r.model_price ?? 0) - (shown[0]?.model_price ?? 0))}`}</span>
                    : (r.avg_price != null ? <DataBar frac={r.avg_price / maxAvgPrice} color="#7ee0c0" align="right"><span className="block text-right">{usdPerM(r.avg_price)}</span></DataBar> : <span className="block text-right text-gray-600">—</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  );

  const modelPicker = (
    <div className="card flex flex-col">
      <div className="border-b border-line p-3">
        <input value={modelQ} onChange={(e) => setModelQ(e.target.value)} placeholder="Search model / org…"
          className="w-full rounded-md border border-line bg-ink px-3 py-1.5 text-sm" />
        <p className="mt-1 text-[11px] text-gray-500">Pick a model — sorted by Composite score.</p>
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
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: orgColor(m.org) }} /> <span className="font-medium">{collapsedName(m, s.collapse, preferredId)}</span>
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
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
            <option value="model">A single model&apos;s offers</option>
            <option value="all">Avg price rank across models</option>
          </select>
        </span>
        {mode === "model" ? (
          <span className="text-sm text-gray-400">Selected: <b className="text-gray-200">{selectedModel ? collapsedName(selectedModel, s.collapse, preferredId) : "—"}</b></span>
        ) : (
          <>
            <span className="text-sm text-gray-400">Peer score: <b className="text-gray-200">{SCORE_LABELS[score]}</b></span>
            <button onClick={() => setScorePeersOnly(!scorePeersOnly)}
              className={`rounded-md border px-3 py-1.5 text-sm ${scorePeersOnly ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
              {scorePeersOnly ? "✓ " : ""}{score === "composite" ? "Only models with benchmark evidence" : "Only models with this score"}
            </button>
          </>
        )}
        <span className="ml-auto text-xs text-gray-500">{shown.length} providers</span>
      </div>

      {mode === "model" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(320px,0.85fr)_minmax(420px,1.15fr)]">
          {modelPicker}
          <div>
            {providersTable}
            <p className="mt-3 text-xs text-gray-500">Providers ranked by their 10:1 blended price for <b>{selectedModel?.display_name}</b>.</p>
          </div>
        </div>
      ) : (
        <>
          {providersTable}
          <p className="mt-3 text-xs text-gray-500">
            Avg price rank = the provider&apos;s average position (1 = cheapest) across every model it offers
            {scorePeersOnly ? (score === "composite" ? " that has benchmark evidence." : " that has the selected score.") : "."} Lower is cheaper.
          </p>
        </>
      )}
    </div>
  );
}
