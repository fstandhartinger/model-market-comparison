import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1615Release, v1615BoardInput } from '../../../lib/jevbench-v1615-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';

export const metadata = { title: 'JevBench v1.6.15 · three self-hosted CPU systems added', alternates: { canonical: '/jev-models/v1.6.15' } };

export default async function JevModelsV1615Page() {
  const release = await readOptionalJevbenchV1615Release();
  if (!release) notFound();
  const board = v1615BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  return <>
    <JevBenchReleaseVersionNav active="v1.6.15" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.15 · three rows added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench · three self-hosted CPU systems join the regular draw</h1>
      <p className="mt-3 max-w-3xl">The seven official rows of v1.6.14 retain their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}, and the unranked Microsoft A2 re-run is carried through unchanged. Three self-hosted systems are added, each measured on the evaluator&rsquo;s own shared CPU host at no cost: <strong>phocinae-largha-150m-v1</strong>, <strong>julia-1</strong> and <strong>reflex-instinct-0.6b</strong>. The last of those is <strong>listed but not ranked</strong>: its Speed figure was measured while other work ran on the same machine and is not official, and the composite weights Speed. Ranks and confidence intervals recompute over the new roster; no earlier point score moves.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.15">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.14">Previous v1.6.14</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1615-method-title" data-bh-jev1615-method>
      <h2 id="jev1615-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own fresh seeded draw, and the gap penalty is measured against the field median of that draw. This release&rsquo;s median is <strong>{artifact.G_med}</strong>, so its penalty threshold sits at {threshold}; the live v1.6.1 board&rsquo;s median is 2.573387642438244. That makes these numbers <strong>not directly comparable</strong> with the headline board or with earlier draws. It was frozen at v1.6.10 over its four members, so it is a small-field figure.</p>
      {artifact.G_med_flag_gt10 ? <p className="mt-2">The field median here is above 10.</p> : null}
      <p className="mt-2"><strong>reflex-instinct-0.6b is shown but not ranked.</strong> It is absent from the ranking charts, the Composite and Capability boards, the compare view and the category radars, because those are ranked views and this row has no rank: CoS deputy decision #18761 accepts its Intelligence, Calibration and Cost and declares its Speed figure non-official, and the composite weights Speed. Its accepted figures are Intelligence 3.960, Calibration 73.153, Capability 38.556 and USD 0.00630127 per 1,000 decisions &mdash; and its Capability is in fact the highest of the three new rows. In the collapsed &ldquo;All data&rdquo; table further up this page, after the Noul table, the row still shows its composite as the scorer computed it, and a Jev-class verdict the site derives from its cost per decision and its median latency against the frozen Jev-class caps. The composite weights the Speed axis, and that latency is the very measurement #18761 declares non-official for this row, so neither figure is an official placement and neither should be quoted as one.</p>
      <p className="mt-2">All ten full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. The scorer draws <strong>one shared paired resample</strong> for the whole field, so adding rows moves the earlier rows&rsquo; confidence intervals even though no point estimate changes. The three new rows ran on a shared 12-thread CPU host while other jobs were running, each logging its own one-minute load trace: their Speed figures are lower bounds, and the standard self-hosted &times;2 + 0.15 s adjustment is applied on top. Each of the three is priced from its own measured token usage at a clearly labelled estimate rate, on the full 1,500-item basis, well under the published ceiling of USD 0.0646 per 1,000 decisions &mdash; none of those figures is a bill. The carried A2 measurement is not rescored here and has no category cells.</p>
      <div className="mt-3" data-bh-jev1615-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
