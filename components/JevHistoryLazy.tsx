"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { JevHistoryPayload } from './JevHistoryContent';

const JevHistoryContent = dynamic(() => import('./JevHistoryContent').then((m) => m.JevHistoryContent), { ssr: false });

export function JevHistoryLazy() {
  const [payload, setPayload] = useState<JevHistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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

  // A link that already names a view inside this section opens it (CR-90's `?scope=`, the v1.2
  // weight preset `?w=`, or the `#jev13-history` anchor). Without this, F-179's lazy disclosure
  // turns a shared scoped link into a page that shows none of what the link asked for — CR-90's
  // "reload restores the scoped URL view" is a verified row. Runs after mount, so the server HTML
  // this section was made light for is unchanged for everyone who did not ask.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('scope') && !url.searchParams.has('w') && url.hash !== '#jev13-history') return;
    setOpen(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <details id="jev13-history" open={open} className="bh-panel mt-10 max-w-5xl scroll-mt-6 p-5" data-bh-jev13-history onToggle={(event) => { setOpen(event.currentTarget.open); if (event.currentTarget.open) void load(); }}>
    <summary className="cursor-pointer text-sm font-semibold">Historical v1.3.0 board: weightings, per-task grid, topic radars and held-out diagnostics</summary>
    <div className="mt-5">
      {!payload && !loading && !error && <p className="bh-muted max-w-4xl text-sm">Open this section to load the earlier public-only board and diagnostics.</p>}
      {loading && <p className="bh-muted text-sm" role="status">Loading the historical board…</p>}
      {error && <p className="text-sm text-[rgb(var(--warn))]" role="alert">{error} <button type="button" className="ml-2 underline" onClick={() => { setError(null); void load(); }}>Try again</button></p>}
      {payload && <JevHistoryContent payload={payload} />}
    </div>
  </details>;
}
