import type { HistoricalSupplement } from '../lib/jevbench-history-supplement.mjs';
export function JevHistoricalSupplementHeader({ artifact }: { artifact: HistoricalSupplement }) {
  return <>
    <h2 className="text-2xl font-bold">Additional historical measurements</h2>
    <p className="mt-2 bh-muted">Measured {artifact.measurement_period.from} through {artifact.measurement_period.to} (UTC); published {artifact.published_on}. {artifact.measurement_basis}</p>
    <p className="mt-2 bh-muted">{artifact.systems.length} complete measurements join this historical table. The frozen v1.5.7 ranking and its top five remain unchanged. Prices are estimates from the original declared references (*est.); latency includes the original self-hosted adjustment. Decision 2.0 Vega is the version measured in this pool.</p>
  </>;
}
