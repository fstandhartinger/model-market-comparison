import type { Metadata } from 'next';
import { readCurrentJevbench, CURRENT_JEVBENCH_PAGE } from '../../lib/jevbench-current.mjs';
import { JevBenchV16ReleaseRoute } from '../../components/JevBenchV16ReleaseRoute';
import { JevHistoryLazy } from '../../components/JevHistoryLazy';
import { JevBenchMainJsonLd } from '../../components/JevBenchJsonLd';

const OG_ART_REVISION = 'og4'; // Keep the live board share card evergreen across releases.

export async function generateMetadata(): Promise<Metadata> {
  const title = 'JevBench — AI decision model benchmark & leaderboard';
  const description = 'Compare AI decision models on accuracy, probability calibration, latency and cost. JevBench by Benchmark Heaven ranks open-weights decision models by the JevBench Capability Score, with methodology and reproducible aggregate results.';
  const imageAlt = 'JevBench by Benchmark Heaven: evaluation of AI decision models and Jev-compatible systems across intelligence, calibration, speed, and cost.';
  const image = `https://benchmarkheaven.com/jev-models/opengraph-image?v=${OG_ART_REVISION}`;
  return {
    title, description,
    alternates: { canonical: '/jev-models' },
    openGraph: { type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/jev-models',
      title, description,
      images: [{ url: image, type: 'image/png', secureUrl: image, width: 1200, height: 630, alt: imageAlt }] },
    twitter: { card: 'summary_large_image', site: '@benchmarkheaven', creator: '@benchmarkheaven',
      title, description, images: [{ url: image, alt: imageAlt }] },
  };
}

export default async function JevModelsPage() {
  const release = await readCurrentJevbench();
  return <>
    <JevBenchV16ReleaseRoute live release={release} versionPath={CURRENT_JEVBENCH_PAGE} scope="open" />
    <JevHistoryLazy />
    {/* CR-291: Dataset + BreadcrumbList + FAQPage JSON-LD from the current release; its FAQ is rendered visibly below the history. */}
    <JevBenchMainJsonLd />
  </>;
}
