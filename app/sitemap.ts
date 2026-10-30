import type { MetadataRoute } from "next";
import { getDataset } from "../lib/data";
import { SITE_URL } from "../lib/seo";
import { readJevbenchSeoData, readJevbenchSeoUrls } from '../lib/jevbench-seo.mjs';
import { JEVBENCH_RELEASES } from '../lib/jevbench-releases.mjs';
import { hasPublishedJevbenchV1712Release } from '../lib/jevbench-v1712-release.mjs';
import { hasPublishedJevbenchV1713Release } from '../lib/jevbench-v1713-release.mjs';
import { hasPublishedJevbenchV1714Release } from '../lib/jevbench-v1714-release.mjs';
import { hasPublishedJevbenchV1715Release } from '../lib/jevbench-v1715-release.mjs';
import { hasPublishedJevbenchV1716Release } from '../lib/jevbench-v1716-release.mjs';
import { hasPublishedJevbenchV1717Release } from '../lib/jevbench-v1717-release.mjs';
import { hasPublishedJevbenchV1718Release } from '../lib/jevbench-v1718-release.mjs';
import { hasPublishedJevbenchV1719Release } from '../lib/jevbench-v1719-release.mjs';
import { hasPublishedJevbenchV1720Release } from '../lib/jevbench-v1720-release.mjs';
import { hasPublishedJevbenchV1721Release } from '../lib/jevbench-v1721-release.mjs';
import { hasPublishedJevbenchV1722Release } from '../lib/jevbench-v1722-release.mjs';
import { hasPublishedJevbenchV180Release } from '../lib/jevbench-v180-release.mjs';
import { hasPublishedJevbenchV1723Release } from '../lib/jevbench-v1723-release.mjs';
import { readImageJevSitemapPaths } from '../lib/imagejev-sitemap.mjs';

const PAGES = ["/decision-model-benchmarks", "/jev-models/methodology", "/jev-models/methodology/v1.6.1", "/jev-models/data", "/jev-models/calibration-reliability", "/jev-models/evaluate-alternatives", "/", "/benchmarks", "/compare", "/benchmaxxing", "/charts", "/scatter", "/eu", "/jev-models", "/jev-models/api", "/jev-models/all", "/image-jev-bench", "/audio-jev-bench", "/submit", "/jev-models/alternatives", "/de/jev-models/alternativen", "/jev-models/how-to-choose", "/jev-models/open-source-jev", "/jev-models/jev-vs-imajev", "/jev-models/jev-vs-plumb", "/jev-models/jev-vs-decider-4b-v2", "/jev-models/jev-vs-jevk5", "/jev-models/jev-vs-cygnet", "/jev-models/jev-vs-hopper", "/jev-models/jev-vs-winnow-12b-q8", "/jev-models/jev-vs-reflex-4b", "/jev-models/jev-vs-laya", "/jev-models/jev-vs-kev", "/jev-models/jev-vs-openai-decisions-api", "/jev-models/jev-vs-microsoft-decision-1", "/jev-models/v1", "/jev-models/v1.4", "/jev-models/v1.4.1", "/jev-models/v1.4.2", "/jev-models/v1.4.2.1", "/jev-models/v1.4.2.2", "/jev-models/v1.5.0", "/jev-models/v1.5.1", "/jev-models/v1.5.2", "/jev-models/v1.5.3", "/jev-models/v1.5.4", "/jev-models/v1.5.5", "/jev-models/v1.5.6", "/jev-models/v1.5.7", "/jev-models/v1.6.0", "/jev-models/v1.6.1", "/providers", "/provider-explorer", "/gateways", "/about", "/privacy", "/terms", "/impressum"];

// CR-62.2: the public pages plus one page per model family (the family URL resolves to its model page).
// CR-129 (2026-09-23): one entry per JevBench system, the same way. The multimodal preview track is not
// one of the artifact's systems, so it stays excluded, same as before (it is separately noindex'd).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ds = await getDataset();
  const lastModified = ds.generated_at ? new Date(ds.generated_at) : new Date();
  const families = [...new Set(ds.models.map((m) => m.family_key))].sort();
  const data = await readJevbenchSeoData();
  const current = await readJevbenchSeoUrls();
  // Every release page comes from the release history the board shows, so a new release needs no sitemap edit.
  const v1712Visible = await hasPublishedJevbenchV1712Release();
  const v1713Visible = await hasPublishedJevbenchV1713Release();
  const v1714Visible = await hasPublishedJevbenchV1714Release();
  const v1715Visible = await hasPublishedJevbenchV1715Release();
  const v1716Visible = await hasPublishedJevbenchV1716Release();
  const v1717Visible = await hasPublishedJevbenchV1717Release();
  const v1718Visible = await hasPublishedJevbenchV1718Release();
  const v1719Visible = await hasPublishedJevbenchV1719Release();
  const v1720Visible = await hasPublishedJevbenchV1720Release();
  const v1721Visible = await hasPublishedJevbenchV1721Release();
  const v1722Visible = await hasPublishedJevbenchV1722Release();
  const v1723Visible = await hasPublishedJevbenchV1723Release();
  const v180Visible = await hasPublishedJevbenchV180Release();
  const releasePages = JEVBENCH_RELEASES
    .filter((r: { version: string }) => (r.version !== 'v1.7.12' || v1712Visible) && (r.version !== 'v1.7.13' || v1713Visible) && (r.version !== 'v1.7.14' || v1714Visible) && (r.version !== 'v1.7.15' || v1715Visible) && (r.version !== 'v1.7.16' || v1716Visible) && (r.version !== 'v1.7.17' || v1717Visible) && (r.version !== 'v1.7.18' || v1718Visible) && (r.version !== 'v1.7.19' || v1719Visible) && (r.version !== 'v1.7.20' || v1720Visible) && (r.version !== 'v1.7.21' || v1721Visible) && (r.version !== 'v1.7.22' || v1722Visible) && (r.version !== 'v1.7.23' || v1723Visible) && (r.version !== 'v1.8.0' || v180Visible))
    .map((r: { href: string }) => r.href);
  const urls = [...new Set([...PAGES, ...releasePages, ...current.urls, ...await readImageJevSitemapPaths()])];
  return [
    ...urls.map((path) => {
      const historic = data.historical.find((r) => `/jev-models/${r.measurement_revision}` === path);
      const jevDate = typeof historic?.last_measured_on === 'string' ? historic.last_measured_on : data.date;
      const alt = path === '/jev-models/alternatives' || path === '/de/jev-models/alternativen' ? { alternates: { languages: { en: `${SITE_URL}/jev-models/alternatives`, de: `${SITE_URL}/de/jev-models/alternativen`, 'x-default': `${SITE_URL}/jev-models/alternatives` } } } : {};
      return { url: `${SITE_URL}${path === '/' ? '' : path}`, ...alt, lastModified: path.startsWith('/jev-models') || path.startsWith('/de/jev-models') ? new Date(jevDate) : lastModified };
    }),
    ...families.map((key) => ({ url: `${SITE_URL}/models/${encodeURIComponent(key)}`, lastModified })),
  ];
}
