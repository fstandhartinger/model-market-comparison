import Link from 'next/link';
import { JevBenchRelatedLinks } from './JevBenchRelatedLinks';
import { JevCompareV14, type JevCompareRow } from './JevCompareV14';
import { JevAxisBand, typeColour } from './JevSystemCharts';
import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { costBasisLabel, one, percent, usdPerThousand } from './JevBenchSeoBlocks';

const short = (value: string) => value.split(' (')[0].split(', formerly')[0];
const axisKeys = ['intelligence', 'calibration', 'speed', 'cost'] as const;
const openness = (row: JevV14System) => row.open === 'yes' ? 'Code and weights marked open in the published row' : row.open === 'weights' ? 'Weights marked open in the published row' : row.open === 'no' ? 'Marked closed in the published row' : 'Unknown in the published row';

function ScoreStrip({ row, ranked }: { row: JevV14System; ranked: JevV14System[] }) {
  const reference = row.key === 'jev-1.13.0' ? ranked.find((r) => r.rank === 2) : ranked.find((r) => r.key === 'jev-1.13.0');
  const score = row.jevbench_score ?? 0;
  return <figure className="mt-4" data-bh-jev-system-strip={row.key}>
    <div className="relative h-8 w-full min-w-[300px]">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[rgb(var(--line))]" aria-hidden="true" />
      {[0, 25, 50, 75, 100].map((tick) => <span key={tick} aria-hidden="true" style={{ left: `${tick}%` }} className="absolute top-1/2 h-3.5 w-px -translate-x-1/2 -translate-y-1/2 bg-[rgb(var(--line))]" />)}
      {ranked.map((peer) => <span key={peer.key} title={`${short(peer.display)} · ${one(peer.jevbench_score)}`} style={{ left: `${Math.max(0, Math.min(100, peer.jevbench_score ?? 0))}%` }} className="absolute top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-[var(--muted)] opacity-40" />)}
      {reference && <span title={`${short(reference.display)} · ${one(reference.jevbench_score)}`} style={{ left: `${reference.jevbench_score ?? 0}%` }} className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[var(--text)] opacity-75" />}
      <span title={`${short(row.display)} · ${one(row.jevbench_score)}`} style={{ left: `${score}%`, background: row.ranked ? typeColour(row.class) : 'transparent', boxShadow: row.ranked ? undefined : 'inset 0 0 0 2px var(--muted)' }} className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--surface)]" />
    </div>
    <div className="relative mt-0.5 h-4 w-full" aria-hidden="true">{[0, 25, 50, 75, 100].map((tick) => <span key={tick} style={{ left: `${tick}%`, transform: tick === 0 ? 'none' : tick === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }} className="bh-muted absolute text-[11px] tabular-nums">{tick}</span>)}</div>
    <figcaption className="bh-muted mt-1 text-[12px]">{row.ranked ? `Where it sits among the ${ranked.length} ranked systems.` : 'Shown, not ranked.'}{reference ? ` The marked tick is ${short(reference.display)} (${one(reference.jevbench_score)}).` : ''}</figcaption>
  </figure>;
}

function compareRow(row: JevV14System): JevCompareRow {
  const tiers = (row.tiers ?? {}) as Record<string, number | null>;
  const axes = row.axes ?? { intelligence: null, calibration: null, speed: null, cost: null };
  const hard = (row.hard as { by_family?: Record<string, { accuracy: number | null; n: number }> } | null)?.by_family ?? null;
  const sealed = (row.sealed_aggregate as { by_family?: Record<string, number | null> } | null)?.by_family ?? null;
  return { key: row.key, name: short(row.display), cls: row.class, rank: row.rank, listing: row.listing, score: row.jevbench_score, axes, tiers: { easy: tiers.easy ?? null, standard: tiers.standard ?? null, judge: tiers.judge ?? null, hard: tiers.hard ?? null, sealed: row.sealed_accuracy }, hard, sealed };
}

export function JevV141SystemDetail({ row, revision, generated, ranked }: { row: JevV14System; revision: string; generated: string; ranked: JevV14System[] }) {
  const path = `/jev-models/${encodeURIComponent(row.key)}`;
  const axes = row.axes ?? { intelligence: null, calibration: null, speed: null, cost: null };
  const description = `Published ${revision} aggregate detail for ${row.display}, including its JevBench Score, axes, accuracy aggregates, cost evidence and openness fields.`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `https://benchmarkheaven.com${path}#page`,
        url: `https://benchmarkheaven.com${path}`, name: `${row.display} — JevBench by Benchmark Heaven`,
        description, dateModified: generated, isPartOf: { '@id': 'https://benchmarkheaven.com/#website' },
      },
      {
        '@type': 'BreadcrumbList', '@id': `https://benchmarkheaven.com${path}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://benchmarkheaven.com' },
          { '@type': 'ListItem', position: 2, name: 'JevBench by Benchmark Heaven', item: 'https://benchmarkheaven.com/jev-models' },
          { '@type': 'ListItem', position: 3, name: row.display, item: `https://benchmarkheaven.com${path}` },
        ],
      },
    ],
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <nav className="text-sm"><Link href="/jev-models" className="text-accent underline">← Back to the full JevBench leaderboard</Link></nav>
    <header className="bh-page-head mt-3">
      <div className="bh-eyebrow">JevBench by Benchmark Heaven · {revision} · individual system</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{row.display}</h1>
      <p className="bh-muted mt-2 max-w-3xl">This detail uses the public, hash-checked {revision} aggregate. Scores and ranks can change when a new release is published; the page preview remains name-only.</p>
      <JevBenchRelatedLinks systemKey={row.key} />
    </header>

    <section className="bh-panel mt-6 p-5" aria-labelledby="jev-v141-system-summary" data-bh-jev-system-score>
      <h2 id="jev-v141-system-summary" className="text-xl font-semibold">JevBench {revision} score</h2>
      <p className="mt-2 text-3xl font-bold tabular-nums">{one(row.jevbench_score)}</p>
      <p className="bh-muted mt-1">{row.ranked && row.rank != null ? `Rank #${row.rank} of ${ranked.length} ranked systems.` : `${row.listing === 'honorable_mention' ? 'Honorable mention' : 'Partial run'}, not ranked — ${row.not_ranked_because ?? 'the published run is incomplete'}.`}</p>
      {row.ranked && row.rank != null && row.key !== 'jev-1.13.0' && ranked[0] && <p className="bh-muted mt-2 text-sm">{one(Math.abs(row.jevbench_score! - ranked[0].jevbench_score!))} points {row.jevbench_score! >= ranked[0].jevbench_score! ? 'ahead of' : 'behind'} Jev 1.13.0&apos;s {one(ranked[0].jevbench_score)}.</p>}
      <ScoreStrip row={row} ranked={ranked} />
    </section>

    <section className="mt-8" aria-labelledby="jev-v141-system-axes">
      <h2 id="jev-v141-system-axes" className="text-xl font-semibold">Published axes</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {axisKeys.map((axis) => <div className="bh-panel p-4" key={axis}>
          <dt className="bh-muted text-sm capitalize">{axis}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{one(axes[axis])}{axes[axis] != null && <JevAxisBand axis={axis} value={axes[axis]!} colour={typeColour(row.class)} reference={ranked.find((r) => r.key === 'jev-1.13.0')?.axes?.[axis] ?? null} referenceName="Jev 1.13.0" />}</dd>
        </div>)}
      </dl>
    </section>

    <section className="bh-panel mt-8 p-4 sm:p-5" aria-labelledby="jev-v141-system-accuracy" data-bh-jev-system-radar>
      <JevCompareV14 rows={[row, ...(ranked[0]?.key === row.key ? ranked.slice(1, 2) : [ranked[0]])].map(compareRow)} sealedDecisions={308} hardDecisions={47} fixedPair heading="Accuracy per tier, incl. sealed" />
    </section>

    <section className="bh-panel mt-8 p-5" aria-labelledby="jev-v141-system-evidence">
      <h2 id="jev-v141-system-evidence" className="text-xl font-semibold">Availability and evidence</h2>
      <dl className="mt-3 space-y-3 text-sm">
        <div><dt className="font-semibold">Openness</dt><dd className="bh-muted">{openness(row)}</dd></div>
        <div><dt className="font-semibold">License note</dt><dd className="bh-muted">{row.licence || 'Unknown in the published row.'}</dd></div>
        <div><dt className="font-semibold">Cost evidence</dt><dd className="bh-muted">{costBasisLabel(row.cost?.kind)}; the board’s row disclosure contains the published basis.</dd></div>
        {row.endpoint_condition && <div><dt className="font-semibold">Endpoint condition</dt><dd className="bh-muted">{row.endpoint_condition}</dd></div>}
        {row.repo && <div><dt className="font-semibold">Published source</dt><dd><a className="text-accent underline" href={row.repo}>{row.repo}</a></dd></div>}
      </dl>
    </section>

    <p className="bh-muted mt-8 max-w-3xl text-sm">Read the <Link className="text-accent underline" href="/jev-models">full board</Link> and <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench/blob/v1.4.1/docs/METHOD-v1.4.md">published method</a>. The overall score is a composite, not raw accuracy.</p>
  </>;
}
