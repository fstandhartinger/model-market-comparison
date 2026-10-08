#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { jevWithApiA4Rows, jevScopeClassifier, jevbenchScopeArtifact } from '../lib/jevbench-scope.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { rankedEligibleUsecaseKeys, usecaseReleaseReview } from '../lib/jevbench-usecase-review.mjs';

/** Same published release and live API overlays as JevBenchV16ReleaseRoute. No sealed inputs. */
export async function currentUsecaseReleaseReview(root = fileURLToPath(new URL('../', import.meta.url))) {
  const [release, previous] = await Promise.all([readCurrentJevbench(root), readJevbenchV157Release(root)]);
  const api = JSON.parse(readFileSync(`${root}/data/jevbench-api-a4-equated.json`, 'utf8'));
  const meta = new Map([...previous.artifact.systems, ...release.carry.rows].map((r) => [r.key, r]));
  // Per-type split overlays change no rank, eligibility or category value.
  const merged = release.artifact.revision === 'v1.6.1' ? jevWithApiA4Rows(release.artifact, api, meta) : release.artifact;
  const isApi = jevScopeClassifier(merged.systems, release.carry.rows, previous.artifact.systems, previous.artifact.not_measured);
  const boards = Object.fromEntries(['open', 'api'].map((scope) => [scope, jevbenchScopeArtifact(merged, scope, isApi)]));
  const keys = rankedEligibleUsecaseKeys(boards);
  const view = jevbenchCategoryView(merged.revision, keys, { supplement: merged !== release.artifact });
  return { ...usecaseReleaseReview(view, keys), boards: Object.fromEntries(Object.entries(boards)
    .map(([scope, board]) => [scope, rankedEligibleUsecaseKeys({ [scope]: board })])) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await currentUsecaseReleaseReview();
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`${report.revision}: ${report.eligibleKeys.length} distinct ranked eligible models (open ${report.boards.open.length}, API ${report.boards.api.length})`);
    const number = (n) => n == null ? 'missing' : Number(n.toFixed(3));
    for (const c of report.categories) console.log(`${c.reviewRequired ? 'REVIEW' : 'OK'} ${c.key}: coverage ${c.measured}/${c.eligible}; best ${number(c.best)}; median ${number(c.median)}; best-minus-median ${number(c.bestMinusMedian)}; ${[...c.flags, ...c.coverageIssues].join(', ')}`);
    console.log(report.methodNote);
  }
  // Report mode always emits findings. Check mode stops release automation pending review.
  if (process.argv.includes('--check') && report.reviewRequired) process.exitCode = 1;
}
