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
    // Hover only for real mice: after a tap, browsers send compatibility mouseleave events that would
    // close the tooltip the tap just opened. Touch uses focus and click instead.
    onPointerEnter={(e) => { if (e.pointerType === 'mouse') setActive({ s, i }); }} onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null); }}
    onFocus={() => setActive({ s, i })} onBlur={() => setActive(null)}
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
  return <div role="status" className="pointer-events-none absolute z-10 w-max max-w-[18rem] rounded-lg border border-line bg-[var(--surface,#171e29)] opacity-100 px-3 py-2 text-left text-xs shadow-lg"
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
 *  so a jagged topic stays visible and missing results stay gaps.
 *  `compact` (CR-43.3, the Benchmaxxing expandable row): a smaller, static picture — no per-point hit targets or
 *  tooltip, one accessible name for the whole shape; the full interactive radar stays in the report section.
 *  F-108 (CR-65.18): zero is a ring (radius starts at the spoke start), the rings are labelled, each series gets a
 *  dashed ring at its average position, singleton topics form one trailing "Other" arc, and topic labels wrap inside
 *  the chart instead of being clipped. `rings="position"` labels the rings as plain 0–100 positions (Compare, native). */
export function TopicRadar({ axes: givenAxes, series: givenSeries, label, compact = false, rings = 'percentile', averages = true }: { axes: RadarAxisMeta[]; series: RadarSeries[]; label: string; compact?: boolean; rings?: 'percentile' | 'position'; averages?: boolean }) {
  const [active, setActive] = useState<RadarActive>(null);
  // F-108 (g): topics with fewer than two axes go after every multi-axis topic, so "Other" is one contiguous arc.
  const topicSize = new Map<string, number>();
  givenAxes.forEach((axis) => topicSize.set(axis.category, (topicSize.get(axis.category) ?? 0) + 1));
  const order = givenAxes.map((_, i) => i).sort((x, y) => ((topicSize.get(givenAxes[x].category)! > 1 ? 0 : 1) - (topicSize.get(givenAxes[y].category)! > 1 ? 0 : 1)) || x - y);
  const axes = order.map((i) => givenAxes[i]);
  const series = givenSeries.map((s) => ({ ...s, points: order.map((i) => s.points[i]) }));
  const size = 560, c = size / 2, r = 205, inner = r * 0.18;
  const radius = (v: number) => inner + (r - inner) * Math.max(0, Math.min(100, v)) / 100;
  const polar = (angle: number, radius: number) => [c + Math.cos(angle) * radius, c + Math.sin(angle) * radius] as const;
  const angleOf = (i: number) => -Math.PI / 2 + (i / Math.max(1, axes.length)) * Math.PI * 2;
  const at = (s: number, i: number) => polar(angleOf(i), radius(series[s]?.points[i]?.value ?? 0));
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
    const [rawX, rawY] = polar((sector.start + sector.end) / 2, r + 30);
    return { topic: sector.topic, x: Math.max(100, Math.min(size - 100, rawX)), y: rawY, right: rawX >= c };
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
      const [x, y] = polar(angleOf(i), radius(v)); run.push(`${x},${y}`);
    });
    if (run.length > 1) out.push(run);
    return out;
  });
  // F-108 (a): the series' mean position over its plotted axes, drawn as a dashed reference ring.
  const means = series.map((s) => { const v = s.points.map((p) => p?.value).filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; });
  const pre = rings === 'percentile' ? 'p' : '';
  const otherNames = singletonTopics.map(([topic]) => topic);
  const avgText = means.map((m, k) => m == null ? null : `${series.length > 1 ? `${String.fromCharCode(65 + k)} ` : ''}avg ${pre}${Math.round(m)}`);
  const fullLabel = averages && avgText.some(Boolean) ? `${label} Dashed ring: ${avgText.filter(Boolean).join(', ')}${rings === 'percentile' ? ' (average percentile)' : ''}.` : label;
  return <div className={compact ? "overflow-hidden" : ""}><div className={`relative mx-auto w-full ${compact ? "max-w-[320px]" : "max-w-[640px] px-2 sm:px-0"}`} onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null); }} onClick={() => setActive(null)}>
    <svg viewBox={`0 0 ${size} ${size}`} role={compact ? "img" : "group"} aria-label={fullLabel} className="mx-auto block h-auto w-full" data-topic-radar>
      {[0, 25, 50, 75, 100].map((n) => <circle key={n} cx={c} cy={c} r={radius(n)} fill="none" stroke="currentColor" opacity={n === 0 ? '.2' : '.12'} />)}
      {sectors.map((sector) => <path key={sector.topic} d={sector.path} fill={sector.eligible ? TOPIC_COLORS[sector.topicIndex % TOPIC_COLORS.length] : 'var(--line, #526071)'} opacity={sector.eligible ? '.35' : '.18'} />)}
      {axes.map((axis, i) => {
        const missing = series.every((s) => s.points[i]?.value == null);
        const [x, y] = polar(angleOf(i), r), [tx, ty] = polar(angleOf(i), missing ? r - 1 : inner);
        return <line key={axis.id} x1={tx} y1={ty} x2={x} y2={y} stroke="currentColor" strokeWidth="1" opacity={missing ? '.06' : '.14'} />;
      })}
      {averages && means.map((m, k) => m == null ? null : <circle key={`avg-${k}`} cx={c} cy={c} r={radius(m)} fill="none" stroke={series[k].color} strokeWidth="1" strokeDasharray="4 4" opacity=".55" data-radar-average={Math.round(m)} />)}
      {!compact && <g fontSize="10" fill="currentColor" data-radar-ring-labels>
        {[0, 50, 100].map((n) => <text key={n} x={c - 5} y={c - radius(n) - 3} textAnchor="end" opacity=".6">{n}</text>)}
        <text x={c - 5} y={c - radius(100) + 2} dy="0.9em" textAnchor="end" opacity=".6">{rings === 'percentile' ? 'percentile' : 'position'}</text>
        {averages && series.length === 1 && avgText[0] && <text x={c + 5} y={c - radius(means[0]!) - 3} fill={series[0].color} data-radar-average-label>{avgText[0]}</text>}
      </g>}
      {series.map((s) => runs(s).map((points, k) => <polyline key={`${s.id}-${k}`} points={points.join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} strokeLinejoin="round" />))}
      {series.map((s, si) => s.points.map((p, i) => { if (p?.value == null) return null; const [x, y] = at(si, i); return <circle key={`${s.id}-${i}`} cx={x} cy={y} r={active?.s === si && active?.i === i ? 7 : 5} fill={s.color} stroke="var(--surface, #161b22)" strokeWidth="1.5" pointerEvents="none" />; }))}
      {!compact && series.map((s, si) => s.points.map((p, i) => { if (p?.value == null) return null; const [x, y] = at(si, i); return <RadarHit key={`hit-${s.id}-${i}`} cx={x} cy={y} s={si} i={i} active={active} setActive={setActive} label={`${s.name}, ${axes[i].name}: ${p.label}`} />; }))}
    </svg>
    {/* F-108 (d): a label anchors on its own side and may use only the room between its anchor and that edge, so it wraps instead of leaving the wrapper. */}
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">{labels.map((l) => { const x = (l.x / size) * 100; return <span key={l.topic} data-radar-topic-label className={`absolute font-semibold ${compact ? "text-[9px] leading-3" : "text-[11px] leading-4"} ${l.right ? 'text-left' : 'text-right'}`} style={{ top: `${(l.y / size) * 100}%`, transform: 'translateY(-50%)', ...(l.right ? { left: `${x}%`, maxWidth: `${100 - x}%` } : { right: `${100 - x}%`, maxWidth: `${x}%` }), width: 'max-content', hyphens: 'auto' }} lang="en">{l.topic.replace('/', '/\u200b')}</span>; })}</div>
    {!compact && <RadarTip active={active} axes={axes} series={series} at={at} width={size} height={size} />}
  </div>{averages && series.length > 1 && avgText.some(Boolean) && <p className="bh-muted mt-2 text-center text-xs" data-radar-average-legend>Dashed rings = average {rings === 'percentile' ? 'percentile' : 'position'}: {avgText.filter(Boolean).map((t, k) => <span key={k} className="whitespace-nowrap" style={{ color: series[k].color }} data-radar-average-label>{k ? ' · ' : ''}{t}</span>)}</p>}
    {otherNames.length ? <p className="bh-muted mt-2 text-center text-xs">Other: {otherNames.join(' · ')}</p> : null}</div>;
}
