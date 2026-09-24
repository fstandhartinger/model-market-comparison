import type { Metadata } from 'next';
import { readJevbenchV14, jevbenchV14View } from '../../../lib/jevbench-v14.mjs';
import { JevModelsV14Board } from '../../../components/JevModelsV14';

const short = (display: string) => display.split(' (')[0].split(', formerly')[0];
const one = (score: number | null) => score === null ? '—' : score.toFixed(1);

async function pinnedView() {
  return jevbenchV14View(await readJevbenchV14());
}

export async function generateMetadata(): Promise<Metadata> {
  const view = await pinnedView();
  const topFive = view.ranked.slice(0, 5)
    .map((row) => `#${row.rank} ${short(row.display)} (${one(row.jevbench_score)})`)
    .join('; ');
  const title = `JevBench ${view.revision} — frozen Jev alternatives ranking`;
  const description = `Frozen JevBench ${view.revision} top five (JevBench Score): ${topFive}.`;
  const canonical = '/jev-models/v1.4';
  const image = 'https://benchmarkheaven.com/jev-models/opengraph-image?v=og4';
  const imageAlt = 'JevBench by Benchmark Heaven: a benchmark for Jev-class decision models across intelligence, calibration, speed, and cost.';
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: canonical,
      title, description,
      images: [{ url: image, type: 'image/png', secureUrl: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image', site: '@benchmarkheaven', creator: '@benchmarkheaven',
      title, description,
      images: [{ url: image, alt: imageAlt }],
    },
  };
}

export default async function JevModelsV14Page() {
  const view = await pinnedView();
  const topFive = view.ranked.slice(0, 5);
  return <>
    <header className="bh-page-head">
      <p className="bh-eyebrow" data-bh-jev-frozen-version>Frozen JevBench release {view.revision}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench {view.revision} — frozen results</h1>
      <p className="bh-muted mt-3 max-w-3xl">This page always uses the public, hash-checked {view.revision} artifact. The live board may change when a later release is published.</p>
      <p className="bh-muted mt-2 max-w-3xl text-xs">Artifact SHA-256 <code className="break-all" title={view.sha256}>{view.sha256}</code>.</p>
      <p className="bh-muted mt-2 max-w-3xl text-xs" data-bh-jev-meta>{view.publicDecisions} public + {view.sealedDecisions} sealed decisions · only system-level sealed aggregates are published.</p>
      <p className="mt-3 max-w-3xl text-sm" data-bh-jev-version-share-row>
        <a className="text-accent underline" href="/jev-models/v1.4" data-bh-jev-version-share>Share this version</a>
        {' · '}
        <a className="text-accent underline" href="/jev-models" data-bh-jev-live-link>View live board</a>
      </p>
    </header>
    <section className="bh-panel mt-6 max-w-3xl p-5" aria-labelledby="jev-v14-frozen-top-five">
      <h2 id="jev-v14-frozen-top-five" className="text-xl font-semibold">Frozen top five</h2>
      <ol className="mt-3 list-decimal space-y-1 pl-6" data-bh-jev-frozen-top-five>
        {topFive.map((row) => <li key={row.key}><b>{short(row.display)}</b> — {one(row.jevbench_score)}</li>)}
      </ol>
      <p className="bh-muted mt-3 text-sm">These ranks and scores come from the frozen {view.revision} release and do not follow changes to the live board.</p>
    </section>
    <JevModelsV14Board artifact={view.artifact} sha256={view.sha256} />
  </>;
}
