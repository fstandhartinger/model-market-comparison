#!/usr/bin/env node
// D243: measure whether a self-reported board's setting-less model names can be joined to a
// catalog configuration without inventing a claim. Nothing here is pinned: the benchmark id,
// the source names and the catalog configurations are all read from the published data, so a
// later catalog or board change moves the answer instead of silently agreeing with this one.
//
// Usage: node ops/ux-2026-09-12/bin/measure-d243-join.mjs <benchmark_id> [outDir]
//   e.g. node ops/ux-2026-09-12/bin/measure-d243-join.mjs openai-mentalhealthbench::snapshot-2026-09-23
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const benchmarkId = process.argv[2];
const outDir = process.argv[3] ?? null;
if (!benchmarkId) throw new Error('usage: <benchmark_id> [outDir]');

const scores = JSON.parse(await readFile('data/raw/benchmarks/scores.json', 'utf8'));
const dataset = JSON.parse(await readFile('data/dataset.json', 'utf8'));
const observations = scores.observations ?? scores;

const rows = observations.filter((o) => o.benchmark_id === benchmarkId);
if (!rows.length) throw new Error(`no observations for ${benchmarkId}`);

const norm = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const byFamilyName = new Map();
for (const m of dataset.models) {
  const k = norm(m.family_name);
  if (!byFamilyName.has(k)) byFamilyName.set(k, []);
  byFamilyName.get(k).push(m);
}

// A configuration is "effort-free" when its variant is not a reasoning-effort setting. Those are
// the only variants for which the source's "default reasoning effort … (when applicable)" needs no
// vendor statement, because the model has no effort to set.
const EFFORT_VARIANTS = new Set(['low', 'medium', 'high', 'xhigh', 'max', 'minimal', 'reasoning', 'non-reasoning-high']);

const report = [];
for (const o of rows) {
  const sourceName = o.subject.source_id ?? o.subject.name;
  const exact = byFamilyName.get(norm(sourceName)) ?? [];
  const configs = exact.map((m) => ({ id: m.id, variant: m.variant ?? null, deprecated: m.deprecated === true }));
  const effortful = configs.filter((c) => EFFORT_VARIANTS.has(c.variant ?? ''));
  let verdict, reason;
  if (!configs.length) {
    verdict = 'no-catalog-family';
    reason = 'no catalog family carries this exact display name, so the source name names no configuration here';
  } else if (configs.length > 1) {
    verdict = 'ambiguous';
    reason = `${configs.length} configurations and none is named "default": ${configs.map((c) => c.variant).join(', ')}`;
  } else if (effortful.length) {
    verdict = 'single-config-but-effortful';
    reason = `the only configuration is itself an effort setting (${configs[0].variant}), which the source never states`;
  } else {
    verdict = 'joinable';
    reason = `exactly one configuration and its variant (${configs[0].variant}) is not an effort setting`;
  }
  report.push({ id: o.id, source_name: sourceName, model_id: o.subject.model_id, configs, verdict, reason });
}

const tally = report.reduce((a, r) => ({ ...a, [r.verdict]: (a[r.verdict] ?? 0) + 1 }), {});
const out = {
  measured_at: new Date().toISOString(),
  benchmark_id: benchmarkId,
  dataset_generated_at: dataset.generated_at,
  observations: rows.length,
  already_joined: report.filter((r) => r.model_id).length,
  tally,
  joinable_without_a_vendor_statement: report.filter((r) => r.verdict === 'joinable').map((r) => ({
    id: r.id, model_id: r.configs[0].id, deprecated: r.configs[0].deprecated,
  })),
  rows: report,
};

console.log(`${benchmarkId}: ${rows.length} observations, ${out.already_joined} joined`);
for (const [k, v] of Object.entries(tally)) console.log(`  ${k}: ${v}`);
for (const r of report) console.log(`  ${r.verdict.padEnd(28)} ${r.source_name.padEnd(26)} ${r.reason}`);

if (outDir) {
  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/d243-join-measurement.json`, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`\nwrote ${outDir}/d243-join-measurement.json`);
}
