// One-off, reproducible: adds FrontierCode 1.1 Main (E2 "FrontierBench") to registry.json and collection-plan.json.
// Wording is quoted from the captured page (f2f055237ae1ea2192dc.gz) and the rendered leaderboard legend
// ("Score: a weighted aggregate of the rubric items…", "Cost ($): the mean USD spend per rollout.").
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const dir = 'data/raw/benchmarks/daily-evidence/2026-09-13-frontiercode';
const receipts = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'));
const data = receipts.find((r) => r.url.endsWith('/data.json')), page = receipts.find((r) => r.url.endsWith('/frontiercode'));
const robots = `${dir}/cognition.com-robots.txt`;
const fileSha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const pageUrl = 'https://cognition.com/frontiercode';

const recipeCommand = 'python3 scripts/capture-benchmark-sources.py ops/ux-2026-09-12/research/frontiercode-url-list.json data/raw/benchmarks/daily-evidence/<ISO-date>; python3 scripts/collect-public-benchmarks.py --plan CANDIDATE_PLAN.json CANDIDATE.json';
const guard = 'Require data.json key v1_1 with subsets.main == 100 and the page text "FrontierCode 1.1". FrontierCode 1.0 (before unfair-internet-use zeroing) and the Extended subset are different identities.';
const notes = 'The leaderboard page loads its own https://cognition.com/data/frontiercode-leaderboard/data.json (E3 step 4: the page\'s own request, fetched directly once); robots.txt allows everything except /downloads/. Rows are model × published reasoning effort; the harness is the source\'s per-model harness. Cognition runs the board and ships its own SWE models, so every row is self_reported and needs a different-family critic review.';
const evidence = (excerpt) => [
  { url: data.url, file: data.file, sha256: fileSha(data.file), fetched_at: data.retrieved_at, excerpt },
  { url: pageUrl, file: page.file, sha256: fileSha(page.file), fetched_at: page.retrieved_at, excerpt: 'FrontierCode 1.1 — "Current revision. Runs flagged for unfair internet use are zeroed." Methodology: mergeability of maintainer-crafted tasks graded with unit tests, rubrics and verifiers.' },
  { url: 'https://cognition.com/robots.txt', file: robots, sha256: fileSha(robots), fetched_at: page.retrieved_at, excerpt: 'Allow: / ; Disallow: /downloads/ — the leaderboard page and its data file are permitted.' },
];
const common = {
  version: '1.1', version_status: 'published', maintainer: 'Cognition', source_type: 'official_leaderboard', primary_url: pageUrl,
  publication_urls: [{ url: pageUrl, type: 'official_leaderboard', role: 'FrontierCode leaderboard, methodology and revision notes' },
    { url: data.url, type: 'official_leaderboard', role: "The page's own leaderboard data file" }],
  update_cadence: { source_schedule: 'Changelog on the page; models added irregularly (latest entry Sep 10, 2026).', check_recommendation: 'Daily, at most one capture per source; stop on access restrictions.' },
  saturated: { value: false, note: 'No verified saturation claim; retained without asserting headroom.' },
  superseded_by: null, status: 'active', first_seen: '2026-09-13', last_verified: '2026-09-13',
};
const parser = (field, scale) => ({ kind: 'effort_runs_json', row_path: 'v1_1', subset: 'main', require: { 'subsets.main': 100 },
  name_field: 'name', value_field: field, id_field: 'id', harness_field: 'harness', plain_text_names: true, ...(scale ? { scale } : {}),
  context_keys: ['new_score', 'correct', 'flagged_rate', 'cost', 'tokens'],
  method_source: { url: pageUrl, file: page.file, sha256: page.sha256, retrieved_at: page.retrieved_at } });
const plan = (id, field, scale, protocol, reason, locator) => ({
  benchmark_id: id, parser: parser(field, scale), status: 'collected', reason,
  recipe: { command: recipeCommand, format: "JSON data file requested by the leaderboard page", locator, version_guard: guard, notes },
  cadence: 'daily, at most one capture per source; stop on access restrictions', version_guard: guard,
  source: { url: data.url, file: data.file, sha256: data.sha256, retrieved_at: data.retrieved_at },
  protocol, basis: 'self_reported', minimum_rows: 98, source_urls: [pageUrl, data.url],
});

const registry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8'));
const collection = JSON.parse(readFileSync('data/raw/benchmarks/collection-plan.json', 'utf8'));
const add = (entry, planned) => {
  if (registry.entries.some((e) => e.id === entry.id) || collection.entries.some((e) => e.benchmark_id === entry.id)) throw new Error(`duplicate ${entry.id}`);
  registry.entries.push(entry); collection.entries.push(planned);
};
const scoreLocator = 'v1_1.data[model][effort].main.new_score (fraction; the rendered leaderboard shows it ×100 as "Score")';
add({ id: 'frontiercode::1.1', name: 'FrontierCode 1.1 Main (Cognition)', family: 'frontiercode', ...common, category: 'Coding',
  one_sentence_description: 'Whether a maintainer would merge the agent\'s pull request, on tasks crafted by open-source maintainers and graded with tests, rubrics and verifiers.',
  scoring: { metric: 'Score: weighted aggregate of the rubric items; solutions failing blocking criteria receive 0', unit: 'percent', range: [0, 100], higher_better: true,
    notes: 'Source publishes a fraction; stored ×100 as a derived value (source basis self_reported). Main subset, 100 tasks. Runs flagged for unfair internet use are zeroed in 1.1. Secondary benchmark, not a Composite input.' },
  how_to_collect: { command: recipeCommand, format: 'JSON data file requested by the leaderboard page', identity_policy: 'source_label', locator: scoreLocator, version_guard: guard, notes },
  evidence: evidence('data.json v1_1: 36 models, 98 model × effort runs on the 100-task Main subset, each with new_score, correct, flagged_rate, cost and tokens.') },
plan('frontiercode::1.1', 'new_score', 100, 'FrontierCode 1.1 Main (100 tasks); Score = weighted aggregate of rubric items, blocking-criteria failures receive 0, unfair internet use zeroed; one row per model and published reasoning effort with the source harness.',
  'Cognition publishes the board and its own SWE models; values are self_reported, multiplied by 100 from the published fraction; never a Composite input.', scoreLocator));
const costLocator = 'v1_1.data[model][effort].main.cost (the rendered leaderboard: "Cost ($): the mean USD spend per rollout")';
add({ id: 'frontiercode-cost::1.1', name: 'FrontierCode 1.1 Main cost per rollout (Cognition)', family: 'frontiercode-cost', ...common, category: 'Efficiency',
  one_sentence_description: "Cognition's published mean USD spend per rollout for each FrontierCode 1.1 Main model and reasoning effort.",
  scoring: { metric: 'Cost per rollout', unit: 'USD', range: [0, null], higher_better: false,
    notes: 'Separate published metric, not a capability score and not a Composite input; the changelog notes pricing corrections (e.g. Sep 10, 2026).' },
  how_to_collect: { command: recipeCommand, format: 'JSON data file requested by the leaderboard page', identity_policy: 'source_label', locator: costLocator, version_guard: guard, notes },
  evidence: evidence('data.json v1_1 Main: every model × effort run carries cost, the mean USD spend per rollout.') },
plan('frontiercode-cost::1.1', 'cost', null, 'FrontierCode 1.1 Main (100 tasks); mean USD spend per rollout per model and published reasoning effort; score, pass rate, flag rate and tokens retained as context.',
  'Cognition publishes a USD cost per rollout next to the score; self_reported, not a score and never a Composite input.', costLocator));

writeFileSync('data/raw/benchmarks/registry.json', JSON.stringify(registry, null, 2) + '\n');
writeFileSync('data/raw/benchmarks/collection-plan.json', JSON.stringify(collection, null, 2) + '\n');
console.log(`registry ${registry.entries.length}, plan ${collection.entries.length}`);
