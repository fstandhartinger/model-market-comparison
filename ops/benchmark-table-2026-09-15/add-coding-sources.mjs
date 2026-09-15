#!/usr/bin/env node
// 2026-09-15: registers the measured coding sources chosen by the source research
// (/home/flori/benchmarkheaven-benchmark-table-cost-modal-20260915/coding-research/FINDINGS.md):
// DeepSWE (Datacurve, republished by Epoch AI under CC-BY 4.0) and Scale AI's three SWE Atlas boards.
// Idempotent: replaces its own registry and collection-plan entries; digests come from the committed files.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const DIR = 'data/raw/benchmarks/daily-evidence/2026-09-15-coding';
const raw = (f) => { const b = readFileSync(`${DIR}/${f}`); return f.endsWith('.gz') ? gunzipSync(b) : b; };
const sha = (f) => createHash('sha256').update(raw(f)).digest('hex');
// Registry evidence digests cover the stored file bytes (validate-benchmark-registry.mjs); plan sources cover the decompressed content.
const fileSha = (f) => createHash("sha256").update(readFileSync(`${DIR}/${f}`)).digest("hex");
const DAY = '2026-09-15';
const CAPTURE = 'python3 scripts/capture-benchmark-sources.py URL_LIST.json data/raw/benchmarks/daily-evidence/<ISO-date>-coding; review protocol; python3 scripts/collect-public-benchmarks.py --plan CANDIDATE_PLAN.json CANDIDATE.json; node ops/benchmark-table-2026-09-15/build-identity-map.mjs (review the diff)';
const cadence = { source_schedule: 'Models added irregularly by the maintainer.', check_recommendation: 'Daily, at most one capture per source; stop on access restrictions.' };
const saturated = { value: false, note: 'No verified saturation claim; retained without asserting headroom.' };
const robots = (host, file, at) => ({ url: `https://${host}/robots.txt`, file: `${DIR}/${file}`, sha256: fileSha(file), fetched_at: at,
  excerpt: host === 'epoch.ai' ? 'User-agent: * — /data/ is not disallowed (only /assets/, /inspect-viewer/ and FrontierMath problems).' : 'User-Agent: * Allow: / — /leaderboard/ pages are permitted (Disallow: /api/, /studio, /draft/, /maintenance).' });

const deepHeader = 'Model version,Pass@1,Pass@4,Harness,Reasoning effort,Release date,Organization,Country,Training compute (FLOP),Training compute notes,Name,95% CI half-width,Runs,Mean cost (USD),Mean output tokens,Mean agent steps,Source,Notes'.split(',');
const deepGuard = 'Exact CSV header, every row Harness = mini-swe-agent, and Epoch benchmark_metadata.csv still maps DeepSWE to deepswe_external.csv / Pass@1 / release 2026-05-26. The CSV carries no DeepSWE version, so this identity is dated: a changed DeepSWE task set or version needs a new identity after manual review of the DeepSWE changelog (the DeepSWE site blocks AI crawlers and is never collected automatically).';
const deepswe = {
  entry: {
    id: `deepswe::snapshot-${DAY}`, name: 'DeepSWE (Datacurve, via Epoch AI)', family: 'deepswe', version: `snapshot-${DAY}`, version_status: 'snapshot',
    maintainer: 'Datacurve', source_type: 'official_leaderboard', primary_url: 'https://deepswe.datacurve.ai/',
    publication_urls: [
      { url: 'https://deepswe.datacurve.ai/', type: 'official_leaderboard', role: 'DeepSWE leaderboard and methodology (reference only; robots.txt blocks AI crawlers, never collected)' },
      { url: 'https://epoch.ai/data/benchmark_data.zip', type: 'official_leaderboard', role: 'Epoch AI Benchmarking Hub archive (CC-BY 4.0), member deepswe_external.csv' },
    ],
    update_cadence: cadence, saturated, superseded_by: null, status: 'active', first_seen: DAY, last_verified: DAY, category: 'Coding',
    one_sentence_description: 'Pass rate of coding agents on original, long-horizon software engineering tasks, run by Datacurve with the mini-swe-agent harness.',
    scoring: { metric: 'Pass@1: mean pass rate over the published runs', unit: 'fraction', range: [0, 1], higher_better: true,
      notes: 'Independently run by Datacurve and republished by Epoch AI; Pass@4, run count and 95% CI half-width stay in the protocol. Epoch’s cost column is not used. An input to the AA Coding Agent Index v1.5, which runs its own copy; these are the maintainer’s results. Secondary benchmark, never a Composite input.' },
    how_to_collect: { command: `curl --fail -A 'BenchmarkHeavenResearch/1.0' https://epoch.ai/data/benchmark_data.zip -o benchmark_data.zip && unzip -p benchmark_data.zip deepswe_external.csv | gzip -n > data/raw/benchmarks/daily-evidence/<ISO-date>-coding/epoch-deepswe_external.csv.gz; ${CAPTURE}`,
      format: 'CSV member of a ZIP archive', locator: 'deepswe_external.csv: one row per Model version (<model>_<effort>); value Pass@1; Harness; Reasoning effort', version_guard: deepGuard,
      notes: 'Manual snapshot, not part of the automatic daily refresh: Epoch publishes only a multi-benchmark ZIP (2.3 MB, changing with every Epoch update), the CSV has no DeepSWE version, and the maintainer site blocks AI crawlers. Refresh by hand with this recipe after checking the DeepSWE changelog, then rerun build-identity-map.mjs. CC-BY 4.0: attribute Epoch AI and Datacurve. Model labels are not catalog names; exact joins come from data/raw/benchmarks/identity-map.json (lib/coding-identity.mjs rules).' },
    evidence: [
      { url: 'https://epoch.ai/data/benchmark_data.zip', file: `${DIR}/epoch-deepswe_external.csv.gz`, sha256: fileSha('epoch-deepswe_external.csv.gz'), fetched_at: '2026-09-15T09:05:24Z',
        excerpt: 'Member deepswe_external.csv of the archive (archive sha256 dc62c58b4e8bf16994088528fbc52b1fb7504e40603c77e5c5d4abf7ee364b56, fetched 2026-09-15T09:01:10Z); every row Harness mini-swe-agent, Source https://deepswe.datacurve.ai/.' },
      { url: 'https://epoch.ai/data/benchmark_data.zip', file: `${DIR}/epoch-benchmark_metadata.csv.gz`, sha256: fileSha('epoch-benchmark_metadata.csv.gz'), fetched_at: '2026-09-15T08:22:04Z',
        excerpt: 'benchmark_metadata.csv: "DeepSWE,True,deepswe_external.csv,Pass@1,1.0,0.0,1.0,2026-05-26".' },
      robots('epoch.ai', 'epoch.ai-robots.txt', '2026-09-15T09:17:52Z'),
    ],
  },
  plan: {
    benchmark_id: `deepswe::snapshot-${DAY}`,
    refresh: 'manual',
    parser: { kind: 'csv', require_header: deepHeader, require_values: { Harness: 'mini-swe-agent' }, name_field: 'Name', value_field: 'Pass@1', id_field: 'Model version', harness_field: 'Harness', plain_text_names: true, context_fields: ['Reasoning effort', 'Runs', 'Pass@4', '95% CI half-width'] },
    status: 'collected', reason: 'Datacurve runs DeepSWE itself (measured); Epoch AI republishes the rows under CC-BY 4.0. Rows are model × published reasoning effort.',
    recipe: null, cadence: 'daily, at most one capture per source; stop on access restrictions', version_guard: deepGuard,
    source: { url: 'https://epoch.ai/data/benchmark_data.zip', file: `${DIR}/epoch-deepswe_external.csv.gz`, sha256: sha('epoch-deepswe_external.csv.gz'), retrieved_at: '2026-09-15T09:05:24Z' },
    protocol: 'DeepSWE as republished by Epoch AI (deepswe_external.csv); Pass@1 averaged over runs; mini-swe-agent harness', basis: 'measured', minimum_rows: 60,
    source_urls: ['https://epoch.ai/data/benchmark_data.zip'],
  },
};
deepswe.plan.recipe = { command: deepswe.entry.how_to_collect.command, format: deepswe.entry.how_to_collect.format, locator: deepswe.entry.how_to_collect.locator, version_guard: deepGuard, notes: deepswe.entry.how_to_collect.notes };

const scaleBoards = [
  { key: 'swe-atlas-qna', slug: 'sweatlas-qna', file: 'scale-sweatlas-qna.html.gz', at: '2026-09-15T09:04:05Z', title: '<title>Scale Labs Leaderboard: SWE Atlas - Codebase QnA</title>', min: 20,
    name: 'SWE Atlas Codebase QnA (Scale AI)', desc: 'How well a coding agent answers deep questions about a real codebase, graded against expert rubrics.',
    extra: 'An input to the AA Coding Agent Index v1.5, which runs its own copy with a different harness and judge; these are Scale’s results.' },
  { key: 'swe-atlas-test-writing', slug: 'sweatlas-tw', file: 'scale-sweatlas-tw.html.gz', at: '2026-09-15T09:04:01Z', title: '<title>SWE Atlas - Test Writing</title>', min: 20,
    name: 'SWE Atlas Test Writing (Scale AI)', desc: 'Whether a coding agent writes production-grade tests for real repositories, graded with rubrics and LLM judges.', extra: '' },
  { key: 'swe-atlas-refactoring', slug: 'sweatlas-refactoring', file: 'scale-sweatlas-refactoring.html.gz', at: '2026-09-15T09:04:03Z', title: '<title>SWE Atlas - Refactoring</title>', min: 15,
    name: 'SWE Atlas Refactoring (Scale AI)', desc: 'Whether a coding agent restructures production code while preserving its behaviour, graded by tests and rubrics.', extra: '' },
];
const scale = scaleBoards.map((b) => {
  const url = `https://labs.scale.com/leaderboard/${b.slug}`, id = `${b.key}::snapshot-${DAY}`;
  const guard = `Page title ${b.title.replace(/<\/?title>/g, '"')} and exactly one embedded entries array with model and score. No public version: this identity freezes the ${DAY} snapshot (page note "Update July 28, 2026": mini-swe-agent step limit 250 → 500 for newer models). A changed task set, judge or metric needs a new identity.`;
  const how = { command: CAPTURE, format: 'HTML with embedded Next.js flight data', locator: 'entries[] (model, score, confidenceInterval_upper, createdAt, contaminationMessage) — the "Performance Comparison" table', version_guard: guard,
    notes: 'Scale states "We ran a suite of frontier closed and open coding models" (measured). The harness is part of each model label; rows marked * had refusals scored as 0 by Scale. Scale publishes no data licence: only scores with attribution are stored. Exact joins come from data/raw/benchmarks/identity-map.json.' };
  return {
    entry: { id, name: b.name, family: b.key, version: `snapshot-${DAY}`, version_status: 'snapshot', maintainer: 'Scale AI', source_type: 'official_leaderboard', primary_url: url,
      publication_urls: [{ url, type: 'official_leaderboard', role: 'Scale Labs leaderboard, methodology and update notes' }],
      update_cadence: cadence, saturated, superseded_by: null, status: 'active', first_seen: DAY, last_verified: DAY, category: 'Coding', one_sentence_description: b.desc,
      scoring: { metric: 'Leaderboard score (percent); ± is the published confidence half-width', unit: 'percent', range: [0, 100], higher_better: true,
        notes: `Run by Scale AI with the harness named in each label (Claude Code, Codex, Mini-SWE-Agent, Gemini CLI). ${b.extra} Secondary benchmark, never a Composite input.`.replace(/\s+/g, ' ').trim() },
      how_to_collect: how,
      evidence: [
        { url, file: `${DIR}/${b.file}`, sha256: fileSha(b.file), fetched_at: b.at, excerpt: `${b.title.replace(/<\/?title>/g, '')}: "We ran a suite of frontier closed and open coding models on the dataset"; Performance Comparison entries with score ± CI.` },
        robots('labs.scale.com', 'labs.scale.com-robots.txt', '2026-09-15T09:17:52Z'),
      ] },
    plan: { benchmark_id: id, parser: { kind: 'scale_swepro', require_text: b.title, name_field: 'model', value_field: 'score', context_fields: ['confidenceInterval_upper', 'createdAt', 'contaminationMessage'] },
      status: 'collected', reason: 'Scale AI runs every listed configuration itself (measured); the label keeps harness, effort and the refusal asterisk.',
      recipe: { command: how.command, format: how.format, locator: how.locator, version_guard: guard, notes: how.notes }, cadence: 'daily, at most one capture per source; stop on access restrictions', version_guard: guard,
      source: { url, file: `${DIR}/${b.file}`, sha256: sha(b.file), retrieved_at: b.at },
      protocol: `${b.name}, ${DAY} snapshot; harness and effort as stated in the source label; * = refusals scored 0 by the source`, basis: 'measured', minimum_rows: b.min, source_urls: [url] },
  };
});

const all = [deepswe, ...scale];
const regPath = 'data/raw/benchmarks/registry.json', planPath = 'data/raw/benchmarks/collection-plan.json';
const registry = JSON.parse(readFileSync(regPath)), plan = JSON.parse(readFileSync(planPath));
const ids = new Set(all.map((x) => x.entry.id));
registry.entries = [...registry.entries.filter((e) => !ids.has(e.id)), ...all.map((x) => x.entry)];
plan.entries = [...plan.entries.filter((e) => !ids.has(e.benchmark_id)), ...all.map((x) => x.plan)];
writeFileSync(regPath, JSON.stringify(registry, null, 2) + '\n');
writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
console.log(`registered ${[...ids].join(', ')}`);
