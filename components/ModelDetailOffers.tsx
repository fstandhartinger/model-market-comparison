"use client";

import { useMemo } from "react";
import type { ClientOffer, ProviderInfo, ClientModel, ClientData } from "../lib/client-model";
import { offerPrice, priceContext, priceLabel, createOfferScope, rankedOffers, scopedCatalogRoutes } from "../lib/cost";
import { usdPerM } from "../lib/format";
import { PriceValue, PriceAssumptions } from "./PriceValue";
import { useSettings } from "./SettingsContext";

export function ModelDetailOffers({
  offers,
  providers,
  model,
  pricingData,
  view,
}: {
  offers: ClientOffer[];
  model: ClientModel;
  pricingData: Pick<ClientData, "efficiency" | "sourceDates" | "generated_at">;
  providers: ProviderInfo[];
  view: "top" | "all";
}) {
  const s = useSettings();
  const scope = useMemo(
    () => createOfferScope(s.excludedSet, s.excludeChinese, providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly),
    [s.excludedSet, s.excludeChinese, providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly],
  );
  const ctx = useMemo(() => priceContext(model, { ...pricingData, models: [model], offersByModel: { [model.id]: offers }, offersByFamily: {}, providers, families: [] }, s), [model, pricingData, offers, providers, s.priceMode, s.inputWeight]);
  const ranked = useMemo(() => rankedOffers(offers, scope, ctx), [offers, scope, ctx]);
  const catalog = useMemo(() => scopedCatalogRoutes(offers, scope, ctx).map((offer) => ({
    ...offer,
    price: offerPrice(offer, ctx),
  })), [offers, scope, ctx]);

  if (view === "top") {
    const top = ranked.slice(0, 5);
    return (
      <section className="card min-w-0 overflow-x-auto p-4">
        <h2 className="mb-1 font-semibold">Top {Math.min(5, top.length)} cheapest providers <span className="text-xs font-normal text-gray-500">({priceLabel(s)})</span></h2>
        <p className="mb-3 text-[11px] text-gray-500">Within the active global provider, residency and confidentiality filters.</p>
        {top.length ? (
          <table className="dtable w-full text-sm">
            <thead><tr>
              <th className="px-2 py-1 text-left text-xs text-gray-400">#</th>
              <th className="px-2 py-1 text-left text-xs text-gray-400">Provider</th>
              <th className="px-2 py-1 text-left text-xs text-gray-400">Platform</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">Raw input $/1M</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">Raw output $/1M</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">{priceLabel(s)}</th>
            </tr></thead>
            <tbody>
              {top.map((offer, index) => (
                <tr key={offer.key}>
                  <td className="px-2 py-1 text-gray-500">{index + 1}</td>
                  <td className="px-2 py-1">{offer.provider}{offer.estimated && <span className="ml-1 text-[10px] text-warn">est.</span>}{offer.eu_policy_equivalent && <span title="Company-approved equivalent; this Global deployment may process inference outside the EU" className="ml-1 rounded bg-sky-500/20 px-1 text-[10px] text-sky-300">EU equivalent</span>}</td>
                  <td className="px-2 py-1 text-gray-400">{offer.platform}</td>
                  <td className="px-2 py-1 text-right tabular">{usdPerM(offer.input_per_1m)}</td>
                  <td className="px-2 py-1 text-right tabular">{usdPerM(offer.output_per_1m)}</td>
                  <td className="px-2 py-1 text-right tabular font-semibold"><PriceValue price={offer.price} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-gray-500">No per-token pricing matches the active global filters.</p>}
      </section>
    );
  }

  const byPlatform = new Map<string, typeof catalog>();
  for (const offer of catalog) {
    if (!byPlatform.has(offer.platform)) byPlatform.set(offer.platform, []);
    byPlatform.get(offer.platform)!.push(offer);
  }
  return (
    <section className="card mt-6 min-w-0 overflow-x-auto p-4">
      <h2 className="mb-1 font-semibold">Token offers by platform — {priceLabel(s)}</h2>
      <PriceAssumptions />
      <p className="mb-3 text-[11px] text-gray-500">{catalog.length} offers within the active global filters; “—” means the catalog is active but no public token price is available.</p>
      {[...byPlatform.entries()].map(([platform, platformOffers]) => (
        <div key={platform} className="mb-4">
          <h3 className="mb-1 text-sm font-medium text-accent">{platform} <span className="text-xs font-normal text-gray-500">({platformOffers.length})</span></h3>
          <table className="dtable w-full text-sm">
            <tbody>
              {platformOffers.map((offer) => (
                <tr key={[offer.key, offer.region, offer.pricing_tier, offer.route_type, offer.endpoint_tag].join("::")}>
                  <td className="px-2 py-1">{offer.provider}</td>
                  <td className="px-2 py-1 text-xs text-gray-500">{offer.region}{offer.endpoint_tag && <span className="ml-1 text-gray-400">{offer.endpoint_tag}</span>}{offer.pricing_tier && <span className="ml-1 text-sky-300">{offer.pricing_tier.replaceAll("_", " ")}</span>}{offer.route_type && <span className="ml-1 text-amber-300">{offer.route_type.replaceAll("_", " ")}</span>}{offer.eu_hosted && <span className="ml-1 text-emerald-300">EU</span>}{offer.eu_policy_equivalent && <span title="Company-approved equivalent; Global inference may occur outside the EU" className="ml-1 text-sky-300">EU equivalent</span>}{offer.tee && <span className="ml-1 text-purple-300">TEE</span>}</td>
                  <td className="px-2 py-1 text-right tabular">{usdPerM(offer.input_per_1m)}<span className="text-gray-600"> raw in $/1M</span></td>
                  <td className="px-2 py-1 text-right tabular">{usdPerM(offer.output_per_1m)}<span className="text-gray-600"> raw out $/1M</span></td>
                  <td className="px-2 py-1 text-right tabular font-semibold"><PriceValue price={offer.price} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {catalog.length === 0 && <p className="text-sm text-gray-500">No token offers match the active global filters.</p>}
    </section>
  );
}
