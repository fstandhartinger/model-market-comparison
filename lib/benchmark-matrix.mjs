// CR-1: the release-style comparison table — models as columns, benchmarks as rows.
// Pure presentation over the benchmark view: it never estimates, bridges or rescales a score.
// A cell is the latest published value for that exact catalog configuration (measured preferred
// over self-reported, as everywhere else); a missing value stays missing.
import { latestScores } from './benchmark-view.mjs';
import { isPin } from './version-pin.mjs';
import { deterministicFamilyRepresentative } from './family-representative.mjs';

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
export const baseKey = (id) => String(id).split('::')[0];

// Units whose zero is meaningful, so a bar can be proportional to the value itself.
const RATIO_UNITS = new Set(['fraction', 'percent', 'points', 'USD']);
const BASIS_CODE = { measured: 0, self_reported: 1, preliminary: 3 };
/** CR-65.10: best-of picks by evidence tier first — measured, then self-reported/other, preliminary last. */
const basisTierOf = (code) => (code === 0 ? 0 : code === 3 ? 2 : 1);
const TIER_RANK = { headline: 0, niche: 1, community: 2 };

/** CR-1.5: bar length per cell, 0–1, normalised over the values visible in one row.
 *  Ratio units: proportional to the value (lower-is-better: best ÷ value). Elo, TrueSkill and
 *  unknown scales have no meaningful zero: min–max with a short floor so the weakest result
 *  still shows a sliver. Unknown direction or missing value: no bar. */
export function rowBars(values, higherBetter, unit) {
  const present = values.filter(finite);
  // F-84: a row with a single value has nothing to compare; a lone full-width bar would read as
  // "best of the row", so it gets no bar (the same threshold as rowWinners).
  if (higherBetter == null || present.length < 2) return values.map(() => null);
  const min = Math.min(...present), max = Math.max(...present);
  const proportional = RATIO_UNITS.has(unit) && min >= 0;
  return values.map((v) => {
    if (!finite(v)) return null;
    if (proportional) {
      if (higherBetter) return max > 0 ? v / max : 1;
      return v > 0 ? min / v : 1;
    }
    if (max === min) return 1;
    const p = (v - min) / (max - min);
    return 0.12 + 0.88 * (higherBetter ? p : 1 - p);
  });
}

const niceCeil = (x) => {
  const k = 10 ** Math.floor(Math.log10(x));
  return [1, 2, 2.5, 5, 10].map((s) => s * k).find((s) => s >= x - 1e-12) ?? 10 * k;
};

/** CR-1.9: how one benchmark's small multiple draws its values, positions 0–1.
 *  'bar'  — ratio units spanning ≤ 20×: bars from zero (fractions and percents on a fixed 0–100 % axis).
 *  'log'  — ratio units whose positive values span > 20×: a dot at the log position, zeros pinned left.
 *  'position' — Elo, TrueSkill and scales without a meaningful zero: a dot between the padded row
 *  minimum and maximum, never a bar from an arbitrary zero. */
export function chartScale(values, unit) {
  const present = values.filter(finite);
  if (present.length === 0) return null;
  const min = Math.min(...present), max = Math.max(...present);
  if (RATIO_UNITS.has(unit) && min >= 0) {
    const positive = present.filter((v) => v > 0);
    const pmin = positive.length ? Math.min(...positive) : 0;
    if (positive.length >= 2 && max / pmin > 20) {
      const lo = 10 ** Math.floor(Math.log10(pmin)), hi = 10 ** Math.ceil(Math.log10(max));
      return { kind: 'log', domain: [lo, hi], positions: values.map((v) => !finite(v) ? null : v <= 0 ? 0 : Math.min(1, Math.max(0, Math.log(v / lo) / Math.log(hi / lo)))) };
    }
    const hi = unit === 'fraction' ? 1 : unit === 'percent' ? 100 : max > 0 ? niceCeil(max) : 1;
    return { kind: 'bar', domain: [0, hi], positions: values.map((v) => finite(v) ? Math.min(1, v / hi) : null) };
  }
  const span = max - min || Math.abs(max) * 0.1 || 1;
  const lo = min - span * 0.15, hi = max + span * 0.15;
  return { kind: 'position', domain: [lo, hi], positions: values.map((v) => finite(v) ? (v - lo) / (hi - lo) : null) };
}

/** CR-1.9: the chart's benchmarks — the "Important" rows (indices, headline, AA, Arena) with at least two values. */
export function chartRows(rows, columns) {
  return rows.map((row, i) => ({ row, vals: columns.map((m) => m.get(i) ?? null) }))
    .filter(({ row, vals }) => (row.group === 'indices' || row.tags.some((t) => IMPORTANT_TAGS.has(t))) && vals.filter(finite).length >= 2);
}
/** F-102: one counting rule for "benchmarks". A benchmark is a **board** — one family at one
 *  version. The extra rows a board can produce are rows of that board, not boards of their own:
 *  a harness cohort (the same benchmark run through Claude Code and through Codex) and a cost
 *  twin (the money a run cost, published next to the score). Every place on the site that says
 *  "N benchmarks" counts boards with at least one result; rows are counted only where the number
 *  of rows adds something a reader needs. */
export const boardId = (row) => `${String(row.key).replace(/-cost$/, '')}|${row.version ?? ''}`;
export const countBoards = (rows) => new Set(rows.flatMap((row) => row.boards ?? [boardId(row)])).size;

export const IMPORTANT_TAGS = new Set(['headline', 'aa', 'arena', 'aa_input']);
const isImportant = (row) => row.group === 'indices' || row.tags.some((t) => IMPORTANT_TAGS.has(t));

/** CR-7.1: the home page's simple comparison only needs the "Important" rows. Rows are re-indexed and
 *  values kept only for those rows (and, when given, those models), so "/" does not carry the full matrix. */
export function importantMatrix(matrix, modelIds = null) {
  const keep = new Map();
  const rows = [];
  matrix.rows.forEach((row, i) => { if (isImportant(row)) { keep.set(i, rows.length); rows.push(row); } });
  const values = {};
  const allowed = modelIds ? new Set(modelIds) : null;
  for (const [modelId, list] of Object.entries(matrix.values)) {
    if (allowed && !allowed.has(modelId)) continue;
    const out = list.filter(([i]) => keep.has(i)).map(([i, v, b]) => [keep.get(i), v, b]);
    if (out.length) values[modelId] = out;
  }
  const used = new Set(rows.map((r) => r.group));
  return { ...matrix, groups: matrix.groups.filter((g) => used.has(g.id)), rows, values };
}

/** CR-1.6: bold cells. Direction-aware; every tied best value wins; a row with fewer than two
 *  values, or with no known direction, has no winner. */
export function rowWinners(values, higherBetter) {
  const present = values.filter(finite);
  if (higherBetter == null || present.length < 2) return values.map(() => false);
  const best = higherBetter ? Math.max(...present) : Math.min(...present);
  return values.map((v) => finite(v) && v === best);
}

/** 2026-09-15: a category header's composite. A row counts only when it is on a 0–100 %-style scale
 *  (fraction, percent, or points registered with range [0, 100]) with higher = better, so Elo,
 *  native index scales, costs and lower-is-better rows never enter an average. Only rows that have a
 *  result for EVERY compared model count, so each column averages the same benchmarks and a missing
 *  result is never filled in. With fewer than COMPOSITE_MIN_ROWS such rows there is no composite. */
export const COMPOSITE_MIN_ROWS = 2;

/** The Benchmark Heaven Score row's second line: only the Composite is ever called a composite. */
export function scoreRowSubtitle(score, shortLabel) {
  return score === 'composite' ? 'Main Composite Score' : `Selected score: ${shortLabel}`;
}
export function compatibleRow(row) {
  if (row.higherBetter !== true) return false;
  if (row.unit === 'fraction' || row.unit === 'percent') return true;
  return row.unit === 'points' && Array.isArray(row.range) && row.range[0] === 0 && row.range[1] === 100;
}
const asPercent = (v, unit) => unit === 'fraction' ? v * 100 : v;
/** `entries`: the category's shown rows as { row, vals } (one value or null per compared model).
 *  CR-38.3: a preference or judge score never averages with task accuracy. When a category shows both
 *  kinds, only the task-accuracy rows make the composite; when every qualifying row is judged, the
 *  composite is made of those and reports `kind: 'judged'` so the header can say so.
 *  CR-38.2 / F-98: a saturated row still counts, at SATURATED_WEIGHT of an unsaturated row's weight. */
export function categoryComposite(entries, columns) {
  const qualifying = entries.filter(({ row, vals }) => columns > 0 && compatibleRow(row) && vals.length === columns && vals.every(finite));
  const objective = qualifying.filter(({ row }) => !row.judged);
  const judged = qualifying.filter(({ row }) => row.judged);
  const useJudged = objective.length === 0 && judged.length > 0;
  const used = useJudged ? judged : objective;
  const kind = useJudged ? 'judged' : 'measured';
  const rows = used.map(({ row }) => row);
  const saturated = used.filter(({ row }) => row.saturation?.saturated).map(({ row }) => row);
  const shared = { rows, excluded: entries.length - used.length, judgedExcluded: useJudged ? 0 : judged.length, saturated, kind };
  if (used.length < COMPOSITE_MIN_ROWS) return { values: Array.from({ length: columns }, () => null), ...shared };
  const weightOf = ({ row }) => row.saturation?.saturated ? SATURATED_WEIGHT : 1;
  const total = used.reduce((sum, e) => sum + weightOf(e), 0);
  const values = Array.from({ length: columns }, (_, j) => used.reduce((sum, e) => sum + weightOf(e) * asPercent(e.vals[j], e.row.unit), 0) / total);
  return { values, ...shared };
}

/** Display only: fractions read as percentages, Elo as integers, USD with a dollar sign. */
export function formatValue(v, unit) {
  if (!finite(v)) return '—';
  if (unit === 'fraction') return `${(v * 100).toFixed(1)}%`;
  if (unit === 'percent') return `${v.toFixed(1)}%`;
  if (unit === 'USD') return v >= 100 ? `$${Math.round(v).toLocaleString('en-US')}` : v >= 1 ? `$${v.toFixed(2)}` : `$${Number(v.toPrecision(2))}`;
  if (/elo|trueskill/i.test(unit ?? '')) return Math.round(v).toLocaleString('en-US');
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString('en-US');
  if (Math.abs(v) >= 10) return v.toFixed(1);
  // CR-63.6: one decimal count for small values ("0.80" next to "0.58", not "0.8").
  if (v === 0 || Math.abs(v) >= 0.01) return v.toFixed(2);
  return String(Number(v.toPrecision(2)));
}

/** CR-63.6: the model page and Compare show a benchmark value exactly as the Benchmarks page does, with "Elo" named. */
export function formatNative(v, unit) {
  const text = formatValue(v, unit);
  return finite(v) && /elo/i.test(unit ?? '') ? `${text} Elo` : text;
}

/** CR-1.8: deep link to one cell's detail page; `pinned` tells the page to restore a custom selection. */
export function resultHref(axisId, modelId, models, pinned) {
  const q = new URLSearchParams({ axis: axisId, model: modelId, models: models.join(',') });
  if (pinned) q.set('pinned', '1');
  return `/benchmarks/result?${q}`;
}

/** CR-1.8: every valued cell opens its detail page — registry rows and model-field indices (Epoch ECI) alike. */
export function cellHref(row, modelId, models, pinned) {
  return resultHref(cellAxisId(row, modelId), modelId, models, pinned);
}

/** CR-41.2: the exact source row (version and agent) behind a model's value; a plain row is its own source. */
export function cellVariant(row, modelId) {
  const k = row.bestOf?.pick?.[modelId];
  return k == null ? null : row.bestOf.variants[k] ?? null;
}
export const cellAxisId = (row, modelId) => cellVariant(row, modelId)?.id ?? row.id;
/** "v1.5 · Codex" — what produced a best-of value, for its title and screen-reader text. */
export function variantLabel(row, modelId) {
  const v = cellVariant(row, modelId);
  if (!v) return '';
  return [row.bestOf.acrossVersions ? `v${v.version}` : null, v.cohort].filter(Boolean).join(' · ');
}

/** CR-1.3: exactly one display group per benchmark, from taxonomy data. */
export function groupOf(key, category, taxonomy) {
  if (taxonomy.group_overrides?.[key]) return taxonomy.group_overrides[key];
  const hit = taxonomy.groups.find((g) => g.categories.includes(category));
  return hit ? hit.id : 'other';
}

/** CR-38.2 (Florian 2026-09-15), directive F-98: a benchmark counts as saturated when the models we
 *  hold results for already sit near its ceiling, so it separates weaker models rather than the best.
 *  Computed from the catalog's own independently measured results — never asserted from a claim:
 *  a bounded, higher-is-better scale (a fraction 0–1, a percent, or points registered as 0–100),
 *  at least SATURATION_MIN_MODELS measured models, and the mean of the SATURATION_TOP_N best results
 *  at or above SATURATION_THRESHOLD of the ceiling. Everything else returns null ("not assessable"),
 *  which is not the same as "not saturated". */
export const SATURATION_TOP_N = 5;
export const SATURATION_MIN_MODELS = 5;
export const SATURATION_THRESHOLD = 0.9;
/** A saturated row still counts in a category composite, at half the weight of an unsaturated one. */
export const SATURATED_WEIGHT = 0.5;

/** The ceiling of a row's scale, or null when the scale has no meaningful maximum (Elo, open points). */
export function scaleCeiling({ unit, range, higherBetter }) {
  if (higherBetter !== true) return null;
  const top = Array.isArray(range) ? range[1] : null;
  if (unit === 'fraction') return top === 1 || top == null ? 1 : top;
  if (unit === 'percent') return top === 100 || top == null ? 100 : top;
  if (unit === 'points' && Array.isArray(range) && range[0] === 0 && range[1] === 100) return 100;
  return null;
}

/** `values`: one independently measured result per model, over the whole catalog (not the compared
 *  columns). Returns null when the row cannot be assessed, else { saturated, topMean, ceiling, share, models }. */
export function saturationOf(values, row) {
  const ceiling = scaleCeiling(row);
  if (!ceiling) return null;
  const present = values.filter(finite);
  if (present.length < SATURATION_MIN_MODELS) return null;
  const top = [...present].sort((a, b) => b - a).slice(0, SATURATION_TOP_N);
  const topMean = top.reduce((sum, v) => sum + v, 0) / top.length;
  const share = topMean / ceiling;
  return { saturated: share >= SATURATION_THRESHOLD, topMean, ceiling, share, models: present.length, topN: top.length };
}

/** CR-38.3: is this row a preference or judge score rather than task accuracy? Curated in
 *  data/benchmark-caveats.json, every entry quoting its own source (see that file's quote_rule). */
export function isJudged(key, caveats) {
  return !!caveats?.judged?.[key];
}

/** CR-38.2: what the verified source itself says about this benchmark's task window and contamination
 *  control — `null` when it says nothing at all. The sentence for that case is the same for every
 *  benchmark, so it travels once as `matrix.freshnessDefaults` instead of on all 120 rows. */
export function freshnessOf(key, caveats, version = null) {
  // A versioned edition keeps its own task window: `family@2026-08` wins over the family-level
  // entry, so a June window never bleeds onto the August edition of the same benchmark.
  const entry = (version != null ? caveats?.freshness?.[`${key}@${version}`] : null) ?? caveats?.freshness?.[key] ?? null;
  if (!entry) return null;
  return {
    taskWindow: entry.task_window ?? null,
    contamination: entry.contamination ?? null,
    source: entry.quote ? { quote: entry.quote, field: entry.field ?? null } : null,
  };
}

/** CR-65.15 D9: a board whose source re-scored or stopped showing results after our capture; null otherwise. */
export function sourceChangeOf(key, caveats) {
  const entry = caveats?.source_changes?.[key] ?? null;
  return entry ? { kind: entry.kind, note: entry.note, checkedAt: entry.checked_at ?? null } : null;
}

/** The two sentences a row falls back to when its source states nothing. */
export function freshnessDefaults(caveats) {
  const d = caveats?.freshness_default ?? {};
  return { taskWindowNote: d.task_window_note ?? null, contaminationNote: d.contamination_note ?? null };
}

/** F-98: the (i) tooltip's second line — the test version, the date the results were read, and the
 *  task window when the source states one. */
export function versionLine(row, showPin = false) {
  const parts = [];
  // F-100 (pass 18): the raw identity `snapshot-2026-09-14 (unversioned)` is data, not copy (F-54) — a reader
  // sees "Published 2026-09-14" for a board without a version number, "Version 1.4" for one with.
  const snapshot = /^snapshot-(\d{4}-\d{2}-\d{2})/.exec(String(row.version ?? ''));
  const version = snapshot ? snapshot[1] : row.version ? String(row.version) : '';
  // CR-65.14: an unversioned board keeps one identity across refreshes, so the date inside that identity
  // means "first pinned on", not "collected on". Printing it beside a newer read date would give a reader
  // two dates and no way to tell which one the numbers come from — so once the read date is known, it is
  // the only date shown. Boards we have never re-read keep the pinning date, which is also their read date.
  // F-124: a hash-like identity is a pinned revision of the benchmark's repository, not a published
  // version. The table row says nothing about it (the read date carries the row); the result page
  // asks for it by name, because that is where a reader goes to find out what exactly was run.
  if (snapshot) { if (!row.asOf) parts.push(`Published ${snapshot[1]}`); }
  else if (version && isPin(version)) { if (showPin) parts.push(`Pinned revision ${version.toLowerCase()}`); }
  else if (version) parts.push(`Version ${version}`);
  // CR-65.15 D9: sources can change a published table in place; the value is the one published on this date.
  if (row.asOf && (snapshot || !version.includes(row.asOf))) parts.push(`values as published on ${row.asOf}`);
  const w = row.freshness?.taskWindow;
  if (w?.from) parts.push(w.to && w.to !== w.from ? `tasks from ${w.from} to ${w.to}` : `tasks from ${w.from}`);
  return parts.join(' · ');
}

/** F-100: harness cohorts as a reader knows them; anything unlisted is shown as the source spells it. */
const HARNESS_LABELS = { 'claude-code': 'Claude Code', codex: 'Codex', 'mini-swe-agent': 'mini-SWE-agent' };
export function cohortLabel(cohort) { return cohort ? (HARNESS_LABELS[cohort] ?? cohort) : cohort; }

/** CR-65.14: the registry's own lifecycle field, not a second hand-kept list. A board whose maintainer
 *  stopped reporting it is `status: "retained"` there, and the daily protocol review now checks that
 *  claim against the maintainer's protocol text on every refresh — so the tag is as current as the
 *  registry entry it reads. Exact per version: Terminal-Bench 2.1 is retired while 4.0 is not. */
export const isRetired = (status) => status === 'retained';

/** CR-1.7: tags, in display order — source tags (AA, Arena) first, then the editorial tier. */
export function rowTags(key, maintainer, taxonomy, caveats = null, saturation = null, status = null) {
  const tags = [];
  if (maintainer === 'Artificial Analysis' || taxonomy.aa_keys?.includes(key)) tags.push('aa');
  if (taxonomy.arena_keys?.includes(key)) tags.push('arena');
  if (taxonomy.aa_input_keys?.includes(key)) tags.push('aa_input');
  const tier = taxonomy.tiers?.[key];
  if (tier && taxonomy.tags[tier]) tags.push(tier);
  // F-98: the caveat tags come last, so a row reads "name · source · tier · caveat".
  if (isRetired(status)) tags.push('retired');
  if (saturation?.saturated) tags.push('saturated');
  if (isJudged(key, caveats)) tags.push('judged');
  if (sourceChangeOf(key, caveats)) tags.push('source_changed');
  return tags;
}

/** CR-38.3 / F-98: the caveat tags the Simple table shows — the ones a reader needs to read a number
 *  correctly, without the editorial tier tags that only matter in the full comparison. */
export const CAVEAT_TAGS = ['retired', 'saturated', 'judged', 'source_changed'];

/** A caveat tag's hover text for one row: the row's own source-change note where it has one. */
export function caveatTip(tag, row, tags) {
  return tag === 'source_changed' && row.sourceChange?.note ? row.sourceChange.note : tags[tag]?.tip ?? '';
}

/** Family-scope boards: the source publishes ONE value per model family, measured on a single primary
 * configuration (Epoch ECI / Software ECI, the AA Agentic Index, the two DesignArena Elo boards) — never
 * per reasoning effort. The dataset attaches such a value exactly once, on the deterministic family
 * representative (lib/family-representative.mjs). A comparison table whose columns are other
 * configurations of the same family would otherwise read "No result" for a value it actually has —
 * the gap the 2026-09-18 review gate found on /benchmarks (e.g. ECI and the Agentic index blank for
 * Fable 5.1, Opus 5 and Kimi K3 columns). The fill below shows the family's value in every sibling
 * column of the family — display only, never entering a score, a count or a saturation measurement —
 * and records the donor per sibling on `row.familyScope.fill`, so every rendered cell can say on
 * which exact configuration the family was measured. */
export const FAMILY_SCOPE_AXIS_KEYS = new Set(['aa_agentic_index', 'frontend', 'fullstack']);

/** Donor rule — the same semantics as the composite family-scope backfill (lib/client-model.ts):
 * share the deterministic representative's value when it has one; otherwise share only when every
 * holder in the family agrees. Disagreeing holders without a representative value share nothing.
 * A current sibling never displays a deprecated sibling's measurement. Mutates `byModel`;
 * returns { filledId: donorId } for the UI. `familyRows`: Map family_key → catalog rows. */
function attachFamilyScope(byModel, familyRows) {
  const fill = {};
  for (const [familyKey, rows] of familyRows) {
    const holders = rows.filter((r) => byModel.has(r.id));
    if (!holders.length) continue;
    const rep = deterministicFamilyRepresentative(familyKey, rows);
    let donor = null;
    if (rep && byModel.has(rep.id)) donor = rep;
    else if (new Set(holders.map((h) => byModel.get(h.id)[0])).size === 1) donor = [...holders].sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!donor) continue;
    const [value, basis] = byModel.get(donor.id);
    for (const r of rows) {
      if (byModel.has(r.id)) continue;
      if (r.deprecated !== true && donor.deprecated === true) continue;
      byModel.set(r.id, [value, basis]);
      fill[r.id] = donor.id;
    }
  }
  return fill;
}

/** A visibly different axis whose `this.scores` share one family measurement is NOT family-scope:
 * the scope property is about what the source measured, so only the keys above and the taxonomy's
 * model-field rows (Epoch ECI, by construction) fill. Exposed for the result page's own fill. */
export function familyScopeDonorOf(row, modelId) {
  const donor = row?.familyScope?.fill?.[modelId];
  return typeof donor === 'string' ? donor : null;
}

/** CR-41.1 (Florian 2026-09-16): one board run through different agents (Claude Code, Codex) — and, for the
 *  boards the taxonomy lists, through successive versions — reads as one row holding each model's best
 *  recorded result. Presentation only: the benchmark view, the API and every result page keep each run as it
 *  was published. Rows merge only with the same key, unit and direction, and only when at least two rows
 *  qualify. A cost twin (`<key>-cost`) follows the run its score row picked for that model, so a cost is
 *  never paired with another agent's score; without a picked score it takes its own best. Mutates `candidates`. */
export function mergeBestOf(candidates, taxonomy) {
  const rule = taxonomy.best_of;
  if (!rule) return;
  const harness = new Set(rule.harness_cohorts ?? []);
  const acrossVersions = new Set(rule.across_versions ?? []);
  const scoreKey = (key) => key.replace(/-cost$/, '');
  const groups = new Map();
  candidates.forEach((c, i) => {
    const { row } = c;
    if (!row.benchmarkId || !harness.has(row.cohort)) return;
    const versions = acrossVersions.has(scoreKey(row.key));
    const id = [row.key, versions ? '*' : row.version, row.unit, row.higherBetter].join('|');
    if (!groups.has(id)) groups.set(id, { versions, cost: row.key !== scoreKey(row.key), twin: `${scoreKey(row.key)}|${versions ? '*' : row.version}`, members: [] });
    groups.get(id).members.push(i);
  });
  const merged = new Map(); // "<score key>|<version or *>" → the variant picked per model, for the cost twins
  const drop = new Set();
  const ordered = [...groups.entries()].filter(([, g]) => g.members.length >= 2)
    .sort(([, a], [, b]) => Number(a.cost) - Number(b.cost));
  for (const [, { versions, cost, twin, members }] of ordered) {
    const rows = members.map((i) => candidates[i]);
    // newest version first, then the harness order the taxonomy gives — the tie-break for equal values
    const order = [...rows].sort((a, b) => compareVersions(b.row.version, a.row.version) || [...harness].indexOf(a.row.cohort) - [...harness].indexOf(b.row.cohort));
    const variants = order.map(({ row }) => ({ id: row.id, benchmarkId: row.benchmarkId, cohort: row.cohort, version: row.version }));
    const lead = order[0].row;
    const better = (a, b) => lead.higherBetter === false ? a < b : a > b;
    const scorePick = cost ? merged.get(twin) : null;
    const byModel = new Map(), pick = {};
    const models = new Set(order.flatMap((c) => [...c.byModel.keys()]));
    for (const modelId of models) {
      let k = scorePick?.[modelId] != null ? variants.findIndex((v) => v.cohort === scorePick[modelId].cohort && v.version === scorePick[modelId].version) : -1;
      if (k < 0 || !order[k].byModel.has(modelId)) {
        k = -1;
        order.forEach((c, j) => {
          const hit = c.byModel.get(modelId);
          if (!hit) return;
          const held = k < 0 ? null : order[k].byModel.get(modelId);
          const tier = held ? basisTierOf(hit[1]) - basisTierOf(held[1]) : -1;
          if (tier < 0 || (tier === 0 && better(hit[0], held[0]))) k = j;
        });
      }
      byModel.set(modelId, order[k].byModel.get(modelId));
      pick[modelId] = k;
    }
    if (!cost) merged.set(twin, Object.fromEntries(Object.entries(pick).map(([m, k]) => [m, variants[k]])));
    const cohorts = [...harness].filter((h) => variants.some((v) => v.cohort === h));
    const versionList = [...new Set(order.map((c) => c.row.version))].reverse();
    const suffix = lead.name.match(/\s+v?([\d.]+)$/);
    const name = versions && suffix?.[1] === lead.version ? lead.name.slice(0, suffix.index) : lead.name;
    const measured = [...byModel.values()].filter(([, basis]) => basis === 0).map(([v]) => v);
    const saturation = lead.saturation === undefined ? undefined : saturationOf(measured, lead);
    // CR-65.14: a best-of row is retired only when every version it merges is. The Coding Agent Index
    // merges a retained v1.4 into a live v1.5 — the board is still reported, so the row is not retired.
    const retired = order.every(({ row: r }) => r.retired === true);
    const row = {
      ...lead,
      id: `${lead.key}::best-of${versions ? '' : `::${lead.version}`}`,
      name,
      cohort: versions ? `best of ${versionList.map((v) => `v${v}`).join(' / ')} · ${cohorts.join(' / ')}` : `best of ${cohorts.join(' / ')}`,
      version: versions ? versionList.join(' / ') : lead.version,
      tags: lead.tags.filter((t) => t !== 'saturated' && t !== 'retired')
        .concat(retired ? ['retired'] : []).concat(saturation?.saturated ? ['saturated'] : []),
      saturation: saturation ?? lead.saturation,
      retired,
      asOf: order.map((c) => c.row.asOf).filter(Boolean).sort().pop() ?? lead.asOf,
      boards: [...new Set(order.map((c) => boardId(c.row)))],
      bestOf: { acrossVersions: versions, variants, pick },
    };
    // keep the caveat tags in their documented order (F-98 / CR-65.14): retired, saturated, judged, source_changed
    if (row.tags.includes('judged') && row.tags.includes('saturated')) row.tags = row.tags.filter((t) => t !== 'judged').concat('judged');
    if (row.tags.includes('source_changed')) row.tags = row.tags.filter((t) => t !== 'source_changed').concat('source_changed');
    members.forEach((i, j) => { if (j === 0) candidates[i] = { row, byModel }; else drop.add(i); });
  }
  for (let i = candidates.length - 1; i >= 0; i--) if (drop.has(i)) candidates.splice(i, 1);
}

/** Dotted numeric versions ("1.5" > "1.4", "snapshot-2026-09-14" by string); 0 when equal. */
function compareVersions(a = '', b = '') {
  const na = String(a).match(/^\d+(\.\d+)*$/), nb = String(b).match(/^\d+(\.\d+)*$/);
  if (na && nb) {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
    return 0;
  }
  return String(a).localeCompare(String(b));
}

export function buildBenchmarkMatrix(view, ds, taxonomy, caveats = null) {
  const registry = new Map(ds.benchmark_results.registry.map((b) => [b.id, b]));
  const catalog = new Set(ds.models.map((m) => m.id));
  const groupRank = new Map(taxonomy.groups.map((g, i) => [g.id, i]));
  const familyRows = new Map();
  for (const m of ds.models) {
    if (!familyRows.has(m.family_key)) familyRows.set(m.family_key, []);
    familyRows.get(m.family_key).push(m);
  }
  const candidates = [];
  for (const axis of view.axes) {
    if (axis.historical) continue; // bridged estimates never enter this table (CR-9.3)
    const byModel = new Map();
    for (const r of latestScores(axis.scores, 'all')) {
      if (!r.modelId || !catalog.has(r.modelId) || !finite(r.value)) continue;
      byModel.set(r.modelId, [r.value, BASIS_CODE[r.basis] ?? 2]);
    }
    if (!byModel.size) continue;
    const key = baseKey(axis.benchmarkId), b = registry.get(axis.benchmarkId);
    // CR-38.2: saturation is measured over the whole catalog's independently measured results
    // (basis 0), never over the handful of columns a reader happens to compare — and never over
    // family-scope fills, which repeat one measurement across a family's columns.
    const scale = { unit: axis.unit, range: b?.scoring?.range ?? taxonomy.score_ranges?.[key] ?? null, higherBetter: axis.higherBetter ?? null };
    const saturation = saturationOf([...byModel.values()].filter(([, basis]) => basis === 0).map(([v]) => v), scale);
    const ownCount = byModel.size;
    const familyScope = FAMILY_SCOPE_AXIS_KEYS.has(key) ? attachFamilyScope(byModel, familyRows) : null;
    candidates.push({ byModel, ownCount, row: {
      // F-80: row labels use the site's short vendor prefix ("AA …" like AA Intelligence Index); the registry keeps the full name.
      id: axis.id, benchmarkId: axis.benchmarkId, key, name: axis.name.replace(/^Artificial Analysis /, 'AA '),
      cohort: axis.cohort === 'Published board' ? null : cohortLabel(axis.cohort),
      // Unregistered snapshot axes (AA indices) take their documented scale from the taxonomy; presentation only.
      description: taxonomy.descriptions?.[key] ?? axis.description ?? '', unit: axis.unit, range: b?.scoring?.range ?? taxonomy.score_ranges?.[key] ?? null,
      higherBetter: axis.higherBetter ?? null, group: groupOf(key, axis.category, taxonomy),
      tags: rowTags(key, b?.maintainer ?? null, taxonomy, caveats, saturation, b?.status ?? null), url: axis.url ?? '', version: axis.version ?? '', ranking: axis.benchmarkId,
      saturation, judged: isJudged(key, caveats), freshness: freshnessOf(key, caveats, b?.version ?? null), asOf: b?.last_verified ?? null,
      sourceChange: sourceChangeOf(key, caveats), retired: isRetired(b?.status ?? null),
    } });
    if (familyScope && Object.keys(familyScope).length) {
      const c = candidates[candidates.length - 1];
      c.row.familyScope = { fill: familyScope };
      if (!c.row.tags.includes('family_scope')) c.row.tags.push('family_scope');
    }
  }
  // Index values the benchmark view keeps on the model row rather than as an axis (Epoch ECI).
  // They publish one value per model family, measured on one primary configuration — family-scope
  // by construction, filled exactly like the family-scope axes above.
  for (const extra of taxonomy.model_field_rows ?? []) {
    const date = String(ds.sources?.[extra.source] ?? '').slice(0, 10);
    const byModel = new Map();
    for (const m of ds.models) if (finite(m.benchmarks?.[extra.field])) byModel.set(m.id, [m.benchmarks[extra.field], 0]);
    if (!byModel.size) continue;
    const saturation = saturationOf([...byModel.values()].map(([v]) => v), { unit: extra.unit, range: taxonomy.score_ranges?.[extra.key] ?? null, higherBetter: true });
    const ownCount = byModel.size;
    const familyScope = attachFamilyScope(byModel, familyRows);
    candidates.push({ byModel, ownCount, row: {
      id: `${extra.key}::snapshot-${date}`, benchmarkId: null, key: extra.key, name: extra.name, cohort: null,
      description: extra.description, unit: extra.unit, range: null, higherBetter: true, group: groupOf(extra.key, null, taxonomy),
      tags: rowTags(extra.key, extra.maintainer, taxonomy, caveats, saturation, null), url: extra.url, version: `snapshot-${date}`, ranking: null,
      saturation, judged: isJudged(extra.key, caveats), freshness: freshnessOf(extra.key, caveats), asOf: date || null, sourceChange: sourceChangeOf(extra.key, caveats),
      retired: false,
    } });
    if (Object.keys(familyScope).length) {
      const c = candidates[candidates.length - 1];
      c.row.familyScope = { fill: familyScope };
      if (!c.row.tags.includes('family_scope')) c.row.tags.push('family_scope');
    }
  }
  mergeBestOf(candidates, taxonomy);
  const tierRank = (row) => Math.min(...row.tags.map((t) => TIER_RANK[t] ?? 3), 3);
  candidates.sort((a, b) => (groupRank.get(a.row.group) ?? 99) - (groupRank.get(b.row.group) ?? 99)
    || tierRank(a.row) - tierRank(b.row)
    // ownCount (pre-fill): family-scope fills repeat one measurement per family, so they must not
    // look like broader coverage in the "rows with more results first" ordering.
    || (b.ownCount ?? b.byModel.size) - (a.ownCount ?? a.byModel.size)
    || a.row.name.localeCompare(b.row.name) || a.row.id.localeCompare(b.row.id));
  const rows = [], values = {};
  candidates.forEach(({ row, byModel }, i) => {
    rows.push(row);
    for (const [modelId, [value, basis]] of byModel) (values[modelId] ||= []).push([i, value, basis]);
  });
  const used = new Set(rows.map((r) => r.group));
  return {
    version: taxonomy.version,
    groups: taxonomy.groups.filter((g) => used.has(g.id)).map(({ id, label }) => ({ id, label })),
    tags: taxonomy.tags, rows, values, generatedAt: ds.generated_at, catalogBoards: countBoards(rows),
    freshnessDefaults: freshnessDefaults(caveats),
  };
}

/** CR-29.3: 'top' / 'low' tags for results that stand out from the other models in one row.
 *  Transparent rule: a row needs at least OUTLIER_MIN_VALUES results and a known direction. The core is
 *  every result except the single best and the single worst. The best is 'top' when its lead over the
 *  runner-up is at least OUTLIER_CORE_MULTIPLE times the core's spread; the worst is 'low' when its gap to
 *  the next result is too. Either gap must also be at least OUTLIER_MIN_SHARE of the whole row's spread.
 *  Ties, flat rows and short rows get no tag, so a tag means a clear gap, not merely the max or min. */
export const OUTLIER_MIN_VALUES = 4;
export const OUTLIER_CORE_MULTIPLE = 2;
export const OUTLIER_MIN_SHARE = 0.1;
export function rowOutliers(values, higherBetter) {
  const out = values.map(() => null);
  if (higherBetter == null) return out;
  const present = values.filter(finite);
  if (present.length < OUTLIER_MIN_VALUES) return out;
  const sorted = [...present].sort((a, b) => higherBetter ? b - a : a - b); // best first
  const n = sorted.length, spread = Math.abs(sorted[0] - sorted[n - 1]);
  if (!(spread > 0)) return out;
  const core = sorted.slice(1, n - 1), coreSpread = Math.abs(core[0] - core[core.length - 1]);
  const clear = (gap) => gap >= OUTLIER_CORE_MULTIPLE * coreSpread && gap >= OUTLIER_MIN_SHARE * spread && gap > 0;
  const lead = Math.abs(sorted[0] - sorted[1]), trail = Math.abs(sorted[n - 2] - sorted[n - 1]);
  const unique = (v) => values.filter((x) => x === v).length === 1;
  values.forEach((v, j) => {
    if (!finite(v)) return;
    if (v === sorted[0] && unique(v) && clear(lead)) out[j] = 'top';
    else if (v === sorted[n - 1] && unique(v) && clear(trail)) out[j] = 'low';
  });
  return out;
}

/** CR-31.2: one plain sentence on what kind of number a benchmark row delivers. */
export function scoreTypeText(row) {
  const lower = row.higherBetter === false ? ' Lower is better.' : row.higherBetter === true ? ' Higher is better.' : '';
  if (row.unit === 'fraction' || row.unit === 'percent') return `Score: share of tasks solved, shown as a percentage.${lower}`;
  if (row.unit === 'Elo') return `Score: an Elo rating from head-to-head votes — relative, only comparable within this board.${lower}`;
  if (row.unit === 'USD') return `Score: US dollars.${lower}`;
  if (row.unit === 'points' && Array.isArray(row.range) && row.range[0] === 0 && row.range[1] === 100) return `Score: an index on a 0–100 scale.${lower}`;
  if (row.unit === 'points' || !row.unit) return `Score: points on the benchmark's own scale.${lower}`;
  return `Score: ${row.unit}.${lower}`;
}

/** CR-33.1/33.2: the shortlist column chart. Models with a value are sorted high → low (lower-is-better
 *  scores are not offered here); a model without a value stays in the chart as 'no data' at the end,
 *  never as a zero bar. Heights reuse chartScale, so Elo boards are drawn between their padded row
 *  minimum and maximum instead of from an arbitrary zero. */
export function shortlistColumns(items, unit, { zeroBaseline = false } = {}) {
  const withValue = items.filter((it) => finite(it.value)).sort((a, b) => b.value - a.value || String(a.id).localeCompare(String(b.id)));
  const without = items.filter((it) => !finite(it.value));
  const zoom = zeroBaseline ? null : zoomedScale(withValue.map((it) => it.value), unit);
  const scale = zoom ?? chartScale(withValue.map((it) => it.value), unit);
  const columns = [
    ...withValue.map((it, k) => ({ ...it, height: scale ? Math.max(0.02, scale.positions[k] ?? 0) : null, noData: false })),
    ...without.map((it) => ({ ...it, value: null, height: null, noData: true })),
  ];
  const domain = scale?.domain ?? null;
  return { columns, kind: scale?.kind ?? null, domain, ticks: domain && (scale.kind === 'bar' || scale.kind === 'zoomed') ? axisTicks(domain) : [] };
}

/** CR-40.2 (Florian 2026-09-16): benchmark scores on a 0–100 points scale are not ratio measurements
 *  ("50 is not half as good as 100"), and bars from zero made a 65–95 shortlist look alike. The default
 *  axis therefore starts a little below the lowest value, on a round step, and the chart states the range
 *  it draws. Only for points/percent scores; Elo keeps its position scale, and a range that would reach
 *  zero anyway is simply the zero baseline. `null` = draw from zero. */
export function zoomedScale(values, unit) {
  if (unit !== 'points' && unit !== 'percent') return null;
  const present = values.filter(finite);
  if (present.length === 0) return null;
  const min = Math.min(...present), max = Math.max(...present), span = max - min;
  const step = span <= 8 ? 2 : span <= 30 ? 5 : 10;
  const lo = Math.max(0, Math.floor((min - Math.max(1, span * 0.25)) / step) * step);
  let hi = Math.ceil((max + Math.max(0.5, span * 0.05)) / step) * step;
  if (max <= 100) hi = Math.min(hi, 100);
  if (lo <= 0 || hi <= lo) return null;
  return { kind: 'zoomed', domain: [lo, hi], positions: values.map((v) => finite(v) ? Math.min(1, Math.max(0, (v - lo) / (hi - lo))) : null) };
}

/** Axis ticks for a bar domain: 3–6 labels on a 1/2/2.5/5 step counted from the axis start, the end
 *  always labelled. */
export function axisTicks([lo, hi]) {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const mag = 10 ** Math.floor(Math.log10(span / 4));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((st) => span / st <= 5) ?? 10 * mag;
  const ticks = [];
  for (let k = 0; lo + k * step < hi - step / 2 + 1e-9; k++) ticks.push(Number((lo + k * step).toFixed(6)));
  ticks.push(hi);
  return ticks;
}

/** CR-28.1 (Florian 2026-09-15): the start page's benchmark list shows every benchmark with a result for the
 *  models it compares, not only the headline rows. The full matrix is too large to ship with the home page,
 *  so the client asks for exactly its models: rows with at least one value among them, re-indexed, values
 *  kept only for those models. `catalogRows` is the matrix's full row count, for an honest "N of M". */
export function matrixForModels(matrix, modelIds) {
  const allowed = new Set(modelIds);
  const used = new Set();
  for (const id of allowed) for (const [i] of matrix.values[id] ?? []) used.add(i);
  const keep = new Map(); const rows = [];
  matrix.rows.forEach((row, i) => { if (used.has(i)) { keep.set(i, rows.length); rows.push(row); } });
  const values = {};
  for (const id of allowed) { const list = (matrix.values[id] ?? []).filter(([i]) => keep.has(i)).map(([i, v, b]) => [keep.get(i), v, b]); if (list.length) values[id] = list; }
  const groups = new Set(rows.map((r) => r.group));
  // `catalogBoards` (the whole catalog's board count) travels with the spread; `catalogRows` stays
  // the matrix's full row count for the places that speak about rows.
  return { ...matrix, groups: matrix.groups.filter((g) => groups.has(g.id)), rows, values, catalogRows: matrix.rows.length };
}
