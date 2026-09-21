/**
 * CR-50.1 (Florian 2026-09-16, CR-20260916l): a zero-price API route is volatile availability or promotion
 * evidence, never the ordinary paid price. OpenRouter's ":free" SKUs are rate- and daily-quota-limited by
 * OpenRouter's own rules, and any other $0 route is treated the same way. Such routes stay in the dataset
 * (provenance) and in the full route lists, labelled, but no cost ranking, chart, table or value map may use
 * them as a model's price — the cheapest current paid route (or the AA reference price) is used instead.
 */
export const FREE_ROUTE_NOTE = "Free route: rate- and quota-limited, availability may change — not used as a paid price";

/**
 * CR-80.2 (Florian 2026-09-18, CR-20260918a): a model with a capability score but no priced public API offer
 * stays visible everywhere a score is ranked — never silently hidden. Its cost cell says "No public API price"
 * with this explanation; cost charts do not plot it (with a note how many are not plotted), and only an
 * explicit cost limit drops it from the table.
 */
export const NO_PUBLIC_PRICE_NOTE = "No provider publishes an API price for this model, so no cost can be modeled. Shown for its benchmark scores; not plotted on cost charts, and excluded only while a cost limit is set.";

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

/** CR-60.3 (2026-09-16): a stealth (pre-announcement) model's $0 preview route is named as such. */
export function isStealthPreview(offer) {
  return isFreeRoute(offer) && (/^stealth\//i.test(String(offer.or_model_id || "")) || String(offer.endpoint_tag || "").toLowerCase() === "stealth");
}
export function freeRouteLabel(offer) {
  return isStealthPreview(offer) ? "free (stealth preview)" : "free";
}

/**
 * CR-50.2 (Florian 2026-09-16, CR-20260916l; form chosen by the design authority, iteration 149): a model gets the
 * "Free route" mark only while a zero-price route is current and broadly usable — an OpenRouter ":free"/$0 endpoint
 * that OpenRouter lists as healthy (endpoint status 0) in a snapshot no older than FREE_ROUTE_MAX_AGE_DAYS before the
 * dataset build, and not a stealth preview. Degraded, vanished, stale or preview routes get no mark; their raw
 * provenance stays in the route lists.
 */
export const FREE_ROUTE_MAX_AGE_DAYS = 3;

export function isCurrentFreeRoute(offer, { snapshotDate, generatedAt } = {}) {
  if (!isFreeRoute(offer) || isStealthPreview(offer)) return false;
  if (offer.platform !== "OpenRouter" || offer.status !== 0) return false;
  const snap = Date.parse(snapshotDate ?? "");
  const built = Date.parse(generatedAt ?? "");
  if (!Number.isFinite(snap) || !Number.isFinite(built)) return false;
  return snap <= built && built - snap <= FREE_ROUTE_MAX_AGE_DAYS * 86400000;
}

export function currentFreeRoutes(offers, when) {
  return (offers || []).filter((offer) => isCurrentFreeRoute(offer, when));
}

/** One sentence for the mark's title and screen readers: provider named, limits stated, never "the model is free". */
export function freeRouteTitle(routes, snapshotDate) {
  const providers = [...new Set((routes || []).map((offer) => offer.provider).filter(Boolean))];
  const via = providers.length ? ` via ${providers.join(", ")}` : "";
  const asOf = snapshotDate ? ` (listed live on ${String(snapshotDate).slice(0, 10)})` : "";
  return `Free route on OpenRouter${via}${asOf}. Rate and daily limits apply and availability may change; every other route costs money, and the cost shown uses the cheapest paid route.`;
}
