import type { Metadata } from 'next';
import { MultimodalPreviewContent } from '../jev-models/multimodal-preview/page';

const title = 'Image JevBench v0.1 — image decision benchmark';
const description = 'Compare 12 image decision systems across Intelligence, Calibration, Speed and Cost on a frozen 228-public, 456-sealed benchmark.';
const image = 'https://benchmarkheaven.com/image-jev-bench/opengraph-image';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/image-jev-bench' },
  openGraph: {
    type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/image-jev-bench',
    title, description,
    images: [{ url: image, width: 1200, height: 630, alt: 'Image JevBench v0.1: compare image decision systems' }],
  },
  twitter: { card: 'summary_large_image', site: '@benchmarkheaven', title, description, images: [image] },
};

export default function ImageJevBenchPage() {
  return <MultimodalPreviewContent />;
}
