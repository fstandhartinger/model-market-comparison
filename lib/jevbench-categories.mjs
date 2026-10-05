import jevV16 from '../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-categories.json' with { type: 'json' };
import { RADAR_MIN_N } from './radar-shape.mjs';
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
export const JEVBENCH_CATEGORY_REVISIONS = ['v1.5.0', 'v1.5.1', 'v1.5.2', 'v1.5.3', 'v1.5.4', 'v1.5.5', 'v1.5.6', 'v1.5.7', 'v1.6.0'];
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
/** "Other" is not a use case: it is counted and listed, never drawn as a spoke. */
const NOT_PLOTTED = new Set(['other']);
/** CR-290 radar correction (Florian 5 Oct 2026 ~20:30): a radar spoke needs a well-measured category (RADAR_MIN_N = 30 items in
 *  the pool, and a system's cell 30 answered items). Smaller categories go to a "low sample, indicative only" table below the
 *  radar instead of becoming spokes. Display only: the artifact's own min_n (the reporting minimum for a published cell) and
 *  every score are unchanged. */
export { RADAR_MIN_N };
const catView = (cats, minN) => cats.map((c) => ({ key: c.key, label: c.label, short: CATEGORY_SHORT[c.key] ?? c.label, covers: c.covers, n: c.n,
  split: c.open !== undefined ? { a: c.open, b: c.sealed } : { a: c.public, b: c.sealed }, lowN: c.n < minN,
  plotted: c.n >= Math.max(minN, RADAR_MIN_N) && !NOT_PLOTTED.has(c.key), lowSample: c.n < Math.max(minN, RADAR_MIN_N) && c.n > 0 && !NOT_PLOTTED.has(c.key) }));

/** What the compare view ships to the browser: category descriptors and, for the given system keys, competence + n per
 *  category. Systems without per-item data carry the artifact's reason instead. */
function view(a, dims, keys, labels) {
  const systems = {}, missing = {};
  for (const k of keys) {
    const row = a.systems[k];
    if (!row) { missing[k] = a.unavailable?.[k] ?? 'No per-category values are published for this system.'; continue; }
    systems[k] = Object.fromEntries(dims.map((d) => [d.key, Object.fromEntries(Object.entries(row[d.key]).map(([c, v]) => [c, [v.competence, v.n]]))]));
  }
  return {
    revision: a.revision, minN: a.min_n, radarMinN: Math.max(a.min_n, RADAR_MIN_N), metric: a.metric, labelling: a.labelling, rules: a.rules ?? [],
    splitNames: labels,
    dims: dims.map((d) => ({ key: d.key, title: d.title, note: d.note, cats: catView(a[d.key], a.min_n) })),
    systems, missing,
  };
}

export function jevbenchCategoryView(revision, keys) {
  if (!JEVBENCH_CATEGORY_REVISIONS.includes(revision)) return null;
  return view(revision === 'v1.6.0' ? jevV16 : revision === 'v1.5.7' ? jevV157 : revision === 'v1.5.6' ? jevV156 : revision === 'v1.5.5' ? jevV155 : jevV15, [
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
