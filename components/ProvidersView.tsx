"use client";
import { useMemo, useState } from "react";
import type { ClientData } from "../lib/client-model";
import { SCORE_LABELS } from "../lib/types";
import { usdPerM, num } from "../lib/format";
import { rankedOffers } from "../lib/cost";
import { DataBar } from "./ui";
import { useSettings } from "./SettingsContext";

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
  const [mode, setMode] = useState<Mode>("all");
  const [scorePeersOnly, setScorePeersOnly] = useState(true);
  const [modelId, setModelId] = useState<string>("");

  // models eligible for the peer set
  const peerModels = useMemo(() => {
    const fams = new Map<string, { family_key: string }>();
    for (const m of data.models) {
      if (scorePeersOnly && m.scores[score] == null) continue;
      if (s.familySet && !s.familySet.has(m.family_key)) continue;
      if (!fams.has(m.family_key)) fams.set(m.family_key, { family_key: m.family_key });
    }
    return [...fams.values()];
  }, [data, score, scorePeersOnly, s.familySet]);

  const modelOptions = useMemo(
    () => data.models.filter((m) => rankedOffers(data.offersByFamily[m.family_key], null).length)
      .filter((m) => !s.familySet || s.familySet.has(m.family_key))
      .sort((a, b) => (b.scores[score] ?? -Infinity) - (a.scores[score] ?? -Infinity)),
    [data, score, s.familySet]
  );
  const selectedModel = modelOptions.find((m) => m.id === modelId) || modelOptions[0];

  const rows = useMemo<Row[]>(() => {
    const agg = new Map<string, { ranks: number[]; prices: number[]; platform: string; provider: string }>();
    const ensure = (key: string, platform: string, provider: string) => {
      if (!agg.has(key)) agg.set(key, { ranks: [], prices: [], platform, provider });
      return agg.get(key)!;
    };
    // aggregate across peer-set families
    for (const fam of peerModels) {
      const ranked = rankedOffers(data.offersByFamily[fam.family_key], null);
      ranked.forEach((o, idx) => {
        const a = ensure(o.key, o.platform, o.provider);
        a.ranks.push(idx + 1);
        a.prices.push(o.blended);
      });
    }
    // single-model ranking
    const modelRanked = selectedModel ? rankedOffers(data.offersByFamily[selectedModel.family_key], null) : [];
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
  }, [data, peerModels, selectedModel, mode]);

  let shown = mode === "model" ? rows.filter((r) => r.model_price != null) : rows.filter((r) => r.models_offered > 0);
  if (s.providerSet) shown = shown.filter((r) => s.providerSet!.has(r.key));
  const maxAvgRank = Math.max(1, ...shown.map((r) => r.avg_rank ?? 0));
  const maxAvgPrice = Math.max(1, ...shown.map((r) => r.avg_price ?? 0));
  const maxModelPrice = Math.max(1, ...shown.map((r) => r.model_price ?? 0));

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <span className="inline-flex items-center gap-2">
          <label className="text-sm text-gray-400">Rank by</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
            <option value="all">Avg price rank across models</option>
            <option value="model">A single model&apos;s offers</option>
          </select>
        </span>
        {mode === "model" ? (
          <select value={selectedModel?.id || ""} onChange={(e) => setModelId(e.target.value)} className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
            {modelOptions.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        ) : (
          <>
            <span className="text-sm text-gray-400">Peer score: <b className="text-gray-200">{SCORE_LABELS[score]}</b></span>
            <button onClick={() => setScorePeersOnly(!scorePeersOnly)}
              className={`rounded-md border px-3 py-1.5 text-sm ${scorePeersOnly ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
              {scorePeersOnly ? "✓ " : ""}Only models with this score
            </button>
          </>
        )}
        <span className="ml-auto text-xs text-gray-500">{shown.length} providers</span>
      </div>

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
      <p className="mt-3 text-xs text-gray-500">
        {mode === "model"
          ? "Providers ranked by their 10:1 blended price for the selected model."
          : "Avg price rank = the provider's average position (1 = cheapest) across every model it offers" + (scorePeersOnly ? " that has the selected score." : ".") + " Lower is cheaper."}
      </p>
    </div>
  );
}
