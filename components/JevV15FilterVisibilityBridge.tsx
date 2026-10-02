'use client';

import { useEffect } from 'react';
import { JEV_V15_FILTER_CHANGE_EVENT } from '../lib/jevbench-global-filter-events.mjs';

type FilterChangeDetail = { visibleKeys?: Iterable<string> };

/** Apply the client provider's filter set to server-rendered v1.5 table rows and bars. */
export function JevV15FilterVisibilityBridge() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-bh-jevbench-v15]');
    if (!root) return;
    const apply = (keys: Set<string>) => {
      root.querySelectorAll<HTMLElement>('[data-bh-jev15-global-filter-row]').forEach((row) => {
        const key = row.dataset.bhJev15GlobalFilterRow;
        const hidden = key ? !keys.has(key) : false;
        row.hidden = hidden;
        row.style.display = hidden ? 'none' : '';
      });
    };
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<FilterChangeDetail>).detail;
      if (detail?.visibleKeys && Symbol.iterator in Object(detail.visibleKeys)) apply(new Set(detail.visibleKeys));
    };
    window.addEventListener(JEV_V15_FILTER_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(JEV_V15_FILTER_CHANGE_EVENT, onChange);
  }, []);

  return null;
}
