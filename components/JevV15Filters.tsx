'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  JEV_CLASS_STATUSES,
  JEV_NUMERIC_FIELDS,
  JEV_ROW_KINDS,
  defaultJevFilters,
  distinctJevValues,
  filterJevRows,
  isJevFilterActive,
  jevFieldHasValues,
  jevHasNewRows,
  normalizeJevFilters,
  parseJevFilters,
  resetJevFilterParams,
  serializeJevFilters,
  type JevV15ClassStatus,
  type JevV15FilterState,
  type JevV15NumericField,
  type JevV15RowMeta,
  type JevV15RowKind,
} from '../lib/jevbench-global-filters.mjs';
import { JEV_V15_ELIGIBILITY_CHANGE_EVENT, JEV_V15_FILTER_CHANGE_EVENT } from '../lib/jevbench-global-filter-events.mjs';
import { MultiCombobox } from './MultiCombobox';
import { JevV15HiddenKeysContext } from './useJevV15VisibleKeys';

const NO_KEYS: string[] = [];

export type { JevV15RowMeta };

/** CR-269: reusable client-side JevBench filter provider + panel.
 *
 *  The lead maps each release's systems into `JevV15RowMeta[]` and wraps the
 *  interactive page in `<JevV15FilterProvider rows={...}>`; charts and tables
 *  then read `visibleKeys` / `visibleRows` from `useJevV15Filters()`.
 *
 *  Filter state lives in the URL under `jf-*` keys (see lib/jevbench-global-filters.mjs),
 *  which never collide with the page's `w`, `view`, `costcap` or `latcap`
 *  parameters. Discrete changes push a history entry (back/forward restores
 *  filters); the search box replaces in place. The server render and the first
 *  client render use the default state, then the URL is read on mount — a
 *  shared link with filters therefore flashes unfiltered for one frame.
 */

export interface JevV15FilterContextValue {
  rows: JevV15RowMeta[];
  /** Normalized state: numeric ranges for fields with no values in the current release are cleared. */
  filters: JevV15FilterState;
  /** Apply a partial update and write it to the URL. `push: false` uses replaceState (search-as-you-type). */
  setFilters: (patch: Partial<JevV15FilterState>, options?: { push?: boolean }) => void;
  /** Clear only the JevBench filter keys; pushed as a history entry. */
  resetFilters: () => void;
  visibleKeys: Set<string>;
  visibleRows: JevV15RowMeta[];
  total: number;
  visible: number;
  active: boolean;
  /** Which numeric range controls may be enabled for the current release. */
  numericAvailable: Record<JevV15NumericField, boolean>;
  newAvailable: boolean;
  providers: string[];
  families: string[];
  licences: string[];
  /** v1.7 open-weights board: API offerings stay hidden until "Show API offerings" is on (UI state only, never in the URL). */
  apiKeys: string[];
  showApi: boolean;
  setShowApi: (show: boolean) => void;
}

const JevV15FilterContext = createContext<JevV15FilterContextValue | null>(null);

export function JevV15FilterProvider({ rows, apiKeys = NO_KEYS, children }: { rows: JevV15RowMeta[]; apiKeys?: string[]; children?: ReactNode }) {
  const [filters, setFiltersState] = useState<JevV15FilterState>(defaultJevFilters);
  const [showApi, setShowApi] = useState(false);
  const hiddenKeys = useMemo(() => new Set(showApi ? [] : apiKeys), [apiKeys, showApi]);
  const filtersRef = useRef(filters);
  const [eligibilityOverrides, setEligibilityOverrides] = useState<Map<string, JevV15RowMeta['jevClass']>>(() => new Map());
  const effectiveRows = useMemo(() => rows.map((row) => {
    const override = eligibilityOverrides.get(row.key);
    return override ? { ...row, jevClass: override } : row;
  }), [rows, eligibilityOverrides]);

  const writeUrl = useCallback((state: JevV15FilterState, push: boolean) => {
    const url = new URL(window.location.href);
    url.search = serializeJevFilters(url.searchParams, state).toString();
    if (push) window.history.pushState(window.history.state, '', url);
    else window.history.replaceState(window.history.state, '', url);
  }, []);

  const setFilters = useCallback((patch: Partial<JevV15FilterState>, options?: { push?: boolean }) => {
    const next = normalizeJevFilters({ ...filtersRef.current, ...patch }, effectiveRows);
    filtersRef.current = next;
    setFiltersState(next);
    writeUrl(next, options?.push !== false);
  }, [writeUrl, effectiveRows]);

  const resetFilters = useCallback(() => {
    const next = defaultJevFilters();
    filtersRef.current = next;
    setFiltersState(next);
    const url = new URL(window.location.href);
    url.search = resetJevFilterParams(url.searchParams).toString();
    window.history.pushState(window.history.state, '', url);
  }, []);

  useEffect(() => {
    const read = () => {
      const next = normalizeJevFilters(parseJevFilters(new URLSearchParams(window.location.search)), effectiveRows);
      filtersRef.current = next;
      setFiltersState(next);
      const url = new URL(window.location.href);
      const clean = serializeJevFilters(url.searchParams, next);
      if (clean.toString() !== url.searchParams.toString()) {
        url.search = clean.toString();
        window.history.replaceState(window.history.state, '', url);
      }
    }
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [effectiveRows]);

  useEffect(() => {
    const onEligibility = (event: Event) => {
      const detail = (event as CustomEvent<{ eligibilityByKey?: Record<string, JevV15RowMeta['jevClass']> }>).detail;
      if (!detail?.eligibilityByKey || typeof detail.eligibilityByKey !== 'object') return;
      const next = new Map(Object.entries(detail.eligibilityByKey));
      setEligibilityOverrides((previous) => {
        if (previous.size === next.size && [...next].every(([key, value]) => {
          const old = previous.get(key);
          return old?.status === value.status && old?.reason === value.reason;
        })) return previous;
        return next;
      });
    };
    window.addEventListener(JEV_V15_ELIGIBILITY_CHANGE_EVENT, onEligibility);
    return () => window.removeEventListener(JEV_V15_ELIGIBILITY_CHANGE_EVENT, onEligibility);
  }, []);

  const value = useMemo<JevV15FilterContextValue>(() => {
    const effective = normalizeJevFilters(filters, effectiveRows);
    const visibleRows = filterJevRows(effectiveRows, effective).filter((row) => !hiddenKeys.has(row.key));
    const visibleKeys = new Set(visibleRows.map((row) => row.key));
    return {
      rows: effectiveRows,
      filters: effective,
      setFilters,
      resetFilters,
      visibleKeys,
      visibleRows,
      total: effectiveRows.length,
      visible: visibleKeys.size,
      active: isJevFilterActive(effective),
      numericAvailable: Object.fromEntries(JEV_NUMERIC_FIELDS.map((field) => [field, jevFieldHasValues(effectiveRows, field)])) as Record<JevV15NumericField, boolean>,
      newAvailable: jevHasNewRows(effectiveRows),
      providers: distinctJevValues(effectiveRows, 'provider'),
      families: distinctJevValues(effectiveRows, 'family'),
      licences: distinctJevValues(effectiveRows, 'licence'),
      apiKeys, showApi, setShowApi,
    };
  }, [effectiveRows, filters, setFilters, resetFilters, hiddenKeys, apiKeys, showApi]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(JEV_V15_FILTER_CHANGE_EVENT, { detail: { visibleKeys: [...value.visibleKeys] } }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [value.visibleKeys]);

  return <JevV15FilterContext.Provider value={value}>
    <JevV15HiddenKeysContext.Provider value={hiddenKeys}>{children}</JevV15HiddenKeysContext.Provider>
  </JevV15FilterContext.Provider>;
}

export function useJevV15Filters(): JevV15FilterContextValue {
  const context = useContext(JevV15FilterContext);
  if (!context) throw new Error('useJevV15Filters must be used inside JevV15FilterProvider');
  return context;
}

const KIND_LABELS: [JevV15RowKind, string][] = [
  ['open-weights', 'Open weights'],
  ['open-code', 'Open code'],
  ['closed', 'Closed'],
  ['api', 'API'],
];

const CLASS_LABELS: [JevV15ClassStatus, string][] = [
  ['eligible', 'Eligible'],
  ['outside', 'Outside'],
  ['unknown', 'Unknown'],
];

const NUMERIC_FIELDS: { field: JevV15NumericField; label: string; disabledHint: string }[] = [
  { field: 'parameters', label: 'Parameters', disabledHint: 'No system in this release reports an exact parameter count.' },
  { field: 'developerPrice', label: 'Developer/API price $/1k', disabledHint: 'No system in this release reports a developer/API price.' },
  { field: 'basePrice', label: 'Base-model price $/1k', disabledHint: 'No system in this release reports a base-model reference price.' },
  { field: 'officialCost', label: 'Scored cost $/1k', disabledHint: 'No system in this release reports a scored cost.' },
  { field: 'alternativePrice', label: 'Alternative price $/1k', disabledHint: 'No system in this release reports an alternative pricing scenario.' },
  { field: 'p50', label: 'p50 latency (s)', disabledHint: 'No system in this release reports an adjusted p50 latency.' },
  { field: 'p95', label: 'p95 latency (s)', disabledHint: 'No system in this release reports an adjusted p95 latency.' },
];

function Chip({ label, on, onToggle, disabled }: { label: string; on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onToggle}
      className={`min-h-8 rounded-md border px-3 text-sm ${on ? 'border-accent/60 bg-accent/15 text-accent' : 'border-line text-gray-400'} disabled:cursor-not-allowed disabled:opacity-40`}>
      {on ? '✓ ' : ''}{label}
    </button>
  );
}

/** An inclusion list where empty means "all": toggling from "all" keeps everything but the one item. */
const toggleInclusion = (list: string[], all: string[], key: string) => {
  const next = list.length ? (list.includes(key) ? list.filter((x) => x !== key) : [...list, key]) : all.filter((x) => x !== key);
  return next.length === all.length ? [] : next;
};

const BOUND_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const parseBound = (text: string | undefined): number | null | 'invalid' => {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return null;
  if (!BOUND_RE.test(trimmed)) return 'invalid';
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : 'invalid';
};

function RangeInputs({ field, label, disabledHint }: { field: JevV15NumericField; label: string; disabledHint: string }) {
  const { filters, setFilters, numericAvailable } = useJevV15Filters();
  const available = numericAvailable[field];
  const range = filters[field];
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = (ref: RefObject<HTMLInputElement | null>, value: number | null) => {
      const el = ref.current;
      if (el && document.activeElement !== el) el.value = value == null ? '' : String(value);
    };
    sync(minRef, range.min);
    sync(maxRef, range.max);
  }, [range.min, range.max, available]);

  const commit = () => {
    const min = parseBound(minRef.current?.value);
    const max = parseBound(maxRef.current?.value);
    if (min === 'invalid' || max === 'invalid' || (min != null && max != null && min > max)) {
      if (minRef.current) minRef.current.value = range.min == null ? '' : String(range.min);
      if (maxRef.current) maxRef.current.value = range.max == null ? '' : String(range.max);
      return;
    }
    if (min === range.min && max === range.max) return;
    const patch: Partial<JevV15FilterState> = {};
    patch[field] = { min, max };
    setFilters(patch);
  };

  const inputProps = (ref: RefObject<HTMLInputElement | null>, bound: 'minimum' | 'maximum') => ({
    ref,
    inputMode: 'decimal' as const,
    disabled: !available,
    onBlur: commit,
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') { event.preventDefault(); commit(); }
    },
    className: 'w-full min-w-0 rounded-md border border-line bg-ink px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40',
    'aria-label': `${label}, ${bound}`,
    placeholder: bound === 'minimum' ? 'min' : 'max',
  });

  return (
    <div data-bh-jev15-filter-range={field} data-bh-jev15-filter-range-available={available}>
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-xs text-gray-400">{label}</span>
        <input {...inputProps(minRef, 'minimum')} />
        <span aria-hidden="true">–</span>
        <input {...inputProps(maxRef, 'maximum')} />
      </div>
      {!available && <p className="mt-0.5 text-[11px] text-gray-600" data-bh-jev15-filter-disabled>{disabledHint}</p>}
    </div>
  );
}

export function JevV15FilterPanel() {
  const { filters, setFilters, resetFilters, visible, total, active, newAvailable, providers, families, licences } = useJevV15Filters();

  const setPicker = (field: 'providers' | 'families' | 'licences', next: string[]) => {
    const patch: Partial<JevV15FilterState> = {};
    patch[field] = next;
    setFilters(patch);
  };

  const picker = (label: string, field: 'providers' | 'families' | 'licences', options: string[], selected: string[]) => options.length ? (
    <MultiCombobox label={label} items={options.map((value) => ({ key: value, label: value }))}
      summary={selected.length ? `${selected.length} selected` : 'All'} active={selected.length > 0}
      isChecked={(key) => selected.includes(key)}
      toggle={(keys) => {
        let next = selected;
        for (const key of keys) next = toggleInclusion(next, options, key);
        setPicker(field, next);
      }}
      all={() => setPicker(field, [])}
      only={(keys) => setPicker(field, [...keys])} />
  ) : (
    <p className="text-xs text-gray-600" data-bh-jev15-filter-empty-picker>No {label.toLowerCase()} reported in this release.</p>
  );

  return (
    <section aria-label="JevBench filters" className="mt-4 space-y-3" data-bh-jev15-filters>
      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-[200px] flex-1">
          <span className="sr-only">Search systems</span>
          <input type="search" value={filters.q} onChange={(event) => setFilters({ q: event.target.value }, { push: false })}
            placeholder="Search systems…" aria-label="Search systems"
            className="w-full rounded-md border border-line bg-ink px-3 py-1.5 text-sm" data-bh-jev15-filter-search />
        </label>
        <span role="status" className="tabular text-sm text-gray-400" data-bh-jev15-filter-count>{visible} of {total} systems</span>
        <button type="button" onClick={resetFilters} disabled={!active}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          data-bh-jev15-filter-clear>
          Clear filters
        </button>
      </div>

      <div className="grid gap-x-6 gap-y-2 lg:grid-cols-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Model kind</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Model kind">
            {KIND_LABELS.map(([kind, label]) => (
              <Chip key={kind} label={label} on={filters.kinds.includes(kind)}
                onToggle={() => setFilters({ kinds: filters.kinds.includes(kind) ? filters.kinds.filter((k) => k !== kind) : [...filters.kinds, kind] })} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Jev-class</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jev-class eligibility">
            {CLASS_LABELS.map(([status, label]) => (
              <Chip key={status} label={label} on={filters.jevClass.includes(status)}
                onToggle={() => setFilters({ jevClass: filters.jevClass.includes(status) ? filters.jevClass.filter((s) => s !== status) : [...filters.jevClass, status] })} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Release</p>
          <div className="flex flex-wrap items-center gap-2">
            <Chip label="New in this version" on={filters.onlyNew} disabled={!newAvailable} onToggle={() => setFilters({ onlyNew: !filters.onlyNew })} />
            {!newAvailable && <span className="text-[11px] text-gray-600">No new systems in this release.</span>}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {picker('Provider', 'providers', providers, filters.providers)}
        {picker('Family', 'families', families, filters.families)}
        {picker('Licence', 'licences', licences, filters.licences)}
      </div>

      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {NUMERIC_FIELDS.map(({ field, label, disabledHint }) => <RangeInputs key={field} field={field} label={label} disabledHint={disabledHint} />)}
      </div>
    </section>
  );
}
