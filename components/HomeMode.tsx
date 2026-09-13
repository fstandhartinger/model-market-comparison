"use client";
import { useState } from 'react';
import { ModelExplorer } from './ModelExplorer';
import { Wizard } from './Wizard';
import type { ClientData } from '../lib/client-model';

type Mode = 'simple' | 'guided' | 'advanced';
const HINT: Record<Mode, string> = {
  simple: 'Say how good and how cheap — get up to 15 recommended models',
  guided: 'Five short questions, then your shortlist',
  advanced: 'Full catalog, filters and comparison detail',
};

export function HomeMode({ data }: { data: ClientData }) {
  // R5.1: Simple is the start view; Advanced holds the full experience; the guided
  // questionnaire (R5.6) is the third way in, not a replacement for either.
  const [mode, setMode] = useState<Mode>('simple');
  const advanced = mode === 'advanced';
  return <section aria-label="Recommendation mode">
      <div className="bh-mode-switch mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel p-2">
      <div className="flex gap-1" role="tablist" aria-label="View mode">
        {(['simple', 'guided', 'advanced'] as Mode[]).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`rounded-lg px-4 py-2 text-sm capitalize ${mode === m ? 'bg-accent text-ink' : 'text-gray-300'}`}>
            {m === 'guided' ? 'Guided' : m === 'simple' ? 'Simple' : 'Advanced'}
          </button>
        ))}
      </div>
      <p className="bh-muted hidden pr-2 text-xs sm:block">{HINT[mode]}</p>
    </div>
    {mode === 'guided' && <Wizard data={data} onFinish={() => setMode('advanced')} />}
    {/* The key remounts the table when the mode changes: defaultSort/defaultAsc seed
        useState, so without it Advanced would inherit Simple's cost sort. */}
    {/* R5.2: Simple lists the featured shortlist sorted by adjusted cost DESCENDING —
        Florian's wording ("über den Preis absteigend sortiert") taken literally. Advanced
        keeps the score-first default from R1.1. */}
    {mode !== 'guided' && <ModelExplorer key={mode} data={data} simple={!advanced}
      limit={advanced ? undefined : 15} defaultSort={advanced ? undefined : "cost"} defaultAsc={advanced ? undefined : false} />}
  </section>;
}
