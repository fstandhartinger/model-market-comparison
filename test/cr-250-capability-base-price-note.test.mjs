import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { imageJevBoardSystems, imageJevCapabilityLimits } from '../lib/imagejev-board.mjs';
import { jevClassRows } from '../lib/jevbench-jev-class.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const artifact = JSON.parse(read('../data/raw/benchmarks/jevbench/multimodal-preview/preview.json'));

test('CR-250: Wity-1 keeps its API price and stays inside the cost cap at the base-model price', () => {
  const systems = imageJevBoardSystems(artifact);
  const limits = imageJevCapabilityLimits(artifact);
  const wity = systems.find((row) => row.key === 'wity_1');
  assert.equal(wity.api_flag, true);
  assert.ok(Math.abs(wity.cost.usd_per_1000 - 0.0074017) < 1e-6, 'ranked at the developer API price');
  assert.ok(Math.abs(wity.alt.usd_per_1000 - 0.0264346) < 1e-6, 'base-model reference price carried to the capability view');
  const { reference, rows } = jevClassRows(systems, { limits, factor: limits.factor, referenceLabel: limits.referenceLabel });
  assert.ok(rows.find((r) => r.row.key === 'wity_1').inClass);
  const ratio = wity.alt.usd_per_1000 / reference.cost;
  assert.ok(ratio > 0.81 && ratio < 0.83, `base-model ratio ${ratio}`);
  assert.ok(wity.alt.usd_per_1000 <= limits.cost, 'the note must say "still fit within", not "exceed"');
  // Only API rows with a known base model carry the alternative.
  assert.deepEqual(systems.filter((row) => row.alt).map((row) => row.key), ['wity_1']);
});

test('CR-250: capability rows show the API tag and the base-price eligibility note with a tooltip', () => {
  const source = read('../components/JevCapabilityRanking.tsx');
  assert.match(source, /data-bh-jev-capability-api=\{row\.key\}/);
  assert.match(source, /API price · eligibility checked at the developer's list price; at base-model pricing it would \$\{fits \? 'still fit within' : 'exceed'\} the cost cap/);
  assert.match(source, /title=\{basePrice\.detail\}/);
  assert.match(source, /data-bh-jev-capability-base-price-tip/);
  assert.match(source, /if \(!row\.api_flag \|\| base == null/);
});
