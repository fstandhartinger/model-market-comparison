import type { JevV14Artifact } from './jevbench-v14.mjs';

export const JEVBENCH_V142_ARTIFACT: string;
export const JEVBENCH_V142_SHA256: string;
export const JEVBENCH_V142_TOP5: string[];
export function validateJevbenchV142(artifact: unknown): JevV14Artifact;
export function readJevbenchV142(root?: string): Promise<{ artifact: JevV14Artifact; bytes: Buffer; sha256: string }>;
export function jevbenchV142View(input: { artifact: JevV14Artifact; sha256: string }): {
  artifact: JevV14Artifact; sha256: string; revision: string; generated: string;
  ranked: JevV14Artifact['systems']; unranked: JevV14Artifact['systems']; systems: JevV14Artifact['systems'];
  rankedCount: number; publicDecisions: number; sealedDecisions: number; totalDecisions: number;
};
