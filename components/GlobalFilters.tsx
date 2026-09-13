"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { ProviderInfo } from "../lib/client-model";
import { useSettings } from "./SettingsContext";
import { ScoreSelect, Toggle, ProviderFilter, ModelFilter, NumFilter, type FamilyOption } from "./ui";
import { InfoTip } from "./InfoTip";
import { defaultMinFor, DEFAULT_BLEND, FIXED_BLENDS } from "../lib/cost";

/** R4.1: the bar is grouped instead of being one long row of equal-looking toggles.
 *  What almost everyone changes (score, min score, price basis) sits on the first line;
 *  regional and confidentiality choices get their own labelled sections; and the rarely
 *  used switches move behind "More settings" (R4.3 / R4.5 / R4.11), so the page stops
 *  presenting fourteen equally loud options at once. */
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</span>
        {hint && <span className="text-[11px] text-gray-600">{hint}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function GlobalFilters({ providers, families }: { providers: ProviderInfo[]; families: FamilyOption[] }) {
  const s = useSettings();
  const path = usePathname();
  const adjusted = s.priceMode === "adjusted";
  const panel = useRef<HTMLDivElement>(null);
  const { filtersOpen, closeFilters } = s;
  // F-18: an overlay, not a page push. Escape and a click outside close it; focus moves into
  // the panel on open and back to whatever opened it on close.
  useEffect(() => {
    if (!filtersOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeFilters(); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || panel.current?.contains(t) || t.closest("[data-bh-filters-toggle]")) return;
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
  const active = s.userFiltersActive;
  // F-16: on the Advanced home view the toggle shows what that view applies (off until set).
  const featuredShown = path === "/" && s.advancedView ? s.featuredAdvanced : s.featured;
  const reset = () => {
    s.setProvidersExcluded([]); s.setFamilies([]); s.resetFeatured(); s.setCollapse(true);
    s.setHideDeprecated(true); s.setExcludeChinese(false); s.setEuHostedOnly(false); s.setNonUsOnly(false);
    s.setOpenOnly(false); s.setTeeOnly(false); s.setAllowDataTraining(false); s.setIsCompany(false);
    s.setMaxCost(null); s.setMinIntelligence(null); s.setMinCoding(null);
    s.resetMinScore(); s.setSimpleMaxCost(null); s.setAdvancedMinScore(0); s.setPriceMode("adjusted"); s.setInputWeight(DEFAULT_BLEND);
  };
  // F-40: "Min score" edits the floor of the view on screen — Simple's on the Simple home view,
  // the Advanced floor everywhere else (Advanced, Charts, Compare, the EU table read it).
  const simpleFloor = path === "/" && !s.advancedView;
  const minScoreField = simpleFloor ? (s.minScoreTouched ? String(s.minScore) : "") : (s.advancedMinScore > 0 ? String(s.advancedMinScore) : "");
  const onMinScore = (v: string) => simpleFloor
    ? (v === "" ? s.resetMinScore() : s.setMinScore(parseFloat(v) || 0))
    : s.setAdvancedMinScore(parseFloat(v) || 0);

  return (
    // F-18: zero-height anchor under the header. Desktop: a right-aligned popover over the
    // page. Phones: a bottom sheet over a dimmed page, with a sticky footer.
    <div className="relative z-40" hidden={!filtersOpen}>
      <div className="fixed inset-0 bg-black/40 lg:hidden" aria-hidden="true" />
      <div ref={panel} id="global-filters" role="dialog" aria-label="Filters and settings" tabIndex={-1}
        className="fixed inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-line bg-panel shadow-xl outline-none lg:absolute lg:inset-x-auto lg:bottom-auto lg:right-[max(1rem,calc((100vw-1400px)/2+1rem))] lg:top-2 lg:max-h-[calc(100vh-90px)] lg:w-[min(960px,calc(100vw-2rem))] lg:rounded-xl lg:border">

      <div className="min-h-0 space-y-4 overflow-y-auto px-4 pb-4 pt-4">
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
          <ModelFilter families={families} selected={s.familySet ?? new Set()} setSelected={(set) => s.setFamilies([...set])} />
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
          <ProviderFilter providers={providers} excluded={s.excludedSet ?? new Set()} setExcluded={(set) => s.setProvidersExcluded([...set])} />
        </Section>

        <Section title="Regional settings" hint="where the model is served from, and by whom">
          <Toggle label="Exclude Chinese providers" on={s.excludeChinese} set={s.setExcludeChinese} />
          <Toggle label="EU-hosted only" on={s.euHostedOnly} set={s.setEuHostedOnly} />
          <Toggle label="Non-US provider only" on={s.nonUsOnly} set={s.setNonUsOnly} />
        </Section>

        <Section title="Data confidentiality" hint="what the provider may do with your prompts">
          <span className="inline-flex items-center">
            <Toggle label="Strong confidential guarantees" on={s.teeOnly} set={s.setTeeOnly} />
            <InfoTip title="Strong confidential guarantees" label="the confidential guarantees filter">
              Keeps only routes that run inside a Trusted Execution Environment, where the operator
              cannot read your prompts even in principle.
            </InfoTip>
          </span>
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

        <details className="rounded-lg border border-line/70 bg-ink/40 px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-gray-500">More settings</summary>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Toggle label="One variant for Reasoning models" on={s.collapse} set={s.setCollapse} />
            <Toggle label="Hide deprecated" on={s.hideDeprecated} set={s.setHideDeprecated} />
            <Toggle label="Open-weights only" on={s.openOnly} set={s.setOpenOnly} />
          </div>
          <p className="mt-2 text-[11px] text-gray-600">Evidence requirements (benchmark evidence, priced provider, measured task tokens) sit above the table they apply to.</p>
        </details>

        <p className="text-[11px] text-gray-600">Applies to price views &amp; model offers; benchmark evidence stays unfiltered.</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-line bg-panel px-4 py-3">
        <button type="button" onClick={closeFilters} className="inline-flex min-h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-ink">
          {s.resultCount != null ? `Show ${s.resultCount} models` : "Show results"}
        </button>
        {active && <button type="button" onClick={reset} className="inline-flex min-h-10 items-center rounded-md border border-line px-3 text-sm text-gray-400 hover:text-gray-200">Reset</button>}
      </div>
      </div>
    </div>
  );
}
