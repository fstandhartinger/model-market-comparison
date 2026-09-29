"use client";
import { useId } from "react";
import type { ScoreKey } from "../lib/types";
import { counted } from "../lib/format";
import { useSettings } from "./SettingsContext";

/** CR-211: the one switch every Main Composite chart shows. Off (default): the chart plots only models whose
 *  Composite rests on all 7 inputs (exact + attached). On: incomplete models are plotted too, drawn hollow/dashed
 *  and labelled "N/7"; they never join a green Pareto line (`frontier`). The setting is shared, so every Composite chart follows the same choice; it never changes a
 *  score, a ranking or a table. Rendered only while the chart plots the Main Composite — other scores keep their
 *  existing behaviour and show no toggle. `hidden` = rows this chart leaves out while the toggle is off;
 *  `shown` = incomplete rows it draws while the toggle is on. */
export function IncompleteCompositeToggle({ score, hidden = 0, shown = 0, frontier = false, className = "" }: { score: ScoreKey; hidden?: number; shown?: number; frontier?: boolean; className?: string }) {
  const s = useSettings();
  const id = useId();
  if (score !== "composite") return null;
  const on = s.includeIncompleteComposites;
  const note = on
    ? shown > 0 ? `${counted(shown, "model")} with fewer than 7 of 7 Composite inputs marked N/7${frontier ? " and left off the green line" : ""}` : "Every plotted model has all 7 of 7 Composite inputs"
    : hidden > 0 ? `${counted(hidden, "model")} with fewer than 7 of 7 Composite inputs not plotted` : "Only models with all 7 of 7 Composite inputs are plotted";
  return <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500 ${className}`} data-bh-incomplete-toggle={on ? "on" : "off"}>
    <label className="inline-flex min-h-7 cursor-pointer items-center gap-1.5 text-gray-400">
      <input type="checkbox" checked={on} onChange={(e) => s.setIncludeIncompleteComposites(e.target.checked)} aria-describedby={id} data-pref="includeIncompleteComposites" />
      <span>Include incomplete composites</span>
    </label>
    <span id={id} data-bh-incomplete-note>{note}.</span>
  </div>;
}
