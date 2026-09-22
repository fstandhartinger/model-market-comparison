import test from 'node:test';
import assert from 'node:assert/strict';
import { readJevbenchV12, jevbenchV12View } from '../lib/jevbench-v12.mjs';
import { readJevbenchV12Tasks } from '../lib/jevbench-v12-tasks.mjs';

const NEW = ['localjev-qwen3.5-4b', 'metask-jev-4b', 'jobe-qwen3.5-4b', 'ninfer-qwen3.8-27b',
  'ninfer-qwen3.8-27b-t1.5', 'ninfer-qwen3.8-flash-next', 'hopper', 'mirror', 'jevone', 'swanone',
  'jev-qwen3.5-9b-base-nvfp4', 'simplejev-qwen3.5-0.8b', 'raw-qwen3-0.6b', 'raw-qwen3-1.7b',
  'raw-qwen3-8b', 'raw-qwen3-4b-instruct-2507', 'raw-phi-4-mini', 'open-jev-json-canvas-joshuasp'];

test('CR-121 publishes all 18 reviewed v1.3.1 rows with paired public-task evidence', async () => {
  const source = await readJevbenchV12();
  const view = jevbenchV12View(source);
  const tasks = await readJevbenchV12Tasks(source);
  assert.equal(view.revision, 'v1.3.1');
  assert.equal(view.ranked.length, 66);
  assert.equal(view.ranked[0].key, 'hopper');
  assert.equal(Math.round(view.ranked[0].main * 10) / 10, 75.4);
  for (const key of NEW) {
    const row = source.artifact.systems.find((system) => system.key === key);
    assert.ok(row?.ranked && !row.partial, key);
    assert.equal(row.hard.n_attempted, 220, key);
    assert.ok(row.cost.usd_per_1000 > 0 && row.axes.cost < 100, key);
    assert.ok(tasks.artifact.systems[key]?.public_tasks, key);
  }
});

test('CR-121 excludes pending placeholders and private djev work', async () => {
  const { artifact } = await readJevbenchV12();
  const keys = artifact.systems.map((row) => row.key);
  assert.ok(!keys.some((key) => key.includes('reflex-0.8') || key.includes('typed-engine')));
  assert.ok(!keys.some((key) => key.includes('private') && key.includes('djev')));
});
