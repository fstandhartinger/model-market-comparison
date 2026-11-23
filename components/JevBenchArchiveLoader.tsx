'use client';
import { useState, type ComponentType, type ComponentProps } from 'react';
import type { JevBenchV16Board } from './JevBenchV16Board';

type BoardProps = ComponentProps<typeof JevBenchV16Board>;
type Loaded = { Board: ComponentType<BoardProps>; props: BoardProps };
export function JevBenchArchiveLoader({ version }: { version: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const jsonHref = `/api/jevbench/${version}/board`;
  async function load() {
    if (loading) return;
    setLoading(true); setError(false);
    try {
      const [response, { JevBenchV16Board: Board }] = await Promise.all([
        fetch(jsonHref), import('./JevBenchV16Board'),
      ]);
      if (!response.ok) throw new Error('Archive unavailable');
      const data = await response.json();
      if (!data.props?.artifact || data.props.artifact.revision !== version || !data.comparisonCategories) throw new Error('Invalid archive');
      setLoaded({ Board, props: { ...data.props, comparisonCategories: data.comparisonCategories, hideMethod: true } });
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  return <div className="mt-6" data-bh-jev-archive-full>
    {loaded ? <loaded.Board {...loaded.props} /> : <div className="bh-panel p-4">
      <p className="mb-3 text-sm">Load the full board for all rows, charts, filters, breakdowns and methodology.</p>
      {loading && <p role="status" className="mb-3">Loading the full JevBench {version} board…</p>}
      {error && <p role="alert" className="mb-3">The full board could not be loaded. Try again or open the JSON.</p>}
      <button type="button" disabled={loading} onClick={load} className="rounded border border-line px-3 py-2 text-accent disabled:opacity-50">{error ? 'Retry full board' : loading ? 'Loading…' : 'Load full board'}</button>{' · '}
      <a className="text-accent underline" href={jsonHref}>Full board JSON</a>
      <noscript><p className="mt-3">The summary and top rows are available above. All published rows are also available in the full board JSON.</p></noscript>
    </div>}
  </div>;
}
