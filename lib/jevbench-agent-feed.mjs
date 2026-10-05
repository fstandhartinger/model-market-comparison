import { createHash } from 'node:crypto';
import { readCurrentJevbench, CURRENT_JEVBENCH_PAGE } from './jevbench-current.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from './jevbench-jev-class.mjs';
import { jevV15BoardSystem } from './jevbench-v15-board.mjs';

const finite = (v) => Number.isFinite(v) ? v : null;

/** Explicit public projection. Do not serialize raw artifacts or arbitrary row fields. */
export function projectJevbenchFeed(artifact, artifactSha256) {
  if (!['released', 'published'].includes(artifact.status)) throw new Error('Agent feed requires a released or published artifact');
  const view = jevClassRows(artifact.systems.map(jevV15BoardSystem), /^v1\.6(\.|$)/.test(String(artifact.revision)) ? JEV_V16_CLASS_OPTIONS : undefined);
  let rank = 0;
  const capabilities = new Map(view.rows.map((r) => [r.row.key, {
    score: r.capability,
    rank: r.inClass && r.row.ranked ? ++rank : null,
    eligible: r.inClass && !!r.row.ranked,
    within_caps: r.inClass,
    reasons: r.reasons,
  }]));
  return {
    schema_version: 1,
    benchmark: 'JevBench',
    revision: artifact.revision,
    source: { page: '/jev-models', frozen_page: CURRENT_JEVBENCH_PAGE,
      artifact: `/api/jevbench/${artifact.revision}`, artifact_sha256: artifactSha256 },
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
      source_url: row.repo ?? null,
      axes: Object.fromEntries(['intelligence', 'calibration', 'speed', 'cost'].map((axis) => [axis, finite(row.axes?.[axis])])),
      capability: capabilities.get(row.key) ?? { score: null, rank: null, eligible: false, within_caps: false, reasons: ['Intelligence or Calibration unavailable'] },
      composite_score: finite(row.jevbench_score),
      rank: row.rank ?? null,
      ranked: !!row.ranked,
      listing: row.listing,
      not_ranked_because: row.not_ranked_because ?? row.not_scored_reason ?? null,
      price: { kind: row.cost?.kind ?? 'unpriced', usd_per_1000_decisions: finite(row.cost?.usd_per_1000), basis: row.cost?.basis ?? null },
      latency: { p50_s_raw: finite(row.speed?.p50_s_raw), p50_s_adjusted: finite(row.speed?.p50_s_adjusted), adjustment: row.speed?.adjustment ?? null },
    })),
  };
}

export async function readJevbenchAgentFeed(root = process.cwd()) {
  const { artifact, sha256 } = await readCurrentJevbench(root);
  const feed = projectJevbenchFeed(artifact, sha256);
  const bytes = JSON.stringify(feed) + '\n';
  return { feed, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}
