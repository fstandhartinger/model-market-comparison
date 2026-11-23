// Page fix (Florian 23 Sep): every v1.4 row carries a footnote string, but most of it is provenance shared by
// dozens of rows ("already on the live v1.3.0 board", "re-run on a throwaway RunPod pod …") or repeats what the row
// already shows (the API flag, the not-ranked label). Only the remainder is a row-specific note worth a † marker.
const GENERIC_NOTE_SEGMENTS = [
  /^already on the live v1\.3\.0 board$/i,
  /^re-run on a throwaway RunPod pod with the original recipe; deviations in its manifest$/i,
  /^unranked \/ honorable mention$/i,
  // The board's headline already states how many decisions a complete run is, so a row repeating it says
  // nothing about that row. Written without the counts so a later release's totals do not slip past it.
  /^all [0-9,]+ decisions \([^)]*\) through JevBench's adapter\.?$/i,
];
const GENERIC_NOTE_PREFIXES = [
  /^re-run on a throwaway RunPod pod with the original recipe; deviations in its manifest;\s*/i,
  /^Round [0-9]+ (unpublished|new)\.\s*/i,
  // D246: this used to be a whole-segment "generic" rule ending in `.*$`, which swallowed everything the
  // publisher appended after the shared sentence — `qwen3.8-27b`'s only published reason for being partial
  // and unranked ("Chutes rate limit stopped the run after 81/308 items"; its `not_ranked_because` is null),
  // and two rows' sealed-answer counts. Stripping it as a prefix keeps the row-specific remainder, and a
  // segment that is nothing but the shared sentence still filters out because no remainder is left.
  /^(API measurement: )?sealed item text \(no golds\) was sent to[^;]*;?\s*/i,
];

/** The row-specific part of a v1.4 footnote, or null when the footnote only repeats shared provenance. */
/**
 * F-213 (Fable pass 40): a row's sealed family shares as numbers, whatever shape the artifact wrote them in.
 * v1.4.2.2 carries Imajev-4B's `sealed_aggregate.by_family` as `{ correct, n, accuracy }` objects while every
 * other row carries the bare share; a reader that multiplies an object prints "NaN%" and draws NaN polygons.
 * Nothing is invented: an entry without a finite share is null and stays a gap.
 */
export function sealedFamilyShares(row) {
  const families = row?.sealed_aggregate?.by_family;
  if (!families || typeof families !== 'object') return null;
  return Object.fromEntries(Object.entries(families).map(([family, value]) => {
    const share = typeof value === 'number' ? value : value && typeof value === 'object' ? value.accuracy : null;
    return [family, Number.isFinite(share) ? share : null];
  }));
}

/**
 * D238: the sealed-answer shortfall a row publishes, in the sentence eight of its nine siblings already use.
 *
 * Nine ranked v1.4.2.x rows answered fewer than all 308 sealed decisions validly. Eight of them say so in a
 * clause somebody typed into their footnote at publication time; `jevact` (237/308, the second largest
 * shortfall on the board) does not, so a page reader comparing rows could not see it while an API reader
 * could. Deriving the clause from `sealed_aggregate` instead of trusting the prose fixes that row and makes
 * the omission unrepeatable in a later release. Nothing is invented or rounded: both numbers are published
 * integers, and a row that does not publish them gets no clause.
 */
export function jevV14SealedShortfallNote(row) {
  const sealed = row?.sealed_aggregate;
  const answered = sealed?.answered_valid;
  const n = sealed?.n;
  if (!Number.isInteger(answered) || !Number.isInteger(n) || n <= 0 || answered >= n) return null;
  return `${answered}/${n} sealed items answered validly (failures count as wrong)`;
}

export function jevV14RowNote(footnote, row) {
  const parts = typeof footnote === 'string'
    ? footnote.split(' | ').map((part) => {
      let text = part.trim();
      for (const prefix of GENERIC_NOTE_PREFIXES) text = text.replace(prefix, '');
      return text.trim();
    }).filter((text) => text && !GENERIC_NOTE_SEGMENTS.some((re) => re.test(text)))
    : [];
  // The derived clause is appended only when the row's own prose does not already carry that exact ratio,
  // so the eight rows that publish it keep the wording they published and never print the number twice.
  const shortfall = jevV14SealedShortfallNote(row);
  if (shortfall) {
    const ratio = new RegExp(`\\b${row.sealed_aggregate.answered_valid}\\s*/\\s*${row.sealed_aggregate.n}\\b`);
    if (!parts.some((text) => ratio.test(text))) parts.push(shortfall);
  }
  if (!parts.length) return null;
  const joined = parts.join(' ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}
