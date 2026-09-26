'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { jevSystemPath } from '../lib/jev-system-slug.mjs';

export type OpenWeightAlternativeRow = {
  key: string;
  display: string;
  rank: number | null;
  score: number | null;
  model: string;
  sizeNote?: { text: string; url: string; label: string };
  runSetup: string;
  licence: string;
  sourceUrl: string | null;
  sourceLabel: string;
  sourceNote?: string;
};

type SortBy = 'rank' | 'score' | 'name';

function hasParameterCount(value: string): boolean {
  return /\b\d+(?:[.,]\d+)?\s*(?:B|M)\b/i.test(value);
}

export function JevOpenWeightAlternativesTable({ rows, revision }: { rows: OpenWeightAlternativeRow[]; revision: string }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'ranked' | 'partial'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('rank');
  const hasUnranked = rows.some((row) => row.rank == null);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const filtered = rows.filter((row) => {
      if (status === 'ranked' && row.rank == null) return false;
      if (status === 'partial' && row.rank != null) return false;
      if (!needle) return true;
      return [row.display, row.model, row.licence, row.runSetup, row.rank?.toString(), row.score?.toString()]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(needle);
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.display.localeCompare(b.display);
      if (sortBy === 'score') {
        if (a.score == null && b.score == null) return a.display.localeCompare(b.display);
        if (a.score == null) return 1;
        if (b.score == null) return -1;
        return b.score - a.score || a.display.localeCompare(b.display);
      }
      if (a.rank == null && b.rank == null) return a.display.localeCompare(b.display);
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return a.rank - b.rank || a.display.localeCompare(b.display);
    });
  }, [query, rows, sortBy, status]);

  return (
    <div className="mt-4" data-bh-jev-open-weights>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Filter systems</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, model, license, hardware…"
            className="w-full rounded-md border bg-background px-3 py-2"
            aria-label="Filter open-weight Jev-class systems"
          />
        </label>
        {hasUnranked && (
          <label className="text-sm">
            <span className="mb-1 block font-medium">Row status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="w-full rounded-md border bg-background px-3 py-2"
              aria-label="Filter rows by ranked or partial status"
            >
              <option value="all">All {rows.length} rows</option>
              <option value="ranked">Ranked rows</option>
              <option value="partial">Unranked partial rows</option>
            </select>
          </label>
        )}
        <label className="text-sm">
          <span className="mb-1 block font-medium">Sort rows</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortBy)}
            className="w-full rounded-md border bg-background px-3 py-2"
            aria-label="Sort open-weight Jev-class systems"
          >
            <option value="rank">Published rank</option>
            <option value="score">JevBench Score</option>
            <option value="name">System name</option>
          </select>
        </label>
      </div>

      <p className="bh-muted mt-3 text-sm" aria-live="polite">
        Showing {visibleRows.length} of {rows.length} published open-weight Jev-class rows.
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border" tabIndex={0} aria-label="Scrollable open-weight alternatives table">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <caption className="sr-only">Open-weight Jev-class systems in JevBench {revision}</caption>
          <thead>
            <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-3 py-3">System</th>
              <th scope="col" className="px-3 py-3">Model and size</th>
              <th scope="col" className="px-3 py-3">Published result</th>
              <th scope="col" className="px-3 py-3">License terms</th>
              <th scope="col" className="px-3 py-3">Recorded run setup</th>
              <th scope="col" className="px-3 py-3">Source or weights</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.key} className="border-b align-top last:border-0">
                <th scope="row" className="px-3 py-3 font-semibold">
                  <Link className="text-accent underline" href={jevSystemPath(row.key)}>
                    {row.display}
                  </Link>
                </th>
                <td className="px-3 py-3">
                  <p>{row.model || 'Model details not stated in the published row.'}</p>
                  {!hasParameterCount(row.model) && !row.sizeNote && <p className="bh-muted mt-1 text-xs">Parameter size not stated in the published row.</p>}
                  {row.sizeNote && (
                    <p className="bh-muted mt-1 text-xs">
                      {row.sizeNote.text}{' '}
                      <a className="text-accent underline" href={row.sizeNote.url} rel="noreferrer">{row.sizeNote.label}</a>
                    </p>
                  )}
                </td>
                <td className="px-3 py-3 tabular-nums">
                  {row.rank != null && row.score != null
                    ? <><strong>Rank #{row.rank}</strong><br />JevBench Score {row.score.toFixed(2)}</>
                    : <><strong>Unranked partial row</strong><br />No composite score</>}
                </td>
                <td className="px-3 py-3">{row.licence || 'Not stated in the published row.'}</td>
                <td className="px-3 py-3">{row.runSetup || 'Not stated in the published row.'}</td>
                <td className="px-3 py-3">
                  {row.sourceUrl
                    ? <a className="text-accent underline" href={row.sourceUrl} rel="noreferrer">{row.sourceLabel}</a>
                    : 'No source URL in the published row.'}
                  {row.sourceNote && <p className="bh-muted mt-1 text-xs">{row.sourceNote}</p>}
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center bh-muted">No systems match those filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
