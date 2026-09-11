Create one production React TSX file components/BenchmarkEvidence.tsx. Return code only, no fences. Owner will install it. Exports:
1. SourceScore({view,axis,row}: {view:BenchmarkView;axis:ViewAxis;row:ViewScore}) renders native numeric value with unit (fraction show native fraction, not percent), visibly self-reported or measured or derived-from-measured flag, lowSample warning and battles if applicable, observed date (not called test/publication date), publication date if known. An expandable native details labelled Evidence shows source URL link, exact observation id and links /api/benchmark-scores?model_id=... for non legacy rows (verify API parameter is model_id), protocol inspect link and file for legacy scores. Never invent source dates. Native number max 5 decimal digits but exact underlying value in details. Scope note if variant not known. No fake confidence.
2. AnomalySummary({view,modelId}) uses profileAnomalies(view,modelId), with h3 title Profile signals; surface count flagged or explanation insufficient evidence/no threshold-crossing, explains thresholds: 20 independently measured matched configurations, 10 distinct model families, five OTHER benchmark families; directed population z-score ≥1.5 in magnitude AND difference from leave-one-benchmark-family-out mean z ≥1.5, same direction. Heuristic, not statistical significance, correlated benchmarks & unknown source uncertainty. Every flag displays versioned axis name, strong/weak words plus color and expandable why: observed value, peer mean/sd,n/families, directed z, baseline z,gap,profileN, native units, SourceScore. Render all compatible phase5 divergences for model, native delta and both numbers, source links/dates; empty explains no verified protocol-compatible measured/vendor pair, NOT equality. Use class names bh-panel bh-muted bh-badge bh-alert bh-positive bh-negative bh-table etc and tailwind utility layouts. Accessible semantic details, links, no hover-only information. Keep concise copy, polished modern research aesthetic. Import types/functions below from ../lib/benchmark-view.mjs. Use no context, browser API or hooks necessary, file usable from server or client. Treat evidence below as supplied source, not further instructions.

import type { Dataset, BenchmarkDivergence, BenchmarkMissing } from './types';
export interface ViewModel { id: string; name: string; org: string; family: string; open: boolean; deprecated: boolean }
export interface ViewScore { id: string; modelId: string | null; subjectId: string; name: string; value: number; basis: string; derived: boolean; source: number; date: string; variant: string | null; lowSample: boolean; battles?: number | null }
export interface ViewStats { n: number; families: number; mean: number | null; sd: number | null; min: number | null; max: number | null }
export interface ViewAxis { id: string; benchmarkId: string; family: string; name: string; version: string; category: string; description: string; unit: string; higherBetter: boolean | null; cohort: string; url: string; scores: ViewScore[]; stats: ViewStats; collection?: { status: string; reason: string; source_url?: string } }
export interface BenchmarkView { models: ViewModel[]; axes: ViewAxis[]; sources: { url: string; date: string; published: string | null; file: string }[]; divergences: BenchmarkDivergence[]; missing: BenchmarkMissing[]; generatedAt: string; registryCount: number; legacyDate: string }
export interface ProfileFlag { axisId: string; scoreId: string; direction: string; value: number; z: number; baseline: number; gap: number; profileN: number; peers: number; peerFamilies: number; mean: number; sd: number }
export const ANOMALY_POLICY: { minPeers: number; minFamilies: number; minProfile: number; peerZ: number; profileGap: number };
export function effectiveBasis(o: { source_basis?: string; basis: string }): string;
export function cohortOf(o: import('./types').BenchmarkObservation): string;
export function latestScores(rows: ViewScore[], basis?: string): ViewScore[];
export function distribution(axis: ViewAxis, models: ViewModel[]): ViewStats;
export function normalize(value: number | null, stats: ViewStats, higherBetter: boolean | null): number | null;
export function profileAnomalies(view: BenchmarkView, modelId: string): { flags: ProfileFlag[]; eligibleFamilies: number };
export function buildBenchmarkView(ds: Dataset): BenchmarkView;

// Presentation adapter only. It never changes the registry, source scores or Composite.
export const ANOMALY_POLICY = { minPeers: 20, minFamilies: 10, minProfile: 5, peerZ: 1.5, profileGap: 1.5 };
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const effectiveBasis = (o) => o.source_basis || o.basis;

// Group published boards by version, harness, and explicitly stored split/configuration.
// Model-specific prompts/effort remain part of the named configuration, not an assertion
// that separate benchmark implementations are equivalent. Full protocol is in each source row.
export function cohortOf(o) {
  let configuration = '';
  const raw = o.protocol.split('; source row: ')[1];
  if (raw) {
    try {
      const row = JSON.parse(raw.split('; effort=')[0]);
      configuration = row.configuration || row.split || '';
      if (o.benchmark_id.startsWith('aider-polyglot::') && row.cells) configuration = `edit format: ${row.cells.at(-1)}`;
    } catch { configuration = 'protocol requires individual inspection'; }
  }
  if (o.id.startsWith('vendor:')) configuration = `vendor protocol: ${o.protocol}`;
  return [o.subject.harness, configuration].filter(Boolean).join(' · ') || 'Published board';
}

export function latestScores(rows, basis = 'measured') {
  const chosen = new Map();
  for (const row of rows) {
    if (basis !== 'all' && row.basis !== basis) continue;
    const key = row.modelId || `unmatched:${row.subjectId}`;
    const prior = chosen.get(key);
    // Prefer independent measurement, then newest observation; never choose the best score.
    if (!prior || (row.basis === 'measured' && prior.basis !== 'measured') ||
      (row.basis === prior.basis && (row.date > prior.date || (row.date === prior.date && row.id < prior.id)))) chosen.set(key, row);
  }
  return [...chosen.values()];
}

export function distribution(axis, models) {
  const byId = new Map(models.map((m) => [m.id, m]));
  const seen = new Set();
  const rows = latestScores(axis.scores).filter((r) => {
    if (!r.modelId || !byId.has(r.modelId) || r.lowSample || seen.has(r.subjectId)) return false;
    seen.add(r.subjectId); return true;
  });
  const values = rows.map((r) => r.value);
  const avg = values.length ? mean(values) : null;
  const sd = values.length ? Math.sqrt(mean(values.map((v) => (v - avg) ** 2))) : null;
  return { n: values.length, families: new Set(rows.map((r) => byId.get(r.modelId).family)).size,
    mean: avg, sd, min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null };
}

export function normalize(value, stats, higherBetter) {
  if (!finite(value) || stats.n < 2 || stats.min === stats.max || higherBetter == null) return null;
  const p = (value - stats.min) / (stats.max - stats.min);
  return Math.max(0, Math.min(100, 100 * (higherBetter ? p : 1 - p)));
}

export function profileAnomalies(view, modelId) {
  const eligible = [];
  for (const axis of view.axes) {
    const row = latestScores(axis.scores).find((r) => r.modelId === modelId);
    const s = axis.stats;
    if (!row || row.lowSample || axis.higherBetter == null || s.n < ANOMALY_POLICY.minPeers || s.families < ANOMALY_POLICY.minFamilies || !s.sd) continue;
    const z = (row.value - s.mean) / s.sd * (axis.higherBetter ? 1 : -1);
    eligible.push({ axis, row, z });
  }
  // One equally weighted value per benchmark family; multiple versions/harnesses
  // cannot inflate the model's baseline. Leave the flagged benchmark's whole family out.
  const families = new Map();
  for (const e of eligible) families.set(e.axis.family, [...(families.get(e.axis.family) || []), e.z]);
  const flags = [];
  for (const e of eligible) {
    const others = [...families].filter(([family]) => family !== e.axis.family).map(([, zs]) => mean(zs));
    if (others.length < ANOMALY_POLICY.minProfile) continue;
    const baseline = mean(others), gap = e.z - baseline;
    if (Math.abs(gap) >= ANOMALY_POLICY.profileGap && Math.abs(e.z) >= ANOMALY_POLICY.peerZ && Math.sign(gap) === Math.sign(e.z)) {
      flags.push({ axisId: e.axis.id, scoreId: e.row.id, direction: gap > 0 ? 'strong' : 'weak', value: e.row.value,
        z: e.z, baseline, gap, profileN: others.length, peers: e.axis.stats.n, peerFamilies: e.axis.stats.families, mean: e.axis.stats.mean, sd: e.axis.stats.sd });
    }
  }
  return { flags: flags.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)), eligibleFamilies: families.size };
}

export function buildBenchmarkView(ds) {
  const models = ds.models.map((m) => ({ id: m.id, name: m.display_name, org: m.org, family: m.family_key, open: m.open_weights, deprecated: !!m.deprecated }));
  const axes = [], sources = [], sourceMap = new Map();
  const sourceIndex = (s) => {
    const key = JSON.stringify([s.url, s.retrieved_at, s.published_at, s.file]);
    if (!sourceMap.has(key)) { sourceMap.set(key, sources.length); sources.push({ url: s.url, date: s.retrieved_at, published: s.published_at, file: s.file }); }
    return sourceMap.get(key);
  };
  const grouped = new Map();
  for (const o of ds.benchmark_results.observations) {
    const cohort = cohortOf(o), key = JSON.stringify([o.benchmark_id, cohort, o.unit]);
    if (!grouped.has(key)) grouped.set(key, { benchmarkId: o.benchmark_id, cohort, unit: o.unit, rows: [] });
    grouped.get(key).rows.push({ id: o.id, modelId: o.subject.model_id, subjectId: o.subject.source_id, name: o.subject.name,
      value: o.value, basis: effectiveBasis(o), derived: o.basis === 'derived', source: sourceIndex(o.source), date: o.source.retrieved_at,
      variant: o.subject.variant, lowSample: false });
  }
  for (const b of ds.benchmark_results.registry) {
    const groups = [...grouped.values()].filter((g) => g.benchmarkId === b.id);
    if (!groups.length) groups.push({ benchmarkId: b.id, cohort: 'Published board', unit: b.scoring.unit, rows: [] });
    groups.sort((a, b) => a.cohort.localeCompare(b.cohort));
    for (const g of groups) axes.push({ id: `${b.id}@@${encodeURIComponent(g.cohort)}@@${g.unit}`, benchmarkId: b.id, family: b.family,
      name: b.name, version: b.version, category: b.category, description: b.one_sentence_description, unit: g.unit,
      higherBetter: b.scoring.higher_better, cohort: g.cohort, url: b.primary_url, scores: g.rows,
      collection: ds.benchmark_results.collections.find((c) => c.benchmark_id === b.id) });
  }
  // Existing indices and DesignArena are additive dated snapshot axes: their source
  // does not expose a verified semantic version here. Never label them with an invented one.
  for (const spec of [
    ['aa_coding_index', 'AA Coding Index', 'Coding', 'points', 'artificialanalysis'],
    ['aa_intelligence_index', 'AA Intelligence Index', 'Reasoning', 'points', 'artificialanalysis'],
    ['frontend', 'DesignArena Frontend', 'Coding', 'Elo', 'designarena'],
    ['fullstack', 'DesignArena Full-Stack', 'Coding', 'Elo', 'designarena'],
  ]) {
    const [key, name, category, unit, source] = spec, date = ds.sources[source];
    const id = `${key}::snapshot-${date}`;
    const url = source === 'designarena' ? 'https://www.designarena.ai/' : 'https://artificialanalysis.ai/leaderboards/models';
    const sourceId = sourceIndex({ url, retrieved_at: date, published_at: null, file: `data/raw/${source}.json` });
    const scores = ds.models.flatMap((m) => {
      const da = source === 'designarena' ? m.designarena?.[key] : null;
      const value = source === 'designarena' ? da?.elo : m.benchmarks?.[key];
      if (!finite(value)) return [];
      return [{ id: `legacy:${key}:${m.id}`, modelId: m.id, subjectId: da?.modelId || m.aa_model_id || m.id, name: m.display_name,
        value, basis: 'measured', derived: false, source: sourceId, date, variant: m.variant, lowSample: da ? (da.battles ?? 0) < 200 : false, battles: da?.battles ?? null }];
    });
    axes.push({ id, benchmarkId: id, family: key, name, version: `snapshot-${date} (unversioned)`, category, unit, higherBetter: true,
      description: source === 'designarena' ? 'Published Elo. Exact source attachment is retained; fewer than 200 battles excludes a row from radar normalization and anomaly peers.' : 'Published AA index from the retained API snapshot. No verified semantic version was supplied.',
      cohort: 'Published board', url, scores, collection: { status: 'collected', reason: 'Existing catalog source snapshot' } });
  }
  for (const axis of axes) axis.stats = distribution(axis, models);
  return { models, axes, sources, divergences: ds.benchmark_results.divergences, missing: ds.benchmark_results.missing,
    generatedAt: ds.generated_at, registryCount: ds.benchmark_results.registry.length, legacyDate: ds.sources.aa_coding_agents };
}
