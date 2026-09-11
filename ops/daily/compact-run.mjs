import { readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

// Only a verified published run has its complete data/evidence in Git. Failed
// and dry runs keep their staging trees for investigation and owner acceptance.
export async function compactPublishedRun({ runDir, published, liveVerified, dryRun }) {
  if (published !== true || liveVerified !== true || dryRun !== false) return { applied: false };
  const compressed = [], removed = [];
  for (const name of ['dataset-before.json', 'dataset-after.json']) {
    const path = join(runDir, 'reports', name), bytes = await readFile(path), packed = gzipSync(bytes);
    await writeFile(path + '.gz', packed);
    if (!gunzipSync(await readFile(path + '.gz')).equals(bytes)) throw new Error(`Audit archive verification failed: ${name}`);
    await rm(path); compressed.push(`reports/${name}.gz`);
  }
  for (const name of ['work', 'before', 'benchmark-candidates']) {
    await rm(join(runDir, name), { recursive: true, force: true }); removed.push(name);
  }
  return { applied: true, compressed, removed, retained: ['sources', 'gauntlet', 'review', 'workers', 'reports'] };
}
