import { notFound } from 'next/navigation';
import { readOptionalJevbenchV1630Release, v1630BoardInput } from '../../../lib/jevbench-v1630-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../../../lib/jevbench-cost-rule.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';

export const metadata = { title: 'JevBench v1.6.30 · common cost basis on the regular draw', alternates: { canonical: '/jev-models/v1.6.30' } };

type Row = { key: string; display: string; ranked: boolean; ranks?: { A: number | null; capability: number | null };
  cost?: { usd_per_1000?: number | null; common_basis?: { usd_per_1000_all_items?: number } | null } };

export default async function JevModelsV1630Page() {
  const release = await readOptionalJevbenchV1630Release();
  if (!release) notFound();
  const board = v1630BoardInput(release);
  const historical = release.historical;
  const artifact = release.artifact as unknown as { measurement_notes?: string[]; G_med: number; n_ranked: number; systems: Row[] };
  const measurementNotes = artifact.measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const priced = artifact.systems.filter(r => r.cost?.common_basis).sort((a, b) => a.display.localeCompare(b.display));
  const usd = (v?: number | null) => v != null ? v.toFixed(6) : '–';
  return <>
    <JevBenchReleaseVersionNav active="v1.6.30" />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">JevBench v1.6.30 · common cost basis · no row added</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">The common cost basis now applies to the regular draw</h1>
      <p className="mt-3 max-w-3xl">Cost per 1,000 decisions is computed on the same 1,485 items for every token-priced row of draw {release.proof.draw_release}: the 15 very long items are left out of cost for all rows. They are the 15 items the Jev reference refused with max_tokens_exceeded, which the other rows that did not answer them refused or failed on (each at least 76,358 input tokens as counted by the rows that answered them). Rows that refused or failed on those items paid nothing for them, while rows that answered them paid for them. Intelligence, Calibration, Speed and Capability are unchanged on all 57 rows, and a refused item still counts as a wrong answer. Cost, the Cost axis, composites and the placements that follow from them move; every move is counted below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.30">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.29">Previous v1.6.29</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev1630-method-title" data-bh-jev1630-method>
      <h2 id="jev1630-method-title" className="text-2xl font-bold">What changed in v1.6.30</h2>
      <p className="mt-2" data-bh-jev-cost-rule><strong>Cost rule.</strong> {JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
      <p className="mt-2">No model was run again. All 57 full-draw rows were scored in one invocation with O1S, 1,000 bootstrap samples, seed 16 and the frozen v1.6.10 field median {artifact.G_med}, now with the common cost basis. Their raw outputs are byte-identical to v1.6.29, so Intelligence, Calibration, Speed and Capability do not move. The composite intervals of the {priced.length} token-priced rows are re-drawn with the new cost. The earlier v1.6.10 freeze of this draw, which left no item out of cost, is superseded.</p>
      <details className="mt-3"><summary className="cursor-pointer">Cost per 1,000 decisions: common basis against all 1,500 items ({priced.length} token-priced rows)</summary>
        <table className="mt-2 text-sm" data-bh-jev1630-cost-table><thead><tr><th className="pr-4 text-left">Row</th><th className="pr-4 text-right">Common basis (1,485 items), USD</th><th className="text-right">All 1,500 items (v1.6.29), USD</th></tr></thead>
          <tbody>{priced.map(r => <tr key={r.key}><td className="pr-4">{r.display}</td><td className="pr-4 text-right">{usd(r.cost?.usd_per_1000)}</td><td className="text-right">{usd(r.cost?.common_basis?.usd_per_1000_all_items)}</td></tr>)}</tbody></table>
      </details>
      <p className="mt-2" data-bh-jev-open-reference-note><strong>Display only.</strong> Jev 1.14.0 (TypeSafe AI&apos;s current version) is now also shown as a second unranked reference row on the open-weights board, next to Jev 1.13.0, which stays the reference that defines the Jev-class caps. Jev 1.14.0 stays ranked on the API board. This display change recomputes no score, cap or rank and changes no ranking list.</p>
      <div className="mt-3" data-bh-jev1630-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <JevHistoryLazy />
  </>;
}
