// D233, 2026-09-27. The metric text a board publishes exists in two places: the registry's
// `scoring.metric`, which the protocol reviewer verifies against the source, and the collection
// plan's `protocol`, which is copied into every observation the collector writes and is served on
// `/api/benchmark-scores`. Nothing coupled them, so correcting Vending-Bench 2's registry metric
// left all ten of its published observations still claiming "(average across 5 runs)" — the very
// wording the source does not state. The live verifier caught it; no gate would have.
//
// Most plan protocols are deliberately their own richer sentence (101 of 117 differ, adding the
// harness, the release, the retained identity). The ones below are verbatim twins of their registry
// metric, so for them a registry edit that skips the plan is a divergence, not a decision. If you
// mean to differentiate one, remove it from this list in the same commit and say why.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(p, new URL('..', import.meta.url)), 'utf8'));
const plan = read('data/raw/benchmarks/collection-plan.json');
const registry = new Map(read('data/raw/benchmarks/registry.json').entries.map((e) => [e.id, e]));

const TWINS = [
  'buzzbench::snapshot-2026-09-10', 'critpt::snapshot-2026-09-10', 'eq-bench::4',
  'eqbench-creative-writing::3', 'eqbench-judgemark::4', 'eqbench-longform-writing::v1.11',
  'japanese-rp-bench-aratako::snapshot-2026-09-10', 'japanese-rp-bench-tegnike::2',
  'mazur-creative-story-writing::snapshot-2026-09-10', 'mazur-divergent-thinking::snapshot-2026-09-10',
  'mazur-elimination-game::snapshot-2026-09-10', 'slop-index::snapshot-2026-09-10',
  'spiral-bench::1.2', 'terminal-bench::4.0', 'vending-bench::2', 'weirdml::2',
];

test('a plan protocol that quotes its registry metric verbatim keeps quoting it', () => {
  for (const id of TWINS) {
    const entry = plan.entries.find((e) => e.benchmark_id === id);
    assert.ok(entry, `${id} is no longer in the collection plan`);
    assert.equal(entry.protocol, registry.get(id)?.scoring?.metric,
      `${id}: the plan's protocol and the registry's scoring.metric have drifted apart. Every`
      + ' observation this arm publishes carries the plan\'s copy, so a registry-only correction'
      + ' leaves the old claim live on /api/benchmark-scores.');
  }
});

test('the list names every twin there is, so a new one cannot be added unnoticed', () => {
  const found = plan.entries.filter((e) => e.protocol && registry.has(e.benchmark_id)
    && e.protocol === registry.get(e.benchmark_id).scoring.metric).map((e) => e.benchmark_id);
  assert.deepEqual([...found].sort(), [...TWINS].sort());
});

test('Vending-Bench 2 states only the average its source labels, in both copies', () => {
  const metric = registry.get('vending-bench::2').scoring.metric;
  const protocol = plan.entries.find((e) => e.benchmark_id === 'vending-bench::2').protocol;
  for (const [what, text] of [['registry metric', metric], ['plan protocol', protocol]]) {
    assert.equal(/across \d+ runs/.test(text), false,
      `the ${what} must not claim a run count: the page labels the column "Average across runs" and`
      + ' publishes no count in its text, and the per-row counts in its standard-error tooltips are'
      + ' 4, 5 and 6 — so no single number is a property of this board.');
    assert.match(text, /averaged across runs$/);
  }
});
