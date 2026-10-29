import { jevDecisionLimitView, isRemeasurePending, JEV_NOT_RESCORED, JEV_LIMIT_RULE_EN } from '../lib/jev-decision-limit.mjs';

type Row = Parameters<typeof jevDecisionLimitView>[0];

/**
 * Table cell content for the 10 s rule: the measured (raw) p95 and the number of decisions over the limit, side by side.
 * The raw p95 always sits next to the count because the limit uses the measured time, while the displayed adjusted time
 * for self-hosted rows is an assumption. Pending rows show "re-measure pending", never a v1.6 value in a v1.7 cell.
 */
export function JevDecisionLimitCell({ row }: { row: Row }) {
  const v = jevDecisionLimitView(row);
  if (!v) return isRemeasurePending(row)
    ? <span className="bh-muted" data-bh-jev-limit-cell="pending" title={JEV_NOT_RESCORED}>re-measure pending</span>
    : <span className="bh-muted" data-bh-jev-limit-cell="none">—</span>;
  return <span className="whitespace-nowrap" title={`${JEV_LIMIT_RULE_EN} ${v.note}`} data-bh-jev-limit-cell={v.nOver ? 'over' : 'clean'}>
    <span data-bh-jev-p95-raw>{v.p95Raw == null ? '—' : `${v.p95Raw.toFixed(3)} s`}</span>
    <span className="bh-muted block text-xs" data-bh-jev-p95-label>p95 measured</span>
    <span className="block text-xs" data-bh-jev-over-limit>{v.countText}</span>
  </span>;
}

/** Block for model and comparison pages: raw p50/p95, the count over the limit, the rule and the raw-time note. */
export function JevDecisionLimitDetail({ row, className = 'mt-3' }: { row: Row; className?: string }) {
  const v = jevDecisionLimitView(row);
  if (!v) return isRemeasurePending(row)
    ? <p className={className} data-bh-jev-limit-detail="pending">{JEV_NOT_RESCORED}.</p> : null;
  return <div className={className} data-bh-jev-limit-detail>
    <p data-bh-jev-limit-latency>Measured latency over {v.n == null ? 'all' : v.n.toLocaleString('en-US')} decisions: p50 {v.p50Raw == null ? '—' : `${v.p50Raw.toFixed(3)} s`} · p95 {v.p95Raw == null ? '—' : `${v.p95Raw.toFixed(3)} s`}</p>
    <p data-bh-jev-limit-count>{v.nOver == null ? '—' : `${v.nOver.toLocaleString('en-US')}`} decision{v.nOver === 1 ? '' : 's'} over {v.limit} s{v.nOver ? ` (${v.nOverOk ?? '—'} of them answered without error, counted as wrong)` : ''}.</p>
    <p className="bh-muted mt-1 text-sm" data-bh-jev-limit-rule>{JEV_LIMIT_RULE_EN} {v.note}</p>
  </div>;
}
