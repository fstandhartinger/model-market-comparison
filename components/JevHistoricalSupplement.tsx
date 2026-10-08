'use client';
import { Radar, type Spoke } from './JevRadars';
import type { HistoricalSupplement, HistoricalRow } from '../lib/jevbench-history-supplement.mjs';
function CategoryRadar({ row, artifact, dimension }: { row: HistoricalRow; artifact: HistoricalSupplement; dimension: 'topics' | 'usecases' }) {
  const spokes: Spoke[] = artifact.category_dimensions[dimension].map(d => {
    const cell = row.categories[dimension][d.key];
    return { key: d.key, lines: [d.label], values: [cell && cell.n >= artifact.category_min_n ? Math.max(0, cell.competence) : null],
      texts: [cell ? `${cell.competence.toFixed(1)} (n=${cell.n})` : 'n/a'], thin: [!cell || cell.n < artifact.category_min_n], tip: d.covers };
  });
  return <div><h4 className="font-semibold">{dimension === 'topics' ? 'Subject topics' : 'Use cases'}</h4><Radar spokes={spokes}
    series={[{ name: row.name, stroke: '#5b9dff', dashed: false, square: false }]}
    size={{ w: 680, h: 640, r: 180 }} id={`history-${row.key}-${dimension}`} title={`${row.name}: ${dimension}`}
    desc="Actual chance-corrected competence over the historical pool. Below-chance values plot at zero; exact values and sample counts appear on each spoke. Missing or small samples remain gaps." /></div>;
}
export function JevHistoricalSupplement({ artifact, sha256 }: { artifact: HistoricalSupplement; sha256: string }) {
  return <section id="historical-measurements" className="mx-auto max-w-7xl px-4 py-10 sm:px-6" data-jevbench-historical-supplement>
    <h2 className="text-2xl font-bold">Additional historical measurements</h2>
    <p className="mt-2 bh-muted">Measured {artifact.measurement_period.from} through {artifact.measurement_period.to} (UTC); published {artifact.published_on}. {artifact.measurement_basis}</p>
    <p className="mt-2 bh-muted">{artifact.systems.length} complete measurements join this historical table. The frozen v1.5.7 ranking and its top five remain unchanged. Prices are estimates from the original frozen base-model references; latency includes the original self-hosted adjustment. Decision 2.0 Vega is the version measured in this pool.</p>
    <div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Historical model measurements, ordered by original composite A score</caption>
      <thead><tr>{['Model', 'Intelligence', 'Calibration', 'Capability', 'Speed', 'Cost axis', 'Composite A', 'USD / 1,000', 'Median seconds', 'Answers'].map(s => <th key={s} className="p-3">{s}</th>)}</tr></thead>
      <tbody>{artifact.systems.map(row => <tr key={row.key} className="border-t border-line"><th scope="row" className="p-3 font-medium"><a href={`#historical-${row.key}`} className="underline">{row.name}</a></th>
        {[row.axes.intelligence, row.axes.calibration, row.capability, row.axes.speed, row.axes.cost, row.scores.A].map((n, i) => <td key={i} className="p-3 tabular">{n.toFixed(2)}</td>)}
        <td className="p-3 tabular">{row.cost_usd_per_1000.toFixed(5)}</td><td className="p-3 tabular">{row.latency.p50_adj.toFixed(3)}</td><td className="p-3 tabular">{row.status.answered_ok}/{row.status.rows}</td></tr>)}</tbody></table></div>
    <p className="mt-4 text-sm bh-muted">Category radars use stored outcomes and the existing historical subject and use-case labels. {artifact.category_method} Samples below {artifact.category_min_n} remain gaps.</p>
    <div className="mt-5 space-y-3">{artifact.systems.map(row => <details key={row.key} id={`historical-${row.key}`} className="rounded-lg border border-line p-4"><summary className="cursor-pointer font-semibold">{row.name}: category radars and measurement details</summary>
      <p className="mt-3 text-sm bh-muted">Measured {row.measured_on} (UTC) on {row.gpu}. Licence: {row.licence}. <a href={row.repo} className="underline">Model or runtime repository</a>.</p>
      <p className="mt-2 break-words text-sm bh-muted">Measured revisions: <code>{row.model_revision}</code>.</p>
      <p className="mt-2 text-sm bh-muted">{row.measurement_facts}</p>
      <p className="mt-2 text-sm bh-muted">Sources: {row.source_links.map((source, index) => <span key={source.url}>{index > 0 ? ' · ' : ''}<a href={source.url} className="underline">{source.title}</a></span>)}</p>
      <p className="mt-3 text-sm bh-muted">Base model: {row.base_model ?? 'not specified'}. Cost estimate: {row.cost_basis}. Median latency: {row.latency.p50_raw.toFixed(3)} s raw; {row.latency.p50_adj.toFixed(3)} s after ×2 + 0.15 s.</p>
      <div className="grid gap-4 lg:grid-cols-2"><CategoryRadar row={row} artifact={artifact} dimension="topics" /><CategoryRadar row={row} artifact={artifact} dimension="usecases" /></div>
    </details>)}</div>
    <p className="mt-5 text-xs bh-muted"><a href="/api/jevbench/v1.5-supplement" className="underline">Download historical aggregates</a> · SHA256 {sha256}</p>
  </section>;
}
