import { readCurrentJevbench } from './jevbench-current.mjs';
import { readJevbenchV16Release, readJevbenchV161Release } from './jevbench-v16-release.mjs';
import { projectJevbenchFeed } from './jevbench-agent-feed.mjs';
import { readDecisionBenchmarkManifest } from './decision-benchmark-manifest.mjs';
import { readFile } from 'node:fs/promises';

/** Allowlist projection of our published system aggregates only. Never import the general benchmark dataset. */
export async function decisionResults(benchmark, version, root = process.cwd()) {
  const manifest = await readDecisionBenchmarkManifest(root, benchmark === 'jevbench' && ['v1.6.0','v1.6.1'].includes(version) ? version : null);
  if (benchmark === 'jevbench' && version === manifest.revision) {
    const reader = version === 'v1.6.0' ? readJevbenchV16Release : version === 'v1.6.1' ? readJevbenchV161Release : readCurrentJevbench;
    const { artifact, sha256 } = await reader(root);
    const feed = projectJevbenchFeed(artifact, sha256);
    return { schema_version: 1, benchmark: 'JevBench by Benchmark Heaven', version, published_at: manifest.published_at,
      source_sha256: sha256, method: manifest.scores, scope: 'Frozen release; later live-board amendments and dated carry are separate',
      rows: feed.systems.map(s => {
        const r = artifact.systems.find(r => r.key === s.key);
        return { key: s.key, name: s.name, board: s.board, model_pin: r.model_pin ?? null, last_measured_on: r.last_measured_on ?? null,
          source_url: s.source_url, listing: s.listing, ranked: s.ranked, capability: s.capability.score,
          capability_eligible: s.capability.eligible, open_capability_rank: s.capability.open_board_rank,
          composite: s.composite_score, intelligence: s.axes.intelligence, calibration: s.axes.calibration, speed: s.axes.speed, cost_axis: s.axes.cost,
          usd_per_1000_decisions: s.price.usd_per_1000_decisions, price_kind: s.price.kind, price_basis: s.price.basis,
          p50_raw_s: s.latency.p50_s_raw, p50_adjusted_s: s.latency.p50_s_adjusted, latency_adjustment: s.latency.adjustment };
      }) };
  }
  if (benchmark === 'imagejevbench' && version === manifest.image.revision) {
    const image = JSON.parse(await readFile(`${root}/data/imagejev-v03.json`));
    return { schema_version: 1, benchmark: 'ImageJevBench by Benchmark Heaven', version, published_at: manifest.image.published_at,
      source_sha256: manifest.image.artifact_sha256, method: manifest.image, scope: 'Core track only; dated carry and computer-use track are separate',
      rows: image.ranking.map(r => ({ key: r.key, name: r.name, last_measured_on: r.last_measured_utc ?? null, source_url: r.repo ?? null,
        ranked: r.ranked, not_ranked_because: r.not_ranked_because ?? null, capability: r.tracks.core.capability_raw,
        composite: r.tracks.core.composite.score, intelligence: r.tracks.core.axes.intelligence, calibration: r.tracks.core.axes.calibration,
        speed: r.tracks.core.axes.speed, cost_axis: r.tracks.core.axes.cost })) };
  }
  return null;
}

export function resultsCsv(result) {
  const columns = ['version', ...new Set(result.rows.flatMap(row => Object.keys(row)))];
  const cell = value => {
    let t = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/^[=+@\t\r]/.test(t) || /^-[^\d]/.test(t)) t = "'" + t;
    return '"' + t.replaceAll('"', '""') + '"';
  };
  return columns.map(cell).join(',') + '\r\n' + result.rows.map(row => columns.map(k => cell(k === 'version' ? result.version : row[k])).join(',')).join('\r\n') + '\r\n';
}
