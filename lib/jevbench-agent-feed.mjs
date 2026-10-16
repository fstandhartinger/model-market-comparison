import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { assembleJevBoard, readLatestJevbenchRelease } from './jevbench-live-board.mjs';
import { readJevbenchV161Release } from './jevbench-v16-release.mjs';
import { readJevbenchV157Release } from './jevbench-v15-release.mjs';
import { jevLiveAllArtifact } from './jevbench-cohort-merge.mjs';
import { jevLatencyJsonFields } from './jev-latency.mjs';
import { readCurrentJevbench, CURRENT_JEVBENCH_PAGE } from './jevbench-current.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from './jevbench-jev-class.mjs';
import { jevV15BoardSystem } from './jevbench-v15-board.mjs';
import { jevScopeClassifier, jevbenchScopeArtifact, jevRowScope } from './jevbench-scope.mjs';

const finite = (v) => Number.isFinite(v) ? v : null;

/**
 * Explicit public projection. Do not serialize raw artifacts or arbitrary row fields.
 * `options` (live merged board only): `scopeArtifact` is the unscoped merged artifact the open/api scope views are cut
 * from (defaults to `artifact`), `isApi` the board's scope classifier, `latestRelease` the newest release on the board.
 */
export function projectJevbenchFeed(artifact, artifactSha256, options = {}) {
  if (!['released', 'published'].includes(artifact.status)) throw new Error('Agent feed requires a released or published artifact');
  const classOptions = /^v1\.6(\.|$)/.test(String(artifact.revision)) ? { ...JEV_V16_CLASS_OPTIONS, nearCapPrecision: true } : undefined;
  const view = jevClassRows(artifact.systems.map(jevV15BoardSystem), classOptions);
  let rank = 0;
  const capabilities = new Map(view.rows.map((r) => [r.row.key, {
    score: r.capability,
    rank: r.inClass && r.row.ranked ? ++rank : null,
    eligible: r.inClass && !!r.row.ranked,
    within_caps: r.inClass,
    reasons: r.reasons,
  }]));
  // Review 6 Oct 2026: /jev-models ranks open weights only (API offerings live on /jev-models/api), so the feed also
  // carries the open-board Capability rank the page shows. `capability.rank` stays the combined rank for compatibility.
  const isApi = options.isApi ?? jevScopeClassifier(artifact.systems);
  const scopeSource = options.scopeArtifact ?? artifact;
  const openArtifact = jevbenchScopeArtifact(scopeSource, 'open', isApi);
  const openComposite = new Map(openArtifact.systems.map((s) => [s.key, s.ranked ? s.rank ?? null : null]));
  const openView = jevClassRows(openArtifact.systems.map(jevV15BoardSystem), classOptions);
  let openRank = 0;
  const openRanks = new Map(openView.rows.map((r) => [r.row.key, r.inClass && r.row.ranked && jevRowScope(r.row, isApi) === 'open' ? ++openRank : null]));
  const apiArtifact = jevbenchScopeArtifact(scopeSource, 'api', isApi);
  const apiComposite = new Map(apiArtifact.systems.map((s) => [s.key, s.ranked ? s.rank ?? null : null]));
  const apiView = jevClassRows(apiArtifact.systems.map(jevV15BoardSystem), classOptions);
  let apiRank = 0;
  const apiRanks = new Map(apiView.rows.map((r) => [r.row.key, r.inClass && r.row.ranked && jevRowScope(r.row, isApi) === 'api' ? ++apiRank : null]));
  const latestRelease = options.latestRelease ?? artifact.revision;
  return {
    schema_version: 1,
    benchmark: 'JevBench',
    // Newest JevBench release on the live merged board; `base_release` is the release the board is built on.
    revision: latestRelease,
    latest_release: latestRelease,
    latest_release_page: `/jev-models/${latestRelease}`,
    base_release: artifact.revision,
    source: { page: '/jev-models', version_page: CURRENT_JEVBENCH_PAGE,
      // Legacy field retained for existing clients; it names a version page, not immutable bytes.
      frozen_page: CURRENT_JEVBENCH_PAGE,
      artifact: `/api/jevbench/${artifact.revision}`, artifact_sha256: artifactSha256 },
    boards: { open: '/jev-models', api: '/jev-models/api' },
    headline: 'capability',
    composite_option: artifact.headline,
    weights: Object.fromEntries(['intelligence', 'calibration', 'speed', 'cost'].map((axis) => [axis, artifact.options[artifact.headline].weights[axis]])),
    capability_policy: {
      definition: 'Arithmetic mean of Intelligence and Calibration; ranked models within both official caps',
      reference_key: view.reference.key || 'jev-1.13.0@v1.5.7',
      cost_cap_usd_per_1000: view.limits.cost,
      median_latency_cap_s: view.limits.latency,
      factor: view.limits.factor,
    },
    systems: artifact.systems.map((row) => ({
      key: row.key,
      name: row.display,
      board: jevRowScope(row, isApi),
      source_url: row.repo ?? null,
      axes: Object.fromEntries(['intelligence', 'calibration', 'speed', 'cost'].map((axis) => [axis, finite(row.axes?.[axis])])),
      capability: { ...(capabilities.get(row.key) ?? { score: null, rank: null, eligible: false, within_caps: false, reasons: ['Intelligence or Calibration unavailable'] }), open_board_rank: openRanks.get(row.key) ?? null, api_board_rank: apiRanks.get(row.key) ?? null },
      composite_score: finite(row.jevbench_score),
      rank: row.rank ?? null,
      open_board_rank: openComposite.get(row.key) ?? null,
      api_board_rank: apiComposite.get(row.key) ?? null,
      measured_in: row.measured_in ?? row.draw?.release ?? artifact.revision,
      draw: row.draw ? { id: row.draw.id ?? null, label: row.draw.label ?? null, release: row.draw.release ?? null, measured_on: row.draw.measured_on ?? null, status: row.draw.status ?? null } : null,
      ranked: !!row.ranked,
      listing: row.listing,
      not_ranked_because: row.not_ranked_because ?? row.not_scored_reason ?? null,
      price: { kind: row.cost?.kind ?? 'unpriced', usd_per_1000_decisions: finite(row.cost?.usd_per_1000), basis: row.cost?.basis ?? null },
      latency: { p50_s_raw: finite(row.speed?.p50_s_raw), p50_s_adjusted: finite(row.speed?.p50_s_adjusted), adjustment: row.speed?.adjustment ?? null, ...jevLatencyJsonFields(row.speed, row.endpoint_kind) },
    })),
  };
}

export async function readJevbenchAgentFeed(root = process.cwd()) {
  // The feed lists the merged live board the pages render (lib/jevbench-live-board.mjs), numbered like /jev-models/all.
  // Same inputs and same classifier as components/JevBenchV16ReleaseRoute.tsx.
  const [release, previous, apiA4] = await Promise.all([
    readJevbenchV161Release(root), readJevbenchV157Release(root),
    readFile(path.join(root, 'data/jevbench-api-a4-equated.json'), 'utf8').then(JSON.parse),
  ]);
  const { artifact: base, categories, carry } = release;
  const board = await assembleJevBoard({ release: { artifact: base, categories, carry }, previous, live: true, apiA4, root });
  const { published, publishedCarry } = board;
  const isApi = jevScopeClassifier(published.systems, publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured);
  const latestRelease = await readLatestJevbenchRelease(base.revision, root);
  const artifact = jevLiveAllArtifact(published, isApi);
  const feed = projectJevbenchFeed(artifact, release.sha256, { scopeArtifact: published, isApi, latestRelease });
  const bytes = JSON.stringify(feed) + '\n';
  return { feed, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/**
 * The feed of the v1.6.1 release alone (the pre-merge projection). The SEO pages and llms-full are built per release row and
 * keep this view; /api/jevbench/latest and the MCP tools serve readJevbenchAgentFeed (the merged live board).
 */
export async function readJevbenchReleaseFeed(root = process.cwd()) {
  const { artifact, sha256 } = await readCurrentJevbench(root);
  const feed = projectJevbenchFeed(artifact, sha256);
  const bytes = JSON.stringify(feed) + '\n';
  return { feed, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}
