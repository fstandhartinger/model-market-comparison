export interface JevV14System {
  key: string;
  display: string;
  class: string;
  author: string;
  repo: string | null;
  licence: string;
  underlying: string | null;
  open: string;
  ranked: boolean;
  listing: string;
  rank: number | null;
  jevbench_score: number | null;
  axes: { intelligence: number | null; calibration: number | null; speed: number | null; cost: number | null };
  speed: { p50_s_raw: number | null; p95_s_raw: number | null; p50_s_adjusted?: number | null; p95_s_adjusted?: number | null; adjustment?: string };
  cost: { kind: string; usd_per_1000: number | null; basis: string };
  endpoint_kind?: string;
  endpoint_condition?: string;
  public_accuracy: number | null;
  sealed_accuracy: number | null;
  public_minus_sealed_gap_pp: number | null;
  api_flag: boolean;
  api_exposure_note: string | null;
  priority_run?: boolean;
  not_ranked_because: string | null;
  [key: string]: unknown;
}

export interface JevV14Artifact {
  benchmark: string;
  revision: string;
  protocol: string;
  status: string;
  generated_utc: string;
  score_name: string;
  score_one_liner: string;
  tiers: Record<string, number>;
  tier_weights: Record<string, number>;
  scoring: Record<string, unknown>;
  footnotes: Record<string, string>;
  systems: JevV14System[];
  sealed_weight: number;
  sealed_chance: number;
  [key: string]: unknown;
}

export function validateJevbenchV14(artifact: unknown): JevV14Artifact;
export function readJevbenchV14(root?: string): Promise<{ artifact: JevV14Artifact; bytes: Buffer; sha256: string }>;
export function jevbenchV14View(input: { artifact: JevV14Artifact; sha256: string }): {
  artifact: JevV14Artifact; sha256: string; revision: string; generated: string;
  ranked: JevV14System[]; unranked: JevV14System[]; systems: JevV14System[];
  rankedCount: number; publicDecisions: number; sealedDecisions: number; totalDecisions: number;
};
export function jevV14RowNote(footnote: string | null | undefined): string | null;
