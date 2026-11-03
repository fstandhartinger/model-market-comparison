// Extra live-catalog helpers (#41929). live-catalog.mjs has no OpenRouter endpoint accessor: tests
// that compare a built offer with its raw OpenRouter route need the endpoint itself, not a boolean.
import { perMillion } from "../../lib/openrouter-endpoints.mjs";

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
