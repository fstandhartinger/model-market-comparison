// CR-90: public-task artifact validation, scope recomputation and no held-out content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchV12, jevbenchV12View } from '../lib/jevbench-v12.mjs';
import { JEVBENCH_V12_TASKS_ARTIFACT, JEVBENCH_V12_TASKS_SHA256, readJevbenchV12Tasks, validateJevbenchV12Tasks, jevbenchV12TasksView } from '../lib/jevbench-v12-tasks.mjs';
import { DEFAULT_WEIGHTS } from '../lib/jevbench-v12-weights.mjs';
import { tasksForScope, parseTaskScope, publicTierSummary, scopeDecisions, scopeRows, scopeTierWeights } from '../lib/jevbench-v12-scope.mjs';
import { TIER_WEIGHTS } from '../lib/jevbench-v12-score.mjs';
import { createHash } from 'node:crypto';

const clone = async () => JSON.parse(await readFile(JEVBENCH_V12_TASKS_ARTIFACT, 'utf8'));

test('the public-task artifact is pinned, public-only, and covers its declared systems', async () => {
  const v12 = await readJevbenchV12();
  const raw = await readFile(JEVBENCH_V12_TASKS_ARTIFACT);
  assert.equal(createHash('sha256').update(raw).digest('hex'), JEVBENCH_V12_TASKS_SHA256);
  const data = await readJevbenchV12Tasks(v12);
  const view = jevbenchV12TasksView(data);
  assert.equal(view.tasks.length, 231);
  assert.deepEqual(view.tasks.reduce((out, t) => { out[t.tier]++; return out; }, { easy: 0, standard: 0, judge: 0, hard: 0 }), { easy: 48, standard: 72, judge: 0, hard: 111 });
  // Review gate 20260919T233002Z: the v1.2.2 capture covers every scored system, so the grid must have no blank column.
  const v12Keys = jevbenchV12View(v12).ranked.concat(jevbenchV12View(v12).partial).map((r) => r.key);
  assert.deepEqual(Object.keys(view.systems).sort(), [...v12Keys].sort());
  assert.ok(view.systems.djev && view.systems['classifier-dev-fast'], 'djev and the CR-95 rows must have public-task outcomes');
  assert.ok(!JSON.stringify(view).match(/question|expected|prediction|heldout/i));
  assert.equal(tasksForScope(view.tasks, 'all').length, 231);
  assert.equal(tasksForScope(view.tasks, 'easy-medium').length, 120);
  assert.equal(tasksForScope(view.tasks, 'easy').length, 48);
});

test('invalid non-public metadata, unknown systems and null latency on an answered task fail closed', async () => {
  const v12 = await readJevbenchV12();
  let a = await clone();
  a.tasks[0].public = false;
  assert.throws(() => validateJevbenchV12Tasks(a, v12.artifact), /invalid public task metadata/);
  a = await clone();
  a.systems.unknown = a.systems[Object.keys(a.systems)[0]];
  assert.throws(() => validateJevbenchV12Tasks(a, v12.artifact), /unknown system/);
  a = await clone();
  const key = Object.keys(a.systems)[0];
  a.systems[key].public_tasks[a.tasks[0].id] = ['c', null];
  assert.throws(() => validateJevbenchV12Tasks(a, v12.artifact), /outcome/);
});

test('difficulty scope recomputes Intelligence and the JevBench Score without changing All tasks', async () => {
  const v12 = await readJevbenchV12();
  const view = jevbenchV12View(v12);
  const taskView = jevbenchV12TasksView(await readJevbenchV12Tasks(v12));
  const all = scopeRows(view.ranked, taskView.systems, 'all', DEFAULT_WEIGHTS);
  const original = new Map(view.ranked.map((r) => [r.key, r]));
  for (const row of all) assert.ok(Math.abs(row.main - original.get(row.key).main) < 1e-9, row.key);
  const easy = scopeRows(view.ranked, taskView.systems, 'easy', DEFAULT_WEIGHTS);
  assert.notDeepEqual(easy.map((r) => r.key), view.ranked.map((r) => r.key));
  assert.ok(easy.some((r) => Math.abs(r.axes.intelligence - original.get(r.key).axes.intelligence) > 0.01));
});

test('difficulty scope URL parsing is bounded', () => {
  assert.equal(parseTaskScope('?scope=easy'), 'easy');
  assert.equal(parseTaskScope('?scope=easy-medium'), 'easy-medium');
  assert.equal(parseTaskScope('?scope=unknown'), 'all');
  assert.equal(parseTaskScope(''), 'all');
});

test('the decisions count a scope reports is the artifact tier aggregate, not the public-task slice', async () => {
  const v12 = await readJevbenchV12();
  const view = jevbenchV12View(v12);
  const taskView = jevbenchV12TasksView(await readJevbenchV12Tasks(v12));
  // Review gate 20260920T043003Z: the hero read "231 decisions per system" on the official view because
  // it counted public tasks. The score is computed from every decision in the scope's tiers.
  assert.equal(scopeDecisions(view.tierCounts, 'all'), 534);
  assert.equal(scopeDecisions(view.tierCounts, 'easy-medium'), view.tierCounts.easy + view.tierCounts.standard);
  assert.equal(scopeDecisions(view.tierCounts, 'easy'), view.tierCounts.easy);
  assert.ok(scopeDecisions(view.tierCounts, 'all') > tasksForScope(taskView.tasks, 'all').length);
  assert.ok(scopeDecisions(view.tierCounts, 'easy-medium') > tasksForScope(taskView.tasks, 'easy-medium').length);
});

// Review gate 20260920T043003Z, open item (a): the tier weight columns and the "How the score works" list kept the
// official 14/28/28/30 % under a scope while the score above them had already re-normalised. scopeTierWeights() was
// written for exactly that and was dead code; these pin it against intelligence()'s own re-normalisation.
test('scoped tier weights re-normalise to the scope and drop the tiers it excludes', () => {
  assert.deepEqual(scopeTierWeights('all'), TIER_WEIGHTS);
  const em = scopeTierWeights('easy-medium');
  assert.equal(em.judge, 0);
  assert.equal(em.hard, 0);
  assert.ok(Math.abs(em.easy + em.standard - 1) < 1e-12);
  assert.ok(Math.abs(em.easy - TIER_WEIGHTS.easy / (TIER_WEIGHTS.easy + TIER_WEIGHTS.standard)) < 1e-12);
  assert.equal(Math.round(em.easy * 100), 33);
  assert.equal(Math.round(em.standard * 100), 67);
  const easy = scopeTierWeights('easy');
  assert.deepEqual(easy, { easy: 1, standard: 0, judge: 0, hard: 0 });
});

test('the scoped tier weights are the weights intelligence() actually applies', async () => {
  const v12 = await readJevbenchV12();
  const view = jevbenchV12View(v12);
  const row = view.ranked[0];
  // A weighted mean of the in-scope tier accuracies with scopeTierWeights must reproduce scopedIntelligence's value.
  for (const scope of ['all', 'easy-medium', 'easy']) {
    const w = scopeTierWeights(scope);
    const expected = 100 * ['easy', 'standard', 'judge', 'hard'].reduce((sum, t) => sum + w[t] * row.tiers[t], 0);
    const taskView = jevbenchV12TasksView(await readJevbenchV12Tasks(v12));
    const [scoped] = scopeRows([row], taskView.systems, scope, DEFAULT_WEIGHTS);
    assert.ok(Math.abs(scoped.axes.intelligence - expected) < 0.02, `${scope}: ${scoped.axes.intelligence} vs ${expected}`);
  }
});

// Review gate 20260920T043003Z, open item (c): a group row headed "48 public tasks" showed cells of 72/72 — the
// artifact's whole-tier aggregate. The cells must count the public rows the group lists.
test('the public-slice tier summary counts only the public tasks of the group, never the whole tier', async () => {
  const v12 = await readJevbenchV12();
  const view = jevbenchV12View(v12);
  const taskView = jevbenchV12TasksView(await readJevbenchV12Tasks(v12));
  const easyTasks = tasksForScope(taskView.tasks, 'easy');
  assert.equal(easyTasks.length, 48);
  for (const key of Object.keys(taskView.systems)) {
    const system = taskView.systems[key];
    const summary = publicTierSummary(system, easyTasks);
    assert.ok(summary.attempted <= easyTasks.length, `${key}: more attempts than public tasks`);
    assert.ok(summary.correct <= summary.attempted);
    // the whole-tier aggregate counts every decision of the tier, so it can never be the public-slice number here
    assert.ok(system.byTier.easy.attempted <= view.tierCounts.easy);
    const recomputed = easyTasks.filter((t) => system.outcomes[t.id]?.status === 'c').length;
    assert.equal(summary.correct, recomputed);
  }
  assert.equal(publicTierSummary(undefined, easyTasks), null);
  assert.deepEqual(publicTierSummary({ outcomes: { a: { status: 'c' }, b: { status: 'n' }, c: { status: 'w' } } }, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]), { correct: 1, attempted: 2 });
});
