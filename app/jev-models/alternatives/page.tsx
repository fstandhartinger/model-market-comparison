import type { Metadata } from 'next';
import Link from 'next/link';
import { JevScoreBar, JevScoreBarHeader, toBarRow } from '../../../components/JevModelsV14';
import { readJevbenchSeoData } from '../../../lib/jevbench-seo.mjs';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
import { costBasisLabel, DatasetFaqJsonLd, JevFaq, JevIntentLinks, JevRowLink, one, percent, type SeoRow } from '../../../components/JevBenchSeoBlocks';
import type { JevV14System } from '../../../lib/jevbench-v14.mjs';

const PATH = '/jev-models/alternatives';
const TITLE = 'Jev alternatives compared — JevBench by Benchmark Heaven';
const DESCRIPTION = 'Find the best Jev alternative for your use case with published JevBench results for intelligence, calibration, speed, cost and open-weight evidence.';

export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({
    path: PATH,
    title: TITLE,
    description: DESCRIPTION,
    keywords: ['jev alternatives', 'best jev alternative', 'open source jev alternative', 'JevBench by Benchmark Heaven'],
  });
}

export default async function JevAlternativesPage() {
  const data = await readJevbenchSeoData();
  const topFive = data.topFive as SeoRow[];
  const barRows = topFive as unknown as JevV14System[];
  const alternatives = topFive.filter((row) => row.key !== 'jev-1.13.0');
  const openRows = data.selfHostable.slice(0, 8) as SeoRow[];
  const faq = [
    {
      question: 'What does JevBench compare?',
      answer: `JevBench compares published Jev-class decision systems across Intelligence, Calibration, Speed and Cost. This page uses the released ${data.artifact.revision} aggregate.`,
    },
    {
      question: 'How should I choose between Jev alternatives?',
      answer: `There is no single best fit for every use. Compare the published axes and their evidence, then choose for your use case. ${data.artifact.score_one_liner}`,
    },
    {
      question: 'Which Jev alternatives have public self-hosting evidence?',
      answer: 'The list below includes only rows marked as open or open weights in the published artifact that also include a license note and public repository link. Check the linked source and its terms before deployment; missing evidence remains unknown.',
    },
    {
      question: 'Are cost and speed values directly measured?',
      answer: 'The board labels cost evidence as measured, estimated or announced and shows the conditions behind speed measurements where available. The Cost and Speed axes are benchmark scores, not a universal bill or wall-clock guarantee.',
    },
  ];

  return <>
    <DatasetFaqJsonLd path={PATH} artifact={data.artifact} faq={faq} />
    <nav className="text-sm"><Link href="/jev-models" className="text-accent underline">← Back to the full JevBench leaderboard</Link></nav>
    <header className="bh-page-head mt-3">
      <p className="bh-eyebrow">JevBench by Benchmark Heaven · released {data.artifact.revision}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Jev alternatives, compared on the published board</h1>
      <p className="bh-muted mt-3 max-w-3xl">The best Jev alternative depends on your use case. Compare Jev-class decision models using the same released benchmark: Intelligence, Calibration, Speed and Cost, with each row’s evidence and openness notes.</p>
      <JevIntentLinks current="alternatives" />
    </header>

    <section className="bh-panel mt-6 p-5" aria-labelledby="jev-alternatives-top-five">
      <h2 id="jev-alternatives-top-five" className="text-xl font-semibold">JevBench Scores in the current top five</h2>
      <p className="bh-muted mt-2">The Jev row is the reference; the other four rows are current alternatives. The overall score is a composite, so check the separate axes for your use case.</p>
      <JevScoreBarHeader className="mt-4" />
      <ol className="mt-2 space-y-2.5 sm:mt-1" data-bh-jev-alternatives-bars>
        {barRows.map((row) => <JevScoreBar key={row.key} row={toBarRow(row)} reference={row.key === 'jev-1.13.0'} />)}
      </ol>
      <details className="mt-4" data-bh-jev-alternatives-values>
        <summary className="cursor-pointer text-sm font-semibold text-accent">All top-five values as a table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm" data-bh-jev-alternatives-table>
            <thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Rank</th><th className="py-2 pr-3">System</th><th className="py-2 pr-3">Score</th><th className="py-2 pr-3">Intelligence</th><th className="py-2 pr-3">Calibration</th><th className="py-2 pr-3">Speed</th><th className="py-2 pr-3">Cost</th><th className="py-2">Cost basis</th>
            </tr></thead>
            <tbody>{topFive.map((row) => {
              const comparison = data.comparisons.find((pair) => pair.rival.key === row.key);
              return <tr className={`border-b last:border-0 ${row.key === 'jev-1.13.0' ? 'text-muted-foreground' : ''}`} key={row.key}>
                <td className="py-3 pr-3 tabular-nums">{row.rank}</td>
                <td className="py-3 pr-3"><Link className="text-accent underline" href={`/jev-models/${encodeURIComponent(row.key)}`}>{row.display}</Link>{comparison && <div className="mt-1 text-xs"><Link className="text-accent underline" href={`/jev-models/${comparison.slug}`}>Jev vs {comparison.label}</Link></div>}{row.key === 'jev-1.13.0' && <div className="mt-1 text-xs">Reference system</div>}</td>
                <td className="py-3 pr-3 tabular-nums">{one(row.jevbench_score)}</td>
                <td className="py-3 pr-3 tabular-nums">{one(row.axes.intelligence)}</td>
                <td className="py-3 pr-3 tabular-nums">{one(row.axes.calibration)}</td>
                <td className="py-3 pr-3 tabular-nums">{one(row.axes.speed)}</td>
                <td className="py-3 pr-3 tabular-nums">{one(row.axes.cost)}</td>
                <td className="py-3">{costBasisLabel(row.cost?.kind)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </details>
      <p className="bh-muted mt-3 text-xs">Cost evidence is labeled by basis so estimated and announced values are not presented as measured charges.</p>
    </section>

    <section className="mt-8" aria-labelledby="open-jev-alternatives">
      <h2 id="open-jev-alternatives" className="text-2xl font-semibold">Looking for an open source Jev alternative?</h2>
      <p className="bh-muted mt-2 max-w-3xl">These rows have explicit openness, license and repository fields in the published artifact. “Open” is the board’s status; read the linked source and exact terms before deploying a system.</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {openRows.map((row) => <li className="bh-panel p-4" key={row.key}>
          <p className="font-semibold"><JevRowLink row={row} /> <span className="bh-muted text-sm">· rank {row.rank}</span></p>
          <p className="bh-muted mt-1 text-sm">{row.licence}</p>
          <p className="mt-2 text-sm"><a className="text-accent underline" href={row.repo!}>Published repository or weights</a></p>
      <p className="bh-muted mt-1 text-xs">Sealed-set accuracy: {percent(row.sealed_accuracy)} · {one(row.axes.speed)} Speed axis</p>
        </li>)}
      </ul>
      <p className="bh-muted mt-3 text-sm">For a broader list, use the board’s row disclosures. Rows without explicit openness, license and repository evidence are not classified here.</p>
      <p className="mt-3 text-sm"><Link className="text-accent underline" href="/jev-models/how-to-choose">See the use-case chooser, including accuracy, speed, cost and self-hosting evidence.</Link></p>
    </section>

    <JevFaq items={faq} />
  </>;
}
