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
    "Compare open-source & frontier LLM prices across OpenRouter providers, AWS Bedrock, Azure AI Foundry, GitHub Copilot and Claude Code — with ArtificialAnalysis and DesignArena benchmarks.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ds = await getDataset();
  const providers: ProviderInfo[] = ds.providers.map((p) => ({
    key: `${p.platform}::${p.provider}`, platform: p.platform, provider: p.provider, model_count: p.model_count,
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
            Data: OpenRouter · ArtificialAnalysis · DesignArena · AWS Bedrock · Azure AI Foundry ·
            GitHub Copilot · Anthropic. Prices are list/on-demand USD per 1M tokens unless noted.
            Not affiliated with any provider — figures may be stale; verify before relying on them.
          </footer>
        </SettingsProvider>
      </body>
    </html>
  );
}
