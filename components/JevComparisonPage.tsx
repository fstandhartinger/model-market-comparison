import Link from 'next/link';
import { JevCompareV14, type JevCompareRow } from './JevCompareV14';
import { readJevbenchSeoData } from '../lib/jevbench-seo.mjs';
import { costBasisLabel, DatasetFaqJsonLd, JevFaq, one, opennessLabel, percent, usdPerThousand, type SeoRow } from './JevBenchSeoBlocks';
import type { JevV14System } from '../lib/jevbench-v14.mjs';

function higherName(jev: SeoRow, rival: SeoRow): string {
  if (jev.jevbench_score === rival.jevbench_score) return 'The published JevBench Scores are tied.';
  return `${jev.jevbench_score > rival.jevbench_score ? jev.display : rival.display} has the higher published JevBench Score.`;
}

function radarRow(row: SeoRow): JevCompareRow {
  const system = row as unknown as JevV14System;
  const hard = (system.hard as { by_family?: Record<string, { accuracy: number | null; n: number }> } | null)?.by_family ?? null;
  const sealed = (system.sealed_aggregate as { by_family?: Record<string, number | null> } | null)?.by_family ?? null;
  const tiers = (system.tiers ?? {}) as Record<string, number | null>;
  return {
    key: system.key,
    name: system.display.split(' (')[0].split(', formerly')[0],
    cls: system.class,
    rank: system.rank,
    listing: system.listing,
    score: system.jevbench_score,
    axes: system.axes,
    tiers: { easy: tiers.easy ?? null, standard: tiers.standard ?? null, judge: tiers.judge ?? null, hard: tiers.hard ?? null, sealed: system.sealed_accuracy },
    hard: hard ? Object.fromEntries(Object.entries(hard).map(([key, value]) => [key, { accuracy: value.accuracy, n: value.n }])) : null,
    sealed,
  };
}

export async function JevComparisonPage({ rivalKey, path, label }: { rivalKey: string; path: string; label: string }) {
  const data = await readJevbenchSeoData();
  const pair = data.comparisons.find((item: { key: string }) => item.key === rivalKey);
  if (!pair) throw new Error(`Jev comparison ${rivalKey} is not in the published top five`);
  const jev = pair.jev as SeoRow;
  const rival = pair.rival as SeoRow;
  const faq = [
    {
      question: `What does JevBench show for Jev and ${label}?`,
      answer: `In ${data.artifact.revision}, Jev is rank ${jev.rank} with a JevBench Score of ${one(jev.jevbench_score)}; ${rival.display} is rank ${rival.rank} with a score of ${one(rival.jevbench_score)}. The table shows their published axes and sealed-set accuracy separately.`,
    },
    {
      question: 'Which system has higher sealed-set accuracy?',
      answer: jev.sealed_accuracy === rival.sealed_accuracy
        ? `Their published sealed-set accuracy values are tied at ${percent(jev.sealed_accuracy)}.`
        : `${jev.sealed_accuracy > rival.sealed_accuracy ? jev.display : rival.display} has the higher published sealed-set accuracy (${percent(Math.max(jev.sealed_accuracy, rival.sealed_accuracy))} versus ${percent(Math.min(jev.sealed_accuracy, rival.sealed_accuracy))}). This is separate from the composite JevBench Score.`,
    },
    {
      question: 'Can I compare the cost values as actual bills?',
      answer: `${jev.display}: ${costBasisLabel(jev.cost?.kind)} at ${usdPerThousand(jev.cost?.usd_per_1000)}. ${rival.display}: ${costBasisLabel(rival.cost?.kind)} at ${usdPerThousand(rival.cost?.usd_per_1000)}. Estimated and announced bases are not measured charges; inspect the board’s full row disclosure.`,
    },
  ];

  const values: Array<[string, string, string]> = [
    ['Published rank', `#${jev.rank}`, `#${rival.rank}`],
    ['JevBench Score', one(jev.jevbench_score), one(rival.jevbench_score)],
    ['Sealed-set accuracy', percent(jev.sealed_accuracy), percent(rival.sealed_accuracy)],
    ['Intelligence axis', one(jev.axes.intelligence), one(rival.axes.intelligence)],
    ['Calibration axis', one(jev.axes.calibration), one(rival.axes.calibration)],
    ['Speed axis', one(jev.axes.speed), one(rival.axes.speed)],
    ['Cost axis', one(jev.axes.cost), one(rival.axes.cost)],
    ['Cost evidence', costBasisLabel(jev.cost?.kind), costBasisLabel(rival.cost?.kind)],
    ['Cost per 1,000 decisions', usdPerThousand(jev.cost?.usd_per_1000), usdPerThousand(rival.cost?.usd_per_1000)],
  ];
  const otherPairs = data.comparisons.filter((item: { key: string }) => item.key !== rivalKey);

  return <>
    <DatasetFaqJsonLd path={path} artifact={data.artifact} faq={faq} />
    <nav className="text-sm"><Link href="/jev-models" className="text-accent underline">← Back to the full JevBench leaderboard</Link></nav>
    <header className="bh-page-head mt-3">
      <p className="bh-eyebrow">JevBench by Benchmark Heaven · released {data.artifact.revision}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Jev vs {label}: published benchmark comparison</h1>
      <p className="bh-muted mt-3 max-w-3xl">A side-by-side view of Jev 1.13.0 and {rival.display} from the same hash-checked {data.artifact.revision} aggregate. The overall score is a composite; compare the separate measures against your use case.</p>
    </header>

    <JevCompareV14
      rows={[radarRow(jev), radarRow(rival)]}
      sealedDecisions={data.artifact.tiers.sealed}
      hardDecisions={data.artifact.tiers.hard}
      fixedPair
      heading={`Four-radar comparison: Jev and ${label}`}
    />

    <section className="bh-panel mt-6 p-5" aria-labelledby="jev-pair-values">
      <h2 id="jev-pair-values" className="text-xl font-semibold">Published values</h2>
      <p className="bh-muted mt-2">{higherName(jev, rival)} The displayed score uses one decimal place; the comparison above uses the same published release.</p>
      <details className="mt-3" data-bh-jev-pair-values>
        <summary className="cursor-pointer text-sm font-semibold text-accent">All values as a table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm" data-bh-jev-comparison-table>
            <thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-4">Measure</th><th className="py-2 pr-4">{jev.display}</th><th className="py-2">{rival.display}</th></tr></thead>
            <tbody>{values.map(([name, a, b]) => <tr className="border-b last:border-0" key={name}>
              <th scope="row" className="py-3 pr-4 font-medium">{name}</th>
              <td className="py-3 pr-4 tabular-nums">{a}</td>
              <td className="py-3 tabular-nums">{b}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>
      <p className="bh-muted mt-3 text-xs">{data.artifact.score_one_liner} Cost evidence is labeled per row. Speed is a benchmark axis; deployment latency depends on the endpoint and conditions.</p>
    </section>

    <section className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Model details">
      {[jev, rival].map((row) => <article className="bh-panel p-5" key={row.key}>
        <h2 className="text-lg font-semibold"><Link className="text-accent underline" href={`/jev-models/${encodeURIComponent(row.key)}`}>{row.display}</Link></h2>
        <p className="bh-muted mt-2 text-sm">{opennessLabel(row)}. License note: {row.licence || 'unknown in the published row'}.</p>
        {row.repo && <p className="mt-2 text-sm"><a className="text-accent underline" href={row.repo}>Published source</a></p>}
      </article>)}
    </section>

    <p className="mt-6 text-sm" data-bh-jev-compare-more>Compare more JevBench pairs: {otherPairs.map((item: { slug: string; label: string }, index: number) => <span key={item.slug}>{index > 0 && <span className="bh-muted"> · </span>}<Link className="text-accent underline" href={`/jev-models/${item.slug}`}>Jev vs {item.label}</Link></span>)}</p>
    <p className="mt-3 text-sm"><Link className="text-accent underline" href="/jev-models/alternatives">See Jev alternatives</Link> <span className="bh-muted">·</span> <Link className="text-accent underline" href="/jev-models/how-to-choose">Choose by use case</Link></p>
    <JevFaq items={faq} />
  </>;
}
