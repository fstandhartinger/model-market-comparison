import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BaseModelDisplay } from '../../../components/BaseModelDisplay';
import { JevAxisBand, typeColour } from '../../../components/JevSystemCharts';
import { readMultimodalPreview } from '../../../lib/jevbench-multimodal-preview.mjs';
import { imageJevBoardSystems } from '../../../lib/imagejev-board.mjs';
import { imageJevSystemPath, imageJevSourceUrl } from '../../../lib/imagejev-system-links.mjs';
import { previewMetadata } from '../../../lib/seo';

// CR-254: all current ImageJevBench details use only the published aggregate and cited metadata.
const AXES = ['intelligence', 'calibration', 'speed', 'cost'] as const;
const number = (value: number | null | undefined, digits = 3) => value == null ? 'Not measured' : value.toFixed(digits);

async function findSystem(key: string) {
  const artifact = await readMultimodalPreview();
  const systems = imageJevBoardSystems(artifact);
  const row = systems.find((candidate) => candidate.key === key);
  return row ? { artifact, row, systems } : null;
}

export async function generateStaticParams() {
  return imageJevBoardSystems(await readMultimodalPreview()).map((row) => ({ system: row.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ system: string }> }): Promise<Metadata> {
  const { system } = await params;
  const found = await findSystem(system);
  if (!found) return { title: 'System not found' };
  const title = `${found.row.display} — Image JevBench`;
  return previewMetadata({ path: imageJevSystemPath(system), documentTitle: title, title,
    description: `Published Image JevBench ${found.artifact.revision} aggregate score, rank, axes, cost and latency for ${found.row.display}.` });
}

export default async function ImageJevSystemPage({ params }: { params: Promise<{ system: string }> }) {
  const { system } = await params;
  const found = await findSystem(system);
  if (!found) notFound();
  const { artifact, row, systems } = found;
  const source = imageJevSourceUrl(row.key, row.repo);
  return <>
    <nav className="text-sm"><Link href="/image-jev-bench" className="text-accent underline">← Back to the full Image JevBench leaderboard</Link></nav>
    <header className="bh-page-head mt-3">
      <div className="bh-eyebrow">Image JevBench {artifact.revision} · individual system</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{row.display}</h1>
      <BaseModelDisplay benchmark="imagejevbench" systemKey={row.key} className="mt-2 block text-sm" />
      {source && <p className="mt-2 text-sm"><a href={source} target="_blank" rel="noopener noreferrer" className="text-accent underline" data-bh-jev-source={row.key}>Published source</a></p>}
      {row.endpoint_condition && <p className="bh-muted mt-2 text-sm">{row.endpoint_condition}</p>}
      {row.key === 'wity_1' && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300" data-bh-mm-author-review>Under author review: server build ID was not recorded; this score may change after verification.</p>}
    </header>
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
      <section className="bh-panel p-5" aria-labelledby="imagejev-system-score" data-bh-mm-system-score>
        <h2 id="imagejev-system-score" className="text-xl font-semibold">Image JevBench {artifact.revision} composite score</h2>
        <p className="mt-2 text-3xl font-bold tabular-nums">{number(row.jevbench_score)}</p>
        <p className="bh-muted mt-1">{row.ranked && row.rank != null ? `Rank #${row.rank} of ${systems.filter((candidate) => candidate.ranked).length} ranked systems.` : 'Listed, not ranked.'}</p>
        <p className="bh-muted mt-3 text-sm">From the published full-benchmark aggregate. The composite combines intelligence, calibration, speed and cost.</p>
      </section>
      <section aria-labelledby="imagejev-system-axes" data-bh-mm-system-axes>
        <h2 id="imagejev-system-axes" className="text-xl font-semibold">Published axes</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {AXES.map((axis) => <div className="bh-panel p-4" key={axis}>
            <dt className="bh-muted text-sm capitalize">{axis}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{number(row.axes?.[axis], 1)}
              {row.axes?.[axis] != null && <JevAxisBand axis={axis} value={row.axes[axis]!} colour={typeColour(row.class)} reference={null} referenceName="" />}
            </dd>
          </div>)}
        </dl>
      </section>
    </div>
    <section className="bh-panel mt-8 p-5" aria-labelledby="imagejev-system-measurement" data-bh-mm-system-measurement>
      <h2 id="imagejev-system-measurement" className="text-xl font-semibold">Cost and speed evidence</h2>
      <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Cost per 1,000 decisions</dt><dd className="tabular-nums">{row.cost?.usd_per_1000 == null ? 'Not measured' : `USD ${number(row.cost.usd_per_1000, 6)}`}</dd></div>
        <div><dt className="font-semibold">Cost basis</dt><dd className="bh-muted">{row.cost?.basis ?? 'Not reported'}</dd></div>
        <div><dt className="font-semibold">Measured latency · p50 / p95</dt><dd className="tabular-nums">{number(row.speed?.p50_s_raw)} s / {number(row.speed?.p95_s_raw)} s</dd></div>
        <div><dt className="font-semibold">Adjusted latency · p50 / p95</dt><dd className="tabular-nums">{number(row.speed?.p50_s_adjusted)} s / {number(row.speed?.p95_s_adjusted)} s</dd></div>
        <div><dt className="font-semibold">Latency adjustment</dt><dd className="bh-muted">{row.speed?.adjustment ?? 'Not reported'}</dd></div>
        {row.public_accuracy != null && <div><dt className="font-semibold">Public accuracy</dt><dd className="tabular-nums">{number(row.public_accuracy * 100, 1)}%</dd></div>}
        {row.sealed_accuracy != null && <div><dt className="font-semibold">Sealed accuracy</dt><dd className="tabular-nums">{number(row.sealed_accuracy * 100, 1)}%</dd></div>}
        {typeof row.note === 'string' && row.note && <div><dt className="font-semibold">Measurement note</dt><dd className="bh-muted">{row.note}</dd></div>}
      </dl>
      <p className="bh-muted mt-4 text-sm">Published {artifact.built_utc}. Scores and ranks can change in a later release. See the <Link href="/image-jev-bench#method-heading" className="text-accent underline">method notes</Link>.</p>
    </section>
  </>;
}
