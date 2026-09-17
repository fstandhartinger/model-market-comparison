"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { TopicRadar } from './TopicRadar';
import { SignalValue } from './SignalValue';
import { formatRadarValue } from '../lib/radar.mjs';
import type { BenchmaxxingLevel } from '../lib/benchmaxxing-levels.mjs';

export type BenchmaxxingModel = { id: string; name: string; org: string; composite: number | null; coverageAxes: number; totalAxes: number; tagged: boolean; level?: BenchmaxxingLevel | null };
type Axis = { id: string; name: string; version: string; category: string; value: number | null; nativeValue?: number | null; observedDate?: string | null; unit: string; missing: boolean; tier?: string; side?: 'headline' | 'heldout' | null };
type Pair = { category: string; headline: { id: string; name: string }; heldout: { id: string; name: string }; headlinePercentile: number; heldoutPercentile: number; gap: number; cohort: number };
export type BenchmaxxingReportData = { status: 'scored' | 'insufficient-coverage'; score: number | null; coverage: number; domainSpecialization: number | null; profile: { axes: Axis[]; measured: number; total: number }; comparisons: number; topics: number; rule: { minComparisons: number; minTopics: number };
  rawScore?: number | null; headlineBoards?: number; heldoutBoards?: number; pairCount?: number; drivers?: { positive: Pair[]; negative: Pair[] }; shrinkage?: { priorMean: number; k: number }; interval?: { lower: number; upper: number; level: number } | null };

const SERIES = [{ color: '#35a7ff', dash: undefined }, { color: '#f5b65b', dash: '7 4' }];

const signed = (x: number) => `${x > 0 ? '+' : ''}${x.toFixed(1)}`;

/** CR-68.3 / CR-69.4: the pairs that move the score most, both ways, with the numbers behind the shrunk score. */
function Drivers({ report }: { report: BenchmaxxingReportData }) {
  const d = report.drivers;
  if (!d || (!d.positive.length && !d.negative.length)) return null;
  const list = (pairs: Pair[], label: string) => pairs.length ? <div><p className="bh-muted text-xs font-semibold uppercase tracking-wide">{label}</p><ul className="mt-1 space-y-1">{pairs.map((p) => <li key={`${p.headline.id}|${p.heldout.id}`} className="leading-5">
    <span className="tabular font-semibold">{signed(p.gap)}</span> {p.headline.name} <span className="bh-muted">p{Math.round(p.headlinePercentile)}</span> vs {p.heldout.name} <span className="bh-muted">p{Math.round(p.heldoutPercentile)} · {p.category} · {p.cohort} models on both</span>
  </li>)}</ul></div> : null;
  return <div className="mt-4 space-y-3 text-sm" data-bmx-drivers>
    <p className="font-medium">What drives this score</p>
    {list(d.positive, 'Better on the headline board')}
    {list(d.negative, 'Better on the held-out board')}
    <p className="bh-muted text-xs" data-bmx-drivers-math>Mean gap {report.rawScore == null ? '—' : signed(report.rawScore)} over {report.pairCount} pairs · n = {report.comparisons} ({report.headlineBoards} headline + {report.heldoutBoards} held-out boards − 1){report.shrinkage ? ` · pulled toward 0 by n / (n + k), k = ${report.shrinkage.k.toFixed(1)}` : ''}{report.interval ? ` · ${Math.round(report.interval.level * 100)} % interval ${signed(report.interval.lower)} … ${signed(report.interval.upper)}` : ''}.</p>
    <p className="bh-muted text-xs">Differences between topics (strong at coding, weaker at maths) are specialisation and are not counted, so a radar that is jagged between topics is not a flag.{report.domainSpecialization != null ? ` This model's specialisation: ${report.domainSpecialization.toFixed(1)} percentile points between its best and weakest topic.` : ''}</p>
  </div>;
}

function SignalCard({ name, slot, compare, report, level }: { name: string; slot: number; compare: boolean; report: BenchmaxxingReportData; level?: BenchmaxxingLevel | null }) {
  return <aside className="rounded-xl border border-line p-4" style={compare ? { borderLeft: `3px solid ${SERIES[slot].color}` } : undefined}>
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{compare ? `${String.fromCharCode(65 + slot)} · ` : ''}Benchmaxxing signal</p>
    {compare && <p className="mt-1 truncate text-sm font-medium">{name}</p>}
    {report.status === 'scored' ? <>
      <p className="mt-2"><SignalValue score={report.score ?? 0} level={level} large /></p>
      <p className="bh-muted mt-2 text-sm">Plus = ranks higher on famous public benchmarks than on held-out ones nobody can train for; minus = the other way round; zero = no sign. Percentile points, same topic only.</p>
      <Drivers report={report} />
    </> : <><p className="mt-3 text-lg font-semibold">Not enough coverage</p><p className="bh-muted mt-2 text-sm">{report.profile.measured}/{report.profile.total} measured axes; n = {report.comparisons} headline/held-out boards in {report.topics} {report.topics === 1 ? 'topic' : 'topics'} — a score needs n ≥ {report.rule.minComparisons} in {report.rule.minTopics} topics. No score is synthesized from missing results.</p></>}
  </aside>;
}

/** CR-15.4: the report has no model selector of its own; it shows the row(s) selected in the table
 *  above, and in compare mode draws both models on one topic radar with their signals side by side. */
export function BenchmaxxingReport({ models, ids, initial, compare, onToggleCompare, focusOnReady = false, onFocused }: { models: BenchmaxxingModel[]; ids: string[]; initial: { id: string; report: BenchmaxxingReportData } | null; compare: boolean; onToggleCompare: () => void; focusOnReady?: boolean; onFocused?: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [reports, setReports] = useState<Record<string, BenchmaxxingReportData | null>>(initial ? { [initial.id]: initial.report } : {});
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const missing = ids.filter((id) => !(id in reports));
    if (!missing.length) return;
    setLoading(true);
    Promise.all(missing.map((id) => fetch(`/api/benchmaxxing?report=${encodeURIComponent(id)}`).then((r) => r.ok ? r.json() : null).then((x) => [id, x?.report ?? null] as const).catch(() => [id, null] as const)))
      .then((entries) => setReports((old) => ({ ...old, ...Object.fromEntries(entries) }))).finally(() => setLoading(false));
  }, [ids, reports]);
  const shown = ids.map((id) => ({ id, name: models.find((m) => m.id === id)?.name ?? id, report: reports[id] }));
  const ready = shown.length > 0 && shown.every((s) => s.report);
  const grouped = useMemo(() => shown[0]?.report?.profile.axes.reduce<Record<string, Axis[]>>((out, axis) => { (out[axis.category] ||= []).push(axis); return out; }, {}) ?? {}, [shown[0]?.report]);
  // Every profile lists the same axes in the same topic order; align by id all the same.
  const byId = shown.map((s) => new Map((s.report?.profile.axes ?? []).map((a) => [a.id, a])));
  // CR-74.2: the radar always shows the axes at least one shown model has a result for (the "Show all axes" box is gone).
  const radarAxes = (shown[0]?.report?.profile.axes ?? []).filter((a) => byId.some((m) => { const x = m.get(a.id); return x && !x.missing; }));
  const series = shown.map((s, k) => ({ id: s.id, name: s.name, color: SERIES[k].color, dash: SERIES[k].dash, points: radarAxes.map((a) => {
    const x = byId[k].get(a.id);
    return { value: x && !x.missing ? x.value : null, label: !x || x.missing || x.value == null ? 'No measured score' : `${formatRadarValue(x.nativeValue, x.unit)} · percentile ${Math.round(x.value)}${x.observedDate ? ` · observed ${x.observedDate}` : ''}` };
  }) }));
  // F-104: a deep link (`?model=<id>#radar`, e.g. from the Overview tag) lands on this section once the
  // selected model's report is ready — scrolled into view and focused, the page <h1> unchanged.
  useEffect(() => {
    if (!focusOnReady || !ready || !sectionRef.current) return;
    sectionRef.current.scrollIntoView({ block: 'start' });
    sectionRef.current.focus({ preventScroll: true });
    onFocused?.();
  }, [focusOnReady, ready, onFocused]);
  const title = shown.length ? shown.map((s) => s.name).join(' vs ') : 'Select a model in the table above';
  return <section ref={sectionRef} id="radar" tabIndex={-1} className="bh-panel mt-6 scroll-mt-6 p-5 focus:outline-none focus-visible:outline-accent" aria-label="Per-model Benchmaxxing report" aria-live="polite">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><p className="bh-eyebrow">PER-MODEL REPORT</p><h2 className="text-xl font-semibold">{title}</h2><p className="bh-muted mt-1 text-sm">{compare ? 'Compare mode: A stays; select another row above to change B.' : 'Follows the row selected in the table above.'}</p></div>
      <button type="button" className="bh-button min-h-9 px-3" aria-pressed={compare} onClick={onToggleCompare} disabled={!ids.length}>{compare ? 'Close side-by-side' : 'Compare side by side'}</button>
    </div>
    {!shown.length ? <p className="bh-muted mt-5">No model selected.</p> : loading && !ready ? <p className="bh-muted mt-5">Calculating measured-score profile…</p> : !ready ? <p className="bh-muted mt-5">Report unavailable.</p> : <div className={`mt-5 grid grid-cols-1 gap-6 ${compare ? '' : 'lg:grid-cols-[minmax(0,1fr)_300px]'}`}>
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {compare ? <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Chart legend">{series.map((s, k) => <li key={s.id} className="flex items-center gap-2"><svg width="24" height="10" aria-hidden="true"><line x1="0" y1="5" x2="24" y2="5" stroke={s.color} strokeWidth="3" strokeDasharray={s.dash} /></svg>{String.fromCharCode(65 + k)} · {s.name}</li>)}</ul> : <span className="bh-muted text-xs">{radarAxes.length} measured axes shown</span>}
        </div>
        <p className="mb-2 text-sm font-medium" data-jagged-note>The score compares headline boards (● filled) with held-out boards (○ hollow) of the same topic; greyed points are boards the score does not use. A jagged shape between topics is specialisation, not a flag — a flag is a screen, not proof.</p>
        <TopicRadar markSides axes={radarAxes} series={series} label="Many-axis radar, ordered clockwise by related benchmark topic; gaps indicate missing measured scores. Each point is focusable and announces its value." />
        <p className="bh-muted text-xs" data-radar-axes-note>Axes: the {radarAxes.length} benchmarks {compare ? 'either model has' : 'this model has'} results for, grouped clockwise by topic. Dashed ring = {compare ? "each model's" : "this model's"} average percentile.</p>
      </div>
      <div className={compare ? 'grid gap-4 md:grid-cols-2' : 'space-y-5 lg:flex lg:h-full lg:flex-col lg:gap-5 lg:space-y-0'}>
        {shown.map((s, k) => <SignalCard key={s.id} name={s.name} slot={k} compare={compare} report={s.report!} level={models.find((m) => m.id === s.id)?.level ?? null} />)}
        <details className={`text-sm ${compare ? 'md:col-span-2' : 'lg:min-h-0 lg:flex-1'}`}><summary className="cursor-pointer font-medium">Advanced details: topic groups and method</summary><div className="bh-muted mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-1">{Object.entries(grouped).map(([topic, axes]) => <div key={topic}><b>{topic}</b><p>{axes.map((axis) => `${axis.name}${axis.side === 'headline' ? ' (headline)' : axis.side === 'heldout' ? ' (held-out)' : ''}${axis.missing ? ' (gap)' : ''}`).join(' · ')}</p></div>)}<p className="md:col-span-2 lg:col-span-1">The radar shows each benchmark's percentile within its own exact cohort. The signal compares each headline board with each held-out board of the same topic, both ranked among the models measured on both. This is a descriptive screening signal, not evidence that a benchmark leaked into training or that any training team acted improperly.</p></div></details>
      </div>
    </div>}
  </section>;
}
