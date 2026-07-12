"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ClientData, ClientModel, ClientOffer } from "../lib/client-model";
import {
  blend,
  createOfferScope,
  isHiddenModel,
  scopedCatalogOffers,
} from "../lib/cost";
import { usdPerM } from "../lib/format";
import { preferredVariantIds, selectableModels } from "../lib/variants";
import { useSettings } from "./SettingsContext";

interface SotaEntry { key: string; name: string }
interface SotaRow { entry: SotaEntry; model: ClientModel | null; offers: ClientOffer[] }

export function EuSotaTable({ data, entries }: { data: ClientData; entries: SotaEntry[] }) {
  const s = useSettings();
  const candidates = useMemo(() => selectableModels(data.models, s.hideDeprecated), [data.models, s.hideDeprecated]);
  const preferredIds = useMemo(() => preferredVariantIds(candidates, s.score), [candidates, s.score]);
  const modelByFamily = useMemo(() => {
    const result = new Map<string, (typeof data.models)[number]>();
    for (const model of candidates) {
      if (preferredIds.get(model.family_key) === model.id) result.set(model.family_key, model);
    }
    for (const model of candidates) if (!result.has(model.family_key)) result.set(model.family_key, model);
    return result;
  }, [candidates, preferredIds]);

  // This page is EU-specific even when the global EU toggle is off. Every other
  // provider/model restriction still composes with the mandatory exact-offer
  // residency or explicit company-policy equivalence check.
  const offerScope = useMemo(
    () => createOfferScope(
      s.excludedSet,
      s.excludeChinese,
      data.providers,
      true,
      s.nonUsOnly,
      s.teeOnly,
    ),
    [s.excludedSet, s.excludeChinese, data.providers, s.nonUsOnly, s.teeOnly],
  );

  const rows = entries.reduce<SotaRow[]>((result, entry) => {
    const model = modelByFamily.get(entry.key);
    if (!model) {
      const hiddenAsDeprecated = s.hideDeprecated
        && data.models.some((candidate) => candidate.family_key === entry.key && candidate.deprecated);
      if (!hiddenAsDeprecated) result.push({ entry, model: null, offers: [] });
      return result;
    }
    if (isHiddenModel(model.family_key, s.hideGptOpus, s.hideFable)) return result;
    if (s.openOnly && !model.open_weights) return result;
    if (s.featured && !model.featured) return result;
    if (s.familySet && !s.familySet.has(model.family_key)) return result;
    const score = model.scores[s.score];
    if (s.minScore > 0 && (score == null || score < s.minScore)) return result;
    const offers = scopedCatalogOffers(data.offersByModel[model.id], offerScope);
    // Unlike the page's built-in EU baseline (which intentionally keeps a row
    // to explain that no EU route exists), explicit global provider/TEE/Non-US
    // restrictions behave like the other comparison views and remove a model
    // when no exact offer survives.
    if ((s.teeOnly || s.nonUsOnly || s.excludedSet) && offers.length === 0) return result;
    result.push({
      entry,
      model,
      offers,
    });
    return result;
  }, []);

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="dtable w-full min-w-[720px] text-sm">
          <thead><tr>
            <th className="px-3 py-2 text-left text-xs text-gray-400">Model</th>
            <th className="px-3 py-2 text-left text-xs text-gray-400">EU-hosted / approved-equivalent offers (10:1 blended $/1M)</th>
          </tr></thead>
          <tbody>
            {rows.map(({ entry, model, offers }) => (
              <tr key={entry.key}>
                <td className="px-3 py-2 font-medium">
                  {model ? <Link href={`/models/${encodeURIComponent(model.id)}`} className="hover:text-accent">{entry.name}</Link> : entry.name}
                </td>
                <td className="px-3 py-2 text-sm">
                  {offers.length ? offers.map((offer) => {
                    const price = blend(offer.input_per_1m, offer.output_per_1m);
                    return (
                      <span key={offer.key} className="mr-3 whitespace-nowrap">
                        <b>{offer.provider}</b>
                        {offer.platform !== offer.provider && <span className="text-[10px] text-gray-500">/{offer.platform}</span>}
                        {" "}<span className="text-gray-400">{price == null ? "price not public" : usdPerM(price)}</span>
                        {offer.eu_policy_equivalent && <span title="Company-approved equivalent; this Global deployment may process inference outside the EU" className="ml-1 rounded bg-sky-500/20 px-1 text-[10px] text-sky-300">EU equivalent</span>}
                        {offer.tee && <span className="ml-1 rounded bg-purple-500/20 px-1 text-[10px] text-purple-300">TEE</span>}
                      </span>
                    );
                  }) : <span className="text-warn/90">no EU-hosted or approved-equivalent route within the active global filters — self-host the open weights in an EU region</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="mt-2 text-sm text-gray-500">No SOTA model family matches the active global model filters.</p>}
      <p className="mt-2 text-[11px] text-gray-500">
        {rows.length} model families within the active global model/provider filters. Active catalog listings without a public per-token rate remain visible as “price not public”.
      </p>
    </>
  );
}
