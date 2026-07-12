"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { hasScoreEvidence, type ClientData, type ClientModel } from "../lib/client-model";
import type { ScoreKey } from "../lib/types";
import { usdPerM, num, orgColor } from "../lib/format";
import { modelCost, rankedOffers, scopedCatalogOffers, createOfferScope, isHiddenModel, type OfferScope } from "../lib/cost";
import { DataBar } from "./ui";
import { useSettings } from "./SettingsContext";
import { preferredVariantIds, collapseModels, selectableModels } from "../lib/variants";

const METRICS: { key: ScoreKey | "cost"; label: string; lowerBetter?: boolean; digits?: number }[] = [
  { key: "designarena_fullstack", label: "DesignArena Full-Stack Elo", digits: 0 },
  { key: "designarena_frontend", label: "DesignArena Frontend Elo", digits: 0 },
  { key: "aa_coding_index", label: "AA Coding Index", digits: 1 },
  { key: "aa_coding_agent", label: "AA Coding Agent Index", digits: 1 },
  { key: "aa_intelligence_index", label: "AA Intelligence Index", digits: 1 },
  { key: "cost", label: "Cheapest 10:1 $/1M", lowerBetter: true },
];

export function CompareView({ data }: { data: ClientData }) {
  const s = useSettings();
  const offerScope = useMemo(() => createOfferScope(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly), [s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly]);
  const [q, setQ] = useState("");
  const [picks, setPicks] = useState<string[]>([]);
  const candidates = useMemo(() => selectableModels(data.models, s.hideDeprecated), [data.models, s.hideDeprecated]);
  const preferredId = useMemo(() => preferredVariantIds(candidates, s.score), [candidates, s.score]);

  const models = useMemo(() => {
    let r = candidates.filter((m) => {
      const hasOffer = scopedCatalogOffers(data.offersByModel[m.id], offerScope).length > 0;
      return offerScope.restricted ? hasOffer : hasOffer || hasScoreEvidence(m, s.score);
    });
    if (s.collapse) r = collapseModels(r, preferredId);
    r = r.filter((m) => !isHiddenModel(m.family_key, s.hideGptOpus, s.hideFable));
    if (s.openOnly) r = r.filter((m) => m.open_weights);
    if (s.featured) r = r.filter((m) => m.featured);
    if (s.familySet) r = r.filter((m) => s.familySet!.has(m.family_key));
    if (s.minScore > 0) r = r.filter((m) => m.scores[s.score] != null && (m.scores[s.score] as number) >= s.minScore);
    return r.sort((a, b) => (b.scores[s.score] ?? -Infinity) - (a.scores[s.score] ?? -Infinity));
  }, [data, candidates, offerScope, s.score, s.collapse, s.featured, s.familySet, s.hideGptOpus, s.hideFable, s.openOnly, s.minScore, preferredId]);

  const visibleModels = useMemo(() => {
    if (!q.trim()) return models;
    const term = q.toLowerCase();
    return models.filter((m) => m.display_name.toLowerCase().includes(term) || m.org.toLowerCase().includes(term));
  }, [models, q]);

  const maxScore = Math.max(1, ...visibleModels.map((m) => m.scores[s.score] ?? 0));
  const modelIds = useMemo(() => new Set(models.map((m) => m.id)), [models]);

  const pick = (id: string) => setPicks((p) => {
    const current = p.filter((picked) => modelIds.has(picked));
    return current.includes(id) ? current.filter((picked) => picked !== id) : (current.length < 2 ? [...current, id] : [current[1], id]);
  });
  const activePicks = picks.filter((picked) => modelIds.has(picked));
  const A = models.find((m) => m.id === activePicks[0]);
  const B = models.find((m) => m.id === activePicks[1]);
  const slotOf = (id: string) => activePicks[0] === id ? "A" : activePicks[1] === id ? "B" : null;

  const metricVal = (m: ClientModel | undefined, key: ScoreKey | "cost"): number | null => {
    if (!m) return null;
    return key === "cost" ? modelCost(m, data, offerScope) : m.scores[key];
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(340px,0.9fr)_minmax(460px,1.4fr)]">
      {/* Master: model list */}
      <div>
        <div className="card mb-3 p-3 text-sm">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models…" className="w-full rounded-md border border-line bg-ink px-3 py-1.5" />
          <p className="mt-2 text-xs text-gray-500">Click to pick up to two models (A then B). Click again to deselect.</p>
        </div>
        <div className="card max-h-[72vh] overflow-y-auto">
          <table className="dtable w-full table-fixed text-sm">
            <colgroup><col style={{ width: "12%" }} /><col style={{ width: "62%" }} /><col style={{ width: "26%" }} /></colgroup>
            <thead><tr>
              <th className="px-2 py-2 text-left text-xs text-gray-400">A/B</th>
              <th className="px-3 py-2 text-left text-xs text-gray-400">Model</th>
              <th className="px-3 py-2 text-right text-xs text-gray-400">Score</th>
            </tr></thead>
            <tbody>
              {visibleModels.map((m) => {
                const sc = m.scores[s.score]; const slot = slotOf(m.id);
                return (
                  <tr key={m.id} onClick={() => pick(m.id)} className={`cursor-pointer ${slot ? "bg-accent/15" : ""}`}>
                    <td className="px-2 py-2">{slot && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${slot === "A" ? "bg-accent text-black" : "bg-accent2 text-black"}`}>{slot}</span>}</td>
                    <td className="px-3 py-2 truncate"><span className="inline-block h-2 w-2 rounded-full" style={{ background: orgColor(m.org) }} /> <span className="font-medium">{m.display_name}</span>{m.open_weights && <span className="ml-1 text-[10px] text-accent2">open</span>}{m.deprecated && <span className="ml-1 text-[10px] text-amber-300">deprecated</span>}</td>
                    <td className="px-3 py-2">{sc != null ? <DataBar frac={sc / maxScore} color={orgColor(m.org)} align="right"><span className="block text-right font-semibold">{num(sc, s.score.startsWith("designarena") ? 0 : 1)}</span></DataBar> : <span className="block text-right text-gray-600">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail: A vs B */}
      <div>
        {!A && !B && <div className="card p-8 text-center text-gray-500">Pick a model on the left to start comparing. Select a second to see them head-to-head.</div>}
        {(A || B) && (
          <>
            {/* Headline */}
            <div className="card mb-4 grid grid-cols-2 gap-px overflow-hidden bg-line">
              {[A, B].map((m, i) => (
                <div key={i} className="bg-panel p-4">
                  <div className="text-[10px] font-bold text-gray-500">{i === 0 ? "A" : "B"}</div>
                  {m ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ background: orgColor(m.org) }} />
                        <Link href={`/models/${encodeURIComponent(m.id)}`} className="font-bold hover:text-accent">{m.family_name}</Link>
                      </div>
                      <div className="text-xs text-gray-500">{m.display_name}</div>
                    </>
                  ) : <div className="text-sm text-gray-600">pick a second model</div>}
                </div>
              ))}
            </div>

            {/* Plakative metric comparison */}
            <div className="card mb-4 divide-y divide-line">
              {METRICS.map((mt) => {
                const a = metricVal(A, mt.key), b = metricVal(B, mt.key);
                const fmt = (v: number | null) => mt.key === "cost" ? usdPerM(v) : (v == null ? "—" : num(v, mt.digits ?? 1));
                const max = Math.max(a ?? 0, b ?? 0, 1);
                const better = a != null && b != null ? (mt.lowerBetter ? (a < b ? "A" : b < a ? "B" : null) : (a > b ? "A" : b > a ? "B" : null)) : null;
                return (
                  <div key={mt.key} className="px-4 py-3">
                    <div className="mb-1 text-xs text-gray-400">{mt.label}{mt.lowerBetter && <span className="ml-1 text-gray-600">(lower is better)</span>}</div>
                    <div className="grid grid-cols-2 gap-3">
                      {(["A", "B"] as const).map((slot) => {
                        const v = slot === "A" ? a : b;
                        const win = better === slot;
                        return (
                          <div key={slot} className={`rounded-md border px-3 py-2 ${win ? "border-accent2/60 bg-accent2/10" : "border-line"}`}>
                            <div className="flex items-baseline justify-between">
                              <span className={`text-2xl font-bold tabular ${win ? "text-accent2" : "text-gray-200"}`}>{fmt(v)}</span>
                              {win && <span className="text-[10px] font-bold text-accent2">★ better</span>}
                            </div>
                            <div className="mt-1.5 h-1.5 w-full rounded bg-ink">
                              <div className="h-full rounded" style={{ width: `${Math.max(0, Math.min(1, (v ?? 0) / max)) * 100}%`, background: win ? "#7ee0c0" : "#5b9dff" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Provider price tables side by side */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {[A, B].map((m, i) => (
                <ProviderMini key={i} slot={i === 0 ? "A" : "B"} model={m} data={data} offerScope={offerScope} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProviderMini({ slot, model, data, offerScope }: { slot: string; model?: ClientModel; data: ClientData; offerScope: OfferScope }) {
  const offers = model ? rankedOffers(data.offersByModel[model.id], offerScope).slice(0, 8) : [];
  const max = Math.max(1, ...offers.map((o) => o.blended));
  return (
    <div className="card p-3">
      <div className="mb-2 text-xs font-semibold text-gray-300">{slot} · {model ? model.family_name : "—"} <span className="font-normal text-gray-500">cheapest providers</span></div>
      {model ? (
        offers.length ? (
          <table className="dtable w-full table-fixed text-sm">
            <colgroup><col style={{ width: "52%" }} /><col style={{ width: "48%" }} /></colgroup>
            <tbody>
              {offers.map((o, idx) => (
                <tr key={o.key + idx}>
                  <td className="px-2 py-1 truncate text-xs">{o.provider}<span className="ml-1 text-[10px] text-gray-500">{o.platform}</span>{o.eu_policy_equivalent && <span title="Company-approved equivalent; Global inference may occur outside the EU" className="ml-1 rounded bg-sky-500/20 px-1 text-[9px] text-sky-300">EU equivalent</span>}</td>
                  <td className="px-2 py-1"><DataBar frac={o.blended / max} color={idx === 0 ? "#7ee0c0" : "#8a93a3"} align="right"><span className="block text-right font-semibold">{usdPerM(o.blended)}</span></DataBar></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-xs text-gray-500">No token pricing within the global filters.</p>
      ) : <p className="text-xs text-gray-600">—</p>}
    </div>
  );
}
