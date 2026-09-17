"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "./SettingsContext";
import { benchmaxxingCompositeOf } from "../lib/composite-setting";
import { BenchmaxxingOverview } from "./BenchmaxxingOverview";
import { DEFAULT_BENCHMAXXING_PRESET, presetRows, presetShowing, type BenchmaxxingOverviewRow, type BenchmaxxingPreset, type CompositeOf } from "../lib/benchmaxxing-presets";
import type { BenchmaxxingLevel } from "../lib/benchmaxxing-levels.mjs";
import { BenchmaxxingReport, type BenchmaxxingModel, type BenchmaxxingReportData } from "./BenchmaxxingReport";

/** CR-15.2/15.4 (Florian 2026-09-15): master-detail. The table (a changeable preset, Featured by
 *  default) is the master; the report follows the selected row. Compare mode keeps model A and
 *  takes the next selected row as B. `?model=` deep links (one or two) keep working. */
export function BenchmaxxingWorkbench({ rows, models, initial, levelCounts, uncertainCount, tagAverage, minComparisons, tagMinComparisons, minTopics, compositeOf: compositeOfProp }: {
  rows: BenchmaxxingOverviewRow[];
  models: BenchmaxxingModel[];
  initial: { id: string; report: BenchmaxxingReportData } | null;
  /** CR-74.1: tagged families per level. */
  levelCounts: Record<BenchmaxxingLevel, number>;
  /** CR-77.2: tagged families whose tag rests on thin evidence. */
  uncertainCount?: number;
  /** CR-65.6: catalog average of the signal; a tag needs its interval above it. */
  tagAverage: number | null;
  minComparisons: number;
  tagMinComparisons: number;
  minTopics: number;
  /** CR-74.2: the composite the presets rank by (default row.composite); the CR-74.4 toggle passes the penalised one. */
  compositeOf?: CompositeOf;
}) {
  // CR-74.4: Top 50 / Featured order follow the Options checkbox "Include Benchmaxxing signal in the score".
  const { includeBenchmaxxing } = useSettings();
  const compositeOf = useMemo(() => compositeOfProp ?? benchmaxxingCompositeOf(includeBenchmaxxing), [compositeOfProp, includeBenchmaxxing]);
  const [preset, setPreset] = useState<BenchmaxxingPreset>(DEFAULT_BENCHMAXXING_PRESET);
  const [showAll, setShowAll] = useState(false);
  const [ids, setIds] = useState<string[]>(initial ? [initial.id] : []);
  const [compare, setCompare] = useState(false);
  const touched = useRef(false);

  const [focusRadar, setFocusRadar] = useState(false);
  useEffect(() => {
    // F-104: the selection follows the URL on direct load and on browser back/forward (popstate).
    const fromUrl = () => {
      const wanted = new URLSearchParams(location.search).getAll("model").filter((id) => models.some((m) => m.id === id));
      if (!wanted.length) return;
      const unique = [...new Set(wanted)].slice(0, 2);
      setIds(unique); setCompare(unique.length === 2);
      const place = presetShowing(rows, unique[0], DEFAULT_BENCHMAXXING_PRESET, compositeOf);
      if (place) { setPreset(place.preset); setShowAll(place.showAll); }
      if (location.hash === "#radar") setFocusRadar(true);
    };
    fromUrl();
    window.addEventListener("popstate", fromUrl);
    return () => window.removeEventListener("popstate", fromUrl);
  }, [models, rows, compositeOf]);
  useEffect(() => {
    if (!touched.current) return;
    const q = new URLSearchParams(location.search); q.delete("model"); ids.forEach((id) => q.append("model", id));
    history.replaceState(null, "", `${location.pathname}${q.size ? `?${q}` : ""}${location.hash}`);
  }, [ids]);

  const select = (id: string) => {
    touched.current = true;
    setIds((old) => !compare ? [id] : id === old[0] ? old : [old[0], id]);
  };
  // CR-43.3: the quick look's "full report" link selects that model alone and moves focus/scroll to #radar
  // once its report is ready (same landing as the F-104 deep link); the URL gains ?model=…#radar.
  const openReport = (id: string) => {
    touched.current = true;
    history.replaceState(null, "", `${location.pathname}${location.search}#radar`);
    setCompare(false); setIds([id]); setFocusRadar(true);
  };
  const toggleCompare = () => {
    touched.current = true;
    if (compare) { setCompare(false); setIds((old) => old.slice(0, 1)); return; }
    setCompare(true);
    // Start with the next model of the current list, so the side-by-side view is never empty.
    setIds((old) => { const next = presetRows(rows, preset, compositeOf).find((r) => r.id !== old[0]); return next ? [old[0], next.id] : old; });
  };

  return <>
    <BenchmaxxingOverview rows={rows} preset={preset} onPreset={(p) => { setPreset(p); setShowAll(false); }} selected={ids} onSelect={select} onOpenReport={openReport}
      showAll={showAll} onShowAll={setShowAll} levelCounts={levelCounts} uncertainCount={uncertainCount} compositeOf={compositeOf} tagAverage={tagAverage} minComparisons={minComparisons} tagMinComparisons={tagMinComparisons} minTopics={minTopics} />
    <BenchmaxxingReport models={models} ids={ids} initial={initial} compare={compare} onToggleCompare={toggleCompare} focusOnReady={focusRadar} onFocused={() => setFocusRadar(false)} />
  </>;
}
