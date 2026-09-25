import { readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

/** Staging bulk: rebuildable from the run's recorded base sha, never read by another run. */
export const STAGING_DIRECTORIES = ['work', 'before', 'benchmark-candidates'];
/** The evidence a later reader needs; never touched by either caller. */
export const RETAINED_DIRECTORIES = ['sources', 'gauntlet', 'review', 'workers', 'reports'];

/**
 * Compress the two audit datasets and drop the staging bulk of one finished run.
 *
 * A run that failed early has no `dataset-after.json`, and a directory compacted once has neither
 * in plain form, so a missing file is an ordinary outcome and not an error. The gzip of each file
 * that is present is verified by round-trip before the original goes.
 */
export async function compactRunDirectory(runDir) {
  const compressed = [], removed = [];
  for (const name of ['dataset-before.json', 'dataset-after.json']) {
    const path = join(runDir, 'reports', name);
    const bytes = await readFile(path).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (bytes === null) continue;
    const packed = gzipSync(bytes);
    await writeFile(path + '.gz', packed);
    if (!gunzipSync(await readFile(path + '.gz')).equals(bytes)) throw new Error(`Audit archive verification failed: ${name}`);
    await rm(path); compressed.push(`reports/${name}.gz`);
  }
  for (const name of STAGING_DIRECTORIES) {
    await rm(join(runDir, name), { recursive: true, force: true }); removed.push(name);
  }
  return { applied: true, compressed, removed, retained: [...RETAINED_DIRECTORIES] };
}

// Only a verified published run has its complete data/evidence in Git. Failed
// and dry runs keep their staging trees for investigation and owner acceptance —
// bounded in age by `prune-runs.mjs`, which reuses the compaction above.
export async function compactPublishedRun({ runDir, published, liveVerified, dryRun }) {
  if (published !== true || liveVerified !== true || dryRun !== false) return { applied: false };
  return compactRunDirectory(runDir);
}
