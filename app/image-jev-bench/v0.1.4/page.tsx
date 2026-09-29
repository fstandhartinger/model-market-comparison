import type { Metadata } from 'next';
import { MultimodalPreviewContent } from '../../jev-models/multimodal-preview/page';

const title = 'Image JevBench v0.1.4 — archived image decision benchmark';
const description = 'Archived Image JevBench v0.1.4 results on the frozen v0.1 scoring method.';
const image = 'https://benchmarkheaven.com/image-jev-bench/v0.1.4/opengraph-image';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/image-jev-bench/v0.1.4' },
  openGraph: {
    type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/image-jev-bench/v0.1.4',
    title, description,
    images: [{ url: image, width: 1200, height: 630, alt: 'Archived Image JevBench v0.1.4 results' }],
  },
  twitter: { card: 'summary_large_image', site: '@benchmarkheaven', title, description, images: [image] },
};

export default function ImageJevBenchV014ArchivePage() {
  return <>
    <div className="mx-auto max-w-7xl px-6 pt-6">
      <div className="rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
        <strong>Archived release: ImageJevBench v0.1.4.</strong> See the <a className="underline" href="/image-jev-bench">current v0.2 results</a>.
      </div>
    </div>
    <MultimodalPreviewContent />
  </>;
}
