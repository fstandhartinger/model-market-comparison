"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "./SettingsContext";
import { SCORE_SHORT_LABELS } from "../lib/types";
import { hasScoreEvidence, type ClientModel } from "../lib/client-model";
import { rowBars, rowWinners, formatValue, cellHref, chartRows, categoryComposite, versionLine, countBoards, variantLabel, caveatTip, type BenchmarkMatrix as Matrix, type MatrixRow } from "../lib/benchmark-matrix.mjs";
import { versionSuffix } from "../lib/version-label";
import { counted } from "../lib/format";
import { ScoreRowPair, CategoryHeader } from "./ScoreRows";
import { MODEL_PRESETS, ROW_PRESETS, decodeFilters, encodeFilters, modelsForPreset, pickFilters, rowFilter } from "../lib/presets.mjs";
import { SETTINGS_DEFAULTS } from "../lib/settings-state";
import { filteredCandidates, type MatrixFilterData } from "../lib/top-models";
import { collapsedName, preferredVariantIds } from "../lib/variants";
import { BenchmarkBars, seriesColor, seriesLetter } from "./BenchmarkBars";
import { PresetMenu } from "./PresetMenu";
import { PickFromChart } from "./PickFromChart";
import { toggleColumn } from "../lib/pick-chart.mjs";
import { AaCredit } from "./AaCredit";
import { BEST_OF_NOTE } from "./BestOf";
import { TableLegend } from "./TableLegend";

const MIN_MODELS = 2, MAX_MODELS = 10;
const ROW_IDS = new Set(ROW_PRESETS.map((p) => p.id));
const MODEL_IDS = new Set(MODEL_PRESETS.map((p) => p.id));

function Tag({ id, tags, row }: { id: string; tags: Matrix["tags"]; row: MatrixRow }) {
  const t = tags[id];
  if (!t) return null;
  const tip = caveatTip(id, row, tags);
  return <span className="bh-matrix-tag" data-tag={id} title={tip}>{t.label}<span className="sr-only">: {tip}</span></span>;
}

/** CR-63.21: on phone a row with three or four chips grew several lines tall. Two chips show, the
    rest sit behind a "+N" toggle that names and reveals them; on desktop every chip stays inline. */
const MATRIX_TAG_CAP = 2;
function RowTags({ tags, row }: { tags: Matrix["tags"]; row: MatrixRow }) {
  const [open, setOpen] = useState(false);
  const ids = row.tags;
  if (ids.length <= MATRIX_TAG_CAP) return <>{ids.map((t) => <Tag key={t} id={t} tags={tags} row={row} />)}</>;
  const extra = ids.slice(MATRIX_TAG_CAP);
  const extraNames = extra.map((t) => tags[t]?.label ?? t).join(", ");
  return <>
    {ids.slice(0, MATRIX_TAG_CAP).map((t) => <Tag key={t} id={t} tags={tags} row={row} />)}
    {/* F-155 (pass 29): the revealed chips come before the toggle, so an opened row reads chips → "less", not "less" → chips. */}
    <span className="bh-matrix-tagcap-extra" data-open={open || undefined}>{extra.map((t) => <Tag key={t} id={t} tags={tags} row={row} />)}</span>
    <button type="button" className="bh-matrix-tagcap" aria-expanded={open}
      title={open ? "Show fewer tags" : `Show ${extra.length} more tag${extra.length === 1 ? "" : "s"}: ${extraNames}`}
      onClick={() => setOpen((v) => !v)}>{open ? "less" : `+${extra.length}`}</button>
  </>;
}

/** CR-3.1: the custom row checklist — one toggle per category, and the benchmarks inside it. */
function RowPicker({ rows, groups, selected, selectedBoards, onChange, open, onToggle }: { rows: MatrixRow[]; groups: Matrix["groups"]; selected: Set<string>; selectedBoards: number; onChange: (keys: string[]) => void; open: boolean; onToggle: (e: React.SyntheticEvent<HTMLDetailsElement>) => void }) {
  const set = (keys: string[], on: boolean) => { const n = new Set(selected); keys.forEach((k) => on ? n.add(k) : n.delete(k)); onChange([...n]); };
  return <details className="bh-rowpicker bh-disclosure" open={open} onToggle={onToggle}>
    {/* F-102: the chooser counts benchmarks the same way the status line does — boards, not rows and
        not list entries. Its list still ticks a benchmark family, which is what a reader picks. */}
    <summary>Choose rows <span className="bh-muted font-normal tabular">({selectedBoards} of {countBoards(rows)})</span></summary>
    <div className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => {
        const keys = [...new Set(rows.filter((r) => r.group === g.id).map((r) => r.key))];
        if (!keys.length) return null;
        const on = keys.filter((k) => selected.has(k)).length;
        return <fieldset key={g.id} className="min-w-0">
          <legend className="w-full">
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={on === keys.length} ref={(el) => { if (el) el.indeterminate = on > 0 && on < keys.length; }} onChange={(e) => set(keys, e.target.checked)} />
              {g.label} <span className="bh-muted text-xs font-normal tabular">{on}/{keys.length}</span>
            </label>
          </legend>
          <details><summary className="bh-muted cursor-pointer pl-6 text-xs">Benchmarks</summary>
            <ul className="grid gap-0.5 pl-6">{keys.map((k) => { const r = rows.find((x) => x.key === k)!; return <li key={k}>
              <label className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={selected.has(k)} onChange={(e) => set([k], e.target.checked)} /><span className="truncate">{r.name}</span></label>
            </li>; })}</ul>
          </details>
        </fieldset>;
      })}
    </div>
  </details>;
}

/** CR-1: release-style comparison — models as columns, benchmarks as rows, grouped by category. */
export function BenchmarkMatrix({ matrix, filterData, initial }: { matrix: Matrix; filterData: MatrixFilterData; initial?: { models: string | null; set: string | null; rows: string | null } }) {
  const s = useSettings();
  const [count, setCount] = useState(5);
  // null = a model preset computed from the filters (CR-1.2, CR-2.4); a list = the user's own columns.
  // CR-1.11: seeded from the URL the server saw, so the first render already has these columns.
  const [pinned, setPinned] = useState<string[] | null>(() => {
    const ids = (initial?.models ?? "").split(",").filter((id) => filterData.models.some((m) => m.id === id));
    return ids.length ? ids.slice(0, MAX_MODELS) : null;
  });
  const [modelPreset, setModelPreset] = useState(() => initial?.set && MODEL_IDS.has(initial.set) ? initial.set : "top");
  const [savedModels, setSavedModels] = useState<string | null>(null);
  // A built-in row preset id, or a list of benchmark keys (custom / saved).
  const [rowSel, setRowSel] = useState<string | string[]>(() => !initial?.rows ? "all" : ROW_IDS.has(initial.rows) ? initial.rows : initial.rows.split(",").filter(Boolean));
  const [savedRows, setSavedRows] = useState<string | null>(null);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [panel, setPanel] = useState<"pick" | "rows" | null>(null);
  const modelsById = useMemo(() => new Map(filterData.models.map((m) => [m.id, m])), [filterData]);

  // CR-2.5: ?models=, ?set= (model preset), ?rows= (row preset id or benchmark keys).
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const ids = (p.get("models") ?? "").split(",").filter((id) => modelsById.has(id));
    if (ids.length) setPinned(ids.slice(0, MAX_MODELS));
    const set = p.get("set");
    if (set && MODEL_IDS.has(set)) setModelPreset(set);
    const rows = p.get("rows");
    if (rows) setRowSel(ROW_IDS.has(rows) ? rows : rows.split(",").filter(Boolean));
  }, [modelsById]);
  const writeUrl = (patch: Record<string, string | null>) => {
    const u = new URL(location.href);
    for (const [k, v] of Object.entries(patch)) if (v) u.searchParams.set(k, v); else u.searchParams.delete(k);
    history.replaceState(history.state, "", u);
  };

  const { score, hideDeprecated, collapse, openOnly, featured, familySet, excludedSet, hostedIn, providerBasedIn, labAllowed, allowDataTraining } = s;
  // CR-2.5: ?f= carries the filters that differ from the defaults. Applied once, after stored settings
  // have loaded (a child effect runs before the provider's hydration and would be overwritten).
  const fromUrl = useRef(false);
  const { hydrated, applyFilters } = s;
  useEffect(() => {
    if (!hydrated || fromUrl.current) return;
    fromUrl.current = true;
    const f = new URLSearchParams(location.search).get("f");
    if (f != null) applyFilters({ ...pickFilters(SETTINGS_DEFAULTS), ...decodeFilters(f) });
  }, [hydrated, applyFilters]);
  const filterCode = encodeFilters(s, SETTINGS_DEFAULTS);
  useEffect(() => {
    if (!hydrated || !fromUrl.current) return;
    const u = new URL(location.href);
    if (filterCode) u.searchParams.set("f", filterCode); else u.searchParams.delete("f");
    if (u.href !== location.href) history.replaceState(history.state, "", u);
  }, [filterCode, hydrated]);
  const candidates = useMemo(() => filteredCandidates(filterData, { score, hideDeprecated, collapse, openOnly, featured, familySet, excludedSet, hostedIn, providerBasedIn, labAllowed, allowDataTraining }),
    [filterData, score, hideDeprecated, collapse, openOnly, featured, familySet, excludedSet, hostedIn, providerBasedIn, labAllowed, allowDataTraining]);
  const auto = useMemo(() => modelsForPreset(modelPreset, candidates, score, count), [modelPreset, candidates, score, count]);
  const ids = pinned ?? auto;
  // Release tables name the model, not its effort setting: strip the variant parenthetical, and
  // keep it only when two compared columns would otherwise read the same.
  const preferred = useMemo(() => preferredVariantIds(filterData.models as unknown as ClientModel[], score), [filterData, score]);
  const names = useMemo(() => {
    const short = ids.map((id) => { const m = modelsById.get(id); return m ? collapsedName(m, true, preferred) : id; });
    return ids.map((id, j) => short.filter((x) => x === short[j]).length > 1 ? (modelsById.get(id)?.display_name ?? id) : short[j]);
  }, [ids, modelsById, preferred]);

  const pin = (next: string[]) => { setPinned(next); setSavedModels(null); writeUrl({ models: next.join(","), set: null }); };
  const useModelPreset = (id: string) => { setPinned(null); setModelPreset(id); setSavedModels(null); writeUrl({ models: null, set: id === "top" ? null : id }); };
  const reset = () => useModelPreset("top");
  const remove = (id: string) => pin(ids.filter((x) => x !== id));
  const add = (id: string) => { if (!ids.includes(id) && ids.length < MAX_MODELS) pin([...ids, id]); setQ(""); };
  const chooseRows = (sel: string | string[], savedId: string | null = null) => { setRowSel(sel); setSavedRows(savedId); writeUrl({ rows: sel === "all" ? null : Array.isArray(sel) ? sel.join(",") : sel }); };

  const lookups = useMemo(() => ids.map((id) => new Map((matrix.values[id] ?? []).map(([i, v, b]) => [i, [v, b] as const]))), [ids, matrix]);
  const match = useMemo(() => rowFilter(rowSel), [rowSel]);
  const withValues = useMemo(() => matrix.rows.map((row, i) => ({ row, vals: lookups.map((m) => m.get(i)?.[0] ?? null), basis: lookups.map((m) => m.get(i)?.[1] ?? null) }))
    .filter(({ vals }) => vals.some((v) => v != null)), [matrix, lookups]);
  const visible = useMemo(() => withValues.filter(({ row, vals }) => match(row, vals.filter((v) => v != null).length, ids.length)), [withValues, match, ids.length]);
  const chart = useMemo(() => chartRows(matrix.rows, lookups.map((m) => new Map([...m].map(([i, [v]]) => [i, v])))), [matrix, lookups]);
  // F-81: inside a category, rows the compared models can actually be compared on (two or more values) come
  // first; rows with a single result keep their place after them. Stable, so the build order holds otherwise.
  const groups = matrix.groups.map((g) => ({ ...g, rows: visible.filter((v) => v.row.group === g.id)
    .map((v, i) => ({ v, i, comparable: v.vals.filter((x) => x != null).length >= 2 ? 0 : 1 }))
    .sort((a, b) => a.comparable - b.comparable || a.i - b.i).map(({ v }) => v) })).filter((g) => g.rows.length);
  const selectedKeys = useMemo(() => new Set(visible.map((v) => v.row.key)), [visible]);
  // F-102: one counting rule — a benchmark is a board (one family at one version); a harness cohort and a
  // cost twin are rows of that board. The status line, the row chooser and the hero all count boards.
  const shownBoards = useMemo(() => countBoards(visible.map((v) => v.row)), [visible]);
  // CR-139.4: chart values use the same exact-evidence rule as score filters and shortlist rows.
  const valuesFor = (key: typeof score) => ids.map((id) => { const m = modelsById.get(id); const v = m?.scores[key]; return v != null && hasScoreEvidence(m!, key) ? v : null; });
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return filterData.models.filter((m) => !ids.includes(m.id) && `${m.display_name} ${m.org}`.toLowerCase().includes(t))
      .sort((a, b) => b.benchmark_count - a.benchmark_count || a.display_name.localeCompare(b.display_name)).slice(0, 8);
  }, [q, filterData, ids]);
  const toggle = (id: string) => setClosed((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const presetName = MODEL_PRESETS.find((p) => p.id === modelPreset)?.name ?? "";
  const modelsActive = pinned ? savedModels : modelPreset;
  const rowsActive = Array.isArray(rowSel) ? savedRows : rowSel;

  // F-83: the count select sits inside the status sentence, so the table starts within the first screen.
  const countSelect = <select className="bh-inline-select tabular" aria-label="Number of models" value={count} onChange={(e) => setCount(Number(e.target.value))}>
    {Array.from({ length: MAX_MODELS - MIN_MODELS + 1 }, (_, i) => i + MIN_MODELS).map((n) => <option key={n} value={n}>{n}</option>)}</select>;
  // F-83: only one of the two panels is open at a time.
  const panelToggle = (id: "pick" | "rows") => (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = e.currentTarget.open;
    setPanel((p) => isOpen ? id : p === id ? null : p);
  };

  return <section aria-label="Benchmark comparison" className="space-y-3">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="text-sm" role="status">
        {/* F-102: a benchmark is a board (family + version); harness cohorts and cost twins are rows of a
            board, so the same collection is counted the same way here, in Simple's section 2 and in the hero. */}
        <span className="font-semibold tabular">{shownBoards}</span> benchmarks across <span className="font-semibold tabular">{groups.length}</span> categories
        {/* F-85: no second total here — a benchmark split into harness cohorts shows the cohort on its own rows. */}
        <span className="bh-muted"> · {pinned ? "your selection" : modelPreset === "top" ? <>top {countSelect} by {SCORE_SHORT_LABELS[score]} under your filters</> : <>{presetName} · {countSelect} under your filters</>}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {pinned && <button type="button" className="bh-button !min-h-9 !py-1.5 text-sm" onClick={reset}>Reset to top {count}</button>}
        <PresetMenu kind="models" label="Models" ours={MODEL_PRESETS.map((p) => p.id === "top" ? { ...p, name: `Frontier top ${count}` } : p)} activeId={modelsActive}
          onOurs={useModelPreset} onYours={(p) => { const keep = (p.value as string[]).filter((id) => modelsById.has(id)).slice(0, MAX_MODELS); if (keep.length) { pin(keep); setSavedModels(p.id); } }} current={ids} />
        <PresetMenu kind="rows" label="Rows" ours={ROW_PRESETS} activeId={rowsActive} align="right"
          onOurs={(id) => chooseRows(id)} onYours={(p) => chooseRows(p.value as string[], p.id)} current={[...selectedKeys]} />
      </div>
    </div>

    {/* F-83: the three ways to change columns and rows, one wrapping line; an open panel takes the full width. */}
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {ids.length < MAX_MODELS && <div className="relative w-full max-w-[13rem]">
        <input id="bh-matrix-add" type="search" role="combobox" aria-label="Add a model to the comparison" aria-expanded={matches.length > 0} aria-controls="bh-matrix-add-list" autoComplete="off"
          className="bh-input block w-full !py-2" placeholder="+ Add a model" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { e.preventDefault(); add(matches[0].id); } if (e.key === "Escape") setQ(""); }} />
        {matches.length > 0 && <ul id="bh-matrix-add-list" role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 grid gap-0.5 rounded-xl border border-line bg-panel p-1 shadow-lg">
          {matches.map((m) => <li key={m.id} role="option" aria-selected={false}><button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm hover:bg-accent/10" onClick={() => add(m.id)}>
            <span className="font-medium">{m.display_name}</span><span className="bh-muted text-xs">{m.org} · {counted(m.benchmark_count, "benchmark")}</span></button></li>)}
        </ul>}
      </div>}
      <details className="bh-pickpanel bh-disclosure" open={panel === "pick"} onToggle={panelToggle("pick")}>
        <summary>Pick from chart</summary>
        <p className="bh-muted text-sm">Score against cost, narrowed by two sliders.</p>
        <div className="mt-3">
          <PickFromChart candidates={candidates} score={score} scoreLabel={SCORE_SHORT_LABELS[score]} ids={ids} max={MAX_MODELS}
            nameOf={(id) => { const m = modelsById.get(id); return m ? collapsedName(m, true, preferred) : id; }}
            onToggle={(id) => { const next = toggleColumn(ids, id, MAX_MODELS); if (next) pin(next); }} />
        </div>
      </details>
      <RowPicker rows={withValues.map((v) => v.row)} groups={matrix.groups} selected={selectedKeys} selectedBoards={shownBoards} onChange={(keys) => chooseRows(keys)} open={panel === "rows"} onToggle={panelToggle("rows")} />
    </div>

    {ids.length === 0
      ? <div className="bh-empty min-h-56"><h3 className="font-semibold">No model passes your filters</h3><p className="mt-2">Widen the filters, pick another model list, or add a model above.</p></div>
      : visible.length === 0
      ? <div className="bh-empty min-h-40"><h3 className="font-semibold">No benchmark matches these rows</h3><p className="mt-2">Pick another row preset, or tick categories under “Choose rows”.</p></div>
      : <div className="bh-matrix-wrap" role="region" aria-label="Benchmark results by model" tabIndex={0}>
        <table className="bh-matrix">
          <caption className="sr-only">Benchmark results for the compared models, grouped by category. Bold marks the best result in each row; the bar behind a value shows it relative to the other values in its row.</caption>
          <thead><tr>
            <th scope="col" className="bh-matrix-stub">Benchmark</th>
            {ids.map((id, j) => { const m = modelsById.get(id); return <th key={id} scope="col" className={`bh-matrix-model ${j === 0 ? "bh-matrix-lead" : ""}`}>
              <span className="bh-matrix-accent" style={{ ["--swatch" as string]: seriesColor(j) }} aria-hidden="true">{seriesLetter(j)}</span>
              <span className="bh-matrix-org">{m?.org}</span>
              <span className="bh-matrix-name"><Link href={`/models/${encodeURIComponent(id)}`} title={m?.display_name} className="hover:underline">{names[j]}</Link></span>
              {ids.length > 1 && <button type="button" className="bh-matrix-remove" aria-label={`Remove ${names[j]} from the comparison`} onClick={() => remove(id)}>×</button>}
            </th>; })}
          </tr></thead>
          <tbody><ScoreRowPair score={score} valuesFor={valuesFor} /></tbody>
          {groups.map((g) => { const open = !closed.has(g.id); return <tbody key={g.id}>
            <CategoryHeader columns={ids.length} count={g.rows.length} composite={categoryComposite(g.rows, ids.length)} label={
              <button type="button" aria-expanded={open} onClick={() => toggle(g.id)}>
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className={open ? "rotate-90" : ""}><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{g.label}</span><span className="bh-cat-count bh-muted tabular text-xs font-normal">{counted(g.rows.length, "benchmark")}</span>
              </button>} />
            {open && g.rows.map(({ row, vals, basis }) => {
              // F-123 (pass 23): a preliminary (‡, chart-read) value is display-only — no bar, no bold, exactly as Compare (F-121).
              const ranked = vals.map((v, j) => (basis[j] === 3 ? null : v));
              const bars = rowBars(ranked, row.higherBetter, row.unit), win = rowWinners(ranked, row.higherBetter);
              return <tr key={row.id}>
                <th scope="row" className="bh-matrix-stub">
                  {/* F-100 (pass 18): the harness sits on the name line, so two rows of one benchmark read apart at a glance. */}
                  <span className="bh-matrix-bench">{row.name}{row.cohort && <span className="bh-matrix-cohort">{row.cohort}</span>}<RowTags tags={matrix.tags} row={row} /></span>
                  {/* F-98 / CR-38.2 + F-100: a stated task window is the one line worth a row of its own; the version and the
                      date the results were read are on hover here, on the (i) of the Simple table and on the result page. */}
                  {/* F-105 (pass 19): a best-of row's name-line tag already names its versions and agents, so the "Version …"
                      sub-line is skipped there; the sentence saying what "best of" means lives in the footnote, on the
                      hover and on each value's result page, not as a third line under the name. */}
                  {(() => { const suffix = row.bestOf ? "" : versionSuffix(row.name, String(row.version ?? "")), w = row.freshness?.taskWindow; const sub = [suffix ? `Version ${suffix.replace(/^v(?=\d)/i, "")}` : null, w?.from ? (w.to && w.to !== w.from ? `tasks from ${w.from} to ${w.to}` : `tasks from ${w.from}`) : null].filter(Boolean).join(" · "); return sub ? <span className="bh-matrix-sub">{sub}</span> : null; })()}
                  <span className="bh-matrix-desc" title={[row.bestOf ? BEST_OF_NOTE : null, row.description, versionLine(row), row.sourceChange?.note].filter(Boolean).join(" — ")} data-best-of-note={row.bestOf ? "hover" : undefined}>{row.higherBetter === false ? "Lower is better. " : ""}{row.description}</span>
                </th>
                {vals.map((v, j) => {
                  // Family-scope board (ECI, AA Agentic, DesignArena): the source measured one
                  // configuration of the family; the cell shows it and says which one it was.
                  const donorId = row.familyScope?.fill?.[ids[j]] ?? null;
                  const donorName = donorId ? modelsById.get(donorId)?.display_name ?? donorId : null;
                  const familyNote = donorId ? `Measured once for the whole model family, on ${donorName}; shown for every configuration of the family.` : null;
                  const title = [row.bestOf ? `Best recorded result: ${variantLabel(row, ids[j])}` : null, familyNote].filter(Boolean).join(' — ') || undefined;
                  return <td key={ids[j]} className={`bh-matrix-cell ${j === 0 ? "bh-matrix-lead" : ""}`}>
                    {v == null
                      ? <span className="bh-matrix-missing"><span aria-hidden="true">—</span><span className="sr-only">No result</span></span>
                      : <Link href={cellHref(row, donorId ?? ids[j], ids, pinned != null)} className="bh-matrix-link" title={title} data-variant={row.bestOf ? variantLabel(row, ids[j]) : undefined} data-family-src={donorId ?? undefined}>
                        {bars[j] != null && <span aria-hidden="true" className={`bh-matrix-bar ${win[j] ? "is-best" : ""}`} style={{ width: `${Math.max(3, bars[j]! * 100)}%` }} />}
                        <span className={`relative tabular ${win[j] ? "font-bold" : ""}`}>{formatValue(v, row.unit)}{basis[j] === 1 && <sup className="bh-muted" title="Self-reported by the developer">†<span className="sr-only"> self-reported by the developer</span></sup>}{basis[j] === 3 && <sup className="bh-muted" title="Preliminary: announced, not yet independently measured. Shown only; never enters a score or a ranking">‡<span className="sr-only"> preliminary, not yet independently measured</span></sup>}</span>
                        {win[j] && <span className="sr-only"> (best in row)</span>}
                        {row.bestOf && <span className="sr-only"> (best recorded result: {variantLabel(row, ids[j])})</span>}
                        {familyNote && <span className="sr-only"> ({familyNote})</span>}
                      </Link>}
                  </td>;
                })}
              </tr>;
            })}
          </tbody>; })}
        </table>
      </div>}
    {ids.length > 1 && <BenchmarkBars rows={chart} ids={ids} names={names} />}
    {/* F-122: two sentences stay visible; every mark and every tag gets its line in the collapsed
        legend below, generated from the tag set. */}
    <div className="bh-muted text-xs">
      <p><AaCredit /> · Bold is best in row; bars compare within a row only. Open a value for its source.</p>
      <TableLegend tags={matrix.tags} tagKeys={Object.keys(matrix.tags)} scoreRow="The first row is the Benchmark Heaven score your settings select." />
    </div>
  </section>;
}
