import type { Metadata } from 'next';
import Link from 'next/link';
import { readJevbenchSeoData } from '../../../lib/jevbench-seo.mjs';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
import { JevBenchRankingTable } from '../../../components/JevBenchRankingTable';
import { DatasetFaqJsonLd, JevFaq, JevIntentLinks, JevReleaseStamp, one, usdPerThousand, costBasisLabel } from '../../../components/JevBenchSeoBlocks';
import { jevSystemPath } from '../../../lib/jev-system-slug.mjs';

const PATH = '/jev-models/alternatives';
const DE_PATH = '/de/jev-models/alternativen';
export async function generateMetadata(): Promise<Metadata> {
  const data = await readJevbenchSeoData();
  return jevIntentMetadata({path: PATH, title: `Best Jev alternatives (${data.month}): ${data.systems.length} models measured on JevBench`,
    description: `Compare ${data.systems.length} measured Jev-class models in ${data.month}: Capability, Intelligence, Calibration, price, latency and open-weight evidence.`, keywords: ['jev alternatives', 'best Jev alternative', 'JevBench'],
    languages: {en: PATH, de: DE_PATH, 'x-default': PATH}});
}
export default async function JevAlternativesPage() {
  const data = await readJevbenchSeoData();
  const bestOpen = data.openWeightAlternatives.find((r) => r.capability_eligible);
  const faq = [
    {question: 'What does JevBench compare?', answer: `JevBench ${data.artifact.revision} measures Jev-class decision models across Intelligence, Calibration, Speed and Cost. Capability is the mean of Intelligence and Calibration within the official cost and median-latency caps; Composite is secondary.`},
    {question: 'Which open-weight Jev alternative scores highest?', answer: bestOpen ? `${bestOpen.display} has the highest eligible Capability Score among open-weight Jev-class alternatives: ${one(bestOpen.capability)}, rank #${bestOpen.rank}.` : 'No eligible open-weight alternative has published evidence in this release.'},
    {question: 'What counts as an open-weight alternative?', answer: 'The published row must have public code or weights, a licence and a source link. Unknown evidence remains unclassified. Terms can differ between code, adapters and weights.'},
    {question: 'Are prices and latency directly measured?', answer: 'Each row labels measured, estimated or self-reported announced pricing. Latency comes from the published benchmark conditions and may include a disclosed adjustment. Neither is a guarantee for a different workload.'},
  ];
  return <>
    <DatasetFaqJsonLd path={PATH} artifact={data.artifact} faq={faq} />
    <header className="bh-page-head"><h1 className="text-3xl font-bold">Best Jev alternatives ({data.month})</h1>
      <p className="bh-muted mt-3">{data.systems.length} measured Jev-class models; {data.ranked.length} eligible for the Capability ranking. Jev 1.13.0 is the reference. Wrappers and subsidised listings are excluded from the ranking.</p>
      <JevReleaseStamp data={data}/><JevIntentLinks current="alternatives"/>
      <p className="mt-2 text-sm"><Link className="text-accent underline" href={DE_PATH} hrefLang="de" lang="de">Deutsche Version: Jev-Alternativen im Vergleich</Link></p>
    </header>
    <section className="bh-panel mt-6 p-5"><h2 className="text-xl font-semibold">Top 15 by Capability Score</h2>
      <JevBenchRankingTable rows={data.ranked.slice(0,15)}/>
    </section>
    <section className="bh-panel mt-6 p-5"><h2 className="text-xl font-semibold">Open-weight Jev-class alternatives</h2>
      <p className="bh-muted mt-2">Only current-release measurements are shown; Jev 1.13.0 is the reference row. Rows outside the caps have no Capability rank. Read the licence and recorded setup before self-hosting.</p>
      <JevBenchRankingTable rows={[data.reference, ...data.openWeightAlternatives]}/>
      <ul className="mt-4 space-y-2">{data.openWeightAlternatives.map((r) => <li key={r.key}><Link href={jevSystemPath(r.key)} className="text-accent underline">{r.display}</Link>: {r.licence} · {r.speed?.hardware ?? r.endpoint_condition ?? r.speed?.measured_where ?? 'setup not stated'}{r.repo && <> · <a href={r.repo} className="text-accent underline">Published source or weights</a></>}</li>)}</ul>
    </section>
    <section className="mt-6 grid gap-4 md:grid-cols-3">{[
      ['Most accurate (Intelligence axis)',data.winners.mostAccurate], ['Fastest (Speed axis)',data.winners.fastest], ['Cheapest per decision',data.winners.cheapest],
    ].map(([label,row]) => { const r = row as typeof data.winners.mostAccurate; return r && <article key={String(label)} className="bh-panel p-5"><h2 className="font-semibold">{String(label)}</h2><p><Link href={jevSystemPath(r.key)} className="text-accent underline">{r.display}</Link></p><p>Intelligence {one(r.axes.intelligence)} · Speed {one(r.axes.speed)}</p><p>{usdPerThousand(r.cost?.usd_per_1000)} ({costBasisLabel(r.cost?.kind)})</p></article>; })}</section>
    <p className="mt-4"><Link href="/jev-models/how-to-choose" className="text-accent underline">Choose by use case and measurement conditions</Link></p>
    <JevFaq items={faq}/>
  </>;
}
