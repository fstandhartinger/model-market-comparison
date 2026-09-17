"use client";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { compareByScore, hasScoreEvidence, isThinComposite, thinCompositeNote, type ClientData } from "../lib/client-model";
import { SCORE_PICKER_LABELS, SCORE_LABELS, SCORE_SHORT_LABELS, type ScoreKey } from "../lib/types";
import { scoreLabel, scoreVersion } from "../lib/score-label";
import { usdPerM, num, orgColor } from "../lib/format";
import { modelPrice, rankedOffers, scopedCatalogOffers, scopedCatalogRoutes, scopeFromSettings, offerPrice, priceContext, priceLabel, type PriceSettings } from "../lib/cost";
import { FREE_ROUTE_NOTE, freeRouteLabel, isFreeRoute, isStealthPreview } from "../lib/free-route.mjs";
import { Toggle, NumFilter } from "./ui";
import { InfoTip } from "./InfoTip";
import { ADJUSTED_COST_TIP, scoreTip } from "./methodology";
import { PriceValue, PriceAssumptions } from "./PriceValue";
import { useSettings } from "./SettingsContext";
import { ShortlistControls } from "./ShortlistControls";
import { MenuDetails } from "./Nav";
import { OptionsInline } from "./GlobalFilters";
import { CostCapabilityScatter } from "./CostCapabilityScatter";
import { SubscriptionsPanel } from "./SubscriptionsPanel";
import { preferredVariantIds, collapsedName, selectableModels } from "../lib/variants";
import { BENCHMAXX_LEVELS, BENCHMAXX_TAG_RULE_TEXT, BENCHMAXX_UNCERTAIN_MARK, BENCHMAXX_UNCERTAIN_TEXT, benchmaxxingLevelInfo, benchmaxxingThresholdText, type BenchmaxxingLevel } from "../lib/benchmaxxing-levels.mjs";
import { capShortlist } from "../lib/shortlist.mjs";
import { SIMPLE_LIMIT, SIMPLE_SCORE_CHOICES, activeCostMeasure, costMeasureChoices, derivedMinScore, topCandidates } from "../lib/value-map.mjs";
import { FIXED_BLENDS } from "../lib/effective-cost.mjs";
import { valueSignals, type ValueSignal } from "../lib/value-signal.mjs";
import { scoreRowSubtitle } from "./ScoreRows";
import { bridgeDisclosure } from "../lib/benchmark-comparison.mjs";

type SortKey = "name" | "org" | "score" | "cost" | "providers" | "benchmarks";
const SCORE_ROWS: { key: keyof ClientData["models"][number]["scores"]; label: string; dp: number }[] = [
  { key: "composite", label: "Composite", dp: 1 },
  { key: "aa_coding_index", label: "AA Coding", dp: 1 },
  { key: "aa_coding_agent", label: "AA Coding-Agent", dp: 1 },
  { key: "aa_intelligence_index", label: "AA Intelligence", dp: 1 },
  { key: "epoch_eci", label: "Epoch ECI", dp: 1 },
  { key: "epoch_eci_software", label: "Epoch Software ECI", dp: 1 },
  { key: "designarena_frontend", label: "DA Web Apps Elo", dp: 0 },
  { key: "designarena_fullstack", label: "DA Full-Stack Elo", dp: 0 },
];

const routeSignature = (offer: ClientData["offersByModel"][string][number]) => [
  offer.key, offer.region, offer.or_model_id || "", offer.or_canonical_slug || "",
  offer.endpoint_tag || "", offer.pricing_tier || "", offer.route_type || "",
  offer.input_per_1m, offer.output_per_1m, offer.status,
].join("::");

/** F-05: keep the number and its magnitude cue in one vertical rhythm. The bar
 * is intentionally decorative; the accessible value remains the text/button. */
function MagnitudeBar({ frac, tone, thin, children }: { frac: number; tone: "score" | "cost"; thin?: boolean; children: ReactNode }) {
  const bounded = Number.isFinite(frac) ? Math.max(0, Math.min(1, frac)) : 0;
  return (
    <div className={`bh-magnitude-bar bh-magnitude-${tone}${thin ? " bh-magnitude-thin" : ""}`}>
      <div className="bh-magnitude-track" aria-hidden="true">
        <div className="bh-magnitude-fill" style={{ width: `${bounded * 100}%` }} />
      </div>
      <span className="relative z-[1] block tabular">{children}</span>
    </div>
  );
}

export function ModelExplorer({ data, limit, defaultSort, defaultAsc, simple, guided, onRowsChange }: { data: ClientData; limit?: number; defaultSort?: SortKey; defaultAsc?: boolean; simple?: boolean; guided?: boolean; /** CR-7.1: the model ids on screen, in display order. */ onRowsChange?: (ids: string[]) => void }) {
  const s = useSettings();
  const score = s.score;
  const priceSettings = useMemo<PriceSettings>(() => ({ priceMode: s.priceMode, inputWeight: s.inputWeight, ioBasis: s.ioBasis }), [s.priceMode, s.inputWeight, s.ioBasis]);
  const offerScope = useMemo(() => scopeFromSettings(s, data.providers), [s.excludedSet, s.hostedIn, s.providerBasedIn, data.providers, s.allowDataTraining]);
  // R1.1: the table opens sorted by the score column, highest first.
  const [sort, setSort] = useState<SortKey>(defaultSort ?? "score");
  const [asc, setAsc] = useState(defaultSort === "cost" ? defaultAsc ?? true : false);
  const [q, setQ] = useState("");
  const [withScoreOnly, setWithScoreOnly] = useState(true);
  const [hasProviderOnly, setHasProviderOnly] = useState(true);
  // F-06: measured task tokens are required in Simple (a quoted cost must be measured) but
  // not in Advanced, which must be able to show every priced model.
  const [measuredTasksOnly, setMeasuredTasksOnly] = useState(!!simple);
  const [org, setOrg] = useState("");
  // F-40: the floor and the cap are split by mode. Simple's sliders own Simple's pair (86 until
  // changed / no limit); Advanced's toolbar and the Guided wizard own the Advanced pair (no floor
  // / no limit until changed). Guided results render Simple's layout but read Advanced's pair, so
  // neither the wizard nor a nudged Simple slider can filter the other view invisibly.
  const simplePair = !!simple && !guided;
  const maxCost = simplePair ? s.simpleMaxCost : s.maxCost;
  const setMaxCost = simplePair ? s.setSimpleMaxCost : s.setMaxCost;
  const minScore = simplePair ? s.minScoreSimple : s.advancedMinScore;
  const setViewMinScore = simplePair ? s.setMinScore : s.setAdvancedMinScore;
  // The wizard's intelligence and coding floors belong to the Advanced side too.
  const minIntelligence = simplePair ? null : s.minIntelligence;
  const minCoding = simplePair ? null : s.minCoding;
  // F-16: Featured is mode-scoped too (Simple: featured only; Advanced: full catalog until set).
  // 2026-09-15: Simple itself no longer applies the internal Featured shortlist. Its table and map
  // take the top SIMPLE_LIMIT families by AA Intelligence Index (then Epoch ECI) out of everything
  // the user's filters allow. A Featured setting the user chose by hand is still honoured.
  const expandSimple = simplePair && !s.featuredTouched;
  const featuredOnly = expandSimple ? false : simple ? s.featured : s.featuredAdvanced;

  const candidates = useMemo(() => selectableModels(data.models, s.hideDeprecated), [data.models, s.hideDeprecated]);
  const orgs = useMemo(() => Array.from(new Set(candidates.map((m) => m.org))).sort(), [candidates]);
  const preferredId = useMemo(() => preferredVariantIds(candidates, score), [candidates, score]);
  const provByKey = useMemo(() => new Map(data.providers.map((p) => [p.key, p])), [data.providers]);
  const [expanded, setExpanded] = useState<string | null>(null);
  // H3 is deliberately tucked into Advanced: it is a powerful comparison tool, not a
  // default ranking rule. Metric values are built server-side from the benchmark view;
  // the current measured value always wins over a bridged estimate.
  const [comparisonTarget, setComparisonTarget] = useState("");
  const [comparisonMetric, setComparisonMetric] = useState("");
  const comparisonMetrics = useMemo(() => [
    ...(data.comparison?.categories ?? []).map((category) => ({ id: `category:${category.id}`, label: `${category.label} · ${category.benchmarkCount} benchmarks`, values: category.values })),
    ...(data.comparison?.axes ?? []).map((axis) => ({ id: `axis:${axis.id}`, label: axis.label, values: axis.values })),
  ], [data.comparison]);
  const chosenComparisonMetric = comparisonMetrics.find((metric) => metric.id === comparisonMetric) ?? null;
  const comparisonReference = chosenComparisonMetric?.values[comparisonTarget] ?? null;
  // F-86: once a reference is chosen, only metrics it can answer are selectable; they come
  // first in the existing order, the rest follow disabled and say why.
  const metricOptions = useMemo(() => {
    if (!comparisonTarget) return comparisonMetrics.map((metric) => ({ id: metric.id, text: metric.label, disabled: false }));
    const options = comparisonMetrics.map((metric) => {
      const value = metric.values[comparisonTarget];
      return { id: metric.id, text: `${metric.label}${!value ? " · no result for this model" : value.approximate ? " · bridged" : ""}`, disabled: !value };
    });
    return [...options.filter((o) => !o.disabled), ...options.filter((o) => o.disabled)];
  }, [comparisonMetrics, comparisonTarget]);
  // Reference models without a value in any metric stay choosable but sit last.
  const [comparableReferences, otherReferences] = useMemo(() => {
    const answered = new Set((data.comparison?.axes ?? []).flatMap((axis) => Object.keys(axis.values)));
    return [candidates.filter((m) => answered.has(m.id)), candidates.filter((m) => !answered.has(m.id))];
  }, [candidates, data.comparison]);

  // The pool is everything the current filters allow BEFORE the two shortlist limits
  // (min score, max cost) are applied. Simple mode's histograms describe this pool, so
  // the user sees the field they are cutting into rather than what is left of it.
  const settingsPool = useMemo(() => {
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
    if (s.labAllowed) r = r.filter((x) => s.labAllowed!(x.m.org));
    if (featuredOnly) r = r.filter((x) => x.m.featured);
    if (s.familySet) r = r.filter((x) => s.familySet!.has(x.m.family_key));
    if (withScoreOnly) r = r.filter((x) => x.hasEvidence);
    if (s.priceMode === "adjusted" && measuredTasksOnly) r = r.filter((x) => {
      const tokens = x.m.token_efficiency?.aa.tokens_per_task;
      return tokens && !tokens.stale && Number.isFinite(tokens.value.output) && tokens.value.output > 0;
    });
    // "Has provider": keep only models offered by ≥1 provider within the active filters.
    if (hasProviderOnly || offerScope.restricted) r = r.filter((x) => x.ncheap > 0);
    return r;
  }, [data, candidates, score, offerScope, priceSettings, s.collapse, featuredOnly, s.familySet, s.openOnly, s.labAllowed, s.priceMode, withScoreOnly, hasProviderOnly, measuredTasksOnly, preferredId]);
  // CR-46.1: the population the cheaper/pricier tags are judged against — the settings' models before
  // search, the lab picker, a comparison, the score floor or the cost cap narrow what is shown.
  const valueReference = useMemo(() => expandSimple ? topCandidates(settingsPool, (x) => x.m, SIMPLE_LIMIT) : settingsPool, [settingsPool, expandSimple]);
  const pool = useMemo(() => {
    let r = settingsPool;
    if (org) r = r.filter((x) => x.m.org === org);
    if (q.trim()) { const t = q.toLowerCase(); r = r.filter((x) => x.m.display_name.toLowerCase().includes(t) || x.m.family_key.includes(t) || x.m.org.toLowerCase().includes(t)); }
    if (chosenComparisonMetric && comparisonReference) {
      r = r.filter((x) => {
        const value = chosenComparisonMetric.values[x.m.id];
        return value != null && value.value > comparisonReference.value;
      });
    }
    // Rank inside the filtered pool, so every filter above still applies. Collapsed families give
    // one row each; with variants expanded the cap keeps the best-ranked families' rows.
    if (expandSimple) r = topCandidates(r, (x) => x.m, SIMPLE_LIMIT);
    return r;
  }, [settingsPool, expandSimple, org, q, chosenComparisonMetric, comparisonReference]);

  // CR-18: while Simple's floor is untouched it defaults to the score of the cheapest model the value
  // map plots from this pre-cut pool, so that model is on the Pareto line. Computed before the cut, so
  // the pool cannot change with the default it produces. Table and map both read s.minScoreSimple.
  const { setDerivedMinScore } = s;
  const derivedFloor = useMemo(() => simplePair
    ? derivedMinScore(pool.filter((x) => x.hasEvidence && x.sc != null).map((x) => ({ x: x.price.value ?? NaN, y: x.sc as number })), { score })
    : null, [simplePair, pool, score]);
  useEffect(() => { if (simplePair) setDerivedMinScore({ score, value: derivedFloor }); }, [simplePair, score, derivedFloor, setDerivedMinScore]);

  const matching = useMemo(() => {
    let r = pool;
    // A composite with zero evidence is the neutral fallback 50, not a measured
    // score — it must not satisfy a positive min-score filter. For the other
    // scores hasEvidence === score != null, so existing policy is unchanged.
    if (minScore > 0) r = r.filter((x) => x.hasEvidence && x.sc != null && x.sc >= minScore);
    if (maxCost != null) r = r.filter((x) => x.price.value != null && x.price.value <= maxCost);
    // R5.6: the wizard's separate intelligence and coding floors. A model with no result on
    // that index cannot satisfy a floor on it, so it drops out rather than being assumed good.
    if (minIntelligence != null) r = r.filter((x) => x.m.scores.aa_intelligence_index != null && x.m.scores.aa_intelligence_index >= minIntelligence);
    if (minCoding != null) r = r.filter((x) => x.m.scores.aa_coding_index != null && x.m.scores.aa_coding_index >= minCoding);
    return r;
  }, [pool, minScore, maxCost, minIntelligence, minCoding]);

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
      return compareByScore(a, b, score, dir);
    });
    if (!limit || r.length <= limit) return r;
    // F-74: the cap is decided apart from the display order — Pareto line first, then the
    // highest scores — so a list sorted by score or by cost never drops its cheapest member.
    const keep = capShortlist(r.map((x) => ({ id: x.m.id, cost: x.price.value, score: x.sc })), limit);
    return r.filter((x) => keep.has(x.m.id));
  }, [matching, sort, asc, limit, score]);

  // F-18: the Filters sheet's primary button reads "Show N models" for the ranking on screen.
  const { setResultCount } = s;
  useEffect(() => { setResultCount(rows.length); }, [rows.length, setResultCount]);
  useEffect(() => () => setResultCount(null), [setResultCount]);
  const rowKey = rows.map((x) => x.m.id).join(",");
  useEffect(() => { onRowsChange?.(rowKey ? rowKey.split(",") : []); }, [rowKey, onRowsChange]);

  // F-28: the Evidence button is highlighted only when a toggle differs from this mode's default
  // (Advanced's default already leaves task tokens unmeasured, so that is not a user filter).
  const evidenceChanged = !withScoreOnly || !hasProviderOnly || (s.priceMode === "adjusted" && measuredTasksOnly !== !!simple);

  // F-23: on phones the org, budget, comparison and evidence controls live in one Refine sheet.
  const [refineOpen, setRefineOpen] = useState(false);
  useEffect(() => {
    if (!refineOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setRefineOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refineOpen]);
  const comparisonActive = !!(chosenComparisonMetric && comparisonReference);
  const refineChanged = Number(!!org) + Number(maxCost != null) + Number(comparisonActive) + Number(evidenceChanged);
  const resetRefine = () => {
    setOrg(""); setMaxCost(null); setComparisonTarget(""); setComparisonMetric("");
    setWithScoreOnly(true); setHasProviderOnly(true); setMeasuredTasksOnly(!!simple);
  };
  const countLabel = `${rows.length} models${s.advancedFiltersActive || q.trim() || org || comparisonActive ? " · filtered" : ""}`;
  // F-40: a floor Advanced applies is never invisible — each one is a removable chip by the count.
  const floorChips = simple ? [] : [
    ...(minScore > 0 ? [{ key: "score", label: `Score ≥ ${minScore}`, clear: () => s.setAdvancedMinScore(0) }] : []),
    ...(minIntelligence != null ? [{ key: "intelligence", label: `Intelligence ≥ ${minIntelligence}`, clear: () => s.setMinIntelligence(null) }] : []),
    ...(minCoding != null ? [{ key: "coding", label: `Coding ≥ ${minCoding}`, clear: () => s.setMinCoding(null) }] : []),
  ];
  const floorChipList = floorChips.map((chip) => (
    <button key={chip.key} type="button" onClick={chip.clear} aria-label={`Remove ${chip.label}`} data-floor-chip={chip.key}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-accent/50 bg-accent/10 px-2 py-0.5 text-xs text-accent">
      {chip.label} <span aria-hidden="true">×</span>
    </button>
  ));
  const evidencePanel = <>
    <Toggle label={score === "composite" ? "Has benchmark evidence" : "Has score"} on={withScoreOnly} set={setWithScoreOnly} />
    <Toggle label="Has provider" on={hasProviderOnly} set={setHasProviderOnly} />
    {s.priceMode === "adjusted" && <Toggle label="Measured task tokens only" on={measuredTasksOnly} set={setMeasuredTasksOnly} />}
  </>;
  const comparisonPanel = <>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="min-w-0 text-xs text-gray-400">Reference model
        <select aria-label="Reference model" value={comparisonTarget} onChange={(e) => setComparisonTarget(e.target.value)} className="mt-1 block w-full min-w-0 rounded-md border border-line bg-ink px-2 py-1.5 text-sm">
          <option value="">Choose a model…</option>
          {comparableReferences.map((model) => <option key={model.id} value={model.id}>{model.display_name} · {model.org}</option>)}
          {otherReferences.length > 0 && comparableReferences.length > 0 && <option disabled value="__none">— no comparable results —</option>}
          {otherReferences.map((model) => <option key={model.id} value={model.id}>{model.display_name} · {model.org}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-xs text-gray-400">Benchmark or category
        <select aria-label="Benchmark or category" value={comparisonMetric} onChange={(e) => setComparisonMetric(e.target.value)} className="mt-1 block w-full min-w-0 rounded-md border border-line bg-ink px-2 py-1.5 text-sm">
          <option value="">Choose a comparison…</option>
          {metricOptions.map((metric) => <option key={metric.id} value={metric.id} disabled={metric.disabled}>{metric.text}</option>)}
        </select>
      </label>
    </div>
    {comparisonTarget && comparisonMetric && <p role="status" className="mt-2 text-xs text-gray-500">
      {comparisonReference
        ? <>Showing models above <b className="text-gray-300">{comparisonReference.value.toFixed(Math.abs(comparisonReference.value) < 10 ? 2 : 1)}</b> for this reference{comparisonReference.approximate ? ` (${bridgeDisclosure(comparisonReference)})` : " (measured)"}. Missing values stay unknown and are excluded; {matching.length} models currently qualify.</>
        : <>This reference has no comparable result for that choice, so the filter is inactive. Missing values stay unknown.</>}
    </p>}
    {(comparisonTarget || comparisonMetric) && <button type="button" className="mt-2 text-xs text-accent underline" onClick={() => { setComparisonTarget(""); setComparisonMetric(""); }}>Clear comparison</button>}
  </>;

  const maxScoreVal = useMemo(() => Math.max(1, ...rows.map((x) => x.sc ?? 0)), [rows]);
  // F-05: cost magnitude is relative to the finite prices actually visible in this
  // table. A log scale keeps a very expensive route from flattening every ordinary
  // model into the first few pixels; missing prices deliberately have no bar.
  const costRange = useMemo(() => {
    const values = rows.map((x) => x.price.value).filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
    if (!values.length) return null;
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [rows]);
  const costBarFraction = (value: number | null): number | null => {
    if (value == null || !Number.isFinite(value) || value <= 0 || !costRange) return null;
    if (costRange.max === costRange.min) return 1;
    return Math.log(value / costRange.min) / Math.log(costRange.max / costRange.min);
  };
  // CR-15.1 / CR-46.1: notably cheap / pricey for the score, judged against the settings' models (filters and
  // price settings apply; the score floor, cost cap and search do not shrink the comparison).
  const valueById = useMemo(() => valueSignals(valueReference.filter((x) => x.hasEvidence).map((x) => ({ id: x.m.id, score: x.sc, cost: x.price.value }))), [valueReference]);

  // CR-44.1: sorted by adjusted cost (either direction) the reader looks from the price side, so the value signal
  // reads "more / less capable for its price" in the Score column; every other sort keeps the cost-relative tag.
  const priceFraming = sort === "cost";
  const onSort = (k: SortKey) => { if (sort === k) setAsc(!asc); else { setSort(k); setAsc(k === "name" || k === "org" || k === "cost"); } };
  // F-14: Org, # benchmarks and # providers drop out on phones (hidden below md); their
  // six-column layout and widths return at md. ('hidden' alone would also hide at md+ in a
  // different cascade order — 'hidden md:table-cell' is the standard responsive pairing.)
  // CR-79.1 (Florian via Hermes, 17 Sep 2026: "Fix the headers"): on a phone the header cells are ~100 px wide, and
  // "CAPABILITY SCORE" in uppercase is wider than that — at 360 px it already spilled 4 px past its cell, and with the
  // phone's larger-text setting (1.3×, where the cell does NOT grow because its width is a percentage of the viewport)
  // the labels ran 30–38 px outside their columns and lost their last letters. Three changes, none of which hides the
  // header or touches the desktop layout: below md the labels drop the uppercasing (the same words, ~12 % narrower)
  // and the cells use px-2 instead of px-3; and the label may break inside a word as a last resort (`break-words`
  // needs `min-w-0` on the flex chain to apply), so text can never leave its own cell at any text scale.
  const Th = ({ label, k, right, sub, info, hideBelowMd }: { label: string; k: SortKey; right?: boolean; sub?: string; info?: React.ReactNode; hideBelowMd?: boolean }) => (
    <th aria-sort={sort === k ? (asc ? "ascending" : "descending") : "none"} className={`${hideBelowMd ? "hidden md:table-cell " : ""}px-2 py-2 md:px-3 text-xs font-semibold normal-case md:uppercase tracking-normal md:tracking-wide ${right ? "text-right" : "text-left"} ${sort === k ? "text-accent" : "text-gray-400"}`}>
      <span className={`flex min-w-0 flex-wrap items-center gap-0.5 ${right ? "justify-end" : ""}`}>
        <button type="button" onClick={() => onSort(k)} className="min-w-0 break-words text-inherit normal-case md:uppercase tracking-normal md:tracking-wide focus-visible:outline focus-visible:outline-accent">{label}{sort === k ? (asc ? " ▲" : " ▼") : ""}</button>
        {info}
      </span>
      {/* R1.2: the active score name rides along underneath, so the header follows the selector. */}
      {sub && <span className="block break-words text-[10px] font-normal normal-case tracking-normal text-gray-500">({sub})</span>}
    </th>
  );

  // CR-63.7: one legend for both tag families, in Simple and Advanced. F-109 (Fable pass 20): one line per mark,
  // behind a collapsed disclosure, so the visible footnote stays at two sentences.
  const showThin = score === "composite" && rows.some((x) => isThinComposite(x.m));
  const showBmx = rows.some((x) => x.m.benchmaxxing_level);
  const tagLegend = <details className="bh-legend mt-1" data-bh-legend>
    <summary className="cursor-pointer select-none text-gray-400 hover:text-inherit">Legend: marks and tags</summary>
    <dl className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
      {/* CR-74.3: thin rows sort in place; the badge (and the hatched bar) mark the uncertain rank. */}
      {showThin && <><dt data-bh-tag-legend="thin"><span className="bh-thin-tag"><span aria-hidden="true">◔</span>&nbsp;Thin data</span> <span className="bh-legend-stripe" aria-label="Striped score bar" role="img" /></dt><dd>Score built on fewer than 3 of 7 Composite inputs (◔ 2/7 = 2 of 7); ranked with everyone else, but its position is uncertain</dd></>}
      {/* CR-74.1 / CR-77.1: one legend line per Benchmaxxing level, strongest first, with the threshold that decides it. */}
      {showBmx && <>{[...BENCHMAXX_LEVELS].reverse().map((x, k) => <Fragment key={x.level}><dt data-bh-tag-legend={k === 0 ? "benchmaxxing" : undefined}><span className="bh-bmx-tag" data-level={x.level}><BenchmaxxingTagFace level={x.level} /></span></dt><dd>{x.title}: signal ≥ +{x.min}{k === 0 ? "; ranks higher on famous public benchmarks than on held-out ones; opens the model's radar" : ""}</dd></Fragment>)}
        {/* CR-77.2: the old guards are information now — the marker, never a suppressed tag. */}
        <dt data-bh-tag-legend="benchmaxxing-uncertain"><span className="bh-bmx-tag" data-level="medium"><BenchmaxxingTagFace level="medium" uncertain /></span></dt><dd>{BENCHMAXX_UNCERTAIN_TEXT.replace(`${BENCHMAXX_UNCERTAIN_MARK} marks`, "Marks")}; the level still follows the score</dd>
        <dt className="sr-only">Tag rule</dt><dd className="col-start-2 text-gray-400">Every level: {BENCHMAXX_TAG_RULE_TEXT}; a screening flag, not proof</dd></>}
      <dt data-bh-tag-legend="value"><span className="bh-value-tag" data-kind="cheap" data-level="strong">↓ cheaper</span> <span className="bh-value-tag" data-kind="pricey" data-level="strong">↑ pricier</span></dt><dd>Cost well below / above models with a similar score in this list</dd>
      <dt><span className="bh-value-tag" data-kind="cheap" data-level="weak">↘ cheaper</span> <span className="bh-value-tag" data-kind="pricey" data-level="weak">↗ pricier</span></dt><dd>Somewhat below / above</dd>
    </dl>
    <p className="mt-2">Ratios compare against the models in the current view, so Simple and Advanced can differ.{showBmx && <> <Link className="text-accent underline" href="/benchmaxxing">What Benchmaxxing means →</Link></>}</p>
  </details>;
  return (
    <div>
      {/* R5.3–R5.5: Simple mode asks two questions with sliders and shows the distribution
          behind each one while it is moved. Advanced keeps the full toolbar. */}
      {/* F-13: the sliders and the value map form one card now; ShortlistControls owns the layout. */}
      {/* CR-75.1: plain-language section headers, so a first-time visitor knows what each block answers. */}
      {simple && <SectionHeader title="The most capable model at every price" caption="Set a minimum score and a budget — see who wins." />}
      {simple && (
        <ShortlistControls
          scores={pool.map((x) => x.sc).filter((v): v is number => v != null)}
          costs={pool.map((x) => x.price.value).filter((v): v is number => v != null)}
          minScore={minScore} setMinScore={setViewMinScore} score={score} scoreName={SCORE_SHORT_LABELS[score]}
          maxCost={maxCost} setMaxCost={setMaxCost}
          costUnit={s.priceMode === "adjusted" ? "adjusted $/task" : "raw blended $/1M"}
          matching={matching.length} limit={limit ?? rows.length} pool={pool.length}
          map={<CostCapabilityScatter data={data} compact guided={guided} measuredOnly={s.priceMode === "adjusted" && measuredTasksOnly} ids={expandSimple ? pool.map((x) => x.m.id) : undefined} />}
          {...(simplePair ? (() => {
            // CR-32.1/32.2: pickers at the two slider labels drive the same global settings as Options.
            const costChoices = costMeasureChoices(FIXED_BLENDS, s.inputWeight);
            return {
              scoreChoices: SIMPLE_SCORE_CHOICES.map((k) => ({ id: k, label: SCORE_PICKER_LABELS[k as ScoreKey] })),
              onScore: (id: string) => s.setScore(id as ScoreKey),
              costChoices, costChoice: activeCostMeasure(costChoices, s.priceMode, s.inputWeight),
              onCost: (id: string) => { const c = costChoices.find((x) => x.id === id); if (!c) return; if (c.patch.inputWeight != null) s.setInputWeight(c.patch.inputWeight); s.setPriceMode(c.patch.priceMode); s.setSimpleMaxCost(null); },
            };
          })() : {})}
        />
      )}
      <div className={`card mb-4 items-center gap-2 p-1 md:gap-3 md:p-3 ${simple ? "hidden" : "flex"} bh-advanced-toolbar`}>
        <input aria-label="Search model or organization" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search model / org…" className="h-10 min-w-0 flex-1 rounded-md border border-line bg-ink px-3 py-1.5 text-sm md:h-auto md:flex-none" />
        <div className="hidden md:flex md:flex-1 md:flex-wrap md:items-center md:gap-3">
        <select aria-label="Filter organization" value={org} onChange={(e) => setOrg(e.target.value)} className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
          <option value="">All orgs</option>
          {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <NumFilter label={s.priceMode === "adjusted" ? "Max $/task" : "Max $/1M"} value={maxCost == null ? "" : String(maxCost)}
          onChange={(v) => { const n = parseFloat(v); setMaxCost(Number.isFinite(n) ? n : null); }} placeholder="e.g. 5" />
        {/* F-16: the H3 comparison is a popover like "Evidence", so the toolbar stays one row. */}
        {/* CR-74.5: the popovers are out of flow (top-full under their summary) and the toolbar's open summary keeps
            its margin (globals.css), so opening one no longer moves the row or the table; Escape / outside click close it. */}
        {data.comparison && <MenuDetails className="relative" summary={
          <summary className={`cursor-pointer list-none rounded-md border px-3 py-1.5 text-sm ${chosenComparisonMetric && comparisonReference ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
            {chosenComparisonMetric && comparisonReference
              ? `Better than ${candidates.find((m) => m.id === comparisonTarget)?.display_name ?? "a model"} · ${chosenComparisonMetric.label.split(" · ")[0]}`
              : "Better than a model"} ▾
          </summary>}>
          <div className="bh-toolbar-popover absolute left-0 top-full z-20 mt-1 w-[min(28rem,calc(100vw-3rem))] rounded-lg border border-line bg-panel p-3 shadow-xl">
          {comparisonPanel}
          </div>
        </MenuDetails>}
        {/* R4.11: the three evidence requirements are defaults almost nobody changes.
            They stay with the table they govern, but folded away so the toolbar reads as
            "search, org, budget" rather than as six competing switches. */}
        <MenuDetails className="relative" summary={
          <summary className={`cursor-pointer list-none rounded-md border px-3 py-1.5 text-sm ${evidenceChanged ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
            Evidence ▾
          </summary>}>
          <div className="bh-toolbar-popover absolute left-0 top-full z-20 mt-1 flex w-[min(20rem,calc(100vw-3rem))] flex-col gap-2 rounded-lg border border-line bg-panel p-3 shadow-xl">
            {evidencePanel}
          </div>
        </MenuDetails>
        <span className="ml-auto inline-flex flex-wrap items-center gap-2 text-xs text-gray-500">{floorChipList}{countLabel}</span>
        </div>
        {/* F-23: phones get one Refine button instead of four controls. */}
        <button type="button" onClick={() => setRefineOpen(true)} aria-haspopup="dialog" aria-expanded={refineOpen}
          className={`bh-nav-button inline-flex h-10 shrink-0 items-center rounded-md border px-3 text-sm md:hidden ${refineChanged ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-300"}`}>
          Refine{refineChanged ? ` · ${refineChanged}` : ""} ▾
        </button>
      </div>
      {!simple && <p className="-mt-3 mb-3 flex flex-wrap items-center gap-2 px-1 text-xs text-gray-500 md:hidden">{floorChipList}{countLabel}</p>}
      {/* CR-74.5 (Florian 2026-09-17): Advanced shows every header Options control inline, bound to the same settings. */}
      {!simple && <OptionsInline className="mb-4" />}
      {!simple && refineOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={() => setRefineOpen(false)} />
          <div role="dialog" aria-label="Refine the ranking" className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-line bg-panel shadow-xl">
            <div className="min-h-0 space-y-4 overflow-y-auto p-4">
              <label className="block text-xs text-gray-400">Organization
                <select aria-label="Filter organization" value={org} onChange={(e) => setOrg(e.target.value)} className="mt-1 block w-full rounded-md border border-line bg-ink px-3 py-2 text-sm">
                  <option value="">All orgs</option>
                  {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <NumFilter label={s.priceMode === "adjusted" ? "Max $/task" : "Max $/1M"} value={maxCost == null ? "" : String(maxCost)}
                onChange={(v) => { const n = parseFloat(v); setMaxCost(Number.isFinite(n) ? n : null); }} placeholder="e.g. 5" />
              {data.comparison && <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Better than a model</p>{comparisonPanel}</div>}
              <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Evidence</p><div className="flex flex-wrap gap-2">{evidencePanel}</div></div>
            </div>
            <div className="flex shrink-0 items-center gap-3 border-t border-line bg-panel px-4 py-3">
              <button type="button" onClick={() => setRefineOpen(false)} className="inline-flex min-h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-ink">Show {rows.length} models</button>
              {refineChanged > 0 && <button type="button" onClick={resetRefine} className="inline-flex min-h-10 items-center rounded-md border border-line px-3 text-sm text-gray-400">Reset</button>}
            </div>
          </div>
        </div>
      )}

      <SectionHeader title="Most capable models and what they really cost" />
      <div className="card overflow-x-auto">
        {/* F-14: no fixed minimum width. On phones exactly three columns carry the width
            (Model 46 % / Score 27 % / Adjusted Cost 27 %, the hidden columns sit at 0 %);
            from md up today's six columns and widths return. Widths on <col> because
            'hidden md:table-cell' is illegal on <col> — the w-0 below md keeps the hidden
            columns from eating the table-fixed width budget. */}
        <p className="sr-only" aria-live="polite" data-value-framing={priceFraming ? "capability" : "cost"}>{valueById.size ? (priceFraming ? "Sorted by cost: value tags now sit in the Score column and mark models more or less capable than their price suggests." : "Value tags sit in the Adjusted Cost column and say how much cheaper or pricier a model is than its score predicts.") : ""}</p>
        <table aria-label="Model ranking" className="dtable w-full table-fixed text-sm">
          <colgroup>
            {/* F-46 (Fable pass 6): the Adjusted Cost header ("ADJUSTED / COST ▼" + (i)) needs
                86 px of content room; at 27 % of a 356 px phone table the (i) overflowed the
                card by 4 px. Model gives up 4 %, Cost takes it. */}
            {/* CR-75.3: "CAPABILITY SCORE (i)" needs the widest word plus the (i) on one line, so on phones Score
                takes 4 % from Model and the headers drop their letter-spacing below md. */}
            <col className="w-[38%] md:w-[30%]" />
            <col className="w-[31%] md:w-[13%]" />
            <col className="w-[31%] md:w-[12%]" />
            <col className="w-0 md:w-[17%]" />
            <col className="w-0 md:w-[14%]" />
            <col className="w-0 md:w-[14%]" />
          </colgroup>
          <thead><tr>
            <Th label="Model" k="name" />
            <Th label="Org" k="org" hideBelowMd />
            {/* CR-75.3: the column says what the number measures; the Composite's full name sits in the tooltip title. */}
            <Th label="Capability Score" k="score" right sub={score === "composite" ? "Main Composite Score" : SCORE_SHORT_LABELS[score]} info={<InfoTip title={score === "composite" ? "Capability Score — Benchmark Heaven Main Composite Score" : `Capability Score — ${SCORE_LABELS[score]}`} label="the Capability Score column">{scoreTip(score)}<span className="mt-2 block text-xs text-gray-500">{scoreLabel(score, data.sourceDates)}</span></InfoTip>} />
            <Th label="Adjusted Cost" k="cost" right sub="modeled $/task" info={<InfoTip title="Adjusted Cost" label="the Adjusted Cost column">{ADJUSTED_COST_TIP}</InfoTip>} />
            <Th label="# benchmarks" k="benchmarks" right hideBelowMd />
            <Th label="# providers" k="providers" right hideBelowMd />
          </tr></thead>
          <tbody>
            {rows.map(({ m, sc, hasEvidence, price, cheap, ncheap }) => {
              const isOpen = expanded === m.id;
              const ctx = priceContext(m, data, priceSettings);
              const channelRanking = rankedOffers(data.offersByModel[m.id], offerScope, ctx);
              const channelRankByKey = new Map(channelRanking.map((offer, index) => [offer.key, index + 1]));
              const representativeByKey = new Map(channelRanking.map((offer) => [offer.key, routeSignature(offer)]));
              const allOffers = scopedCatalogRoutes(data.offersByModel[m.id], offerScope, ctx).map((offer) => ({
                ...offer, price: offerPrice(offer, ctx),
              })).sort((a, b) => {
                // CR-50.1: free routes are listed for provenance, after every paid route.
                const free = Number(isFreeRoute(a)) - Number(isFreeRoute(b));
                if (free) return free;
                const channel = (channelRankByKey.get(a.key) ?? Infinity) - (channelRankByKey.get(b.key) ?? Infinity);
                if (channel) return channel;
                const representative = Number(routeSignature(b) === representativeByKey.get(b.key))
                  - Number(routeSignature(a) === representativeByKey.get(a.key));
                if (representative) return representative;
                return (a.price.value ?? Infinity) - (b.price.value ?? Infinity);
              });
              return (
              <Fragment key={m.id}>
              <tr className="bh-ranking-row cursor-pointer hover:bg-white/5" onClick={() => setExpanded(isOpen ? null : m.id)}
                data-model-id={m.id} data-cost={price.value ?? undefined} data-score={hasEvidence && sc != null ? sc : undefined}>
                {/* F-14: on phones the name may wrap (md:truncate restores the single-line look
                    at md), and the org moves here as an 11 px muted line. F-56: the name wraps only
                    at spaces ("GLM-5.3" stays whole) and below md the badges sit on the org line. */}
                <td className="px-3 py-2 md:truncate">
                  <span aria-hidden="true" className={`bh-row-chevron mr-1 ${isOpen ? "is-open" : ""}`}>›</span>
                  <Link href={`/models/${encodeURIComponent(m.id)}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-accent">{String(collapsedName(m, s.collapse, preferredId)).split(" ").map((token, i) => <Fragment key={i}>{i > 0 && " "}<span className="whitespace-nowrap">{token}</span></Fragment>)}</Link>
                  {m.open_weights && <span className="ml-2 hidden rounded bg-accent2/15 px-1.5 py-0.5 text-[10px] text-accent2 md:inline">open</span>}
                  {m.deprecated && <span className="ml-1 hidden rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300 md:inline">deprecated</span>}
                  {m.featured && !simple && <span className="ml-1 hidden text-[10px] text-warn md:inline" title="Featured model">★</span>}
                  {m.benchmaxxing_level && <BenchmaxxingTag id={m.benchmaxxing_report_id ?? m.id} name={String(collapsedName(m, s.collapse, preferredId))} level={m.benchmaxxing_level} score={m.benchmaxxing_score ?? null} uncertain={m.benchmaxxing_uncertain ?? null} />}
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 md:hidden">
                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: orgColor(m.org) }} />
                    {m.org}
                    {m.featured && !simple && <span className="text-[10px] text-warn" title="Featured model">★</span>}
                    {m.open_weights && <span className="rounded bg-accent2/15 px-1.5 py-0.5 text-[10px] text-accent2">open</span>}
                    {m.deprecated && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">deprecated</span>}
                  </span>
                </td>
                <td className="hidden truncate px-3 py-2 md:table-cell"><span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: orgColor(m.org) }} />{m.org}</span></td>
                {/* F-25/F-41: a Composite with fewer than three filled slots (exact or attached)
                    looks thin — muted and hatched. Advanced pips tell exact from attached. */}
                <td className="px-3 py-2">{sc != null ? (() => {
                  const composite = score === "composite";
                  const exact = composite ? m.composite_coverage : 7;
                  const attached = composite ? m.composite_attached : 0;
                  const thin = composite && isThinComposite(m);
                  const evidence = `${exact} exact + ${attached} attached of 7 Composite inputs`;
                  const note = thin ? thinCompositeNote(m) : undefined;
                  const valueNum = <span className={`block text-right font-semibold ${thin ? "text-gray-500" : ""}`} title={note}>{num(sc, score.startsWith("designarena") ? 0 : 1)}</span>;
                  const capTag = priceFraming ? capabilityTag(valueById.get(m.id), price.value, sc) : null;
                  return <MagnitudeBar frac={sc / maxScoreVal} tone="score" thin={thin}>
                    {capTag ? <span className="bh-cost-line flex items-center justify-end gap-1.5 whitespace-nowrap">{capTag}{valueNum}</span> : valueNum}
                    {/* CR-74.3: thin rows sort in place and carry this badge instead of a separate band; below 1024 px it
                        shrinks to "◔ 2/7", the full sentence stays in title and sr-only. */}
                    {thin && <span className="mt-0.5 flex justify-end"><span className="bh-thin-tag" data-thin-evidence data-composite-inputs={exact + attached} title={note}>
                      <span aria-hidden="true">◔</span><span className="bh-thin-full" aria-hidden="true">&nbsp;Thin data · {exact + attached}/7</span><span className="bh-thin-compact" aria-hidden="true">&nbsp;{exact + attached}/7</span><span className="sr-only">{note}</span>
                    </span></span>}
                    {exact < 7 && !simple && <span className="mt-1 flex justify-end gap-0.5" title={evidence} aria-label={evidence} role="img">
                      {Array.from({ length: 7 }, (_, i) => <span key={i} aria-hidden="true" className={`h-1 w-1 rounded-[1px] border ${i < exact ? "border-accent bg-accent" : i < exact + attached ? "border-accent bg-accent/40" : "border-line bg-transparent"}`} />)}
                    </span>}
                  </MagnitudeBar>;
                })() : <span className="block text-right text-gray-600">—</span>}</td>
                <td className="bh-cost-cell px-3 py-2">{price.value != null ? <MagnitudeBar frac={costBarFraction(price.value) ?? 0} tone="cost"><span className="bh-cost-line flex items-center justify-end gap-1.5 whitespace-nowrap">{(() => {
                  const v = valueById.get(m.id);
                  // CR-44.1: sorted by cost, the same signal moves to the Score column in capability words — never both.
                  if (!v || priceFraming) return null;
                  const ratio = `${v.ratio >= 10 ? Math.round(v.ratio) : v.ratio.toFixed(1)}×`;
                  const words = v.kind === "cheap" ? `${ratio} cheaper` : `${ratio} pricier`;
                  const strong = v.level === "strong";
                  const why = `${strong ? "Well" : "Somewhat"} ${v.kind === "cheap" ? "below" : "above"} the typical cost for a ${num(sc, 1)} score: about ${ratio} ${v.kind === "cheap" ? "less" : "more"}, compared with the ${v.n} priced models in this ${simple ? "Simple" : "Advanced"} view under your settings (log cost fitted against score). The reference set differs between views, so the ratio can too.`;
                  // CR-24.1: the tag sits left of the price on the same line, so the cost bar keeps its row height.
                  // Florian 2026-09-15 (directive 10): below 1024 px (where the words overflow the cell) the tag is the compact "↓11×"; the words stay in the tooltip and for screen readers.
                  // CR-42.1: a strong tag is a filled pill with a straight arrow, a weak one an outlined pill with a slanted arrow.
                  return <span className="bh-value-tag" data-kind={v.kind} data-level={v.level} title={`${words}. ${why}`}><span aria-hidden="true">{v.kind === "cheap" ? (strong ? "↓" : "↘") : (strong ? "↑" : "↗")}</span><span className="bh-vt-full">{words}</span><span className="bh-vt-compact" aria-hidden="true">{ratio}</span><span className="sr-only">{strong ? "Notably" : "Slightly"} {v.kind === "cheap" ? "cheap" : "pricey"}, {words}: {why}</span></span>;
                })()}<PriceValue price={price} compact showEstimate={false} context={{ cheapest: cheap.length > 0, strongest: s.collapse && preferredId.get(m.family_key) === m.id }} /></span></MagnitudeBar> : (data.offersByModel[m.id] ?? []).some(isStealthPreview)
                  // CR-60.3: a stealth model with only its $0 preview route has no paid price; say why the cell is empty.
                  ? <span className="block whitespace-nowrap text-right text-xs text-gray-500" title={FREE_ROUTE_NOTE}>free (stealth preview)</span>
                  : <span className="block text-right text-gray-600">—</span>}</td>
                <td className="hidden px-3 py-2 text-right tabular text-gray-400 md:table-cell">{m.benchmark_count || "—"}</td>
                <td className="hidden px-3 py-2 text-right tabular text-gray-400 md:table-cell">{ncheap || "—"}</td>
              </tr>
              {isOpen && (
                <tr>
                  <td colSpan={6} className="bg-[#0c0f14] px-4 py-3">
                    <div className="grid gap-4 md:grid-cols-[minmax(220px,280px)_1fr]">
                      {/* model details */}
                      <div data-pane="benchmarks">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-wide text-gray-500">Benchmarks — {m.display_name}</span>
                          <Link href={`/models/${encodeURIComponent(m.id)}`} className="text-[11px] text-accent">full detail ↗</Link>
                        </div>
                        <table className="w-full text-xs">
                          <tbody>
                            {/* CR-33.3: the Main Composite Score always heads the list; a different selected score follows. */}
                            <tr className="bh-score-mini" data-score="composite">
                              <th scope="row" className="py-1 pr-2 text-left font-normal">
                                <span className="block text-[13px] font-bold text-gray-200">Benchmark Heaven Score</span>
                                <span className="block text-[10px] text-gray-500">Main Composite Score</span>
                              </th>
                              <td className="py-1 text-right text-base font-bold tabular">{m.scores.composite != null && hasScoreEvidence(m, "composite") ? num(m.scores.composite, 1) : <span className="text-gray-600">—<span className="sr-only">No score with benchmark evidence</span></span>}</td>
                            </tr>
                            {score !== "composite" && <tr className="bh-score-mini" data-score={score} data-score-role="selected">
                              <th scope="row" className="py-1 pr-2 text-left font-normal">
                                <span className="block text-[13px] font-bold text-gray-200">{SCORE_SHORT_LABELS[score]}</span>
                                <span className="block text-[10px] text-gray-500">{scoreRowSubtitle(score)}</span>
                              </th>
                              <td className="py-1 text-right text-base font-bold tabular">{sc != null && hasEvidence ? num(sc, score.startsWith("designarena") ? 0 : 1) : <span className="text-gray-600">—<span className="sr-only">No score with benchmark evidence</span></span>}</td>
                            </tr>}
                            {SCORE_ROWS.map((sr) => {
                              const v = m.scores[sr.key];
                              return (
                                <tr key={sr.key}>
                                  <td className="py-0.5 text-gray-400">{sr.label} · {scoreVersion(sr.key, data.sourceDates)}</td>
                                  <td className="py-0.5 text-right tabular font-medium">{v != null ? num(v, sr.dp) : <span className="text-gray-600">—</span>}</td>
                                </tr>
                              );
                            })}
                            {/* CR-74.4: the dominance rows compare the pre-penalty composite; the penalty has its own row. */}
                            {m.composite_raw != null && m.scores.composite != null && m.composite_raw - m.scores.composite >= 0.05
                              && <tr title="Lowered for a positive Benchmaxxing signal; switch off with Include Benchmaxxing signal in the score (Options)"><td className="py-0.5 text-gray-400">Benchmaxxing penalty</td><td className="py-0.5 text-right tabular">−{num(m.composite_raw - m.scores.composite, 1)}</td></tr>}
                            {m.composite_base != null && (m.composite_raw ?? m.scores.composite) != null
                              && Math.abs((m.composite_raw ?? m.scores.composite)! - m.composite_base) >= 0.05 && <>
                              <tr title="Mean of observed per-slot percentiles after the model's own mean is used for missing slots">
                                <td className="py-0.5 text-gray-400">Mean-imputed base</td>
                                <td className="py-0.5 text-right tabular">{num(m.composite_base, 1)}</td>
                              </tr>
                              <tr title="Lowers this row just below a better-measured model that is at least as good on every input this row has (the other model is never raised)">
                                <td className="py-0.5 text-gray-400">Dominance adjustment</td>
                                <td className="py-0.5 text-right tabular">{(m.composite_raw ?? m.scores.composite)! > m.composite_base ? "+" : ""}{num((m.composite_raw ?? m.scores.composite)! - m.composite_base, 1)}</td>
                              </tr>
                            </>}
                            <tr><td className="py-0.5 text-gray-400">Composite evidence</td><td className="py-0.5 text-right tabular font-medium">{m.composite_coverage} exact{m.composite_attached ? ` + ${m.composite_attached} attached` : ""} / 7</td></tr>
                            <tr><td className="py-0.5 text-gray-400">Weights</td><td className="py-0.5 text-right">{m.open_weights ? "open" : "closed"}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      {/* provider list for this model. CR-43.2: from md up the pane takes exactly the benchmarks pane's
                          height (absolute fill of the stretched grid cell, so its own length never grows the row) and
                          scrolls inside; on phones the panes stack and the list keeps its own capped scroll. */}
                      <div className="relative" data-pane="providers">
                        <div className="flex flex-col md:absolute md:inset-0">
                        <div className="mb-1.5 shrink-0 text-[11px] uppercase tracking-wide text-gray-500">Providers within global filters — {allOffers.length} exact route{allOffers.length === 1 ? "" : "s"} (provider-channel price rank; alternate routes marked “alt”; prices: {priceLabel(priceSettings)})</div>
                        {allOffers.length === 0 ? <span className="text-xs text-gray-600">no token pricing</span> : (
                        <div className="max-h-64 overflow-y-auto md:max-h-none md:min-h-0 md:flex-1" data-pane-scroll="providers" tabIndex={0} aria-label={`Provider routes for ${m.display_name}`}>
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 z-[1] bg-[#0c0f14]"><tr>
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
                              const free = isFreeRoute(o);
                              return (
                                <tr key={o.key + i} className="border-b border-line/40" data-free-route={free ? "1" : undefined}>
                                  <td className="py-1 pr-1 text-gray-500">{free ? "—" : priceRank != null ? `#${priceRank}` : o.price.value == null ? "—" : "alt"}</td>
                                  <td className="py-1 pr-2 font-medium">
                                    {p?.website
                                      ? <a href={p.website} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-accent" title={`Official website: ${p.website}`} aria-label={`${o.provider} official website`}>{o.provider}</a>
                                      : o.provider}
                                    {p?.hyperscaler && <span className="ml-1 rounded bg-amber-500/20 px-1 text-[9px] text-amber-300">HS</span>}
                                    {o.eu_hosted && <span className="ml-1 rounded bg-emerald-500/20 px-1 text-[9px] text-emerald-300">EU</span>}
                                    {o.eu_policy_equivalent && <span title="Company-approved equivalent; Global inference may occur outside the EU" className="ml-1 rounded bg-sky-500/20 px-1 text-[9px] text-sky-300">EU≈</span>}
                                    {o.tee && <span className="ml-1 rounded bg-purple-500/20 px-1 text-[9px] text-purple-300">TEE</span>}
                                    {free && <span title={FREE_ROUTE_NOTE} className="ml-1 rounded border border-line px-1 text-[9px] text-gray-400">{freeRouteLabel(o)}<span className="sr-only"> — {FREE_ROUTE_NOTE}</span></span>}
                                    <span className="ml-1 text-[10px] text-gray-500">{o.platform !== o.provider ? o.platform : ""} {o.region && o.region !== "global" ? `· ${o.region}` : ""}</span>
                                  </td>
                                  <td className="py-1 tabular text-right text-gray-400">{usdPerM(o.input_per_1m)}</td>
                                  <td className="py-1 tabular text-right text-gray-400">{usdPerM(o.output_per_1m)}</td>
                                  <td className="py-1 tabular text-right font-semibold">{free ? <span className="text-[10px] font-normal text-gray-500" title={FREE_ROUTE_NOTE}>not a paid price</span> : <PriceValue price={o.price} compact showEstimate={false} />}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        </div>
                        )}
                        </div>
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
        {simple ? <><span>Underlined prices open their inputs and sources · </span><Link className="text-accent underline" href="/about#adjusted-cost">How we calculate adjusted cost</Link><span>. Only models with measured task-token usage are ranked here; Advanced can relax that.</span></> : <><PriceAssumptions inline />
          {s.priceMode === "adjusted" && measuredTasksOnly && <>{" · "}Models without AA task-token measurements are excluded from this ranking. Turn off “Measured task tokens only” to include their assumed task costs.</>}</>}
      </p>
      <div className="text-xs text-gray-500">{tagLegend}</div>
      {/* CR-63.1 (Florian 2026-09-16: "benchmaxxing tab should be moved up in priority"): a one-line teaser in the style of the row below. */}
      <p className="card mt-4 px-4 py-3 text-sm" data-bh-benchmaxxing-teaser>
        <span aria-hidden="true" className="text-warn">⚠ </span><strong>Benchmaxxing check.</strong>{" "}
        <span className="text-gray-400">Some models shine on the famous public benchmarks and slip on held-out ones nobody can train for. We flag that gap so you don&apos;t trust a single headline number.</span>{" "}
        <Link href="/benchmaxxing" className="whitespace-nowrap font-semibold text-accent underline decoration-dotted underline-offset-2">See which models are flagged →</Link>
      </p>
      <SubscriptionsPanel perTask={s.priceMode === "adjusted"}
        rows={matching.map((x) => ({ id: x.m.id, name: collapsedName(x.m, s.collapse, preferredId), org: x.m.org, score: x.sc, cost: x.price.value }))} />
    </div>
  );
}

/** CR-74.1: the tag's visible face — light "Benchmaxxing?", medium "⚠ Benchmaxxing", very strong "⚠⚠ Benchmaxxing".
 *  CR-77.2: a tag on thin evidence carries the muted "◔" behind the words (the reason is in the tag's title). */
function BenchmaxxingTagFace({ level, value = null, uncertain = false }: { level: BenchmaxxingLevel; value?: string | null; uncertain?: boolean }) {
  return <>{level !== "light" && <span aria-hidden="true">{benchmaxxingLevelInfo(level)!.mark}&nbsp;</span>}<span className="bh-bmx-words">Benchmaxxing{level === "light" ? "?" : ""}</span>{value && <span className="bh-bmx-score">&nbsp;{value}</span>}{uncertain && <span className="bh-bmx-uncertain" aria-hidden="true">{BENCHMAXX_UNCERTAIN_MARK}</span>}</>;
}

/** F-104 / CR-42.2 + CR-48.1: the Benchmaxxing tag is a real link to the model's radar. CR-74.1: three levels (light,
 *  medium, very strong). It never expands the row: click/Enter bubble as a click and are stopped here; Space (which
 *  does not activate links natively) navigates too. */
function BenchmaxxingTag({ id, name, level, score, uncertain = null }: { id: string; name: string; level: BenchmaxxingLevel; score: number | null; uncertain?: string | null }) {
  const href = `/benchmaxxing?model=${encodeURIComponent(id)}#radar`;
  const value = score != null ? score.toFixed(1) : null;
  const info = benchmaxxingLevelInfo(level)!;
  return <Link href={href} className="bh-bmx-tag ml-2" data-level={level} data-bmx-uncertain={uncertain ? "" : undefined}
    aria-label={`Benchmaxxing signal, ${info.label}${value ? ` (${value})` : ""}${uncertain ? `, uncertain: ${uncertain}` : ""} — open the report for ${name}`}
    title={`${info.title} Benchmaxxing signal${value ? ` ${value}` : ""} (${benchmaxxingThresholdText()}; ${BENCHMAXX_TAG_RULE_TEXT}): ranks higher on famous public benchmarks than on held-out ones of the same topic — a screening flag, not evidence of intent.${uncertain ? ` ${uncertain}.` : ""} Opens the radar.`}
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => {
      if (e.key === "Enter") e.stopPropagation();
      if (e.key === " ") { e.preventDefault(); e.stopPropagation(); e.currentTarget.click(); }
    }}>
    <BenchmaxxingTagFace level={level} value={value} uncertain={Boolean(uncertain)} />
  </Link>;
}

/** CR-44.1: the value signal in capability words for the Score column (cost sort). Same model, same level, same arrow
 *  shapes (straight = strong, slanted = weak); a model cheap for its score is "more capable" for its price. No score
 *  distance is printed: read along the fitted line it extrapolates far outside the scores anyone measured, so the size
 *  stays the cost ratio the signal is built on. Below 1024 px only the arrow shows; the words are in title and sr-only. */
function capabilityTag(v: ValueSignal | undefined, cost: number | null, sc: number) {
  if (!v) return null;
  const up = v.kind === "cheap";
  const strong = v.level === "strong";
  const ratio = `${v.ratio >= 10 ? Math.round(v.ratio) : v.ratio.toFixed(1)}×`;
  const words = up ? "more capable" : "less capable";
  const why = `${strong ? "Well" : "Somewhat"} ${up ? "above" : "below"} the capability typical for ${cost != null ? `a $${cost < 1 ? cost.toPrecision(2) : cost.toFixed(2)} cost` : "its cost"}: its ${num(sc, 1)} score usually costs about ${ratio} ${up ? "more" : "less"}. Same signal as the ${ratio} ${up ? "cheaper" : "pricier"} tag shown when sorted by score, among ${v.n} priced models with your settings (log cost fitted against score).`;
  return <span className="bh-value-tag" data-kind={v.kind} data-level={v.level} data-framing="capability" title={`${words} for its price. ${why}`}><span aria-hidden="true">{up ? (strong ? "↑" : "↗") : (strong ? "↓" : "↘")}</span><span className="bh-vt-full">{words}</span><span className="sr-only">{strong ? "Notably" : "Slightly"} {words} for its price: {why}</span></span>;
}

function SectionHeader({ title, caption }: { title: string; caption?: string }) {
  return <div className="mb-2 px-1" data-bh-section-header>
    <h2 className="text-lg font-semibold leading-snug tracking-tight text-gray-100 sm:text-xl">{title}</h2>
    {caption && <p className="bh-muted text-xs sm:text-sm">{caption}</p>}
  </div>;
}
