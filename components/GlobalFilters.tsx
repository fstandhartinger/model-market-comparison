"use client";
import type { ProviderInfo } from "../lib/client-model";
import { useSettings } from "./SettingsContext";
import { ScoreSelect, Toggle, ProviderFilter, ModelFilter, type FamilyOption } from "./ui";

/** Top-level filter bar shown on every page; settings apply across all tabs. */
export function GlobalFilters({ providers, families }: { providers: ProviderInfo[]; families: FamilyOption[] }) {
  const s = useSettings();
  const active = s.providers.length || s.families.length || !s.featured || !s.collapse;
  return (
    <div className="border-b border-line bg-[#10141a]">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Global</span>
        <ScoreSelect value={s.score} onChange={s.setScore} />
        <Toggle label="One variant / GPT·Claude" on={s.collapse} set={s.setCollapse} />
        <Toggle label="Featured" on={s.featured} set={s.setFeatured} />
        <ProviderFilter providers={providers} selected={s.providerSet ?? new Set()} setSelected={(set) => s.setProviders([...set])} />
        <ModelFilter families={families} selected={s.familySet ?? new Set()} setSelected={(set) => s.setFamilies([...set])} />
        {active && (
          <button onClick={() => { s.setProviders([]); s.setFamilies([]); s.setFeatured(true); s.setCollapse(true); }}
            className="rounded-md border border-line px-2 py-1 text-xs text-gray-400 hover:text-gray-200">Reset</button>
        )}
        <span className="ml-auto text-[11px] text-gray-600">Filters apply to every tab</span>
      </div>
    </div>
  );
}
