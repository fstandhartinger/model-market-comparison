#!/usr/bin/env node
// Independent CR-128 acceptance verifier (claude-opus, 2026-09-23).
//
// Written from the change-request text in 04-CR-BRIEF.md, not from the ingest job's own
// verify-batch.mjs: it reads the repo's committed data files as the record of what was
// published, re-hashes every retained capture, and re-reads both live hosts through the
// benchmark-scores collection route rather than the per-model route.
//
//   node ops/ux-2026-09-12/bin/verify-cr-128.mjs <OUT_DIR> [host ...]
//
// OUT_DIR comes first (the older verify-e2-* scripts in this tree take it there too, and a
// URL in that slot silently creates an "https:/" directory).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const REPO = process.cwd();
const CANDIDATE = '/home/flori/jobs/bh-thirdparty-ingest-20260922/staging/cr128-all-candidate-rows.json';
const DEFAULT_HOSTS = ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];

const outDir = process.argv[2];
if (!outDir || /^https?:/i.test(outDir)) {
  console.error('Usage: verify-cr-128.mjs <OUT_DIR> [host ...]');
  process.exit(2);
}
const hosts = process.argv.slice(3).length ? process.argv.slice(3) : DEFAULT_HOSTS;
fs.mkdirSync(outDir, { recursive: true });

const checks = [];
const check = (id, ok, detail) => { checks.push({ id, ok: !!ok, detail }); };

const candidate = JSON.parse(fs.readFileSync(CANDIDATE, 'utf8'));
check('candidate/304-rows', candidate.length === 304, `${candidate.length} rows in the candidate packet`);
check('candidate/unique-ids', new Set(candidate.map((r) => r.id)).size === candidate.length, 'every candidate id is distinct');

// ---------------------------------------------------------------- published rows in the repo
const published = new Map();
for (const rel of ['data/raw/benchmarks/scores.json', 'data/raw/benchmarks/manual-board-observations.json']) {
  const doc = JSON.parse(fs.readFileSync(path.join(REPO, rel), 'utf8'));
  const rows = Array.isArray(doc) ? doc : (doc.observations ?? doc.rows ?? []);
  for (const row of rows) if (typeof row?.id === 'string' && row.id.startsWith('cr128:')) {
    if (!published.has(row.id)) published.set(row.id, { row, files: [] });
    published.get(row.id).files.push(rel);
  }
}
check('repo/no-extra-cr128-rows', published.size === candidate.length,
  `${published.size} cr128: rows in the committed data vs ${candidate.length} in the packet`);

const FIELDS = ['benchmark_id', 'value', 'unit', 'basis', 'protocol'];
const SUBJECT = ['source_id', 'name', 'model_id', 'variant', 'harness'];
const SOURCE = ['url', 'retrieved_at', 'published_at', 'sha256', 'file', 'locator'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let repoMismatch = 0;
for (const want of candidate) {
  const got = published.get(want.id)?.row;
  if (!got) { repoMismatch += 1; continue; }
  for (const k of FIELDS) if (!same(want[k], got[k])) repoMismatch += 1;
  for (const k of SUBJECT) if (!same(want.subject?.[k], got.subject?.[k])) repoMismatch += 1;
  for (const k of SOURCE) if (!same(want.source?.[k], got.source?.[k])) repoMismatch += 1;
}
check('repo/packet-matches-committed-data', repoMismatch === 0, `${repoMismatch} field differences across ${candidate.length} rows`);

// ---------------------------------------------------------------- CR-128.2: hash-bound captures
const captures = new Map();
for (const row of candidate) {
  const file = row.source?.file;
  if (!file) continue;
  if (!captures.has(file)) captures.set(file, new Set());
  captures.get(file).add(row.source.sha256);
}
let missingCapture = 0; let hashMismatch = 0; let gzHash = 0; let bodyHash = 0;
for (const [rel, shas] of captures) {
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) { missingCapture += 1; continue; }
  const raw = fs.readFileSync(abs);
  const gz = crypto.createHash('sha256').update(raw).digest('hex');
  let body = null;
  try { body = crypto.createHash('sha256').update(zlib.gunzipSync(raw)).digest('hex'); } catch { /* not gzip */ }
  for (const sha of shas) {
    if (sha === gz) gzHash += 1;
    else if (sha === body) bodyHash += 1;
    else hashMismatch += 1;
  }
}
check('evidence/captures-present', missingCapture === 0, `${captures.size} distinct captures, ${missingCapture} missing from the repo`);
check('evidence/every-sha-rehashes', hashMismatch === 0,
  `${gzHash} sha256 values match the .gz, ${bodyHash} match the decompressed body, ${hashMismatch} match neither`);
check('evidence/every-row-has-provenance',
  candidate.every((r) => r.source?.url && r.source?.retrieved_at && r.source?.sha256 && r.source?.file && r.source?.locator && r.protocol),
  'url, retrieval date, hash, capture file, locator and protocol on all 304 rows');
check('evidence/basis-vocabulary',
  candidate.every((r) => r.basis === 'measured' || r.basis === 'self_reported'),
  `bases: ${[...new Set(candidate.map((r) => r.basis))].sort().join(', ')}`);

// CR-128.2 names one caveat explicitly. It belongs to Terminal-Bench 4.0, which is the board
// whose page states it; Terminal-Bench Science is a separate board and is checked separately below.
const valsFallback = candidate.filter((r) => r.benchmark_id.startsWith('vals-terminal-bench-4-0')
  && r.subject.model_id === 'claude-opus-5.5::max');
const valsFallbackOk = valsFallback.length > 0
  && valsFallback.every((r) => /30 of Opus 5\.5's 198 attempts/.test(r.protocol) && /53\.54%/.test(r.protocol));
check('evidence/vals-198-attempt-caveat', valsFallbackOk,
  `${valsFallback.length} Vals Terminal-Bench 4.0 rows for Opus 5.5 max; ${valsFallback.filter((r) => /198 attempts/.test(r.protocol)).length} carry the fallback note`);

// CR-128.1: only the four target families.
const allowed = new Set(['claude-opus-5.5', 'gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna']);
const families = new Set(candidate.map((r) => String(r.subject.model_id ?? '').split('::')[0]));
check('scope/only-the-four-target-families', [...families].every((f) => allowed.has(f) || f === ''),
  `model families in the packet: ${[...families].sort().join(', ')}`);

// CR-128.1: a normalized locator must say so rather than claim an exact excerpt.
const normalized = candidate.filter((r) => /normalized source fields/.test(r.source.locator));
const exactExcerpt = candidate.filter((r) => /exact source excerpt/.test(r.source.locator));
check('scope/locator-labels-partition', normalized.length + exactExcerpt.length === candidate.length,
  `${exactExcerpt.length} exact-excerpt + ${normalized.length} normalized = ${normalized.length + exactExcerpt.length} of ${candidate.length}`);
check('scope/no-locator-claims-both', candidate.every((r) => !(/normalized source fields/.test(r.source.locator) && /exact source excerpt/.test(r.source.locator))),
  'no locator is labelled normalized and exact at once');

// ---------------------------------------------------------------- CR-128.3: registry and plan
const registry = JSON.parse(fs.readFileSync(path.join(REPO, 'data/raw/benchmarks/registry.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(REPO, 'data/raw/benchmarks/collection-plan.json'), 'utf8'));
const registryIds = new Set((registry.entries ?? []).map((entry) => entry.id));
const planIds = new Set((plan.entries ?? []).map((entry) => entry.benchmark_id));
const usedBenchmarks = [...new Set(candidate.map((r) => r.benchmark_id))];
const missingRegistry = usedBenchmarks.filter((id) => !registryIds.has(id));
// The collection plan drives the automated collectors. CR-128 is a manual snapshot ingest, so a
// row's board only needs a plan entry when it is one an automated collector maintains; what the
// change request requires of every row is a versioned registry identity.
const missingPlan = usedBenchmarks.filter((id) => !planIds.has(id));
check('registry/every-benchmark-id-is-registered', missingRegistry.length === 0,
  `${usedBenchmarks.length} distinct benchmark versions used; missing from registry.json: ${missingRegistry.join(', ') || 'none'}`);
check('registry/plan-coverage-reported', true,
  `${usedBenchmarks.length - missingPlan.length}/${usedBenchmarks.length} used boards also have a collection-plan entry; manual-only: ${missingPlan.join(', ') || 'none'}`);
check('registry/every-id-is-version-pinned', usedBenchmarks.every((id) => id.includes('::')),
  'every row names a versioned registry identity, never a bare family id');

// ---------------------------------------------------------------- CR-128.4 / .5: both live hosts
const byBenchmark = new Map();
for (const row of candidate) {
  if (!byBenchmark.has(row.benchmark_id)) byBenchmark.set(row.benchmark_id, []);
  byBenchmark.get(row.benchmark_id).push(row);
}

async function getJson(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'BenchmarkHeaven-CR128-independent-verify/1.0' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
  return null;
}

const hostResults = [];
for (const host of hosts) {
  const meta = await getJson(`${host}/api/meta`);
  const live = new Map();
  for (const benchmarkId of byBenchmark.keys()) {
    // The collection route caps `limit` at 500 and several AA boards carry more rows than that,
    // so page until `total` is consumed. Reading only the first page silently reports real rows
    // as absent — that is a property of the reader, never of the data.
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
      const query = new URLSearchParams({ benchmark_id: benchmarkId, limit: '500', offset: String(offset) });
      const page = await getJson(`${host}/api/benchmark-scores?${query}`);
      total = page.total ?? 0;
      const returned = page.observations ?? [];
      if (returned.length === 0) break;
      for (const observation of returned) live.set(observation.id, observation);
      offset += returned.length;
    }
  }
  const differences = [];
  let matched = 0;
  for (const want of candidate) {
    const got = live.get(want.id);
    if (!got) { differences.push(`${want.id}: absent from ${want.benchmark_id}`); continue; }
    let rowOk = true;
    for (const k of FIELDS) if (!same(want[k], got[k])) { differences.push(`${want.id}.${k}`); rowOk = false; }
    for (const k of SUBJECT) if (!same(want.subject?.[k], got.subject?.[k])) { differences.push(`${want.id}.subject.${k}`); rowOk = false; }
    for (const k of SOURCE) if (!same(want.source?.[k], got.source?.[k])) { differences.push(`${want.id}.source.${k}`); rowOk = false; }
    if (rowOk) matched += 1;
  }
  hostResults.push({ host, revision: meta?.revision, generated_at: meta?.generated_at, expected: candidate.length, matched, differences });
  check(`live/${host}/all-rows-match`, matched === candidate.length && differences.length === 0,
    `${matched}/${candidate.length} rows identical at revision ${meta?.revision}, ${differences.length} field differences`);
}
check('live/hosts-agree-on-revision',
  new Set(hostResults.map((r) => r.revision)).size === 1,
  hostResults.map((r) => `${r.host} → ${r.revision}`).join('; '));

// ---------------------------------------------------------------- CR-128.5: the reported ranks
// `/api/models` does no sorting — it returns `ds.models` in dataset order and the page sorts client
// side. So a model's index in that array is not its rank, and a release report that takes one is
// stating a dataset position. Rank here is the competition rank: 1 + the number of configurations
// scoring strictly higher, with ties named.
const REPORTED = { 'claude-opus-5.5::max': 1, 'gpt-6-astra::max': 6, 'gpt-6-sol::max': 18, 'gpt-6-luna::max': 61 };
const rankReadings = [];
for (const host of hosts) {
  const list = await getJson(`${host}/api/models?score=composite`);
  const scored = (list.models ?? []).filter((m) => Number.isFinite(m.score));
  const reading = {};
  for (const id of Object.keys(REPORTED)) {
    const row = scored.find((m) => m.id === id);
    if (!row) { reading[id] = null; continue; }
    reading[id] = {
      composite: row.score,
      competition_rank: scored.filter((m) => m.score > row.score).length + 1,
      tied_with: scored.filter((m) => m.score === row.score).length - 1,
      dataset_order_index: (list.models ?? []).findIndex((m) => m.id === id) + 1,
      reported_as: REPORTED[id],
    };
  }
  rankReadings.push({ host, scored: scored.length, reading });
}
// CR-128.5 also asks for Pareto position and cost per task per family. Both are re-derived here from
// each host's own payload, using the site's own frontier definition (lib/pareto.mjs + the value map's
// grace) so the report states the same frontier a reader sees, not a second opinion about it.
const { paretoFrontier } = await import(`${REPO}/lib/pareto.mjs`);
const { frontierGrace } = await import(`${REPO}/lib/value-map.mjs`);
const COST_ID = 'aa-intelligence-index-cost-per-task::4.3.2';
for (const reading of rankReadings) {
  const list = await getJson(`${reading.host}/api/models?score=composite`);
  const priced = (list.models ?? []).filter((m) => Number.isFinite(m.score) && Number.isFinite(m.cost_blended_10to1))
    .map((m) => ({ id: m.id, x: m.cost_blended_10to1, y: m.score }));
  const grace = frontierGrace(priced.map((p) => p.y));
  const frontier = paretoFrontier(priced, { grace }).map((p) => p.id);
  reading.frontier_size = frontier.length;
  for (const id of Object.keys(REPORTED)) {
    if (!reading.reading[id]) continue;
    const detail = await getJson(`${reading.host}/api/models/${encodeURIComponent(id)}`);
    const costRows = (detail.benchmark_observations ?? [])
      .filter((o) => o.benchmark_id === COST_ID && o.basis === 'measured' && o.unit === 'USD/task');
    reading.reading[id].on_frontier = frontier.includes(id);
    reading.reading[id].frontier_position = frontier.indexOf(id) >= 0 ? frontier.indexOf(id) + 1 : null;
    reading.reading[id].aa_cost_per_task_usd = costRows.length === 1 ? costRows[0].value : null;
    reading.reading[id].aa_cost_observation_count = costRows.length;
  }
}
check('report/one-measured-cost-per-task-per-family',
  rankReadings.every((r) => Object.values(r.reading).every((v) => !v || v.aa_cost_observation_count === 1)),
  rankReadings.map((r) => Object.entries(r.reading).map(([id, v]) => `${id}:${v?.aa_cost_observation_count}`).join(' ')).join(' | '));

const [first, ...rest] = rankReadings;
check('rank/hosts-agree', rest.every((r) => JSON.stringify(r.reading) === JSON.stringify(first.reading)),
  `${rankReadings.length} hosts read the same composite ranks`);
const wrong = Object.entries(first.reading).filter(([, v]) => v && v.competition_rank !== v.reported_as);
check('rank/release-report-matches-the-composite-rank', wrong.length === 0,
  wrong.length === 0 ? 'every reported rank is the competition rank'
    : wrong.map(([id, v]) => `${id}: reported #${v.reported_as} (dataset-order index ${v.dataset_order_index}), competition rank #${v.competition_rank}`).join('; '));

// ---------------------------------------------------------------- report
const passed = checks.filter((c) => c.ok).length;
const receipt = {
  verifier: 'ops/ux-2026-09-12/bin/verify-cr-128.mjs',
  engine: 'claude-opus (not the CR-128 implementer)',
  verified_at: new Date().toISOString(),
  candidate_rows: candidate.length,
  hosts: hostResults,
  ranks: rankReadings,
  checks,
  passed,
  total: checks.length,
};
fs.writeFileSync(path.join(outDir, 'verify-cr-128.json'), `${JSON.stringify(receipt, null, 2)}\n`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id}  — ${c.detail}`);
console.log(`\n${passed}/${checks.length} checks passed`);
process.exit(passed === checks.length ? 0 : 1);
