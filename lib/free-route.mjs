/**
 * CR-50.1 (Florian 2026-09-16, CR-20260916l): a zero-price API route is volatile availability or promotion
 * evidence, never the ordinary paid price. OpenRouter's ":free" SKUs are rate- and daily-quota-limited by
 * OpenRouter's own rules, and any other $0 route is treated the same way. Such routes stay in the dataset
 * (provenance) and in the full route lists, labelled, but no cost ranking, chart, table or value map may use
 * them as a model's price — the cheapest current paid route (or the AA reference price) is used instead.
 */
export const FREE_ROUTE_NOTE = "Free route: rate- and quota-limited, availability may change — not used as a paid price";

/** True for a route whose token price is zero (both directions) or that is an OpenRouter ":free" SKU. */
export function isFreeRoute(offer) {
  if (!offer) return false;
  if (/:free$/i.test(String(offer.or_model_id || ""))) return true;
  return offer.input_per_1m === 0 && offer.output_per_1m === 0;
}

/** Routes that can stand for a paid price. */
export function paidRoutes(offers) {
  return (offers || []).filter((offer) => !isFreeRoute(offer));
}
