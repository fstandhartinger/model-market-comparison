// ImageJevBench v0.3 sample floor (standing rule 12 Nov 2026; Florian 27 Nov 2026, Telegram #20535 "Mit Datum"):
// an image-type or use-case cell is published only with at least 30 scored items and 30 completed responses. Smaller cells
// are withheld from data/imagejev-v03.json and recorded in categories.withheld with the row's last measurement date; the
// compare radars say which cells are withheld and since when the row has not been re-measured.
export const IMAGEJEV_V03_MIN_CELL_N = 30;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatMeasuredDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : null;
}

/** Per row and dimension, one sentence naming the withheld cells and the last measurement date. */
export function imageJevWithheldNotes(categories) {
  const labels = Object.fromEntries((categories?.dims ?? []).map((d) => [d.key, Object.fromEntries(d.cats.map((c) => [c.key, c.label]))]));
  const notes = {};
  for (const [key, w] of Object.entries(categories?.withheld ?? {})) {
    const since = formatMeasuredDate(w.last_measured_utc);
    for (const [dim, cells] of Object.entries(w.cells ?? {})) {
      if (!cells.length) continue;
      const names = cells.map((c) => labels[dim]?.[c] ?? c).join(', ');
      (notes[key] ??= {})[dim] = `${names}: withheld, fewer than ${IMAGEJEV_V03_MIN_CELL_N} completed answers${since ? `; not re-measured since ${since}` : ''}`;
    }
  }
  return notes;
}

/** Cells of listed rows that are published under the floor, or absent without a dated withheld record. */
export function imageJevSampleFloorViolations(release, dims = ['capabilities', 'usecases']) {
  const { categories, ranking } = release;
  const failures = [];
  for (const { key, last_measured_utc } of ranking) {
    const w = categories.withheld?.[key];
    for (const dimKey of dims) {
      const dim = categories.dims.find((d) => d.key === dimKey);
      if (!dim?.cats.length) { failures.push(`${dimKey}: missing category catalog`); continue; }
      for (const { key: cat } of dim.cats) {
        const cell = categories.systems[key]?.[dimKey]?.[cat];
        const recorded = w?.cells?.[dimKey]?.includes(cat);
        if (!cell) {
          if (!recorded) failures.push(`${key}/${dimKey}/${cat}: absent without a withheld record`);
          else if (!formatMeasuredDate(w.last_measured_utc) || w.last_measured_utc !== String(last_measured_utc).slice(0, 10)) failures.push(`${key}: withheld record needs the row's last measurement date`);
          continue;
        }
        if (recorded) failures.push(`${key}/${dimKey}/${cat}: published and recorded as withheld`);
        const [, scored, completed = scored] = cell;
        if (!Number.isInteger(scored) || scored < IMAGEJEV_V03_MIN_CELL_N || !Number.isInteger(completed) || completed < IMAGEJEV_V03_MIN_CELL_N)
          failures.push(`${key}/${dimKey}/${cat}: scored=${scored}, completed=${completed}`);
      }
    }
  }
  return failures;
}

/** Cells of one row and dimension withheld under the floor (tests: published + withheld = the full catalogue). */
export function withheldCells(categories, key, dim) {
  return categories?.withheld?.[key]?.cells?.[dim] ?? [];
}

/** Scored items of a row's dimension: published cells plus the withheld cells' scored counts from the answered-coverage audit. */
export function scoredTotal(categories, key, dim, audited) {
  const published = Object.values(categories.systems[key]?.[dim] ?? {}).reduce((n, c) => n + c[1], 0);
  return withheldCells(categories, key, dim).reduce((n, c) => n + (audited?.cells?.[dim]?.[c]?.[0] ?? 0), published);
}
