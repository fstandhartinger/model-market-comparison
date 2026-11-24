// Aggregate-only v0.4 contract. See imagejev-v04-feed.md alongside this loader.
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fields = (value, names) => object(value) && Object.keys(value).length === names.length
  && names.every((name) => Object.hasOwn(value, name));
const text = (value, max = 200) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const score = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const nonnegative = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const count = (value) => Number.isSafeInteger(value) && value > 0 && value <= 1_000_000;
const nullable = (check) => (value) => value === null || check(value);
/** Standing release gate (12 Nov 2026): no listed breakdown cell below 30 scored items. */
export const IMAGEJEV_V04_MIN_CELL_N = 30;
const BREAKDOWN_KINDS = ['use_case', 'image_type'];

/** A breakdown is null (not shown) or complete: every row item in exactly one cell, every cell >= 30 items. */
function validBreakdown(cells, rowN) {
  if (cells === null) return true;
  if (!Array.isArray(cells) || cells.length === 0 || cells.length > 50) return false;
  const ids = new Set(); let total = 0;
  for (const cell of cells) {
    if (!fields(cell, ['id', 'label', 'n', 'correct', 'chance'])) return false;
    if (typeof cell.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(cell.id) || ids.has(cell.id) || !text(cell.label, 80)) return false;
    if (!count(cell.n) || cell.n < IMAGEJEV_V04_MIN_CELL_N) return false;
    if (!Number.isSafeInteger(cell.correct) || cell.correct < 0 || cell.correct > cell.n) return false;
    if (typeof cell.chance !== 'number' || !Number.isFinite(cell.chance) || cell.chance <= 0 || cell.chance >= 1) return false;
    ids.add(cell.id); total += cell.n;
  }
  return total === rowN;
}
const timestamp = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

/** Invalid or incomplete feeds hide the entire section; never salvage individual rows. */
export function validateImageJevV04Feed(value) {
  if (!fields(value, ['schema_version', 'benchmark', 'scale', 'revision', 'data_kind', 'built_utc', 'items', 'method_disclosure', 'rows'])) return null;
  if (value.schema_version !== 1 || value.benchmark !== 'ImageJevBench' || value.scale !== 'v0.4') return null;
  if (typeof value.revision !== 'string' || !/^v0\.4(?:\.\d+)?(?:-[A-Z][A-Za-z0-9.-]*)?$/.test(value.revision)) return null;
  if (!['fixture', 'measured'].includes(value.data_kind) || !timestamp(value.built_utc) || !count(value.items)) return null;
  if (value.method_disclosure !== null && !text(value.method_disclosure, 20_000)) return null;
  if (!Array.isArray(value.rows) || value.rows.length === 0 || value.rows.length > 1000) return null;
  const ids = new Set();
  for (const row of value.rows) {
    if (!fields(row, ['id', 'name', 'n', 'measured_utc', 'intelligence', 'calibration', 'composite', 'latency_p50_s', 'usd_per_1000', 'breakdowns'])) return null;
    if (typeof row.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,99}$/.test(row.id) || ids.has(row.id)) return null;
    if (!text(row.name) || !count(row.n) || row.n > value.items || !timestamp(row.measured_utc) || row.measured_utc > value.built_utc) return null;
    // Composite and latency may be null (not measured); they are never estimated.
    if (![row.intelligence, row.calibration].every(score) || !nullable(score)(row.composite)) return null;
    if (!nullable(nonnegative)(row.latency_p50_s) || !nonnegative(row.usd_per_1000)) return null;
    if (!fields(row.breakdowns, BREAKDOWN_KINDS) || !BREAKDOWN_KINDS.every((kind) => validBreakdown(row.breakdowns[kind], row.n))) return null;
    // A fixture can never look like a measured model just because its banner was overlooked.
    if (value.data_kind === 'fixture' && (!row.id.startsWith('fixture-') || !row.name.startsWith('Fixture '))) return null;
    ids.add(row.id);
  }
  return value;
}

/** readText is injected so read failures and malformed JSON follow the same fail-closed path. */
export async function loadImageJevV04Feed(readText, { allowFixture = false } = {}) {
  try {
    const feed = validateImageJevV04Feed(JSON.parse(await readText()));
    return feed && (feed.data_kind !== 'fixture' || allowFixture) ? feed : null;
  } catch {
    return null;
  }
}
