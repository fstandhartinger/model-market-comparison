"use client";
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { hasScoreEvidence, type ClientData } from "../lib/client-model";
import { SCORE_LABELS, SCORE_SHORT_LABELS } from "../lib/types";
import { scoreLabel, scoreVersion } from "../lib/score-label";
import { usdPerM, num, orgColor } from "../lib/format";
import { modelPrice, rankedOffers, scopedCatalogOffers, scopedCatalogRoutes, createOfferScope, offerPrice, priceContext, priceLabel, type PriceSettings } from "../lib/cost";
import { Toggle, DataBar, NumFilter } from "./ui";
import { InfoTip } from "./InfoTip";
import { ADJUSTED_COST_TIP, scoreTip } from "./methodology";
import { PriceValue, PriceAssumptions } from "./PriceValue";
import { useSettings } from "./SettingsContext";
import { ShortlistControls } from "./ShortlistControls";
import { preferredVariantIds, collapsedName, selectableModels } from "../lib/variants";

type SortKey = "name" | "org" | "score" | "cost" | "providers" | "benchmarks";
const SCORE_ROWS: { key: keyof ClientData["models"][number]["scores"]; label: string; dp: number }[] = [
  { key: "composite", label: "Composite", dp: 1 },
  { key: "aa_coding_index", label: "AA Coding", dp: 1 },
  { key: "aa_coding_agent", label: "AA Coding-Agent", dp: 1 },
  { key: "aa_intelligence_index", label: "AA Intelligence", dp: 1 },
  { key: "epoch_eci", label: "Epoch ECI", dp: 1 },
  { key: "epoch_eci_software", label: "Epoch Software ECI", dp: 1 },
  { key: "designarena_frontend", label: "DA Frontend Elo", dp: 0 },
  { key: "designarena_fullstack", label: "DA Full-Stack Elo", dp: 0 },
];

const routeSignature = (offer: ClientData["offersByModel"][string][number]) => [
  offer.key, offer.region, offer.or_model_id || "", offer.or_canonical_slug || "",
  offer.endpoint_tag || "", offer.pricing_tier || "", offer.route_type || "",
  offer.input_per_1m, offer.output_per_1m, offer.status,
].join("::");

export function ModelExplorer({ data, limit, defaultSort, defaultAsc, simple }: { data: ClientData; limit?: number; defaultSort?: SortKey; defaultAsc?: boolean; simple?: boolean }) {
  const s = useSettings();
  const score = s.score;
  const priceSettings = useMemo<PriceSettings>(() => ({ priceMode: s.priceMode, inputWeight: s.inputWeight }), [s.priceMode, s.inputWeight]);
  const offerScope = useMemo(() => createOfferScope(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly, !s.allowDataTraining), [s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly, s.allowDataTraining]);
  // R1.1: the table opens sorted by the score column, highest first.
  const [sort, setSort] = useState<SortKey>(defaultSort ?? "score");
  const [asc, setAsc] = useState(defaultSort === "cost" ? defaultAsc ?? true : false);
  const [q, setQ] = useState("");
  const [withScoreOnly, setWithScoreOnly] = useState(true);
  const [hasProviderOnly, setHasProviderOnly] = useState(true);
  const [measuredTasksOnly, setMeasuredTasksOnly] = useState(true);
  const [org, setOrg] = useState("");
  // null = no budget limit. Simple mode drives this with a slider (R5.4), Advanced with the
  // numeric field in the toolbar and the wizard with its budget page (R5.6) — one shared
  // setting, so switching mode never silently drops the limit the user just set.
  const { maxCost, setMaxCost } = s;

  const candidates = useMemo(() => selectableModels(data.models, s.hideDeprecated), [data.models, s.hideDeprecated]);
  const orgs = useMemo(() => Array.from(new Set(candidates.map((m) => m.org))).sort(), [candidates]);
  const preferredId = useMemo(() => preferredVariantIds(candidates, score), [candidates, score]);
  const provByKey = useMemo(() => new Map(data.providers.map((p) => [p.key, p])), [data.providers]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // The pool is everything the current filters allow BEFORE the two shortlist limits
  // (min score, max cost) are applied. Simple mode's histograms describe this pool, so
  // the user sees the field they are cutting into rather than what is left of it.
  const pool = useMemo(() => {
    let r = candidates.map((m) => {
      const ctx = priceContext(m, data, priceSettings);
      return {
        m, sc: m.scores[score], hasEvidence: hasScoreEvidence(m, score), price: modelPrice(m, data, offerScope, priceSettings),
        cheap: rankedOffers(data.offersByModel[m.id], offerScope, ctx).slice(0, 3),
        ncheap: scopedCatalogOffers(data.offersByModel[m.id], offerScope, ctx).length,
      };
    });
    if (s.collapse) r = r.filter((x) => !preferredId.has(x.m.family_key) || preferredId.get(x.m.family_key) === x.m.id);
    if (s.openOnly) r = r.filter((x) => x.m.open_weights);
    if (s.featured) r = r.filter((x) => x.m.featured);
    if (s.familySet) r = r.filter((x) => s.familySet!.has(x.m.family_key));
    if (org) r = r.filter((x) => x.m.org === org);
    if (q.trim()) { const t = q.toLowerCase(); r = r.filter((x) => x.m.display_name.toLowerCase().includes(t) || x.m.family_key.includes(t) || x.m.org.toLowerCase().includes(t)); }
    if (withScoreOnly) r = r.filter((x) => x.hasEvidence);
    if (s.priceMode === "adjusted" && measuredTasksOnly) r = r.filter((x) => {
      const tokens = x.m.token_efficiency?.aa.tokens_per_task;
      return tokens && !tokens.stale && Number.isFinite(tokens.value.output) && tokens.value.output > 0;
    });
    // "Has provider": keep only models offered by ≥1 provider within the active filters.
    if (hasProviderOnly || offerScope.restricted) r = r.filter((x) => x.ncheap > 0);
    return r;
  }, [data, candidates, score, offerScope, priceSettings, s.collapse, s.featured, s.familySet, s.openOnly, s.priceMode, org, q, withScoreOnly, hasProviderOnly, measuredTasksOnly, preferredId]);

  const matching = useMemo(() => {
    let r = pool;
    // A composite with zero evidence is the neutral fallback 50, not a measured
    // score — it must not satisfy a positive min-score filter. For the other
    // scores hasEvidence === score != null, so existing policy is unchanged.
    if (s.minScore > 0) r = r.filter((x) => x.hasEvidence && x.sc != null && x.sc >= s.minScore);
    if (maxCost != null) r = r.filter((x) => x.price.value != null && x.price.value <= maxCost);
    // R5.6: the wizard's separate intelligence and coding floors. A model with no result on
    // that index cannot satisfy a floor on it, so it drops out rather than being assumed good.
    if (s.minIntelligence != null) r = r.filter((x) => x.m.scores.aa_intelligence_index != null && x.m.scores.aa_intelligence_index >= s.minIntelligence!);
    if (s.minCoding != null) r = r.filter((x) => x.m.scores.aa_coding_index != null && x.m.scores.aa_coding_index >= s.minCoding!);
    return r;
  }, [pool, s.minScore, maxCost, s.minIntelligence, s.minCoding]);

  const rows = useMemo(() => {
    const dir = asc ? 1 : -1;
    const r = [...matching];
    r.sort((a, b) => {
      if (sort === "name") return dir * a.m.display_name.localeCompare(b.m.display_name);
      if (sort === "org") return dir * a.m.org.localeCompare(b.m.org);
      if (sort === "providers") return dir * (a.ncheap - b.ncheap);
      if (sort === "benchmarks") return dir * (a.m.benchmark_count - b.m.benchmark_count);
      // A model we cannot price must never head a price ranking. Unpriced rows sink to the
      // bottom in both directions instead of being treated as infinitely expensive.
      if (sort === "cost") {
        const av = a.price.value, bv = b.price.value;
        if (av == null || bv == null) return (av == null ? 1 : 0) - (bv == null ? 1 : 0);
        return dir * (av - bv);
      }
      return dir * ((a.sc ?? -Infinity) - (b.sc ?? -Infinity));
    });
    return limit ? r.slice(0, limit) : r;
  }, [matching, sort, asc, limit]);

  const evidenceRelaxed = !withScoreOnly || !hasProviderOnly || (s.priceMode === "adjusted" && !measuredTasksOnly);

  const maxScoreVal = useMemo(() => Math.max(1, ...rows.map((x) => x.sc ?? 0)), [rows]);
  const maxCostVal = useMemo(() => Math.max(1, ...rows.map((x) => x.price.value ?? 0)), [rows]);

  const onSort = (k: SortKey) => { if (sort === k) setAsc(!asc); else { setSort(k); setAsc(k === "name" || k === "org" || k === "cost"); } };
  const Th = ({ label, k, right, sub, info }: { label: string; k: SortKey; right?: boolean; sub?: string; info?: React.ReactNode }) => (
    <th aria-sort={sort === k ? (asc ? "ascending" : "descending") : "none"} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${right ? "text-right" : "text-left"} ${sort === k ? "text-accent" : "text-gray-400"}`}>
      <span className={`inline-flex items-center gap-0.5 ${right ? "justify-end" : ""}`}>
        <button type="button" onClick={() => onSort(k)} className="text-inherit uppercase tracking-wide focus-visible:outline focus-visible:outline-accent">{label}{sort === k ? (asc ? " ▲" : " ▼") : ""}</button>
        {info}
      </span>
      {/* R1.2: the active score name rides along underneath, so the header follows the selector. */}
      {sub && <span className="block text-[10px] font-normal normal-case tracking-normal text-gray-500">({sub})</span>}
    </th>
  );

  return (
    <div>
      {/* R5.3–R5.5: Simple mode asks two questions with sliders and shows the distribution
          behind each one while it is moved. Advanced keeps the full toolbar. */}
      {simple && (
        <ShortlistControls
          scores={pool.map((x) => x.sc).filter((v): v is number => v != null)}
          costs={pool.map((x) => x.price.value).filter((v): v is number => v != null)}
          minScore={s.minScore} setMinScore={s.setMinScore} scoreName={SCORE_SHORT_LABELS[score]}
          maxCost={maxCost} setMaxCost={setMaxCost}
          costUnit={s.priceMode === "adjusted" ? "adjusted $/task" : "raw blended $/1M"}
          matching={matching.length} limit={limit ?? rows.length} pool={pool.length}
        />
      )}
      <div className={`card mb-4 flex-wrap items-center gap-3 p-3 ${simple ? "hidden" : "flex"}`}>
        <input aria-label="Search model or organization" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search model / org…" className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm" />
        <select aria-label="Filter organization" value={org} onChange={(e) => setOrg(e.target.value)} className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
          <option value="">All orgs</option>
          {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <NumFilter label={s.priceMode === "adjusted" ? "Max $/task" : "Max $/1M"} value={maxCost == null ? "" : String(maxCost)}
          onChange={(v) => { const n = parseFloat(v); setMaxCost(Number.isFinite(n) ? n : null); }} placeholder="e.g. 5" />
        {/* R4.11: the three evidence requirements are defaults almost nobody changes.
            They stay with the table they govern, but folded away so the toolbar reads as
            "search, org, budget" rather than as six competing switches. */}
        <details className="relative">
          <summary className={`cursor-pointer list-none rounded-md border px-3 py-1.5 text-sm ${evidenceRelaxed ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
            Evidence{evidenceRelaxed ? " · relaxed" : ""} ▾
          </summary>
          <div className="absolute left-0 z-20 mt-1 flex w-[min(20rem,calc(100vw-3rem))] flex-col gap-2 rounded-lg border border-line bg-panel p-3 shadow-xl">
            <Toggle label={score === "composite" ? "Has benchmark evidence" : "Has score"} on={withScoreOnly} set={setWithScoreOnly} />
            <Toggle label="Has provider" on={hasProviderOnly} set={setHasProviderOnly} />
            {s.priceMode === "adjusted" && <Toggle label="Measured task tokens only" on={measuredTasksOnly} set={setMeasuredTasksOnly} />}
          </div>
        </details>
        <span className="ml-auto text-xs text-gray-500">{rows.length} models{offerScope.restricted ? " · filtered" : ""}</span>
      </div>

      <div className="card overflow-x-auto">
        <table aria-label="Model ranking" className="dtable w-full min-w-[900px] table-fixed text-sm">
          <colgroup>
            <col style={{ width: "30%" }} /><col style={{ width: "13%" }} /><col style={{ width: "12%" }} />
            <col style={{ width: "17%" }} /><col style={{ width: "8%" }} /><col style={{ width: "20%" }} />
          </colgroup>
          <thead><tr>
            <Th label="Model" k="name" />
            <Th label="Org" k="org" />
            <Th label="Score" k="score" right sub={SCORE_SHORT_LABELS[score]} info={<InfoTip title={`Score — ${SCORE_LABELS[score]}`} label="the Score column">{scoreTip(score)}<span className="mt-2 block text-xs text-gray-500">{scoreLabel(score, data.sourceDates)}</span></InfoTip>} />
            <Th label="Adjusted Cost" k="cost" right info={<InfoTip title="Adjusted Cost" label="the Adjusted Cost column">{ADJUSTED_COST_TIP}</InfoTip>} />
            <Th label="# benchmarks" k="benchmarks" right />
            <Th label="# providers" k="providers" right />
          </tr></thead>
          <tbody>
            {rows.map(({ m, sc, price, cheap, ncheap }) => {
              const isOpen = expanded === m.id;
              const ctx = priceContext(m, data, priceSettings);
              const channelRanking = rankedOffers(data.offersByModel[m.id], offerScope, ctx);
              const channelRankByKey = new Map(channelRanking.map((offer, index) => [offer.key, index + 1]));
              const representativeByKey = new Map(channelRanking.map((offer) => [offer.key, routeSignature(offer)]));
              const allOffers = scopedCatalogRoutes(data.offersByModel[m.id], offerScope, ctx).map((offer) => ({
                ...offer, price: offerPrice(offer, ctx),
              })).sort((a, b) => {
                const channel = (channelRankByKey.get(a.key) ?? Infinity) - (channelRankByKey.get(b.key) ?? Infinity);
                if (channel) return channel;
                const representative = Number(routeSignature(b) === representativeByKey.get(b.key))
                  - Number(routeSignature(a) === representativeByKey.get(a.key));
                if (representative) return representative;
                return (a.price.value ?? Infinity) - (b.price.value ?? Infinity);
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
                  {m.benchmaxxing_signal && <span className="bh-badge bh-alert ml-2" title={`Benchmaxxing signal ${m.benchmaxxing_score?.toFixed(1)} — topic-local inconsistency flag, not evidence of intent`}>Benchmaxxing signal</span>}
                </td>
                <td className="px-3 py-2 truncate"><span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: orgColor(m.org) }} />{m.org}</span></td>
                <td className="px-3 py-2">{sc != null ? <DataBar frac={sc / maxScoreVal} color={orgColor(m.org)} align="right"><span className="block text-right font-semibold">{num(sc, score.startsWith("designarena") ? 0 : 1)}</span></DataBar> : <span className="block text-right text-gray-600">—</span>}</td>
                <td className="px-3 py-2">{price.value != null ? <DataBar frac={price.value / maxCostVal} color="#7ee0c0" align="right"><span className="block text-right"><PriceValue price={price} compact /></span></DataBar> : <span className="block text-right text-gray-600">—</span>}</td>
                <td className="px-3 py-2 text-right tabular text-gray-400">{m.benchmark_count || "—"}</td>
                <td className="px-3 py-2 text-right tabular text-gray-400">{ncheap || "—"}</td>
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
                                  <td className="py-0.5 text-gray-400">{sr.label} · {scoreVersion(sr.key, data.sourceDates)}</td>
                                  <td className="py-0.5 text-right tabular font-medium">{v != null ? num(v, sr.dp) : <span className="text-gray-600">—</span>}</td>
                                </tr>
                              );
                            })}
                            {m.composite_base != null && m.scores.composite != null
                              && Math.abs(m.scores.composite - m.composite_base) >= 0.05 && <>
                              <tr title="Mean of observed per-slot percentiles after the model's own mean is used for missing slots">
                                <td className="py-0.5 text-gray-400">Mean-imputed base</td>
                                <td className="py-0.5 text-right tabular">{num(m.composite_base, 1)}</td>
                              </tr>
                              <tr title="Smallest catalog-wide adjustment that prevents missing benchmark slots from reversing a shared-score dominance relationship">
                                <td className="py-0.5 text-gray-400">Dominance adjustment</td>
                                <td className="py-0.5 text-right tabular">{m.scores.composite > m.composite_base ? "+" : ""}{num(m.scores.composite - m.composite_base, 1)}</td>
                              </tr>
                            </>}
                            <tr><td className="py-0.5 text-gray-400">Composite evidence</td><td className="py-0.5 text-right tabular font-medium">{m.composite_coverage}/7</td></tr>
                            <tr><td className="py-0.5 text-gray-400">Weights</td><td className="py-0.5 text-right">{m.open_weights ? "open" : "closed"}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      {/* provider list for this model */}
                      <div>
                        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-gray-500">Providers within global filters — {allOffers.length} exact route{allOffers.length === 1 ? "" : "s"} (provider-channel price rank; alternate routes marked “alt”; prices: {priceLabel(priceSettings)})</div>
                        {allOffers.length === 0 ? <span className="text-xs text-gray-600">no token pricing</span> : (
                        <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead><tr>
                            <th className="py-1 pr-1 text-left text-[10px] font-normal text-gray-500">rank</th>
                            <th className="py-1 pr-2 text-left text-[10px] font-normal text-gray-500">provider</th>
                            <th className="py-1 text-right text-[10px] font-normal text-gray-500">raw in $/1M</th>
                            <th className="py-1 text-right text-[10px] font-normal text-gray-500">raw out $/1M</th>
                            <th className="py-1 text-right text-[10px] font-normal text-gray-500">{price.unit === "$/task" ? "adjusted $/task" : "raw blend $/1M"}</th>
                          </tr></thead>
                          <tbody>
                            {allOffers.map((o, i) => {
                              const p = provByKey.get(o.key);
                              const isRepresentative = routeSignature(o) === representativeByKey.get(o.key);
                              const priceRank = isRepresentative ? channelRankByKey.get(o.key) : null;
                              return (
                                <tr key={o.key + i} className="border-b border-line/40">
                                  <td className="py-1 pr-1 text-gray-500">{priceRank != null ? `#${priceRank}` : o.price.value == null ? "—" : "alt"}</td>
                                  <td className="py-1 pr-2 font-medium">{o.provider}
                                    {p?.hyperscaler && <span className="ml-1 rounded bg-amber-500/20 px-1 text-[9px] text-amber-300">HS</span>}
                                    {o.eu_hosted && <span className="ml-1 rounded bg-emerald-500/20 px-1 text-[9px] text-emerald-300">EU</span>}
                                    {o.eu_policy_equivalent && <span title="Company-approved equivalent; Global inference may occur outside the EU" className="ml-1 rounded bg-sky-500/20 px-1 text-[9px] text-sky-300">EU≈</span>}
                                    {o.tee && <span className="ml-1 rounded bg-purple-500/20 px-1 text-[9px] text-purple-300">TEE</span>}
                                    <span className="ml-1 text-[10px] text-gray-500">{o.platform !== o.provider ? o.platform : ""} {o.region && o.region !== "global" ? `· ${o.region}` : ""}</span>
                                  </td>
                                  <td className="py-1 tabular text-right text-gray-400">{usdPerM(o.input_per_1m)}</td>
                                  <td className="py-1 tabular text-right text-gray-400">{usdPerM(o.output_per_1m)}</td>
                                  <td className="py-1 tabular text-right font-semibold"><PriceValue price={o.price} compact /></td>
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

      {/* F-04: the small print lives under the table now — one footnote joining the
          price hint, the Benchmaxxing screening note (only when a displayed row carries
          the signal) and the measured-task-tokens note with " · ". */}
      <p className="mt-3 text-xs text-gray-500">
        <PriceAssumptions inline />
        {rows.some((x) => x.m.benchmaxxing_signal) && <>{" · "}The <span className="bh-badge bh-alert">Benchmaxxing signal</span> flags the highest topic-local inconsistency scores among coverage-qualified models. It is a screening signal, not evidence of leakage or intent. <Link className="text-accent underline" href="/benchmaxxing#method">Read the method ↗</Link></>}
        {s.priceMode === "adjusted" && measuredTasksOnly && <>{" · "}{simple
          ? <>Only models whose task-token usage has actually been measured are ranked here — a cost we cannot measure is not a cost we will quote. Advanced mode can relax that.</>
          : <>Models without AA task-token measurements are excluded from this ranking. Turn off “Measured task tokens only” to include their assumed task costs.</>}</>}
      </p>
    </div>
  );
}
