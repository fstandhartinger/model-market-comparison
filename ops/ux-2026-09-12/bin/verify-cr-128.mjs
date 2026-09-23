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

const candidateAll = JSON.parse(fs.readFileSync(CANDIDATE, 'utf8'));
// D180 (2026-09-23): a candidate row that was later withdrawn must be *absent* from the hosts, not
// present. The withdrawal is a recorded decision in the repository, with the row's evidence and its
// reason kept beside it, so this verifier reads it from there rather than from a list of ids here.
const withdrawn = new Map((JSON.parse(fs.readFileSync('data/raw/benchmarks/manual-board-observations.json', 'utf8'))
  .withdrawn_observations ?? []).map((row) => [row.id, row]));
const candidate = candidateAll.filter((row) => !withdrawn.has(row.id));
check('withdrawn/every-withdrawn-row-states-its-reason', [...withdrawn.values()].every((row) => typeof row.withdrawn_reason === 'string' && row.withdrawn_reason.length > 40),
  `${withdrawn.size} withdrawn candidate row(s): ${[...withdrawn.keys()].join(', ') || 'none'}`);
// The packet is what the ingest job froze and does not change; `candidate` is what is still meant
// to be published, so the two counts are asserted separately.
check('candidate/304-rows', candidateAll.length === 304, `${candidateAll.length} rows in the candidate packet, ${candidate.length} still published`);
check('candidate/unique-ids', new Set(candidateAll.map((r) => r.id)).size === candidateAll.length, 'every candidate id is distinct');

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
  const stillLive = [...withdrawn.keys()].filter((id) => live.has(id));
  hostResults.push({ host, revision: meta?.revision, generated_at: meta?.generated_at, expected: candidate.length, matched, differences, withdrawn_still_live: stillLive });
  check(`live/${host}/all-rows-match`, matched === candidate.length && differences.length === 0,
    `${matched}/${candidate.length} published rows identical at revision ${meta?.revision}, ${differences.length} field differences`);
  check(`live/${host}/withdrawn-rows-are-gone`, stillLive.length === 0,
    `${withdrawn.size} withdrawn row(s), ${stillLive.length} still served${stillLive.length ? `: ${stillLive.join(', ')}` : ''}`);
}
check('live/hosts-agree-on-revision',
  new Set(hostResults.map((r) => r.revision)).size === 1,
  hostResults.map((r) => `${r.host} → ${r.revision}`).join('; '));

// ---------------------------------------------------------------- CR-128.5: the reported ranks
// The target is a report on disk, read as a table — never a copy of its numbers written here. An
// earlier form of this file pinned `{opus: 1, astra: 6, sol: 18, luna: 61}`, which is the defect's
// own wrong quartet: a verifier that carries the number it is meant to catch goes green the day the
// report is fixed *and* the day someone edits the pin.
//
// Rank is re-derived from the dataset each report names, never from today's: ranks move daily, and a
// rank read a day later can neither convict nor acquit a report. `/api/models?score=composite` is the
// site's default composite — the CR-74.4 Benchmaxxing penalty included — so the replay goes through
// the same path the route does (clientData + the family signal map), and `rank/replay-reproduces-this-host`
// proves the replay against the live payload before it is trusted against any report.
const CORRECTION = '/opt/benchmarkheaven/state/ux-evidence/iter182-cr128-5/cr128-5-rank-correction.txt';
// CR-128's own report, and the sibling frontier report whose numbers the same job produced. Both are
// checked: the rank column is the same kind of claim in both, and only one of them was ever read.
const REPORTS = [
  { id: 'cr128', path: '/home/flori/jobs/bh-thirdparty-ingest-20260922/RESULT.md', heading: '## Final live metrics', labelCol: 0, rankCol: 3, compositeCol: 1 },
  { id: 'frontier', path: '/home/flori/jobs/bh-frontier-update-20260922/RESULT.md', heading: '**Composite ranking:**', labelCol: 1, rankCol: 0, compositeCol: 2 },
];

const { execFileSync } = await import('node:child_process');
const { clientData } = await import(`${REPO}/lib/client-model.ts`);
const { buildBenchmarkView } = await import(`${REPO}/lib/benchmark-view.mjs`);
const { benchmaxxingFamilySignals } = await import(`${REPO}/lib/benchmax.mjs`);

// The site's default Composite over an arbitrary dataset, as `/api/models?score=composite` returns it.
const rankerFor = (ds) => {
  const view = buildBenchmarkView(ds);
  const familyOf = new Map(view.models.map((m) => [m.id, m.family ?? m.id]));
  const byFamily = new Map(benchmaxxingFamilySignals(view).reports.map(([id, r]) => [familyOf.get(id) ?? id, r.score ?? null]));
  const signals = new Map(ds.models.map((m) => [m.id, byFamily.get(m.family_key) ?? null]));
  const rows = clientData(ds, {}, signals).models.map((m) => ({ id: m.id, score: m.scores.composite ?? 50 }));
  const scored = rows.filter((r) => Number.isFinite(r.score));
  return {
    of: scored.length,
    at: (id) => {
      const me = scored.find((r) => r.id === id);
      return me && {
        score: me.score,
        rank: scored.filter((r) => r.score > me.score).length + 1,
        tied: scored.filter((r) => r.score === me.score).length - 1,
        position: rows.findIndex((r) => r.id === id) + 1,
        of: scored.length,
      };
    },
  };
};
const datasetAt = (sha) => JSON.parse(execFileSync('bash', ['-c', `git show ${sha}:data/dataset.json`],
  { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 }));
// A report states either the revision it verified or the dataset stamp it read; both resolve to a commit.
const commitForStamp = (stamp) => {
  const log = execFileSync('git', ['log', '--format=%H', '--since', '2026-09-15', '--', 'data/dataset.json'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 22 }).trim().split('\n').filter(Boolean);
  for (const sha of log) {
    // `generated_at` sits ~9 MB from the end of a 42 MB dataset; the report drops the milliseconds.
    const tail = execFileSync('bash', ['-c', `git show ${sha}:data/dataset.json | tail -c 20000000`],
      { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
    if (tail.includes(`"generated_at": "${stamp.replace(/Z$/, '')}`)) return sha;
  }
  return null;
};

// One live reading per host, used for the frontier/cost half and to resolve a report's labels.
const rankReadings = [];
for (const host of hosts) {
  const list = await getJson(`${host}/api/models?score=composite`);
  rankReadings.push({ host, models: list.models ?? [], scored: (list.models ?? []).filter((m) => Number.isFinite(m.score)).length, reading: {} });
}
// "Sol max" matches GPT-6 Sol and GPT-5.6 Sol alike, so the report's own Composite decides between
// them: a label resolves only when exactly one configuration of that name also carries the value the
// report prints beside it. A moved score leaves the label unresolved rather than guessed at.
const resolveLabel = (label, composite) => {
  const all = rankReadings[0]?.models ?? [];
  const words = String(label).toLowerCase().split(/\s+/).filter(Boolean);
  const variant = words.at(-1);
  const named = all.filter((m) => String(m.variant ?? '').toLowerCase() === variant
    && words.slice(0, -1).every((w) => `${m.family_name ?? ''} ${m.display_name ?? ''}`.toLowerCase().includes(w)));
  if (named.length === 1) return named[0].id;
  const byValue = named.filter((m) => Number.isFinite(m.score) && Math.abs(m.score - composite) < 0.05);
  return byValue.length === 1 ? byValue[0].id : null;
};

// The replay is worth nothing unless it reproduces a host this verifier can see for itself.
const today = rankerFor(JSON.parse(fs.readFileSync(path.join(REPO, 'data/dataset.json'), 'utf8')));
const liveScored = rankReadings[0].models.filter((m) => Number.isFinite(m.score));
const replayDrift = liveScored.filter((m) => m.id.endsWith('::max') || m.id.endsWith('::high'))
  .slice(0, 40)
  .filter((m) => today.at(m.id)?.rank !== liveScored.filter((x) => x.score > m.score).length + 1);
check('rank/replay-reproduces-this-host', replayDrift.length === 0,
  replayDrift.length === 0 ? `${rankReadings[0].host}: 40 sampled configurations rank the same in the replay of data/dataset.json`
    : replayDrift.slice(0, 3).map((m) => `${m.id}: live #${liveScored.filter((x) => x.score > m.score).length + 1}, replay #${today.at(m.id)?.rank}`).join('; '));

const reportFindings = [];
for (const spec of REPORTS) {
  const text = fs.existsSync(spec.path) ? fs.readFileSync(spec.path, 'utf8') : '';
  check(`rank/${spec.id}/report-is-on-disk`, text.length > 0, spec.path);
  if (!text) continue;
  // The table is read as a table: the rows after its heading, up to the first line that is not a
  // table row, so a second table in the same file cannot be mistaken for it.
  const rows = [];
  for (const line of (text.split(spec.heading)[1] ?? '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) { if (rows.length) break; continue; }
    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
    const rank = cells[spec.rankCol]?.match(/^#(\d+)$/)?.[1];
    const composite = Number(cells[spec.compositeCol]);
    if (rank && Number.isFinite(composite)) rows.push({ reported_rank: Number(rank), label: cells[spec.labelCol], composite });
  }
  // The dataset the report itself names: a verification revision, else a `generated_at` stamp.
  const sha = text.match(/verification revision:\*\*\s*`([0-9a-f]{40})`/)?.[1]
    ?? (text.match(/dataset\s+(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/)?.[1] ? commitForStamp(text.match(/dataset\s+(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/)[1]) : null);
  check(`rank/${spec.id}/report-table-and-dataset-found`, rows.length >= 4 && !!sha,
    `${rows.length} ranked rows against ${sha?.slice(0, 8) ?? 'no dataset'}; ${rows.map((r) => `#${r.reported_rank} ${r.label} ${r.composite}`).join(' | ')}`);
  if (!rows.length || !sha) continue;
  const ranker = rankerFor(datasetAt(sha));
  const resolved = rows.map((r) => ({ ...r, id: resolveLabel(r.label, r.composite), }))
    .map((r) => ({ ...r, truth: r.id ? ranker.at(r.id) : null }));
  check(`rank/${spec.id}/labels-resolve-to-one-configuration-each`, resolved.every((r) => r.truth),
    resolved.map((r) => `${r.label}→${r.id ?? 'UNRESOLVED'}`).join(', '));
  const off = resolved.filter((r) => !r.truth || r.truth.rank !== r.reported_rank);
  // An unresolved row counts as a miss: a rank nobody could attach to a configuration is not a checked
  // rank. Each miss names the model's position in the unsorted payload beside the true rank, because the
  // two failure modes need different repairs: a dataset position reported as a rank, or a miscount.
  check(`rank/${spec.id}/report-matches-its-own-dataset`, off.length === 0,
    off.length === 0 ? `all ${resolved.length} reported ranks are the competition rank of ${sha.slice(0, 8)} (${ranker.of} scored)`
      : off.map((r) => !r.truth ? `${r.label}: unresolved` : `${r.label}: report #${r.reported_rank}, competition rank #${r.truth.rank} of ${r.truth.of}${r.truth.tied ? ` (tied with ${r.truth.tied})` : ''}, dataset position ${r.truth.position}`).join('; '));
  reportFindings.push({ report: spec.path, dataset_commit: sha, scored: ranker.of, rows: resolved });
}
// The correction of record has to state the same numbers this replay derives, or it is not a record.
const correction = fs.existsSync(CORRECTION) ? fs.readFileSync(CORRECTION, 'utf8') : '';
const stated = reportFindings.flatMap((f) => f.rows.filter((r) => r.truth).map((r) => ({ id: r.id, rank: `#${r.truth.rank}` })));
const missing = stated.filter(({ id, rank }) => !correction.split('\n').some((l) => l.includes(id) && l.includes(rank)));
check('rank/correction-of-record-states-the-derived-ranks', correction.length > 0 && missing.length === 0,
  correction.length === 0 ? `${CORRECTION} is missing`
    : missing.length ? `not stated: ${missing.map((m) => `${m.id} ${m.rank}`).join(', ')}`
      : `${stated.length} derived ranks stated in ${CORRECTION}`);

// CR-128.5 also asks for Pareto position and cost per task per family. Both are re-derived here from
// each host's own payload, using the site's own frontier definition (lib/pareto.mjs + the value map's
// grace) so the report states the same frontier a reader sees, not a second opinion about it.
const { paretoFrontier } = await import(`${REPO}/lib/pareto.mjs`);
const { frontierGrace } = await import(`${REPO}/lib/value-map.mjs`);
const COST_ID = 'aa-intelligence-index-cost-per-task::4.3.2';
const subjects = [...new Set(reportFindings.flatMap((f) => f.rows.map((r) => r.id)).filter(Boolean))];
for (const reading of rankReadings) {
  const priced = reading.models.filter((m) => Number.isFinite(m.score) && Number.isFinite(m.cost_blended_10to1))
    .map((m) => ({ id: m.id, x: m.cost_blended_10to1, y: m.score }));
  const grace = frontierGrace(priced.map((p) => p.y));
  const frontier = paretoFrontier(priced, { grace }).map((p) => p.id);
  reading.frontier_size = frontier.length;
  const scored = reading.models.filter((m) => Number.isFinite(m.score));
  for (const id of subjects) {
    const live = scored.find((m) => m.id === id);
    if (!live) { reading.reading[id] = null; continue; }
    const detail = await getJson(`${reading.host}/api/models/${encodeURIComponent(id)}`);
    const costRows = (detail.benchmark_observations ?? [])
      .filter((o) => o.benchmark_id === COST_ID && o.basis === 'measured' && o.unit === 'USD/task');
    reading.reading[id] = {
      composite: live.score,
      competition_rank: scored.filter((m) => m.score > live.score).length + 1,
      tied_with: scored.filter((m) => m.score === live.score).length - 1,
      dataset_order_index: reading.models.findIndex((m) => m.id === id) + 1,
      on_frontier: frontier.includes(id),
      frontier_position: frontier.indexOf(id) >= 0 ? frontier.indexOf(id) + 1 : null,
      aa_cost_per_task_usd: costRows.length === 1 ? costRows[0].value : null,
      aa_cost_observation_count: costRows.length,
    };
  }
  delete reading.models;
}
check('report/one-measured-cost-per-task-per-family',
  rankReadings.every((r) => Object.values(r.reading).every((v) => v && v.aa_cost_observation_count === 1)),
  rankReadings.map((r) => Object.entries(r.reading).map(([id, v]) => `${id}:${v?.aa_cost_observation_count}`).join(' ')).join(' | '));

const [first, ...rest] = rankReadings;
check('rank/hosts-agree', rest.every((r) => JSON.stringify(r.reading) === JSON.stringify(first.reading)),
  `${rankReadings.length} hosts read the same composite ranks`);

// ---------------------------------------------------------------- report
const passed = checks.filter((c) => c.ok).length;
const receipt = {
  verifier: 'ops/ux-2026-09-12/bin/verify-cr-128.mjs',
  engine: 'claude-opus (not the CR-128 implementer)',
  verified_at: new Date().toISOString(),
  candidate_rows: candidate.length,
  hosts: hostResults,
  ranks: rankReadings,
  report_rank_findings: reportFindings,
  checks,
  passed,
  total: checks.length,
};
fs.writeFileSync(path.join(outDir, 'verify-cr-128.json'), `${JSON.stringify(receipt, null, 2)}\n`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id}  — ${c.detail}`);
console.log(`\n${passed}/${checks.length} checks passed`);
process.exit(passed === checks.length ? 0 : 1);
