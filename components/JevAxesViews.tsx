"use client";

import { useEffect, useState, type ReactNode } from 'react';

// F-224 (Fable pass 42, supersedes F-220): the per-system table carried 17 columns and scrolled sideways inside its panel
// at 1440 — a desktop table has to fit its panel, and the remedy is to split it by what is compared, never to shrink the
// type. Two views, one pill pair, the same rows: "Axes" holds the four score axes and the overfit pair, "Types & cost"
// the per-request-type competence, latency, price and endpoint. Both panes stay in the document (the hidden one is not
// laid out), so the sticky name column and every row marker behave as before. `?axes=types` deep-links the second view;
// it is read from `window.location` in an effect, the same way the score chart reads `?view=` and `?w=`.
export function JevAxesViews({ axes, types }: { axes: ReactNode; types: ReactNode }) {
  const [view, setView] = useState<'axes' | 'types'>('axes');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('axes') === 'types') setView('types');
  }, []);
  const choose = (next: 'axes' | 'types') => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === 'types') url.searchParams.set('axes', 'types'); else url.searchParams.delete('axes');
    window.history.replaceState(window.history.state, '', url.toString());
  };
  return <>
    <div className="bh-jev-viewby mt-3" data-bh-jev15-axes-viewby>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5" role="group" aria-label="Compare the systems by">
        <span className="text-sm font-semibold">Compare:</span>
        <button type="button" className="bh-viewby-btn" aria-pressed={view === 'axes'} onClick={() => choose('axes')} data-bh-jev15-axes-view-btn="axes">Axes</button>
        <button type="button" className="bh-viewby-btn" aria-pressed={view === 'types'} onClick={() => choose('types')} data-bh-jev15-axes-view-btn="types">Types &amp; cost</button>
      </div>
    </div>
    <div hidden={view !== 'axes'} data-bh-jev15-axes-pane="axes">{axes}</div>
    <div hidden={view !== 'types'} data-bh-jev15-axes-pane="types">{types}</div>
  </>;
}
