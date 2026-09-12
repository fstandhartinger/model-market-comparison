"use client";
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
  if (path === "/benchmarks" || path === "/radar") return null;
  const adjusted = s.priceMode === "adjusted";
  const active = s.providersExcluded.length || s.families.length || !s.featured || !s.collapse || !s.hideDeprecated
    || s.excludeChinese || s.euHostedOnly || s.nonUsOnly || s.openOnly || s.teeOnly || s.allowDataTraining || s.isCompany
    || s.maxCost != null || s.minIntelligence != null || s.minCoding != null
    || s.minScore !== defaultMinFor(s.score) || s.priceMode !== "adjusted" || s.inputWeight !== DEFAULT_BLEND;
  const reset = () => {
    s.setProvidersExcluded([]); s.setFamilies([]); s.setFeatured(true); s.setCollapse(true);
    s.setHideDeprecated(true); s.setExcludeChinese(false); s.setEuHostedOnly(false); s.setNonUsOnly(false);
    s.setOpenOnly(false); s.setTeeOnly(false); s.setAllowDataTraining(false); s.setIsCompany(false);
    s.setMaxCost(null); s.setMinIntelligence(null); s.setMinCoding(null);
    s.setMinScore(defaultMinFor(s.score)); s.setPriceMode("adjusted"); s.setInputWeight(DEFAULT_BLEND);
  };

  return (
    <details className="border-b border-line bg-panel">
      <summary className="mx-auto max-w-[1400px] cursor-pointer px-4 py-3 text-sm">
        Filters &amp; settings · <span className="text-gray-400">{adjusted ? "adjusted costs" : "raw list prices"}</span>
        {active && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">modified</span>}
      </summary>

      <div className="mx-auto max-w-[1400px] space-y-4 px-4 pb-4 pt-1">
        <Section title="Ranking">
          <ScoreSelect value={s.score} onChange={s.setScore} />
          <NumFilter label="Min score" value={String(s.minScore)} onChange={(v) => s.setMinScore(v === "" ? 0 : (parseFloat(v) || 0))} placeholder={String(defaultMinFor(s.score))} />
          <span className="inline-flex items-center">
            <Toggle label="Featured" on={s.featured} set={s.setFeatured} />
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
              Consumer subscriptions such as ChatGPT Plus/Pro or Claude Pro/Max are sold to
              individuals, and a company usually needs a business plan or API access instead.
              Today this site prices API and platform routes only, so the setting records your
              answer and the guided questionnaire uses it; it will exclude consumer plans as soon
              as subscription pricing is part of the cost view. We would rather say that than
              imply a filter that is not doing anything yet.
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

        <div className="flex flex-wrap items-center gap-3">
          {active && <button onClick={reset} className="rounded-md border border-line px-2 py-1 text-xs text-gray-400 hover:text-gray-200">Reset to defaults</button>}
          <span className="text-[11px] text-gray-600">Applies to price views &amp; model offers; benchmark evidence stays unfiltered</span>
        </div>
      </div>
    </details>
  );
}
