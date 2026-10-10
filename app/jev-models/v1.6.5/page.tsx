import { notFound } from 'next/navigation';
import { readOptionalJevbenchV165Release, v165BoardInput } from '../../../lib/jevbench-v165-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';

export const metadata = { title: 'JevBench v1.6.5 · fresh regular draw', alternates: { canonical: '/jev-models/v1.6.5' } };

export default async function JevModelsV165Page() {
  const release = await readOptionalJevbenchV165Release();
  if (!release) notFound();
  const board = v165BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  return <>
    <JevBenchReleaseVersionNav active="v1.6.5" fresh fresh163 fresh164 fresh165 />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">Official JevBench v1.6.5</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench · fresh regular draw</h1>
      <p className="mt-3 max-w-3xl">The first regular-queue release on a fresh seeded draw: {release.artifact.systems.length} self-hosted open systems each answered the same 1,500 decisions of draw {release.proof.draw_release} (1,200 sealed plus the 300-item public set). Every drawn item had no prior scored use, and the set does not overlap v1.6.0 or the paid fast-lane draw. All {release.artifact.systems.length} rows are complete and ranked. Historical scores keep their original dates and are listed separately below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.5">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.4">Previous v1.6.4 paid cohort</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev165-method-title" data-bh-jev165-method>
      <h2 id="jev165-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own fresh seeded draw, and the gap penalty is measured against the field median of that draw. This release&rsquo;s median is <strong>{artifact.G_med}</strong>, so its penalty threshold sits at {threshold}; the live v1.6.1 board&rsquo;s median is 2.573387642438244. That makes these numbers <strong>not directly comparable</strong> with the headline board or with earlier draws, in a direction that flatters this field rather than penalising it.</p>
      {artifact.G_med_flag_gt10 ? <p className="mt-2">The field median here is above 10, which has not happened in an earlier published JevBench release. No row in this release loses anything to the gap penalty; on the live board&rsquo;s median, four of the eight would. The measured difference is at most two Intelligence points, and the measurement notes below give it per row.</p> : null}
      <p className="mt-2">Scoring keeps the frozen method: O1S, 1,000 bootstrap samples with seed 16, a fixed field median, all 1,500 decisions including recorded failures, and no API lane or equating. Every price on this board is a clearly labelled estimate from a base-model market reference or a documented per-1,000 figure, never a bill one of these systems issued.</p>
      <div className="mt-3" data-bh-jev165-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
