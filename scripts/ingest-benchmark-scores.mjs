#!/usr/bin/env node
// Deterministic offline ingestion of captured sources. Changed methodology needs a reviewed lock.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { writeJSONAtomic } from '../lib/snapshot.mjs';
import { validateBenchmarkScores } from '../lib/benchmark-scores.mjs';
import { verifyScoreEvidence } from '../lib/benchmark-score-evidence.mjs';
import { parseRealSwe, buildRealSweSnapshot } from '../lib/realswe.mjs';
const read = async (p) => JSON.parse(await readFile(p, 'utf8'));
const hash = (s) => createHash('sha256').update(s).digest('hex');
const registry = await read('data/raw/benchmarks/registry.json');
const models = (await read('data/dataset.json')).models;
const lock = await read('data/raw/benchmarks/ingestion-lock.json');
const aa = await read('data/raw/benchmarks/aa-observed-fields.json');
if (aa.source_sha256 !== lock.aa.source_sha256 || hash(await readFile('data/raw/benchmarks/aa-observed-fields.json')) !== lock.aa.observations_sha256) throw new Error('AA snapshot changed: review methodology/version mapping and refresh ingestion-lock before accepting scores');
const observations = [], missing = [], collections = [], rejected = [];
const details = {};
const aaModels = new Map(models.filter((m) => m.aa_model_id).map((m) => [m.aa_model_id, m]));
const exactNames = new Map();
for (const m of models) {
  if (!exactNames.has(m.display_name)) exactNames.set(m.display_name, []);
  exactNames.get(m.display_name).push(m);
}
const entryById = new Map(registry.entries.map((e) => [e.id, e]));
for (const mapping of registry.aa_field_map) {
  const entry = entryById.get(mapping.benchmark_id);
  const blocked = mapping.field === 'livecodebench';
  collections.push({ benchmark_id: entry.id, status: blocked ? 'contested' : 'collected', source_url: aa.source_url,
    reason: blocked ? 'Historical task date window is unverified; all values withheld.' : 'Exact AA UUID and field from the reviewed protocol snapshot; null does not prove whether AA ran the test.' });
  for (const row of aa.rows) {
    const model = aaModels.get(row.source_id);
    const value = mapping.field.split('.').reduce((v, k) => v?.[k], row.fields);
    const source = { url: aa.source_url, retrieved_at: aa.collected_at, published_at: null,
      sha256: aa.source_sha256, file: lock.aa.source_file, locator: `model UUID ${row.source_id}; ${mapping.field}` };
    if (blocked) {
      if (typeof value === 'number') rejected.push({ benchmark_id: entry.id, source_id: row.source_id, reason: 'Unverified LiveCodeBench task window; raw value retained only in aa-observed-fields.json.' });
      if (model) missing.push({ model_id: model.id, benchmark_id: entry.id, status: 'contested', reason: 'Exact evaluation task window is unknown.', source });
      continue;
    }
    if (value === undefined || value === null) {
      continue;
    }
    observations.push({ id: `aa:${row.source_id}:${mapping.field}`, benchmark_id: entry.id,
      subject: { source_id: row.source_id, name: row.name, model_id: model?.id ?? null, variant: row.variant, harness: null },
      value, unit: entry.scoring.unit, basis: 'measured', source,
      protocol: `${entry.scoring.metric}; AA methodology captured ${registry.verified_at}; effort ${row.variant ?? 'not in effort field (exact UUID retained)'}`,
      comparison_key: null });
  }
}
for (const version of ['1.4', '1.5']) {
  const spec = lock.coding[version];
  const bytes = await readFile(spec.file);
  if (hash(bytes) !== spec.sha256) throw new Error(`Coding ${version} capture changed: review provenance/version lock`);
  const raw = JSON.parse(bytes);
  if (raw.version !== version) throw new Error('Coding Agent version mismatch');
  const benchmark_id = `aa-coding-agent-index::${version}`;
  for (const [index, row] of raw.rows.entries()) {
    if (row.complete !== true) { rejected.push({ benchmark_id, source_id: row.source_id ?? String(index), reason: 'Partial index' }); continue; }
    // Legacy results were already attached by an audited exact harness/model join.
    const legacy = version === '1.4' ? models.filter((m) => m.coding_agent_results?.some((r) => r.source_model_name === row.model_name && r.harness === row.harness && Math.abs(r.score / 100 - row.score) < 1e-12)) : [];
    const exact = exactNames.get(row.model_name) || [];
    const model = (legacy.length === 1 ? legacy : exact.length === 1 ? exact : [])[0];
    observations.push({ id: `aa-coding:${version}:${row.source_id ?? index}`, benchmark_id,
      subject: { source_id: row.source_id ?? `${row.model_name}/${row.harness}`, name: row.model_name,
        model_id: model?.id ?? null, variant: model?.variant ?? null, harness: row.harness },
      value: row.score, unit: 'fraction', basis: 'measured',
      source: { url: version === '1.4' ? 'https://artificialanalysis.ai/' : raw.endpoint,
        retrieved_at: raw.collected_at, published_at: null, sha256: spec.sha256, file: spec.file,
        locator: `rows[${index}]; ${row.model_name}; ${row.harness}; score; original retained collector output` },
      protocol: `Coding Agent Index ${version}; complete ${row.index_component_count} components; ${row.harness}; original model name ${row.model_name}`,
      comparison_key: null });
  }
  collections.push({ benchmark_id, status: 'collected', source_url: 'https://artificialanalysis.ai/agents/coding-agents',
    reason: `Reviewed ${version} snapshot. ${version === '1.4' ? 'Historical date retained; unchanged Composite source.' : 'Separate registry observations; no Composite attachment.'}` });
}
{
  const spec = lock.realswe;
  const htmlBytes = gunzipSync(await readFile(spec.source_file));
  if (hash(htmlBytes) !== spec.source_sha256) throw new Error('Real-SWE page capture changed: review provenance before accepting scores');
  const chunkBytes = gunzipSync(await readFile(spec.chunk_file));
  if (hash(chunkBytes) !== spec.chunk_sha256) throw new Error('Real-SWE data chunk capture changed: review provenance before accepting scores');
  const parsedRealSwe = parseRealSwe(htmlBytes.toString('utf8'), { chunk: chunkBytes.toString('utf8') });
  const realswe = buildRealSweSnapshot(parsedRealSwe, {
    date: spec.snapshot_date,
    retrievedAt: spec.retrieved_at,
    sourceFile: spec.source_file,
    sourceSha256: spec.source_sha256,
    chunkUrl: spec.chunk_url,
    chunkFile: spec.chunk_file,
    chunkSha256: spec.chunk_sha256,
    chunkLocator: 'Next.js dataset chunk: per-configuration passes/valid array (verified against the leaderboard) and the cost-provenance map; the bundle is identified by the marker `entitlement-overage-lines`.',
  });
  observations.push(...realswe.observations);
  Object.assign(details, realswe.details);
  collections.push({ benchmark_id: realswe.scoreId, status: 'collected', source_url: spec.source_url,
    reason: 'Hash-bound page and dataset chunk parsed offline; eight model-harness configurations on a published ten-task sample (8 x 10 x 8 = 640 rollouts), each value reconciled against the individual rollout outcomes.' });
  collections.push({ benchmark_id: realswe.costId, status: 'collected', source_url: spec.source_url,
    reason: 'Published mean cost per rollout from the source Pareto view; recorded with per-configuration provider-usage provenance and explicit lower-bound flags.' });
}
for (const path of ['data/raw/benchmarks/public-observations.json', 'data/raw/benchmarks/vendor-candidates.json']) {
  let raw;
  try { raw = await read(path); } catch (e) { if (e.code === 'ENOENT' && process.argv.includes('--draft')) continue; throw e; }
  for (const observation of raw.observations) {
    // Only a unique, exact checkpoint identity may bridge a public source to the catalog.
    // Generic vendor product aliases never choose an effort variant.
    if (path.endsWith('public-observations.json') && observation.subject.model_id === null) {
      const subject = observation.subject;
      const hf = subject.source_id.startsWith('https://huggingface.co/') ? subject.source_id
        : subject.source_id.includes('/') ? `https://huggingface.co/${subject.source_id}` : null;
      const candidates = hf ? models.filter((m) => m.aa_metadata?.huggingface_url === hf) : [];
      const exactDefault = models.filter((m) => m.variant === 'default' && m.display_name === subject.name);
      const matches = candidates.length === 1 ? candidates : exactDefault.length === 1 ? exactDefault : [];
      if (matches.length === 1) {
        subject.model_id = matches[0].id;
        observation.join_note = candidates.length === 1 ? 'Unique exact Hugging Face checkpoint URL in retained catalog metadata; source effort remains as published.' : 'Exact display name, unique default catalog configuration; no effort alias inference.';
      }
    }
    observations.push(observation);
  }
  rejected.push(...(raw.rejected || []));
  for (const c of raw.collections || []) if (!collections.some((old) => old.benchmark_id === c.benchmark_id)) collections.push(c);
}
for (const e of registry.entries) if (!collections.some((c) => c.benchmark_id === e.id)) collections.push({ benchmark_id: e.id,
  status: 'manual_required', source_url: e.primary_url, reason: e.how_to_collect.locator });
const snapshot = { schema_version: 1, observations, missing, collections, rejected, ...(Object.keys(details).length ? { details } : {}) };
validateBenchmarkScores(snapshot, registry, new Set(models.map((m) => m.id)));
if (!process.argv.includes('--draft')) await verifyScoreEvidence(snapshot, registry, { approvals: await read('data/raw/benchmarks/score-approvals.json') });
const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0 && (!process.argv.includes('--draft') || !process.argv[outIndex + 1])) throw new Error('--out requires --draft and an output path');
const target = outIndex >= 0 ? process.argv[outIndex + 1] : process.argv.includes('--draft') ? 'ops/rebuild-2026-09/evidence/phase-05/draft-scores.json' : 'data/raw/benchmarks/scores.json';
await writeJSONAtomic(target, snapshot);
console.log(JSON.stringify({ target, observations: observations.length, missing: missing.length, unmatched: observations.filter((o) => !o.subject.model_id).length, rejected: rejected.length }));
