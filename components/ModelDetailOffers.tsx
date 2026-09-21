"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ClientOffer, ProviderInfo, ClientModel, ClientData } from "../lib/client-model";
import { offerPrice, priceContext, priceLabel, scopeFromSettings, rankedOffers, scopedCatalogRoutes } from "../lib/cost";
import { FREE_ROUTE_NOTE, freeRouteLabel, freeRouteTitle, isCurrentFreeRoute, isFreeRoute, isStealthPreview } from "../lib/free-route.mjs";
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
    () => scopeFromSettings(s, providers),
    [s.excludedSet, s.hostedIn, s.providerBasedIn, providers, s.allowDataTraining],
  );
  const ctx = useMemo(() => priceContext(model, { ...pricingData, models: [model], offersByModel: { [model.id]: offers }, offersByFamily: {}, providers, families: [] }, s), [model, pricingData, offers, providers, s.priceMode, s.inputWeight, s.ioBasis]);
  const ranked = useMemo(() => rankedOffers(offers, scope, ctx), [offers, scope, ctx]);
  const catalog = useMemo(() => scopedCatalogRoutes(offers, scope, ctx).map((offer) => ({
    ...offer,
    price: offerPrice(offer, ctx),
  })), [offers, scope, ctx]);
  const freeWhen = { snapshotDate: pricingData.sourceDates?.openrouter, generatedAt: pricingData.generated_at };
  // CR-50.2: the overview's "Free route" pill links to #all-offers; open the folded route list when it is the target.
  const allRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (view === "all" && window.location.hash === "#all-offers" && allRef.current) {
      allRef.current.open = true;
      allRef.current.scrollIntoView();
    }
  }, [view]);

  // F-145 (Fable pass 26): a model nobody offers yet gets one sentence, not a card headed "Top 0 cheapest providers"
  // that blames the filters. Same words as the Overview row's "No public API price" tip.
  if (offers.length === 0) {
    return view === "top"
      ? <section className="card min-w-0 self-start p-4" data-bh-no-offers>
          <h2 className="mb-1 font-semibold">Providers</h2>
          <p className="text-sm text-gray-500">No provider publishes an API price for this model yet, so no cost can be modeled.</p>
        </section>
      : null;
  }

  if (view === "top") {
    const top = ranked.slice(0, 5);
    return (
      <section className="card min-w-0 overflow-x-auto p-4">
        <h2 className="mb-1 font-semibold">Top {Math.min(5, top.length)} cheapest providers <span className="text-xs font-normal text-gray-500">({priceLabel(s)})</span></h2>
        {/* CR-63.14: identical list prices can give different adjusted costs. */}
        {s.priceMode === "adjusted" && top.length > 1 && <p className="mb-2 text-xs text-gray-500">The same list price can give a different adjusted $/task (caching, token efficiency) — click a price for its inputs.</p>}
        <p className="mb-3 text-[11px] text-gray-500">Within the active global provider, residency and confidentiality filters.</p>
        {top.length ? (
          <table className="dtable w-full text-sm">
            <thead><tr>
              <th className="px-2 py-1 text-left text-xs text-gray-400">#</th>
              <th className="px-2 py-1 text-left text-xs text-gray-400">Provider</th>
              <th className="hidden px-2 py-1 text-left text-xs text-gray-400 sm:table-cell">Platform</th>
              <th className="hidden px-2 py-1 text-right text-xs text-gray-400 md:table-cell">Raw input $/1M</th>
              <th className="hidden px-2 py-1 text-right text-xs text-gray-400 md:table-cell">Raw output $/1M</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">{priceLabel(s)}</th>
            </tr></thead>
            <tbody>
              {top.map((offer, index) => (
                <tr key={offer.key}>
                  <td className="px-2 py-1 text-gray-500">{index + 1}</td>
                  <td className="px-2 py-1">{offer.provider}{offer.estimated && <span className="ml-1 text-[10px] text-warn">est.</span>}{offer.eu_policy_equivalent && <span title="Company-approved equivalent; this Global deployment may process inference outside the EU" className="ml-1 rounded bg-sky-500/20 px-1 text-[10px] text-sky-300">EU equivalent</span>}</td>
                  <td className="hidden px-2 py-1 text-gray-400 sm:table-cell">{offer.platform}</td>
                  <td className="hidden px-2 py-1 text-right tabular md:table-cell">{usdPerM(offer.input_per_1m)}</td>
                  <td className="hidden px-2 py-1 text-right tabular md:table-cell">{usdPerM(offer.output_per_1m)}</td>
                  <td className="px-2 py-1 text-right tabular font-semibold"><PriceValue price={offer.price} showEstimate={false} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : offers.some(isStealthPreview)
          // CR-60.3: a stealth model's only route is its $0 preview — say so instead of "no pricing".
          ? <p className="text-sm text-gray-500"><span className="rounded border border-line px-1 text-xs text-gray-400">free (stealth preview)</span> on OpenRouter — rate-limited and temporary, not a paid price; the eventual price is not announced.</p>
          : <p className="text-sm text-gray-500">No per-token pricing matches the active global filters.</p>}
      </section>
    );
  }

  const byPlatform = new Map<string, typeof catalog>();
  for (const offer of catalog) {
    if (!byPlatform.has(offer.platform)) byPlatform.set(offer.platform, []);
    byPlatform.get(offer.platform)!.push(offer);
  }
  return (
    // F-08b: the full route list stays on the page, folded — the top-5 table above answers
    // the usual question, and the unfolded list alone was a third of the page.
    <details ref={allRef} id="all-offers" className="card mt-6 min-w-0 overflow-x-auto p-4">
      <summary className="font-semibold">Token offers by platform · {catalog.length} offers <span className="text-xs font-normal text-gray-500">({priceLabel(s)})</span></summary>
      <PriceAssumptions />
      <p className="mb-3 text-[11px] text-gray-500">{catalog.length} offers within the active global filters; “—” means the catalog is active but no public token price is available.</p>
      {[...byPlatform.entries()].map(([platform, platformOffers]) => (
        <div key={platform} className="mb-4">
          <h3 className="mb-1 text-sm font-medium text-accent">{platform} <span className="text-xs font-normal text-gray-500">({platformOffers.length})</span></h3>
          {/* F-08b: the same column set as the top-5 table — Provider and price on phones,
              route details and raw prices from md up. */}
          <table className="dtable w-full text-sm">
            <tbody>
              {platformOffers.map((offer) => (
                <tr key={[offer.key, offer.region, offer.pricing_tier, offer.route_type, offer.endpoint_tag].join("::")} data-free-route={isFreeRoute(offer) ? "1" : undefined}>
                  <td className="px-2 py-1">{offer.provider}{isFreeRoute(offer) && (() => {
                    // CR-50.2: a current, healthy free route names its provider and its limits; any other $0 route keeps the generic note.
                    const note = isCurrentFreeRoute(offer, freeWhen) ? freeRouteTitle([offer], pricingData.sourceDates?.openrouter) : FREE_ROUTE_NOTE;
                    return <span title={note} data-bh-free-route-current={isCurrentFreeRoute(offer, freeWhen) ? "1" : undefined} className="ml-1 rounded border border-line px-1 text-[10px] text-gray-400">{freeRouteLabel(offer)}<span className="sr-only"> — {note}</span></span>;
                  })()}</td>
                  <td className="hidden px-2 py-1 text-xs text-gray-500 md:table-cell">{offer.region}{offer.endpoint_tag && <span className="ml-1 text-gray-400">{offer.endpoint_tag}</span>}{offer.pricing_tier && <span className="ml-1 text-sky-300">{offer.pricing_tier.replaceAll("_", " ")}</span>}{offer.route_type && <span className="ml-1 text-amber-300">{offer.route_type.replaceAll("_", " ")}</span>}{offer.eu_hosted && <span className="ml-1 text-emerald-300">EU</span>}{offer.eu_policy_equivalent && <span title="Company-approved equivalent; Global inference may occur outside the EU" className="ml-1 text-sky-300">EU equivalent</span>}{offer.tee && <span className="ml-1 text-purple-300">TEE</span>}</td>
                  <td className="hidden px-2 py-1 text-right tabular md:table-cell">{usdPerM(offer.input_per_1m)}<span className="text-gray-600"> raw in $/1M</span></td>
                  <td className="hidden px-2 py-1 text-right tabular md:table-cell">{usdPerM(offer.output_per_1m)}<span className="text-gray-600"> raw out $/1M</span></td>
                  <td className="px-2 py-1 text-right tabular font-semibold">{isFreeRoute(offer) ? <span className="text-xs font-normal text-gray-500" title={FREE_ROUTE_NOTE}>not a paid price</span> : <PriceValue price={offer.price} showEstimate={false} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {catalog.length === 0 && <p className="text-sm text-gray-500">No token offers match the active global filters.</p>}
    </details>
  );
}
