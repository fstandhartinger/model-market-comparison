"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";

// CR-62.1: one request per key and dataset version for the whole browser session; pages that share a
// payload (Charts, Scatter, Providers, EU …) reuse it, and the versioned URL is HTTP-cacheable.
const inflight = new Map<string, Promise<unknown>>();
function load(key: string, version: string): Promise<unknown> {
  const url = `/api/page-data/${key}?v=${encodeURIComponent(version)}`;
  let p = inflight.get(url);
  if (!p) {
    p = fetch(url).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
    p.catch(() => inflight.delete(url));
    inflight.set(url, p);
  }
  return p;
}

/** Renders `children(data)` once the page's data has arrived; a height-reserving placeholder until then. */
export function PageData<T>({ dataKey, version, label, children }: { dataKey: string; version: string; label: string; children: (data: T) => ReactNode }) {
  const [state, setState] = useState<{ data: T | null; error: boolean }>({ data: null, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    load(dataKey, version).then((data) => { if (live) setState({ data: data as T, error: false }); }, () => { if (live) setState({ data: null, error: true }); });
    return () => { live = false; };
  }, [dataKey, version, attempt]);
  const retry = useCallback(() => { setState({ data: null, error: false }); setAttempt((a) => a + 1); }, []);
  if (state.data) return <>{children(state.data)}</>;
  // The placeholder keeps the footer below the first screen, so the content arriving is not a layout shift.
  return <div className="bh-deferred min-h-[85vh]" aria-busy={!state.error} aria-live="polite">
    {state.error
      ? <p className="bh-muted py-10 text-sm">{label} could not be loaded. <button type="button" onClick={retry} className="text-accent underline">Try again</button></p>
      : <p className="bh-muted py-10 text-sm"><span className="bh-deferred-pulse">Loading {label.toLowerCase()}…</span></p>}
  </div>;
}
