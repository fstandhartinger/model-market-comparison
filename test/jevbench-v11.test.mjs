// CR-86.1: JevBench v1.1 — the published Main Score recomputes from its sub-scores, costs are measured / estimate /
// unknown (never a fake zero), label-only systems carry a calibration note instead of a number, and ranks follow scores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { JEVBENCH_V11_ARTIFACT, JEVBENCH_V11_SHA256, readJevbenchV11, validateJevbenchV11, validateJevbenchV11PooledAccuracy, jevbenchV11View, mainScore } from '../lib/jevbench-v11.mjs';

const clone = async () => JSON.parse(await readFile(JEVBENCH_V11_ARTIFACT, 'utf8'));

test('the pinned source stays intact; corrected pooled accuracy is validated and hashed in the exact API response', async () => {
  const { sha256, sourceSha256, artifact, bytes } = await readJevbenchV11();
  const sourceBytes = await readFile(JEVBENCH_V11_ARTIFACT);
  assert.equal(sourceSha256, JEVBENCH_V11_SHA256);
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), JEVBENCH_V11_SHA256);
  assert.equal(bytes.toString('utf8'), `${JSON.stringify(artifact, null, 2)}\n`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256);
  validateJevbenchV11PooledAccuracy(artifact);
  assert.ok(artifact.systems.every((s) => s.capability.pooled_accuracy >= 0 && s.capability.pooled_accuracy <= 1));
  for (const s of artifact.systems.filter((x) => x.ranked)) assert.ok(Math.abs(mainScore(s, artifact.weights) - s.main_score) < 1e-9, s.key);

  const routeSource = await readFile(new URL('../app/api/jevbench/v1.1/route.ts', import.meta.url), 'utf8');
  const route = ts.transpileModule(routeSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace('from "../../../../lib/jevbench-v11.mjs"', `from "${new URL('../lib/jevbench-v11.mjs', import.meta.url).href}"`);
  const { GET } = await import(`data:text/javascript;base64,${Buffer.from(route).toString('base64')}`);
  const response = await GET();
  assert.equal(Buffer.from(await response.arrayBuffer()).toString('utf8'), bytes.toString('utf8'));
  assert.equal(response.headers.get('x-content-sha256'), sha256);
  assert.equal(response.headers.get('x-source-sha256'), sourceSha256);
});

test('pooled accuracy reconstructs correct and attempted decision counts from source tier values', async () => {
  const source = await clone();
  const corrected = await readJevbenchV11();
  assert.throws(() => validateJevbenchV11PooledAccuracy(source), /pooled_accuracy does not recompute/);
  const byKey = new Map(corrected.artifact.systems.map((s) => [s.key, s.capability.pooled_accuracy]));
  assert.equal(byKey.get('system-one-open'), 290 / 314);
  assert.equal(byKey.get('qwen3.8-27b'), 287 / 295);
  assert.equal(byKey.get('open-alternative-jev'), 2 / 6);
});

test('a Main Score that does not recompute, a zero unknown cost or an unlabelled estimate fails', async () => {
  let a = await clone(); a.systems[0].main_score += 0.5;
  assert.throws(() => validateJevbenchV11(a), /does not recompute/);
  // v1.1.1+ prices every system, so no row is 'unknown' any more: make one to test the rule.
  a = await clone(); const u = a.systems.find((s) => !s.ranked) ?? a.systems[0]; u.cost.kind = 'unknown'; u.cost.usd_per_1000 = 0;
  assert.throws(() => validateJevbenchV11(a), /cost must be null/);
  a = await clone(); const e = a.systems.find((s) => s.cost.kind === 'estimate'); e.cost.basis = 'reference deployment';
  assert.throws(() => validateJevbenchV11(a), /must say so/);
});

test('a label-only system needs a null calibration with a note; ranks must follow scores; no item-level keys', async () => {
  let a = await clone(); const n = a.systems.find((s) => s.has_distribution === false); n.calibration.brier_standard_judge = 0;
  assert.throws(() => validateJevbenchV11(a), /null calibration/);
  a = await clone(); const [x, y] = a.systems.filter((s) => s.ranked); const k = a.sensitivity_order[1]; [x.rank_under[k], y.rank_under[k]] = [y.rank_under[k], x.rank_under[k]];
  assert.throws(() => validateJevbenchV11(a), /rank_under/);
  a = await clone(); a.systems[0].predictions = [];
  assert.throws(() => validateJevbenchV11(a), /item-level/);
});

test('view: ranked by Main Score, partial runs apart, and pooled accuracy stays out of the equal-tier headline view', async () => {
  const v = jevbenchV11View(await readJevbenchV11());
  v.ranked.forEach((r, i) => assert.equal(r.rankUnder[v.sensitivityOrder[0]], i + 1, r.key));
  assert.ok(v.partial.length >= 1 && v.partial.every((r) => !r.ranked));
  assert.ok(!/"pooled[a-z_]*":/i.test(JSON.stringify(v)) && !/Pooled accuracy over/.test(v.scoring.capability));
  assert.ok(v.ranked.every((r) => r.hasDistribution || r.calibrationNote));
});
