// CR-173 (effort-fixes): withdraw the Opus 5.5 Terminal-Bench 4.0 row joined at max, add the critic-passed replacement rows,
// and bind each to an owner acceptance row with the validator's own digest. Idempotent.
// Usage: node apply.mjs ROUND   (the round whose clean review is accepted)
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { observationDigest } from '../../../../../lib/benchmark-score-evidence.mjs';

const round = process.argv[2];
const G = 'data/raw/benchmarks/daily-evidence/2026-09-26-effort-fixes/gauntlet';
const OLD = 'self-reported:claude-opus-55-terminal-bench-4-0';
const dump = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
const sha = (b) => createHash('sha256').update(b).digest('hex');

const artifactFile = `${G}/artifact-tb4-r${round}.json`, reviewFile = `${G}/review-tb4-r${round}.json`;
const reviewBytes = readFileSync(reviewFile);
const receipt = JSON.parse(readFileSync(`${reviewFile}.meta.json`, 'utf8'));
if (receipt.output_sha256 !== sha(reviewBytes)) throw new Error('receipt mismatch');
const verdict = JSON.parse(reviewBytes.toString().trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
if (verdict.verdict !== 'pass' || verdict.errors_found !== 0 || verdict.findings.length || verdict.missing_evidence.length
    || verdict.artifact_sha256 !== sha(readFileSync(artifactFile))) throw new Error('not a clean review of this artifact');
const rows = JSON.parse(readFileSync(artifactFile, 'utf8')).observations;

// candidates: withdraw (D180 mechanism), then add
const candPath = 'data/raw/benchmarks/self-reported-candidates.json';
const cand = JSON.parse(readFileSync(candPath, 'utf8'));
const old = cand.observations.find((o) => o.id === OLD);
const at = old ? cand.observations.indexOf(old) : cand.observations.length;
if (old) {
  cand.observations = cand.observations.filter((o) => o.id !== OLD);
  cand.withdrawn_observations = [...(cand.withdrawn_observations ?? []), { ...old, withdrawn_reason:
    'CR-173 (2026-09-26): withdrawn from publication and replaced by self-reported:claude-opus-55-terminal-bench-4-0-xhigh. '
    + 'The retained launch-post capture\'s own table caption states the effort of this cell: "Terminal-Bench 4.0 results are '
    + 'reported for Claude Opus 5.5 at xhigh effort ... these represent each model’s highest score" (the caption\'s default, '
    + '"adaptive thinking at max effort", does not apply to it), and the system card section 8.5 prints 66.36% at xhigh and 64.8% '
    + 'at max. This row had attributed the xhigh value 66.4 to claude-opus-5.5::max. Same document, same value, corrected '
    + 'configuration; the post\'s own chart dataset value for max (64.8) is now its own row.' }];
}
const have = new Set(cand.observations.map((o) => o.id));
// the replacement rows take the withdrawn row's place, so the file keeps its order
cand.observations.splice(at, 0, ...rows.filter((r) => !have.has(r.id)));
dump(candPath, cand);

// registry: record the chart dataset as an accepted locator
const regPath = 'data/raw/benchmarks/registry.json';
const reg = JSON.parse(readFileSync(regPath, 'utf8'));
const e = reg.entries.find((x) => x.id === 'anthropic-terminal-bench-4-0::4.0');
const NOTE = ' CR-173 (2026-09-26): the table cell is Opus 5.5 at xhigh effort (table caption); the other Opus 5.5 efforts come from '
  + 'the exact datapoints of the post\'s embedded Terminal-Bench 4.0 chart dataset (chart _key "tuskchartterminalbench", series '
  + 'opus55, field y), never from the chart image; competitor series in that chart are not ingested.';
if (!e.how_to_collect.notes.includes('CR-173')) e.how_to_collect.notes += NOTE;
e.last_verified = '2026-09-26';
dump(regPath, reg);

// carried document reason
const cdPath = 'data/raw/benchmarks/self-reported/carried-documents.json';
const cd = JSON.parse(readFileSync(cdPath, 'utf8'));
const doc = cd.documents.find((d) => d.url === 'https://www.anthropic.com/claude-opus-5-5');
if (!doc.reason.includes('CR-173')) doc.reason += ' CR-173 (2026-09-26): the Terminal-Bench 4.0 row joined at max is withdrawn (the caption says xhigh) and replaced by the xhigh row plus the Opus 5.5 low/medium/high/max points of the post\'s embedded chart dataset, with their own critic round.';
dump(cdPath, cd);

// approvals
const apPath = 'data/raw/benchmarks/score-approvals.json';
const approvals = JSON.parse(readFileSync(apPath, 'utf8'));
const approved = new Set(approvals.rows.map((r) => r.id));
for (const row of rows) {
  if (approved.has(row.id)) continue;
  if (!verdict.coverage_checked.includes(row.id)) throw new Error(`not covered: ${row.id}`);
  approvals.rows.push({ id: row.id, observation_sha256: observationDigest(row), critic_model: receipt.actual_model,
    producer_models: receipt.producers, review_file: reviewFile, review_sha256: sha(reviewBytes), artifact_file: artifactFile,
    review_row: row.id, verdict: 'accepted', evidence_locator: `${G}/packet-tb4-r${round}.json#CR-173 effort-fixes round ${round}; ${row.id}` });
}
dump(apPath, approvals);
console.log('ok', rows.length);
