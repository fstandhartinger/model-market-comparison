import type { CSSProperties } from 'react';
import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { jevClassRows, medianLatencySpeed, type JevClassResult, type JevClassRow } from '../lib/jevbench-jev-class.mjs';
import { logBounds, costAxisPosition, costTicks, shortName, usd } from './JevCapabilityChart';
import type { JevBubblePoint } from './JevBubbleChart';
import { jevSourceUrl } from './jevSystemLinks';
import { JevCapabilityTip } from './JevCapabilityTip';
import { JEV_TYPE_LABEL, jevLegendTypes, jevTypeVarName } from './jevTypes';

// Florian 25 Sep 2026 (DECISIONS.md): the page headline is the Capability ranking — the mean of Intelligence and
// Calibration — of Jev-class systems. Jev-class = cost per decision at most 2x Jev 1.13.0's AND median latency at most
// 2x Jev 1.13.0's. Everything else (general-purpose LLMs, slower or costlier systems) is listed below a divider.
// Presentation only: the official JevBench Score and its ranks are unchanged and follow further down.

const HEADLINE_TOP = 10;
const one = (v: number) => v.toFixed(1);
const secs = (v: number) => `${v.toFixed(2)} s`;
const grid = 'grid grid-cols-[1.25rem_minmax(3.5rem,1fr)_2.35rem_2.35rem_2.7rem_4rem] gap-x-1 sm:grid-cols-[1.6rem_12rem_minmax(5rem,1fr)_7rem_5.7rem_6.3rem_6.5rem] sm:gap-x-2';

function RankingRow({ item, rank, costBounds, referenceCost, note }: {
  item: JevClassRow; rank: string; costBounds: [number, number]; referenceCost: number; note?: string;
}) {
  const { row, capability, cost, latency } = item;
  const intelligence = row.axes?.intelligence;
  const calibration = row.axes?.calibration;
  const costScore = row.axes?.cost;
  const name = shortName(row.display);
  const costRatio = cost == null || referenceCost <= 0 ? 'unknown' : `${(cost / referenceCost).toFixed(2)}× Jev`;
  const costWidth = cost == null ? 0 : cost === 0 ? 2 : costAxisPosition(cost, costBounds);
  // F-200 (pass 36): the ⓘ panel is a definition list, not one sentence; the 300-character native title on
  // the row is gone, the ⓘ is the way in (desktop hover/focus panel, touch modal in JevCapabilityTip).
  const tipTitle = `${row.display} · ${JEV_TYPE_LABEL[row.class] ?? row.class}`;
  const tipBody = <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1" data-bh-jev-capability-tip-dl>
    <dt className="text-gray-400">Capability</dt><dd className="tabular font-semibold">{one(capability)}</dd>
    <dt className="text-gray-400">Intelligence</dt><dd className="tabular">{intelligence == null ? 'unknown' : one(intelligence)}</dd>
    <dt className="text-gray-400">Calibration</dt><dd className="tabular">{calibration == null ? 'unknown' : one(calibration)}</dd>
    <dt className="text-gray-400">Cost Score</dt><dd className="tabular">{costScore == null ? 'unknown' : one(costScore)}</dd>
    <dt className="text-gray-400">Cost per 1,000 tasks</dt><dd className="tabular">{cost == null ? 'unknown' : `${usd(cost)} (${costRatio})`}</dd>
    <dt className="text-gray-400">Median latency</dt><dd className="tabular">{latency == null ? 'not reported (Speed axis used where available)' : secs(latency)}</dd>
    <dt className="text-gray-400">Rank</dt><dd className="tabular">Capability {rank || 'outside Jev-class'} · official {row.rank == null ? 'unranked' : `#${row.rank}`}</dd>
  </dl>;
  const style = { '--jev-t': `var(${jevTypeVarName(row.class)})` } as CSSProperties;
  const link = jevSourceUrl(row.key, row.repo);
  return <li className={`group relative ${grid} min-h-[43px] items-center text-[11px] sm:text-sm`} style={style}
    data-bh-jev14-capability-row={row.key} data-bh-jev14-capability-value={capability.toFixed(3)} data-bh-jev14-cost={cost ?? ''}>
    <span className="bh-muted tabular col-start-1 row-start-1 text-right">{rank || '–'}</span>
    <span className="col-start-2 row-start-1 flex min-w-0 items-center sm:justify-end" title={row.display}>
      <span className="min-w-0 truncate">{link ? <a href={link} target="_blank" rel="noopener noreferrer" className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent" data-bh-jev-source={row.key}>{name}</a> : name}</span>
      {/* The ⓘ sits outside the truncated name so long names keep their tap target. */}
      <JevCapabilityTip label={`Details for ${row.display}`} title={tipTitle}>{tipBody}</JevCapabilityTip>
    </span>
    <span className="col-start-2 col-end-7 row-start-2 mt-0.5 flex min-w-0 flex-col justify-center gap-[3px] sm:col-start-3 sm:col-end-4 sm:row-start-1 sm:mt-0" aria-hidden="true">
      <span className="bh-jevc-grid flex h-[10px] rounded-sm"><span className={'bh-jevc-bar' + (row.ranked ? '' : ' is-partial')} style={{ width: `${Math.max(0, Math.min(100, capability))}%` }} /></span>
      <span className="relative block h-[3px] rounded-full" data-bh-jev14-cost-bar>
        {costTicks(costBounds).map((tick) => <i key={tick} className="absolute top-[-2px] h-[7px] border-l border-[rgb(var(--muted))] opacity-40" style={{ left: `${costAxisPosition(tick, costBounds)}%` }} />)}
        <span className="bh-jev-cost-bar relative block h-full rounded-full" style={{ width: `${costWidth}%` }} />
      </span>
    </span>
    <span className="tabular col-start-3 row-start-1 text-right sm:col-start-4">{intelligence == null ? '—' : one(intelligence)}</span>
    <span className="tabular col-start-4 row-start-1 text-right sm:col-start-5">{costScore == null ? '—' : one(costScore)}</span>
    <b className="tabular col-start-5 row-start-1 text-right sm:col-start-6 sm:text-base">{one(capability)}</b>
    <span className="tabular col-start-6 row-start-1 text-right font-mono sm:col-start-7">{cost == null ? '—' : usd(cost)}{row.cost?.kind === 'estimate' ? '*' : ''}</span>
    {note && <span className="bh-muted col-start-2 col-end-7 row-start-3 mt-0.5 text-[11px] leading-snug sm:col-start-3 sm:col-end-8 sm:row-start-2" data-bh-jev-capability-note>{note}</span>}
    {/* Desktop hover/focus panel (touch gets JevCapabilityTip's modal; globals.css scopes .bh-jev-cap-tip
        to precise pointers so a tapped row never shows the floating panel). The name and class head it. */}
    <div role="tooltip" className="bh-panel bh-jev-cap-tip pointer-events-none absolute left-0 right-0 top-full z-20 hidden max-w-[560px] p-3 text-left text-xs leading-relaxed shadow-xl group-hover:block group-focus-within:block" data-bh-jev-capability-tooltip>
      <p className="mb-1.5 font-semibold">{tipTitle}</p>
      {tipBody}
    </div>
  </li>;
}

export function jevClassView(systems: JevV14System[]): JevClassResult & { points: JevBubblePoint[] } {
  const result = jevClassRows(systems);
  let n = 0;
  const classRank = new Map<string, number>();
  for (const r of result.rows) if (r.inClass && r.row.ranked) classRank.set(r.row.key, ++n);
  const points: JevBubblePoint[] = result.rows.map((r) => ({
    key: r.row.key, name: shortName(r.row.display), cls: r.row.class, rank: r.row.rank, ranked: !!r.row.ranked,
    capability: r.capability, intelligence: r.row.axes?.intelligence ?? null, calibration: r.row.axes?.calibration ?? null,
    cost: r.cost, costKind: r.row.cost?.kind ?? 'unknown', speed: r.row.axes?.speed ?? null, latency: r.latency, medianSpeed: medianLatencySpeed(r.row), score: r.row.jevbench_score ?? null,
    inClass: r.inClass, classRank: classRank.get(r.row.key) ?? null, isReference: r.isReference, outsideBecause: r.inClass ? null : r.reasons.join(', '),
  }));
  return { ...result, points };
}

export function JevCapabilityRanking({ systems, revision, officialHref }: { systems: JevV14System[]; revision: string; officialHref: string }) {
  const { reference, limits, rows } = jevClassRows(systems);
  const inside = rows.filter((r) => r.inClass);
  const outside = rows.filter((r) => !r.inClass);
  const speedFallback = inside.filter((r) => r.latencyBasis === 'speed-axis');
  const costBounds = logBounds(rows.map((r) => ({ cost: r.cost })));
  const refName = shortName(reference.display);
  let n = 0;
  const numbered = inside.map((r) => ({ r, label: r.row.ranked ? String(++n) : '–' }));
  const [lead] = numbered;
  const bar = ({ r, label }: { r: JevClassRow; label: string }) => <RankingRow key={r.row.key} item={r} rank={label} costBounds={costBounds} referenceCost={reference.cost}
    note={r.isReference ? 'Reference system for the Jev-class limits' : !r.row.ranked ? `Not ranked in the official JevBench Score (${r.row.listing.replace(/_/g, ' ')})` : undefined} />;
  const outsideBar = (r: JevClassRow) => <RankingRow key={r.row.key} item={r} rank="" costBounds={costBounds} referenceCost={reference.cost} note={`Outside: ${r.reasons.join(', ')}`} />;
  const types = jevLegendTypes(rows.map((r) => r.row.class));

  // F-197 (pass 36): mt-6 not mt-8 — with the guides nav folded out of the page head the first Capability row
  // must sit inside the tightened 590/660 px budgets; the smaller gap is the remaining headroom.
  return <section id="jev-capability" className="mt-6 scroll-mt-6" aria-labelledby="jev-capability-title" data-bh-jev-capability-ranking>
    <p className="bh-eyebrow">JevBench {revision} · headline ranking</p>
    <h2 id="jev-capability-title" className="mt-1 text-2xl font-bold leading-snug sm:text-3xl">Capability ranking of Jev-class systems</h2>
    <p className="mt-2 max-w-4xl text-[15px] leading-snug">
      Capability averages <b>Intelligence</b> and <b>Calibration</b>.
      {lead && <> <b>{shortName(lead.r.row.display)}</b> leads the Jev-class systems with {one(lead.r.capability)}.</>}
    </p>
    <p className="bh-muted mt-2 text-[13px] leading-snug" data-bh-jev-class-summary>
      Jev-class means at most 2× Jev&apos;s cost and median latency. <a className="text-accent underline" href="#jev-class-method">How we choose ↘</a>
    </p>

    <figure className="bh-panel mt-4 p-4 sm:p-5" data-bh-jev-capability-bars aria-labelledby="jev-capability-title">
      <div className={`${grid} items-end text-[10px] sm:text-[11px]`} data-bh-jev-capability-columns>
        <span className="bh-muted text-right">#</span><span className="bh-muted">System</span>
        <span className="bh-muted hidden justify-between font-mono sm:flex"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></span>
        <span className="bh-muted text-right" title="Intelligence Score"><span className="sm:hidden">I</span><span className="hidden sm:inline">Intelligence<br />Score</span></span>
        <span className="bh-muted text-right" title="Cost Score"><span className="sm:hidden">C</span><span className="hidden sm:inline">Cost<br />Score</span></span>
        <span className="bh-muted text-right" title="Capability"><span className="sm:hidden">Cap.</span><span className="hidden sm:inline">Capability</span></span>
        <span className="bh-muted text-right" title="US dollars per 1,000 tasks"><span className="sm:hidden">$/1k</span><span className="hidden sm:inline">$/1k tasks</span></span>
      </div>
      <ol className="mt-2 space-y-2.5 sm:mt-1" data-bh-jev-class-list>{numbered.slice(0, HEADLINE_TOP).map(bar)}</ol>
      {numbered.length > HEADLINE_TOP && <details className="mt-2.5" data-bh-jev-class-more>
        <summary className="cursor-pointer text-sm font-semibold text-accent">Show all {numbered.length} Jev-class systems ({numbered.length - HEADLINE_TOP} more)</summary>
        <ol className="mt-2.5 space-y-2.5">{numbered.slice(HEADLINE_TOP).map(bar)}</ol>
      </details>}
      <div className={`${grid} mt-2 hidden sm:grid`} aria-hidden="true">
        <span /><span />
        <div className="relative col-start-3 row-start-1 h-4">
          {costTicks(costBounds).map((tick, i, all) => <span key={tick} className={`absolute top-0 whitespace-nowrap font-mono text-[10px] text-[var(--muted)] ${i === 0 ? '' : i === all.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${costAxisPosition(tick, costBounds)}%` }}>{usd(tick)}</span>)}
        </div>
      </div>
      <p className="bh-muted mt-1 text-[11.5px] leading-snug">Wide coloured bar = Capability (0–100). Thin red line = cost per 1,000 tasks; <b>log scale, each gridline = 10×</b>, shorter is cheaper. * = estimated cost. # counts ranked Jev-class systems; &ldquo;–&rdquo; marks unranked or outside systems. Tap ⓘ for the full values, median latency and cost relative to Jev.</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]" aria-label="Ranking colour legend" data-bh-jev-capability-legend>
        {types.map((type) => <li key={type} style={{ '--jev-t': `var(${jevTypeVarName(type)})` } as CSSProperties}><span className="bh-jevc-swatch mr-1.5" />{JEV_TYPE_LABEL[type] ?? type}</li>)}
        <li><span className="bh-jev-cost-bar mr-1.5 inline-block h-[3px] w-4 rounded-full align-middle" />Cost line</li>
      </ul>

      <div className="bh-jev-class-divider" role="separator" data-bh-jev-class-divider>Outside the Jev-class limits · {outside.length} systems</div>
      <details className="mt-2" data-bh-jev-class-outside>
        <summary className="cursor-pointer text-sm font-semibold text-accent">Show general-purpose LLMs and other systems outside the limits</summary>
        <p className="bh-muted mt-2 text-[12.5px]">Sorted by Capability, not numbered. Each row says which limit it misses, measured against {refName} ({usd(reference.cost)} per 1,000 decisions, median {secs(reference.latency)}).</p>
        <ol className="mt-2.5 space-y-2.5">{outside.map(outsideBar)}</ol>
      </details>
    </figure>
    <p id="jev-class-method" className="bh-panel mt-3 max-w-4xl scroll-mt-6 p-3 text-[13.5px] leading-snug" data-bh-jev-class-rule>
      <b>Jev-class</b> = cost per decision at most 2× Jev 1.13.0&apos;s <span className="whitespace-nowrap">(≤ {usd(limits.cost)} per 1,000 decisions)</span> <b>and</b> median latency at most 2× Jev 1.13.0&apos;s <span className="whitespace-nowrap">(≤ {secs(limits.latency)}</span>, the adjusted p50 — the same median the speed chart plots, not the four-axis Speed score).
      {' '}{inside.length} of {rows.length} systems qualify; the other {outside.length}, including the general-purpose LLMs, are listed below the divider in the ranking.
      {speedFallback.length > 0 && <span className="bh-muted"> {speedFallback.map((r) => shortName(r.row.display)).join(', ')} {speedFallback.length === 1 ? 'has' : 'have'} no recorded median latency (carried from v1.3); for {speedFallback.length === 1 ? 'it' : 'them'} the Speed axis decides, at the 2× latency equivalent (Speed ≥ {one(limits.speedFloor)}).</span>}
      {' '}The <a className="text-accent underline" href="#jev-bubbles">charts below</a> show speed and cost beside Capability; the <a className="text-accent underline" href={officialHref}>official JevBench Score</a> weighs all four axes.
    </p>
  </section>;
}
