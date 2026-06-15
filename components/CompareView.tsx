"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ClientData, ClientModel } from "../lib/client-model";
import { SCORE_LABELS, type ScoreKey } from "../lib/types";
import { usdPerM, num, orgColor } from "../lib/format";
import { DEFAULT_SCORE, rankedOffers } from "../lib/cost";
import { ScoreSelect, Toggle, DataBar } from "./ui";

export function CompareView({ data }: { data: ClientData }) {
  const [score, setScore] = useState<ScoreKey>(DEFAULT_SCORE);
  const [featuredOnly, setFeaturedOnly] = useState(true);
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string | null>(null);

  const models = useMemo(() => {
    let r = data.models.filter((m) => m.scores[score] != null || rankedOffers(data.offersByFamily[m.family_key], null).length);
    if (featuredOnly) r = r.filter((m) => m.featured);
    if (q.trim()) { const s = q.toLowerCase(); r = r.filter((m) => m.display_name.toLowerCase().includes(s) || m.org.toLowerCase().includes(s)); }
    return r.sort((a, b) => (b.scores[score] ?? -Infinity) - (a.scores[score] ?? -Infinity));
  }, [data, score, featuredOnly, q]);

  const selected: ClientModel | undefined = useMemo(
    () => data.models.find((m) => m.id === selId) || models[0],
    [data.models, selId, models]
  );

  const maxScore = Math.max(1, ...models.map((m) => m.scores[score] ?? 0));

  const offers = useMemo(() => (selected ? rankedOffers(data.offersByFamily[selected.family_key], null) : []), [data, selected]);
  const maxBlended = Math.max(1, ...offers.map((o) => o.blended));
  const maxIn = Math.max(1, ...offers.map((o) => o.input_per_1m ?? 0));
  const maxOut = Math.max(1, ...offers.map((o) => o.output_per_1m ?? 0));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(360px,1fr)_minmax(420px,1.2fr)]">
      {/* Master: models */}
      <div>
        <div className="card mb-3 flex flex-wrap items-center gap-2 p-3">
          <ScoreSelect value={score} onChange={setScore} />
          <Toggle label="Featured" on={featuredOnly} set={setFeaturedOnly} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm" />
        </div>
        <div className="card max-h-[70vh] overflow-y-auto">
          <table className="grid w-full table-fixed text-sm">
            <colgroup><col style={{ width: "58%" }} /><col style={{ width: "26%" }} /><col style={{ width: "16%" }} /></colgroup>
            <thead><tr>
              <th className="px-3 py-2 text-left text-xs text-gray-400">Model</th>
              <th className="px-3 py-2 text-right text-xs text-gray-400">{SCORE_LABELS[score].split("—")[1]?.trim().replace(/\s*\(.*\)/, "")}</th>
              <th className="px-3 py-2 text-right text-xs text-gray-400">#Prov</th>
            </tr></thead>
            <tbody>
              {models.map((m) => {
                const sc = m.scores[score];
                const np = rankedOffers(data.offersByFamily[m.family_key], null).length;
                const active = selected?.id === m.id;
                return (
                  <tr key={m.id} onClick={() => setSelId(m.id)} className={`cursor-pointer ${active ? "bg-accent/15" : ""}`}>
                    <td className="px-3 py-2 truncate">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: orgColor(m.org) }} /> <span className="font-medium">{m.display_name}</span>
                      {m.open_weights && <span className="ml-1 text-[10px] text-accent2">open</span>}
                    </td>
                    <td className="px-3 py-2">{sc != null ? <DataBar frac={sc / maxScore} color={orgColor(m.org)} align="right"><span className="block text-right font-semibold">{num(sc, score.startsWith("designarena") ? 0 : 1)}</span></DataBar> : <span className="block text-right text-gray-600">—</span>}</td>
                    <td className="px-3 py-2 text-right tabular text-gray-400">{np || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail: providers for the selected model */}
      <div>
        {selected ? (
          <>
            <div className="card mb-3 p-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: orgColor(selected.org) }} />
                <Link href={`/models/${encodeURIComponent(selected.id)}`} className="text-lg font-bold hover:text-accent">{selected.family_name}</Link>
                {selected.open_weights && <span className="rounded bg-accent2/15 px-2 py-0.5 text-xs text-accent2">open</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
                <span>DesignArena FS: <b className="text-gray-200">{num(selected.scores.designarena_fullstack, 0)}</b></span>
                <span>DA Frontend: <b className="text-gray-200">{num(selected.scores.designarena_frontend, 0)}</b></span>
                <span>AA Coding: <b className="text-gray-200">{num(selected.scores.aa_coding_index)}</b></span>
                <span>AA Intelligence: <b className="text-gray-200">{num(selected.scores.aa_intelligence_index)}</b></span>
                {selected.copilot_usd_per_request != null && <span>Copilot: <b className="text-gray-200">${num(selected.copilot_usd_per_request, 3)}/req ({num(selected.copilot_multiplier, 1)}×)</b></span>}
              </div>
            </div>
            <div className="card overflow-x-auto">
              <table className="grid w-full table-fixed text-sm">
                <colgroup><col style={{ width: "8%" }} /><col style={{ width: "26%" }} /><col style={{ width: "22%" }} /><col style={{ width: "22%" }} /><col style={{ width: "22%" }} /></colgroup>
                <thead><tr>
                  <th className="px-2 py-2 text-left text-xs text-gray-400">#</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-400">Provider</th>
                  <th className="px-2 py-2 text-right text-xs text-gray-400">Input /1M</th>
                  <th className="px-2 py-2 text-right text-xs text-gray-400">Output /1M</th>
                  <th className="px-2 py-2 text-right text-xs text-gray-400">Blended 10:1</th>
                </tr></thead>
                <tbody>
                  {offers.map((o, i) => (
                    <tr key={o.key + i}>
                      <td className="px-2 py-1.5 text-gray-500">{i + 1}</td>
                      <td className="px-2 py-1.5 truncate">{o.provider}<span className="ml-1 text-[10px] text-gray-500">{o.platform}</span>{o.estimated && <span className="ml-1 text-[10px] text-warn">est</span>}</td>
                      <td className="px-2 py-1.5"><DataBar frac={(o.input_per_1m ?? 0) / maxIn} color="#5b9dff" align="right"><span className="block text-right">{usdPerM(o.input_per_1m)}</span></DataBar></td>
                      <td className="px-2 py-1.5"><DataBar frac={(o.output_per_1m ?? 0) / maxOut} color="#5b9dff" align="right"><span className="block text-right">{usdPerM(o.output_per_1m)}</span></DataBar></td>
                      <td className="px-2 py-1.5"><DataBar frac={o.blended / maxBlended} color={i === 0 ? "#7ee0c0" : "#8a93a3"} align="right"><span className="block text-right font-semibold">{usdPerM(o.blended)}</span></DataBar></td>
                    </tr>
                  ))}
                  {offers.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No per-token provider pricing for this model.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">Cheapest provider highlighted. Data bars scale to the most expensive offer in this list.</p>
          </>
        ) : <div className="card p-6 text-gray-500">Select a model on the left.</div>}
      </div>
    </div>
  );
}
