"use client";

import { useId, useState } from "react";
import { Radar, Swatch, type Series, type Spoke } from "./JevRadars";

type ImageSystem = {
  key: string;
  name: string;
  tracks: { all: { composite: { score: number }; axes: Record<"intelligence" | "calibration" | "speed" | "cost", number> } };
};

const axes = ["intelligence", "calibration", "speed", "cost"] as const;
const title = (axis: string) => axis[0].toUpperCase() + axis.slice(1);

function SystemPicker({ label, systems, value, other, onPick }: {
  label: string; systems: ImageSystem[]; value: string; other: string; onPick: (key: string) => void;
}) {
  const inputId = useId();
  const listId = useId();
  const current = systems.find((system) => system.key === value)!;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = systems.filter((system) => system.key !== other && system.name.toLowerCase().includes(query.trim().toLowerCase()));
  const choose = (system: ImageSystem) => { onPick(system.key); setQuery(""); setOpen(false); };
  return <div className="relative min-w-0 flex-1">
    <label className="bh-muted mb-1 block text-[13px] font-semibold" htmlFor={inputId}>{label}</label>
    <input id={inputId} type="search" role="combobox" className="bh-input w-full" value={open ? query : current.name}
      aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
      aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].key}` : undefined}
      onFocus={() => { setQuery(""); setActive(0); setOpen(true); }}
      onBlur={() => setOpen(false)} onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((n) => Math.min(n + 1, matches.length - 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActive((n) => Math.max(0, n - 1)); }
        if (event.key === "Enter" && open && matches[active]) { event.preventDefault(); choose(matches[active]); }
        if (event.key === "Escape") { setOpen(false); }
      }} data-bh-mm-picker={label.endsWith("A") ? "a" : "b"} />
    {open && <ul id={listId} role="listbox" aria-label={`${label} matches`} className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-[var(--surface)] p-1 shadow-xl">
      {matches.map((system, index) => <li key={system.key} id={`${listId}-${system.key}`} role="option" aria-selected={index === active}>
        <button type="button" className="w-full rounded px-2 py-2 text-left text-sm hover:bg-accent/10 focus:bg-accent/10"
          onMouseDown={(event) => event.preventDefault()} onClick={() => choose(system)}>
          {system.name} <span className="bh-muted float-right tabular-nums">{system.tracks.all.composite.score.toFixed(2)}</span>
        </button>
      </li>)}
      {matches.length === 0 && <li className="bh-muted px-2 py-2 text-sm">No matching system</li>}
    </ul>}
  </div>;
}

export function ImageJevRadar({ systems }: { systems: ImageSystem[] }) {
  const ranked = [...systems].sort((a, b) => b.tracks.all.composite.score - a.tracks.all.composite.score);
  const [aKey, setA] = useState(ranked[0].key);
  const [bKey, setB] = useState(ranked[1].key);
  const pair = [systems.find((system) => system.key === aKey) ?? ranked[0], systems.find((system) => system.key === bKey) ?? ranked[1]];
  const series: Series[] = [
    { name: pair[0].name, stroke: "rgb(var(--jev-t-jev))", dashed: false, square: false },
    { name: pair[1].name, stroke: "rgb(var(--jev-t-rebuild))", dashed: true, square: true },
  ];
  const spokes: Spoke[] = axes.map((axis) => ({
    key: axis, lines: [title(axis)], thin: [false, false],
    values: pair.map((system) => system.tracks.all.axes[axis]),
    texts: pair.map((system) => system.tracks.all.axes[axis].toFixed(1)),
  }));
  const desc = `${pair[0].name} versus ${pair[1].name}. ${spokes.map((spoke) => `${spoke.lines[0]}: ${spoke.texts[0]} versus ${spoke.texts[1]}`).join("; ")}.`;
  return <section className="mt-10 max-w-6xl" aria-labelledby="image-jev-compare" data-bh-mm-compare>
    <h2 id="image-jev-compare" className="text-2xl font-semibold">Compare two systems</h2>
    <p className="bh-muted mt-1 text-sm">Search any two measured systems. The radar uses the same four 0–100 score axes as the ranking; further out is better.</p>
    <div className="bh-panel mt-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <SystemPicker label="System A" systems={ranked} value={pair[0].key} other={pair[1].key} onPick={setA} />
        <button type="button" className="bh-button shrink-0 self-end text-sm sm:self-auto" onClick={() => { setA(pair[1].key); setB(pair[0].key); }} aria-label="Swap systems">⇄ Swap</button>
        <SystemPicker label="System B" systems={ranked} value={pair[1].key} other={pair[0].key} onPick={setB} />
      </div>
      <ul className="mt-3 space-y-1 text-sm" aria-label="Legend">{pair.map((system, index) => <li key={system.key}><Swatch s={series[index]} />{index ? "B" : "A"}: <b>{system.name}</b> · composite {system.tracks.all.composite.score.toFixed(2)}</li>)}</ul>
      <figure className="mx-auto mt-2 max-w-xl">
        <Radar spokes={spokes} series={series} size={{ w: 420, h: 320, r: 96 }} id="image-jev-radar" title="Image JevBench four-axis comparison" desc={desc} />
        <figcaption className="bh-muted text-xs">Scores are from the frozen Image JevBench v0.1 aggregate; no item-level results are shown.</figcaption>
      </figure>
      <details className="mt-3 text-sm"><summary className="cursor-pointer text-accent">Values as a table</summary>
        <div className="overflow-x-auto"><table className="bh-table mt-2"><thead><tr><th scope="col">Axis</th><th scope="col">{pair[0].name}</th><th scope="col">{pair[1].name}</th></tr></thead>
          <tbody>{spokes.map((spoke) => <tr key={spoke.key}><th scope="row">{spoke.lines[0]}</th><td>{spoke.texts[0]}</td><td>{spoke.texts[1]}</td></tr>)}</tbody></table></div>
      </details>
    </div>
  </section>;
}
