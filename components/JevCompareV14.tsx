"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Radar, Swatch, type Series, type Spoke } from "./JevRadars";
import { JEV_TYPE_LABEL, JEV_TYPE_VAR } from "./jevTypes";

// Page fix (Florian 23 Sep 2026): CR-131 left the v1.3 two-system compare behind the historical disclosure. v1.4 brings it
// back with four radars per pair — the four score axes, accuracy per tier including the sealed set, public hard-tier accuracy
// by family (the v1.2 hard topics) and sealed accuracy by family. Every value is a published system-level aggregate from the
// pinned v1.4 artifact; no sealed item text, gold or per-item result reaches this component. The pair lives in ?compare=a,b.

export type JevCompareRow = {
  key: string; name: string; cls: string; rank: number | null; listing: string; score: number | null; source?: string | null;
  axes: Record<"intelligence" | "calibration" | "speed" | "cost", number | null> | null;
  tiers: Record<"easy" | "standard" | "judge" | "hard" | "sealed", number | null>;
  hard: Record<string, { accuracy: number | null; n: number }> | null;
  sealed: Record<string, number | null> | null;
};

const FAMILY: Record<string, string> = { jev: "blue", "jev-service": "blue", "jev-rebuild": "orange", "llm-baseline": "green", "small-tool-model": "violet", classifier: "magenta", "decision-api": "yellow", reranker: "teal", "raw-logit-control": "grey", "native-logit": "lime", "system-one-open": "red" };
const colour = (cls: string) => `rgb(var(${JEV_TYPE_VAR[cls] ?? JEV_TYPE_VAR["llm-baseline"]}))`;

const AXES = [["intelligence", "Intelligence"], ["calibration", "Calibration"], ["speed", "Speed"], ["cost", "Cost"]] as const;
const TIERS = [["easy", "Easy"], ["standard", "Standard"], ["judge", "Judge"], ["hard", "Hard"], ["sealed", "Sealed"]] as const;
export const HARD_FAMILIES: [string, string][] = [["adversarial", "Adversarial"], ["ambiguous", "Ambiguous"], ["judge_hard", "Judge"], ["long_policy", "Long policy"], ["multi_hop", "Multi-hop"], ["probability", "Probability"], ["routing_hard", "Routing"], ["temporal_numeric", "Temporal / numeric"], ["tradeoff", "Trade-off"], ["trap", "Trap"]];
// CR-153 (Florian 25 Sep 2026): one radar for the current v1.4 question set — the 220 hard-tier decisions (public and held
// out) pooled with the 308 sealed decisions, family by family. Each spoke is correct answers over decisions across both sets,
// so every measured system has a value; the family names differ slightly between the two sets and are matched here.
export const CURRENT_FAMILIES: { key: string; label: string; hard: string[]; sealed: string[] }[] = [
  { key: "ambiguous", label: "Ambiguous / abstain", hard: ["ambiguous"], sealed: ["ambiguous_abstain"] },
  { key: "judge", label: "Judge", hard: ["judge_hard"], sealed: ["judge_hard"] },
  { key: "long_policy", label: "Long policy", hard: ["long_policy"], sealed: ["long_policy"] },
  { key: "multi_hop", label: "Multi-hop", hard: ["multi_hop"], sealed: ["multi_hop"] },
  { key: "probability", label: "Probability", hard: ["probability"], sealed: ["probability"] },
  { key: "temporal_numeric", label: "Temporal / numeric", hard: ["temporal_numeric"], sealed: ["temporal_numeric"] },
  { key: "tradeoff", label: "Trade-off", hard: ["tradeoff"], sealed: ["tradeoff"] },
  { key: "routing", label: "Routing", hard: ["routing_hard"], sealed: [] },
  { key: "trap", label: "Trap / adversarial", hard: ["trap", "adversarial"], sealed: ["trap_adversarial"] },
  { key: "paraphrase", label: "Paraphrase", hard: [], sealed: ["paraphrase_robustness"] },
  { key: "safety", label: "Safety judge", hard: [], sealed: ["safety_judge"] },
];

/** Pooled share correct over the hard and sealed decisions of one family; null when either half is unpublished. */
export function currentFamilyAccuracy(r: JevCompareRow, f: (typeof CURRENT_FAMILIES)[number], hardN: Record<string, number>, sealedN: Record<string, number>): number | null {
  let correct = 0, n = 0;
  for (const k of f.hard) { const v = r.hard?.[k]; if (!v || v.accuracy === null) return null; correct += Math.round(v.accuracy * v.n); n += v.n; }
  for (const k of f.sealed) { const v = r.sealed?.[k]; if (v === null || v === undefined || !sealedN[k]) return null; correct += Math.round(v * sealedN[k]); n += sealedN[k]; }
  return n ? correct / n : null;
}
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

function SystemCombobox({ id, label, value, other, ranked, unranked, onChange }: {
  id: string; label: string; value: string; other: string; ranked: JevCompareRow[]; unranked: JevCompareRow[]; onChange: (key: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const options = [...ranked, ...unranked].filter((row) => row.key !== other);
  const selected = options.find((row) => row.key === value);
  const filtered = options.filter((row) => `${row.name} ${row.rank ?? ''} ${row.listing}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const activeIndex = Math.min(active, Math.max(0, filtered.length - 1));

  useEffect(() => {
    if (open) list.current?.querySelector(`[data-option-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const close = () => { setOpen(false); setQuery(''); setActive(0); };
  const choose = (row: JevCompareRow) => { onChange(row.key); close(); input.current?.focus(); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { setOpen(true); setQuery(''); setActive(event.key === 'ArrowDown' ? 0 : options.length - 1); }
      else setActive((index) => Math.max(0, Math.min(filtered.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (event.key === 'Enter' && open && filtered[activeIndex]) {
      event.preventDefault(); choose(filtered[activeIndex]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault(); close();
    } else if (event.key === 'Tab') close();
  };

  return <div ref={container} className="relative min-w-0 flex-1 text-[13px]" onBlur={(event) => {
    if (container.current?.contains(event.relatedTarget as Node | null)) return;
    // Touch browsers may blur the input before dispatching an option's click.
    if (event.relatedTarget == null) window.setTimeout(() => {
      if (!container.current?.contains(document.activeElement)) close();
    }, 150);
    else close();
  }}>
    <label htmlFor={id} className="bh-muted mb-1 block font-semibold">{label}</label>
    <div className="relative">
      <input ref={input} id={id} type="text" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`}
        aria-activedescendant={open && filtered.length ? `${id}-option-${activeIndex}` : undefined}
        autoComplete="off" spellCheck={false} className="bh-input min-h-11 w-full pr-9" value={open ? query : selected?.name ?? ''}
        placeholder={open ? 'Search systems…' : undefined} onFocus={() => { setOpen(true); setQuery(''); setActive(0); }}
        onChange={(event) => { setOpen(true); setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown}
        data-bh-jev14-compare-pick={id.endsWith('a') ? 'a' : 'b'} />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true">⌄</span>
    </div>
    {open && <div ref={list} id={`${id}-options`} role="listbox" aria-label={`${label} systems`}
      className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto overscroll-contain rounded-md border border-[rgb(var(--line))] bg-[rgb(var(--surface))] p-1 shadow-lg">
      {filtered.length ? filtered.map((row, index) => <div key={row.key} id={`${id}-option-${index}`} role="option" aria-selected={row.key === value}
        data-option-index={index} className={`cursor-pointer rounded px-3 py-2.5 ${index === activeIndex ? 'bg-[rgb(var(--surface-2))]' : ''}`}
        onMouseEnter={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(row)}>
        <span className="font-medium">{row.name}</span><span className="bh-muted ml-2 text-xs">{row.rank === null ? row.listing === 'honorable_mention' ? 'Honorable mention' : 'Partial run' : `#${row.rank}`}</span>
      </div>) : <p className="bh-muted px-3 py-2.5">No matching systems</p>}
    </div>}
  </div>;
}

export function JevCompareV14({ rows, sealedDecisions, hardDecisions, fixedPair = false, heading, hardFamilyN, sealedFamilyN }: {
  rows: JevCompareRow[]; sealedDecisions: number; hardDecisions: number; fixedPair?: boolean; heading?: string;
  hardFamilyN?: Record<string, number>; sealedFamilyN?: Record<string, number>;
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
    // A partial run (Needle 3) publishes no axes at all; it draws at 0 and says so instead of breaking the page.
    values: pair.map((r) => r.axes?.[k] ?? 0),
    texts: pair.map((r) => (r.axes == null ? "not scored" : r.axes[k] == null ? "none (0)" : one(r.axes[k]))),
  }));
  const tierSpokes = accuracySpokes(pair, TIERS, (r, k) => r.tiers[k as keyof JevCompareRow["tiers"]]);
  const pooled = hardFamilyN && sealedFamilyN ? { hard: hardFamilyN, sealed: sealedFamilyN } : null;
  const hardSpokes = pooled
    ? accuracySpokes(pair, CURRENT_FAMILIES.map((f) => [f.key, f.label] as const), (r, k) => currentFamilyAccuracy(r, CURRENT_FAMILIES.find((f) => f.key === k)!, pooled.hard, pooled.sealed))
    : accuracySpokes(pair, HARD_FAMILIES, (r, k) => r.hard?.[k]?.accuracy ?? null);
  const sealedSpokes = accuracySpokes(pair, SEALED_FAMILIES, (r, k) => r.sealed?.[k] ?? null);
  const missingFor = (spokes: Spoke[]) => pair.filter((_, k) => spokes.every((sp) => sp.values[k] === null)).map((r) => r.name);
  // A partial run has only some families of the pooled set (Needle 3: hard tier, no sealed run), so name it when any spoke is empty.
  const partlyMissingFor = (spokes: Spoke[]) => pair.filter((_, k) => spokes.some((sp) => sp.values[k] === null)).map((r) => r.name);
  const missingSentence = (key: string, names: string[]) => {
    if (key === "sealed") return `${names.join(" and ")} has no sealed family breakdown.`;
    if (key === "hard") return pooled
      ? `${names.join(" and ")} ${names.length === 1 ? "was" : "were"} not run on the full v1.4 question set (a partial run); families without both hard-tier and sealed results are left out (—).`
      : `${names.join(" and ")} ${names.length === 1 ? "has" : "have"} no published v1.2 hard-tier family breakdown.`;
    return `${names.join(" and ")} has no published accuracy-tier results.`;
  };
  const status = (r: JevCompareRow) => r.rank !== null ? `#${r.rank}` : r.listing === "honorable_mention" ? "honorable mention, not ranked" : "partial run, not ranked";
  const desc = (title: string, spokes: Spoke[]) => `${title}, ${s[0].name} vs ${s[1].name}. ` + spokes.map((sp) => `${sp.lines.join(" ")}: ${sp.texts[0]} vs ${sp.texts[1]}`).join("; ") + ".";
  const copy = async () => {
    const u = new URL(window.location.href); u.searchParams.set("compare", `${A.key},${B.key}`); u.hash = "compare";
    try { await navigator.clipboard.writeText(u.href); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { window.location.hash = "compare"; }
  };
  const figures: { key: string; title: string; note: string; spokes: Spoke[]; missing: string[]; size: { w: number; h: number; r: number } }[] = [
    { key: "axes", title: "The four score axes", note: "0–100, the values in the table. A label-only system has no calibration (counted as 0).", spokes: axisSpokes, missing: [], size: { w: 420, h: 320, r: 96 } },
    { key: "tiers", title: "Accuracy per tier, incl. sealed", note: `Share correct per tier; Sealed = the ${sealedDecisions} private decisions, aggregate only.`, spokes: tierSpokes, missing: missingFor(tierSpokes), size: { w: 440, h: 340, r: 100 } },
    pooled
      ? { key: "hard", title: "Current question set by family (hard + sealed)", note: `Share correct per family across the ${hardDecisions} hard-tier decisions (public and held out) and the ${sealedDecisions} sealed decisions of v1.4, pooled; Routing is hard-tier only, Paraphrase and Safety judge sealed only.`, spokes: hardSpokes, missing: partlyMissingFor(hardSpokes), size: { w: 460, h: 370, r: 100 } }
      : { key: "hard", title: "Hard tier by family (v1.2 topics)", note: `Share correct within each family of the ${hardDecisions} v1.2 hard-tier decisions (public and held-out).`, spokes: hardSpokes, missing: missingFor(hardSpokes), size: { w: 460, h: 370, r: 100 } },
    { key: "sealed", title: "Sealed set by family", note: "Share correct within each sealed family — system-level aggregates; the items stay private.", spokes: sealedSpokes, missing: missingFor(sealedSpokes), size: { w: 460, h: 370, r: 100 } },
  ];
  return <section id="compare" className="mt-8 scroll-mt-6" aria-labelledby="jev14-compare" data-bh-jev14-compare data-bh-jev14-pair-mode={fixedPair ? 'fixed' : 'selectable'} data-bh-jev14-compare-a={A.key} data-bh-jev14-compare-b={B.key}>
    <h2 id="jev14-compare" className="text-2xl font-semibold">{heading ?? 'Compare two systems'}</h2>
    <p className="bh-muted mt-1 max-w-3xl text-sm">{fixedPair
      ? 'Four radars compare this fixed pair across the score axes, accuracy per tier, and accuracy by family on the hard tier and sealed set. Further out is better on every spoke.'
      : pooled
        ? 'Pick any two. Four radars: the score axes, accuracy per tier including the sealed set, accuracy by family on the current v1.4 question set (hard tier and sealed set together), and the sealed set alone. Further out is better on every spoke; the link keeps the pair.'
        : 'Pick any two. Four radars: the score axes, accuracy per tier including the sealed set, and accuracy by family on the v1.2 hard tier and on the sealed set. Further out is better on every spoke; the link keeps the pair.'}</p>
    <div className="bh-panel mt-3 p-3 sm:p-4">
      {!fixedPair && <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <SystemCombobox id="jev14-compare-a" label="System A" value={A.key} other={B.key} ranked={ranked} unranked={unranked} onChange={setA} />
        <button type="button" className="bh-button shrink-0 self-end text-sm font-semibold sm:self-auto" onClick={() => { setA(B.key); setB(A.key); }} aria-label="Swap system A and system B" data-bh-jev14-compare-swap>⇄ Swap</button>
        <SystemCombobox id="jev14-compare-b" label="System B" value={B.key} other={A.key} ranked={ranked} unranked={unranked} onChange={setB} />
      </div>}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <ul className="space-y-1 text-[13px]" aria-label="Legend" data-bh-jev14-compare-legend>
          {pair.map((r, k) => <li key={k}><Swatch s={s[k]} /><b>{k === 0 ? "A" : "B"}: {r.source ? <a href={r.source} target="_blank" rel="noopener noreferrer" className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent" data-bh-jev-source={r.key}>{r.name}</a> : r.name}</b> <span className="bh-muted" data-bh-jev14-class={r.cls} data-bh-jev14-class-labelled={JEV_TYPE_LABEL[r.cls] ? '1' : '0'}>— {JEV_TYPE_LABEL[r.cls] ?? <code title="Class named in the v1.4.2 artifact; description pending">{r.cls}</code>} · </span><span className="whitespace-nowrap" data-bh-jev14-compare-score={r.score === null ? "" : r.score.toFixed(3)}>Score {one(r.score)} ({status(r)})</span></li>)}
        </ul>
        {!fixedPair && <button type="button" className="bh-button text-xs font-semibold" onClick={copy} data-bh-jev14-compare-copy>{copied ? "Link copied" : "Copy link to this pair"}</button>}
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-5 lg:grid-cols-2">
        {figures.map((f) => <figure key={f.key} className="min-w-0" data-bh-jev14-radar={f.key} data-bh-jev14-radar-pooled={f.key === "hard" && pooled ? "1" : undefined}>
          <h3 className="text-base font-semibold">{f.title}</h3>
          {f.missing.length > 0 && <p className="bh-muted mt-1 text-[12px]" data-bh-jev14-radar-missing={f.key}>{missingSentence(f.key, f.missing)}</p>}
          {missingFor(f.spokes).length < 2
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
