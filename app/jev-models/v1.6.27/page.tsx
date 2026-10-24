import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1627Release, v1627BoardInput } from '../../../lib/jevbench-v1627-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';

export const metadata = { description: 'JevBench v1.6.27 release — Jev 1.14.0 (TypeSafe API) and Verdin-4B join the regular draw. Ranked decision-model results, sources and methodology on.', title: seoTitle('JevBench v1.6.27 · Jev 1.14.0 (TypeSafe API) and Verdin-4B join the regular draw'), alternates: { canonical: '/jev-models/v1.6.27' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; capability?: number;
  ranks?: { A: number | null; capability: number | null }; cost?: { usd_per_1000?: number | null } };

export default async function JevModelsV1627Page() {
  const release = await readOptionalJevbenchV1627Release();
  if (!release) notFound();
  const board = v1627BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; n_ranked: number; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const row = (key: string) => artifact.systems.find(r => r.key === key);
  const jev = row('jev-1.14.0');
  const verdin = row('verdin-4b');
  const usd = (r?: Row) => r?.cost?.usd_per_1000 != null ? `USD ${r.cost.usd_per_1000.toFixed(4)}` : '–';
  return <>
    <PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.27" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.27 · 2 rows added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Jev 1.14.0 (TypeSafe API) and Verdin-4B join the regular draw</h1>
      <p className="mt-3 max-w-3xl">The 51 full-draw rows of v1.6.26 keep their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}. Added here: <strong>Jev 1.14.0</strong>, the newest version of TypeSafe&rsquo;s hosted Jev API, measured on this draw and priced at TypeSafe&rsquo;s public list price; and <strong>Verdin-4B</strong>, a public submission measured on our own CPU. Both are ranked. Carried ranks shift where a new row sits above them; some carried confidence intervals move with the new roster; no earlier point score moves, and every move is counted in the notes below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.27">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.26">Previous v1.6.26</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1627-method-title" data-bh-jev1627-method>
      <h2 id="jev1627-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own seeded draw, and the gap penalty is measured against that draw&rsquo;s field median. This release keeps the frozen median <strong>{artifact.G_med}</strong> and threshold {threshold}; it does not change the measurement draw or the v1.6.1 scale, so these numbers are <strong>not directly comparable</strong> with the headline board or with earlier draws.</p>
      <p className="mt-2"><strong>Jev 1.14.0 (TypeSafe AI, hosted API).</strong> Measured through TypeSafe&rsquo;s API on all 1,500 items of this draw with our own key; it answered 1,485, and the 15 items longer than its default context length were refused and are <strong>scored as wrong answers</strong>. TypeSafe documents an opt-in long-context mode (request header <code>TypeSafe-Danger-Zone-Long-Context: true</code>, up to 262k tokens at the same per-token price); this run used the default 64k context, as every hosted row of this draw used its default, so the 15 longest items were refused. It is priced at TypeSafe&rsquo;s public list price, USD 0.042 per million input tokens with output free, the same price as Jev 1.13.0: {usd(jev)} per 1,000 decisions, inside the official cost cap. It ranks {jev?.ranks?.A ?? '–'} of {artifact.n_ranked} on this draw&rsquo;s composite. TypeSafe&rsquo;s docs list Jev 1.14 as the newest release; their <code>jev-latest</code> alias still points to Jev 1.13.0 and <code>jev-preview</code> to Jev 1.14.0.</p>
      <p className="mt-2"><strong>The Jev reference stays Jev 1.13.0.</strong> The cost and latency caps of the official views are twice Jev 1.13.0&rsquo;s cost and latency as measured in v1.5.7, frozen for the whole v1.6 line. Jev 1.14.0 is a new row on the board; it does not replace that reference, because moving the caps would re-sort the capped views of every release.</p>
      <p className="mt-2"><strong>Verdin-4B (Victor Bennett).</strong> A public submission (Qwen3.5-4B with a merged LoRA and a pointer head). The author serves it on one RTX 5090; we ran the author&rsquo;s own documented CPU path in float32 on our shared CPU, so its <strong>Speed is a lower bound</strong>, not the speed of the author&rsquo;s deployment. It answered 1,485 of 1,500; the 15 items over its own 65,536-token limit are scored as wrong answers. Its cost is an estimate at its base model&rsquo;s market price ({usd(verdin)} per 1,000 decisions); it ranks {verdin?.ranks?.A ?? '–'} on the composite. Its weights are CC BY-NC 4.0 (non-commercial).</p>
      <p className="mt-2">The carried listed-but-not-ranked rows keep their treatment, and <strong>reflex-instinct-0.6b remains listed but not ranked</strong>, as required by deputy decision #18761: its Speed figure is non-official, and the composite weights Speed. The collapsed &ldquo;All data&rdquo; table may show the scorer&rsquo;s composite and a Jev-class verdict for an unranked row; neither is an official placement.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. Some earlier confidence intervals move because the scorer seeds each row&rsquo;s resample by its position in the sorted roster. No rank or score was sent to any model author.</p>
      <div className="mt-3" data-bh-jev1627-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
