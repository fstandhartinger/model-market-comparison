// One-off, reproducible: adds the Vals Index v2 identities (E2) to registry.json and collection-plan.json.
// Every description, weight and caveat below is quoted or condensed from the captured page
// data/raw/benchmarks/daily-evidence/2026-09-13-vals-index/36d323b86dd8c014b0db.gz (updated 2026-09-10).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const dir = 'data/raw/benchmarks/daily-evidence/2026-09-13-vals-index';
const page = `${dir}/36d323b86dd8c014b0db.gz`, robots = `${dir}/www.vals.ai-robots.txt`;
const fileSha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'))[0];
const url = 'https://www.vals.ai/benchmarks/vals_index', fetched = manifest.retrieved_at;

const tasks = [
  ['overall', 'vals-index', 'Vals Index v2 (Vals AI)', 'Agentic', "GDP-weighted average of agentic model performance across finance, coding and legal tasks.", 'Vals Index = (8.0 × Finance + 5.6 × Coding + 1.2 × Legal) / 14.8; each sector averages its component benchmarks.'],
  ['finance_agent', 'vals-index-finance-agent', 'Finance Agent v2 (Vals Index v2)', 'Agentic', 'Multi-step financial reasoning tasks.', 'Finance sector component; the index uses the Finance Agent v2 index subset, averaging three runs per model.'],
  ['emb', 'vals-index-emb', 'Excel Modeling Benchmark (Vals Index v2)', 'Tool-use', 'Building and editing financial models in spreadsheets.', 'Finance sector component; private benchmark.'],
  ['terminal_bench_2_1', 'vals-index-terminal-bench-2.1', 'Terminal-Bench 2.1 (Vals Index v2)', 'Agentic', 'Command-line interface problem solving, as run by Vals AI.', "Coding sector component. Vals' own run: never join with aa-terminal-bench::2.1 or terminal-bench::4.0."],
  ['vibe_code_bench', 'vals-index-vibe-code-bench', 'Vibe Code Bench (Vals Index v2)', 'Coding', 'End-to-end app-building tasks.', 'Coding sector component; private benchmark.'],
  ['code_migration', 'vals-index-code-migration', 'Code Migration (Vals Index v2 subset)', 'Coding', 'Porting projects to another language, including COBOL modernization.', 'Coding sector component. The index scores a fixed subset (50 of 120 CLI tasks plus all 10 COBOL tasks, weighted 75/25), not the full standalone run.'],
  ['legal_research', 'vals-index-legal-research', 'Legal Research Bench (Vals Index v2)', 'Knowledge', 'Case and statute research with citation-backed answers.', 'Legal sector component; private benchmark.'],
  ['legal_agent_benchmark', 'vals-index-hlab', "HLAB — Harvey's Legal Agent Benchmark (Vals Index v2)", 'Agentic', 'Long-horizon legal work product creation.', 'Legal sector component.'],
];

const recipeCommand = 'python3 scripts/capture-benchmark-sources.py ops/ux-2026-09-12/research/vals-index-url-list.json data/raw/benchmarks/daily-evidence/<ISO-date>; python3 scripts/collect-public-benchmarks.py --plan CANDIDATE_PLAN.json CANDIDATE.json';
const locator = (task, field) => `Astro island BenchmarkView props (decoded [type, value] pairs): benchmarkView.tasks.${task}, one entry per model slug; field ${field}. Guard benchmarkView.metadata.version == "2".`;
const notes = 'robots.txt allows the whole site (User-agent: * / Allow: /). One page request; no API call, no JavaScript execution. The index version is part of the identity: a new Vals Index version or component set is a new registry identity. Model slugs stay source labels; no catalog join or effort inference.';
const evidence = (excerpt) => [
  { url, file: page, sha256: fileSha(page), fetched_at: fetched, excerpt },
  { url: 'https://www.vals.ai/robots.txt', file: robots, sha256: fileSha(robots), fetched_at: fetched, excerpt: 'User-agent: * / Allow: / — collection of the public benchmark page is permitted.' },
];
const common = (id, family) => ({
  version: '2', version_status: 'published', family, maintainer: 'Vals AI', source_type: 'official_leaderboard', primary_url: url,
  publication_urls: [{ url, type: 'official_leaderboard', role: 'Vals Index v2 leaderboard, methodology and component scores' }],
  update_cadence: { source_schedule: 'Not stated by the source; page shows "Updated 9/10/2026".', check_recommendation: 'Daily, at most one capture per source; stop on access restrictions.' },
  saturated: { value: false, note: 'No verified saturation claim; retained without asserting headroom.' },
  superseded_by: null, status: 'active', first_seen: '2026-09-13', last_verified: '2026-09-13',
});
const planEntry = (id, task, field, protocol, reason, unit) => ({
  benchmark_id: id,
  parser: { kind: 'astro_props', component: '/_astro/BenchmarkView.', row_path: `benchmarkView.tasks.${task}`, require: { 'benchmarkView.metadata.benchmark': 'Vals Index', 'benchmarkView.metadata.version': '2' },
    name_field: 'name', value_field: field, plain_text_names: true,
    context_keys: ['accuracy', 'stderr', 'cost_per_test', 'latency', 'compute_effort', 'reasoning_effort', 'max_output_tokens', 'provider'] },
  status: 'collected', reason,
  recipe: { command: recipeCommand, format: 'Astro island props embedded in the server-rendered page', locator: locator(task, field), version_guard: 'Require metadata.benchmark "Vals Index" and metadata.version "2".', notes },
  cadence: 'daily, at most one capture per source; stop on access restrictions',
  version_guard: 'Require metadata.benchmark "Vals Index" and metadata.version "2".',
  source: { url, file: page, sha256: manifest.sha256, retrieved_at: fetched },
  protocol, basis: 'measured', minimum_rows: field === 'cost_per_test' ? 55 : 56, source_urls: [url], // Nemotron 3 Ultra has no published cost.
});

const registry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8'));
const plan = JSON.parse(readFileSync('data/raw/benchmarks/collection-plan.json', 'utf8'));
const add = (entry, planned) => {
  if (registry.entries.some((e) => e.id === entry.id) || plan.entries.some((e) => e.benchmark_id === entry.id)) throw new Error(`duplicate ${entry.id}`);
  registry.entries.push(entry); plan.entries.push(planned);
};
for (const [task, family, name, category, description, detail] of tasks) {
  const id = `${family}::2`;
  add({ id, name, ...common(id, family), category, one_sentence_description: description,
    scoring: { metric: task === 'overall' ? 'Vals Index accuracy' : `${task === 'legal_agent_benchmark' ? 'HLAB' : name.split(' (')[0]} accuracy`, unit: 'percent', range: [0, 100], higher_better: true,
      notes: `${detail} Vals AI publishes accuracy with a standard error per model; independent evaluator, secondary benchmark, not a Composite input.` },
    how_to_collect: { command: recipeCommand, format: 'Astro island props embedded in the server-rendered page', identity_policy: 'source_label', locator: locator(task, 'accuracy'), version_guard: 'Require metadata.benchmark "Vals Index" and metadata.version "2".', notes },
    evidence: evidence(`Vals Index v2 (updated 2026-09-10): ${task} holds 56 model rows with accuracy, stderr, cost_per_test and latency. ${detail}`) },
  planEntry(id, task, 'accuracy', `Vals Index v2 (updated 2026-09-10), component ${task}; accuracy in percent, higher is better; each row is one model slug with its published compute/reasoning effort.`,
    'Vals AI publishes this score itself as an independent evaluator; secondary benchmark, never a Composite input.'));
}
add({ id: 'vals-index-cost::2', name: 'Vals Index v2 cost per test (Vals AI)', ...common('vals-index-cost::2', 'vals-index-cost'), category: 'Efficiency',
  one_sentence_description: "Vals AI's published USD cost per test for each model on the Vals Index v2.",
  scoring: { metric: 'Cost per test', unit: 'USD', range: [0, null], higher_better: false, notes: 'Separate published metric from the overall Vals Index row, not a capability score and not a Composite input.' },
  how_to_collect: { command: recipeCommand, format: 'Astro island props embedded in the server-rendered page', identity_policy: 'source_label', locator: locator('overall', 'cost_per_test'), version_guard: 'Require metadata.benchmark "Vals Index" and metadata.version "2".', notes },
  evidence: evidence('Vals Index v2 overall rows carry cost_per_test in USD (page: "GPT-5.6 Luna reaches 59.88% at $0.62 per test").') },
planEntry('vals-index-cost::2', 'overall', 'cost_per_test', 'Vals Index v2 (updated 2026-09-10), overall; published cost per test in USD per model slug; accuracy and latency retained as context, not converted.',
  'Vals AI publishes a USD cost per test next to the index score; it is not a score and never enters the Composite.'));

writeFileSync('data/raw/benchmarks/registry.json', JSON.stringify(registry, null, 2) + '\n');
writeFileSync('data/raw/benchmarks/collection-plan.json', JSON.stringify(plan, null, 2) + '\n');
console.log(`registry ${registry.entries.length}, plan ${plan.entries.length}`);
