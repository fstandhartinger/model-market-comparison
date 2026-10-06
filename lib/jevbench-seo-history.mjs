import { readJevbenchV12, jevbenchV12View } from './jevbench-v12.mjs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { isJevbenchV16ExcludedKey } from './jevbench-v16-public-scope.mjs';

const compareRevision = (a, b) => a.localeCompare(b, 'en', { numeric: true });
/** Only committed public results with an existing frozen page, never preview/draft discovery. */
export async function readSeoHistory(root, currentRevision) {
  const base = join(root, 'data/raw/benchmarks/jevbench');
  const files = await readdir(base, { recursive: true });
  const releases = [];
  for (const file of files.filter((f) => /results\.json$/.test(f))) {
    const artifact = JSON.parse(await readFile(join(base, file), 'utf8'));
    const revision = artifact.revision;
    if (!revision || compareRevision(revision, currentRevision) >= 0 || !['final', 'released', 'published'].includes(artifact.status)) continue;
    try { await readFile(join(root, 'app/jev-models', revision, 'page.tsx')); } catch { continue; }
    const date = artifact.published_on ?? artifact.generated_utc ?? artifact.generated ?? artifact.overnight?.scored_utc ?? null;
    releases.push({ revision, date, systems: (artifact.systems ?? []).filter((s) => !isJevbenchV16ExcludedKey(s.key)) });
  }
  const old = jevbenchV12View(await readJevbenchV12(root));
  releases.push({revision: old.revision, date: old.generated, systems: [...old.ranked,...old.honorable,...old.partial].filter((r) => !isJevbenchV16ExcludedKey(r.key)).map((r) => ({
    ...r, class:r.cls, repo:r.link, jevbench_score:r.main, cost:{kind:r.costKind,usd_per_1000:r.usd,basis:r.costBasis ?? ''},
  }))});
  return releases.sort((a, b) => compareRevision(b.revision, a.revision));
}
