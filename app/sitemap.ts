import type { MetadataRoute } from "next";
import { getDataset } from "../lib/data";
import { SITE_URL } from "../lib/seo";
import { readJevbenchSeoData, readJevbenchSeoUrls } from '../lib/jevbench-seo.mjs';

const PAGES = ["/", "/benchmarks", "/compare", "/benchmaxxing", "/charts", "/scatter", "/eu", "/jev-models", "/jev-models/api", "/image-jev-bench", "/audio-jev-bench", "/submit", "/jev-models/alternatives", "/jev-models/how-to-choose", "/jev-models/open-source-jev", "/jev-models/jev-vs-imajev", "/jev-models/jev-vs-plumb", "/jev-models/jev-vs-decider-4b-v2", "/jev-models/jev-vs-jevk5", "/jev-models/jev-vs-cygnet", "/jev-models/jev-vs-hopper", "/jev-models/jev-vs-winnow-12b-q8", "/jev-models/jev-vs-reflex-4b", "/jev-models/jev-vs-laya", "/jev-models/v1", "/jev-models/v1.4", "/jev-models/v1.4.1", "/jev-models/v1.4.2", "/jev-models/v1.4.2.1", "/jev-models/v1.4.2.2", "/jev-models/v1.5.0", "/jev-models/v1.5.1", "/jev-models/v1.5.2", "/jev-models/v1.5.3", "/jev-models/v1.5.4", "/jev-models/v1.5.5", "/jev-models/v1.5.6", "/jev-models/v1.5.7", "/jev-models/v1.6.0", "/jev-models/v1.6.1", "/providers", "/provider-explorer", "/gateways", "/about", "/privacy", "/terms", "/impressum"];

// CR-62.2: the public pages plus one page per model family (the family URL resolves to its model page).
// CR-129 (2026-09-23): one entry per JevBench system, the same way. The multimodal preview track is not
// one of the artifact's systems, so it stays excluded, same as before (it is separately noindex'd).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ds = await getDataset();
  const lastModified = ds.generated_at ? new Date(ds.generated_at) : new Date();
  const families = [...new Set(ds.models.map((m) => m.family_key))].sort();
  const data = await readJevbenchSeoData();
  const current = await readJevbenchSeoUrls();
  const urls = [...new Set([...PAGES, ...current.urls])];
  return [
    ...urls.map((path) => {
      const historic = data.historical.find((r) => `/jev-models/${r.measurement_revision}` === path);
      const jevDate = typeof historic?.last_measured_on === 'string' ? historic.last_measured_on : data.date;
      return { url: `${SITE_URL}${path === '/' ? '' : path}`, lastModified: path.startsWith('/jev-models') ? new Date(jevDate) : lastModified };
    }),
    ...families.map((key) => ({ url: `${SITE_URL}/models/${encodeURIComponent(key)}`, lastModified })),
  ];
}
