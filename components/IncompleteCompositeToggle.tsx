"use client";
import { useId } from "react";
import type { ScoreKey } from "../lib/types";
import { counted } from "../lib/format";
import type { CompositeMarker } from "../lib/client-model";
import { useSettings } from "./SettingsContext";
import { CompositeDot } from "./CompositeDot";

/** CR-211: the one switch every Main Composite chart shows. Off: the chart plots only models whose Composite rests on
 *  all 7 inputs (exact + attached). On — the default since CR-213 (Florian 2026-09-29) — incomplete models are plotted
 *  too, labelled "N/7" and marked by coverage: 4/7–6/7 half-filled, 3/7 or fewer hollow/dashed, 7/7 solid. They join a
 *  green Pareto line like any other model. The setting is shared, so every Composite chart follows the same choice; it
 *  never changes a score, a ranking or a table. Rendered only while the chart plots the Main Composite — other scores
 *  keep their existing behaviour and show no toggle. `hidden` = rows this chart leaves out while the toggle is off;
 *  `shown` = incomplete rows it draws while the toggle is on. */
export function IncompleteCompositeToggle({ score, hidden = 0, shown = 0, className = "" }: { score: ScoreKey; hidden?: number; shown?: number; className?: string }) {
  const s = useSettings();
  const id = useId();
  if (score !== "composite") return null;
  const on = s.showIncompleteComposites;
  const note = on
    ? shown > 0 ? `${counted(shown, "model")} with fewer than 7 of 7 Composite inputs, labelled N/7` : "Every plotted model has all 7 of 7 Composite inputs"
    : hidden > 0 ? `${counted(hidden, "model")} with fewer than 7 of 7 Composite inputs not plotted` : "Only models with all 7 of 7 Composite inputs are plotted";
  return <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500 ${className}`} data-bh-incomplete-toggle={on ? "on" : "off"}>
    <label className="inline-flex min-h-7 cursor-pointer items-center gap-1.5 text-gray-400">
      <input type="checkbox" checked={on} onChange={(e) => s.setShowIncompleteComposites(e.target.checked)} aria-describedby={id} data-pref="showIncompleteComposites" />
      <span>Include incomplete composites</span>
    </label>
    <span id={id} data-bh-incomplete-note>{note}.</span>
    {on && shown > 0 && <span className="inline-flex flex-wrap items-center gap-x-2" data-bh-composite-legend>
      <LegendDot marker="solid" label="7/7 inputs" />
      <LegendDot marker="half" label="4–6/7" />
      <LegendDot marker="hollow" label="3/7 or fewer" />
    </span>}
  </div>;
}

/** CR-213: the three Composite markers, in words beside a small sample of each. */
function LegendDot({ marker, label }: { marker: CompositeMarker; label: string }) {
  return <span className="inline-flex items-center gap-1" data-composite-marker={marker}>
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      {marker === "solid" ? <circle cx={5} cy={5} r={4} fill="rgb(var(--accent))" /> : <CompositeDot cx={5} cy={5} r={4} color="rgb(var(--accent))" marker={marker} coverage={label} strokeWidth={1.2} />}
    </svg>
    <span>{marker === "solid" ? "solid" : marker === "half" ? "half-filled" : "hollow"} = {label}</span>
  </span>;
}
