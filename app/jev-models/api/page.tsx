import type { Metadata } from 'next';
import { readCurrentJevbench } from '../../../lib/jevbench-current.mjs';
import { JevBenchV16ReleaseRoute } from '../../../components/JevBenchV16ReleaseRoute';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';

// JevBench v1.7.0 (Florian, 5 Oct 2026): the API-provider leaderboard. Same release data as /jev-models; only the
// ranked set differs (hosted API offerings plus Jev, ranked among themselves).
export async function generateMetadata(): Promise<Metadata> {
  const title = 'Jev API benchmark — JevBench leaderboard of hosted decision APIs';
  const description = 'JevBench ranking of hosted decision APIs (Jev, wity, Sage, Fastino and more): Capability Score, intelligence, calibration, measured latency and list-price cost per 1,000 decisions.';
  const image = 'https://benchmarkheaven.com/jev-models/opengraph-image?v=og4';
  return {
    title, description,
    alternates: { canonical: '/jev-models/api' },
    openGraph: { type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/jev-models/api', title, description,
      images: [{ url: image, type: 'image/png', width: 1200, height: 630, alt: 'JevBench API leaderboard by Benchmark Heaven' }] },
    twitter: { card: 'summary_large_image', site: '@benchmarkheaven', creator: '@benchmarkheaven', title, description, images: [{ url: image, alt: 'JevBench API leaderboard by Benchmark Heaven' }] },
  };
}

export default async function JevModelsApiPage() {
  const release = await readCurrentJevbench();
  return <>
    <JevBenchV16ReleaseRoute live scope="api" release={release} versionPath="/jev-models/api" />
    <JevHistoryLazy />
  </>;
}
