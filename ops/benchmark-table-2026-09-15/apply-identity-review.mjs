#!/usr/bin/env node
// 2026-09-15 (iteration 69): attaches the independent critic receipt (identity-review/packet.json + verdict.json) to the
// self-reported entries of data/raw/benchmarks/identity-map.json. Rejected joins get no receipt and therefore stay
// unjoined at ingest; verifyScoreEvidence re-checks both digests and the critic's independence on every build.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const dir = 'ops/benchmark-table-2026-09-15/identity-review';
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const packet = JSON.parse(readFileSync(`${dir}/packet.json`));
// Usage: node apply-identity-review.mjs [verdict file name in identity-review/, default verdict.json]
const verdictFile = `${dir}/${process.argv[2] ?? 'verdict.json'}`;
const verdict = JSON.parse(readFileSync(verdictFile));
if (verdict.packet_sha256 !== sha(`${dir}/packet.json`)) throw new Error('verdict names a different packet');
if (verdict.checked !== packet.joins.length) throw new Error(`critic checked ${verdict.checked} of ${packet.joins.length} joins`);
const rejected = new Set(verdict.rejected.map((r) => r.key));
const review = { packet_file: `${dir}/packet.json`, packet_sha256: sha(`${dir}/packet.json`), verdict_file: verdictFile,
  verdict_sha256: sha(verdictFile), critic_model: verdict.critic_model, producer_models: packet.producer_models };
const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json'));
let attached = 0;
for (const e of map.entries) {
  if (e.basis !== 'self_reported') continue;
  delete e.review;
  if (!rejected.has(`${e.benchmark_id}|${e.source_id}|${e.model_id}`)) { e.review = review; attached++; }
}
writeFileSync('data/raw/benchmarks/identity-map.json', JSON.stringify(map, null, 2) + '\n');
console.log(JSON.stringify({ attached, rejected: rejected.size }));
