import { flightRecords, objects, resolveFlight } from "./aa-rsc.mjs";

export function tokenPrice(value) {
  if (value == null) return null;
  if (!(typeof value === "number" || (typeof value === "string" && /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)))) throw new Error("Invalid OpenRouter token price");
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || !Number.isFinite(number * 1e6)) throw new Error("Invalid OpenRouter token price");
  return number * 1e6;
}

export function parseOpenRouterPage(html, { or_model_id, start_date, end_date }) {
  if (!/^[\w.-]+\/[\w.:-]+$/.test(or_model_id)) throw new Error("Invalid OpenRouter model ID");
  const records = flightRecords(html);
  const queries = [];
  for (const value of records.values()) for (const row of objects(value)) {
    if (Array.isArray(row.queryKey) && row.queryKey[0] === "model-page") queries.push(row);
  }
  const endpointQueries = queries.filter((q) => q.queryKey[1] === "providerTableEndpointStats");
  if (!endpointQueries.length) throw new Error("OpenRouter provider table query missing");
  const query = endpointQueries[0];
  const rows = resolveFlight(query.state?.data, records);
  if (query.state?.status !== "success" || !Array.isArray(rows) || !rows.length) throw new Error("OpenRouter provider table incomplete");
  const { permaslug, variant } = query.queryKey[2] || {};
  if (!permaslug || !variant) throw new Error("OpenRouter query identity missing");
  const ids = new Set();
  const endpoints = rows.map((unresolved) => {
    const row = resolveFlight(unresolved, records);
    if (row.model_variant_slug !== or_model_id || row.model_variant_permaslug !== permaslug || row.variant !== variant
      || !row.id || !row.provider_name || !row.provider_slug) throw new Error("OpenRouter endpoint identity mismatch");
    if (ids.has(row.id)) throw new Error(`Duplicate OpenRouter endpoint ID: ${row.id}`);
    ids.add(row.id);
    if (row.stats?.endpoint_id && row.stats.endpoint_id !== row.id) throw new Error("OpenRouter stats identity mismatch");
    return {
      or_model_id, endpoint_tag: row.provider_slug, provider: row.provider_name, endpoint_id: row.id,
      cache_read_per_1m: tokenPrice(row.pricing?.input_cache_read),
      cache_write_per_1m: tokenPrice(row.pricing?.input_cache_write),
      cache_hit_rate: null,
      cache_status: "not_published_in_payload",
      cache_note: "The provider table statistics publish latency/throughput/uptime; no verified endpoint cache-hit observation in this payload.",
    };
  });
  const usageQuery = queries.find((q) => q.queryKey[1] === "appStats" && q.queryKey[2]?.permaslug === permaslug && q.queryKey[2]?.variant === variant);
  const usage = parseOpenRouterUsage(resolveFlight(usageQuery?.state?.data, records)?.model_chart, { permaslug, variant, start_date, end_date });
  if (usageQuery && usageQuery.state?.status !== "success") throw new Error("OpenRouter usage query failed");
  return { or_model_id, model_permaslug: permaslug, variant, endpoints, usage,
    source_updated_at: usageQuery?.state?.dataUpdatedAt ? new Date(usageQuery.state.dataUpdatedAt).toISOString() : null };
}

export function parseOpenRouterUsage(rows, { permaslug, variant, start_date, end_date }) {
  if (rows == null) return { status: "not_published_in_payload", input_output_ratio: null, daily: [] };
  if (!Array.isArray(rows)) throw new Error("Invalid OpenRouter model_chart");
  const keys = new Set();
  const daily = [];
  for (const row of rows) {
    if (!row || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2} 00:00:00$/.test(row.date)
      || row.model_permaslug !== permaslug || row.variant !== variant || row.variant_permaslug !== permaslug) throw new Error("OpenRouter usage identity/date mismatch");
    const day = row.date.slice(0, 10);
    if (Number.isNaN(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day) throw new Error("Invalid OpenRouter usage date");
    if (keys.has(day)) throw new Error("Duplicate OpenRouter usage day");
    keys.add(day);
    for (const field of ["total_prompt_tokens", "total_completion_tokens", "count"]) {
      if (!Number.isSafeInteger(row[field]) || row[field] < 0) throw new Error(`Invalid OpenRouter usage ${field}`);
    }
    if (!row.count && (row.total_prompt_tokens || row.total_completion_tokens)) throw new Error("OpenRouter tokens without requests");
    if (day >= start_date && day <= end_date) daily.push({ date: day, total_prompt_tokens: row.total_prompt_tokens, total_completion_tokens: row.total_completion_tokens, count: row.count });
  }
  const days = new Set(daily.map((r) => r.date));
  for (let day = Date.parse(start_date); day <= Date.parse(end_date); day += 86400000) {
    if (!days.has(new Date(day).toISOString().slice(0, 10))) return { status: "incomplete_window", input_output_ratio: null, daily };
  }
  const total_prompt_tokens = daily.reduce((s, r) => s + r.total_prompt_tokens, 0);
  const total_completion_tokens = daily.reduce((s, r) => s + r.total_completion_tokens, 0);
  const total_requests = daily.reduce((s, r) => s + r.count, 0);
  if (![total_prompt_tokens, total_completion_tokens, total_requests].every(Number.isSafeInteger)) throw new Error("OpenRouter usage sum exceeds safe integer range");
  return { status: total_completion_tokens > 0 ? "available" : "zero_output_tokens", daily, total_prompt_tokens, total_completion_tokens, total_requests,
    input_output_ratio: total_completion_tokens > 0 ? total_prompt_tokens / total_completion_tokens : null };
}

// The effective-pricing API's providerSlug is a base provider label. It is NOT
// the endpoint tag (morph and morph/fast share it). Only endpointId joins this
// observation to the model page, whose provider_slug is the exact routing tag.
export function parseOpenRouterCache(payload, endpoints) {
  const data = payload?.data;
  if (!data || !Array.isArray(data.providerSummaries) || !data.endpointProviderSlugs
    || !Array.isArray(data.inputChartData) || !Array.isArray(data.outputChartData)) throw new Error("OpenRouter effective-pricing payload missing or malformed");
  const byId = new Map(endpoints.map((e) => [e.endpoint_id, e]));
  if (byId.size !== endpoints.length) throw new Error("Duplicate model-page endpoint IDs");
  const seen = new Set();
  const joined = [], unjoined = [];
  for (const summary of data.providerSummaries) {
    if (!summary || typeof summary.endpointId !== "string" || !summary.endpointId || typeof summary.providerName !== "string"
      || typeof summary.providerSlug !== "string" || !summary.providerSlug || seen.has(summary.endpointId)) throw new Error("Invalid/duplicate OpenRouter cache identity");
    seen.add(summary.endpointId);
    if (data.endpointProviderSlugs[summary.endpointId] !== summary.providerSlug) throw new Error("OpenRouter cache provider map mismatch");
    if (typeof summary.cacheHitRate !== "number" || !Number.isFinite(summary.cacheHitRate) || summary.cacheHitRate < 0 || summary.cacheHitRate > 1
      || !Number.isSafeInteger(summary.totalTokens) || summary.totalTokens < 0) throw new Error("Invalid OpenRouter cache rate/token count");
    const endpoint = byId.get(summary.endpointId);
    const observation = { endpoint_id: summary.endpointId, source_provider_name: summary.providerName,
      source_provider_slug: summary.providerSlug, cache_hit_rate: summary.cacheHitRate, total_tokens: summary.totalTokens };
    if (!endpoint) unjoined.push({ ...observation, reason: "Endpoint UUID not present in this exact model-page provider table; no label-based join." });
    else joined.push({ ...endpoint, ...observation, cache_status: summary.totalTokens > 0 ? "available" : "no_tokens",
      cache_hit_rate: summary.totalTokens > 0 ? summary.cacheHitRate : null,
      cache_note: "OpenRouter reported cacheHitRate as a fraction. Underlying numerator/denominator and exact summary interval are not published in this response." });
  }
  const chartDates = [...new Set(data.inputChartData.map((row) => row.x))].sort();
  if (chartDates.some((date) => typeof date !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date))) throw new Error("Invalid OpenRouter cache chart date");
  return { joined, unjoined, returned_summaries: seen.size,
    summary_window: null, chart_date_range: chartDates.length ? { first: chartDates[0], last: chartDates.at(-1) } : null };
}

export function parseOpenRouterRankings(html, { start_date, end_date, minimum = 20 }) {
  let query;
  for (const value of flightRecords(html).values()) for (const row of objects(value)) {
    if (row.queryKey?.[0] === "rankings" && row.queryKey[1] === "models" && row.queryKey[2]?.view === "week") query = row;
  }
  if (query?.state?.status !== "success" || !Array.isArray(query.state.data) || query.state.data.length < minimum) throw new Error("OpenRouter weekly rankings missing or incomplete");
  const seen = new Set();
  return query.state.data.map((row) => {
    if (!row?.model_permaslug || !row.variant || typeof row.variant_permaslug !== "string" || typeof row.date !== "string"
      || !/^\d{4}-\d{2}-\d{2} 00:00:00$/.test(row.date) || row.date.slice(0, 10) > end_date || row.date.slice(0, 10) < start_date
      || row.variant_permaslug !== `${row.model_permaslug}${row.variant === "standard" ? "" : `:${row.variant}`}`
      || seen.has(row.variant_permaslug)) throw new Error("OpenRouter ranking identity/date mismatch");
    seen.add(row.variant_permaslug);
    for (const field of ["total_prompt_tokens", "total_completion_tokens", "count"]) {
      if (!Number.isSafeInteger(row[field]) || row[field] < 0) throw new Error(`Invalid OpenRouter rankings ${field}`);
    }
    if (!row.count || !row.total_completion_tokens) throw new Error("OpenRouter ranking has no request/output volume");
    return { model_permaslug: row.model_permaslug, variant: row.variant, variant_permaslug: row.variant_permaslug,
      date: row.date, total_prompt_tokens: row.total_prompt_tokens, total_completion_tokens: row.total_completion_tokens,
      total_requests: row.count, input_output_ratio: row.total_prompt_tokens / row.total_completion_tokens };
  });
}
