/** OpenRouter's GPT-6 `-pro` SKUs expose OpenAI's Pro reasoning mode.
 * They retain separate provider route IDs and prices, but belong to the
 * corresponding GPT-6 family; Pro mode is independent of reasoning effort. */
const GPT6_PRO_ROUTES = Object.freeze({
  "openai/gpt-6-astra-pro": Object.freeze({
    familyKey: "gpt-6-astra", variant: "pro-mode", displayName: "GPT-6 Astra (Pro mode)", reasoningMode: "pro",
  }),
  "openai/gpt-6-sol-pro": Object.freeze({
    familyKey: "gpt-6-sol", variant: "pro-mode", displayName: "GPT-6 Sol (Pro mode)", reasoningMode: "pro",
  }),
  "openai/gpt-6-luna-pro": Object.freeze({
    familyKey: "gpt-6-luna", variant: "pro-mode", displayName: "GPT-6 Luna (Pro mode)", reasoningMode: "pro",
  }),
});

export function openRouterGpt6Alias(id) {
  return GPT6_PRO_ROUTES[String(id || "").replace(/^~/, "")] ?? null;
}

/** Exact GPT-6 model/mode pages share one slot in each normal daily rotation.
 * Sorting by each page's latest attempt rotates that slot through the family;
 * the remaining slots continue the catalog-wide oldest-attempt rotation. */
export const OPENROUTER_GPT6_PRIORITY_IDS = Object.freeze([
  "openai/gpt-6-astra",
  "openai/gpt-6-sol",
  "openai/gpt-6-luna",
  ...Object.keys(GPT6_PRO_ROUTES),
]);

export function selectOpenRouterEfficiencyModels({ catalogIds, attempts = {}, limit = 4 }) {
  if (!(catalogIds instanceof Set)) throw new TypeError("catalogIds must be a Set of exact catalog IDs");
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) throw new RangeError("limit must be 1..12");
  const oldestFirst = (ids) => [...ids].sort((a, b) =>
    String(attempts[a]?.collected_at || "").localeCompare(String(attempts[b]?.collected_at || "")) || a.localeCompare(b));
  const priorityIds = OPENROUTER_GPT6_PRIORITY_IDS.filter((id) => catalogIds.has(id));
  const priority = oldestFirst(priorityIds).slice(0, 1);
  const prioritySet = new Set(OPENROUTER_GPT6_PRIORITY_IDS);
  const regular = oldestFirst([...catalogIds].filter((id) => !prioritySet.has(id)));
  return [...priority, ...regular.slice(0, limit - priority.length)];
}
