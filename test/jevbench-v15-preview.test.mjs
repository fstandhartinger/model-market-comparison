import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  JEVBENCH_V15_PREVIEW_ARTIFACT, JEVBENCH_V15_PREVIEW_ROUTE, jevV15Composite, readJevbenchV15Preview, validateJevbenchV15Preview,
} from '../lib/jevbench-v15-preview.mjs';
import { readJevbenchV142, JEVBENCH_V142_SHA256 } from '../lib/jevbench-v142.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const clone = (v) => JSON.parse(JSON.stringify(v));

test('v1.5 preview artifact validates: aggregate-only, composites reproduce, boards score-descending', async () => {
  const { artifact } = await readJevbenchV15Preview(root);
  assert.equal(artifact.status, 'preview-not-published');
  assert.ok(['diagnostic', 'official'].includes(artifact.run_kind));
  assert.equal(artifact.headline, 'B');
  assert.equal(artifact.systems.filter((s) => s.listing === 'ranked').length, artifact.n_ranked);
  for (const s of artifact.systems.filter((r) => r.listing === 'unpriced')) {
    assert.equal(s.cost.usd_per_1000, null, `${s.key} unpriced must not carry a price`);
    assert.equal(s.jevbench_score, null);
  }
  assert.doesNotMatch(read(JEVBENCH_V15_PREVIEW_ARTIFACT), /"(item_id|item_text|question_text|gold|golds|expected|prediction|predicted|per_item|item_results)"\s*:/);
});

test('validator rejects item-level fields, a changed score and a published status', async () => {
  const { artifact } = await readJevbenchV15Preview(root);
  const leak = clone(artifact); leak.systems[0].intelligence.gold = 'x';
  assert.throws(() => validateJevbenchV15Preview(leak), /item-level/);
  const tampered = clone(artifact); tampered.systems[0].scores.B += 1; tampered.systems[0].jevbench_score += 1;
  assert.throws(() => validateJevbenchV15Preview(tampered), /reproduce/);
  const published = clone(artifact); published.status = 'final';
  assert.throws(() => validateJevbenchV15Preview(published), /status/);
});

test('addendum rows carry the "v1.5.1 addendum A1" label and nothing else', async () => {
  const { artifact } = await readJevbenchV15Preview(root);
  const ok = clone(artifact); ok.systems[0].addendum = { id: 'A1', release: 'v1.5.1', label: 'v1.5.1 addendum A1' };
  assert.doesNotThrow(() => validateJevbenchV15Preview(ok));
  const bad = clone(artifact); bad.systems[0].addendum = { id: 'A1', release: 'v1.5.1', label: 'new!' };
  assert.throws(() => validateJevbenchV15Preview(bad), /addendum/);
  assert.match(read('components/JevBenchV15Preview.tsx'), /row\.addendum\.label/);
});

test('option weights: B = 40/20/20/20 with floor 50; C floor 60', () => {
  const axes = { intelligence: 55, calibration: 80, speed: 90, cost: 70 };
  const b = jevV15Composite(axes, { intelligence: 40, calibration: 20, speed: 20, cost: 20 }, 50);
  const hm = 100 / (40 / 55 + 20 / 80 + 20 / 90 + 20 / 70);
  assert.ok(Math.abs(b - hm) < 1e-9);
  const c = jevV15Composite(axes, { intelligence: 25, calibration: 25, speed: 25, cost: 25 }, 60);
  const a = jevV15Composite(axes, { intelligence: 25, calibration: 25, speed: 25, cost: 25 }, 50);
  assert.ok(Math.abs(c - a * (55 / 60) ** 2) < 1e-9);
});

test('hidden route: noindex, banner, diagnostic label, not in sitemap, nav, robots or any public page', () => {
  assert.equal(JEVBENCH_V15_PREVIEW_ROUTE, '/wip-oiifi41ouv1f/jevbench-v15');
  const page = read('app/wip-oiifi41ouv1f/jevbench-v15/page.tsx');
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  assert.match(page, /Unpublished preview — not released/);
  assert.match(page, /DIAGNOSTIC numbers/);
  assert.match(read('next.config.mjs'), /source: "\/wip-oiifi41ouv1f\/:path\*", headers: \[\{ key: "X-Robots-Tag", value: "noindex, nofollow/);
  for (const file of ['app/sitemap.ts', 'app/robots.ts', 'app/layout.tsx', 'app/jev-models/page.tsx', 'app/jev-models/v1.4.2/page.tsx', 'app/api/jevbench/route.ts']) {
    assert.doesNotMatch(read(file), /jevbench-v15|v1\.5\.0-preview|wip-oiifi41ouv1f/, `${file} must not reference the hidden v1.5 preview`);
  }
});

test('public JevBench pages still use the pinned v1.4.2 artifact', async () => {
  const { sha256 } = await readJevbenchV142(root);
  assert.equal(sha256, JEVBENCH_V142_SHA256);
  assert.match(read('app/jev-models/v1.4.2/page.tsx'), /readJevbenchV142WithFamilies/);
});

test('hidden What-If Lab: noindex, unlinked, aggregate-only; addendum rows listed apart from the ranking', () => {
  const html = readFileSync(new URL('../public/wip-oiifi41ouv1f/jevbench-v15-whatif.html', import.meta.url), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  assert.doesNotMatch(html, /"(task_id|item_id|gold|probs_as_returned)"\s*:/);
  const art = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.0-preview.json', import.meta.url), 'utf8'));
  const add = art.systems.filter((s) => s.listing === 'addendum');
  for (const s of add) {
    assert.equal(s.ranked, false);
    assert.ok(s.addendum && Number.isInteger(s.would_place_B));
    assert.ok(!art.board.B.order.includes(s.key));
  }
});
