"use client";
import { usePathname } from "next/navigation";
import type { ProviderInfo } from "../lib/client-model";
import { useSettings } from "./SettingsContext";
import { ScoreSelect, Toggle, ProviderFilter, ModelFilter, NumFilter, type FamilyOption } from "./ui";
import { defaultMinFor, FIXED_BLENDS } from "../lib/cost";

/** Top-level filter bar; settings apply to interactive comparisons and model offers. */
export function GlobalFilters({ providers, families }: { providers: ProviderInfo[]; families: FamilyOption[] }) {
  const s = useSettings();
  const path = usePathname();
  if (path === "/benchmarks" || path === "/radar") return null;
  const adjusted = s.priceMode === "adjusted";
  const active = s.providersExcluded.length || s.families.length || !s.featured || !s.collapse || !s.hideDeprecated || !s.excludeChinese || s.euHostedOnly || s.nonUsOnly || s.openOnly || s.teeOnly || s.minScore !== defaultMinFor(s.score) || s.priceMode !== "adjusted";
  return (
    <details className="border-b border-line bg-panel">
      <summary className="mx-auto max-w-[1400px] cursor-pointer px-4 py-3 text-sm">Price &amp; provider filters · {adjusted ? "adjusted costs" : "raw list prices"}</summary>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Global</span>
        <ScoreSelect value={s.score} onChange={s.setScore} />
        <NumFilter label="Min score" value={String(s.minScore)} onChange={(v) => s.setMinScore(v === "" ? 0 : (parseFloat(v) || 0))} placeholder={String(defaultMinFor(s.score))} />
        <Toggle
          label={adjusted ? "Adjusted costs" : "Raw list prices"}
          on={adjusted}
          set={(on) => s.setPriceMode(on ? "adjusted" : "raw")}
        />
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
        <Toggle label="One variant for Reasoning models" on={s.collapse} set={s.setCollapse} />
        <Toggle label="Featured" on={s.featured} set={s.setFeatured} />
        <Toggle label="Hide deprecated" on={s.hideDeprecated} set={s.setHideDeprecated} />
        <Toggle label="Exclude Chinese providers" on={s.excludeChinese} set={s.setExcludeChinese} />
        <Toggle label="EU-hosted / approved equivalent only" on={s.euHostedOnly} set={s.setEuHostedOnly} />
        <Toggle label="Non-US provider only" on={s.nonUsOnly} set={s.setNonUsOnly} />
        <Toggle label="Open-weights only" on={s.openOnly} set={s.setOpenOnly} />
        <Toggle label="TEE / confidential only" on={s.teeOnly} set={s.setTeeOnly} />
        <ProviderFilter providers={providers} excluded={s.excludedSet ?? new Set()} setExcluded={(set) => s.setProvidersExcluded([...set])} />
        <ModelFilter families={families} selected={s.familySet ?? new Set()} setSelected={(set) => s.setFamilies([...set])} />
        {active && (
          <button onClick={() => { s.setProvidersExcluded([]); s.setFamilies([]); s.setFeatured(true); s.setCollapse(true); s.setHideDeprecated(true); s.setExcludeChinese(true); s.setEuHostedOnly(false); s.setNonUsOnly(false); s.setOpenOnly(false); s.setTeeOnly(false); s.setMinScore(defaultMinFor(s.score)); s.setPriceMode("adjusted"); }}
            className="rounded-md border border-line px-2 py-1 text-xs text-gray-400 hover:text-gray-200">Reset</button>
        )}
        <span className="ml-auto text-[11px] text-gray-600">Applies to price views &amp; model offers; benchmark evidence stays unfiltered</span>
      </div>
    </details>
  );
}
