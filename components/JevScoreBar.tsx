import type { CSSProperties } from 'react';
import Link from 'next/link';
import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { jevTypeVarName } from './jevTypes';

/** The fields a bar row prints — the board serialises exactly these for the client-side rank-by control (F-189d). */
export type JevBarRow = {
  key: string; display: string; cls: string; rank: number | null; ranked: boolean; listing: string;
  score: number | null; intelligence: number | null; calibration: number | null; speed: number | null; costAxis: number | null;
  usd: number | null; costKind: string | null; costBasis: string | null;
  apiFlag: boolean; apiNote: string | null; priorityRun: boolean; notRankedBecause: string | null;
};

export const toBarRow = (row: JevV14System): JevBarRow => ({
  key: row.key, display: row.display, cls: row.class, rank: row.rank ?? null, ranked: !!row.ranked, listing: row.listing,
  score: row.jevbench_score ?? null,
  intelligence: row.axes?.intelligence ?? null, calibration: row.axes?.calibration ?? null,
  speed: row.axes?.speed ?? null, costAxis: row.axes?.cost ?? null,
  usd: row.cost?.usd_per_1000 ?? null, costKind: row.cost?.kind ?? null, costBasis: row.cost?.basis ?? null,
  apiFlag: !!row.api_flag, apiNote: row.api_exposure_note ?? null, priorityRun: row.priority_run === true,
  notRankedBecause: row.not_ranked_because ?? null,
});

/** F-189: the chart can be ranked by the JevBench Score or by the Intelligence axis. Both are 0–100, so the
 *  active metric owns the bar's length and the row's big number; the other one moves into the small columns. */
export type JevBarMetric = 'score' | 'intelligence';
export const BAR_METRIC_LABEL: Record<JevBarMetric, string> = { score: 'JevBench Score', intelligence: 'Intelligence' };
const BIG_COLUMN: Record<JevBarMetric, string> = { score: 'Score', intelligence: 'Intel.' };
const SMALL_COLUMN: Record<JevBarMetric, string> = { score: 'Intel.', intelligence: 'Score' };
const SMALL_PREFIX: Record<JevBarMetric, string> = { score: 'I ', intelligence: 'Score ' };

const one = (value: number | null | undefined) => value == null ? '—' : value.toFixed(1);
const f0 = (value: number | null | undefined) => value == null ? '–' : value.toFixed(0);
const dollars = (value: number | null | undefined) => value == null ? '—' : `$${value.toFixed(value < 0.01 ? 4 : 3)}`;
const shortName = (value: string) => value.split(' (')[0].split(', formerly')[0];
const apiExplanation = "API — the operator's endpoint received sealed item text, without answers.";
const typeVar = (cls: string) => ({ '--jev-t': `var(${jevTypeVarName(cls)})` }) as CSSProperties;
const NOT_RANKED: Record<string, string> = { honorable_mention: 'honorable mention', partial: 'partial run' };

/** The column header that names the numbers a JevScoreBar row prints (F-188), following the active metric (F-189b). */
export function JevScoreBarHeader({ className = 'mt-4', metric = 'score' }: { className?: string; metric?: JevBarMetric }) {
  return <div className={`${className} hidden grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_19rem] gap-x-2 text-[11px] sm:grid`} aria-hidden="true">
    <span /><span /><span className="bh-muted font-mono">{BAR_METRIC_LABEL[metric]}</span>
    <span className="bh-muted text-right font-mono">{BIG_COLUMN[metric]}</span>
    <span className="bh-muted grid grid-cols-[1fr_1fr_1fr_1fr_2.1fr] text-right font-mono"><span>{SMALL_COLUMN[metric]}</span><span>Calib.</span><span>Speed</span><span>Cost</span><span>$/1k dec.</span></span>
  </div>;
}

export function JevScoreBar({ row, reference = false, order, metric = 'score' }: { row: JevBarRow; reference?: boolean; order?: number; metric?: JevBarMetric }) {
  const drawn = metric === 'score' ? row.score : row.intelligence;
  const small = metric === 'score' ? row.intelligence : row.score;
  const kind = row.costKind;
  const label = `${row.display}: ${BAR_METRIC_LABEL[metric]} ${one(drawn)}${row.rank ? `, rank ${row.rank}` : `, ${NOT_RANKED[row.listing] ?? row.listing}, not ranked`}. JevBench Score ${one(row.score)}, Intelligence ${one(row.intelligence)}, calibration ${row.calibration == null ? 'none' : one(row.calibration)}, speed ${one(row.speed)}, cost ${one(row.costAxis)}.`;
  return <li style={typeVar(row.cls)} className="grid grid-cols-[1.4rem_minmax(0,1fr)_3.3rem] items-center gap-x-2 text-sm sm:grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_19rem]"
    data-bh-jev14-bar={row.key} data-bh-jev14-bar-score={row.score == null ? '' : row.score.toFixed(3)}
    data-bh-jev14-bar-order={order == null ? undefined : String(order)}
    data-bh-jev14-bar-intel={row.intelligence == null ? undefined : row.intelligence.toFixed(3)}
    data-bh-jev14-reference={reference ? '1' : undefined} aria-label={label}>
    <span className="bh-muted tabular col-start-1 row-start-1 text-right text-xs">{row.rank ?? ''}</span>
    <span className="col-start-2 row-start-1 min-w-0 sm:truncate sm:text-right" title={row.display}>
      <Link href={`/jev-models/${encodeURIComponent(row.key)}`} title={row.display} className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent hover:decoration-current">{shortName(row.display)}</Link>
      {row.priorityRun && <span className="bh-thin-tag ml-1.5 align-middle" data-bh-jev14-priority-run={row.key}>priority run</span>}
      {!row.ranked && <span className="bh-muted whitespace-nowrap" title={row.notRankedBecause ?? undefined}> ({NOT_RANKED[row.listing] ?? row.listing})</span>}
      {row.apiFlag && <span className="bh-thin-tag ml-1.5 align-middle" title={row.apiNote ?? apiExplanation}>API</span>}
    </span>
    <span className="bh-jevc-grid col-start-2 row-start-2 mt-1 flex h-4 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:h-6" aria-hidden="true">
      {drawn != null && <span className={`bh-jevc-bar ${row.ranked ? '' : 'is-partial'} ${reference ? 'is-reference' : ''}`} style={{ width: `${Math.max(0, Math.min(100, drawn)).toFixed(4)}%` }} />}
    </span>
    <b className="tabular col-start-3 row-span-2 row-start-1 self-center text-right text-base sm:col-start-4 sm:row-span-1 sm:text-lg">{one(drawn)}</b>
    <span className="bh-muted col-start-2 row-start-3 mt-0.5 min-w-0 font-mono text-[10.5px] sm:col-start-5 sm:row-start-1 sm:mt-0 sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_2.1fr] sm:whitespace-nowrap sm:text-right sm:text-[12px]">
      <span className="sm:hidden">{SMALL_PREFIX[metric]}</span><span>{f0(small)}</span><span className="sm:hidden"> · C </span><span>{f0(row.calibration)}</span>
      <span className="sm:hidden"> · S </span><span>{f0(row.speed)}</span><span className="sm:hidden"> · K </span><span>{f0(row.costAxis)}</span>
      <span className="sm:hidden"> · </span><span title={row.costBasis ?? undefined}>{`${kind === 'estimate' ? '~' : ''}${dollars(row.usd)}`}{kind === 'estimate' ? ' est.' : kind === 'announced' ? ' ann.' : ''}</span>
    </span>
  </li>;
}
