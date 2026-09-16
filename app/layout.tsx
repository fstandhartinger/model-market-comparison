import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "../components/Nav";
import { SettingsProvider } from "../components/SettingsContext";
import { AccountProvider } from "../components/AccountContext";
import { GlobalFilters } from "../components/GlobalFilters";
import { getDataset } from "../lib/data";
import type { ProviderInfo, FamilyOption } from "../lib/client-model";
import { AaCredit } from "../components/AaCredit";
import { EpochCredit } from "../components/EpochCredit";

const BRAND_CLAIM = "The most detailed cost–capability analysis in AI.";
const BRAND_LINE = "Every model. Every Benchmark. Actual Costs.";
// CR-62.2: pages without their own preview inherit these; og:url and the canonical are set per page (lib/seo.ts).
const X_HANDLE = "@benchmarkheaven";

export const metadata: Metadata = {
  metadataBase: new URL("https://benchmarkheaven.com"),
  applicationName: "Benchmark Heaven",
  title: { default: "Benchmark Heaven — Model benchmarks & costs", template: "%s | Benchmark Heaven" },
  // CR-45.1 (Florian 2026-09-16): link previews carry the accepted brand copy of the hero (CR-10.1);
  // the retired pre-CR-10.1 slogan must not reappear in any preview field or the share image.
  description: `${BRAND_CLAIM} ${BRAND_LINE} Each benchmark result with its source and date, and the adjusted cost per task given the provider, its caching and the model's own token appetite.`,
  openGraph: {
    type: "website", siteName: "Benchmark Heaven", locale: "en_US",
    title: "Benchmark Heaven", description: `${BRAND_CLAIM} ${BRAND_LINE}`,
    images: [{ url: "/brand/og-image.png?v=2", width: 1200, height: 630, alt: `Benchmark Heaven — ${BRAND_CLAIM} ${BRAND_LINE}` }],
  },
  twitter: { card: "summary_large_image", site: X_HANDLE, creator: X_HANDLE, title: "Benchmark Heaven", description: `${BRAND_CLAIM} ${BRAND_LINE}`, images: ["/brand/og-image.png?v=2"] },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ds = await getDataset();
  const providers: ProviderInfo[] = ds.providers.map((p) => ({
    key: `${p.platform}::${p.provider}`, platform: p.platform, provider: p.provider, model_count: p.model_count,
    eu_hosted: p.eu_hosted, eu_dedicated: p.eu_dedicated, non_us: p.non_us,
    hyperscaler: p.hyperscaler, country: p.country, note: p.note, coming_soon: p.coming_soon, website: p.website ?? null,
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
          <AccountProvider>
          <Nav />
          <GlobalFilters providers={providers} families={families} />
          <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
          {/* F-12: wordmark, the R3.1 line, one data-sources sentence, three links. */}
          <footer className="bh-footer mx-auto max-w-[1400px] px-4 py-5 text-xs text-gray-500">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className="bh-wordmark text-base">Benchmark Heaven</span>
              <div className="flex flex-wrap gap-4"><a href="/about">Sources &amp; methodology</a><a href="https://github.com/fstandhartinger/model-market-comparison/blob/main/API.md">Public API</a><a href="https://github.com/fstandhartinger/model-market-comparison">GitHub</a><a href="https://github.com/fstandhartinger/model-market-comparison/blob/main/LICENSE">MIT licence</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/impressum">Impressum</a></div>
            </div>
            <p>Benchmark results with their source and date, and a modeled cost per task that accounts for provider prices, caching and token efficiency.
              Data from OpenRouter, Artificial Analysis, Epoch AI, DesignArena, benchmark maintainers and provider catalogs. <AaCredit /> · <EpochCredit /></p>
            <p className="mt-1">
              Open source (MIT) and a hobby project — <a href="https://github.com/fstandhartinger/model-market-comparison" className="underline decoration-dotted underline-offset-2 hover:text-accent">the code is on GitHub</a>,
              built to give the world better tools to decide which LLM to choose for the job. The licence covers the code, not the third-party data (its own terms apply).
            </p>
            <p className="mt-1">
              Benchmark publishers can ask for their numbers to be removed or shown differently — <a href="/about#removal" className="underline decoration-dotted underline-offset-2 hover:text-accent">data sources &amp; removal on request</a>.
            </p>
          </footer>
          </AccountProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
