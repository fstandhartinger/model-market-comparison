// CR-74.1 (Florian 2026-09-17, supersedes CR-71.3): three Benchmaxxing tag levels on the CR-69 signed score, inclusive
// lower edges. A plain dependency-free module so client components (Overview tag, Benchmaxxing table, report) and the
// server (lib/benchmax.mjs) share one rule and one wording.
// CR-77.1/77.2 (Florian 2026-09-17): the level is decided by the score ALONE. The two old guards — n ≥
// BENCHMAXX_TAG_MIN_COMPARISONS and an 80 % bootstrap interval whose lower end is above zero — no longer suppress a
// tag; a tag that misses one of them is shown with the "uncertain" marker and says why (benchmaxxingUncertaintyNote).

export const BENCHMAXX_LIGHT_THRESHOLD = 3;
export const BENCHMAXX_MEDIUM_THRESHOLD = 6;
export const BENCHMAXX_STRONG_THRESHOLD = 12;
/** CR-65.6 → CR-77.2: below this many comparisons a tag is still shown, but marked uncertain. */
export const BENCHMAXX_TAG_MIN_COMPARISONS = 10;

/** The one-line tag rule shown next to every level list. */
export const BENCHMAXX_TAG_RULE_TEXT = 'the level follows the score alone';
/** The non-colour cue for a tag built on thin evidence, next to the pill and in the legend. */
export const BENCHMAXX_UNCERTAIN_MARK = '◔';
export const BENCHMAXX_UNCERTAIN_LABEL = 'uncertain';
/** The legend line for the marker (same pattern as the thin-data badge). */
export const BENCHMAXX_UNCERTAIN_TEXT = `${BENCHMAXX_UNCERTAIN_MARK} marks a tag built on fewer than ${BENCHMAXX_TAG_MIN_COMPARISONS} comparisons or on an interval that reaches below zero`;

/** Weakest first. `mark` is the non-colour cue shown before the word "Benchmaxxing"; `label` is the user-visible level. */
export const BENCHMAXX_LEVELS = Object.freeze([
  Object.freeze({ level: 'light', min: BENCHMAXX_LIGHT_THRESHOLD, label: 'light', mark: '?', title: 'Light' }),
  Object.freeze({ level: 'medium', min: BENCHMAXX_MEDIUM_THRESHOLD, label: 'medium', mark: '⚠', title: 'Medium' }),
  Object.freeze({ level: 'strong', min: BENCHMAXX_STRONG_THRESHOLD, label: 'very strong', mark: '⚠⚠', title: 'Very strong' }),
]);

/** The level a score reaches: 'strong' ≥ +12, 'medium' ≥ +6, 'light' ≥ +3, else null. The edges apply to the score as
 *  published (one decimal), so a pill reading "+12.0" can never carry the medium tag (11.98 → 12.0). */
export function benchmaxxingLevelFor(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  const shown = Number(score.toFixed(1));
  for (let k = BENCHMAXX_LEVELS.length - 1; k >= 0; k--) if (shown >= BENCHMAXX_LEVELS[k].min) return BENCHMAXX_LEVELS[k].level;
  return null;
}

export function benchmaxxingLevelInfo(level) {
  return BENCHMAXX_LEVELS.find((x) => x.level === level) ?? null;
}

/** One-line threshold rule for tooltips: "light ≥ +3, medium ≥ +6, very strong ≥ +12". */
export function benchmaxxingThresholdText() {
  return BENCHMAXX_LEVELS.map((x) => `${x.label} ≥ +${x.min}`).join(', ');
}

/** CR-77.2: why a shown tag is uncertain — thin coverage, an interval reaching below zero, or both; null when the tag
 *  rests on the full evidence. Same wording pattern as the thin-data badge ("Based on … — treat this … as uncertain").
 *  `intervalLower` is the lower end of the 80 % bootstrap interval, or null when none could be computed. */
export function benchmaxxingUncertaintyNote({ comparisons = null, intervalLower = null } = {}) {
  const thin = typeof comparisons === 'number' && Number.isFinite(comparisons) && comparisons < BENCHMAXX_TAG_MIN_COMPARISONS;
  const spansZero = !(typeof intervalLower === 'number' && Number.isFinite(intervalLower) && intervalLower > 0);
  if (!thin && !spansZero) return null;
  const parts = [];
  if (thin) parts.push(`based on only ${comparisons} comparison${comparisons === 1 ? '' : 's'}`);
  if (spansZero) parts.push(intervalLower == null ? 'no interval could be computed' : 'the 80 % interval reaches below zero');
  const text = parts.join(' and ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} — treat this tag as uncertain`;
}
