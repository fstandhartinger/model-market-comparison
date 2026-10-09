import type { Metadata } from 'next';
import { ImageJevV03Page } from '../../components/ImageJevV03Page';
import release from '../../data/imagejev-v03.json';

// Review 6 Oct 2026: version and system count come from the released artifact so they cannot go stale.
const version = release.revision;
const count = release.ranking.length;
const items = release.method.reserve.toLocaleString('en-US');

const title = `ImageJevBench — Image Decision Model Benchmark ${version}`;
const description = `Compare image decision models on accuracy, probability calibration, latency and cost. ImageJevBench by Benchmark Heaven: ${version}, ${count} measured systems.`;
const image = 'https://benchmarkheaven.com/image-jev-bench/opengraph-image';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/image-jev-bench' },
  openGraph: {
    type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/image-jev-bench',
    title, description,
    images: [{ url: image, width: 1200, height: 630, alt: `Image JevBench ${version}: JevImageBench Capability Score for image decision systems` }],
  },
  twitter: { card: 'summary_large_image', site: '@benchmarkheaven', title, description, images: [image] },
};

const canonical = 'https://benchmarkheaven.com/image-jev-bench';
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebPage', '@id': `${canonical}#page`, url: canonical, name: title, description, isPartOf: { '@id': 'https://benchmarkheaven.com/#website' }, mainEntity: { '@id': `${canonical}#dataset` }, breadcrumb: { '@id': `${canonical}#breadcrumb` } },
    {
      '@type': 'Dataset', '@id': `${canonical}#dataset`, name: `ImageJevBench ${version} results`, url: canonical, version,
      description: `Aggregate results for ${count} image decision systems on the ${items}-item ${version} pool.`,
      creator: { '@type': 'Organization', name: 'Benchmark Heaven', url: 'https://benchmarkheaven.com' },
      isAccessibleForFree: true, datePublished: String(release.built_utc).slice(0, 10),
      variableMeasured: ['Composite score', 'Capability', 'Intelligence', 'Calibration', 'Speed', 'Cost'],
    },
    { '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Benchmark Heaven', item: 'https://benchmarkheaven.com' },
      { '@type': 'ListItem', position: 2, name: 'Image JevBench', item: canonical },
    ] },
  ],
};

export default function ImageJevBenchPage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <ImageJevV03Page />
  </>;
}
