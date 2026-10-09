"use client";
import { jevRowArch, jevTypeVarName as architectureVar } from './jevTypes';
import type { JevArchBadges } from '../lib/jevbench-architecture.mjs';
import { useEffect, useMemo, useRef, useState } from "react";
import { Radar, Swatch, type Series, type Spoke } from "./JevRadars";
import { JEV_TYPE_LABEL } from "./jevTypes";
import { SystemCombobox } from "./JevCompareV14";
import { jevSourceUrl } from "./jevSystemLinks";
import type { CompareCategories, CategoryDim } from "../lib/jevbench-categories.mjs";
import { useJevV15VisibleKeys } from "./useJevV15VisibleKeys";
import { radarShape, radarValue, plottable, categoryCell } from "../lib/radar-shape.mjs";

// CR-205: the v1.4 board's two-system compare, on v1.5 data. Four radars per pair — the four score axes,
// chance-corrected competence per request type (open and sealed), and competence per tier on the open and
// sealed sets. Every value is a published system-level aggregate from the pinned v1.5 artifact; per-tier
// spokes pool the per-type cells by their published decision counts (lib/jevbench-v15-board.mjs).
// CR-257 (Florian 1 Oct 2026): plus the category radars — capability by subject topic (image type on ImageJevBench) and the
// TypeSafe use-case categories — for every ranked system (lib/jevbench-categories.mjs). Binding for every release: AGENTS.md §3
// and test/cr-257-category-radars.test.mjs.

export type JevCompareV15Row = {
  key: string; name: string; cls: string; arch?: string; archBadges?: JevArchBadges; rank: number | null; listing: string; score: number | null; repo?: string | null; hosted?: boolean; subset?: { tag: string; nItems: number | null } | null;
  axes: Record<"intelligence" | "calibration" | "speed" | "cost", number | null> | null;
  typeCc: Record<"choice" | "noul" | "score", { open: number | null; sealed: number | null }>;
  tierCc: {
    open: Record<"easy" | "standard" | "judge" | "hard", number | null>;
    sealed: Record<"easy" | "standard" | "judge" | "hard", number | null>;
  };
};

const colour = (cls: string) => `rgb(var(${architectureVar(cls)}))`;

const AXES = [["intelligence", "Intelligence"], ["calibration", "Calibration"], ["speed", "Speed"], ["cost", "Cost"]] as const;
const TYPE_SPOKES = [
  ["open|choice", "Choice · open"], ["sealed|choice", "Choice · sealed"],
  ["open|noul", "Noul · open"], ["sealed|noul", "Noul · sealed"],
  ["open|score", "Score · open"], ["sealed|score", "Score · sealed"],
] as const;
const TIERS = [["easy", "Easy"], ["standard", "Standard"], ["judge", "Judge"], ["hard", "Hard"]] as const;

const one = (v: number | null | undefined) => (radarValue(v) === null ? "—" : (v as number).toFixed(1));
const lines = (label: string) => label.split(" ").reduce<string[]>((ls, w) => (ls.length && (ls[ls.length - 1] + " " + w).length <= 13 ? [...ls.slice(0, -1), `${ls[ls.length - 1]} ${w}`] : [...ls, w]), []);

function series(A: JevCompareV15Row, B: JevCompareV15Row): Series[] {
  const same = jevRowArch(A) === jevRowArch(B);
  return [{ name: A.name, stroke: colour(jevRowArch(A)), dashed: false, square: false },
    { name: B.name, stroke: same ? `color-mix(in srgb, ${colour(jevRowArch(B))} 55%, var(--text))` : colour(jevRowArch(B)), dashed: same, square: true }];
}

/** CR-257: one radar per category dimension. A value below chance draws at the centre and prints its published number — negative
 *  in the signed v1.5.x / ImageJevBench artifacts; the v1.6 artifacts already clip below-chance means to 0 (see the figure note).
 *  CR-290 correction (Florian 5 Oct 2026 ~20:30): only well-measured categories (radarMinN = 30 items) are spokes; smaller ones go to the
 *  low-sample table. A system that answered fewer than radarMinN items of a spoke's category is printed as n=… and not plotted. */
const completedN = (cell: [number, number, number?]) => cell[2] ?? cell[1];

function categorySpokes(pair: JevCompareV15Row[], dim: CategoryDim, cats: CompareCategories): Spoke[] {
  return dim.cats.filter((c) => c.plotted).map((c) => {
    // Radar display fix (9 Oct 2026): lib/radar-shape.mjs categoryCell — no cell or a non-finite competence is a gap (never
    // clamped to 0), an under-radarMinN cell keeps its value for the tables but is thin (printed n=…, not drawn).
    const cells = pair.map((r) => categoryCell(cats.systems[r.key]?.[dim.key]?.[c.key] ?? null, cats.radarMinN));
    return {
      key: c.key, lines: lines(c.short),
      thin: cells.map((v) => v.thin),
      values: cells.map((v) => v.value),
      texts: cells.map((v) => v.text),
      tip: `${c.label}: ${c.covers}. ${c.n} items (${c.split.a} ${cats.splitNames[0]}, ${c.split.b} ${cats.splitNames[1]}).`,
    };
  });
}

function CategoryKey({ dim, cats }: { dim: CategoryDim; cats: CompareCategories }) {
  const unplotted = dim.cats.filter((c) => !c.lowSample && !c.plotted && c.n >= cats.radarMinN);
  const empty = dim.cats.filter((c) => c.n === 0);
  return <details className="mt-1 text-[12px]" data-bh-jev15-category-key={dim.key}>
    <summary className="cursor-pointer text-accent">What each category means · items per category</summary>
    <ul className="mt-1 space-y-0.5">{dim.cats.filter((c) => c.plotted).map((c) => <li key={c.key} data-bh-jev15-category={`${dim.key}:${c.key}`} data-bh-jev15-category-n={c.n}><b>{c.label}</b> — {c.covers}. <span className="bh-muted tabular">{c.n} items ({c.split.a} {cats.splitNames[0]} / {c.split.b} {cats.splitNames[1]})</span></li>)}</ul>
    {unplotted.map((c) => <p key={c.key} className="bh-muted mt-1" data-bh-jev15-category-unplotted={`${dim.key}:${c.key}`}>Not drawn: <b>{c.label}</b> — {c.covers}. {c.n} items ({c.split.a} {cats.splitNames[0]} / {c.split.b} {cats.splitNames[1]}) — not a use case of its own, so it is counted but not drawn.</p>)}
    {empty.length > 0 && <p className="bh-muted mt-1" data-bh-jev15-category-empty={dim.key}>No items in this release: {empty.map((c) => c.label).join(", ")}.</p>}
  </details>;
}

/** CR-290 correction (Florian 5 Oct 2026 ~20:30): categories with fewer than radarMinN items are never spokes. They are listed here with their
 *  item count and both systems' values, marked indicative: with 16 items one answer moves a category by about six points. */
function LowSampleTable({ dim, cats, pair }: { dim: CategoryDim; cats: CompareCategories; pair: JevCompareV15Row[] }) {
  // A value below the artifact's own reporting minimum (min_n) is not shown at all, not even as indicative.
  const cellOf = (r: JevCompareV15Row, key: string) => { const v = cats.systems[r.key]?.[dim.key]?.[key]; return v && completedN(v) >= cats.minN ? v : null; };
  // Pool-level low-sample categories, plus a well-measured category in which one of the two systems answered fewer than
  // radarMinN items (its value is not drawn on the radar, so it is shown here instead of disappearing).
  const lowCell = (r: JevCompareV15Row, key: string) => { const v = cellOf(r, key); return v !== null && completedN(v) < cats.radarMinN; };
  const low = dim.cats.filter((c) => (c.lowSample && pair.some((r) => cellOf(r, c.key))) || (c.plotted && pair.some((r) => lowCell(r, c.key))));
  const unreported = dim.cats.filter((c) => c.lowSample && !pair.some((r) => cellOf(r, c.key)));
  if (!low.length && !unreported.length) return null;
  const cell = (r: JevCompareV15Row, key: string) => {
    const v = cellOf(r, key);
    return v ? <>{one(v[0])} <span className="bh-muted text-[11px]">n={completedN(v)}</span></> : <span className="bh-muted" title={`No published value: fewer than ${cats.minN} answered items, or no per-category values for this system`}>—</span>;
  };
  return <div className="mt-2" data-bh-jev15-low-sample={dim.key}>
    <p className="text-[12px] font-semibold">Low sample, n &lt; {cats.radarMinN} — indicative only</p>
    {low.length > 0 && <div className="bh-table-wrap"><table className="bh-table mt-1 text-[12px]">
      <thead><tr><th scope="col">Category (items)</th><th scope="col">A: {pair[0].name}</th><th scope="col">B: {pair[1].name}</th></tr></thead>
      <tbody>{low.map((c) => <tr key={c.key} title={`${c.label}: ${c.covers}`} data-bh-jev15-low-sample-row={`${dim.key}:${c.key}`}><th scope="row" className="text-left font-normal">{c.label} <span className="bh-muted">({c.n}{c.plotted ? `; a system answered fewer than ${cats.radarMinN}` : ""})</span></th><td className="tabular">{cell(pair[0], c.key)}</td><td className="tabular">{cell(pair[1], c.key)}</td></tr>)}</tbody>
    </table></div>}
    {unreported.length > 0 && <p className="bh-muted mt-1 text-[11px]" data-bh-jev15-low-sample-unreported={dim.key}>No published value for either system (under {cats.minN} answered items, or no per-category values): {unreported.map((c) => `${c.label} (${c.n})`).join(", ")}.</p>}
    <p className="bh-muted mt-1 text-[11px]">Not drawn on the radar: with so few items a single answer moves a category score by several points, so these values are noise-prone. These values become spokes once the item pool reaches {cats.radarMinN} items per category.</p>
  </div>;
}

/** Competence spokes (0–100); a missing cell is neither plotted nor guessed. */
function ccSpokes(pair: JevCompareV15Row[], items: readonly (readonly [string, string])[], read: (r: JevCompareV15Row, key: string) => number | null): Spoke[] {
  return items.map(([key, label]) => {
    const values = pair.map((r) => radarValue(read(r, key)));
    return { key, lines: lines(label), thin: values.map((v) => v === null), values, texts: values.map(one) };
  });
}

function parsePair(search: string, keys: Set<string>): [string, string] | null {
  const raw = new URLSearchParams(search).get("compare");
  if (!raw) return null;
  const [a, b] = raw.split(",");
  return a && b && a !== b && keys.has(a) && keys.has(b) ? [a, b] : null;
}

export function JevCompareV15({ rows, openDecisions, sealedDecisions, heading, axesOnly = false, categories = null }: {
  rows: JevCompareV15Row[]; openDecisions: number; sealedDecisions: number; heading?: string; axesOnly?: boolean; categories?: CompareCategories | null;
}) {
  const visibleKeys = useJevV15VisibleKeys(rows.map((row) => row.key));
  const visibleRows = useMemo(() => rows.filter((row) => visibleKeys.has(row.key)), [rows, visibleKeys]);
  const ranked = visibleRows.filter((r) => r.rank !== null);
  const unranked = visibleRows.filter((r) => r.rank === null);
  const first = ranked.find((r) => r.key === "jev-1.13.0") ?? ranked[0] ?? visibleRows[0];
  const second = ranked.find((r) => r.key !== first?.key) ?? ranked[1] ?? visibleRows.find((r) => r.key !== first?.key) ?? first;
  const [a, setA] = useState(first?.key ?? "");
  const [b, setB] = useState(second?.key ?? "");
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);
  useEffect(() => {
    const pair = parsePair(window.location.search, new Set(visibleRows.map((r) => r.key)));
    if (pair) { setA(pair[0]); setB(pair[1]); }
    else if (first && second) { setA(first.key); setB(second.key); }
    setReady(true);
  }, [visibleRows, first?.key, second?.key]);
  useEffect(() => {
    if (!ready || !first || !second) return;
    const u = new URL(window.location.href);
    if (a === first.key && b === second.key) u.searchParams.delete("compare"); else u.searchParams.set("compare", `${a},${b}`);
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u.href);
  }, [a, b, ready, first, second]);
  if (visibleRows.length < 2 || !first || !second) return <p className="bh-muted text-sm">Fewer than two systems match these filters; adjust them to compare two systems.</p>;

  const A = visibleRows.find((r) => r.key === a) ?? first;
  const B = visibleRows.find((r) => r.key === b && r.key !== A.key) ?? visibleRows.find((r) => r.key !== A.key) ?? second;
  const pair = [A, B], s = series(A, B);
  const axisSpokes: Spoke[] = AXES.map(([k, label]) => ({
    key: k, lines: [label], thin: [false, false],
    // CR-290: an unpublished axis is a gap on the radar (it counts as 0 in the composite, and the label says so).
    values: pair.map((r) => r.axes?.[k] ?? null),
    texts: pair.map((r) => (r.axes == null ? "not scored" : r.axes[k] == null ? "none (0 in score)" : one(r.axes[k]))),
  }));
  const typeSpokes = ccSpokes(pair, TYPE_SPOKES, (r, k) => {
    const [set, t] = k.split("|");
    return r.typeCc[t as "choice"]?.[set as "open"] ?? null;
  });
  const openTierSpokes = ccSpokes(pair, TIERS, (r, k) => r.tierCc.open[k as "easy"] ?? null);
  const sealedTierSpokes = ccSpokes(pair, TIERS, (r, k) => r.tierCc.sealed[k as "easy"] ?? null);
  // CR-331: a row measured on a 600-item API set (A4 u P / A5 u P) has 300 sealed items instead of the full sealed set.
  const subsetNote = pair.filter((r) => r.subset).map((r) => ` ${r.name} was measured on ${r.subset!.tag} ∪ P (${r.subset!.nItems ?? 600} items: 300 open + 300 sealed), so its sealed per-type and tier values rest on fewer items and carry wider uncertainty.`).join("");
  const missingFor = (spokes: Spoke[]) => pair.filter((_, k) => spokes.every((sp) => radarValue(sp.values[k]) === null)).map((r) => r.name);
  const status = (r: JevCompareV15Row) => r.rank !== null ? `#${r.rank}` : ({ honorable_mention: "honorable mention", partial: "partial run", unpriced: "unpriced", addendum: "roster addendum", unranked: "not ranked", api_offering: "API offering, ranked on the API leaderboard", reference: "reference, not ranked" } as Record<string, string>)[r.listing] ?? `${r.listing}, not ranked`;
  // CR-290 (Florian 5 Oct 2026): say in the caption which system has gaps and why, instead of letting a partial series
  // read as a small area. CR-290 correction: a series too sparse for lines (radarShape "points") says so in one line.
  const gapNote = (f: { spokes: Spoke[]; dim?: CategoryDim }) => {
    const notes = pair.flatMap((r, k) => {
      const present = f.spokes.map((sp) => plottable(sp.values[k], sp.thin[k]));
      const shape = radarShape(present);
      if (shape.kind === "polygon" || shape.kind === "none") return [];
      const who = `${k === 0 ? "A" : "B"} (${r.name})`, got = `${present.filter(Boolean).length} of ${f.spokes.length}`;
      return [{ r, k, points: shape.kind === "points", text: shape.kind === "points"
        ? `${who} is measured on ${got} spokes only, so it is drawn as points, not a shape — measured on fewer items; full radar after the next re-measure`
        : `${who} has values on ${got} spokes; lines join only adjacent measured spokes` }];
    });
    if (!notes.length) return zeroNote(f);
    const hosted = notes.some((g) => g.r.hosted === true);
    const why = f.dim && categories ? `Open spokes (n/a or n=…) have fewer than ${categories.radarMinN} answered items for that system or no published value${hosted ? "; hosted APIs answer a smaller item set, so more of their category cells stay under that" : ""}.` : "Open spokes have no published value.";
    return <>{notes.map((g) => <span key={g.k} className="block" data-bh-radar-gap-note={g.points ? "points" : "runs"}>{g.text}.</span>)}<span className="block">Gaps, not zeros: {why}</span>{zeroNote(f)}</>;
  };
  // Radar display fix (9 Oct 2026): a drawn 0 (or a negative value at the centre) is a measured result, not a missing one. The
  // v1.6 category artifacts clip below-chance means to 0 before publication, so their 0 cannot be told apart from "exactly
  // chance"; the signed v1.5.x / ImageJevBench artifacts print the negative number. Display wording only; no value changes.
  function zeroNote(f: { spokes: Spoke[]; dim?: CategoryDim }) {
    if (!f.dim || !categories) return null;
    const drawn = f.spokes.flatMap((sp) => sp.values.filter((v, k) => plottable(v, sp.thin[k])) as number[]);
    const clipped = /clipped|negative means are clipped/i.test(categories.metric);
    if (drawn.some((v) => v === 0) && clipped) return <span className="block" data-bh-radar-zero-note="clipped">A point at the centre printed 0.0 is a measured value, not a gap: these published cells clip below-chance results to 0, so 0 means at or below chance.</span>;
    if (drawn.some((v) => v <= 0)) return <span className="block" data-bh-radar-zero-note="signed">A point at the centre is a measured value at or below chance (0); a negative value prints its number.</span>;
    return null;
  }
  const desc = (title: string, spokes: Spoke[]) => `${title}, ${s[0].name} vs ${s[1].name}. ` + spokes.map((sp) => `${sp.lines.join(" ")}: ${sp.texts[0]} vs ${sp.texts[1]}`).join("; ") + ".";
  const copy = async () => {
    const u = new URL(window.location.href); u.searchParams.set("compare", `${A.key},${B.key}`); u.hash = "compare";
    try { await navigator.clipboard.writeText(u.href); setCopied(true); copiedTimer.current = window.setTimeout(() => setCopied(false), 2000); } catch { window.location.hash = "compare"; }
  };
  const categoryFigures = (categories?.dims ?? []).map((dim) => {
    const spokes = categorySpokes(pair, dim, categories!);
    const absent = pair.filter((r) => !categories!.systems[r.key]);
    return { key: `cat-${dim.key}`, title: dim.title, dim,
      note: `${dim.note} Chance-corrected competence per category (0 = chance, 100 = perfect), ${pair.map((r) => `${r.name}: ${categories!.categoryPools?.[r.key] ?? categories!.splitNames.join("+")}`).join("; ")} items pooled; only categories with at least ${categories!.radarMinN} items are spokes, smaller ones are listed below. Hover a category for its definition and item count.`,
      spokes, missing: [...pair.filter((r) => categories!.spokeExceptions?.[r.key]).map((r) => `${r.name}: ${categories!.spokeExceptions![r.key]}`), ...pair.filter((r) => categories!.exposureNotes?.[r.key]).map((r) => `${r.name}: ${categories!.exposureNotes![r.key]}`), ...absent.map((r) => `${r.name}: ${categories!.missing[r.key] ?? "no per-category values"}`)], size: { w: 500, h: 400, r: 112 } };
  });
  const figures: { key: string; title: string; note: string; spokes: Spoke[]; missing: string[]; size: { w: number; h: number; r: number }; dim?: CategoryDim }[] = [
    { key: "axes", title: "The four score axes", note: "0–100, the values in the table. An axis a system has no published value for is left as a gap (it counts as 0 in the composite).", spokes: axisSpokes, missing: [], size: { w: 420, h: 320, r: 96 } },
    { key: "types", title: "Competence per request type, open / sealed", note: `Chance-corrected competence (0 = chance) for Choice, Noul and Score on the ${openDecisions} open and ${sealedDecisions} sealed decisions.`, spokes: typeSpokes, missing: missingFor(typeSpokes), size: { w: 440, h: 340, r: 100 } },
    { key: "tiers-open", title: "Competence per tier — open set", note: "Per-tier competence, the three request types pooled by their published decision counts.", spokes: openTierSpokes, missing: missingFor(openTierSpokes), size: { w: 440, h: 340, r: 100 } },
    { key: "tiers-sealed", title: "Competence per tier — sealed set", note: "Per-tier competence on the sealed decisions, types pooled the same way; item text stays private.", spokes: sealedTierSpokes, missing: missingFor(sealedTierSpokes), size: { w: 440, h: 340, r: 100 } },
  ].filter((f) => !axesOnly || f.key === "axes");
  // CR-257: the category radars sit right after the score axes.
  figures.splice(1, 0, ...categoryFigures);
  return <section id="compare" className="mt-8 scroll-mt-6" aria-labelledby="jev15-compare" data-bh-jev15-compare data-bh-jev15-compare-a={A.key} data-bh-jev15-compare-b={B.key}>
    <h2 id="jev15-compare" className="text-2xl font-semibold">{heading ?? 'Compare two systems'}</h2>
    <p className="bh-muted mt-1 max-w-3xl text-sm">Pick any two. {axesOnly ? 'Compare the four score axes' : 'Radars for the score axes'}{categoryFigures.length ? `, ${categoryFigures.map((f) => f.title.split(" (")[0].toLowerCase()).join(" and ")}` : ''}{axesOnly ? '; request-type and tier aggregates are not published for this benchmark.' : ', chance-corrected competence per request type on the open and sealed sets, and competence per tier on each set.'} Further out is better on every spoke; the link keeps the pair.</p>
    <div className="bh-panel mt-3 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <SystemCombobox id="jev15-compare-a" label="System A" value={A.key} other={B.key} ranked={ranked} unranked={unranked} onChange={setA} />
        <button type="button" className="bh-button shrink-0 self-end text-sm font-semibold sm:self-auto" onClick={() => { setA(B.key); setB(A.key); }} aria-label="Swap system A and system B" data-bh-jev15-compare-swap>⇄ Swap</button>
        <SystemCombobox id="jev15-compare-b" label="System B" value={B.key} other={A.key} ranked={ranked} unranked={unranked} onChange={setB} />
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <ul className="space-y-1 text-[13px]" aria-label="Legend" data-bh-jev15-compare-legend>
          {pair.map((r, k) => <li key={k}><Swatch s={s[k]} /><b>{k === 0 ? "A" : "B"}: {r.repo ? <a href={jevSourceUrl(r.key, r.repo) ?? undefined} target="_blank" rel="noopener noreferrer" className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent" data-bh-jev-source={r.key}>{r.name}</a> : r.name}</b> <span className="bh-muted" data-bh-jev15-class={r.cls}>— {JEV_TYPE_LABEL[jevRowArch(r)] ?? <code title="Class named in the artifact; description pending">{r.cls}</code>} · </span><span className="whitespace-nowrap">Score {one(r.score)} ({status(r)})</span>{categories?.spokeExceptions?.[r.key] && <span className="bh-muted block" data-bh-radar-spoke-exception={r.key}>{categories.spokeExceptions[r.key]}</span>}</li>)}
        </ul>
        <button type="button" className="bh-button text-xs font-semibold" onClick={copy} data-bh-jev15-compare-copy>{copied ? "Link copied" : "Copy link to this pair"}</button>
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-5 lg:grid-cols-2">
        {figures.map((f) => <figure key={f.key} className="min-w-0" data-bh-jev15-radar={f.key}>
          <h3 className="text-base font-semibold">{f.title}</h3>
          {f.missing.length > 0 && <p className="bh-muted mt-1 text-[12px]" data-bh-jev15-radar-missing={f.key}>{f.dim ? f.missing.join(" ") : `${f.missing.join(" and ")} ${f.missing.length === 1 ? "has" : "have"} no published values for this view.`}</p>}
          {missingFor(f.spokes).length < 2
            ? <Radar spokes={f.spokes} series={s} size={f.size} id={`jev15-radar-${f.key}`} title={`Radar: ${f.title.toLowerCase()}, two systems`} desc={desc(f.title, f.spokes)} />
            : <p className="bh-muted mt-3 text-[12px]">Neither selected system has a published series for this view.</p>}
          <figcaption className="bh-muted text-[12px]">{f.note}{f.key !== "axes" && !f.dim && subsetNote && <span data-bh-jev15-subset-note>{subsetNote}</span>}{gapNote(f)}</figcaption>
          {f.dim && categories && <LowSampleTable dim={f.dim} cats={categories} pair={pair} />}
          {f.dim && categories && <CategoryKey dim={f.dim} cats={categories} />}
        </figure>)}
      </div>
      {categories && categoryFigures.length > 0 && <details className="mt-3 text-[12px]" data-bh-jev15-category-method>
        <summary className="cursor-pointer text-accent">How the categories were made</summary>
        <p className="bh-muted mt-1">{categories.metric}</p>
        <p className="bh-muted mt-1">{categories.labelling}</p>
        {categories.rules.length > 0 && <ul className="bh-muted mt-1 list-disc pl-5">{categories.rules.map((r) => <li key={r}>{r}</li>)}</ul>}
      </details>}
      <details className="mt-3 text-[13px]" data-bh-jev15-compare-values><summary className="cursor-pointer text-accent">All values as a table</summary>
        <div className="bh-table-wrap mt-2"><table className="bh-table" data-bh-jev15-compare-table>
          <thead><tr><th scope="col">Spoke</th><th scope="col">A: {s[0].name}</th><th scope="col">B: {s[1].name}</th></tr></thead>
          <tbody>{figures.flatMap((f) => [
            <tr key={`${f.key}-head`} className="bg-[rgb(var(--surface-2))]"><th scope="rowgroup" colSpan={3} className="text-left font-semibold">{f.title}</th></tr>,
            ...f.spokes.map((sp) => <tr key={`${f.key}-${sp.key}`}><th scope="row" className="text-left font-normal">{sp.lines.join(" ")}</th><td className="tabular">{sp.texts[0]}</td><td className="tabular">{sp.texts[1]}</td></tr>),
          ])}</tbody>
        </table></div>
      </details>
    </div>
  </section>;
}
