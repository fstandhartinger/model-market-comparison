import { jevMethodView } from '../lib/jev-decision-limit.mjs';

/**
 * JevBench v1.7.0: the method chip next to a row name. "v1.7 · 10 s rule" for a re-scored row, "v1.6 · re-measure pending" for a
 * pending row (its numbers are v1.6 values) and "v1.5" for a dated-carry row. Renders nothing for rows without method data
 * (archive boards that predate v1.7), so older pages are unchanged.
 */
export function JevMethodTag({ row, carry = false, carryLabel, className = 'ml-2 align-middle' }: { row: { key?: string; listing?: string; method?: string | null; rescored_in?: string | null; new_in?: string | null; remeasured_in?: string | null; measured_in?: string | null }; carry?: boolean; carryLabel?: string; className?: string }) {
  const view = jevMethodView(row, { carry, carryLabel });
  if (!view) return null;
  const pending = view.kind !== 'v1.7';
  return <span className={`bh-thin-tag ${pending ? 'bh-partial-tag' : ''} ${className}`.trim()} title={view.title} data-bh-jev-method-tag={view.kind} data-bh-jev-method-row={row.key}>{view.text}</span>;
}
