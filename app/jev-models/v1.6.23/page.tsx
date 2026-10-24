import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1623Release, v1623BoardInput } from '../../../lib/jevbench-v1623-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';

export const metadata = { description: 'JevBench v1.6.23 release — Sage 1.4 and Bespoke Nimble-v4 / v4-max priced and ranked. Ranked decision-model results, sources and methodology on Benchmark.', title: seoTitle('JevBench v1.6.23 · Sage 1.4 and Bespoke Nimble-v4 / v4-max priced and ranked'), alternates: { canonical: '/jev-models/v1.6.23' } };

type Row = { key: string; display: string; ranked: boolean; repriced_in?: string; capability?: number;
  ranks?: { A: number | null; capability: number | null }; cost?: { usd_per_1000?: number | null } };

export default async function JevModelsV1623Page() {
  const release = await readOptionalJevbenchV1623Release();
  if (!release) notFound();
  const board = v1623BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; n_ranked: number; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const row = (key: string) => artifact.systems.find(r => r.key === key);
  const sage = row('sage-1.4.0');
  const nimble = row('nimble-v4');
  const nimbleMax = row('nimble-v4-max');
  const usd = (r?: Row) => r?.cost?.usd_per_1000 != null ? `USD ${r.cost.usd_per_1000.toFixed(4)}` : '–';
  return <>
    <PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.23" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.23 · price-only update</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Sage 1.4 and Bespoke Nimble-v4 / v4-max are now priced and ranked</h1>
      <p className="mt-3 max-w-3xl">All 26 full-draw rows of v1.6.22 keep their 1,500-item results on draw {release.proof.draw_release}; <strong>no model was called again</strong>. Three rows that v1.6.22 listed without a price now carry their vendors&rsquo; public list prices: <strong>Sage 1.4</strong> (Levanto Labs, USD 0.05 per million input tokens and USD 10 per million output tokens), <strong>Nimble-v4</strong> (Bespoke Labs, USD 0.04 per million input tokens) and <strong>Nimble-v4-max</strong> (USD 0.09 per million input tokens; Nimble output tokens are free). With a cost axis they get composites and ranks. Every other row keeps its point scores and intervals; carried ranks shift where a newly ranked row sits above them, and every move is counted in the notes below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.23">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.22">Previous v1.6.22</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1623-method-title" data-bh-jev1623-method>
      <h2 id="jev1623-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own seeded draw, and the gap penalty is measured against that draw&rsquo;s field median. This release keeps the frozen median <strong>{artifact.G_med}</strong> and threshold {threshold}; it does not change the measurement draw or the v1.6.1 scale, so these numbers are <strong>not directly comparable</strong> with the headline board or with earlier draws.</p>
      <p className="mt-2"><strong>Sage 1.4</strong> answered 1,483 of 1,500 items (15 HTTP 400 and 2 HTTP 504 stay <strong>scored as wrong answers</strong>). Levanto reported no output (reasoning) tokens on any answered item, so its cost here is input tokens only: {usd(sage)} per 1,000 decisions. Its median latency from Sandy is above the official latency cap, so it ranks on the composites ({sage?.ranks?.A ?? '–'} of {artifact.n_ranked} on this draw) but the default Capability view with official caps does not list it. Sage 1.3.0 keeps its v1.6.1 row and rank; Sage 1.4 is Levanto&rsquo;s current version.</p>
      <p className="mt-2"><strong>Nimble-v4</strong> ({usd(nimble)} per 1,000 decisions) is inside the official cost cap. <strong>Nimble-v4-max</strong> ({usd(nimbleMax)} per 1,000 decisions) is <strong>over the official cost cap</strong>: it is ranked on the composites and in the cost-relaxed views, and the official-caps views leave it out. Both answered all 1,500 items. Hosted API figures measure the vendor endpoint; deployed weights were not independently inspected.</p>
      <p className="mt-2">The prices count through a scoped update of the frozen pricing module that adds exactly these three systems and changes no other row&rsquo;s price. Free credit and free-plan usage are not used: each row is priced at the published tariff. <strong>reflex-instinct-0.6b remains listed but not ranked</strong> (deputy decision #18761), and Nemotron Deciffusion 8B v2 and Trio-Spark v1.3 stay listed without a price. The collapsed &ldquo;All data&rdquo; table may show the scorer&rsquo;s composite and a Jev-class verdict for an unranked row; neither is an official placement.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median. No rank or score was sent to any model author.</p>
      <div className="mt-3" data-bh-jev1623-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
