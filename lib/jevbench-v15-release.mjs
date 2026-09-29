import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV15Preview } from './jevbench-v15-preview.mjs';

// Public, aggregate-only JevBench releases. v1.5.0 remains frozen; v1.5.1 and v1.5.2 revise eligibility/ranks for
// complete roster-addendum rows and record their parent artifact hashes.
export const JEVBENCH_V15_RELEASE_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.0-results.json';
export const JEVBENCH_V151_RELEASE_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.1-results.json';
export const JEVBENCH_V152_RELEASE_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.2-results.json';

async function readRelease(revision, path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const artifact = validateJevbenchV15Preview(JSON.parse(bytes.toString('utf8')));
  if (artifact.revision !== revision || artifact.status !== 'released') throw new Error(`JevBench ${revision} release artifact must have released status`);
  return { artifact, bytes, sha256 };
}

export async function readJevbenchV150Release(root = process.cwd()) {
  return readRelease('v1.5.0', JEVBENCH_V15_RELEASE_ARTIFACT, root);
}

export async function readJevbenchV151Release(root = process.cwd()) {
  return readRelease('v1.5.1', JEVBENCH_V151_RELEASE_ARTIFACT, root);
}

export async function readJevbenchV152Release(root = process.cwd()) {
  return readRelease('v1.5.2', JEVBENCH_V152_RELEASE_ARTIFACT, root);
}

export const JEVBENCH_V153_RELEASE_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.3-results.json';
export async function readJevbenchV153Release(root = process.cwd()) {
  return readRelease('v1.5.3', JEVBENCH_V153_RELEASE_ARTIFACT, root);
}

// Backward-compatible name for callers pinned to the original v1.5.0 release.
export const readJevbenchV15Release = readJevbenchV150Release;

export const JEVBENCH_V154_RELEASE_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-results.json';
export async function readJevbenchV154Release(root = process.cwd()) {
  return readRelease('v1.5.4', JEVBENCH_V154_RELEASE_ARTIFACT, root);
}
