import type { Metadata } from 'next';
import Link from 'next/link';
import { JevScoreBar } from '../../../components/JevModelsV14';
import { JevOpenWeightAlternativesTable, type OpenWeightAlternativeRow } from '../../../components/JevOpenWeightAlternativesTable';
import { readJevbenchSeoData } from '../../../lib/jevbench-seo.mjs';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
import { costBasisLabel, DatasetFaqJsonLd, JevFaq, JevIntentLinks, JevRowLink, one, type SeoRow } from '../../../components/JevBenchSeoBlocks';
import type { JevV14System } from '../../../lib/jevbench-v14.mjs';

const PATH = '/jev-models/alternatives';
const TITLE = 'Jev alternatives compared — JevBench by Benchmark Heaven';
const DESCRIPTION = 'Find the best Jev alternative for your use case with published JevBench results for intelligence, calibration, speed, cost and open-weight evidence.';
const MODEL_SIZE_NOTES: Record<string, OpenWeightAlternativeRow['sizeNote']> = {
  'system-one-open': {
    text: 'Gemma 4 E2B: 2.3B effective parameters; 5.1B including embeddings.',
    url: 'https://huggingface.co/google/gemma-4-E2B-it',
    label: 'Gemma 4 model card',
  },
  'open-jev-deberta-v3-large': {
    text: 'DeBERTa-v3-large: 304M backbone plus 131M embedding parameters.',
    url: 'https://huggingface.co/microsoft/deberta-v3-large',
    label: 'Microsoft model card',
  },
  swanone: {
    text: 'Qwen3.8-Flash family: 125B total and 6B active per token; this submission is an NVFP4 variant.',
    url: 'https://docs.qwencloud.com/developer-guides/getting-started/latest-model',
    label: 'QwenCloud model guide',
  },
};

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
  const openRows = data.selfHostable as SeoRow[];
  const artifactOpenRows = data.openWeightAlternatives as JevV14System[];
  const openTableRows: OpenWeightAlternativeRow[] = artifactOpenRows.map((row) => {
    const sourceUrl = row.key === 'mirror' ? 'https://huggingface.co/microsoft/deberta-v3-large' : row.repo;
    const setup = row.speed as unknown as { hardware?: string | null; measured_where?: string | null };
    return {
      key: row.key,
      display: row.display,
      rank: row.rank,
      score: row.jevbench_score,
      model: row.underlying ?? '',
      sizeNote: MODEL_SIZE_NOTES[row.key],
      runSetup: setup?.hardware ?? setup?.measured_where ?? row.endpoint_condition ?? '',
      licence: row.licence,
      sourceUrl,
      sourceLabel: row.key === 'mirror' ? 'DeBERTa-v3-large base model card' : 'Published source or weights',
      sourceNote: row.key === 'mirror'
        ? 'The submitted Mirror head/weights were unavailable at the artifact repository URL when checked. This link is only the DeBERTa base model, not the complete measured Mirror system.'
        : undefined,
    };
  });
  const schemaItems = artifactOpenRows.map((row) => ({
    name: row.display,
    url: row.key === 'mirror' ? null : row.repo,
  }));
  const faq = [
    {
      question: 'What counts as an open-weight Jev alternative on this page?',
      answer: 'This page lists Jev-rebuild rows marked open or open weights in the published v1.4.1 aggregate. It preserves each row’s license text because code, adapters, base weights, and datasets can have different terms.',
    },
    {
      question: 'Which open-weight Jev alternative scores highest?',
      answer: 'Hopper is the highest-scoring open-weight Jev-class entry in the published v1.4.1 aggregate: rank 3 overall and a JevBench Score of 59.43. That is a composite result, not an accuracy percentage or a guarantee for your workload.',
    },
    {
      question: 'Does the recorded hardware show a minimum deployment requirement?',
      answer: 'No. The table reports the setup recorded for each benchmark run. It is not a minimum VRAM or hardware guarantee for another model revision, quantization, context length, or serving stack. Unknown setup values remain marked as not stated.',
    },
    {
      question: 'Why is swanOne unranked?',
      answer: 'The published row is partial and has no completed sealed v1.4 run, so it has no composite score or rank. It remains visible in the inventory as an unranked partial row.',
    },
  ];

  return <>
    <DatasetFaqJsonLd
      path={PATH}
      artifact={data.artifact}
      faq={faq}
      items={schemaItems}
      itemListName="Open-weight Jev-class systems in JevBench v1.4.1"
      variables={['JevBench Score', 'Intelligence', 'Calibration', 'Speed', 'Cost', 'model size', 'license terms', 'recorded run setup']}
    />
    <nav className="text-sm"><Link href="/jev-models" className="text-accent underline">← Back to the full JevBench leaderboard</Link></nav>
    <header className="bh-page-head mt-3">
      <p className="bh-eyebrow">JevBench by Benchmark Heaven · released {data.artifact.revision}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Jev alternatives, compared on the published board</h1>
      <p className="bh-muted mt-3 max-w-3xl">The best Jev alternative depends on your use case. Compare Jev-class decision models using the same released benchmark: Intelligence, Calibration, Speed and Cost, with each row’s evidence and openness notes.</p>
      <JevIntentLinks current="alternatives" />
      <p className="mt-3 text-sm"><Link className="text-accent underline" href="/jev-models/jev-vs-laya">Compare Jev and Laya using their measured v1.4.1 results.</Link></p>
    </header>

    <section className="bh-panel mt-6 p-5" aria-labelledby="jev-alternatives-top-five">
      <h2 id="jev-alternatives-top-five" className="text-xl font-semibold">JevBench Scores in the current top five</h2>
      <p className="bh-muted mt-2">The Jev row is the reference; the four rows below it are current alternatives. The overall score is a composite, so check the separate axes for your use case.</p>
      <ol className="mt-4 space-y-2.5" data-bh-jev-alternatives-bars>
        {barRows.map((row) => <JevScoreBar key={row.key} row={row} reference={row.key === 'jev-1.13.0'} />)}
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
      <p className="bh-muted mt-2 max-w-3xl">The published v1.4.1 aggregate contains 48 open-weight Jev-class rows: 47 ranked entries and one unranked partial row. “Open” is the artifact’s status; it does not imply one shared license or unrestricted commercial use. Check the source and exact component terms for your use case.</p>
      <p className="mt-3 text-sm">Highest-scoring open-weight entry: {openRows.slice(0, 1).map((row) => <span key={row.key}><JevRowLink row={row} /> (rank #{row.rank}, JevBench Score {one(row.jevbench_score)}).</span>)}</p>
      <p className="bh-muted mt-3 max-w-3xl text-sm">The model and size column uses the published row’s model description. Where a parameter count was missing, the linked primary model source fills that gap. Recorded hardware is run provenance, not a minimum VRAM guarantee; missing values remain “not stated.”</p>
      <JevOpenWeightAlternativesTable rows={openTableRows} />
      <p className="bh-muted mt-3 text-sm">Mirror remains listed for completeness. Its artifact repository returned 404 in the source check, so the table links only to Microsoft’s DeBERTa-v3-large base model card and explicitly notes that the submitted Mirror head/weights were unavailable there.</p>
      <p className="mt-3 text-sm"><Link className="text-accent underline" href="/jev-models/how-to-choose">See the use-case chooser, including accuracy, speed, cost and self-hosting evidence.</Link></p>
    </section>

    <JevFaq items={faq} />
  </>;
}
