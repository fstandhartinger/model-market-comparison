export const JEVBENCH_ARTIFACT: string;
export const JEVBENCH_AVAILABILITY: string;
export const JEVBENCH_REPO: string;

export type JevGroup = { accuracy: number | null; n: number; planned: number };
export type JevBin = { lo: number; hi: number; n: number; accuracy: number | null; confidence: number | null };
export type JevRow = {
  key: string; display: string; author: string; cls: string; repo: string | null; licence: string; open: 'yes' | 'weights' | 'no'; underlying: string | null;
  probability: string; identity: string; adapter: string; reasoningEffort: string | null; complete: boolean; ranked: boolean; stopReason: string | null;
  runStarted: string | null; runFinished: string | null;
  accuracy: number | null; ciLo: number | null; ciHi: number | null; nScenarios: number | null; nPlanned: number; nAttempted: number; nScorable: number;
  cost: number | null; costKnown: number; costBasis: string[]; priceSource: string; priceIn: number | null; priceOut: number | null;
  p50: number | null; p95: number | null; latencyN: number; firstRequest: number | null; failedN: number; failedP50: number | null;
  ece: number | null; brier: number | null; validity: number | null; validityStrict: number | null; opSuccess: number | null;
  renormalized: number; truncated: number; meanIn: number | null; meanOut: number | null;
  sameAnswer: number | null; bothCorrect: number | null; pairs: number; bothValid: number;
  bins: JevBin[]; byFamily: Record<string, JevGroup>; byCohort: Record<string, JevGroup>;
};
export type JevView = {
  sha256: string; protocol: string; benchmark: string; generated: string; frozenAt: string; pilot: boolean; labelsChangedAfterInference: boolean;
  decisions: number; hardware: Record<string, unknown>; splits: { name: string; n: number; sha256: string }[];
  cohorts: Record<string, string>; methodNotes: string[]; repeatability: Record<string, unknown> | null;
  familyFloors: Record<string, { floor: number | null; n: number }>; cohortFloors: Record<string, { floor: number | null; n: number }>;
  ranked: JevRow[]; partial: JevRow[]; unrunnable: JevRow[];
  notMeasured: { candidate: string; author: string; reason: string }[];
  findings: { id: string; text: string }[];
};
export type JevbenchData = { artifact: any; availability: any; sha256: string; bytes: Buffer };

export function validateJevbenchArtifact(artifact: any): any;
export function readJevbench(root?: string): Promise<JevbenchData>;
export function jevbenchView(data: { artifact: any; availability: any; sha256: string }): JevView;
export function jevbenchFindings(ranked: JevRow[], partial?: JevRow[]): { id: string; text: string }[];
