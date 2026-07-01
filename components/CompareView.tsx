"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ClientData, ClientModel } from "../lib/client-model";
import type { ScoreKey } from "../lib/types";
import { usdPerM, num, orgColor } from "../lib/format";
import { modelCost, rankedOffers, effectiveAllowed, isHiddenModel } from "../lib/cost";
import { DataBar } from "./ui";
import { useSettings } from "./SettingsContext";
import { preferredVariantIds, collapseModels } from "../lib/variants";

const METRICS: { key: ScoreKey | "cost"; label: string; lowerBetter?: boolean; digits?: number }[] = [
  { key: "designarena_fullstack", label: "DesignArena Full-Stack Elo", digits: 0 },
  { key: "designarena_frontend", label: "DesignArena Frontend Elo", digits: 0 },
  { key: "aa_coding_index", label: "AA Coding Index", digits: 1 },
  { key: "aa_intelligence_index", label: "AA Intelligence Index", digits: 1 },
  { key: "cost", label: "Cheapest 10:1 $/1M", lowerBetter: true },
];

export function CompareView({ data }: { data: ClientData }) {
  const s = useSettings();
  const allowed = useMemo(() => effectiveAllowed(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.euDedicated), [s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.euDedicated]);
  const [q, setQ] = useState("");
  const [picks, setPicks] = useState<string[]>([]);
  const preferredId = useMemo(() => preferredVariantIds(data.models), [data.models]);

  const models = useMemo(() => {
    let r = data.models.filter((m) => m.scores[s.score] != null || rankedOffers(data.offersByFamily[m.family_key], null).length);
    if (s.collapse) r = collapseModels(r, preferredId);
    r = r.filter((m) => !isHiddenModel(m.family_key, s.hideGptOpus, s.hideFable));
    if (s.featured) r = r.filter((m) => m.featured);
    if (s.familySet) r = r.filter((m) => s.familySet!.has(m.family_key));
    if (s.minScore > 0) r = r.filter((m) => m.scores[s.score] == null || (m.scores[s.score] as number) >= s.minScore);
    if (q.trim()) { const t = q.toLowerCase(); r = r.filter((m) => m.display_name.toLowerCase().includes(t) || m.org.toLowerCase().includes(t)); }
    return r.sort((a, b) => (b.scores[s.score] ?? -Infinity) - (a.scores[s.score] ?? -Infinity));
  }, [data, s.score, s.collapse, s.featured, s.familySet, s.hideGptOpus, s.hideFable, s.minScore, q, preferredId]);

  const maxScore = Math.max(1, ...models.map((m) => m.scores[s.score] ?? 0));

  const pick = (id: string) => setPicks((p) => p.includes(id) ? p.filter((x) => x !== id) : (p.length < 2 ? [...p, id] : [p[1], id]));
  const A = data.models.find((m) => m.id === picks[0]);
  const B = data.models.find((m) => m.id === picks[1]);
  const slotOf = (id: string) => picks[0] === id ? "A" : picks[1] === id ? "B" : null;

  const metricVal = (m: ClientModel | undefined, key: ScoreKey | "cost"): number | null => {
    if (!m) return null;
    return key === "cost" ? modelCost(m, data, allowed) : m.scores[key];
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
              {models.map((m) => {
                const sc = m.scores[s.score]; const slot = slotOf(m.id);
                return (
                  <tr key={m.id} onClick={() => pick(m.id)} className={`cursor-pointer ${slot ? "bg-accent/15" : ""}`}>
                    <td className="px-2 py-2">{slot && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${slot === "A" ? "bg-accent text-black" : "bg-accent2 text-black"}`}>{slot}</span>}</td>
                    <td className="px-3 py-2 truncate"><span className="inline-block h-2 w-2 rounded-full" style={{ background: orgColor(m.org) }} /> <span className="font-medium">{m.display_name}</span>{m.open_weights && <span className="ml-1 text-[10px] text-accent2">open</span>}</td>
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
                <ProviderMini key={i} slot={i === 0 ? "A" : "B"} model={m} data={data} allowed={allowed} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProviderMini({ slot, model, data, allowed }: { slot: string; model?: ClientModel; data: ClientData; allowed: Set<string> | null }) {
  const offers = model ? rankedOffers(data.offersByFamily[model.family_key], allowed).slice(0, 8) : [];
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
                  <td className="px-2 py-1 truncate text-xs">{o.provider}<span className="ml-1 text-[10px] text-gray-500">{o.platform}</span></td>
                  <td className="px-2 py-1"><DataBar frac={o.blended / max} color={idx === 0 ? "#7ee0c0" : "#8a93a3"} align="right"><span className="block text-right font-semibold">{usdPerM(o.blended)}</span></DataBar></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-xs text-gray-500">No token pricing{allowed ? " within the selected providers" : ""}.</p>
      ) : <p className="text-xs text-gray-600">—</p>}
    </div>
  );
}
