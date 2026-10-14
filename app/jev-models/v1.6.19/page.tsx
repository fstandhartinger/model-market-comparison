import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1619Release, v1619BoardInput } from '../../../lib/jevbench-v1619-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';

export const metadata = { title: 'JevBench v1.6.19 · Ventus-2B same-draw addendum', alternates: { canonical: '/jev-models/v1.6.19' } };

type Row = { key: string; display: string; ranked: boolean; measured_in?: string; capability?: number };
const short = (d: string) => (d.length <= 45 ? d : d.split(' (')[0]);

export default async function JevModelsV1619Page() {
  const release = await readOptionalJevbenchV1619Release();
  if (!release) notFound();
  const board = v1619BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; G_med_flag_gt10: boolean; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const threshold = Math.round((artifact.G_med + 8) * 1000) / 1000;
  const added = artifact.systems.filter(row => row.measured_in === 'v1.6.19');
  const addedKeys = new Set(added.map(row => row.key));
  const unrankedAdded = added.filter(row => !row.ranked);
  const ranked = artifact.systems.filter(row => row.ranked) as Array<Row & { capability: number }>;
  const rowOf = (key: string) => artifact.systems.find(row => row.key === key) as (Row & { capability: number }) | undefined;
  const capOf = (key: string) => (rowOf(key)?.capability ?? 0).toFixed(3);
  return <>
    <JevBenchReleaseVersionNav active="v1.6.19" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.19 · {added.length} rows added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench · {added.length} systems join the regular draw</h1>
      <p className="mt-3 max-w-3xl">The twenty-one full-draw rows of v1.6.18 retain their full 1,500-item results, point scores and categories on draw {release.proof.draw_release}; <strong>reflex-instinct-0.6b</strong> stays <strong>listed but not ranked</strong> (its Speed figure is not official), and the unranked Microsoft A2 re-run is carried through unchanged. Added here: {added.map((row, i) => <span key={row.key}>{i ? ', ' : ''}<strong>{short(row.display)}</strong>{row.ranked ? '' : ' (listed, not ranked)'}</span>)}. Carried ranks may shift below Ventus-2B; some carried confidence intervals move with the new roster; no earlier point score moves, and every move is counted in the notes below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.19">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.18">Previous v1.6.18</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1619-method-title" data-bh-jev1619-method>
      <h2 id="jev1619-method-title" className="text-2xl font-bold">Read these scores against this release only</h2>
      <p className="mt-2">Each JevBench release since v1.6 scores on its own fresh seeded draw, and the gap penalty is measured against the field median of that draw. This release&rsquo;s median is <strong>{artifact.G_med}</strong>, so its penalty threshold sits at {threshold}; the live v1.6.1 board&rsquo;s median is 2.573387642438244. That makes these numbers <strong>not directly comparable</strong> with the headline board or with earlier draws. It was frozen at v1.6.10 over its four members, so it is a small-field figure.</p>
      {artifact.G_med_flag_gt10 ? <p className="mt-2">The field median here is above 10.</p> : null}
      <p className="mt-2" data-bh-ventus-attribution>Ventus-2B by Ethan Xie (https://github.com/XieShaocong33Ethan/Ventus-2B)</p>
      <p className="mt-2"><strong>Ventus-2B</strong> joins as a ranked CPU row: 1,485 of 1,500 answered, 15 HTTP 422 refusals on the pre-registered over-length items. The author&rsquo;s canonical prompt and single-pass letter-logit readout are used; the noul and score mappings are ours. The 2,048-token cap is the author&rsquo;s published max_length; this run refuses instead of truncating. Its frozen base-model reference estimate is USD 0.0090456933 per 1,000 decisions.</p>
      <p className="mt-2">Speed is a loaded shared CPU lower bound: float32 on AVX2 with reference PyTorch kernels, load 7.95–36.16 (mean 18.24). The split measurement window and standard self-hosted x2 + 0.15 s adjustment are disclosed below. The card says apache-2.0 but the LICENSE file is the custom Ventus Community Research &amp; Inference License; the stricter file governs. The previously measured artifact no longer exists and its raw output is not reused.</p>
      <p className="mt-2">Carried Nimble-v4, Nimble-v4-max, SubQ Snap and Sage rows retain their published unpriced, unranked treatment and null preset views. No SubQ re-price is included. No top five changes in any view.</p>
      <p className="mt-2"><strong>reflex-instinct-0.6b is shown but not ranked</strong>, exactly as in v1.6.15: CoS deputy decision #18761 accepts its Intelligence, Calibration and Cost and declares its Speed figure non-official, and the composite weights Speed. In the collapsed &ldquo;All data&rdquo; table further up this page, after the Noul table, it still shows the composite the scorer computed and a Jev-class verdict the site derives from its cost and median latency; neither is an official placement.</p>
      <p className="mt-2">All full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median, so every earlier row keeps its point score, axes, capability and cost. Carried ranks shift only by the newly ranked Ventus-2B above them; some earlier confidence intervals move because the scorer seeds each row&rsquo;s resample by its position in the sorted roster; the notes below count every move. The carried A2 measurement is not rescored here and has no category cells.</p>
      <div className="mt-3" data-bh-jev1619-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
