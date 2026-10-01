import type { CSSProperties, ReactNode } from 'react';
import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { jevClassRows, medianLatencySpeed, ratioPosition, trafficLightZone, type JevClassOptions, type JevClassResult, type JevClassRow } from '../lib/jevbench-jev-class.mjs';
import { shortName, usd } from './JevCapabilityChart';
import type { JevBubblePoint } from './JevBubbleChart';
import { jevSourceUrl } from './jevSystemLinks';
import { JevCapabilityTip } from './JevCapabilityTip';
import { JEV_TYPE_LABEL, jevLegendTypes, jevTypeVarName } from './jevTypes';
import { apiExplanation } from './JevBoardShared';

// Florian 25 Sep 2026 (DECISIONS.md): the page headline is the Capability ranking — the mean of Intelligence and
// Calibration — of Jev-class systems. Jev-class = cost per decision at most 2x Jev 1.13.0's AND median latency at most
// 2x Jev 1.13.0's. Everything else (general-purpose LLMs, slower or costlier systems) is listed below a divider.
// Presentation only: the official JevBench Score and its ranks are unchanged and follow further down.

const HEADLINE_TOP = 10;
const one = (v: number) => v.toFixed(1);
const secs = (v: number) => `${v.toFixed(2)} s`;
const grid = 'grid grid-cols-[1.25rem_minmax(3.5rem,1fr)_2.35rem_2.35rem_2.7rem_4rem] gap-x-1 sm:grid-cols-[1.6rem_12rem_minmax(5rem,1fr)_7rem_5.7rem_6.3rem_6.5rem] sm:gap-x-2';

function TrafficLightBar({ kind, ratio, factor, referenceLabel, derived = false }: {
  kind: 'cost' | 'latency'; ratio: number | null; factor: number; referenceLabel: string; derived?: boolean;
}) {
  const zone = trafficLightZone(ratio, factor);
  const end = ratio == null ? 0 : Math.max(1, ratioPosition(ratio));
  const greenEnd = Math.min(end, ratioPosition(1));
  const amberEnd = Math.min(end, ratioPosition(factor));
  return <span className="flex h-[9px] items-center gap-1">
    <span className="bh-muted w-2.5 shrink-0 text-center text-[9px] leading-[9px]" aria-hidden="true">{kind === 'cost' ? '$' : '⏱'}</span>
    <span className="bh-tl-track relative block h-[4px] min-w-0 flex-1 rounded-full" role="img"
    aria-label={`${kind === 'cost' ? 'Cost' : 'Median latency'}: ${ratio == null ? 'unknown' : `${ratio.toFixed(2)}× ${referenceLabel}, ${zone}`}${derived ? ' (derived from Speed axis)' : ''}`}
    data-bh-tl-cost={kind === 'cost' ? zone ?? 'unknown' : undefined}
    data-bh-tl-latency={kind === 'latency' ? zone ?? 'unknown' : undefined}
    data-bh-tl-ratio={ratio ?? undefined} data-bh-tl-derived={derived ? 'speed-axis' : undefined}>
    <span className="bh-tl-green absolute inset-y-0 left-0 rounded-l-full" style={{ width: `${greenEnd}%` }} />
    {amberEnd > greenEnd && <span className="bh-tl-amber absolute inset-y-0" style={{ left: `${greenEnd}%`, width: `${amberEnd - greenEnd}%` }} />}
    {end > amberEnd && <span className="bh-tl-red absolute inset-y-0 rounded-r-full" style={{ left: `${amberEnd}%`, width: `${end - amberEnd}%` }} />}
    {[1, factor].map((tick) => <i key={tick} className="bh-tl-tick absolute top-[-1px] h-[6px] border-l" style={{ left: `${ratioPosition(tick)}%` }} aria-hidden="true" />)}
    </span>
  </span>;
}

function RatioDetail({ value, ratio, factor, referenceLabel, kind }: {
  value: string; ratio: number | null; factor: number; referenceLabel: string; kind: 'cost' | 'latency';
}) {
  const zone = trafficLightZone(ratio, factor);
  return <>{value}{zone && ratio != null && <> = {ratio.toFixed(2)}× {referenceLabel} → <span className={`bh-tl-chip bh-tl-${zone}`}>{zone}</span>: {zone === 'green' ? `as ${kind === 'cost' ? 'cheap' : 'fast'} as ${referenceLabel} or better` : zone === 'amber' ? `inside the ${factor}× cap, but ${kind === 'cost' ? 'costlier' : 'slower'} than ${referenceLabel}` : `outside the ${factor}× cap`}</>}</>;
}

// Florian 1 Oct 2026: an API model whose base model we know is ranked at the developer's own list price; the composite
// shows a striped base-model bar. Here the matching note says whether the Capability eligibility would change at the
// base-model price (only cost moves; latency is measured on the developer's endpoint either way).
function basePriceCheck(row: JevV14System, reference: JevClassResult['reference'], costCap: number, referenceLabel: string) {
  const alt = (row as JevV14System & { alt?: { usd_per_1000?: number | null; note?: string } }).alt;
  const base = alt?.usd_per_1000;
  if (!row.api_flag || base == null || !Number.isFinite(base) || !(reference.cost > 0)) return null;
  const ratio = base / reference.cost;
  const fits = base <= costCap;
  referenceLabel = referenceLabel.replace(/ \([^)]*\)$/, '');
  const short = `API price · eligibility checked at the developer's list price; at base-model pricing it would ${fits ? 'still fit within' : 'exceed'} the cost cap (${ratio.toFixed(2)}× ${referenceLabel})`;
  const detail = `Ranked at the developer's own API list price. ${alt?.note ? `Base-model reference: ${alt.note}, ` : 'At the base-model reference price we use for self-served open weights of the same base, '}USD ${base.toFixed(4)} per 1,000 decisions = ${ratio.toFixed(2)}× ${referenceLabel}, ${fits ? 'inside' : 'outside'} the cost cap (USD ${costCap.toFixed(4)}). Capability Score itself does not depend on price; latency is measured on the developer's endpoint either way.`;
  return { short, detail, fits, ratio };
}

function RankingRow({ item, rank, reference, factor, referenceLabel, classLabel, note, costCap }: {
  item: JevClassRow; rank: string; reference: JevClassResult['reference']; factor: number;
  referenceLabel: string; classLabel: string; note?: string; costCap: number;
}) {
  const { row, capability, cost, latency } = item;
  const basePrice = basePriceCheck(row, reference, costCap, referenceLabel);
  const intelligence = row.axes?.intelligence;
  const calibration = row.axes?.calibration;
  const costScore = row.axes?.cost;
  const name = shortName(row.display);
  const latencyRatio = item.latencyRatio ?? (item.latencyBasis === 'speed-axis' && row.axes?.speed != null ? 10 ** ((reference.speed - row.axes.speed) / 20) : null);
  const derived = item.latencyBasis === 'speed-axis';
  // F-200 (pass 36): the ⓘ panel is a definition list, not one sentence; the 300-character native title on
  // the row is gone, the ⓘ is the way in (desktop hover/focus panel, touch modal in JevCapabilityTip).
  const tipTitle = `${row.display} · ${JEV_TYPE_LABEL[row.class] ?? row.class}`;
  const tipBody = <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1" data-bh-jev-capability-tip-dl>
    <dt className="text-gray-400">Capability Score</dt><dd className="tabular font-semibold">{one(capability)}</dd>
    <dt className="text-gray-400">Intelligence</dt><dd className="tabular">{intelligence == null ? 'unknown' : one(intelligence)}</dd>
    <dt className="text-gray-400">Calibration</dt><dd className="tabular">{calibration == null ? 'unknown' : one(calibration)}</dd>
    <dt className="text-gray-400">Cost Score</dt><dd className="tabular">{costScore == null ? 'unknown' : one(costScore)}</dd>
    <dt className="text-gray-400">Cost vs cap</dt><dd className="tabular"><RatioDetail value={cost == null ? 'unknown' : `${usd(cost)} per 1,000 decisions`} ratio={item.costRatio} factor={factor} referenceLabel={referenceLabel} kind="cost" /></dd>
    <dt className="text-gray-400">Latency vs cap</dt><dd className="tabular"><RatioDetail value={latency != null ? secs(latency) : latencyRatio != null ? `${secs(latencyRatio * reference.latency)} equivalent (derived from Speed axis; p50 not reported)` : 'not reported'} ratio={latencyRatio} factor={factor} referenceLabel={referenceLabel} kind="latency" /></dd>
    {basePrice && <><dt className="text-gray-400">Pricing</dt><dd data-bh-jev-capability-base-price-tip>{basePrice.detail}</dd></>}
    <dt className="text-gray-400">Rank</dt><dd className="tabular">Capability Score {rank || `outside ${classLabel}`} · official {row.rank == null ? 'unranked' : `#${row.rank}`}</dd>
    <dt className="text-gray-400">Colours</dt><dd>Green ≤ reference; amber ≤ cap; red &gt; cap. Shorter is cheaper or faster.</dd>
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
      {row.api_flag && <span className="bh-thin-tag bh-flag-tag ml-1 shrink-0 align-middle" data-bh-jev-capability-api={row.key} title={row.api_exposure_note ?? apiExplanation}>API</span>}
    </span>
    <span className="col-start-2 col-end-7 row-start-2 mt-0.5 flex min-w-0 flex-col justify-center gap-[3px] sm:col-start-3 sm:col-end-4 sm:row-start-1 sm:mt-0">
      <span className="bh-jevc-grid flex h-[10px] rounded-sm" aria-hidden="true"><span className={'bh-jevc-bar' + (row.ranked ? '' : ' is-partial')} style={{ width: `${Math.max(0, Math.min(100, capability))}%` }} /></span>
      <TrafficLightBar kind="cost" ratio={item.costRatio} factor={factor} referenceLabel={referenceLabel} />
      <TrafficLightBar kind="latency" ratio={latencyRatio} factor={factor} referenceLabel={referenceLabel} derived={derived} />
    </span>
    <span className="tabular col-start-3 row-start-1 text-right sm:col-start-4">{intelligence == null ? '—' : one(intelligence)}</span>
    <span className="tabular col-start-4 row-start-1 text-right sm:col-start-5">{costScore == null ? '—' : one(costScore)}</span>
    <b className="tabular col-start-5 row-start-1 text-right sm:col-start-6 sm:text-base">{one(capability)}</b>
    <span className="tabular col-start-6 row-start-1 text-right font-mono sm:col-start-7">{cost == null ? '—' : usd(cost)}{row.cost?.kind === 'estimate' ? '*' : ''}</span>
    {note && <span className="bh-muted col-start-2 col-end-7 row-start-3 mt-0.5 text-[11px] leading-snug sm:col-start-3 sm:col-end-8 sm:row-start-2" data-bh-jev-capability-note>{note}</span>}
    {basePrice && <span className={`bh-muted col-start-2 col-end-7 ${note ? 'row-start-4 sm:row-start-3' : 'row-start-3 sm:row-start-2'} mt-0.5 text-[11px] leading-snug sm:col-start-3 sm:col-end-8`}
      title={basePrice.detail} data-bh-jev-capability-base-price={basePrice.fits ? 'within-cap' : 'exceeds-cap'} data-bh-jev-capability-base-price-ratio={basePrice.ratio.toFixed(3)}>{basePrice.short}</span>}
    {/* Desktop hover/focus panel (touch gets JevCapabilityTip's modal; globals.css scopes .bh-jev-cap-tip
        to precise pointers so a tapped row never shows the floating panel). The name and class head it. */}
    <div role="tooltip" className="bh-panel bh-jev-cap-tip pointer-events-none absolute left-0 right-0 top-full z-20 hidden max-w-[560px] p-3 text-left text-xs leading-relaxed shadow-xl group-hover:block group-focus-within:block" data-bh-jev-capability-tooltip>
      <p className="mb-1.5 font-semibold">{tipTitle}</p>
      {tipBody}
    </div>
  </li>;
}

export function jevClassView(systems: JevV14System[], options?: JevClassOptions): JevClassResult & { points: JevBubblePoint[] } {
  const result = jevClassRows(systems, options);
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

export function JevCapabilityRanking({ systems, revision, officialHref, benchName = 'JevBench', classLabel = 'Jev-class', referenceLabel = 'Jev', eligibilityNote, correlationReason, ...options }: {
  systems: JevV14System[]; revision: string; officialHref: string; benchName?: string; classLabel?: string;
  eligibilityNote?: ReactNode; correlationReason?: string;
} & JevClassOptions) {
  const { reference, limits, rows, costLatencySpearman, n: pairedCount } = jevClassRows(systems, { ...options, referenceLabel });
  const inside = rows.filter((r) => r.inClass);
  const outside = rows.filter((r) => !r.inClass);
  const speedFallback = inside.filter((r) => r.latencyBasis === 'speed-axis');
  const refName = shortName(reference.display);
  let n = 0;
  const numbered = inside.map((r) => ({ r, label: r.row.ranked ? String(++n) : '–' }));
  const [lead] = numbered;
  const bar = ({ r, label }: { r: JevClassRow; label: string }) => <RankingRow key={r.row.key} item={r} rank={label} reference={reference} factor={limits.factor} referenceLabel={referenceLabel} classLabel={classLabel} costCap={limits.cost}
    note={r.isReference ? `Reference system for the ${classLabel} limits` : !r.row.ranked ? `Not ranked in the official ${benchName} Score (${r.row.listing.replace(/_/g, ' ')})` : undefined} />;
  const outsideBar = (r: JevClassRow) => <RankingRow key={r.row.key} item={r} rank="" reference={reference} factor={limits.factor} referenceLabel={referenceLabel} classLabel={classLabel} costCap={limits.cost} note={`Outside: ${r.reasons.join(', ')}`} />;
  const types = jevLegendTypes(rows.map((r) => r.row.class));

  // F-197 (pass 36): mt-6 not mt-8 — with the guides nav folded out of the page head the first Capability row
  // must sit inside the tightened 590/660 px budgets; the smaller gap is the remaining headroom.
  return <section id="jev-capability" className="mt-6 scroll-mt-6" aria-labelledby="jev-capability-title" data-bh-jev-capability-ranking>
    <p className="bh-eyebrow">{benchName} {revision} · headline</p>
    <h2 id="jev-capability-title" className="mt-1 text-2xl font-bold leading-snug sm:text-3xl">{benchName} Capability Score</h2>
    <p className="bh-muted mt-1 text-[13px]">Capability ranking of {classLabel} systems</p>
    <p className="mt-2 max-w-4xl text-[15px] leading-snug">
      Capability Score averages <b>Intelligence</b> and <b>Calibration</b>.
      {lead && <> <b>{shortName(lead.r.row.display)}</b> leads the {classLabel} systems with {one(lead.r.capability)}.</>}
    </p>
    <p className="bh-muted mt-2 text-[13px] leading-snug" data-bh-jev-class-summary>
      {classLabel} means at most {limits.factor}× the cost and median latency of {referenceLabel}. <a className="text-accent underline" href="#jev-class-method">How we choose ↘</a>
    </p>

    <figure className="bh-panel mt-4 p-4 sm:p-5" data-bh-jev-capability-bars aria-labelledby="jev-capability-title">
      <div className={`${grid} items-end text-[10px] sm:text-[11px]`} data-bh-jev-capability-columns>
        <span className="bh-muted text-right">#</span><span className="bh-muted">System</span>
        <span className="bh-muted hidden justify-between font-mono sm:flex"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></span>
        <span className="bh-muted text-right" title="Intelligence Score"><span className="sm:hidden">I</span><span className="hidden sm:inline">Intelligence<br />Score</span></span>
        <span className="bh-muted text-right" title="Cost Score"><span className="sm:hidden">C</span><span className="hidden sm:inline">Cost<br />Score</span></span>
        <span className="bh-muted text-right" title="Capability Score"><span className="sm:hidden">Cap.</span><span className="hidden sm:inline">Capability<br />Score</span></span>
        <span className="bh-muted text-right" title="US dollars per 1,000 decisions"><span className="sm:hidden">$/1k</span><span className="hidden sm:inline">$/1k decisions</span></span>
      </div>
      <ol className="mt-2 space-y-2.5 sm:mt-1" data-bh-jev-class-list>{numbered.slice(0, HEADLINE_TOP).map(bar)}</ol>
      {numbered.length > HEADLINE_TOP && <details className="mt-2.5" data-bh-jev-class-more>
        <summary className="cursor-pointer text-sm font-semibold text-accent">Show all {numbered.length} {classLabel} systems ({numbered.length - HEADLINE_TOP} more)</summary>
        <ol className="mt-2.5 space-y-2.5">{numbered.slice(HEADLINE_TOP).map(bar)}</ol>
      </details>}
      <p className="bh-muted mt-2 text-[11.5px] leading-snug">Wide coloured bar = Capability Score (0–100). Thin bars: cost above, median latency below; shared log ratio scale 0.25× … 64× {referenceLabel}, ticks at 1× and {limits.factor}× (cap). Shorter is cheaper or faster. * = est. (estimated cost). # counts ranked {classLabel} systems; “–” marks unranked or outside systems. Tap ⓘ or hover a row or thin bar for details.</p>
      <p className="bh-muted mt-1 text-[11.5px] leading-snug" data-bh-cost-latency-correlation>{costLatencySpearman != null && Math.abs(costLatencySpearman) < 0.2 ? 'Cost and latency are shown separately because they are nearly independent across systems' : costLatencySpearman == null ? 'Cost and latency are shown separately' : 'Cost and latency correlate here'} (Spearman ρ = {costLatencySpearman == null ? 'unavailable' : costLatencySpearman.toFixed(2)}, n = {pairedCount}){correlationReason && costLatencySpearman != null && Math.abs(costLatencySpearman) >= 0.2 ? `, ${correlationReason}` : ''}.</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]" aria-label="Ranking colour legend" data-bh-jev-capability-legend>
        {types.map((type) => <li key={type} style={{ '--jev-t': `var(${jevTypeVarName(type)})` } as CSSProperties}><span className="bh-jevc-swatch mr-1.5" />{JEV_TYPE_LABEL[type] ?? type}</li>)}
        {(['green', 'amber', 'red'] as const).map((zone) => <li key={zone}><span className={`bh-tl-${zone} mr-1.5 inline-block h-[4px] w-4 rounded-full align-middle`} />{zone}: {zone === 'green' ? '≤ reference' : zone === 'amber' ? `≤ cap (${limits.factor}× reference)` : '> cap'}</li>)}
      </ul>

      <div className="bh-jev-class-divider" role="separator" data-bh-jev-class-divider>Outside the {classLabel} limits · {outside.length} systems</div>
      <details className="mt-2" data-bh-jev-class-outside>
        <summary className="cursor-pointer text-sm font-semibold text-accent">Show general-purpose LLMs and other systems outside the limits</summary>
        <p className="bh-muted mt-2 text-[12.5px]">Sorted by Capability Score, not numbered. Each row says which limit it misses, measured against {refName} ({usd(reference.cost)} per 1,000 decisions, median {secs(reference.latency)}).</p>
        <ol className="mt-2.5 space-y-2.5">{outside.map(outsideBar)}</ol>
      </details>
    </figure>
    <p id="jev-class-method" className="bh-panel mt-3 max-w-4xl scroll-mt-6 p-3 text-[13.5px] leading-snug" data-bh-jev-class-rule>
      {eligibilityNote ?? <><b>{classLabel}</b> = cost per decision at most {limits.factor}× {refName}&apos;s <span className="whitespace-nowrap">(≤ {usd(limits.cost)} per 1,000 decisions)</span> <b>and</b> median latency at most {limits.factor}× {refName}&apos;s <span className="whitespace-nowrap">(≤ {secs(limits.latency)})</span>, the adjusted p50 — the same median the speed chart plots, not the four-axis Speed score.
      {' '}{inside.length} of {rows.length} systems qualify; the other {outside.length}, including the general-purpose LLMs, are listed below the divider in the ranking.
      {speedFallback.length > 0 && <span className="bh-muted"> {speedFallback.map((r) => shortName(r.row.display)).join(', ')} {speedFallback.length === 1 ? 'has' : 'have'} no recorded median latency; for {speedFallback.length === 1 ? 'it' : 'them'} the Speed axis decides, at the {limits.factor}× latency equivalent (Speed ≥ {one(limits.speedFloor)}).</span>}
      </>}
      {' '}The <a className="text-accent underline" href="#jev-bubbles">charts below</a> show speed and cost beside Capability Score; the <a className="text-accent underline" href={officialHref}>official {benchName} Score</a> weighs all four axes.
    </p>
  </section>;
}
