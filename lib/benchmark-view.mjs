// Presentation adapter only. It never changes the registry, source scores or Composite.

/** F-100: harness cohorts as a reader knows them; anything unlisted is shown as the source spells it. */
// 2026-09-20 (CR-83.1): RSI-Exam spells its harnesses in lower case and without the product suffix
// ("claude code", "grok", "antigravity", "musecode"); the same harness must not appear under two
// names on one page. Every label below is a name a source of ours already publishes, never an
// invented one: Claude Code, Codex, Kimi CLI, Qwen Coder, Grok Build and Antigravity CLI are the
// names RSI-Exam's own release write-up uses in its experimental-setup table, and "Grok Build" and
// "Muse Code" are also how Artificial Analysis and RealSWE spell those two harnesses in the rows we
// already carry. FrontierCode's slug "grok-build" is the third spelling of that one harness and maps
// to the same label (review gate 20260920T014003Z); "musecode" is not left unlisted, because our own
// catalog does capitalise it.
// Move into this module from lib/benchmark-matrix.mjs (2026-09-20, iteration 135): display-only; the
// cohort stored on axes/scores stays the raw registry string, only its rendering is labelled.
export const HARNESS_LABELS = { 'claude-code': 'Claude Code', 'claude code': 'Claude Code', codex: 'Codex',
  'mini-swe-agent': 'mini-SWE-agent', 'kimi cli': 'Kimi CLI', 'qwen coder': 'Qwen Coder',
  antigravity: 'Antigravity CLI', grok: 'Grok Build', 'grok-build': 'Grok Build', musecode: 'Muse Code' };
export function cohortLabel(cohort) { return cohort ? (HARNESS_LABELS[cohort] ?? cohort) : cohort; }

// F-165(b): "Published board" is the default this module assigns to every axis that has nothing more
// specific to say, so printing it as a sub-line tells a reader nothing and hides the rows that do
// differ. The matrix (benchmark-matrix.mjs) and the ranking page already dropped it; this is that
// same rule in one place, for every surface. It is display-only — the cohort stored on the axis, and
// therefore the axis id, is untouched.
export function cohortSubLabel(cohort) { return !cohort || cohort === 'Published board' ? null : cohortLabel(cohort); }

export const ANOMALY_POLICY = { minPeers: 20, minFamilies: 10, minProfile: 5, peerZ: 1.5, profileGap: 1.5 };
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const effectiveBasis = (o) => o.source_basis || o.basis;

// Group published boards by version, harness, and explicitly stored split/configuration.
// Model-specific prompts/effort remain part of the named configuration, not an assertion
// that separate benchmark implementations are equivalent. Full protocol is in each source row.
// F-165(a): a vendor's launch number is not the board's own publication, but both fell through to
// the same default, so a model page printed two rows reading "Terminal-Bench 4.0" that differed only
// by their basis marker. Where the protocol names the vendor that produced the number, the cohort
// says so and the sub-line names the runner. The rule is the protocol sentence our own ingest writes
// for launch posts and system cards — measured, not assumed: it matches 97 of the 839 self_reported
// observations (StepFun 40, DeepSeek 19, Xiaomi 17, Anthropic 16, OpenAI 5) and nothing else in the
// dataset. The other 742 self-reported rows are board submissions, not launch claims, and keep the
// default: widening this to "every self_reported row" would relabel them wrongly.
const VENDOR_RUN = /^Vendor-reported by ([A-Za-z0-9 .&-]+?) for /;
export const vendorRunner = (protocol) => (typeof protocol === 'string' ? protocol.match(VENDOR_RUN)?.[1] ?? null : null);

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
  // The runner goes last, so a row that also names a harness keeps reading harness-first and an
  // estimate carrying only the harness still finds this axis through the `${cohort} · ` prefix match.
  const runner = vendorRunner(o.protocol);
  return [o.subject.harness, configuration, runner && `Vendor-reported by ${runner}`].filter(Boolean).join(' · ') || 'Published board';
}

const basisTier = (row) => (row.basis === 'measured' ? 2 : row.basis === 'preliminary' ? 0 : 1);

export function latestScores(rows, basis = 'measured') {
  const chosen = new Map();
  for (const row of rows) {
    if (basis !== 'all' && row.basis !== basis) continue;
    const key = row.modelId || `unmatched:${row.subjectId}`;
    const prior = chosen.get(key);
    // Prefer independent measurement, then a developer's own report, a preliminary figure last (CR-65.10);
    // within one tier the newest observation. Never choose the best score.
    const tier = basisTier(row), priorTier = prior ? basisTier(prior) : -1;
    if (!prior || tier > priorTier ||
      (tier === priorTier && (row.date > prior.date || (row.date === prior.date && row.id < prior.id)))) chosen.set(key, row);
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
  const models = ds.models.map((m) => ({ id: m.id, name: m.display_name, org: m.org, family: m.family_key, familyName: m.family_name ?? null, variant: m.variant ?? null, released: m.release_date ?? null, open: m.open_weights, deprecated: !!m.deprecated,
    outputTps: m.aa_speed?.output_tps ?? null, ttftS: m.aa_speed?.ttft_s ?? null, contextTokens: m.aa_metadata?.context_window_tokens ?? null }));
  const catalogIdBySourceId = new Map();
  for (const model of ds.models) {
    if (model.aa_model_id) catalogIdBySourceId.set(model.aa_model_id, model.id);
    for (const board of ['frontend', 'fullstack']) {
      const sourceId = model.designarena?.[board]?.modelId;
      if (sourceId) catalogIdBySourceId.set(sourceId, model.id);
    }
  }
  const axes = [], sources = [], sourceMap = new Map();
  const sourceIndex = (s) => {
    const key = JSON.stringify([s.url, s.retrieved_at, s.published_at, s.file]);
    if (!sourceMap.has(key)) { sourceMap.set(key, sources.length); sources.push({ url: s.url, date: s.retrieved_at, published: s.published_at, file: s.file }); }
    return sourceMap.get(key);
  };
  // Real-SWE separates resolution rate (percent) from mean cost per rollout (USD).
  // Cost stays its own observation and axis; it is also carried on the score row so a
  // configuration's quality and cost remain visible together without a hidden conversion.
  // A `<family>-cost` registry entry carries the measured spend of the same published run as
  // `<family>`. It is keyed by the score's family so two boards cannot claim one subject's cost.
  const costBySubject = new Map();
  for (const o of ds.benchmark_results.observations) {
    const family = String(o.benchmark_id).split('::')[0];
    if (family.endsWith('-cost') && o.subject?.source_id) costBySubject.set(`${family.slice(0, -5)}\u0000${o.subject.source_id}`, o.value);
  }
  const grouped = new Map();
  for (const o of ds.benchmark_results.observations) {
    const cohort = cohortOf(o), key = JSON.stringify([o.benchmark_id, cohort, o.unit]);
    if (!grouped.has(key)) grouped.set(key, { benchmarkId: o.benchmark_id, cohort, unit: o.unit, rows: [] });
    grouped.get(key).rows.push({ id: o.id, modelId: o.subject.model_id, subjectId: o.subject.source_id, name: o.subject.name,
      value: o.value, basis: effectiveBasis(o), derived: o.basis === 'derived', source: sourceIndex(o.source), date: o.source.retrieved_at,
      variant: o.subject.variant, harness: o.subject.harness ?? null, confidenceInterval: o.confidence_interval ?? null,
      costPerRollout: costBySubject.get(`${String(o.benchmark_id).split('::')[0]}\u0000${o.subject.source_id}`) ?? null,
      publishedStddev: o.published_stddev ?? null, sampleSize: o.sample_size ?? null, lowSample: false });
  }
  const detailOf = (id) => ds.benchmark_results.details?.[id] ?? null;
  for (const b of ds.benchmark_results.registry) {
    const groups = [...grouped.values()].filter((g) => g.benchmarkId === b.id);
    if (!groups.length) groups.push({ benchmarkId: b.id, cohort: 'Published board', unit: b.scoring.unit, rows: [] });
    groups.sort((a, b) => a.cohort.localeCompare(b.cohort));
    for (const g of groups) axes.push({ id: `${b.id}@@${encodeURIComponent(g.cohort)}@@${g.unit}`, benchmarkId: b.id, family: b.family,
      name: b.name, version: b.version, category: b.category, description: b.one_sentence_description, unit: g.unit,
      higherBetter: b.scoring.higher_better, publishedRange: b.scoring.range, cohort: g.cohort, url: b.primary_url, scores: g.rows,
      publicationScope: detailOf(b.id)?.publication_scope ?? null, detailNote: detailOf(b.id)?.note ?? null,
      collection: ds.benchmark_results.collections.find((c) => c.benchmark_id === b.id) });
  }
  // Existing indices and DesignArena are additive dated snapshot axes: their source
  // does not expose a verified semantic version here. Never label them with an invented one.
  for (const spec of [
    ['aa_coding_index', 'AA Coding Index', 'Coding', 'points', 'artificialanalysis'],
    ['aa_intelligence_index', 'AA Intelligence Index', 'Reasoning', 'points', 'artificialanalysis'],
    ['aa_agentic_index', 'AA Agentic Index', 'Agentic', 'points', 'openrouter_aa_relay'],
    ['frontend', 'DesignArena Web Apps (agentic)', 'Coding', 'Elo', 'designarena'],
    ['fullstack', 'DesignArena Full-Stack', 'Coding', 'Elo', 'designarena'],
  ]) {
    const [key, name, category, unit, source] = spec, date = ds.sources[source];
    const id = `${key}::snapshot-${date}`;
    // CR-65.15: link the exact board. Our `frontend` data is DesignArena's agentic Web Apps board (checked 17 Sep: same Elo
    // within ±5 for the top models), not the broader page the site calls Frontend.
    const url = source === 'designarena' ? `https://www.designarena.ai/leaderboard/${key === 'frontend' ? 'webapps' : 'fullstack'}` : 'https://artificialanalysis.ai/leaderboards/models';
    // CR-34.4: the Agentic Index is relayed from Artificial Analysis by OpenRouter's
    // Benchmarks API (AA's own free API has no agentic field); the raw capture is the
    // dated, hash-locked relay response beside the ingestion lock.
    const sourceFile = source === 'openrouter_aa_relay'
      ? 'data/raw/benchmarks/ingestion-lock.json#openrouter_aa_relay'
      : `data/raw/${source}.json`;
    const sourceId = sourceIndex({ url, retrieved_at: date, published_at: null, file: sourceFile });
    const scores = ds.models.flatMap((m) => {
      const da = source === 'designarena' ? m.designarena?.[key] : null;
      const value = source === 'designarena' ? da?.elo : m.benchmarks?.[key];
      if (!finite(value)) return [];
      return [{ id: `legacy:${key}:${m.id}`, modelId: m.id, subjectId: da?.modelId || m.aa_model_id || m.id, name: m.display_name,
        value, basis: 'measured', derived: false, source: sourceId, date, variant: m.variant, lowSample: da ? (da.battles ?? 0) < 200 : false, battles: da?.battles ?? null }];
    });
    const axisDescription = source === 'designarena'
      ? 'Published Elo. Exact source attachment is retained; fewer than 200 battles excludes a row from radar normalization and anomaly peers.'
      : source === 'openrouter_aa_relay'
        ? 'Artificial Analysis publishes one Agentic Index per model, measured on its primary configuration and relayed by OpenRouter\'s Benchmarks API; the value is attached at family scope on the deterministic representative. Artificial Analysis publishes this board without a version number; we keep the date each result was retained.'
        : 'Artificial Analysis publishes this board without a version number; we keep the date each result was retained.';
    axes.push({ id, benchmarkId: id, family: key, name, version: `snapshot-${date} (unversioned)`, category, unit, higherBetter: true,
      description: axisDescription,
      cohort: 'Published board', url, scores, collection: { status: 'collected', reason: 'Existing catalog source snapshot' } });
  }
  // Historical estimates are attached to the axis of their benchmark and cohort so
  // the ranking view can include models that are no longer measured on the current
  // version. A cohort that vanished entirely becomes its own historical axis. Every
  // such row stays labelled an estimate and is never merged into measured scores.
  const historical = ds.benchmark_results.historical;
  if (historical?.estimates?.length) {
    const registryById = new Map(ds.benchmark_results.registry.map((b) => [b.id, b]));
    const knownModels = new Set(models.map((m) => m.id));
    const axesByBenchmark = new Map();
    for (const axis of axes) axesByBenchmark.set(axis.benchmarkId, [...(axesByBenchmark.get(axis.benchmarkId) || []), axis]);
    const headlineAxisAliases = new Map([
      ['aa-intelligence-index::snapshot', `aa_intelligence_index::snapshot-${ds.sources.artificialanalysis}`],
      ['aa-coding-index::snapshot', `aa_coding_index::snapshot-${ds.sources.artificialanalysis}`],
      ['aa-agentic-index::snapshot', `aa_agentic_index::snapshot-${ds.sources.openrouter_aa_relay}`],
      ['designarena-frontend::snapshot', `frontend::snapshot-${ds.sources.designarena}`],
      ['designarena-fullstack::snapshot', `fullstack::snapshot-${ds.sources.designarena}`],
    ]);
    for (const e of historical.estimates) {
      // Epoch ECI lives only on the radar's index axes, which never carry estimates. A model Epoch drops from its fit
      // (2026-09-22: GLM-4.6) keeps its history estimate in the dataset but must not become a board of its own here.
      if (String(e.benchmark_id).startsWith('epoch-eci::')) continue;
      const catalogModelId = (e.model_id && catalogIdBySourceId.get(e.model_id)) || e.model_id;
      if (catalogModelId && !knownModels.has(catalogModelId)) {
        knownModels.add(catalogModelId);
        // `e.family` is the benchmark's family; the model's own family is the catalog id before "::" (CR-36.2 groups by it).
        models.push({ id: catalogModelId, name: e.subject_name ?? catalogModelId, org: '', family: String(catalogModelId).split('::')[0], open: false, deprecated: true, historical: true });
      }
      const candidates = axesByBenchmark.get(e.benchmark_id) ?? axesByBenchmark.get(headlineAxisAliases.get(e.benchmark_id)) ?? [];
      let target = e.cohort ? candidates.find((a) => a.cohort === e.cohort || a.cohort.startsWith(`${e.cohort} · `)) : null;
      if (!target && e.cohort == null) target = candidates.find((a) => a.cohort === 'Published board');
      if (!target && candidates.length === 1) target = candidates[0];
      if (!target) {
        const b = registryById.get(e.benchmark_id), cohort = e.cohort || 'Published board';
        const id = `${e.benchmark_id}@@${encodeURIComponent(cohort)}@@${e.unit || ''}`;
        target = axes.find((a) => a.id === id);
        if (!target) {
          target = { id, benchmarkId: e.benchmark_id, family: b?.family ?? e.family ?? null, name: b?.name ?? e.benchmark_id,
            version: b?.version ?? String(e.benchmark_id).split('::')[1] ?? '', category: b?.category ?? 'Other',
            description: b?.one_sentence_description ?? '', unit: e.unit ?? b?.scoring?.unit ?? null,
            higherBetter: e.higher_better ?? b?.scoring?.higher_better ?? null, cohort, url: b?.primary_url ?? '',
            scores: [], historical: true, collection: ds.benchmark_results.collections.find((c) => c.benchmark_id === e.benchmark_id) };
          axes.push(target);
        }
        candidates.push(target);
      }
      (target.estimates ||= []).push({ id: e.id, modelId: catalogModelId, name: e.subject_name ?? catalogModelId ?? 'Unmatched source identity',
        benchmarkId: e.benchmark_id, sourceBenchmarkId: e.source_benchmark_id, sourceStateId: e.source_state_id ?? null,
        value: e.value, unit: e.unit, higherBetter: e.higher_better, status: e.status, method: e.method,
        cohort: e.cohort ?? null, harness: e.harness ?? null, variant: e.variant ?? null,
        bridgeCount: e.comparison?.bridge_count ?? 0, aggregate: e.comparison?.aggregate ?? null,
        hops: e.comparison?.hops ?? null, path: e.comparison?.path ?? [], chainIqrRelative: e.comparison?.chain_iqr_relative ?? null,
        spread: e.comparison?.spread ?? null, reason: e.comparison?.reason ?? null,
        sourceValue: e.source_value ?? null, uncertainty: e.uncertainty ?? null, note: e.note ?? null, source: e.source ?? null });
    }
  }
  // CR-14.4: Epoch's family-scope indices for the compare radar. Kept out of `axes` on purpose:
  // the Benchmaxxing signal and the full comparison iterate `axes` and must not change with this.
  const eciDate = String(ds.sources.epoch_eci ?? '').slice(0, 10);
  const eciSource = sourceIndex({ url: 'https://epoch.ai/eci', retrieved_at: eciDate, published_at: null, file: 'data/raw/epoch-eci.json' });
  const indexAxes = [
    // The site's short score names (SCORE_SHORT_LABELS), so radar axis labels are not truncated.
    ['epoch_eci', 'Epoch ECI', 'Reasoning'],
    ['epoch_eci_software', 'Epoch Software ECI', 'Coding'],
  ].map(([key, name, category]) => {
    const id = `${key}::snapshot-${eciDate}`;
    const scores = ds.models.flatMap((m) => {
      const value = m.benchmarks?.[key];
      return finite(value) ? [{ id: `legacy:${key}:${m.id}`, modelId: m.id, subjectId: m.id, name: m.display_name, value, basis: 'measured', derived: false,
        source: eciSource, date: eciDate, variant: m.variant, lowSample: false }] : [];
    });
    return { id, benchmarkId: id, family: key, name, version: `snapshot-${eciDate} (unversioned)`, category, unit: 'ECI', higherBetter: true,
      description: 'Epoch AI publishes ECI per model family on an open-ended scale; it is attached once to the family representative configuration.',
      cohort: 'Published board', url: 'https://epoch.ai/eci', scores, collection: { status: 'collected', reason: 'Existing catalog source snapshot' } };
  });
  for (const axis of [...axes, ...indexAxes]) axis.stats = distribution(axis, models);
  // CR-64: each axis says what it measures (data/benchmark-taxonomy.json → benchmark_kinds). A dataset without the map
  // falls back to the category, so a cost board can never pass for a capability one.
  const kinds = ds.benchmark_results.benchmark_kinds ?? {};
  const judged = new Set(ds.benchmark_results.judged_benchmarks ?? []);
  for (const axis of [...axes, ...indexAxes]) {
    const family = String(axis.benchmarkId).split('::')[0];
    axis.kind = kinds[family] ?? (axis.category === 'Efficiency' ? 'efficiency' : 'capability');
    // CR-65.7: scored by a vote or a judge model rather than a verifiable answer (data/benchmark-caveats.json).
    axis.judged = judged.has(family);
  }
  return { models, axes, indexAxes, sources, divergences: ds.benchmark_results.divergences, missing: ds.benchmark_results.missing,
    generatedAt: ds.generated_at, registryCount: ds.benchmark_results.registry.length, legacyDate: ds.sources.aa_coding_agents, speedDate: ds.sources.artificialanalysis ?? null };
}

export function selectBenchmarkView(view, modelIds = [], axisId = null) {
  const ids = new Set(modelIds);
  return { ...view, axes: view.axes.filter((a) => !axisId || a.id === axisId).map((a) => ({ ...a,
    scores: a.scores.filter((r) => axisId || ids.has(r.modelId)),
    estimates: (a.estimates ?? []).filter((e) => axisId || (e.modelId && ids.has(e.modelId))) })), missing: view.missing.filter((m) => ids.has(m.model_id)),
    indexAxes: axisId ? [] : (view.indexAxes ?? []).map((a) => ({ ...a, scores: a.scores.filter((r) => ids.has(r.modelId)) })) };
}

// A trailing "(…)" naming a reasoning/effort setting, e.g. "(Adaptive Reasoning, Max Effort)" or "(xhigh)".
const TRAILING_PAREN_RE = /\s*\([^()]*\)\s*$/;
const REASONING_PAREN_RE = /\s*\([^()]*\b(reasoning|effort|thinking|adaptive|non-reasoning|xhigh|high|medium|low|minimal|max)\b[^()]*\)\s*$/i;
/** The model's name without its variant detail (same rule as `collapsedName` in lib/variants.ts). */
export function familyDisplayName(m, variants = 1) {
  const stripped = String(m.name).replace(variants > 1 ? TRAILING_PAREN_RE : REASONING_PAREN_RE, '').trim() || m.name;
  const fam = m.familyName;
  return fam && fam.length > stripped.length && fam.toLowerCase().endsWith(stripped.toLowerCase()) ? fam : stripped;
}
/** Short label of one variant: the catalog's variant key, else the trailing parenthesis. */
export const variantLabel = (m) => (m.variant && m.variant !== 'default' ? m.variant : m.name.match(/\(([^()]*)\)\s*$/)?.[1]) || m.name;

/** CR-36.2 (Florian 2026-09-15): Compare lists one entry per model (weights / training run), not every reasoning
 *  variant. Representative = the current variant with the highest AA Intelligence Index (the capability basis of
 *  the default pair, CR-14.1), then id; a family whose variants are all historical keeps a historical representative.
 *  `score` is that AA Intelligence Index value (null when unmeasured). */
export function compareFamilies(view) {
  const aa = [...view.axes, ...(view.indexAxes ?? [])].find((a) => a.family === 'aa_intelligence_index' && !a.historical);
  const aaOf = new Map();
  if (aa) for (const r of latestScores(aa.scores)) if (r.modelId && Number.isFinite(r.value)) aaOf.set(r.modelId, r.value);
  const groups = new Map();
  for (const m of view.models) { const f = m.family ?? m.id; if (!groups.has(f)) groups.set(f, []); groups.get(f).push(m); }
  return [...groups].map(([family, members]) => {
    const current = members.filter((m) => !m.historical && !m.deprecated);
    const pool = current.length ? current : members;
    const rep = [...pool].sort((a, b) => (aaOf.get(b.id) ?? -Infinity) - (aaOf.get(a.id) ?? -Infinity) || a.id.localeCompare(b.id))[0];
    return { id: rep.id, family, name: familyDisplayName(rep, members.length), org: rep.org, released: rep.released ?? null,
      score: aaOf.get(rep.id) ?? null, variants: members.map((m) => m.id), current: current.length > 0 };
  });
}

/** CR-36.2: a view for the picked models where each picked model is its family representative and, per benchmark,
 *  carries the rows of the variant with the best result (direction-aware; measured and full-sample rows first).
 *  Every relabelled row keeps `variantId` / `variantLabel` / `bestOf` so the UI can name the variant behind a value.
 *  Rows of a benchmark with unknown direction come from the representative only (no "best" exists). */
export function selectFamilyBenchmarkView(view, modelIds = [], axisId = null) {
  const families = compareFamilies(view), famOf = new Map();
  for (const f of families) for (const v of f.variants) famOf.set(v, f);
  const picked = [];
  for (const id of modelIds) { const f = famOf.get(id); if (f && !picked.includes(f)) picked.push(f); }
  const byId = new Map(view.models.map((m) => [m.id, m]));
  const base = selectBenchmarkView(view, picked.flatMap((f) => f.variants), axisId);
  const headline = (rows) => latestScores(rows)[0] ?? latestScores(rows, 'all')[0] ?? null;
  const rank = (r, higherBetter) => [r.basis === 'measured' && !r.derived ? 1 : 0, r.lowSample ? 0 : 1, higherBetter ? r.value : -r.value];
  const beats = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };
  const collapseAxis = (axis) => {
    if (axisId && !axis.scores.length) return axis;
    const scores = axis.scores.filter((r) => !r.modelId || !famOf.has(r.modelId) || !picked.includes(famOf.get(r.modelId)));
    const estimates = (axis.estimates ?? []).filter((e) => !e.modelId || !picked.includes(famOf.get(e.modelId)));
    for (const f of picked) {
      const candidates = f.variants.map((v) => [v, axis.scores.filter((r) => r.modelId === v)]).filter(([, rows]) => rows.length);
      let chosen = candidates.find(([v]) => v === f.id) ?? candidates[0];
      if (chosen && axis.higherBetter != null) for (const cand of candidates) if (beats(rank(headline(cand[1]), axis.higherBetter), rank(headline(chosen[1]), axis.higherBetter))) chosen = cand;
      if (chosen) {
        const [v, rows] = chosen, label = variantLabel(byId.get(v) ?? { name: v });
        for (const r of rows) scores.push({ ...r, modelId: f.id, variantId: v, variantLabel: label, bestOf: candidates.length });
      }
      const estSource = chosen?.[0] ?? f.id;
      for (const e of axis.estimates ?? []) if (e.modelId === estSource) estimates.push({ ...e, modelId: f.id });
    }
    return { ...axis, scores, estimates };
  };
  const repIds = new Set(picked.map((f) => f.id));
  return { ...base, axes: base.axes.map(collapseAxis), indexAxes: (base.indexAxes ?? []).map(collapseAxis),
    missing: base.missing.filter((m) => repIds.has(m.model_id)),
    models: view.models.map((m) => { const f = famOf.get(m.id); return f && f.id === m.id ? { ...m, name: f.name, variantCount: f.variants.length } : m; }),
    families: families.map(({ id, name, org, released, score, variants, current }) => ({ id, name, org, released, score, variants, current })),
    picks: picked.map((f) => f.id) };
}
