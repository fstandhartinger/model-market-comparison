"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { FamilyOption, ProviderInfo } from "../lib/client-model";
import { useSettings } from "./SettingsContext";
import { ScoreSelect, Toggle, NumFilter } from "./ui";
import { InfoTip } from "./InfoTip";
import { MultiCombobox, type ComboItem } from "./MultiCombobox";
import { defaultMinFor, DEFAULT_BLEND, FIXED_BLENDS } from "../lib/cost";
import { SETTINGS_DEFAULTS } from "../lib/settings-state";
import { counted } from "../lib/format";
import { BENCHMAXX_COMPOSITE_WEIGHT } from "../lib/composite.mjs";
import { REGION_BUCKETS, labBucket } from "../lib/regions.mjs";
import { providerCompanies } from "../lib/provider-company.mjs";
import { FILTER_PRESETS, matchingFilterPreset, pickFilters, resolveFilterPatch } from "../lib/presets.mjs";
import { PresetMenu, usePresetStore } from "./PresetMenu";

/** R4.1: the bar is grouped instead of being one long row of equal-looking toggles.
 *  What almost everyone changes (score, min score, price basis) sits on the first line;
 *  regional and confidentiality choices get their own labelled sections; and the rarely
 *  used switches move behind "More settings" (R4.3 / R4.5 / R4.11), so the page stops
 *  presenting fourteen equally loud options at once. */
function Section({ title, hint, children, stack }: { title: string; hint?: string; children: React.ReactNode; stack?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</span>
        {hint && <span className="text-[11px] text-gray-600">{hint}</span>}
      </div>
      <div className={stack ? "space-y-2" : "flex flex-wrap items-center gap-2"}>{children}</div>
    </div>
  );
}

const EU_DEFINITION_ID = "bh-eu-hosted-definition";

/** F-94 / CR-25.4: one regional axis — a label and four toggle chips, all pressed by default. The last pressed
 *  chip cannot be released (a row with nothing in it would empty every view without saying why). */
function RegionRow({ label, value, set, euDefinitionId = EU_DEFINITION_ID }: { label: string; value: string[]; set: (v: string[]) => void; euDefinitionId?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="w-full text-sm text-gray-400 sm:w-48">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {REGION_BUCKETS.map((b) => {
          const on = value.includes(b), last = on && value.length === 1;
          return (
            <button key={b} type="button" aria-pressed={on} aria-label={`${label} ${b}`}
              aria-describedby={label === "Hosted in" && b === "EU" ? euDefinitionId : undefined}
              title={last ? "At least one stays selected" : undefined}
              onClick={() => { if (!last) set(on ? value.filter((x) => x !== b) : [...value, b]); }}
              className={`min-h-8 rounded-md border px-3 text-sm ${on ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
              {on ? "✓ " : ""}{b}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterPresets() {
  const s = useSettings();
  const { store } = usePresetStore();
  const floor = (score: string) => defaultMinFor(score as Parameters<typeof defaultMinFor>[0]);
  const activeId = matchingFilterPreset(s, SETTINGS_DEFAULTS, floor, store.filters);
  return <PresetMenu kind="filters" label="Presets" noun="filters" fallback={s.userFiltersActive ? "Custom" : "None"} ours={FILTER_PRESETS} activeId={activeId} align="right" direction="up"
    onOurs={(id) => s.applyFilters(resolveFilterPatch(FILTER_PRESETS.find((p) => p.id === id)!.patch, SETTINGS_DEFAULTS, floor))}
    onYours={(p) => s.applyFilters(resolveFilterPatch(p.value as Record<string, unknown>, SETTINGS_DEFAULTS, floor))}
    current={pickFilters(s)} />;
}

/** An inclusion list where empty means "all": toggling from "all" keeps everything but the one item. */
const toggleInclusion = (list: string[], all: string[], k: string) => {
  const next = list.length ? (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]) : all.filter((x) => x !== k);
  return next.length === all.length ? [] : next;
};
const countLabel = (n: number, total: number) => (n === total ? "All" : `${n} of ${total}`);

// CR-62.1: the lists arrive as JSON after the page shell (they were inlined into every page); until then the
// sheet's pickers are empty, and they are only reachable once the sheet is opened.
const EMPTY: { providers: ProviderInfo[]; families: FamilyOption[] } = { providers: [], families: [] };
let filterLists: Promise<typeof EMPTY> | null = null;
// CR-74.5: the inline Options panel has no page-data version of its own; it waits for the one the layout's sheet passes.
let listsVersion: string | null = null;
const versionWaiters = new Set<() => void>();
function useFilterLists(version?: string) {
  const [lists, setLists] = useState(EMPTY);
  useEffect(() => {
    let live = true;
    const load = () => {
      if (!listsVersion) return;
      filterLists ??= fetch(`/api/page-data/filters?v=${encodeURIComponent(listsVersion)}`).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
      filterLists.then((value) => { if (live) setLists(value); }, () => { filterLists = null; });
    };
    if (version && version !== listsVersion) { listsVersion = version; versionWaiters.forEach((w) => w()); }
    if (listsVersion) load(); else versionWaiters.add(load);
    return () => { live = false; versionWaiters.delete(load); };
  }, [version]);
  return lists;
}
export function GlobalFilters({ version }: { version: string }) {
  const lists = useFilterLists(version);
  return <FiltersSheet providers={lists.providers} families={lists.families} />;
}

/** CR-74.5 (Florian 2026-09-17): Advanced Overview shows every Options control inline — the same component and the
 *  same settings as the header popup, so a change in either place shows in both. */
export function OptionsInline({ className = "" }: { className?: string }) {
  const lists = useFilterLists();
  // Open from md up; on phones it starts folded so the ranking stays near the top (the Refine sheet covers the rest).
  const box = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (box.current && window.matchMedia("(min-width: 768px)").matches) box.current.open = true; }, []);
  return <details ref={box} data-bh-options-inline className={`bh-options-inline card group ${className}`}>
    <summary className="!mb-0 flex min-h-10 list-none flex-wrap items-baseline gap-x-2 px-3 !py-2 md:px-4 [&::-webkit-details-marker]:hidden">
      <span className="text-sm font-semibold">Options</span>
      <span className="text-[11px] font-normal text-gray-500">the same settings as Options in the header</span>
      <span aria-hidden="true" className="ml-auto text-xs text-gray-400 transition-transform group-open:rotate-180">▾</span>
    </summary>
    <div className="border-t border-line">
      <OptionsBody providers={lists.providers} families={lists.families} inline />
    </div>
  </details>;
}

function FiltersSheet({ providers, families }: { providers: ProviderInfo[]; families: FamilyOption[] }) {
  const s = useSettings();
  const path = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const { filtersOpen, closeFilters } = s;
  // F-18: an overlay, not a page push. Escape and a click outside close it; focus moves into
  // the panel on open and back to whatever opened it on close. A combobox list is rendered
  // outside the panel and handles its own Escape and outside clicks.
  useEffect(() => {
    if (!filtersOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) closeFilters(); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || panel.current?.contains(t) || t.closest("[data-bh-filters-toggle]") || t.closest("[data-bh-combobox]")) return;
      closeFilters();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      opener?.focus?.();
    };
  }, [filtersOpen, closeFilters]);

  if (path === "/benchmarks" || path === "/radar") return null;
  return (
    // F-18: zero-height anchor under the header. Desktop: a right-aligned popover over the
    // page. Phones: a bottom sheet over a dimmed page, with a sticky footer.
    <div className="relative z-40" hidden={!filtersOpen}>
      <div className="fixed inset-0 bg-black/40 lg:hidden" aria-hidden="true" />
      <div ref={panel} id="global-filters" role="dialog" aria-label="Options" tabIndex={-1}
        className="fixed inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-line bg-panel shadow-xl outline-none lg:absolute lg:inset-x-auto lg:bottom-auto lg:right-[max(1rem,calc((100vw-1400px)/2+1rem))] lg:top-2 lg:max-h-[calc(100vh-90px)] lg:w-[min(960px,calc(100vw-2rem))] lg:rounded-xl lg:border">
      <OptionsBody providers={providers} families={families} />
      </div>
    </div>
  );
}

/** CR-74.5: the Options content, shared by the header popup and the inline Advanced panel (`inline`: no
 *  "Show results" close button, and element ids of its own so both can be in the page at once). */
function OptionsBody({ providers, families, inline }: { providers: ProviderInfo[]; families: FamilyOption[]; inline?: boolean }) {
  const s = useSettings();
  const path = usePathname();
  const adjusted = s.priceMode === "adjusted";
  const { closeFilters } = s;
  const euDefinitionId = inline ? `${EU_DEFINITION_ID}-inline` : EU_DEFINITION_ID;
  const ioBasisId = inline ? "bh-io-basis-inline" : "bh-io-basis";

  const familyKeys = useMemo(() => families.map((f) => f.key), [families]);
  const familyItems = useMemo<ComboItem[]>(() => families.map((f) => ({ key: f.key, label: f.name, sub: f.org })), [families]);
  const providerKeys = useMemo(() => providers.map((p) => p.key), [providers]);
  // F-101: one row per provider product — a company reached directly and through a gateway is one
  // choice, not two look-alike rows. The keys behind a row stay the catalog's own.
  const providerItems = useMemo<ComboItem[]>(() => providerCompanies(providers), [providers]);
  const labs = useMemo(() => [...new Set(families.map((f) => f.org))].sort((a, b) => a.localeCompare(b)), [families]);
  const labItems = useMemo<ComboItem[]>(() => labs.map((org) => ({ key: org, label: org, sub: labBucket(org) })), [labs]);

  const active = s.userFiltersActive;
  // F-16: on the Advanced home view the toggle shows what that view applies (off until set).
  const featuredShown = path === "/" && s.advancedView ? s.featuredAdvanced : s.featured;
  const reset = () => {
    s.setProvidersExcluded([]); s.setFamilies([]); s.setLabs([]); s.resetFeatured(); s.setCollapse(true);
    s.setHideDeprecated(true); s.setHostedIn([...REGION_BUCKETS]); s.setProviderBasedIn([...REGION_BUCKETS]); s.setLabBasedIn([...REGION_BUCKETS]);
    s.setOpenOnly(false); s.setTeeOnly(false); s.setAllowDataTraining(false); s.setIsCompany(false);
    s.setMaxCost(null); s.setMinIntelligence(null); s.setMinCoding(null);
    s.resetMinScore(); s.setSimpleMaxCost(null); s.setAdvancedMinScore(0); s.setPriceMode("adjusted"); s.setInputWeight(DEFAULT_BLEND);
    s.setIncludeBenchmaxxing(true);
  };
  // F-40: "Min score" edits the floor of the view on screen — Simple's on the Simple home view,
  // the Advanced floor everywhere else (Advanced, Charts, Compare, the EU table read it).
  const simpleFloor = path === "/" && !s.advancedView;
  const minScoreField = simpleFloor ? (s.minScoreTouched ? String(s.minScore) : "") : (s.advancedMinScore > 0 ? String(s.advancedMinScore) : "");
  const onMinScore = (v: string) => simpleFloor
    ? (v === "" ? s.resetMinScore() : s.setMinScore(parseFloat(v) || 0))
    : s.setAdvancedMinScore(parseFloat(v) || 0);
  const excluded = s.providersExcluded;

  return (
    <>
      <div className={inline ? "bh-options-body space-y-3 px-3 pb-3 pt-3 md:px-4" : "min-h-0 space-y-3 overflow-y-auto px-4 pb-3 pt-3"}>
        <Section title="Ranking">
          <ScoreSelect value={s.score} onChange={s.setScore} />
          <NumFilter label="Min score" value={minScoreField} onChange={onMinScore} placeholder="any" />
          <span className="inline-flex items-center">
            <Toggle label="Featured" on={featuredShown} set={s.setFeatured} />
            <InfoTip title="Featured models" label="the featured filter">
              The shortlist the recommendations start from: the top 20 model families of the
              Artificial Analysis Intelligence Index, taken from each family’s best reasoning
              variant, with deprecated models left out. It is recomputed from the chart on every
              data refresh, so it follows new releases on its own. Turn it off to see every
              tracked model. <a className="text-accent" href="/about#featured">The current list</a>.
            </InfoTip>
          </span>
          {/* CR-74.4: the marginal Benchmaxxing penalty in the Main Composite, on by default. */}
          <span className="inline-flex items-center">
            <Toggle label="Include Benchmaxxing signal in the score" on={s.includeBenchmaxxing} set={s.setIncludeBenchmaxxing} />
            <InfoTip title="Benchmaxxing signal in the score" label="the Benchmaxxing score setting">
              On by default: the Benchmark Heaven Score loses {BENCHMAXX_COMPOSITE_WEIGHT} point per point of a
              positive Benchmaxxing signal (a model that does better on headline benchmarks than on held-out ones).
              A negative or missing signal changes nothing. Turn it off for the plain composite.{" "}
              <a className="text-accent" href="/about#score">How we calculate</a>.
            </InfoTip>
          </span>
        </Section>

        <Section title="Price basis">
          <Toggle label={adjusted ? "Adjusted costs" : "Raw list prices"} on={adjusted} set={(on) => s.setPriceMode(on ? "adjusted" : "raw")} />
          <span className="inline-flex items-center gap-1.5" title="Fixed input:output blend applied to raw list prices. Picking a blend switches prices to raw list mode; the choice stays stored while adjusted costs are on.">
            <label className="text-sm text-gray-400">Fixed I/O blend</label>
            <select aria-label="Fixed I/O blend"
              value={s.inputWeight}
              onChange={(e) => { s.setInputWeight(Number(e.target.value)); s.setPriceMode("raw"); }}
              className="rounded-md border border-line bg-ink px-2 py-1.5 text-sm"
            >
              {FIXED_BLENDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </span>
          {/* CR-65.8: adjusted costs compare models on one common workload unless the reader asks for each model's own usage mix. */}
          <span className="inline-flex items-center gap-1.5">
            <label htmlFor={ioBasisId} className="text-sm text-gray-400">Task workload</label>
            <select id={ioBasisId} value={s.ioBasis} disabled={!adjusted}
              onChange={(e) => s.setIoBasis(e.target.value === "usage" ? "usage" : "common")}
              className="rounded-md border border-line bg-ink px-2 py-1.5 text-sm disabled:opacity-50">
              <option value="common">Same for every model</option>
              <option value="usage">As used on OpenRouter</option>
            </select>
            <InfoTip title="Task workload" label="the task workload setting">
              How many input tokens a task sends for each output token. <b>Same for every model</b> (default)
              applies one global ratio from public usage statistics to every model, so models are compared on
              the same job. <b>As used on OpenRouter</b> takes each model&apos;s own traffic mix instead; that
              describes who uses a model (long agent sessions push it up), not what a task costs, so it can
              make a model look several times pricier. <a className="text-accent" href="/about#adjusted-cost">How we calculate</a>.
            </InfoTip>
          </span>
          {/* CR-25.3: the company question changes which subscription plans are shown next to API costs, so it sits with the price basis. */}
          <span className="inline-flex items-center">
            <Toggle label="I'm buying for a company" on={s.isCompany} set={s.setIsCompany} />
            <InfoTip title="Buying for a company" label="the company setting">
              Some consumer subscriptions are for personal use only: Anthropic&apos;s terms for
              Claude Pro/Max say &ldquo;Non-commercial use only&rdquo; and Google AI plans are open to
              personal accounts only. With this on, the subscription list under the ranking hides
              those plans and shows business seats instead. API prices are the same for everyone.
            </InfoTip>
          </span>
        </Section>

        {/* CR-25.5 / CR-36.3 (F-94): three identical compact comboboxes; lab = the company that trained the model,
            provider = the company that serves it. */}
        <Section title="Models, providers and labs" stack>
          <div className="grid gap-2 md:grid-cols-3">
            <MultiCombobox label="Models" items={familyItems} active={s.families.length > 0}
              summary={countLabel(s.families.length || familyKeys.length, familyKeys.length)}
              isChecked={(k) => !s.families.length || s.families.includes(k)}
              toggle={(ks) => s.setFamilies(ks.reduce((list, k) => toggleInclusion(list, familyKeys, k), s.families))}
              all={() => s.setFamilies([])} only={(ks) => s.setFamilies([...ks])} />
            <MultiCombobox label="Providers" items={providerItems} active={excluded.length > 0}
              summary={countLabel(providerItems.filter((i) => i.keys!.some((k) => !excluded.includes(k))).length, providerItems.length)}
              isChecked={(k) => !excluded.includes(k)}
              toggle={(ks) => s.setProvidersExcluded(ks.every((k) => !excluded.includes(k))
                ? [...excluded, ...ks]
                : excluded.filter((x) => !ks.includes(x)))}
              all={() => s.setProvidersExcluded([])} only={(ks) => s.setProvidersExcluded(providerKeys.filter((x) => !ks.includes(x)))} />
            <MultiCombobox label="Labs" items={labItems} active={s.labs.length > 0}
              summary={countLabel(s.labs.length || labs.length, labs.length)}
              isChecked={(k) => !s.labs.length || s.labs.includes(k)}
              toggle={(ks) => s.setLabs(ks.reduce((list, k) => toggleInclusion(list, labs, k), s.labs))}
              all={() => s.setLabs([])} only={(ks) => s.setLabs([...ks])} />
          </div>
        </Section>

        {/* CR-25.4 (F-94): positively worded, the same shape for all three axes, no (i). */}
        <Section title="Regional" stack>
          <RegionRow label="Hosted in" value={s.hostedIn} set={s.setHostedIn} euDefinitionId={euDefinitionId} />
          <RegionRow label="Provider company based in" value={s.providerBasedIn} set={s.setProviderBasedIn} />
          <RegionRow label="Model lab based in" value={s.labBasedIn} set={s.setLabBasedIn} />
          <p className="text-[11px] text-gray-600">Hosting = where inference runs; company = where the provider or lab is registered.</p>
          {/* CR-17.3: the plain EU definition stays available to assistive tech on the EU hosting chip. */}
          <p id={euDefinitionId} className="sr-only">
            EU hosting means the route&apos;s inference runs inside the EU: an EU region, AWS Bedrock&apos;s EU cross-region
            (geo) profiles, Azure&apos;s Europe Data Zone, or a provider whose entire public fleet is documented as EU-hosted,
            each checked per model against the provider&apos;s documentation. Global deployments do not count, and neither
            does an EU billing region, an EU company or an EU control plane on its own. One disclosed company-policy
            exception stays in, marked &ldquo;EU equivalent&rdquo;.
          </p>
        </Section>

        {/* At lg the two short blocks share a line (same reading order), so the panel fits a laptop screen (F-94: ≤ 600 px). */}
        <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <Section title="Data confidentiality" hint="what the provider may do with your prompts">
          <span className="inline-flex items-center">
            <Toggle label="Trains or keeps your data" on={s.allowDataTraining} set={s.setAllowDataTraining} />
            <InfoTip title="Trains or keeps your data" label="the data-training filter">
              Off by default, which means providers that train on or retain your prompts are removed
              from every figure on this site. A provider passes when OpenRouter lists it under both
              “Does not train” and “Zero retention”. Turn this on to include the others as well.
              Providers OpenRouter does not list — several European hosts among them — have no
              published verdict and are kept, marked unknown rather than assumed either way.
            </InfoTip>
          </span>
        </Section>

        <details className="rounded-lg border border-line/70 bg-ink/40 px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-gray-500">More settings</summary>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Toggle label="One variant for Reasoning models" on={s.collapse} set={s.setCollapse} />
            <Toggle label="Hide deprecated" on={s.hideDeprecated} set={s.setHideDeprecated} />
            <Toggle label="Open-weights only" on={s.openOnly} set={s.setOpenOnly} />
          </div>
          <p className="mt-2 text-[11px] text-gray-600">Evidence requirements (benchmark evidence, priced provider, measured task tokens) sit above the table they apply to.</p>
        </details>
        </div>

        <p className="text-[11px] text-gray-600">Applies to price views &amp; model offers; benchmark evidence stays unfiltered.</p>
      </div>
      <div className={`flex shrink-0 items-center gap-3 border-t border-line px-4 ${inline ? "py-2" : "bg-panel py-3"}`}>
        {!inline && <button type="button" onClick={closeFilters} className="inline-flex min-h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-ink">
          {s.resultCount != null ? `Show ${counted(s.resultCount, "model")}` : "Show results"}
        </button>}
        {active && <button type="button" onClick={reset} className="inline-flex min-h-10 items-center rounded-md border border-line px-3 text-sm text-gray-400 hover:text-gray-200">Reset</button>}
        {/* CR-4.1: filter presets — ours and yours — in the same control as model and row presets (CR-4.2). */}
        <div className="ml-auto"><FilterPresets /></div>
      </div>
    </>
  );
}
