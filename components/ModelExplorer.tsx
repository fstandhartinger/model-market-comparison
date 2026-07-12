"use client";
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { hasScoreEvidence, type ClientData } from "../lib/client-model";
import { SCORE_LABELS } from "../lib/types";
import { usdPerM, num, orgColor } from "../lib/format";
import { blend, modelCost, rankedOffers, scopedCatalogOffers, scopedCatalogRoutes, createOfferScope, isHiddenModel } from "../lib/cost";
import { Toggle, DataBar, NumFilter } from "./ui";
import { useSettings } from "./SettingsContext";
import { preferredVariantIds, collapsedName, selectableModels } from "../lib/variants";

type SortKey = "name" | "org" | "score" | "cost" | "providers";
const SCORE_ROWS: { key: keyof ClientData["models"][number]["scores"]; label: string; dp: number }[] = [
  { key: "composite", label: "Composite", dp: 1 },
  { key: "aa_coding_index", label: "AA Coding", dp: 1 },
  { key: "aa_coding_agent", label: "AA Coding-Agent", dp: 1 },
  { key: "aa_intelligence_index", label: "AA Intelligence", dp: 1 },
  { key: "designarena_frontend", label: "DA Frontend Elo", dp: 0 },
  { key: "designarena_fullstack", label: "DA Full-Stack Elo", dp: 0 },
];

const routeSignature = (offer: ClientData["offersByModel"][string][number]) => [
  offer.key, offer.region, offer.or_model_id || "", offer.or_canonical_slug || "",
  offer.endpoint_tag || "", offer.pricing_tier || "", offer.route_type || "",
  offer.input_per_1m, offer.output_per_1m, offer.status,
].join("::");

export function ModelExplorer({ data }: { data: ClientData }) {
  const s = useSettings();
  const score = s.score;
  const offerScope = useMemo(() => createOfferScope(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly), [s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly]);
  const [sort, setSort] = useState<SortKey>("score");
  const [asc, setAsc] = useState(false);
  const [q, setQ] = useState("");
  const [withScoreOnly, setWithScoreOnly] = useState(true);
  const [hasProviderOnly, setHasProviderOnly] = useState(true);
  const [org, setOrg] = useState("");
  const [maxCost, setMaxCost] = useState("");

  const candidates = useMemo(() => selectableModels(data.models, s.hideDeprecated), [data.models, s.hideDeprecated]);
  const orgs = useMemo(() => Array.from(new Set(candidates.map((m) => m.org))).sort(), [candidates]);
  const preferredId = useMemo(() => preferredVariantIds(candidates, score), [candidates, score]);
  const provByKey = useMemo(() => new Map(data.providers.map((p) => [p.key, p])), [data.providers]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const maxC = parseFloat(maxCost);
    let r = candidates.map((m) => ({
      m, sc: m.scores[score], hasEvidence: hasScoreEvidence(m, score), cost: modelCost(m, data, offerScope),
      cheap: rankedOffers(data.offersByModel[m.id], offerScope).slice(0, 3),
      ncheap: scopedCatalogOffers(data.offersByModel[m.id], offerScope).length,
    }));
    if (s.collapse) r = r.filter((x) => !preferredId.has(x.m.family_key) || preferredId.get(x.m.family_key) === x.m.id);
    r = r.filter((x) => !isHiddenModel(x.m.family_key, s.hideGptOpus, s.hideFable));
    if (s.openOnly) r = r.filter((x) => x.m.open_weights);
    if (s.featured) r = r.filter((x) => x.m.featured);
    if (s.familySet) r = r.filter((x) => s.familySet!.has(x.m.family_key));
    if (org) r = r.filter((x) => x.m.org === org);
    if (q.trim()) { const t = q.toLowerCase(); r = r.filter((x) => x.m.display_name.toLowerCase().includes(t) || x.m.family_key.includes(t) || x.m.org.toLowerCase().includes(t)); }
    if (withScoreOnly) r = r.filter((x) => x.hasEvidence);
    if (s.minScore > 0) r = r.filter((x) => x.sc != null && x.sc >= s.minScore);
    if (Number.isFinite(maxC)) r = r.filter((x) => x.cost != null && x.cost <= maxC);
    // "Has provider": keep only models offered by ≥1 provider within the active filters.
    if (hasProviderOnly || offerScope.restricted) r = r.filter((x) => x.ncheap > 0);

    const dir = asc ? 1 : -1;
    r.sort((a, b) => {
      if (sort === "name") return dir * a.m.display_name.localeCompare(b.m.display_name);
      if (sort === "org") return dir * a.m.org.localeCompare(b.m.org);
      if (sort === "providers") return dir * (a.ncheap - b.ncheap);
      if (sort === "cost") return dir * ((a.cost ?? Infinity) - (b.cost ?? Infinity));
      return dir * ((a.sc ?? -Infinity) - (b.sc ?? -Infinity));
    });
    return r;
  }, [data, candidates, score, offerScope, s.collapse, s.featured, s.familySet, s.minScore, s.hideGptOpus, s.hideFable, s.openOnly, org, q, withScoreOnly, hasProviderOnly, maxCost, sort, asc, preferredId]);

  const maxScoreVal = useMemo(() => Math.max(1, ...rows.map((x) => x.sc ?? 0)), [rows]);
  const maxCostVal = useMemo(() => Math.max(1, ...rows.map((x) => x.cost ?? 0)), [rows]);

  const onSort = (k: SortKey) => { if (sort === k) setAsc(!asc); else { setSort(k); setAsc(k === "name" || k === "org"); } };
  const Th = ({ label, k, right }: { label: string; k: SortKey; right?: boolean }) => (
    <th onClick={() => onSort(k)} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${right ? "text-right" : "text-left"} ${sort === k ? "text-accent" : "text-gray-400"}`}>
      {label}{sort === k ? (asc ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search model / org…" className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm" />
        <select value={org} onChange={(e) => setOrg(e.target.value)} className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
          <option value="">All orgs</option>
          {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <NumFilter label="Max $/1M" value={maxCost} onChange={setMaxCost} placeholder="e.g. 5" />
        <Toggle label={score === "composite" ? "Has benchmark evidence" : "Has score"} on={withScoreOnly} set={setWithScoreOnly} />
        <Toggle label="Has provider" on={hasProviderOnly} set={setHasProviderOnly} />
        <span className="ml-auto text-xs text-gray-500">{rows.length} models{offerScope.restricted ? " · provider-filtered" : ""}</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="dtable w-full min-w-[900px] table-fixed text-sm">
          <colgroup>
            <col style={{ width: "30%" }} /><col style={{ width: "13%" }} /><col style={{ width: "12%" }} />
            <col style={{ width: "17%" }} /><col style={{ width: "8%" }} /><col style={{ width: "20%" }} />
          </colgroup>
          <thead><tr>
            <Th label="Model" k="name" />
            <Th label="Org" k="org" />
            <Th label={SCORE_LABELS[score].split("—")[1]?.trim().replace(/\s*\(.*\)/, "") || "Score"} k="score" right />
            <Th label="Cheapest 10:1 $/1M" k="cost" right />
            <Th label="# Channels" k="providers" right />
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Top provider channels</th>
          </tr></thead>
          <tbody>
            {rows.map(({ m, sc, cost, cheap, ncheap }) => {
              const isOpen = expanded === m.id;
              const channelRanking = rankedOffers(data.offersByModel[m.id], offerScope);
              const channelRankByKey = new Map(channelRanking.map((offer, index) => [offer.key, index + 1]));
              const representativeByKey = new Map(channelRanking.map((offer) => [offer.key, routeSignature(offer)]));
              const allOffers = scopedCatalogRoutes(data.offersByModel[m.id], offerScope).map((offer) => ({
                ...offer, blended: blend(offer.input_per_1m, offer.output_per_1m),
              })).sort((a, b) => {
                const channel = (channelRankByKey.get(a.key) ?? Infinity) - (channelRankByKey.get(b.key) ?? Infinity);
                if (channel) return channel;
                const representative = Number(routeSignature(b) === representativeByKey.get(b.key))
                  - Number(routeSignature(a) === representativeByKey.get(a.key));
                if (representative) return representative;
                return (a.blended ?? Infinity) - (b.blended ?? Infinity);
              });
              return (
              <Fragment key={m.id}>
              <tr className="cursor-pointer hover:bg-white/5" onClick={() => setExpanded(isOpen ? null : m.id)}>
                <td className="px-3 py-2 truncate">
                  <span className="mr-1 text-[10px] text-gray-500">{isOpen ? "▾" : "▸"}</span>
                  <Link href={`/models/${encodeURIComponent(m.id)}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-accent">{collapsedName(m, s.collapse, preferredId)}</Link>
                  {m.open_weights && <span className="ml-2 rounded bg-accent2/15 px-1.5 py-0.5 text-[10px] text-accent2">open</span>}
                  {m.deprecated && <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">deprecated</span>}
                  {m.featured && <span className="ml-1 text-[10px] text-warn">★</span>}
                </td>
                <td className="px-3 py-2 truncate"><span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: orgColor(m.org) }} />{m.org}</span></td>
                <td className="px-3 py-2">{sc != null ? <DataBar frac={sc / maxScoreVal} color={orgColor(m.org)} align="right"><span className="block text-right font-semibold">{num(sc, score.startsWith("designarena") ? 0 : 1)}</span></DataBar> : <span className="block text-right text-gray-600">—</span>}</td>
                <td className="px-3 py-2">{cost != null ? <DataBar frac={cost / maxCostVal} color="#7ee0c0" align="right"><span className="block text-right">{usdPerM(cost)}</span></DataBar> : <span className="block text-right text-gray-600">—</span>}</td>
                <td className="px-3 py-2 text-right tabular text-gray-400">{ncheap || "—"}</td>
                <td className="px-3 py-2 truncate text-xs text-gray-400">
                  {cheap.map((o, i) => <span key={i} className="mr-2 whitespace-nowrap">{o.provider}{o.platform !== o.provider ? <span className="text-gray-600">/{o.platform}</span> : null} <span className="text-gray-500">{usdPerM(o.blended)}</span></span>)}
                  {ncheap > 0 && cheap.length === 0 && <span className="text-gray-600">price not public</span>}
                  {ncheap === 0 && <span className="text-gray-600">no catalog offer</span>}
                </td>
              </tr>
              {isOpen && (
                <tr>
                  <td colSpan={6} className="bg-[#0c0f14] px-4 py-3">
                    <div className="grid gap-4 md:grid-cols-[minmax(220px,280px)_1fr]">
                      {/* model details */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-wide text-gray-500">Benchmarks — {m.display_name}</span>
                          <Link href={`/models/${encodeURIComponent(m.id)}`} className="text-[11px] text-accent">full detail ↗</Link>
                        </div>
                        <table className="w-full text-xs">
                          <tbody>
                            {SCORE_ROWS.map((sr) => {
                              const v = m.scores[sr.key];
                              return (
                                <tr key={sr.key}>
                                  <td className="py-0.5 text-gray-400">{sr.label}</td>
                                  <td className="py-0.5 text-right tabular font-medium">{v != null ? num(v, sr.dp) : <span className="text-gray-600">—</span>}</td>
                                </tr>
                              );
                            })}
                            <tr><td className="py-0.5 text-gray-400">Composite evidence</td><td className="py-0.5 text-right tabular font-medium">{m.composite_coverage}/5</td></tr>
                            <tr><td className="py-0.5 text-gray-400">Weights</td><td className="py-0.5 text-right">{m.open_weights ? "open" : "closed"}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      {/* provider list for this model */}
                      <div>
                        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-gray-500">Providers within global filters — {allOffers.length} exact route{allOffers.length === 1 ? "" : "s"} (provider-channel price rank; alternate routes marked “alt”)</div>
                        {allOffers.length === 0 ? <span className="text-xs text-gray-600">no token pricing</span> : (
                        <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                          <tbody>
                            {allOffers.map((o, i) => {
                              const p = provByKey.get(o.key);
                              const isRepresentative = routeSignature(o) === representativeByKey.get(o.key);
                              const priceRank = isRepresentative ? channelRankByKey.get(o.key) : null;
                              return (
                                <tr key={o.key + i} className="border-b border-line/40">
                                  <td className="py-1 pr-1 text-gray-500">{priceRank != null ? `#${priceRank}` : o.blended == null ? "—" : "alt"}</td>
                                  <td className="py-1 pr-2 font-medium">{o.provider}
                                    {p?.hyperscaler && <span className="ml-1 rounded bg-amber-500/20 px-1 text-[9px] text-amber-300">HS</span>}
                                    {o.eu_hosted && <span className="ml-1 rounded bg-emerald-500/20 px-1 text-[9px] text-emerald-300">EU</span>}
                                    {o.tee && <span className="ml-1 rounded bg-purple-500/20 px-1 text-[9px] text-purple-300">TEE</span>}
                                    <span className="ml-1 text-[10px] text-gray-500">{o.platform !== o.provider ? o.platform : ""} {o.region && o.region !== "global" ? `· ${o.region}` : ""}</span>
                                  </td>
                                  <td className="py-1 tabular text-right text-gray-400">{usdPerM(o.input_per_1m)} in</td>
                                  <td className="py-1 tabular text-right text-gray-400">{usdPerM(o.output_per_1m)} out</td>
                                  <td className="py-1 tabular text-right font-semibold">{usdPerM(o.blended)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
