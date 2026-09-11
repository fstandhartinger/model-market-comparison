import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO = path.resolve(new URL('../../..', import.meta.url).pathname);
const P = (rel) => path.join(REPO, rel);
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const utf8 = (p) => Buffer.byteLength(fs.readFileSync(p));
const round = Number(process.argv[2] ?? '3');
const out = P(`ops/rebuild-2026-09/evidence/phase-09/critic-round${round}-packet.md`);

const skills = [
  'collect-aa-efficiency',
  'collect-chutes-io-ratio',
  'collect-openrouter-efficiency',
  'select-benchmarkheaven-workers',
  'maintain-benchmarkheaven-registry',
  'run-benchmarkheaven-gauntlet',
];

const dataset = JSON.parse(fs.readFileSync(P('data/dataset.json'), 'utf8'));
const scores = JSON.parse(fs.readFileSync(P('data/raw/benchmarks/scores.json'), 'utf8')).observations;
const obs = dataset.benchmark_results.observations;
const basisCount = (rows) => rows.reduce((acc, r) => {
  const b = r.basis ?? 'measured';
  acc[b] = (acc[b] ?? 0) + 1;
  return acc;
}, {});
const datasetBasis = basisCount(obs);
const scoresBasis = basisCount(scores);
const aa = JSON.parse(fs.readFileSync(P('data/raw/aa-efficiency.json'), 'utf8'));
const workerCalls = JSON.parse(fs.readFileSync(P('ops/rebuild-2026-09/evidence/phase-08/normal-run/worker-calls.json'), 'utf8'));
const runReport = JSON.parse(fs.readFileSync(P('ops/rebuild-2026-09/evidence/phase-08/normal-run/run-report.json'), 'utf8'));
const live = fs.readFileSync(P('ops/rebuild-2026-09/evidence/phase-09/live-verification.json'), 'utf8');
const receipt = fs.readFileSync(P('ops/rebuild-2026-09/evidence/phase-09/skills-install.json'), 'utf8');
const brief = fs.readFileSync(P('ops/rebuild-2026-09/EXPLAINER-VIDEO-BRIEF.md'), 'utf8');
const changelog = fs.readFileSync(P('CHANGELOG.md'), 'utf8');
const coverage = fs.readFileSync(P('ops/rebuild-2026-09/COVERAGE.md'), 'utf8');
const clEntry = changelog.slice(changelog.indexOf('## 2026-09-11 — Phase 09'), changelog.indexOf('## 2026-09-11 — Daily automation')).trim();
const covStart = coverage.indexOf('## Phase 09 completion audit');
const covEnd = coverage.indexOf('## Corrections applied to the phase instructions');
const covEntry = coverage.slice(covStart, covEnd).trim();

let s = `# Frozen phase-09 review packet (round ${round})\n\n`;
s += `artifact_id: phase-09-completion-artifacts\n`;
s += `artifact_sha256: <computed after write; equals SHA-256 of this packet file>\n\n`;
s += 'Artifact set: phase-09 completion artifacts (skills, explainer brief, coverage/CHANGELOG entries) plus verification receipts.\n';
s += 'Producers of the artifacts authored in phase 09 (skills frontmatter, EXPLAINER-VIDEO-BRIEF.md, CHANGELOG entry, COVERAGE audit): deepseek/deepseek-v4.1-flash (family deepseek). The four collection skills copied into ops/skills/ are byte-identical to their previously reviewed phase-02/04/08 originals apart from phase-09 description-trigger edits and the two machine-wording clarifications recorded below.\n\n';

s += '## Repair log\n\n';
s += 'Round 1 (critic `z-ai/glm-5.3-flash`, family z-ai, AA 41.9): verdict `revise`, 7 findings E1-E7. Repairs:\n\n';
s += '- **E1 (major):** W28 said opencode-on-Sandy was not installed. Corrected: all six skills installed on all three Sandy runtimes; receipt named.\n';
s += '- **E2 (major):** W25 "2,622 derived" -> 767 (recomputed from both scores.json and dataset observations below).\n';
s += '- **E3 (minor):** packet byte figures re-emitted as UTF-8 byte counts.\n';
s += '- **E4 (minor):** collect-openrouter-efficiency and collect-chutes-io-ratio descriptions gained an explicit trigger clause.\n';
s += '- **E5 (minor):** /api/health status captured as 200 and db:false explained.\n';
s += '- **E6 (minor):** live-state paragraph states the mixed source dates.\n';
s += '- **E7 (minor):** W3 and W8 cite their evidence files.\n\n';
s += 'Round 2 (same critic): verdict `revise`, 4 findings R2-1..R2-4. Repairs:\n\n';
s += '- **R2-1 (minor):** CHANGELOG now says the copied skills carry phase-09 description-trigger edits.\n';
s += '- **R2-2 (minor):** COVERAGE live-state adds `aa_coding_agents` (v1.4) at `2026-09-09` and limits `2026-09-11` to v1.5.\n';
s += '- **R2-3 (minor):** brief now cites run-report start/finish/exit/steps and states the AA >= 34 rule is enforced at pick time, not re-scored in the receipt.\n';
s += '- **R2-4 (minor):** both skills now say "all Sandy runtimes; WSL remains a documented gap".\n\n';

s += '## Review criteria\n\n';
s += '1. Skills installable and usable by an agent with no project knowledge: real paths, real commands, nothing invented.\n';
s += '2. Each SKILL.md has YAML frontmatter `name:` and `description:` stating what it does and when to auto-trigger.\n';
s += '3. Installation evidenced for all three Sandy runtimes; unreached machines stated as incomplete.\n';
s += '4. EXPLAINER-VIDEO-BRIEF.md has before/after, source-backed numbers, 5-10 screenshot moments; a brief must not be presented as a delivered video.\n';
s += '5. Coverage audit claims nothing without evidence.\n';
s += '6. No invented number, source, URL or date; missing evidence reported as missing.\n\n';

s += '## Artifact 1 - published skills (canonical repo copies)\n\n';
for (const name of skills) {
  const rel = `ops/skills/${name}/SKILL.md`;
  const text = fs.readFileSync(P(rel), 'utf8');
  const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const desc = fm.match(/description:\s*([\s\S]*)/)?.[1] ?? '';
  s += `### ${rel}\n- sha256: ${sha(P(rel))}\n- bytes_utf8: ${utf8(P(rel))}\n- frontmatter_present: ${text.startsWith('---\n')}\n- has_trigger_clause: ${/use (when|for)/i.test(desc)}\n\n\`\`\`markdown\n${text}\n\`\`\`\n\n`;
}

s += `## Artifact 2 - EXPLAINER-VIDEO-BRIEF.md\n- sha256: ${sha(P('ops/rebuild-2026-09/EXPLAINER-VIDEO-BRIEF.md'))}\n\n\`\`\`markdown\n${brief}\n\`\`\`\n\n`;
s += `## Artifact 3 - CHANGELOG.md phase-09 entry\n\n\`\`\`markdown\n${clEntry}\n\`\`\`\n\n`;
s += `## Artifact 4 - COVERAGE.md phase-09 audit\n\n\`\`\`markdown\n${covEntry}\n\`\`\`\n\n`;

s += '## Evidence 1 - live verification\n\n```json\n' + live + '\n```\n\n';
s += '## Evidence 2 - skills installation receipt (Sandy, three runtimes)\n\n```json\n' + receipt + '\n```\n\n';
s += '## Evidence 3 - daily cron summary (today)\n\n```\n' + fs.readFileSync('/opt/mmc-daily/last-summary.txt', 'utf8').slice(0, 4000) + '\n```\n\n';

s += '## Evidence 4 - run receipt (normal-run/run-report.json, excerpt)\n\n';
s += '```json\n' + JSON.stringify({
  started_at: runReport.started_at,
  finished_at: runReport.finished_at,
  exit_code: runReport.exit_code,
  published: runReport.published,
  steps: runReport.steps.length,
  workers: runReport.workers,
  live_verified: runReport.live_verified,
  dataset_sha256: runReport.dataset_sha256,
}, null, 2) + '\n```\n\n';

s += `## Evidence 5 - worker calls (normal-run/worker-calls.json)\n\n- calls: ${workerCalls.calls.length}\n- returned_cost_usd: ${workerCalls.returned_cost_usd}\n- calls_without_returned_cost: ${workerCalls.calls_without_returned_cost}\n- note: ${workerCalls.note}\n\n\`\`\`json\n${JSON.stringify(workerCalls, null, 2)}\n\`\`\`\n\n`;

s += '## Evidence 6 - benchmark basis counts (recomputed)\n\n';
s += '```json\n' + JSON.stringify({
  dataset_observations_total: obs.length,
  dataset_observations_by_basis: datasetBasis,
  scores_json_total: scores.length,
  scores_json_by_basis: scoresBasis,
}, null, 2) + '\n```\n\n';

s += `## Evidence 7 - aa-efficiency snapshot\n\n- collected_at: ${aa.collected_at ?? aa.collectedAt ?? 'n/a'}\n- count: ${aa.count ?? (aa.models ? aa.models.length : 'n/a')}\n- coverage.published_rows: ${aa.coverage?.published_rows ?? 'n/a'}\n\n\`\`\`json\n${JSON.stringify({ collected_at: aa.collected_at, count: aa.count, coverage: aa.coverage }, null, 2)}\n\`\`\`\n\n`;

s += '## Evidence 8 - dataset.counts and efficiency coverage\n\n';
s += '```json\n' + JSON.stringify({
  counts: dataset.counts,
  efficiency_global_io_ratio: dataset.efficiency?.global_io_ratio?.value,
  efficiency_coverage: dataset.efficiency?.coverage,
}, null, 2) + '\n```\n\n';

s += '## Known gaps (not to be reported as delivered)\n\n';
s += '- Explainer video NOT delivered; brief written, local Claude handoff outstanding (W27 incomplete).\n';
s += "- Florian WSL machine unreachable: skills not installed there.\n";
s += '- Runtime discovery/invocation of installed skills not tested (file presence + hash only).\n';

fs.writeFileSync(out, s);
const digest = sha(out);
console.log(JSON.stringify({ packet: out, bytes: Buffer.byteLength(s), packet_sha256: digest }));
