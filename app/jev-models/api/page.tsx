import type { Metadata } from 'next';
import { readCurrentJevbench } from '../../../lib/jevbench-current.mjs';
import { JevBenchV16ReleaseRoute } from '../../../components/JevBenchV16ReleaseRoute';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';

// JevBench v1.7.0 (Florian, 5 Oct 2026): the API-provider leaderboard. Same release data as /jev-models; only the
// ranked set differs (hosted API offerings plus Jev, ranked among themselves).
export async function generateMetadata(): Promise<Metadata> {
  const title = 'Decision API Benchmark & Leaderboard — JevBench';
  const description = 'Compare hosted decision APIs on typed decision accuracy, probability calibration, measured latency and modeled list-price cost. JevBench by Benchmark Heaven.';
  const image = 'https://benchmarkheaven.com/jev-models/api/opengraph-image?v=og1';
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
  // Review 6 Oct 2026: structured data like /jev-models (this page had none); no FAQ, the open board carries it.
  const url = 'https://benchmarkheaven.com/jev-models/api';
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: 'JevBench API leaderboard: hosted decision APIs', isPartOf: { '@id': 'https://benchmarkheaven.com/#website' } },
    { '@type': 'Dataset', name: 'JevBench API leaderboard', url, version: release.artifact.revision,
      description: 'JevBench results for hosted decision APIs: Composite and Capability Score from Intelligence, Calibration, measured endpoint latency and list-price cost per 1,000 decisions.',
      creator: { '@type': 'Organization', name: 'Benchmark Heaven', url: 'https://benchmarkheaven.com' }, isAccessibleForFree: true,
      distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://benchmarkheaven.com/api/jevbench/latest' } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Benchmark Heaven', item: 'https://benchmarkheaven.com' },
      { '@type': 'ListItem', position: 2, name: 'JevBench', item: 'https://benchmarkheaven.com/jev-models' },
      { '@type': 'ListItem', position: 3, name: 'API leaderboard', item: url },
    ] },
  ] };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <JevBenchV16ReleaseRoute live scope="api" release={release} versionPath="/jev-models/api" />
    <JevHistoryLazy />
  </>;
}
