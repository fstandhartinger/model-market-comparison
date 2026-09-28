#!/usr/bin/env node
// D243: measure whether a self-reported board's setting-less model names can be joined to a
// catalog configuration without inventing a claim. Nothing here is pinned: the benchmark id,
// the source names and the catalog configurations are all read from the published data, so a
// later catalog or board change moves the answer instead of silently agreeing with this one.
//
// Usage: node ops/ux-2026-09-12/bin/measure-d243-join.mjs <benchmark_id> [outDir]
//   e.g. node ops/ux-2026-09-12/bin/measure-d243-join.mjs openai-mentalhealthbench::snapshot-2026-09-23
//
// 2026-09-28 (iteration 261) — corrected. The first version of this script asked "is the single
// configuration's variant one of a list of effort names?" and, because `non-reasoning` was missing
// from that list, reported `gemini-2.5-flash::non-reasoning` as joinable. That is not our policy and
// the catalog itself contradicts it: `non-reasoning` (95 configurations) is the paired opposite of
// `reasoning` (87) — one pole of the reasoning setting, exactly like `high` or `max`, not the absence
// of one. The setting-less variant is `default` (516).
//
// The standing policy is the exact-join rule in lib/board-identity.mjs, written for D219.1 and pinned
// by test/d219-1-eqbench-writing-identity.test.mjs: a source name that states no setting joins only a
// family whose catalog holds **exactly one configuration, and that configuration's variant is
// `default`** (`configs.length === 1 && configs[0].variant === 'default'`). A single configuration
// that is *not* the default is never guessed. This script now applies that same predicate instead of
// a second, weaker one of its own, so the two cannot drift apart again.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

/** The setting-less catalog variant. Everything else names a setting the source would have to state. */
export const SETTING_LESS_VARIANT = 'default';

/**
 * The standing exact-join predicate of lib/board-identity.mjs, applied to the catalog configurations
 * that carry a board name. `configs` is `[{ id, variant, deprecated }]` for one family.
 * Returns `{ verdict, reason, model_id }`; `model_id` is non-null only for `joinable`.
 */
export function classifyJoin(configs) {
  if (!configs.length) {
    return { verdict: 'no-catalog-family', model_id: null,
      reason: 'no catalog family carries this exact display name, so the source name names no configuration here' };
  }
  if (configs.length === 1 && configs[0].variant === SETTING_LESS_VARIANT) {
    return { verdict: 'joinable', model_id: configs[0].id,
      reason: `exactly one configuration and it is the default (${configs[0].id}), so the source's "default … setting (when applicable)" names it` };
  }
  if (configs.length === 1) {
    return { verdict: 'single-config-not-default', model_id: null,
      reason: `the only configuration is ${configs[0].id} — variant "${configs[0].variant}" is a setting, not the default, and the source never states a setting` };
  }
  const hasDefault = configs.some((c) => c.variant === SETTING_LESS_VARIANT);
  return { verdict: 'ambiguous', model_id: null,
    reason: `${configs.length} configurations (${configs.map((c) => c.variant).join(', ')})${hasDefault
      ? ' — one is the default, but the policy joins a setting-less name only to a family that holds a single configuration'
      : ' and none is the default'}` };
}

export async function measure(benchmarkId, { root = process.cwd() } = {}) {
  const scores = JSON.parse(await readFile(`${root}/data/raw/benchmarks/scores.json`, 'utf8'));
  const dataset = JSON.parse(await readFile(`${root}/data/dataset.json`, 'utf8'));
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

  const report = [];
  for (const o of rows) {
    const sourceName = o.subject.source_id ?? o.subject.name;
    const exact = byFamilyName.get(norm(sourceName)) ?? [];
    const configs = exact.map((m) => ({ id: m.id, variant: m.variant ?? null, deprecated: m.deprecated === true }));
    const { verdict, reason } = classifyJoin(configs);
    report.push({
      id: o.id, source_name: sourceName, model_id: o.subject.model_id, configs, verdict, reason,
      // What a captured vendor statement of "this API's default setting is X" could name. Empty means
      // no vendor statement can join this row as the catalog stands — it would need a configuration first.
      candidate_variants: configs.map((c) => c.variant),
    });
  }

  const tally = report.reduce((a, r) => ({ ...a, [r.verdict]: (a[r.verdict] ?? 0) + 1 }), {});
  return {
    measured_at: new Date().toISOString(),
    benchmark_id: benchmarkId,
    dataset_generated_at: dataset.generated_at,
    policy: 'lib/board-identity.mjs exact-join rule (D219.1): a setting-less source name joins only a family with exactly one configuration whose variant is "default"',
    observations: rows.length,
    already_joined: report.filter((r) => r.model_id).length,
    tally,
    joinable_without_a_vendor_statement: report.filter((r) => r.verdict === 'joinable').map((r) => ({
      id: r.id, model_id: r.configs[0].id, deprecated: r.configs[0].deprecated,
    })),
    rows: report,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const benchmarkId = process.argv[2];
  const outDir = process.argv[3] ?? null;
  if (!benchmarkId) throw new Error('usage: <benchmark_id> [outDir]');
  const out = await measure(benchmarkId);

  console.log(`${benchmarkId}: ${out.observations} observations, ${out.already_joined} joined`);
  for (const [k, v] of Object.entries(out.tally)) console.log(`  ${k}: ${v}`);
  for (const r of out.rows) console.log(`  ${r.verdict.padEnd(26)} ${r.source_name.padEnd(26)} ${r.reason}`);

  if (outDir) {
    await mkdir(outDir, { recursive: true });
    await writeFile(`${outDir}/d243-join-measurement.json`, `${JSON.stringify(out, null, 2)}\n`);
    console.log(`\nwrote ${outDir}/d243-join-measurement.json`);
  }
}
