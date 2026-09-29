// Complete registry census: a collector exit code is not a freshness claim.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const FAILURE = new Set(['retained_after_failure', 'retained_after_dispute', 'source_unreachable_or_manual']);
const WITHHELD = new Set(['source_changed_retained', 'contested', 'retained_budget_exhausted']);
const CHECKED = new Set(['checked_unchanged', 'updated']);
const CANDIDATE = new Set(['candidate', 'vendor_candidate', 'collected']);

export function sourceCoverage({ registry, plan, report, observations = [] }) {
  const specs = new Map();
  for (const spec of plan.entries) {
    if (specs.has(spec.benchmark_id)) throw new Error(`Duplicate collection plan: ${spec.benchmark_id}`);
    specs.set(spec.benchmark_id, spec);
  }
  const checks = report.checks ?? [];
  const aa = new Set((registry.aa_field_map ?? []).map((m) => m.benchmark_id));
  const byBenchmark = new Map();
  for (const row of observations) {
    const rows = byBenchmark.get(row.benchmark_id) ?? [];
    rows.push(row); byBenchmark.set(row.benchmark_id, rows);
  }
  const entries = registry.entries.map((entry) => {
    const spec = specs.get(entry.id), access = entry.how_to_collect?.access;
    // Group collectors own AA fields and the authenticated OpenRouter snapshot.
    // Prefer their actual receipt over the generic manual/protocol-only fallback.
    const group = aa.has(entry.id) ? 'aa-benchmark-fields'
      : entry.id.startsWith('openrouter-') ? 'openrouter-benchmarks' : null;
    const groupCheck = group && checks.find((c) => c.id === group);
    const direct = checks.find((c) => c.id === entry.id);
    const document = checks.find((c) => c.id === entry.primary_url);
    const check = groupCheck || (direct && !['source_reachable_protocol_date_retained', 'source_unreachable_or_manual'].includes(direct.status) ? direct : document || direct);
    const rows = byBenchmark.get(entry.id) ?? [];
    const dates = rows.map((r) => r.source?.retrieved_at).filter(Boolean).sort();
    let mode = group ? 'group_collector' : spec?.refresh === 'manual' ? 'manual_snapshot'
      : spec?.parser ? 'public_adapter' : document ? 'vendor_document' : 'protocol_only';
    if (access?.mode === 'browser_only') mode = 'browser_only';
    if (entry.id === 'aa-coding-agent-index::1.4') mode = 'frozen_snapshot';
    if (entry.family === 'jevbench' || entry.id.startsWith('jevbench::')) mode = 'on_demand_evaluation';
    let status, reason;
    if (FAILURE.has(check?.status)) {
      status = 'failed_retained'; reason = check.reason || 'Collection or review failed; published observations remain dated.';
    } else if (WITHHELD.has(check?.status)) {
      status = 'withheld'; reason = check.reason || 'Source changed or review was incomplete; prior observations retained.';
    } else if (CHECKED.has(check?.status)) {
      status = 'checked'; reason = check.reason || 'Collector checked this source. Observation dates below remain the freshness evidence.';
    } else if (CANDIDATE.has(check?.status)) {
      status = 'candidate'; reason = 'Source candidate collected; this status alone does not prove row review or publication.';
    } else if (['manual_snapshot', 'browser_only', 'frozen_snapshot', 'on_demand_evaluation'].includes(mode)) {
      status = 'exempt'; reason = access?.reason || spec?.reason || entry.update_cadence?.check_recommendation || 'Explicit manual snapshot; fresh scores require source review.';
    } else if (check?.status === 'source_reachable_protocol_date_retained') {
      status = 'protocol_only'; reason = 'Primary URL checked; no executable score adapter or newly accepted protocol update. Scores were not refreshed.';
    } else if (check?.status === 'retained_manual_snapshot' || check?.status === 'manual_required') {
      status = 'exempt'; reason = check.reason || spec?.reason || 'Collector explicitly requires manual source review.';
    } else {
      status = 'missing_check'; reason = 'No applicable receipt in this run. A historical check or a registry entry does not prove daily coverage.';
    }
    return { id: entry.id, name: entry.name, source_url: entry.primary_url, registry_status: entry.status,
      mode, status, reason, check_id: check?.id ?? null, check_status: check?.status ?? null,
      checked_at: check ? report.checked_at : null, observations: rows.length,
      oldest_observation_retrieved_at: dates[0] ?? null, newest_observation_retrieved_at: dates.at(-1) ?? null };
  });
  const totals = {};
  for (const row of entries) totals[row.status] = (totals[row.status] ?? 0) + 1;
  return { schema_version: 1, checked_at: report.checked_at, registry_entries: entries.length,
    totals, all_entries_accounted_for: entries.every((r) => r.status !== 'missing_check'),
    all_sources_checked_or_exempt: entries.every((r) => ['checked', 'exempt'].includes(r.status)),
    note: 'Daily coverage is separate from freshness. Candidates, protocol checks, exemptions and retained failures are never fresh scores. Original observation dates are preserved.', entries };
}

export function coverageMarkdown(report) {
  const escape = (v) => String(v ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
  return `# Daily registry coverage\n\nRun: ${report.checked_at}. Entries: ${report.registry_entries}.\n\n${report.note}\n\n`
    + '| Benchmark | Outcome | Collection mode | Latest observation capture | Reason |\n|---|---|---|---|---|\n'
    + report.entries.map((r) => `| ${[r.id, r.status, r.mode, r.newest_observation_retrieved_at, r.reason].map(escape).join(' | ')} |`).join('\n') + '\n';
}

export async function writeSourceCoverage({ repoRoot = '.', outDir, report } = {}) {
  const read = async (name) => JSON.parse(await readFile(join(repoRoot, 'data/raw/benchmarks', name), 'utf8'));
  const [registry, plan, scores, current] = await Promise.all([read('registry.json'), read('collection-plan.json'), read('scores.json'), report ?? read('daily-checks.json')]);
  const coverage = sourceCoverage({ registry, plan, report: current, observations: scores.observations });
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'source-coverage.json'), JSON.stringify(coverage, null, 2) + '\n');
  await writeFile(join(outDir, 'source-coverage.md'), coverageMarkdown(coverage));
  return coverage;
}
if (process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`) {
  const at = process.argv.indexOf('--out');
  const report = await writeSourceCoverage({ outDir: at < 0 ? '.' : process.argv[at + 1] });
  console.log(JSON.stringify({ registry_entries: report.registry_entries, totals: report.totals }));
}
