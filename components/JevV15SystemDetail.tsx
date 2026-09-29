import Link from 'next/link';
import { JevBenchRelatedLinks } from './JevBenchRelatedLinks';
import { JevAxisBand, typeColour } from './JevSystemCharts';
import { JEV_TYPE_LABEL } from './jevTypes';
import { jevSystemPath } from '../lib/jev-system-slug.mjs';
import type { JevV15Artifact, JevV15Option, JevV15System } from '../lib/jevbench-v15-preview.mjs';

const AXES = ['intelligence', 'calibration', 'speed', 'cost'] as const;
const OPTIONS: readonly JevV15Option[] = ['A', 'B', 'C'];
const one = (value: number | null | undefined) => value == null ? '—' : value.toFixed(1);
const precise = (value: number | null | undefined) => value == null ? '—' : value.toFixed(3);
const short = (value: string) => value.split(' (')[0].split(', formerly')[0];

export function JevV15SystemDetail({ artifact, row }: { artifact: JevV15Artifact; row: JevV15System }) {
  const reference = artifact.systems.find((candidate) => candidate.key === 'jev-1.13.0') ?? null;
  const path = jevSystemPath(row.key);
  const classLabel = JEV_TYPE_LABEL[row.class] ?? row.class;
  const headlineRank = row.ranks[artifact.headline];
  const openness = row.open === 'yes' ? 'Code and weights marked open' : row.open === 'weights' ? 'Weights marked open' : row.open === 'no' ? 'Marked closed' : `Openness: ${row.open}`;
  const adjustedP50 = row.speed.p50_s_adjusted;
  const cost = row.cost.usd_per_1000;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `https://benchmarkheaven.com${path}#page`,
    url: `https://benchmarkheaven.com${path}`,
    name: `${row.display} — JevBench ${artifact.revision}`,
    description: `Published JevBench ${artifact.revision} score, option ranks, and aggregate axes for ${row.display}.`,
    isPartOf: { '@id': 'https://benchmarkheaven.com/#website' },
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <nav className="text-sm"><Link href="/jev-models" className="text-accent underline">← Back to the full JevBench leaderboard</Link></nav>
    <header className="bh-page-head mt-3">
      <div className="bh-eyebrow">JevBench {artifact.revision} · individual system</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{row.display}</h1>
      <p className="bh-muted mt-2 max-w-3xl" data-bh-jev-system-subline>
        {classLabel} · {row.author === 'unknown' ? 'Author not recorded' : `by ${row.author}`} · {openness}
      </p>
      <JevBenchRelatedLinks systemKey={row.key} />
      {row.addendum && <p className="bh-muted mt-1 text-sm" data-bh-jev-v15-addendum>{row.addendum.label}</p>}
      <p className="bh-muted mt-1 text-sm">{row.licence || 'License not recorded in the published row.'}</p>
    </header>

    <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
      <section className="bh-panel p-5" aria-labelledby="jev-v15-system-score" data-bh-jev-system-score>
        <h2 id="jev-v15-system-score" className="text-xl font-semibold">JevBench {artifact.revision} score</h2>
        <p className="mt-2 text-3xl font-bold tabular-nums">{precise(row.scores[artifact.headline])}</p>
        <p className="bh-muted mt-1">
          {row.ranked && headlineRank != null
            ? `Option ${artifact.headline}: rank #${headlineRank} of ${artifact.n_ranked} ranked systems.`
            : `${row.listing.replaceAll('_', ' ')} in Option ${artifact.headline}${row.not_ranked_because ? ` — ${row.not_ranked_because}` : ''}.`}
        </p>
        <p className="bh-muted mt-2 text-sm">The three option scores and ranks are published independently; the headline is Option {artifact.headline}.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="bh-table w-full text-sm" data-bh-jev-v15-options>
            <caption className="sr-only">Published JevBench option scores and ranks</caption>
            <thead><tr><th scope="col">Option</th><th scope="col">Score</th><th scope="col">Rank</th></tr></thead>
            <tbody>{OPTIONS.map((option) => <tr key={option}>
              <th scope="row">{option}{option === artifact.headline ? ' · headline' : ''}</th>
              <td className="tabular-nums">{precise(row.scores[option])}</td>
              <td className="tabular-nums">{row.ranks[option] == null ? '—' : `#${row.ranks[option]} of ${artifact.n_ranked}`}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="jev-v15-system-axes">
        <h2 id="jev-v15-system-axes" className="text-xl font-semibold">Published axes</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {AXES.map((axis) => {
            const value = row.axes[axis];
            const baseline = reference?.axes[axis] ?? null;
            return <div className="bh-panel p-4" key={axis}>
              <dt className="bh-muted text-sm capitalize">{axis}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{one(value)}
                {value != null && <JevAxisBand axis={axis} value={value} colour={typeColour(row.class)} reference={baseline} referenceName={short(reference?.display ?? 'Jev 1.13.0')} />}
              </dd>
            </div>;
          })}
        </dl>
        <p className="bh-muted mt-2 text-xs">Bands use the published 0–100 axis values; the marked reference is Jev 1.13.0 when that axis is available.</p>
      </section>
    </div>

    <section className="bh-panel mt-8 p-5" aria-labelledby="jev-v15-system-evidence">
      <h2 id="jev-v15-system-evidence" className="text-xl font-semibold">Run and cost evidence</h2>
      <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Run status</dt><dd className="bh-muted">{row.status.status.replaceAll('_', ' ')}{row.status.rows != null ? ` · ${row.status.rows.toLocaleString('en-US')} decisions` : ''}{row.status.missing != null ? ` · ${row.status.missing.toLocaleString('en-US')} missing` : ''}</dd></div>
        <div><dt className="font-semibold">Cost</dt><dd className="bh-muted">{cost == null ? 'No cost value in the published row.' : `$${cost.toFixed(cost < 0.01 ? 4 : 3)} per 1,000 decisions`}{row.cost.kind ? ` · ${row.cost.kind}` : ''}{row.cost.basis ? ` · ${row.cost.basis}` : ''}</dd></div>
        <div><dt className="font-semibold">Median latency</dt><dd className="bh-muted">{adjustedP50 == null ? 'Not recorded.' : `${adjustedP50.toFixed(3)} seconds, adjusted`}{row.speed.adjustment ? ` · ${row.speed.adjustment}` : ''}</dd></div>
        {row.endpoint_condition && <div><dt className="font-semibold">Endpoint condition</dt><dd className="bh-muted">{row.endpoint_condition}</dd></div>}
        {row.api_flag && <div data-bh-jev-v15-api-flag><dt className="font-semibold">API exposure</dt><dd className="bh-muted">The endpoint received sealed item text{row.api_exposure_note ? ` · ${row.api_exposure_note}` : ''}</dd></div>}
        {row.repo && <div><dt className="font-semibold">Published source</dt><dd><a className="text-accent underline" href={row.repo}>{row.repo}</a></dd></div>}
      </dl>
      {row.underlying && <details className="mt-4 text-sm" data-bh-jev-v15-underlying>
        <summary className="cursor-pointer font-semibold">Model and serving disclosure</summary>
        <p className="bh-muted mt-2">{row.underlying}</p>
      </details>}
      <p className="bh-muted mt-4 text-sm">Values come from the public {artifact.revision} aggregate. Scores and ranks may change in a later release.</p>
    </section>

    <p className="bh-muted mt-8 max-w-3xl text-sm">
      Read the <Link className="text-accent underline" href="/jev-models">full leaderboard</Link>, the <Link className="text-accent underline" href={`/jev-models/${artifact.revision}`}>{artifact.revision} release page</Link>, and the <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench/blob/main/docs/METHOD-v1.5.md">published method</a>.
    </p>
  </>;
}
