// CR-84: the shape lib/jevbench.mjs#jevbenchView returns. Bins are [n, mean confidence, accuracy]; an empty bin is [0, null, null].
export type JevBin = [number, number | null, number | null];
export type JevScope = { n: number; accuracy: number | null; majority: number | null; bins: JevBin[] | null; ece: number | null };
export type JevRow = {
  key: string; display: string; short: string; author: string; cls: string; open: string; openRank: number; licence: string; repo: string | null; underlying: string | null;
  adapter: string; probability: string; identities: string[]; complete: boolean; ranked: boolean; stopReason: string | null; started: string | null; finished: string | null;
  nAttempted: number; nPlanned: number; accuracy: number | null; ciLo: number | null; ciHi: number | null; nScenarios: number | null;
  cost: number | null; costReason: string | null; nCostKnown: number; priceIn: number | null; priceOut: number | null; priceSource: string | null;
  p50: number | null; p95: number | null; latencyN: number; firstRequest: number | null; failedN: number;
  ece: number | null; brier: number | null; validity: number | null; validityStrict: number | null; success: number | null; renormalized: number; truncated: number; ordinalMae: number | null;
  sameAnswer: number | null; bothCorrect: number | null; pairs: number; pairsValid: number; tokensIn: number | null; tokensOut: number | null;
  overall: JevScope; families: Record<string, JevScope>; cohorts: Record<string, JevScope>;
};
export type JevView = {
  generated: string; frozen: string; pilot: boolean; nDecisions: number;
  hardware: { concurrency: number; cpu: string; local_threads: number; origin: string; platform: string };
  splits: { name: string; n: number; sha256: string; canonical_sha256: string }[]; cohorts: Record<string, string>;
  familyNames: string[]; cohortNames: string[]; familyN: Record<string, number>; cohortN: Record<string, number>;
  repeatability: { accuracy_run_1: number; accuracy_run_2: number; n_compared: number; n_different_prediction: number; disagreement_rate: number; families_of_differences: string[]; note: string; system: string };
  methodNotes: string[]; measuredOn: string; ranked: JevRow[]; partial: JevRow[]; tooShort: JevRow[];
};
