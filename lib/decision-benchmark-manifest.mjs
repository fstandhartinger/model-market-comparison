import { readCurrentJevbench, CURRENT_JEVBENCH_PAGE } from './jevbench-current.mjs';
import { projectJevbenchFeed } from './jevbench-agent-feed.mjs';
import { releaseDate } from './jevbench-seo.mjs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export const DECISION_BENCHMARK_DEFINITION = 'JevBench by Benchmark Heaven is a benchmark for AI decision models, including Jev-compatible systems. It measures typed decision accuracy, probability calibration, latency and cost. Maintained by Benchmark Heaven, independently of TypeSafe AI.';
export const COMPOSITE_DEFINITION = 'Weighted harmonic mean of Intelligence, Calibration, Speed and Cost, multiplied by squared penalties when Intelligence is below its configured floor, or Speed or Cost is below 50. Equal 25% weights do not mean an arithmetic average.';

/** One public method manifest, derived from the explicit published release pointer. No draft discovery. */
export async function readDecisionBenchmarkManifest(root = process.cwd()) {
  const { artifact, sha256 } = await readCurrentJevbench(root);
  const feed = projectJevbenchFeed(artifact, sha256);
  const imageBytes = await readFile(`${root}/data/imagejev-v03.json`);
  const image = JSON.parse(imageBytes);
  return {
    schema_version: 1, publisher: 'Benchmark Heaven', definition: DECISION_BENCHMARK_DEFINITION,
    canonical: 'https://benchmarkheaven.com/jev-models',
    revision: artifact.revision, published_at: releaseDate(artifact), frozen_page: CURRENT_JEVBENCH_PAGE,
    artifact_sha256: sha256, option: artifact.headline,
    scores: {
      capability: { ...feed.capability_policy, definition: feed.capability_policy.definition + '. Headline on the open-weights board.' },
      composite: { definition: COMPOSITE_DEFINITION, weights: feed.weights, intelligence_floor: artifact.options[artifact.headline].intelligence_floor, speed_floor: 50, cost_floor: 50, zero_axis_score: 0, missing_axis_score: null },
    },
    counts: artifact.v16.counts,
    current_board_note: 'The live board also contains dated API A4 reruns and presentation revisions. Frozen release exports describe the named release, not every later board amendment. Use row measurement dates and the live board method footer for amendments.',
    reproducibility: {
      scorer: 'https://github.com/fstandhartinger/jevbench',
      presentation: 'https://github.com/fstandhartinger/model-market-comparison',
      scorer_sources_sha256: artifact.v16.scorer_sources_sha256,
      results: `/api/jevbench/${artifact.revision}`,
    },
    image: { revision: image.revision, published_at: image.built_utc, artifact_sha256: createHash('sha256').update(imageBytes).digest('hex'), counts: image.method,
      capability: image.capability_eligibility, composite: { definition: COMPOSITE_DEFINITION, weights: { intelligence: 25, calibration: 25, speed: 25, cost: 25 }, intelligence_floor: 50, speed_floor: 50, cost_floor: 50 } },
    historical_note: 'Historical releases retain their original scoring definitions and measurement sets. Do not compare scores across method versions as if they were the same experiment.',
  };
}

export function manifestMarkdown(m) {
  return `## Current results and scoring\n\n${m.definition}\n\n[Current open-weights board](${m.canonical}) · [Hosted API board](${m.canonical}/api) · [Methodology](https://benchmarkheaven.com/jev-models/methodology) · [Data card](https://benchmarkheaven.com/jev-models/data) · [Benchmark comparison](https://benchmarkheaven.com/decision-model-benchmarks)\n\nFrozen measurement release: **${m.revision}**, published ${m.published_at.slice(0,10)}. [Version permalink](https://benchmarkheaven.com${m.frozen_page}). ${m.current_board_note}\n\n**Capability Score:** ${m.scores.capability.definition} Cost cap: USD ${m.scores.capability.cost_cap_usd_per_1000} per 1,000 decisions; adjusted median-latency cap: ${m.scores.capability.median_latency_cap_s} seconds.\n\n**Composite Score:** ${m.scores.composite.definition} Option ${m.option}: weights ${JSON.stringify(m.scores.composite.weights)}, Intelligence floor ${m.scores.composite.intelligence_floor}. Composite is secondary on open weights and leads the hosted API board.\n\n[Authoritative release manifest](https://benchmarkheaven.com/api/jevbench/manifest) · [Own results JSON](https://benchmarkheaven.com/api/decision-results/jevbench/${m.revision}/json) · [Own results CSV](https://benchmarkheaven.com/api/decision-results/jevbench/${m.revision}/csv). Missing measurements are null, never zero. No third-party benchmark numbers are included.\n\n**Limitations:** finite task coverage; sealed inputs prevent complete independent reruns; hosted endpoint versions can be opaque; cost is modeled from the published basis and latency depends on the runtime and measurement location. Training on the public split must be disclosed. A leaderboard score does not establish reliability on your workload.\n\n**Name disambiguation:** this is JevBench by Benchmark Heaven at benchmarkheaven.com. The [metamorphic coherence benchmark](https://jevbench.github.io/) is a separate project; its consistency scores measure a different property.\n\n${m.historical_note}\n`;
}
