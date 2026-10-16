import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1621Release, v1621BoardInput } from '../../../lib/jevbench-v1621-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';

export const metadata = { title: 'JevBench v1.6.21 · d1-ultra (Liquid AI) joins the regular draw, priced and ranked', alternates: { canonical: '/jev-models/v1.6.21' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; capability?: number;
  ranks?: { A: number | null; capability: number | null }; cost?: { usd_per_1000?: number | null } };

export default async function JevModelsV1621Page() {
  const release = await readOptionalJevbenchV1621Release();
  if (!release) notFound();
  const board = v1621BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; n_ranked: number; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const d1u = artifact.systems.find(row => row.key === 'liquid-d1-ultra');
  const usd = d1u?.cost?.usd_per_1000 ?? 0;
  return <>
    <JevBenchReleaseVersionNav active="v1.6.21" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.21 · 1 row added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">d1-ultra (Liquid AI) joins the regular draw, priced and ranked</h1>
      <p className="mt-3 max-w-3xl">The 21 full-draw rows of v1.6.20 keep their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}. Added here: <strong>d1-ultra</strong>, Liquid AI&rsquo;s hosted decision model, measured on 15 October 2026 and priced from Liquid&rsquo;s public list price (USD 0.042 per million input tokens, output free). Carried ranks shift by one where d1-ultra sits above them; some carried confidence intervals move with the new roster; no earlier point score moves, and every move is counted in the notes below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.21">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.20">Previous v1.6.20</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1621-method-title" data-bh-jev1621-method>
      <h2 id="jev1621-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own seeded draw, and the gap penalty is measured against that draw&rsquo;s field median. This release keeps the frozen median <strong>{artifact.G_med}</strong> and threshold {threshold}; it does not change the measurement draw or the v1.6.1 scale, so these numbers are <strong>not directly comparable</strong> with the headline board or with earlier draws.</p>
      <p className="mt-2"><strong>d1-ultra</strong> answered 1,485 of 1,500 items through Liquid&rsquo;s hosted API. The other 15 prompts are longer than the model&rsquo;s 32,768-token input limit; the API refused them (HTTP 422) and they are <strong>scored as wrong answers</strong> in the full 1,500-item denominator. The full-set exposure gate logged all 1,200 sealed items to provider liquid before dispatch. It was measured on Florian&rsquo;s instruction, with no paid order.</p>
      <p className="mt-2"><strong>Cost basis:</strong> Liquid&rsquo;s public pricing page lists d1-ultra at USD 0.042 per million input tokens and no output charge (read on 16 October 2026). That tariff, times the row&rsquo;s own 638,436 provider-reported input tokens over the full 1,500-item basis, gives USD {usd.toFixed(6)} per 1,000 decisions, inside the official USD 0.064595 cap. The frozen pricing module admits it through a one-key change with a zero-difference proof for every other row. It ranks {d1u?.ranks?.A ?? '–'} of {artifact.n_ranked} on this draw&rsquo;s composite and {d1u?.ranks?.capability ?? '–'} by Capability. Hosted API figures measure the vendor endpoint; its deployed weights were not independently inspected.</p>
      <p className="mt-2">The carried Nimble-v4, Nimble-v4-max and Sage 1.4 rows keep their published listed-but-not-ranked treatment. <strong>reflex-instinct-0.6b remains listed but not ranked</strong>, as required by deputy decision #18761: its Speed figure is non-official, and the composite weights Speed. The collapsed &ldquo;All data&rdquo; table may show the scorer&rsquo;s composite and a Jev-class verdict for that row; neither is an official placement.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. Some earlier confidence intervals move because the scorer seeds each row&rsquo;s resample by its position in the sorted roster. No rank or score was sent to the model author.</p>
      <div className="mt-3" data-bh-jev1621-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
