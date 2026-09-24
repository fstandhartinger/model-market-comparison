'use client';

import { useMemo, useState } from 'react';

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

function PrimarySource({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="bh-muted">No source published</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline decoration-[rgb(var(--line))] underline-offset-2 hover:decoration-current">{label}</a>;
}

function CapacityDetails({ row }: { row: Capacity }) {
  const hasDetails = row.basis || row.notes || row.baseModel || row.systemRepoUrl || row.trainingSourceUrl || row.trainingMaxSeqLen != null || row.trainingStateMaxTokens != null || row.trainingBatchTokens != null || row.validatedLength != null;
  if (!hasDetails) return null;

  return <details className="mt-1.5 max-w-xl text-xs">
    <summary className="cursor-pointer text-accent">Basis, training and serving notes</summary>
    <div className="bh-muted mt-2 space-y-1.5 leading-relaxed">
      {row.baseModel && <p><b className="text-gray-200">Base model:</b> {row.baseModel}. A Jev-class adapter normally inherits this window unless its training or serving setup truncates input.</p>}
      {row.basis && <p><b className="text-gray-200">Evidence:</b> {row.basis}</p>}
      {row.trainingMaxSeqLen != null && <p><b className="text-gray-200">Training max_seq_len:</b> {tokens(row.trainingMaxSeqLen)}.</p>}
      {row.trainingStateMaxTokens != null && <p><b className="text-gray-200">Training state limit:</b> {tokens(row.trainingStateMaxTokens)}.</p>}
      {row.trainingBatchTokens != null && <p><b className="text-gray-200">Training batch token budget:</b> {tokens(row.trainingBatchTokens)}.</p>}
      {row.validatedLength != null && <p><b className="text-gray-200">Reported validation point:</b> {tokens(row.validatedLength)}. This is not automatically the maximum accepted input.</p>}
      {row.notes && <p>{row.notes}</p>}
      {row.systemRepoUrl && <p><PrimarySource href={row.systemRepoUrl} label={`System repository${row.systemRepoDate ? ` · ${day(row.systemRepoDate)}` : ''}`} /></p>}
      {row.baseSourceUrl && row.baseSourceUrl !== row.sourceUrl && <p><PrimarySource href={row.baseSourceUrl} label={`Base model source${row.baseSourceDate ? ` · ${day(row.baseSourceDate)}` : ''}`} /></p>}
      {row.trainingSourceUrl && <p><PrimarySource href={row.trainingSourceUrl} label={`Training configuration${row.trainingSourceDate ? ` · ${day(row.trainingSourceDate)}` : ''}`} /></p>}
    </div>
  </details>;
}

function AccuracyChart({ systems, labels }: { systems: LengthSystem[]; labels: string[] }) {
  const width = 740, height = 305, left = 52, right = 18, top = 16, bottom = 57;
  const plotRight = width - right, plotBottom = height - bottom;
  const x = (index: number) => left + (plotRight - left) * (labels.length < 2 ? 0 : index / (labels.length - 1));
  const y = (value: number) => top + (plotBottom - top) * (1 - value);

  return <figure className="bh-panel mt-4 min-w-0 p-3 sm:p-5" data-bh-jev-context-chart aria-labelledby="jev-context-chart-heading">
    <h3 id="jev-context-chart-heading" className="text-lg font-semibold">Public accuracy by actual input length</h3>
    <p className="bh-muted mt-1 text-sm">Each line is one of the {systems.length} top-15 systems with reconciled public outcomes and input-token counts. A point&apos;s tooltip shows the system, accuracy, correct answers and bucket size.</p>
    <svg className="mt-3 block h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="jev-context-svg-title jev-context-svg-desc">
      <title id="jev-context-svg-title">JevBench public accuracy across seven input-length buckets</title>
      <desc id="jev-context-svg-desc">{systems.length} systems are plotted across {labels.join(', ')} input-token buckets. Bucket denominators differ by system and are available in the details table below.</desc>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => <g key={tick}>
        <line x1={left} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke="rgb(var(--line) / .7)" />
        <text x={left - 8} y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="11">{Math.round(tick * 100)}%</text>
      </g>)}
      {labels.map((label, index) => <g key={label}>
        <line x1={x(index)} x2={x(index)} y1={top} y2={plotBottom} stroke="rgb(var(--line) / .42)" />
        <text x={x(index)} y={plotBottom + 18} textAnchor="middle" fill="var(--muted)" fontSize="10.5">{label}</text>
      </g>)}
      <text x={(left + plotRight) / 2} y={height - 9} textAnchor="middle" fill="var(--text)" fontSize="10">Actual input tokens per decision</text>
      {systems.map((system, systemIndex) => <g key={system.key}>
        {system.buckets.slice(1).map((bucket, bucketIndex) => {
          const previous = system.buckets[bucketIndex];
          if (previous.accuracy == null || bucket.accuracy == null) return null;
          return <line key={`${system.key}-${bucketIndex}`} x1={x(bucketIndex)} y1={y(previous.accuracy)} x2={x(bucketIndex + 1)} y2={y(bucket.accuracy)} stroke={palette[systemIndex % palette.length]} strokeWidth="2" strokeLinecap="round" data-bh-jev-context-line={system.key} />;
        })}
        {system.buckets.map((bucket, bucketIndex) => bucket.accuracy == null ? null : <circle key={`${system.key}-${bucketIndex}`} cx={x(bucketIndex)} cy={y(bucket.accuracy)} r="4" fill={palette[systemIndex % palette.length]} stroke="var(--surface)" strokeWidth="1.5" tabIndex={0} data-bh-jev-context-point={`${system.key}:${bucket.label}`}>
          <title>{`#${system.rank} ${system.system} · ${bucket.label} tokens: ${percent(bucket.accuracy)} (${bucket.correct}/${bucket.n})`}</title>
        </circle>)}
      </g>)}
    </svg>
    <ul className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-3" aria-label="Chart systems, with the top five shown first" data-bh-jev-context-top-five>
      {systems.map((system, index) => <li key={system.key} className="flex min-w-0 items-baseline gap-2" data-bh-jev-context-system={system.key}>
        <span className="inline-block h-0.5 w-4 shrink-0" style={{ backgroundColor: palette[index % palette.length] }} aria-hidden="true" />
        <span className="min-w-0 break-words" title={`#${system.rank} ${system.system}`}>{index < 5 && <b>Top five · </b>}#{system.rank} {system.system}</span>
      </li>)}
    </ul>
    <figcaption className="bh-muted mt-3 text-xs">Bucket counts vary because only stored usage telemetry is available. The chart describes these benchmark items; it does not show that context length alone caused a score change.</figcaption>
  </figure>;
}

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
  const known = rows.flatMap((row) => row.maxContextTokens == null ? [] : [row.maxContextTokens]);
  const maximum = Math.max(CONTEXT_MIN, ...known);
  const barColor = (type: string) => type === 'API cap' ? 'rgb(var(--accent))' : type === 'Trained length' ? 'rgb(var(--accent2))' : 'rgb(var(--warn))';
  const trainingNotes = (row: Capacity) => [
    row.trainingMaxSeqLen == null ? null : `max_seq_len ${tokens(row.trainingMaxSeqLen)}`,
    row.trainingStateMaxTokens == null ? null : `state limit ${tokens(row.trainingStateMaxTokens)}`,
  ].filter(Boolean);

  return <figure className="bh-panel mt-4 min-w-0 p-3 sm:p-5" data-bh-jev-context-capacity-chart aria-labelledby="jev-context-capacity-chart-title">
    <h3 id="jev-context-capacity-chart-title" className="text-lg font-semibold">Published context limits · logarithmic scale</h3>
    <p className="bh-muted mt-1 text-sm">Each row shows the system&apos;s exact published maximum input context. API/serving caps, hard limits and trained lengths use different bar colors; training configuration limits appear as separate markers and values where published.</p>
    <div className="mt-4">
      <div className="relative h-6" aria-hidden="true">
        {CONTEXT_TICKS.filter((tick) => tick <= maximum).map((tick, index, ticks) => <span key={tick} className={`absolute top-0 whitespace-nowrap font-mono text-[10px] text-[var(--muted)] ${index === 0 ? '' : index === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'} ${tick === 524288 ? 'hidden sm:block' : ''}`} style={{ left: `${contextPosition(tick, maximum)}%` }}>{contextTickLabel(tick)}</span>)}
      </div>
      <ol className="m-0 list-none p-0" aria-label="Published context limits by system">
      {rows.map((row) => {
        const seq = row.trainingMaxSeqLen;
        const state = row.trainingStateMaxTokens;
        const note = trainingNotes(row);
        const rowLabel = `${row.rank == null ? 'Unranked' : `JevBench rank ${row.rank}`} ${row.system}; ${row.maxContextTokens == null ? 'published maximum unknown' : `${tokens(row.maxContextTokens)}, ${row.type}`}${note.length ? `; training ${note.join(', ')}` : ''}`;
        return <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 border-t border-[rgb(var(--line))] py-2 first:border-0" data-bh-jev-context-capacity-row={row.key} aria-label={rowLabel}>
          <span className="min-w-0 truncate text-xs font-medium" title={rowLabel}>{row.rank == null ? 'Unranked' : `#${row.rank}`} {row.system}</span>
          <span className="tabular text-right text-[11px]" title={row.type}>{row.maxContextTokens == null ? 'Unknown' : `${row.maxContextTokens.toLocaleString('en-US')} · ${row.type}`}</span>
          <div className="relative col-span-2 mt-1 h-3 rounded-sm bg-[rgb(var(--line)/.38)]" role="img" aria-label={rowLabel}>
            {row.maxContextTokens != null && <span className="absolute inset-y-0 left-0 min-w-[2px] rounded-sm" style={{ width: `${Math.max(0.8, contextPosition(row.maxContextTokens, maximum))}%`, backgroundColor: barColor(row.type) }} title={`${row.system}: ${tokens(row.maxContextTokens)} (${row.type})`} />}
            {seq != null && <span className="absolute inset-y-[-2px] z-10 border-l-2 border-solid border-[var(--text)]" style={{ left: `${contextPosition(seq, maximum)}%` }} title={`Training max_seq_len: ${tokens(seq)}`} aria-hidden="true" />}
            {state != null && <span className="absolute inset-y-[-2px] z-10 border-l-2 border-dashed border-[var(--text)]" style={{ left: `${contextPosition(state, maximum)}%` }} title={`Training state limit: ${tokens(state)}`} aria-hidden="true" />}
          </div>
          {note.length > 0 && <span className="bh-muted col-span-2 mt-0.5 text-[10px]">Training configuration: {note.join(' · ')}.</span>}
        </li>;
      })}
      </ol>
    </div>
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]" aria-label="Context chart legend">
      <li><span className="mr-1.5 inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: 'rgb(var(--accent))' }} />API / serving cap</li>
      <li><span className="mr-1.5 inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: 'rgb(var(--warn))' }} />Hard limit</li>
      <li><span className="mr-1.5 inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: 'rgb(var(--accent2))' }} />Trained length</li>
      <li><span className="mr-1.5 inline-block h-3 border-l-2 border-solid border-[var(--text)] align-middle" />Training max_seq_len</li>
      <li><span className="mr-1.5 inline-block h-3 border-l-2 border-dashed border-[var(--text)] align-middle" />Training state limit</li>
    </ul>
    <figcaption className="bh-muted mt-2 text-xs">The scale runs from 512 tokens to {tokens(maximum)}. Source links, dates, evidence notes and exact training details remain in the table below.</figcaption>
  </figure>;
}

function BucketCounts({ systems }: { systems: LengthSystem[] }) {
  return <details className="bh-panel mt-3 p-4" data-bh-jev-context-bucket-counts>
    <summary className="cursor-pointer text-sm font-semibold">Exact correct counts and denominators by bucket</summary>
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
  const sortButton = (key: SortKey, label: string) => <button type="button" onClick={() => changeSort(key)} className="inline-flex items-center gap-1 text-left font-semibold text-accent underline decoration-[rgb(var(--line))] underline-offset-2 hover:decoration-current">
    {label}<span aria-hidden="true">{key === sortKey ? direction === 'asc' ? '↑' : '↓' : '↕'}</span>
  </button>;

  return <div className="bh-panel mt-4 p-3 sm:p-5" data-bh-jev-context-table>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-lg font-semibold">Context limits by system</h3>
      <span className="bh-muted text-xs">{rows.length} systems · sources checked {day(checkedAt)}</span>
    </div>
    <p className="bh-muted mt-1 text-sm">Sort by selecting a column heading. Source links open the primary model card, vendor documentation, or API documentation.</p>
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead><tr className="bh-muted border-b border-[rgb(var(--line))] text-xs">
          <th scope="col" aria-sort={sortKey === 'system' ? direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="p-2">{sortButton('system', 'System')}</th>
          <th scope="col" aria-sort={sortKey === 'context' ? direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="p-2">{sortButton('context', 'Maximum input context')}</th>
          <th scope="col" aria-sort={sortKey === 'source' ? direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="p-2">{sortButton('source', 'Primary source · date')}</th>
          <th scope="col" aria-sort={sortKey === 'type' ? direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="p-2">{sortButton('type', 'Type')}</th>
        </tr></thead>
        <tbody>{sorted.map((row) => <tr key={row.key} className="border-b border-[rgb(var(--line))] align-top last:border-0" data-bh-jev-context-row={row.key}>
          <th scope="row" className="p-2 font-medium">
            <span className="bh-muted mr-1.5 tabular text-xs">{row.rank == null ? 'Unranked' : `#${row.rank}`}</span>{row.system}
            <CapacityDetails row={row} />
          </th>
          <td className="tabular whitespace-nowrap p-2">{row.maxContextTokens == null ? 'Unknown' : row.maxContext}</td>
          <td className="p-2 text-xs">
            <PrimarySource href={row.sourceUrl} label="Open primary source" />
            <span className="bh-muted mt-1 block text-[10px]">Source date: {day(row.sourceDate)} · checked: {day(row.sourceChecked)}</span>
          </td>
          <td className="whitespace-nowrap p-2 text-xs">{row.type}</td>
        </tr>)}</tbody>
      </table>
    </div>
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
    <p className="bh-muted mt-1 text-sm">Across {itemCount} public items in the long_policy family, several systems scored well below their full public-set accuracy. The comparison uses the family label, not only the token buckets.</p>
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {examples.map((row) => <li key={row.key} className="rounded border border-[rgb(var(--line))] p-3 text-sm">
        <b>{row.system}</b><br />
        <span className="bh-muted">Long policy {row.longPolicyCorrect}/{row.longPolicyN} ({percent(row.longPolicyAccuracy)}) vs {row.overallCorrect}/{row.overallN} overall ({percent(row.overallAccuracy)}): <b>{pp(row.deltaPercentagePoints)}</b>.</span>
      </li>)}
    </ul>
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-semibold text-accent">Show long_policy results for all {rows.length} matched systems</summary>
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
  const lengthCoverageMin = Math.min(...data.lengthSystems.map((row) => row.lengthCoverage));
  const lengthCoverageMax = Math.max(...data.lengthSystems.map((row) => row.lengthCoverage));

  return <section id="jev-context-length" className="mt-12 scroll-mt-6" data-bh-jev-context-section aria-labelledby="jev-context-title">
    <p className="bh-eyebrow">JevBench {data.sourceDataset.replace('JevBench ', '')} · input capacity and long inputs</p>
    <h2 id="jev-context-title" className="mt-1 text-2xl font-bold leading-snug sm:text-3xl">Context length</h2>
    <p className="bh-muted mt-2 max-w-5xl text-sm">Context length is the amount of input a model or service can accept in one request. It matters when an app sends a long conversation state, policy set, or document: a smaller window can force truncation or chunking. A larger window is a capacity ceiling, not a promise that the system will use every token well.</p>
    <p className="bh-muted mt-2 max-w-5xl text-sm">Across {data.capacitySystems.length} v1.4.1 rows ({data.capacitySystems.filter((row) => row.rank != null).length} ranked systems and {data.capacitySystems.filter((row) => row.rank == null).length} unranked additions), supported published values range from {tokens(minKnown)} to {tokens(maxKnown)}; {unknownCapacityCount} have no published maximum we could verify. For Jev-class rebuilds, the chart and table separate a model&apos;s trained length from any published serving cap and show training truncation limits where available.</p>

    <AccuracyChart systems={data.lengthSystems} labels={data.bucketLabels} />
    <BucketCounts systems={data.lengthSystems} />
    <p className="bh-muted mt-3 text-xs" data-bh-jev-context-coverage>Coverage: {data.lengthSystems.length} of the top {data.topRankedSystemsConsidered} systems are shown. Exclusions: {data.excludedLengthSystems.map((row) => `${row.system} (${row.reason})`).join('; ')}. All {data.lengthSystems.length} included systems exactly reproduce their published public accuracy; stored lengths cover {lengthCoverageMin}–{lengthCoverageMax} decisions per system.</p>

    <LongPolicySummary rows={data.longPolicySystems} itemCount={data.longPolicyItems} />
    <p className="bh-muted mt-3 max-w-5xl text-xs">For example, {worst.system} scored {percent(worst.longPolicyAccuracy)} on long_policy versus {percent(worst.overallAccuracy)} overall (change {pp(worst.deltaPercentagePoints)}), while {leastAffected.system} scored {percent(leastAffected.longPolicyAccuracy)} versus {percent(leastAffected.overallAccuracy)} (change {pp(leastAffected.deltaPercentagePoints)}). These are descriptive public-set comparisons. Prompt wrappers and tokenizers differ by system, and the 19-item family is small, so the results do not isolate context length as the cause. Only public item results were used; sealed-set item rows were not used.</p>

    <CapacityChart rows={data.capacitySystems} />
    <CapacityTable rows={data.capacitySystems} checkedAt={data.checkedAt} />
    <p className="bh-muted mt-3 max-w-5xl text-xs">The input-length chart uses each system&apos;s existing <code>usage.input_tokens</code> telemetry and public item outcomes; no new model runs were made. Source dates are listed beside each primary-source link, and every source was checked {day(data.checkedAt)}. Training limits and inference or API caps are shown separately where published.</p>
  </section>;
}
