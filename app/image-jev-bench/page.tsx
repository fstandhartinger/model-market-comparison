import type { Metadata } from 'next';
import { defaultMultimodalPreviewVersion } from '../../lib/jevbench-multimodal-preview.mjs';
import { ImageJevBenchContent } from '../jev-models/multimodal-preview/page';

const image = 'https://benchmarkheaven.com/image-jev-bench/opengraph-image';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const params = await searchParams;
  const requested = Array.isArray(params.version) ? params.version[0] : params.version;
  const version = requested === 'v0.1.4' || requested === 'v0.1.5' || requested === 'v0.2.0' ? requested : await defaultMultimodalPreviewVersion();
  const title = `Image JevBench ${version} — image decision benchmark`;
  const description = version === 'v0.2.0'
    ? 'JevImageBench Capability Score leads Image JevBench v0.2: CORE Intelligence and Calibration inside the frozen JevBench cost and latency budget, with all 51 configurations, the composite and static screenshot diagnostic tracks.'
    : version === 'v0.1.5'
      ? 'Image JevBench v0.1.5 (archived): JevImageBench Capability Score inside the frozen JevBench cost and latency budget, all 50 systems, composite scores and price alternatives.'
      : 'Compare Image JevBench v0.1.4 (archived) image decision systems across Intelligence, Calibration, Speed and Cost.';
  return {
    title,
    description,
    alternates: { canonical: '/image-jev-bench' },
    openGraph: {
      type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/image-jev-bench',
      title, description,
      images: [{ url: image, width: 1200, height: 630, alt: `${title}: compare image decision systems` }],
    },
    twitter: { card: 'summary_large_image', site: '@benchmarkheaven', title, description, images: [image] },
  };
}

export default async function ImageJevBenchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const version = Array.isArray(params.version) ? params.version[0] : params.version;
  return <ImageJevBenchContent requestedVersion={version} />;
}
