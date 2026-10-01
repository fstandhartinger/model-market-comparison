"use client";
import { useEffect, useRef, useState } from "react";
import { Radar, Swatch, type Series, type Spoke } from "./JevRadars";
import { JEV_TYPE_LABEL, JEV_TYPE_VAR } from "./jevTypes";
import { SystemCombobox } from "./JevCompareV14";
import { jevSourceUrl } from "./jevSystemLinks";

// CR-205: the v1.4 board's two-system compare, on v1.5 data. Four radars per pair — the four score axes,
// chance-corrected competence per request type (open and sealed), and competence per tier on the open and
// sealed sets. Every value is a published system-level aggregate from the pinned v1.5 artifact; per-tier
// spokes pool the per-type cells by their published decision counts (lib/jevbench-v15-board.mjs).

export type JevCompareV15Row = {
  key: string; name: string; cls: string; rank: number | null; listing: string; score: number | null; repo?: string | null;
  axes: Record<"intelligence" | "calibration" | "speed" | "cost", number | null> | null;
  typeCc: Record<"choice" | "noul" | "score", { open: number | null; sealed: number | null }>;
  tierCc: {
    open: Record<"easy" | "standard" | "judge" | "hard", number | null>;
    sealed: Record<"easy" | "standard" | "judge" | "hard", number | null>;
  };
};

const FAMILY: Record<string, string> = { jev: "blue", "jev-service": "blue", "jev-rebuild": "orange", "llm-baseline": "green", "small-tool-model": "violet", classifier: "magenta", "decision-api": "yellow", reranker: "teal", "raw-logit-control": "grey", "native-logit": "lime", "system-one-open": "red" };
const colour = (cls: string) => `rgb(var(${JEV_TYPE_VAR[cls] ?? JEV_TYPE_VAR["llm-baseline"]}))`;

const AXES = [["intelligence", "Intelligence"], ["calibration", "Calibration"], ["speed", "Speed"], ["cost", "Cost"]] as const;
const TYPE_SPOKES = [
  ["open|choice", "Choice · open"], ["sealed|choice", "Choice · sealed"],
  ["open|noul", "Noul · open"], ["sealed|noul", "Noul · sealed"],
  ["open|score", "Score · open"], ["sealed|score", "Score · sealed"],
] as const;
const TIERS = [["easy", "Easy"], ["standard", "Standard"], ["judge", "Judge"], ["hard", "Hard"]] as const;

const one = (v: number | null) => (v === null ? "—" : v.toFixed(1));
const lines = (label: string) => label.split(" ").reduce<string[]>((ls, w) => (ls.length && (ls[ls.length - 1] + " " + w).length <= 13 ? [...ls.slice(0, -1), `${ls[ls.length - 1]} ${w}`] : [...ls, w]), []);

function series(A: JevCompareV15Row, B: JevCompareV15Row): Series[] {
  const same = (FAMILY[A.cls] ?? A.cls) === (FAMILY[B.cls] ?? B.cls);
  return [{ name: A.name, stroke: colour(A.cls), dashed: false, square: false },
    { name: B.name, stroke: same ? `color-mix(in srgb, ${colour(B.cls)} 55%, var(--text))` : colour(B.cls), dashed: same, square: true }];
}

/** Competence spokes (0–100); a missing cell is neither plotted nor guessed. */
function ccSpokes(pair: JevCompareV15Row[], items: readonly (readonly [string, string])[], read: (r: JevCompareV15Row, key: string) => number | null): Spoke[] {
  return items.map(([key, label]) => {
    const values = pair.map((r) => read(r, key));
    return { key, lines: lines(label), thin: values.map((v) => v === null), values, texts: values.map(one) };
  });
}

function parsePair(search: string, keys: Set<string>): [string, string] | null {
  const raw = new URLSearchParams(search).get("compare");
  if (!raw) return null;
  const [a, b] = raw.split(",");
  return a && b && a !== b && keys.has(a) && keys.has(b) ? [a, b] : null;
}

export function JevCompareV15({ rows, openDecisions, sealedDecisions, heading, axesOnly = false }: {
  rows: JevCompareV15Row[]; openDecisions: number; sealedDecisions: number; heading?: string; axesOnly?: boolean;
}) {
  const ranked = rows.filter((r) => r.rank !== null);
  const unranked = rows.filter((r) => r.rank === null);
  const first = ranked.find((r) => r.key === "jev-1.13.0") ?? ranked[0] ?? rows[0];
  const second = ranked.find((r) => r.key !== first?.key) ?? ranked[1] ?? rows.find((r) => r.key !== first?.key) ?? first;
  const [a, setA] = useState(first?.key ?? "");
  const [b, setB] = useState(second?.key ?? "");
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);
  useEffect(() => {
    const pair = parsePair(window.location.search, new Set(rows.map((r) => r.key)));
    if (pair) { setA(pair[0]); setB(pair[1]); }
    setReady(true);
  }, [rows]);
  useEffect(() => {
    if (!ready || !first || !second) return;
    const u = new URL(window.location.href);
    if (a === first.key && b === second.key) u.searchParams.delete("compare"); else u.searchParams.set("compare", `${a},${b}`);
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u.href);
  }, [a, b, ready, first, second]);
  if (!first || !second) return <p className="bh-muted text-sm">Comparison data is not published for this board.</p>;

  const A = rows.find((r) => r.key === a) ?? first, B = rows.find((r) => r.key === b) ?? second;
  const pair = [A, B], s = series(A, B);
  const axisSpokes: Spoke[] = AXES.map(([k, label]) => ({
    key: k, lines: [label], thin: [false, false],
    values: pair.map((r) => r.axes?.[k] ?? 0),
    texts: pair.map((r) => (r.axes == null ? "not scored" : r.axes[k] == null ? "none (0)" : one(r.axes[k]))),
  }));
  const typeSpokes = ccSpokes(pair, TYPE_SPOKES, (r, k) => {
    const [set, t] = k.split("|");
    return r.typeCc[t as "choice"]?.[set as "open"] ?? null;
  });
  const openTierSpokes = ccSpokes(pair, TIERS, (r, k) => r.tierCc.open[k as "easy"] ?? null);
  const sealedTierSpokes = ccSpokes(pair, TIERS, (r, k) => r.tierCc.sealed[k as "easy"] ?? null);
  const missingFor = (spokes: Spoke[]) => pair.filter((_, k) => spokes.every((sp) => sp.values[k] === null)).map((r) => r.name);
  const status = (r: JevCompareV15Row) => r.rank !== null ? `#${r.rank}` : ({ honorable_mention: "honorable mention", partial: "partial run", unpriced: "unpriced", addendum: "roster addendum", unranked: "not ranked" } as Record<string, string>)[r.listing] ?? `${r.listing}, not ranked`;
  const desc = (title: string, spokes: Spoke[]) => `${title}, ${s[0].name} vs ${s[1].name}. ` + spokes.map((sp) => `${sp.lines.join(" ")}: ${sp.texts[0]} vs ${sp.texts[1]}`).join("; ") + ".";
  const copy = async () => {
    const u = new URL(window.location.href); u.searchParams.set("compare", `${A.key},${B.key}`); u.hash = "compare";
    try { await navigator.clipboard.writeText(u.href); setCopied(true); copiedTimer.current = window.setTimeout(() => setCopied(false), 2000); } catch { window.location.hash = "compare"; }
  };
  const figures: { key: string; title: string; note: string; spokes: Spoke[]; missing: string[]; size: { w: number; h: number; r: number } }[] = [
    { key: "axes", title: "The four score axes", note: "0–100, the values in the table. A system with no published axis draws at 0 and says so.", spokes: axisSpokes, missing: [], size: { w: 420, h: 320, r: 96 } },
    { key: "types", title: "Competence per request type, open / sealed", note: `Chance-corrected competence (0 = chance) for Choice, Noul and Score on the ${openDecisions} open and ${sealedDecisions} sealed decisions.`, spokes: typeSpokes, missing: missingFor(typeSpokes), size: { w: 440, h: 340, r: 100 } },
    { key: "tiers-open", title: "Competence per tier — open set", note: "Per-tier competence, the three request types pooled by their published decision counts.", spokes: openTierSpokes, missing: missingFor(openTierSpokes), size: { w: 440, h: 340, r: 100 } },
    { key: "tiers-sealed", title: "Competence per tier — sealed set", note: "Per-tier competence on the sealed decisions, types pooled the same way; item text stays private.", spokes: sealedTierSpokes, missing: missingFor(sealedTierSpokes), size: { w: 440, h: 340, r: 100 } },
  ];
  return <section id="compare" className="mt-8 scroll-mt-6" aria-labelledby="jev15-compare" data-bh-jev15-compare data-bh-jev15-compare-a={A.key} data-bh-jev15-compare-b={B.key}>
    <h2 id="jev15-compare" className="text-2xl font-semibold">{heading ?? 'Compare two systems'}</h2>
    <p className="bh-muted mt-1 max-w-3xl text-sm">Pick any two. {axesOnly ? 'Compare the four score axes; request-type and tier aggregates are not published for this benchmark.' : 'Four radars: the score axes, chance-corrected competence per request type on the open and sealed sets, and competence per tier on each set.'} Further out is better on every spoke; the link keeps the pair.</p>
    <div className="bh-panel mt-3 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <SystemCombobox id="jev15-compare-a" label="System A" value={A.key} other={B.key} ranked={ranked} unranked={unranked} onChange={setA} />
        <button type="button" className="bh-button shrink-0 self-end text-sm font-semibold sm:self-auto" onClick={() => { setA(B.key); setB(A.key); }} aria-label="Swap system A and system B" data-bh-jev15-compare-swap>⇄ Swap</button>
        <SystemCombobox id="jev15-compare-b" label="System B" value={B.key} other={A.key} ranked={ranked} unranked={unranked} onChange={setB} />
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <ul className="space-y-1 text-[13px]" aria-label="Legend" data-bh-jev15-compare-legend>
          {pair.map((r, k) => <li key={k}><Swatch s={s[k]} /><b>{k === 0 ? "A" : "B"}: {r.repo ? <a href={jevSourceUrl(r.key, r.repo) ?? undefined} target="_blank" rel="noopener noreferrer" className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent" data-bh-jev-source={r.key}>{r.name}</a> : r.name}</b> <span className="bh-muted" data-bh-jev15-class={r.cls}>— {JEV_TYPE_LABEL[r.cls] ?? <code title="Class named in the artifact; description pending">{r.cls}</code>} · </span><span className="whitespace-nowrap">Score {one(r.score)} ({status(r)})</span></li>)}
        </ul>
        <button type="button" className="bh-button text-xs font-semibold" onClick={copy} data-bh-jev15-compare-copy>{copied ? "Link copied" : "Copy link to this pair"}</button>
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-5 lg:grid-cols-2">
        {figures.filter((f) => !axesOnly || f.key === 'axes').map((f) => <figure key={f.key} className="min-w-0" data-bh-jev15-radar={f.key}>
          <h3 className="text-base font-semibold">{f.title}</h3>
          {f.missing.length > 0 && <p className="bh-muted mt-1 text-[12px]" data-bh-jev15-radar-missing={f.key}>{f.missing.join(" and ")} {f.missing.length === 1 ? "has" : "have"} no published values for this view.</p>}
          {missingFor(f.spokes).length < 2
            ? <Radar spokes={f.spokes} series={s} size={f.size} id={`jev15-radar-${f.key}`} title={`Radar: ${f.title.toLowerCase()}, two systems`} desc={desc(f.title, f.spokes)} />
            : <p className="bh-muted mt-3 text-[12px]">Neither selected system has a published series for this view.</p>}
          <figcaption className="bh-muted text-[12px]">{f.note}</figcaption>
        </figure>)}
      </div>
      <details className="mt-3 text-[13px]" data-bh-jev15-compare-values><summary className="cursor-pointer text-accent">All values as a table</summary>
        <div className="bh-table-wrap mt-2"><table className="bh-table" data-bh-jev15-compare-table>
          <thead><tr><th scope="col">Spoke</th><th scope="col">A: {s[0].name}</th><th scope="col">B: {s[1].name}</th></tr></thead>
          <tbody>{figures.filter((f) => !axesOnly || f.key === 'axes').flatMap((f) => [
            <tr key={`${f.key}-head`} className="bg-[rgb(var(--surface-2))]"><th scope="rowgroup" colSpan={3} className="text-left font-semibold">{f.title}</th></tr>,
            ...f.spokes.map((sp) => <tr key={`${f.key}-${sp.key}`}><th scope="row" className="text-left font-normal">{sp.lines.join(" ")}</th><td className="tabular">{sp.texts[0]}</td><td className="tabular">{sp.texts[1]}</td></tr>),
          ])}</tbody>
        </table></div>
      </details>
    </div>
  </section>;
}
