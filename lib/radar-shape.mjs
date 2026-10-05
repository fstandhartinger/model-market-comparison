// CR-290 radar correction (Florian 5 Oct 2026 ~20:30, correction to CR-290 item 6): how a partly measured series may be drawn on a radar.
// A complete series is a filled polygon. A series with values on at least half the spokes and a run of at least three
// adjacent spokes draws lines only along such runs. Anything sparser is drawn as points only: a line through two or
// three scattered points (Jev 1.13.0 on the use-case radar) reads as a shape and as a weak system, which it is not.
export const MIN_RUN = 3;

/** Indices (in order) of maximal runs of adjacent present spokes, wrapping around the circle. */
export function presentRuns(present) {
  const n = present.length;
  if (!n) return [];
  if (present.every(Boolean)) return [present.map((_, i) => i)];
  const start = present.findIndex((p) => !p);
  const runs = [];
  let run = [];
  for (let j = 1; j <= n; j++) {
    const i = (start + j) % n;
    if (present[i]) run.push(i);
    else { if (run.length) runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  return runs;
}

/** 'polygon' | 'runs' | 'points' | 'none', and the runs to draw as lines (each run is a list of spoke indices). */
export function radarShape(present) {
  const n = present.length, count = present.filter(Boolean).length;
  if (!count) return { kind: 'none', runs: [] };
  if (count === n && n >= 3) return { kind: 'polygon', runs: [] };
  const runs = presentRuns(present).filter((r) => r.length >= MIN_RUN);
  return count * 2 >= n && runs.length ? { kind: 'runs', runs } : { kind: 'points', runs: [] };
}
