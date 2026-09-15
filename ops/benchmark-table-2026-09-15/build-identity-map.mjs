#!/usr/bin/env node
// 2026-09-15: regenerates data/raw/benchmarks/identity-map.json from the collected public observations and the
// catalog, using the reviewed exact rules in lib/coding-identity.mjs. Writes every non-join with its reason to
// ops/benchmark-table-2026-09-15/identity-map-review.json. Review the diff of both files before committing.
import { readFileSync, writeFileSync } from 'node:fs';
import { identityJoins, parseDeepSweId, parseScaleLabel, parseFrontierCodeId, parseCursorBenchLabel, parseSweBenchProLabel } from '../../lib/coding-identity.mjs';

const BOARDS = [
  { prefix: 'deepswe::', parse: parseDeepSweId, basis: 'measured' },
  { prefix: 'swe-atlas-qna::', parse: parseScaleLabel, basis: 'measured' },
  { prefix: 'swe-atlas-test-writing::', parse: parseScaleLabel, basis: 'measured' },
  { prefix: 'swe-atlas-refactoring::', parse: parseScaleLabel, basis: 'measured' },
  // Self-reported boards: an entry only takes effect with an independent `review` receipt (added after the critic round).
  // The sibling cost boards (frontiercode-cost, cursorbench-cost) stay unjoined: a joined cost row would count as a
  // benchmark in #benchmarks. Their joins are in the reviewed packet, so they can follow once the count excludes costs.
  { prefix: 'frontiercode::', parse: parseFrontierCodeId, basis: 'self_reported' },
  { prefix: 'cursorbench::', parse: parseCursorBenchLabel, basis: 'self_reported' },
  { prefix: 'swe-bench-pro-public::', parse: parseSweBenchProLabel, basis: 'self_reported' },
];
const observations = JSON.parse(readFileSync('data/raw/benchmarks/public-observations.json')).observations;
const catalog = JSON.parse(readFileSync('data/dataset.json')).models.map(({ id, family_key, variant }) => ({ id, family_key, variant }));
const previous = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json')).entries;
const keep = new Map(previous.filter((e) => e.review).map((e) => [`${e.benchmark_id}\0${e.source_id}\0${e.model_id}`, e.review]));
const entries = [], unmatched = [];
for (const board of BOARDS) {
  const rows = observations.filter((o) => o.benchmark_id.startsWith(board.prefix) && (o.source_basis ?? o.basis) === board.basis)
    .map((o) => ({ benchmark_id: o.benchmark_id, source_id: o.subject.source_id, name: o.subject.name }));
  for (const j of identityJoins(rows, board.parse, catalog)) {
    const review = keep.get(`${j.row.benchmark_id}\0${j.row.source_id}\0${j.model_id}`);
    if (j.model_id) entries.push({ benchmark_id: j.row.benchmark_id, source_id: j.row.source_id, model_id: j.model_id, rule: j.rule,
      ...(board.basis === 'self_reported' ? { basis: 'self_reported', ...(review ? { review } : {}) } : {}) });
    else unmatched.push({ benchmark_id: j.row.benchmark_id, source_id: j.row.source_id, reason: j.reason });
  }
}
writeFileSync('data/raw/benchmarks/identity-map.json', JSON.stringify({
  schema_version: 1, reviewed_at: '2026-09-15',
  policy: 'Exact joins for public boards whose labels are not catalog names. A label must state the exact model and an effort that exists as a catalog configuration; without an effort only a single-configuration family joins; a configuration listed more than once on one board joins neither row. Self-reported rows keep the critic approval of their unjoined observation; their join takes effect only with its own independent review receipt (`review`). Rules: lib/coding-identity.mjs.',
  entries,
}, null, 2) + '\n');
writeFileSync('ops/benchmark-table-2026-09-15/identity-map-review.json', JSON.stringify({ generated_at: new Date().toISOString(), joined: entries.length, unmatched }, null, 2) + '\n');
console.log(JSON.stringify({ joined: entries.length, unmatched: unmatched.length }));
for (const b of BOARDS) console.log(b.prefix, 'joined', entries.filter((e) => e.benchmark_id.startsWith(b.prefix)).length, 'unmatched', unmatched.filter((e) => e.benchmark_id.startsWith(b.prefix)).length);
console.log('JOINS:', entries.map((e) => `${e.source_id}→${e.model_id}`).join(' | '));
console.log('UNMATCHED:', unmatched.map((e) => `${e.source_id}: ${e.reason}`).join(' | '));
