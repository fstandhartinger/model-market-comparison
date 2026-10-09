import type { JevV16ReleaseArtifact, JevV16Categories } from './jevbench-v16-release.mjs';
import { readJevbenchV161Release } from './jevbench-v16-release.mjs';
export const V162_ROOT: string;
export const V162_MANIFEST: string;
export type V162Release = { artifact: JevV16ReleaseArtifact; bytes: Uint8Array; sha256: string; categories: JevV16Categories; categoriesSha256: string; proof: Record<string, unknown>; proofSha256: string; manifest: Record<string, unknown>; historical: Awaited<ReturnType<typeof readJevbenchV161Release>> };
export function readOptionalJevbenchV162Release(root?: string): Promise<V162Release | null>;
export function validateJevbenchV162Bundle(bundle: unknown): unknown;
