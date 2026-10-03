"use client";
import { useEffect, useState } from "react";
import { Radar, Swatch, type Spoke, type Series } from "./JevRadars";

import type { LanguageComparisonView } from "../lib/jevbench-languages-v16.mjs";
/** Optional comparison panel. Supply independently reviewed aggregate data. */
export type LanguageComparisonPanel = LanguageComparisonView;
const raw = (value: number | null) => value === null ? "Unavailable" : value.toFixed(1);

export function JevLanguageComparisonV16({ view, pair, onSplitChange }: {
  view: LanguageComparisonPanel; pair: [string, string]; onSplitChange: (split: "public" | "sealed") => void;
}) {
  const languageKeys = view.languages.map((language) => language.key).join("|");
  const [selected, setSelected] = useState(() => view.languages.slice(0, 6).map((language) => language.key));
  useEffect(() => { setSelected(view.languages.slice(0, 6).map((language) => language.key)); }, [languageKeys]);
  const systems = pair.map((key) => view.systems[key]);
  if (systems.some((system) => !system)) return <p className="bh-muted">Language diagnostics are unavailable for this pair.</p>;
  const series: Series[] = systems.map((system, index) => ({ name: system.name,
    stroke: index === 0 ? "rgb(var(--jev-t-jev))" : "rgb(var(--jev-t-rebuild))", dashed: index === 1, square: index === 1 }));
  const plotted = view.languages.filter((language) => selected.includes(language.key)).slice(0, 8);
  const spokes: Spoke[] = plotted.map((language) => {
    const cells = systems.map((system) => system[view.split][language.key]);
    return { key: language.key, lines: [language.label],
      values: cells.map((cell) => cell?.status === "measured" && cell.cc !== null ? Math.max(0, Math.min(100, cell.cc)) : null),
      texts: cells.map((cell) => cell?.status === "measured" ? cell.n < view.minN ? `n=${cell.n}` : raw(cell.cc) : "Unavailable"),
      thin: cells.map((cell) => !cell || cell.status !== "measured" || cell.n < view.minN),
      tip: `${language.label}: ${view.split}; ${cells.map((cell, i) => `${systems[i].name}: n=${cell?.n ?? 0}/${cell?.expected_n ?? 0}, ${cell?.measured_on ?? "not measured"}`).join("; ")}` };
  });
  function toggle(key: string) {
    setSelected((current) => current.includes(key) ? current.filter((entry) => entry !== key) : current.length < 8 ? [...current, key] : current);
  }
  return <section className="mt-8" aria-labelledby="jev16-language-heading" data-bh-jev16-language-diagnostics>
    <h3 id="jev16-language-heading" className="text-xl font-semibold">Language diagnostics — {view.basis}</h3>
    <p className="bh-muted mt-1 text-sm">Separate from the unchanged 1,500-item headline. These are Choice-only results on the {view.split} supplement, not Capability Scores. Hosted APIs use public supplementary items only; their original sealed measurement keeps its date.</p>
    <label className="mt-3 inline-flex items-center gap-2 text-sm">Item split
      <select className="rounded border border-line bg-surface px-2 py-1" value={view.split} onChange={(event) => onSplitChange(event.target.value as "public" | "sealed")}>
        <option value="public">Public</option><option value="sealed">Sealed (local models only)</option>
      </select>
    </label>
    {!view.comparable && <p role="status" className="bh-muted mt-2 text-sm">Comparison unavailable: {view.reason ?? "The systems do not share this input scope."} The table retains each system’s own scope.</p>}
    <fieldset className="mt-3 text-sm"><legend>Radar languages (at most 8; the table includes every language)</legend>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">{view.languages.map((language) => <label key={language.key} className="inline-flex gap-1.5">
        <input type="checkbox" checked={selected.includes(language.key)} disabled={!selected.includes(language.key) && selected.length >= 8} onChange={() => toggle(language.key)} />{language.label}
      </label>)}</div>
    </fieldset>
    {view.comparable && spokes.filter((spoke) => spoke.values.every((value, index) => value !== null && !spoke.thin[index])).length >= 3 && <figure className="mt-4 max-w-xl">
      <div className="flex flex-wrap gap-4 text-sm">{series.map((item) => <span key={item.name}><Swatch s={item} />{item.name}</span>)}</div>
      <Radar spokes={spokes} series={series} size={{ w: 600, h: 430, r: 120 }} id="jev16-language-radar" title={`Choice-only language comparison: ${view.split}`} desc="Chance-corrected competence on the same input scope. Raw negative values remain in the table and labels; only radar coordinates clip at zero. Missing and low-count cells are not plotted." />
    </figure>}
    <p className="bh-muted mt-2 text-xs">0 means chance, 100 means perfect. Negative values are retained below. Radar coordinates clip at zero; cells below n={view.minN} are not plotted.</p>
    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="sr-only">All languages, {view.basis}, {view.split} split: own-scope counts and measurement dates</caption>
      <thead><tr><th scope="col" className="p-2">Language / review basis</th>{systems.map((system, i) => <th scope="col" key={pair[i]} className="p-2">{system.name} · {view.split}</th>)}</tr></thead>
      <tbody>{view.languages.map((language) => <tr key={language.key} className="border-t border-line">
        <th scope="row" className="p-2 font-normal"><b>{language.label}</b><span className="bh-muted block text-xs">{language.native_review_basis}</span></th>
        {systems.map((system, i) => { const cell = system[view.split][language.key]; return <td key={pair[i]} className="p-2 tabular align-top">
          <b>{cell?.status === "measured" ? raw(cell.cc) : "Unavailable"}</b>
          {cell?.status === "measured" && cell.accuracy !== null && <span className="bh-muted ml-2">accuracy {(cell.accuracy * 100).toFixed(1)}%</span>}
          <span className="bh-muted block text-xs">n={cell?.n ?? 0}/{cell?.expected_n ?? 0} · {view.split} · {cell?.measured_on ?? "not measured"}</span>
          {cell?.status === "measured" ? <span className="bh-muted block text-xs">{cell.non_ok_n} non-OK decisions counted wrong</span> : <span className="bh-muted block text-xs">{cell?.reason ?? "No per-language values."}</span>}
        </td>; })}
      </tr>)}</tbody>
    </table></div>
    {systems.some((system) => system.carried_base) && <div className="bh-muted mt-3 text-xs">{systems.map((system, i) => system.carried_base && <p key={pair[i]}>
      {system.name}: original measurement carried from {system.carried_base.measured_on} · {system.carried_base.revision} · method {system.carried_base.method_version} · {system.carried_base.basis} · n={system.carried_base.n}. This is separate from the supplementary language cells.
    </p>)}</div>}
    <details className="mt-3 text-xs"><summary className="cursor-pointer text-accent">Language diagnostic method and provenance</summary>
      <p className="bh-muted mt-1">{view.method.description}</p><p className="bh-muted mt-1 break-all">Generated {view.generated_utc} · method {view.method.version} · SHA-256 {view.method.source_sha256}</p>
    </details>
  </section>;
}
