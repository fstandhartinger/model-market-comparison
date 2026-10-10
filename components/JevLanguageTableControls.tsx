'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BOARD_ORDER, ariaSort, filterRows, nextSort, sortRows } from '../lib/jevbench-language-table-controls.mjs';

type Column = { key: string; label: string; n: number; lowN: boolean; title: string };
type Row = { key: string; name: string; group: 'open' | 'api'; index: number; values: Record<string, number | null>; node: ReactNode };
type SortState = { key: string; dir: 'asc' | 'desc' };

const FIELD = 'min-h-9 rounded-lg border border-line bg-[var(--surface)] px-2 py-1 text-sm';

/** Florian 10 Oct 2026: sortable, filterable Languages table. Rows are rendered on the server (tooltips, markers and
 *  data attributes unchanged) and arrive as nodes; this component only reorders them and hides filtered-out rows with
 *  inline display, so the API-row `hidden` switch (JevApiOfferingsToggle) keeps working and ANDs with the filter. */
export function JevLanguageTableControls({ columns, rows, caption, systemTitle }: { columns: Column[]; rows: Row[]; caption: string; systemTitle: string }) {
  const [sort, setSort] = useState<SortState>({ key: BOARD_ORDER, dir: 'desc' });
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const body = useRef<HTMLTableSectionElement>(null);
  const meta = useMemo(() => rows.map(({ node: _node, ...m }) => m), [rows]);
  const nodeOf = useMemo(() => new Map(rows.map((r) => [r.key, r.node])), [rows]);
  const sorted = useMemo(() => sortRows(meta, sort.key, sort.dir), [meta, sort]);
  const visible = useMemo(() => new Set<string>(filterRows(meta, query, group).map((r: { key: string }) => r.key)), [meta, query, group]);
  const board = sort.key === BOARD_ORDER;
  const [shownCount, setShownCount] = useState(rows.length);

  useEffect(() => {
    body.current?.querySelectorAll<HTMLElement>('[data-bh-jev16-language-row]').forEach((tr) => {
      tr.style.display = visible.has(tr.dataset.bhJev16LanguageRow ?? '') ? '' : 'none';
    });
    body.current?.querySelectorAll<HTMLElement>('[data-bh-jev16-language-group]').forEach((tr) => {
      tr.style.display = board && visible.has(tr.dataset.bhJev16LanguageGroup ?? '') ? '' : 'none';
    });
    // Count what is actually on screen: the API-row switch hides rows through the `hidden` attribute, which the observer follows.
    const count = () => setShownCount(Array.from(body.current?.querySelectorAll<HTMLElement>('[data-bh-jev16-language-row]') ?? []).filter((tr) => tr.style.display !== 'none' && !tr.hidden).length);
    count();
    const el = body.current;
    if (!el) return;
    const mo = new MutationObserver(count);
    mo.observe(el, { attributes: true, attributeFilter: ['hidden'], subtree: true });
    return () => mo.disconnect();
  }, [visible, board, sorted]);

  const indicator = (key: string) => board || sort.key !== key ? null : <span aria-hidden="true" className="ml-1 text-[10px]">{sort.dir === 'asc' ? '▲' : '▼'}</span>;
  const sortButton = (key: string, children: ReactNode, className = '') => <button type="button" onClick={() => setSort((s) => nextSort(s, key) as SortState)}
    className={`w-full cursor-pointer whitespace-nowrap font-inherit hover:underline focus-visible:underline ${className}`} data-bh-jev16-language-sort={key}>{children}{indicator(key)}</button>;
  const options = [[BOARD_ORDER, 'Board order'], ['name', 'Name'], ['avg', 'Average'], ...columns.map((c) => [c.key, c.key === 'mixed' ? 'Mixed' : c.key === 'en' ? 'English' : c.label])];

  return <>
    <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2 text-sm" data-bh-jev16-language-controls>
      <label className="flex min-w-0 flex-col gap-1"><span className="bh-muted text-xs">Filter systems</span>
        <input type="search" className={`${FIELD} w-full sm:w-56`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="System name" autoComplete="off" data-bh-jev16-language-filter-text /></label>
      <label className="flex flex-col gap-1"><span className="bh-muted text-xs">Group</span>
        <select className={FIELD} value={group} onChange={(e) => setGroup(e.target.value)} data-bh-jev16-language-filter-group>
          <option value="all">All</option><option value="open">Open weights</option><option value="api">API</option></select></label>
      <label className="flex flex-col gap-1"><span className="bh-muted text-xs">Sort by</span>
        <span className="flex gap-1"><select className={FIELD} value={sort.key} onChange={(e) => setSort((s) => s.key === e.target.value ? s : nextSort(s, e.target.value) as SortState)} data-bh-jev16-language-sort-select>
          {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <button type="button" className={`${FIELD} px-3`} disabled={board} onClick={() => setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
            aria-label={`Sort direction: ${sort.dir === 'asc' ? 'ascending' : 'descending'}. Click to reverse.`} data-bh-jev16-language-sort-dir>{sort.dir === 'asc' ? '▲' : '▼'}</button></span></label>
      <p className="bh-muted pb-2 text-xs" role="status" data-bh-jev16-language-count>{shownCount} systems{board ? '' : ' · wrappers can move when sorted'}</p>
    </div>
    <div className="mt-3 overflow-x-auto"><table className="text-left text-xs tabular" data-bh-jev16-language-table>
      <caption className="sr-only">{caption}</caption>
      <thead><tr><th scope="col" aria-sort={ariaSort(sort, 'name')} className="sticky left-0 z-10 bg-[rgb(var(--panel))] p-1.5" title={systemTitle}>{sortButton('name', 'System', 'text-left')}</th>
        {columns.map((l) => <th key={l.key} scope="col" aria-sort={ariaSort(sort, l.key)} className="whitespace-nowrap p-1.5 text-center" title={l.title}>
          {sortButton(l.key, <>{l.key}{l.lowN && <sup aria-label="low n">†</sup>}</>)}<span className="bh-muted block font-normal">{l.n}</span></th>)}</tr></thead>
      <tbody ref={body}>{sorted.map((r) => <Fragment key={r.key}>{nodeOf.get(r.key)}</Fragment>)}</tbody>
    </table></div>
  </>;
}
