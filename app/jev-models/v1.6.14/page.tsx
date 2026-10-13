import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1614Release, v1614BoardInput } from '../../../lib/jevbench-v1614-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';

export const metadata = { title: 'JevBench v1.6.14 · second fresh regular draw, one row added', alternates: { canonical: '/jev-models/v1.6.14' } };

export default async function JevModelsV1614Page() {
  const release = await readOptionalJevbenchV1614Release();
  if (!release) notFound();
  const board = v1614BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  return <>
    <JevBenchReleaseVersionNav active="v1.6.14" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.14 · A2 addendum</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench · second fresh regular draw, one row added</h1>
      <p className="mt-3 max-w-3xl">Seven official rows from v1.6.13 retain their full 1,500-item results, ranks and categories on draw {release.proof.draw_release}. Microsoft-Decision-1 (Azure Foundry) adds a separate, unranked A2 re-run: 300 supplementary sealed plus 300 public decisions, with an equating pool of four of six self-hosted systems. It does not replace the official Microsoft measurement or enter any ranking. Historical scores keep their original dates.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.14">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.13">Previous v1.6.13 (seven rows)</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1614-method-title" data-bh-jev1614-method>
      <h2 id="jev1614-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own fresh seeded draw, and the gap penalty is measured against the field median of that draw. This release&rsquo;s median is <strong>{artifact.G_med}</strong>, so its penalty threshold sits at {threshold}; the live v1.6.1 board&rsquo;s median is 2.573387642438244. That makes these numbers <strong>not directly comparable</strong> with the headline board or with earlier draws. It was frozen at v1.6.10 over its four members, so it is a small-field figure.</p>
      {artifact.G_med_flag_gt10 ? <p className="mt-2">The field median here is above 10.</p> : null}
      <p className="mt-2">The inherited full-set rows keep O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median. The A2 measurement uses the pinned supplementary scorer with the lead-authorized four-system preliminary equating pool; its broad confidence intervals include offset uncertainty. Seven HTTP 422 responses count as wrong. Pool re-runs used H200 versus H100 parents. API latency was measured from Sandy (Germany); Azure Foundry tariff USD 0.042/M input and zero output, with unknown invoice, warmup and refusal charges. Category comparisons cover the seven official rows only.</p>
      <div className="mt-3" data-bh-jev1614-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
