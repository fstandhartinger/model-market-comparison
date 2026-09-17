// CR-74.1 (Florian 2026-09-17, supersedes CR-71.3): three Benchmaxxing tag levels on the CR-69 signed score, inclusive
// lower edges. A plain dependency-free module so client components (Overview tag, Benchmaxxing table, report) and the
// server (lib/benchmax.mjs) share one rule and one wording. The honesty guards — n ≥ BENCHMAXX_TAG_MIN_COMPARISONS and
// an 80 % bootstrap interval whose lower end is above zero — are applied in benchmaxxingSignals, never here.

export const BENCHMAXX_LIGHT_THRESHOLD = 3;
export const BENCHMAXX_MEDIUM_THRESHOLD = 6;
export const BENCHMAXX_STRONG_THRESHOLD = 12;
/** The guard text shown next to every level list. Keep in sync with BENCHMAXX_TAG_MIN_COMPARISONS (10). */
export const BENCHMAXX_GUARD_TEXT = 'needs ≥ 10 comparisons and an interval above zero';

/** Weakest first. `mark` is the non-colour cue shown before the word "Benchmaxxing"; `label` is the user-visible level. */
export const BENCHMAXX_LEVELS = Object.freeze([
  Object.freeze({ level: 'light', min: BENCHMAXX_LIGHT_THRESHOLD, label: 'light', mark: '?', title: 'Light' }),
  Object.freeze({ level: 'medium', min: BENCHMAXX_MEDIUM_THRESHOLD, label: 'medium', mark: '⚠', title: 'Medium' }),
  Object.freeze({ level: 'strong', min: BENCHMAXX_STRONG_THRESHOLD, label: 'very strong', mark: '⚠⚠', title: 'Very strong' }),
]);

/** The level a score reaches before the guards: 'strong' ≥ +12, 'medium' ≥ +6, 'light' ≥ +3, else null. The edges apply
 *  to the score as published (one decimal), so a pill reading "+12.0" can never carry the medium tag (11.98 → 12.0). */
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
