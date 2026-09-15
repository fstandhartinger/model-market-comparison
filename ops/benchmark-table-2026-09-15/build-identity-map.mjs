#!/usr/bin/env node
// 2026-09-15: regenerates data/raw/benchmarks/identity-map.json from the collected public observations and the
// catalog, using the reviewed exact rules in lib/coding-identity.mjs. Writes every non-join with its reason to
// ops/benchmark-table-2026-09-15/identity-map-review.json. Review the diff of both files before committing.
import { readFileSync, writeFileSync } from 'node:fs';
import { identityJoins, parseDeepSweId, parseScaleLabel } from '../../lib/coding-identity.mjs';

const BOARDS = [
  { prefix: 'deepswe::', parse: parseDeepSweId },
  { prefix: 'swe-atlas-qna::', parse: parseScaleLabel },
  { prefix: 'swe-atlas-test-writing::', parse: parseScaleLabel },
  { prefix: 'swe-atlas-refactoring::', parse: parseScaleLabel },
];
const observations = JSON.parse(readFileSync('data/raw/benchmarks/public-observations.json')).observations;
const catalog = JSON.parse(readFileSync('data/dataset.json')).models.map(({ id, family_key, variant }) => ({ id, family_key, variant }));
const entries = [], unmatched = [];
for (const board of BOARDS) {
  const rows = observations.filter((o) => o.benchmark_id.startsWith(board.prefix) && (o.source_basis ?? o.basis) === 'measured')
    .map((o) => ({ benchmark_id: o.benchmark_id, source_id: o.subject.source_id, name: o.subject.name }));
  for (const j of identityJoins(rows, board.parse, catalog)) {
    if (j.model_id) entries.push({ benchmark_id: j.row.benchmark_id, source_id: j.row.source_id, model_id: j.model_id, rule: j.rule });
    else unmatched.push({ benchmark_id: j.row.benchmark_id, source_id: j.row.source_id, reason: j.reason });
  }
}
writeFileSync('data/raw/benchmarks/identity-map.json', JSON.stringify({
  schema_version: 1, reviewed_at: '2026-09-15',
  policy: 'Exact joins for measured public boards whose labels are not catalog names. A label must state the exact model and an effort that exists as a catalog configuration; without an effort only a single-configuration family joins; a configuration listed more than once on one board joins neither row. Never applied to self-reported observations (their critic approvals bind the full identity). Rules: lib/coding-identity.mjs.',
  entries,
}, null, 2) + '\n');
writeFileSync('ops/benchmark-table-2026-09-15/identity-map-review.json', JSON.stringify({ generated_at: new Date().toISOString(), joined: entries.length, unmatched }, null, 2) + '\n');
console.log(JSON.stringify({ joined: entries.length, unmatched: unmatched.length }));
for (const b of BOARDS) console.log(b.prefix, 'joined', entries.filter((e) => e.benchmark_id.startsWith(b.prefix)).length, 'unmatched', unmatched.filter((e) => e.benchmark_id.startsWith(b.prefix)).length);
console.log('JOINS:', entries.map((e) => `${e.source_id}→${e.model_id}`).join(' | '));
console.log('UNMATCHED:', unmatched.map((e) => `${e.source_id}: ${e.reason}`).join(' | '));
