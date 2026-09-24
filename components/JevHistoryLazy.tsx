"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { JevHistoryPayload } from './JevHistoryContent';

const JevHistoryContent = dynamic(() => import('./JevHistoryContent').then((m) => m.JevHistoryContent), { ssr: false });

export function JevHistoryLazy() {
  const [payload, setPayload] = useState<JevHistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (payload || loading) return;
    setLoading(true);
    try {
      const response = await fetch('/api/jevbench/v1.3/history', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Historical board request failed (${response.status})`);
      setPayload(await response.json() as JevHistoryPayload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The historical board could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  return <details id="jev13-history" className="bh-panel mt-10 max-w-5xl scroll-mt-6 p-5" data-bh-jev13-history onToggle={(event) => { if (event.currentTarget.open) void load(); }}>
    <summary className="cursor-pointer text-sm font-semibold">Historical v1.3.0 board: weightings, per-task grid, topic radars and held-out diagnostics</summary>
    <div className="mt-5">
      {!payload && !loading && !error && <p className="bh-muted max-w-4xl text-sm">Open this section to load the earlier public-only board and diagnostics.</p>}
      {loading && <p className="bh-muted text-sm" role="status">Loading the historical board…</p>}
      {error && <p className="text-sm text-[rgb(var(--warn))]" role="alert">{error} <button type="button" className="ml-2 underline" onClick={() => { setError(null); void load(); }}>Try again</button></p>}
      {payload && <JevHistoryContent payload={payload} />}
    </div>
  </details>;
}
