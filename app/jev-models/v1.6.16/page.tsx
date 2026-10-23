import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1616Release, v1616BoardInput } from '../../../lib/jevbench-v1616-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';

export const metadata = { title: seoTitle('JevBench v1.6.16 · vLLM-SR d3 added'), alternates: { canonical: '/jev-models/v1.6.16' } };

export default async function JevModelsV1616Page() {
  const release = await readOptionalJevbenchV1616Release();
  if (!release) notFound();
  const board = v1616BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  return <>
    <PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.16" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.16 · one row added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench · vLLM-SR d3 joins the regular draw</h1>
      <p className="mt-3 max-w-3xl">The ten full-draw rows of v1.6.15 retain their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}; <strong>reflex-instinct-0.6b</strong> stays <strong>listed but not ranked</strong> (its Speed figure is not official), and the unranked Microsoft A2 re-run is carried through unchanged. One self-hosted system is added: <strong>vLLM-SR d3</strong> (<code>vllm-sr/d3</code>, a Qwen3.8-27B fine-tune, Apache-2.0 weights, training data not disclosed). It has the highest Capability of this draw, but its cost is an estimate far above the Jev-class cost cap, so it is not on the default capped Capability ranking and the squared cost gate keeps its composite small. It was timed on an RTX PRO 6000 GPU, while this draw&rsquo;s other GPU rows, Perplexity Decider and Torchcast-Decision-27B were timed on an H100. Ranks recompute over the new roster; no earlier point score moves.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.16">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.15">Previous v1.6.15</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1616-method-title" data-bh-jev1616-method>
      <h2 id="jev1616-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own fresh seeded draw, and the gap penalty is measured against the field median of that draw. This release&rsquo;s median is <strong>{artifact.G_med}</strong>, so its penalty threshold sits at {threshold}; the live v1.6.1 board&rsquo;s median is 2.573387642438244. That makes these numbers <strong>not directly comparable</strong> with the headline board or with earlier draws. It was frozen at v1.6.10 over its four members, so it is a small-field figure.</p>
      {artifact.G_med_flag_gt10 ? <p className="mt-2">The field median here is above 10.</p> : null}
      <p className="mt-2"><strong>vLLM-SR d3 (vllm-sr-d3).</strong> Revision 5ce995dfb7ff07da00fec4211eb7f0560f52eaf8, base Qwen/Qwen3.8-27B, Apache-2.0 weights; the author does not disclose the training data. 1,500 of 1,500 items answered with 0 errors, and a 50-item determinism check was bit-identical. It was measured offline on one rented RTX PRO 6000 Blackwell 96 GB GPU because no single H100 was available, while this draw&rsquo;s other GPU rows, Perplexity Decider and Torchcast-Decision-27B were timed on an H100, so its Speed axis rests on different hardware from those rows; the standard self-hosted &times;2 + 0.15 s adjustment (an assumption) is applied on top. Its cost of USD 0.5463374 per 1,000 decisions is an <strong>estimate</strong>: the frozen Qwen3.8-27B list reference (the same basis as Perplexity Decider and Torchcast-Decision-27B) times its own measured tokens. That is far above the official Jev-class cost cap, so d3 is <strong>not</strong> on the default (capped) Capability ranking, and its composite is small because of the squared cost gate.</p>
      <p className="mt-2"><strong>reflex-instinct-0.6b is shown but not ranked</strong>, exactly as in v1.6.15: CoS deputy decision #18761 accepts its Intelligence, Calibration and Cost and declares its Speed figure non-official, and the composite weights Speed. In the collapsed &ldquo;All data&rdquo; table further up this page, after the Noul table, it still shows the composite the scorer computed and a Jev-class verdict the site derives from its cost and median latency; neither is an official placement.</p>
      <p className="mt-2">All eleven full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. Ranks move: d3 joins at the top of this draw&rsquo;s Capability order, so every ranked earlier row moves down one Capability place, and it joins between krino-2b and phocinae-largha-150m-v1 on the composites. No earlier row&rsquo;s confidence interval moved; the notes below count every move. The carried A2 measurement is not rescored here and has no category cells.</p>
      <div className="mt-3" data-bh-jev1616-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
