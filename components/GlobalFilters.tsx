"use client";
import type { ProviderInfo } from "../lib/client-model";
import { useSettings } from "./SettingsContext";
import { ScoreSelect, Toggle, ProviderFilter, ModelFilter, NumFilter, type FamilyOption } from "./ui";
import { defaultMinFor } from "../lib/cost";

/** Top-level filter bar shown on every page; settings apply across all tabs. */
export function GlobalFilters({ providers, families }: { providers: ProviderInfo[]; families: FamilyOption[] }) {
  const s = useSettings();
  const active = s.providers.length || s.families.length || !s.featured || !s.collapse || !s.excludeChinese || s.euHostedOnly || s.nonUsOnly || s.hideGptOpus || !s.hideFable || s.minScore !== defaultMinFor(s.score);
  return (
    <div className="border-b border-line bg-[#10141a]">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Global</span>
        <ScoreSelect value={s.score} onChange={s.setScore} />
        <NumFilter label="Min score" value={String(s.minScore)} onChange={(v) => s.setMinScore(v === "" ? 0 : (parseFloat(v) || 0))} placeholder={String(defaultMinFor(s.score))} />
        <Toggle label="One variant for Reasoning models" on={s.collapse} set={s.setCollapse} />
        <Toggle label="Featured" on={s.featured} set={s.setFeatured} />
        <Toggle label="Exclude Chinese providers" on={s.excludeChinese} set={s.setExcludeChinese} />
        <Toggle label="EU-hosted only" on={s.euHostedOnly} set={s.setEuHostedOnly} />
        <Toggle label="Non-US provider only" on={s.nonUsOnly} set={s.setNonUsOnly} />
        <Toggle label="Hide GPT-5.5 / Opus 4.8" on={s.hideGptOpus} set={s.setHideGptOpus} />
        <Toggle label="Hide Fable" on={s.hideFable} set={s.setHideFable} />
        <ProviderFilter providers={providers} selected={s.providerSet ?? new Set()} setSelected={(set) => s.setProviders([...set])} />
        <ModelFilter families={families} selected={s.familySet ?? new Set()} setSelected={(set) => s.setFamilies([...set])} />
        {active && (
          <button onClick={() => { s.setProviders([]); s.setFamilies([]); s.setFeatured(true); s.setCollapse(true); s.setExcludeChinese(true); s.setEuHostedOnly(false); s.setNonUsOnly(false); s.setHideGptOpus(false); s.setHideFable(true); s.setMinScore(defaultMinFor(s.score)); }}
            className="rounded-md border border-line px-2 py-1 text-xs text-gray-400 hover:text-gray-200">Reset</button>
        )}
        <span className="ml-auto text-[11px] text-gray-600">Filters apply to every tab</span>
      </div>
    </div>
  );
}
