'use client';

import { useState, type ReactNode } from 'react';
import { BAR_METRIC_LABEL, JevScoreBar, JevScoreBarHeader, type JevBarMetric, type JevBarRow } from './JevScoreBar';

/** F-189 (Fable pass 35, decision 2): "sort by Intelligence for raw reasoning" is a control, not a second table.
 *  The chart already draws every row, so another ordering is the same bars reordered — never an 89-row table of
 *  the numbers above it. Both metrics are 0–100 axes, so the active one owns the bar length and the big number
 *  and the other moves into the small columns; the rank numeral stays the board's official rank either way. */
const METRICS: JevBarMetric[] = ['score', 'intelligence'];

export function JevRankBy({ rows, top, subtitle, note }: { rows: JevBarRow[]; top: number; subtitle: ReactNode; note?: string | null }) {
  const [metric, setMetric] = useState<JevBarMetric>('score');
  // A row the metric does not measure sorts last; the board's own order breaks every tie.
  const ordered = metric === 'score' ? rows : [...rows].sort((a, b) => {
    if (a.intelligence == null && b.intelligence == null) return 0;
    if (a.intelligence == null) return 1;
    if (b.intelligence == null) return -1;
    return b.intelligence - a.intelligence;
  });
  const boardOrder = new Map(rows.map((row, index) => [row.key, index]));
  const shown = ordered.slice(0, top);
  const rest = ordered.slice(top);
  return <>
    <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
      <p className="bh-muted text-sm">{subtitle}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm" data-bh-jev14-rank-by>
        <span className="bh-muted text-[13px]">Rank by</span>
        {METRICS.map((m) => <button
          key={m}
          type="button"
          aria-pressed={m === metric}
          onClick={() => setMetric(m)}
          className={`rounded-full px-3 py-1 text-[13px] font-semibold ${m === metric
            ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
            : 'bh-muted ring-1 ring-[rgb(var(--line))] hover:text-accent'}`}
        >{BAR_METRIC_LABEL[m]}</button>)}
      </div>
    </div>
    {note && <p className="mt-3 text-sm" data-bh-jev14-top-five-note>{note}</p>}
    <JevScoreBarHeader metric={metric} />
    <ol className="mt-2 space-y-2.5 sm:mt-1" data-bh-jev14-bars>
      {shown.map((row) => <JevScoreBar key={row.key} row={row} order={boardOrder.get(row.key)} metric={metric} />)}
    </ol>
    {rest.length > 0 && <details className="mt-2.5" data-bh-jev14-bars-more>
      <summary className="cursor-pointer text-sm font-semibold text-accent">Show all {rows.length} systems ({rest.length} more)</summary>
      <ol className="mt-2.5 space-y-2.5">{rest.map((row) => <JevScoreBar key={row.key} row={row} order={boardOrder.get(row.key)} metric={metric} />)}</ol>
    </details>}
    <p className="sr-only" aria-live="polite">{rows.length} systems ordered by {BAR_METRIC_LABEL[metric]}.</p>
  </>;
}
