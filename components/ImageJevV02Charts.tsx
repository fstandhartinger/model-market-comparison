"use client";

import dynamic from 'next/dynamic';
import { useMemo, useState, type CSSProperties } from 'react';
import { speedFromLatency } from '../lib/jevbench-jev-class.mjs';
import { imageJevV02ScatterScale } from '../lib/imagejev-v02-explorer.mjs';

const JevCapability3D = dynamic(
  () => import('./JevCapability3D').then((module) => module.JevCapability3D),
  { ssr: false, loading: () => <p className="bh-muted p-4 text-sm" role="status">Loading capability views…</p> },
);

type ImageV02System = {
  key: string;
  name: string;
  kind: string;
  api_flag: boolean;
  rank: number;
  score: number;
  tracks: Record<string, any>;
};

type ReferenceRow = { key: string; name: string; reference_revision: string; reference_score: number; reason: string };

type Point = ImageV02System & {
  capability: number;
  intelligence: number;
  calibration: number;
  speed: number | null;
  medianP50: number | null;
  cost: number | null;
  colorVariable: string;
};

type Caps = { cost: number; latency: number } | null;

const one = (value: number) => value.toFixed(1);
const usd = (value: number) => value === 0 ? 'Free' : value < 1 ? `$${value.toPrecision(2)}` : `$${value.toFixed(2)}`;

export function ImageJevV02Legend({ selected = false, striped = false }: { selected?: boolean; striped?: boolean }) {
  return <p className="bh-muted mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" data-bh-imagejev-v02-color-legend>
    <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-pink-400" aria-hidden="true" />Hosted API</span>
    <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-teal-400" aria-hidden="true" />Local GPU</span>
    {selected && <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-current" aria-hidden="true" />Outlined point: selected system</span>}
    {striped && <span className="inline-flex items-center gap-2" data-bh-imagejev-v02-striped-legend><span className="bh-jev-alt-bar inline-block h-2.5 w-5 rounded-sm !opacity-90" style={{ '--jev-t': '244 114 182' } as CSSProperties} aria-hidden="true" />Striped bar: same API system at its base-model reference price (not ranked)</span>}
  </p>;
}

function pointsFor(systems: ImageV02System[]): Point[] {
  return systems.flatMap((system) => {
    const core = system.tracks?.core;
    const axes = core?.axes;
    if (![axes?.intelligence, axes?.calibration].every(Number.isFinite)) return [];
    const costValue = core?.cost?.usd_per_1000;
    // 1 Oct 2026: the speed charts plot the adjusted median (p50) on the shared median-speed scale, the same latency
    // the Capability Score eligibility gates on; the official Speed axis (p50/p95 blend) stays in the composite.
    const p50 = core?.speed?.adjusted_p50_s;
    const speedValue = Number.isFinite(p50) && p50 > 0 ? speedFromLatency(p50) : null;
    return [{
      ...system,
      capability: (axes.intelligence + axes.calibration) / 2,
      intelligence: axes.intelligence,
      calibration: axes.calibration,
      speed: speedValue,
      medianP50: Number.isFinite(p50) && p50 > 0 ? p50 : null,
      cost: Number.isFinite(costValue) && costValue >= 0 ? costValue : null,
      colorVariable: system.api_flag ? '--imagejev-api' : '--imagejev-local',
    }];
  }).sort((a, b) => b.capability - a.capability || a.name.localeCompare(b.name));
}

function ImageScatter({ kind, points, activeKey, setActiveKey, pinned, setPinned, caps = null }: {
  kind: 'cost' | 'speed'; points: Point[]; activeKey: string | null; pinned: boolean; caps?: Caps;
  setActiveKey: (key: string | null) => void; setPinned: (value: boolean) => void;
}) {
  const { plotted, minCost, maxCost, capX, xAt } = imageJevV02ScatterScale(kind, points, caps);
  const W = 360, H = 320, L = 44, R = 22, T = 18, B = 36;
  const yAt = (point: Point) => T + (H - T - B) * (1 - point.capability / 100);
  const title = kind === 'cost' ? 'CORE Capability vs cost' : 'CORE Capability vs median latency';
  const xLabel = kind === 'cost' ? 'Cost per 1,000 decisions · lower is cheaper →' : 'Median-latency speed (adjusted p50) · higher is faster →';
  const ticks = kind === 'cost'
    ? Array.from({ length: 5 }, (_, index) => index === 4 ? maxCost : minCost + (maxCost - minCost) * index / 4)
    : [0, 20, 40, 60, 80, 100];

  const select = (key: string) => { setActiveKey(key); setPinned(true); };
  return <figure className="bh-panel min-w-0 p-4 sm:p-5" data-bh-imagejev-v02-scatter={kind} data-bh-imagejev-v02-cap-mode={caps ? 'official' : 'unavailable'}>
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="bh-muted mt-1 text-sm">Each panel uses the same measured CORE systems. Focus or select a point to highlight that system in both charts.</p>
    <p className="mt-3 text-sm font-medium" data-bh-imagejev-v02-y-label>CORE Capability · higher ↑</p>
    <svg className="mt-3 block h-auto w-full" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}; vertical axis is CORE Capability, horizontal axis is ${kind === 'cost' ? 'cost' : 'median-latency speed from the adjusted p50'}`}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse' && !pinned) setActiveKey(null); }}
      onKeyDown={(event) => { if (event.key === 'Escape') { setActiveKey(null); setPinned(false); } }}>
      {[0, 20, 40, 60, 80, 100].map((tick) => {
        const y = T + (H - T - B) * (1 - tick / 100);
        return <g key={`y${tick}`}><line x1={L} x2={W - R} y1={y} y2={y} stroke="rgb(var(--line) / .7)" /><text x={L - 10} y={y + 5} textAnchor="end" fill="var(--muted)" fontSize="14">{tick}</text></g>;
      })}
      {ticks.map((tick, index) => {
        const x = kind === 'cost'
          ? L + (W - L - R) * (maxCost - tick) / (maxCost - minCost)
          : L + (W - L - R) * tick / 100;
        const label = kind === 'cost' ? usd(10 ** tick) : String(tick);
        return <g key={`x${index}`}><line x1={x} x2={x} y1={T} y2={H - B} stroke="rgb(var(--line) / .55)" /><text x={x} y={H - B + 22} textAnchor={x <= L + 1 ? 'start' : x >= W - R - 1 ? 'end' : 'middle'} fill="var(--muted)" fontSize="14">{label}</text></g>;
      })}
      {capX != null && <g data-bh-imagejev-v02-cap-line={kind}><line x1={capX} x2={capX} y1={T} y2={H - B} stroke="var(--text)" strokeDasharray="4 3" opacity=".55" /><text x={capX + (kind === 'cost' ? -4 : 4)} y={T + 12} textAnchor={kind === 'cost' ? 'end' : 'start'} fill="var(--muted)" fontSize="12">{kind === 'cost' ? `cap ${usd(caps!.cost)}` : `cap ${caps!.latency.toFixed(2)} s`}</text></g>}
      {plotted.map((point) => <circle key={point.key} cx={xAt(point)} cy={yAt(point)} r={activeKey === point.key ? 7 : 5}
        fill={`rgb(var(${point.colorVariable}))`} stroke={activeKey === point.key ? 'var(--text)' : 'var(--surface)'} strokeWidth={activeKey === point.key ? 2.5 : 1.5}
        role="button" tabIndex={0} aria-label={`${point.name}: CORE Capability ${one(point.capability)}, Intelligence ${one(point.intelligence)}, Calibration ${one(point.calibration)}, median latency ${point.medianP50 == null ? 'not measured' : `${point.medianP50.toFixed(2)} s adjusted p50, median-latency speed ${one(point.speed ?? 0)}`}, Cost ${point.cost == null ? 'not measured' : `${usd(point.cost)} per 1,000 decisions`}`}
        data-bh-imagejev-v02-point={point.key} data-bh-imagejev-v02-active={activeKey === point.key ? 'true' : 'false'}
        onFocus={() => setActiveKey(point.key)} onBlur={() => { if (!pinned) setActiveKey(null); }}
        onMouseEnter={() => { if (!pinned) setActiveKey(point.key); }} onClick={() => select(point.key)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(point.key); } }}>
        <title>{`${point.name} · CORE Capability ${one(point.capability)} · ${kind === 'cost' ? `${point.cost == null ? 'cost not measured' : `${usd(point.cost)} / 1,000`}` : `Median latency ${point.medianP50 == null ? 'not measured' : `${point.medianP50.toFixed(2)} s (adjusted p50)`}`}`}</title>
      </circle>)}
    </svg>
    <p className="mt-1 text-center text-sm font-medium" data-bh-imagejev-v02-x-label>{xLabel}</p>
    <ImageJevV02Legend selected />
    <figcaption className="bh-muted mt-2 text-xs">{plotted.length} measured CORE systems plotted{plotted.length < points.length ? `; ${points.length - plotted.length} without a usable ${kind === 'cost' ? 'positive cost' : 'Speed value'} omitted` : ''}.{capX != null ? ` Dashed line: the frozen official 2× Capability Score ${kind === 'cost' ? 'cost' : 'median-latency'} cap. Custom caps in the headline ranking do not move this line or filter these points.` : ''}</figcaption>
  </figure>;
}

export function ImageJevV02Charts({ systems, references, showCapabilityBars = true, caps = null }: { systems: ImageV02System[]; references: ReferenceRow[]; showCapabilityBars?: boolean; caps?: Caps }) {
  const points = useMemo(() => pointsFor(systems), [systems]);
  const [activeKey, setActiveKey] = useState<string | null>(points[0]?.key ?? null);
  const [pinned, setPinned] = useState(false);
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const active = points.find((point) => point.key === activeKey) ?? points[0];
  const costs = points.flatMap((point) => point.cost != null && point.cost > 0 ? [point.cost] : []);
  const costBounds: [number, number] = costs.length
    ? [Math.log10(Math.max(Number.MIN_VALUE, Math.min(...costs))), Math.log10(Math.max(Number.MIN_VALUE, Math.max(...costs)))]
    : [-3, 0];
  if (costBounds[0] === costBounds[1]) { costBounds[0] -= 0.5; costBounds[1] += 0.5; }
  const points3d = points.flatMap((point) => point.cost != null && point.cost >= 0 && point.speed != null ? [{
    key: point.key, name: point.name, rank: point.rank, colorVariable: point.colorVariable,
    capability: point.capability, cost: point.cost, speed: point.speed, jevbenchScore: point.score,
    inClass: true,
    axes: { intelligence: point.intelligence, calibration: point.calibration, speed: point.tracks.core.axes.speed, cost: point.tracks.core.axes.cost },
  }] : []);
  return <section id="imagejev-v02-capability" className="mt-8 max-w-6xl scroll-mt-6" style={{ '--imagejev-api': '244 114 182', '--imagejev-local': '45 212 191' } as CSSProperties} aria-labelledby="imagejev-v02-capability-heading" data-bh-imagejev-v02-capability-suite>
    <style>{':root { --imagejev-api: 244 114 182; --imagejev-local: 45 212 191; }'}</style>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="bh-eyebrow">Image JevBench v0.2 · headline track: CORE</p>
        <h2 id="imagejev-v02-capability-heading" className="mt-1 text-2xl font-bold sm:text-3xl">CORE capability, cost and speed</h2>
      </div>
      <div className="flex gap-1 rounded-lg border border-line p-0.5" role="tablist" aria-label="Capability chart view">
        {(['2d', '3d'] as const).map((mode) => <button key={mode} type="button" role="tab" aria-selected={view === mode}
          className={`min-h-10 rounded-md px-4 text-sm ${view === mode ? 'bg-accent text-ink' : 'bh-muted'}`}
          onClick={() => setView(mode)} data-bh-imagejev-v02-view={mode}>{mode === '2d' ? '2D charts' : '3D view'}</button>)}
      </div>
    </div>
    <p className="bh-muted mt-2 max-w-5xl text-sm">CORE Capability is the mean of Intelligence and Calibration. The cost plot uses USD per 1,000 CORE decisions; the speed plot uses the adjusted median latency (p50) on the median-speed scale 100 − 20·log10(p50 / 0.1 s), the same latency the Capability Score limit checks. The official Speed axis in the composite still blends p50 and p95{showCapabilityBars ? '' : '. Both plots show every system with a v0.2 composite, inside or outside the Capability Score limits'}. Computer-use and browser-use remain separate tracks below the CORE ranking.</p>
    {showCapabilityBars && <div className="bh-panel mt-4 p-4 sm:p-5" data-bh-imagejev-v02-capability-bars>
      <h3 className="text-lg font-semibold">Capability ranking</h3>
      <p className="bh-muted mt-1 text-sm">Capability = (Intelligence + Calibration) / 2. Bar rows include the ranked v0.2 systems; fresh runs without a composite are listed in their own table.</p>
      <ImageJevV02Legend />
      <ol className="mt-4 space-y-2.5">
        {points.map((point, index) => <li key={point.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.1rem] items-center gap-x-2 gap-y-1 text-sm sm:grid-cols-[2rem_16rem_minmax(0,1fr)_4rem]" data-bh-imagejev-v02-capability-row={point.key}>
          <span className="bh-muted text-right tabular-nums">{index + 1}</span>
          <span className="break-words font-medium">{point.name}{point.api_flag && <span className="bh-thin-tag ml-1.5">API</span>}</span>
          <span className="col-span-3 row-start-2 h-5 rounded-md bg-black/10 dark:bg-white/10 sm:col-span-1 sm:row-auto"><span className={`block h-full rounded-md ${point.api_flag ? 'bg-pink-400' : 'bg-teal-400'}`} style={{ width: `${Math.max(0, Math.min(100, point.capability))}%` }} /></span>
          <b className="col-start-3 row-start-1 text-right tabular-nums sm:col-start-auto sm:row-auto">{one(point.capability)}</b>
        </li>)}
      </ol>
      {!points.length && <p className="bh-muted mt-3 text-sm">No measured CORE rows yet.</p>}
      {references.length > 0 && <div className="mt-6 border-t border-dashed border-line pt-4" data-bh-imagejev-v02-reference-bars>
        <h3 className="text-base font-semibold">Not re-measured in v0.2 ({references.length}) — v0.1.4 reference only</h3>
        <p className="bh-muted mt-1 text-xs">Reference scores have no bar or position on the v0.2 capability scale.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {references.map((row) => <li key={row.key} className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-dashed border-line p-3 text-sm">
            <span className="min-w-0"><b className="block break-words">{row.name}</b><a className="mt-1 inline-block text-xs text-accent underline" href="/image-jev-bench?version=v0.1.4#overall-heading">See its v0.1.4 rank →</a></span>
            <span className="shrink-0 text-right"><span className="bh-thin-tag">REFERENCE v0.1.4</span><b className="bh-muted mt-1 block tabular-nums">{row.reference_score.toFixed(2)}</b><span className="bh-muted mt-1 block max-w-40 text-xs">{row.reason}</span></span>
          </li>)}
        </ul>
      </div>}
    </div>}
    {points.length > 0 && <>
      <div className={view === '2d' ? 'mt-4 grid min-w-0 gap-4 lg:grid-cols-2' : 'hidden'} data-bh-imagejev-v02-synced-charts>
        <ImageScatter kind="cost" points={points} activeKey={active?.key ?? null} pinned={pinned} setActiveKey={setActiveKey} setPinned={setPinned} caps={caps} />
        <ImageScatter kind="speed" points={points} activeKey={active?.key ?? null} pinned={pinned} setActiveKey={setActiveKey} setPinned={setPinned} caps={caps} />
      </div>
      {view === '2d' && active && <p className="bh-panel mt-3 p-3 text-sm" aria-live="polite" data-bh-imagejev-v02-chart-selection>
        Selected in both plots: <b>{active.name}</b> · CORE Capability {one(active.capability)} · Intelligence {one(active.intelligence)} · Calibration {one(active.calibration)} · Median latency {active.medianP50 == null ? '—' : `${active.medianP50.toFixed(2)} s (adjusted p50)`} · Official Speed axis {Number.isFinite(active.tracks.core.axes.speed) ? one(active.tracks.core.axes.speed) : '—'} · Cost {active.cost == null ? '—' : `${usd(active.cost)} / 1,000 decisions`}.
      </p>}
      {view === '3d' && <section className="bh-panel mt-4 p-4 sm:p-5" aria-labelledby="imagejev-v02-3d-heading" data-bh-imagejev-v02-3d>
        <h3 id="imagejev-v02-3d-heading" className="text-xl font-semibold">CORE capability, cost and speed in 3D</h3>
        <p className="bh-muted mt-1 text-sm">The 3D view uses the same CORE measured systems: capability vertically, lower cost to the right, and higher median-latency speed (from the adjusted p50) toward you. The selected 2D system remains selected when you switch back.</p>
        <ImageJevV02Legend />
        <JevCapability3D points={points3d} costBounds={costBounds} benchmarkName="Image JevBench" classificationLabel="measured" showClassificationFilter={false} fitLabels speedLabel="Median speed" />
        <p className="bh-muted mt-2 text-xs">{points3d.length} measured CORE systems plotted; systems without cost or median latency are omitted.</p>
      </section>}
    </>}
    {!points.length && view === '2d' && <div className="mt-4 grid gap-4 lg:grid-cols-2" data-bh-imagejev-v02-synced-charts>
      <p className="bh-panel p-4 text-sm" data-bh-imagejev-v02-scatter="cost">CORE Capability vs cost · no v0.2 measurements yet.</p>
      <p className="bh-panel p-4 text-sm" data-bh-imagejev-v02-scatter="speed">CORE Capability vs speed · no v0.2 measurements yet.</p>
    </div>}
    {!points.length && view === '3d' && <div className="bh-panel mt-4 p-4 text-sm" data-bh-imagejev-v02-3d>CORE 3D view will appear when measured rows are available.</div>}
  </section>;
}
