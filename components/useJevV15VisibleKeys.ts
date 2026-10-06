'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { JEV_V15_FILTER_CHANGE_EVENT } from '../lib/jevbench-global-filter-events.mjs';

type FilterChangeDetail = { visibleKeys?: Iterable<string> };

/** Keys the provider hides by default (v1.7: API offerings on the open-weights board), so the server render and the
 *  first client render already match the provider's visible set instead of flashing hidden rows. */
export const JevV15HiddenKeysContext = createContext<ReadonlySet<string>>(new Set());

/**
 * Subscribe to the page-wide JevBench filter set. The initial server render stays
 * unfiltered; the provider publishes the URL-restored set after hydration.
 */
export function useJevV15VisibleKeys(keys: readonly string[]): ReadonlySet<string> {
  const hidden = useContext(JevV15HiddenKeysContext);
  const [visibleKeys, setVisibleKeys] = useState<ReadonlySet<string>>(() => new Set(keys.filter((key) => !hidden.has(key))));

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<FilterChangeDetail>).detail;
      if (detail?.visibleKeys && Symbol.iterator in Object(detail.visibleKeys)) {
        setVisibleKeys(new Set(detail.visibleKeys));
      }
    };
    window.addEventListener(JEV_V15_FILTER_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(JEV_V15_FILTER_CHANGE_EVENT, onChange);
  }, []);

  return visibleKeys;
}
