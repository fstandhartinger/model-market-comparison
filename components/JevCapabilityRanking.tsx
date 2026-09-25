import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { jevClassRows, type JevClassResult, type JevClassRow } from '../lib/jevbench-jev-class.mjs';
import { CapabilityBar, logBounds, costAxisPosition, costTicks, shortName, usd } from './JevCapabilityChart';
import type { JevBubblePoint } from './JevBubbleChart';

// Florian 25 Sep 2026 (DECISIONS.md): the page headline is the Capability ranking — the mean of Intelligence and
// Calibration — of Jev-class systems. Jev-class = cost per decision at most 2x Jev 1.13.0's AND median latency at most
// 2x Jev 1.13.0's. Everything else (general-purpose LLMs, slower or costlier systems) is listed below a divider.
// Presentation only: the official JevBench Score and its ranks are unchanged and follow further down.

const HEADLINE_TOP = 10;
const one = (v: number) => v.toFixed(1);
const secs = (v: number) => `${v.toFixed(2)} s`;

export function jevClassView(systems: JevV14System[]): JevClassResult & { points: JevBubblePoint[] } {
  const result = jevClassRows(systems);
  let n = 0;
  const classRank = new Map<string, number>();
  for (const r of result.rows) if (r.inClass && r.row.ranked) classRank.set(r.row.key, ++n);
  const points: JevBubblePoint[] = result.rows.map((r) => ({
    key: r.row.key, name: shortName(r.row.display), cls: r.row.class, rank: r.row.rank, ranked: !!r.row.ranked,
    capability: r.capability, intelligence: r.row.axes?.intelligence ?? null, calibration: r.row.axes?.calibration ?? null,
    cost: r.cost, costKind: r.row.cost?.kind ?? 'unknown', speed: r.row.axes?.speed ?? null, latency: r.latency, score: r.row.jevbench_score ?? null,
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
  const bar = ({ r, label }: { r: JevClassRow; label: string }) => <CapabilityBar key={r.row.key} row={r.row} capability={r.capability} position={0} rankLabel={label} costBounds={costBounds}
    note={r.isReference ? <>Reference system for the Jev-class limits</> : !r.row.ranked ? <>Not ranked in the official JevBench Score ({r.row.listing.replace(/_/g, ' ')})</> : undefined} />;
  const outsideBar = (r: JevClassRow) => <CapabilityBar key={r.row.key} row={r.row} capability={r.capability} position={0} rankLabel="" costBounds={costBounds} note={<>Outside: {r.reasons.join(', ')}</>} />;

  return <section id="jev-capability" className="mt-8 scroll-mt-6" aria-labelledby="jev-capability-title" data-bh-jev-capability-ranking>
    <p className="bh-eyebrow">JevBench {revision} · headline ranking</p>
    <h2 id="jev-capability-title" className="mt-1 text-2xl font-bold leading-snug sm:text-3xl">Capability ranking of Jev-class systems</h2>
    <p className="mt-2 max-w-4xl text-[15px]">
      Capability is the mean of <b>Intelligence</b> (how often the decision is right) and <b>Calibration</b> (how well its probabilities match reality).
      {lead && <> Among Jev-class systems, <b>{shortName(lead.r.row.display)}</b> leads with {one(lead.r.capability)}.</>}
      {' '}Speed and cost are not part of this number: they decide who counts as Jev-class, and the <a className="text-accent underline" href="#jev-bubbles">charts below</a> and the <a className="text-accent underline" href={officialHref}>official JevBench Score</a> weigh them in.
    </p>
    <p className="bh-panel mt-3 max-w-4xl p-3 text-[13.5px] leading-snug" data-bh-jev-class-rule>
      <b>Jev-class</b> = cost per decision at most 2× Jev 1.13.0&apos;s <span className="whitespace-nowrap">(≤ {usd(limits.cost)} per 1,000 decisions)</span> <b>and</b> median latency at most 2× Jev 1.13.0&apos;s <span className="whitespace-nowrap">(≤ {secs(limits.latency)}</span>, the adjusted p50 that the Speed axis uses).
      {' '}{inside.length} of {rows.length} systems qualify; the other {outside.length}, including the general-purpose LLMs, are listed below the divider.
      {speedFallback.length > 0 && <span className="bh-muted"> {speedFallback.map((r) => shortName(r.row.display)).join(', ')} {speedFallback.length === 1 ? 'has' : 'have'} no recorded median latency (carried from v1.3); for {speedFallback.length === 1 ? 'it' : 'them'} the Speed axis decides, at the 2× latency equivalent (Speed ≥ {one(limits.speedFloor)}).</span>}
    </p>

    <figure className="bh-panel mt-4 p-4 sm:p-5" data-bh-jev-capability-bars aria-labelledby="jev-capability-title">
      <div className="hidden grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_15rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
        <span /><span />
        <span className="bh-muted flex justify-between font-mono"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></span>
        <span className="bh-muted text-right font-mono">Cap.</span>
        <span className="bh-muted text-right font-mono">$/1k · I · C</span>
      </div>
      <ol className="mt-2 space-y-2.5 sm:mt-1" data-bh-jev-class-list>{numbered.slice(0, HEADLINE_TOP).map(bar)}</ol>
      {numbered.length > HEADLINE_TOP && <details className="mt-2.5" data-bh-jev-class-more>
        <summary className="cursor-pointer text-sm font-semibold text-accent">Show all {numbered.length} Jev-class systems ({numbered.length - HEADLINE_TOP} more)</summary>
        <ol className="mt-2.5 space-y-2.5">{numbered.slice(HEADLINE_TOP).map(bar)}</ol>
      </details>}
      <div className="mt-2 hidden gap-x-2 sm:grid sm:grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_15rem]" aria-hidden="true">
        <span /><span />
        <div className="relative col-start-3 row-start-1 h-4">
          {costTicks(costBounds).map((tick, i, all) => <span key={tick} className={`absolute top-0 whitespace-nowrap font-mono text-[10px] text-[var(--muted)] ${i === 0 ? '' : i === all.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${costAxisPosition(tick, costBounds)}%` }}>{usd(tick)}</span>)}
        </div>
      </div>
      <p className="bh-muted mt-1 text-[11.5px] leading-snug">Wide bar = Capability (0–100). Thin red line = cost per 1,000 decisions on a log scale; shorter is cheaper. # counts ranked Jev-class systems; &ldquo;–&rdquo; marks rows the official ranking lists without a rank.</p>

      <div className="bh-jev-class-divider" role="separator" data-bh-jev-class-divider>Outside the Jev-class limits · {outside.length} systems</div>
      <details className="mt-2" data-bh-jev-class-outside>
        <summary className="cursor-pointer text-sm font-semibold text-accent">Show general-purpose LLMs and other systems outside the limits</summary>
        <p className="bh-muted mt-2 text-[12.5px]">Sorted by Capability, not numbered. Each row says which limit it misses, measured against {refName} ({usd(reference.cost)} per 1,000 decisions, median {secs(reference.latency)}).</p>
        <ol className="mt-2.5 space-y-2.5">{outside.map(outsideBar)}</ol>
      </details>
    </figure>
  </section>;
}
