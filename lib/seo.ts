import type { Metadata } from "next";

// CR-62.2 (Florian 2026-09-16): complete link-preview tags. Next replaces a parent's `openGraph` and
// `twitter` objects instead of merging them, so every page that sets its own preview goes through here.
export const SITE_URL = "https://benchmarkheaven.com";
export const BRAND_CLAIM = "The most detailed cost–capability analysis in AI.";
export const BRAND_LINE = "Every model. Every Benchmark. Actual Costs.";
export const SHARE_IMAGE = { url: "/brand/og-launch.png?v=1", width: 1200, height: 630, alt: `Benchmark Heaven — ${BRAND_CLAIM} ${BRAND_LINE}` };
export const X_HANDLE = "@benchmarkheaven";
// The layout description (app/layout.tsx, same copy) that every page without its own inherits; WebPage JSON-LD repeats it.
export const DEFAULT_DESCRIPTION = `${BRAND_CLAIM} ${BRAND_LINE} Each benchmark result with its source and date, and the adjusted cost per task given the provider, its caching and the model's own token appetite.`;

// bh-onpage (22 Oct 2026): document titles stay within 60 characters, keyword first. The layout's
// " | Benchmark Heaven" suffix is kept while it fits, dropped when it does not, and a title still too
// long is cut at a word boundary. Link-preview (og/twitter) titles are not touched.
export const TITLE_MAX = 60;
const TITLE_SUFFIX = " | Benchmark Heaven";
export function seoTitle(core: string): string | { absolute: string } {
  if (core.length + TITLE_SUFFIX.length <= TITLE_MAX) return core;
  if (core.length <= TITLE_MAX) return { absolute: core };
  const cut = core.slice(0, TITLE_MAX).replace(/\s+\S*$/, "").replace(/(?:[\s,;:·—–-]+|\s+(?:and|or|of|on|the|to|with))+$/, "");
  return { absolute: `${cut}…` };
}

export function previewMetadata({ path, title, description, documentTitle, absoluteTitle }: { path: string; title: string; description: string; documentTitle?: string; absoluteTitle?: string }): Metadata {
  return {
    ...(absoluteTitle ? { title: { absolute: absoluteTitle } } : {}),
    ...(documentTitle ? { title: seoTitle(documentTitle) } : {}),
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "Benchmark Heaven", locale: "en_US", url: path, title, description, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", site: X_HANDLE, creator: X_HANDLE, title, description, images: [SHARE_IMAGE.url] },
  };
}
