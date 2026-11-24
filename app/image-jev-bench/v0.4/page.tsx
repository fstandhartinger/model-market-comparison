import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageJevV04Section } from '../../../components/ImageJevV04Section';
import { loadImageJevV04Feed } from '../../../lib/imagejev-v04-feed.mjs';
import { seoTitle } from '../../../lib/seo';

export const dynamic = 'force-dynamic';

async function readFeed() {
  // Local preview opt-in only. The normal path never falls back to fixture or legacy data.
  const fixture = process.env.IMAGEJEV_V04_PREVIEW_FIXTURE === '1';
  const file = path.join(process.cwd(), 'data', fixture ? 'fixtures/imagejev-v04.fixture.json' : 'imagejev-v04.json');
  return loadImageJevV04Feed(() => readFile(file, 'utf8'), { allowFixture: fixture });
}

/** Indexed only while a validated measured feed is served; fixtures and the empty shell stay noindex. */
export async function generateMetadata(): Promise<Metadata> {
  const feed = await readFeed();
  const measured = feed?.data_kind === 'measured';
  return {
    title: seoTitle(measured ? `ImageJevBench ${feed.revision} — image reasoning decisions (separate v0.4 scale)` : 'ImageJevBench v0.4 — separate scale'),
    description: measured
      ? `ImageJevBench ${feed.revision}: ${feed.items} generated reasoning images (diagrams, charts, simulated interfaces), measured on a separate v0.4 scale. Not comparable with v0.3.`
      : 'Separate ImageJevBench v0.4 board. Results are not available yet.',
    alternates: { canonical: '/image-jev-bench/v0.4' },
    robots: measured ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
  };
}

export default async function ImageJevV04Page() {
  const feed = await readFeed();
  return <>
    <header className="bh-page-head max-w-5xl">
      <p className="bh-eyebrow">Image benchmark · separate scale</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">ImageJevBench v0.4</h1>
      <p className="bh-muted mt-3">Separate v0.4 board for image reasoning decisions. Its scores are not comparable with the v0.3 board.</p>
      <a href="/image-jev-bench" className="mt-3 inline-block text-accent underline">Open the existing ImageJevBench v0.3 board</a>
    </header>
    {feed ? <ImageJevV04Section feed={feed} /> : <p className="bh-muted mt-6" data-bh-imagejev-v04-unavailable>Results are not available yet.</p>}
  </>;
}
