// Pure sort/filter helpers for the JevBench Languages table (client controls in components/JevLanguageTableControls.tsx).
// A row is { key, name, group: 'open' | 'api', index, values: { [columnKey]: number | null } }; null = missing/suppressed cell.

export const BOARD_ORDER = 'board';

/** Mean of the row's shown (non-null) language cells, or null when it has none. */
export function rowAverage(row) {
  const v = Object.values(row.values).filter((x) => typeof x === 'number' && Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

/** Numeric value a sort key reads from a row: 'name' is handled separately; 'avg' is the mean; otherwise a column key. */
export function sortValue(row, sortKey) {
  if (sortKey === 'avg') return rowAverage(row);
  const x = row.values[sortKey];
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

/** Sorted copy of rows. Missing values sort last in both directions; ties fall back to board order. */
export function sortRows(rows, sortKey = BOARD_ORDER, dir = 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  const byBoard = (a, b) => a.index - b.index;
  const out = [...rows];
  if (sortKey === BOARD_ORDER) return out.sort(byBoard);
  if (sortKey === 'name') return out.sort((a, b) => sign * a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true }) || byBoard(a, b));
  return out.sort((a, b) => {
    const x = sortValue(a, sortKey); const y = sortValue(b, sortKey);
    if (x === null && y === null) return byBoard(a, b);
    if (x === null) return 1;
    if (y === null) return -1;
    return sign * (x - y) || byBoard(a, b);
  });
}

/** Rows matching a case-insensitive name query and a group ('all' | 'open' | 'api'). */
export function filterRows(rows, query = '', group = 'all') {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => (group === 'all' || r.group === group) && (!q || r.name.toLowerCase().includes(q)));
}

/** Next state when a column header is clicked: same key toggles direction, a new key starts descending (asc for name). */
export function nextSort(current, key) {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: key === 'name' ? 'asc' : 'desc' };
}

export const ariaSort = (current, key) => (current.key === key && current.key !== BOARD_ORDER ? (current.dir === 'asc' ? 'ascending' : 'descending') : 'none');
