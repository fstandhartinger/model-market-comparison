import type { JevV15Artifact } from './jevbench-v15-preview.mjs';

export const JEVBENCH_V15_RELEASE_ARTIFACT: string;
export const JEVBENCH_V151_RELEASE_ARTIFACT: string;
export const JEVBENCH_V152_RELEASE_ARTIFACT: string;
export function readJevbenchV150Release(root?: string): Promise<{ artifact: JevV15Artifact; bytes: Uint8Array; sha256: string }>;
export function readJevbenchV151Release(root?: string): Promise<{ artifact: JevV15Artifact; bytes: Uint8Array; sha256: string }>;
export function readJevbenchV152Release(root?: string): Promise<{ artifact: JevV15Artifact; bytes: Uint8Array; sha256: string }>;
export function readJevbenchV15Release(root?: string): Promise<{ artifact: JevV15Artifact; bytes: Uint8Array; sha256: string }>;

export const JEVBENCH_V153_RELEASE_ARTIFACT: string;
export function readJevbenchV153Release(root?: string): Promise<{ artifact: JevV15Artifact; bytes: Uint8Array; sha256: string }>;
