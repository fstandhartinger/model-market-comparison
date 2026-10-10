'use client';

import { useEffect } from 'react';
import { useJevV15Filters } from './JevV15Filters';

const SWITCH = (on: boolean) => <span aria-hidden="true" className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-gray-600'}`}>
  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[1.1rem]' : 'left-0.5'}`} />
</span>;

/** Florian 10 Oct 2026: one compact notice on top of each JevBench board — which group this board shows (open weights or
 *  API-hosted), a link to the other, and a "Show all mixed" switch. On the open-weights board the switch mixes the API
 *  rows in place (unranked, tagged, as since v1.7); on the API board it opens /jev-models/all, where both groups share
 *  one Capability ranking. Server-rendered tables mark API rows with data-bh-jev-api-row and follow the same switch. */
export function JevApiOfferingsToggle({ measured, scope = 'open' }: { measured: number; scope?: 'open' | 'api' | 'all' }) {
  const { apiKeys, showApi, setShowApi } = useJevV15Filters();
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('[data-bh-jev-api-row]').forEach((row) => { row.hidden = !showApi; });
  }, [showApi]);
  const tab = (view: 'open' | 'api', label: string, href: string) => <a href={href} aria-current={scope === view ? 'page' : undefined}
    className={`min-h-9 px-3 py-1.5 font-semibold ${scope === view ? 'bh-release-tab-active bg-accent' : 'text-accent hover:bg-panel'} ${view === 'api' ? 'border-l border-line' : ''}`}
    data-bh-jev-board-filter-option={view}>{label}</a>;
  const inPlace = scope === 'open' && apiKeys.length > 0;
  const on = scope === 'all' || (inPlace && showApi);
  return <div className="bh-panel mt-4 p-3 text-sm" data-bh-jev-api-toggle data-bh-jev-board-filter={scope}>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <nav aria-label="JevBench board" className="inline-flex overflow-hidden rounded-md border border-line" data-bh-jev-board-filter-nav>
        {tab('open', 'Open weights', '/jev-models')}{tab('api', 'API-hosted', '/jev-models/api')}
      </nav>
      {inPlace
        ? <button type="button" role="switch" aria-checked={showApi} onClick={() => setShowApi(!showApi)}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line px-3 text-left font-semibold" data-bh-jev-api-toggle-button>
            {SWITCH(showApi)} Show all mixed <span className="bh-muted font-normal">(+{measured} API)</span>
          </button>
        : <a href={scope === 'all' ? '/jev-models' : '/jev-models/all'} role="switch" aria-checked={on}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line px-3 font-semibold" data-bh-jev-api-toggle-button>
            {SWITCH(on)} Show all mixed
          </a>}
      <span className="bh-muted min-w-0 flex-1 basis-64" data-bh-jev-board-filter-why>
        {on
          ? scope === 'all'
            ? <>Both groups, ranked together by Capability; API rows are tagged <span className="bh-thin-tag bh-flag-tag">API</span>.</>
            : <>API rows mixed in, tagged <span className="bh-thin-tag bh-flag-tag">API</span>, not ranked here · <a className="text-accent underline" href="/jev-models/all">ranked together</a>.</>
          : 'Speed and cost are compared within a group: open weights on the same GPU, APIs as sold by each provider.'}
      </span>
    </div>
  </div>;
}
