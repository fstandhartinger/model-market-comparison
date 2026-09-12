"use client";
import { useState } from 'react';
import { ModelExplorer } from './ModelExplorer';
import type { ClientData } from '../lib/client-model';

export function HomeMode({ data }: { data: ClientData }) {
  const [advanced, setAdvanced] = useState(false);
  return <section aria-label="Recommendation mode">
    <div className="mb-4 flex items-center justify-between rounded-xl border border-line bg-panel p-2"><div className="flex gap-1" role="tablist" aria-label="View mode"><button type="button" role="tab" aria-selected={!advanced} onClick={() => setAdvanced(false)} className={`rounded-lg px-4 py-2 text-sm ${!advanced ? 'bg-accent text-ink' : 'text-gray-300'}`}>Simple</button><button type="button" role="tab" aria-selected={advanced} onClick={() => setAdvanced(true)} className={`rounded-lg px-4 py-2 text-sm ${advanced ? 'bg-accent text-ink' : 'text-gray-300'}`}>Advanced</button></div><p className="bh-muted pr-2 text-xs">{advanced ? 'Full catalog, filters and comparison detail' : 'Set quality and budget; see up to 15 recommended models'}</p></div>
    {!advanced && <div className="mb-4 rounded-xl border border-line bg-panel p-4"><h2 className="font-semibold">Recommended models</h2><p className="bh-muted mt-1 text-sm">Defaults: featured models, Composite Score ≥85, sorted by adjusted cost. Use the score and cost controls above to narrow the shortlist.</p></div>}
    <ModelExplorer data={data} limit={advanced ? undefined : 15} />
  </section>;
}
