"use client";
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ClientData } from '../lib/client-model';
const PriceComparison = dynamic(() => import('./CompareView').then((m) => m.CompareView), { loading: () => <p role="status" className="bh-empty min-h-80">Preparing price comparison…</p> });
export function ComparePricePanel() {
  const [data, setData] = useState<ClientData | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function load() {
    if (busy || data) return; setBusy(true); setError('');
    try { const response = await fetch('/api/price-comparison'); if (!response.ok) throw new Error('Price comparison could not be loaded.'); setData(await response.json()); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <details className="bh-panel mt-6 p-5" onToggle={(e) => { if (e.currentTarget.open) void load(); }}><summary className="font-semibold">Price &amp; provider comparison · separate two-model selection</summary><p className="my-4 text-sm bh-muted">This price view has its own A/B selection and uses the global price and provider filters. Benchmark exploration above includes the full catalog.</p>{data ? <PriceComparison data={data} /> : <div className="bh-empty min-h-80" role="status">{error || 'Loading price and provider evidence…'}{error && <button className="bh-button mt-3" onClick={() => void load()}>Retry price comparison</button>}</div>}</details>;
}
