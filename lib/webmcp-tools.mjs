// CR-56 (Florian 2026-09-16): read-only WebMCP tools for browser agents.
// The tools only call this site's public, documented HTTP APIs (same origin, GET, no credentials), so their results
// carry exactly the published projection — identities, values in native units, basis, source, dates — and nothing
// the APIs do not publish. Every input is validated against the schema here as well (a browser agent may not), every
// list is capped, and errors come back as structured objects, never as partial data. Null means unavailable.

export const WEBMCP_LIMITS = { searchMax: 25, resultsMax: 50, modelsMax: 10, summaryBenchmarksMax: 25, queryMaxLength: 100 };
const ID_PATTERN = '^[A-Za-z0-9][A-Za-z0-9._:@%+-]{0,159}$';
const idRe = new RegExp(ID_PATTERN);

export const WEBMCP_TOOL_SCHEMAS = {
  search_benchmarks: {
    type: 'object', additionalProperties: false,
    properties: {
      query: { type: 'string', maxLength: WEBMCP_LIMITS.queryMaxLength, description: 'Words to match in the benchmark name, family, id or maintainer (case-insensitive). Empty lists everything.' },
      category: { type: 'string', maxLength: 40, description: 'Exact category, e.g. "Coding", "Math", "Agentic".' },
      limit: { type: 'integer', minimum: 1, maximum: WEBMCP_LIMITS.searchMax, default: 10 },
      cursor: { type: 'string', pattern: '^[0-9]{1,4}$', description: 'next_cursor from the previous page.' },
    },
  },
  get_benchmark_results: {
    type: 'object', additionalProperties: false, required: ['benchmark_id'],
    properties: {
      benchmark_id: { type: 'string', pattern: ID_PATTERN, description: 'Exact versioned benchmark id from search_benchmarks, e.g. "aa-gpqa-diamond::snapshot-2026-09-10".' },
      model_ids: { type: 'array', maxItems: WEBMCP_LIMITS.modelsMax, uniqueItems: true, items: { type: 'string', pattern: ID_PATTERN }, description: 'Optional exact catalog model ids (e.g. "claude-opus-5::max"); omit to page through every published result.' },
      limit: { type: 'integer', minimum: 1, maximum: WEBMCP_LIMITS.resultsMax, default: 25 },
      cursor: { type: 'string', pattern: '^[0-9]{1,5}$', description: 'next_cursor from the previous page (only without model_ids).' },
    },
  },
  get_model_benchmark_summary: {
    type: 'object', additionalProperties: false, required: ['model_id'],
    properties: {
      model_id: { type: 'string', pattern: ID_PATTERN, description: 'Exact catalog model id including the variant, e.g. "kimi-k3::max".' },
      benchmark_ids: { type: 'array', maxItems: WEBMCP_LIMITS.summaryBenchmarksMax, uniqueItems: true, items: { type: 'string', pattern: ID_PATTERN }, description: 'Optional exact benchmark ids; each one without a published result comes back with value null.' },
      limit: { type: 'integer', minimum: 1, maximum: WEBMCP_LIMITS.resultsMax, default: 25 },
    },
  },
};

export const WEBMCP_TOOL_DESCRIPTIONS = {
  search_benchmarks: 'Find benchmarks tracked by Benchmark Heaven. Returns exact versioned benchmark ids with metric, unit, direction, category, maintainer, source link, last verification date and how many catalog models have a result. Read-only.',
  get_benchmark_results: 'Published results of one exact benchmark version: per model the value in the benchmark\'s native unit, basis (measured, self-reported, derived, preliminary), run configuration and source (URL, retrieval date, locator). Read-only; never estimates.',
  get_model_benchmark_summary: 'Published benchmark results for one exact catalog model (variant included), with unit, basis, benchmark version and source date. Requested benchmarks without a published result return value null. Read-only; never estimates.',
};

const fail = (code, message) => ({ ok: false, error: { code, message } });

/** Minimal validation of the schemas above: types, bounds, patterns, unknown keys. Returns an error object or null. */
export function validateInput(name, input) {
  const schema = WEBMCP_TOOL_SCHEMAS[name];
  if (!schema) return fail('unknown_tool', `No tool named ${name}.`);
  if (input == null) input = {};
  if (typeof input !== 'object' || Array.isArray(input)) return fail('invalid_input', 'Input must be a JSON object.');
  for (const key of Object.keys(input)) if (!schema.properties[key]) return fail('invalid_input', `Unknown field "${key}".`);
  for (const key of schema.required ?? []) if (input[key] == null) return fail('invalid_input', `"${key}" is required.`);
  for (const [key, spec] of Object.entries(schema.properties)) {
    const v = input[key];
    if (v == null) continue;
    if (spec.type === 'string') {
      if (typeof v !== 'string') return fail('invalid_input', `"${key}" must be a string.`);
      if (spec.maxLength && v.length > spec.maxLength) return fail('invalid_input', `"${key}" is longer than ${spec.maxLength} characters.`);
      if (spec.pattern && !new RegExp(spec.pattern).test(v)) return fail('invalid_input', `"${key}" is not a valid id or cursor.`);
    } else if (spec.type === 'integer') {
      if (!Number.isSafeInteger(v) || v < spec.minimum || v > spec.maximum) return fail('invalid_input', `"${key}" must be an integer from ${spec.minimum} to ${spec.maximum}.`);
    } else if (spec.type === 'array') {
      if (!Array.isArray(v) || v.length > spec.maxItems) return fail('invalid_input', `"${key}" must be an array of at most ${spec.maxItems} ids.`);
      if (new Set(v).size !== v.length) return fail('invalid_input', `"${key}" contains duplicates.`);
      if (v.some((x) => typeof x !== 'string' || !idRe.test(x))) return fail('invalid_input', `"${key}" contains an invalid id.`);
    }
  }
  return null;
}

const compactBenchmark = (e) => ({
  benchmark_id: e.id, name: e.name, family: e.family, version: e.version, category: e.category ?? null,
  metric: e.scoring?.metric ?? null, unit: e.scoring?.unit ?? null, higher_is_better: e.scoring?.higher_better ?? null,
  range: e.scoring?.range ?? null, maintainer: e.maintainer ?? null, status: e.status ?? null, superseded_by: e.superseded_by ?? null,
  source_url: e.primary_url ?? null, last_verified: e.last_verified ?? null, models_with_results: e.coverage?.available ?? null,
});

const compactObservation = (o) => ({
  model_id: o.subject?.model_id ?? null, source_subject: o.subject?.name ?? null, variant: o.subject?.variant ?? null, harness: o.subject?.harness ?? null,
  benchmark_id: o.benchmark_id, value: typeof o.value === 'number' && Number.isFinite(o.value) ? o.value : null, unit: o.unit ?? null, basis: o.basis ?? null,
  protocol: o.protocol ?? null,
  source: { url: o.source?.url ?? null, retrieved_at: o.source?.retrieved_at ?? null, published_at: o.source?.published_at ?? null, locator: o.source?.locator ?? null },
});

/** Tool implementations over an injected same-origin GET (`get(path)` → parsed JSON or throws {status}). */
export function createWebMcpTools(get) {
  let registry = null;
  const benchmarks = async () => (registry ??= (await get('/api/benchmarks')).benchmarks ?? []);
  const guard = (name, fn) => async (input) => {
    const invalid = validateInput(name, input ?? {});
    if (invalid) return invalid;
    try { return await fn(input ?? {}); }
    catch (error) {
      if (error?.status === 404) return fail('not_found', 'Unknown exact benchmark or model id. Use search_benchmarks, or the model ids shown on benchmarkheaven.com.');
      return fail('unavailable', 'The Benchmark Heaven API did not answer; try again later.');
    }
  };
  return {
    search_benchmarks: guard('search_benchmarks', async ({ query = '', category, limit = 10, cursor }) => {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const all = (await benchmarks()).map(compactBenchmark)
        .filter((b) => (!category || String(b.category).toLowerCase() === category.toLowerCase())
          && words.every((w) => [b.benchmark_id, b.name, b.family, b.maintainer].some((f) => String(f ?? '').toLowerCase().includes(w))))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)) || a.benchmark_id.localeCompare(b.benchmark_id));
      const offset = Number(cursor ?? 0);
      const page = all.slice(offset, offset + limit);
      return { ok: true, total: all.length, benchmarks: page, next_cursor: offset + limit < all.length ? String(offset + limit) : null };
    }),
    get_benchmark_results: guard('get_benchmark_results', async ({ benchmark_id, model_ids, limit = 25, cursor }) => {
      if (model_ids?.length && cursor) return fail('invalid_input', 'cursor pages through all results; it cannot be combined with model_ids.');
      const entry = (await benchmarks()).find((e) => e.id === benchmark_id);
      if (!entry) return fail('not_found', `No benchmark with the exact id "${benchmark_id}". Use search_benchmarks.`);
      const q = (extra) => `/api/benchmark-scores?${new URLSearchParams({ benchmark_id, ...extra })}`;
      if (model_ids?.length) {
        const results = [];
        for (const model_id of model_ids) {
          const r = await get(q({ model_id, limit: '50' }));
          const rows = (r.observations ?? []).map(compactObservation);
          results.push({ model_id, results: rows.slice(0, limit), value_available: rows.length > 0, cell_status: r.cell?.status ?? null });
        }
        return { ok: true, benchmark: compactBenchmark(entry), models: results };
      }
      const offset = Number(cursor ?? 0);
      const r = await get(q({ offset: String(offset), limit: String(limit) }));
      return { ok: true, benchmark: compactBenchmark(entry), total: r.total ?? null, results: (r.observations ?? []).map(compactObservation),
        next_cursor: offset + limit < (r.total ?? 0) ? String(offset + limit) : null };
    }),
    get_model_benchmark_summary: guard('get_model_benchmark_summary', async ({ model_id, benchmark_ids, limit = 25 }) => {
      const r = await get(`/api/benchmark-scores?${new URLSearchParams({ model_id, limit: '500' })}`);
      const rows = (r.observations ?? []).map(compactObservation);
      const byId = new Map((await benchmarks()).map((e) => [e.id, e]));
      const describe = (row) => ({ ...row, benchmark_name: byId.get(row.benchmark_id)?.name ?? null, benchmark_version: byId.get(row.benchmark_id)?.version ?? null, higher_is_better: byId.get(row.benchmark_id)?.scoring?.higher_better ?? null });
      if (benchmark_ids?.length) {
        return { ok: true, model_id, results: benchmark_ids.map((id) => {
          const hit = rows.filter((row) => row.benchmark_id === id);
          if (!byId.has(id)) return { benchmark_id: id, value: null, status: 'unknown_benchmark' };
          return hit.length ? describe(hit[0]) : { benchmark_id: id, benchmark_name: byId.get(id).name, value: null, status: 'no_published_result' };
        }) };
      }
      return { ok: true, model_id, total: rows.length, results: rows.slice(0, limit).map(describe), truncated: rows.length > limit,
        coverage: r.coverage?.model ? { available: r.coverage.model.available ?? null, measured: r.coverage.model.measured ?? null } : null };
    }),
  };
}
