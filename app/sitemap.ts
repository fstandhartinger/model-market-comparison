import type { MetadataRoute } from "next";
import { getDataset } from "../lib/data";
import { SITE_URL } from "../lib/seo";

const PAGES = ["/", "/benchmarks", "/compare", "/benchmaxxing", "/charts", "/scatter", "/eu", "/jev-models", "/providers", "/provider-explorer", "/gateways", "/about", "/privacy", "/terms", "/impressum"];

// CR-62.2: the public pages plus one page per model family (the family URL resolves to its model page).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ds = await getDataset();
  const lastModified = ds.generated_at ? new Date(ds.generated_at) : new Date();
  const families = [...new Set(ds.models.map((m) => m.family_key))].sort();
  return [
    ...PAGES.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}`, lastModified })),
    ...families.map((key) => ({ url: `${SITE_URL}/models/${encodeURIComponent(key)}`, lastModified })),
  ];
}
