import type { JevV15Artifact } from './jevbench-v15-preview.mjs';

export const JEVBENCH_V15_RELEASE_ARTIFACT: string;
export function readJevbenchV15Release(root?: string): Promise<{ artifact: JevV15Artifact; bytes: Uint8Array; sha256: string }>;
