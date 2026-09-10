import test from "node:test";
import assert from "node:assert/strict";
import { parseOpenRouterPage, parseOpenRouterUsage, parseOpenRouterCache, parseOpenRouterRankings, tokenPrice } from "../lib/openrouter-efficiency.mjs";

const options = { or_model_id: "lab/model", permaslug: "lab/model-20260901", variant: "standard", start_date: "2026-09-08", end_date: "2026-09-09" };
const endpoint = (tag, provider = "Same label") => ({ id: tag, provider_name: provider, provider_slug: tag, model_variant_slug: options.or_model_id,
  model_variant_permaslug: options.permaslug, variant: "standard", pricing: { input_cache_read: "0.0000002", input_cache_write: "0" }, stats: { endpoint_id: tag } });
const day = (date, prompt, completion) => ({ date: `${date} 00:00:00`, model_permaslug: options.permaslug, variant_permaslug: options.permaslug, variant: "standard", total_prompt_tokens: prompt, total_completion_tokens: completion, count: 1 });
const daily = () => [day("2026-09-08", 100, 10), day("2026-09-09", 100, 100)];
const query = (name, data) => ({ queryKey: ["model-page", name, { permaslug: options.permaslug, variant: "standard" }], state: { status: "success", data } });
const flight = (value) => `<script>self.__next_f.push(${JSON.stringify([1, `a:${JSON.stringify(value)}\n`])})</script>`;
const page = (endpoints = [endpoint("provider/eu"), endpoint("provider/us")], usage = daily()) => flight([query("providerTableEndpointStats", endpoints), query("appStats", { model_chart: usage })]);

test("OpenRouter keeps exact endpoint tags despite identical provider labels, and sums workload tokens", () => {
  const result = parseOpenRouterPage(page(), options);
  assert.equal(result.endpoints.length, 2);
  assert.notEqual(result.endpoints[0].endpoint_tag, result.endpoints[1].endpoint_tag);
  assert.ok(Math.abs(result.endpoints[0].cache_read_per_1m - 0.2) < 1e-12);
  assert.equal(result.endpoints[0].cache_write_per_1m, 0);
  assert.equal(result.endpoints[0].cache_hit_rate, null);
  assert.equal(result.usage.input_output_ratio, 200 / 110);
  assert.equal(result.usage.daily.length, 2);
});
test("OpenRouter accepts explicit missing usage and reports incomplete/zero-output windows", () => {
  assert.equal(parseOpenRouterPage(page(undefined, null), options).usage.status, "not_published_in_payload");
  assert.equal(parseOpenRouterUsage([daily()[0]], options).status, "incomplete_window");
  assert.equal(parseOpenRouterUsage(daily().map((r) => ({ ...r, total_completion_tokens: 0 })), options).input_output_ratio, null);
});
test("OpenRouter rejects malformed Flight, wrong identities, duplicate endpoints/days and invalid counts", () => {
  for (const html of ["<html>blocked</html>", flight([]), page([]), page([endpoint("same"), endpoint("same")]),
    page([{ ...endpoint("tag"), model_variant_slug: "lab/other" }]),
    page([{ ...endpoint("tag"), stats: { endpoint_id: "different" } }]),
    page(undefined, [...daily(), daily()[0]]),
    page(undefined, daily().map((r) => ({ ...r, total_prompt_tokens: -1 }))),
    page(undefined, daily().map((r) => ({ ...r, total_prompt_tokens: "100" }))),
    page(undefined, daily().map((r) => ({ ...r, variant: "free" }))),
    page(undefined, daily().map((r) => ({ ...r, date: "2026-02-30 00:00:00" }))),
    page(undefined, daily().map((r) => ({ ...r, count: 0 }))),
    page(undefined, daily().map((r) => ({ ...r, total_prompt_tokens: Number.MAX_SAFE_INTEGER })))]) {
    assert.throws(() => parseOpenRouterPage(html, options));
  }
});
test("OpenRouter cache prices distinguish zero and missing, reject coercion and nonfinite values", () => {
  assert.equal(tokenPrice(null), null);
  assert.equal(tokenPrice("0"), 0);
  assert.ok(Math.abs(tokenPrice("2e-7") - 0.2) < 1e-12);
  for (const value of ["", " ", true, false, {}, [], "NaN", "-1", -1, Infinity, 1e309]) assert.throws(() => tokenPrice(value));
});

const cachePayload = () => ({ data: { providerSummaries: [
  { endpointId: "id1", providerName: "Provider", providerSlug: "provider", cacheHitRate: 0, totalTokens: 10 },
  { endpointId: "id2", providerName: "Provider Fast", providerSlug: "provider", cacheHitRate: 0.9, totalTokens: 20 },
], endpointProviderSlugs: { id1: "provider", id2: "provider" }, inputChartData: [], outputChartData: [] } });
const cacheEndpoints = [
  { endpoint_id: "id1", endpoint_tag: "provider/eu", provider: "Provider", or_model_id: "lab/model" },
  { endpoint_id: "id2", endpoint_tag: "provider/fast", provider: "Provider", or_model_id: "lab/model" },
];
test("OpenRouter cache joins UUID to exact routing tag, never base provider slug; zero is observed", () => {
  const result = parseOpenRouterCache(cachePayload(), cacheEndpoints);
  assert.deepEqual(result.joined.map((r) => [r.endpoint_tag, r.cache_hit_rate]), [["provider/eu", 0], ["provider/fast", 0.9]]);
  assert.equal(result.summary_window, null);
  const sparse = parseOpenRouterCache(cachePayload(), cacheEndpoints.slice(0, 1));
  assert.equal(sparse.joined.length, 1);
  assert.equal(sparse.unjoined.length, 1);
  const p = cachePayload(); p.data.providerSummaries[0].totalTokens = 0;
  assert.equal(parseOpenRouterCache(p, cacheEndpoints).joined[0].cache_hit_rate, null);
});
test("OpenRouter cache rejects malformed rates, duplicate UUIDs and inconsistent provider maps", () => {
  for (const invalid of [null, {}, { data: {} }]) assert.throws(() => parseOpenRouterCache(invalid, cacheEndpoints));
  for (const value of [null, "0.9", true, -0.1, 1.1, NaN, Infinity]) {
    const p = cachePayload(); p.data.providerSummaries[0].cacheHitRate = value;
    assert.throws(() => parseOpenRouterCache(p, cacheEndpoints));
  }
  const p = cachePayload(); p.data.providerSummaries.push(p.data.providerSummaries[0]);
  assert.throws(() => parseOpenRouterCache(p, cacheEndpoints));
  const q = cachePayload(); q.data.endpointProviderSlugs.id2 = "wrong";
  assert.throws(() => parseOpenRouterCache(q, cacheEndpoints));
});

test("OpenRouter weekly rankings preserve exact free SKU identity and source last-activity date", () => {
  const fixture = (rows) => flight({ queryKey: ["rankings", "models", { view: "week" }], state: { status: "success", data: rows } });
  const rows = [daily()[0], { ...daily()[1], variant: "free", variant_permaslug: `${options.permaslug}:free` }];
  const result = parseOpenRouterRankings(fixture(rows), { ...options, minimum: 2 });
  assert.equal(result[0].input_output_ratio, 10);
  assert.equal(result[1].variant_permaslug, `${options.permaslug}:free`);
  assert.throws(() => parseOpenRouterRankings(fixture(rows), options), /incomplete/);
  assert.throws(() => parseOpenRouterRankings(fixture([rows[0], rows[0]]), { ...options, minimum: 2 }), /identity/);
  assert.throws(() => parseOpenRouterRankings(fixture([{ ...rows[0], total_prompt_tokens: null }, rows[1]]), { ...options, minimum: 2 }), /Invalid/);
});
