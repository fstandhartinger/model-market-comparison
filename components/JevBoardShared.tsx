import { JevArchitectureBadge } from './JevArchitecture';
import { jevRowArch } from './jevTypes';
import type { JevArchBadges } from '../lib/jevbench-architecture.mjs';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { jevTypeVarName } from './jevTypes';
import { imageJevSystemPath, imageJevSourceUrl } from '../lib/imagejev-system-links.mjs';
import { jevSourceUrl } from './jevSystemLinks';
import { jevSystemPath } from '../lib/jev-system-slug.mjs';
import { BaseModelDisplay, type BaseModelBenchmark } from './BaseModelDisplay';
import type { JevGate, JevGatePenalty } from '../lib/jevbench-axis-weights.mjs';

// CR-151 (Florian 25 Sep 2026): the pieces the score chart and the axes table share. This module has no Node imports and
// no client directive, so both the server board and the interactive client views can use it.

export type JevBoardRow = {
  key: string; display: string; author: string; repo: string | null; class: string; arch?: string; archBadges?: JevArchBadges;
  rank: number | null; ranked: boolean; listing: string; not_ranked_because: string | null;
  priority_run?: boolean; api_flag: boolean; api_exposure_note: string | null;
  jevbench_score: number | null;
  axes: { intelligence: number | null; calibration: number | null; speed: number | null; cost: number | null };
  public_accuracy: number | null; sealed_accuracy: number | null; public_minus_sealed_gap_pp: number | null;
  cost: { kind: string; usd_per_1000: number | null; basis: string };
  speed: { p50_s_raw: number | null; adjustment?: string };
  endpoint_kind?: string; endpoint_condition?: string;
  // F-223: the headline option's paired-bootstrap 95% interval, when the release publishes one (v1.5 onwards).
  ci?: [number, number] | null;
  alt?: { axes: { cost: number }; label: string; note: string };
};

export type JevBoardAlternative = { score: number; rank: number; label: string; note: string };

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
export const typeVar = (cls: string) => ({ '--jev-t': `var(${jevTypeVarName(cls)})` }) as CSSProperties;
export const NOT_RANKED: Record<string, string> = { honorable_mention: 'honorable mention', partial: 'partial run', reference: 'reference', api_offering: 'API offering',
  // v1.7.5: API board public-set rows before the full sealed re-run.
  preliminary: 'preliminary', pending: 'pending' };

// ---- Heat shading: each column shaded by where a value sits between the column's weakest and strongest system ----

export type HeatColumn = 'score' | 'intelligence' | 'calibration' | 'speed' | 'cost' | 'usd' | 'public' | 'sealed' | 'latency';
type HeatSpec = { get: (row: JevBoardRow) => number | null | undefined; lowerIsBetter?: boolean };

export const HEAT_COLUMNS: Record<HeatColumn, HeatSpec> = {
  score: { get: (r) => r.jevbench_score },
  intelligence: { get: (r) => r.axes?.intelligence },
  calibration: { get: (r) => r.axes?.calibration },
  speed: { get: (r) => r.axes?.speed },
  cost: { get: (r) => r.axes?.cost },
  usd: { get: (r) => r.cost?.usd_per_1000, lowerIsBetter: true },
  public: { get: (r) => r.public_accuracy },
  sealed: { get: (r) => r.sealed_accuracy },
  latency: { get: (r) => r.speed?.p50_s_raw, lowerIsBetter: true },
};

export type HeatScales = Partial<Record<HeatColumn, number[]>>;

/** Each column's values over every listed system, sorted ascending, so shading does not shift when the reader filters.
 *  A cell's shade is its place in that order, not its distance from the extremes: a handful of far-out rows (the
 *  instruction-model baselines reach Intelligence 97) would otherwise flatten the differences near the top. */
export function heatScales(rows: JevBoardRow[]): HeatScales {
  const scales: HeatScales = {};
  for (const column of Object.keys(HEAT_COLUMNS) as HeatColumn[]) {
    const values = rows.map((row) => HEAT_COLUMNS[column].get(row)).filter((v): v is number => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
    if (values.length > 1) scales[column] = values;
  }
  return scales;
}

/** 0 = weakest in the column, 1 = strongest (cheapest/fastest for price and latency); tied values share a shade;
 *  null when there is no value. */
export function heatLevel(scales: HeatScales, column: HeatColumn, row: JevBoardRow): number | null {
  const raw = HEAT_COLUMNS[column].get(row);
  const sorted = scales[column];
  if (typeof raw !== 'number' || !Number.isFinite(raw) || !sorted) return null;
  let below = 0, equal = 0;
  for (const v of sorted) { if (v < raw) below += 1; else if (v === raw) equal += 1; }
  const t = (below + Math.max(0, equal - 1) / 2) / (sorted.length - 1);
  const clamped = Math.max(0, Math.min(1, t));
  return HEAT_COLUMNS[column].lowerIsBetter ? 1 - clamped : clamped;
}

export const heatStyle = (level: number | null) => (level == null ? undefined : ({ '--h': level.toFixed(3) }) as CSSProperties);

/** The tiny key that explains the green cells. */
export function HeatLegend({ className = '', latency = false }: { className?: string; latency?: boolean }) {
  return <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`} data-bh-jev-heat-legend>
    <span className="bh-heat-key" aria-hidden="true" />
    <span title="The shade follows each system's place in that column, from weakest (faint) to strongest (solid).">Greener = stronger within its column{latency ? '; faster counts as stronger' : ''}.</span>
  </span>;
}

// ---- The score bar row, shared by the live board and the alternatives guide ----

export type BarMetric = 'score' | 'intelligence' | 'calibration' | 'speed' | 'cost';
export const METRIC_LABEL: Record<BarMetric, string> = { score: 'JevBench Score', intelligence: 'Intelligence', calibration: 'Calibration', speed: 'Speed', cost: 'Cost' };
export const metricValue = (row: JevBoardRow, metric: BarMetric) => metric === 'score' ? row.jevbench_score : row.axes?.[metric] ?? null;

const AXIS_LETTER = { intelligence: 'I', calibration: 'C', speed: 'S', cost: 'K' } as const;

function AxisValue({ level, children, title }: { level: number | null; children: ReactNode; title?: string }) {
  return <span className={level == null ? 'bh-heat-cell sm:block' : 'bh-heat-cell bh-heat sm:block'} style={heatStyle(level)} title={title}>{children}</span>;
}

// CR-256 (Florian 1 Oct 2026): a low-axis gate is a factor outside the weight sliders, so a gated row says which one
// and by how much — "Cost 39.1 < 50 → × 0.61" — and what the row would score before the gate.
const GATE_AXIS: Record<JevGate['axis'], string> = { intelligence: 'Intelligence', speed: 'Speed', cost: 'Cost' };
export function gateSentence(gate: JevGatePenalty, score: number | null | undefined) {
  const parts = gate.gates.map((g) => `${GATE_AXIS[g.axis]} ${g.value.toFixed(1)} < 50 → × (${g.value.toFixed(1)}/50)² = ${g.factor.toFixed(2)}${g.weighted ? '' : ' (applies although its weight is 0)'}`);
  return `Low-axis gate: ${parts.join('; ')}. Score before the gate ${one(gate.ungated)} → ${one(score)}.`;
}

export function JevScoreBar({ row, viewRank, reference = false, metric = 'score', heat, isNew = false, name, ci = null, alternative = null, pageHref, benchmark = 'jevbench', gate = null, baseNote }: { row: JevBoardRow; viewRank?: number; reference?: boolean; metric?: BarMetric; heat?: HeatScales; isNew?: boolean; name?: string; ci?: [number, number] | null; alternative?: JevBoardAlternative | null; pageHref?: string; benchmark?: BaseModelBenchmark; gate?: JevGatePenalty | null; baseNote?: number }) {
  const source = benchmark === 'imagejevbench' ? imageJevSourceUrl(row.key, row.repo) : jevSourceUrl(row.key, row.repo);
  const page = benchmark === 'imagejevbench' ? imageJevSystemPath(row.key) : jevSystemPath(row.key);
  const s = row.jevbench_score;
  const value = metricValue(row, metric);
  // F-223 (Fable pass 42): the official score's 95% interval is drawn on the bar's own 0-100 scale, so the figure
  // everyone reads shows the uncertainty. The caller decides when it applies (official weights, View by = Overall).
  const clampPct = (v: number) => Math.max(0, Math.min(100, v));
  const ciLo = ci ? clampPct(ci[0]) : null, ciHi = ci ? clampPct(ci[1]) : null;
  const usd = row.cost?.usd_per_1000;
  const kind = row.cost?.kind;
  const level = (column: HeatColumn) => heat ? heatLevel(heat, column, row) : null;
  const label = `${row.display}: ${one(s)}${viewRank != null ? `, view position ${viewRank}` : ''}${row.rank ? `, official rank ${row.rank}` : `, ${NOT_RANKED[row.listing] ?? row.listing}, not ranked`}. Intelligence ${one(row.axes?.intelligence)}, calibration ${row.axes?.calibration == null ? 'none' : one(row.axes.calibration)}, speed ${one(row.axes?.speed)}, cost ${one(row.axes?.cost)}.${ciLo != null && ciHi != null ? ` 95% interval ${one(ciLo)} to ${one(ciHi)}.` : ''}${alternative ? ` ${alternative.label}: ${one(alternative.score)} (would be #${alternative.rank}). ${alternative.note}` : ''}${gate?.gates.length ? ` ${gateSentence(gate, s)}` : ''}`;
  return <li style={typeVar(jevRowArch(row))} className="grid grid-cols-[1.4rem_minmax(0,1fr)_3.3rem] items-center gap-x-2 text-sm sm:grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_21rem]"
    data-bh-jev14-bar={row.key} data-bh-jev14-bar-score={s == null ? '' : s.toFixed(3)} data-bh-jev14-bar-metric={metric === 'score' ? undefined : metric} data-bh-jev14-reference={reference ? '1' : undefined} aria-label={label}>
    <span className="bh-muted tabular col-start-1 row-start-1 text-right text-xs" data-bh-jev-row-number title={viewRank != null ? 'Position in the current view' : 'Official rank'}>{viewRank ?? row.rank ?? ''}</span>
    <span className="col-start-2 row-start-1 min-w-0 sm:text-right" title={row.display}>
      <span className="block truncate sm:text-right">
        {/* Florian 25 Sep 2026: the name opens the model's best source (repo, Hugging Face or vendor docs); rows without one keep the system page. */}
        {source
          ? <a href={source} target="_blank" rel="noopener noreferrer" title={`${row.display} — opens ${source.replace(/^https:\/\/(www\.)?/, '').split('/')[0]}`} className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent hover:decoration-current" data-bh-jev-source={row.key}>{name ?? shortName(row.display)}</a>
          : <Link href={pageHref ?? page} title={row.display} className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent hover:decoration-current">{name ?? shortName(row.display)}</Link>}
        {row.priority_run === true && <span className="bh-thin-tag ml-1.5 align-middle" data-bh-jev14-priority-run={row.key}>priority run</span>}
        {!row.ranked && <span className="bh-muted whitespace-nowrap" title={row.not_ranked_because ?? undefined}> ({NOT_RANKED[row.listing] ?? row.listing})</span>}
        {row.api_flag && <span className="bh-thin-tag bh-flag-tag ml-1.5 align-middle" title={row.api_exposure_note ?? apiExplanation}>API</span>}
        {isNew && <span className="bh-new-tag ml-1.5 align-middle" data-bh-jev14-new={row.key}>new</span>}
      </span>
      {row.listing === 'pending' && row.not_ranked_because && <span className="bh-muted mt-0.5 block whitespace-normal text-[10.5px] sm:text-right" data-bh-jev-pending-note={row.key}>{row.not_ranked_because}</span>}
      {viewRank != null && <span className="bh-muted mt-0.5 block text-[10.5px] sm:text-right" data-bh-jev-view-rank={viewRank} data-bh-jev-official-rank={row.rank ?? undefined}>view #{viewRank} · {row.rank != null ? `official #${row.rank}` : 'not officially ranked'}</span>}
      {/* CR-256: outside the truncated name so a long name never hides the gate. */}
      {gate && gate.gates.length > 0 && <span className="mt-0.5 block sm:text-right"><span className="bh-thin-tag bh-gate-tag whitespace-nowrap" title={gateSentence(gate, s)} data-bh-jev-gate={row.key} data-bh-jev-gate-factor={gate.factor.toFixed(4)} data-bh-jev-gate-axes={gate.gates.map((g) => g.axis).join(' ')}>{gate.gates.length === 1 ? `${GATE_AXIS[gate.gates[0].axis]} gate` : 'gates'} ×{gate.factor.toFixed(2)}</span></span>}
      {benchmark === 'imagejevbench' && source && <Link href={page} className="block text-[10.5px] text-accent underline" data-bh-mm-system-details={row.key}>details</Link>}
      {/* CR-254 (2026-10-01): the cited base-model overlay, presentation only. Every row shows it, ranked, unranked or wrapper. */}
      <JevArchitectureBadge row={row} benchmark={benchmark} />
      <BaseModelDisplay benchmark={benchmark} systemKey={row.key} footnote={baseNote} className="mt-0.5 block text-[10.5px] leading-tight sm:text-right" />
    </span>
    <span className="bh-jevc-grid relative col-start-2 row-start-2 mt-1 flex h-4 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:h-6" aria-hidden="true">
      {value != null && <span className={`bh-jevc-bar ${row.ranked ? '' : 'is-partial'} ${reference ? 'is-reference' : ''}`} style={{ width: `${Math.max(0, Math.min(100, value)).toFixed(4)}%` }} />}
      {ciLo != null && ciHi != null && <span className="bh-jevc-ci" data-bh-jev14-ci={row.key} data-bh-jev14-ci-lo={ciLo.toFixed(3)} data-bh-jev14-ci-hi={ciHi.toFixed(3)} style={{ left: `${ciLo.toFixed(3)}%`, width: `${(ciHi - ciLo).toFixed(3)}%` }} />}
    </span>
    {alternative && <>
      <span className="col-start-2 row-start-3 mt-1 block h-[6px] sm:col-start-3 sm:row-start-2" aria-hidden="true" data-bh-jev-alt={row.key} data-bh-jev-alt-score={alternative.score.toFixed(3)} data-bh-jev-alt-rank={alternative.rank}>
        <span className="bh-jev-alt-bar block h-full rounded-sm" style={{ width: `${clampPct(alternative.score)}%` }} />
      </span>
      <span className="bh-muted col-start-2 row-start-4 mt-0.5 min-w-0 text-[11px] leading-snug sm:col-start-3 sm:col-end-6 sm:row-start-3" title={alternative.note}>{alternative.label}: {one(alternative.score)} (would be #{alternative.rank})</span>
    </>}
    <b className={`tabular col-start-3 row-span-2 row-start-1 self-center text-right text-base sm:col-start-4 sm:row-span-1 sm:text-lg ${row.ranked ? '' : 'bh-muted font-normal'}`} data-bh-jev14-bar-value title={row.ranked ? undefined : 'Not ranked: this score is shown for reference only'}>{one(s)}</b>
    <span className={`bh-muted col-start-2 ${alternative ? 'row-start-5' : 'row-start-3'} mt-0.5 flex min-w-0 flex-wrap gap-x-2 font-mono text-[10.5px] sm:col-start-5 sm:row-start-1 sm:mt-0 sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_2.1fr] sm:gap-x-1 sm:whitespace-nowrap sm:text-right sm:text-[12px]`} data-bh-jev14-bar-axes>
      {(['intelligence', 'calibration', 'speed', 'cost'] as const).map((axis) => <span key={axis} className="whitespace-nowrap sm:block"><span className="sm:hidden">{AXIS_LETTER[axis]} </span><AxisValue level={level(axis)}>{f0(row.axes?.[axis])}</AxisValue></span>)}
      {/* CR-176.4: the $/1k cell is not heat-shaded, and est./ann. are left-of-the-number pills (no `~` prefix). */}
      <span className="whitespace-nowrap sm:block" title={row.cost?.basis ?? undefined} data-bh-jev14-cost-cell>
        {kind === 'estimate' && <span className="bh-thin-tag bh-est-tag mr-1" data-bh-jev14-est={row.key}>est.</span>}
        {kind === 'announced' && <span className="bh-thin-tag mr-1" data-bh-jev14-ann={row.key}>ann.</span>}
        <span className="tabular">{dollars(usd)}</span>
      </span>
    </span>
  </li>;
}
