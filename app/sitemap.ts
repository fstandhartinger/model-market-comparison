import type { MetadataRoute } from "next";
import { getDataset } from "../lib/data";
import { SITE_URL } from "../lib/seo";
import { readJevbenchV12, jevbenchV12View } from "../lib/jevbench-v12.mjs";

const PAGES = ["/", "/benchmarks", "/compare", "/benchmaxxing", "/charts", "/scatter", "/eu", "/jev-models", "/jev-models/v1", "/providers", "/provider-explorer", "/gateways", "/about", "/privacy", "/terms", "/impressum"];

// CR-62.2: the public pages plus one page per model family (the family URL resolves to its model page).
// CR-129 (2026-09-23): one entry per JevBench system, the same way. The multimodal preview track is not
// one of the artifact's systems, so it stays excluded, same as before (it is separately noindex'd).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ds = await getDataset();
  const lastModified = ds.generated_at ? new Date(ds.generated_at) : new Date();
  const families = [...new Set(ds.models.map((m) => m.family_key))].sort();
  const jevView = jevbenchV12View(await readJevbenchV12());
  const jevSystems = [...jevView.ranked, ...jevView.honorable, ...jevView.partial];
  const jevLastModified = new Date(jevView.generated);
  return [
    ...PAGES.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}`, lastModified })),
    ...families.map((key) => ({ url: `${SITE_URL}/models/${encodeURIComponent(key)}`, lastModified })),
    ...jevSystems.map((r) => ({ url: `${SITE_URL}/jev-models/${r.key}`, lastModified: jevLastModified })),
  ];
}
