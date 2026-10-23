import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1625Release, v1625BoardInput } from '../../../lib/jevbench-v1625-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';
import { seoTitle } from '../../../lib/seo';
import { PageJsonLd } from '../../../components/PageJsonLd';

export const metadata = { title: seoTitle('JevBench v1.6.25 · Celeris-1 Decision, Jebadiah 9B v2.1 and StartLux-Decision v1.1 27B join the regular draw'), alternates: { canonical: '/jev-models/v1.6.25' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; capability?: number;
  ranks?: { A: number | null; capability: number | null }; cost?: { usd_per_1000?: number | null } };

export default async function JevModelsV1625Page() {
  const release = await readOptionalJevbenchV1625Release();
  if (!release) notFound();
  const board = v1625BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; n_ranked: number; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const row = (key: string) => artifact.systems.find(r => r.key === key);
  const cel = row('celeris-1-decision');
  const jeb = row('jebadiah-9b-v2-1');
  const sli = row('startlux-decision-v1.1-27b-instant');
  const sla = row('startlux-decision-v1.1-27b-autothink');
  const usd = (r?: Row) => r?.cost?.usd_per_1000 != null ? `USD ${r.cost.usd_per_1000.toFixed(4)}` : '–';
  return <>
    <PageJsonLd meta={metadata} /><JevBenchReleaseVersionNav active="v1.6.25" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.25 · 4 rows added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Celeris-1 Decision, Jebadiah 9B v2.1 and StartLux-Decision v1.1 27B join the regular draw</h1>
      <p className="mt-3 max-w-3xl">The 34 full-draw rows of v1.6.24 keep their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}. Added here, all measured on this draw: <strong>Jebadiah 9B v2.1</strong> by Frontier Infra, served with the author&rsquo;s own server on a rented GPU and priced from its base model&rsquo;s market price; <strong>Celeris-1 Decision</strong> by Celeris, a hosted model from a paid fast-lane order, priced from Celeris&rsquo;s public list price; and <strong>StartLux-Decision v1.1 27B</strong> by StartLux Labs in its Instant and AutoThink variants, served with the author&rsquo;s own server on a rented GPU, priced from their base model&rsquo;s market price and above the official cost cap. All four are ranked. Carried ranks shift where a new ranked row sits above them; some carried confidence intervals move with the new roster; no earlier point score moves, and every move is counted in the notes below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.25">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.24">Previous v1.6.24</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1625-method-title" data-bh-jev1625-method>
      <h2 id="jev1625-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own seeded draw, and the gap penalty is measured against that draw&rsquo;s field median. This release keeps the frozen median <strong>{artifact.G_med}</strong> and threshold {threshold}; it does not change the measurement draw or the v1.6.1 scale, so these numbers are <strong>not directly comparable</strong> with the headline board or with earlier draws.</p>
      <p className="mt-2"><strong>Celeris-1 Decision</strong> (Celeris, hosted API, paid public fast-lane order) answered all 1,500 items, including the 15 longest. Celeris publishes USD 0.04 per million input tokens and does not bill output; that gives {usd(cel)} per 1,000 decisions. Celeris counts input tokens its own way (everything the model reads), about three times the count another hosted decision model reports for the same items, so its cost reflects Celeris&rsquo;s own count. It returns probabilities rounded to two decimals, scored as returned. It ranks {cel?.ranks?.A ?? '–'} of {artifact.n_ranked} on this draw&rsquo;s composite and {cel?.ranks?.capability ?? '–'} by Capability. Its latency is raw from Sandy, with no API adjustment. Hosted API figures measure the vendor endpoint; deployed weights were not independently inspected.</p>
      <p className="mt-2"><strong>Jebadiah 9B v2.1</strong> ran on one rented RTX 5090 with the author&rsquo;s own server; its Speed is a lower bound on that card. It refuses the 15 longest items at its 8,192-token prompt cap, and those are <strong>scored as wrong answers</strong>. Its cost is an estimate at the market price of its base model, Qwen3.5-9B: {usd(jeb)} per 1,000 decisions. The author&rsquo;s model card reports a higher number under a different inference recipe; this row measures the standard read shipped in the repository. It ranks {jeb?.ranks?.A ?? '–'} on the composite and {jeb?.ranks?.capability ?? '–'} by Capability. It is a different model from the Jebadiah 27B row on the headline board, which is unchanged.</p>
      <p className="mt-2"><strong>StartLux-Decision v1.1 27B</strong> (StartLux Labs) is a fine-tune of Qwen3.8-27B; its weights are licensed <strong>CC BY-NC 4.0 (non-commercial)</strong>, and commercial use needs a separate licence from StartLux Labs. Both variants ran on one rented H200 with the author&rsquo;s own server and refuse the 15 longest items, which exceed its 65,536-token context; those are <strong>scored as wrong answers</strong>. Their cost is an estimate at the market price of Qwen3.8-27B: {usd(sli)} per 1,000 decisions for Instant and {usd(sla)} for AutoThink, both <strong>above the official cost cap</strong>, so they are ranked but do not appear in the official cost-capped views. Instant reads each answer once and ranks {sli?.ranks?.A ?? '–'} on the composite and {sli?.ranks?.capability ?? '–'} by Capability. AutoThink writes a short thought when it is unsure; it was measured at the author&rsquo;s server default gate of 0.6, while the model card&rsquo;s own results use 0.9, which was not measured here. It ranks {sla?.ranks?.A ?? '–'} on the composite and {sla?.ranks?.capability ?? '–'} by Capability. JevBench had no StartLux row before; the Torchcast Decision 27B row on the headline board is a fine-tune of StartLux-Decision 27B v1.</p>
      <p className="mt-2">The carried Nemotron Deciffusion 8B v2, Trio-Spark v1.3 and Bongard-mini rows keep their published listed-but-not-ranked treatment. <strong>reflex-instinct-0.6b remains listed but not ranked</strong>, as required by deputy decision #18761: its Speed figure is non-official, and the composite weights Speed. The collapsed &ldquo;All data&rdquo; table may show the scorer&rsquo;s composite and a Jev-class verdict for an unranked row; neither is an official placement.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. Some earlier confidence intervals move because the scorer seeds each row&rsquo;s resample by its position in the sorted roster. No rank or score was sent to any model author.</p>
      <div className="mt-3" data-bh-jev1625-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
