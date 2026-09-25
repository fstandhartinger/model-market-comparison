import type { JevV14Artifact } from './jevbench-v14.mjs';

export type JevV142FamilySupplement = {
  benchmark: string; revision: string; kind: string; created_utc: string; base_artifact_sha256: string; note: string;
  sealed_family_n: Record<string, number>;
  hard_by_family: Record<string, Record<string, { correct: number; n: number; accuracy: number }>>;
};
export const JEVBENCH_V142_FAMILIES: string;
export const JEVBENCH_V142_FAMILIES_SHA256: string;
export function validateJevbenchV142Families(supplement: unknown, artifact: JevV14Artifact): JevV142FamilySupplement;
export function readJevbenchV142Families(root?: string): Promise<{ supplement: JevV142FamilySupplement; bytes: Buffer; sha256: string }>;
export function readJevbenchV142WithFamilies(root?: string): Promise<{ artifact: JevV14Artifact; bytes: Buffer; sha256: string; sealedFamilyN: Record<string, number>; familiesSha256: string }>;
