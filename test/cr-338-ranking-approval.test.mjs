import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { jevWithApiA4Rows } from '../lib/jevbench-scope.mjs';
import { withApiRerunSplits } from '../lib/jevbench-api-rerun-cells.mjs';
import { jevV15BoardSystem } from '../lib/jevbench-v15-board.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from '../lib/jevbench-jev-class.mjs';

const CURRENT_KEYS = [
  'bobcat-flash-1.2', 'decider-12b', 'decider-12b-v1', 'decisio-gemma-4-31b-v080',
  'mercury-decide', 'rene-1-31b-fp8', 'spx-cd-flash', 'spx-cd-pro',
];

function top(rows, scope) {
  const scoped = rows.filter((row) => row.key !== 'jev-1.13.0' && row.ranked
    && (scope === 'all' || (scope === 'api') === (row.v16.lane === 'api')));
  const capability = jevClassRows(scoped.map(jevV15BoardSystem), JEV_V16_CLASS_OPTIONS).rows
    .filter((row) => row.inClass && row.row.ranked).slice(0, 5).map((row) => row.row.key);
  const options = Object.fromEntries(['A', 'B', 'C'].map((option) => [option,
    [...scoped].sort((a, b) => b.scores[option] - a.scores[option] || a.key.localeCompare(b.key)).slice(0, 5).map((row) => row.key),
  ]));
  return { capability, ...options };
}

test('CR-338 current-pool ranking matches the exact GO preview order', async () => {
  const receipt = JSON.parse(await readFile('docs/releases/CR-338-GO-16723.json', 'utf8'));
  assert.equal(receipt.approval.choice, 'Ja, alle');
  assert.equal(receipt.approval.card_id, 16723);
  assert.deepEqual([...receipt.approved_rows.current_v1_6_1].sort(), [...CURRENT_KEYS].sort());

  const live = await readJevbenchV161Release();
  assert.equal(live.artifact.G_med, 2.573387642438244);
  const present = new Set(live.artifact.systems.map((row) => row.key));
  assert.deepEqual(CURRENT_KEYS.filter((key) => !present.has(key)), []);

  const parent = await readJevbenchV157Release();
  const meta = new Map([...parent.artifact.systems, ...live.carry.rows].map((row) => [row.key, row]));
  const a4 = JSON.parse(await readFile('data/jevbench-api-a4-equated.json', 'utf8'));
  const reruns = withApiRerunSplits(a4);
  const currentKeys = new Set(CURRENT_KEYS);
  const baselineArtifact = {
    ...live.artifact,
    systems: live.artifact.systems.filter((row) => !currentKeys.has(row.key)),
  };
  const before = jevWithApiA4Rows(baselineArtifact, reruns, meta);
  const after = jevWithApiA4Rows(live.artifact, reruns, meta);
  assert.equal(before.systems.length, receipt.ranking_orders.current.displayed_live_rows);

  const actualBefore = Object.fromEntries(['open', 'api', 'all'].map((scope) => [scope, top(before.systems, scope)]));
  const actualAfter = Object.fromEntries(['open', 'api', 'all'].map((scope) => [scope, top(after.systems, scope)]));
  assert.deepEqual(actualBefore, receipt.ranking_orders.current.before);
  assert.deepEqual(actualAfter, receipt.ranking_orders.current.after);
});
