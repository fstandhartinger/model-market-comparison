// Live vendor catalogs list, delist and re-price models daily (R9.1). A test that pins one live
// row (CR-534 STACKIT Gemma 3, CR-597 Chutes Nemo, CR-668 T-Systems 200k tier) fails the daily
// publish on the vendor's next table change. Pin the join instead: the dataset carries the offer
// exactly when today's retained raw catalog lists the row, with the raw row's attributes.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { perMillion } from "../../lib/openrouter-endpoints.mjs";

const RAW = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "raw");

export const rawCatalog = (file) => JSON.parse(readFileSync(join(RAW, file), "utf8"));

// First raw row matching `match` (a predicate, or an exact model_name string), else undefined.
export function listedRow(catalog, match) {
  const test = typeof match === "function" ? match : (row) => row.model_name === match;
  return (catalog.models ?? []).find(test);
}

// True when OpenRouter's catalog lists `id` with an endpoint served by `providerName`.
export function openRouterListed(openRouter, id, providerName) {
  return openRouter.models.some((model) => model.id === id
    && (model.endpoints ?? []).some((endpoint) => endpoint.provider_name === providerName));
}

// OpenRouter model `id`, or undefined when the retained catalog no longer lists it.
export const openRouterModel = (openRouter, id) => openRouter.models.find((model) => model.id === id);

// First endpoint of `id` matching `match` (an endpoint tag string, or a predicate), else undefined.
export function openRouterEndpoint(openRouter, id, match) {
  const test = typeof match === "function" ? match : (endpoint) => endpoint.tag === match;
  return (openRouterModel(openRouter, id)?.endpoints ?? []).find(test);
}

// The endpoint's list prices as the dataset stores them (USD per 1M tokens; null when unpriced).
export const endpointPrices = (endpoint) => ({
  input: perMillion(endpoint.pricing?.prompt),
  output: perMillion(endpoint.pricing?.completion),
  cacheRead: perMillion(endpoint.pricing?.input_cache_read),
});

// Join parity: fails both when a listed row did not join (the regression the pin protected) and
// when a delisted row survives as a phantom offer. Returns `listed` for assertExercised.
export function assertJoinParity(assert, joined, listed, what) {
  assert.equal(Boolean(joined), Boolean(listed), listed
    ? `${what}: today's raw catalog lists it, but the dataset has no joined offer`
    : `${what}: the raw catalog no longer lists it, but the dataset still carries the offer`);
  return Boolean(listed);
}

// Non-vacuity floor for a group of parity checks spanning several vendors: one vendor change can
// leave the group partly unexercised, but if no pinned row is listed any more the test protects
// nothing and must be re-anchored on rows that are listed.
export function assertExercised(assert, results, what) {
  assert.ok(results.some(Boolean), `${what}: none of the pinned rows is listed any more; re-anchor the regression on listed rows`);
}
