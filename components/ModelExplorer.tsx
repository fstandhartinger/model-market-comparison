"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ClientData } from "../lib/client-model";
import { SCORE_LABELS } from "../lib/types";
import { usdPerM, num, orgColor } from "../lib/format";
import { modelCost, rankedOffers, effectiveAllowed, isHiddenModel } from "../lib/cost";
import { Toggle, DataBar, NumFilter } from "./ui";
import { useSettings } from "./SettingsContext";
import { preferredVariantIds, isCollapsibleFamily } from "../lib/variants";

type SortKey = "name" | "org" | "score" | "cost" | "providers";

export function ModelExplorer({ data }: { data: ClientData }) {
  const s = useSettings();
  const score = s.score;
  const allowed = useMemo(() => effectiveAllowed(s.providerSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.euDedicated), [s.providerSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.euDedicated]);
  const [sort, setSort] = useState<SortKey>("score");
  const [asc, setAsc] = useState(false);
  const [q, setQ] = useState("");
  const [openFilter, setOpenFilter] = useState<"all" | "open" | "closed">("all");
  const [withScoreOnly, setWithScoreOnly] = useState(true);
  const [hasProviderOnly, setHasProviderOnly] = useState(true);
  const [org, setOrg] = useState("");
  const [maxCost, setMaxCost] = useState("");

  const orgs = useMemo(() => Array.from(new Set(data.models.map((m) => m.org))).sort(), [data.models]);
  const preferredId = useMemo(() => preferredVariantIds(data.models), [data.models]);

  const rows = useMemo(() => {
    const maxC = parseFloat(maxCost);
    let r = data.models.map((m) => ({
      m, sc: m.scores[score], cost: modelCost(m, data, allowed),
      cheap: rankedOffers(data.offersByFamily[m.family_key], allowed).slice(0, 3),
      ncheap: rankedOffers(data.offersByFamily[m.family_key], allowed).length,
    }));
    if (s.collapse) r = r.filter((x) => !isCollapsibleFamily(x.m.family_key) || preferredId.get(x.m.family_key) === x.m.id);
    r = r.filter((x) => !isHiddenModel(x.m.family_key, s.hideGptOpus, s.hideFable));
    if (s.featured) r = r.filter((x) => x.m.featured);
    if (s.familySet) r = r.filter((x) => s.familySet!.has(x.m.family_key));
    if (openFilter !== "all") r = r.filter((x) => x.m.open_weights === (openFilter === "open"));
    if (org) r = r.filter((x) => x.m.org === org);
    if (q.trim()) { const t = q.toLowerCase(); r = r.filter((x) => x.m.display_name.toLowerCase().includes(t) || x.m.family_key.includes(t) || x.m.org.toLowerCase().includes(t)); }
    if (withScoreOnly) r = r.filter((x) => x.sc != null);
    if (s.minScore > 0) r = r.filter((x) => x.sc == null || x.sc >= s.minScore);
    if (Number.isFinite(maxC)) r = r.filter((x) => x.cost != null && x.cost <= maxC);
    // "Has provider": keep only models offered by ≥1 provider within the active filters.
    if (hasProviderOnly) r = r.filter((x) => x.ncheap > 0);
    // "TEE only": keep models with at least one TEE / confidential-compute offer.
    if (s.teeOnly) r = r.filter((x) => (data.offersByFamily[x.m.family_key] || []).some((o) => o.tee));

    const dir = asc ? 1 : -1;
    r.sort((a, b) => {
      if (sort === "name") return dir * a.m.display_name.localeCompare(b.m.display_name);
      if (sort === "org") return dir * a.m.org.localeCompare(b.m.org);
      if (sort === "providers") return dir * (a.ncheap - b.ncheap);
      if (sort === "cost") return dir * ((a.cost ?? Infinity) - (b.cost ?? Infinity));
      return dir * ((a.sc ?? -Infinity) - (b.sc ?? -Infinity));
    });
    return r;
  }, [data, score, allowed, s.collapse, s.featured, s.familySet, s.minScore, s.hideGptOpus, s.hideFable, s.teeOnly, openFilter, org, q, withScoreOnly, hasProviderOnly, maxCost, sort, asc, preferredId]);

  const maxScoreVal = useMemo(() => Math.max(1, ...rows.map((x) => x.sc ?? 0)), [rows]);
  const maxCostVal = useMemo(() => Math.max(1, ...rows.map((x) => x.cost ?? 0)), [rows]);

  const onSort = (k: SortKey) => { if (sort === k) setAsc(!asc); else { setSort(k); setAsc(k === "name" || k === "org"); } };
  const Th = ({ label, k, right }: { label: string; k: SortKey; right?: boolean }) => (
    <th onClick={() => onSort(k)} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${right ? "text-right" : "text-left"} ${sort === k ? "text-accent" : "text-gray-400"}`}>
      {label}{sort === k ? (asc ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search model / org…" className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm" />
        <select value={org} onChange={(e) => setOrg(e.target.value)} className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
          <option value="">All orgs</option>
          {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <NumFilter label="Max $/1M" value={maxCost} onChange={setMaxCost} placeholder="e.g. 5" />
        <select value={openFilter} onChange={(e) => setOpenFilter(e.target.value as "all" | "open" | "closed")} className="rounded-md border border-line bg-ink px-2 py-1.5 text-sm">
          <option value="all">All weights</option><option value="open">Open weights</option><option value="closed">Closed</option>
        </select>
        <Toggle label="Has score" on={withScoreOnly} set={setWithScoreOnly} />
        <Toggle label="Has provider" on={hasProviderOnly} set={setHasProviderOnly} />
        <span className="ml-auto text-xs text-gray-500">{rows.length} models{allowed ? " · provider-filtered cost" : ""}</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="dtable w-full table-fixed text-sm">
          <colgroup>
            <col style={{ width: "30%" }} /><col style={{ width: "13%" }} /><col style={{ width: "12%" }} />
            <col style={{ width: "17%" }} /><col style={{ width: "8%" }} /><col style={{ width: "20%" }} />
          </colgroup>
          <thead><tr>
            <Th label="Model" k="name" />
            <Th label="Org" k="org" />
            <Th label={SCORE_LABELS[score].split("—")[1]?.trim().replace(/\s*\(.*\)/, "") || "Score"} k="score" right />
            <Th label="Cheapest 10:1 $/1M" k="cost" right />
            <Th label="# Prov" k="providers" right />
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Top providers</th>
          </tr></thead>
          <tbody>
            {rows.map(({ m, sc, cost, cheap, ncheap }) => (
              <tr key={m.id}>
                <td className="px-3 py-2 truncate">
                  <Link href={`/models/${encodeURIComponent(m.id)}`} className="font-medium hover:text-accent">{m.display_name}</Link>
                  {m.open_weights && <span className="ml-2 rounded bg-accent2/15 px-1.5 py-0.5 text-[10px] text-accent2">open</span>}
                  {m.featured && <span className="ml-1 text-[10px] text-warn">★</span>}
                </td>
                <td className="px-3 py-2 truncate"><span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: orgColor(m.org) }} />{m.org}</span></td>
                <td className="px-3 py-2">{sc != null ? <DataBar frac={sc / maxScoreVal} color={orgColor(m.org)} align="right"><span className="block text-right font-semibold">{num(sc, score.startsWith("designarena") ? 0 : 1)}</span></DataBar> : <span className="block text-right text-gray-600">—</span>}</td>
                <td className="px-3 py-2">{cost != null ? <DataBar frac={cost / maxCostVal} color="#7ee0c0" align="right"><span className="block text-right">{usdPerM(cost)}</span></DataBar> : <span className="block text-right text-gray-600">—</span>}</td>
                <td className="px-3 py-2 text-right tabular text-gray-400">{ncheap || "—"}</td>
                <td className="px-3 py-2 truncate text-xs text-gray-400">
                  {cheap.map((o, i) => <span key={i} className="mr-2 whitespace-nowrap">{o.provider} <span className="text-gray-500">{usdPerM(o.blended)}</span></span>)}
                  {ncheap === 0 && <span className="text-gray-600">no token pricing</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
