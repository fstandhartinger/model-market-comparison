import type { Metadata } from 'next';
import { readJevbenchV154Release } from '../../../lib/jevbench-v15-release.mjs';
import { JevBenchV15ReleasePage } from '../../../components/JevBenchV15ReleasePage';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';

async function currentRelease() {
  return readJevbenchV154Release();
}

export async function generateMetadata(): Promise<Metadata> {
  const { artifact } = await currentRelease();
  const leaderNames = artifact.board.A.order.slice(0, 2).map((key) => artifact.systems.find((row) => row.key === key)?.display ?? key);
  const title = `JevBench ${artifact.revision} — official Jev alternatives ranking`;
  const description = `${leaderNames.join(' and ')} are the statistical co-leaders in JevBench ${artifact.revision}, measured across ${artifact.sample.total.toLocaleString('en-US')} decisions per system.`;
  return {
    title,
    description,
    alternates: { canonical: '/jev-models/v1.5.4' },
    openGraph: { type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/jev-models/v1.5.4', title, description,
      images: [{ url: 'https://benchmarkheaven.com/jev-models/opengraph-image?v=og4', type: 'image/png', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', site: '@benchmarkheaven', creator: '@benchmarkheaven', title, description,
      images: [{ url: 'https://benchmarkheaven.com/jev-models/opengraph-image?v=og4' }] },
  };
}

export default async function JevModelsV154Page() {
  const { artifact, sha256 } = await currentRelease();
  return <>
    <JevBenchV15ReleasePage artifact={artifact} sha256={sha256} versionPath="/jev-models/v1.5.4" />
    <JevHistoryLazy />
  </>;
}
