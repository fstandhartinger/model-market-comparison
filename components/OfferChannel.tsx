import { offerChannel, channelTitle } from "../lib/offer-channel.mjs";
import type { ClientOffer } from "../lib/client-model";

/** CR-329.1: "via OpenRouter" or "direct" next to a provider, with the price's source and collection day on hover. */
export function OfferChannel({ offer, openRouterDate, className = "ml-1 text-[10px] text-gray-500" }: { offer: ClientOffer; openRouterDate?: string | null; className?: string }) {
  const channel = offerChannel(offer, openRouterDate);
  const title = channelTitle(channel);
  return <span className={className} title={title} data-bh-channel={channel.kind}>{channel.label}<span className="sr-only"> — {title}</span></span>;
}
