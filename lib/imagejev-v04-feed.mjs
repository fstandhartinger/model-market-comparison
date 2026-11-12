// Aggregate-only v0.4 contract. See imagejev-v04-feed.md alongside this loader.
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fields = (value, names) => object(value) && Object.keys(value).length === names.length
  && names.every((name) => Object.hasOwn(value, name));
const text = (value, max = 200) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const score = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const nonnegative = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const count = (value) => Number.isSafeInteger(value) && value > 0 && value <= 1_000_000;
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
    if (!fields(row, ['id', 'name', 'n', 'measured_utc', 'intelligence', 'calibration', 'composite', 'latency_p50_s', 'usd_per_1000'])) return null;
    if (typeof row.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,99}$/.test(row.id) || ids.has(row.id)) return null;
    if (!text(row.name) || !count(row.n) || row.n > value.items || !timestamp(row.measured_utc) || row.measured_utc > value.built_utc) return null;
    if (![row.intelligence, row.calibration, row.composite].every(score)) return null;
    if (![row.latency_p50_s, row.usd_per_1000].every(nonnegative)) return null;
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
