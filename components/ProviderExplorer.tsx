"use client";
import { Fragment, useMemo, useState } from "react";
import type { ClientData, ClientOffer } from "../lib/client-model";

const blended = (o: { input_per_1m: number | null; output_per_1m: number | null }) =>
  o.input_per_1m != null && o.output_per_1m != null ? (10 * o.input_per_1m + o.output_per_1m) / 11 : null;
const fmt = (n: number | null) => (n == null ? "—" : `$${n.toFixed(n < 1 ? 3 : 2)}`);

export function ProviderExplorer({ data }: { data: ClientData }) {
  // Providers that actually have priced token offers, by model_count desc.
  const providers = useMemo(
    () => data.providers.filter((p) => p.model_count > 0).sort((a, b) => b.model_count - a.model_count),
    [data.providers]
  );
  const [sel, setSel] = useState(providers[0]?.key ?? "");
  const [sort, setSort] = useState<"price" | "score">("price");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const provider = providers.find((p) => p.key === sel);

  const modelByFamily = useMemo(() => {
    const m = new Map<string, (typeof data.models)[number]>();
    for (const mo of data.models) if (!m.has(mo.family_key)) m.set(mo.family_key, mo);
    return m;
  }, [data.models]);

  // Every model this provider offers, with the provider's own offer + the full
  // ranked cross-provider field for that model.
  const rows = useMemo(() => {
    if (!sel) return [];
    const out: { fam: string; name: string; org: string; score: number | null; mine: ClientOffer; ranked: ClientOffer[]; rank: number }[] = [];
    for (const [fam, offers] of Object.entries(data.offersByFamily)) {
      const mine = offers.find((o) => o.key === sel);
      if (!mine) continue;
      const ranked = offers
        .filter((o) => blended(o) != null)
        .sort((a, b) => (blended(a) as number) - (blended(b) as number));
      const rank = ranked.findIndex((o) => o.key === sel);
      const mod = modelByFamily.get(fam);
      out.push({ fam, name: mod?.family_name ?? fam, org: mod?.org ?? "", score: mod?.scores.composite ?? null, mine, ranked, rank });
    }
    out.sort((a, b) =>
      sort === "price"
        ? (blended(a.mine) ?? Infinity) - (blended(b.mine) ?? Infinity)
        : (b.score ?? -1) - (a.score ?? -1)
    );
    return out;
  }, [sel, data.offersByFamily, modelByFamily, sort]);

  const toggle = (fam: string) => setOpen((s) => { const n = new Set(s); n.has(fam) ? n.delete(fam) : n.add(fam); return n; });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-400">Provider</label>
        <select value={sel} onChange={(e) => { setSel(e.target.value); setOpen(new Set()); }}
          className="rounded-md border border-line bg-[#0c0f14] px-2 py-1.5 text-sm outline-none focus:border-accent">
          {providers.map((p) => (
            <option key={p.key} value={p.key}>{p.provider}{p.platform !== p.provider ? ` (${p.platform})` : ""} — {p.model_count} models</option>
          ))}
        </select>
        <div className="flex gap-1 text-xs">
          <button onClick={() => setSort("price")} className={`rounded-md border px-2 py-1 ${sort === "price" ? "border-accent bg-accent/15 text-accent" : "border-line text-gray-400"}`}>Sort by price</button>
          <button onClick={() => setSort("score")} className={`rounded-md border px-2 py-1 ${sort === "score" ? "border-accent bg-accent/15 text-accent" : "border-line text-gray-400"}`}>Sort by score</button>
        </div>
      </div>

      {provider && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <span className="rounded bg-white/5 px-2 py-1">{rows.length} models offered</span>
          {provider.country && <span className="rounded bg-white/5 px-2 py-1">HQ: {provider.country}</span>}
          {provider.eu_hosted && <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-300">EU-hosted</span>}
          {provider.non_us && <span className="rounded bg-sky-500/20 px-2 py-1 text-sky-300">Non-US</span>}
          {provider.note && <span className="max-w-2xl text-[11px] text-gray-500">{provider.note}</span>}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="dtable w-full text-sm">
          <thead><tr>
            {["Model", "Composite", `${provider?.provider ?? "Provider"} in / out / blended ($/1M)`, "Price rank", ""].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs text-gray-400">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r) => {
              const isOpen = open.has(r.fam);
              const cheapest = r.ranked.length > 0 && r.rank === 0;
              return (
                <Fragment key={r.fam}>
                  <tr className="cursor-pointer hover:bg-white/5" onClick={() => toggle(r.fam)}>
                    <td className="px-3 py-2"><span className="font-medium">{r.name}</span> <span className="text-[11px] text-gray-500">{r.org}</span></td>
                    <td className="px-3 py-2 tabular text-gray-300">{r.score?.toFixed(1) ?? "—"}</td>
                    <td className="px-3 py-2 tabular">{fmt(r.mine.input_per_1m)} / {fmt(r.mine.output_per_1m)} / <b>{fmt(blended(r.mine))}</b>{r.mine.tee && <span className="ml-1 rounded bg-purple-500/20 px-1 text-[10px] text-purple-300">TEE</span>}</td>
                    <td className="px-3 py-2 text-xs">{r.rank >= 0 ? <span className={cheapest ? "text-emerald-300" : "text-gray-300"}>#{r.rank + 1} of {r.ranked.length}{cheapest ? " · cheapest" : ""}</span> : "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{isOpen ? "▾ hide" : `▸ compare ${r.ranked.length}`}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} className="bg-[#0c0f14] px-3 py-2">
                        <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">All providers for {r.name} (cheapest first, 10:1 blended)</div>
                        <table className="w-full text-xs">
                          <tbody>
                            {r.ranked.map((o, i) => (
                              <tr key={o.key} className={o.key === sel ? "bg-accent/10" : ""}>
                                <td className="px-2 py-1 text-gray-500">#{i + 1}</td>
                                <td className="px-2 py-1 font-medium">{o.provider}<span className="ml-1 text-[10px] text-gray-500">{o.platform !== o.provider ? o.platform : ""}</span></td>
                                <td className="px-2 py-1 text-gray-500">{o.region}</td>
                                <td className="px-2 py-1 tabular text-right">{fmt(o.input_per_1m)} in</td>
                                <td className="px-2 py-1 tabular text-right">{fmt(o.output_per_1m)} out</td>
                                <td className="px-2 py-1 tabular text-right font-semibold">{fmt(blended(o))} blended</td>
                                <td className="px-2 py-1">{o.tee && <span className="rounded bg-purple-500/20 px-1 text-[10px] text-purple-300">TEE</span>}{o.key === sel && <span className="ml-1 text-[10px] text-accent">← selected</span>}</td>
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
      <p className="mt-3 text-xs text-gray-500">Blended = (10·input + 1·output) / 11 per 1M tokens. Click a row to compare that model&apos;s price across every provider.</p>
    </div>
  );
}
