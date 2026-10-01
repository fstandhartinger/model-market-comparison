import type { Metadata } from 'next';
import { readJevbenchV154Release } from '../../lib/jevbench-v15-release.mjs';
import { JevBenchV15ReleasePage } from '../../components/JevBenchV15ReleasePage';
import { JevHistoryLazy } from '../../components/JevHistoryLazy';

const OG_ART_REVISION = 'og4'; // Keep the live board share card evergreen across releases.

export async function generateMetadata(): Promise<Metadata> {
  const title = 'JevBench Capability Score by Benchmark Heaven — Jev-class model benchmark';
  const description = 'JevBench Capability Score ranks decision models within cost and latency caps. Compare intelligence, calibration, speed, and cost.';
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
  const { artifact, sha256 } = await readJevbenchV154Release();
  return <>
    <JevBenchV15ReleasePage artifact={artifact} sha256={sha256} versionPath="/jev-models/v1.5.4" live />
    <JevHistoryLazy />
  </>;
}
