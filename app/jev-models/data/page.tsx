import { previewMetadata } from '../../../lib/seo';
import { DecisionGuide } from '../../../components/DecisionBenchmarkGuide';
import { readDecisionBenchmarkManifest } from '../../../lib/decision-benchmark-manifest.mjs';
export const metadata = previewMetadata({ path: '/jev-models/data', title: 'JevBench dataset card & decision model results', documentTitle: 'JevBench dataset card & decision model results', description: 'Download Benchmark Heaven’s own JevBench and ImageJevBench measurements in JSON and CSV, with versions, model pins, dates and methodology.' });
export default async function DataCard() {
  const m = await readDecisionBenchmarkManifest();
  const url = 'https://benchmarkheaven.com/jev-models/data';
  const datasets = [['jevbench', m.revision, m.published_at, m.artifact_sha256], ['imagejevbench', m.image.revision, m.image.built_at, m.image.artifact_sha256]] as const;
  const ld = { '@context': 'https://schema.org', '@graph': datasets.map(([key, version, date, hash]) => ({
    '@type': 'Dataset', '@id': `${url}#${key}`, name: `${key === 'jevbench' ? 'JevBench' : 'ImageJevBench'} by Benchmark Heaven — ${version} results`,
    description: 'Our own published system-level decision model measurements. No third-party benchmark numbers or sealed item-level data.',
    url, version, ...(key === 'jevbench' ? { datePublished: String(date).replace(' UTC','Z').replace(' ','T') } : { dateCreated: date }), identifier: hash,
    creator: { '@type': 'Organization', name: 'Benchmark Heaven', url: 'https://benchmarkheaven.com' },
    isAccessibleForFree: true, license: 'https://creativecommons.org/licenses/by/4.0/',
    variableMeasured: ['Capability', 'Composite', 'Intelligence', 'Calibration', 'Speed', 'Cost'],
    distribution: ['json','csv'].map(format => ({ '@type': 'DataDownload', encodingFormat: format === 'json' ? 'application/json' : 'text/csv', contentUrl: `https://benchmarkheaven.com/api/decision-results/${key}/${version}/${format}` })),
  })) };
  return <DecisionGuide title="JevBench data card & downloadable results" intro="Download only Benchmark Heaven’s own published JevBench and ImageJevBench system-level measurements. JevBench JSON and CSV identify the named release and exact source hash; they contain no Artificial Analysis numbers, sealed questions or per-item predictions.">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g,'\\u003c') }} />
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Versioned downloads</h2>
      {datasets.map(([key, version, date, hash]) => <div className="bh-panel space-y-2 p-4" key={key}><h3 className="font-semibold">{key === 'jevbench' ? 'JevBench' : 'ImageJevBench'} {version}</h3><p>{key === 'jevbench' ? 'Initially published' : 'Artifact built'} {String(date).slice(0,10)} · <a className="text-accent underline" href={`/api/decision-results/${key}/${version}/json`}>JSON</a> · <a className="text-accent underline" href={`/api/decision-results/${key}/${version}/csv`}>CSV</a></p><p className="bh-muted break-all text-xs">Source SHA-256: {hash}</p></div>)}
      <p>{m.current_board_note} Image exports contain the core track, with unrankable measurements labeled. Dated carries and computer-use measurements are separate and never silently blended.</p>
    </section>
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Schema, missing values and units</h2>
      <p>One row per measured system. JSON also contains schema_version, version, source_sha256 and method definitions; JevBench includes published_at and ImageJevBench includes built_at. CSV uses the same row values, repeats the release version, quotes text fields and leaves missing values blank.</p>
      <div className="overflow-x-auto"><table className="bh-table w-full"><thead><tr><th>Fields</th><th>Meaning</th></tr></thead><tbody>
        {[['key, name, source_url', 'Stable system key, published name and model/source URL.'], ['model_pin, last_measured_on', 'Published model pin (commit) or the API model identifier we requested, the provider reported or the author declared, and the measurement date where available; API identifiers may change. Missing values are null. ImageJevBench exports have no model_pin field.'], ['capability, composite, intelligence, calibration, speed, cost_axis', 'Normalized 0–100 scores. The method explains the distinction between Capability and Composite.'], ['ranked, capability_eligible, open_capability_rank', 'Admission, cap eligibility and scoped open-board rank; raw Capability alone is not a rank. Image admission uses ranked and not_ranked_because.'], ['usd_per_1000_decisions, price_kind, price_basis', 'JevBench modeled USD per 1,000 complete decisions and its evidence basis; not an invoice.'], ['p50_raw_s, p50_adjusted_s, latency_adjustment', 'JevBench median latency in seconds and the published adjustment. Image exports retain normalized axes, not invented raw seconds or USD.']].map(([field, meaning]) => <tr key={field}><th className="text-left font-normal">{field}</th><td>{meaning}</td></tr>)}
      </tbody></table></div>
      <p>Null means unavailable, never zero. Reuse of these aggregate exports is under <a className="text-accent underline" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; cite Benchmark Heaven, the exact release, access date and source hash. Original model weights, task sources and third-party data keep their own licenses.</p>
    </section>
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Scope and limitations</h2><p>JevBench evaluates typed text decisions on public and sealed splits. ImageJevBench uses an independent image pool. These samples do not guarantee coverage of your domain; low-count slices, runtime differences, dated carries and admission holds must be read with the result. Full sealed reruns cannot be independently reconstructed from public aggregates.</p><p><a className="text-accent underline" href="https://huggingface.co/datasets/benchmarkheaven/jevbench">Hugging Face results dataset</a> · <a className="text-accent underline" href="https://huggingface.co/spaces/benchmarkheaven/JevBench">Static Hugging Face leaderboard</a> · <a className="text-accent underline" href="/api/jevbench/manifest">Release manifest</a>.</p></section>
  </DecisionGuide>;
}
