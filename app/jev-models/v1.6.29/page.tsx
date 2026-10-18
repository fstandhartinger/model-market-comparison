import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1629Release, v1629BoardInput } from '../../../lib/jevbench-v1629-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';

export const metadata = { title: 'JevBench v1.6.29 · Torchcast Decision 4B v1.2 and Vega-U join the regular draw', alternates: { canonical: '/jev-models/v1.6.29' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; capability?: number;
  ranks?: { A: number | null; capability: number | null }; cost?: { usd_per_1000?: number | null } };

export default async function JevModelsV1629Page() {
  const release = await readOptionalJevbenchV1629Release();
  if (!release) notFound();
  const board = v1629BoardInput(release);
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
    <JevBenchReleaseVersionNav active="v1.6.29" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.29 · 2 rows added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Torchcast Decision 4B v1.2 and Vega-U join the regular draw</h1>
      <p className="mt-3 max-w-3xl">The 55 full-draw rows of v1.6.28 keep their point scores and categories on draw {release.proof.draw_release}. Added here: <strong>Torchcast Decision 4B v1.2</strong> (Torchcast AI, paid public fast-lane), measured on a Verda FIN-01 A100 SXM4 80GB; and <strong>Vega-U (Qwen3.5-0.8B reader)</strong> (Nandakishor M), measured on our own CPU server. Both answered all 1,500 items and are ranked. Carried ranks and confidence intervals may shift; every move is counted below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.29">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.28">Previous v1.6.28</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1629-method-title" data-bh-jev1629-method>
      <h2 id="jev1629-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own seeded draw, and the gap penalty is measured against that draw&rsquo;s field median. This release keeps the frozen median <strong>{artifact.G_med}</strong> and threshold {threshold}; it does not change the measurement draw or the v1.6.1 scale, so these numbers are <strong>not directly comparable</strong> with the headline board or with earlier draws.</p>
      <p className="mt-2"><strong>Torchcast Decision 4B v1.2.</strong> The author runtime uses noncausal_full_attention (bidirectional full-attention layers, as trained), with no CUDA graphs. The yes/no floor remains 0.801; calibration T is 1.0 (v1.1 used 0.9). Python 3.11 replaces the documented 3.12; prompts over 16,384 tokens retain the head and tail. Weights are now Apache-2.0 (v1.1 was CC BY-NC). It ran in a --network none container on a Verda FIN-01 A100 SXM4 80GB; Speed is not strictly comparable with v1.1 because the device class differs. Its paid fast-lane approval follows the standing 29 September automatic publication rule, including top-five changes; no preview card or button tap is claimed.</p>
      <p className="mt-2"><strong>Vega-U (Nandakishor M).</strong> A sibling of vegaml-0.8b and vegaml-4b: a decision engine on a frozen Qwen3.5-0.8B reader. It ran on our own CPU server with 32 threads, fp32 and --network none. Its Speed is not comparable with GPU rows, including its A6000 siblings. Fifteen of 1,500 items sit at the 73,728-token context cap and are answered on a right-truncated state through the author&rsquo;s own build_prompt; they are answered, not refused.</p>
      <p className="mt-2">The carried listed-but-not-ranked rows keep their treatment, and <strong>reflex-instinct-0.6b remains listed but not ranked</strong>, as required by deputy decision #18761: its Speed figure is non-official, and the composite weights Speed. The collapsed &ldquo;All data&rdquo; table may show the scorer&rsquo;s composite and a Jev-class verdict for an unranked row; neither is an official placement.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. Some earlier confidence intervals move because the scorer seeds each row&rsquo;s resample by its position in the sorted roster. No rank or score was sent to any model author.</p>
      <div className="mt-3" data-bh-jev1629-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
