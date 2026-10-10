import type { JevV16ReleaseArtifact, JevV16ReleaseSystem, JevV16Categories, JevV16CategoryDescriptor } from './jevbench-v16-release.mjs';
import type { V162Release } from './jevbench-v162-release.mjs';
// Own v1.6.4 types. The shared JevV16ReleaseSystem/JevV16Categories revision unions do not include 'v1.6.4' until the
// generic fresh Board/category change (PR #271) lands; they are not widened here and v1.6.4 is never typed as v1.6.2.
export type V164Revision = 'v1.6.4';
export type V164System = Omit<JevV16ReleaseSystem, 'measured_in'> & { measured_in: 'v1.6.2' | 'v1.6.3' | V164Revision; repo: string };
export type V164Artifact = Omit<JevV16ReleaseArtifact, 'systems' | 'revision'> & { revision: V164Revision; systems: V164System[] };
export type V164CategoryCell = { n: number; competence: number; coverage_n: number };
export type V164Categories = Omit<JevV16Categories, 'revision' | 'systems'> & { revision: V164Revision; topics: JevV16CategoryDescriptor[]; usecases: JevV16CategoryDescriptor[];
  families: JevV16CategoryDescriptor[]; types: JevV16CategoryDescriptor[]; systems: Record<string, Record<'topics' | 'usecases' | 'languages' | 'families' | 'types', Record<string, V164CategoryCell>>> };
export type V164Release = { artifact: V164Artifact; bytes: Uint8Array; sha256: string; categories: V164Categories; categoriesSha256: string;
  proof: Record<string, unknown>; proofSha256: string; manifest: Record<string, unknown>; manifestSha256: string; predecessorSha256: string;
  historical: V162Release['historical'] };
export const V164_ROOT: string;
export const V164_MANIFEST: string;
export const V164_FILE_KEYS: string[];
export const V164_FILES: Record<'results' | 'categories' | 'proof' | 'history' | 'history-carry', string>;
export const V163_PUBLICATION_SHA256: string;
export const V164_PREDECESSOR_COST_SHA256: string;
export const V164_BASE: string[];
export const V164_NATIVE: string[];
export const V164_WRAPPERS: string[];
export const V164_FIXED: string[];
export const V164_CORE: string[];
export const V164_COST_ITEMS: number;
export function assertPublicOnly(value: unknown, where?: string): void;
export function checkPublicSchema(value: unknown, node?: unknown): void;
export function jevbenchV164GenericSupport(): boolean;
export function validateJevbenchV164Bundle(bundle: unknown): unknown;
export function readOptionalJevbenchV164Release(root?: string, options?: { genericSupport?: () => boolean }): Promise<V164Release | null>;
export function hasPublishedJevbenchV164Release(root?: string, log?: (message: string) => void): Promise<boolean>;
/** True only once the shared Board/category types accept v1.6.4 (generic fresh interface, PR #271). */
export type V164GenericBoardReady = 'v1.6.4' extends JevV16Categories['revision'] ? ('v1.6.4' extends JevV16ReleaseSystem['measured_in'] ? true : false) : false;
/** Throws unless generic v1.6.4 support exists. Until the shared types accept v1.6.4 the declared fields are `never`
 *  (the call cannot return), so no v1.6.4 value is ever typed as a v1.6.2 artifact. */
export function v164BoardInput(release: V164Release, genericSupport?: () => boolean): V164GenericBoardReady extends true ? { artifact: V164Artifact; categories: V164Categories } : { artifact: never; categories: never };
