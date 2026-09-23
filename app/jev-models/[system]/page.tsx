import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readJevbenchV12, jevbenchV12View, type JevV12Row, type JevV12View } from '../../../lib/jevbench-v12.mjs';
import { readJevbenchV12Topics, jevbenchV12TopicsView, type JevTopicsView } from '../../../lib/jevbench-v12-topics.mjs';
import { JevPairRadar } from '../../../components/JevRadars';
import { JevAxisBand, JevScoreStrip, typeColour } from '../../../components/JevSystemCharts';
import { JevBenchRelatedLinks } from '../../../components/JevBenchRelatedLinks';
import { JevV141SystemDetail } from '../../../components/JevV141SystemDetail';
import { readJevbenchV141, jevbenchV141View } from '../../../lib/jevbench-v141.mjs';
import type { SeoRow } from '../../../components/JevBenchSeoBlocks';
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
// F-168 (Fable pass 32): a system type is a data key (`jev-service`, `small-tool-model`); the reader gets the board's own words for it.
// Same map as components/JevRadars.tsx (a client module, so not importable here — see usdText above).
const TYPE_LABEL: Record<string, string> = { jev: 'Jev', 'jev-rebuild': 'Jev rebuild', 'llm-baseline': 'instruction model', 'small-tool-model': 'small tool-calling model', 'jev-service': 'service built on Jev', classifier: 'zero-shot classifier', 'decision-api': 'closed decision API', reranker: 'reranker' };
const typeLabel = (cls: string) => TYPE_LABEL[cls] ?? cls.replace(/-/g, ' ');
// F-167: one axis card's band — the system's value on 0–100 in its type colour, the reference's value as a tick.
const Band = ({ axis, row, reference }: { axis: 'intelligence' | 'calibration' | 'speed' | 'cost'; row: JevV12Row; reference: JevV12Row | null }) =>
  <JevAxisBand axis={axis} value={row.axes[axis] ?? 0} colour={typeColour(row.cls)}
    reference={reference?.axes[axis] ?? null} referenceName={short(reference?.display ?? '')} />;
// F-168: the not-ranked status is one sentence — the listing kind, "not ranked", and the artifact's reason once. The artifact's
// `notRankedBecause` already ends in "— listed, not ranked" for an honorable mention; that clause is the sentence's own and is not repeated.
const notRankedReason = (row: JevV12Row) => (row.notRankedBecause ?? '').replace(/\s*[—–-]\s*listed,\s*not ranked\.?\s*$/i, '').replace(/\.$/, '');
function statusSentence(row: JevV12Row, view: JevV12View): string {
  if (row.ranked && row.rank != null) return `Rank #${row.rank} of ${view.ranked.length} ranked systems.`;
  const reason = notRankedReason(row);
  if (row.listing === 'honorable_mention') return `Honorable mention, not ranked — ${reason || "it runs another entrant's model"}.`;
  return `Partial run, not ranked — ${reason || 'it missed a tier'}.`;
}

async function findRow(key: string): Promise<{ row: JevV12Row; view: JevV12View; all: JevV12Row[]; topics: JevTopicsView } | null> {
  const v12 = await readJevbenchV12();
  const view = jevbenchV12View(v12);
  const all = [...view.ranked, ...view.honorable, ...view.partial];
  const row = all.find((r) => r.key === key);
  if (!row) return null;
  // F-167: the topic radar reads the same artifact the hub does — no new data, no recomputation.
  return { row, view, all, topics: jevbenchV12TopicsView(await readJevbenchV12Topics(v12.artifact)) };
}

async function findV141Row(key: string): Promise<{ row: SeoRow; view: { revision: string; generated: string } } | null> {
  const result = await readJevbenchV141();
  const view = jevbenchV141View(result);
  const row = view.ranked.find((candidate) => candidate.key === key);
  // readJevbenchV141 validates the ranked rows' numeric fields before this narrow is applied.
  return row ? { row: row as SeoRow, view } : null;
}

/** F-167: what this system's number is read against — Jev 1.13.0 everywhere, and on Jev's own page the
 *  rank-2 system, because a reference identical to the point would say nothing. An unranked listing is
 *  still drawn against Jev: it is not compared in words (F-168), but the reader still needs the scale. */
const referenceRow = (row: JevV12Row, view: JevV12View, all: JevV12Row[]): JevV12Row | null =>
  (row.key === 'jev-1.13.0' ? view.ranked.find((r) => r.rank === 2) : all.find((r) => r.key === 'jev-1.13.0')) ?? null;

/** One factual sentence built only from fields already in the row: main score, rank (or why not
 * ranked), open/self-hostable status and author, plus an optional one-clause comparison to Jev 1.13.0. */
function describeRow(row: JevV12Row, view: JevV12View, all: JevV12Row[]): string {
  const rankText = row.ranked && row.rank != null
    ? `ranks #${row.rank} of ${view.ranked.length} ranked systems with a JevBench ${view.revision} score of ${one(row.main)}`
    : `is listed on JevBench ${view.revision} with a score of ${one(row.main)} but not ranked (${row.listing === 'honorable_mention' ? 'honorable mention' : 'partial run'}${notRankedReason(row) ? `: ${notRankedReason(row)}` : ''})`;
  // F-168: the board compares ranked systems only; an unranked listing gets no "ahead of / behind Jev" clause.
  const jevRow = !row.ranked || row.key === 'jev-1.13.0' ? null : all.find((r) => r.key === 'jev-1.13.0') ?? null;
  const vsJev = jevRow ? (() => {
    const diff = row.main - jevRow.main;
    return ` That is ${one(Math.abs(diff))} points ${diff >= 0 ? 'ahead of' : 'behind'} Jev 1.13.0's ${one(jevRow.main)}.`;
  })() : '';
  return `${row.display} by ${row.author} (${openLabel(row.open)}) ${rankText}.${vsJev}`;
}

export async function generateStaticParams() {
  const view = jevbenchV12View(await readJevbenchV12());
  const existing = [...view.ranked, ...view.honorable, ...view.partial].map((r) => ({ system: r.key }));
  const existingKeys = new Set(existing.map(({ system }) => system));
  const publishedTopFive = jevbenchV141View(await readJevbenchV141()).ranked.slice(0, 5).map((r) => r.key);
  const newTopFive = publishedTopFive.filter((system) => !existingKeys.has(system)).map((system) => ({ system }));
  return [...existing, ...newTopFive];
}

export async function generateMetadata({ params }: { params: Promise<{ system: string }> }): Promise<Metadata> {
  const { system } = await params;
  const key = decodeURIComponent(system);
  const found = await findRow(key);
  const current = found ? null : await findV141Row(key);
  const row = found?.row ?? current?.row;
  if (!row) return { title: 'System not found' };
  const title = `${short(row.display)} — JevBench by Benchmark Heaven`;
  const description = `Explore the ${short(row.display)} configuration evaluated across intelligence, calibration, speed, and cost.`;
  return previewMetadata({ path: `/jev-models/${encodeURIComponent(row.key)}`, documentTitle: title, title, description });
}

export default async function JevSystemPage({ params }: { params: Promise<{ system: string }> }) {
  const { system } = await params;
  const key = decodeURIComponent(system);
  const found = await findRow(key);
  if (!found) {
    const current = await findV141Row(key);
    if (current && ['jevk5-v02', 'hopper'].includes(key)) {
      return <JevV141SystemDetail row={current.row} revision={current.view.revision} generated={current.view.generated} />;
    }
    notFound();
  }
  const { row, view, all, topics } = found;
  const jevRow = !row.ranked || row.key === 'jev-1.13.0' ? null : all.find((r) => r.key === 'jev-1.13.0') ?? null;
  const reference = referenceRow(row, view, all);
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
        {row.author} · {row.licence} · {openLabel(row.open)} · <span data-bh-jev-system-cls={row.cls}>{typeLabel(row.cls)}</span>
      </p>
    </header>
    <JevBenchRelatedLinks systemKey={row.key} />

    {/* F-167 (Fable pass 32): two columns at lg+ — the number, its place on the board's scale and the four
        axes on the left, accuracy by topic on the right — so the page reaches the page width instead of
        stopping at a 3xl column. At 390 the order is unchanged, so the number and its strip stay in the
        first screenful. */}
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-6">
        <section className="bh-panel p-5" aria-labelledby="jev-system-score" data-bh-jev-system-score>
          <h2 id="jev-system-score" className="text-lg font-semibold">JevBench {view.revision} score</h2>
          <p className="mt-2 text-3xl font-bold tabular-nums">{one(row.main)}</p>
          {row.ranked && row.rank != null
            ? <p className="bh-muted mt-1">{statusSentence(row, view)}</p>
            : <p className="bh-muted mt-1" data-bh-jev-system-not-ranked>{statusSentence(row, view)}</p>}
          {jevRow && <p className="bh-muted mt-2 text-sm" data-bh-jev-system-vs-jev>
            {one(Math.abs(row.main - jevRow.main))} points {row.main >= jevRow.main ? 'ahead of' : 'behind'} Jev 1.13.0&apos;s {one(jevRow.main)}.
          </p>}
          <JevScoreStrip row={row} ranked={view.ranked} reference={reference} />
        </section>

        <section aria-labelledby="jev-system-axes">
          <h2 id="jev-system-axes" className="text-lg font-semibold">Axes</h2>
          <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {/* F-167: each card keeps its number and gains the 22 px band (F-79) on 0–100, with the reference's
                value as a tick. The cards stay written out rather than looped: F-168's calibration wording is
                pinned at the source, and a loop would hide it behind a variable. */}
            <div className="bh-panel p-3"><dt className="bh-muted text-xs">Intelligence</dt><dd className="text-xl font-semibold tabular-nums">{one(row.axes.intelligence)}<Band axis="intelligence" row={row} reference={reference} /></dd></div>
            {/* F-168: a label-only system has no calibration; the board's row says so in words ("none (label only)"), and so does this card. F-84: it draws no band. */}
            <div className="bh-panel p-3"><dt className="bh-muted text-xs">Calibration</dt>{row.axes.calibration === null
              ? <dd className="text-xl font-semibold tabular-nums" title={row.calibrationNote ?? undefined} data-bh-jev-system-no-cal>none <span className="bh-muted text-xs font-normal">(label only)</span></dd>
              : <dd className="text-xl font-semibold tabular-nums">{one(row.axes.calibration)}<Band axis="calibration" row={row} reference={reference} /></dd>}</div>
            <div className="bh-panel p-3"><dt className="bh-muted text-xs">Speed</dt><dd className="text-xl font-semibold tabular-nums">{one(row.axes.speed)}<Band axis="speed" row={row} reference={reference} /></dd></div>
            <div className="bh-panel p-3"><dt className="bh-muted text-xs">Cost</dt><dd className="text-xl font-semibold tabular-nums">{one(row.axes.cost)}<Band axis="cost" row={row} reference={reference} /></dd></div>
          </dl>
        </section>

        <section aria-labelledby="jev-system-cost">
          <h2 id="jev-system-cost" className="text-lg font-semibold">Cost</h2>
          <p className="mt-1" data-bh-jev-system-usd>{usdText(row.usd)} per 1,000 decisions{costCaveat(row)}.</p>
        </section>
      </div>

      {reference && <section className="min-w-0" aria-labelledby="jev-system-topics">
        <h2 id="jev-system-topics" className="text-lg font-semibold">Accuracy by topic <span className="bh-muted text-[12px] font-normal">— not part of the score</span></h2>
        <JevPairRadar a={row} b={reference} topics={topics} />
      </section>}
    </div>

    {row.link && <p className="mt-6 max-w-3xl text-sm">
      <a href={row.link} target="_blank" rel="noopener noreferrer" className="text-accent underline" data-bh-jev-system-link>{row.link.replace(/^https:\/\//, '')}</a>
    </p>}

    <p className="bh-muted mt-8 max-w-3xl text-sm">
      See every JevBench {view.revision} system, method and scoring on the <Link href="/jev-models" className="text-accent underline">full leaderboard</Link>.
    </p>
  </>;
}
