import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1628Release, v1628BoardInput } from '../../../lib/jevbench-v1628-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';

export const metadata = { title: 'JevBench v1.6.28 · basal-omni-1.0-ultra and PurpleMIST-Flash-1.0 join the regular draw', alternates: { canonical: '/jev-models/v1.6.28' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; capability?: number;
  ranks?: { A: number | null; capability: number | null }; cost?: { usd_per_1000?: number | null } };

export default async function JevModelsV1628Page() {
  const release = await readOptionalJevbenchV1628Release();
  if (!release) notFound();
  const board = v1628BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; n_ranked: number; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const row = (key: string) => artifact.systems.find(r => r.key === key);
  const basal = row('basal-omni-1.0-ultra');
  const usd = (r?: Row) => r?.cost?.usd_per_1000 != null ? `USD ${r.cost.usd_per_1000.toFixed(4)}` : '–';
  return <>
    <JevBenchReleaseVersionNav active="v1.6.28" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.28 · 2 rows added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">basal-omni-1.0-ultra and PurpleMIST-Flash-1.0 join the regular draw</h1>
      <p className="mt-3 max-w-3xl">The 53 full-draw rows of v1.6.27 keep their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}. Added here: <strong>basal-omni-1.0-ultra</strong> (Remek Kinas), a Gemma-4-31B-it decision model, ranked; and <strong>PurpleMIST-Flash-1.0</strong> (Olaverse), a Qwen3.5-9B-Base decision model, <strong>listed but not ranked</strong> because the frozen pricing path has no price for its base model. Both are public submissions measured on our own rented GPUs. Carried ranks shift where the new ranked row sits above them; some carried confidence intervals move with the new roster; no earlier point score moves, and every move is counted in the notes below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.28">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.27">Previous v1.6.27</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1628-method-title" data-bh-jev1628-method>
      <h2 id="jev1628-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own seeded draw, and the gap penalty is measured against that draw&rsquo;s field median. This release keeps the frozen median <strong>{artifact.G_med}</strong> and threshold {threshold}; it does not change the measurement draw or the v1.6.1 scale, so these numbers are <strong>not directly comparable</strong> with the headline board or with earlier draws.</p>
      <p className="mt-2"><strong>basal-omni-1.0-ultra (Remek Kinas).</strong> A public Hugging Face model (Gemma-4-31B-it with a merged LoRA) served by the author&rsquo;s own basal engine, which we ran unmodified on one rented H200 on the spot tier. It answered 1,485 of 1,500 items; the 15 longest items (76k&ndash;82k tokens) ran the GPU out of memory, came back as HTTP 422 and are <strong>scored as wrong answers</strong>. The pre-registered card was an 80 GB H100; none was rentable as a single GPU in the EU, so the run used an H200 under a pre-registration amendment, and its Speed is not strictly comparable to the H100 / RTX 5090 rows. Its cost is an estimate at its base model&rsquo;s market price ({usd(basal)} per 1,000 decisions), inside the official cost cap. It ranks {basal?.ranks?.A ?? '–'} of {artifact.n_ranked} on this draw&rsquo;s composite and {basal?.ranks?.capability ?? '–'} on Capability.</p>
      <p className="mt-2"><strong>PurpleMIST-Flash-1.0 (Olaverse).</strong> A public submission (Qwen3.5-9B-Base with a merged LoRA and a pointer head) served by the author&rsquo;s own code on one rented RTX 6000 Ada. It answered 1,485 of 1,500; the 15 items over the author&rsquo;s own 65,536-token limit are scored as wrong answers. The frozen pricing path has no market-listing decision for its declared base Qwen/Qwen3.5-9B-Base, so it has no Cost, no composite and no rank, the same treatment as jevora-9b-v1 and kev-9b-v2. Its server reports no token usage, so its scored copy carries the offline input counts accepted for its sibling PurpleMIST-Mini-1.0; nothing else differs from the raw.</p>
      <p className="mt-2">The carried listed-but-not-ranked rows keep their treatment, and <strong>reflex-instinct-0.6b remains listed but not ranked</strong>, as required by deputy decision #18761: its Speed figure is non-official, and the composite weights Speed. The collapsed &ldquo;All data&rdquo; table may show the scorer&rsquo;s composite and a Jev-class verdict for an unranked row; neither is an official placement.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. Some earlier confidence intervals move because the scorer seeds each row&rsquo;s resample by its position in the sorted roster. No rank or score was sent to any model author.</p>
      <div className="mt-3" data-bh-jev1628-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
