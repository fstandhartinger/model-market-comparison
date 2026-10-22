import { jevPreviousView, jevMethodView, isRemeasurePending, JEV_REMEASURE_PENDING_NOTE, jevFixed } from '../lib/jev-decision-limit.mjs';

type Row = Parameters<typeof jevPreviousView>[0];
const AXES = ['intelligence', 'calibration', 'speed', 'cost'] as const;

/**
 * Model-page panel "values before the 10 s rule": the v1.6.x numbers this row was published with, labelled as v1.6, so
 * nobody reads them as v1.7. Copies the pattern of data-bh-jev-a4-previous. For a pending row the panel is the only place the
 * numbers appear and says so; the row has no v1.7 values yet.
 */
export function JevPreviousValuesPanel({ row }: { row: Row }) {
  const p = jevPreviousView(row);
  if (!p) return null;
  const pending = isRemeasurePending(row) || jevMethodView(row)?.kind === 'v1.6-pending';
  const remeasured = Boolean((row as { remeasured_in?: string | null } | null | undefined)?.remeasured_in);
  return <section className="bh-panel mt-6 p-5" data-bh-jev-v16-previous={pending ? 'pending' : 'rescored'}>
    <h2 className="font-semibold">JevBench {p.release} values (method v1.6, before the 10 s rule)</h2>
    {pending && <p className="mt-1" data-bh-jev-v16-previous-pending>{JEV_REMEASURE_PENDING_NOTE}</p>}
    <p className="mt-2" data-bh-jev-v16-previous-headline>Capability {jevFixed(p.capability)} · Composite {jevFixed(p.composite)}{p.rank != null ? ` · rank #${p.rank} on the all-systems board` : ''}{p.openBoardRank != null ? ` · #${p.openBoardRank} open weights` : ''}{p.apiBoardRank != null ? ` · #${p.apiBoardRank} API` : ''}</p>
    {p.axes && <p className="bh-muted mt-1 text-sm" data-bh-jev-v16-previous-axes>{AXES.map((a) => `${a} ${jevFixed(p.axes?.[a])}`).join(' · ')}</p>}
    {(p.p50 != null || p.p95 != null) && <p className="bh-muted mt-1 text-sm" data-bh-jev-v16-previous-speed>v1.6 speed basis (124 items): p50 {jevFixed(p.p50, 3)} s · p95 {jevFixed(p.p95, 3)} s</p>}
    {!pending && <p className="bh-muted mt-2 text-sm" data-bh-jev-v16-previous-note={remeasured ? 'remeasured' : 'rescored'}>These figures are kept for comparison. {remeasured
      ? 'The current figures above come from a new GPU measurement on the same items and replace them.'
      : 'The current figures above are re-scored under the 10 s rule from the recorded per-decision times and replace them.'}</p>}
  </section>;
}
