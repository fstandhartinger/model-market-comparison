#!/usr/bin/env node
// 2026-09-15: regenerates data/raw/benchmarks/identity-map.json from the collected public observations and the
// catalog, using the reviewed exact rules in lib/coding-identity.mjs. Writes every non-join with its reason to
// ops/benchmark-table-2026-09-15/identity-map-review.json. Review the diff of both files before committing.
import { readFileSync, writeFileSync } from 'node:fs';
import { identityJoins, parseDeepSweId, parseScaleLabel, parseFrontierCodeId, parseCursorBenchLabel, parseSweBenchProLabel } from '../../lib/coding-identity.mjs';
import { boardJoins, parseBullshitBenchId, parseApprenticeBenchId, parseValsIndexId, parseOsworld2Id, parseMathArenaLabel, parseWeirdmlV3Label, parseSweRebenchLabel, parseGsoId, parseHyperTauId, parseLisanBenchId, parseVulcanbenchFrontierLabel, parseKernelbenchCudaLabel, parseFrontiersweV2Label, parsePosttrainbenchLabel, parseRsiExamLabel, parseToolathlonVerifiedLabel, parseToolathlonArchiveLabel, parseProgrambenchLabel, parseMcpAtlasLabel, livebenchJoins, parseContextArenaId, parseBlueprintBenchLabel, parseLhtbLabel } from '../../lib/board-identity.mjs';

const BOARDS = [
  { prefix: 'deepswe::', parse: parseDeepSweId, basis: 'measured' },
  // 2026-09-16 (iteration 80, CR-30.2): Epoch AI's own runs from the same hub archive, same `<slug>_<effort>` labels.
  { prefix: 'frontiermath-tiers-1-3::', parse: parseDeepSweId, basis: 'measured' },
  { prefix: 'frontiermath-tier-4::', parse: parseDeepSweId, basis: 'measured' },
  { prefix: 'simpleqa-verified::', parse: parseDeepSweId, basis: 'measured' },
  // 2026-09-19 (iteration 115, CR-54.2): six more Epoch-run boards from the same hub archive, same
  // `<slug>_<effort>` "Model version" labels (decisions incl. two exclusions: data/raw/benchmarks/epoch-hub-decisions.json).
  { prefix: 'chess-puzzles::', parse: parseDeepSweId, basis: 'measured' },
  { prefix: 'mystery-game-puzzles::', parse: parseDeepSweId, basis: 'measured' },
  { prefix: 'ebr-bench::', parse: parseDeepSweId, basis: 'measured' },
  { prefix: 'mirrorcode::', parse: parseDeepSweId, basis: 'measured' },
  { prefix: 'epoch-gpqa-diamond::', parse: parseDeepSweId, basis: 'measured' },
  { prefix: 'epoch-swe-bench-verified::', parse: parseDeepSweId, basis: 'measured' },
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
  // 2026-09-18 (iteration 113, CR-81): WeirdML v3 uses its own reviewed names ("Claude Fable 5.1" with
  // spaces). Only the v3 identity; v2's CSV slugs keep their own label rule and stay unjoined as before.
  { prefix: 'weirdml::3', parse: parseWeirdmlV3Label, join: boardJoins, basis: 'measured' },
  // 2026-09-16 (iteration 81): SWE-rebench (one task window per identity) and GSO (CR-38.1), product-name labels.
  { prefix: 'swe-rebench::', parse: parseSweRebenchLabel, join: boardJoins, basis: 'measured' },
  { prefix: 'gso::', parse: parseGsoId, join: boardJoins, basis: 'measured' },
  // 2026-09-16 (iteration 88, CR-52): LisanBench, maintainer slugs with a `:thinking-<setting>` suffix or a label setting.
  { prefix: 'lisanbench::', parse: parseLisanBenchId, join: boardJoins, basis: 'measured' },
  { prefix: 'hyper-tau-bench::', parse: parseHyperTauId, join: boardJoins, basis: 'measured' },
  // 2026-09-18 (iteration 114, CR-82.3/CR-82.4): VulcanBench Frontier v4 product-name labels with the effort in
  // brackets; KernelBench-CUDA run labels `<harness>/<vendor>/<slug> [<effort>]` (one identity per problem).
  { prefix: 'vulcanbench-frontier::', parse: parseVulcanbenchFrontierLabel, join: boardJoins, basis: 'measured' },
  { prefix: 'kernelbench-cuda-', parse: parseKernelbenchCudaLabel, join: boardJoins, basis: 'measured' },
  // 2026-09-19 (iteration 117, CR-30.2): FrontierSWE v2 (Proximal team) and PostTrainBench v1.1
  // (aisa-group), both from their own primary sites. FrontierSWE states no effort on the site; the
  // effort comes live from Epoch AI's relay statement in the protocol and only relay-covered labels
  // are reviewed (the five later additions incl. GPT-6 Astra are honestly refused). PostTrainBench's
  // config.js states name/scaffold/effort per agent; effort is read live from the protocol and a
  // stated effort with no catalog configuration (Opus 4.7 xHigh, GPT 5.4 High) is refused.
  { prefix: 'frontierswe::', parse: parseFrontiersweV2Label, join: boardJoins, basis: 'measured' },
  { prefix: 'posttrainbench::', parse: parsePosttrainbenchLabel, join: boardJoins, basis: 'measured' },
  // 2026-09-20 (iteration 126, CR-83.1): RSI-Exam, product names with the agent harness and the
  // stated reasoning effort in brackets. The harness stays in the protocol; Kimi K3's effort is
  // contradicted by the source's own write-up and therefore joins nothing (lib/board-identity.mjs).
  { prefix: 'rsi-exam::', parse: parseRsiExamLabel, join: boardJoins, basis: 'measured' },
  // 2026-09-20 (iteration 126, CR-30.2): Toolathlon-Verified, product names with the setting in
  // parentheses; only the rows the maintainers evaluated themselves are collected at all.
  { prefix: 'toolathlon-verified::', parse: parseToolathlonVerifiedLabel, join: boardJoins, basis: 'measured' },
  // 2026-09-21 (iteration 156, CR-37.1): the archived pre-Verified Toolathlon board, its own identity; hyphenated names
  // with a trailing effort word, badged rows only.
  { prefix: 'toolathlon::', parse: parseToolathlonArchiveLabel, join: boardJoins, basis: 'measured' },
  // 2026-09-21 (iteration 154, CR-37.1): Context Arena MRCR v2, OpenRouter-style slugs with the reasoning mode
  // the run used; `enabled` and a missing mode state no setting.
  { prefix: 'context-arena-mrcr-v2::', parse: parseContextArenaId, join: boardJoins, basis: 'measured' },
  // 2026-09-21 (iteration 155, CR-37.1): Andon Labs' Blueprint-Bench 2, product names without any setting;
  // only single-default-configuration families join.
  { prefix: 'blueprint-bench::', parse: parseBlueprintBenchLabel, join: boardJoins, basis: 'measured' },
  // 2026-09-21 (iteration 157, CR-37.1): Long-Horizon Terminal-Bench community board, product names without any
  // setting (Terminus-2 harness); only single-default-configuration families join.
  { prefix: 'long-horizon-terminal-bench::', parse: parseLhtbLabel, join: boardJoins, basis: 'measured' },
  // 2026-09-20 (iteration 139, CR-85.2): LiveBench release CSV slugs — `<family>-<effort>` and
  // Anthropic's `<family>-<effort>-effort>`; catalog-aware name-first resolution (Qwen "Max" is a
  // name), dated checkpoints and the unreviewed "thinking" setting refused (lib/board-identity.mjs).
  { prefix: 'livebench::', join: livebenchJoins, basis: 'measured' },
  // 2026-09-21 (iteration 142, CR-38.1): ProgramBench product-name labels with six rows stating the
  // reasoning effort in parentheses; unstated-setting rows join only single-default families
  // (Gemini 3 Flash); Claude Opus 4.7 xhigh (no catalog configuration) and the effort-less
  // multi-configuration rows are refused (lib/board-identity.mjs).
  { prefix: 'programbench::', parse: parseProgrambenchLabel, join: boardJoins, basis: 'measured' },
  // 2026-09-21 (iteration 143, CR-30.2): MCP Atlas (Scale Labs), the last collectable board of the
  // CR-30.2 candidate list. Labels mix slugs and product names with the setting in parentheses; the
  // board's own spellings (`glm-5p2`, `gpt-5.6 (sol)`) are reviewed name by name in
  // lib/board-identity.mjs, and a label naming no setting on a multi-configuration family, an
  // unreviewed setting (`thinking`) or an ambiguous product (`Nemotron 3 Ultra`) joins nothing.
  { prefix: 'mcp-atlas::', parse: parseMcpAtlasLabel, join: boardJoins, basis: 'measured' },
];
const observations = JSON.parse(readFileSync('data/raw/benchmarks/public-observations.json')).observations;
const catalog = JSON.parse(readFileSync('data/dataset.json')).models.map(({ id, family_key, variant }) => ({ id, family_key, variant }));
const previousMap = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json'));
const previous = previousMap.entries;
const previousByKey = new Map(previous.map((e) => [`${e.benchmark_id}\0${e.source_id}\0${e.model_id}`, e]));
const keep = new Map(previous.filter((e) => e.review).map((e) => [`${e.benchmark_id}\0${e.source_id}\0${e.model_id}`, e.review]));
// Keep the review date attached to the exact join it describes. New joins are reviewed by
// this run; they must not inherit the legacy map-wide date from 2026-09-16.
const reviewDate = new Date().toISOString().slice(0, 10);
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
    const previousEntry = previousByKey.get(`${j.row.benchmark_id}\0${j.row.source_id}\0${j.model_id}`);
    if (j.model_id) entries.push({ benchmark_id: j.row.benchmark_id, source_id: j.row.source_id, model_id: j.model_id, rule: j.rule,
      reviewed_at: previousEntry?.reviewed_at ?? (previousEntry ? previousMap.reviewed_at : reviewDate),
      ...(board.basis === 'self_reported' ? { basis: 'self_reported', ...(review ? { review } : {}) } : {}) });
    else unmatched.push({ benchmark_id: j.row.benchmark_id, source_id: j.row.source_id, reason: j.reason });
  }
  }
}
writeFileSync('data/raw/benchmarks/identity-map.json', JSON.stringify({
  schema_version: 1,
  // Kept for older consumers; every current entry carries its own reviewed_at. Do not use
  // this field for a new join because it is only the legacy baseline for pre-migration rows.
  reviewed_at: previousMap.reviewed_at ?? reviewDate,
  policy: 'Exact joins for public boards whose labels are not catalog names. A label must state the exact model and a setting that exists as a catalog configuration; without a stated setting only a family whose catalog holds exactly one configuration, the default, joins; a configuration named more than once on one board joins neither row. Boards that label models by slug join only when the slug, after one documented normalisation (lower-case, `_`→`-`, a trailing `-<digit>-<digit>` read as a version), is exactly a catalog family key. Self-reported rows keep the critic approval of their unjoined observation; their join takes effect only with its own independent review receipt (`review`). Rules: lib/coding-identity.mjs (product-name boards) and lib/board-identity.mjs (slug boards).',
  entries,
}, null, 2) + '\n');
writeFileSync('ops/benchmark-table-2026-09-15/identity-map-review.json', JSON.stringify({ generated_at: new Date().toISOString(), joined: entries.length, unmatched }, null, 2) + '\n');
console.log(JSON.stringify({ joined: entries.length, unmatched: unmatched.length }));
for (const b of BOARDS) console.log(b.prefix, 'joined', entries.filter((e) => e.benchmark_id.startsWith(b.prefix)).length, 'unmatched', unmatched.filter((e) => e.benchmark_id.startsWith(b.prefix)).length);
console.log('JOINS:', entries.map((e) => `${e.source_id}→${e.model_id}`).join(' | '));
console.log('UNMATCHED:', unmatched.map((e) => `${e.source_id}: ${e.reason}`).join(' | '));
