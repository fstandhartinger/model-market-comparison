Return JSON object {files:[{path,content}]} with exactly 4 production files: components/Nav.tsx, components/ThemeToggle.tsx, app/globals.css, tailwind.config.ts. Revamp existing research UI shell: compact primary nav Overview / Benchmarks / Compare / Radar and native details More menu all other existing links. Preserve current brand Model Market Comparison (phase7 does branding). Light/dark toggle with saved localStorage key bh-theme, root data-theme; assume owner adds prepaint inline script (default system theme); avoid hydration mismatch using mounted state or stable text Toggle color theme. Nav aria-current, labelled primary nav, responsive wraps no desktop header horizontal overflow. Color CSS variables --ink --panel --line --accent --accent2 --warn as RGB space triplets for Tailwind opacity modifiers and full colors --radar-1 through --radar-4 / --radar-grid (good contrast in both themes). Full-color --surface for SVG dot fills. Native controls focus outlines, 44px interactive targets, reduced motion, light theme existing dark utility overrides including text-gray-100..600 bg-[#12161c]/[#10141a]/bg-ink/bg-panel etc. Default dark if script absent. Add reusable bh-panel bh-muted bh-eyebrow bh-button bh-input bh-badge bh-table-wrap bh-table bh-empty bh-page-head bh-grid bh-stat bh-alert bh-positive bh-negative classes. Tables padded, headings hierarchy, adequate text contrast. bh-page-head margin-bottom. Native details > summary accessible clear pointer and focus. Skip-link CSS for owner to add markup. Keep compact outputs under 250 total lines. No new fonts dependencies assets or changes to other files. Current source files below.


FILE components/Nav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Overview"],
  ["/compare", "Compare"],
  ["/scatter", "Cost vs Capability"],
  ["/charts", "Charts"],
  ["/providers", "Providers per Model"],
  ["/provider-explorer", "Provider explorer"],
  ["/gateways", "Gateways"],
  ["/eu", "EU & Sovereign"],
  ["/about", "About"],
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-[#12161c]">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-accent">◆</span> Model Market Comparison
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {LINKS.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 ${active ? "bg-accent/15 text-accent" : "text-gray-300 hover:bg-white/5"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

FILE components/GlobalFilters.tsx
"use client";
import type { ProviderInfo } from "../lib/client-model";
import { useSettings } from "./SettingsContext";
import { ScoreSelect, Toggle, ProviderFilter, ModelFilter, NumFilter, type FamilyOption } from "./ui";
import { defaultMinFor, FIXED_BLENDS } from "../lib/cost";

/** Top-level filter bar; settings apply to interactive comparisons and model offers. */
export function GlobalFilters({ providers, families }: { providers: ProviderInfo[]; families: FamilyOption[] }) {
  const s = useSettings();
  const adjusted = s.priceMode === "adjusted";
  const active = s.providersExcluded.length || s.families.length || !s.featured || !s.collapse || !s.hideDeprecated || !s.excludeChinese || s.euHostedOnly || s.nonUsOnly || s.openOnly || s.teeOnly || s.minScore !== defaultMinFor(s.score) || s.priceMode !== "adjusted";
  return (
    <div className="border-b border-line bg-[#10141a]">
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
        <span className="ml-auto text-[11px] text-gray-600">Applies to comparisons &amp; model offers</span>
      </div>
    </div>
  );
}

FILE app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: dark; }

html, body {
  background: #0e1116;
  color: #e6edf3;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

a { color: inherit; }

::-webkit-scrollbar { height: 10px; width: 10px; }
::-webkit-scrollbar-thumb { background: #2b323d; border-radius: 6px; }
::-webkit-scrollbar-track { background: transparent; }

.card { background: #161b22; border: 1px solid #272e3a; border-radius: 12px; }
.tabular { font-variant-numeric: tabular-nums; }

table.dtable th, table.dtable td { border-bottom: 1px solid #21272f; }
table.dtable thead th {
  position: sticky; top: 0; background: #12161c; z-index: 1;
  cursor: pointer; user-select: none;
}
table.dtable tbody tr:hover { background: #171d25; }

FILE tailwind.config.ts
import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0e1116", panel: "#161b22", line: "#272e3a",
        accent: "#5b9dff", accent2: "#7ee0c0", warn: "#ffb454",
      },
      fontFamily: { mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"] },
    },
  },
  plugins: [],
} satisfies Config;

FILE app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "../components/Nav";
import { SettingsProvider } from "../components/SettingsContext";
import { GlobalFilters } from "../components/GlobalFilters";
import { getDataset } from "../lib/data";
import type { ProviderInfo, FamilyOption } from "../lib/client-model";

export const metadata: Metadata = {
  title: "Model Market Comparison",
  description:
    "Compare open-source & frontier LLM prices across OpenRouter, hyperscalers, EU-native providers, Chutes, GitHub Copilot and Claude Code — with ArtificialAnalysis and Intelligence.ai / DesignArena benchmarks.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ds = await getDataset();
  const providers: ProviderInfo[] = ds.providers.map((p) => ({
    key: `${p.platform}::${p.provider}`, platform: p.platform, provider: p.provider, model_count: p.model_count,
    eu_hosted: p.eu_hosted, eu_dedicated: p.eu_dedicated, non_us: p.non_us,
    hyperscaler: p.hyperscaler, country: p.country, note: p.note, coming_soon: p.coming_soon,
  }));
  const famMap = new Map<string, FamilyOption>();
  for (const m of ds.models) if (!famMap.has(m.family_key)) famMap.set(m.family_key, { key: m.family_key, name: m.family_name, org: m.org });
  const families = [...famMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          <Nav />
          <GlobalFilters providers={providers} families={families} />
          <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-[1400px] px-4 py-10 text-xs text-gray-500">
            Data: OpenRouter · ArtificialAnalysis · Intelligence.ai / DesignArena · AWS Bedrock · Azure AI Foundry ·
            Google Vertex AI · EU-native APIs · Chutes · GitHub Copilot · Anthropic. Prices are list/on-demand USD per 1M tokens unless noted.
            Not affiliated with any provider — figures may be stale; verify before relying on them.
          </footer>
        </SettingsProvider>
      </body>
    </html>
  );
}
