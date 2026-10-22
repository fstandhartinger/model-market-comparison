import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1613Release, v1613BoardInput } from '../../../lib/jevbench-v1613-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';

export const metadata = { title: seoTitle('JevBench v1.6.13 · second fresh regular draw, one row added'), alternates: { canonical: '/jev-models/v1.6.13' } };

export default async function JevModelsV1613Page() {
  const release = await readOptionalJevbenchV1613Release();
  if (!release) notFound();
  const board = v1613BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  return <>
    <PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.13" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">Official JevBench v1.6.13</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench · second fresh regular draw, one row added</h1>
      <p className="mt-3 max-w-3xl">attest-31B-v1.0 joins the six systems of v1.6.12 on the same fresh seeded draw: {release.artifact.systems.length} systems (six self-hosted open systems and one vendor-hosted API) were each scored on the same 1,500 decisions of draw {release.proof.draw_release} (1,200 sealed plus the 300-item public set). The field median stays frozen at its v1.6.10 value, so the six earlier rows keep their scores; only ranks and confidence intervals are recomputed for the larger field. The sealed set was drawn after the previous regular draw shipped and does not overlap it. All {release.artifact.systems.length} rows are complete and ranked. Historical scores keep their original dates and are listed separately below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.13">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.12">Previous v1.6.12 (six rows)</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1613-method-title" data-bh-jev1613-method>
      <h2 id="jev1613-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own fresh seeded draw, and the gap penalty is measured against the field median of that draw. This release&rsquo;s median is <strong>{artifact.G_med}</strong>, so its penalty threshold sits at {threshold}; the live v1.6.1 board&rsquo;s median is 2.573387642438244. That makes these numbers <strong>not directly comparable</strong> with the headline board or with earlier draws. It was frozen at v1.6.10 over its four members, so it is a small-field figure.</p>
      {artifact.G_med_flag_gt10 ? <p className="mt-2">The field median here is above 10.</p> : null}
      <p className="mt-2">Scoring keeps the frozen method: O1S, 1,000 bootstrap samples with seed 16, this draw&rsquo;s own field median (frozen at v1.6.10 and held fixed for every release on this draw), all 1,500 decisions including recorded failures, with one full-set vendor API row and no API equating. Every price on this board is a clearly labelled estimate from a base-model market reference or a documented per-1,000 figure, never a bill one of these systems issued.</p>
      <div className="mt-3" data-bh-jev1613-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
