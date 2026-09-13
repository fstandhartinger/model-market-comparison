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
  // R3.1 (Fable 5.1, 2026-09-13): the two-part claim Florian asked for; the page proves it with
  // generated counts. P4: never "every benchmark result".
  description: "Published benchmark results for hundreds of models, gathered in one place with their sources and dates — and a cost per task that accounts for the provider, its caching and the model's own token appetite.",
  openGraph: {
    type: "website", siteName: "Benchmark Heaven",
    title: "Benchmark Heaven", description: "A complete, source-linked collection of tracked AI model benchmarks, with realistic modeled cost per task grounded in provider prices, caching, and token efficiency.",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "Benchmark Heaven — complete, source-linked model benchmarks and realistic modeled cost per task." }],
  },
  twitter: { card: "summary_large_image", title: "Benchmark Heaven", description: "Complete, source-linked model benchmarks with realistic modeled cost per task.", images: ["/brand/og-image.png"] },
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
          {/* F-12: wordmark, the R3.1 line, one data-sources sentence, three links. */}
          <footer className="bh-footer mx-auto max-w-[1400px] px-4 py-5 text-xs text-gray-500">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className="bh-wordmark text-base">Benchmark Heaven</span>
              <div className="flex flex-wrap gap-4"><a href="/about">Sources &amp; methodology</a><a href="https://github.com/fstandhartinger/model-market-comparison/blob/main/API.md">Public API</a><a href="https://github.com/fstandhartinger/model-market-comparison">GitHub</a></div>
            </div>
            <p>A complete, source-linked collection of tracked AI model benchmarks, with realistic modeled cost per task grounded in provider prices, caching, and token efficiency.
              Data from OpenRouter, Artificial Analysis, Epoch AI, DesignArena, benchmark maintainers and provider catalogs, each with its source date.</p>
          </footer>
        </SettingsProvider>
      </body>
    </html>
  );
}
