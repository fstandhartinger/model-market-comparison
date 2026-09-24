export const JEVBENCH_V11_ARTIFACT: string;
export const JEVBENCH_V11_SHA256: string;
export function recomputePooledAccuracy(system: any, tierCounts: Record<string, number>): number | null;
export function validateJevbenchV11PooledAccuracy(artifact: any): any;
export const VENDOR_LINKS: Record<string, string>;
export const TIERS: ('easy' | 'standard' | 'judge')[];
export type JevTier = 'easy' | 'standard' | 'judge';
export type JevV11Row = {
  key: string; display: string; author: string; cls: string; repo: string | null; link: string | null; licence: string; open: 'yes' | 'weights' | 'no'; note: string | null;
  ranked: boolean; main: number | null; capability: number | null; speed: number | null; cost: number | null;
  tiers: Record<JevTier, number | null>; coverage: Record<JevTier, number | null>; decisions: number | null;
  p50: number | null; p95: number | null; usd: number | null; costKind: 'measured' | 'estimate' | 'unknown'; costBasis: string;
  hasDistribution: boolean; brier: number | null; calibrationNote: string | null; probability: string; source: string | null;
  rankUnder: Record<string, number> | null; sensitivity: Record<string, number> | null;
};
export type JevV11View = {
  sha256: string; protocol: string; benchmark: string; generated: string; decisions: number; pilot: boolean;
  weights: { capability: number; speed: number; cost: number }; scoring: Record<string, string>; tierCounts: Record<JevTier, number>;
  tierNotes: Record<string, string>; notComparableWith: string | null; sensitivityOrder: string[]; hardwareOrigin: string;
  referencePrices: any; revision: string | null; revisionNote: string | null; ranked: JevV11Row[]; partial: JevV11Row[];
};
export function mainScore(system: any, weights: { capability: number; speed: number; cost: number }): number | null;
export function validateJevbenchV11(artifact: any): any;
export function readJevbenchV11(root?: string): Promise<{ artifact: any; bytes: Buffer; sha256: string; sourceSha256: string }>;
export function jevbenchV11View(data: { artifact: any; sha256: string }): JevV11View;
