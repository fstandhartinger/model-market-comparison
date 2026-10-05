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
      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line px-3 font-semibold" data-bh-jev-api-toggle-button>
      <span aria-hidden="true" className={`relative inline-block h-5 w-9 rounded-full transition-colors ${showApi ? 'bg-accent' : 'bg-gray-600'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${showApi ? 'left-[1.1rem]' : 'left-0.5'}`} />
      </span>
      Show API offerings ({measured} measured on v1.6{apiKeys.length > measured ? `, ${apiKeys.length - measured} carried or listed` : ''})
    </button>
    <span className="bh-muted min-w-0 flex-1 basis-64">
      {showApi
        ? <>API offerings are mixed in for comparison, badged <span className="bh-thin-tag bh-flag-tag">API</span> and not ranked here. Their ranking: <a className="text-accent underline" href="/jev-models/api">JevBench API leaderboard</a>.</>
        : <>This board ranks open-weights systems we ran on our own hardware; Jev 1.13.0 is shown as the reference. Hosted APIs are ranked on the <a className="text-accent underline" href="/jev-models/api">JevBench API leaderboard</a>.</>}
    </span>
  </div>;
}
