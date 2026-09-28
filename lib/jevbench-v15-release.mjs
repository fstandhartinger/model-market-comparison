import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV15Preview } from './jevbench-v15-preview.mjs';

// Public, aggregate-only JevBench v1.5.0 release artifact. The single status field is changed from the reviewed
// hidden preview to "released"; scores, ranks, intervals and source hashes are retained otherwise.
export const JEVBENCH_V15_RELEASE_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.0-results.json';

export async function readJevbenchV15Release(root = process.cwd()) {
  const bytes = await readFile(`${root}/${JEVBENCH_V15_RELEASE_ARTIFACT}`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const artifact = validateJevbenchV15Preview(JSON.parse(bytes.toString('utf8')));
  if (artifact.status !== 'released') throw new Error('JevBench v1.5.0 release artifact must have released status');
  return { artifact, bytes, sha256 };
}
