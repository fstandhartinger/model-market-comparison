import type { Metadata } from 'next';
import { readCurrentJevbench, CURRENT_JEVBENCH_PAGE } from '../../lib/jevbench-current.mjs';
import { JevBenchV16ReleaseRoute } from '../../components/JevBenchV16ReleaseRoute';
import { JevHistoryLazy } from '../../components/JevHistoryLazy';

const OG_ART_REVISION = 'og4'; // Keep the live board share card evergreen across releases.

export async function generateMetadata(): Promise<Metadata> {
  const title = 'JevBench — Jev benchmark & leaderboard of open-weight Jev-class models';
  const description = 'Independent Jev benchmark and leaderboard: the JevBench Capability Score ranks open-weights decision models within frozen cost and median-latency caps, with Jev as the reference. Compare intelligence, calibration, speed, cost, use cases, topics and languages.';
  const imageAlt = 'JevBench by Benchmark Heaven: a benchmark for Jev-class decision models across intelligence, calibration, speed, and cost.';
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
  </>;
}
