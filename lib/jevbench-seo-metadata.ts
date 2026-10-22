import type { Metadata } from 'next';
import { SITE_URL, X_HANDLE, seoTitle } from './seo';

const IMAGE_ALT = 'JevBench by Benchmark Heaven compares Jev-class decision models across intelligence, calibration, speed, and cost.';
const IMAGE_URL = `${SITE_URL}/jev-models/opengraph-image?v=og4`;

export function jevIntentMetadata({
  path,
  title,
  documentTitle,
  description,
  keywords,
  languages,
  locale = 'en_US',
}: {
  path: string;
  title: string;
  /** The <title> when it differs from the link-preview title; either way it goes through seoTitle. */
  documentTitle?: string;
  description: string;
  keywords: string[];
  languages?: Record<string, string>;
  locale?: string;
}): Metadata {
  const canonical = new URL(path, SITE_URL).toString();
  return {
    // The brand is already in the layout's title suffix, so a trailing "— JevBench by Benchmark Heaven" shortens to "— JevBench".
    title: seoTitle(documentTitle ?? title.replace(/ — JevBench by Benchmark Heaven$/, ' — JevBench')),
    description,
    keywords,
    alternates: { canonical, ...(languages ? { languages: Object.fromEntries(Object.entries(languages).map(([k, v]) => [k, new URL(v, SITE_URL).toString()])) } : {}) },
    openGraph: {
      type: 'website', siteName: 'Benchmark Heaven', locale,
      url: canonical, title, description,
      images: [{ url: IMAGE_URL, type: 'image/png', secureUrl: IMAGE_URL, width: 1200, height: 630, alt: IMAGE_ALT }],
    },
    twitter: {
      card: 'summary_large_image', site: X_HANDLE, creator: X_HANDLE,
      title, description, images: [{ url: IMAGE_URL, alt: IMAGE_ALT }],
    },
  };
}
