// CR-94: the topic artifact behind the /jev-models topic radar — pinned, validated against the v1.2 results, aggregates only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchV12, jevbenchV12View } from '../lib/jevbench-v12.mjs';
import { JEVBENCH_V12_TOPICS_ARTIFACT, JEVBENCH_V12_TOPICS_SHA256, readJevbenchV12Topics, validateJevbenchV12Topics, jevbenchV12TopicsView } from '../lib/jevbench-v12-topics.mjs';

const clone = async () => JSON.parse(await readFile(JEVBENCH_V12_TOPICS_ARTIFACT, 'utf8'));

test('the committed topic artifact is pinned, validates and contains only published systems', async () => {
  const v12 = await readJevbenchV12();
  const t = await readJevbenchV12Topics(v12.artifact);
  assert.equal(t.sha256, JEVBENCH_V12_TOPICS_SHA256);
  const view = jevbenchV12TopicsView(t);
  const v = jevbenchV12View(v12);
  const published = new Set([...v.ranked, ...v.honorable, ...v.partial].map((r) => r.key));
  assert.ok(Object.keys(view.systems).length > 0 && Object.keys(view.systems).every((key) => published.has(key)));
  assert.equal(view.topics.reduce((s, x) => s + x.n, 0), v.decisions);
  assert.ok(view.topics.length >= 6 && view.topics.length <= 9 && view.topics.every((x) => x.n >= view.minAttempted && x.short));
  // spot values (jevbench repo RESULTS-v1.2.md, "Accuracy by subject topic")
  assert.equal(view.systems['jev-1.13.0'].math.accuracy, 0.876);
  assert.equal(view.systems['semif-qwen3.5-4b'].coding.accuracy, 0.9643);
  // partial runs: thin topics are marked by their attempted count, never padded
  assert.ok(view.systems['needle-3'].safety_security.attempted < view.minAttempted);
});

test('a topic accuracy that does not recompute, an unknown system, item-level content or a thin topic fails', async () => {
  const v12 = (await readJevbenchV12()).artifact;
  let a = await clone(); a.systems['jev-1.13.0'].topics.math.accuracy += 0.01;
  assert.throws(() => validateJevbenchV12Topics(a, v12), /does not recompute/);
  a = await clone(); a.systems.unknown = a.systems.djev;
  assert.throws(() => validateJevbenchV12Topics(a, v12), /non-empty subset/);
  a = await clone(); a.systems['jev-1.13.0'].predictions = [];
  assert.throws(() => validateJevbenchV12Topics(a, v12), /item-level/);
  a = await clone(); a.topics[0].items = ['x'];
  assert.throws(() => validateJevbenchV12Topics(a, v12), /key, label, covers/);
  a = await clone(); a.systems['jev-1.13.0'].topics.math.correct -= 1; a.systems['jev-1.13.0'].topics.math.accuracy = a.systems['jev-1.13.0'].topics.math.correct / 129;
  assert.throws(() => validateJevbenchV12Topics(a, v12), /tier accuracies/);
  a = await clone(); a.n_items.safety_security = 10; a.n_items.math += 10;
  assert.throws(() => validateJevbenchV12Topics(a, v12), /topic sizes|n_items_by_tier|counts/);
});

test('what the page ships holds no item ids or texts', async () => {
  const v12 = await readJevbenchV12();
  const json = JSON.stringify(jevbenchV12TopicsView(await readJevbenchV12Topics(v12.artifact)));
  assert.doesNotMatch(json, /heldout-|legacy-answer|router-|"(state|question|expected|prediction)"/);
});
