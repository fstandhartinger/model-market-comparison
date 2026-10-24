import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1620Release, v1620BoardInput } from '../../../lib/jevbench-v1620-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';

export const metadata = { description: 'JevBench v1.6.20 release — SubQ Snap same-draw price addendum. Ranked decision-model results, sources and methodology on Benchmark Heaven.', title: seoTitle('JevBench v1.6.20 · SubQ Snap same-draw price addendum'), alternates: { canonical: '/jev-models/v1.6.20' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; repriced_in?: string; capability?: number; cost?: { basis?: string; usd_per_1000?: number } };

export default async function JevModelsV1620Page() {
  const release = await readOptionalJevbenchV1620Release();
  if (!release) notFound();
  const board = v1620BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const subq = artifact.systems.find(row => row.key === 'subq-snap-preview');
  const cap = (subq?.cost?.usd_per_1000 ?? 0.06479016666666666) / 0.06459465517241379;
  return <>
    <PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.20" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.20 · same-draw price addendum</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">SubQ Snap’s published tariff is now scored</h1>
      <p className="mt-3 max-w-3xl">This release adds a cost axis for <strong>SubQ Snap</strong> using the vendor’s published USD 0.05 per million input tokens, with no output charge, under the scoped I-1 ruling (#19174). It is a same-draw price update: no model requests or new measurements were made. SubQ keeps its v1.6.17 measurement and 1,500 previously recorded responses; the other full-draw rows keep their published point estimates.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.20">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.18">Previous v1.6.18</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1620-method-title" data-bh-jev1620-method>
      <h2 id="jev1620-method-title" className="text-2xl font-bold">Read this price update against this release only</h2>
      <p className="mt-2">Each release since v1.6 scores on its own seeded draw, with the gap penalty measured against that draw’s field median. This release keeps the frozen median <strong>{artifact.G_med}</strong> and threshold {threshold}; it does not change the measurement draw or the v1.6.1 scale.</p>
      <p className="mt-2"><strong>SubQ Snap’s cost basis:</strong> the vendor’s usage tariff is USD 0.05 per million input tokens and output is not charged. Its own usage meter reports 0 output tokens across the 1,500 previously measured responses. The vendor described Snap as a capacity-limited public preview, first come, first served, with new users potentially added to a waitlist after capacity is reached. That availability limit is part of the displayed price basis. The resulting estimate is USD {(subq?.cost?.usd_per_1000 ?? 0.06479016666666666).toFixed(6)} per 1,000 decisions ({cap.toFixed(3)}× the official USD 0.064595 cap), so the row is ranked over the cap and excluded from official cost-capped views. The 100-million-token promotion is not used.</p>
      <p className="mt-2">Only the repriced row’s cost axis and cost-dependent composites and placements may change. Its measured Intelligence, Calibration, Capability, Speed, response count, date and raw bytes remain as published. Every other row retains its prior point estimates. No rank or score was sent to the model author.</p>
      <p className="mt-2"><strong>reflex-instinct-0.6b remains listed but not ranked</strong>, as required by deputy decision #18761: its Speed figure is non-official, and the composite weights Speed. The collapsed “All data” table may show the scorer’s composite and a Jev-class verdict for that row; neither is an official placement.</p>
      <div className="mt-3" data-bh-jev1620-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
