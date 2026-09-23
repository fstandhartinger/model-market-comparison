import type { CSSProperties } from 'react';
import { jevbenchCapabilityRows } from '../lib/jevbench-capability.mjs';
import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { JEV_TYPE_LABEL, JEV_TYPE_VAR } from './jevTypes';
import { JevCapability3D } from './JevCapability3D';

const CHART_TOP = 20;
const one = (value: number) => value.toFixed(1);
const shortName = (value: string) => value.split(' (')[0].split(', formerly')[0];
const typeVar = (cls: string) => ({ '--jev-t': 'var(' + (JEV_TYPE_VAR[cls] ?? JEV_TYPE_VAR['llm-baseline']) + ')' }) as CSSProperties;
const usd = (value: number) => value === 0 ? 'Free' : value >= 1 ? '$' + value.toFixed(2) : '$' + value.toPrecision(2);

type PlotPoint = {
  key: string;
  name: string;
  cls: string;
  colorVariable: string;
  capability: number;
  cost: number | null;
  costKind: string;
  speed: number | null;
  jevbenchScore: number | null;
};

function toPlotPoint(row: JevV14System, capability: number): PlotPoint {
  return {
    key: row.key,
    name: shortName(row.display),
    cls: row.class,
    colorVariable: JEV_TYPE_VAR[row.class] ?? JEV_TYPE_VAR['llm-baseline'],
    capability,
    cost: row.cost?.usd_per_1000 ?? null,
    costKind: row.cost?.kind ?? 'unknown',
    speed: row.axes?.speed ?? null,
    jevbenchScore: row.jevbench_score ?? null,
  };
}

function positiveCosts(points: PlotPoint[]) {
  return points.flatMap(({ cost }) => cost != null && cost > 0 ? [cost] : []);
}

function logBounds(points: PlotPoint[]): [number, number] {
  const values = positiveCosts(points);
  if (!values.length) return [-3, 0];
  const min = Math.log10(Math.min(...values));
  const max = Math.log10(Math.max(...values));
  return min === max ? [min - 0.5, max + 0.5] : [min, max];
}

function logCostPosition(cost: number, bounds: [number, number]): number {
  if (cost === 0) return 0;
  const [min, max] = bounds;
  return Math.max(0, Math.min(1, (Math.log10(cost) - min) / (max - min)));
}

function costTicks(bounds: [number, number]): number[] {
  const values: number[] = [];
  for (let exponent = Math.floor(bounds[0]); exponent <= Math.ceil(bounds[1]); exponent += 1) {
    const value = 10 ** exponent;
    if (Math.log10(value) >= bounds[0] - 1e-9 && Math.log10(value) <= bounds[1] + 1e-9) values.push(value);
  }
  if (values.length >= 2) return values.slice(0, 5);
  return [10 ** bounds[0], 10 ** bounds[1]];
}

function CapabilityBar({ row, capability, position, costBounds }: {
  row: JevV14System;
  capability: number;
  position: number;
  costBounds: [number, number];
}) {
  const intelligence = row.axes?.intelligence ?? 0;
  const calibration = row.axes?.calibration ?? 0;
  const cost = row.cost?.usd_per_1000 ?? null;
  const costWidth = cost == null ? 0 : cost === 0 ? 1.5 : logCostPosition(cost, costBounds) * 100;
  const width = Math.max(0, Math.min(100, capability));
  const label = `${row.display}: Capability ${one(capability)}, the mean of Intelligence ${one(intelligence)} and Calibration ${one(calibration)}; cost ${cost == null ? 'not reported' : usd(cost) + ' per 1,000 decisions' + (row.cost?.kind === 'estimate' ? ', estimated' : '')}.`;

  return <li
    style={typeVar(row.class)}
    className="grid grid-cols-[1.4rem_minmax(0,1fr)_3.3rem] items-center gap-x-2 text-sm sm:grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_11rem]"
    data-bh-jev14-capability-row={row.key}
    data-bh-jev14-capability-value={capability.toFixed(3)}
    data-bh-jev14-cost={cost == null ? '' : String(cost)}
    aria-label={label}
  >
    <span className="bh-muted tabular col-start-1 row-start-1 text-right text-xs">{position + 1}</span>
    <span className="col-start-2 row-start-1 min-w-0 truncate sm:text-right" title={row.display}>
      {row.repo
        ? <a href={row.repo} target="_blank" rel="noopener noreferrer" className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent hover:decoration-current">{shortName(row.display)}</a>
        : shortName(row.display)}
      {row.api_flag && <span className="bh-thin-tag ml-1.5 align-middle" title={row.api_exposure_note ?? undefined}>API</span>}
    </span>
    <span className="col-start-2 row-start-2 mt-1 flex flex-col justify-center gap-1 sm:col-start-3 sm:row-start-1 sm:mt-0" aria-hidden="true">
      <span className="bh-jevc-grid flex h-[10px] rounded-sm"><span className={'bh-jevc-bar' + (row.ranked ? '' : ' is-partial')} style={{ width: width.toFixed(4) + '%' }} /></span>
      <span className="bh-jevc-grid flex h-[5px] rounded-sm"><span className="block h-full rounded-sm bg-[rgb(var(--muted))]" style={{ width: costWidth.toFixed(4) + '%' }} /></span>
    </span>
    <b className="tabular col-start-3 row-span-2 row-start-1 self-center text-right text-base sm:col-start-4 sm:row-span-1 sm:text-lg">{one(capability)}</b>
    <span className="bh-muted col-start-2 row-start-3 mt-0.5 min-w-0 font-mono text-[10.5px] sm:col-start-5 sm:row-start-1 sm:mt-0 sm:whitespace-normal sm:text-right sm:text-[12px]">
      <span className="sm:hidden">Cost </span>{cost == null ? '—' : usd(cost)}{row.cost?.kind === 'estimate' && cost != null ? ' est.' : ''}
      <span className="hidden sm:inline"> · I {one(intelligence)} · C {one(calibration)}</span>
    </span>
  </li>;
}

function Scatter({ id, title, description, points, xKind, costBounds }: {
  id: string;
  title: string;
  description: string;
  points: PlotPoint[];
  xKind: 'cost' | 'speed';
  costBounds: [number, number];
}) {
  const plotted = points.filter((point) => xKind === 'cost'
    ? point.cost != null && point.cost >= 0
    : point.speed != null);
  const W = 520, H = 370, L = 55, R = 14, T = 18, B = 58;
  const xMax = W - R, yMax = H - B;
  const xTicks = xKind === 'cost' ? costTicks(costBounds) : [0, 20, 40, 60, 80, 100];
  const xMinValue = xKind === 'cost' ? costBounds[0] : 0;
  const xMaxValue = xKind === 'cost' ? costBounds[1] : 100;
  const xAt = (value: number) => {
    const transformed = xKind === 'cost' ? (value === 0 ? costBounds[0] : Math.log10(value)) : value;
    return L + (xMax - L) * (transformed - xMinValue) / (xMaxValue - xMinValue);
  };
  const yAt = (value: number) => T + (yMax - T) * (1 - Math.max(0, Math.min(100, value)) / 100);
  const xLabel = xKind === 'cost' ? 'USD per 1,000 decisions · log scale · cheaper ←' : 'Speed axis · higher is faster →';

  return <figure className="bh-panel min-w-0 p-4 sm:p-5" data-bh-jev14-scatter={xKind} aria-labelledby={id + '-title'}>
    <h3 id={id + '-title'} className="text-lg font-semibold">{title}</h3>
    <p className="bh-muted mt-1 text-sm">{description}</p>
    <svg className="mt-3 block h-auto w-full" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={id + '-svg-title ' + id + '-svg-desc'}>
      <title id={id + '-svg-title'}>{title}</title>
      <desc id={id + '-svg-desc'}>{description} Each point has a tooltip with the system and its values.</desc>
      {[0, 20, 40, 60, 80, 100].map((tick) => <g key={'y' + tick}>
        <line x1={L} x2={xMax} y1={yAt(tick)} y2={yAt(tick)} stroke="rgb(var(--line) / .7)" />
        <text x={L - 7} y={yAt(tick) + 4} textAnchor="end" className="bh-muted" fontSize="11">{tick}</text>
      </g>)}
      {xTicks.map((tick) => <g key={'x' + tick}>
        <line x1={xAt(tick)} x2={xAt(tick)} y1={T} y2={yMax} stroke="rgb(var(--line) / .55)" />
        <text x={xAt(tick)} y={yMax + 17} textAnchor="middle" className="bh-muted" fontSize="10">{xKind === 'cost' ? usd(tick) : tick}</text>
      </g>)}
      <text x={(L + xMax) / 2} y={H - 7} textAnchor="middle" className="bh-muted" fontSize="10">{xLabel}</text>
      <text x="13" y={(T + yMax) / 2} textAnchor="middle" className="bh-muted" fontSize="11" transform={`rotate(-90 13 ${(T + yMax) / 2})`}>Capability · higher ↑</text>
      {plotted.map((point) => {
        const x = xKind === 'cost' ? xAt(point.cost ?? 0) : xAt(point.speed ?? 0);
        const y = yAt(point.capability);
        const titleText = `${point.name} · Capability ${one(point.capability)} · Cost ${point.cost == null ? 'not reported' : usd(point.cost) + (point.costKind === 'estimate' ? ' estimated' : '')} per 1,000 decisions · Speed ${point.speed == null ? 'not reported' : one(point.speed)}.`;
        return <circle key={point.key} cx={x} cy={y} r="4.5" fill={`rgb(var(${point.colorVariable}))`} stroke="rgb(var(--surface))" strokeWidth="1.25" data-bh-jev14-point={point.key} tabIndex={0}>
          <title>{titleText}</title>
        </circle>;
      })}
    </svg>
    <figcaption className="bh-muted mt-2 text-xs">{plotted.length} systems plotted{plotted.length !== points.length ? `; ${points.length - plotted.length} omitted because ${xKind === 'cost' ? 'cost is not reported' : 'Speed is not reported'}` : ''}. Hover or focus a point to read its values.</figcaption>
  </figure>;
}

export function JevCapabilityChart({ systems, revision }: { systems: JevV14System[]; revision: string }) {
  const all = jevbenchCapabilityRows(systems);
  const points = all.map(({ row, capability }) => toPlotPoint(row, capability));
  const rest = all.slice(CHART_TOP);
  const types = Object.keys(JEV_TYPE_LABEL).filter((type) => all.some(({ row }) => row.class === type));
  const withoutBothAxes = systems.length - all.length;
  const costBounds = logBounds(points);
  const plotted3d = points.filter((point) => point.cost != null && point.cost >= 0 && point.speed != null);
  const knownCosts = points.flatMap(({ cost }) => cost != null && cost >= 0 ? [cost] : []);
  const minCost = knownCosts.length ? Math.min(...knownCosts) : 0;
  const maxCost = knownCosts.length ? Math.max(...knownCosts) : 0;

  return <section id="jev14-capability-views" className="mt-12 scroll-mt-6" data-bh-jev14-capability-suite aria-labelledby="jev14-capability-title">
    <p className="bh-eyebrow">JevBench {revision} · additional views</p>
    <h2 id="jev14-capability-title" className="mt-1 text-2xl font-bold leading-snug sm:text-3xl">Capability, cost and speed</h2>
    <p className="bh-muted mt-2 max-w-5xl text-sm">Capability is the arithmetic mean of Intelligence and Calibration: (Intelligence + Calibration) / 2, on a 0–100 scale. Cost is USD per 1,000 decisions; its axis is logarithmic, and lower is better. Speed uses the JevBench Speed axis, where higher is faster. Estimated costs are marked.</p>
    {withoutBothAxes > 0 && <p className="bh-muted mt-2 text-xs" data-bh-jev14-capability-unscored>{withoutBothAxes} placeholder rows have no published Intelligence or Calibration values and are omitted.</p>}

    <figure className="bh-panel mt-5 p-4 sm:p-5" data-bh-jev14-capability-chart aria-labelledby="jev14-capability-bars-title">
      <p className="bh-eyebrow">Top {Math.min(CHART_TOP, all.length)} by Capability</p>
      <h3 id="jev14-capability-bars-title" className="mt-1 text-xl font-bold leading-snug">Capability with cost alongside</h3>
      <p className="bh-muted mt-1 text-sm">Each system has a wide Capability bar and a narrower cost bar. The cost scale is logarithmic: longer bars mean higher cost, so shorter is cheaper.</p>
      <div className="mt-4 hidden grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_11rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
        <span /><span />
        <span className="bh-muted flex justify-between font-mono"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></span>
        <span />
        <span className="bh-muted text-right font-mono">I · C inputs</span>
      </div>
      <ol className="mt-2 space-y-2.5 sm:mt-1" data-bh-jev14-capability-bars>
        {all.slice(0, CHART_TOP).map((item, index) => <CapabilityBar key={item.row.key} {...item} position={index} costBounds={costBounds} />)}
      </ol>
      {rest.length > 0 && <details className="mt-2.5" data-bh-jev14-capability-more>
        <summary className="cursor-pointer text-sm font-semibold text-accent">Show all {all.length} systems ({rest.length} more)</summary>
        <ol className="mt-2.5 space-y-2.5">
          {rest.map((item, index) => <CapabilityBar key={item.row.key} {...item} position={index + CHART_TOP} costBounds={costBounds} />)}
        </ol>
      </details>}
      <div className="mt-3 grid grid-cols-[1.4rem_minmax(0,1fr)_3.3rem] gap-x-2 text-[10px] sm:grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_11rem]" aria-hidden="true">
        <span /><span />
        <span className="bh-muted flex justify-between tabular"><span>Capability 0–100</span><span>100</span></span>
        <span />
        <span className="bh-muted text-right tabular">Cost: {usd(minCost)}–{usd(maxCost)} / 1k</span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]" aria-label="System types" data-bh-jev14-capability-legend>
        {types.map((type) => <li key={type} style={typeVar(type)}><span className="bh-jevc-swatch mr-1.5" />{JEV_TYPE_LABEL[type]}</li>)}
        <li><span className="mr-1.5 inline-block h-1.5 w-3 rounded-sm bg-[rgb(var(--muted))] align-middle" />Cost per 1,000 decisions · log scale</li>
      </ul>
      <figcaption className="bh-muted mt-3 text-[11.5px] leading-snug">Cost bars use the right-hand scale, from {usd(minCost)} to {usd(maxCost)} per 1,000 decisions. Free cost is placed at the cheapest edge; missing cost is shown as —.</figcaption>
    </figure>

    <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-2">
      <Scatter id="jev14-capability-cost" title="Capability vs cost" description="The upper-left is the more attractive area: higher Capability and lower cost." points={points} xKind="cost" costBounds={costBounds} />
      <Scatter id="jev14-capability-speed" title="Capability vs speed" description="The upper-right is the more attractive area: higher Capability and higher Speed." points={points} xKind="speed" costBounds={costBounds} />
    </div>

    <section className="bh-panel mt-5 p-4 sm:p-5" data-bh-jev14-capability-3d aria-labelledby="jev14-capability-3d-title">
      <h3 id="jev14-capability-3d-title" className="text-xl font-semibold">All three at once</h3>
      <p className="bh-muted mt-1 text-sm">The 3D view plots Capability vertically, lower cost to the right, and higher Speed toward you. Sphere size follows the JevBench score. Drag to rotate; pinch or scroll to zoom. The view loads when it scrolls into view.</p>
      <JevCapability3D points={plotted3d} costBounds={costBounds} />
      <p className="bh-muted mt-2 text-xs">{plotted3d.length} systems plotted; systems missing cost or Speed are omitted. three.js r128 is included under its MIT license.</p>
    </section>
  </section>;
}
