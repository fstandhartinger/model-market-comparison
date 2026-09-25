import type { Metadata } from 'next';
import Link from 'next/link';
import { readJevbenchSeoData } from '../../../lib/jevbench-seo.mjs';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
import { costBasisLabel, DatasetFaqJsonLd, JevFaq, JevIntentLinks, one, usdPerThousand, type SeoRow } from '../../../components/JevBenchSeoBlocks';

const PATH = '/jev-models/open-source-jev';
const TITLE = 'Is Jev open source? Open-weight Jev models ranked on JevBench';
const DESCRIPTION = 'Jev is a proprietary API. See which open-source and open-weight Jev-class models JevBench measured, how they rank against Jev, and what hardware they ran on.';
const TOP = 10;

export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({
    path: PATH,
    title: TITLE,
    description: DESCRIPTION,
    keywords: ['jev open source', 'is jev open source', 'open source jev', 'open weight jev model', 'self-hosted jev', 'JevBench by Benchmark Heaven'],
  });
}

type Setup = { endpoint_condition?: string | null; speed?: { hardware?: string | null; measured_where?: string | null; adjustment?: string | null } | null };
const setupOf = (row: SeoRow) => {
  const s = row as unknown as Setup;
  return s.speed?.hardware ?? s.speed?.measured_where ?? s.endpoint_condition ?? 'not stated';
};
const onCpu = (row: SeoRow) => /ryzen|cpu/i.test(`${(row as unknown as Setup).speed?.hardware ?? ''} ${(row as unknown as Setup).endpoint_condition ?? ''}`);

export default async function OpenSourceJevPage() {
  const data = await readJevbenchSeoData();
  const jev = (data.ranked as unknown as SeoRow[]).find((row) => row.key === 'jev-1.13.0')!;
  const open = data.openWeightAlternatives as unknown as SeoRow[];
  const top = open.slice(0, TOP);
  const best = open[0];
  const aboveJev = open.filter((row) => row.rank < jev.rank);
  const bestCpu = open.find(onCpu) ?? null;
  const topFiveNote = (data.artifact as { top_five_note?: string }).top_five_note ?? null;
  const faq = [
    {
      question: 'Is Jev open source?',
      answer: `No. Jev 1.13.0 by TypeSafe AI is listed in JevBench ${data.artifact.revision} as “${jev.licence}”: it is served through TypeSafe AI’s production API and its weights are not published. JevBench’s harness and public tasks are open source (MIT), but that does not make Jev itself open.`,
    },
    {
      question: 'What is the best open-source Jev alternative?',
      answer: `On the ${data.artifact.revision} composite, ${best.display} ranks #${best.rank} with a JevBench Score of ${one(best.jevbench_score)} (${best.licence}). ${topFiveNote ?? ''} The right choice depends on whether you weight reasoning, calibration, speed or cost most.`,
    },
    {
      question: 'How many open-weight Jev-class models does JevBench measure?',
      answer: `${open.length} Jev-style systems with public code or weights are ranked in ${data.artifact.revision}. ${aboveJev.length === 1 ? 'One of them ranks' : `${aboveJev.length} of them rank`} above Jev 1.13.0 (#${jev.rank}) on the composite score.`,
    },
    {
      question: 'Can I run an open Jev alternative on a CPU?',
      answer: bestCpu
        ? `Yes, some were measured on four CPU threads of an AMD Ryzen 5 3600. The highest-ranked of them is ${bestCpu.display} at #${bestCpu.rank} (JevBench Score ${one(bestCpu.jevbench_score)}). Most higher-ranked open models were measured on one rented GPU.`
        : 'None of the open-weight rows in this release was measured on a CPU.',
    },
    {
      question: 'Are the costs of open models measured?',
      answer: 'Mostly not. A self-hosted model has no bill of its own, so its cost is usually estimated from a comparable hosted model’s price and labeled as an estimate. Self-hosted speed also includes a published ×2 + 0.15 s adjustment, which is an assumption rather than a measurement.',
    },
  ];

  return <>
    <DatasetFaqJsonLd
      path={PATH}
      artifact={data.artifact}
      faq={faq}
      items={top.map((row) => ({ name: row.display, url: row.repo }))}
      itemListName={`Top ${TOP} open-weight Jev-class systems in JevBench ${data.artifact.revision}`}
    />
    <nav className="text-sm"><Link href="/jev-models" className="text-accent underline">← Back to the full JevBench leaderboard</Link></nav>
    <header className="bh-page-head mt-3">
      <p className="bh-eyebrow">JevBench by Benchmark Heaven · released {data.artifact.revision}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Is Jev open source?</h1>
      <p className="mt-3 max-w-3xl text-lg" data-bh-jev-open-answer><b>No.</b> Jev 1.13.0 is TypeSafe AI’s proprietary API; its weights are not published. But {open.length} open-weight Jev-class models were measured on the same benchmark, and {aboveJev.length === 1 ? 'one of them ranks' : `${aboveJev.length} of them rank`} above Jev on the composite score.</p>
      {topFiveNote && <p className="bh-muted mt-3 max-w-3xl" data-bh-jev-top-five-note>{topFiveNote}</p>}
      <JevIntentLinks current="openSource" />
    </header>

    <section className="bh-panel mt-6 p-5" aria-labelledby="open-jev-top">
      <h2 id="open-jev-top" className="text-xl font-semibold">The {TOP} highest-ranked open-weight Jev-class models</h2>
      <p className="bh-muted mt-2">Ranks are overall ranks in {data.artifact.revision}, with Jev 1.13.0 at #{jev.rank} (JevBench Score {one(jev.jevbench_score)}) for reference.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm" data-bh-jev-open-top>
          <thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3">Rank</th><th className="py-2 pr-3">System</th><th className="py-2 pr-3">Score</th><th className="py-2 pr-3">Intelligence</th><th className="py-2 pr-3">Cost per 1,000</th><th className="py-2 pr-3">License</th><th className="py-2">Measured on</th>
          </tr></thead>
          <tbody>{top.map((row) => <tr className="border-b align-top last:border-0" key={row.key}>
            <td className="py-3 pr-3 tabular-nums">{row.rank}</td>
            <td className="py-3 pr-3"><Link className="text-accent underline" href={`/jev-models/${encodeURIComponent(row.key)}`}>{row.display}</Link>{row.repo && <div className="mt-1 text-xs"><a className="text-accent underline" href={row.repo}>source or weights</a></div>}</td>
            <td className="py-3 pr-3 tabular-nums">{one(row.jevbench_score)}</td>
            <td className="py-3 pr-3 tabular-nums">{one(row.axes.intelligence)}</td>
            <td className="py-3 pr-3">{usdPerThousand(row.cost?.usd_per_1000).replace(' per 1,000 decisions', '')} <span className="bh-muted">({costBasisLabel(row.cost?.kind)})</span></td>
            <td className="py-3 pr-3">{row.licence}</td>
            <td className="py-3">{setupOf(row)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-sm"><Link className="text-accent underline" href="/jev-models/alternatives">All {open.length} open-weight rows, searchable and sortable</Link></p>
    </section>

    <section className="mt-6 grid gap-4 md:grid-cols-2">
      <article className="bh-panel p-5" aria-labelledby="open-jev-why">
        <h2 id="open-jev-why" className="text-lg font-semibold">What you give up and gain by self-hosting</h2>
        <p className="bh-muted mt-2 text-sm">Jev was measured through its production API from a server in Germany, network included, at a measured {usdPerThousand(jev.cost?.usd_per_1000)}. Open models were measured on evaluator-owned hardware; their speed carries an assumed ×2 + 0.15 s adjustment and their cost is usually an estimate from a comparable hosted price. Self-hosting keeps decisions on your own hardware, which the API cannot.</p>
      </article>
      <article className="bh-panel p-5" aria-labelledby="open-jev-licence">
        <h2 id="open-jev-licence" className="text-lg font-semibold">Read the license, not just the label</h2>
        <p className="bh-muted mt-2 text-sm">“Open” here means the published row lists public code or weights. Terms differ: some rows are Apache-2.0 or MIT, others inherit a base model’s use policy, and a few are non-commercial research licenses. Each row keeps its own license text.</p>
      </article>
    </section>

    <p className="mt-6 text-sm" data-bh-jev-open-compare>Head-to-head: <Link className="text-accent underline" href="/jev-models/jev-vs-decider-4b-v2">Jev vs decider-4b v2</Link> <span className="bh-muted">·</span> <Link className="text-accent underline" href="/jev-models/jev-vs-cygnet">Jev vs Cygnet</Link> <span className="bh-muted">·</span> <Link className="text-accent underline" href="/jev-models/jev-vs-hopper">Jev vs Hopper</Link> <span className="bh-muted">·</span> <Link className="text-accent underline" href="/jev-models/jev-vs-laya">Jev vs Laya</Link></p>
    <JevFaq items={faq} />
  </>;
}
