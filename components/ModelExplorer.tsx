"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ClientModel } from "../lib/client-model";
import { SCORE_LABELS, type ScoreKey } from "../lib/types";
import { usdPerM, num, orgColor } from "../lib/format";

type SortKey = "score" | "cost" | "name" | "org";

const SCORE_OPTIONS: ScoreKey[] = [
  "aa_coding_index",
  "aa_intelligence_index",
  "designarena_frontend",
  "designarena_fullstack",
];

export function ModelExplorer({ models }: { models: ClientModel[] }) {
  const [score, setScore] = useState<ScoreKey>("aa_coding_index");
  const [sort, setSort] = useState<SortKey>("score");
  const [asc, setAsc] = useState(false);
  const [q, setQ] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(true);
  const [openOnly, setOpenOnly] = useState(false);
  const [withScoreOnly, setWithScoreOnly] = useState(true);

  const orgs = useMemo(() => Array.from(new Set(models.map((m) => m.org))).sort(), [models]);
  const [org, setOrg] = useState<string>("");

  const rows = useMemo(() => {
    let r = models.slice();
    if (featuredOnly) r = r.filter((m) => m.featured);
    if (openOnly) r = r.filter((m) => m.open_weights);
    if (org) r = r.filter((m) => m.org === org);
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((m) => m.display_name.toLowerCase().includes(s) || m.family_key.includes(s) || m.org.toLowerCase().includes(s));
    }
    if (withScoreOnly) r = r.filter((m) => m.scores[score] != null);

    const dir = asc ? 1 : -1;
    r.sort((a, b) => {
      if (sort === "name") return dir * a.display_name.localeCompare(b.display_name);
      if (sort === "org") return dir * a.org.localeCompare(b.org);
      if (sort === "cost") {
        const av = a.cost10to1 ?? Infinity, bv = b.cost10to1 ?? Infinity;
        return dir * (av - bv);
      }
      const av = a.scores[score] ?? -Infinity, bv = b.scores[score] ?? -Infinity;
      return dir * (av - bv);
    });
    return r;
  }, [models, featuredOnly, openOnly, org, q, withScoreOnly, score, sort, asc]);

  function th(label: string, key: SortKey) {
    const active = sort === key;
    return (
      <th
        className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ${active ? "text-accent" : "text-gray-400"}`}
        onClick={() => { if (active) setAsc(!asc); else { setSort(key); setAsc(key === "name" || key === "org"); } }}
      >
        {label}{active ? (asc ? " ▲" : " ▼") : ""}
      </th>
    );
  }

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <label className="text-sm text-gray-400">Score</label>
        <select value={score} onChange={(e) => setScore(e.target.value as ScoreKey)}
          className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
          {SCORE_OPTIONS.map((s) => <option key={s} value={s}>{SCORE_LABELS[s]}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search model / org…"
          className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm" />
        <select value={org} onChange={(e) => setOrg(e.target.value)}
          className="rounded-md border border-line bg-ink px-3 py-1.5 text-sm">
          <option value="">All orgs</option>
          {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <Toggle label="Featured" on={featuredOnly} set={setFeaturedOnly} />
        <Toggle label="Open weights" on={openOnly} set={setOpenOnly} />
        <Toggle label="Has score" on={withScoreOnly} set={setWithScoreOnly} />
        <span className="ml-auto text-xs text-gray-500">{rows.length} models</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="grid w-full text-sm">
          <thead>
            <tr>
              {th("Model", "name")}
              {th("Org", "org")}
              {th(SCORE_LABELS[score].split("—")[1]?.trim() || "Score", "score")}
              {th("Cheapest 10:1 $/1M", "cost")}
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Top providers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2">
                  <Link href={`/models/${encodeURIComponent(m.id)}`} className="font-medium hover:text-accent">
                    {m.display_name}
                  </Link>
                  {m.open_weights && <span className="ml-2 rounded bg-accent2/15 px-1.5 py-0.5 text-[10px] text-accent2">open</span>}
                  {m.featured && <span className="ml-1 rounded bg-warn/15 px-1.5 py-0.5 text-[10px] text-warn">★</span>}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: orgColor(m.org) }} />
                    {m.org}
                  </span>
                </td>
                <td className="px-3 py-2 tabular font-semibold">
                  {m.scores[score] != null ? num(m.scores[score], score.startsWith("designarena") ? 0 : 1) : "—"}
                </td>
                <td className="px-3 py-2 tabular">
                  {m.cost10to1 != null ? usdPerM(m.cost10to1) : "—"}
                  {m.cheapest_platform && <span className="ml-1 text-[11px] text-gray-500">{m.cheapest_platform}</span>}
                </td>
                <td className="px-3 py-2 text-xs text-gray-400">
                  {m.cheapest.slice(0, 3).map((o, i) => (
                    <span key={i} className="mr-2 whitespace-nowrap">
                      {o.provider} <span className="text-gray-500">{usdPerM(o.blended)}</span>
                    </span>
                  ))}
                  {m.offer_count === 0 && <span className="text-gray-600">no token pricing</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (b: boolean) => void }) {
  return (
    <button onClick={() => set(!on)}
      className={`rounded-md border px-3 py-1.5 text-sm ${on ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-400"}`}>
      {on ? "✓ " : ""}{label}
    </button>
  );
}
