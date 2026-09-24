import Link from 'next/link';
import { readJevbenchSeoData } from '../lib/jevbench-seo.mjs';
import { JevFaq, JevItemListFaqJsonLd, costBasisLabel } from './JevBenchSeoBlocks';
import type { JevV14System } from '../lib/jevbench-v14.mjs';

const score2 = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? '—' : value.toFixed(2);
const costPerThousand = (value: number | null | undefined) => value == null || !Number.isFinite(value)
  ? 'not published'
  : `$${value.toFixed(5)} per 1,000 decisions`;

export async function JevVsLayaComparisonPage({ path }: { path: string }) {
  const data = await readJevbenchSeoData();
  const systems = data.ranked as JevV14System[];
  const jev = systems.find((row) => row.key === 'jev-1.13.0');
  const laya = systems.find((row) => row.key === 'laya');
  if (!jev || !laya || jev.rank !== 1 || laya.rank !== 36) {
    throw new Error('Invalid JevBench SEO source: the pinned v1.4.1 Jev/Laya rows are missing');
  }

  const faq = [
    {
      question: 'Is Laya measured in JevBench?',
      answer: 'Yes. Laya has a measured row in the public v1.4.1 artifact. The rank and score on this page are pinned to that release.',
    },
    {
      question: 'Did Jev score higher than Laya?',
      answer: 'Yes on the v1.4.1 overall composite: Jev scored ' + score2(jev.jevbench_score) + ' at rank ' + jev.rank + ' and Laya scored ' + score2(laya.jevbench_score) + ' at rank ' + laya.rank + '. Jev also scored higher on Intelligence, Calibration, and Speed; Laya’s Cost axis was higher.',
    },
    {
      question: 'Is Laya cheaper than Jev?',
      answer: 'The artifact lists Laya at an estimated ' + costPerThousand(laya.cost?.usd_per_1000) + ' and Jev at a measured ' + costPerThousand(jev.cost?.usd_per_1000) + '. Because the cost bases differ, treat this as the artifact’s comparison rather than a like-for-like bill quote.',
    },
    {
      question: 'Is Laya open source?',
      answer: 'The artifact lists Laya as ' + laya.licence + ' and identifies ModernBERT-large as its base. Check the linked model card and component terms for the implementation you plan to use.',
    },
  ];
  const axes: Array<[string, keyof JevV14System['axes']]> = [
    ['Intelligence', 'intelligence'],
    ['Calibration', 'calibration'],
    ['Speed', 'speed'],
    ['Cost', 'cost'],
  ];
  const values: Array<[string, string, string]> = [
    ['Published rank', '#' + jev.rank, '#' + laya.rank],
    ['JevBench Score (composite)', score2(jev.jevbench_score), score2(laya.jevbench_score)],
    ...axes.map(([name, key]) => [name, score2(jev.axes[key]), score2(laya.axes[key])] as [string, string, string]),
    ['Cost evidence', costBasisLabel(jev.cost?.kind), costBasisLabel(laya.cost?.kind)],
    ['Cost per 1,000 decisions', costPerThousand(jev.cost?.usd_per_1000), costPerThousand(laya.cost?.usd_per_1000)],
  ];

  return <>
    <JevItemListFaqJsonLd
      path={path}
      name="Jev and Laya measured in JevBench v1.4.1"
      items={[
        { name: jev.display, url: jev.repo },
        { name: laya.display, url: laya.repo },
      ]}
      faq={faq}
    />
    <nav className="text-sm"><Link href="/jev-models" className="text-accent underline">← Back to the full JevBench leaderboard</Link></nav>
    <header className="bh-page-head mt-3">
      <p className="bh-eyebrow">JevBench by Benchmark Heaven · released {data.artifact.revision}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Jev vs Laya: what JevBench measured</h1>
      <p className="bh-muted mt-3 max-w-3xl">
        Jev and Laya both have measured rows in the public v1.4.1 aggregate. Jev ranks first with a JevBench Score of {score2(jev.jevbench_score)}; Laya ranks 36th with {score2(laya.jevbench_score)}. The score is a four-axis composite, not raw accuracy or a universal quality rating.
      </p>
    </header>

    <section className="bh-panel mt-6 p-5" aria-labelledby="jev-laya-values">
      <h2 id="jev-laya-values" className="text-xl font-semibold">Published v1.4.1 values</h2>
      <p className="bh-muted mt-2">The values below come from the same public release. Cost labels preserve the artifact’s evidence basis.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm" data-bh-jev-laya-table>
          <thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="py-2 pr-4">Measure</th>
            <th scope="col" className="py-2 pr-4">{jev.display}</th>
            <th scope="col" className="py-2">{laya.display}</th>
          </tr></thead>
          <tbody>{values.map(([name, jevValue, layaValue]) => <tr className="border-b last:border-0" key={name}>
            <th scope="row" className="py-3 pr-4 font-medium">{name}</th>
            <td className="py-3 pr-4 tabular-nums">{jevValue}</td>
            <td className="py-3 tabular-nums">{layaValue}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="bh-muted mt-3 text-xs">A lower listed Laya cost is an estimate, while Jev’s is measured; these are not like-for-like invoice totals.</p>
    </section>

    <section className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Model and measurement conditions">
      <article className="bh-panel p-5">
        <h2 className="text-lg font-semibold">Jev 1.13.0</h2>
        <p className="bh-muted mt-2 text-sm">TypeSafe AI’s proprietary production API, measured from Germany over the network. Its per-decision cost uses the public tariff and measured token counts.</p>
        <p className="mt-3 text-sm"><a className="text-accent underline" href="https://docs.typesafe.ai/models" rel="noreferrer">Jev API model documentation</a></p>
      </article>
      <article className="bh-panel p-5">
        <h2 className="text-lg font-semibold">Laya</h2>
        <p className="bh-muted mt-2 text-sm">Apache-2.0; {laya.underlying}. The recorded run used an AMD Ryzen 5 3600 with four CPU threads.</p>
        <p className="mt-2 text-sm">Its estimated cost uses hosted prices for similarly sized encoders and measured input-token use; it is not an invoice for hosting Laya.</p>
        <p className="mt-3 text-sm"><a className="text-accent underline" href="https://huggingface.co/convaiinnovations/laya" rel="noreferrer">Laya model card</a></p>
      </article>
    </section>

    <section className="bh-panel mt-6 p-5" aria-labelledby="jev-laya-interpretation">
      <h2 id="jev-laya-interpretation" className="text-xl font-semibold">How to read this comparison</h2>
      <p className="bh-muted mt-2">In v1.4.1, Jev leads on the composite and the Intelligence, Calibration, and Speed axes. Laya has the higher Cost axis and lower estimated absolute cost. The Laya self-hosted speed adjustment of ×2 plus 0.15 seconds is an assumption in the composite, not a production-traffic measurement.</p>
      <p className="bh-muted mt-2">The listed hardware is the setup used for Laya’s result, not a universal minimum deployment requirement. These results describe this release and do not establish the best fit for every workload.</p>
    </section>

    <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="JevBench sources">
      <Link className="text-accent underline" href="/jev-models">Full JevBench board</Link>
      <Link className="text-accent underline" href="/jev-models/alternatives">Open-weight Jev alternatives</Link>
      <a className="text-accent underline" href="https://benchmarkheaven.com/api/jevbench/v1.4.1" rel="noreferrer">Public v1.4.1 aggregate</a>
      <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench/blob/v1.4.1/docs/METHOD-v1.4.md" rel="noreferrer">JevBench method</a>
    </nav>
    <p className="bh-muted mt-3 break-all text-xs">Public aggregate SHA-256: {data.sha256}</p>
    <JevFaq items={faq} />
  </>;
}
