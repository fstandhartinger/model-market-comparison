import { readPublishedBenchmarkVersion } from './jevbench-current.mjs';
import { projectJevbenchFeed } from './jevbench-agent-feed.mjs';
import { readDecisionBenchmarkManifest } from './decision-benchmark-manifest.mjs';

/** Allowlist projection of our published system aggregates only. Never import the general benchmark dataset. */
export async function decisionResults(benchmark, version, root = process.cwd()) {
  const published = await readPublishedBenchmarkVersion(benchmark, version, root);
  if (benchmark === 'jevbench' && published) {
    const { artifact, sha256 } = published;
    const manifest = await readDecisionBenchmarkManifest(root, version);
    const feed = projectJevbenchFeed(artifact, sha256);
    return { schema_version: 1, benchmark: 'JevBench by Benchmark Heaven', version, published_at: manifest.published_at,
      source_sha256: sha256, method: manifest.scores, scope: `Published ${version}${manifest.amendments.length ? ` including addenda ${manifest.amendments.map((a) => a.label).join(', ')} through ${manifest.amended_through}` : ''}; cite source_sha256 for the exact result bytes. Later live-board reruns and dated carry remain separate.`,
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
  if (benchmark === 'imagejevbench') {
    if (!published) return null;
    const image = published.artifact;
    const manifest = await readDecisionBenchmarkManifest(root);
    return { schema_version: 1, benchmark: 'ImageJevBench by Benchmark Heaven', version, built_at: manifest.image.built_at,
      source_sha256: published.sha256, method: manifest.image, scope: 'Published core track only; dated carry and computer-use track are separate. Cite source_sha256 for the exact result bytes.',
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

export async function decisionResultResponse(benchmark, version, format, root = process.cwd()) {
  if (!['json', 'csv'].includes(format)) return new Response('Not found', { status: 404 });
  const result = await decisionResults(benchmark, version, root);
  if (!result) return new Response('Published release not found', { status: 404 });
  return new Response(format === 'json' ? JSON.stringify(result) + '\n' : resultsCsv(result), { headers: {
    'Content-Type': format === 'json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${benchmark}-${version}.${format}"`,
    'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*',
  } });
}
