import type { Metadata } from 'next';
import { ImageJevV03Page } from '../../components/ImageJevV03Page';

const title = 'Image JevBench v0.3.0 — JevImageBench Capability Score';
const description = 'JevImageBench Capability Score ranks image decision systems inside the frozen JevBench cost and latency budget. v0.3.0: 2,441 new items, 45 measured systems, composite scores and price alternatives.';
const image = 'https://benchmarkheaven.com/image-jev-bench/opengraph-image';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/image-jev-bench' },
  openGraph: {
    type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/image-jev-bench',
    title, description,
    images: [{ url: image, width: 1200, height: 630, alt: 'Image JevBench v0.3.0: JevImageBench Capability Score for image decision systems' }],
  },
  twitter: { card: 'summary_large_image', site: '@benchmarkheaven', title, description, images: [image] },
};

export default function ImageJevBenchPage() {
  return <ImageJevV03Page />;
}
