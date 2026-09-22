"use client";
import type { ReactNode } from "react";
import { useSettings } from "./SettingsContext";
import { benchmaxxingAdjustedComposite } from "../lib/composite.mjs";
import { num } from "../lib/format";

/** CR-74.4: a model page's Main Composite under the "Include Benchmaxxing signal in the score" option. The server
 *  render uses the default (on); a stored "off" swaps to the raw value once settings have loaded. */
export function CompositeScoreValue({ raw, signal, tag }: { raw: number | null; signal: number | null; tag?: ReactNode }) {
  const { includeBenchmaxxing } = useSettings();
  const shown = benchmaxxingAdjustedComposite(raw, signal, includeBenchmaxxing);
  const penalty = raw != null && shown != null ? raw - shown : 0;
  return <>
    {/* F-161 (Fable pass 31): a thin-evidence tag sits beside the number, outside the value element, so the value stays a number. */}
    <div className="flex flex-wrap items-baseline gap-x-2"><p className="text-4xl font-bold tabular" data-bh-composite-value>{num(shown)}</p>{tag}</div>
    {penalty > 0 && <p className="text-xs text-gray-500" data-bh-composite-benchmaxxing>includes −{num(penalty)} for its Benchmaxxing signal (from {num(raw)}; <a className="text-accent underline" href="/about#score">why</a>, switch off in Options)</p>}
  </>;
}
