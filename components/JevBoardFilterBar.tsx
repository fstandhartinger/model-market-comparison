// Florian + Marco De Rossi, 10 Oct 2026: one JevBench board with a clear filter right at the top. The three presets are
// plain URLs, so every view can be shared: /jev-models (open weights), /jev-models/api (API), /jev-models/all (both,
// ranked by Capability). Speed and cost compare within a group, so the Composite is ranked inside a group only.
export type JevBoardView = 'open' | 'api' | 'all';

const VIEWS: Array<{ view: JevBoardView; label: string; href: string; hint: string }> = [
  { view: 'open', label: 'Open weights', href: '/jev-models', hint: 'models we run ourselves on the same GPU' },
  { view: 'api', label: 'API', href: '/jev-models/api', hint: 'hosted APIs at their list price' },
  { view: 'all', label: 'All', href: '/jev-models/all', hint: 'both groups, ranked by Capability' },
];

export function JevBoardFilterBar({ active, counts }: { active: JevBoardView; counts?: Partial<Record<JevBoardView, number>> }) {
  return <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2" data-bh-jev-board-filter={active}>
    <nav aria-label="JevBench board filter" className="inline-flex overflow-hidden rounded-md border border-line" data-bh-jev-board-filter-nav>
      {VIEWS.map(({ view, label, href, hint }) => <a key={view} href={href} title={hint} aria-current={active === view ? 'page' : undefined}
        className={`min-h-9 px-4 py-1.5 text-sm font-semibold ${active === view ? 'bh-release-tab-active bg-accent' : 'text-accent hover:bg-panel'} ${view !== 'open' ? 'border-l border-line' : ''}`}
        data-bh-jev-board-filter-option={view}>{label}{counts?.[view] != null && <span className="ml-1 font-normal opacity-80">{counts[view]}</span>}</a>)}
    </nav>
    <p className="bh-muted min-w-0 flex-1 basis-72 text-sm" data-bh-jev-board-filter-why>Speed and cost are compared within a group: open-weights models run on the same GPU, API models as sold by each provider.{active === 'all' && ' Here both groups share one Capability ranking; Composite, speed and cost carry a group tag.'}</p>
  </div>;
}
