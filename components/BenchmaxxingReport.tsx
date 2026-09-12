"use client";
import { useEffect, useMemo, useState } from 'react';

type Model = { id: string; name: string; org: string };
type Axis = { id: string; name: string; version: string; category: string; value: number | null; missing: boolean };
type Report = { status: 'scored' | 'insufficient-coverage'; score: number | null; coverage: number; domainSpecialization: number | null; profile: { axes: Axis[]; measured: number; total: number }; jumps: { category: string; magnitude: number }[] };

function Radar({ axes }: { axes: Axis[] }) {
  const size = 560; const c = size / 2; const r = 205;
  const point = (axis: Axis, index: number) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    const distance = axis.value == null ? 0 : r * axis.value / 100;
    return [c + Math.cos(angle) * distance, c + Math.sin(angle) * distance] as const;
  };
  const segments: string[] = []; let current: string[] = [];
  axes.forEach((axis, i) => { if (axis.value == null) { if (current.length > 1) segments.push(current.join(' ')); current = []; } else { const [x, y] = point(axis, i); current.push(`${x},${y}`); } });
  if (current.length > 1) segments.push(current.join(' '));
  const categories = [...new Set(axes.map((axis) => axis.category))];
  return <div className="overflow-x-auto"><svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Many-axis radar, ordered clockwise by related benchmark topic; gaps indicate missing measured scores" className="mx-auto min-w-[420px] max-w-full">
    {[25, 50, 75, 100].map((n) => <circle key={n} cx={c} cy={c} r={r * n / 100} fill="none" stroke="currentColor" opacity=".12" />)}
    {axes.map((axis, i) => { const angle = -Math.PI / 2 + (i / axes.length) * Math.PI * 2; const x = c + Math.cos(angle) * r; const y = c + Math.sin(angle) * r; return <g key={axis.id}><line x1={c} y1={c} x2={x} y2={y} stroke="currentColor" opacity=".18" /><title>{`${axis.category}: ${axis.name} ${axis.version}${axis.missing ? ' — no measured score' : ` — percentile ${axis.value?.toFixed(0)}`}`}</title></g>; })}
    {segments.map((points, i) => <polyline key={i} points={points} fill="rgba(78, 159, 255, .20)" stroke="#35a7ff" strokeWidth="3" strokeLinejoin="round" />)}
    {axes.map((axis, i) => { if (axis.value == null) return null; const [x, y] = point(axis, i); return <circle key={axis.id} cx={x} cy={y} r="4" fill="#ffd34e"><title>{axis.name}</title></circle>; })}
    {categories.map((category) => <text key={category} x={16} y={28 + categories.indexOf(category) * 18} fill="currentColor" opacity=".75" fontSize="13">{category}</text>)}
  </svg></div>;
}

export function BenchmaxxingReport({ models, initial }: { models: Model[]; initial: Report | null }) {
  const [id, setId] = useState(models[0]?.id ?? ''); const [report, setReport] = useState<Report | null>(initial); const [loading, setLoading] = useState(false);
  useEffect(() => { if (!id) return; setLoading(true); fetch(`/api/benchmaxxing?report=${encodeURIComponent(id)}`).then((r) => r.ok ? r.json() : Promise.reject()).then((x) => setReport(x.report)).catch(() => setReport(null)).finally(() => setLoading(false)); }, [id]);
  const grouped = useMemo(() => report?.profile.axes.reduce<Record<string, Axis[]>>((out, axis) => { (out[axis.category] ||= []).push(axis); return out; }, {}) ?? {}, [report]);
  return <section className="bh-panel mt-6 p-5" aria-label="Per-model Benchmaxxing report">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="bh-eyebrow">PER-MODEL REPORT</p><h2 className="text-xl font-semibold">One anomaly score. The full shape beside it.</h2></div><label className="text-sm">Model <select value={id} onChange={(e) => setId(e.target.value)} className="ml-2 rounded border border-line bg-ink p-2">{models.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.org}</option>)}</select></label></div>
    {loading ? <p className="bh-muted mt-5">Calculating measured-score profile…</p> : !report ? <p className="bh-muted mt-5">Report unavailable.</p> : <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><div><Radar axes={report.profile.axes} /><p className="bh-muted text-xs">Axes are grouped clockwise by topic. A blue line only joins consecutive measured axes; gaps are deliberately left open.</p></div><aside className="rounded-xl border border-line p-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Benchmaxxing signal</p>{report.status === 'scored' ? <><p className="mt-2 text-5xl font-bold tabular">{report.score?.toFixed(1)}</p><p className="bh-muted mt-2 text-sm">Average within-topic percentile jump. Higher means more uneven results among related benchmarks.</p><dl className="mt-4 space-y-2 text-sm"><div><dt className="bh-muted">Measured coverage</dt><dd>{report.profile.measured}/{report.profile.total} axes ({(report.coverage * 100).toFixed(0)}%)</dd></div><div><dt className="bh-muted">Domain specialization</dt><dd>{report.domainSpecialization?.toFixed(1)} — disclosed, not added to the score</dd></div></dl></> : <><p className="mt-3 text-lg font-semibold">Not enough coverage</p><p className="bh-muted mt-2 text-sm">{report.profile.measured}/{report.profile.total} measured axes. No score is synthesized from missing results.</p></>}</aside></div>}
    {report && <details className="mt-5 text-sm"><summary className="cursor-pointer font-medium">Advanced details: topic groups and method</summary><div className="bh-muted mt-3 grid gap-3 md:grid-cols-2">{Object.entries(grouped).map(([topic, axes]) => <div key={topic}><b>{topic}</b><p>{axes.map((axis) => `${axis.name}${axis.missing ? ' (gap)' : ''}`).join(' · ')}</p></div>)}<p className="md:col-span-2">Scores are percentile-normalized within each exact benchmark cohort, then only adjacent measured axes within the same topic contribute to the anomaly signal. This is a descriptive inconsistency signal, not evidence that a benchmark leaked into training or that any training team acted improperly.</p></div></details>}
  </section>;
}
