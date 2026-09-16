#!/usr/bin/env node
// 2026-09-15: regenerates data/raw/benchmarks/identity-map.json from the collected public observations and the
// catalog, using the reviewed exact rules in lib/coding-identity.mjs. Writes every non-join with its reason to
// ops/benchmark-table-2026-09-15/identity-map-review.json. Review the diff of both files before committing.
import { readFileSync, writeFileSync } from 'node:fs';
import { identityJoins, parseDeepSweId, parseScaleLabel, parseFrontierCodeId, parseCursorBenchLabel, parseSweBenchProLabel } from '../../lib/coding-identity.mjs';
import { boardJoins, parseBullshitBenchId, parseApprenticeBenchId, parseValsIndexId, parseOsworld2Id, parseMathArenaLabel, parseSweRebenchLabel, parseGsoId, parseHyperTauId, parseLisanBenchId } from '../../lib/board-identity.mjs';

const BOARDS = [
  { prefix: 'deepswe::', parse: parseDeepSweId, basis: 'measured' },
  // 2026-09-16 (iteration 80, CR-30.2): Epoch AI's own runs from the same hub archive, same `<slug>_<effort>` labels.
  { prefix: 'frontiermath-tiers-1-3::', parse: parseDeepSweId, basis: 'measured' },
  { prefix: 'frontiermath-tier-4::', parse: parseDeepSweId, basis: 'measured' },
  { prefix: 'simpleqa-verified::', parse: parseDeepSweId, basis: 'measured' },
  { prefix: 'swe-atlas-qna::', parse: parseScaleLabel, basis: 'measured' },
  { prefix: 'swe-atlas-test-writing::', parse: parseScaleLabel, basis: 'measured' },
  { prefix: 'swe-atlas-refactoring::', parse: parseScaleLabel, basis: 'measured' },
  // Self-reported boards: an entry only takes effect with an independent `review` receipt (added after the critic round).
  // 2026-09-16 (iteration 79): the sibling cost boards were held back because a joined cost row would have counted as a
  // benchmark in "#benchmarks". Since CR-34.3 / F-102 the count excludes cost boards (`capability_available` skips the
  // Efficiency category, and a cost twin is a row of the board it measures), so the joins the same reviewed packet
  // already carries — the critic checked all 217, rejected none — now take effect.
  { prefix: 'frontiercode::', parse: parseFrontierCodeId, basis: 'self_reported' },
  { prefix: 'frontiercode-cost::', parse: parseFrontierCodeId, basis: 'self_reported' },
  { prefix: 'cursorbench::', parse: parseCursorBenchLabel, basis: 'self_reported' },
  { prefix: 'cursorbench-cost::', parse: parseCursorBenchLabel, basis: 'self_reported' },
  { prefix: 'swe-bench-pro-public::', parse: parseSweBenchProLabel, basis: 'self_reported' },
  // 2026-09-16 (iteration 79): measured boards whose labels are model slugs (lib/board-identity.mjs). Same policy;
  // a measured row needs no critic receipt, its value was already accepted — only its identity was missing.
  { prefix: 'bullshitbench-v1::', parse: parseBullshitBenchId, join: boardJoins, basis: 'measured' },
  { prefix: 'bullshitbench-v2::', parse: parseBullshitBenchId, join: boardJoins, basis: 'measured' },
  { prefix: 'apprenticebench-api::', parse: parseApprenticeBenchId, join: boardJoins, basis: 'measured' },
  { prefix: 'apprenticebench-api-cost::', parse: parseApprenticeBenchId, join: boardJoins, basis: 'measured' },
  { prefix: 'apprenticebench-cua::', parse: parseApprenticeBenchId, join: boardJoins, basis: 'measured' },
  { prefix: 'apprenticebench-cua-cost::', parse: parseApprenticeBenchId, join: boardJoins, basis: 'measured' },
  { prefix: 'vals-index', parse: parseValsIndexId, join: boardJoins, basis: 'measured' },
  // 2026-09-16 (iteration 80): OSWorld 2.0 (CR-30.2 / CR-38.1), product-name labels with the reasoning setting in its own field.
  { prefix: 'osworld-2::', parse: parseOsworld2Id, join: boardJoins, basis: 'measured' },
  // MathArena (CR-38.1): product names with the setting in parentheses.
  { prefix: 'matharena-', parse: parseMathArenaLabel, join: boardJoins, basis: 'measured' },
  // 2026-09-16 (iteration 81): SWE-rebench (one task window per identity) and GSO (CR-38.1), product-name labels.
  { prefix: 'swe-rebench::', parse: parseSweRebenchLabel, join: boardJoins, basis: 'measured' },
  { prefix: 'gso::', parse: parseGsoId, join: boardJoins, basis: 'measured' },
  // 2026-09-16 (iteration 88, CR-52): LisanBench, maintainer slugs with a `:thinking-<setting>` suffix or a label setting.
  { prefix: 'lisanbench::', parse: parseLisanBenchId, join: boardJoins, basis: 'measured' },
  { prefix: 'hyper-tau-bench::', parse: parseHyperTauId, join: boardJoins, basis: 'measured' },
];
const observations = JSON.parse(readFileSync('data/raw/benchmarks/public-observations.json')).observations;
const catalog = JSON.parse(readFileSync('data/dataset.json')).models.map(({ id, family_key, variant }) => ({ id, family_key, variant }));
const previous = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json')).entries;
const keep = new Map(previous.filter((e) => e.review).map((e) => [`${e.benchmark_id}\0${e.source_id}\0${e.model_id}`, e.review]));
const entries = [], unmatched = [];
for (const board of BOARDS) {
  const all = observations.filter((o) => o.benchmark_id.startsWith(board.prefix) && (o.source_basis ?? o.basis) === board.basis)
    .map((o) => ({ benchmark_id: o.benchmark_id, source_id: o.subject.source_id, name: o.subject.name, protocol: o.protocol }));
  // One prefix can name several boards (the eight Vals Index boards and their cost twin). The
  // "a configuration named twice joins neither row" rule counts *per board*, so join board by board.
  for (const benchmarkId of [...new Set(all.map((r) => r.benchmark_id))]) {
  const rows = all.filter((r) => r.benchmark_id === benchmarkId);
  for (const j of (board.join ?? identityJoins)(rows, board.parse, catalog)) {
    const review = keep.get(`${j.row.benchmark_id}\0${j.row.source_id}\0${j.model_id}`);
    if (j.model_id) entries.push({ benchmark_id: j.row.benchmark_id, source_id: j.row.source_id, model_id: j.model_id, rule: j.rule,
      ...(board.basis === 'self_reported' ? { basis: 'self_reported', ...(review ? { review } : {}) } : {}) });
    else unmatched.push({ benchmark_id: j.row.benchmark_id, source_id: j.row.source_id, reason: j.reason });
  }
  }
}
writeFileSync('data/raw/benchmarks/identity-map.json', JSON.stringify({
  schema_version: 1, reviewed_at: '2026-09-16',
  policy: 'Exact joins for public boards whose labels are not catalog names. A label must state the exact model and a setting that exists as a catalog configuration; without a stated setting only a family whose catalog holds exactly one configuration, the default, joins; a configuration named more than once on one board joins neither row. Boards that label models by slug join only when the slug, after one documented normalisation (lower-case, `_`→`-`, a trailing `-<digit>-<digit>` read as a version), is exactly a catalog family key. Self-reported rows keep the critic approval of their unjoined observation; their join takes effect only with its own independent review receipt (`review`). Rules: lib/coding-identity.mjs (product-name boards) and lib/board-identity.mjs (slug boards).',
  entries,
}, null, 2) + '\n');
writeFileSync('ops/benchmark-table-2026-09-15/identity-map-review.json', JSON.stringify({ generated_at: new Date().toISOString(), joined: entries.length, unmatched }, null, 2) + '\n');
console.log(JSON.stringify({ joined: entries.length, unmatched: unmatched.length }));
for (const b of BOARDS) console.log(b.prefix, 'joined', entries.filter((e) => e.benchmark_id.startsWith(b.prefix)).length, 'unmatched', unmatched.filter((e) => e.benchmark_id.startsWith(b.prefix)).length);
console.log('JOINS:', entries.map((e) => `${e.source_id}→${e.model_id}`).join(' | '));
console.log('UNMATCHED:', unmatched.map((e) => `${e.source_id}: ${e.reason}`).join(' | '));
