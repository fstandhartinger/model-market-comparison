// CR-329.1: which channel a price is for. An OpenRouter row is OpenRouter's price for that provider's endpoint; every
// other row is the platform's own (direct) price list. Simon (7 Oct 2026) read "Inceptron · OpenRouter" and
// "Inceptron · eu" as two prices of one provider without being told which was which.

/** @param {{ platform: string, provider: string, or_model_id?: string, price_source?: { url: string, date?: string | null, basis?: string }, price_status?: string }} offer
 *  @param {string | null | undefined} openRouterDate the OpenRouter snapshot day */
export function offerChannel(offer, openRouterDate) {
  if (offer.platform === "OpenRouter") {
    return {
      kind: "openrouter", label: "via OpenRouter",
      url: offer.or_model_id ? `https://openrouter.ai/${offer.or_model_id}/providers` : "https://openrouter.ai",
      date: openRouterDate || null, basis: `OpenRouter's price for ${offer.provider}'s endpoint`,
    };
  }
  return {
    kind: "direct", label: offer.platform !== offer.provider ? `direct · ${offer.platform}` : "direct",
    url: offer.price_source?.url || null, date: offer.price_source?.date || null,
    basis: offer.price_source?.basis || `${offer.platform}'s own price list`,
  };
}

export function channelTitle(channel) {
  const head = channel.kind === "openrouter" ? "Price via OpenRouter" : "Direct price";
  return `${head}: ${channel.basis}${channel.url ? ` (${channel.url})` : ""}${channel.date ? `, collected ${channel.date}` : ""}.`;
}

/** A direct route whose provider publishes no collectable price shows "price n/a" — never another channel's price. */
export const priceNotAvailable = (offer) => offer.price_status === "n/a" || (offer.input_per_1m == null && offer.output_per_1m == null);
