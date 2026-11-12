import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageJevV04Section } from '../../../components/ImageJevV04Section';
import { loadImageJevV04Feed } from '../../../lib/imagejev-v04-feed.mjs';
import { seoTitle } from '../../../lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: seoTitle('ImageJevBench v0.4 — separate-scale preview'),
  description: 'Separate ImageJevBench v0.4 aggregate preview. Fixture data is fictional and is not a benchmark result.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function ImageJevV04Page() {
  // Local preview opt-in only. The normal path never falls back to fixture or legacy data.
  const fixture = process.env.IMAGEJEV_V04_PREVIEW_FIXTURE === '1';
  const file = path.join(process.cwd(), 'data', fixture ? 'fixtures/imagejev-v04.fixture.json' : 'imagejev-v04.json');
  const feed = await loadImageJevV04Feed(() => readFile(file, 'utf8'), { allowFixture: fixture });
  return <>
    <header className="bh-page-head max-w-5xl">
      <p className="bh-eyebrow">Image benchmark · separate scale</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">ImageJevBench v0.4</h1>
      <p className="bh-muted mt-3">Preview of the separate v0.4 board.</p>
      <a href="/image-jev-bench" className="mt-3 inline-block text-accent underline">Open the existing ImageJevBench v0.3 board</a>
    </header>
    {feed ? <ImageJevV04Section feed={feed} /> : <p className="bh-muted mt-6" data-bh-imagejev-v04-unavailable>Results are not available yet.</p>}
  </>;
}
