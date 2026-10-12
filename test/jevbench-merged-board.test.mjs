// Florian 10 Oct 2026: one merged JevBench board (cohort rows join with their draw, anchor offsets per draw).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCohortRows, jevWithCohortRows, equateCohortRow, jevComposite, readDrawEquating, jevLiveAllArtifact } from '../lib/jevbench-cohort-merge.mjs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { isJevApiOffering } from '../lib/jevbench-scope.mjs';

test('every cohort system joins once, from its latest release, with its draw', async () => {
  const { rows } = await readCohortRows();
  const keys = rows.map((r) => r.row.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(rows.length, 29);
  assert.deepEqual([...new Set(rows.map((r) => r.draw.release))].sort(), ['v1.6.13', 'v1.6.4', 'v1.6.9']);
  assert.ok(rows.every((r) => r.draw.id && r.draw.measured_on));
});

test('the composite port reproduces the published scores', async () => {
  const { artifact } = await readCurrentJevbench();
  for (const s of artifact.systems.filter((x) => x.scores?.A != null).slice(0, 40)) {
    for (const [o, { weights, intelligence_floor }] of Object.entries(artifact.options)) {
      const w = Object.fromEntries(Object.entries(weights).map(([a, v]) => [a, v / 100]));
      assert.ok(Math.abs(jevComposite(s.axes, w, intelligence_floor) - s.scores[o]) < 1e-6, `${s.key} ${o}`);
    }
  }
});

test('pending draws show the published numbers unchanged; an offset moves the axes and recomputes', async () => {
  const table = await readDrawEquating();
  assert.ok(table.draws.every((d) => d.status === 'equated' || (d.offset.I === 0 && d.offset.C === 0)));
  const { artifact } = await readCurrentJevbench();
  const { rows } = await readCohortRows();
  const row = rows.find((r) => r.row.key === 'jeff_1_0_large').row;
  assert.equal(equateCohortRow(row, { I: 0, C: 0 }, artifact.options), row);
  const moved = equateCohortRow(row, { I: 2, C: -1 }, artifact.options);
  assert.ok(Math.abs(moved.axes.intelligence - (row.axes.intelligence + 2)) < 1e-9);
  assert.ok(Math.abs(moved.capability - (row.capability + 0.5)) < 1e-9);
  assert.notEqual(moved.scores.A, row.scores.A);
});

test('merged board slots ranked cohort rows by score and keeps published rows in order', async () => {
  const { artifact } = await readCurrentJevbench();
  const merged = jevWithCohortRows(artifact, await readCohortRows());
  assert.equal(merged.systems.length, artifact.systems.length + 29);
  for (const o of Object.keys(artifact.board)) {
    const kept = merged.board[o].order.filter((k) => artifact.board[o].order.includes(k));
    assert.deepEqual(kept, artifact.board[o].order);
    const score = new Map(merged.systems.map((s) => [s.key, s.scores?.[o] ?? -Infinity]));
    const order = merged.board[o].order;
    for (let i = 1; i < order.length; i++) if (!artifact.board[o].order.includes(order[i])) assert.ok(score.get(order[i - 1]) >= score.get(order[i]), `${o}: ${order[i]}`);
  }
  const wrappers = merged.systems.filter((s) => s.draw && !s.ranked).map((s) => s.key).sort();
  assert.deepEqual(wrappers, ['metask_jev_rain_12b']);
  // 12 Oct 2026 listing correction: RYOTIDE-Qwen9 is a ranked native system; its stored v1.6.4 numbers are untouched.
  const ryotide = merged.systems.find((s) => s.key === 'ryotide_qwen9');
  const stored = (await readCohortRows()).rows.find((r) => r.row.key === 'ryotide_qwen9');
  assert.equal(ryotide.ranked, true); assert.equal(ryotide.listing, 'ranked');
  assert.equal(ryotide.display, 'RYOTIDE-Qwen9'); assert.equal(ryotide.licence, 'MIT engine on Apache-2.0 weights');
  assert.equal(ryotide.jevbench_score, 16.1347687863636); assert.equal(ryotide.capability, 53.473263564131784);
  assert.equal(ryotide.not_ranked_because, undefined);
  assert.equal(stored.corrected, true);
  assert.ok(merged.board.A.order.includes('ryotide_qwen9'));
  const all = jevLiveAllArtifact(merged, isJevApiOffering);
  const caps = all.systems.filter((s) => s.ranked && s.ranks.capability != null).map((s) => s.ranks.capability).sort((a, b) => a - b);
  assert.deepEqual(caps, caps.map((_, i) => i + 1));
});

test('live pages: filter presets, no version tabs, release history; archived pages keep their URLs', () => {
  const route = readFileSync(new URL('../components/JevBenchV16ReleaseRoute.tsx', import.meta.url), 'utf8');
  const live = route.slice(route.indexOf('if (live) return'), route.indexOf('\n  return <>'));
  assert.match(live, /<JevReleaseHistory \/>/); assert.doesNotMatch(live, /JevBenchReleaseVersionNav/);
  const notice = readFileSync(new URL('../components/JevApiOfferingsToggle.tsx', import.meta.url), 'utf8');
  assert.match(notice, /Show all mixed/); assert.match(notice, /'\/jev-models\/all'/); assert.match(notice, /API-hosted/);
  assert.match(readFileSync(new URL('../app/jev-models/all/page.tsx', import.meta.url), 'utf8'), /scope="all"/);
});

test('listing corrections: only presentation fields, the published release row is never mutated', async () => {
  const { applyListingCorrection } = await import('../lib/jevbench-cohort-merge.mjs');
  const row = { key: 'x', ranked: false, listing: 'wrapper', not_ranked_because: 'r', jevbench_score: 1, axes: { intelligence: 2 } };
  const out = applyListingCorrection(row, { key: 'x', ranked: true, listing: 'ranked', display: 'X' });
  assert.equal(out.ranked, true); assert.equal(out.not_ranked_because, undefined);
  assert.equal(out.jevbench_score, 1); assert.deepEqual(out.axes, row.axes);
  assert.equal(row.ranked, false); assert.equal(row.not_ranked_because, 'r');
  assert.equal(applyListingCorrection(row, undefined), row);
});

test('score correction: decisor-4b cost re-estimate applies on the live merged board only, every other stored field unchanged', async () => {
  const { readOptionalJevbenchV164Release } = await import('../lib/jevbench-v164-release.mjs');
  const published = (await readOptionalJevbenchV164Release()).artifact.systems.find((s) => s.key === 'decisor_4b');
  assert.equal(published.scores.A, 33.51963655001747); assert.equal(published.axes.cost, 51.35109809189328);
  assert.equal(published.cost.usd_per_1000, 0.04184369844489519);
  const live = (await readCohortRows()).rows.find((r) => r.row.key === 'decisor_4b').row;
  assert.equal(live.scores.A, 35.341565591640844); assert.equal(live.scores.B, 32.590313637312704); assert.equal(live.scores.C, 24.542753883083925);
  assert.equal(live.jevbench_score, live.scores.A);
  assert.equal(live.axes.cost, 64.04636047691767); assert.equal(live.cost.usd_per_1000, 0.015792636916835696);
  assert.equal(live.cost.kind, 'estimate'); assert.match(live.cost.basis, /^ESTIMATE \(base-model reference; self-hosted open weights/);
  assert.match(live.cost.basis, /Qwen\/Qwen3\.5-4B/); assert.match(live.listing_note, /composite A 33\.52 → 35\.34/);
  for (const a of ['intelligence', 'calibration', 'speed']) assert.equal(live.axes[a], published.axes[a]);
  assert.equal(live.capability, published.capability); assert.deepEqual(live.status, published.status);
  assert.deepEqual(live.calibration, published.calibration); assert.deepEqual(live.speed, published.speed);
  assert.deepEqual(live.composite_ci95.A, [24.74558117984167, 45.875966423832466]);
  assert.deepEqual(live.v16.ci95.composite, live.composite_ci95);
  assert.equal(live.score_correction.published.scores.A, 33.51963655001747);
  // views and composites follow the corrected axes through the scoring rule
  const { artifact } = await readCurrentJevbench();
  for (const [o, { weights, intelligence_floor }] of Object.entries(artifact.options)) {
    const w = Object.fromEntries(Object.entries(weights).map(([a, v]) => [a, v / 100]));
    assert.ok(Math.abs(jevComposite(live.axes, w, intelligence_floor) - live.scores[o]) < 1e-9, o);
  }
  // the same rule reproduces the published views from the published axes (so the recomputed views are trustworthy)
  assert.ok(Math.abs(jevComposite(published.axes, { intelligence: 0.6, calibration: 0, speed: 0.2, cost: 0.2 }, 50) - published.views['Emphasis on Accuracy 60:20:20']) < 1e-9);
  assert.ok(live.views['Emphasis on Cost 20:20:60'] > published.views['Emphasis on Cost 20:20:60']);
  // ranks on the merged boards: decisor keeps its Capability slot (capability unchanged) and Composite A moves up
  const merged = jevWithCohortRows(artifact, await readCohortRows());
  const all = jevLiveAllArtifact(merged, isJevApiOffering);
  const row = all.systems.find((s) => s.key === 'decisor_4b');
  assert.equal(row.scores.A, 35.341565591640844);
  assert.ok(row.ranks.A > 5 && row.ranks.capability > 5);
});

test('score correction: refuses to apply on any mismatch and shows the published row', async () => {
  const { readScoreCorrections, applyScoreCorrection } = await import('../lib/jevbench-cohort-merge.mjs');
  const { readOptionalJevbenchV164Release } = await import('../lib/jevbench-v164-release.mjs');
  const release = (await readOptionalJevbenchV164Release()).artifact;
  const row = release.systems.find((s) => s.key === 'decisor_4b');
  const correction = (await readScoreCorrections()).get('decisor_4b');
  const ctx = { release: 'v1.6.4', gMed: release.G_med, options: release.options };
  const ok = applyScoreCorrection(row, correction, ctx);
  assert.equal(ok.scores.A, correction.scores.A); assert.notEqual(ok, row);
  assert.equal(row.scores.A, 33.51963655001747, 'the published row object is never mutated');
  assert.equal(applyScoreCorrection(row, undefined, ctx), row);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const refused = (r, c = correction, x = ctx) => assert.throws(() => applyScoreCorrection(r, c, x), /score correction decisor_4b/);
  { const r = clone(row); r.axes.intelligence += 0.01; refused(r); }
  { const r = clone(row); r.axes.calibration += 0.01; refused(r); }
  { const r = clone(row); r.axes.speed += 0.01; refused(r); }
  { const r = clone(row); r.capability += 0.01; refused(r); }
  { const r = clone(row); r.status.missing = 1; refused(r); }
  { const r = clone(row); r.scores.A += 0.01; refused(r); }
  { const r = clone(row); r.cost.usd_per_1000 = 0.05; refused(r); }
  { const r = clone(row); r.cost.basis += ' '; refused(r); }
  { const r = clone(row); r.composite_ci95.A[0] += 0.1; refused(r); }
  refused(row, correction, { ...ctx, gMed: ctx.gMed + 0.1 });
  refused(row, correction, { ...ctx, release: 'v1.6.5' });
  refused({ ...clone(row), key: 'other' });
  { const c = clone(correction); c.axes.intelligence += 0.01; refused(row, c); }
  { const c = clone(correction); c.scores.A += 0.01; c.jevbench_score = c.scores.A; refused(row, c); }
  { const c = clone(correction); c.composite_ci95.A[1] += 0.1; refused(row, c); }
  { const c = clone(correction); c.cost.usd_per_1000 *= 2; refused(row, c); }
  refused(row, { ...clone(correction), receiptError: 'receipt sha256 mismatch' });
  refused(row, { ...clone(correction), receiptContent: null });
});

test('score correction: reader rejects unknown fields and an altered receipt disables the correction', async () => {
  const { readScoreCorrections, applyScoreCorrection } = await import('../lib/jevbench-cohort-merge.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const file = JSON.parse(readFileSync(new URL('../data/jevbench-score-corrections.json', import.meta.url), 'utf8'));
  const receiptRel = file.corrections[0].receipt.path;
  const stage = (mutate, receiptMutate) => {
    const root = mkdtempSync(path.join(tmpdir(), 'score-corr-'));
    mkdirSync(path.dirname(path.join(root, receiptRel)), { recursive: true });
    const receipt = readFileSync(new URL(`../${receiptRel}`, import.meta.url), 'utf8');
    writeFileSync(path.join(root, receiptRel), receiptMutate ? receiptMutate(receipt) : receipt);
    const copy = JSON.parse(JSON.stringify(file)); mutate?.(copy);
    writeFileSync(path.join(root, 'data/jevbench-score-corrections.json'), JSON.stringify(copy));
    return root;
  };
  const good = await readScoreCorrections(stage());
  assert.equal(good.get('decisor_4b').receiptError, null);
  const tampered = await readScoreCorrections(stage(null, (r) => r.replace('"A": 35.34', '"A": 36.34')));
  assert.match(tampered.get('decisor_4b').receiptError, /sha256 mismatch/);
  const missing = await readScoreCorrections(stage((f) => { f.corrections[0].receipt.path = 'data/nope.json'; }));
  assert.match(missing.get('decisor_4b').receiptError, /unreadable/);
  await assert.rejects(readScoreCorrections(stage((f) => { f.corrections[0].ranked = true; })), /unsupported fields ranked/);
  await assert.rejects(readScoreCorrections(stage((f) => { delete f.corrections[0].receipt; })), /missing receipt/);
  await assert.rejects(readScoreCorrections(stage((f) => { f.corrections.push(f.corrections[0]); })), /key/);
  await assert.rejects(readScoreCorrections(stage((f) => { f.kind = 'x'; })), /schema/);
  const { readOptionalJevbenchV164Release } = await import('../lib/jevbench-v164-release.mjs');
  const release = (await readOptionalJevbenchV164Release()).artifact;
  const row = release.systems.find((s) => s.key === 'decisor_4b');
  assert.throws(() => applyScoreCorrection(row, tampered.get('decisor_4b'), { release: 'v1.6.4', gMed: release.G_med, options: release.options }), /receipt sha256 mismatch/);
});

test('score correction: archived release pages and published files never read it', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const path = await import('node:path');
  const root = new URL('..', import.meta.url).pathname;
  const readers = [];
  const walk = (dir) => {
    for (const name of readdirSync(path.join(root, dir))) {
      const rel = path.join(dir, name);
      if (statSync(path.join(root, rel)).isDirectory()) { if (!['node_modules', '.next'].includes(name)) walk(rel); continue; }
      if (/\.(mjs|ts|tsx|js)$/.test(name) && /score-corrections|readScoreCorrections|applyScoreCorrection/.test(readFileSync(path.join(root, rel), 'utf8'))) readers.push(rel);
    }
  };
  for (const dir of ['lib', 'components', 'app']) walk(dir);
  assert.deepEqual(readers, ['lib/jevbench-cohort-merge.mjs']);
  const archived = readFileSync(path.join(root, 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.4-results.json'), 'utf8');
  assert.match(archived, /"jevbench_score": 33\.51963655001747/);
  assert.doesNotMatch(archived, /score_correction|Cost re-estimated/);
  // the route reads the corrected cohort only for the live boards
  assert.match(readFileSync(path.join(root, 'components/JevBenchV16ReleaseRoute.tsx'), 'utf8'), /live && release_\.revision === 'v1\.6\.1' \? await readCohortRows\(\)/);
});
