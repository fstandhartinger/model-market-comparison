import sCategoryCells from '../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-category-cells.json' with { type: 'json' };
import spokeExceptions from '../data/jevbench-radar-spoke-exceptions.json' with { type: 'json' };
import l3ExposureNotes from '../data/jevbench-l3-exposure-notes.json' with { type: 'json' };
/** CR-334 (8 Oct, CoS review): rows whose provider family reviewed the L3 items carry an explicit note. */
export const L3_EXPOSURE_NOTES = Object.fromEntries(l3ExposureNotes.keys.map((k) => [k, l3ExposureNotes.note]));
import languageCells from '../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-language-cells.json' with { type: 'json' };
import { jevScopeDisplayOrder } from './jevbench-scope.mjs';
import jevV161 from '../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json' with { type: 'json' };
import jevV16 from '../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-categories.json' with { type: 'json' };
import jevV161Supplement from '../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-cells-supplement.json' with { type: 'json' };
import { RADAR_MIN_N } from './radar-shape.mjs';
import { withApiRerunCells } from './jevbench-api-rerun-cells.mjs';
// CR-257 (Florian 1 Oct 2026): the per-category radars in "Compare two systems" — capability by subject topic (the v1.2 topic
// radar of CR-94, lost when v1.5 replaced the compare view in CR-205) and the TypeSafe use-case categories — for every ranked
// system of the current JevBench and ImageJevBench releases. Every value is an aggregate computed on Sandy from the stored
// per-item results that reproduce the published per-type cells / correct counts exactly; nothing is estimated. Method and
// labelling: the artifacts' `metric`, `labelling` and `rules` fields; job folder bench-radars-usecases-20261001.
import jevV15 from '../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json' with { type: 'json' };
import jevV155 from '../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.5-categories.json' with { type: 'json' };
import jevV157 from '../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.7-categories.json' with { type: 'json' };
import jevV156 from '../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.6-categories.json' with { type: 'json' };
import imageV015 from '../data/raw/benchmarks/jevbench/multimodal-preview/categories-v0.1.5.json' with { type: 'json' };

export const JEVBENCH_CATEGORY_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.7-categories.json';
export const IMAGEJEV_CATEGORY_ARTIFACT = 'data/raw/benchmarks/jevbench/multimodal-preview/categories-v0.1.5.json';
/** v1.5.0–v1.5.7 score the same 1,624 decisions; point releases only add rows, so one per-item labelling covers them all. */
export const JEVBENCH_CATEGORY_REVISIONS = ['v1.5.0', 'v1.5.1', 'v1.5.2', 'v1.5.3', 'v1.5.4', 'v1.5.5', 'v1.5.6', 'v1.5.7', 'v1.6.0', 'v1.6.1'];
export const IMAGEJEV_CATEGORY_REVISIONS = ['v0.1.5'];

const fail = (name, message) => { throw new Error(`${name} category artifact: ${message}`); };

/** Structural checks shared by both artifacts: dimension coverage, item counts and per-system cells. */
export function validateCategoryArtifact(a, dims) {
  const name = a?.benchmark ?? '?';
  if (a?.kind !== 'category-aggregates' || !Number.isInteger(a.min_n) || a.min_n < 1) fail(name, 'kind / min_n');
  for (const dim of dims) {
    const cats = a[dim];
    if (!Array.isArray(cats) || cats.length < 5) fail(name, `${dim}: at least five categories`);
    if (new Set(cats.map((c) => c.key)).size !== cats.length) fail(name, `${dim}: duplicate keys`);
    for (const c of cats) if (typeof c.label !== 'string' || typeof c.covers !== 'string' || !Number.isInteger(c.n)) fail(name, `${dim}.${c.key}: label, covers, n`);
  }
  for (const [key, row] of Object.entries(a.systems ?? {})) {
    for (const dim of dims) {
      const known = new Map(a[dim].map((c) => [c.key, c.n]));
      for (const [c, cell] of Object.entries(row[dim] ?? {})) {
        if (!known.has(c)) fail(name, `${key}.${dim}.${c}: unknown category`);
        if (!Number.isInteger(cell.n) || cell.n < 1 || cell.n > known.get(c) || typeof cell.competence !== 'number' || !Number.isFinite(cell.competence)) fail(name, `${key}.${dim}.${c}: cell`);
      }
    }
  }
  return a;
}

validateCategoryArtifact(jevV15, ['topics', 'usecases']);
validateCategoryArtifact(jevV155, ['topics', 'usecases']);
validateCategoryArtifact(jevV157, ['topics', 'usecases']);
validateCategoryArtifact(jevV16, ['topics', 'usecases']);
validateCategoryArtifact(jevV156, ['topics', 'usecases']);
validateCategoryArtifact(imageV015, ['capabilities', 'usecases']);

/** Spoke labels; the full label stays in the tooltip and the category key. */
export const CATEGORY_SHORT = { search_retrieval: 'Search & retrieval', model_routing: 'Model routing', llm_guardrails: 'LLM guardrails',
  legal_compliance: 'Legal & compliance', ecommerce_marketplaces: 'E-commerce', moderation_trust_safety: 'Moderation',
  knowledge_graphs: 'Knowledge graphs', feature_extraction: 'Feature extraction', code_linting: 'Code linting',
  scientific_discovery: 'Science', demand_forecasting: 'Demand forecasting', risk_assessment: 'Risk assessment',
  financial_crime: 'Financial crime', insurance_claims: 'Insurance claims', lead_generation: 'Lead generation', customer_support: 'Customer support' };
/** Historical views omit "Other". The live L3/C1 view draws all 20 requested use-case spokes. */
const NOT_PLOTTED = new Set(['other']);
/** CR-290 radar correction (Florian 5 Oct 2026 ~20:30): a radar spoke needs a well-measured category (RADAR_MIN_N = 30 items in
 *  the pool, and a system's cell 30 answered items). Smaller categories go to a "low sample, indicative only" table below the
 *  radar instead of becoming spokes. Display only: the artifact's own min_n (the reporting minimum for a published cell) and
 *  every score are unchanged. */
export { RADAR_MIN_N };
const catView = (cats, minN, includeOther = false) => cats.map((c) => ({ key: c.key, label: c.label, short: CATEGORY_SHORT[c.key] ?? c.label, covers: c.covers, n: c.n,
  split: c.open !== undefined ? { a: c.open, b: c.sealed } : { a: c.public, b: c.sealed }, lowN: c.n < minN,
  plotted: c.n >= Math.max(minN, RADAR_MIN_N) && (includeOther || !NOT_PLOTTED.has(c.key)), lowSample: c.n < Math.max(minN, RADAR_MIN_N) && c.n > 0 && (includeOther || !NOT_PLOTTED.has(c.key)) }));

/** What the compare view ships to the browser: category descriptors and, for the given system keys, competence + n per
 *  category. Systems without per-item data carry the artifact's reason instead. */
function view(a, dims, keys, labels) {
  const systems = {}, missing = {};
  for (const k of keys) {
    const row = a.systems[k];
    if (!row || dims.some((d) => !row[d.key])) { missing[k] = a.unavailable?.[k] ?? 'No per-category values are published for this system.'; continue; }
    systems[k] = Object.fromEntries(dims.map((d) => [d.key, Object.fromEntries(Object.entries(row[d.key]).map(([c, v]) => [c, [v.competence, v.n, ...(Number.isInteger(v.coverage_n) ? [v.coverage_n] : [])]]))]));
  }
  return {
    revision: a.revision, minN: a.min_n, radarMinN: Math.max(a.min_n, RADAR_MIN_N), metric: a.metric, labelling: a.labelling, rules: a.rules ?? [],
    splitNames: labels,
    spokeExceptions: a.live_category_cells ? Object.fromEntries(spokeExceptions.filter((e) => keys.includes(e.key)).map((e) => [e.key, e.reason])) : {},
    exposureNotes: a.live_category_cells ? Object.fromEntries(keys.filter((k) => L3_EXPOSURE_NOTES[k]).map((k) => [k, L3_EXPOSURE_NOTES[k]])) : {},
    categoryPools: Object.fromEntries(keys.filter((k) => a.systems[k]).map((k) => [k, a.systems[k].category_pools ?? a.systems[k].coverage ?? labels.join("+")])),
    dims: dims.map((d) => ({ key: d.key, title: d.title, note: d.note, cats: catView(a[d.key], a.min_n, Boolean(a.live_category_cells)) })),
    systems, missing,
  };
}

export const JEVBENCH_CELL_SUPPLEMENT_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-cells-supplement.json';

/**
 * v1.7.12 (Part B, 7 Oct 2026): the live boards overlay the sealed language/use-case supplements (L1 354 + L2 33 items) on the
 * frozen v1.6.1 S + P cells. Category lists (pool counts) come from the supplement; a row with a supplement entry takes its
 * cells from it, every other row keeps its S + P cells and gets coverage 'S+P'. The frozen artifact itself is not changed.
 */
export function withJevCellSupplement(base, supplement = jevV161Supplement) {
  if (base?.revision !== supplement.revision) throw new Error(`cell supplement ${supplement.revision} does not match ${base?.revision}`);
  const dims = ['families', 'usecases', 'languages', 'topics'];
  const systems = Object.fromEntries(Object.entries(base.systems).map(([key, row]) => [key, supplement.systems[key] ?? { ...row, coverage: 'S+P' }]));
  return {
    ...base, ...Object.fromEntries(dims.map((d) => [d, supplement[d]])), systems, lane_note: supplement.lane_note, labelling: supplement.labelling, rules: supplement.rules,
    supplement: { revision: supplement.board_revision, pools: supplement.pools, pool_items: supplement.pool_items, drawn: supplement.drawn, note: supplement.note, source_sha256: supplement.source_sha256 },
  };
}

export const JEVBENCH_S_CATEGORY_CELLS_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-category-cells.json';
/** Current category union for S-based rows; frozen v1.7.12 cells remain available for history.
 * Overlay categories are added afterwards; S-based full-set rows (including d1) take precedence. */
export function withSCategoryCells(base, cells = sCategoryCells) {
  if (base.revision !== cells.revision) throw new Error('S category cells revision mismatch');
  const systems = { ...base.systems };
  for (const [key, row] of Object.entries(cells.systems)) systems[key] = {
    ...systems[key], ...row, coverage: row.category_pools,
  };
  return { ...base, systems, ...Object.fromEntries(['families', 'topics', 'usecases'].map((d) => [d, cells[d]])),
    metric: 'O1S chance-corrected competence: equal mean across the request types present, clipped to 0–100. Zero means the equal-weight mean across present request types was at or below baseline; negative means are clipped. It does not mean every type scored zero. Choice uses a random-option baseline; Noul uses a fixed 50% accuracy baseline (abstentions count as wrong); Score uses the midpoint-guess error (random-guess fallback when every gold is at the midpoint). Compare models within a category; row pools and supported types can differ.',
    labelling: 'Categories use ruled subject-topic labels and authoring use-case precedence across the answered pool union, with stable item identities counted once.',
    rules: [cells.note, 'S-based category cells pool recorded supported responses from S+P and the answered L1/L2/L3 supplements. API overlay category cells keep their separately recorded A4/A5+P union. Headline and per-type/tier scores are unchanged.'],
    live_category_cells: { pools: cells.pools, revision: cells.board_revision, note: cells.note } };
}
export function withLiveCategoryCells(base) {
  return withLanguageCells(withApiRerunCells(withSCategoryCells(withJevCellSupplement(base))));
}

export const JEVBENCH_LANGUAGE_CELLS_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-language-cells.json';
export function languageCoverage(row) {
  return row.sealed_basis ? [row.sealed_basis, 'P', ...['L1', 'L2', 'L3', 'L4'].filter((p) => (row.pool_ok?.[p] ?? 0) > 0)].join('+') : row.language_coverage ?? row.coverage ?? 'S+P';
}
/** Language-only overlay; subject topics, families, use cases and headline data keep their own basis. */
export function withLanguageCells(base, cells = languageCells) {
  if (base.revision !== cells.revision) throw new Error('language cells revision mismatch');
  const systems = { ...base.systems };
  for (const [key, row] of Object.entries(cells.systems)) systems[key] = {
    ...systems[key], languages: row.languages, language_coverage: languageCoverage(row),
  };
  return { ...base, systems, languages: cells.languages, language_cells: {
    pools: cells.pools, min_n: cells.min_n,
    drawn: cells.drawn ?? null,
    row_scoped_supplements: cells.row_scoped_supplements ?? {},
    min_api_basis: Math.min(...cells.languages.map((l) => l.n_api_basis)),
  } };
}
/** Same measured row set as the board, with wrappers always below the models. */
export function jevLanguageRows(systems, scope = 'open') {
  const models = systems.filter((s) => s.listing !== 'wrapper');
  const ordered = scope === 'api'
    ? [...models.filter((s) => s.ranked).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)), ...models.filter((s) => !s.ranked)]
    : jevScopeDisplayOrder(models);
  return [...ordered, ...systems.filter((s) => s.listing === 'wrapper')];
}
export const JEVBENCH_LANGUAGE_META = withLanguageCells({ revision: languageCells.revision, systems: {} }).language_cells;
export function languagePoolNote(meta) {
  const p = meta.pools;
  const supplements = ['L1', 'L2', 'L3'].map((k) => `${k} (${(p[k] ?? 0).toLocaleString('en-US')} items)`).join(' + ');
  const l4 = meta.row_scoped_supplements?.L4;
  const l4Note = l4 ? ` L4 adds ${l4.n} new Hindi items for Fastino GLiNER 2.5 Decide only. They were authored with OpenAI and independently solved and language-reviewed with Anthropic before sealing. Seventeen L4 requests succeeded; three HTTP 400 failures remain in the scored observations and do not count as completed coverage. L4 is outside headline and category scores and the common header counts.` : '';
  return `Self-hosted rows use S ${p.S.toLocaleString('en-US')} + P ${p.P.toLocaleString('en-US')} + ${supplements}, where answered. API rows re-run on A4/A5 use their ${p.A4.toLocaleString('en-US')}/${p.A5.toLocaleString('en-US')}-item sealed subset instead of S. Every row’s tag lists the pools it actually answered. L3 is a sealed language supplement (${(p.L3 ?? 0).toLocaleString('en-US')} items), ${meta.drawn ? `drawn ${meta.drawn}` : (p.L3 > 0 ? 'draw date not published' : 'not drawn yet')}. Every language has at least ${meta.min_api_basis} items in P ∪ L1 ∪ L2 ∪ L3. Header counts show the full S + P + L1 + L2 + L3 pool. Headline scores are unchanged; these raw cells are unequated, scored for language/category views only and outside the Composite. L3 items were written natively by Claude Sonnet 5.5, each solved blind and language-checked by GPT-6.1 Sol, with gold kept only when both agree or a second review confirms; no gold comes from Jev or any measured API. L3 is API-facing by design and is excluded from future headline draws. Rows with unfinished runs retain their actual coverage tags. L3 items were reviewed by an OpenAI model, so the L3-based language and category cells of OpenAI rows (OpenAI Decisions, GPT-6 Luna, GPT-5.6 Luna) carry that exposure; headline scores do not use L3. C1 adds English items for thin radar categories (everyday language, safety and the other use case).${l4Note}`;
}

export function jevbenchCategoryView(revision, keys, { supplement = false } = {}) {
  if (!JEVBENCH_CATEGORY_REVISIONS.includes(revision)) return null;
  // CR-331: the live boards (supplement) also carry the API overlay rows' cells (A4/A5 re-runs, Liquid d1).
  return view(revision === 'v1.6.1' ? (supplement ? withLiveCategoryCells(jevV161) : jevV161) : revision === 'v1.6.0' ? jevV16 : revision === 'v1.5.7' ? jevV157 : revision === 'v1.5.6' ? jevV156 : revision === 'v1.5.5' ? jevV155 : jevV15, [
    { key: 'topics', title: 'Capability by subject topic', note: 'What the decision is about — math and dates, coding, rules, money, support work, everyday messages, safety.' },
    { key: 'usecases', title: 'Use cases (TypeSafe categories)', note: 'The real-world application area of each decision, after the TypeSafe use-case map; an item can count in two.' },
  ], keys, ['open', 'sealed']);
}

export function imageJevCategoryView(revision, keys) {
  if (!IMAGEJEV_CATEGORY_REVISIONS.includes(revision)) return null;
  return view(imageV015, [
    { key: 'capabilities', title: 'Capability by image type', note: 'The kind of image and task: photos, documents, charts, screens, web tasks, tables, geometry.' },
    { key: 'usecases', title: 'Use cases (TypeSafe categories)', note: 'The real-world application area of each question, after the TypeSafe use-case map; an item can count in two.' },
  ], keys, ['public', 'sealed']);
}
