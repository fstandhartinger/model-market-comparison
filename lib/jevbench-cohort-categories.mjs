// Standing rule (Florian, 16 Oct 2026): every row on the live boards carries topic, use-case and language cells. Rows that
// joined from a fresh draw after v1.6.1 (readCohortRows) take them from their own draw's published category artifact,
// tagged with that draw; a draw published before its items were labelled gets its subject-topic and use-case cells from
// the cohort topic supplement (same labelling recipe and pinned scorer, computed later from the stored per-item runs).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { withRowPoolCategoryRows } from './jevbench-api-full-addenda.mjs';

export const COHORT_TOPIC_CELLS_PATH = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6-cohort-topic-cells.json';
const DIMS = ['topics', 'usecases', 'languages'];
const SUPPLEMENT_DIMS = ['topics', 'usecases'];
const MIN_N = 15;
// The fast-lane draw (v1.6.4) still used the short use-case keys of the v1.5 labeller (build_topics_v16.py UC_LONG).
const UC_LONG = { ecommerce: 'ecommerce_marketplaces', moderation: 'moderation_trust_safety' };
const fail = (m) => { throw new Error(`cohort category cells: ${m}`); };
const sha = (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);

export const cohortCoverageTag = (drawId) => `S+P (draw ${drawId})`;

/** Aggregate-only supplement: per draw, the labels and scorer it was computed with and per-row topic cells. */
export function validateCohortTopicCells(a) {
  if (a?.kind !== 'jevbench-cohort-topic-cells' || a.schema_version !== 1 || typeof a.draws !== 'object' || !a.draws) fail('schema');
  if (/"(?:item_ids?|opaque_id|task_id|gold|prediction|item_text|prompt|question)"/.test(JSON.stringify(a))) fail('item-level field');
  for (const [draw, d] of Object.entries(a.draws)) {
    for (const k of ['labels_sha256', 'scorer_sha256', 'results_sha256']) if (!sha(d[k])) fail(`${draw}: ${k}`);
    if (typeof d.release !== 'string' || typeof d.labelling !== 'string' || typeof d.row_note !== 'string' || d.row_note.length > 240 || !Array.isArray(d.topics) || d.topics.length < 5) fail(`${draw}: release / labelling / topics`);
    for (const [key, x] of Object.entries(d.extra_rows ?? {})) {
      if (typeof x.coverage !== 'string' || typeof x.note !== 'string' || typeof x.pool_counts !== 'object') fail(`${draw}.${key}: extra row coverage / note / pool_counts`);
      for (const dim of DIMS) for (const [c, cell] of Object.entries(x[dim] ?? {})) {
        const n = x.pool_counts[dim]?.[c];
        if (!Number.isInteger(cell.n) || cell.n < MIN_N || !Number.isInteger(n) || cell.n > n || !Number.isFinite(cell.competence)) fail(`${draw}.${key}.${dim}.${c}`);
      }
    }
    for (const dim of SUPPLEMENT_DIMS) {
      if (d[dim] === undefined) continue;
      const known = new Map(d[dim].map((c) => [c.key, c.n]));
      for (const [key, row] of Object.entries(d.systems ?? {})) for (const [c, cell] of Object.entries(row[dim] ?? {})) {
        if (!known.has(c) || !Number.isInteger(cell.n) || cell.n < MIN_N || cell.n > known.get(c) || !Number.isFinite(cell.competence)) fail(`${draw}.${key}.${dim}.${c}`);
      }
    }
  }
  return a;
}

export async function readCohortTopicCells(root = process.cwd()) {
  try { return validateCohortTopicCells(JSON.parse(await readFile(path.join(root, COHORT_TOPIC_CELLS_PATH), 'utf8'))); }
  catch (error) { if (error.code === 'ENOENT') return { schema_version: 1, kind: 'jevbench-cohort-topic-cells', draws: {} }; throw error; }
}

/** A cohort row measured on its own subset of the draw (e.g. an A2 re-run: A2 u P) whose release published no category
 *  cells: the supplement carries its cells, its pool tag and the category counts of that subset. */
function extraRow(base, key, extra) {
  const out = { coverage: extra.coverage, category_pools: extra.coverage, language_coverage: extra.coverage, coverage_note: extra.note };
  for (const dim of DIMS) {
    const taxonomy = new Set(base[dim].map((c) => c.key));
    out[dim] = Object.fromEntries(Object.entries(extra[dim] ?? {}).map(([c, v]) => {
      if (!taxonomy.has(c)) fail(`${key}.${dim}.${c}: not in the live taxonomy`);
      return [c, { n: v.n, competence: v.competence, ...(Number.isInteger(v.coverage_n) ? { coverage_n: v.coverage_n } : {}) }];
    }));
  }
  return out;
}
const extraBounds = (extra) => Object.freeze(Object.fromEntries(DIMS.map((d) => [d, Object.freeze({ ...(extra.pool_counts?.[d] ?? {}) })])));

/** Live category artifact plus every cohort row's own-draw cells. Rows already in the base keep their cells. */
export function withCohortCategoryCells(base, cohort, topicCells = { draws: {} }) {
  if (!cohort?.rows?.length) return base;
  const byDraw = new Map((cohort.categories ?? []).map((c) => [c.draw, c]));
  const systems = { ...base.systems }, bounds = {};
  for (const { row, draw } of cohort.rows) {
    if (systems[row.key]) continue;
    const drawCats = byDraw.get(draw.id)?.categories;
    const supplement = topicCells.draws?.[draw.id];
    const extra = supplement?.extra_rows?.[row.key];
    if (extra) { systems[row.key] = extraRow(base, row.key, extra); bounds[row.key] = extraBounds(extra); continue; }
    const own = drawCats?.systems?.[row.key];
    if (!own) continue;
    const tag = cohortCoverageTag(draw.id);
    const out = { coverage: tag, category_pools: tag, language_coverage: tag };
    const rowBounds = {};
    for (const dim of DIMS) {
      // A draw labelled after its release (topic + use-case labels over all items) takes those dimensions from the supplement.
      const fromSupplement = SUPPLEMENT_DIMS.includes(dim) && Array.isArray(supplement?.[dim]) && Boolean(supplement.systems?.[row.key]?.[dim]);
      const cats = fromSupplement ? supplement[dim] : drawCats[dim];
      const cells = fromSupplement ? supplement.systems[row.key][dim] : own[dim];
      if (!cats || !cells) { out[dim] = {}; continue; }
      const key = (c) => (dim === 'usecases' ? UC_LONG[c] ?? c : c);
      const taxonomy = new Set(base[dim].map((c) => c.key));
      for (const c of cats) if (!taxonomy.has(key(c.key))) fail(`${row.key}.${dim}.${c.key}: not in the live taxonomy`);
      rowBounds[dim] = Object.freeze(Object.fromEntries(cats.map((c) => [key(c.key), c.n])));
      out[dim] = Object.fromEntries(Object.entries(cells).filter(([, v]) => v.n >= MIN_N && Number.isFinite(v.competence)).map(([c, v]) => [key(c),
        { n: v.n, competence: v.competence, ...(Number.isInteger(v.coverage_n) ? { coverage_n: v.coverage_n } : {}) }]));
    }
    if (supplement?.systems?.[row.key]) out.coverage_note = supplement.row_note;
    systems[row.key] = out;
    bounds[row.key] = Object.freeze(rowBounds);
  }
  return withRowPoolCategoryRows(base, systems, bounds);
}
