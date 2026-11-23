'use client';
import { useCallback, useSyncExternalStore } from 'react';

export type ArchiveData = { props: any; comparisonCategories?: unknown };
type Entry = { data: ArchiveData | null; promise?: Promise<ArchiveData>; listeners: Set<() => void> };
const entries = new Map<string, Entry>();
function entry(version: string): Entry {
  let value = entries.get(version);
  if (!value) { value = { data: null, listeners: new Set() }; entries.set(version, value); }
  return value;
}
function prune() {
  for (const [version, value] of entries) {
    if (entries.size <= 4) break;
    if (!value.listeners.size && value.data) entries.delete(version);
  }
}
/** The board and long release notes share one static JSON request, including retries. */
export function fetchJevArchiveData(version: string): Promise<ArchiveData> {
  const value = entry(version);
  if (!value.promise) {
    value.promise = fetch(`/api/jevbench/${version}/board`).then(async response => {
      if (!response.ok) throw new Error('Archive unavailable');
      const data = await response.json() as ArchiveData;
      if (!data.props?.artifact || data.props.artifact.revision !== version) throw new Error('Invalid archive');
      value.data = data;
      for (const notify of value.listeners) notify();
      prune();
      return data;
    }).catch(error => { value.promise = undefined; throw error; });
  }
  return value.promise;
}
export function useJevArchiveData(version: string) {
  const subscribe = useCallback((notify: () => void) => {
    const value = entry(version); value.listeners.add(notify);
    return () => { value.listeners.delete(notify); prune(); };
  }, [version]);
  const snapshot = useCallback(() => entry(version).data, [version]);
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
