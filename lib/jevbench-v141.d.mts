import type { JevV14Artifact } from './jevbench-v14.mjs';

export const JEVBENCH_V141_ARTIFACT: string;
export const JEVBENCH_V141_SHA256: string;
export const JEVBENCH_V141_TOP5: string[];
export function validateJevbenchV141(artifact: unknown): JevV14Artifact;
export function readJevbenchV141(root?: string): Promise<{ artifact: JevV14Artifact; bytes: Buffer; sha256: string }>;
export function jevbenchV141View(input: { artifact: JevV14Artifact; sha256: string }): {
  artifact: JevV14Artifact; sha256: string; revision: string; generated: string;
  ranked: JevV14Artifact['systems']; unranked: JevV14Artifact['systems']; systems: JevV14Artifact['systems'];
  rankedCount: number; publicDecisions: number; sealedDecisions: number; totalDecisions: number;
};
