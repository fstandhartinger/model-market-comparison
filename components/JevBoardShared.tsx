import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { JEV_TYPE_VAR } from './jevTypes';

// CR-151 (Florian 25 Sep 2026): the pieces the score chart and the axes table share. This module has no Node imports and
// no client directive, so both the server board and the interactive client views can use it.

export type JevBoardRow = {
  key: string; display: string; author: string; repo: string | null; class: string;
  rank: number | null; ranked: boolean; listing: string; not_ranked_because: string | null;
  priority_run?: boolean; api_flag: boolean; api_exposure_note: string | null;
  jevbench_score: number | null;
  axes: { intelligence: number | null; calibration: number | null; speed: number | null; cost: number | null };
  public_accuracy: number | null; sealed_accuracy: number | null; public_minus_sealed_gap_pp: number | null;
  cost: { kind: string; usd_per_1000: number | null; basis: string };
  speed: { p50_s_raw: number | null; adjustment?: string };
  endpoint_kind?: string; endpoint_condition?: string;
};

/** A board row plus what the interactive views need: the row note, open code/weights, new in this release. */
export type JevBoardViewRow = JevBoardRow & { note: string | null; openSource: boolean; isNew: boolean };

export const one = (value: number | null | undefined) => value == null ? '—' : value.toFixed(1);
export const f0 = (value: number | null | undefined) => value == null ? '–' : value.toFixed(0);
export const percent = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
export const percentagePoints = (value: number | null | undefined) => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)} pp`;
export const seconds = (value: number | null | undefined) => value == null ? '—' : `${value.toFixed(2)} s`;
export const dollars = (value: number | null | undefined) => value == null ? '—' : `$${value.toFixed(value < 0.01 ? 4 : 3)}`;
export const shortName = (value: string) => value.split(' (')[0].split(', formerly')[0];
export const apiExplanation = "API — the operator's endpoint received sealed item text, without answers.";
export const typeVar = (cls: string) => ({ '--jev-t': `var(${JEV_TYPE_VAR[cls] ?? JEV_TYPE_VAR['llm-baseline']})` }) as CSSProperties;
export const NOT_RANKED: Record<string, string> = { honorable_mention: 'honorable mention', partial: 'partial run' };

// ---- Heat shading: each column shaded by where a value sits between the column's weakest and strongest system ----

export type HeatColumn = 'score' | 'intelligence' | 'calibration' | 'speed' | 'cost' | 'usd' | 'public' | 'sealed' | 'latency';
type HeatSpec = { get: (row: JevBoardRow) => number | null | undefined; lowerIsBetter?: boolean; log?: boolean };

export const HEAT_COLUMNS: Record<HeatColumn, HeatSpec> = {
  score: { get: (r) => r.jevbench_score },
  intelligence: { get: (r) => r.axes?.intelligence },
  calibration: { get: (r) => r.axes?.calibration },
  speed: { get: (r) => r.axes?.speed },
  cost: { get: (r) => r.axes?.cost },
  // Prices and latencies span orders of magnitude; a linear scale would paint everything but the priciest row alike.
  usd: { get: (r) => r.cost?.usd_per_1000, lowerIsBetter: true, log: true },
  public: { get: (r) => r.public_accuracy },
  sealed: { get: (r) => r.sealed_accuracy },
  latency: { get: (r) => r.speed?.p50_s_raw, lowerIsBetter: true, log: true },
};

export type HeatScales = Partial<Record<HeatColumn, { min: number; max: number }>>;

const heatValue = (column: HeatColumn, value: number) => HEAT_COLUMNS[column].log ? Math.log10(Math.max(value, 1e-6)) : value;

/** Column ranges over every listed system, so shading does not shift when the reader filters. */
export function heatScales(rows: JevBoardRow[]): HeatScales {
  const scales: HeatScales = {};
  for (const column of Object.keys(HEAT_COLUMNS) as HeatColumn[]) {
    const values = rows.map((row) => HEAT_COLUMNS[column].get(row)).filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && (!HEAT_COLUMNS[column].log || v > 0)).map((v) => heatValue(column, v));
    if (values.length > 1) scales[column] = { min: Math.min(...values), max: Math.max(...values) };
  }
  return scales;
}

/** 0 = weakest in the column, 1 = strongest (cheapest/fastest for price and latency); null when there is no value. */
export function heatLevel(scales: HeatScales, column: HeatColumn, row: JevBoardRow): number | null {
  const raw = HEAT_COLUMNS[column].get(row);
  const scale = scales[column];
  if (typeof raw !== 'number' || !Number.isFinite(raw) || !scale) return null;
  if (HEAT_COLUMNS[column].log && raw <= 0) return HEAT_COLUMNS[column].lowerIsBetter ? 1 : 0;
  const t = scale.max === scale.min ? 1 : (heatValue(column, raw) - scale.min) / (scale.max - scale.min);
  const clamped = Math.max(0, Math.min(1, t));
  return HEAT_COLUMNS[column].lowerIsBetter ? 1 - clamped : clamped;
}

export const heatStyle = (level: number | null) => (level == null ? undefined : ({ '--h': level.toFixed(3) }) as CSSProperties);

/** The tiny key that explains the green cells. */
export function HeatLegend({ className = '' }: { className?: string }) {
  return <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`} data-bh-jev-heat-legend>
    <span className="bh-heat-key" aria-hidden="true" />
    <span>Greener = stronger within its column (weakest → strongest system); for $/1k and latency, cheaper or faster is greener.</span>
  </span>;
}

// ---- The score bar row, shared by the live board and the alternatives guide ----

export type BarMetric = 'score' | 'intelligence' | 'calibration' | 'speed' | 'cost';
export const METRIC_LABEL: Record<BarMetric, string> = { score: 'JevBench Score', intelligence: 'Intelligence', calibration: 'Calibration', speed: 'Speed', cost: 'Cost' };
export const metricValue = (row: JevBoardRow, metric: BarMetric) => metric === 'score' ? row.jevbench_score : row.axes?.[metric] ?? null;

function AxisValue({ level, children, title }: { level: number | null; children: ReactNode; title?: string }) {
  return <span className={level == null ? 'bh-heat-cell' : 'bh-heat-cell bh-heat'} style={heatStyle(level)} title={title}>{children}</span>;
}

export function JevScoreBar({ row, reference = false, metric = 'score', heat, isNew = false }: { row: JevBoardRow; reference?: boolean; metric?: BarMetric; heat?: HeatScales; isNew?: boolean }) {
  const s = row.jevbench_score;
  const value = metricValue(row, metric);
  const usd = row.cost?.usd_per_1000;
  const kind = row.cost?.kind;
  const level = (column: HeatColumn) => heat ? heatLevel(heat, column, row) : null;
  const label = `${row.display}: ${one(s)}${row.rank ? `, rank ${row.rank}` : `, ${NOT_RANKED[row.listing] ?? row.listing}, not ranked`}. Intelligence ${one(row.axes?.intelligence)}, calibration ${row.axes?.calibration == null ? 'none' : one(row.axes.calibration)}, speed ${one(row.axes?.speed)}, cost ${one(row.axes?.cost)}.`;
  return <li style={typeVar(row.class)} className="grid grid-cols-[1.4rem_minmax(0,1fr)_3.3rem] items-center gap-x-2 text-sm sm:grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_21rem]"
    data-bh-jev14-bar={row.key} data-bh-jev14-bar-score={s == null ? '' : s.toFixed(3)} data-bh-jev14-bar-metric={metric === 'score' ? undefined : metric} data-bh-jev14-reference={reference ? '1' : undefined} aria-label={label}>
    <span className="bh-muted tabular col-start-1 row-start-1 text-right text-xs">{row.rank ?? ''}</span>
    <span className="col-start-2 row-start-1 min-w-0 sm:truncate sm:text-right" title={row.display}>
      <Link href={`/jev-models/${encodeURIComponent(row.key)}`} title={row.display} className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent hover:decoration-current">{shortName(row.display)}</Link>
      {row.priority_run === true && <span className="bh-thin-tag ml-1.5 align-middle" data-bh-jev14-priority-run={row.key}>priority run</span>}
      {!row.ranked && <span className="bh-muted whitespace-nowrap" title={row.not_ranked_because ?? undefined}> ({NOT_RANKED[row.listing] ?? row.listing})</span>}
      {row.api_flag && <span className="bh-thin-tag bh-flag-tag ml-1.5 align-middle" title={row.api_exposure_note ?? apiExplanation}>API</span>}
      {isNew && <span className="bh-new-tag ml-1.5 align-middle" data-bh-jev14-new={row.key}>new</span>}
    </span>
    <span className="bh-jevc-grid col-start-2 row-start-2 mt-1 flex h-4 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:h-6" aria-hidden="true">
      {value != null && <span className={`bh-jevc-bar ${row.ranked ? '' : 'is-partial'} ${reference ? 'is-reference' : ''}`} style={{ width: `${Math.max(0, Math.min(100, value)).toFixed(4)}%` }} />}
    </span>
    <b className="tabular col-start-3 row-span-2 row-start-1 self-center text-right text-base sm:col-start-4 sm:row-span-1 sm:text-lg" data-bh-jev14-bar-value>{one(value)}</b>
    <span className="bh-muted col-start-2 row-start-3 mt-0.5 min-w-0 font-mono text-[10.5px] sm:col-start-5 sm:row-start-1 sm:mt-0 sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_2.1fr] sm:gap-x-1 sm:whitespace-nowrap sm:text-right sm:text-[12px]" data-bh-jev14-bar-axes>
      <span className="sm:hidden">I </span><AxisValue level={level('intelligence')}>{f0(row.axes?.intelligence)}</AxisValue><span className="sm:hidden"> · C </span><AxisValue level={level('calibration')}>{f0(row.axes?.calibration)}</AxisValue>
      <span className="sm:hidden"> · S </span><AxisValue level={level('speed')}>{f0(row.axes?.speed)}</AxisValue><span className="sm:hidden"> · K </span><AxisValue level={level('cost')}>{f0(row.axes?.cost)}</AxisValue>
      <span className="sm:hidden"> · </span><AxisValue level={level('usd')} title={row.cost?.basis}>{`${kind === 'estimate' ? '~' : ''}${dollars(usd)}`}{kind === 'estimate' ? ' est.' : kind === 'announced' ? ' ann.' : ''}</AxisValue>
    </span>
  </li>;
}
