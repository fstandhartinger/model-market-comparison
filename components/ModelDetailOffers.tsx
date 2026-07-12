"use client";

import { useMemo } from "react";
import type { ClientOffer, ProviderInfo } from "../lib/client-model";
import { createOfferScope, rankedOffers } from "../lib/cost";
import { usdPerM } from "../lib/format";
import { useSettings } from "./SettingsContext";

export function ModelDetailOffers({
  offers,
  providers,
  view,
}: {
  offers: ClientOffer[];
  providers: ProviderInfo[];
  view: "top" | "all";
}) {
  const s = useSettings();
  const scope = useMemo(
    () => createOfferScope(s.excludedSet, s.excludeChinese, providers, s.euHostedOnly, s.nonUsOnly, s.euDedicated, s.teeOnly),
    [s.excludedSet, s.excludeChinese, providers, s.euHostedOnly, s.nonUsOnly, s.euDedicated, s.teeOnly],
  );
  const ranked = useMemo(() => rankedOffers(offers, scope), [offers, scope]);

  if (view === "top") {
    const top = ranked.slice(0, 5);
    return (
      <section className="card min-w-0 overflow-x-auto p-4">
        <h2 className="mb-1 font-semibold">Top {Math.min(5, top.length)} cheapest providers <span className="text-xs font-normal text-gray-500">(10:1 blended)</span></h2>
        <p className="mb-3 text-[11px] text-gray-500">Within the active global provider, residency and confidentiality filters.</p>
        {top.length ? (
          <table className="dtable w-full text-sm">
            <thead><tr>
              <th className="px-2 py-1 text-left text-xs text-gray-400">#</th>
              <th className="px-2 py-1 text-left text-xs text-gray-400">Provider</th>
              <th className="px-2 py-1 text-left text-xs text-gray-400">Platform</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">Input/1M</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">Output/1M</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">Blended</th>
            </tr></thead>
            <tbody>
              {top.map((offer, index) => (
                <tr key={offer.key}>
                  <td className="px-2 py-1 text-gray-500">{index + 1}</td>
                  <td className="px-2 py-1">{offer.provider}{offer.estimated && <span className="ml-1 text-[10px] text-warn">est.</span>}</td>
                  <td className="px-2 py-1 text-gray-400">{offer.platform}</td>
                  <td className="px-2 py-1 text-right tabular">{usdPerM(offer.input_per_1m)}</td>
                  <td className="px-2 py-1 text-right tabular">{usdPerM(offer.output_per_1m)}</td>
                  <td className="px-2 py-1 text-right tabular font-semibold">{usdPerM(offer.blended)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-gray-500">No per-token pricing matches the active global filters.</p>}
      </section>
    );
  }

  const byPlatform = new Map<string, typeof ranked>();
  for (const offer of ranked) {
    if (!byPlatform.has(offer.platform)) byPlatform.set(offer.platform, []);
    byPlatform.get(offer.platform)!.push(offer);
  }
  return (
    <section className="card mt-6 min-w-0 overflow-x-auto p-4">
      <h2 className="mb-1 font-semibold">Token offers by platform</h2>
      <p className="mb-3 text-[11px] text-gray-500">{ranked.length} offers within the active global filters.</p>
      {[...byPlatform.entries()].map(([platform, platformOffers]) => (
        <div key={platform} className="mb-4">
          <h3 className="mb-1 text-sm font-medium text-accent">{platform} <span className="text-xs font-normal text-gray-500">({platformOffers.length})</span></h3>
          <table className="dtable w-full text-sm">
            <tbody>
              {platformOffers.map((offer) => (
                <tr key={offer.key}>
                  <td className="px-2 py-1">{offer.provider}</td>
                  <td className="px-2 py-1 text-xs text-gray-500">{offer.region}{offer.eu_hosted && <span className="ml-1 text-emerald-300">EU</span>}{offer.tee && <span className="ml-1 text-purple-300">TEE</span>}</td>
                  <td className="px-2 py-1 text-right tabular">{usdPerM(offer.input_per_1m)}<span className="text-gray-600"> in</span></td>
                  <td className="px-2 py-1 text-right tabular">{usdPerM(offer.output_per_1m)}<span className="text-gray-600"> out</span></td>
                  <td className="px-2 py-1 text-right tabular font-semibold">{usdPerM(offer.blended)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {ranked.length === 0 && <p className="text-sm text-gray-500">No token offers match the active global filters.</p>}
    </section>
  );
}
