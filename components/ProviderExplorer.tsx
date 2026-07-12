"use client";
import { Fragment, useMemo, useState } from "react";
import type { ClientData, ClientOffer, ProviderInfo } from "../lib/client-model";
import { SCORE_LABELS } from "../lib/types";
import { useSettings } from "./SettingsContext";
import { createOfferScope, isHiddenModel, rankedOffers, scopedCatalogOffers, scoreOf } from "../lib/cost";
import { collapseModels, preferredVariantIds } from "../lib/variants";

const blended = (o: { input_per_1m: number | null; output_per_1m: number | null }) =>
  o.input_per_1m != null && o.output_per_1m != null ? (10 * o.input_per_1m + o.output_per_1m) / 11 : null;
const fmt = (n: number | null) => (n == null ? "—" : `$${n.toFixed(n < 1 ? 3 : 2)}`);

const Badge = ({ children, cls }: { children: React.ReactNode; cls: string }) => (
  <span className={`rounded px-1.5 py-0.5 text-[10px] ${cls}`}>{children}</span>
);

export function ProviderExplorer({ data }: { data: ClientData }) {
  const s = useSettings();
  const preferredId = useMemo(() => preferredVariantIds(data.models, s.score), [data.models, s.score]);
  const [euOnly, setEuOnly] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const effectiveEuOnly = s.euHostedOnly || euOnly;
  const offerScope = useMemo(
    () => createOfferScope(s.excludedSet, s.excludeChinese, data.providers, effectiveEuOnly, s.nonUsOnly, s.teeOnly),
    [s.excludedSet, s.excludeChinese, data.providers, effectiveEuOnly, s.nonUsOnly, s.teeOnly],
  );

  // Match the global collapse switch exactly: either one score-preferred variant
  // per family or every concrete model/SKU row.
  const allowedModels = useMemo(() => {
    const candidates = s.collapse ? collapseModels(data.models, preferredId) : data.models;
    return candidates.filter((model) => {
      if (isHiddenModel(model.family_key, s.hideGptOpus, s.hideFable)) return false;
      if (s.openOnly && !model.open_weights) return false;
      if (s.featured && !model.featured) return false;
      if (s.familySet && !s.familySet.has(model.family_key)) return false;
      const score = scoreOf(model, s.score);
      return !(s.minScore > 0 && (score == null || score < s.minScore));
    });
  }, [data.models, preferredId, s.collapse, s.hideGptOpus, s.hideFable, s.openOnly, s.featured, s.familySet, s.minScore, s.score]);

  // Per-provider model count over the FILTERED model rows (so the directory count matches the
  // list you actually see when you click through).
  const provCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const model of allowedModels) {
      const offers = data.offersByModel[model.id] || [];
      const scoped = scopedCatalogOffers(offers, offerScope);
      for (const k of new Set(scoped.map((o) => o.key))) c.set(k, (c.get(k) ?? 0) + 1);
    }
    return c;
  }, [data.offersByModel, allowedModels, offerScope]);

  // Providers that have at least one offer matching the provider/residency/TEE
  // scope anywhere in the catalog. This keeps "show 0" useful for model/score
  // filters without reintroducing providers that cannot satisfy EU/TEE at all.
  const scopeCapableKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const offers of Object.values(data.offersByModel)) {
      for (const offer of scopedCatalogOffers(offers, offerScope)) keys.add(offer.key);
    }
    return keys;
  }, [data.offersByModel, offerScope]);

  // Directory rows: recompute per-provider model_count over the filtered models,
  // then apply the exact EU/TEE scope and the "keep 0" toggle.
  const providers = useMemo(() => {
    let r = data.providers.map((p) => ({ ...p, model_count: provCounts.get(p.key) ?? 0 }));
    if (offerScope.allowed) r = r.filter((p) => offerScope.allowed!.has(p.key));
    if (offerScope.euHostedOnly || offerScope.teeOnly) r = r.filter((p) => scopeCapableKeys.has(p.key));
    if (!showEmpty) r = r.filter((p) => p.model_count > 0);
    return r;
  }, [data.providers, provCounts, offerScope, scopeCapableKeys, showEmpty]);
  const [sel, setSel] = useState("");
  const [q, setQ] = useState("");
  const [pSort, setPSort] = useState<"models" | "name" | "eu">("models");
  const [sort, setSort] = useState<"price" | "score">("price");
  const [open, setOpen] = useState<Set<string>>(new Set());
  // Fall back to the biggest provider when nothing is selected or the selection was filtered out.
  const provider = providers.find((p) => p.key === sel)
    ?? providers.slice().sort((a, b) => b.model_count - a.model_count)[0];
  const activeKey = provider?.key ?? "";

  // Provider directory rows (left pane): filtered + sorted.
  const dir = useMemo(() => {
    let r = providers.slice();
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((p) => (p.provider + p.platform + (p.country ?? "")).toLowerCase().includes(t));
    r.sort((a, b) =>
      pSort === "models" ? b.model_count - a.model_count
      : pSort === "eu" ? Number(!!b.eu_hosted) - Number(!!a.eu_hosted) || b.model_count - a.model_count
      : a.provider.localeCompare(b.provider));
    return r;
  }, [providers, q, pSort]);

  // Models the selected provider offers (within the global filter) + the full cross-provider field.
  const rows = useMemo(() => {
    if (!activeKey) return [];
    const out: { modelId: string; name: string; org: string; score: number | null; mine: ClientOffer; ranked: ClientOffer[]; rank: number }[] = [];
    for (const model of allowedModels) {
      const offers = data.offersByModel[model.id] || [];
      const scoped = scopedCatalogOffers(offers, offerScope);
      const mine = scoped.find((o) => o.key === activeKey);
      if (!mine) continue;
      const priceRanked = rankedOffers(offers, offerScope);
      const pricedKeys = new Set(priceRanked.map((offer) => offer.key));
      const ordered = [...priceRanked, ...scoped.filter((offer) => !pricedKeys.has(offer.key))];
      out.push({
        modelId: model.id,
        name: s.collapse ? model.family_name : model.display_name,
        org: model.org,
        score: scoreOf(model, s.score),
        mine,
        ranked: ordered,
        rank: priceRanked.findIndex((o) => o.key === activeKey),
      });
    }
    out.sort((a, b) => sort === "price" ? (blended(a.mine) ?? Infinity) - (blended(b.mine) ?? Infinity) : (b.score ?? -1) - (a.score ?? -1));
    return out;
  }, [activeKey, data.offersByModel, allowedModels, offerScope, sort, s.score, s.collapse]);

  const toggle = (modelId: string) => setOpen((s) => { const n = new Set(s); n.has(modelId) ? n.delete(modelId) : n.add(modelId); return n; });
  const flags = (p: ProviderInfo) => (
    <>
      {p.hyperscaler && <Badge cls="bg-amber-500/20 text-amber-300">Hyperscaler</Badge>}
      {p.eu_hosted && <Badge cls="bg-emerald-500/20 text-emerald-300">EU-capable</Badge>}
      {p.non_us && !p.eu_hosted && <Badge cls="bg-sky-500/20 text-sky-300">Non-US</Badge>}
    </>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,360px)_1fr]">
      {/* LEFT: provider directory */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search providers…"
            className="w-full rounded-md border border-line bg-[#0c0f14] px-2 py-1.5 text-sm outline-none focus:border-accent" />
        </div>
        <div className="mb-1 flex gap-1 text-[11px]">
          {(["models", "eu", "name"] as const).map((s) => (
            <button key={s} onClick={() => setPSort(s)} className={`rounded border px-1.5 py-0.5 ${pSort === s ? "border-accent bg-accent/15 text-accent" : "border-line text-gray-500"}`}>
              {s === "models" ? "by #models" : s === "eu" ? "EU first" : "A–Z"}
            </button>
          ))}
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <label className="flex cursor-pointer items-center gap-1 text-gray-400">
            <input type="checkbox" checked={effectiveEuOnly} disabled={s.euHostedOnly} onChange={(e) => setEuOnly(e.target.checked)} className="accent-emerald-500" />
            EU-hosted only
          </label>
          <label className="flex cursor-pointer items-center gap-1 text-gray-400">
            <input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} className="accent-accent" />
            Show providers with 0 matching models
          </label>
        </div>
        <div className="card max-h-[70vh] overflow-y-auto p-0">
          <table className="dtable w-full text-sm">
            <thead className="sticky top-0 bg-panel"><tr>
              <th className="px-2 py-2 text-left text-[11px] text-gray-400">Provider</th>
              <th className="px-2 py-2 text-left text-[11px] text-gray-400">Flags</th>
              <th className="px-2 py-2 text-right text-[11px] text-gray-400"># models</th>
            </tr></thead>
            <tbody>
              {dir.map((p) => (
                <tr key={p.key} onClick={() => { setSel(p.key); setOpen(new Set()); }}
                  className={`cursor-pointer ${p.key === activeKey ? "bg-accent/15" : "hover:bg-white/5"}`}>
                  <td className="px-2 py-1.5">
                    <div className="font-medium">{p.provider}</div>
                    <div className="text-[10px] text-gray-500">{p.platform !== p.provider ? p.platform + " · " : ""}{p.country ?? "—"}</div>
                  </td>
                  <td className="px-2 py-1.5"><div className="flex flex-wrap gap-1">{flags(p)}</div></td>
                  <td className="px-2 py-1.5 text-right tabular text-gray-300">{p.model_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] text-gray-600">{dir.length} providers. Click one to see its models & prices.</p>
      </div>

      {/* RIGHT: selected provider's models */}
      <div>
        {provider && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold">{provider.provider}</span>
            <span className="text-xs text-gray-500">{provider.platform !== provider.provider ? provider.platform : ""}</span>
            {flags(provider)}
            {provider.country && <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">HQ: {provider.country}</span>}
            <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">{rows.length} models</span>
            <div className="ml-auto flex gap-1 text-xs">
              <button onClick={() => setSort("price")} className={`rounded-md border px-2 py-1 ${sort === "price" ? "border-accent bg-accent/15 text-accent" : "border-line text-gray-400"}`}>Sort by price</button>
              <button onClick={() => setSort("score")} className={`rounded-md border px-2 py-1 ${sort === "score" ? "border-accent bg-accent/15 text-accent" : "border-line text-gray-400"}`}>Sort by score</button>
            </div>
          </div>
        )}
        {provider?.note && <p className="mb-3 max-w-3xl text-[11px] text-gray-500">{provider.note}</p>}

        <div className="card overflow-x-auto">
          <table className="dtable w-full text-sm">
            <thead><tr>
              {["Model", SCORE_LABELS[s.score], `in / out / blended ($/1M)`, "Price rank", ""].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs text-gray-400">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = open.has(r.modelId);
                const cheapest = blended(r.mine) != null && r.rank === 0;
                const priceRankByKey = new Map(
                  r.ranked.filter((offer) => blended(offer) != null).map((offer, index) => [offer.key, index + 1]),
                );
                return (
                  <Fragment key={r.modelId}>
                    <tr className="cursor-pointer hover:bg-white/5" onClick={() => toggle(r.modelId)}>
                      <td className="px-3 py-2"><span className="font-medium">{r.name}</span> <span className="text-[11px] text-gray-500">{r.org}</span></td>
                      <td className="px-3 py-2 tabular text-gray-300">{r.score?.toFixed(s.score.startsWith("designarena") ? 0 : 1) ?? "—"}</td>
                      <td className="px-3 py-2 tabular">{fmt(r.mine.input_per_1m)} / {fmt(r.mine.output_per_1m)} / <b>{fmt(blended(r.mine))}</b>{r.mine.tee && <span className="ml-1 rounded bg-purple-500/20 px-1 text-[10px] text-purple-300">TEE</span>}</td>
                      <td className="px-3 py-2 text-xs">{r.rank >= 0 ? <span className={cheapest ? "text-emerald-300" : "text-gray-300"}>#{r.rank + 1}{cheapest ? " · cheapest" : ""}</span> : "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{isOpen ? "▾ hide" : `▸ compare ${r.ranked.length}`}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={5} className="bg-[#0c0f14] px-3 py-2">
                          <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">All providers for {r.name} (cheapest first, 10:1 blended)</div>
                          <table className="w-full text-xs">
                            <tbody>
                              {r.ranked.map((o) => (
                                <tr key={o.key} className={o.key === activeKey ? "bg-accent/10" : ""}>
                                  <td className="px-2 py-1 text-gray-500">{priceRankByKey.has(o.key) ? `#${priceRankByKey.get(o.key)}` : "—"}</td>
                                  <td className="px-2 py-1 font-medium">{o.provider}<span className="ml-1 text-[10px] text-gray-500">{o.platform !== o.provider ? o.platform : ""}</span></td>
                                  <td className="px-2 py-1 text-gray-500">{o.region}</td>
                                  <td className="px-2 py-1 tabular text-right">{fmt(o.input_per_1m)} in</td>
                                  <td className="px-2 py-1 tabular text-right">{fmt(o.output_per_1m)} out</td>
                                  <td className="px-2 py-1 tabular text-right font-semibold">{fmt(blended(o))} blended</td>
                                  <td className="px-2 py-1">{o.tee && <span className="rounded bg-purple-500/20 px-1 text-[10px] text-purple-300">TEE</span>}{o.key === activeKey && <span className="ml-1 text-[10px] text-accent">← selected</span>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500">Blended = (10·input + 1·output) / 11 per 1M tokens. Click a model row to compare its price across every provider.</p>
      </div>
    </div>
  );
}
