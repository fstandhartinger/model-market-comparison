'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { JevArchitectureBadge } from './JevArchitecture';
import type { MouseEvent, ReactNode } from 'react';
import type { JevV15Artifact } from '../lib/jevbench-v15-preview.mjs';
import type { CompareCategories } from '../lib/jevbench-categories.mjs';
import type { JevClassResult } from '../lib/jevbench-jev-class.mjs';
import {
  buildAllDataModel, applyFilters, sortRows, columnHasValues, toCsv, toJson,
  type JevV15AllDataColumn, type JevV15AllDataMetadata, type JevV15AllDataRow, type JevV15AllDataSort, type JevV15RevisionLinks,
} from '../lib/jevbench-all-data-grid.mjs';
import { jevSystemPath } from '../lib/jev-system-slug.mjs';
import { jevSourceUrl } from './jevSystemLinks';
import { useJevV15Filters } from './JevV15Filters';

// CR-269: the collapsed "All data" grid. Standalone presentation component — every cell prints a value that exists in
// the supplied artifact / category view / eligibility metadata / explicit metadata, or "Not reported"; nothing is
// inferred from a model name. Filtering, sorting, pagination and exports operate on the same pure data layer
// (lib/jevbench-all-data-grid.mjs) that the focused tests cover.

const PAGE_SIZE = 25;

const one = (v: number | null) => (v == null ? '—' : v.toFixed(1));
const two = (v: number | null) => (v == null ? '—' : v.toFixed(2));
const three = (v: number | null) => (v == null ? '—' : `×${v.toFixed(3)}`);
const integer = (v: number | null) => (v == null ? '—' : Math.round(v).toLocaleString('en-US'));
const secs = (v: number | null) => (v == null ? '—' : `${v.toFixed(v < 1 ? 2 : 1)} s`);
const usd = (v: number | null) => (v == null ? '—' : `$${v.toFixed(v < 0.01 ? 4 : v < 1 ? 3 : 2)}`);
const signed = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`);

type FilterState = { id: string; text: string; min: string; max: string };
type DraftState = { columnId: string; text: string; min: string; max: string };

const numOrNull = (s: string) => {
  const v = Number(s);
  return s.trim() !== '' && Number.isFinite(v) ? v : null;
};

function formatCell(column: JevV15AllDataColumn, v: number | string | boolean | null): ReactNode {
  if (v == null) {
    if (column.id === 'params' || column.id === 'apiPrice' || column.id === 'basePrice' || column.id === 'alternativePrice' || column.id === 'eligible') return <span className="bh-muted">Not reported</span>;
    return <span className="bh-muted">—</span>;
  }
  if (column.kind === 'boolean') {
    if (column.id === 'api') return v ? 'API' : 'No';
    if (column.id === 'eligible') return v ? 'Eligible' : 'Not eligible';
    return v ? 'yes' : 'no';
  }
  if (column.kind === 'text') return String(v);
  switch (column.style) {
    case 'int': return integer(v as number);
    case 'secs': return secs(v as number);
    case 'usd': return usd(v as number);
    case 'signed': return signed(v as number);
    case 'mult': return three(v as number);
    case 'p2': return two(v as number);
    default: return one(v as number);
  }
}

const arrow = (dir: 'asc' | 'desc') => (dir === 'asc' ? ' ▲' : ' ▼');

export function JevV15AllDataGrid({
  artifact, categoryView = null, previousKeys = null, eligibility = null, metadata = null, links = null,
}: {
  artifact: JevV15Artifact;
  /** The result of jevbenchCategoryView(artifact.revision, keys); adds one value + n column per category, dynamically. */
  categoryView?: CompareCategories | null;
  /** Keys of the immediately previous release; a system absent here is marked as first added in this revision. */
  previousKeys?: string[] | null;
  /** Jev-class eligibility metadata, e.g. the jevClassRows(...) / jevClassView(...) result over the release's systems. */
  eligibility?: JevClassResult | null;
  /** Explicit optional facts (parameter counts, first-added versions, API / base-model prices). Never inferred. */
  metadata?: JevV15AllDataMetadata | null;
  /** Revision links (method, pricing, per-addendum notes) rendered on the addendum column. */
  links?: JevV15RevisionLinks | null;
}) {
  const {
    rows: globalFilterRows,
    visibleKeys: globallyVisibleKeys,
    visible: globallyVisibleCount,
    total: globallyTotal,
    active: globalFiltersActive,
  } = useJevV15Filters();
  const model = useMemo(
    () => buildAllDataModel({ artifact, categoryView, previousKeys, eligibility, metadata }),
    [artifact, categoryView, previousKeys, eligibility, metadata],
  );
  const modelKey = `${model.revision}:${model.columns.length}:${model.rows.length}`;
  const lastModelKey = useRef(modelKey);

  // The page-level eligibility control changes with the selected cost/latency
  // caps. Keep the grid's eligibility cells in step with that shared state.
  const globalRowByKey = useMemo(() => new Map(globalFilterRows.map((row) => [row.key, row])), [globalFilterRows]);
  const currentRows = useMemo(() => model.rows.map((row) => {
    const globalRow = globalRowByKey.get(row.key);
    if (!globalRow) return row;
    const status = globalRow.jevClass.status;
    const eligible = status === 'unknown' ? null : status === 'eligible';
    const reason = globalRow.jevClass.reason;
    if (row.values.eligible === eligible && row.values.eligibilityReason === reason) return row;
    return { ...row, values: { ...row.values, eligible, eligibilityReason: reason } };
  }), [model.rows, globalRowByKey]);

  const [sorts, setSorts] = useState<JevV15AllDataSort[]>([]);
  const [filters, setFilters] = useState<FilterState[]>([]);
  const [visible, setVisible] = useState<Set<string>>(() => new Set(model.columns.filter((c) => c.visible).map((c) => c.id)));
  const [pageState, setPageState] = useState(0);
  const [copied, setCopied] = useState<'' | 'csv' | 'json'>('');
  const [draft, setDraft] = useState<DraftState>({ columnId: '', text: '', min: '', max: '' });
  const [hasOpened, setHasOpened] = useState(false);

  // Reset user state when the supplied data actually changes (new revision/columns), not on every render.
  useEffect(() => {
    if (lastModelKey.current !== modelKey) {
      lastModelKey.current = modelKey;
      setVisible(new Set(model.columns.filter((c) => c.visible).map((c) => c.id)));
      setSorts([]);
      setFilters([]);
      setPageState(0);
      setDraft({ columnId: '', text: '', min: '', max: '' });
    }
  }, [modelKey, model.columns]);

  useEffect(() => { setPageState(0); }, [filters, sorts]);

  const visibleColumns = useMemo(() => model.columns.filter((c) => visible.has(c.id)), [model, visible]);

  const parsedFilters = useMemo(
    () => filters.map((f) => ({ id: f.id, text: f.text.trim() !== '' ? f.text : null, min: numOrNull(f.min), max: numOrNull(f.max) })),
    [filters],
  );
  const globallyFilteredRows = useMemo(
    () => currentRows.filter((row) => globallyVisibleKeys.has(row.key)),
    [currentRows, globallyVisibleKeys],
  );
  const filtered = useMemo(() => applyFilters(globallyFilteredRows, model.columns, parsedFilters), [globallyFilteredRows, model.columns, parsedFilters]);
  const sorted = useMemo(() => sortRows(filtered, model.columns, sorts), [filtered, model, sorts]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(pageState, pageCount - 1);
  const pageRows = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const hasValuesById = useMemo(
    () => new Map(model.columns.map((c) => [c.id, columnHasValues(model.rows, c)])),
    [model],
  );

  const draftColumn = model.columns.find((c) => c.id === draft.columnId) ?? null;
  const addFilter = () => {
    if (!draftColumn) return;
    if (draft.text.trim() === '' && draft.min.trim() === '' && draft.max.trim() === '') return;
    setFilters((prev) => [...prev, { id: draftColumn.id, text: draft.text, min: draft.min, max: draft.max }]);
    setDraft((d) => ({ ...d, text: '', min: '', max: '' }));
  };
  const updateFilter = (index: number, patch: Partial<FilterState>) =>
    setFilters((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  const removeFilter = (index: number) => setFilters((prev) => prev.filter((_, i) => i !== index));

  const onSortClick = (column: JevV15AllDataColumn, event: MouseEvent<HTMLButtonElement>) => {
    const multi = event.shiftKey || event.ctrlKey || event.metaKey;
    setSorts((prev) => {
      const at = prev.findIndex((s) => s.id === column.id);
      if (!multi) {
        if (at === 0 && prev[0].dir === 'asc') return [{ id: column.id, dir: 'desc' as const }];
        if (at === 0 && prev[0].dir === 'desc') return [];
        return [{ id: column.id, dir: 'asc' as const }];
      }
      if (at === -1) return [...prev, { id: column.id, dir: 'asc' as const }].slice(0, 3);
      const next = prev.slice();
      if (next[at].dir === 'asc') next[at] = { id: column.id, dir: 'desc' as const };
      else next.splice(at, 1);
      return next;
    });
  };

  const setColumnVisible = (id: string, on: boolean) =>
    setVisible((prev) => {
      const next = new Set(prev);
      const column = model.columns.find((c) => c.id === id);
      if (on) next.add(id);
      else if (!column?.lockVisible || !next.has(id)) next.delete(id);
      return next;
    });
  const showAllColumns = () => setVisible(new Set(model.columns.map((c) => c.id)));
  const hideOptionalColumns = () => setVisible(new Set(model.columns.filter((c) => c.lockVisible).map((c) => c.id)));
  const resetColumns = () => setVisible(new Set(model.columns.filter((c) => c.visible).map((c) => c.id)));

  const exportNote = `Exports the ${sorted.length} matching rows with the ${visibleColumns.length} visible columns.`;

  const copyText = async (text: string, which: 'csv' | 'json') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); } finally { area.remove(); }
    }
    setCopied(which);
    window.setTimeout(() => setCopied(''), 2000);
  };

  const downloadCsv = () => {
    const blob = new Blob([toCsv(visibleColumns, sorted)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `jevbench-${model.revision}-all-data.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const groups = useMemo(() => {
    const out: { name: string; columns: JevV15AllDataColumn[] }[] = [];
    for (const column of model.columns) {
      let group = out.find((g) => g.name === column.group);
      if (!group) { group = { name: column.group, columns: [] }; out.push(group); }
      group.columns.push(column);
    }
    return out;
  }, [model]);

  // The rank column gets a fixed width so the name column can stick right next to it (left-12).
  const stickyLeftFor = (index: number, column: JevV15AllDataColumn): 'left-0' | 'left-12' | null => {
    if (index === 0) return 'left-0';
    if (visibleColumns[0]?.id === 'rank' && column.id === 'system') return 'left-12';
    return null;
  };

  const renderBodyCell = (row: JevV15AllDataRow, column: JevV15AllDataColumn, stickyLeft: 'left-0' | 'left-12' | null) => {
    const value = row.values[column.id];
    const sys = row.system as { repo?: string | null; addendum?: { id?: string } | null };
    let content: ReactNode = formatCell(column, value);
    if (column.id === 'system') {
      const url = row.notMeasured ? null : jevSourceUrl(row.key, sys.repo ?? null);
      content = url
        ? <a href={url} target="_blank" rel="noopener noreferrer" className="block max-w-[11.5rem] truncate underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent sm:max-w-[15rem]" title={String(value ?? row.key)}>{value}</a>
        : <Link href={jevSystemPath(row.key)} className="block max-w-[11.5rem] truncate underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent sm:max-w-[15rem]" title={String(value ?? row.key)}>{value}</Link>;
      content = <>{content}<JevArchitectureBadge row={{ ...row.system, key: row.key }} /></>;
    } else if (column.id === 'rank' && value == null) {
      content = <span className="bh-muted" title={String(row.values.notRankedBecause ?? 'Not ranked')}>—</span>;
    } else if (column.id === 'addendum' && value != null) {
      const href = sys.addendum?.id ? links?.addenda?.[sys.addendum.id] : undefined;
      content = href
        ? <a className="underline" href={href} target="_blank" rel="noopener noreferrer" title={`Roster addendum notes: ${sys.addendum?.id}`}>{value}</a>
        : value;
    } else if (column.id === 'revisionNotes' && value != null) {
      content = <Link href={String(value)} className="text-accent underline">Notes</Link>;
    } else if (column.kind === 'text' && value != null && String(value).length > 24) {
      content = <span className="block max-w-[16rem] truncate" title={String(value)}>{value}</span>;
    }
    return (
      <td key={column.id} className={`whitespace-nowrap border-t border-line p-2 text-right text-[13px] tabular-nums ${column.kind === 'text' ? 'text-left' : ''} ${column.id === 'rank' ? 'w-12 min-w-12' : ''} ${stickyLeft ? `sticky ${stickyLeft} z-[1] bg-[var(--surface)] shadow-[inset_-1px_0_0_rgb(var(--line))]` : ''}`}>
        {content}
      </td>
    );
  };

  return (
    <details className="bh-panel mt-10 p-4 sm:p-5" data-bh-jev15-all-data data-bh-jev15-all-data-revision={model.revision}
      onToggle={(event) => { if (event.currentTarget.open) setHasOpened(true); }}>
      <summary className="cursor-pointer text-lg font-semibold text-accent" data-bh-jev15-all-data-summary>
        All data ({globallyTotal} systems)
      </summary>
      {hasOpened && <>
      <p className="bh-muted mt-2 max-w-4xl text-sm">
        Every published value of JevBench {model.revision} in one table: official scores and ranks under all three weight
        options, Capability Score and Jev-class eligibility (where eligibility metadata is supplied), the four axes,
        intelligence detail, per-request-type competence and counts, latency, cost, and every per-category value of the
        supplied category view. Missing values stay “not reported” — nothing is inferred from a name.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2" data-bh-jev15-all-data-controls>
        <details className="relative inline-block text-left" data-bh-jev15-all-data-column-chooser>
          <summary className="cursor-pointer list-none rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent/60">
            Columns ({visibleColumns.length}/{model.columns.length})
          </summary>
          <div className="absolute z-30 mt-1 max-h-96 w-80 max-w-[calc(100vw-2rem)] overflow-auto rounded-lg border border-line bg-[var(--surface)] p-3 shadow-xl">
            <div className="mb-2 flex gap-2 text-xs">
              <button type="button" className="rounded border border-line px-2 py-1 hover:border-accent/60" onClick={showAllColumns}>All</button>
              <button type="button" className="rounded border border-line px-2 py-1 hover:border-accent/60" onClick={hideOptionalColumns}>Core only</button>
              <button type="button" className="rounded border border-line px-2 py-1 hover:border-accent/60" onClick={resetColumns}>Reset</button>
            </div>
            {groups.map((group) => (
              <fieldset key={group.name} className="mb-2 border-t border-line pt-2">
                <legend className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{group.name}</legend>
                {group.columns.map((column) => (
                  <label key={column.id} className="flex items-center gap-2 py-0.5 text-sm" title={column.title}>
                    <input
                      type="checkbox"
                      checked={visible.has(column.id)}
                      disabled={column.lockVisible && visible.has(column.id)}
                      onChange={(e) => setColumnVisible(column.id, e.target.checked)}
                    />
                    <span className="truncate">{column.label}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </details>

        <span className="flex flex-wrap items-center gap-1.5 text-sm" data-bh-jev15-all-data-add-filter>
          <label className="text-xs text-gray-400" htmlFor="bh-all-data-filter-column">Add filter</label>
          <select
            id="bh-all-data-filter-column"
            aria-label="Filter column"
            value={draft.columnId}
            onChange={(e) => setDraft({ columnId: e.target.value, text: '', min: '', max: '' })}
            className="max-w-[220px] rounded-md border border-line bg-[var(--surface)] px-2 py-1.5 text-sm"
          >
            <option value="">Choose column…</option>
            {groups.map((group) => (
                  <optgroup key={group.name} label={group.name}>
                    {model.columns.filter((c) => c.group === group.name).map((column) => (
                      <option key={column.id} value={column.id}>{column.label}</option>
                    ))}
                  </optgroup>
                ))}
          </select>
          {draftColumn?.kind === 'number' ? (
            <>
              <input
                aria-label={`${draftColumn.label} minimum`}
                placeholder="min"
                inputMode="decimal"
                value={draft.min}
                disabled={!hasValuesById.get(draftColumn.id)}
                title={hasValuesById.get(draftColumn.id) ? undefined : 'No values in this release'}
                onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
                className="w-20 rounded-md border border-line bg-[var(--surface)] px-2 py-1.5 text-sm disabled:opacity-40"
              />
              <input
                aria-label={`${draftColumn.label} maximum`}
                placeholder="max"
                inputMode="decimal"
                value={draft.max}
                disabled={!hasValuesById.get(draftColumn.id)}
                title={hasValuesById.get(draftColumn.id) ? undefined : 'No values in this release'}
                onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
                className="w-20 rounded-md border border-line bg-[var(--surface)] px-2 py-1.5 text-sm disabled:opacity-40"
              />
            </>
          ) : (
            <input
              aria-label={draftColumn ? `${draftColumn.label} contains` : 'Filter text'}
              placeholder="contains…"
              value={draft.text}
              disabled={!draftColumn}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') addFilter(); }}
              className="w-36 rounded-md border border-line bg-[var(--surface)] px-2 py-1.5 text-sm disabled:opacity-40"
            />
          )}
          <button
            type="button"
            onClick={addFilter}
            disabled={!draftColumn}
            className="rounded-md border border-accent/60 bg-accent/15 px-3 py-1.5 text-sm text-accent disabled:opacity-40"
          >
            Add filter
          </button>
        </span>

        <span className="flex flex-wrap items-center gap-2 text-sm" data-bh-jev15-all-data-export>
          <button type="button" onClick={() => copyText(toCsv(visibleColumns, sorted), 'csv')}
            className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent/60" title={exportNote}>
            {copied === 'csv' ? 'Copied CSV ✓' : 'Copy CSV'}
          </button>
          <button type="button" onClick={() => copyText(JSON.stringify(toJson(visibleColumns, sorted), null, 2), 'json')}
            className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent/60" title={exportNote}>
            {copied === 'json' ? 'Copied JSON ✓' : 'Copy JSON'}
          </button>
          <button type="button" onClick={downloadCsv}
            className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent/60" title={exportNote}>
            Download CSV
          </button>
        </span>
      </div>

      {filters.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5" data-bh-jev15-all-data-active-filters>
          {filters.map((filter, index) => {
            const column = model.columns.find((c) => c.id === filter.id);
            if (!column) return null;
            return (
              <span key={`${filter.id}-${index}`} className="flex flex-wrap items-center gap-1.5 rounded-md border border-line bg-[var(--surface)] px-2 py-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{column.label}</span>
                {column.kind === 'number' ? (
                  <>
                    <input aria-label={`${column.label} filter minimum`} placeholder="min" inputMode="decimal" value={filter.min}
                      onChange={(e) => updateFilter(index, { min: e.target.value })}
                      className="w-20 rounded border border-line bg-[var(--surface)] px-2 py-0.5 text-sm" />
                    <input aria-label={`${column.label} filter maximum`} placeholder="max" inputMode="decimal" value={filter.max}
                      onChange={(e) => updateFilter(index, { max: e.target.value })}
                      className="w-20 rounded border border-line bg-[var(--surface)] px-2 py-0.5 text-sm" />
                  </>
                ) : (
                  <input aria-label={`${column.label} filter text`} placeholder="contains…" value={filter.text}
                    onChange={(e) => updateFilter(index, { text: e.target.value })}
                    className="w-40 rounded border border-line bg-[var(--surface)] px-2 py-0.5 text-sm" />
                )}
                <button type="button" aria-label={`Remove ${column.label} filter`} onClick={() => removeFilter(index)}
                  className="ml-1 rounded border border-line px-1.5 text-xs hover:border-accent/60">✕</button>
              </span>
            );
          })}
        </div>
      )}

      <p className="bh-muted mt-3 text-sm" aria-live="polite" data-bh-jev15-all-data-matches>
        {sorted.length.toLocaleString('en-US')} of {globallyVisibleCount.toLocaleString('en-US')} rows match the grid filters
        {globalFiltersActive && <> after the page filters</>}
        {globallyTotal !== globallyVisibleCount && <> · {globallyTotal.toLocaleString('en-US')} total</>}
        {sorts.length > 0 && <> · sorted by {sorts.map((s, i) => `${model.columns.find((c) => c.id === s.id)?.label ?? s.id} ${s.dir === 'asc' ? '↑' : '↓'}${i === 0 ? '' : ` (${i + 1})`}`).join(', ')}</>}
        {sorts.length > 0 && <span className="bh-muted"> · click a header to reset, shift-click to add a secondary sort</span>}
      </p>

      <div className="mt-2 max-h-[60vh] overflow-auto rounded-xl border border-line sm:max-h-[70vh]" data-bh-jev15-all-data-scroll>
        <table className="min-w-max text-sm" aria-label={`JevBench ${model.revision} all data`} data-bh-jev15-all-data-table>
          <thead>
            <tr>
              {visibleColumns.map((column, index) => {
                const sortAt = sorts.findIndex((s) => s.id === column.id);
                const stickyLeft = stickyLeftFor(index, column);
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={sortAt === -1 ? 'none' : sorts[sortAt].dir === 'asc' ? 'ascending' : 'descending'}
                    title={column.title}
                    className={`whitespace-nowrap border-b border-line bg-[var(--surface)] p-2 text-xs font-semibold ${column.kind === 'text' ? 'text-left' : 'text-right'} ${column.id === 'rank' ? 'w-12 min-w-12' : ''} ${stickyLeft ? `sticky ${stickyLeft} top-0 z-[4] shadow-[inset_-1px_0_0_rgb(var(--line))]` : 'sticky top-0 z-[2]'}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => onSortClick(column, e)}
                      className="font-semibold hover:text-accent"
                      aria-label={`Sort by ${column.label}`}
                    >
                      {column.label}
                      {sortAt !== -1 && <span aria-hidden="true">{arrow(sorts[sortAt].dir)}{sortAt > 0 ? String.fromCharCode(8320 + sortAt) : ''}</span>}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.key} data-bh-jev15-all-data-row={row.key} data-bh-jev15-all-data-not-measured={row.notMeasured || undefined}>
                {visibleColumns.map((column, index) => renderBodyCell(row, column, stickyLeftFor(index, column)))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={visibleColumns.length} className="bh-muted border-t border-line p-4 text-center text-sm">No rows match the active filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2" data-bh-jev15-all-data-pagination>
        <p className="bh-muted text-xs">
          Page {page + 1} of {pageCount} · showing {pageRows.length} of {sorted.length.toLocaleString('en-US')} matching rows · 25 per page
        </p>
        <span className="flex gap-2">
          <button type="button" onClick={() => setPageState(Math.max(0, page - 1))} disabled={page === 0}
            aria-label="Previous page"
            className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent/60 disabled:opacity-40">← Prev</button>
          <button type="button" onClick={() => setPageState(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1}
            aria-label="Next page"
            className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent/60 disabled:opacity-40">Next →</button>
        </span>
      </div>
      </>}
    </details>
  );
}
