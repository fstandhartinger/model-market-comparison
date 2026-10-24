import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1617Release, v1617BoardInput } from '../../../lib/jevbench-v1617-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';

export const metadata = { description: 'JevBench v1.6.17 release — pjev-2b, metask service v3, Amos 1 and SubQ Snap added. Ranked decision-model results, sources and methodology on Benchmark Heaven.', title: seoTitle('JevBench v1.6.17 · pjev-2b, metask service v3, Amos 1 and SubQ Snap added'), alternates: { canonical: '/jev-models/v1.6.17' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; capability?: number };
const short = (d: string) => (d.length <= 45 ? d : d.split(' (')[0]);

export default async function JevModelsV1617Page() {
  const release = await readOptionalJevbenchV1617Release();
  if (!release) notFound();
  const board = v1617BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const added = artifact.systems.filter(row => row.measured_in === 'v1.6.17');
  const addedKeys = new Set(added.map(row => row.key));
  const unrankedAdded = added.filter(row => !row.ranked);
  const ranked = artifact.systems.filter(row => row.ranked) as Array<Row & { capability: number }>;
  const rowOf = (key: string) => artifact.systems.find(row => row.key === key) as (Row & { capability: number }) | undefined;
  const capOf = (key: string) => (rowOf(key)?.capability ?? 0).toFixed(3);
  return <>
    <PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.17" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.17 · {added.length} rows added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench · {added.length} systems join the regular draw</h1>
      <p className="mt-3 max-w-3xl">The eleven full-draw rows of v1.6.16 retain their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}; <strong>reflex-instinct-0.6b</strong> stays <strong>listed but not ranked</strong> (its Speed figure is not official), and the unranked Microsoft A2 re-run is carried through unchanged. Added here: {added.map((row, i) => <span key={row.key}>{i ? ', ' : ''}<strong>{short(row.display)}</strong>{row.ranked ? '' : ' (listed, not ranked)'}</span>)}. Ranks recompute over the new roster and some carried confidence intervals move with it; no earlier point score moves, and every move is counted in the notes below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.17">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.16">Previous v1.6.16</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1617-method-title" data-bh-jev1617-method>
      <h2 id="jev1617-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own fresh seeded draw, and the gap penalty is measured against the field median of that draw. This release&rsquo;s median is <strong>{artifact.G_med}</strong>, so its penalty threshold sits at {threshold}; the live v1.6.1 board&rsquo;s median is 2.573387642438244. That makes these numbers <strong>not directly comparable</strong> with the headline board or with earlier draws. It was frozen at v1.6.10 over its four members, so it is a small-field figure.</p>
      {artifact.G_med_flag_gt10 ? <p className="mt-2">The field median here is above 10.</p> : null}
      <p className="mt-2"><strong>pjev-2b</strong> (Kailune AI; MiniCPM5-2B with a merged adapter, Apache-2.0) was measured on the evaluator&rsquo;s own shared CPU across four sittings under different host load, so its Speed is a loaded-shared-host figure; 1,485 of 1,500 items were answered and the 15 longest are HTTP 422 refusals by the author&rsquo;s own code, the same 15 that Uniphore-4B-Decider, Attest-31B and Standard One 3B SH could not answer.</p>
      <p className="mt-2"><strong>metask-jev-rain-31B-trained service v3</strong> is a paid fast-lane row and a <strong>re-submission</strong> of the weights behind the published metask-jev-rain-31B-trained row, with a changed service layer that may have been tuned on that row&rsquo;s published aggregates; both rows are shown. It was timed on an RTX PRO 6000 rather than the H100 of the earlier metask rows, so its Speed rests on different hardware.</p>
      <p className="mt-2"><strong>SubQ Snap (preview)</strong> is <strong>listed but not ranked</strong>: its cost is unpriced until its preview tariff passes the pricing re-freeze (CoS deputy decision #18975), and without a cost axis there is no composite. It shows Intelligence, Calibration and Capability in the collapsed &ldquo;All data&rdquo; table only. Its Capability {capOf('subq-snap-preview')} is higher than that of every ranked row except {ranked.filter(row => row.capability > (rowOf('subq-snap-preview')?.capability ?? Infinity)).map(row => short(row.display)).join(', ')}: it is withheld from every ranking, not rated lower, and ranking it would change the public Capability rankings, which needs Florian&rsquo;s review.</p>
      {addedKeys.has('sage-1.4.0') ? <p className="mt-2"><strong>Sage 1.4 (Levanto Labs)</strong> is <strong>listed but not ranked</strong>: the frozen pricing path has no reference price for it (its tariff is in neither frozen set), so its cost is unpriced and it has no composite; the question of how to price it is still open (CoS deputy question #18983, not yet answered). Its Capability {capOf('sage-1.4.0')} is withheld from every ranking, not rated lower. The earlier Sage 1.3.0 row is a separate published row and stays unchanged.</p> : null}
      <p className="mt-2"><strong>Hosted-API rows</strong> ({added.filter(row => ['amos-1-medium', 'amos-1-large', 'sage-1.4.0', 'subq-snap-preview'].includes(row.key)).map(row => short(row.display)).join(', ')}) are measurements of the vendor&rsquo;s endpoint, not of independently inspected weights. A hosted row whose estimated cost is above the official Jev-class cost cap (Amos 1 medium{addedKeys.has('amos-1-large') ? ' and Amos 1 large' : ''}) is ranked and disclosed, and is therefore not on the default (cost-capped) Capability ranking; its composite is held down by the squared cost gate.{addedKeys.has('amos-1-large') ? <> Amos 1 large is first in the API board&rsquo;s Capability ranking with the cost cap off and latency 2x, published on Florian&rsquo;s explicit GO.</> : null}</p>
      {addedKeys.has('purplemist-mini-1.0') ? <p className="mt-2"><strong>PurpleMIST-Mini-1.0</strong> was measured on the evaluator&rsquo;s own shared CPU; its server reports no token usage, so its cost uses an offline count of input tokens with the author&rsquo;s own tokenizer (CoS deputy decision #18974). 1,485 of 1,500 items were answered; the 15 longest are HTTP 422 refusals by the author&rsquo;s own code, the same 15 as pjev-2b; it was measured across two sittings under different host load, so its Speed is a loaded-shared-host figure.</p> : null}
      {unrankedAdded.length > 1 ? <p className="mt-2">Rows listed but not ranked in this release: {unrankedAdded.map(row => short(row.display)).join(', ')}.</p> : null}
      <p className="mt-2"><strong>reflex-instinct-0.6b is shown but not ranked</strong>, exactly as in v1.6.15: CoS deputy decision #18761 accepts its Intelligence, Calibration and Cost and declares its Speed figure non-official, and the composite weights Speed. In the collapsed &ldquo;All data&rdquo; table further up this page, after the Noul table, it still shows the composite the scorer computed and a Jev-class verdict the site derives from its cost and median latency; neither is an official placement.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. Ranks move where a newly ranked row joins above an earlier one, and some earlier confidence intervals move because the scorer seeds each row&rsquo;s resample by its position in the sorted roster; the notes below count every move. The carried A2 measurement is not rescored here and has no category cells.</p>
      <div className="mt-3" data-bh-jev1617-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
