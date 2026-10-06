import { jevRowArch, JEV_TYPE_LABEL } from '../../../components/jevTypes';
import { JevArchitectureBadge } from '../../../components/JevArchitecture';
import { BaseModelDisplay } from '../../../components/BaseModelDisplay';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readJevbenchV12, jevbenchV12View, type JevV12Row, type JevV12View } from '../../../lib/jevbench-v12.mjs';
import { readJevbenchV12Topics, jevbenchV12TopicsView, type JevTopicsView } from '../../../lib/jevbench-v12-topics.mjs';
import { JevPairRadar } from '../../../components/JevRadars';
import { JevAxisBand, JevScoreStrip, typeColour } from '../../../components/JevSystemCharts';
import { JevBenchRelatedLinks } from '../../../components/JevBenchRelatedLinks';
import { JevV141SystemDetail } from '../../../components/JevV141SystemDetail';
import type { JevV14System } from '../../../lib/jevbench-v14.mjs';
import { readJevbenchV1422, jevbenchV1422View } from '../../../lib/jevbench-v1422.mjs';
import { readJevbenchV1422WithFamilies } from '../../../lib/jevbench-v1422-families.mjs';
import { jevV14RowNote } from '../../../lib/jevbench-v14.mjs';
import { previewMetadata } from '../../../lib/seo';
import { jevSystemKeyFromSlug, jevSystemPath, jevSystemSlug } from '../../../lib/jev-system-slug.mjs';
import { isJevbenchV16ExcludedKey } from '../../../lib/jevbench-v16-public-scope.mjs';
import { readJevbenchSeoData } from '../../../lib/jevbench-seo.mjs';
import { readJevbenchA4ModelPages } from '../../../lib/jevbench-a4-model-pages.mjs';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { breadcrumbJsonLd, JevReleaseStamp, one as seoOne, usdPerThousand, costBasisLabel } from '../../../components/JevBenchSeoBlocks';
import { escapeJsonLd } from '../../../lib/jevbench-seo-jsonld.mjs';
import { SITE_URL } from '../../../lib/seo';
import { JevV15SystemDetail } from '../../../components/JevV15SystemDetail';
import { readJevbenchV157Release } from '../../../lib/jevbench-v15-release.mjs';

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
const typeLabel = (cls: string) => JEV_TYPE_LABEL[cls];
// F-167: one axis card's band — the system's value on 0–100 in its type colour, the reference's value as a tick.
const Band = ({ axis, row, reference }: { axis: 'intelligence' | 'calibration' | 'speed' | 'cost'; row: JevV12Row; reference: JevV12Row | null }) =>
  <JevAxisBand axis={axis} value={row.axes[axis] ?? 0} colour={typeColour(jevRowArch(row))}
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

async function findV142Row(key: string): Promise<{ row: JevV14System; view: { revision: string; generated: string; ranked: JevV14System[] }; note: string | null; sealedFamilyN: Record<string, number>; hardFamilyN: Record<string, number> } | null> {
  // CR-191: current system pages use v1.4.2.2 and its carried-forward family supplement.
  const result = await readJevbenchV1422WithFamilies();
  const view = jevbenchV1422View(result);
  const row = view.systems.find((candidate) => candidate.key === key);
  // readJevbenchV1422 validates the ranked rows' numeric fields before this narrow is applied.
  const hardFamilyN = (result.artifact.hard_dataset as { families?: Record<string, number> } | undefined)?.families ?? {};
  return row ? { row, view, note: jevV14RowNote((result.artifact as { footnotes?: Record<string, string> }).footnotes?.[key], row), sealedFamilyN: result.sealedFamilyN, hardFamilyN } : null;
}

async function findV157Addendum(key: string) {
  const { artifact } = await readJevbenchV157Release();
  const row = artifact.systems.find((candidate) => candidate.key === key && candidate.addendum !== null);
  return row ? { row, artifact } : null;
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

// CR-291: systems of the current JevBench release (and their dated history) render from the SEO data layer, which reads the
// release pointer in lib/jevbench-current.mjs, so the page never shows a frozen older release as current.
type SeoRow = Awaited<ReturnType<typeof readJevbenchSeoData>>['systems'][number];
type A4Page = { row: unknown; ranked: boolean; compositeRank: number | null; capabilityRank: number | null; capabilityOutside: string | null;
  nRanked: number; nCapability: number; nItems: number; measuredOn: string; round: string; offsets: { I: number; C: number }; subset?: string; full: boolean };
const a4CostLabel = (kind: string | undefined) => kind === 'estimate' ? 'estimated' : 'public tariff';
// Review 6 Oct 2026: the 17 API rows re-run on A4 ∪ P (v1.7.7) show the API-board figures; the older figure moves to a labelled block.
function A4System({ data, page, previous }: { data: Awaited<ReturnType<typeof readJevbenchSeoData>>; page: A4Page; previous?: SeoRow }) {
  const s = page.row as any;
  const url = `${SITE_URL}${jevSystemPath(s.key)}`;
  const capability = (s.axes.intelligence + s.axes.calibration) / 2;
  const json = {'@context':'https://schema.org','@graph':[
    {'@type':'SoftwareApplication',name:s.display,applicationCategory:'AI model',url}, breadcrumbJsonLd(jevSystemPath(s.key),s.display)]};
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:escapeJsonLd(json)}}/>
    <nav><Link href="/jev-models" className="text-accent underline">Back to JevBench</Link></nav>
    <header className="bh-page-head mt-3"><h1 className="text-3xl font-bold">{s.display}</h1><JevReleaseStamp data={data}/>
      <p className="mt-3" data-bh-jev-a4-capability>Capability {seoOne(capability)} · {page.ranked ? <>API offering, ranked on the <Link href="/jev-models/api" className="text-accent underline">API leaderboard</Link>{page.capabilityRank != null ? ` · Capability rank #${page.capabilityRank} of ${page.nCapability} within the Jev-class caps` : ` · outside the Jev-class caps (${page.capabilityOutside}), below the Capability ranking`}</> : <>API offering, listed and never ranked (wrapper), see the <Link href="/jev-models/api" className="text-accent underline">API leaderboard</Link></>}</p>
      <p className="bh-muted mt-2">{page.full
        ? <>Measured {page.measuredOn} on the full v1.6.1 set ({page.nItems} items), scored like the other full-set API rows, not equated.</>
        : <>Measured {page.measuredOn} on {page.subset ?? 'A4'} ∪ P, {page.nItems} items, equated (+{page.offsets.I.toFixed(2)} I / +{page.offsets.C.toFixed(2)} C); round {page.round}.</>}</p>
      <p className="bh-muted">{previous?.licence ?? s.licence ?? 'Licence not stated'}</p>
    </header>
    <BaseModelDisplay systemKey={s.key} className="mt-2 block text-sm"/>
    <JevBenchRelatedLinks systemKey={s.key}/>
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{(['intelligence','calibration','speed','cost'] as const).map((axis) => <div className="bh-panel p-4" key={axis}><h2 className="capitalize">{axis}</h2><p className="text-2xl font-semibold">{seoOne(s.axes?.[axis])}</p></div>)}</section>
    <section className="bh-panel mt-6 p-5"><h2 className="font-semibold">Composite (secondary)</h2><p data-bh-jev-a4-composite>{seoOne(s.jevbench_score)} · {page.compositeRank == null ? 'Not ranked' : `Composite rank #${page.compositeRank} of ${page.nRanked} on the API leaderboard`}</p></section>
    <section className="bh-panel mt-6 p-5"><h2 className="font-semibold">Cost and measurement conditions</h2>
      <p data-bh-jev-a4-cost>{usdPerThousand(s.cost?.usd_per_1000)} ({a4CostLabel(s.cost?.kind)})</p><p className="bh-muted mt-2">{s.cost?.basis ?? 'Cost basis not published'}</p>
      <p className="mt-3">p50 latency: {seoOne(s.speed?.p50_s_adjusted ?? s.speed?.p50_s_raw)} s</p>
      <p className="bh-muted">{s.speed?.adjustment ?? 'Latency adjustment not stated'}</p>
    </section>
    {previous && <section className="bh-panel mt-6 p-5" data-bh-jev-a4-previous><h2 className="font-semibold">Previous measurement (v1.5.x, not comparable)</h2>
      <p>Capability {seoOne(previous.capability)} · composite {seoOne(previous.jevbench_score)} · cost {usdPerThousand(previous.cost?.usd_per_1000)} ({costBasisLabel(previous.cost?.kind)})</p>
      <p className="bh-muted mt-2">Last measured {previous.last_measured_on ?? 'date not published'}, measurement release {previous.measurement_revision}. Older method and scale; the current figures above replace it.</p></section>}
    {(previous?.source_url ?? previous?.repo ?? s.repo) && <p className="mt-4"><a className="text-accent underline" href={(previous?.source_url ?? previous?.repo ?? s.repo)!}>Published source</a></p>}
  </>;
}

function CurrentReleaseSystem({ data, row }: { data: Awaited<ReturnType<typeof readJevbenchSeoData>>; row: SeoRow }) {
  const url = `${SITE_URL}${jevSystemPath(row.key)}`;
  // Publish only the current sanitized presentation fields. No historical base-model overlay is copied.
  const price = row.cost?.usd_per_1000;
  const json = {'@context':'https://schema.org','@graph':[
    {'@type':'SoftwareApplication',name:row.display,applicationCategory:'AI model',url,
      ...(Number.isFinite(price) && price != null && price >= 0 && ['measured','announced'].includes(row.cost?.kind ?? '') ? {offers:{'@type':'Offer',price,priceCurrency:'USD',description:`${costBasisLabel(row.cost?.kind)} USD per 1,000 decisions. ${row.cost?.basis ?? ''}`}} : {})},
    breadcrumbJsonLd(jevSystemPath(row.key),row.display),
  ]};
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:escapeJsonLd(json)}}/>
    <nav><Link href="/jev-models" className="text-accent underline">Back to JevBench</Link></nav>
    <header className="bh-page-head mt-3"><h1 className="text-3xl font-bold">{row.display}</h1><JevReleaseStamp data={data}/>
      <p className="mt-3">Capability {seoOne(row.capability)} · {row.board === 'reference' ? 'Reference, not ranked' : row.board === 'api' ? <>API offering, ranked on the <Link href="/jev-models/api" className="text-accent underline">API leaderboard</Link></> : row.rank == null ? 'Not ranked in the current release' : `rank #${row.rank} of ${data.ranked.length} on the open-weights board`}</p>
      <p className="bh-muted mt-2">{row.not_ranked_because ?? row.capability_reasons?.join("; ")}</p>
      <p className="bh-muted mt-2">Last measured: {row.last_measured_on ?? 'date not published'} · measurement release: {row.measurement_revision}</p>
      <p className="bh-muted">{row.licence ?? 'Licence not stated'}</p>
    </header>
    <BaseModelDisplay systemKey={row.key} className="mt-2 block text-sm"/>
    <JevBenchRelatedLinks systemKey={row.key}/>
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{(['intelligence','calibration','speed','cost'] as const).map((axis) => <div className="bh-panel p-4" key={axis}><h2 className="capitalize">{axis}</h2><p className="text-2xl font-semibold">{seoOne(row.axes?.[axis])}</p></div>)}</section>
    <section className="bh-panel mt-6 p-5"><h2 className="font-semibold">Composite (secondary)</h2><p>{seoOne(row.jevbench_score)} · {row.composite_rank == null || row.board !== 'open' ? 'Not ranked on this board' : `Composite rank #${row.composite_rank}`}</p></section>
    <section className="bh-panel mt-6 p-5"><h2 className="font-semibold">Cost and measurement conditions</h2>
      <p>{usdPerThousand(price)} ({costBasisLabel(row.cost?.kind)})</p><p className="bh-muted mt-2">{row.cost?.basis ?? 'Cost basis not published'}</p>
      <p className="mt-3">p50 latency: {seoOne(row.speed?.p50_s_adjusted ?? row.speed?.p50_s_raw)} s</p>
      <p className="bh-muted">{row.speed?.adjustment ?? 'Latency adjustment not stated'}</p>
      <p className="bh-muted">{row.speed?.hardware ?? row.endpoint_condition ?? row.speed?.measured_where ?? 'Setup not stated'}</p>
    </section>
    {(row.source_url ?? row.repo) && <p className="mt-4"><a className="text-accent underline" href={(row.source_url ?? row.repo)!}>Published source</a></p>}
  </>;
}

export async function generateStaticParams() {
  const data = await readJevbenchSeoData();
  const view = jevbenchV12View(await readJevbenchV12());
  const existing = [...view.ranked, ...view.honorable, ...view.partial].map((r) => ({ system: jevSystemSlug(r.key) }));
  const current = jevbenchV1422View(await readJevbenchV1422()).systems.map((r) => ({ system: jevSystemSlug(r.key) }));
  const existingKeys = new Set([...existing, ...current].map(({ system }) => system));
  const latest = await readJevbenchV157Release();
  const addenda = latest.artifact.systems
    .filter((row) => row.addendum !== null && !existingKeys.has(jevSystemSlug(row.key)))
    .map((row) => ({ system: jevSystemSlug(row.key) }));
  // CR-291: the current release (and its dated history) plus the comparison slugs; older rows stay reachable as before.
  const a4 = [...(await readJevbenchA4ModelPages()).keys()].map((key) => ({ system: jevSystemSlug(key) }));
  return [...data.modelKeys.map((key) => ({ system: jevSystemSlug(key) })), ...a4, ...data.comparisons.map((pair) => ({ system: pair.slug })),
    ...current, ...existing, ...addenda].filter(({ system }, index, rows) => rows.findIndex((r) => r.system === system) === index && !isJevbenchV16ExcludedKey(system));
}

export async function generateMetadata({ params }: { params: Promise<{ system: string }> }): Promise<Metadata> {
  const { system } = await params;
  const pair = (await readJevbenchSeoData()).comparisons.find((p) => p.slug === system);
  if (pair) return jevIntentMetadata({ path: `/jev-models/${pair.slug}`, title: `Jev vs ${pair.label} — JevBench by Benchmark Heaven`, description: `Published Jev-compatible model comparison from the current JevBench release.`, keywords: ['JevBench'] });
  const key = jevSystemKeyFromSlug(decodeURIComponent(system));
  const current = await findV142Row(key);
  const addendum = current ? null : await findV157Addendum(key);
  const found = current || addendum ? null : await findRow(key);
  const seo = (await readJevbenchSeoData()).systems.find((r) => r.key === key);
  const a4 = ((await readJevbenchA4ModelPages()) as Map<string, A4Page>).get(key)?.row as typeof seo;
  const row = found?.row ?? current?.row ?? addendum?.row ?? seo ?? a4;
  if (!row) return { title: 'System not found' };
  const title = `${short(row.display)} — JevBench by Benchmark Heaven`;
  const description = `Explore the ${short(row.display)} configuration evaluated across intelligence, calibration, speed, and cost.`;
  return previewMetadata({ path: jevSystemPath(row.key), documentTitle: title, title, description });
}

export default async function JevSystemPage({ params }: { params: Promise<{ system: string }> }) {
  const { system } = await params;
  const data = await readJevbenchSeoData();
  const pair = data.comparisons.find((p) => p.slug === system);
  if (pair) return <JevComparisonPage rivalKey={pair.key} label={pair.label} path={`/jev-models/${pair.slug}`} />;
  const key = jevSystemKeyFromSlug(decodeURIComponent(system));
  const seoRow = data.systems.find((r) => r.key === key) ?? data.historical.find((r) => r.key === key);
  const a4Page = (await readJevbenchA4ModelPages() as Map<string, A4Page>).get(key);
  if (a4Page) return <A4System data={data} page={a4Page} previous={seoRow} />;
  if (seoRow) return <CurrentReleaseSystem data={data} row={seoRow} />;
  const current = await findV142Row(key);
  if (current) return <JevV141SystemDetail row={current.row} ranked={current.view.ranked} revision={current.view.revision} generated={current.view.generated} note={current.note} sealedFamilyN={current.sealedFamilyN} hardFamilyN={current.hardFamilyN} />;
  const addendum = await findV157Addendum(key);
  if (addendum) return <JevV15SystemDetail artifact={addendum.artifact} row={addendum.row} />;
  const found = await findRow(key);
  if (!found) {
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
        '@type': 'WebPage', '@id': `https://benchmarkheaven.com${jevSystemPath(row.key)}#page`,
        url: `https://benchmarkheaven.com${jevSystemPath(row.key)}`, name: `${row.display} — JevBench ${view.revision}`,
        description, dateModified: view.generated, isPartOf: { '@id': 'https://benchmarkheaven.com/#website' },
      },
      {
        '@type': 'BreadcrumbList', '@id': `https://benchmarkheaven.com${jevSystemPath(row.key)}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://benchmarkheaven.com' },
          { '@type': 'ListItem', position: 2, name: 'Jev alternatives & benchmark', item: 'https://benchmarkheaven.com/jev-models' },
          { '@type': 'ListItem', position: 3, name: row.display, item: `https://benchmarkheaven.com${jevSystemPath(row.key)}` },
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
        {row.author} · {row.licence} · {openLabel(row.open)} · <span data-bh-jev-system-cls={row.cls}>{typeLabel(jevRowArch(row))}</span>
      </p>
    </header>
    <JevArchitectureBadge row={row} />
    <BaseModelDisplay systemKey={row.key} className="mt-2 block text-sm" />
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
