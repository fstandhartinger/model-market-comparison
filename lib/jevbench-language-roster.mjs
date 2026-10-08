/** View-only metadata join. Does not invent measurements, ranking fields or axes. */
export function languageRoster(active, notMeasured = [], carry = [], cells = {}, isApi = () => false, scope = 'open') {
  const byKey = new Map();
  for (const row of active ?? []) byKey.set(row.key, row);
  const carryMeta = new Map((carry ?? []).map((r) => [r.key,r]));
  for (const row of [...(notMeasured ?? []), ...(carry ?? [])]) {
    if (byKey.has(row.key)) continue;
    const meta = carryMeta.get(row.key) ?? row;
    const api = isApi(meta);
    if (scope === 'api' && !api && row.key !== 'jev-1.13.0') continue;
    const measured = !!cells[row.key]?.languages && Object.values(cells[row.key].languages).some((c) => Number.isInteger(c.coverage_n));
    byKey.set(row.key, {
      key: row.key, display: row.display ?? meta.display ?? row.key,
      listing: row.listing === 'wrapper' ? 'wrapper' : api ? 'api_offering' : 'catalogue',
      ranked: false, rank: null, v16: { lane: api ? 'api' : 'selfhosted' },
      language_listing: carryMeta.has(row.key) ? 'historical' : 'catalogue',
      language_listing_note: `${carryMeta.has(row.key) ? 'Historical headline' : 'Catalogue entry'} · ${measured ? 'measured language cells' : 'language measurement pending'}`,
    });
  }
  return [...byKey.values()];
}
