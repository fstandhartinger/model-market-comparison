import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readJevbenchV12, jevbenchV12View, type JevV12Row, type JevV12View } from '../../../lib/jevbench-v12.mjs';
import { previewMetadata } from '../../../lib/seo';

// CR-129 (2026-09-23): Google Trends shows readers searching individual JevBench system names
// (e.g. "semif", "laya model") directly — until now every one of them only existed as a row inside the
// single big /jev-models board. This gives each of the 52 systems its own indexable, statically generated
// page, built only from fields already published in the committed v1.2/v1.3 artifact (no new data, no
// claim beyond what the artifact states — see the HOLD on new JevBench rows/ranks/versions, which this
// does not touch).
const short = (d: string) => d.split(' (')[0].split(', formerly')[0];
const one = (v: number | null) => (v === null ? '—' : v.toFixed(1));
// Duplicated from components/JevModelsV12.tsx's usdText: that module is "use client", and Next.js treats every
// export of a client module as a client reference, so even this plain formatter cannot be called from a server
// component. $ per 1,000 decisions: four decimals below one cent so e.g. $0.0045 and $0.0092 stay distinguishable.
const usdText = (x: number) => `$${x.toFixed(x < 0.01 ? 4 : 3)}`;
const openLabel = (open: JevV12Row['open']) => open === 'yes' ? 'open (code and weights)' : open === 'weights' ? 'open weights' : 'closed / proprietary';
const costCaveat = (row: JevV12Row) => row.costKind === 'estimate' ? ' (estimated)' : row.costKind === 'announced' ? ' (announced price, not yet charged)' : '';

async function findRow(key: string): Promise<{ row: JevV12Row; view: JevV12View; all: JevV12Row[] } | null> {
  const view = jevbenchV12View(await readJevbenchV12());
  const all = [...view.ranked, ...view.honorable, ...view.partial];
  const row = all.find((r) => r.key === key);
  return row ? { row, view, all } : null;
}

/** One factual sentence built only from fields already in the row: main score, rank (or why not
 * ranked), open/self-hostable status and author, plus an optional one-clause comparison to Jev 1.13.0. */
function describeRow(row: JevV12Row, view: JevV12View, all: JevV12Row[]): string {
  const rankText = row.ranked && row.rank != null
    ? `ranks #${row.rank} of ${view.ranked.length} ranked systems with a JevBench ${view.revision} score of ${one(row.main)}`
    : `is not ranked on JevBench ${view.revision} (${row.notRankedBecause ?? 'listed, not ranked'}); its score is ${one(row.main)}`;
  const jevRow = row.key === 'jev-1.13.0' ? null : all.find((r) => r.key === 'jev-1.13.0') ?? null;
  const vsJev = jevRow ? (() => {
    const diff = row.main - jevRow.main;
    return ` That is ${one(Math.abs(diff))} points ${diff >= 0 ? 'ahead of' : 'behind'} Jev 1.13.0's ${one(jevRow.main)}.`;
  })() : '';
  return `${row.display} by ${row.author} (${openLabel(row.open)}) ${rankText}.${vsJev}`;
}

export async function generateStaticParams() {
  const view = jevbenchV12View(await readJevbenchV12());
  return [...view.ranked, ...view.honorable, ...view.partial].map((r) => ({ system: r.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ system: string }> }): Promise<Metadata> {
  const { system } = await params;
  const found = await findRow(decodeURIComponent(system));
  if (!found) return { title: 'System not found' };
  const { row, view, all } = found;
  const description = describeRow(row, view, all);
  const documentTitle = `${short(row.display)} — JevBench ${view.revision} score`;
  return previewMetadata({ path: `/jev-models/${row.key}`, documentTitle, title: documentTitle, description });
}

export default async function JevSystemPage({ params }: { params: Promise<{ system: string }> }) {
  const { system } = await params;
  const found = await findRow(decodeURIComponent(system));
  if (!found) notFound();
  const { row, view, all } = found;
  const jevRow = row.key === 'jev-1.13.0' ? null : all.find((r) => r.key === 'jev-1.13.0') ?? null;
  const description = describeRow(row, view, all);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `https://benchmarkheaven.com/jev-models/${row.key}#page`,
        url: `https://benchmarkheaven.com/jev-models/${row.key}`, name: `${row.display} — JevBench ${view.revision}`,
        description, dateModified: view.generated, isPartOf: { '@id': 'https://benchmarkheaven.com/#website' },
      },
      {
        '@type': 'BreadcrumbList', '@id': `https://benchmarkheaven.com/jev-models/${row.key}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://benchmarkheaven.com' },
          { '@type': 'ListItem', position: 2, name: 'Jev alternatives & benchmark', item: 'https://benchmarkheaven.com/jev-models' },
          { '@type': 'ListItem', position: 3, name: row.display, item: `https://benchmarkheaven.com/jev-models/${row.key}` },
        ],
      },
    ],
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <nav className="text-sm">
      <Link href="/jev-models" className="text-accent underline">← Back to the full JevBench leaderboard</Link>
    </nav>
    <header className="bh-page-head mt-3">
      <div className="bh-eyebrow">JevBench {view.revision} · one system</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{row.display}</h1>
      <p className="bh-muted mt-2 max-w-3xl">
        {row.author} · {row.licence} · {openLabel(row.open)} · <span data-bh-jev-system-cls>{row.cls}</span>
      </p>
    </header>

    <section className="bh-panel mt-6 max-w-3xl p-5" aria-labelledby="jev-system-score" data-bh-jev-system-score>
      <h2 id="jev-system-score" className="text-lg font-semibold">JevBench {view.revision} score</h2>
      <p className="mt-2 text-3xl font-bold tabular-nums">{one(row.main)}</p>
      {row.ranked && row.rank != null
        ? <p className="bh-muted mt-1">Rank #{row.rank} of {view.ranked.length} ranked systems.</p>
        : <p className="bh-muted mt-1" data-bh-jev-system-not-ranked>Not ranked{row.notRankedBecause ? ` — ${row.notRankedBecause}` : ''}. Listed as a {row.listing.replace('_', ' ')}.</p>}
      {jevRow && <p className="bh-muted mt-2 text-sm" data-bh-jev-system-vs-jev>
        {one(Math.abs(row.main - jevRow.main))} points {row.main >= jevRow.main ? 'ahead of' : 'behind'} Jev 1.13.0&apos;s {one(jevRow.main)}.
      </p>}
    </section>

    <section className="mt-6 max-w-3xl" aria-labelledby="jev-system-axes">
      <h2 id="jev-system-axes" className="text-lg font-semibold">Axes</h2>
      <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bh-panel p-3"><dt className="bh-muted text-xs">Intelligence</dt><dd className="text-xl font-semibold tabular-nums">{one(row.axes.intelligence)}</dd></div>
        <div className="bh-panel p-3"><dt className="bh-muted text-xs">Calibration</dt><dd className="text-xl font-semibold tabular-nums">{one(row.axes.calibration)}</dd></div>
        <div className="bh-panel p-3"><dt className="bh-muted text-xs">Speed</dt><dd className="text-xl font-semibold tabular-nums">{one(row.axes.speed)}</dd></div>
        <div className="bh-panel p-3"><dt className="bh-muted text-xs">Cost</dt><dd className="text-xl font-semibold tabular-nums">{one(row.axes.cost)}</dd></div>
      </dl>
    </section>

    <section className="mt-6 max-w-3xl" aria-labelledby="jev-system-cost">
      <h2 id="jev-system-cost" className="text-lg font-semibold">Cost</h2>
      <p className="mt-1" data-bh-jev-system-usd>{usdText(row.usd)} per 1,000 decisions{costCaveat(row)}.</p>
    </section>

    {row.link && <p className="mt-6 max-w-3xl text-sm">
      <a href={row.link} target="_blank" rel="noopener noreferrer" className="text-accent underline" data-bh-jev-system-link>{row.link.replace(/^https:\/\//, '')}</a>
    </p>}

    <p className="bh-muted mt-8 max-w-3xl text-sm">
      See every JevBench {view.revision} system, method and scoring on the <Link href="/jev-models" className="text-accent underline">full leaderboard</Link>.
    </p>
  </>;
}
