"use client";
import { useState } from 'react';
import { humanVersion } from '../lib/version-label';

export type RadarAxisMeta = { id: string; name: string; version: string; category: string };
/** `value` is the 0–100 radar position (null = gap); `label` is the exact value shown on hover/tap/focus. */
export type RadarPoint = { value: number | null; label: string };
export type RadarSeries = { id: string; name: string; color: string; dash?: string; points: RadarPoint[] };
export type RadarActive = { s: number; i: number } | null;

/** CR-14.3: a focusable hit target per plotted point. Hover, keyboard focus or a tap shows the exact
 *  values; Escape or a tap on the chart background hides them. A tap never toggles: touch fires
 *  mouseenter before click, so a toggle would close the tooltip it just opened. */
export function RadarHit({ cx, cy, s, i, active, setActive, label }: { cx: number; cy: number; s: number; i: number; active: RadarActive; setActive: (a: RadarActive) => void; label: string }) {
  const on = active?.s === s && active?.i === i;
  return <circle cx={cx} cy={cy} r={12} fill="transparent" tabIndex={0} role="button" aria-label={label} aria-pressed={on}
    className="cursor-pointer outline-none focus-visible:[stroke:currentColor] focus-visible:[stroke-width:2]"
    onMouseEnter={() => setActive({ s, i })} onMouseLeave={() => setActive(null)} onFocus={() => setActive({ s, i })} onBlur={() => setActive(null)}
    onClick={(e) => { e.stopPropagation(); setActive({ s, i }); }} onKeyDown={(e) => { if (e.key === 'Escape') setActive(null); }} />;
}

/** The tooltip, positioned over the SVG in viewBox percentages and kept inside the chart. It lists
 *  every compared model's exact value on the axis (the pointed one first and bold), so points that
 *  coincide — two models at 51 and 51.2 — never hide each other's numbers. */
export function RadarTip({ active, axes, series, at, width, height }: { active: RadarActive; axes: RadarAxisMeta[]; series: RadarSeries[]; at: (s: number, i: number) => readonly [number, number]; width: number; height: number }) {
  if (!active) return null;
  const axis = axes[active.i], pointed = series[active.s];
  if (!axis || !pointed?.points[active.i]) return null;
  const [x, y] = at(active.s, active.i);
  const left = Math.max(22, Math.min(78, (x / width) * 100)), top = (y / height) * 100, below = top < 30;
  const rows = [pointed, ...series.filter((s) => s !== pointed)];
  return <div role="status" className="pointer-events-none absolute z-10 w-max max-w-[18rem] rounded-lg border border-line bg-[rgb(var(--surface,22_27_34))] px-3 py-2 text-left text-xs shadow-lg"
    style={{ left: `${left}%`, top: `${top}%`, transform: below ? 'translate(-50%, 16px)' : 'translate(-50%, calc(-100% - 16px))' }}>
    <p className="font-semibold">{axis.name}{humanVersion(axis.version).label ? <span className="bh-muted font-normal"> · {humanVersion(axis.version).label}</span> : null}</p>
    <ul className="mt-1 space-y-1">{rows.map((s) => <li key={s.id} className={s === pointed ? 'font-semibold' : ''}>
      <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} /><span className="truncate">{s.name}</span></span>
      <span className="tabular block pl-3.5">{s.points[active.i]?.label ?? 'No measured result'}</span>
    </li>)}</ul>
  </div>;
}

const TOPIC_COLORS = ['#5b9dff', '#7ee0c0', '#f5b65b', '#cc9aff', '#ff8aa8', '#8bd3ff', '#d5e88f', '#f3a683'];

/** Many-axis radar with topics contiguous clockwise and a coloured sector arc per topic (the
 *  Benchmaxxing radar), for one or several series. Lines join only neighbours inside one topic,
 *  so a jagged topic stays visible and missing results stay gaps. */
export function TopicRadar({ axes, series, label }: { axes: RadarAxisMeta[]; series: RadarSeries[]; label: string }) {
  const [active, setActive] = useState<RadarActive>(null);
  const size = 560, c = size / 2, r = 205, inner = r * 0.18;
  const polar = (angle: number, radius: number) => [c + Math.cos(angle) * radius, c + Math.sin(angle) * radius] as const;
  const angleOf = (i: number) => -Math.PI / 2 + (i / Math.max(1, axes.length)) * Math.PI * 2;
  const at = (s: number, i: number) => polar(angleOf(i), r * (series[s]?.points[i]?.value ?? 0) / 100);
  const topicIndices = new Map<string, number[]>();
  axes.forEach((axis, index) => topicIndices.set(axis.category, [...(topicIndices.get(axis.category) ?? []), index]));
  const singletonTopics = [...topicIndices.entries()].filter(([, indices]) => indices.length < 2);
  const groupedSectors = [...topicIndices.entries()].filter(([, indices]) => indices.length >= 2);
  if (singletonTopics.length) groupedSectors.push(['Other', singletonTopics.flatMap(([, indices]) => indices)]);
  const sectors = groupedSectors.map(([topic, indices], topicIndex) => {
    const start = angleOf(Math.min(...indices)), end = angleOf(Math.max(...indices) + 1);
    const [a, b, d, e] = [polar(start, r), polar(start, r + 10), polar(end, r), polar(end, r + 10)];
    const large = end - start > Math.PI ? 1 : 0;
    return { topic, topicIndex, start, end, eligible: topic !== 'Other',
      path: `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} A ${r + 10} ${r + 10} 0 ${large} 1 ${e[0]} ${e[1]} L ${d[0]} ${d[1]} A ${r} ${r} 0 ${large} 0 ${a[0]} ${a[1]} Z` };
  }).sort((a, b) => a.start - b.start);
  const labels = sectors.filter((sector) => sector.eligible).map((sector) => {
    const [rawX, rawY] = polar((sector.start + sector.end) / 2, r + 38);
    return { topic: sector.topic, x: Math.max(110, Math.min(size - 110, rawX)), y: rawY, right: rawX >= c };
  }).sort((a, b) => a.y - b.y).reduce<Array<{ topic: string; x: number; y: number; right: boolean }>>((out, l) => {
    const previous = out[out.length - 1];
    out.push({ ...l, y: Math.max(24, Math.min(size - 24, Math.max(l.y, previous ? previous.y + 16 : 24))) });
    return out;
  }, []);
  const runs = (s: RadarSeries) => [...topicIndices.keys()].flatMap((topic) => {
    const out: string[][] = []; let run: string[] = [];
    axes.forEach((axis, i) => {
      const v = s.points[i]?.value;
      if (axis.category !== topic || v == null) { if (run.length > 1) out.push(run); run = []; return; }
      const [x, y] = polar(angleOf(i), r * v / 100); run.push(`${x},${y}`);
    });
    if (run.length > 1) out.push(run);
    return out;
  });
  const otherNames = singletonTopics.map(([topic]) => topic);
  return <div className="overflow-hidden"><div className="relative mx-auto w-full max-w-[640px]" onMouseLeave={() => setActive(null)} onClick={() => setActive(null)}>
    <svg viewBox={`0 0 ${size} ${size}`} role="group" aria-label={label} className="mx-auto block h-auto w-full">
      {[25, 50, 75, 100].map((n) => <circle key={n} cx={c} cy={c} r={r * n / 100} fill="none" stroke="currentColor" opacity=".12" />)}
      {sectors.map((sector) => <path key={sector.topic} d={sector.path} fill={sector.eligible ? TOPIC_COLORS[sector.topicIndex % TOPIC_COLORS.length] : 'var(--line, #526071)'} opacity={sector.eligible ? '.35' : '.18'} />)}
      {axes.map((axis, i) => {
        const missing = series.every((s) => s.points[i]?.value == null);
        const [x, y] = polar(angleOf(i), r), [tx, ty] = polar(angleOf(i), missing ? r - 1 : inner);
        return <line key={axis.id} x1={tx} y1={ty} x2={x} y2={y} stroke="currentColor" strokeWidth="1" opacity={missing ? '.25' : '.62'} />;
      })}
      {series.map((s) => runs(s).map((points, k) => <polyline key={`${s.id}-${k}`} points={points.join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} strokeLinejoin="round" />))}
      {series.map((s, si) => s.points.map((p, i) => { if (p.value == null) return null; const [x, y] = at(si, i); return <circle key={`${s.id}-${i}`} cx={x} cy={y} r={active?.s === si && active?.i === i ? 7 : 5} fill={s.color} stroke="var(--surface, #161b22)" strokeWidth="1.5" pointerEvents="none" />; }))}
      {series.map((s, si) => s.points.map((p, i) => { if (p.value == null) return null; const [x, y] = at(si, i); return <RadarHit key={`hit-${s.id}-${i}`} cx={x} cy={y} s={si} i={i} active={active} setActive={setActive} label={`${s.name}, ${axes[i].name}: ${p.label}`} />; }))}
    </svg>
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">{labels.map((l) => <span key={l.topic} className="absolute text-[11px] font-semibold leading-4" style={{ left: `${(l.x / size) * 100}%`, top: `${(l.y / size) * 100}%`, transform: l.right ? 'translateY(-50%)' : 'translate(-100%, -50%)' }}>{l.topic}</span>)}</div>
    <RadarTip active={active} axes={axes} series={series} at={at} width={size} height={size} />
  </div>{otherNames.length ? <p className="bh-muted mt-2 text-center text-xs">Other: {otherNames.join(' · ')}</p> : null}</div>;
}
