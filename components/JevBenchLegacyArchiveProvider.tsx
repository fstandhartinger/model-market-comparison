'use client';
import { createContext, useContext, useState, type ComponentType, type ReactNode } from 'react';
import { JevBoardGuides } from './JevBoardGuides';

type Widget = { component: string; props: Record<string, unknown> };
type Payload = { props: Record<string, unknown>; version: string; kind: string; widgets: Record<string, Widget>; render?: { guides?: { href: string; label: string }[] } };
type Render = (widget: Widget, payload: Payload) => ReactNode;
type Loaded = { payload: Payload; renderers: Record<string, Render> };
const Context = createContext<{ loaded: Loaded | null; loading: boolean; error: boolean; load: () => void } | null>(null);
async function renderer(component: string): Promise<Render> {
  // Explicit imports only: JSON never chooses an arbitrary module or executable code.
  let View: ComponentType<any>;
  switch (component) {
    case 'v14-board': View = (await import('./JevModelsV14')).JevModelsV14Board; break;
    case 'v15-board': {
      const { JevBenchV15View } = await import('./JevBenchV15View');
      return (widget, payload) => <JevBenchV15View {...widget.props as any} guides={<JevBoardGuides links={payload.render?.guides ?? []} />} />;
    }
    case 'capability-chart': View = (await import('./JevCapabilityChart')).JevCapabilityChart; break;
    case 'capability-ranking': View = (await import('./JevCapabilityRanking')).JevCapabilityRanking; break;
    case 'bubbles': View = (await import('./JevBubbleChart')).JevBubbleCharts; break;
    case 'historical-supplement': View = (await import('./JevHistoricalSupplement')).JevHistoricalSupplement; break;
    case 'old-new': View = (await import('./JevV170OldNewTable')).JevV170OldNewTable; break;
    default: throw new Error('Unsupported archive widget');
  }
  return widget => <View {...widget.props} />;
}
export function JevBenchLegacyArchiveProvider({ version, children }: { version: string; children: ReactNode }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  async function load() {
    if (loading) return;
    setLoading(true); setError(false);
    try {
      const response = await fetch(`/api/jevbench/${version}/board`);
      if (!response.ok) throw new Error('Archive unavailable');
      const payload = await response.json() as Payload;
      if (payload.version !== version || !payload.props || !payload.widgets?.board) throw new Error('Invalid archive');
      payload.widgets.board.props = payload.props; // The wire format carries the original board props only once.
      const entries = await Promise.all(Object.entries(payload.widgets).map(async ([part, widget]) => [part, await renderer(widget.component)] as const));
      setLoaded({ payload, renderers: Object.fromEntries(entries) });
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  return <Context.Provider value={{ loaded, loading, error, load }}>{children}</Context.Provider>;
}
export function JevBenchLegacyArchiveLoader({ version, part, children }: { version: string; part: string; children?: ReactNode }) {
  const context = useContext(Context);
  if (!context) throw new Error('Archive provider missing');
  const { loaded, loading, error, load } = context;
  if (loaded && loaded.payload.version === version) {
    const widget = loaded.payload.widgets[part], render = loaded.renderers[part];
    return widget && render ? render(widget, loaded.payload) : null;
  }
  return <div data-bh-jev-legacy-archive={part}>
    {children}
    <div className="bh-panel mt-4 p-4 text-sm">
      {loading && <p role="status" className="mb-3">Loading the full JevBench {version} board…</p>}
      {error && <p role="alert" className="mb-3">The full board could not be loaded. Try again or open the JSON.</p>}
      <button type="button" disabled={loading} onClick={load} className="rounded border border-line px-3 py-2 text-accent disabled:opacity-50">{error ? 'Retry full board' : loading ? 'Loading…' : 'Load full board'}</button>{' · '}
      <a className="text-accent underline" href={`/api/jevbench/${version}/board`}>Full board JSON</a>
      <noscript><p className="mt-3">The summary, top rows and method text remain available here. All rows are available in the full board JSON.</p></noscript>
    </div>
  </div>;
}
