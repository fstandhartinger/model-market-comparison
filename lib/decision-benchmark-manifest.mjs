import { CURRENT_JEVBENCH_PAGE, CURRENT_JEVBENCH_VERSION, PUBLISHED_BENCHMARK_VERSIONS, readPublishedBenchmarkVersion } from './jevbench-current.mjs';
import { projectJevbenchFeed } from './jevbench-agent-feed.mjs';
import { releaseDate } from './jevbench-seo.mjs';

export const DECISION_BENCHMARK_DEFINITION = 'JevBench by Benchmark Heaven is a benchmark for AI decision models, including Jev-compatible systems. It measures typed decision accuracy, probability calibration, latency and cost. Maintained by Benchmark Heaven, independently of TypeSafe AI.';
export const COMPOSITE_DEFINITION = 'Weighted harmonic mean of Intelligence, Calibration, Speed and Cost, multiplied by squared penalties when Intelligence is below its configured floor, or Speed or Cost is below 50. Equal 25% weights do not mean an arithmetic average.';

/** One public method manifest, derived from the explicit published release pointer. No draft discovery.
 * @param {string} root
 * @param {string|null} version
 */
export async function readDecisionBenchmarkManifest(root = process.cwd(), version = null) {
  const selectedVersion = version ?? CURRENT_JEVBENCH_VERSION;
  const selectedReader = PUBLISHED_BENCHMARK_VERSIONS.jevbench[selectedVersion];
  if (!selectedReader) throw new Error('Unsupported published method version');
  const { artifact, sha256 } = await selectedReader.read(root);
  const feed = projectJevbenchFeed(artifact, sha256);
  const imageRead = await readPublishedBenchmarkVersion('imagejevbench', 'v0.3.0', root);
  const image = imageRead.artifact;
  const lastMeasured = artifact.systems.map((row) => row.last_measured_on).filter(Boolean).sort().at(-1) ?? null;
  const additions = artifact.additions ?? [];
  const amendedThrough = additions.map((addition) => addition.date).sort().at(-1) ?? null;
  return {
    schema_version: 1, publisher: 'Benchmark Heaven', definition: DECISION_BENCHMARK_DEFINITION,
    canonical: 'https://benchmarkheaven.com/jev-models',
    revision: artifact.revision, published_at: releaseDate(artifact), version_page: version ? selectedReader.page : CURRENT_JEVBENCH_PAGE,
    artifact_sha256: sha256, source_sha256: sha256, option: artifact.headline,
    amendments: additions.map(({ label, date, scorer_source_sha256 }) => ({ label, date, scorer_source_sha256 })),
    amended_through: amendedThrough, max_row_last_measured_on: lastMeasured,
    scores: {
      capability: { ...feed.capability_policy, definition: feed.capability_policy.definition + '. Headline on the open-weights board.' },
      composite: { definition: COMPOSITE_DEFINITION, weights: artifact.options[artifact.headline].weights, intelligence_floor: artifact.options[artifact.headline].intelligence_floor, speed_floor: 50, cost_floor: 50, zero_axis_score: 0, missing_axis_score: null },
    },
    counts: artifact.v16.counts,
    current_board_note: 'The live board may also include later dated API reruns and presentation revisions.',
    reproducibility: {
      scorer: 'https://github.com/fstandhartinger/jevbench',
      presentation: 'https://github.com/fstandhartinger/model-market-comparison',
      scorer_sources_sha256: artifact.v16.scorer_sources_sha256,
      results: `/api/jevbench/${artifact.revision}`,
    },
    image: { revision: image.revision, built_at: image.built_utc, artifact_sha256: imageRead.sha256, counts: image.method,
      capability: image.capability_eligibility, composite: { definition: COMPOSITE_DEFINITION, weights: { intelligence: 25, calibration: 25, speed: 25, cost: 25 }, intelligence_floor: 50, speed_floor: 50, cost_floor: 50 } },
    historical_note: 'Historical releases retain their original scoring definitions and measurement sets. Do not compare scores across method versions as if they were the same experiment.',
  };
}

export function manifestMarkdown(m) {
  const caps = `Cost cap: USD ${Number(m.scores.capability.cost_cap_usd_per_1000).toFixed(4)} per 1,000 decisions; adjusted median-latency cap: ${Number(m.scores.capability.median_latency_cap_s).toFixed(2)} seconds.`;
  const amendmentText = m.amendments.length ? `Published addenda: ${m.amendments.map((a) => `${a.label} (${a.date})`).join(', ')}; amended through ${m.amended_through}. Latest row measurement: ${m.max_row_last_measured_on}. This list includes additions embedded in the results artifact; method amendments and board revisions are listed separately on the versioned board. Cite source_sha256 ${m.source_sha256} for the exact published bytes.` : `No post-publication addenda are recorded in the results artifact. Method amendments and board revisions are listed separately on the versioned board. Cite source_sha256 ${m.source_sha256} for the exact published bytes.`;
  const axisNames = { intelligence: 'Intelligence', calibration: 'Calibration', speed: 'Speed', cost: 'Cost' };
  const weightText = Object.entries(m.scores.composite.weights).map(([axis, weight]) => `${axisNames[axis] ?? axis} ${weight}%`).join(', ');
  return `## Current results and scoring\n\n${m.definition}\n\n[Current open-weights board](${m.canonical}) · [Hosted API board](${m.canonical}/api) · [Methodology](https://benchmarkheaven.com/jev-models/methodology) · [Data card](https://benchmarkheaven.com/jev-models/data) · [Benchmark comparison](https://benchmarkheaven.com/decision-model-benchmarks)\n\nPublished release: **${m.revision}**, initially published ${m.published_at.slice(0,10)}. [Version permalink](https://benchmarkheaven.com${m.version_page}). ${amendmentText} ${m.current_board_note}\n\n**Capability Score:** ${m.scores.capability.definition} ${caps}\n\n**Composite Score:** ${m.scores.composite.definition} Option ${m.option}: weights ${weightText}; Intelligence floor ${m.scores.composite.intelligence_floor}. Composite is secondary on open weights and leads the hosted API board.\n\n[Authoritative release manifest](https://benchmarkheaven.com/api/jevbench/manifest) · [Own results JSON](https://benchmarkheaven.com/api/decision-results/jevbench/${m.revision}/json) · [Own results CSV](https://benchmarkheaven.com/api/decision-results/jevbench/${m.revision}/csv). Missing measurements are null, never zero. No third-party benchmark numbers are included.\n\n**Limitations:** finite task coverage; sealed inputs prevent complete independent reruns; hosted endpoint versions can be opaque; cost is modeled from the published basis and latency depends on the runtime and measurement location. Training on the public split must be disclosed. A leaderboard score does not establish reliability on your workload.\n\n**Name disambiguation:** this is JevBench by Benchmark Heaven at benchmarkheaven.com. The [metamorphic coherence benchmark](https://jevbench.github.io/) is a separate project; its consistency scores measure a different property.\n\n${m.historical_note}\n`;
}
