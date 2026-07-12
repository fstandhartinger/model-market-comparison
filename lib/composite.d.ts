export interface CompositeInput {
  id: string;
  scores: {
    aa_coding_index?: number | null;
    aa_coding_agent?: number | null;
    aa_intelligence_index?: number | null;
    designarena_frontend?: number | null;
    designarena_fullstack?: number | null;
  };
  designarenaBattles?: { frontend?: number | null; fullstack?: number | null };
}

export const DEFAULT_MIN_DA_BATTLES: number;
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
