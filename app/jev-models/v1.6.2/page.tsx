import type { Metadata } from 'next';
import { readJevbenchV162Release } from '../../../lib/jevbench-v16-release.mjs';
import { JevBenchV16ReleaseRoute } from '../../../components/JevBenchV16ReleaseRoute';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';

export async function generateMetadata(): Promise<Metadata> {
  const { artifact } = await readJevbenchV162Release();
  const title = `JevBench ${artifact.revision} — Capability Score and model ranking`;
  const description = `Official JevBench ${artifact.revision} release: Capability Score, Composite, measured speed and cost, category radars, language results and dated carries.`;
  const image = 'https://benchmarkheaven.com/jev-models/opengraph-image?v=og4';
  return {
    title, description,
    alternates: { canonical: '/jev-models/v1.6.2' },
    openGraph: { type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/jev-models/v1.6.2', title, description,
      images: [{ url: image, type: 'image/png', width: 1200, height: 630, alt: 'JevBench v1.6.2 by Benchmark Heaven' }] },
    twitter: { card: 'summary_large_image', site: '@benchmarkheaven', creator: '@benchmarkheaven', title, description, images: [{ url: image, alt: 'JevBench v1.6.2 by Benchmark Heaven' }] },
  };
}

export default async function JevModelsV162Page() {
  const release = await readJevbenchV162Release();
  return <>
    <JevBenchV16ReleaseRoute release={release} />
    <JevHistoryLazy />
  </>;
}
