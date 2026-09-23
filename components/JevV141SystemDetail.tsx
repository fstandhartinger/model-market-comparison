import Link from 'next/link';
import { JevBenchRelatedLinks } from './JevBenchRelatedLinks';
import { costBasisLabel, one, opennessLabel, percent, usdPerThousand, type SeoRow } from './JevBenchSeoBlocks';

export function JevV141SystemDetail({ row, revision, generated }: { row: SeoRow; revision: string; generated: string }) {
  const path = `/jev-models/${encodeURIComponent(row.key)}`;
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

    <section className="bh-panel mt-6 p-5" aria-labelledby="jev-v141-system-summary">
      <h2 id="jev-v141-system-summary" className="text-xl font-semibold">Published result</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><dt className="bh-muted text-sm">Rank</dt><dd className="text-2xl font-semibold tabular-nums">{row.rank}</dd></div>
        <div><dt className="bh-muted text-sm">JevBench Score</dt><dd className="text-2xl font-semibold tabular-nums">{one(row.jevbench_score)}</dd></div>
        <div><dt className="bh-muted text-sm">Sealed-set accuracy</dt><dd className="text-xl font-semibold tabular-nums">{percent(row.sealed_accuracy)}</dd></div>
        <div><dt className="bh-muted text-sm">Cost</dt><dd className="text-xl font-semibold">{usdPerThousand(row.cost?.usd_per_1000)} <span className="bh-muted text-sm">({costBasisLabel(row.cost?.kind)})</span></dd></div>
      </dl>
    </section>

    <section className="mt-8" aria-labelledby="jev-v141-system-axes">
      <h2 id="jev-v141-system-axes" className="text-xl font-semibold">Published axes</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['intelligence', 'calibration', 'speed', 'cost'] as const).map((axis) => <div className="bh-panel p-4" key={axis}>
          <dt className="bh-muted text-sm capitalize">{axis}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{one(row.axes[axis])}</dd>
        </div>)}
      </dl>
    </section>

    <section className="bh-panel mt-8 p-5" aria-labelledby="jev-v141-system-evidence">
      <h2 id="jev-v141-system-evidence" className="text-xl font-semibold">Availability and evidence</h2>
      <dl className="mt-3 space-y-3 text-sm">
        <div><dt className="font-semibold">Openness</dt><dd className="bh-muted">{opennessLabel(row)}</dd></div>
        <div><dt className="font-semibold">License note</dt><dd className="bh-muted">{row.licence || 'Unknown in the published row.'}</dd></div>
        <div><dt className="font-semibold">Cost evidence</dt><dd className="bh-muted">{costBasisLabel(row.cost?.kind)}; the board’s row disclosure contains the published basis.</dd></div>
        {row.endpoint_condition && <div><dt className="font-semibold">Endpoint condition</dt><dd className="bh-muted">{row.endpoint_condition}</dd></div>}
        {row.repo && <div><dt className="font-semibold">Published source</dt><dd><a className="text-accent underline" href={row.repo}>{row.repo}</a></dd></div>}
      </dl>
    </section>

    <p className="bh-muted mt-8 max-w-3xl text-sm">Read the <Link className="text-accent underline" href="/jev-models">full board</Link> and <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench/blob/v1.4.1/docs/METHOD-v1.4.md">published method</a>. The overall score is a composite, not raw accuracy.</p>
  </>;
}
