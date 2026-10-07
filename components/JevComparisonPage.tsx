import type { JevV15System } from '../lib/jevbench-v15-preview.mjs';
import Link from 'next/link';
import { readJevbenchSeoData } from '../lib/jevbench-seo.mjs';
import { JevCompareV15 } from './JevCompareV15';
import { jevV15CompareRow } from '../lib/jevbench-v15-board.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { boardRankText, costBasisLabel, DatasetFaqJsonLd, JevFaq, JevReleaseStamp, one, usdPerThousand } from './JevBenchSeoBlocks';
import { jevSystemPath } from '../lib/jev-system-slug.mjs';

export async function JevComparisonPage({rivalKey,path,label}: {rivalKey:string;path:string;label:string}) {
  const data = await readJevbenchSeoData();
  const pair = data.comparisons.find((p) => p.key === rivalKey);
  if (!pair) throw new Error(`No published comparison for ${rivalKey}`);
  const {jev,rival} = pair;
  const status = pair.inCurrentRelease ? `${rival.board === 'api' ? 'API offering, ranked on the API leaderboard' : rival.rank == null ? 'Outside the Capability caps' : `Rank #${rival.rank} on the open-weights board`} in ${data.artifact.revision}` : `Not in the current release ranking; last published measurement: ${rival.measurement_revision}, ${rival.last_measured_on ?? 'date not published'}`;
  const faq = [
    {question: `What does JevBench show for Jev and ${label}?`, answer: `Jev 1.13.0 has Capability ${one(jev.capability)} and is the unranked reference (the open-weights board ranks ${data.ranked.length} open-weights systems; hosted API offerings are ranked on the API leaderboard). ${rival.display} has Capability ${one(rival.capability)}. ${status}. Historical scores use their original method and are not ranked against the current release.`},
    {question: 'How does Capability differ from Composite?', answer: 'Capability is the mean of Intelligence and Calibration; headline ranks require both official cost and median-latency caps. Composite additionally scores Speed and Cost and is secondary.'},
    {question: 'Can I compare the prices as actual bills?', answer: `${jev.display}: ${costBasisLabel(jev.cost?.kind)}, ${usdPerThousand(jev.cost?.usd_per_1000)}. ${rival.display}: ${costBasisLabel(rival.cost?.kind)}, ${usdPerThousand(rival.cost?.usd_per_1000)}. Estimates and self-reported vendor prices are not measured charges.`},
    {question: `Is ${label} open source?`, answer: `The published licence note for ${rival.display} is ${rival.licence || 'not stated'}. Jev 1.13.0 is listed as ${jev.licence || 'not stated'}. Check the linked sources for terms.`},
  ];
  const measures = [
    ['Capability Score',one(jev.capability),one(rival.capability)],
    ['Rank (open-weights board)',boardRankText(jev),pair.inCurrentRelease ? (rival.board === 'api' ? boardRankText(rival) : rival.rank == null ? 'Outside caps' : `#${rival.rank}`) : 'Not in current release'],
    ['Composite (secondary)',one(jev.jevbench_score),one(rival.jevbench_score)],
    ...(['intelligence','calibration','speed','cost'] as const).map((axis) => [axis,one(jev.axes[axis]),one(rival.axes[axis])]),
    ['USD per 1,000 decisions',usdPerThousand(jev.cost?.usd_per_1000),usdPerThousand(rival.cost?.usd_per_1000)],
    ['p50 latency (seconds)',one(jev.speed?.p50_s_adjusted ?? jev.speed?.p50_s_raw),one(rival.speed?.p50_s_adjusted ?? rival.speed?.p50_s_raw)],
    ['Last measured',jev.last_measured_on ?? 'unknown',rival.last_measured_on ?? 'unknown'],
  ];
  return <>
    <DatasetFaqJsonLd path={path} artifact={data.artifact} faq={faq} breadcrumbName={`Jev vs ${label}`}/>
    <nav><Link href="/jev-models" className="text-accent underline">Back to JevBench</Link></nav>
    <header className="bh-page-head mt-3"><h1 className="text-3xl font-bold">Jev vs {label}: published benchmark comparison</h1><JevReleaseStamp data={data}/>
      <p className="mt-3">{status}.{rival.board === 'api' && <> <Link className="text-accent underline" href="/jev-models/api">JevBench API leaderboard</Link></>}</p><p className="bh-muted mt-2">Compare Jev-compatible models by separate measures and their measurement conditions. A historical measurement is not a current rank.</p>
    </header>
    <JevCompareV15 rows={[jevV15CompareRow(jev as JevV15System),jevV15CompareRow(rival as JevV15System)]} openDecisions={data.artifact.sample?.open ?? 0} sealedDecisions={data.artifact.sample?.sealed ?? 0}
      categories={jevbenchCategoryView(data.artifact.revision,[jev.key,rival.key],{ supplement: true })} heading={`Jev and ${label}: published axes and category radars`}/>
    <section className="bh-panel mt-6 p-5"><h2 className="text-xl font-semibold">Published values</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm" data-bh-jev-comparison-table><thead><tr><th>Measure</th><th>{jev.display}</th><th>{rival.display}</th></tr></thead><tbody>{measures.map(([name,a,b]) => <tr className="border-t" key={name}><th className="py-2">{name}</th><td>{a}</td><td>{b}</td></tr>)}</tbody></table></div>
    </section>
    <section className="mt-6 grid gap-4 md:grid-cols-2">{[jev,rival].map((row) => <article className="bh-panel p-5" key={row.key}><h2><Link className="text-accent underline" href={jevSystemPath(row.key)}>{row.display}</Link></h2>
      <p>{row.licence || 'Licence not stated'}</p>{row.repo && <a className="text-accent underline" href={row.repo}>Published source</a>}
      <dl className="mt-3 text-sm" data-bh-jev-pair-conditions={row.key}><dt>Measured on</dt><dd>{row.speed?.hardware ?? row.endpoint_condition ?? row.speed?.measured_where ?? 'not stated'}</dd><dt>Cost basis ({costBasisLabel(row.cost?.kind)})</dt><dd>{row.cost?.basis ?? 'not published'}</dd><dt>Latency adjustment</dt><dd>{row.speed?.adjustment ?? 'not stated'}</dd></dl>
    </article>)}</section>
    <nav className="mt-6 flex flex-wrap gap-3">{data.comparisons.filter((p) => p.key !== rivalKey).map((p) => <Link key={p.slug} className="text-accent underline" href={`/jev-models/${p.slug}`}>Jev vs {p.label}</Link>)}</nav>
    <JevFaq items={faq}/>
  </>;
}
