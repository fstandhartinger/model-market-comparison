// CR-90: public-task artifact validation, scope recomputation and no held-out content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchV12, jevbenchV12View } from '../lib/jevbench-v12.mjs';
import { JEVBENCH_V12_TASKS_ARTIFACT, JEVBENCH_V12_TASKS_SHA256, readJevbenchV12Tasks, validateJevbenchV12Tasks, jevbenchV12TasksView } from '../lib/jevbench-v12-tasks.mjs';
import { DEFAULT_WEIGHTS } from '../lib/jevbench-v12-weights.mjs';
import { tasksForScope, scopeRows } from '../lib/jevbench-v12-scope.mjs';
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
  assert.equal(Object.keys(view.systems).length, 15);
  assert.ok(!view.systems.djev, 'djev was added after this public-task capture and must remain explicitly unavailable');
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
