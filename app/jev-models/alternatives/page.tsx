import type { Metadata } from 'next';
import Link from 'next/link';
import { JevScoreBar, JevScoreBarHeader, toBarRow } from '../../../components/JevModelsV14';
import { JevOpenWeightAlternativesTable, type OpenWeightAlternativeRow } from '../../../components/JevOpenWeightAlternativesTable';
import { readJevbenchSeoData } from '../../../lib/jevbench-seo.mjs';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
import { costBasisLabel, DatasetFaqJsonLd, JevFaq, JevIntentLinks, JevRowLink, one, type SeoRow } from '../../../components/JevBenchSeoBlocks';
import type { JevV14System } from '../../../lib/jevbench-v14.mjs';

const PATH = '/jev-models/alternatives';
const TITLE = 'Jev alternatives compared — JevBench by Benchmark Heaven';
const DESCRIPTION = 'Find the best Jev alternative for your use case with published JevBench results for intelligence, calibration, speed, cost and open-weight evidence.';
// Parameter counts the published rows do not state, filled from the primary model source (checked 24 Sep 2026).
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
// The Mirror row's published repository returned 404 when checked (24 and 25 Sep 2026); link only its base model.
const MIRROR_BASE = 'https://huggingface.co/microsoft/deberta-v3-large';
type RunSetup = { endpoint_condition?: string | null; speed?: { hardware?: string | null; measured_where?: string | null } | null };

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
  const openRows = data.openWeightAlternatives as JevV14System[];
  const bestOpen = openRows[0] as unknown as SeoRow;
  const cpuRows = openRows.filter((row) => /ryzen|cpu/i.test(`${(row as RunSetup).speed?.hardware ?? ''} ${row.endpoint_condition ?? ''}`));
  const openTableRows: OpenWeightAlternativeRow[] = openRows.map((row) => {
    const setup = row as RunSetup;
    return {
      key: row.key,
      display: row.display,
      rank: row.rank,
      score: row.jevbench_score,
      model: row.underlying ?? '',
      sizeNote: MODEL_SIZE_NOTES[row.key],
      runSetup: setup.speed?.hardware ?? setup.endpoint_condition ?? setup.speed?.measured_where ?? '',
      licence: row.licence,
      sourceUrl: row.key === 'mirror' ? MIRROR_BASE : row.repo,
      sourceLabel: row.key === 'mirror' ? 'DeBERTa-v3-large base model card' : 'Published source or weights',
      sourceNote: row.key === 'mirror'
        ? 'The submitted Mirror head/weights were unavailable at the published repository URL when checked. This link is only the DeBERTa base model, not the complete measured Mirror system.'
        : undefined,
    };
  });
  const faq = [
    {
      question: 'What does JevBench compare?',
      answer: `JevBench compares published Jev-class decision systems across Intelligence, Calibration, Speed and Cost. This page uses the released ${data.artifact.revision} aggregate.`,
    },
    {
      question: 'Which open-weight Jev alternative scores highest?',
      answer: `${bestOpen.display} is the highest-ranked open-weight entry in ${data.artifact.revision}: rank ${bestOpen.rank} overall with a JevBench Score of ${one(bestOpen.jevbench_score)}. ${(data.artifact as { top_five_note?: string }).top_five_note ?? ''} The score is a composite, not an accuracy percentage or a guarantee for your workload.`,
    },
    {
      question: 'What counts as an open-weight Jev alternative on this page?',
      answer: `All ${openRows.length} Jev-style rows in ${data.artifact.revision} whose code or weights are public, with a license note and source link in the published row. The license text is kept per row because code, adapters, base weights and datasets can have different terms, including non-commercial ones.`,
    },
    {
      question: 'Does the recorded hardware show a minimum deployment requirement?',
      answer: `No. The table reports the setup used for each benchmark run. ${cpuRows.length} of these rows were measured on four CPU threads; most others ran on a rented GPU or the author’s own endpoint. It is not a minimum VRAM or hardware guarantee for another revision, quantization, context length or serving stack.`,
    },
    {
      question: 'Are cost and speed values directly measured?',
      answer: 'The board labels cost evidence as measured, estimated or announced. Self-hosted rows usually carry an estimated cost from a comparable hosted price, and rows served on our own hardware carry a published speed adjustment (such as ×2 + 0.15 s) that is an assumption, not a measurement.',
    },
  ];

  return <>
    <DatasetFaqJsonLd
      path={PATH}
      artifact={data.artifact}
      faq={faq}
      items={openRows.map((row) => ({ name: row.display, url: row.key === 'mirror' ? null : row.repo }))}
      itemListName={`Open-weight Jev-class systems in JevBench ${data.artifact.revision}`}
      variables={['JevBench Score', 'Intelligence', 'Calibration', 'Speed', 'Cost', 'model size', 'license terms', 'recorded run setup']}
    />
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
      <p className="bh-muted mt-2 max-w-3xl">The published {data.artifact.revision} aggregate contains {openRows.length} Jev-style systems with public code or weights. “Open” does not imply one shared license or unrestricted commercial use; check the source and exact component terms for your use case. Rerankers, classifiers and general LLM baselines are on the <Link className="text-accent underline" href="/jev-models">full board</Link>.</p>
      <p className="mt-3 text-sm">Highest-ranked open-weight entry: <JevRowLink row={bestOpen} /> (rank #{bestOpen.rank}, JevBench Score {one(bestOpen.jevbench_score)}). <Link className="text-accent underline" href="/jev-models/open-source-jev">Is Jev itself open source?</Link></p>
      <p className="bh-muted mt-3 max-w-3xl text-sm">The model column uses the published row’s description; where a parameter count was missing, the linked primary model source fills that gap. Recorded hardware is run provenance, not a minimum VRAM guarantee; missing values remain “not stated.”</p>
      <JevOpenWeightAlternativesTable rows={openTableRows} revision={data.artifact.revision} />
      <p className="bh-muted mt-3 text-sm">Mirror remains listed for completeness. Its published repository returned 404 when checked, so the table links only to Microsoft’s DeBERTa-v3-large base model card.</p>
      <p className="mt-3 text-sm"><Link className="text-accent underline" href="/jev-models/how-to-choose">See the use-case chooser, including accuracy, speed, cost and self-hosting evidence.</Link> <span className="bh-muted">·</span> <Link className="text-accent underline" href="/jev-models/jev-vs-laya">Jev vs Laya, a CPU-measured open model</Link></p>
    </section>

    <JevFaq items={faq} />
  </>;
}
