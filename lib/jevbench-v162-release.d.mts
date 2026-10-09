import type { JevV16ReleaseArtifact, JevV16Categories } from './jevbench-v16-release.mjs';
import { readJevbenchV161Release } from './jevbench-v16-release.mjs';
export const V162_ROOT: string;
export const V162_MANIFEST: string;
export type V162Release = { artifact: JevV16ReleaseArtifact; bytes: Uint8Array; sha256: string; categories: JevV16Categories; categoriesSha256: string; proof: Record<string, unknown>; proofSha256: string; manifest: Record<string, unknown>; historical: Pick<Awaited<ReturnType<typeof readJevbenchV161Release>>, 'artifact' | 'bytes' | 'sha256' | 'carry' | 'carrySha256'> };
export function readOptionalJevbenchV162Release(root?: string): Promise<V162Release | null>;
export function validateJevbenchV162Bundle(bundle: unknown): unknown;

export const V162_HISTORY_SHA256: string;
export const V162_CARRY_SHA256: string;
export function hasPublishedJevbenchV162Release(root?: string, log?: (message: string) => void): Promise<boolean>;
export function historicalCatalogue(artifact: JevV16ReleaseArtifact, carry: V162Release['historical']['carry']): Array<JevV16ReleaseArtifact['systems'][number] | JevV16ReleaseArtifact['not_measured'][number] | V162Release['historical']['carry']['rows'][number]>;
