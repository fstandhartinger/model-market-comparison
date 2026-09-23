#!/usr/bin/env node
// Deterministic offline ingestion of captured sources. Changed methodology needs a reviewed lock.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { writeJSONAtomic } from '../lib/snapshot.mjs';
import { validateBenchmarkScores, withholdConflictingSourceRows } from '../lib/benchmark-scores.mjs';
import { verifyScoreEvidence } from '../lib/benchmark-score-evidence.mjs';
import { parseRealSwe, buildRealSweSnapshot } from '../lib/realswe.mjs';
import { buildOpenRouterBenchmarkObservations, BENCHMARK_IDS as OPENROUTER_BENCHMARKS } from '../lib/openrouter-benchmark-scores.mjs';
import { aaMappingApplies } from '../lib/benchmark-registry.mjs';
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
const foldedDefaultNames = new Map();
for (const m of models) {
  if (!exactNames.has(m.display_name)) exactNames.set(m.display_name, []);
  exactNames.get(m.display_name).push(m);
  if (m.variant === 'default') {
    const folded = m.display_name.toLocaleLowerCase('en-US');
    if (!foldedDefaultNames.has(folded)) foldedDefaultNames.set(folded, []);
    foldedDefaultNames.get(folded).push(m);
  }
}
const entryById = new Map(registry.entries.map((e) => [e.id, e]));
// 2026-09-15: reviewed exact joins for measured boards whose labels are not catalog names
// (lib/coding-identity.mjs). Critic approvals bind a self-reported row's full identity, so the map
// may never touch one; a map entry whose catalog configuration no longer exists leaves the row unmatched.
const identityMap = await read('data/raw/benchmarks/identity-map.json').catch((e) => { if (e.code === 'ENOENT') return { entries: [] }; throw e; });
const identityJoin = new Map(identityMap.entries.map((e) => [`${e.benchmark_id}\0${e.source_id}`, e]));
const preserveSourceIdentity = new Set(registry.entries
  .filter((e) => e.how_to_collect?.identity_policy === 'source_label')
  .map((e) => e.id));
for (const mapping of registry.aa_field_map) {
  const entry = entryById.get(mapping.benchmark_id);
  // A re-versioned field reads only the snapshots inside its identity's window; the other identity of
  // the same field publishes nothing from this snapshot rather than a value on the wrong scale.
  if (!aaMappingApplies(mapping, aa.collected_at)) {
    const later = mapping.collected_from && Date.parse(aa.collected_at) < Date.parse(mapping.collected_from);
    collections.push({ benchmark_id: entry.id, status: later ? 'manual_required' : 'not_published', source_url: aa.source_url,
      reason: later ? `AA's current reviewed snapshot (collected ${aa.collected_at}) predates this version; its values arrive with the next reviewed AA snapshot.`
        : `AA no longer publishes this version under field ${mapping.field}; the current snapshot (collected ${aa.collected_at}) belongs to ${entry.superseded_by}.` });
    continue;
  }
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
    // AA writes an unrated model as { elo: 0, lower95ci: 0, upper95ci: 0 }; a real rating always has an
    // interval. That placeholder is missing, never a measured Elo of 0 (CR-9.3).
    if (mapping.field.endsWith('.elo') && value === 0) {
      const parent = mapping.field.split('.').slice(0, -1).reduce((v, k) => v?.[k], row.fields);
      if (parent?.lower95ci === 0 && parent?.upper95ci === 0) {
        rejected.push({ benchmark_id: entry.id, source_id: row.source_id, reason: 'Unrated placeholder (Elo 0 with a 0–0 interval); raw value retained only in aa-observed-fields.json.' });
        continue;
      }
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
    // The dataset build joins AA's short agent labels ("Opus 5 (max)") to the catalog
    // configuration and keeps the label as source_model_name; a unique label reuses it.
    const agentName = models.filter((m) => m.coding_agent_results?.some((r) => r.source_model_name === row.model_name));
    const model = (legacy.length === 1 ? legacy : exact.length === 1 ? exact : agentName.length === 1 ? agentName : [])[0];
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
// CR-34.2 / CR-34.3: OpenRouter's own reproducible runs. The capture is hash-bound to the lock,
// so ingestion is offline and deterministic; a refreshed capture needs a reviewed lock update.
{
  const spec = lock.openrouter_benchmarks;
  // Read the locked capture itself, not the daily-refreshed live snapshot: the dated registry
  // identity and the bytes behind it must stay the same pair. A newer capture becomes a new
  // dated identity in a reviewed change (ops/daily/refresh-benchmarks.mjs reports the drift).
  const captureBytes = gunzipSync(await readFile(spec.source_file));
  if (hash(captureBytes) !== spec.source_sha256) throw new Error('OpenRouter benchmarks evidence file no longer matches the locked capture');
  const snapshot = JSON.parse(captureBytes.toString('utf8'));
  const version = `snapshot-${spec.snapshot_date}`;
  const or = buildOpenRouterBenchmarkObservations(snapshot, models, {
    url: spec.source_url, retrieved_at: spec.retrieved_at, published_at: null,
    sha256: spec.source_sha256, file: spec.source_file,
  }, version, (await read('data/raw/openrouter.json')).models); // CR-65.13: default reasoning effort per permaslug
  observations.push(...or.observations);
  // A row whose permaslug resolves to no catalog offer never becomes an observation.
  // A row whose published effort is not a catalog configuration does become an observation,
  // unjoined — it stays visible as an unmatched source identity instead of silently vanishing.
  rejected.push(...or.rejected);
  for (const family of Object.values(OPENROUTER_BENCHMARKS)) for (const id of [`${family}::${version}`, `${family}-cost::${version}`]) {
    collections.push({ benchmark_id: id, status: 'collected', source_url: spec.source_url,
      reason: `OpenRouter's own runs from its documented public Benchmarks API, captured ${spec.retrieved_at.slice(0, 10)} and hash-bound to the ingestion lock. Attribution: OpenRouter Benchmarks.` });
  }
}
for (const path of ['data/raw/benchmarks/public-observations.json', 'data/raw/benchmarks/vendor-candidates.json',
  // Self-reported release-document claims, rebuilt by scripts/collect-self-reported-scores.mjs from
  // our own captures; each row still needs its own critic approval in score-approvals.json.
  'data/raw/benchmarks/self-reported-candidates.json',
  // CR-60.2: hand-curated preliminary rows — values a source publishes only inside a picture. They
  // are kept out of public-observations.json because the daily refresh rebuilds that file per
  // benchmark_id from the collector and would delete them; each row names its own model_id.
  'data/raw/benchmarks/manual-observations.json',
  // CR-128: independently sourced third-party board rows are maintained separately from preliminary values.
  'data/raw/benchmarks/manual-board-observations.json']) {
  let raw;
  try { raw = await read(path); } catch (e) { if (e.code === 'ENOENT' && process.argv.includes('--draft')) continue; throw e; }
  for (const observation of raw.observations) {
    // A reviewed identity-map rule outranks the generic display-name bridge: some sources label
    // their rows with the exact catalog display name (2026-09-19: Epoch hub slugs seed-oss-36b-instruct
    // and phi-4 are display names), and those rows must keep the reviewed note and rule.
    const reviewedFirst = identityJoin.get(`${observation.benchmark_id}\0${observation.subject.source_id}`);
    // Only a unique, exact checkpoint identity may bridge a public source to the catalog.
    // Generic vendor product aliases never choose an effort variant.
    if (path.endsWith('public-observations.json') && observation.subject.model_id === null
        && !preserveSourceIdentity.has(observation.benchmark_id) && !reviewedFirst) {
      const subject = observation.subject;
      const hf = subject.source_id.startsWith('https://huggingface.co/') ? subject.source_id
        : subject.source_id.includes('/') ? `https://huggingface.co/${subject.source_id}` : null;
      const candidates = hf ? models.filter((m) => m.aa_metadata?.huggingface_url === hf) : [];
      const exactDefault = models.filter((m) => m.variant === 'default' && m.display_name === subject.name);
      const foldedDefault = foldedDefaultNames.get(subject.name.toLocaleLowerCase('en-US')) || [];
      // Source labels occasionally differ only in capitalization. Keep the bridge
      // conservative: exact checkpoint first, then exact display name, then one
      // unique case-insensitive default name; never infer an effort variant.
      const matches = candidates.length === 1 ? candidates
        : exactDefault.length === 1 ? exactDefault
        : foldedDefault.length === 1 ? foldedDefault : [];
      if (matches.length === 1) {
        subject.model_id = matches[0].id;
        observation.join_note = candidates.length === 1 ? 'Unique exact Hugging Face checkpoint URL in retained catalog metadata; source effort remains as published.'
          : 'Exact display name, unique default catalog configuration; no effort alias inference.';
      }
    }
    const reviewed = identityJoin.get(`${observation.benchmark_id}\0${observation.subject.source_id}`);
    if (reviewed && path.endsWith('public-observations.json') && observation.subject.model_id === null) {
      const selfReported = (observation.source_basis ?? observation.basis) === 'self_reported';
      if (!selfReported && (observation.source_basis ?? observation.basis) !== 'measured') throw new Error(`Identity map may only join measured or self-reported observations: ${observation.id}`);
      // A self-reported join without its own review receipt stays unjoined (verifyScoreEvidence checks the receipt).
      if (models.some((m) => m.id === reviewed.model_id) && (!selfReported || reviewed.review)) {
        observation.subject.model_id = reviewed.model_id;
        const reviewedAt = reviewed.reviewed_at ?? identityMap.reviewed_at;
        if (!reviewedAt) throw new Error(`Identity map entry has no review date: ${observation.id}`);
        observation.join_note = `Reviewed identity map ${reviewedAt}: ${reviewed.rule}`;
        if (selfReported) observation.identity_review = reviewed.review;
      }
    }
    observations.push(observation);
  }
  rejected.push(...(raw.rejected || []));
  // D180: a row we ingested and then found to belong to another identity is withdrawn, not deleted.
  // It stays in its file with its evidence and its reason, and is republished here as a withheld
  // rejection so the retained history states cannot bring its value back as a bridged estimate.
  for (const observation of raw.withdrawn_observations || []) {
    if (!observation.withdrawn_reason) throw new Error(`Withdrawn observation has no reason: ${observation.id}`);
    rejected.push({ benchmark_id: observation.benchmark_id, source_id: observation.subject?.source_id ?? null,
      model_id: observation.subject?.model_id ?? null, reason: observation.withdrawn_reason,
      withheld: true, locator: observation.source?.locator ?? null });
  }
  // D186: a board that restates one of its own row labels without changing the measurement has not withdrawn
  // anything and has not published a second identity. The row keeps its public ID and value and follows the new
  // label; its previous label is recorded in the source file with both captures, and republished here as a
  // withheld rejection carrying the *old* locator — otherwise the retained history states read the old label's
  // absence as "no longer published" and bridge the same measurement back as an estimate. Only the locator may
  // suppress it: a model_id here would withhold every retained value of that benchmark × model pair.
  for (const restatement of raw.source_label_restatements || []) {
    const row = observations.find((o) => o.id === restatement.id);
    if (!row || row.benchmark_id !== restatement.benchmark_id || row.subject.source_id !== restatement.to) {
      throw new Error(`Label restatement does not name a published row under its new label: ${restatement.id}`);
    }
    if (!restatement.from || restatement.from === restatement.to || !restatement.reason || !restatement.previous_locator
      || !restatement.previous_source?.sha256 || !restatement.first_seen?.sha256) throw new Error(`Label restatement is incomplete: ${restatement.id}`);
    rejected.push({ benchmark_id: restatement.benchmark_id, source_id: restatement.from, model_id: null,
      reason: restatement.reason, withheld: true, locator: restatement.previous_locator });
  }
  for (const c of raw.collections || []) if (!collections.some((old) => old.benchmark_id === c.benchmark_id)) collections.push(c);
}
for (const e of registry.entries) if (!collections.some((c) => c.benchmark_id === e.id)) collections.push({ benchmark_id: e.id,
  status: 'manual_required', source_url: e.primary_url, reason: e.how_to_collect.locator });
rejected.push(...withholdConflictingSourceRows(observations));
const snapshot = { schema_version: 1, observations, missing, collections, rejected, ...(Object.keys(details).length ? { details } : {}) };
validateBenchmarkScores(snapshot, registry, new Set(models.map((m) => m.id)));
if (!process.argv.includes('--draft')) await verifyScoreEvidence(snapshot, registry, { approvals: await read('data/raw/benchmarks/score-approvals.json') });
const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0 && (!process.argv.includes('--draft') || !process.argv[outIndex + 1])) throw new Error('--out requires --draft and an output path');
const target = outIndex >= 0 ? process.argv[outIndex + 1] : process.argv.includes('--draft') ? 'ops/rebuild-2026-09/evidence/phase-05/draft-scores.json' : 'data/raw/benchmarks/scores.json';
await writeJSONAtomic(target, snapshot);
console.log(JSON.stringify({ target, observations: observations.length, missing: missing.length, unmatched: observations.filter((o) => !o.subject.model_id).length, rejected: rejected.length }));
