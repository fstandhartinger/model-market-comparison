/** CR-269: shared URL state and row filtering for the JevBench model grid.
 *
 *  Pure functions only — no React, no window. The client component in
 *  components/JevV15Filters.tsx owns history navigation (pushState/popstate).
 *
 *  Every URL key carries the JevBench filter prefix `jf-`, so it never collides
 *  with the page's existing `w`, `view`, `costcap` or `latcap` parameters.
 *  serialize/reset touch only `jf-*` keys and preserve everything else,
 *  including the hash (which URL handling leaves untouched).
 *
 *  Missing row values stay missing: a row with a null field never matches an
 *  active selection or range for that field, and nothing is coerced to zero or
 *  guessed from display text.
 */

export const JEVBENCH_FILTER_PREFIX = 'jf-';

export const JEV_FILTER_KEYS = Object.freeze({
  q: 'jf-q',
  kinds: 'jf-kind',
  providers: 'jf-provider',
  families: 'jf-family',
  licences: 'jf-licence',
  onlyNew: 'jf-new',
  parameters: 'jf-params',
  developerPrice: 'jf-price',
  basePrice: 'jf-baseprice',
  officialCost: 'jf-cost',
  alternativePrice: 'jf-altprice',
  p50: 'jf-p50',
  p95: 'jf-p95',
  jevClass: 'jf-class',
});

export const JEV_ROW_KINDS = Object.freeze(['open-weights', 'open-code', 'closed', 'api']);
export const JEV_CLASS_STATUSES = Object.freeze(['eligible', 'outside', 'unknown']);
export const JEV_NUMERIC_FIELDS = Object.freeze(['parameters', 'developerPrice', 'basePrice', 'officialCost', 'alternativePrice', 'p50', 'p95']);

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?`;
const RANGE_RE = new RegExp(`^(${NUMBER})?\\s*-\\s*(${NUMBER})?$`);

export function defaultJevFilters() {
  return {
    q: '',
    kinds: [],
    providers: [],
    families: [],
    licences: [],
    onlyNew: false,
    parameters: { min: null, max: null },
    developerPrice: { min: null, max: null },
    basePrice: { min: null, max: null },
    officialCost: { min: null, max: null },
    alternativePrice: { min: null, max: null },
    p50: { min: null, max: null },
    p95: { min: null, max: null },
    jevClass: [],
  };
}

/** Parse a `min-max` range string. Either side may be empty; a missing,
 *  non-numeric, non-finite or inverted (min > max) bound makes the whole range
 *  inactive — malformed values are dropped, never swapped or coerced. */
export function parseJevRange(text) {
  const empty = { min: null, max: null };
  if (typeof text !== 'string') return empty;
  const match = text.trim().match(RANGE_RE);
  if (!match || (!match[1] && !match[2])) return empty;
  const min = match[1] == null ? null : Number(match[1]);
  const max = match[2] == null ? null : Number(match[2]);
  if ((min != null && !Number.isFinite(min)) || (max != null && !Number.isFinite(max))) return empty;
  if (min != null && max != null && min > max) return empty;
  return { min, max };
}

export function formatJevRange(range) {
  if (!range || (range.min == null && range.max == null)) return '';
  return `${range.min ?? ''}-${range.max ?? ''}`;
}

const isJevNumber = (value) => typeof value === 'number' && Number.isFinite(value);

function uniqueNonEmpty(values) {
  const seen = new Set();
  const out = [];
  for (const value of values ?? []) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function canonical(values, allowed) {
  const picked = new Set(uniqueNonEmpty(values).filter((v) => allowed.includes(v)));
  return allowed.filter((v) => picked.has(v));
}

/** Read the JevBench filter state from URL search parameters. Unknown kinds,
 *  statuses and malformed numbers are dropped; repeated scalar keys use the
 *  first occurrence. Unrelated parameters are ignored. */
export function parseJevFilters(params) {
  const state = defaultJevFilters();
  if (!(params instanceof URLSearchParams)) return state;
  state.q = (params.get(JEV_FILTER_KEYS.q) ?? '').trim();
  state.kinds = canonical(params.getAll(JEV_FILTER_KEYS.kinds), JEV_ROW_KINDS);
  state.providers = uniqueNonEmpty(params.getAll(JEV_FILTER_KEYS.providers));
  state.families = uniqueNonEmpty(params.getAll(JEV_FILTER_KEYS.families));
  state.licences = uniqueNonEmpty(params.getAll(JEV_FILTER_KEYS.licences));
  state.onlyNew = params.get(JEV_FILTER_KEYS.onlyNew) === '1';
  for (const field of JEV_NUMERIC_FIELDS) state[field] = parseJevRange(params.get(JEV_FILTER_KEYS[field]));
  state.jevClass = canonical(params.getAll(JEV_FILTER_KEYS.jevClass), JEV_CLASS_STATUSES);
  return state;
}

/** Write the JevBench filter state into a copy of `params`, replacing only the
 *  `jf-*` keys (repeated for multi-select fields) and preserving every other
 *  parameter. Default values are omitted, so a clean state writes nothing. */
export function serializeJevFilters(params, state) {
  const result = new URLSearchParams(params);
  const setMany = (key, values) => {
    result.delete(key);
    for (const value of values) result.append(key, value);
  };
  const q = typeof state.q === 'string' ? state.q.trim() : '';
  if (q) result.set(JEV_FILTER_KEYS.q, q); else result.delete(JEV_FILTER_KEYS.q);
  setMany(JEV_FILTER_KEYS.kinds, canonical(state.kinds, JEV_ROW_KINDS));
  setMany(JEV_FILTER_KEYS.providers, uniqueNonEmpty(state.providers));
  setMany(JEV_FILTER_KEYS.families, uniqueNonEmpty(state.families));
  setMany(JEV_FILTER_KEYS.licences, uniqueNonEmpty(state.licences));
  if (state.onlyNew === true) result.set(JEV_FILTER_KEYS.onlyNew, '1'); else result.delete(JEV_FILTER_KEYS.onlyNew);
  for (const field of JEV_NUMERIC_FIELDS) {
    const text = formatJevRange(state[field]);
    if (text) result.set(JEV_FILTER_KEYS[field], text); else result.delete(JEV_FILTER_KEYS[field]);
  }
  setMany(JEV_FILTER_KEYS.jevClass, canonical(state.jevClass, JEV_CLASS_STATUSES));
  return result;
}

/** Remove every JevBench filter key (`jf-*`) from a copy of `params`,
 *  leaving unrelated parameters untouched. */
export function resetJevFilterParams(params) {
  const result = new URLSearchParams(params);
  for (const key of [...result.keys()]) if (key.startsWith(JEVBENCH_FILTER_PREFIX)) result.delete(key);
  return result;
}

export function isJevFilterActive(state) {
  return Boolean(
    (typeof state?.q === 'string' && state.q.trim())
    || (state?.kinds?.length)
    || (state?.providers?.length)
    || (state?.families?.length)
    || (state?.licences?.length)
    || state?.onlyNew === true
    || JEV_NUMERIC_FIELDS.some((field) => {
      const range = state?.[field];
      return range && (range.min != null || range.max != null);
    })
    || (state?.jevClass?.length),
  );
}

/** The selectable model kinds of one row. `open` maps to at most one of
 *  open-weights / open-code / closed (`unknown` maps to none); `api: true`
 *  adds the API kind, which is independent of the open status. */
export function jevRowKinds(row) {
  const kinds = [];
  const open = row?.open;
  if (open === 'weights') kinds.push('open-weights');
  else if (open === 'yes' || open === true) kinds.push('open-code');
  else if (open === 'no') kinds.push('closed');
  if (row?.api === true) kinds.push('api');
  return kinds;
}

function inRange(value, range) {
  if (!isJevNumber(value)) return false;
  if (range.min != null && value < range.min) return false;
  if (range.max != null && value > range.max) return false;
  return true;
}

/** AND across fields, OR within a multi-select field. A row with a missing
 *  (null) value never matches an active filter on that field. */
export function matchesJevFilters(row, state) {
  if (!row || typeof row.key !== 'string') return false;
  const q = typeof state.q === 'string' ? state.q.trim().toLowerCase() : '';
  if (q) {
    const haystack = [row.display, row.key, row.provider, row.family, row.modelClass, row.licence]
      .filter((value) => typeof value === 'string').join(' \u0000 ').toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (state.kinds?.length) {
    const kinds = jevRowKinds(row);
    if (!state.kinds.some((kind) => kinds.includes(kind))) return false;
  }
  for (const [stateField, rowField] of [['providers', 'provider'], ['families', 'family'], ['licences', 'licence']]) {
    const selection = state[stateField];
    if (selection?.length) {
      const value = row[rowField];
      if (typeof value !== 'string' || !selection.includes(value)) return false;
    }
  }
  if (state.onlyNew === true && row.newInVersion !== true) return false;
  for (const field of JEV_NUMERIC_FIELDS) {
    const range = state[field];
    if (range && (range.min != null || range.max != null) && !inRange(row[field], range)) return false;
  }
  if (state.jevClass?.length) {
    if (typeof row.jevClass?.status !== 'string' || !state.jevClass.includes(row.jevClass.status)) return false;
  }
  return true;
}

export function filterJevRows(rows, state) {
  return (rows ?? []).filter((row) => matchesJevFilters(row, state));
}

export function visibleJevKeys(rows, state) {
  return new Set(filterJevRows(rows, state).map((row) => row.key));
}

/** True when at least one row actually reports a value for a numeric field —
 *  the signal the panel uses to enable or disable that range control. */
export function jevFieldHasValues(rows, field) {
  return (rows ?? []).some((row) => isJevNumber(row?.[field]));
}

export function jevHasNewRows(rows) {
  return (rows ?? []).some((row) => row?.newInVersion === true);
}

/** Drop numeric ranges for fields the current release has no values for, so a
 *  disabled (or stale, shared-URL) range can never silently hide every row.
 *  Everything else is returned unchanged. */
export function normalizeJevFilters(state, rows) {
  const next = { ...state };
  for (const field of JEV_NUMERIC_FIELDS) {
    if (!jevFieldHasValues(rows, field)) next[field] = { min: null, max: null };
  }
  return next;
}

/** Sorted distinct non-empty values of a text field, for picker options. */
export function distinctJevValues(rows, field) {
  const seen = new Set();
  for (const row of rows ?? []) {
    const value = row?.[field];
    if (typeof value === 'string' && value.trim()) seen.add(value);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
