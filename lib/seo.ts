import type { Metadata } from "next";

// CR-62.2 (Florian 2026-09-16): complete link-preview tags. Next replaces a parent's `openGraph` and
// `twitter` objects instead of merging them, so every page that sets its own preview goes through here.
export const SITE_URL = "https://benchmarkheaven.com";
export const BRAND_CLAIM = "The most detailed cost–capability analysis in AI.";
export const BRAND_LINE = "Every model. Every Benchmark. Actual Costs.";
export const SHARE_IMAGE = { url: "/brand/og-image.png?v=2", width: 1200, height: 630, alt: `Benchmark Heaven — ${BRAND_CLAIM} ${BRAND_LINE}` };
export const X_HANDLE = "@benchmarkheaven";

export function previewMetadata({ path, title, description, documentTitle }: { path: string; title: string; description: string; documentTitle?: string }): Metadata {
  return {
    ...(documentTitle ? { title: documentTitle } : {}),
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "Benchmark Heaven", locale: "en_US", url: path, title, description, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", site: X_HANDLE, creator: X_HANDLE, title, description, images: [SHARE_IMAGE.url] },
  };
}
