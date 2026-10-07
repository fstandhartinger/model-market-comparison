/** Gate the actual displayed cells, never pool totals or a separate coverage report. */
export function radarSpokeFailures(view, keys) {
  for (const [dim, count] of [['usecases', 20], ['topics', 7]]) {
    const cats = view.dims.find((d) => d.key === dim)?.cats;
    if (cats?.length !== count || new Set(cats.map((c) => c.key)).size !== count) throw new Error(`${dim}: expected ${count} unique spokes`);
  }
  return Object.fromEntries(keys.map((key) => [key, view.dims.flatMap((dim) => dim.cats.filter((c) => {
    const cell = view.systems[key]?.[dim.key]?.[c.key];
    return !cell || !Number.isFinite(cell[0]) || !Number.isInteger(cell[1]) || cell[1] < 30 || c.n < 30;
  }).map((c) => `${dim.key}.${c.key}`))]).filter(([, gaps]) => gaps.length));
}
export function validateRadarSpokeGate(view, keys, exceptions) {
  const failures = radarSpokeFailures(view, keys), seen = new Set();
  for (const e of exceptions) {
    if (!e || typeof e.key !== 'string' || typeof e.reason !== 'string' || !e.reason.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(e.since ?? '')) throw new Error('invalid spoke exception');
    if (seen.has(e.key)) throw new Error(`duplicate exception: ${e.key}`);
    seen.add(e.key);
    if (!keys.includes(e.key)) throw new Error(`unlisted exception: ${e.key}`);
    if (!failures[e.key]) throw new Error(`stale exception: ${e.key} meets the gate; remove it`);
    if (view.spokeExceptions?.[e.key] !== e.reason) throw new Error(`exception reason not displayed: ${e.key}`);
  }
  for (const [key, gaps] of Object.entries(failures)) if (!seen.has(key)) throw new Error(`${key}: below 30 on ${gaps.join(', ')}; requires an explicit reason`);
  return failures;
}
