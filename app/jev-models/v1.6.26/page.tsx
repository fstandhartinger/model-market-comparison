import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1626Release, v1626BoardInput } from '../../../lib/jevbench-v1626-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';

export const metadata = { description: 'JevBench v1.6.26 release — thirteen re-measured systems join the regular draw; Nimble-v4-max re-priced. Ranked decision-model results, sources and.', title: seoTitle('JevBench v1.6.26 · thirteen re-measured systems join the regular draw; Nimble-v4-max re-priced'), alternates: { canonical: '/jev-models/v1.6.26' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; capability?: number;
  ranks?: { A: number | null; capability: number | null }; cost?: { usd_per_1000?: number | null } };

export default async function JevModelsV1626Page() {
  const release = await readOptionalJevbenchV1626Release();
  if (!release) notFound();
  const board = v1626BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; n_ranked: number; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const row = (key: string) => artifact.systems.find(r => r.key === key);
  const nim = row('nimble-v4-max');
  const usd = (r?: Row) => r?.cost?.usd_per_1000 != null ? `USD ${r.cost.usd_per_1000.toFixed(4)}` : '–';
  return <>
    <PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.26" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.26 · 13 rows added · 1 row re-priced</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Thirteen re-measured systems join the regular draw; Nimble-v4-max is re-priced</h1>
      <p className="mt-3 max-w-3xl">The 38 full-draw rows of v1.6.25 keep their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}. Added here: thirteen systems we had evaluated before on retired protocols, <strong>measured again on this draw</strong> with each author&rsquo;s own server on one rented H100 GPU. Eight are ranked, priced from their base model&rsquo;s market price (two of them above the official cost cap); five are <strong>listed but not ranked</strong>, because the frozen pricing rules have no price for their base model, so they show Intelligence, Calibration, Capability and Speed only. Bespoke Labs lowered its public price for <strong>Nimble-v4-max</strong> from USD 0.09 to 0.04 per million input tokens; the row is re-priced from its own measured tokens (no new measurement). Carried ranks shift where a new or re-priced row sits above them; some carried confidence intervals move with the new roster; no other earlier point score moves, and every move is counted in the notes below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.26">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.25">Previous v1.6.25</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1626-method-title" data-bh-jev1626-method>
      <h2 id="jev1626-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own seeded draw, and the gap penalty is measured against that draw&rsquo;s field median. This release keeps the frozen median <strong>{artifact.G_med}</strong> and threshold {threshold}; it does not change the measurement draw or the v1.6.1 scale, so these numbers are <strong>not directly comparable</strong> with the headline board or with earlier draws.</p>
      <p className="mt-2"><strong>Thirteen re-measured systems.</strong> Each was evaluated once before on an older protocol; on Florian&rsquo;s request that every evaluated model be online, each was measured again on this draw, with its author&rsquo;s own server or runtime at the evaluated revision, offline on one rented H100. Their Speed is as measured on that card. Several stacks had to be rebuilt as of the old build time; each row note says where. Where a system refuses or fails an item (most often the 15 longest items), the item is <strong>scored as a wrong answer</strong>. Kev-9B v2 replaces its historical measurement on the v1.5 supplement page, which stays as the record of the old protocol.</p>
      <p className="mt-2"><strong>Ranked:</strong> Blink-4B, Compass 0.2.0, Jebadiah 9B v2, JPT-4B, RYOTIDE-Qwen and shisa-de-1 inside the official cost cap; JEB-35B-A3B and Nagi-ENORMOUS <strong>above the official cost cap</strong>, so they are ranked but do not appear in the official cost-capped views. Their cost is an estimate at their base model&rsquo;s market price. Blink-4B&rsquo;s weights are for non-commercial research and evaluation; JPT-4B&rsquo;s are CC BY-NC 4.0 (non-commercial).</p>
      <p className="mt-2"><strong>Listed but not ranked:</strong> jevora-9b-v1, Kev-9B v2, Nagi-HUGE, RYOTIDE-Gemma and TDE general large. The frozen pricing rules have no listing decision for their base models, and no price is invented, so they have no Cost, no composite and no rank in any view; their Intelligence, Calibration, Capability and Speed are measured. The collapsed &ldquo;All data&rdquo; table may show the scorer&rsquo;s composite and a Jev-class verdict for an unranked row; neither is an official placement.</p>
      <p className="mt-2"><strong>Nimble-v4-max re-priced.</strong> Bespoke Labs&rsquo; public pricing page now lists Nimble-v4-max at USD 0.04 per million input tokens (it listed 0.09 earlier the same day), output free. The row keeps its measured values; at the new price it costs {usd(nim)} per 1,000 decisions, inside the official cost cap, so its Cost axis and composites rise and it now appears in the official cost-capped views. It ranks {nim?.ranks?.A ?? '–'} of {artifact.n_ranked} on this draw&rsquo;s composite. <strong>Nimble-v4</strong> is unchanged: Bespoke told us in a chat on 16 Oct 2026 that it is deprecated; its pricing page still lists it (only nimble-v3 is marked deprecated there), so it stays ranked and priced.</p>
      <p className="mt-2">The carried Nemotron Deciffusion 8B v2, Trio-Spark v1.3 and Bongard-mini rows keep their published listed-but-not-ranked treatment. <strong>reflex-instinct-0.6b remains listed but not ranked</strong>, as required by deputy decision #18761: its Speed figure is non-official, and the composite weights Speed.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost, except Nimble-v4-max&rsquo;s cost and what follows from it. Some earlier confidence intervals move because the scorer seeds each row&rsquo;s resample by its position in the sorted roster. No rank or score was sent to any model author.</p>
      <div className="mt-3" data-bh-jev1626-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
