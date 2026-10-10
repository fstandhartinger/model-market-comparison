import type { JevV16ReleaseArtifact, JevV16ReleaseSystem, JevV16Categories, JevV16CategoryDescriptor } from './jevbench-v16-release.mjs';
import type { V162Release } from './jevbench-v162-release.mjs';
// Own v1.6.3 types. The shared JevV16ReleaseSystem/JevV16Categories revision unions do not include 'v1.6.3' until the
// generic fresh Board/category change (PR #271) lands; they are not widened here and v1.6.3 is never typed as v1.6.2.
export type V163Revision = 'v1.6.3';
export type V163System = Omit<JevV16ReleaseSystem, 'measured_in'> & { measured_in: 'v1.6.2' | V163Revision; repo: string };
export type V163Artifact = Omit<JevV16ReleaseArtifact, 'systems' | 'revision'> & { revision: V163Revision; systems: V163System[] };
export type V163CategoryCell = { n: number; competence: number; coverage_n: number };
export type V163Categories = Omit<JevV16Categories, 'revision' | 'systems'> & { revision: V163Revision; topics: JevV16CategoryDescriptor[]; usecases: JevV16CategoryDescriptor[];
  families: JevV16CategoryDescriptor[]; types: JevV16CategoryDescriptor[]; systems: Record<string, Record<'topics' | 'usecases' | 'languages' | 'families' | 'types', Record<string, V163CategoryCell>>> };
export type V163Release = { artifact: V163Artifact; bytes: Uint8Array; sha256: string; categories: V163Categories; categoriesSha256: string;
  proof: Record<string, unknown>; proofSha256: string; manifest: Record<string, unknown>; manifestSha256: string; predecessorSha256: string;
  historical: V162Release['historical'] };
export const V163_ROOT: string;
export const V163_MANIFEST: string;
export const V163_FILE_KEYS: string[];
export const V163_FILES: Record<'results' | 'categories' | 'proof' | 'history' | 'history-carry', string>;
export const V162_PUBLICATION_SHA256: string;
export const V163_PREDECESSOR_COST_SHA256: string;
export const V163_BASE: string[];
export const V163_NATIVE: string[];
export const V163_WRAPPERS: string[];
export const V163_FIXED: string[];
export const V163_CORE: string[];
export const V163_COST_ITEMS: number;
export function assertPublicOnly(value: unknown, where?: string): void;
export function checkPublicSchema(value: unknown, node?: unknown): void;
export function jevbenchV163GenericSupport(): boolean;
export function validateJevbenchV163Bundle(bundle: unknown): unknown;
export function readOptionalJevbenchV163Release(root?: string, options?: { genericSupport?: () => boolean }): Promise<V163Release | null>;
export function hasPublishedJevbenchV163Release(root?: string, log?: (message: string) => void): Promise<boolean>;
/** True only once the shared Board/category types accept v1.6.3 (generic fresh interface, PR #271). */
export type V163GenericBoardReady = 'v1.6.3' extends JevV16Categories['revision'] ? ('v1.6.3' extends JevV16ReleaseSystem['measured_in'] ? true : false) : false;
/** Throws unless generic v1.6.3 support exists. Until the shared types accept v1.6.3 the declared fields are `never`
 *  (the call cannot return), so no v1.6.3 value is ever typed as a v1.6.2 artifact. */
export function v163BoardInput(release: V163Release, genericSupport?: () => boolean): V163GenericBoardReady extends true ? { artifact: V163Artifact; categories: V163Categories } : { artifact: never; categories: never };
