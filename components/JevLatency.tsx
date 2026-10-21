import { jevLatencyView, jevMeasuredTag, latencySeconds, JEV_LATENCY_LABEL, JEV_LATENCY_NOT_COMPARABLE, type JevSpeedLike } from '../lib/jev-latency.mjs';

// CR-439: display only. Shows the measured loopback p50 next to the labelled network-including estimate that the
// ranking and the latency cap use. API rows (no x2 adjustment) render exactly the plain value they always did.
// Chief 11 Oct 2026 (#17482): the measured value always carries its tag ("on-GPU, no network") and is never presented as
// directly comparable with API latency, which is timed end to end from our measuring host.

/** Table cell content. `compact` = narrow cells: measured value, second muted line "est. 0.21 s*". */
export function JevLatencyValue({ speed, digits = 2, compact = true, locale = 'en', kind = null }: { speed: JevSpeedLike; digits?: number; compact?: boolean; locale?: 'en' | 'de'; kind?: string | null }) {
  const v = jevLatencyView(speed, digits, kind);
  const de = locale === 'de';
  const fmt = (s: string) => (de ? s.replace('.', ',') : s);
  if (!v.adjusted) return <>{fmt(latencySeconds(v.estimate, digits))}</>;
  const measured = fmt(latencySeconds(v.measured, 3));
  const estimate = fmt(latencySeconds(v.estimate, digits));
  const title = de
    ? `Selbst gehostetes Modell: gemessener p50 ${measured} auf ${kind === 'gpu' ? 'unserer GPU' : kind === 'cpu' ? 'unserem CPU-Host' : 'unserer eigenen Hardware'} über Loopback (${jevMeasuredTag(kind, 'de')}). Nicht direkt vergleichbar mit API-Latenz, die wir von unserem Messhost aus Ende zu Ende messen, Netzwerk inklusive. Ranking und Latenz-Limit nutzen für alle selbst gehosteten Zeilen dieselbe Schätzung: 2 × gemessen + 150 ms = ${estimate}. Modellautoren können beantragen, dass wir stattdessen einen gehosteten Endpunkt messen.`
    : v.tooltip ?? undefined;
  if (compact) {
    return <span title={title} data-bh-jev-latency="self-hosted">
      <span data-bh-jev-latency-measured>{measured}</span>
      <span className="bh-muted block text-xs" data-bh-jev-latency-measured-tag>{jevMeasuredTag(kind, locale)}</span>
      <span className="bh-muted block text-xs" data-bh-jev-latency-estimate>{de ? 'gesch.' : 'est.'} {estimate}*</span>
    </span>;
  }
  return <span title={title} data-bh-jev-latency="self-hosted">
    <span data-bh-jev-latency-measured>{measured}</span> {de ? 'gemessen' : 'measured'} <span data-bh-jev-latency-measured-tag>{jevMeasuredTag(kind, locale)}</span> · <span data-bh-jev-latency-estimate>{estimate}</span> {de ? 'gesch. inkl. Netzwerk (2x + 150 ms)' : JEV_LATENCY_LABEL}
  </span>;
}

/** One-line legend under a table or chart that contains self-hosted latencies. */
export function JevLatencyLegend({ className = 'bh-muted mt-1 text-xs', locale = 'en' }: { className?: string; locale?: 'en' | 'de' }) {
  if (locale === 'de') return <p className={className} data-bh-jev-latency-legend>
    * Selbst gehostete Modelle: Der erste Wert ist der p50, den wir auf unserer eigenen Hardware über Loopback gemessen haben (auf GPU bzw. CPU, ohne Netzwerk). Er ist
    nicht direkt vergleichbar mit API-Latenz, die wir von unserem Messhost aus Ende zu Ende messen, Netzwerk inklusive. „gesch.“ ist die
    Schätzung inkl. Netzwerk (2x + 150 ms), die Ranking und Latenz-Limit für alle selbst gehosteten Zeilen gleich verwenden. Modellautoren können beantragen, dass wir stattdessen einen gehosteten Endpunkt messen.
  </p>;
  return <p className={className} data-bh-jev-latency-legend>
    * Self-hosted rows: the first value is the p50 we measured on our own hardware over loopback (on-GPU, or on-CPU
    where marked, no network). It is not directly comparable with API latency, which we time end to end from our measuring host,
    network included. “est.” is the {JEV_LATENCY_LABEL} that the ranking and the latency cap use for every self-hosted row. Model authors can ask us to time a hosted endpoint instead (on request).
  </p>;
}

/** Method-note paragraph for the board and the methodology page. */
export function JevLatencyMethodNote({ className = 'bh-muted mt-1 text-sm' }: { className?: string }) {
  return <p className={className} data-bh-jev-latency-method>
    <b>Latency.</b> API models are timed end to end from our measuring host, network included. Self-hosted models are timed on
    our own hardware over loopback (on-GPU, no network), so their measured value is not directly comparable with API latency.
    The ranking and the latency cap use the same estimate for every self-hosted row: 2 × measured p50 + 150 ms
    ({JEV_LATENCY_LABEL}). Tables show the measured value first, tagged “on-GPU, no network”, and the estimate second. A model author can provide a hosted endpoint; we then time it exactly like an API, network
    included, with no assumption (on request: info@productivity-boost.com, or note it in your <a className="text-accent underline" href="/submit">submission</a>). From JevBench v1.7.0 (not before 24 October 2026), a decision that takes longer than 10 seconds counts as failed.
  </p>;
}

/** Detail block for model and comparison pages. `plain` is the page's existing text for rows without an estimate. */
export function JevLatencyDetail({ speed, plain, className = 'mt-3', kind = null }: { speed: JevSpeedLike; plain: string; className?: string; kind?: string | null }) {
  const v = jevLatencyView(speed, 2, kind);
  if (!v.adjusted) return <p className={className}>{plain}</p>;
  return <div className={className} data-bh-jev-latency-detail>
    <p data-bh-jev-latency-measured>Measured p50 latency: {latencySeconds(v.measured, 3)} <span className="bh-muted" data-bh-jev-latency-measured-tag>({v.measuredTag}, loopback; {JEV_LATENCY_NOT_COMPARABLE.replace(/\.$/, '').replace(/^N/, 'n')})</span></p>
    <p data-bh-jev-latency-estimate>Ranking and cap use: {latencySeconds(v.estimate, 2)} <span className="bh-muted">({JEV_LATENCY_LABEL})</span></p>
    <p className="bh-muted mt-1 text-sm">{v.tooltip}</p>
  </div>;
}
