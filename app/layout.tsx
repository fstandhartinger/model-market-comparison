import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "../components/Nav";
import { SettingsProvider } from "../components/SettingsContext";
import { GlobalFilters } from "../components/GlobalFilters";
import { getDataset } from "../lib/data";
import type { ProviderInfo, FamilyOption } from "../lib/client-model";

export const metadata: Metadata = {
  metadataBase: new URL("https://benchmarkheaven.com"),
  applicationName: "Benchmark Heaven",
  title: { default: "Benchmark Heaven — Model benchmarks & costs", template: "%s | Benchmark Heaven" },
  description: "Explore model benchmarks, compare provider prices, and see the assumptions behind adjusted task costs. Versioned results with sources and dates.",
  openGraph: {
    type: "website", siteName: "Benchmark Heaven",
    title: "Benchmark Heaven", description: "Benchmarks in perspective. Costs in context.",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "Benchmark Heaven — Benchmarks in perspective. Costs in context." }],
  },
  twitter: { card: "summary_large_image", title: "Benchmark Heaven", description: "Benchmarks in perspective. Costs in context.", images: ["/brand/og-image.png"] },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
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
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('bh-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}})()` }} /></head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <SettingsProvider>
          <Nav />
          <GlobalFilters providers={providers} families={families} />
          <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
          <footer className="bh-footer mx-auto max-w-[1400px] px-4 py-10 text-xs text-gray-500">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <span className="bh-wordmark text-lg">Benchmark Heaven</span>
              <div className="flex flex-wrap gap-5"><a href="/about">Sources &amp; methodology</a><a href="https://github.com/fstandhartinger/model-market-comparison/blob/main/API.md">Public API</a><a href="https://github.com/fstandhartinger/model-market-comparison">GitHub</a></div>
            </div>
            <p>Benchmarks in perspective. Costs in context. Every result has a source; every estimate has assumptions.</p>
            <p className="mt-2">Data from OpenRouter, Artificial Analysis, Intelligence.ai / DesignArena, benchmark maintainers and provider catalogs.
              Raw token prices are USD per 1M tokens; adjusted task costs are estimates with visible inputs.
              Source dates vary. Check the linked source before choosing a provider.</p>
            <p className="mt-2">Independent project. Not affiliated with model or inference providers.</p>
          </footer>
        </SettingsProvider>
      </body>
    </html>
  );
}
