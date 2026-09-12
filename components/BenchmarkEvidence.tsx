import type { BenchmarkView, ViewAxis, ViewScore } from '../lib/benchmark-view.mjs';
import { ANOMALY_POLICY, profileAnomalies } from '../lib/benchmark-view.mjs';

const fmt = (n: number | null | undefined, digits = 5): string =>
  n == null || !Number.isFinite(n) ? 'unavailable' : String(Number(n.toFixed(digits)));

export function SourceScore({ view, axis, row }: { view: BenchmarkView; axis: ViewAxis; row: ViewScore }) {
  const src = view.sources[row.source];
  const legacy = row.id.startsWith('legacy:');
  const flag = row.derived ? `derived from ${row.basis.replaceAll('_', '-')}` : row.basis.replaceAll('_', '-');
  const flagClass = row.derived ? 'bh-badge bh-muted' : row.basis === 'measured' ? 'bh-badge bh-positive' : row.basis.includes('self') ? 'bh-badge bh-alert' : 'bh-badge';
  const divergence = view.divergences.find((d) => d.self_reported_id === row.id || d.measured_id === row.id);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
      <span className="font-semibold tabular-nums">{fmt(row.value)} {axis.unit}</span>
      <span className={flagClass}>{flag}</span>
      {row.confidenceInterval ? <span className="bh-muted">{Math.round(row.confidenceInterval.level * 100)}% CI {fmt(row.confidenceInterval.lower, 1)}–{fmt(row.confidenceInterval.upper, 1)} {axis.unit}</span> : null}
      {row.costPerRollout != null ? <span className="bh-muted">· {fmt(row.costPerRollout, 2)} USD/rollout</span> : null}
      {divergence && <span className="bh-badge bh-alert">Vendor − measured: {fmt(divergence.delta)} {divergence.unit}</span>}
      {row.lowSample ? <span className="bh-alert">low sample</span> : null}
      {row.battles != null ? <span className="bh-muted">{row.battles} battles</span> : null}
      {row.date ? <span className="bh-muted">observed {row.date.slice(0, 10)}</span> : null}
      {src && <a className="w-full break-words text-xs text-accent underline" href={src.url} target="_blank" rel="noreferrer">{new URL(src.url).hostname.replace(/^www\./, "")} ↗</a>}
      {src?.published ? <span className="bh-muted">published {src.published}</span> : null}
      <details className="w-full">
        <summary className="cursor-pointer">Evidence</summary>
        <div className="bh-muted mt-1 space-y-1 break-words text-xs">
          <div>Axis: {axis.name} · {axis.version} · {axis.cohort}</div>
          <div>Exact value: <code>{String(row.value)}</code> {axis.unit}</div>
          {row.confidenceInterval ? <div>{Math.round(row.confidenceInterval.level * 100)}% confidence interval: {row.confidenceInterval.lower} to {row.confidenceInterval.upper} {axis.unit}</div> : null}
          {row.costPerRollout != null ? <div>Published mean cost: {row.costPerRollout} USD per rollout</div> : null}
          {row.harness ? <div>Evaluation harness: {row.harness}</div> : null}
          <div>Observed: {row.date} · publication date: {src?.published || 'not recorded'}</div>
          <div>Observation id: <code>{row.id}</code></div>
          <div>Source: {src ? <a href={src.url} target="_blank" rel="noreferrer">{src.url}</a> : 'no source record'}</div>
          {!legacy ? (
            <div><a className="text-accent underline" href={`/api/benchmark-scores?observation_id=${encodeURIComponent(row.id)}&benchmark_id=${encodeURIComponent(axis.benchmarkId)}`}>Exact observation and full protocol ↗</a></div>
          ) : null}
          {legacy ? (
            <div>Protocol: <a href={axis.url} target="_blank" rel="noreferrer">inspect</a>{src?.file ? <> · file <code>{src.file}</code></> : null}</div>
          ) : null}
        </div>
      </details>
    </div>
  );
}

export function AnomalySummary({ view, modelId }: { view: BenchmarkView; modelId: string }) {
  const { flags, eligibleFamilies } = profileAnomalies(view, modelId);
  const enough = eligibleFamilies > ANOMALY_POLICY.minProfile;
  const divs = view.divergences.filter((d) => d.model_id === modelId);
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">Profile signals</h3>
      <p className="bh-muted text-sm">
        {flags.length
          ? `${flags.length} threshold-crossing signal${flags.length === 1 ? '' : 's'} flagged`
          : enough
            ? 'No threshold-crossing signal'
            : 'Insufficient evidence to evaluate'}
        {` · ${eligibleFamilies} eligible benchmark families`}
      </p>
      <details className="text-sm bh-muted"><summary>How flags are calculated</summary><p className="text-xs">
        Heuristic screen, not statistical significance: benchmark families are correlated and
        source uncertainty is unknown. Peer evidence needs ≥ {ANOMALY_POLICY.minPeers} independently
        measured matched configurations from ≥ {ANOMALY_POLICY.minFamilies} distinct model families.
        A flag needs a directed population z-score of magnitude ≥ {ANOMALY_POLICY.peerZ} and a gap of
        ≥ {ANOMALY_POLICY.profileGap} from the leave-one-benchmark-family-out mean z in the same
        direction, over ≥ {ANOMALY_POLICY.minProfile} other benchmark families.
      </p></details>
      {flags.length ? (
        <ul className="space-y-2">
          {flags.map((f) => {
            const axis = view.axes.find((a) => a.id === f.axisId);
            const row = axis?.scores.find((s) => s.id === f.scoreId);
            const strong = f.direction === 'strong';
            return (
              <li key={`${f.axisId}@@${f.scoreId}`} className="text-sm">
                <span className={strong ? 'bh-badge bh-positive' : 'bh-badge bh-negative'}>
                  {strong ? 'unusually strong' : 'unusually weak'}
                </span>{' '}
                <span className="font-medium">{axis ? `${axis.name} ${axis.version}` : f.axisId}</span>
                <details className="mt-1">
                  <summary className="cursor-pointer bh-muted">Why</summary>
                  <div className="bh-muted space-y-1 text-xs">
                    <div>Observed: {fmt(f.value)} {axis?.unit ?? ''}</div>
                    <div>Peer mean {fmt(f.mean)} · peer sd {fmt(f.sd)} · n {f.peers} · families {f.peerFamilies}</div>
                    <div>Directed z {fmt(f.z, 3)} · baseline z {fmt(f.baseline, 3)} · gap {fmt(f.gap, 3)} · profile n {f.profileN}</div>
                    {axis && row ? <SourceScore view={view} axis={axis} row={row} /> : null}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Protocol-compatible measured/vendor divergences</h4>
        {divs.length ? (
          <ul className="space-y-3">{divs.map((d) => { const axis = view.axes.find((a) => a.benchmarkId === d.benchmark_id); return <li key={d.id} className="rounded border border-line p-3 text-sm">
            <strong>{axis?.name || d.benchmark_id} · version {axis?.version || d.benchmark_id.split('::')[1]}</strong>
            <p>Self-reported {fmt(d.self_reported_value)} − measured {fmt(d.measured_value)} = {fmt(d.delta)} {d.unit} ({d.relative_percent == null ? 'relative difference undefined: measured value is zero' : `${fmt(d.relative_percent)}% relative difference`}).</p>
            <details><summary>Pair evidence</summary><p className="break-words text-xs">{d.formula} · Protocol: {d.comparison_key}</p><ul>{d.source_urls.map((url, i) => <li key={url+i}><a className="text-accent underline" href={url}>Source {i+1} ↗</a> · {d.source_dates[i]}</li>)}</ul><p className="break-words text-xs">Observation IDs: {d.self_reported_id}; {d.measured_id}</p></details>
          </li>; })}</ul>
        ) : (
          <p className="bh-muted text-sm">
            No verified protocol-compatible vendor/measured pair is available for this model; agreement cannot be assessed.
          </p>
        )}
      </div>
    </section>
  );
}
