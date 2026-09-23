import type { Metadata } from 'next';
import Link from 'next/link';
import { readJevbenchSeoData } from '../../../lib/jevbench-seo.mjs';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
import { costBasisLabel, DatasetFaqJsonLd, JevFaq, JevIntentLinks, JevRowLink, one, opennessLabel, percent, usdPerThousand, type SeoRow } from '../../../components/JevBenchSeoBlocks';

const PATH = '/jev-models/how-to-choose';
const TITLE = 'How to choose a Jev-class model — JevBench by Benchmark Heaven';
const DESCRIPTION = 'Choose a Jev-class model by use case using published JevBench accuracy, speed, cost and self-hosting evidence.';

export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({
    path: PATH,
    title: TITLE,
    description: DESCRIPTION,
    keywords: ['how to choose a Jev-class model', 'best Jev alternative', 'Jev model speed', 'self-hosted Jev model'],
  });
}

export default async function HowToChooseJevModelPage() {
  const data = await readJevbenchSeoData();
  const accurate = data.winners.mostAccurate as SeoRow;
  const fastest = data.winners.fastest as SeoRow;
  const cheapest = data.winners.cheapest as SeoRow;
  const openRows = data.selfHostable.slice(0, 8) as SeoRow[];
  const faq = [
    {
      question: 'Which Jev-class model has the highest published accuracy?',
      answer: `${accurate.display} has the highest sealed-set accuracy in the published ${data.artifact.revision} ranked rows (${percent(accurate.sealed_accuracy)}). This is a separate measure from the composite JevBench Score.`,
    },
    {
      question: 'Which Jev-class model is fastest?',
      answer: `${fastest.display} has the highest published Speed axis score (${one(fastest.axes.speed)}). The axis is a benchmark score; it does not promise the same wall-clock latency on every host or workload.`,
    },
    {
      question: 'Which Jev-class model is cheapest?',
      answer: `${cheapest.display} has the highest Cost axis score (${one(cheapest.axes.cost)}). Its published cost is ${costBasisLabel(cheapest.cost?.kind)} at ${usdPerThousand(cheapest.cost?.usd_per_1000)}; check the board’s row disclosure for the basis before comparing bills.`,
    },
    {
      question: 'How do I find a self-hostable Jev alternative?',
      answer: 'Use only systems marked open or open weights in the published row, with a license note and public repository link. This page leaves absent openness, license or repository evidence unclassified; review the linked terms before deployment.',
    },
  ];

  return <>
    <DatasetFaqJsonLd path={PATH} artifact={data.artifact} faq={faq} />
    <nav className="text-sm"><Link href="/jev-models" className="text-accent underline">← Back to the full JevBench leaderboard</Link></nav>
    <header className="bh-page-head mt-3">
      <p className="bh-eyebrow">JevBench by Benchmark Heaven · released {data.artifact.revision}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">How to choose a Jev-class model</h1>
      <p className="bh-muted mt-3 max-w-3xl">Start with the use case, then read the metric behind each recommendation. The guide uses the latest published JevBench artifact; it does not treat the overall composite as raw accuracy.</p>
      <JevIntentLinks current="chooser" />
    </header>

    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <section className="bh-panel p-5" aria-labelledby="chooser-accuracy">
        <p className="bh-eyebrow">Most accurate (sealed-set accuracy)</p>
        <h2 id="chooser-accuracy" className="mt-1 text-xl font-semibold"><JevRowLink row={accurate} /></h2>
        <p className="mt-2 text-3xl font-bold tabular-nums">{percent(accurate.sealed_accuracy)}</p>
        <p className="bh-muted mt-2 text-sm">Published sealed-set accuracy in {data.artifact.revision}. The JevBench Score is a separate composite.</p>
      </section>

      <section className="bh-panel p-5" aria-labelledby="chooser-speed">
        <p className="bh-eyebrow">Fastest (Speed axis)</p>
        <h2 id="chooser-speed" className="mt-1 text-xl font-semibold"><JevRowLink row={fastest} /></h2>
        <p className="mt-2 text-3xl font-bold tabular-nums">{one(fastest.axes.speed)}<span className="bh-muted ml-2 text-sm font-normal">/ 100 benchmark score</span></p>
        <p className="bh-muted mt-2 text-sm">This is the published Speed axis. Use the row’s latency conditions when estimating real performance; it is not a universal wall-clock guarantee.</p>
      </section>

      <section className="bh-panel p-5" aria-labelledby="chooser-cost">
        <p className="bh-eyebrow">Cheapest per decision (Cost axis)</p>
        <h2 id="chooser-cost" className="mt-1 text-xl font-semibold"><JevRowLink row={cheapest} /></h2>
        <p className="mt-2 text-3xl font-bold tabular-nums">{one(cheapest.axes.cost)}<span className="bh-muted ml-2 text-sm font-normal">/ 100 benchmark score</span></p>
        <p className="mt-2 text-sm">Published cost: {usdPerThousand(cheapest.cost?.usd_per_1000)} <span className="bh-muted">({costBasisLabel(cheapest.cost?.kind)})</span></p>
        <p className="bh-muted mt-2 text-sm">Cost axis is a comparison score. The row’s cost basis distinguishes measured, estimated and announced values.</p>
      </section>

      <section className="bh-panel p-5" aria-labelledby="chooser-self-host">
        <p className="bh-eyebrow">Self-hosting evidence</p>
        <h2 id="chooser-self-host" className="mt-1 text-xl font-semibold">Use rows with public openness, license and repository evidence</h2>
        <p className="bh-muted mt-2 text-sm">The list below is ordered by the published JevBench rank. The openness status and license terms are copied from each public aggregate row.</p>
      </section>
    </div>

    <section className="mt-8" aria-labelledby="self-hostable-rows">
      <h2 id="self-hostable-rows" className="text-2xl font-semibold">Systems with explicit self-hosting evidence</h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {openRows.map((row) => <li className="bh-panel p-4" key={row.key}>
          <p className="font-semibold"><JevRowLink row={row} /> <span className="bh-muted text-sm">· rank {row.rank}</span></p>
          <p className="bh-muted mt-1 text-sm">{opennessLabel(row)} · {row.licence}</p>
          <p className="mt-2 text-sm"><a className="text-accent underline" href={row.repo!}>Published repository or weights</a></p>
        </li>)}
      </ul>
      <p className="bh-muted mt-3 text-sm">Rows without explicit openness, license or repository evidence are left unclassified. Confirm each model’s terms and requirements before using it in production.</p>
    </section>

    <section className="bh-panel mt-8 p-5" aria-labelledby="chooser-method">
      <h2 id="chooser-method" className="text-xl font-semibold">Keep the measures separate</h2>
      <p className="bh-muted mt-2">{data.artifact.score_one_liner} Accuracy, speed, cost and the composite answer different questions. Review the <Link className="text-accent underline" href="/jev-models">full live board</Link> and its row disclosures before making a deployment choice.</p>
    </section>
    <JevFaq items={faq} />
  </>;
}
