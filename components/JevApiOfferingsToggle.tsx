'use client';

import { useEffect } from 'react';
import { useJevV15Filters } from './JevV15Filters';

/** v1.7 (Florian, 5 Oct 2026): the open-weights board mixes hosted API offerings back in on request. Plain UI state:
 *  no query parameter or hash, so /jev-models stays one URL. API rows stay unranked here; their ranks live on
 *  /jev-models/api. Server-rendered tables mark API rows with data-bh-jev-api-row and follow the same switch. */
export function JevApiOfferingsToggle({ measured }: { measured: number }) {
  const { apiKeys, showApi, setShowApi } = useJevV15Filters();
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('[data-bh-jev-api-row]').forEach((row) => { row.hidden = !showApi; });
  }, [showApi]);
  if (!apiKeys.length) return null;
  return <div className="bh-panel mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 p-3 text-sm" data-bh-jev-api-toggle>
    <button type="button" role="switch" aria-checked={showApi} onClick={() => setShowApi(!showApi)}
      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line px-3 text-left font-semibold" data-bh-jev-api-toggle-button>
      <span aria-hidden="true" className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${showApi ? 'bg-accent' : 'bg-gray-600'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${showApi ? 'left-[1.1rem]' : 'left-0.5'}`} />
      </span>
      Show API offerings <span className="bh-muted font-normal">({measured} measured{apiKeys.length > measured ? ` · ${apiKeys.length - measured} dated or listed` : ''})</span>
    </button>
    <span className="bh-muted min-w-0 flex-1 basis-64">
      {showApi
        ? <>API rows mixed in, tagged <span className="bh-thin-tag bh-flag-tag">API</span>, not ranked here (<a className="text-accent underline" href="/jev-models/all">All</a> ranks both).</>
        : <>Mix the API rows into this view without ranking them.</>}
    </span>
  </div>;
}
