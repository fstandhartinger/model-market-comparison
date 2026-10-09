import { notFound } from 'next/navigation';
import { readOptionalJevbenchV162Release, historicalCatalogue } from '../../../lib/jevbench-v162-release.mjs';
import { JevBenchV16Board } from '../../../components/JevBenchV16Board';
import { JevBenchReleaseVersionNav } from '../../../components/JevBenchReleaseVersionNav';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';
import { withPublicAdapterIds } from '../../../lib/jevbench-v15-release.mjs';

export const metadata = { title: 'JevBench v1.6.2 · fresh native cohort', alternates: { canonical: '/jev-models/v1.6.2' } };
export default async function JevModelsV162Page() {
  const release = await readOptionalJevbenchV162Release();
  if (!release) notFound();
  const historical = release.historical;
  const uniqueRows = historicalCatalogue(historical.artifact, historical.carry);
  const oldKeys = uniqueRows.map(row => row.key);
  const listedRows = release.artifact.systems.filter(row => !row.ranked && ['wrapper', 'subsidized', 'listed'].includes(row.listing ?? ''));
  return <>
    <JevBenchReleaseVersionNav active="v1.6.2" fresh />
    <header className="bh-page-head" data-bh-jev16-release-header>
      <div className="bh-eyebrow">Official JevBench v1.6.2</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench · fresh native cohort</h1>
      <p className="mt-3 max-w-3xl">Paid submissions measured on the same fresh 1,500-decision draw with methodology v1.6. Historical scores retain their original dates and are listed separately below.</p>
      <p className="bh-muted mt-2 text-xs"><a className="text-accent underline" href="/api/jevbench/v1.6.2">Aggregate results JSON</a> · SHA-256 {release.sha256} · <a className="text-accent underline" href="/jev-models">Full historical board</a></p>
    </header>
    <JevBenchV16Board artifact={withPublicAdapterIds(release.artifact)} sha256={release.sha256}
      categories={release.categories} categoriesSha256={release.categoriesSha256}
      carry={{ ...historical.carry, rows: [] }} carrySha256={historical.carrySha256}
      previousKeys={oldKeys} scope="all" />
    {listedRows.length > 0 && <section className="mt-10" aria-labelledby="jev162-listed-title" data-bh-jev162-listed>
      <h2 id="jev162-listed-title" className="text-2xl font-bold">Wrappers and listed systems · not ranked</h2>
      <p className="bh-muted mt-2">These measured systems are listed below the rankings and do not enter the native field median. Their published scores and category values remain available in All data above.</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Measured unranked systems in the fresh JevBench v1.6.2 cohort</caption>
        <thead><tr>{['System', 'Listing', 'Capability', 'Composite', 'Cost / 1,000', 'Median latency'].map(label => <th key={label} className="p-2" scope="col">{label}</th>)}</tr></thead>
        <tbody>{listedRows.map(row => {
          const value = row as unknown as { key: string; display: string; repo?: string; listing?: string; capability?: number; jevbench_score?: number; cost?: { usd_per_1000?: number }; speed?: { p50_s_adjusted?: number } };
          return <tr key={value.key} className="border-t border-line" data-bh-jev162-listed-row={value.key}>
            <th className="p-2 font-normal" scope="row">{value.repo ? <a className="text-accent underline" href={value.repo} target="_blank" rel="noopener noreferrer">{value.display}</a> : value.display}</th>
            <td className="p-2">{value.listing} · not ranked</td>
            <td className="p-2">{value.capability?.toFixed(1) ?? '—'}</td>
            <td className="p-2">{value.jevbench_score?.toFixed(1) ?? '—'}</td>
            <td className="p-2">{value.cost?.usd_per_1000 == null ? '—' : `$${value.cost.usd_per_1000.toFixed(4)}`}</td>
            <td className="p-2">{value.speed?.p50_s_adjusted == null ? '—' : `${value.speed.p50_s_adjusted.toFixed(2)} s`}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>}
    <section className="mt-10" data-bh-jev162-history>
      <h2 className="text-2xl font-bold">Historical model catalogue</h2>
      <p className="bh-muted mt-2">All {uniqueRows.length} previously listed systems retain their original published values. These scores were measured on earlier item sets and do not enter the fresh cohort’s ranking or field median.</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Full historical JevBench catalogue, outside the fresh cohort ranking</caption>
        <thead><tr>{['System', 'Measured', 'Capability', 'Composite', 'Cost / 1,000', 'Median latency'].map(label => <th key={label} className="p-2" scope="col">{label}</th>)}</tr></thead>
        <tbody>{uniqueRows.map(row => {
          const value = row as unknown as { key: string; display: string; last_measured_on?: string; measured_label?: string; measured_in?: string; capability?: number; axes?: { intelligence: number; calibration: number }; jevbench_score?: number; composite_v15?: number; cost?: { usd_per_1000?: number }; speed?: { p50_s_adjusted?: number } };
          const capability = value.capability ?? (value.axes ? (value.axes.intelligence + value.axes.calibration) / 2 : null);
          return <tr key={value.key} className="border-t border-line" data-bh-jev162-historical-row={value.key}>
            <th className="p-2 font-normal" scope="row">{value.display}</th>
            <td className="p-2">{value.measured_label ?? value.last_measured_on ?? value.measured_in ?? 'Not yet measured'}</td>
            <td className="p-2">{capability == null ? '—' : capability.toFixed(1)}</td>
            <td className="p-2">{(value.jevbench_score ?? value.composite_v15)?.toFixed(1) ?? '—'}</td>
            <td className="p-2">{value.cost?.usd_per_1000 == null ? '—' : `$${value.cost.usd_per_1000.toFixed(4)}`}</td>
            <td className="p-2">{value.speed?.p50_s_adjusted == null ? '—' : `${value.speed.p50_s_adjusted.toFixed(2)} s`}</td>
          </tr>;
        })}</tbody>
      </table></div>
      <p className="bh-muted mt-2 text-xs break-all">Historical results SHA-256 {historical.sha256}. Previous board: <a className="text-accent underline" href="/jev-models/v1.6.1">v1.6.1</a>.</p>
    </section>
    <JevHistoryLazy />
  </>;
}
