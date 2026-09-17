export type BenchmaxxingLevel = 'light' | 'medium' | 'strong';
export type BenchmaxxingLevelInfo = { level: BenchmaxxingLevel; min: number; label: string; mark: string; title: string };
export const BENCHMAXX_LIGHT_THRESHOLD: number;
export const BENCHMAXX_MEDIUM_THRESHOLD: number;
export const BENCHMAXX_STRONG_THRESHOLD: number;
export const BENCHMAXX_TAG_MIN_COMPARISONS: number;
/** CR-77.1: "the level follows the score alone" — the one-line tag rule shown next to every level list. */
export const BENCHMAXX_TAG_RULE_TEXT: string;
/** CR-77.2: the marker, its word and the legend line for a tag built on thin evidence. */
export const BENCHMAXX_UNCERTAIN_MARK: string;
export const BENCHMAXX_UNCERTAIN_LABEL: string;
export const BENCHMAXX_UNCERTAIN_TEXT: string;
export const BENCHMAXX_LEVELS: readonly BenchmaxxingLevelInfo[];
export function benchmaxxingLevelFor(score: number | null | undefined): BenchmaxxingLevel | null;
export function benchmaxxingLevelInfo(level: BenchmaxxingLevel | null | undefined): BenchmaxxingLevelInfo | null;
export function benchmaxxingThresholdText(): string;
/** CR-77.2: why a shown tag rests on thin evidence, or null when it does not. */
export function benchmaxxingUncertaintyNote(input?: { comparisons?: number | null; intervalLower?: number | null }): string | null;
