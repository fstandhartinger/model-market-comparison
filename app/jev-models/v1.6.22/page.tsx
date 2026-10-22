import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1622Release, v1622BoardInput } from '../../../lib/jevbench-v1622-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';

export const metadata = { title: seoTitle('JevBench v1.6.22 · four more evaluated systems join the regular draw'), alternates: { canonical: '/jev-models/v1.6.22' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; capability?: number;
  ranks?: { A: number | null; capability: number | null }; cost?: { usd_per_1000?: number | null } };

export default async function JevModelsV1622Page() {
  const release = await readOptionalJevbenchV1622Release();
  if (!release) notFound();
  const board = v1622BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; n_ranked: number; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const row = (key: string) => artifact.systems.find(r => r.key === key);
  const messier = row('messier-one-v0.4');
  const nev = row('nev-2b');
  return <>
    <PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.22" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.22 · 4 rows added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Four more evaluated systems join the regular draw</h1>
      <p className="mt-3 max-w-3xl">The 22 full-draw rows of v1.6.21 keep their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}. Added here, all measured on this draw with an independent review before scoring: <strong>Messier One v0.4</strong> and <strong>Nev-2B</strong>, priced from their frozen base-model references and ranked, and <strong>Nemotron Deciffusion 8B v2</strong> and <strong>Trio-Spark v1.3</strong>, listed with their measured Intelligence, Calibration, Capability and Speed but <strong>not ranked</strong>, because the frozen pricing path gives them no price. Carried ranks shift where a new ranked row sits above them; some carried confidence intervals move with the new roster; no earlier point score moves, and every move is counted in the notes below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.22">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.21">Previous v1.6.21</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1622-method-title" data-bh-jev1622-method>
      <h2 id="jev1622-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own seeded draw, and the gap penalty is measured against that draw&rsquo;s field median. This release keeps the frozen median <strong>{artifact.G_med}</strong> and threshold {threshold}; it does not change the measurement draw or the v1.6.1 scale, so these numbers are <strong>not directly comparable</strong> with the headline board or with earlier draws.</p>
      <p className="mt-2"><strong>Messier One v0.4</strong> (a newer revision of Messier One v0.2) answered all 1,500 items on one rented RTX A6000, so its Speed is not comparable with the H100 and RTX 5090 rows. Its weights are licensed CC BY-NC 4.0 (non-commercial). By the author&rsquo;s default it reports yes/no probabilities between 0.2 and 0.8 at a floor of 0.801, which never changes a decision; the floor-off figure is a footnote in the notes, not the score. It answers the 15 longest items on a truncated state. It ranks {messier?.ranks?.A ?? '–'} of {artifact.n_ranked} on this draw&rsquo;s composite and {messier?.ranks?.capability ?? '–'} by Capability.</p>
      <p className="mt-2"><strong>Nev-2B</strong> answered 1,485 of 1,500 items. The other 15 overflow its own documented 8,192-token context; they are <strong>scored as wrong answers</strong> in the full 1,500-item denominator. The author declares it English-only. It ran on the evaluator&rsquo;s loaded, shared CPU, so its Speed reflects that box, not the model. It ranks {nev?.ranks?.A ?? '–'} of {artifact.n_ranked} on the composite and {nev?.ranks?.capability ?? '–'} by Capability.</p>
      <p className="mt-2"><strong>Nemotron Deciffusion 8B v2</strong> answered all 1,500 items; it answers the 15 longest items on about 10% of their state through its own compaction. <strong>Trio-Spark v1.3</strong> (MachineFi, hosted API) answered 1,398 of 1,500: MachineFi&rsquo;s API refused 58 items because they have 9 options (it supports at most 8), 43 over its 1,024-token input cap and 1 more; all 102 are <strong>scored as wrong answers</strong>. Its latency is raw from Sandy, with no API adjustment. Both rows are <strong>listed but not ranked</strong>: the frozen pricing path gives them no price, so they have no Cost axis, no Composite and no rank in any view. Hosted API figures measure the vendor endpoint; its deployed weights were not independently inspected.</p>
      <p className="mt-2">The carried Nimble-v4, Nimble-v4-max and Sage 1.4 rows keep their published listed-but-not-ranked treatment. <strong>reflex-instinct-0.6b remains listed but not ranked</strong>, as required by deputy decision #18761: its Speed figure is non-official, and the composite weights Speed. The collapsed &ldquo;All data&rdquo; table may show the scorer&rsquo;s composite and a Jev-class verdict for that row; neither is an official placement.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. Some earlier confidence intervals move because the scorer seeds each row&rsquo;s resample by its position in the sorted roster. No rank or score was sent to any model author.</p>
      <div className="mt-3" data-bh-jev1622-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
