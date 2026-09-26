'use client';

import { useMemo, useState } from 'react';
import { withFieldNames } from './jevFieldNames';

type Capacity = {
  rank: number | null;
  key: string;
  system: string;
  status: string;
  baseModel: string | null;
  maxContextTokens: number | null;
  maxContext: string;
  type: string;
  sourceUrl: string | null;
  sourceDate: string | null;
  sourceChecked: string;
  sourceSha256: string | null;
  baseSourceUrl: string | null;
  baseSourceDate: string | null;
  baseSourceSha256: string | null;
  systemRepoUrl: string | null;
  systemRepoDate: string | null;
  basis: string;
  notes: string;
  trainingMaxSeqLen: number | null;
  trainingStateMaxTokens: number | null;
  trainingBatchTokens: number | null;
  validatedLength: number | null;
  trainingSourceUrl: string | null;
  trainingSourceDate: string | null;
  trainingSourceSha256: string | null;
};

type Bucket = { label: string; n: number; correct: number; accuracy: number | null };
type LengthSystem = {
  rank: number;
  key: string;
  system: string;
  meanInputTokens: number;
  outcomes: number;
  lengthCoverage: number;
  overallAccuracy: number;
  buckets: Bucket[];
};
type LongPolicy = {
  rank: number;
  key: string;
  system: string;
  overallCorrect: number;
  overallN: number;
  overallAccuracy: number;
  longPolicyCorrect: number;
  longPolicyN: number;
  longPolicyAccuracy: number;
  deltaPercentagePoints: number;
};
type ContextData = {
  checkedAt: string;
  sourceDataset: string;
  publicItems: number;
  topRankedSystemsConsidered: number;
  bucketLabels: string[];
  method: string;
  caveat: string;
  capacitySystems: Capacity[];
  lengthSystems: LengthSystem[];
  excludedLengthSystems: { rank: number; key: string; system: string; reason: string }[];
  longPolicyItems: number;
  longPolicySystems: LongPolicy[];
};

const palette = [
  '#53b6e6', '#e58a43', '#7fca82', '#d47fca', '#ddc65b', '#7978e8', '#e56f78',
  '#3fc1b0', '#a4a85e', '#b486e6', '#e8a4aa', '#73a0d2', '#c99665',
];

function day(value: string | null) {
  if (!value) return 'date not stated';
  const [year, month, date] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, date)));
}

function tokens(value: number | null) {
  return value == null ? 'Unknown' : `${value.toLocaleString('en-US')} tokens`;
}

function percent(value: number | null) {
  return value == null ? '—' : `${(value * 100).toFixed(1)}%`;
}

function pp(value: number) {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)} pp`;
}

function PrimarySource({ href, label, title }: { href: string | null; label: string; title?: string }) {
  if (!href) return <span className="bh-muted">No source published</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer" title={title} className="text-accent underline decoration-[rgb(var(--line))] underline-offset-2 hover:decoration-current">{label}</a>;
}

// F-182 (Fable pass 34): the training fields are words on the page, never the dataset's keys.
function trainingFacts(row: Capacity) {
  return [
    row.trainingMaxSeqLen == null ? null : `Trained sequence length: ${tokens(row.trainingMaxSeqLen)}.`,
    row.trainingStateMaxTokens == null ? null : `Training state limit: ${tokens(row.trainingStateMaxTokens)}.`,
    row.trainingBatchTokens == null ? null : `Training batch token budget: ${tokens(row.trainingBatchTokens)}.`,
    row.validatedLength == null ? null : `Reported validation point: ${tokens(row.validatedLength)}; that is not automatically the maximum accepted input.`,
  ].filter((fact): fact is string => fact != null);
}

// The published limit carries a qualifier when its string says more than the number itself.
function qualifier(row: Capacity) {
  if (row.maxContextTokens == null) return row.maxContext === 'Unknown' ? null : row.maxContext;
  return row.maxContext.replace(/[\d,\s]/g, '') === '' ? null : row.maxContext;
}

// F-180: a row is marked with † when its note says more than the evidence sentence.
function rowNote(row: Capacity) {
  const parts = [
    qualifier(row) ? `Published as “${qualifier(row)}”.` : null,
    ...trainingFacts(row),
    row.notes || null,
  ].filter((part): part is string => part != null);
  return parts.length === 0 ? null : parts.join(' ');
}

function firstSentence(text: string) {
  const match = text.match(/^[^.]+\./);
  return (match ? match[0] : text).trim();
}

// F-180: one notes disclosure for the whole table, one <li> per system, instead of 82 row disclosures.
function CapacityNotes({ rows, open, onOpenChange }: { rows: Capacity[]; open: boolean; onOpenChange: (value: boolean) => void }) {
  return <details className="mt-3" data-bh-jev-context-notes open={open} onToggle={(event) => onOpenChange(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-semibold text-accent">Notes for {rows.length} systems</summary>
    <ul className="mt-2 space-y-2 text-xs leading-relaxed">
      {rows.map((row) => <li key={row.key} id={`jev-context-note-${row.key}`} className="scroll-mt-6 border-t border-[rgb(var(--line))] pt-2 first:border-0 first:pt-0" data-bh-jev-context-note={row.key}>
        <b>{row.system}</b>{' — '}
        <span className="bh-muted">
          {row.baseModel ? `Base model ${row.baseModel}; a Jev-class adapter normally inherits this window unless its training or serving setup truncates input. ` : ''}
          {row.basis && <>{withFieldNames(row.basis)} </>}
          {rowNote(row) ? <>{withFieldNames(rowNote(row) as string)} </> : ''}
          {row.systemRepoUrl && <><PrimarySource href={row.systemRepoUrl} label={`System repository${row.systemRepoDate ? ` · ${day(row.systemRepoDate)}` : ''}`} />{' '}</>}
          {row.baseSourceUrl && row.baseSourceUrl !== row.sourceUrl && <><PrimarySource href={row.baseSourceUrl} label={`Base model source${row.baseSourceDate ? ` · ${day(row.baseSourceDate)}` : ''}`} />{' '}</>}
          {row.trainingSourceUrl && <PrimarySource href={row.trainingSourceUrl} label={`Training configuration${row.trainingSourceDate ? ` · ${day(row.trainingSourceDate)}` : ''}`} />}
        </span>
      </li>)}
    </ul>
  </details>;
}

const THIN_BUCKET = 20;
const INPUT_BUCKET_RANGES: Record<string, string> = {
  '<500': '0–499', '500–999': '500–999', '1,000–1,999': '1,000–1,999',
  '2–8k': '2,000–7,999', '8–16k': '8,000–15,999', '16–64k': '16,000–63,999',
  '64–256k': '64,000–255,999', '256k–1M': '256,000–999,999', '≥1M': '1,000,000 or more',
};

// F-185: the drawn axis is the range the data occupies; all buckets stay in the data,
// the tooltips, the counts table and the sentence that names the empty ones.
function upperBound(label: string) {
  return label.replace(/^[<≥]/, '').split('–').pop() ?? label;
}

function joinLabels(labels: string[]) {
  if (labels.length < 2) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function AccuracyChart({ systems, labels, excluded, topRanked }: { systems: LengthSystem[]; labels: string[]; excluded: { system: string; reason: string }[]; topRanked: number }) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [focusedPoint, setFocusedPoint] = useState<string | null>(null);
  const [pinnedPoint, setPinnedPoint] = useState<string | null>(null);
  const active = labels.map((label, index) => ({ label, index })).filter(({ index }) => systems.some((system) => system.buckets[index]?.accuracy != null));
  const empty = labels.filter((_, index) => !active.some((bucket) => bucket.index === index));
  const lastDrawn = active.length ? active[active.length - 1].label : null;
  // Reserve room for the full last inclusive bin label, including on narrow scrollers.
  const width = 740, height = 305, left = 52, right = 60, top = 16, bottom = 57;
  const plotRight = width - right, plotBottom = height - bottom;
  const x = (position: number) => left + (plotRight - left) * (active.length < 2 ? 0 : position / (active.length - 1));
  const y = (value: number) => top + (plotBottom - top) * (1 - value);
  const drawn = (system: LengthSystem) => active.flatMap(({ label, index }, position) => {
    const bucket = system.buckets[index];
    return bucket == null || bucket.accuracy == null ? [] : [{ position, label, bucket, thin: bucket.n < THIN_BUCKET }];
  });
  // F-203: the bucket ticks print at 10 px. If the drawn buckets sit closer together than the widest
  // label needs, every second label is dropped on the narrow side (the last bin always kept) instead of
  // shrinking the text; the gridline, the <desc>, the bin-edge sentence and every tooltip keep all buckets.
  const tickFontSize = 10;
  const tickLabel = (label: string) => INPUT_BUCKET_RANGES[label] ?? label;
  const tickGap = active.length < 2 ? plotRight - left : (plotRight - left) / (active.length - 1);
  const widestTick = Math.max(0, ...active.map(({ label }) => tickLabel(label).length * tickFontSize * 0.6));
  const tickCrowded = widestTick + 6 > tickGap;
  const showTick = (position: number) => !tickCrowded || position % 2 === (active.length - 1) % 2;
  const shownPoint = focusedPoint ?? hoveredPoint ?? pinnedPoint;
  const pointDetails = systems.flatMap((system) => system.buckets.filter((bucket) => `${system.key}:${bucket.label}` === shownPoint).map((bucket) => ({ system, bucket })))[0];

  return <figure className="bh-panel mt-4 min-w-0 p-3 sm:p-5" data-bh-jev-context-chart aria-labelledby="jev-context-chart-heading">
    <h3 id="jev-context-chart-heading" className="text-lg font-semibold">Public accuracy by actual input length</h3>
    <p className="bh-muted mt-1 text-sm" data-bh-jev-context-coverage>{systems.length} of the top {topRanked} systems are plotted; {joinLabels(excluded.map((row) => `${row.system.replace(/\s*\([^)]*\)\s*$/, '')} (${row.reason.replace(/^excluded:\s*/, '')})`))} {excluded.length === 1 ? 'is' : 'are'} not.</p>
    <p className="bh-muted mt-1 text-xs" data-bh-jev-context-bin-edges>Input-token bins (inclusive): {labels.map((label) => INPUT_BUCKET_RANGES[label] ?? label).join('; ')}.</p>
    <p className="bh-muted mt-2 text-xs sm:hidden">Scroll the chart sideways to see every input range.</p>
    <div className="mt-3 max-w-full overflow-x-auto" data-bh-jev-context-chart-scroll>
    <svg className="block h-auto min-w-[740px] w-full" viewBox={`0 0 ${width} ${height}`} role="group" aria-labelledby="jev-context-svg-title jev-context-svg-desc">
      <title id="jev-context-svg-title">JevBench public accuracy across input-length buckets</title>
      <desc id="jev-context-svg-desc">{systems.length} systems are plotted across {labels.join(', ')} input-token buckets. Bucket denominators differ by system and are available in the details table below.</desc>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => <g key={tick}>
        <line x1={left} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke="rgb(var(--line) / .7)" />
        <text x={left - 8} y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="11">{Math.round(tick * 100)}%</text>
      </g>)}
      {active.map(({ label }, position) => <g key={label}>
        <line x1={x(position)} x2={x(position)} y1={top} y2={plotBottom} stroke="rgb(var(--line) / .42)" />
        {showTick(position) && <text x={x(position)} y={plotBottom + 18} textAnchor="middle" fill="var(--muted)" fontSize={tickFontSize}>{tickLabel(label)}</text>}
      </g>)}
      <text x={(left + plotRight) / 2} y={height - 9} textAnchor="middle" fill="var(--text)" fontSize="10" className="hidden sm:block">Actual input tokens per decision</text>
      {systems.map((system, systemIndex) => {
        const points = drawn(system);
        return <g key={system.key}>
          {points.slice(1).map((point, pointIndex) => {
            const previous = points[pointIndex];
            // A hollow point is plotted, not connected: the line stops at the last solid point.
            if (point.thin || previous.thin) return null;
            return <line key={`${system.key}-${point.label}`} x1={x(previous.position)} y1={y(previous.bucket.accuracy as number)} x2={x(point.position)} y2={y(point.bucket.accuracy as number)} stroke={palette[systemIndex % palette.length]} strokeWidth="2" strokeLinecap="round" data-bh-jev-context-line={system.key} />;
          })}
          {points.map(({ label, bucket, position, thin }) => <circle key={`${system.key}-${label}`} cx={x(position)} cy={y(bucket.accuracy as number)} r="5" fill={thin ? 'var(--surface)' : palette[systemIndex % palette.length]} stroke={thin ? palette[systemIndex % palette.length] : 'var(--surface)'} strokeWidth={thin ? 2 : 1.5} tabIndex={0} role="button" aria-label={`#${system.rank} ${system.system}, ${INPUT_BUCKET_RANGES[label] ?? label} input tokens, accuracy ${percent(bucket.accuracy)}, ${bucket.correct} correct of ${bucket.n} decisions. Tap for details.`}
            className="cursor-pointer" onMouseEnter={() => setHoveredPoint(`${system.key}:${label}`)} onMouseLeave={() => setHoveredPoint(null)} onFocus={() => setFocusedPoint(`${system.key}:${label}`)} onBlur={() => setFocusedPoint(null)}
            onClick={() => setPinnedPoint((current) => current === `${system.key}:${label}` ? null : `${system.key}:${label}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPinnedPoint((current) => current === `${system.key}:${label}` ? null : `${system.key}:${label}`); } }}
            {...(thin ? { 'data-bh-thin': String(bucket.n) } : {})} data-bh-jev-context-point={`${system.key}:${label}`}>
            <title>{`#${system.rank} ${system.system} · ${INPUT_BUCKET_RANGES[label] ?? label} input tokens: ${percent(bucket.accuracy)} (${bucket.correct}/${bucket.n})${thin ? ` · n = ${bucket.n}` : ''}`}</title>
          </circle>)}
        </g>;
      })}
    </svg>
    </div>
    <p className="bh-muted mt-1 text-[11px] sm:hidden">Horizontal axis: actual input tokens per decision.</p>
    <p className="bh-muted mt-2 min-h-5 text-xs" data-bh-jev-context-point-tooltip>{pointDetails
      ? <><b className="text-[var(--text)]">#{pointDetails.system.rank} {pointDetails.system.system}</b> · {INPUT_BUCKET_RANGES[pointDetails.bucket.label] ?? pointDetails.bucket.label} input tokens · {percent(pointDetails.bucket.accuracy)} accuracy · {pointDetails.bucket.correct}/{pointDetails.bucket.n} correct{pointDetails.bucket.n < THIN_BUCKET ? ' · small sample' : ''}</>
      : 'Hover, focus, or tap a point for its system, input range, accuracy, and sample size.'}</p>
    <ul className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-3" aria-label="Chart systems, with the top five shown first" data-bh-jev-context-top-five>
      {systems.map((system, index) => <li key={system.key} className="flex min-w-0 items-baseline gap-2" data-bh-jev-context-system={system.key}>
        <span className="inline-block h-0.5 w-4 shrink-0" style={{ backgroundColor: palette[index % palette.length] }} aria-hidden="true" />
        <span className="min-w-0 break-words" title={`#${system.rank} ${system.system}`}>{index < 5 && <b>Top five · </b>}#{system.rank} {system.system}</span>
      </li>)}
    </ul>
    {empty.length > 0 && lastDrawn && <p className="bh-muted mt-3 text-xs" data-bh-jev-context-empty-buckets>No public item exceeds {upperBound(lastDrawn)} input tokens; the {joinLabels(empty)} {empty.length === 1 ? 'bucket is' : 'buckets are'} empty. A hollow point comes from fewer than {THIN_BUCKET} decisions and is not joined to the line.</p>}
    <figcaption className="bh-muted mt-2 text-xs">From each run&apos;s recorded input-token counts; no new runs. The chart describes these benchmark items; it does not show that context length alone caused a score change.</figcaption>
  </figure>;
}

const CAPACITY_TOP = 25;
const CONTEXT_MIN = 512;
const CONTEXT_TICKS = [512, 2048, 8192, 32768, 131072, 524288, 1050000];

function contextPosition(value: number, maximum: number) {
  if (maximum <= CONTEXT_MIN) return 0;
  return Math.max(0, Math.min(100, (Math.log(value) - Math.log(CONTEXT_MIN)) / (Math.log(maximum) - Math.log(CONTEXT_MIN)) * 100));
}

function contextTickLabel(value: number) {
  if (value >= 1_000_000) return '1.05M';
  if (value >= 1024) return `${Math.round(value / 1024)}k`;
  return String(value);
}

function CapacityChart({ rows }: { rows: Capacity[] }) {
  const [hoveredCapacity, setHoveredCapacity] = useState<string | null>(null);
  const [focusedCapacity, setFocusedCapacity] = useState<string | null>(null);
  const [pinnedCapacity, setPinnedCapacity] = useState<string | null>(null);
  const activeCapacity = rows.find((row) => row.key === (focusedCapacity ?? hoveredCapacity ?? pinnedCapacity));
  const known = rows.flatMap((row) => row.maxContextTokens == null ? [] : [row.maxContextTokens]);
  const maximum = Math.max(CONTEXT_MIN, ...known);
  const barColor = (type: string) => type === 'API cap' ? 'rgb(var(--accent))' : type === 'Trained length' ? 'rgb(var(--accent2))' : 'rgb(var(--warn))';
  const trainingNotes = (row: Capacity) => [
    row.trainingMaxSeqLen == null ? null : `trained sequence length ${tokens(row.trainingMaxSeqLen)}`,
    row.trainingStateMaxTokens == null ? null : `training state limit ${tokens(row.trainingStateMaxTokens)}`,
  ].filter(Boolean);

  return <figure className="bh-panel mt-4 min-w-0 p-3 sm:p-5" data-bh-jev-context-capacity-chart aria-labelledby="jev-context-capacity-chart-title">
    <h3 id="jev-context-capacity-chart-title" className="text-lg font-semibold">Published context limits · logarithmic scale</h3>
    <p className="bh-muted mt-1 text-sm">{rows.filter((row) => row.rank != null).length} ranked systems and {rows.filter((row) => row.rank == null).length} unranked additions, each with its exact published maximum input context. API/serving caps, hard limits and trained lengths use different bar colors; training configuration limits appear as separate markers and values where published.</p>
    <div className="mt-4">
      <div className="relative h-6" aria-hidden="true">
        {CONTEXT_TICKS.filter((tick) => tick <= maximum).map((tick, index, ticks) => <span key={tick} className={`absolute top-0 whitespace-nowrap font-mono text-[10px] text-[var(--muted)] ${index === 0 ? '' : index === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'} ${tick === 524288 ? 'hidden sm:block' : ''}`} style={{ left: `${contextPosition(tick, maximum)}%` }}>{contextTickLabel(tick)}</span>)}
      </div>
      <ol className="m-0 list-none p-0" aria-label="Published context limits by system">
      {rows.slice(0, CAPACITY_TOP).map((row) => capacityRow(row))}
      </ol>
      {rows.length > CAPACITY_TOP && <details className="mt-1" data-bh-jev-context-capacity-more>
        <summary className="cursor-pointer text-sm font-semibold text-accent">Show all {rows.length} systems ({rows.length - CAPACITY_TOP} more)</summary>
        <ol className="m-0 mt-1 list-none p-0">{rows.slice(CAPACITY_TOP).map((row) => capacityRow(row))}</ol>
      </details>}
      <p className="bh-muted mt-2 min-h-5 text-xs" data-bh-jev-context-capacity-tooltip>{activeCapacity
        ? <><b className="text-[var(--text)]">{activeCapacity.rank == null ? 'Unranked' : `#${activeCapacity.rank}`} {activeCapacity.system}</b> · {tokens(activeCapacity.maxContextTokens)} published maximum · {activeCapacity.type}{trainingNotes(activeCapacity).length ? ` · ${trainingNotes(activeCapacity).join(' · ')}` : ''}</>
        : 'Hover, focus, or tap a bar for the system, published maximum, and training limits.'}</p>
    </div>
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]" aria-label="Context chart legend">
      <li><span className="mr-1.5 inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: 'rgb(var(--accent))' }} />API / serving cap</li>
      <li><span className="mr-1.5 inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: 'rgb(var(--warn))' }} />Hard limit</li>
      <li><span className="mr-1.5 inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: 'rgb(var(--accent2))' }} />Trained length</li>
      <li><span className="mr-1.5 inline-block h-3 border-l-2 border-solid border-[var(--text)] align-middle" />Trained sequence length</li>
      <li><span className="mr-1.5 inline-block h-3 border-l-2 border-dashed border-[var(--text)] align-middle" />Training state limit</li>
    </ul>
    <figcaption className="bh-muted mt-2 text-xs">The scale runs from 512 tokens to {tokens(maximum)}. Source links, dates, evidence notes and exact training details remain in the table below.</figcaption>
  </figure>;

  function capacityRow(row: Capacity) {
        const seq = row.trainingMaxSeqLen;
        const state = row.trainingStateMaxTokens;
        const note = trainingNotes(row);
        const rowLabel = `${row.rank == null ? 'Unranked' : `JevBench rank ${row.rank}`} ${row.system}; ${row.maxContextTokens == null ? 'published maximum unknown' : `${tokens(row.maxContextTokens)}, ${row.type}`}${note.length ? `; training ${note.join(', ')}` : ''}`;
        return <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 border-t border-[rgb(var(--line))] py-2 first:border-0" data-bh-jev-context-capacity-row={row.key} aria-label={rowLabel}>
          <span className="min-w-0 truncate text-xs font-medium" title={rowLabel}>{row.rank == null ? 'Unranked' : `#${row.rank}`} {row.system}</span>
          <span className="tabular text-right text-[11px]" title={row.type}>{row.maxContextTokens == null ? 'Unknown' : `${row.maxContextTokens.toLocaleString('en-US')} · ${row.type}`}</span>
          <button type="button" className="relative col-span-2 mt-1 block h-4 w-full rounded-sm bg-[rgb(var(--line)/.38)] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]" aria-label={`${rowLabel}. Tap for details.`} title={rowLabel}
            onMouseEnter={() => setHoveredCapacity(row.key)} onMouseLeave={() => setHoveredCapacity(null)} onFocus={() => setFocusedCapacity(row.key)} onBlur={() => setFocusedCapacity(null)} onClick={() => setPinnedCapacity((current) => current === row.key ? null : row.key)}>
            {row.maxContextTokens != null && <span className="absolute inset-y-0 left-0 min-w-[2px] rounded-sm" style={{ width: `${Math.max(0.8, contextPosition(row.maxContextTokens, maximum))}%`, backgroundColor: barColor(row.type) }} title={`${row.system}: ${tokens(row.maxContextTokens)} (${row.type})`} />}
            {seq != null && <span className="absolute inset-y-[-2px] z-10 border-l-2 border-solid border-[var(--text)]" style={{ left: `${contextPosition(seq, maximum)}%` }} title={`Trained sequence length ${tokens(seq)}`} aria-hidden="true" />}
            {state != null && <span className="absolute inset-y-[-2px] z-10 border-l-2 border-dashed border-[var(--text)]" style={{ left: `${contextPosition(state, maximum)}%` }} title={`Training state limit ${tokens(state)}`} aria-hidden="true" />}
          </button>
          {note.length > 0 && <span className="bh-muted col-span-2 mt-0.5 text-[10px]">Training configuration: {note.join(' · ')}.</span>}
        </li>;
  }
}

function BucketCounts({ systems }: { systems: LengthSystem[] }) {
  const coverageMin = Math.min(...systems.map((row) => row.lengthCoverage));
  const coverageMax = Math.max(...systems.map((row) => row.lengthCoverage));
  return <details className="bh-panel mt-3 p-4" data-bh-jev-context-bucket-counts>
    <summary className="cursor-pointer text-sm font-semibold">Exact correct counts and denominators by bucket</summary>
    <p className="bh-muted mt-2 text-xs">All {systems.length} plotted systems exactly reproduce their published public accuracy; stored lengths cover {coverageMin}–{coverageMax} decisions per system.</p>
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-[900px] w-full text-left text-xs" aria-label="Mean input length and exact public accuracy counts by input token bucket">
        <thead><tr className="bh-muted border-b border-[rgb(var(--line))]">
          <th className="p-2">System</th>
          <th className="p-2">Mean input tokens</th>
          <th className="p-2">Length n</th>
          {systems[0]?.buckets.map((bucket) => <th key={bucket.label} className="p-2">{bucket.label}</th>)}
        </tr></thead>
        <tbody>{systems.map((system) => <tr key={system.key} className="border-b border-[rgb(var(--line))] last:border-0">
          <th scope="row" className="p-2 font-medium">#{system.rank} {system.system}</th>
          <td className="tabular whitespace-nowrap p-2">{system.meanInputTokens.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
          <td className="tabular whitespace-nowrap p-2">{system.lengthCoverage}/{system.outcomes}</td>
          {system.buckets.map((bucket) => <td key={bucket.label} className="tabular whitespace-nowrap p-2">{bucket.accuracy == null ? 'No data' : `${bucket.correct}/${bucket.n} · ${percent(bucket.accuracy)}`}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </details>;
}

type SortKey = 'rank' | 'system' | 'context' | 'source' | 'type';

function CapacityTable({ rows, checkedAt }: { rows: Capacity[]; checkedAt: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [notesOpen, setNotesOpen] = useState(false);
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (sortKey === 'rank') {
      if (a.rank == null) return b.rank == null ? a.system.localeCompare(b.system) : 1;
      if (b.rank == null) return -1;
      return (a.rank - b.rank) * (direction === 'asc' ? 1 : -1);
    }
    if (sortKey === 'context') {
      if (a.maxContextTokens == null) return b.maxContextTokens == null ? a.system.localeCompare(b.system) : 1;
      if (b.maxContextTokens == null) return -1;
      return (a.maxContextTokens - b.maxContextTokens) * (direction === 'asc' ? 1 : -1);
    }
    const aValue = sortKey === 'system' ? a.system : sortKey === 'source' ? a.sourceDate ?? a.sourceChecked : a.type;
    const bValue = sortKey === 'system' ? b.system : sortKey === 'source' ? b.sourceDate ?? b.sourceChecked : b.type;
    return aValue.localeCompare(bValue, 'en', { numeric: true, sensitivity: 'base' }) * (direction === 'asc' ? 1 : -1);
  }), [rows, sortKey, direction]);
  const changeSort = (key: SortKey) => {
    if (key === sortKey) setDirection((value) => value === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setDirection('asc'); }
  };
  const sortButton = (key: SortKey, label: string) => <button type="button" title="Sort" onClick={() => changeSort(key)} className="inline-flex items-center gap-1 text-left font-semibold text-accent underline decoration-[rgb(var(--line))] underline-offset-2 hover:decoration-current">
    {label}<span aria-hidden="true">{key === sortKey ? direction === 'asc' ? '↑' : '↓' : '↕'}</span>
  </button>;

  return <div className="bh-panel mt-4 p-3 sm:p-5" data-bh-jev-context-table>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-lg font-semibold">Context limits by system</h3>
      <span className="bh-muted text-xs">{rows.length} systems · sources checked {day(checkedAt)}</span>
    </div>
    <details className="mt-3" data-bh-jev-context-table-details>
      <summary className="cursor-pointer text-sm font-semibold text-accent">All {rows.length} limits as a table</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead><tr className="bh-muted border-b border-[rgb(var(--line))] text-xs">
            <th scope="col" aria-sort={sortKey === 'system' ? direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="bh-ctx-sticky p-2">{sortButton('system', 'System')}</th>
            <th scope="col" aria-sort={sortKey === 'context' ? direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="p-2">{sortButton('context', 'Maximum input context')}</th>
            <th scope="col" aria-sort={sortKey === 'source' ? direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="p-2">{sortButton('source', 'Primary source')}</th>
            <th scope="col" aria-sort={sortKey === 'type' ? direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="p-2">{sortButton('type', 'Type')}</th>
          </tr></thead>
          <tbody>{sorted.map((row) => {
            const note = rowNote(row);
            return <tr key={row.key} className="border-b border-[rgb(var(--line))] last:border-0" data-bh-jev-context-row={row.key}>
              <th scope="row" className="bh-ctx-sticky p-2 font-medium">
                <span className="bh-muted mr-1.5 tabular text-xs">{row.rank == null ? 'Unranked' : `#${row.rank}`}</span>{row.system}
                {note && <a href={`#jev-context-note-${row.key}`} onClick={() => setNotesOpen(true)} title={firstSentence(note)} aria-label={`Note for ${row.system}: ${firstSentence(note)}`} className="ml-1 text-accent no-underline" data-bh-jev-context-dagger={row.key}>†</a>}
              </th>
              <td className="tabular whitespace-nowrap p-2" title={row.maxContext}>
                <span className="sm:hidden">{row.maxContextTokens == null ? 'Unknown' : row.maxContextTokens.toLocaleString('en-US')}</span>
                <span className="hidden sm:inline">{row.maxContextTokens == null ? 'Unknown' : row.maxContext}</span>
              </td>
              <td className="p-2 text-xs"><PrimarySource href={row.sourceUrl} label="Open primary source" title={`Source date ${day(row.sourceDate)} · checked ${day(row.sourceChecked)}`} /></td>
              <td className="whitespace-nowrap p-2 text-xs">{row.type}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </details>
    <CapacityNotes rows={rows} open={notesOpen} onOpenChange={setNotesOpen} />
    <p className="bh-muted mt-3 text-xs">“Hard limit” is an explicit model or tokenizer ceiling; “Trained length” is a published base-model or training length; “API cap” is a published service limit. These are different kinds of evidence. A base-model window does not prove that a particular hosted endpoint accepts the same length; row notes identify cases where its serving cap is unpublished. Some API docs publish a combined context window and a separate output ceiling, so the usable input can be lower when output tokens share that window. “Unknown” means no supported maximum was found.</p>
  </div>;
}

function LongPolicySummary({ rows, itemCount }: { rows: LongPolicy[]; itemCount: number }) {
  const ordered = [...rows].sort((a, b) => a.deltaPercentagePoints - b.deltaPercentagePoints);
  const mostAffected = ordered.slice(0, 3);
  const leastAffected = [...ordered].sort((a, b) => b.deltaPercentagePoints - a.deltaPercentagePoints).slice(0, 2);
  const examples = [...new Map([...mostAffected, ...leastAffected].map((row) => [row.key, row])).values()];
  return <div className="bh-panel mt-4 p-4 sm:p-5" data-bh-jev-context-long-policy>
    <h3 className="text-lg font-semibold">Long-policy tasks show a separate stress point</h3>
    <p className="bh-muted mt-1 text-sm">Across {itemCount} public items in the long-policy family, several systems scored well below their full public-set accuracy. The comparison uses the family label, not only the token buckets.</p>
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {examples.map((row) => <li key={row.key} className="rounded border border-[rgb(var(--line))] p-3 text-sm">
        <b>{row.system}</b><br />
        <span className="bh-muted">Long policy {row.longPolicyCorrect}/{row.longPolicyN} ({percent(row.longPolicyAccuracy)}) vs {row.overallCorrect}/{row.overallN} overall ({percent(row.overallAccuracy)}): <b>{pp(row.deltaPercentagePoints)}</b>.</span>
      </li>)}
    </ul>
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-semibold text-accent">All {rows.length} matched systems on long-policy tasks</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[650px] w-full text-left text-xs">
          <thead><tr className="bh-muted border-b border-[rgb(var(--line))]"><th className="p-2">System</th><th className="p-2">Overall</th><th className="p-2">Long policy ({itemCount} items)</th><th className="p-2">Change</th></tr></thead>
          <tbody>{ordered.map((row) => <tr key={row.key} className="border-b border-[rgb(var(--line))] last:border-0"><th scope="row" className="p-2 font-medium">#{row.rank} {row.system}</th><td className="tabular whitespace-nowrap p-2">{row.overallCorrect}/{row.overallN} · {percent(row.overallAccuracy)}</td><td className="tabular whitespace-nowrap p-2">{row.longPolicyCorrect}/{row.longPolicyN} · {percent(row.longPolicyAccuracy)}</td><td className="tabular whitespace-nowrap p-2">{pp(row.deltaPercentagePoints)}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
  </div>;
}

export type { ContextData };

export function JevContextLength({ data }: { data: ContextData }) {
  const worst = [...data.longPolicySystems].sort((a, b) => a.deltaPercentagePoints - b.deltaPercentagePoints)[0];
  const leastAffected = [...data.longPolicySystems].sort((a, b) => b.deltaPercentagePoints - a.deltaPercentagePoints)[0];
  const knownCapacity = data.capacitySystems.flatMap((row) => row.maxContextTokens == null ? [] : [row.maxContextTokens]);
  const maxKnown = Math.max(...knownCapacity);
  const minKnown = Math.min(...knownCapacity);
  const unknownCapacityCount = data.capacitySystems.filter((row) => row.maxContextTokens == null).length;

  return <section id="jev-context-length" className="mt-12 scroll-mt-6" data-bh-jev-context-section aria-labelledby="jev-context-title">
    <p className="bh-eyebrow">JevBench {data.sourceDataset.replace('JevBench ', '')} · input capacity and long inputs</p>
    <h2 id="jev-context-title" className="mt-1 text-2xl font-bold leading-snug sm:text-3xl">Context length</h2>
    <p className="bh-muted mt-2 max-w-5xl text-sm">Context length is how much input a system accepts in one request; a smaller window forces truncation or chunking.</p>
    <p className="bh-muted mt-1 text-xs" data-bh-jev-context-meta>{data.capacitySystems.length} rows · published limits {minKnown.toLocaleString('en-US')} to {tokens(maxKnown)} · {unknownCapacityCount} without a published maximum · sources checked {day(data.checkedAt)}</p>

    <AccuracyChart systems={data.lengthSystems} labels={data.bucketLabels} excluded={data.excludedLengthSystems} topRanked={data.topRankedSystemsConsidered} />
    <BucketCounts systems={data.lengthSystems} />

    <LongPolicySummary rows={data.longPolicySystems} itemCount={data.longPolicyItems} />
    <p className="bh-muted mt-3 max-w-5xl text-xs">For example, {worst.system} scored {percent(worst.longPolicyAccuracy)} on long-policy tasks versus {percent(worst.overallAccuracy)} overall (change {pp(worst.deltaPercentagePoints)}), while {leastAffected.system} scored {percent(leastAffected.longPolicyAccuracy)} versus {percent(leastAffected.overallAccuracy)} (change {pp(leastAffected.deltaPercentagePoints)}). These are descriptive public-set comparisons. Prompt wrappers and tokenizers differ by system, and the 19-item family is small, so the results do not isolate context length as the cause. Only public item results were used; sealed-set item rows were not used.</p>

    <CapacityChart rows={data.capacitySystems} />
    <CapacityTable rows={data.capacitySystems} checkedAt={data.checkedAt} />
  </section>;
}
