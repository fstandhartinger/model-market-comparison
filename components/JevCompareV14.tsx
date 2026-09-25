"use client";
import { useEffect, useState } from "react";
import { Radar, Swatch, type Series, type Spoke } from "./JevRadars";
import { JEV_TYPE_LABEL, JEV_TYPE_VAR } from "./jevTypes";

// Page fix (Florian 23 Sep 2026): CR-131 left the v1.3 two-system compare behind the historical disclosure. v1.4 brings it
// back with four radars per pair — the four score axes, accuracy per tier including the sealed set, public hard-tier accuracy
// by family (the v1.2 hard topics) and sealed accuracy by family. Every value is a published system-level aggregate from the
// pinned v1.4 artifact; no sealed item text, gold or per-item result reaches this component. The pair lives in ?compare=a,b.

export type JevCompareRow = {
  key: string; name: string; cls: string; rank: number | null; listing: string; score: number | null;
  axes: Record<"intelligence" | "calibration" | "speed" | "cost", number | null>;
  tiers: Record<"easy" | "standard" | "judge" | "hard" | "sealed", number | null>;
  hard: Record<string, { accuracy: number | null; n: number }> | null;
  sealed: Record<string, number | null> | null;
};

const FAMILY: Record<string, string> = { jev: "blue", "jev-service": "blue", "jev-rebuild": "orange", "llm-baseline": "green", "small-tool-model": "violet", classifier: "magenta", "decision-api": "yellow", reranker: "teal", "raw-logit-control": "grey", "native-logit": "lime" };
const colour = (cls: string) => `rgb(var(${JEV_TYPE_VAR[cls] ?? JEV_TYPE_VAR["llm-baseline"]}))`;

const AXES = [["intelligence", "Intelligence"], ["calibration", "Calibration"], ["speed", "Speed"], ["cost", "Cost"]] as const;
const TIERS = [["easy", "Easy"], ["standard", "Standard"], ["judge", "Judge"], ["hard", "Hard"], ["sealed", "Sealed"]] as const;
export const HARD_FAMILIES: [string, string][] = [["adversarial", "Adversarial"], ["ambiguous", "Ambiguous"], ["judge_hard", "Judge"], ["long_policy", "Long policy"], ["multi_hop", "Multi-hop"], ["probability", "Probability"], ["routing_hard", "Routing"], ["temporal_numeric", "Temporal / numeric"], ["tradeoff", "Trade-off"], ["trap", "Trap"]];
export const SEALED_FAMILIES: [string, string][] = [["ambiguous_abstain", "Ambiguous / abstain"], ["judge_hard", "Judge"], ["long_policy", "Long policy"], ["multi_hop", "Multi-hop"], ["paraphrase_robustness", "Paraphrase"], ["probability", "Probability"], ["safety_judge", "Safety judge"], ["temporal_numeric", "Temporal / numeric"], ["tradeoff", "Trade-off"], ["trap_adversarial", "Trap / adversarial"]];

const one = (v: number | null) => (v === null ? "—" : v.toFixed(1));
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(0)}%`);
const lines = (label: string) => label.split(" ").reduce<string[]>((ls, w) => (ls.length && (ls[ls.length - 1] + " " + w).length <= 13 ? [...ls.slice(0, -1), `${ls[ls.length - 1]} ${w}`] : [...ls, w]), []);

function series(A: JevCompareRow, B: JevCompareRow): Series[] {
  const same = (FAMILY[A.cls] ?? A.cls) === (FAMILY[B.cls] ?? B.cls);
  return [{ name: A.name, stroke: colour(A.cls), dashed: false, square: false },
    { name: B.name, stroke: same ? `color-mix(in srgb, ${colour(B.cls)} 55%, var(--text))` : colour(B.cls), dashed: same, square: true }];
}

/** Accuracy spokes (0–1 in, 0–100 plotted); a missing value is neither plotted nor guessed. */
function accuracySpokes(pair: JevCompareRow[], items: readonly (readonly [string, string])[], read: (r: JevCompareRow, key: string) => number | null): Spoke[] {
  return items.map(([key, label]) => {
    const values = pair.map((r) => read(r, key));
    return { key, lines: lines(label), thin: values.map((v) => v === null), values: values.map((v) => (v === null ? null : v * 100)), texts: values.map(pct) };
  });
}

function parsePair(search: string, keys: Set<string>): [string, string] | null {
  const raw = new URLSearchParams(search).get("compare");
  if (!raw) return null;
  const [a, b] = raw.split(",");
  return a && b && a !== b && keys.has(a) && keys.has(b) ? [a, b] : null;
}

export function JevCompareV14({ rows, sealedDecisions, hardDecisions, fixedPair = false, heading }: {
  rows: JevCompareRow[]; sealedDecisions: number; hardDecisions: number; fixedPair?: boolean; heading?: string;
}) {
  const ranked = rows.filter((r) => r.rank !== null);
  const unranked = rows.filter((r) => r.rank === null);
  // F-191 (Fable pass 35): a fixed pair keeps the caller's order — on a leaf page A is the page's own system and B its reference,
  // the same roles the score strip draws (dot = this row, tick = the reference).
  const first = fixedPair ? rows[0] : ranked.find((r) => r.key === "jev-1.13.0") ?? ranked[0] ?? rows[0];
  const second = fixedPair ? rows.find((r) => r.key !== first?.key) ?? first : ranked.find((r) => r.key !== first?.key) ?? ranked[1] ?? rows.find((r) => r.key !== first?.key) ?? first;
  if (!first || !second) return <p className="bh-muted text-sm">Comparison data is not published for this system.</p>;
  const [a, setA] = useState(first.key);
  const [b, setB] = useState(second.key);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!fixedPair) {
      const pair = parsePair(window.location.search, new Set(rows.map((r) => r.key)));
      if (pair) { setA(pair[0]); setB(pair[1]); }
    }
    setReady(true);
  }, [rows, fixedPair]);
  useEffect(() => {
    if (fixedPair || !ready) return;
    const u = new URL(window.location.href);
    if (a === first.key && b === second.key) u.searchParams.delete("compare"); else u.searchParams.set("compare", `${a},${b}`);
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u.href);
  }, [a, b, ready, first.key, second.key, fixedPair]);

  const A = rows.find((r) => r.key === a) ?? first, B = rows.find((r) => r.key === b) ?? second;
  const pair = [A, B], s = series(A, B);
  const axisSpokes: Spoke[] = AXES.map(([k, label]) => ({
    key: k, lines: [label], thin: [false, false],
    values: pair.map((r) => r.axes[k] ?? 0),
    texts: pair.map((r) => (r.axes[k] === null ? "none (0)" : one(r.axes[k]))),
  }));
  const tierSpokes = accuracySpokes(pair, TIERS, (r, k) => r.tiers[k as keyof JevCompareRow["tiers"]]);
  const hardSpokes = accuracySpokes(pair, HARD_FAMILIES, (r, k) => r.hard?.[k]?.accuracy ?? null);
  const sealedSpokes = accuracySpokes(pair, SEALED_FAMILIES, (r, k) => r.sealed?.[k] ?? null);
  const missingFor = (spokes: Spoke[]) => pair.filter((_, k) => spokes.every((sp) => sp.values[k] === null)).map((r) => r.name);
  const missingSentence = (key: string, names: string[]) => {
    if (key === "sealed") return `${names.join(" and ")} has no sealed family breakdown.`;
    if (key === "hard") return `${names.join(" and ")} ${names.length === 1 ? "has" : "have"} no published v1.2 hard-tier family breakdown.`;
    return `${names.join(" and ")} has no published accuracy-tier results.`;
  };
  const status = (r: JevCompareRow) => r.rank !== null ? `#${r.rank}` : r.listing === "honorable_mention" ? "honorable mention, not ranked" : "partial run, not ranked";
  const option = (r: JevCompareRow) => <option key={r.key} value={r.key}>{r.rank !== null ? `${r.rank}. ` : ""}{r.name}{r.rank === null ? ` (${r.listing === "honorable_mention" ? "honorable mention" : "partial"})` : ""}</option>;
  const pick = (id: string, label: string, value: string, set: (k: string) => void, other: string) => <label className="block min-w-0 flex-1 text-[13px]" htmlFor={id}>
    <span className="bh-muted mb-1 block font-semibold">{label}</span>
    <select id={id} className="bh-input w-full" value={value} onChange={(e) => set(e.target.value)} data-bh-jev14-compare-pick={id.endsWith("a") ? "a" : "b"}>
      <optgroup label="Ranked">{ranked.filter((r) => r.key !== other).map(option)}</optgroup>
      {unranked.length > 0 && <optgroup label="Not ranked">{unranked.filter((r) => r.key !== other).map(option)}</optgroup>}
    </select></label>;
  const desc = (title: string, spokes: Spoke[]) => `${title}, ${s[0].name} vs ${s[1].name}. ` + spokes.map((sp) => `${sp.lines.join(" ")}: ${sp.texts[0]} vs ${sp.texts[1]}`).join("; ") + ".";
  const copy = async () => {
    const u = new URL(window.location.href); u.searchParams.set("compare", `${A.key},${B.key}`); u.hash = "compare";
    try { await navigator.clipboard.writeText(u.href); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { window.location.hash = "compare"; }
  };
  const figures: { key: string; title: string; note: string; spokes: Spoke[]; missing: string[]; size: { w: number; h: number; r: number } }[] = [
    { key: "axes", title: "The four score axes", note: "0–100, the values in the table. A label-only system has no calibration (counted as 0).", spokes: axisSpokes, missing: [], size: { w: 420, h: 320, r: 96 } },
    { key: "tiers", title: "Accuracy per tier, incl. sealed", note: `Share correct per tier; Sealed = the ${sealedDecisions} private decisions, aggregate only.`, spokes: tierSpokes, missing: missingFor(tierSpokes), size: { w: 440, h: 340, r: 100 } },
    { key: "hard", title: "Hard tier by family (v1.2 topics)", note: `Share correct within each family of the ${hardDecisions} v1.2 hard-tier decisions (public and held-out).`, spokes: hardSpokes, missing: missingFor(hardSpokes), size: { w: 460, h: 370, r: 100 } },
    { key: "sealed", title: "Sealed set by family", note: "Share correct within each sealed family — system-level aggregates; the items stay private.", spokes: sealedSpokes, missing: missingFor(sealedSpokes), size: { w: 460, h: 370, r: 100 } },
  ];
  return <section id="compare" className="mt-8 scroll-mt-6" aria-labelledby="jev14-compare" data-bh-jev14-compare data-bh-jev14-pair-mode={fixedPair ? 'fixed' : 'selectable'} data-bh-jev14-compare-a={A.key} data-bh-jev14-compare-b={B.key}>
    <h2 id="jev14-compare" className="text-2xl font-semibold">{heading ?? 'Compare two systems'}</h2>
    <p className="bh-muted mt-1 max-w-3xl text-sm">{fixedPair
      ? 'Four radars compare this fixed pair across the score axes, accuracy per tier, and accuracy by family on the hard tier and sealed set. Further out is better on every spoke.'
      : 'Pick any two. Four radars: the score axes, accuracy per tier including the sealed set, and accuracy by family on the v1.2 hard tier and on the sealed set. Further out is better on every spoke; the link keeps the pair.'}</p>
    <div className="bh-panel mt-3 p-3 sm:p-4">
      {!fixedPair && <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        {pick("jev14-compare-a", "System A", A.key, setA, B.key)}
        <button type="button" className="bh-button shrink-0 self-end text-sm font-semibold sm:self-auto" onClick={() => { setA(B.key); setB(A.key); }} aria-label="Swap system A and system B" data-bh-jev14-compare-swap>⇄ Swap</button>
        {pick("jev14-compare-b", "System B", B.key, setB, A.key)}
      </div>}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <ul className="space-y-1 text-[13px]" aria-label="Legend" data-bh-jev14-compare-legend>
          {pair.map((r, k) => <li key={k}><Swatch s={s[k]} /><b>{k === 0 ? "A" : "B"}: {r.name}</b> <span className="bh-muted" data-bh-jev14-class={r.cls} data-bh-jev14-class-labelled={JEV_TYPE_LABEL[r.cls] ? '1' : '0'}>— {JEV_TYPE_LABEL[r.cls] ?? <code title="Class named in the v1.4.2 artifact; description pending">{r.cls}</code>} · </span><span className="whitespace-nowrap" data-bh-jev14-compare-score={r.score === null ? "" : r.score.toFixed(3)}>Score {one(r.score)} ({status(r)})</span></li>)}
        </ul>
        {!fixedPair && <button type="button" className="bh-button text-xs font-semibold" onClick={copy} data-bh-jev14-compare-copy>{copied ? "Link copied" : "Copy link to this pair"}</button>}
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-5 lg:grid-cols-2">
        {figures.map((f) => <figure key={f.key} className="min-w-0" data-bh-jev14-radar={f.key}>
          <h3 className="text-base font-semibold">{f.title}</h3>
          {f.missing.length > 0 && <p className="bh-muted mt-1 text-[12px]" data-bh-jev14-radar-missing={f.key}>{missingSentence(f.key, f.missing)}</p>}
          {f.missing.length < 2
            ? <Radar spokes={f.spokes} series={s} size={f.size} id={`jev14-radar-${f.key}`} title={`Radar: ${f.title.toLowerCase()}, two systems`} desc={desc(f.title, f.spokes)} />
            : <p className="bh-muted mt-3 text-[12px]">Neither selected system has a published series for this view.</p>}
          <figcaption className="bh-muted text-[12px]">{f.note}</figcaption>
        </figure>)}
      </div>
      {!fixedPair && <details className="mt-3 text-[13px]" data-bh-jev14-compare-values><summary className="cursor-pointer text-accent">All values as a table</summary>
        <div className="bh-table-wrap mt-2"><table className="bh-table" data-bh-jev14-compare-table>
          <thead><tr><th scope="col">Spoke</th><th scope="col">A: {s[0].name}</th><th scope="col">B: {s[1].name}</th></tr></thead>
          <tbody>{figures.flatMap((f) => [
            <tr key={`${f.key}-head`} className="bg-[rgb(var(--surface-2))]"><th scope="rowgroup" colSpan={3} className="text-left font-semibold">{f.title}</th></tr>,
            ...f.spokes.map((sp) => <tr key={`${f.key}-${sp.key}`}><th scope="row" className="text-left font-normal">{sp.lines.join(" ")}</th><td className="tabular">{sp.texts[0]}</td><td className="tabular">{sp.texts[1]}</td></tr>),
          ])}</tbody>
        </table></div>
      </details>}
    </div>
  </section>;
}
