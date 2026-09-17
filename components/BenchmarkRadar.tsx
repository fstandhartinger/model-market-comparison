"use client";
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { latestScores, type BenchmarkView, type ViewAxis } from '../lib/benchmark-view.mjs';
import { axisRange, detailedRadarAxes, formatRadarValue, radarPercentile, radarPosition, radarWindow, scaleNote, windowRadius, type RadarConvention, type RadarScaled } from '../lib/radar.mjs';
import { InfoTip } from './InfoTip';
import { humanVersion, versionHeading, versionSuffix } from '../lib/version-label';
import { RadarHit, RadarTip, TopicRadar, type RadarActive, type RadarSeries } from './TopicRadar';
import { AaCredit } from './AaCredit';
import { EpochCredit } from './EpochCredit';

export const SERIES_COLORS = ['var(--radar-1, #5b9dff)', 'var(--radar-2, #7ee0c0)', 'var(--radar-3, #f5b65b)', 'var(--radar-4, #cc9aff)'];
const DASHES = ['', '9 4', '3 4', '12 4 2 4'];
const position = (cx: number, cy: number, i: number, n: number, radius: number) => ({ x: Number((cx + Math.sin(i * Math.PI * 2 / n) * radius).toFixed(3)), y: Number((cy - Math.cos(i * Math.PI * 2 / n) * radius).toFixed(3)) });
const shortName = (name: string) => name.replace('Artificial Analysis ', 'AA ').replace(/\s+\(AA.*?\)/, '');

type Cell = { native: number | null; scaled: RadarScaled | null; percentile: RadarScaled | null; variant?: string };
type Series = RadarSeries & { cells: Cell[] };

/** CR-14.2/14.3 + F-107: each point sits at its percentile among measured models (default) or on the metric's own
 *  scale, and carries its exact value as a label. */
function seriesFor(view: BenchmarkView, axes: ViewAxis[], picks: string[], convention: RadarConvention): Series[] {
  return picks.map((id, si) => {
    const cells = axes.map((a) => {
      const row = latestScores(a.scores).find((r) => r.modelId === id);
      const measured = row && !row.lowSample;
      return { native: row?.value ?? null, scaled: measured ? radarPosition(a, id, row.value, convention) : null, percentile: measured ? radarPercentile(a, id) : null, variant: row?.bestOf && row.bestOf > 1 ? row.variantLabel : undefined };
    });
    const unplaced = convention === 'percentile' ? 'too few models measured to place it' : 'not plotted';
    return { id, name: view.models.find((m) => m.id === id)?.name || id, color: SERIES_COLORS[si], dash: DASHES[si] || undefined, cells,
      points: cells.map((c, i) => ({ value: c.scaled?.value ?? null,
        label: (c.scaled ? `${formatRadarValue(c.native, axes[i].unit)} · ${scaleNote(c.scaled, axes[i].unit)}` : c.native != null ? `${formatRadarValue(c.native, axes[i].unit)} · ${unplaced}` : 'No measured result') + (c.variant && c.native != null ? ` · best of variants: ${c.variant}` : '') })) };
  });
}

function SimpleRadar({ axes, series, variant, label, zoom, convention }: { axes: ViewAxis[]; series: Series[]; variant: 'desktop' | 'mobile'; label: string; zoom: boolean; convention: RadarConvention }) {
  const tick = (v: number) => convention === 'percentile' ? `p${Math.round(v)}` : String(Math.round(v));
  const [active, setActive] = useState<RadarActive>(null);
  const d = variant === 'desktop' ? { w: 900, h: 600, cx: 450, cy: 295, R: 205, L: 256 } : { w: 360, h: 360, cx: 180, cy: 180, R: 120, L: 148 };
  // CR-19.2: zoomed to the compared models' shared window unless the full 0–100 scale is chosen.
  const win = zoom ? radarWindow(series.flatMap((s) => s.points.map((p) => p.value))) : radarWindow([]);
  const at = (s: number, i: number) => { const p = position(d.cx, d.cy, i, axes.length, d.R * (windowRadius(series[s]?.points[i]?.value ?? win.floor, win) ?? 0)); return [p.x, p.y] as const; };
  return <div className={`relative mx-auto w-full ${variant === 'desktop' ? 'hidden max-w-[820px] md:block' : 'block max-w-[360px] md:hidden'}`} onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null); }} onClick={() => setActive(null)}>
    <svg className="block w-full" viewBox={`0 0 ${d.w} ${d.h}`} role="group" aria-label={label}>
      {win.rings.map((v, k) => <g key={k}><polygon fill="none" stroke="var(--radar-grid, #526071)" strokeOpacity="0.6" points={axes.map((_, i) => { const p = position(d.cx, d.cy, i, axes.length, d.R * (k + 1) / 4); return `${p.x},${p.y}`; }).join(' ')} /><text x={d.cx + 5} y={d.cy - d.R * (k + 1) / 4 + 13} fill="currentColor" fontSize="10" data-radar-ring>{tick(v)}</text></g>)}
      {win.floor > 0 && <text x={d.cx + 5} y={d.cy + 4} fill="currentColor" fontSize="10" data-radar-floor>{tick(win.floor)}</text>}
      {axes.map((axis, i) => {
        const p = position(d.cx, d.cy, i, axes.length, d.R), l = position(d.cx, d.cy, i, axes.length, d.L);
        const short = shortName(axis.name), suffix = versionSuffix(short, axis.version);
        return <g key={axis.id}><line x1={d.cx} y1={d.cy} x2={p.x} y2={p.y} stroke="var(--radar-grid, #526071)" strokeOpacity="0.6" />
          {variant === 'desktop'
            ? <text x={l.x} y={l.y - 4} textAnchor={l.x < d.cx - 20 ? 'end' : l.x > d.cx + 20 ? 'start' : 'middle'} fill="currentColor" fontSize="11" fontWeight="600"><tspan x={l.x}>{i + 1}. {short.length > 30 ? short.slice(0, 29) + '…' : short}</tspan>{suffix && <tspan x={l.x} dy="16" fontWeight="400" fontSize="10">{suffix}</tspan>}</text>
            : <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize="13" fontWeight="600">{i + 1}</text>}</g>;
      })}
      {series.map((s, si) => <g key={s.id}>
        {s.points.map((v, i) => {
          const next = s.points[(i + 1) % axes.length];
          if (v.value == null || next.value == null) return null;
          const [x1, y1] = at(si, i), [x2, y2] = at(si, (i + 1) % axes.length);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash} />;
        })}
        {s.points.map((v, i) => { if (v.value == null) return null; const [x, y] = at(si, i); return <circle key={i} cx={x} cy={y} r={active?.s === si && active?.i === i ? 6.5 : 4 + si / 2} fill="var(--surface, #161b22)" stroke={s.color} strokeWidth="2" pointerEvents="none" />; })}
      </g>)}
      {series.map((s, si) => s.points.map((v, i) => { if (v.value == null) return null; const [x, y] = at(si, i); return <RadarHit key={`${s.id}-${i}`} cx={x} cy={y} s={si} i={i} active={active} setActive={setActive} label={`${s.name}, ${axes[i].name}: ${v.label}`} />; }))}
    </svg>
    <RadarTip active={active} axes={axes} series={series} at={at} width={d.w} height={d.h} />
  </div>;
}

export function BenchmarkRadar({ view, axes, picks, axesPicker, axesPickerLabel }: { view: BenchmarkView; axes: ViewAxis[]; picks: string[]; axesPicker?: ReactNode; axesPickerLabel?: string }) {
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');
  const [zoom, setZoom] = useState(true);
  // F-107: percentile is the default and is not persisted; `?scale=native` opens the native scale.
  const [convention, setConvention] = useState<RadarConvention>('percentile');
  useEffect(() => { if (new URLSearchParams(window.location.search).get('scale') === 'native') setConvention('native'); }, []);
  const chooseConvention = (next: RadarConvention) => {
    setConvention(next);
    const url = new URL(window.location.href);
    if (next === 'native') url.searchParams.set('scale', 'native'); else url.searchParams.delete('scale');
    window.history.replaceState(window.history.state, '', url);
  };
  const percentile = convention === 'percentile';
  const detailedAxes = useMemo(() => detailedRadarAxes([...view.axes, ...(view.indexAxes ?? [])], picks, convention), [view, picks, convention]);
  const shown = mode === 'simple' ? axes : detailedAxes;
  const series = seriesFor(view, shown, picks, convention);
  const ariaLabel = `${mode === 'simple' ? 'Radar' : 'Detailed radar grouped by topic'} for ${series.map((s) => s.name).join(', ')}. ${mode === 'simple' ? shown.map((a, i) => `Axis ${i + 1}: ${a.name}, ${humanVersion(a.version).label}`).join('. ') + '. ' : `${shown.length} benchmarks. `}Each point is focusable and announces its exact value; all values are also in the table below.`;
  return <section id="benchmark-radar" className="bh-panel min-w-0 scroll-mt-4 p-5" aria-label="Benchmark radar">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="bh-eyebrow">PERFORMANCE PROFILE</p><h2 className="text-xl font-semibold">Benchmark radar <InfoTip title="How the benchmark radar works" label="the benchmark radar explanation">Percentile (default): each point is the model&apos;s percentile among the models measured on that benchmark, so every axis uses one scale and the best measured model sits on the rim. Native: each benchmark on its published scale; open-ended scores (Elo, Epoch ECI) span the measured range. Missing results stay gaps, never zeroes; hover, tap or focus a point for the published number. The chart zooms to the range the compared models occupy — tick “Full scale” to undo.</InfoTip></h2></div>
      <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Radar scale" className="inline-flex items-center rounded-lg border border-line p-0.5 text-sm" data-radar-convention={convention}>
        <span className="bh-muted px-2 text-xs">Scale</span>
        {(['percentile', 'native'] as const).map((c) => <button key={c} type="button" aria-pressed={convention === c} onClick={() => chooseConvention(c)} className={`min-h-9 rounded-md px-3 ${convention === c ? 'bg-accent/15 font-semibold text-accent' : 'bh-muted'}`}>{c === 'percentile' ? 'Percentile' : 'Native'}</button>)}
      </div>
      <div role="group" aria-label="Radar type" className="inline-flex rounded-lg border border-line p-0.5 text-sm">
        {(['simple', 'detailed'] as const).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`min-h-9 rounded-md px-3 ${mode === m ? 'bg-accent/15 font-semibold text-accent' : 'bh-muted'}`}>{m === 'simple' ? `Simple · ${axes.length} axes` : `Detailed · ${detailedAxes.length} benchmarks`}</button>)}
      </div>
      </div>
    </div>
    {mode === 'simple' && axes.length < 3 ? <div className="bh-empty min-h-80">Choose 3–8 axes to draw a radar. The full comparison table stays available below.</div> : !picks.length ? <div className="bh-empty min-h-80">Choose up to four model configurations to see their profiles.</div> : mode === 'detailed' && shown.length < 3 ? <div className="bh-empty min-h-80">Too few measured benchmarks for a detailed radar.</div> : <>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Chart legend">{series.map((s, i) => <li key={s.id} className="flex items-center gap-2"><svg width="28" height="12" aria-hidden="true"><line x1="0" y1="6" x2="28" y2="6" stroke={s.color} strokeWidth="3" strokeDasharray={s.dash} /></svg><span>{String.fromCharCode(65 + i)} · {s.name}</span></li>)}</ul>
      {mode === 'simple' ? <div className="mt-2">
        <label className="mb-1 flex items-center justify-end gap-2 text-xs"><input type="checkbox" checked={!zoom} onChange={(e) => setZoom(!e.target.checked)} data-radar-fullscale />Full scale</label>
        <SimpleRadar axes={shown} series={series} variant="desktop" label={ariaLabel} zoom={zoom} convention={convention} />
        <SimpleRadar axes={shown} series={series} variant="mobile" label={ariaLabel} zoom={zoom} convention={convention} />
        {zoom && (() => { const f = radarWindow(series.flatMap((s) => s.points.map((p) => p.value))).floor; return f > 0 ? <p className="bh-muted text-center text-xs" data-radar-zoom-note>{percentile ? <>Zoomed to these models: the centre is the {f}th percentile, not the bottom.</> : <>Zoomed to these models: the centre is {f} on each axis&apos;s 0–100 position, not zero.</>}</p> : null; })()}
        <ol className="md:hidden mt-2 space-y-0.5 text-xs">{shown.map((axis, i) => { const short = shortName(axis.name), suffix = versionSuffix(short, axis.version); return <li key={axis.id}>{i + 1}. {short}{suffix && <span className="bh-muted"> {suffix}</span>}</li>; })}</ol>
      </div> : <div className="mt-2">
        <TopicRadar axes={shown} series={series} label={ariaLabel} rings={percentile ? 'percentile' : 'position'} averages={percentile} />
        <p className="bh-muted mt-2 text-xs">Every benchmark on which at least one selected model has a result ({shown.length}), grouped clockwise by topic{percentile ? ', on the same percentile scale as the Benchmaxxing radar' : ''}. Lines join neighbours within one topic only, so an uneven topic shows as a jagged line.</p>
      </div>}
      <p className="mt-2 text-xs" data-radar-scale-sentence>{percentile ? 'Each axis: percentile among the models measured on that benchmark (p100 = best measured); hover for the published number.' : 'Each axis on its published scale; open-ended axes (Elo, ECI) span the measured range.'}</p>
      <p className="bh-muted mt-1 text-xs">Hover, tap or focus a point for its exact score. <AaCredit /> · <EpochCredit /> · DesignArena</p>
      <details className="mt-4 text-sm"><summary>Show exact radar values</summary><div className="bh-table-wrap overflow-x-auto" tabIndex={0} role="region" aria-label="Radar values"><table className="bh-table w-full text-sm"><caption className="text-left bh-muted py-3">Published scores with each model&apos;s percentile among the models measured on that benchmark; the last column names the native scale. Missing results are never filled.</caption><thead><tr><th scope="col">Axis / version</th>{series.map((s, i) => <th scope="col" key={s.id}>{String.fromCharCode(65 + i)} · {s.name}</th>)}<th scope="col">Scale</th></tr></thead><tbody>{shown.map((a, i) => {
        const range = axisRange(a);
        return <tr key={a.id}><th scope="row" className="text-left font-normal">{i + 1}. {a.name}<div className="bh-muted text-xs">{versionHeading(a.version)} · {a.cohort}</div></th>{series.map((s) => { const c = s.cells[i]; return <td key={s.id} className="tabular">{c.native == null ? 'No measured result' : `${formatRadarValue(c.native, a.unit)} · ${c.percentile ? `p${Math.round(c.percentile.value)}` : 'no percentile'}`}</td>; })}<td className="text-xs bh-muted">{range ? `Fixed ${formatRadarValue(range[0], a.unit)}–${formatRadarValue(range[1], a.unit)}` : a.stats.min == null ? 'No range' : `Measured range ${formatRadarValue(a.stats.min, a.unit)}–${formatRadarValue(a.stats.max, a.unit)} (${a.stats.n} models)`} · {a.higherBetter === false ? 'lower better' : a.higherBetter === true ? 'higher better' : 'direction unknown'}</td></tr>;
      })}</tbody></table></div></details>
    </>}
    {mode === 'simple' && axesPicker != null && <details className="mt-4 text-sm"><summary>{axesPickerLabel}</summary>{axesPicker}</details>}
    <details className="mt-4 text-sm bh-muted"><summary>How to read this chart</summary><p className="mt-2">Percentile (default): a point is the model&apos;s percentile among the models measured on that benchmark — p100 is the best measured result, ties share a mid-rank — so one polygon never mixes scales; with fewer than three model families measured, a benchmark is not placed. Native: a benchmark is drawn on its published scale (percentages, 0–100 indices), and Elo boards and Epoch ECI, which have none, within the range measured across all catalog models. DesignArena results below 200 battles are not plotted. The default axes are the headline indices (AA Intelligence and Coding, Epoch ECI and Software ECI), DesignArena Full-Stack, Humanity&apos;s Last Exam and Terminal-Bench, chosen because they are current and not saturated. Model prompts and test conditions can still differ; inspect the source before interpreting small differences. This chart does not change Composite.</p></details>
  </section>;
}
