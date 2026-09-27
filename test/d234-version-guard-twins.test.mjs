// D234, 2026-09-27. A board's version guard exists in three places: the registry's
// `how_to_collect.version_guard`, which is the text the protocol reviewer reads, and the collection
// plan's `version_guard` and `recipe.version_guard`, which travel with the collector. Nothing
// coupled them. D223 repaired VulcanBench's registry guard on 2026-09-27 to name the reviewed
// revision set; both plan copies were left behind still saying "a protocol starting
// code-quality-maintenance-v3" — looser than the reviewed guard, and dated to the wrong board
// update. All three gates stayed green, exactly as in D233.
//
// 104 of the 121 planned boards keep the three copies identical; for them a registry-only edit is a
// divergence, not a decision. The two lists below are the boards that differ today. They are an
// inventory of unreviewed drift, not a blessing: a name may leave a list, and adding one needs a
// reason in the same commit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(p, new URL('..', import.meta.url)), 'utf8'));
const plan = read('data/raw/benchmarks/collection-plan.json');
const registry = new Map(read('data/raw/benchmarks/registry.json').entries.map((e) => [e.id, e]));
const planned = plan.entries.filter((e) => typeof e.version_guard === 'string');

// The plan's guard differs from the registry's.
const CROSS_DIFFERENT = [
  'cursorbench::4.0', 'cursorbench-cost::4.0', 'matharena-arxivmath::2026-06',
  'matharena-brokenarxiv::2026-06', 'matharena-arxivmath::2026-08', 'matharena-brokenarxiv::2026-08',
  'weirdml::3', 'chess-puzzles::snapshot-2026-09-18', 'mystery-game-puzzles::snapshot-2026-09-18',
  'ebr-bench::snapshot-2026-09-18', 'mirrorcode::snapshot-2026-09-18',
  'epoch-gpqa-diamond::snapshot-2026-09-18', 'epoch-swe-bench-verified::snapshot-2026-09-18',
  'frontierswe::2', 'programbench::1', 'posttrainbench::1.1', 'toolathlon::pre-verified',
];
// The plan's own two copies differ from each other.
const INNER_DIFFERENT = [
  'cursorbench::4.0', 'cursorbench-cost::4.0', 'matharena-arxivmath::2026-08',
  'matharena-brokenarxiv::2026-08', 'chess-puzzles::snapshot-2026-09-18',
  'mystery-game-puzzles::snapshot-2026-09-18', 'ebr-bench::snapshot-2026-09-18',
  'mirrorcode::snapshot-2026-09-18', 'epoch-gpqa-diamond::snapshot-2026-09-18',
  'epoch-swe-bench-verified::snapshot-2026-09-18', 'frontierswe::2', 'programbench::1',
  'posttrainbench::1.1',
];

const crossDiff = () => planned.filter((e) => {
  const reviewed = registry.get(e.benchmark_id)?.how_to_collect?.version_guard;
  return typeof reviewed === 'string' && reviewed !== e.version_guard;
}).map((e) => e.benchmark_id);

const innerDiff = () => planned.filter((e) => typeof e.recipe?.version_guard === 'string'
  && e.recipe.version_guard !== e.version_guard).map((e) => e.benchmark_id);

test('a plan guard that matches its reviewed registry guard keeps matching it', () => {
  assert.deepEqual(crossDiff().sort(), [...CROSS_DIFFERENT].sort(),
    'the plan and the registry have drifted apart on a board that had them identical (or a listed'
    + ' difference was repaired — remove it from CROSS_DIFFERENT in the same commit). The registry'
    + ' copy is what the protocol reviewer reads; the plan copy travels with the collector, so a'
    + " registry-only repair leaves the collector on the old rule and the day's gates stay green.");
});

test("the plan's own two copies of a guard stay one text", () => {
  assert.deepEqual(innerDiff().sort(), [...INNER_DIFFERENT].sort(),
    'collection-plan.json holds the guard at the entry and again under `recipe`; they drifted.');
});

test('D223: all three of VulcanBench Frontier v4\'s guards name the reviewed revision set', () => {
  const id = 'vulcanbench-frontier::4';
  const entry = planned.find((e) => e.benchmark_id === id);
  const reviewed = registry.get(id).how_to_collect.version_guard;
  for (const [what, text] of [['registry', reviewed], ['plan', entry.version_guard], ['plan recipe', entry.recipe.version_guard]]) {
    for (const revision of ['v3.4', 'v3.5', 'v3.6', 'v3.7', 'v3.15']) {
      assert.ok(text.includes(`code-quality-maintenance-${revision}`), `the ${what} guard omits ${revision}`);
    }
    assert.doesNotMatch(text, /protocol starting code-quality-maintenance-v3\b/,
      `the ${what} guard still admits any v3-prefixed revision; D223 reviewed a closed set, not a prefix`);
  }
});

test('the guard does not claim the board withholds what the board ranks', () => {
  const text = registry.get('vulcanbench-frontier::4').how_to_collect.version_guard;
  // The board publishes and ranks two disclosed 22-of-23 rows; only our comparison withholds them.
  assert.doesNotMatch(text, /every published row must state n=23/);
  assert.match(text, /Every row Benchmark Heaven\s+compares states n=23|Every row Benchmark Heaven compares states n=23/);
  assert.match(text, /publishes and ranks its disclosed short rows/);
});
