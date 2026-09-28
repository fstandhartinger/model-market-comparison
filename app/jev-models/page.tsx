import type { Metadata } from 'next';
import { readJevbenchV15Release } from '../../lib/jevbench-v15-release.mjs';
import { JevBenchV15ReleasePage } from '../../components/JevBenchV15ReleasePage';

export const metadata: Metadata = {
  title: 'JevBench v1.5 — official Jev-class model ranking | Benchmark Heaven',
  description: 'The official JevBench v1.5 ranking: 89 systems scored across 1,624 typed decisions per system, with transparent data and method.',
  alternates: { canonical: '/jev-models' },
  openGraph: { type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/jev-models',
    title: 'JevBench v1.5 — official Jev-class model ranking | Benchmark Heaven',
    description: 'The official JevBench v1.5 ranking: 89 systems scored across 1,624 typed decisions per system, with transparent data and method.',
    images: [{ url: 'https://benchmarkheaven.com/jev-models/opengraph-image?v=og4', type: 'image/png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', site: '@benchmarkheaven', creator: '@benchmarkheaven',
    title: 'JevBench v1.5 — official Jev-class model ranking | Benchmark Heaven',
    description: 'The official JevBench v1.5 ranking: 89 systems scored across 1,624 typed decisions per system, with transparent data and method.',
    images: ['https://benchmarkheaven.com/jev-models/opengraph-image?v=og4'] },
};

export default async function JevModelsPage() {
  const { artifact, sha256 } = await readJevbenchV15Release();
  return <JevBenchV15ReleasePage artifact={artifact} sha256={sha256} versionPath="/jev-models/v1.5.0" />;
}
