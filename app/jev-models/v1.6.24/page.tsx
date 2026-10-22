import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1624Release, v1624BoardInput } from '../../../lib/jevbench-v1624-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';

export const metadata = { title: seoTitle('JevBench v1.6.24 · six re-measured systems and Sqwish kettei-fat / kettei-chub join the regular draw'), alternates: { canonical: '/jev-models/v1.6.24' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; capability?: number;
  ranks?: { A: number | null; capability: number | null }; cost?: { usd_per_1000?: number | null } };

export default async function JevModelsV1624Page() {
  const release = await readOptionalJevbenchV1624Release();
  if (!release) notFound();
  const board = v1624BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; n_ranked: number; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const row = (key: string) => artifact.systems.find(r => r.key === key);
  const fat = row('kettei-fat');
  const chub = row('kettei-chub');
  const usd = (r?: Row) => r?.cost?.usd_per_1000 != null ? `USD ${r.cost.usd_per_1000.toFixed(4)}` : '–';
  return <>
    <PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.24" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.24 · 8 rows added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Six re-measured systems and Sqwish&rsquo;s kettei-fat and kettei-chub join the regular draw</h1>
      <p className="mt-3 max-w-3xl">The 26 full-draw rows of v1.6.23 keep their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}. Added here, all measured on this draw: six systems we had evaluated before on protocols the board has since retired, <strong>re-measured</strong> with their authors&rsquo; own servers at the evaluated revisions (Decision 2.0 Lux 9B, Imajev-9B, Imajev-2B, ArseneLupin v1.1 and Noma ranked; <strong>Bongard-mini</strong> listed but <strong>not ranked</strong>, because the frozen pricing path gives it no price), and two hosted models from paid fast-lane orders, <strong>kettei-fat</strong> and <strong>kettei-chub</strong> by Sqwish, priced from Sqwish&rsquo;s public list price and ranked. Carried ranks shift where a new ranked row sits above them; some carried confidence intervals move with the new roster; no earlier point score moves, and every move is counted in the notes below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.24">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.23">Previous v1.6.23</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1624-method-title" data-bh-jev1624-method>
      <h2 id="jev1624-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own seeded draw, and the gap penalty is measured against that draw&rsquo;s field median. This release keeps the frozen median <strong>{artifact.G_med}</strong> and threshold {threshold}; it does not change the measurement draw or the v1.6.1 scale, so these numbers are <strong>not directly comparable</strong> with the headline board or with earlier draws.</p>
      <p className="mt-2"><strong>kettei-fat</strong> and <strong>kettei-chub</strong> (Sqwish, hosted API, paid public fast-lane orders) answered 1,485 of 1,500 items each; the other 15 exceed the documented 65,536-token input limit and are <strong>scored as wrong answers</strong>. Every answer named the ordered model, so no fallback size answered. Sqwish publishes USD 0.06 (kettei-fat) and USD 0.04 (kettei-chub) per million input tokens and bills no output; that gives {usd(fat)} and {usd(chub)} per 1,000 decisions. kettei-fat ranks {fat?.ranks?.A ?? '–'} of {artifact.n_ranked} on this draw&rsquo;s composite and {fat?.ranks?.capability ?? '–'} by Capability; kettei-chub ranks {chub?.ranks?.A ?? '–'} and {chub?.ranks?.capability ?? '–'}. Their latency is raw from Sandy, with no API adjustment. Hosted API figures measure the vendor endpoint; deployed weights were not independently inspected.</p>
      <p className="mt-2">The six <strong>re-measured</strong> systems ran on one rented RTX 5090, not the RTX PRO 6000 or H100 of their earlier runs, so their Speed is as measured on that card and <strong>not comparable</strong> with the earlier figures. Decision 2.0 Lux 9B and Noma supersede their historical v1.5 measurements, which stay on the v1.5 supplement page as the record of the old protocol. <strong>Imajev-9B is over the official cost cap</strong>: its cost counts every one of the four option-order passes it computes per question, so it is ranked on the composites but left out of the official cost-capped views; the server-reported basis is a footnote in the notes. Noma truncates long inputs and answers every item; the others refuse or fail the 15 longest items, which are <strong>scored as wrong answers</strong>. <strong>Bongard-mini</strong> is listed with its measured Intelligence, Calibration, Capability and Speed but has no Cost axis, no Composite and no rank in any view.</p>
      <p className="mt-2">The carried Nemotron Deciffusion 8B v2 and Trio-Spark v1.3 rows keep their published listed-but-not-ranked treatment. <strong>reflex-instinct-0.6b remains listed but not ranked</strong>, as required by deputy decision #18761: its Speed figure is non-official, and the composite weights Speed. The collapsed &ldquo;All data&rdquo; table may show the scorer&rsquo;s composite and a Jev-class verdict for an unranked row; neither is an official placement.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. Some earlier confidence intervals move because the scorer seeds each row&rsquo;s resample by its position in the sorted roster. No rank or score was sent to any model author.</p>
      <div className="mt-3" data-bh-jev1624-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
