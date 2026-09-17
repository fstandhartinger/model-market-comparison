export interface CompositeInput {
  id: string;
  scores: {
    aa_coding_index?: number | null;
    aa_coding_agent?: number | null;
    aa_intelligence_index?: number | null;
    epoch_eci?: number | null;
    epoch_eci_software?: number | null;
    designarena_frontend?: number | null;
    designarena_fullstack?: number | null;
  };
  designarenaBattles?: { frontend?: number | null; fullstack?: number | null };
}

export const DEFAULT_MIN_DA_BATTLES: number;
export const COMPOSITE_DEFINITION: { version: string; slotCount: number; slots: string[] };
export function compositeEvidenceCount(
  row: CompositeInput,
  options?: { minDesignArenaBattles?: number },
): number;
export function computeCompositeScores(
  rows: CompositeInput[],
  options?: { minDesignArenaBattles?: number },
): Map<string, number>;
export function computeCompositeScoreDetails(
  rows: CompositeInput[],
  options?: { minDesignArenaBattles?: number },
): { scores: Map<string, number>; baseScores: Map<string, number> };
/** CR-74.4: points removed per point of positive Benchmaxxing signal, and its documented upper bound. */
export const BENCHMAXX_COMPOSITE_WEIGHT: number;
export const BENCHMAXX_COMPOSITE_WEIGHT_CAP: number;
/** CR-74.4: `composite − w·max(0, signal)` (0…100); identity when `include` is false or the signal is null / ≤ 0. */
export function benchmaxxingAdjustedComposite(composite: number, signal: number | null | undefined, include?: boolean): number;
export function benchmaxxingAdjustedComposite(composite: number | null | undefined, signal: number | null | undefined, include?: boolean): number | null;
