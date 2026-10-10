import { notFound } from 'next/navigation';
import { readOptionalJevbenchV164Release, v164BoardInput } from '../../../lib/jevbench-v164-release.mjs';
import { historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';

export const metadata = { title: 'JevBench v1.6.4 · completed fresh native cohort', alternates: { canonical: '/jev-models/v1.6.4' } };
export default async function JevModelsV164Page() {
  const release = await readOptionalJevbenchV164Release();
  if (!release) notFound();
  const board = v164BoardInput(release);
  const historical = release.historical;
  const measurementNotes = (release.artifact as unknown as { measurement_notes?: string[] }).measurement_notes ?? [];
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  // The shared JevV15System listing union predates wrappers; compare the stored string as the Board does.
  const wrapperRows = release.artifact.systems.filter(row => !row.ranked && (row.listing as string) === 'wrapper');
  return <>
    <JevBenchReleaseVersionNav active="v1.6.4" fresh fresh163 fresh164 />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">Official JevBench v1.6.4</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench · completed fresh native cohort</h1>
      <p className="mt-3 max-w-3xl">Same-draw addendum to the published five-model v1.6.3: {release.artifact.systems.length} completed preregistered paid submissions answered the same fresh 1,500-decision draw with methodology v1.6. Four native systems are ranked; {wrapperRows.length} measured {wrapperRows.length === 1 ? 'wrapper is' : 'wrappers are'} listed below the rankings.  Historical scores retain their original dates and are listed separately below.</p>
      <p className="bh-muted mt-2 text-xs break-all"><a className="text-accent underline" href="/api/jevbench/v1.6.4">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models/v1.6.3">Previous v1.6.3 five-system release</a> · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(board.artifact)} sha256={release.sha256}
      categories={board.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    <section className="mt-10 max-w-4xl" aria-labelledby="jev164-addendum-title" data-bh-jev164-addendum-method>
      <h2 id="jev164-addendum-title" className="text-2xl font-bold">Addendum method · whole-field rescoring</h2>
      <p className="mt-2">v1.6.4 computes the six-system completed field together, adding the measured RYOTIDE wrapper to the five systems published in v1.6.3. Their original measurements (raw answers, completion status, cost basis, latency and category cells) are retained unchanged; no inference was rerun.</p>
      <p className="mt-2">The four-native field median G_med remains unchanged from v1.6.3. RYOTIDE is a wrapper and does not enter that median or the ranked cohort. This is a new immutable publication; the published v1.6.3 artifacts remain available.</p>
      <p className="mt-2">The field median is the median Intelligence gap of exactly the four completed native systems ({release.artifact.G_med}). Wrappers and historical rows never enter it. Scoring keeps O1S, 1,000 bootstrap samples with seed 16 and a fixed median, all 1,500 decisions including recorded failures, and the published 1,479-item common cost basis. No API cohort or equating is applied.</p>
      <div className="mt-3" data-bh-jev164-measurement-notes>{measurementNotes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</div>
    </section>
    <section className="mt-10" aria-labelledby="jev164-wrappers-title" data-bh-jev164-wrappers>
      <h2 id="jev164-wrappers-title" className="text-2xl font-bold">Wrappers · listed, not ranked</h2>
      <p className="bh-muted mt-2">These measured serving wrappers are listed below the rankings and are excluded from the native field median. Values are their stored v1.6.4 aggregates.</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Measured wrappers in the completed JevBench v1.6.4 cohort, outside ranking and field median</caption>
        <thead><tr>{['System', 'Listing', 'Capability', 'Composite', 'Cost / 1,000', 'Median latency'].map(label => <th key={label} className="p-2" scope="col">{label}</th>)}</tr></thead>
        <tbody>{wrapperRows.map(row => <tr key={row.key} className="border-t border-line" data-bh-jev164-wrapper-row={row.key} data-capability={row.capability} data-composite={row.jevbench_score ?? undefined}>
          <th className="p-2 font-normal" scope="row"><a className="text-accent underline" href={row.repo} target="_blank" rel="noopener noreferrer">{row.display}</a></th>
          <td className="p-2">wrapper · not ranked · excluded from G_med</td>
          <td className="p-2" title={String(row.capability)}>{row.capability.toFixed(1)}</td>
          <td className="p-2" title={String(row.jevbench_score ?? '')}>{row.jevbench_score?.toFixed(1) ?? '—'}</td>
          <td className="p-2" title={String(row.cost?.usd_per_1000 ?? '')}>{row.cost?.usd_per_1000 == null ? '—' : `$${row.cost.usd_per_1000.toFixed(4)}`}</td>
          <td className="p-2" title={String(row.speed?.p50_s_adjusted ?? '')}>{row.speed?.p50_s_adjusted == null ? '—' : `${row.speed.p50_s_adjusted.toFixed(2)} s`}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
    <section className="mt-10" data-bh-jev164-history>
      <h2 className="text-2xl font-bold">Historical model catalogue</h2>
      <p className="bh-muted mt-2">All {uniqueRows.length} previously listed systems retain their original published values. These scores were measured on earlier item sets and do not enter the fresh cohort’s ranking or field median.</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Full historical JevBench catalogue, outside the fresh cohort ranking</caption>
        <thead><tr>{['System', 'Measured', 'Capability', 'Composite', 'Cost / 1,000', 'Median latency'].map(label => <th key={label} className="p-2" scope="col">{label}</th>)}</tr></thead>
        <tbody>{uniqueRows.map(row => {
          const value = row as unknown as { key: string; display: string; last_measured_on?: string; measured_label?: string; measured_in?: string; capability?: number; axes?: { intelligence: number; calibration: number }; jevbench_score?: number; composite_v15?: number; cost?: { usd_per_1000?: number }; speed?: { p50_s_adjusted?: number } };
          const capability = value.capability ?? (value.axes ? (value.axes.intelligence + value.axes.calibration) / 2 : null);
          return <tr key={value.key} className="border-t border-line" data-bh-jev164-historical-row={value.key}>
            <th className="p-2 font-normal" scope="row">{value.display}</th>
            <td className="p-2">{value.measured_label ?? value.last_measured_on ?? value.measured_in ?? 'Not yet measured'}</td>
            <td className="p-2">{capability == null ? '—' : capability.toFixed(1)}</td>
            <td className="p-2">{(value.jevbench_score ?? value.composite_v15)?.toFixed(1) ?? '—'}</td>
            <td className="p-2">{value.cost?.usd_per_1000 == null ? '—' : `$${value.cost.usd_per_1000.toFixed(4)}`}</td>
            <td className="p-2">{value.speed?.p50_s_adjusted == null ? '—' : `${value.speed.p50_s_adjusted.toFixed(2)} s`}</td>
          </tr>;
        })}</tbody>
      </table></div>
      <p className="bh-muted mt-2 text-xs break-all">Historical results SHA-256 {historical.sha256}. Previous boards: <a className="text-accent underline" href="/jev-models/v1.6.2">v1.6.2</a> · <a className="text-accent underline" href="/jev-models/v1.6.1">v1.6.1</a>.</p>
    </section>
    <JevHistoryLazy />
  </>;
}
