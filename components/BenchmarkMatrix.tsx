"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSettings } from "./SettingsContext";
import { SCORE_SHORT_LABELS } from "../lib/types";
import type { ClientModel } from "../lib/client-model";
import { rowBars, rowWinners, formatValue, type BenchmarkMatrix as Matrix, type MatrixRow } from "../lib/benchmark-matrix.mjs";
import { topModelIds, type MatrixFilterData } from "../lib/top-models";
import { collapsedName, preferredVariantIds } from "../lib/variants";

type Preset = "all" | "important" | "complete";
const PRESETS: [Preset, string][] = [["all", "All"], ["important", "Important"], ["complete", "Full coverage"]];
const IMPORTANT_TAGS = new Set(["headline", "aa", "arena"]);
const MIN_MODELS = 2, MAX_MODELS = 10;

function Tag({ id, tags }: { id: string; tags: Matrix["tags"] }) {
  const t = tags[id];
  if (!t) return null;
  return <span className="bh-matrix-tag" data-tag={id} title={t.tip}>{t.label}<span className="sr-only">: {t.tip}</span></span>;
}

function cellHref(row: MatrixRow, modelId: string) {
  return row.ranking ? `/benchmarks?benchmark=${encodeURIComponent(row.ranking)}` : `/models/${encodeURIComponent(modelId)}#benchmark-sheet`;
}

/** CR-1: release-style comparison — models as columns, benchmarks as rows, grouped by category. */
export function BenchmarkMatrix({ matrix, filterData }: { matrix: Matrix; filterData: MatrixFilterData }) {
  const s = useSettings();
  const [count, setCount] = useState(5);
  // null = automatic top-N from the filters (CR-1.2); a list = the user's own columns.
  const [pinned, setPinned] = useState<string[] | null>(null);
  const [preset, setPreset] = useState<Preset>("all");
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const modelsById = useMemo(() => new Map(filterData.models.map((m) => [m.id, m])), [filterData]);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const ids = (p.get("models") ?? "").split(",").filter((id) => modelsById.has(id));
    if (ids.length) setPinned(ids.slice(0, MAX_MODELS));
  }, [modelsById]);

  const { score, hideDeprecated, collapse, openOnly, featured, familySet, excludedSet, excludeChinese, euHostedOnly, nonUsOnly, teeOnly, allowDataTraining } = s;
  const auto = useMemo(() => topModelIds(filterData, { score, hideDeprecated, collapse, openOnly, featured, familySet, excludedSet, excludeChinese, euHostedOnly, nonUsOnly, teeOnly, allowDataTraining }, count),
    [filterData, score, hideDeprecated, collapse, openOnly, featured, familySet, excludedSet, excludeChinese, euHostedOnly, nonUsOnly, teeOnly, allowDataTraining, count]);
  const ids = pinned ?? auto;
  // Release tables name the model, not its effort setting: strip the variant parenthetical, and
  // keep it only when two compared columns would otherwise read the same.
  const preferred = useMemo(() => preferredVariantIds(filterData.models as unknown as ClientModel[], score), [filterData, score]);
  const names = useMemo(() => {
    const short = ids.map((id) => { const m = modelsById.get(id); return m ? collapsedName(m, true, preferred) : id; });
    return ids.map((id, j) => short.filter((x) => x === short[j]).length > 1 ? (modelsById.get(id)?.display_name ?? id) : short[j]);
  }, [ids, modelsById, preferred]);

  const writeUrl = (next: string[] | null) => {
    const u = new URL(location.href);
    if (next) u.searchParams.set("models", next.join(",")); else u.searchParams.delete("models");
    history.replaceState(history.state, "", u);
  };
  const pin = (next: string[]) => { setPinned(next); writeUrl(next); };
  const reset = () => { setPinned(null); writeUrl(null); };
  const remove = (id: string) => pin(ids.filter((x) => x !== id));
  const add = (id: string) => { if (!ids.includes(id) && ids.length < MAX_MODELS) pin([...ids, id]); setQ(""); };

  const lookups = useMemo(() => ids.map((id) => new Map((matrix.values[id] ?? []).map(([i, v, b]) => [i, [v, b] as const]))), [ids, matrix]);
  const visible = useMemo(() => matrix.rows.map((row, i) => ({ row, vals: lookups.map((m) => m.get(i)?.[0] ?? null), basis: lookups.map((m) => m.get(i)?.[1] ?? null) }))
    .filter(({ row, vals }) => {
      const n = vals.filter((v) => v != null).length;
      if (n === 0) return false;
      if (preset === "important") return row.group === "indices" || row.tags.some((t) => IMPORTANT_TAGS.has(t));
      if (preset === "complete") return n === ids.length;
      return true;
    }), [matrix, lookups, preset, ids.length]);
  const groups = matrix.groups.map((g) => ({ ...g, rows: visible.filter((v) => v.row.group === g.id) })).filter((g) => g.rows.length);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return filterData.models.filter((m) => !ids.includes(m.id) && `${m.display_name} ${m.org}`.toLowerCase().includes(t))
      .sort((a, b) => b.benchmark_count - a.benchmark_count || a.display_name.localeCompare(b.display_name)).slice(0, 8);
  }, [q, filterData, ids]);
  const toggle = (id: string) => setClosed((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return <section aria-label="Benchmark comparison" className="space-y-4">
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <p className="text-sm" role="status">
        <span className="font-semibold tabular">{visible.length}</span> benchmarks across <span className="font-semibold tabular">{groups.length}</span> categories
        <span className="bh-muted"> · {pinned ? "your selection" : `top ${ids.length} by ${SCORE_SHORT_LABELS[score]} under your filters`}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {pinned
          ? <button type="button" className="bh-button" onClick={reset}>Reset to top {count}</button>
          : <label className="flex items-center gap-2 text-sm">Models<select className="bh-input !py-2" value={count} onChange={(e) => setCount(Number(e.target.value))}>{Array.from({ length: MAX_MODELS - MIN_MODELS + 1 }, (_, i) => i + MIN_MODELS).map((n) => <option key={n} value={n}>{n}</option>)}</select></label>}
        <div role="group" aria-label="Benchmark rows" className="flex gap-1 rounded-lg border border-line p-0.5">
          {PRESETS.map(([p, label]) => <button key={p} type="button" aria-pressed={preset === p} onClick={() => setPreset(p)}
            className={`h-9 min-h-0 rounded-md px-3 text-sm ${preset === p ? "bg-accent text-ink" : "text-gray-300"}`}>{label}</button>)}
        </div>
      </div>
    </div>

    {ids.length < MAX_MODELS && <div className="relative w-full max-w-xs">
      <input id="bh-matrix-add" type="search" role="combobox" aria-label="Add a model to the comparison" aria-expanded={matches.length > 0} aria-controls="bh-matrix-add-list" autoComplete="off"
        className="bh-input block w-full !py-2" placeholder="+ Add a model" value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { e.preventDefault(); add(matches[0].id); } if (e.key === "Escape") setQ(""); }} />
      {matches.length > 0 && <ul id="bh-matrix-add-list" role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 grid gap-0.5 rounded-xl border border-line bg-panel p-1 shadow-lg">
        {matches.map((m) => <li key={m.id} role="option" aria-selected={false}><button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm hover:bg-accent/10" onClick={() => add(m.id)}>
          <span className="font-medium">{m.display_name}</span><span className="bh-muted text-xs">{m.org} · {m.benchmark_count} benchmarks</span></button></li>)}
      </ul>}
    </div>}

    {ids.length === 0
      ? <div className="bh-empty min-h-56"><h3 className="font-semibold">No model passes your filters</h3><p className="mt-2">Widen the filters, or add a model above.</p></div>
      : <div className="bh-matrix-wrap" role="region" aria-label="Benchmark results by model" tabIndex={0}>
        <table className="bh-matrix">
          <caption className="sr-only">Benchmark results for the compared models, grouped by category. Bold marks the best result in each row; the bar behind a value shows it relative to the other values in its row.</caption>
          <thead><tr>
            <th scope="col" className="bh-matrix-stub">Benchmark</th>
            {ids.map((id, j) => { const m = modelsById.get(id); return <th key={id} scope="col" className={`bh-matrix-model ${j === 0 ? "bh-matrix-lead" : ""}`}>
              <span className="bh-matrix-org">{m?.org}</span>
              <span className="bh-matrix-name"><Link href={`/models/${encodeURIComponent(id)}`} title={m?.display_name} className="hover:underline">{names[j]}</Link></span>
              {ids.length > 1 && <button type="button" className="bh-matrix-remove" aria-label={`Remove ${names[j]} from the comparison`} onClick={() => remove(id)}>×</button>}
            </th>; })}
          </tr></thead>
          {groups.map((g) => { const open = !closed.has(g.id); return <tbody key={g.id}>
            <tr className="bh-matrix-group"><th scope="colgroup" colSpan={ids.length + 1}>
              <button type="button" aria-expanded={open} onClick={() => toggle(g.id)}>
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className={open ? "rotate-90" : ""}><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{g.label}</span><span className="bh-muted tabular text-xs font-normal">{g.rows.length}</span>
              </button>
            </th></tr>
            {open && g.rows.map(({ row, vals, basis }) => {
              const bars = rowBars(vals, row.higherBetter, row.unit), win = rowWinners(vals, row.higherBetter);
              return <tr key={row.id}>
                <th scope="row" className="bh-matrix-stub">
                  <span className="bh-matrix-bench">{row.name}{row.tags.map((t) => <Tag key={t} id={t} tags={matrix.tags} />)}</span>
                  {row.cohort && <span className="bh-matrix-sub">{row.cohort}</span>}
                  <span className="bh-matrix-desc" title={row.description}>{row.higherBetter === false ? "Lower is better. " : ""}{row.description}</span>
                </th>
                {vals.map((v, j) => <td key={ids[j]} className={`bh-matrix-cell ${j === 0 ? "bh-matrix-lead" : ""}`}>
                  {v == null
                    ? <span className="bh-matrix-missing"><span aria-hidden="true">—</span><span className="sr-only">No result</span></span>
                    : <Link href={cellHref(row, ids[j])} className="bh-matrix-link">
                      {bars[j] != null && <span aria-hidden="true" className={`bh-matrix-bar ${win[j] ? "is-best" : ""}`} style={{ width: `${Math.max(3, bars[j]! * 100)}%` }} />}
                      <span className={`relative tabular ${win[j] ? "font-bold" : ""}`}>{formatValue(v, row.unit)}{basis[j] === 1 && <sup className="bh-muted" title="Self-reported by the developer">†</sup>}</span>
                      {win[j] && <span className="sr-only"> (best in row)</span>}
                    </Link>}
                </td>)}
              </tr>;
            })}
          </tbody>; })}
        </table>
      </div>}
    <p className="bh-muted text-xs">Each value is the latest published result for that exact configuration, measured results preferred; † marks a developer's own report. A dash means no published result — never a zero. Bold is best in row; bars compare within a row only. Open a value for its source.</p>
  </section>;
}
