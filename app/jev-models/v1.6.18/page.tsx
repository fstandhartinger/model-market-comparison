import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1618Release, v1618BoardInput } from '../../../lib/jevbench-v1618-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';

export const metadata = { title: 'JevBench v1.6.18 · Bespoke Nimble-v4 and Nimble-v4-max listed', alternates: { canonical: '/jev-models/v1.6.18' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; capability?: number };
const short = (d: string) => (d.length <= 45 ? d : d.split(' (')[0]);

export default async function JevModelsV1618Page() {
  const release = await readOptionalJevbenchV1618Release();
  if (!release) notFound();
  const board = v1618BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const added = artifact.systems.filter(row => row.measured_in === 'v1.6.18');
  const addedKeys = new Set(added.map(row => row.key));
  const unrankedAdded = added.filter(row => !row.ranked);
  const ranked = artifact.systems.filter(row => row.ranked) as Array<Row & { capability: number }>;
  const rowOf = (key: string) => artifact.systems.find(row => row.key === key) as (Row & { capability: number }) | undefined;
  const capOf = (key: string) => (rowOf(key)?.capability ?? 0).toFixed(3);
  return <>
    <JevBenchReleaseVersionNav active="v1.6.18" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.18 · {added.length} rows added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench · {added.length} systems join the regular draw</h1>
      <p className="mt-3 max-w-3xl">The eighteen full-draw rows of v1.6.17 retain their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}; <strong>reflex-instinct-0.6b</strong> stays <strong>listed but not ranked</strong> (its Speed figure is not official), and the unranked Microsoft A2 re-run is carried through unchanged. Added here: {added.map((row, i) => <span key={row.key}>{i ? ', ' : ''}<strong>{short(row.display)}</strong>{row.ranked ? '' : ' (listed, not ranked)'}</span>)}. All carried ranks stay unchanged; some carried confidence intervals move with the new roster; no earlier point score moves, and every move is counted in the notes below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.18">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.17">Previous v1.6.17</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1618-method-title" data-bh-jev1618-method>
      <h2 id="jev1618-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own fresh seeded draw, and the gap penalty is measured against the field median of that draw. This release&rsquo;s median is <strong>{artifact.G_med}</strong>, so its penalty threshold sits at {threshold}; the live v1.6.1 board&rsquo;s median is 2.573387642438244. That makes these numbers <strong>not directly comparable</strong> with the headline board or with earlier draws. It was frozen at v1.6.10 over its four members, so it is a small-field figure.</p>
      {artifact.G_med_flag_gt10 ? <p className="mt-2">The field median here is above 10.</p> : null}
      <p className="mt-2"><strong>Bespoke Nimble-v4 and Nimble-v4-max</strong> are listed but not ranked and unpriced under CoS deputy decision #19084 (the one-time SubQ precedent #18975/#19046; admission #18998, custody #18999). Both answered 1,500 of 1,500 items, all HTTP 200, through Bespoke Labs&rsquo; hosted API. The full-set exposure gate logged all 1,200 sealed items to provider bespoke before dispatch. These are our own additions after Bespoke Labs&rsquo; public announcement, with no paid order.</p>
      <p className="mt-2">The frozen pricing path gives neither row an eligible price; their published tariffs are recorded for information only and are not used. They show measured Intelligence, Calibration, Capability and Speed in the collapsed &ldquo;All data&rdquo; table and detail view, with no Cost, no Composite and no rank in any view. Nimble-v4-max has Capability {capOf('nimble-v4-max')}, above Amos 1 large&rsquo;s {capOf('amos-1-large')}; it remains excluded from every ranking, including the API Capability view and the cost-off, latency 2x settings. No top five changes in any view.</p>
      <p className="mt-2">The carried SubQ Snap and Sage 1.4 rows keep their published unpriced, unranked treatment. All hosted API figures measure vendor endpoints whose deployed weights were not independently inspected; new Nimble latency uses the official subset without API adjustment.</p>
      <p className="mt-2"><strong>reflex-instinct-0.6b is shown but not ranked</strong>, exactly as in v1.6.15: CoS deputy decision #18761 accepts its Intelligence, Calibration and Cost and declares its Speed figure non-official, and the composite weights Speed. In the collapsed &ldquo;All data&rdquo; table further up this page, after the Noul table, it still shows the composite the scorer computed and a Jev-class verdict the site derives from its cost and median latency; neither is an official placement.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. No carried rank moves because the new rows are unranked; some earlier confidence intervals move because the scorer seeds each row&rsquo;s resample by its position in the sorted roster; the notes below count every move. The carried A2 measurement is not rescored here and has no category cells.</p>
      <div className="mt-3" data-bh-jev1618-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
