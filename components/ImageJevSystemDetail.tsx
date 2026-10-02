import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BaseModelDisplay } from './BaseModelDisplay';
import { JevAxisBand, typeColour } from './JevSystemCharts';
import { findImageJevDetail } from '../lib/imagejev-details.mjs';
import { imageJevSystemPath, imageJevBoardPath } from '../lib/imagejev-system-links.mjs';
import { previewMetadata } from '../lib/seo';

// CR-254: version-specific details use only frozen release aggregates and cited provenance.
const AXES = ['intelligence', 'calibration', 'speed', 'cost'] as const;
const number = (value: number | null | undefined, digits = 3) => value == null ? 'Not measured' : value.toFixed(digits);

export async function imageJevDetailMetadata(system: string, revision = 'v0.2.0', unversioned = false): Promise<Metadata> {
  const found = await findImageJevDetail(system, revision);
  if (!found) return { title: 'System not found' };
  const title = `${found.row.display} — Image JevBench ${found.revision}`;
  return previewMetadata({ path: imageJevSystemPath(system, unversioned ? undefined : found.revision), documentTitle: title, title,
    description: `Image JevBench ${found.revision} ${found.row.track.toUpperCase()} aggregate status, rank, axes, cost and latency for ${found.row.display}.` });
}

export async function ImageJevSystemDetail({ system, revision = 'v0.2.0' }: { system: string; revision?: string }) {
  const found = await findImageJevDetail(system, revision);
  if (!found) notFound();
  const { artifact, row, systems } = found;
  const source = row.source_url;
  const board = imageJevBoardPath(found.revision);
  const alternative = row.pricing_alternative?.tracks[row.track];
  return <>
    <nav className="text-sm"><Link href={board} className="text-accent underline">← Back to the full Image JevBench leaderboard</Link></nav>
    <header className="bh-page-head mt-3">
      <div className="bh-eyebrow">Image JevBench {found.revision} · individual system</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{row.display}</h1>
      <BaseModelDisplay benchmark="imagejevbench" systemKey={row.key} className="mt-2 block text-sm" />
      {source && <p className="mt-2 text-sm"><a href={source} target="_blank" rel="noopener noreferrer" className="text-accent underline" data-bh-jev-source={row.key}>Cited provenance</a></p>}
      {row.endpoint_condition && <p className="bh-muted mt-2 text-sm">{row.endpoint_condition}</p>}
      {found.revision !== 'v0.2.0' && row.key === 'wity_1' && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300" data-bh-mm-author-review>Under author review: server build ID was not recorded; this score may change after verification.</p>}
      <p className="bh-muted mt-2 text-sm" data-bh-mm-source-note>{row.source_note}</p>
    </header>
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
      <section className="bh-panel p-5" aria-labelledby="imagejev-system-score" data-bh-mm-system-score data-bh-mm-detail-status={row.status} data-bh-mm-detail-revision={found.revision} data-bh-mm-detail-track={row.track}>
        <h2 id="imagejev-system-score" className="text-xl font-semibold">Image JevBench {found.revision} composite score</h2>
        <p className="mt-2 text-3xl font-bold tabular-nums">{row.jevbench_score == null ? 'Unavailable' : number(row.jevbench_score)}</p>
        <p className="bh-muted mt-1">{row.ranked && row.rank != null ? `Rank #${row.rank} of ${systems.filter((candidate) => candidate.ranked).length} ranked systems.` : row.status === 'historical-reference' ? 'Historical reference only · no current measurement or rank.' : 'Measured without a CORE composite · no rank.'}</p>
        <p className="bh-muted mt-3 text-sm">From the selected {row.track === 'core' ? 'CORE ranking' : 'full-benchmark'} aggregate. The composite combines intelligence, calibration, speed and cost.</p>
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
    {(row.reason || row.reference || row.previous) && <section className="bh-panel mt-8 p-5" data-bh-mm-detail-reference>
      <h2 className="text-xl font-semibold">Status and earlier reference</h2>
      {row.reason && <p className="mt-2">{row.reason}</p>}
      {row.reference && <p className="mt-2">REFERENCE {row.reference.revision}: {number(row.reference.score)} · {row.reference.reason} <Link href={imageJevSystemPath(row.key, row.reference.revision)} className="text-accent underline">Archived detail</Link></p>}
      {row.previous && <p className="mt-2">Previous release: {row.previous.rank == null ? 'no rank' : `#${row.previous.rank}`} · {number(row.previous.score)}</p>}
    </section>}
    {alternative && <section className="bh-panel mt-8 p-5" data-bh-mm-detail-pricing-alternative>
      <h2 className="text-xl font-semibold">{row.pricing_alternative!.label}</h2>
      <p className="mt-2">{row.pricing_alternative!.basis}</p>
      <p className="mt-2">Composite {number(alternative.composite?.score)} · Cost axis {number(alternative.cost_score, 1)} · USD {number(alternative.cost?.usd_per_1000 ?? alternative.usd_per_1000, 6)} per 1,000 decisions{row.pricing_alternative!.rank_if_applied != null ? ` · would be #${row.pricing_alternative!.rank_if_applied}` : ''}.</p>
      {row.pricing_alternative!.source && <p className="bh-muted mt-2">{row.pricing_alternative!.source}</p>}
    </section>}
    <section className="bh-panel mt-8 p-5" aria-labelledby="imagejev-system-measurement" data-bh-mm-system-measurement>
      <h2 id="imagejev-system-measurement" className="text-xl font-semibold">Cost and speed evidence</h2>
      <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Cost per 1,000 decisions</dt><dd className="tabular-nums">{row.cost?.usd_per_1000 == null ? 'Unavailable' : `USD ${number(row.cost.usd_per_1000, 6)}`}</dd></div>
        <div><dt className="font-semibold">Cost basis</dt><dd className="bh-muted">{row.cost?.basis ?? 'Not reported'}</dd></div>
        <div><dt className="font-semibold">Measured latency · p50 / p95</dt><dd className="tabular-nums">{number(row.speed?.p50_s_raw)} s / {number(row.speed?.p95_s_raw)} s</dd></div>
        <div><dt className="font-semibold">Adjusted latency · p50 / p95</dt><dd className="tabular-nums">{number(row.speed?.p50_s_adjusted)} s / {number(row.speed?.p95_s_adjusted)} s</dd></div>
        <div><dt className="font-semibold">Latency adjustment</dt><dd className="bh-muted">{row.speed?.adjustment ?? 'Not reported'}</dd></div>
        {row.public_accuracy != null && <div><dt className="font-semibold">Public accuracy</dt><dd className="tabular-nums">{number(row.public_accuracy * 100, 1)}%</dd></div>}
        {row.sealed_accuracy != null && <div><dt className="font-semibold">Sealed accuracy</dt><dd className="tabular-nums">{number(row.sealed_accuracy * 100, 1)}%</dd></div>}
        {row.inference_setting && <div><dt className="font-semibold">Tested configuration</dt><dd className="bh-muted [overflow-wrap:anywhere]">{row.inference_setting}</dd></div>}
        {row.prior_exposure && <div><dt className="font-semibold">Exposure / timing context</dt><dd className="bh-muted">{row.prior_exposure}</dd></div>}
        {typeof row.note === 'string' && row.note && <div><dt className="font-semibold">Measurement note</dt><dd className="bh-muted">{row.note}</dd></div>}
      </dl>
      <p className="bh-muted mt-4 text-sm">Artifact built {artifact.built_utc}. Scores and ranks can change in a later release. See the <Link href={`${board}#${found.revision === 'v0.2.0' ? 'imagejev-v02-method-heading' : 'method-heading'}`} className="text-accent underline">method notes</Link>.</p>
    </section>
  </>;
}
