// D250, 2026-09-28. `data/benchmark-caveats.json` decides which boards carry the `Judged` tag and
// which rows a category composite may average: `lib/benchmark-matrix.mjs` builds the composite from
// the rows with `judged === false`, and `lib/category-scores.mjs` refuses a judged anchor outright.
// The file was written in iteration 77 against 32 boards, reviewed by a second engine, and has never
// had a coverage gate — so every board added since could only be classified by someone remembering.
//
// On 2026-09-28 the screen below found four unclassified boards whose own registry text says a judge
// panel or a judge model sets the number, and `vulcanbench-frontier` was the expensive one: its
// registry note already stated our conclusion in prose ("the judged 33% component makes the combined
// score a judged score for category composites") while this file, which the code actually reads,
// had never been told. Comparing Fable 5.1 (max) with GPT-6 Astra (max), it was averaging into the
// Coding composite at 71.401 / 72.495; without it the same two models read 69.131 / 70.627.
//
// The screen over-reports on purpose. It is not a verdict — a family it names is either classified
// in `judged`/`considered_not_judged`, or listed in UNCLASSIFIED with the evidence that is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unclassifiedJudgeCandidates } from '../ops/ux-2026-09-12/bin/measure-judged-classification.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const caveats = read('../data/benchmark-caveats.json');
const registry = read('../data/raw/benchmarks/registry.json');

// Screened boards that are deliberately still unclassified, each with what would settle it. A name
// may leave this list; a name may not join it without its reason in the same commit.
const UNCLASSIFIED = {
  'bu-bench-v1': 'The registry says only "graded by the repository\'s LLM judge" for a task success rate.'
    + ' Whether that judge rules success against the task\'s own expected end state (not judged, like'
    + ' toolathlon) or reads the trajectory and forms an opinion (judged, like vitabench) needs the'
    + " judge prompt from Browser Use's benchmark repository, which no evidence file here carries.",
  'bullshitbench-v1': 'A three-judge panel sorts each answer into a pushback level and the published'
    + ' rate is score_2 / nonsense_count. The panel has no answer key — but it is classifying a'
    + ' behaviour, not rating quality, so the judged definition cuts close both ways. The board\'s own'
    + ' grading instructions would settle it; the registry entry does not quote them.',
  'bullshitbench-v2': 'The V2 question set, graded the same way by the same three-judge panel, so it'
    + " stands or falls with bullshitbench-v1: the panel's own grading instructions would settle both,"
    + ' and neither registry entry quotes them.',
};

test('D250: every board the judge screen names is classified or has a written reason', () => {
  const candidates = [...unclassifiedJudgeCandidates(registry, caveats).keys()].sort();
  assert.deepEqual(candidates, Object.keys(UNCLASSIFIED).sort(),
    'a registry family says a judge, a panel, a rubric or an Elo decides its number while'
    + ' data/benchmark-caveats.json classifies it neither way. Classify it in `judged` or'
    + ' `considered_not_judged`, or add it to UNCLASSIFIED with the evidence that is missing.'
    + ' Unclassified, the row carries no Judged tag and averages with task accuracy in its category.');
  for (const [key, why] of Object.entries(UNCLASSIFIED)) {
    assert.ok(why.length > 80, `${key}: the reason has to say what would settle it`);
    assert.ok(registry.entries.some((e) => e.family === key), `${key}: no such registry family`);
  }
});

test('D250: nothing is classified both ways, and every classification names a real family', () => {
  const families = new Set(registry.entries.map((e) => e.family));
  const judged = Object.keys(caveats.judged);
  const notJudged = Object.keys(caveats.considered_not_judged);
  // The two DesignArena boards are scored from the taxonomy, not the registry; their entries say so
  // by citing a `taxonomy.` field, which is what `quote_rule` already allows.
  const offRegistry = (key) => caveats.judged[key]?.field?.startsWith('taxonomy.');
  for (const key of [...judged, ...notJudged]) {
    assert.ok(families.has(key) || offRegistry(key), `${key}: classified, but no registry family has that key`);
  }
  const both = judged.filter((k) => notJudged.includes(k));
  assert.deepEqual(both, [], `classified as judged and not judged: ${both.join(', ')}`);
});

// The four boards D250 registered. Two of them are the vendors' own copies of boards whose
// Artificial Analysis identity was already judged: the same Elo cannot be a preference score on one
// row and task accuracy on the other.
test('D250: the four boards registered on 2026-09-28 stay registered', () => {
  for (const key of ['vulcanbench-frontier', 'anthropic-gdpval-aa-v2-1', 'anthropic-aa-briefcase-v1-1', 'xiaomi-gdpval-aa-2-1']) {
    assert.ok(caveats.judged[key], `${key}: dropped from the judged classification`);
  }
  for (const [vendor, aa] of [['anthropic-gdpval-aa-v2-1', 'aa-gdpval'], ['xiaomi-gdpval-aa-2-1', 'aa-gdpval'], ['anthropic-aa-briefcase-v1-1', 'aa-briefcase']]) {
    assert.ok(caveats.judged[aa], `${aa}: the board this vendor row copies is no longer judged — recheck ${vendor}`);
  }
});
