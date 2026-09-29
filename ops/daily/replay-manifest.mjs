import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

function startedAtFromWorkDir(workDir) {
  const runName = basename(dirname(resolve(workDir)));
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z-\d+$/.exec(runName);
  if (!match) throw new Error(`cannot read daily-run timestamp from ${runName}`);
  const startedAt = Date.parse(`${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`);
  if (!Number.isFinite(startedAt)) throw new Error(`invalid daily-run timestamp in ${runName}`);
  return startedAt;
}

/**
 * Pick the newest successful receipt for this source captured after the specified daily run began.
 * The returned receipt is resolved relative to the run worktree, which is where daily manifests
 * store their repo-relative files.
 */
export async function replayManifestForRun({ workDir, source, captureKey }) {
  const startedAt = startedAtFromWorkDir(workDir);
  const evidenceDir = join(resolve(workDir), 'data/raw/benchmarks/daily-evidence');
  const sourceKey = captureKey(source);
  const candidates = [];

  for (const entry of await readdir(evidenceDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(evidenceDir, entry.name, 'manifest.json');
    let manifest;
    try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
    catch (error) {
      if (error.code === 'ENOENT') continue;
      throw new Error(`cannot read ${manifestPath}: ${error.message}`);
    }
    if (!Array.isArray(manifest)) throw new Error(`${manifestPath}: expected a receipt array`);
    for (const receipt of manifest) {
      if (receipt.status !== 200 || captureKey(receipt) !== sourceKey) continue;
      const capturedAt = Date.parse(receipt.retrieved_at ?? receipt.fetched_at ?? '');
      if (Number.isFinite(capturedAt) && capturedAt >= startedAt) {
        candidates.push({ manifestPath, capturedAt });
      }
    }
  }

  candidates.sort((a, b) => b.capturedAt - a.capturedAt);
  if (!candidates.length) {
    throw new Error(`no successful capture of ${sourceKey} in ${evidenceDir} from this daily run`);
  }
  return candidates[0].manifestPath;
}
