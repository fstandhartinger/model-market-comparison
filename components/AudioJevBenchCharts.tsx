"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { AudioJevRow } from '../lib/audiojev-preview.mjs';
import { JevCapability3D } from './JevCapability3D';

// CR-214 (29 Sep 2026): the top of /audio-jev-bench, in the /jev-models order — Capability bars first, then the two
// synced bubble charts (Capability vs speed and vs cost) with a 3D toggle. One Jev-class filter drives all of them.
// Numbers (#) follow the hidden preview's rule: only Jev-class systems on the full (sealed + public) table are
// numbered. Public-only and partial-coverage rows are never numbered and sit in their own labelled block below.

const one = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));
const usd = (v: number) => (v === 0 ? 'Free' : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toPrecision(2)}`);
const secs = (v: number) => (v >= 1 ? `${v.toFixed(v >= 10 ? 0 : 1)} s` : `${Math.round(v * 1000)} ms`);

export const GROUP_VAR: Record<string, string> = { full: '--jev-t-jev', 'public-only': '--jev-t-api', partial: '--jev-t-classifier' };
const LEGEND: Array<[string, string]> = [['full', 'Full coverage: sealed + public items'], ['public-only', 'Hosted API, public items only (provisional)'], ['partial', 'Partial coverage (sound events only)']];
const typeVar = (group: string) => ({ '--jev-t': `var(${GROUP_VAR[group] ?? '--jev-t-unnamed'})` }) as CSSProperties;
const colour = (group: string) => `rgb(var(${GROUP_VAR[group] ?? '--jev-t-unnamed'}))`;

function Tag({ r }: { r: AudioJevRow }) {
  if (r.group === 'full') return null;
  return <span className="bh-thin-tag ml-1.5" title={r.group === 'public-only' ? 'Public items only: hosted APIs never receive sealed items. Provisional, with a 95% interval.' : `Covers only: ${(r.families ?? []).join(', ').replace(/_/g, ' ')}`}>
    {r.group === 'public-only' ? 'public-only' : 'partial'}
  </span>;
}

function Bar({ r, rank }: { r: AudioJevRow; rank: string }) {
  const cap = Math.max(0, Math.min(100, r.capability ?? 0));
  const ci = r.group === 'public-only' && r.iPublicCi && r.calibration != null
    ? [(r.iPublicCi[0] + r.calibration) / 2, (r.iPublicCi[1] + r.calibration) / 2] : null;
  const label = `${r.name}: Capability ${one(r.capability)} (Intelligence ${one(r.intelligence ?? r.iPublic)}, Calibration ${one(r.calibration)})${r.usd == null ? '' : `, ${usd(r.usd)} per 1,000 decisions`}${r.p50Adj == null ? '' : `, median ${secs(r.p50Adj)}`}.`;
  return <li style={typeVar(r.group)} className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.2rem] items-center gap-x-2 text-sm sm:grid-cols-[1.6rem_17rem_minmax(0,1fr)_3.4rem_9.5rem]"
    data-bh-audiojev-capability-row={r.key} data-bh-audiojev-rank={rank} aria-label={label} title={label}>
    <span className="bh-muted text-right text-xs tabular-nums">{rank}</span>
    <span className="min-w-0 sm:text-right">
      <span className="block truncate font-semibold">{r.name}<Tag r={r} /></span>
      {r.config && <span className="bh-muted block truncate text-[11px] leading-snug">{r.config}</span>}
    </span>
    <span className="relative col-span-3 col-start-1 row-start-2 mt-1 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:mt-0" aria-hidden="true">
      <span className="bh-jevc-grid flex h-[12px] rounded-sm"><span className={'bh-jevc-bar' + (r.group === 'full' ? '' : ' is-partial')} style={{ width: `${cap.toFixed(3)}%` }} /></span>
      {ci && <span className="bh-jevc-ci" style={{ left: `${Math.max(0, ci[0]).toFixed(2)}%`, width: `${Math.max(0, Math.min(100, ci[1]) - Math.max(0, ci[0])).toFixed(2)}%` }} data-bh-audiojev-ci />}
    </span>
    <b className="text-right text-base tabular-nums sm:text-lg">{one(r.capability)}</b>
    <span className="bh-muted hidden whitespace-nowrap text-right font-mono text-[12px] sm:block">{r.usd == null ? '—' : usd(r.usd)}{r.usdEstimate ? '*' : ''} · {r.p50Adj == null ? '—' : secs(r.p50Adj)}</span>
    {!r.jevClass && <span className="bh-muted col-span-2 col-start-2 mt-0.5 text-[11px] leading-snug sm:col-span-3 sm:col-start-3" data-bh-audiojev-outside>Outside Jev-class: {r.outsideBecause.join('; ')}</span>}
  </li>;
}

function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(260, Math.round(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', update); return () => window.removeEventListener('resize', update); }
    const o = new ResizeObserver(update); o.observe(el);
    return () => o.disconnect();
  }, []);
  return { ref, width };
}

type Kind = 'speed' | 'cost';
function Bubble({ kind, rows, limit, active, setActive, labelled }: {
  kind: Kind; rows: AudioJevRow[]; limit: number; active: string | null; setActive: (k: string | null) => void; labelled: Set<string>;
}) {
  const { ref, width: W } = useWidth(520);
  const narrow = W < 440;
  const H = Math.round(Math.max(280, Math.min(430, W * (narrow ? 0.95 : 0.66))));
  const L = narrow ? 34 : 44, R = 16, T = 22, B = 46;
  const xOf = (r: AudioJevRow) => (kind === 'cost' ? r.usd : r.p50Adj);
  const plotted = rows.filter((r) => { const v = xOf(r); return v != null && v > 0 && r.capability != null; });
  const omitted = rows.length - plotted.length;
  const xs = [...plotted.map((r) => Math.log10(xOf(r) as number)), Math.log10(limit)];
  const xMin = Math.floor((Math.min(...xs) - 0.1) * 2) / 2;
  let xMax = Math.ceil((Math.max(...xs) + 0.1) * 2) / 2;
  if (xMax - xMin < 1) xMax = xMin + 1;
  const r3 = (n: number) => Number(n.toFixed(3));
  // Both charts improve toward the upper right: lower cost and lower latency are drawn to the right.
  const x = (v: number) => r3(L + ((xMax - Math.log10(v)) / (xMax - xMin)) * (W - L - R));
  const y = (v: number) => r3(T + (1 - v / 100) * (H - T - B));
  const ticks: number[] = [];
  for (let e = Math.ceil(xMin); e <= Math.floor(xMax); e++) ticks.push(10 ** e);
  if (kind === 'speed') for (const t of [0.3, 3]) if (Math.log10(t) > xMin && Math.log10(t) < xMax) ticks.push(t);
  const act = plotted.find((r) => r.key === active) ?? null;
  const title = kind === 'cost' ? 'Capability vs cost' : 'Capability vs speed';
  const limitX = x(limit);
  return <figure className="bh-panel min-w-0 overflow-hidden p-3 sm:p-4" data-bh-audiojev-bubble={kind}>
    <figcaption className="text-base font-semibold">{title}</figcaption>
    <p className="bh-muted mt-1 text-xs">{kind === 'cost' ? 'USD per 1,000 decisions, log scale, cheaper to the right.' : 'Median latency (adjusted p50, the Jev-class measure), log scale, faster to the right.'} The dashed line is the Jev-class limit ({kind === 'cost' ? usd(limit) : secs(limit)}). Upper right is better.</p>
    <div ref={ref} className="relative mt-2 w-full min-w-0">
      <svg width={W} height={H} role="img" aria-label={`${title}; ${plotted.length} systems plotted`} onMouseLeave={() => setActive(null)}>
        {[0, 20, 40, 60, 80, 100].map((v) => <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="rgb(var(--line) / .7)" strokeWidth={1} />
          <text x={L - 6} y={y(v) + 3} fontSize={10} textAnchor="end" fill="var(--muted)">{v}</text>
        </g>)}
        {ticks.map((t) => <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={T} y2={H - B} stroke="rgb(var(--line) / .55)" strokeWidth={1} />
          <text x={x(t)} y={H - B + 14} fontSize={10} textAnchor="middle" fill="var(--muted)">{kind === 'cost' ? usd(t) : secs(t)}</text>
        </g>)}
        <line x1={limitX} x2={limitX} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="4 4" data-bh-audiojev-limit={kind} />
        <text x={limitX + (limitX > W - R - 80 ? -4 : 4)} y={T - 7} fontSize={10} textAnchor={limitX > W - R - 80 ? 'end' : 'start'} fill="var(--muted)">Jev-class limit →</text>
        <text x={(L + W - R) / 2} y={H - 8} fontSize={11} textAnchor="middle" fill="var(--text)">{kind === 'cost' ? '← pricier · USD per 1,000 decisions · cheaper →' : '← slower · median latency · faster →'}</text>
        <text x={12} y={(T + H - B) / 2} fontSize={11} textAnchor="middle" fill="var(--text)" transform={`rotate(-90 12 ${(T + H - B) / 2})`}>Capability ↑</text>
        {[...plotted].sort((a, b) => Number(a.jevClass) - Number(b.jevClass)).map((r) => {
          const cx = x(xOf(r) as number), cy = y(r.capability as number);
          const on = active === r.key;
          const rad = (narrow ? 5 : 6.5) + (on ? 2 : 0);
          return <g key={r.key} tabIndex={0} role="button" aria-label={`${r.name}: Capability ${one(r.capability)}, ${kind === 'cost' ? (r.usd == null ? 'no price' : usd(r.usd) + ' per 1,000') : 'median ' + secs(r.p50Adj as number)}`}
            onMouseEnter={() => setActive(r.key)} onFocus={() => setActive(r.key)} onClick={() => setActive(r.key)} style={{ cursor: 'pointer' }} data-bh-audiojev-point={r.key}>
            <circle cx={cx} cy={cy} r={rad} fill={colour(r.group)} fillOpacity={r.jevClass ? 0.9 : 0.35} stroke={on ? 'var(--text)' : 'var(--surface)'} strokeWidth={on ? 2 : 1.25} />
          </g>;
        })}
        {plotted.filter((r) => labelled.has(r.key) || r.key === active).map((r) => {
          const cx = x(xOf(r) as number), cy = y(r.capability as number);
          const left = cx > W - R - 150;
          return <text key={r.key} x={cx + (left ? -10 : 10)} y={cy + 4} fontSize={narrow ? 10 : 11} fontWeight={r.key === active ? 700 : 500} textAnchor={left ? 'end' : 'start'} fill="currentColor" paintOrder="stroke" stroke="var(--surface)" strokeWidth={3} pointerEvents="none">{r.name.length > 26 ? r.name.slice(0, 24) + '…' : r.name}</text>;
        })}
      </svg>
      <div className="bh-muted mt-1 min-h-[2.5rem] text-xs" aria-live="polite" data-bh-audiojev-bubble-detail>
        {act ? <><b className="text-[var(--text)]">{act.name}</b> · Capability {one(act.capability)}{act.group !== 'full' ? ' (provisional)' : ''} · {act.usd == null ? 'no price' : `${usd(act.usd)} / 1,000${act.usdEstimate ? ' est.' : ''}`} · median {act.p50Adj == null ? '—' : secs(act.p50Adj)} · {act.jevClass ? 'Jev-class' : `outside Jev-class (${act.outsideBecause.join('; ')})`}</>
          : <>{plotted.length} systems{omitted > 0 ? `; ${omitted} without ${kind === 'cost' ? 'a price' : 'latency'} omitted` : ''}. Hover, focus or tap a bubble; both charts highlight the same system.</>}
      </div>
    </div>
  </figure>;
}

export function AudioJevBenchCharts({ ranked, provisional, limits }: {
  ranked: AudioJevRow[]; provisional: AudioJevRow[]; limits: { p50AdjS: number; usdPer1000: number };
}) {
  const [classOnly, setClassOnly] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const shownRanked = useMemo(() => (classOnly ? ranked.filter((r) => r.jevClass) : ranked), [ranked, classOnly]);
  const shownAll = useMemo(() => [...shownRanked, ...(classOnly ? provisional.filter((r) => r.jevClass) : provisional)], [shownRanked, provisional, classOnly]);
  const labelled = useMemo(() => new Set(ranked.filter((r) => r.capabilityRank != null && r.capabilityRank <= 5).map((r) => r.key)), [ranked]);
  const lead = ranked.find((r) => r.capabilityRank === 1);
  const inClass = [...ranked, ...provisional].filter((r) => r.jevClass).length;

  const points3d = useMemo(() => shownAll.filter((r) => r.capability != null && r.usd != null && r.speed != null).map((r) => ({
    key: r.key, name: r.name, rank: r.group === 'full' ? r.rank ?? null : null, colorVariable: GROUP_VAR[r.group],
    capability: r.capability as number, cost: r.usd, speed: r.speed, jevbenchScore: r.headline, inClass: r.jevClass,
    axes: { intelligence: r.intelligence, calibration: r.calibration, speed: r.speed, cost: r.cost },
  })), [shownAll]);
  const costBounds = useMemo((): [number, number] => {
    const c = points3d.flatMap((p) => (p.cost != null && p.cost > 0 ? [Math.log10(p.cost)] : []));
    if (!c.length) return [-3, 0];
    const lo = Math.min(...c), hi = Math.max(...c);
    return lo === hi ? [lo - 0.5, hi + 0.5] : [lo, hi];
  }, [points3d]);

  return <>
    <section id="audiojev-capability" className="mt-8 scroll-mt-6" aria-labelledby="audiojev-capability-title" data-bh-audiojev-capability>
      <h2 id="audiojev-capability-title" className="text-2xl font-bold leading-snug sm:text-3xl">Capability ranking</h2>
      <p className="mt-2 max-w-4xl text-[15px] leading-snug">
        Capability is the mean of <b>Intelligence</b> and <b>Calibration</b>.
        {lead && <> <b>{lead.name}</b> leads the Jev-class audio systems with <b>{one(lead.capability)}</b>.</>}
      </p>
      <p className="bh-muted mt-1 max-w-4xl text-[13px] leading-snug">
        Jev-class: median latency ≤ {limits.p50AdjS.toFixed(1)} s <b>and</b> ≤ {usd(limits.usdPer1000)} per 1,000 decisions. {inClass} of {ranked.length + provisional.length} measured systems qualify.
      </p>
      <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm" data-bh-audiojev-class-filter>
        <input type="checkbox" checked={classOnly} onChange={(e) => { setClassOnly(e.target.checked); setActive(null); }} />
        Jev-class systems only
      </label>

      <figure className="bh-panel mt-2 p-4 sm:p-5" data-bh-audiojev-capability-bars>
        <p className="bh-eyebrow">Ranked · full coverage (sealed + public items)</p>
        <div className="mt-3 hidden grid-cols-[1.6rem_17rem_minmax(0,1fr)_3.4rem_9.5rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
          <span /><span />
          <span className="bh-muted flex justify-between font-mono"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></span>
          <span />
          <span className="bh-muted text-right font-mono">$/1k · median</span>
        </div>
        <ol className="mt-2 space-y-2.5" data-bh-audiojev-capability-list>
          {shownRanked.map((r) => <Bar key={r.key} r={r} rank={r.capabilityRank != null ? String(r.capabilityRank) : '–'} />)}
        </ol>
        {provisional.length > 0 && <div className="mt-6 border-t border-dashed border-line pt-4" data-bh-audiojev-provisional-bars>
          <p className="bh-eyebrow">Not ranked · provisional and partial rows</p>
          <p className="bh-muted mt-1 text-[12px] leading-snug">Hosted APIs are scored on the {provisional.find((r) => r.group === 'public-only')?.nItems ?? 112} public items only, because sealed items never go to third-party APIs; the whisker is the 95% interval of their Capability. Sound classifiers answer only the sound-event family. Neither is comparable with the ranking above. Shown regardless of the Jev-class filter.</p>
          <ol className="mt-3 space-y-2.5">
            {provisional.map((r) => <Bar key={r.key} r={r} rank="–" />)}
          </ol>
        </div>}
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]" aria-label="Colour legend" data-bh-audiojev-legend>
          {LEGEND.map(([g, label]) => <li key={g} style={typeVar(g)}><span className={'bh-jevc-swatch mr-1.5' + (g === 'full' ? '' : ' is-partial')} style={g === 'full' ? undefined : { background: `repeating-linear-gradient(135deg, ${colour(g)} 0 2px, transparent 2px 6px)`, boxShadow: `inset 0 0 0 1px ${colour(g)}` }} />{label}</li>)}
        </ul>
        <p className="bh-muted mt-2 text-[11.5px] leading-snug"># numbers only Jev-class systems with full coverage. Right column: USD per 1,000 decisions (* = estimated from a catalogue price; see method) and adjusted median latency.</p>
      </figure>
    </section>

    <section id="audiojev-bubbles" className="mt-8 scroll-mt-6" aria-labelledby="audiojev-bubbles-title" data-bh-audiojev-bubbles>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="audiojev-bubbles-title" className="text-xl font-semibold">Capability against speed and cost</h2>
          <p className="bh-muted mt-1 max-w-3xl text-sm">The two charts are linked: pointing at a system highlights it in both. The five most capable ranked Jev-class systems are labelled. {classOnly ? 'Jev-class filter on; untick it above to add every system.' : 'Faint bubbles are outside Jev-class.'}</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Chart view">
          <button type="button" className="bh-jevc-preset text-sm font-semibold" aria-pressed={view === '2d'} onClick={() => setView('2d')} data-bh-audiojev-view="2d">2D charts</button>
          <button type="button" className="bh-jevc-preset text-sm font-semibold" aria-pressed={view === '3d'} onClick={() => setView('3d')} data-bh-audiojev-view="3d">3D view</button>
        </div>
      </div>
      {view === '2d' ? <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <Bubble kind="speed" rows={shownAll} limit={limits.p50AdjS} active={active} setActive={setActive} labelled={labelled} />
        <Bubble kind="cost" rows={shownAll} limit={limits.usdPer1000} active={active} setActive={setActive} labelled={labelled} />
      </div> : <div className="bh-panel mt-4 p-4 sm:p-5" data-bh-audiojev-3d>
        <p className="bh-muted text-sm">Capability vertically, lower cost to the right, higher Speed axis toward you. Sphere size follows the composite score (B). Drag to rotate; pinch or scroll to zoom.</p>
        <JevCapability3D points={points3d} costBounds={costBounds} benchmarkName="AudioJevBench" />
      </div>}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]" aria-label="Bubble colours">
        {LEGEND.map(([g, label]) => <li key={g}><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: colour(g) }} aria-hidden="true" />{label}</li>)}
      </ul>
    </section>
  </>;
}
