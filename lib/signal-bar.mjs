// F-112 (Fable pass 21, re-judged for the signed score in iteration 101): the Benchmaxxing Signal bar.
//
// F-112 as written asked for a 0 → catalog-max bar with a tick at the catalog average, because before CR-65.7 every
// "Strongest" bar had the same length. CR-69 then made the score *signed* (plus = better on famous public boards than
// on held-out ones, zero = no sign) and CR-74.2 made Featured the default list. On a 0 → max bar a negative score
// draws nothing, so on the live 17 Sep view 9 of the 17 default rows had an empty track and a reader could not tell
// −0.1 from −7.3. The judgment recorded here: with a signed score the meaningful reference is **zero**, not the
// catalog average, so the bar diverges around a zero line that every row shares. That keeps F-112's intent — one
// page-wide scale, one visible reference mark, a column that varies — under the newer semantics.
//
// The domain spans the whole scored catalog (never the visible list), so one model's bar has one position and one
// length on Featured, Top 50 and All scored alike.

/** The shared bar domain: the catalog's lowest and highest signal, always including zero, and zero's position in it. */
export function signalBarDomain(scores) {
  let min = 0;
  let max = 0;
  for (const score of scores ?? []) {
    if (typeof score !== 'number' || !Number.isFinite(score)) continue;
    if (score < min) min = score;
    if (score > max) max = score;
  }
  const span = max - min;
  // `min` is never above zero, so `|min| / span` is zero's position — written this way to avoid a -0 origin.
  return { min, max, span, zero: span > 0 ? Math.abs(min) / span : 0 };
}

/** Where one score's bar sits in that domain, as fractions of the track: `zero` is the shared baseline, `width` the
 *  magnitude, `sign` the side it grows to. A score of exactly zero draws no bar — "no sign" is the honest picture. */
export function signalBarGeometry(score, domain) {
  const { span, zero } = domain ?? { span: 0, zero: 0 };
  const value = typeof score === 'number' && Number.isFinite(score) ? score : 0;
  if (!(span > 0) || value === 0) return { sign: 'zero', width: 0, from: zero, fraction: 0 };
  const width = Math.min(1, Math.abs(value) / span);
  return value > 0
    ? { sign: 'pos', width, from: zero, fraction: value / span }
    : { sign: 'neg', width, from: Math.max(0, zero - width), fraction: value / span };
}
