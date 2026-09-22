import Link from 'next/link';
import type { BenchmarkView } from '../lib/benchmark-view.mjs';
import { latestScores } from '../lib/benchmark-view.mjs';
import { AnomalySummary } from './BenchmarkEvidence';
import { LazyMissingCoverage, SheetRows, type SheetRow } from './BenchmarkSheetLazy';
import { InfoTip } from './InfoTip';
import { counted } from '../lib/format';
import { humanVersion, versionSuffix } from '../lib/version-label';
import type { CompositeAttachment, CompositeSlot } from '../lib/client-model';
import { formatNative } from '../lib/benchmark-matrix.mjs';

// CR-63.6: the same formatting as the Benchmarks page (fractions as %, USD with $, Elo named).
const nativeValue = (value: number, unit: string | null) => formatNative(value, unit);

/** F-08b: a release-post style sheet — one bar row per benchmark version, the model's catalog
 *  percentile as the bar, native value and date beside it; provenance in the row's expand.
 *  `percentiles` are computed on the full catalog view (this view is filtered to one model). */
export function BenchmarkSheet({ view, modelId, percentiles, attachments = {} }: { view: BenchmarkView; modelId: string; percentiles: Record<string, number | null>; attachments?: Partial<Record<CompositeSlot, CompositeAttachment>> }) {
  const axes = view.axes.filter((a) => a.scores.some((r) => r.modelId === modelId));
  const versions = new Set(axes.filter((a) => !a.id.startsWith('aa_coding_index') && !a.id.startsWith('aa_intelligence_index') && !a.id.startsWith('frontend') && !a.id.startsWith('fullstack')).map((a) => a.benchmarkId)).size;
  const categories = [...new Set(axes.map((a) => a.category))].sort();
  const sheetRows = axes.map((a): SheetRow => {
    const rows = a.scores.filter((r) => r.modelId === modelId);
    const shown = latestScores(rows)[0] ?? rows[0];
    return { axisId: a.id, benchmarkId: a.benchmarkId, name: a.name, suffix: versionSuffix(a.name, a.version) ?? null, versionLabel: humanVersion(a.version).label,
      pct: percentiles[a.id] ?? null, lowSample: !!shown?.lowSample, value: shown ? nativeValue(shown.value, a.unit) : null, basis: shown?.basis ?? null, date: shown?.date ? shown.date.slice(0, 10) : '',
      cohort: a.cohort || null, description: a.description || null };
  });
  const vendorRows = sheetRows.filter((row) => row.basis === 'self_reported');
  // CR-127.4: the sheet explains † but had nothing to say about ‡, which it was also rendering unmarked.
  const preliminaryRows = sheetRows.filter((row) => row.basis === 'preliminary');
  const vendorOrg = view.models.find((model) => model.id === modelId)?.org || 'the developer';
  const absent = [...new Map(view.axes.filter((a) => !axes.some((present) => present.benchmarkId === a.benchmarkId)).map((a) => [a.benchmarkId, a])).values()];
  const attachedEntries = Object.values(attachments);
  return <section id="benchmark-sheet" className="mt-8 scroll-mt-6 space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold">Benchmark sheet</h2><p className="bh-muted mt-1 text-sm">{versions} of {view.registryCount} registered benchmark versions · bars show the percentile among all models measured on each benchmark.</p>{vendorRows.length > 0 && <p className="bh-muted mt-2 text-xs" data-bh-sheet-vendor-line>{vendorRows.length} of {counted(sheetRows.length, "value")} {sheetRows.length === 1 ? "is" : "are"} {vendorOrg}&apos;s own claim{sheetRows.length === 1 ? "" : "s"} (†), not independent measurements; a matching independent result replaces a claim as soon as one exists.</p>}{preliminaryRows.length > 0 && <p className="bh-muted mt-2 text-xs" data-bh-sheet-preliminary-line>{preliminaryRows.length} of {counted(sheetRows.length, "value")} {sheetRows.length === 1 ? "is an" : "are"} announced, chart-read figure{sheetRows.length === 1 ? "" : "s"} (‡): shown only, and never entering a score, a ranking or a percentile.</p>}{attachedEntries.length > 0 && <div className="bh-muted mt-2 text-xs" role="note" aria-label="Composite attached inputs"><span className="font-medium text-gray-300">Composite attachments</span> <span>(used in the score, not counted as exact benchmarks):</span><ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{attachedEntries.map((attachment) => <li key={attachment.label} className="inline-flex items-center gap-1"><span>{attachment.label} · attached</span><InfoTip title={`${attachment.label} attachment`} label={`explain ${attachment.label} attachment`}>{attachment.note}</InfoTip></li>)}</ul></div>}</div><Link className="bh-button" href={`/compare?model=${encodeURIComponent(modelId)}`}>Compare this model →</Link></div>
    <div className="grid items-start gap-5 lg:grid-cols-2">
    {categories.map((category) => <section key={category} className="bh-panel min-w-0 p-4" aria-label={`${category} benchmarks`}>
      <h3 className="mb-2 text-base font-semibold">{category}</h3>
      {/* CR-62.1: compact row data for a client list — a server-rendered tree of these rows cost ~2.5× its HTML in the flight payload. */}
      <SheetRows modelId={modelId} rows={sheetRows.filter((row) => axes.find((a) => a.id === row.axisId)?.category === category)} />
    </section>)}
    </div>
    {!axes.length && <div className="bh-empty">No verified benchmark observation is attached to this exact configuration yet. Provider pricing can still be available.</div>}
    <AnomalyPanel view={view} modelId={modelId} />
    <LazyMissingCoverage modelId={modelId} count={absent.length} />
  </section>;
}

// F-08a: the anomaly panel renders nothing without flags, so its card must not render empty.
function AnomalyPanel({ view, modelId }: { view: BenchmarkView; modelId: string }) {
  const panel = AnomalySummary({ view, modelId });
  return panel ? <div className="bh-panel p-5">{panel}</div> : null;
}
