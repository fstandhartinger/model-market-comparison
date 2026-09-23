import type { Metadata } from 'next';
import { SITE_URL, X_HANDLE } from './seo';

const IMAGE_ALT = 'JevBench by Benchmark Heaven compares Jev-class decision models across intelligence, calibration, speed, and cost.';
const IMAGE_URL = `${SITE_URL}/jev-models/opengraph-image?v=og4`;

export function jevIntentMetadata({
  path,
  title,
  description,
  keywords,
}: {
  path: string;
  title: string;
  description: string;
  keywords: string[];
}): Metadata {
  const canonical = new URL(path, SITE_URL).toString();
  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US',
      url: canonical, title, description,
      images: [{ url: IMAGE_URL, type: 'image/png', secureUrl: IMAGE_URL, width: 1200, height: 630, alt: IMAGE_ALT }],
    },
    twitter: {
      card: 'summary_large_image', site: X_HANDLE, creator: X_HANDLE,
      title, description, images: [{ url: IMAGE_URL, alt: IMAGE_ALT }],
    },
  };
}
