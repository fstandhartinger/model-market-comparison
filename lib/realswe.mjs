// Real-SWE (Specific Labs) source parser.
//
// The public leaderboard is a Next.js page: the server-rendered HTML carries the
// leaderboard values, the 640 individual rollout outcomes, the confidence whiskers,
// the per-configuration failure taxonomy and the Pareto cost/score view. The page's
// data chunk repeats the same rollout/pass counts and adds cost provenance.
//
// This module parses only bytes that were captured in the evidence directory and
// fails loudly on any drift. It never fetches and never evaluates upstream code.
import { createHash } from 'node:crypto';

export const REALS_WE_ACCESS_URL = 'https://realswe.withspecific.com/';
export const REALS_WE_CANONICAL_URL = 'https://withspecific.com/benchmarks/real-swe';
export const REALS_WE_RUNS_PER_TASK = 8;
export const REALS_WE_CI_LEVEL = 0.95;
export const REALS_WE_SCORE_UNIT = 'percent';
export const REALS_WE_COST_UNIT = 'USD';

const RUNS = REALS_WE_RUNS_PER_TASK;

const FAILURE_LABELS = {
  UNVERIFIED_ASSUMPTION: 'Unverified assumption',
  MISSED_REQUIREMENT: 'Missed requirement',
  INTEGRATION_ERROR: 'Integration error',
  REGRESSION: 'Regression',
  WRONG_FILE: 'Wrong file',
  UNCLASSIFIED_FAILURE: 'Unclassified failure',
};

export function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

function decode(text) {
  return String(text)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, d) => String.fromCodePoint(parseInt(d, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const fail = (message) => { throw new Error(`Real-SWE source: ${message}`); };

function parseLeaderboard(html) {
  const rows = [];
  for (const m of html.matchAll(/<li class="border-b[^"]*">([\s\S]*?)<\/li>/g)) {
    const block = m[1];
    const name = decode(/<div class="text-\[15px\][^"]*">([^<]*)<\/div>/.exec(block)?.[1] ?? '');
    const harness = decode(/<div class="mt-0\.5 text-xs[^"]*">([^<]*)<\/div>/.exec(block)?.[1] ?? '');
    const listed = /tabular-nums text-foreground"><span class="sr-only">[^<]*<\/span>([\d.]+)%/.exec(block)?.[1];
    const bar = /style="width:([\d.]+)%;background-color/.exec(block)?.[1];
    const whisker = /data-confidence-whisker="true"[^>]*style="left:([\d.]+)%;width:([\d.]+)%/.exec(block);
    if (!name || !harness || !bar) fail(`leaderboard row is missing identity or bar (${name || 'unnamed'})`);
    const barPct = Number(bar);
    const lower = whisker ? Number(whisker[1]) : null;
    const upper = whisker ? Number(whisker[1]) + Number(whisker[2]) : null;
    rows.push({ name, harness, listed_score: listed === undefined ? null : Number(listed), exact_score: barPct, ci: lower === null ? null : { level: REALS_WE_CI_LEVEL, lower, upper } });
  }
  if (!rows.length) fail('no leaderboard rows');
  return rows;
}

function parsePareto(html) {
  const bySlug = new Map();
  for (const m of html.matchAll(/data-pareto-point="([^"]+)"([^>]*)><title>([^<]*)<\/title>/g)) {
    const title = decode(m[3]);
    const parts = /^(.*): ([\d.]+)% \u00b7 \$([\d.]+); ([^;]+)(?:; (.*))?$/.exec(title);
    if (!parts) fail(`unexpected Pareto point title: ${title}`);
    const point = { slug: m[1], name: parts[1], listed_score: Number(parts[2]), cost_per_rollout: Number(parts[3]),
      harness: parts[4].trim(), cost_note: parts[5] ? parts[5].trim() : null, cost_lower_bound: m[2].includes('data-cost-lower-bound="true"') };
    const prior = bySlug.get(point.slug);
    if (prior && JSON.stringify(prior) !== JSON.stringify(point)) fail(`inconsistent Pareto entries for ${point.slug}`);
    bySlug.set(point.slug, point);
  }
  if (!bySlug.size) fail('no Pareto points');
  return bySlug;
}

function parseRollouts(html) {
  const rollouts = [];
  for (const m of html.matchAll(/title="([^"]*?trial (\d+): [^"]*?)" data-outcome="([A-Z_]+)"/g)) {
    const title = decode(m[1]);
    const pieces = title.split(' \u00b7 ');
    if (pieces.length !== 3) fail(`unexpected rollout title: ${title}`);
    rollouts.push({ model: pieces[0], task: pieces[1], trial: Number(m[2]), outcome: m[3] });
  }
  if (!rollouts.length) fail('no rollout outcomes');
  return rollouts;
}

function parseFailureTaxonomy(html, names) {
  const taxonomy = new Map(names.map((name) => [name, []]));
  for (const m of html.matchAll(/title="([^"]*?)" data-outcome="([A-Z_]+)" data-count="(\d+)"/g)) {
    const label = decode(m[1]).replace(/:\s*[\d.]+% of failures$/, '');
    let owner = null;
    let at = -1;
    for (const name of names) {
      const index = html.lastIndexOf(name, m.index);
      if (index > at) { at = index; owner = name; }
    }
    if (!owner) fail(`failure entry has no owning configuration: ${label}`);
    taxonomy.get(owner).push({ outcome: m[2], label, count: Number(m[3]) });
  }
  return taxonomy;
}

function parseTokenUsage(html) {
  const tokens = new Map();
  for (const m of html.matchAll(/<title>([^<]*?) \u00b7 ([^<]*?): ([\d.]+)k<\/title>/g)) {
    const task = decode(m[1]);
    const model = decode(m[2]);
    if (!tokens.has(task)) tokens.set(task, new Map());
    tokens.get(task).set(model, Number(m[3]));
  }
  return tokens;
}

// Chunk cross-check: the model array repeats passes/valid per configuration. The
// page title text above is authoritative for display; the chunk is an independent
// recombination of the same rollouts.
export function parseChunkTruth(chunk) {
  if (typeof chunk !== 'string' || !chunk.includes('entitlement-overage-lines')) fail('data chunk does not look like the Real-SWE dataset');
  const constants = new Map();
  for (const m of chunk.matchAll(/(?:^|[,;{(\s])([A-Za-z_$][A-Za-z0-9_$]*)=(\d+)(?=[,;})\s])/g)) {
    if (!constants.has(m[1])) constants.set(m[1], new Set());
    constants.get(m[1]).add(Number(m[2]));
  }
  const start = chunk.indexOf('x=[{key:"');
  const end = start < 0 ? -1 : chunk.indexOf('],T="PASS"', start);
  if (start < 0 || end < 0) fail('data chunk model array is missing');
  const passes = new Map();
  for (const m of chunk.slice(start, end).matchAll(/key:"(\w+)",model:[^,]+,harness:[^,]+,color:"[^"]*",logo:"[^"]*",passes:([A-Za-z_$][\w$]*|\d+),valid:(\d+)/g)) {
    const raw = m[2];
    let value = /^\d+$/.test(raw) ? Number(raw) : null;
    if (value === null) {
      const seen = constants.get(raw);
      if (!seen || seen.size !== 1) fail(`cannot resolve chunk pass count ${raw}`);
      value = [...seen][0];
    }
    passes.set(m[1], { passes: value, valid: Number(m[3]) });
  }
  if (!passes.size) fail('data chunk has no model pass counts');
  return passes;
}

function readObject(text, braceAt) {
  if (text[braceAt] !== '{') return null;
  let depth = 0;
  let inString = false;
  for (let i = braceAt; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') { depth -= 1; if (depth === 0) return text.slice(braceAt, i + 1); }
  }
  return null;
}

function objectEntry(region, slug) {
  if (!region) return null;
  const at = region.indexOf(`${slug}:{`);
  return at < 0 ? null : readObject(region, at + slug.length + 1);
}

function parseCostProvenance(chunk) {
  const rAt = chunk.indexOf('R={');
  const cAt = chunk.indexOf('c={gemini:{runs:');
  const rRegion = rAt < 0 ? null : readObject(chunk, rAt + 2);
  const cRegion = cAt < 0 ? null : readObject(chunk, cAt + 2);
  const rows = new Map();
  for (const slug of ['fable', 'astra', 'gemini', 'glm', 'grok', 'meta', 'kimi', 'gpt']) {
    const r = objectEntry(rRegion, slug);
    const c = objectEntry(cRegion, slug);
    const row = {};
    if (r) {
      const recorded = /recordedRuns:(\d+)/.exec(r);
      const estimate = /explicitEstimateRuns:(\d+)/.exec(r);
      if (recorded) row.recorded_runs = Number(recorded[1]);
      if (estimate) row.explicit_estimate_runs = Number(estimate[1]);
    }
    if (c) {
      const basis = /basis:"([^"]*)"/.exec(c);
      const source = /source:"([^"]*)"/.exec(c);
      const runs = /(?:^|[{,])runs:(\d+)/.exec(c);
      if (basis) row.basis = basis[1];
      if (source) row.source = source[1];
      if (runs) row.runs = Number(runs[1]);
      if (/lowerBound:!0/.test(c)) row.lower_bound = true;
      const unmeasured = /unmeasuredRequests:(\d+)/.exec(c);
      const incomplete = /incompleteUsageRuns:(\d+)/.exec(c);
      if (unmeasured) row.unmeasured_requests = Number(unmeasured[1]);
      if (incomplete) row.incomplete_usage_runs = Number(incomplete[1]);
    }
    if (Object.keys(row).length) rows.set(slug, row);
  }
  return rows;
}

// Parse the captured page (and optionally its data chunk) into a canonical, fully
// reconciled description. Any inconsistency throws instead of publishing a number.
export function parseRealSwe(html, { chunk = null } = {}) {
  if (typeof html !== 'string' || !html.includes('data-pareto-point')) fail('unexpected page content (no Pareto view)');
  const leaderboard = parseLeaderboard(html);
  const pareto = parsePareto(html);
  const rollouts = parseRollouts(html);
  const taxonomy = parseFailureTaxonomy(html, leaderboard.map((r) => r.name));
  const tokens = parseTokenUsage(html);

  const byName = new Map(leaderboard.map((r) => [r.name, r]));
  const configs = [];
  for (const [slug, point] of pareto) {
    const row = byName.get(point.name);
    if (!row) fail(`Pareto configuration ${point.name} has no leaderboard row`);
    if (row.harness !== point.harness) fail(`harness mismatch for ${point.name}: ${row.harness} vs ${point.harness}`);
    if (row.listed_score !== null && row.listed_score !== point.listed_score) fail(`score mismatch for ${point.name}`);
    configs.push({ slug, name: point.name, harness: point.harness, listed_score: row.listed_score,
      exact_score: row.exact_score, ci: row.ci, cost_per_rollout: point.cost_per_rollout,
      cost_lower_bound: point.cost_lower_bound, cost_note: point.cost_note });
  }
  if (configs.length !== leaderboard.length) fail(`${leaderboard.length} leaderboard rows but ${configs.length} Pareto configurations`);

  const tasks = [];
  const taskIndex = new Map();
  const counts = new Map(configs.map((c) => [c.slug, { runs: 0, passes: 0 }]));
  const nameToSlug = new Map(configs.map((c) => [c.name, c.slug]));
  for (const r of rollouts) {
    const slug = nameToSlug.get(r.model);
    if (!slug) fail(`rollout references unknown configuration ${r.model}`);
    const countsEntry = counts.get(slug);
    countsEntry.runs += 1;
    if (r.outcome === 'PASS') countsEntry.passes += 1;
    let task = taskIndex.get(r.task);
    if (!task) { task = { name: r.task, runs: 0, passes: 0, passes_by_config: {} }; taskIndex.set(r.task, task); tasks.push(task); }
    task.runs += 1;
    if (r.outcome === 'PASS') { task.passes += 1; task.passes_by_config[slug] = (task.passes_by_config[slug] ?? 0) + 1; }
  }

  const expected = configs.length * tasks.length * RUNS;
  if (rollouts.length !== expected) fail(`expected ${expected} rollouts, parsed ${rollouts.length}`);
  for (const config of configs) {
    const entry = counts.get(config.slug);
    const expectedRuns = tasks.length * RUNS;
    if (entry.runs !== expectedRuns) fail(`${config.name}: ${entry.runs} rollouts, expected ${expectedRuns}`);
    const exact = entry.passes / entry.runs * 100;
    if (Math.abs(exact - config.exact_score) > 1e-9) fail(`${config.name}: bar ${config.exact_score}% disagrees with ${entry.passes}/${entry.runs}`);
    config.passes = entry.passes;
    config.valid = entry.runs;
    const classes = taxonomy.get(config.name);
    const failed = classes.reduce((sum, item) => sum + item.count, 0);
    if (failed !== entry.runs - entry.passes) fail(`${config.name}: failure taxonomy sums to ${failed}, expected ${entry.runs - entry.passes}`);
  }
  for (const task of tasks) if (task.runs !== configs.length * RUNS) fail(`${task.name}: ${task.runs} rollouts, expected ${configs.length * RUNS}`);

  let chunkTruth = null;
  let costProvenance = null;
  if (chunk) {
    chunkTruth = parseChunkTruth(chunk);
    costProvenance = parseCostProvenance(chunk);
    for (const config of configs) {
      const truth = chunkTruth.get(config.slug);
      if (!truth) fail(`chunk is missing configuration ${config.slug}`);
      if (truth.passes !== config.passes || truth.valid !== config.valid) {
        fail(`${config.name}: chunk says ${truth.passes}/${truth.valid}, page says ${config.passes}/${config.valid}`);
      }
    }
  }

  const probe = {
    configurations: configs.length,
    tasks: tasks.length,
    runs_per_task: RUNS,
    rollouts: rollouts.length,
    expected_rollouts: expected,
    passes: rollouts.filter((r) => r.outcome === 'PASS').length,
    outcomes: rollouts.reduce((acc, r) => { acc[r.outcome] = (acc[r.outcome] ?? 0) + 1; return acc; }, {}),
  };
  return { configs, tasks, rollouts, taxonomy, tokens, costProvenance, probe };
}

// Build additive score observations: one resolution-rate axis and one cost axis.
// All configurations keep model_id: null because the source does not publish an
// effort/configuration key that would map honestly onto catalog model ids.
export function buildRealSweSnapshot(parsed, options) {
  const { date, retrievedAt, sourceFile, sourceSha256, chunkUrl, chunkFile, chunkSha256, chunkLocator } = options;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) fail('buildRealSweSnapshot needs a YYYY-MM-DD date');
  const scoreId = `realswe::snapshot-${date}`;
  const costId = `realswe-cost::snapshot-${date}`;
  const source = { url: REALS_WE_ACCESS_URL, retrieved_at: retrievedAt, published_at: null, sha256: sourceSha256, file: sourceFile, locator: '' };
  const supporting = chunkUrl ? [{ url: chunkUrl, retrieved_at: retrievedAt, published_at: null, sha256: chunkSha256, file: chunkFile, locator: chunkLocator }] : undefined;

  const observations = [];
  for (const config of parsed.configs) {
    const subject = { source_id: `realswe:${config.slug}`, name: config.name, model_id: null, variant: null, harness: config.harness };
    observations.push({
      id: `${scoreId}:${config.slug}`,
      benchmark_id: scoreId,
      subject,
      value: Number(config.exact_score.toFixed(6)),
      unit: REALS_WE_SCORE_UNIT,
      basis: 'measured',
      confidence_interval: config.ci,
      source: { ...source, locator: `Leaderboard row "${config.name}" (harness: ${config.harness}): bar width (resolution rate) and data-confidence-whisker` },
      supporting_sources: supporting,
      protocol: `Real-SWE resolution rate: pass@1 mean over ${parsed.probe.runs_per_task} runs on the published ${parsed.probe.tasks}-task sample, measured by Specific Labs. The public leaderboard exposes a ${parsed.probe.tasks}-task sample, not the full Real-SWE task set. The source displays the value rounded to one decimal; this observation is the exact ${config.passes}/${config.valid} pass rate.`,
      comparison_key: null,
    });
    observations.push({
      id: `${costId}:${config.slug}`,
      benchmark_id: costId,
      subject,
      value: config.cost_per_rollout,
      unit: REALS_WE_COST_UNIT,
      basis: 'measured',
      source: { ...source, locator: `Pareto point "${config.name}" (harness: ${config.harness}): mean USD per rollout` },
      supporting_sources: supporting,
      protocol: 'Real-SWE published mean cost per rollout (USD) from the source Pareto view. Some configurations are lower bounds or include provider-reported usage and imputations; see the observation details for the per-configuration cost basis.'
        + (config.cost_lower_bound ? ' The source marks this value as a lower bound: actual cost may be higher.' : ''),
      comparison_key: null,
    });
  }

  const details = {
    [scoreId]: {
      publication_scope: { published_tasks: parsed.probe.tasks, runs_per_task: parsed.probe.runs_per_task, configurations: parsed.probe.configurations, rollouts: parsed.probe.rollouts,
        note: 'The public Real-SWE leaderboard exposes a 10-task sample, not the full task set. Values are resolution rate (pass@1 mean over 8 runs).' },
      tasks: parsed.tasks.map((task) => ({ name: task.name, runs: task.runs, passes: task.passes, passes_by_config: task.passes_by_config })),
      failures: Object.fromEntries(parsed.configs.map((c) => [c.slug, (parsed.taxonomy.get(c.name) || []).map((f) => ({ outcome: f.outcome, label: f.label, count: f.count }))])),
      output_tokens_k: Object.fromEntries([...parsed.tokens].map(([task, models]) => [task, Object.fromEntries(models)])),
    },
    [costId]: {
      cost_provenance: Object.fromEntries(parsed.configs.map((c) => {
        const row = parsed.costProvenance?.get(c.slug) ?? {};
        return [c.slug, { displayed_cost_usd: c.cost_per_rollout, lower_bound: row.lower_bound ?? c.cost_lower_bound, note: c.cost_note ?? null, ...row }];
      })),
      note: 'Displayed mean USD per rollout from the source Pareto view. Costs come from the source provider-usage model; some values are flagged as lower bounds or include imputed provider usage.',
    },
  };

  return { scoreId, costId, observations, details };
}
