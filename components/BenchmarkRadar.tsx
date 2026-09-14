import { latestScores, normalize, type BenchmarkView, type ViewAxis } from '../lib/benchmark-view.mjs';
import type { ReactNode } from 'react';
import { InfoTip } from './InfoTip';
import { humanVersion, versionHeading, versionSuffix } from '../lib/version-label';

export const SERIES_COLORS = ['var(--radar-1, #5b9dff)', 'var(--radar-2, #7ee0c0)', 'var(--radar-3, #f5b65b)', 'var(--radar-4, #cc9aff)'];
const DASHES = ['', '9 4', '3 4', '12 4 2 4'];
const position = (cx: number, cy: number, i: number, n: number, radius: number) => ({ x: Number((cx + Math.sin(i * Math.PI * 2 / n) * radius).toFixed(3)), y: Number((cy - Math.cos(i * Math.PI * 2 / n) * radius).toFixed(3)) });
const format = (n: number) => Number(n.toFixed(3)).toLocaleString('en-US');

export function BenchmarkRadar({ view, axes, picks, axesPicker, axesPickerLabel }: { view: BenchmarkView; axes: ViewAxis[]; picks: string[]; axesPicker?: ReactNode; axesPickerLabel?: string }) {
  const series = picks.map((id) => ({ id, name: view.models.find((m) => m.id === id)?.name || id,
    values: axes.map((a) => {
      const row = latestScores(a.scores).find((r) => r.modelId === id);
      return { row, normalized: row && !row.lowSample ? normalize(row.value, a.stats, a.higherBetter) : null };
    }) }));
  const ariaLabel = `Radar for ${series.map((s) => s.name).join(', ')}. ${axes.map((a, i) => `Axis ${i + 1}: ${a.name}, ${humanVersion(a.version).label}`).join('. ')}. Numeric values are in the following table.`;
  return <section id="benchmark-radar" className="bh-panel min-w-0 scroll-mt-4 p-5" aria-label="Benchmark radar">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="bh-eyebrow">RELATIVE PERFORMANCE</p><h2 className="text-xl font-semibold">Benchmark radar <InfoTip title="How the benchmark radar works" label="the benchmark radar explanation">Each benchmark version is normalized against its measured peer range from 0 to 100; lower-is-better axes are reversed. Missing or uninformative results stay as gaps, never zeroes.</InfoTip></h2></div><span className="bh-badge">Independent measurements</span></div>
    {axes.length < 3 ? <div className="bh-empty min-h-80">Choose 3–8 axes to draw a radar. The full comparison table stays available below.</div> : !picks.length ? <div className="bh-empty min-h-80">Choose up to four model configurations to see their profiles.</div> : <>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Chart legend">{series.map((s, i) => <li key={s.id} className="flex items-center gap-2"><svg width="28" height="12" aria-hidden="true"><line x1="0" y1="6" x2="28" y2="6" stroke={SERIES_COLORS[i]} strokeWidth="3" strokeDasharray={DASHES[i]} /></svg><span>{String.fromCharCode(65 + i)} · {s.name}</span></li>)}</ul>
      <div className="md:overflow-x-auto" tabIndex={0} role="region" aria-label="Radar graphic; exact values follow">
        <svg className="mx-auto hidden w-full max-w-[640px] md:block" viewBox="0 0 720 500" role="img" aria-label={ariaLabel}>
          {[25, 50, 75, 100].map((v) => <g key={v}><polygon fill="none" stroke="var(--radar-grid, #526071)" strokeOpacity="0.6" points={axes.map((_, i) => { const p = position(360, 245, i, axes.length, 150 * v / 100); return `${p.x},${p.y}`; }).join(' ')} /><text x="365" y={245 - 150 * v / 100 + 13} fill="currentColor" fontSize="10">{v}</text></g>)}
          {axes.map((axis, i) => {
            const p = position(360, 245, i, axes.length, 150), label = position(360, 245, i, axes.length, 193), anchor = label.x < 340 ? 'end' : label.x > 380 ? 'start' : 'middle';
            const short = axis.name.replace('Artificial Analysis ', 'AA ').replace(/\s+\(AA.*?\)/, '');
            return <g key={axis.id}><line x1="360" y1="245" x2={p.x} y2={p.y} stroke="var(--radar-grid, #526071)" strokeOpacity="0.6" />
              <text x={label.x} y={label.y - 4} textAnchor={anchor} fill="currentColor" fontSize="11" fontWeight="600"><tspan x={label.x}>{i + 1}. {short.length > 22 ? short.slice(0, 21) + '…' : short}</tspan>{versionSuffix(short, axis.version) && <tspan x={label.x} dy="16" fontWeight="400" fontSize="10">{versionSuffix(short, axis.version)}</tspan>}</text></g>;
          })}
          {series.map((s, si) => <g key={s.id}>
            {s.values.map((v, i) => {
              const next = s.values[(i + 1) % axes.length];
              if (v.normalized == null || next.normalized == null) return null;
              const p = position(360, 245, i, axes.length, v.normalized * 1.5), q = position(360, 245, (i + 1) % axes.length, axes.length, next.normalized * 1.5);
              return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={SERIES_COLORS[si]} strokeWidth="2.5" strokeDasharray={DASHES[si]} />;
            })}
            {s.values.map((v, i) => { if (v.normalized == null) return null; const p = position(360, 245, i, axes.length, v.normalized * 1.5); return <circle key={i} cx={p.x} cy={p.y} r={4 + si / 2} fill="var(--surface, #161b22)" stroke={SERIES_COLORS[si]} strokeWidth="2"><title>{`${s.name} — ${axes[i].name}, ${humanVersion(axes[i].version).label}:${v.row?.value} ${axes[i].unit}; normalized ${format(v.normalized)}`}</title></circle>; })}
          </g>)}
        </svg>
        <svg className="mx-auto block w-full max-w-[360px] md:hidden" viewBox="0 0 360 360" role="img" aria-label={ariaLabel}>
          {[25, 50, 75, 100].map((v) => <g key={v}><polygon fill="none" stroke="var(--radar-grid, #526071)" strokeOpacity="0.6" points={axes.map((_, i) => { const p = position(180, 180, i, axes.length, 120 * v / 100); return `${p.x},${p.y}`; }).join(' ')} /><text x="184" y={180 - 120 * v / 100 + 13} fill="currentColor" fontSize="10">{v}</text></g>)}
          {axes.map((axis, i) => {
            const p = position(180, 180, i, axes.length, 120), label = position(180, 180, i, axes.length, 148);
            return <g key={axis.id}><line x1="180" y1="180" x2={p.x} y2={p.y} stroke="var(--radar-grid, #526071)" strokeOpacity="0.6" />
              <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize="13" fontWeight="600">{i + 1}</text></g>;
          })}
          {series.map((s, si) => <g key={s.id}>
            {s.values.map((v, i) => {
              const next = s.values[(i + 1) % axes.length];
              if (v.normalized == null || next.normalized == null) return null;
              const p = position(180, 180, i, axes.length, v.normalized * 1.2), q = position(180, 180, (i + 1) % axes.length, axes.length, next.normalized * 1.2);
              return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={SERIES_COLORS[si]} strokeWidth="2.5" strokeDasharray={DASHES[si]} />;
            })}
            {s.values.map((v, i) => { if (v.normalized == null) return null; const p = position(180, 180, i, axes.length, v.normalized * 1.2); return <circle key={i} cx={p.x} cy={p.y} r={4 + si / 2} fill="var(--surface, #161b22)" stroke={SERIES_COLORS[si]} strokeWidth="2"><title>{`${s.name} — ${axes[i].name}, ${humanVersion(axes[i].version).label}:${v.row?.value} ${axes[i].unit}; normalized ${format(v.normalized)}`}</title></circle>; })}
          </g>)}
        </svg>
        <ol className="md:hidden mt-2 space-y-0.5 text-xs">
          {axes.map((axis, i) => {
            const short = axis.name.replace('Artificial Analysis ', 'AA ').replace(/\s+\(AA.*?\)/, '');
            const suffix = versionSuffix(short, axis.version);
            return <li key={axis.id}>{i + 1}. {short}{suffix && <span className="bh-muted"> {suffix}</span>}</li>;
          })}
        </ol>
      </div>
      <details className="mt-4 text-sm"><summary>Show exact radar values</summary><div className="bh-table-wrap overflow-x-auto" tabIndex={0} role="region" aria-label="Radar values"><table className="bh-table w-full text-sm"><caption className="text-left bh-muted py-3">Radar values · normalized / 100, rounded to 3 decimals (exact native score). Missing or uninformative axes are never filled.</caption><thead><tr><th scope="col">Axis / version</th>{series.map((s, i) => <th scope="col" key={s.id}>{String.fromCharCode(65 + i)} · {s.name}</th>)}<th scope="col">Normalization range</th></tr></thead><tbody>{axes.map((a, i) => <tr key={a.id}><th scope="row" className="text-left font-normal">{i + 1}. {a.name}<div className="bh-muted text-xs">{versionHeading(a.version)} · {a.cohort}</div></th>{series.map((s) => { const v = s.values[i]; return <td key={s.id} className="tabular">{v.normalized == null ? (v.row ? `Not plotted (${v.row.value} ${a.unit}; ${v.row.lowSample ? 'low sample' : 'no usable peer range'})` : 'No measured result') : `${format(v.normalized)} (${String(v.row!.value)} ${a.unit})`}</td>; })}<td className="text-xs bh-muted">{a.stats.n} measured configurations · {a.stats.min == null ? 'No range' : `${String(a.stats.min)}–${String(a.stats.max)} ${a.unit}`} · {a.higherBetter === false ? 'lower better' : a.higherBetter === true ? 'higher better' : 'direction unknown'}</td></tr>)}</tbody></table></div></details>
    </>}
    {axesPicker != null && <details className="mt-4 text-sm"><summary>{axesPickerLabel}</summary>{axesPicker}</details>}
    <details className="mt-4 text-sm bh-muted"><summary>How to read this chart</summary><p className="mt-2">Formula: 100 × (value − minimum) / (maximum − minimum), or 100 minus that value for lower-is-better axes. Peers are independently measured, exactly matched catalog configurations; repeated source identities count once. Fewer than two peers, a constant range or unknown direction suppresses plotting. DesignArena results below 200 battles are excluded. Axes show version and published harness/configuration. Model prompts and test conditions can still differ; inspect the source before interpreting small differences. Ranges stay fixed when model selection changes. This chart does not change Composite.</p></details>
  </section>;
}
