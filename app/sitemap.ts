import type { MetadataRoute } from "next";
import { getDataset } from "../lib/data";
import { SITE_URL } from "../lib/seo";
import { readJevbenchV12, jevbenchV12View } from "../lib/jevbench-v12.mjs";
import { readJevbenchV141, jevbenchV141View } from "../lib/jevbench-v141.mjs";

const PAGES = ["/", "/benchmarks", "/compare", "/benchmaxxing", "/charts", "/scatter", "/eu", "/jev-models", "/jev-models/alternatives", "/jev-models/how-to-choose", "/jev-models/jev-vs-laya", "/jev-models/jev-vs-jevk5", "/jev-models/jev-vs-hopper", "/jev-models/jev-vs-winnow-12b-q8", "/jev-models/jev-vs-reflex-4b", "/jev-models/v1", "/jev-models/v1.4", "/jev-models/v1.4.1", "/providers", "/provider-explorer", "/gateways", "/about", "/privacy", "/terms", "/impressum"];

// CR-62.2: the public pages plus one page per model family (the family URL resolves to its model page).
// CR-129 (2026-09-23): one entry per JevBench system, the same way. The multimodal preview track is not
// one of the artifact's systems, so it stays excluded, same as before (it is separately noindex'd).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ds = await getDataset();
  const lastModified = ds.generated_at ? new Date(ds.generated_at) : new Date();
  const families = [...new Set(ds.models.map((m) => m.family_key))].sort();
  const jevView = jevbenchV12View(await readJevbenchV12());
  const jevSystems = [...jevView.ranked, ...jevView.honorable, ...jevView.partial];
  const jevV141 = jevbenchV141View(await readJevbenchV141());
  const v12Keys = new Set(jevSystems.map((row) => row.key));
  const v141TopFiveNotYetListed = jevV141.ranked.slice(0, 5).filter((row) => !v12Keys.has(row.key));
  return [
    ...PAGES.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}`, lastModified })),
    ...families.map((key) => ({ url: `${SITE_URL}/models/${encodeURIComponent(key)}`, lastModified })),
    ...jevSystems.map((r) => ({ url: `${SITE_URL}/jev-models/${r.key}`, lastModified: new Date(jevView.generated) })),
    ...v141TopFiveNotYetListed.map((r) => ({ url: `${SITE_URL}/jev-models/${r.key}`, lastModified: new Date(jevV141.generated) })),
  ];
}
