export interface OfferChannel { kind: "openrouter" | "direct"; label: string; url: string | null; date: string | null; basis: string }
export function offerChannel(offer: { platform: string; provider: string; or_model_id?: string; price_source?: { url: string; date?: string | null; basis?: string }; price_status?: string }, openRouterDate?: string | null): OfferChannel;
export function channelTitle(channel: OfferChannel): string;
export function priceNotAvailable(offer: { price_status?: string; input_per_1m: number | null; output_per_1m: number | null }): boolean;
