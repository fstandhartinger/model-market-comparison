"use client";
import { useEffect, useMemo, useState } from 'react';

type Model = { id: string; name: string; org: string; composite: number | null; coverageAxes: number; totalAxes: number; tagged: boolean };
type Axis = { id: string; name: string; version: string; category: string; value: number | null; nativeValue?: number | null; observedDate?: string | null; unit: string; missing: boolean };
type Report = { status: 'scored' | 'insufficient-coverage'; score: number | null; coverage: number; domainSpecialization: number | null; profile: { axes: Axis[]; measured: number; total: number }; comparisons: number; topics: number; rule: { minComparisons: number; minTopics: number } };

function Radar({ axes }: { axes: Axis[] }) {
  const size = 560; const c = size / 2; const r = 205; const inner = r * 0.18;
  const topicIndices = new Map<string, number[]>();
  axes.forEach((axis, index) => topicIndices.set(axis.category, [...(topicIndices.get(axis.category) ?? []), index]));
  const colors = ['#5b9dff', '#7ee0c0', '#f5b65b', '#cc9aff', '#ff8aa8', '#8bd3ff', '#d5e88f', '#f3a683'];
  const polar = (angle: number, radius: number) => [c + Math.cos(angle) * radius, c + Math.sin(angle) * radius] as const;
  const point = (axis: Axis, index: number) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    const distance = axis.value == null ? 0 : r * axis.value / 100;
    return [c + Math.cos(angle) * distance, c + Math.sin(angle) * distance] as const;
  };
  const topicSegments = [...topicIndices.keys()].flatMap((topic) => {
    const runs: string[][] = []; let run: string[] = [];
    axes.forEach((axis, i) => {
      if (axis.category !== topic || axis.value == null) { if (run.length > 1) runs.push(run); run = []; return; }
      const [x, y] = point(axis, i); run.push(`${x},${y}`);
    });
    if (run.length > 1) runs.push(run);
    return runs;
  });
  const singletonTopics = [...topicIndices.entries()].filter(([, indices]) => indices.length < 2);
  const groupedSectors = [...topicIndices.entries()].filter(([, indices]) => indices.length >= 2);
  if (singletonTopics.length) groupedSectors.push(['Other', singletonTopics.flatMap(([, indices]) => indices)]);
  const rawSectors = groupedSectors.map(([topic, indices], topicIndex) => {
    const start = -Math.PI / 2 + (Math.min(...indices) / axes.length) * Math.PI * 2;
    const end = -Math.PI / 2 + ((Math.max(...indices) + 1) / axes.length) * Math.PI * 2;
    const degrees = ((end - start) * 180) / Math.PI;
    return { topic, indices, topicIndex, start, end, degrees, eligible: topic !== 'Other' && indices.length >= 2 };
  }).sort((a, b) => a.start - b.start);
  const otherNames = singletonTopics.map(([topic]) => topic);
  const sectorPaths = rawSectors.map((sector) => {
    const { topic, topicIndex, start, end } = sector;
    const [a, b, d, e] = [polar(start, r), polar(start, r + 10), polar(end, r), polar(end, r + 10)];
    const large = end - start > Math.PI ? 1 : 0;
    return { ...sector, path: `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} A ${r + 10} ${r + 10} 0 ${large} 1 ${e[0]} ${e[1]} L ${d[0]} ${d[1]} A ${r} ${r} 0 ${large} 0 ${a[0]} ${a[1]} Z` };
  });
  const labels = rawSectors.filter((sector) => sector.eligible).map((sector) => {
    const mid = (sector.start + sector.end) / 2;
    const [rawX, rawY] = polar(mid, r + 38);
    const right = rawX >= c;
    return { topic: sector.topic, x: Math.max(110, Math.min(size - 110, rawX)), y: rawY, right };
  }).sort((a, b) => a.y - b.y).reduce<Array<{ topic: string; x: number; y: number; right: boolean }>>((out, label) => {
    const previous = out[out.length - 1];
    const y = Math.max(24, Math.min(size - 24, Math.max(label.y, previous ? previous.y + 16 : 24)));
    out.push({ ...label, y });
    return out;
  }, []);
  return <div className="overflow-hidden"><div className="relative mx-auto w-full max-w-[640px]"><svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Many-axis radar, ordered clockwise by related benchmark topic; gaps indicate missing measured scores" className="mx-auto block h-auto w-full">
    {[25, 50, 75, 100].map((n) => <circle key={n} cx={c} cy={c} r={r * n / 100} fill="none" stroke="currentColor" opacity=".12" />)}
    {sectorPaths.map((sector) => <path key={sector.topic} d={sector.path} fill={sector.eligible ? colors[sector.topicIndex % colors.length] : 'var(--line, #526071)'} opacity={sector.eligible ? '.35' : '.18'} />)}
    {axes.map((axis, i) => {
      const angle = -Math.PI / 2 + (i / axes.length) * Math.PI * 2;
      const [x, y] = polar(angle, r);
      const [tx, ty] = polar(angle, axis.missing ? r - 1 : inner);
      return <g key={axis.id}>{axis.missing ? <line x1={tx} y1={ty} x2={x} y2={y} stroke="currentColor" strokeWidth="1" opacity=".25" /> : <line x1={tx} y1={ty} x2={x} y2={y} stroke="currentColor" strokeWidth="1" opacity=".62" />}<title>{`${axis.category}: ${axis.name} ${axis.version}${axis.missing ? ' — no measured score' : ` — ${axis.nativeValue} ${axis.unit}; percentile ${axis.value?.toFixed(1)}`}`}</title></g>;
    })}
    {topicSegments.map((points, i) => <polyline key={i} points={points.join(' ')} fill="none" stroke="#35a7ff" strokeWidth="2" strokeLinejoin="round" />)}
    {axes.map((axis, i) => { if (axis.value == null) return null; const [x, y] = point(axis, i); return <circle key={axis.id} cx={x} cy={y} r="5" fill="#35a7ff" stroke="var(--surface, #161b22)" strokeWidth="1.5"><title>{`${axis.category} · ${axis.name}: ${axis.nativeValue} ${axis.unit}; percentile ${axis.value.toFixed(1)}${axis.observedDate ? `; observed ${axis.observedDate}` : ''}`}</title></circle>; })}
  </svg><div className="pointer-events-none absolute inset-0" aria-hidden="true">{labels.map((label) => <span key={label.topic} className="absolute text-[11px] font-semibold leading-4" style={{ left: `${(label.x / size) * 100}%`, top: `${(label.y / size) * 100}%`, transform: label.right ? 'translateY(-50%)' : 'translate(-100%, -50%)' }}>{label.topic}</span>)}</div></div>{otherNames.length ? <p className="bh-muted mt-2 text-center text-xs">Other: {otherNames.join(' · ')}</p> : null}</div>;
}

export function BenchmaxxingReport({ models, initial, initialModelId }: { models: Model[]; initial: Report | null; initialModelId?: string }) {
  const [id, setId] = useState(initialModelId ?? models[0]?.id ?? ''); const [report, setReport] = useState<Report | null>(initial); const [loading, setLoading] = useState(false); const [showAllAxes, setShowAllAxes] = useState(false);
  useEffect(() => { if (!id) return; setLoading(true); fetch(`/api/benchmaxxing?report=${encodeURIComponent(id)}`).then((r) => r.ok ? r.json() : Promise.reject()).then((x) => setReport(x.report)).catch(() => setReport(null)).finally(() => setLoading(false)); }, [id]);
  useEffect(() => { setShowAllAxes(false); }, [id]);
  const grouped = useMemo(() => report?.profile.axes.reduce<Record<string, Axis[]>>((out, axis) => { (out[axis.category] ||= []).push(axis); return out; }, {}) ?? {}, [report]);
  const radarAxes = report ? (showAllAxes ? report.profile.axes : report.profile.axes.filter((axis) => !axis.missing)) : [];
  return <section className="bh-panel mt-6 p-5" aria-label="Per-model Benchmaxxing report">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="bh-eyebrow">PER-MODEL REPORT</p><h2 className="text-xl font-semibold">One anomaly score. The full shape beside it.</h2></div><label className="flex max-w-full min-w-0 flex-1 items-center text-sm sm:flex-none">Model <span className="bh-muted ml-1 text-xs">(<span className="text-warn">▲</span> = tagged)</span> <select value={id} onChange={(e) => setId(e.target.value)} className="ml-2 min-w-0 flex-1 rounded border border-line bg-ink p-2">{models.map((m) => <option key={m.id} value={m.id}>{m.tagged ? '▲ ' : ''}{m.name} — {m.org} · {m.coverageAxes}/{m.totalAxes} measured</option>)}</select></label></div>
    {loading ? <p className="bh-muted mt-5">Calculating measured-score profile…</p> : !report ? <p className="bh-muted mt-5">Report unavailable.</p> : <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><div><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="bh-muted text-xs">{radarAxes.length} measured axes shown{showAllAxes ? ` · ${report.profile.total} total` : ''}</span><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={showAllAxes} onChange={(e) => setShowAllAxes(e.target.checked)} />Show all {report.profile.total} axes</label></div><Radar axes={radarAxes} /><p className="bh-muted text-xs">Axes are the {radarAxes.length} benchmarks this model has results for, grouped clockwise by topic; a jagged outline inside one topic is the Benchmaxxing pattern.</p></div><aside className="self-start rounded-xl border border-line p-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Benchmaxxing signal</p>{report.status === 'scored' ? <><p className="mt-2 text-5xl font-bold tabular">{report.score?.toFixed(1)}</p><p className="bh-muted mt-2 text-sm">Within-topic percentile spread, adjusted for coverage. Higher means more uneven results among related benchmarks.</p><dl className="mt-4 space-y-2 text-sm"><div><dt className="bh-muted">Related comparisons</dt><dd>{report.comparisons} in {report.topics} topics</dd></div><div><dt className="bh-muted">Measured coverage</dt><dd>{report.profile.measured}/{report.profile.total} axes ({(report.coverage * 100).toFixed(0)}%)</dd></div><div><dt className="bh-muted">Domain specialization</dt><dd>{report.domainSpecialization?.toFixed(1)} — disclosed, not added to the score</dd></div></dl></> : <><p className="mt-3 text-lg font-semibold">Not enough coverage</p><p className="bh-muted mt-2 text-sm">{report.profile.measured}/{report.profile.total} measured axes, {report.comparisons} related comparisons in {report.topics} topics — a score needs {report.rule.minComparisons} in {report.rule.minTopics}. No score is synthesized from missing results.</p></>}</aside></div>}
    {report && <details className="mt-5 text-sm"><summary className="cursor-pointer font-medium">Advanced details: topic groups and method</summary><div className="bh-muted mt-3 grid gap-3 md:grid-cols-2">{Object.entries(grouped).map(([topic, axes]) => <div key={topic}><b>{topic}</b><p>{axes.map((axis) => `${axis.name}${axis.missing ? ' (gap)' : ''}`).join(' · ')}</p></div>)}<p className="md:col-span-2">Scores are percentile-normalized within each exact benchmark cohort, then only differences between measured axes within the same topic contribute to the anomaly signal. This is a descriptive inconsistency signal, not evidence that a benchmark leaked into training or that any training team acted improperly.</p></div></details>}
  </section>;
}
