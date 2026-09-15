"use client";
import { useEffect, useRef, useState } from "react";
import { BenchmaxxingOverview, presetRows, type BenchmaxxingOverviewRow, type BenchmaxxingPreset } from "./BenchmaxxingOverview";
import { BenchmaxxingReport, type BenchmaxxingModel, type BenchmaxxingReportData } from "./BenchmaxxingReport";

/** CR-15.2/15.4 (Florian 2026-09-15): master-detail. The table (a changeable preset, Featured by
 *  default) is the master; the report follows the selected row. Compare mode keeps model A and
 *  takes the next selected row as B. `?model=` deep links (one or two) keep working. */
export function BenchmaxxingWorkbench({ rows, models, initial, taggedCount, minComparisons, minTopics }: {
  rows: BenchmaxxingOverviewRow[];
  models: BenchmaxxingModel[];
  initial: { id: string; report: BenchmaxxingReportData } | null;
  taggedCount: number;
  minComparisons: number;
  minTopics: number;
}) {
  const [preset, setPreset] = useState<BenchmaxxingPreset>("featured");
  const [showAll, setShowAll] = useState(false);
  const [ids, setIds] = useState<string[]>(initial ? [initial.id] : []);
  const [compare, setCompare] = useState(false);
  const touched = useRef(false);

  useEffect(() => {
    const wanted = new URLSearchParams(location.search).getAll("model").filter((id) => models.some((m) => m.id === id));
    if (!wanted.length) return;
    const unique = [...new Set(wanted)].slice(0, 2);
    setIds(unique); setCompare(unique.length === 2);
  }, [models]);
  useEffect(() => {
    if (!touched.current) return;
    const q = new URLSearchParams(location.search); q.delete("model"); ids.forEach((id) => q.append("model", id));
    history.replaceState(null, "", `${location.pathname}${q.size ? `?${q}` : ""}${location.hash}`);
  }, [ids]);

  const select = (id: string) => {
    touched.current = true;
    setIds((old) => !compare ? [id] : id === old[0] ? old : [old[0], id]);
  };
  const toggleCompare = () => {
    touched.current = true;
    if (compare) { setCompare(false); setIds((old) => old.slice(0, 1)); return; }
    setCompare(true);
    // Start with the next model of the current list, so the side-by-side view is never empty.
    setIds((old) => { const next = presetRows(rows, preset).find((r) => r.id !== old[0]); return next ? [old[0], next.id] : old; });
  };

  return <>
    <BenchmaxxingOverview rows={rows} preset={preset} onPreset={(p) => { setPreset(p); setShowAll(false); }} selected={ids} onSelect={select}
      showAll={showAll} onShowAll={setShowAll} taggedCount={taggedCount} minComparisons={minComparisons} minTopics={minTopics} />
    <BenchmaxxingReport models={models} ids={ids} initial={initial} compare={compare} onToggleCompare={toggleCompare} />
  </>;
}
