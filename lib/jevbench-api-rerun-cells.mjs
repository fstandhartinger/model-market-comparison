import cells from '../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-api-rerun-cells.json' with { type: 'json' };

// CR-331 (Florian 7 Oct 2026): the live boards overlay API rows from data/jevbench-api-a4-equated.json (A4 u P and A5 u P
// re-runs, full-set rows such as Liquid d1) that the frozen v1.6.1 category artifact predates. This artifact holds their
// breakdowns, computed on Sandy with the same scorer, labels recipe and minimum cell size as every other row
// (tools: scripts/jevbench-api-rerun-cells/): per-type x tier competence on the open and sealed items they answered, and
// family / subject-topic / use-case cells. Raw values, never equated. Languages are not in it (owned by the language view).
export const JEVBENCH_API_RERUN_CELLS_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-api-rerun-cells.json';
export const API_RERUN_DIMS = ['families', 'topics', 'usecases'];
const SPLIT_KEYS = ['open|choice', 'open|noul', 'open|score', 'sealed|choice', 'sealed|noul', 'sealed|score'];
const TIERS = ['easy', 'standard', 'hard', 'judge'];

export const PENDING_TEXT = 'Subject-topic and use-case values for this row are being computed (topic labelling of its 300 sealed items); they follow in the next point release.';
const fail = (m) => { throw new Error(`api re-run cells artifact: ${m}`); };
const finite = (x) => typeof x === 'number' && Number.isFinite(x);

/** Structural checks: aggregates only, every row with per-type x tier cells and the three category dimensions. */
export function validateApiRerunCells(a) {
  if (a?.kind !== 'api-rerun-cells' || a.revision !== 'v1.6.1' || !Number.isInteger(a.min_n)) fail('kind / revision / min_n');
  for (const [key, row] of Object.entries(a.systems ?? {})) {
    if (!/^(A4|A5|S)\+P$/.test(row.coverage ?? '') || !Number.isInteger(row.n_items)) fail(`${key}: coverage / n_items`);
    if (row.category_pools !== undefined && (!/^(A4|A5|S)\+P(?:\+(?:L1|L2|L3|C1))*$/.test(row.category_pools) || !Number.isInteger(row.category_n_items) || row.category_n_items < 1)) fail(`${key}: category pools / counts`);
    if ('languages' in row) fail(`${key}: languages belong to the language view, not here`);
    if (row.coverage !== 'S+P') {
      for (const k of SPLIT_KEYS) {
        const c = row.per_type_split?.[k];
        if (!c || !finite(c.cc) || TIERS.some((t) => !Number.isInteger(c.n?.[t]))) fail(`${key}: per_type_split ${k}`);
      }
    }
    if (row.labels_missing !== undefined && (!Number.isInteger(row.labels_missing) || row.topics || row.usecases)) fail(`${key}: labels_missing`);
    for (const d of API_RERUN_DIMS) {
      for (const [c, cell] of Object.entries(row[d] ?? {})) {
        if (!Number.isInteger(cell.n) || cell.n < a.min_n || cell.n > (row.category_n_items ?? row.n_items) || !finite(cell.competence)) fail(`${key}.${d}.${c}`);
      }
    }
    for (const field of ['item_id', 'item_ids', 'opaque_id', 'expected', 'gold', 'prediction', 'labels_by_item']) {
      if (JSON.stringify(row).includes(`"${field}"`)) fail(`${key}: item-level field ${field}`);
    }
  }
  return a;
}

export const apiRerunCells = validateApiRerunCells(cells);

/** Per-type x tier split for an overlay row, shaped like a release row's intelligence.per_type_split. */
export function apiRerunPerTypeSplit(key) {
  return apiRerunCells.systems[key]?.per_type_split ?? null;
}

/** Category artifact (v1.6.1 + cell supplement) with the overlay rows' family/topic/use-case cells added. Rows already
 *  in the artifact are never replaced; unknown category keys are dropped (the artifact's category lists stay as they are). */
export function withApiRerunCells(base, a = apiRerunCells) {
  const systems = { ...base.systems }, unavailable = { ...(base.unavailable ?? {}) };
  for (const [key, row] of Object.entries(a.systems)) {
    if (systems[key]) continue;
    // A row whose sealed items are not labelled yet says so instead of drawing family cells only.
    if (row.labels_missing) { unavailable[key] = PENDING_TEXT; continue; }
    const cell = { coverage: row.coverage, category_pools: row.category_pools ?? row.coverage };
    for (const d of API_RERUN_DIMS) {
      const known = new Set((base[d] ?? []).map((c) => c.key));
      cell[d] = Object.fromEntries(Object.entries(row[d] ?? {}).filter(([c]) => known.has(c)));
    }
    systems[key] = cell;
  }
  return { ...base, systems, unavailable };
}

/** The equated-rows file (data/jevbench-api-a4-equated.json) with each A4/A5 row's per-type x tier split attached, for
 *  jevWithApiA4Rows (server side only; client modules never import this artifact). */
export function withApiRerunSplits(a4, a = apiRerunCells) {
  const add = (r) => (a.systems[r.key]?.per_type_split ? { ...r, per_type_split: a.systems[r.key].per_type_split } : r);
  return { ...a4, rows: (a4.rows ?? []).map(add), a5_rows: (a4.a5_rows ?? []).map(add) };
}
