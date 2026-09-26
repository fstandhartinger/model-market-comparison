#!/usr/bin/env node
// CR-173 (vals-simplebench), 2026-09-26: standalone Vals boards from the 2026-09-26 capture, following the CR-128
// precedent (manual-board-observations.json, one hand-reviewed snapshot per board, refresh "manual").
//
// Why GPT-6 Sol/Luna were missing: CR-128 captured the standalone boards on 2026-09-22 and ingested only the GPT-6
// Astra and Claude Opus 5.5 rows; Sol and Luna were added to those pages later (they are absent from every
// 2026-09-22 capture). The boards are manual snapshots, so no daily run could pick them up.
//
// Identity rule (unchanged): a board whose registry identity is a *version* (ProofBench v1.1, Public Benefits Bench
// v1.1, Vibe Code Bench v1.1) keeps it, like vals-index::2. A board whose identity is a *dated snapshot* keeps it only
// while the page still carries that date ("Updated M/D/YYYY" == metadata.updated); a re-dated page is a new dated
// identity (CR-34.2 / D202), the old one is retained with superseded_by. Boards not yet in the registry
// (CyberBench v1.1, MedCode, SAGE, Tax Agent Bench) get new identities.
//
// Rows: every row of the target families (the 22 Sep releases and the other recent frontier models the job names).
// Join: exactly lib/board-identity.mjs parseValsIndexId + boardJoins over the *whole* board (so the "configuration
// named twice joins neither row" rule sees every row); the source row with reasoning_effort / compute_effort is
// kept verbatim at the end of the protocol, as on the vals-index boards. A row stating no setting stays unjoined.
//
//   node ops/rebuild-2026-09/evidence/phase-09/vals-simplebench/build-vals-standalone.mjs [--write]
// Without --write it only prints the plan and writes the frozen candidate artifact.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { boardJoins, parseValsIndexId } from '../../../../../lib/board-identity.mjs';

const WRITE = process.argv.includes('--write');
const HERE = 'ops/rebuild-2026-09/evidence/phase-09/vals-simplebench';
const EV = 'data/raw/benchmarks/daily-evidence/2026-09-26-vals-simplebench';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const receipts = new Map(JSON.parse(readFileSync(`${EV}/capture2/manifest.json`)).map((r) => [r.url, { ...r, file: `${EV}/${r.file}` }]));

const TARGET = /^(openai\/gpt-6-(astra|sol|luna)|anthropic\/claude-(opus-5-5|fable-5-1)|google\/gemini-3\.8|grok\/grok-4\.7|kimi\/kimi-k3|deepseek\/deepseek-v4|alibaba\/qwen3\.8|zai\/glm-5)/;

// slug → [registry family, identity kind]. `version` keeps the versioned id; `snapshot` is dated by metadata.updated.
const BOARDS = [
  ['biomysterybench', 'vals-biomysterybench', 'snapshot'],
  ['cua_bench', 'vals-cua-bench', 'snapshot'],
  ['ioi', 'vals-ioi', 'snapshot'],
  ['medscribe', 'vals-medscribe', 'snapshot'],
  ['mysterymechanism', 'vals-mysterymechanism', 'snapshot'],
  ['programbench', 'vals-programbench', 'snapshot'],
  ['proof_bench', 'vals-proofbench-v1-1', 'version'],
  ['public-benefits-bench', 'vals-public-benefits-bench-v1-1', 'version'],
  ['srebench', 'vals-sre-bench', 'snapshot'],
  ['terminal-bench-4', 'vals-terminal-bench-4-0', 'snapshot'],
  ['terminal-bench-science', 'vals-terminal-bench-science', 'snapshot'],
  ['time_horizon_index', 'vals-time-horizon-index-ksp', 'snapshot'],
  ['vcb-1-100', 'vals-vibe-code-bench-1-100', 'snapshot'],
  ['vibe-code', 'vals-vibe-code-bench', 'version'],
  ['code-migration', 'vals-code-migration', 'snapshot'],
  ['emb', 'vals-emb', 'snapshot'],
  ['cyber', 'vals-cyberbench-v1-1', 'version'],
  ['medcode', 'vals-medcode', 'snapshot'],
  ['sage', 'vals-sage', 'snapshot'],
  ['tax_agent_bench', 'vals-tax-agent-bench', 'snapshot'],
];
// New families only: registry category and the Vals page's own one-line description (metadata.description).
const NEW_FAMILIES = {
  'vals-cyberbench-v1-1': { category: 'Coding' },
  'vals-medcode': { category: 'Knowledge' },
  'vals-sage': { category: 'Math' },
  'vals-tax-agent-bench': { category: 'Agentic' },
};

const unescapeHtml = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const astro = (v) => {
  if (!(Array.isArray(v) && v.length === 2 && Number.isInteger(v[0]))) throw new Error('Unsupported Astro prop encoding');
  if (v[0] === 1) return v[1].map(astro);
  if (v[0] !== 0) return { $astro_type: v[0] };
  return v[1] && typeof v[1] === 'object' && !Array.isArray(v[1]) ? Object.fromEntries(Object.entries(v[1]).map(([k, x]) => [k, astro(x)])) : v[1];
};
function board(file) {
  const html = gunzipSync(readFileSync(file)).toString('utf8');
  const islands = [...html.matchAll(/<astro-island\b[^>]*>/g)].map((m) => m[0]).filter((t) => t.includes('/_astro/BenchmarkView.'));
  if (islands.length !== 1) throw new Error(`${file}: BenchmarkView island missing or ambiguous`);
  const props = JSON.parse(unescapeHtml(/\sprops="([^"]*)"/.exec(islands[0])[1]));
  const view = astro(props.benchmarkView);
  const dates = [...new Set([...html.matchAll(/Updated (\d+)\/(\d+)\/(\d{4})/g)].map((m) => `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`))];
  if (dates.length !== 1 || dates[0] !== view.metadata.updated) throw new Error(`${file}: page date ${dates} != metadata.updated ${view.metadata.updated}`);
  const page = /Updated \d+\/\d+\/\d{4}/.exec(html)[0];
  return { meta: view.metadata, overall: view.tasks.overall, page };
}

const registry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json'));
const manual = JSON.parse(readFileSync('data/raw/benchmarks/manual-board-observations.json'));
const plan = JSON.parse(readFileSync('data/raw/benchmarks/collection-plan.json'));
const taxonomy = JSON.parse(readFileSync('data/benchmark-taxonomy.json'));
const catalog = JSON.parse(readFileSync('data/dataset.json')).models.map(({ id, family_key, variant }) => ({ id, family_key, variant }));

const CONTEXT = ['accuracy', 'stderr', 'cost_per_test', 'latency', 'compute_effort', 'reasoning_effort', 'max_output_tokens', 'provider', 'harness'];
const setting = (f) => {
  const parts = [];
  if (f.reasoning_effort != null) parts.push(`reasoning_effort ${f.reasoning_effort}`);
  if (f.compute_effort != null) parts.push(`compute_effort ${f.compute_effort}`);
  return parts.length ? parts.join(', ') : 'no reasoning or compute effort stated';
};

const summary = [], candidate = [], registryAdds = [], supersede = [], guardUpdates = [], problems = [];
for (const [slug, family, kind] of BOARDS) {
  const url = `https://www.vals.ai/benchmarks/${slug}`;
  const r = receipts.get(url);
  if (!r || r.status !== 200) throw new Error(`no capture for ${url}`);
  const raw = gunzipSync(readFileSync(r.file));
  if (sha(raw) !== r.sha256) throw new Error(`digest ${url}`);
  const { meta, overall, page } = board(r.file);
  const existing = registry.entries.filter((e) => e.family === family);
  const active = existing.find((e) => e.status === 'active');
  let id, action;
  if (kind === 'version') {
    const version = meta.version;
    id = `${family}::${version}`;
    action = existing.some((e) => e.id === id) ? 'existing' : 'new';
  } else {
    id = `${family}::snapshot-${meta.updated}`;
    action = existing.some((e) => e.id === id) ? 'existing' : active ? 'supersede' : 'new';
  }
  // Legacy exception: CR-128 dated vals-sre-bench by its capture day (2026-09-22) while the page said 9/21/2026, and
  // the page still says 9/21/2026 — the same snapshot, so it stays on the existing identity.
  if (family === 'vals-sre-bench' && meta.updated === '2026-09-21' && existing.some((e) => e.id === 'vals-sre-bench::snapshot-2026-09-22')) { id = 'vals-sre-bench::snapshot-2026-09-22'; action = 'existing'; }

  const rows = Object.entries(overall).map(([sid, f], index) => ({ sid, f, index }));
  const obs = rows.map(({ sid, f, index }) => {
    const context = Object.fromEntries([['task', 'overall'], ...CONTEXT.filter((k) => Object.hasOwn(f, k)).map((k) => [k, f[k]])]);
    const name = `${sid} (Vals: ${setting(f)})`;
    return { sid, f, index, name,
      protocol: `Vals: ${meta.benchmark} (source metadata.version "${meta.version}", page "${page}"), task overall; accuracy in percent, higher is better; source configuration ${name}; source row: ${JSON.stringify(context)}` };
  });
  const joins = boardJoins(obs.map((o) => ({ source_id: o.sid, name: o.name, protocol: o.protocol, o })), parseValsIndexId, catalog);
  const priorRows = manual.observations.filter((m) => m.benchmark_id === id);
  for (const j of joins) {
    const o = j.row.o;
    if (!TARGET.test(o.sid)) continue;
    const { effort } = parseValsIndexId(o.sid, o.name, o.protocol);
    const row = {
      id: `cr173:${sha(`${id}\0${o.sid}\0${r.sha256}`).slice(0, 24)}`,
      benchmark_id: id,
      subject: { source_id: o.sid, name: o.name, model_id: j.model_id, variant: effort ?? null, harness: null },
      value: o.f.accuracy, unit: 'percent', basis: 'measured',
      source: { url, retrieved_at: r.retrieved_at, published_at: null, sha256: r.sha256, file: r.file,
        locator: `astro_props BenchmarkView; benchmarkView.tasks.overall["${o.sid}"] (source row ${o.index}); field accuracy = ${o.f.accuracy}` },
      protocol: o.protocol, comparison_key: null,
    };
    const join = j.model_id ? j.rule : j.reason;
    if (typeof row.value !== 'number' || !Number.isFinite(row.value)) { problems.push(`${id} ${o.sid}: no numeric accuracy`); continue; }
    const prior = priorRows.find((m) => m.subject.source_id === o.sid);
    if (prior) {
      // Already published on this identity: must be the same value and the same configuration, else it is a finding.
      if (prior.value !== row.value || prior.subject.model_id !== row.subject.model_id) {
        problems.push({ id, source_id: o.sid, prior: { id: prior.id, value: prior.value, model_id: prior.subject.model_id, name: prior.subject.name }, current: { value: row.value, model_id: row.subject.model_id, name: row.subject.name, rule: join } });
        candidate.push({ ...row, replaces: prior.id, join });
      }
      continue;
    }
    candidate.push({ ...row, join });
  }
  summary.push({ slug, id, action, page, version: meta.version, target_rows: candidate.filter((c) => c.benchmark_id === id).length });
  if (action === 'supersede' || action === 'new') {
    const template = active ?? registry.entries.find((e) => e.id === 'vals-biomysterybench::snapshot-2026-09-21');
    const fresh = structuredClone(template);
    const version = kind === 'version' ? meta.version : `snapshot-${meta.updated}`;
    Object.assign(fresh, {
      id, version, version_status: kind === 'version' ? 'published' : 'snapshot', family, status: 'active', superseded_by: null,
      first_seen: '2026-09-26', last_verified: '2026-09-26', maintainer: 'Vals AI', primary_url: url,
      publication_urls: [{ url, type: 'official_leaderboard', role: 'Primary results publication and source capture entry point' }],
    });
    if (!active) {
      Object.assign(fresh, { name: meta.benchmark, category: NEW_FAMILIES[family].category,
        one_sentence_description: `${meta.benchmark} results published by Vals AI.`,
        scoring: { ...template.scoring, metric: `Source-reported score for Vals: ${meta.benchmark}` } });
    }
    fresh.how_to_collect = { ...template.how_to_collect,
      locator: `Astro island BenchmarkView props (decoded [type, value] pairs): benchmarkView.tasks.overall, one entry per model slug; field accuracy; the row's reasoning_effort / compute_effort is the stated setting.`,
      version_guard: kind === 'version' ? `Require benchmarkView.metadata.benchmark "${meta.benchmark}" and metadata.version "${meta.version}"; keep this exact benchmark and operator separate from other similarly named boards.`
        : `Require source page "${page}" (metadata.updated ${meta.updated}); a re-dated page is a new dated identity. Keep this exact benchmark and operator separate from other similarly named boards.`,
      notes: `One-time manual snapshot (CR-173, 2026-09-26 capture); refresh only after verifying the source's version and protocol. Source maintainer: Vals AI.` };
    const excerptRow = candidate.find((c) => c.benchmark_id === id && /gpt-6-sol/.test(c.subject.source_id)) ?? candidate.find((c) => c.benchmark_id === id);
    fresh.evidence = [{ url, file: r.file, sha256: sha(readFileSync(r.file)), fetched_at: r.retrieved_at, source_sha256: r.sha256,
      excerpt: `${meta.benchmark} (${page}; metadata.version "${meta.version}"): ${meta.description ?? ''} ... overall["${excerptRow.subject.source_id}"].accuracy = ${excerptRow.value}` }];
    registryAdds.push({ after: active?.id ?? null, entry: fresh });
    if (action === 'supersede') supersede.push({ from: active.id, to: id });
  } else {
    guardUpdates.push({ id, url, r, page, meta, kind });
  }
}

// The frozen candidate artifact (what the critic reviews) and a human summary.
writeFileSync(`${HERE}/vals-standalone-candidate.json`, JSON.stringify({ generated_at: new Date().toISOString(), summary, problems, rows: candidate }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 1));
console.log('rows', candidate.length, 'joined', candidate.filter((c) => c.subject.model_id).length, 'problems', JSON.stringify(problems, null, 1));
if (!WRITE) process.exit(0);

// ---- apply
const strip = ({ join, replaces, ...row }) => row;
for (const c of candidate) {
  if (c.replaces) {
    const at = manual.observations.findIndex((m) => m.id === c.replaces);
    const [old] = manual.observations.splice(at, 1);
    manual.withdrawn_observations.push({ ...old, withdrawn_reason: `CR-173 (2026-09-26): withdrawn from publication and replaced by ${c.id}. The retained capture's own source row states ${c.subject.name.replace(/^.*\(Vals: /, '').replace(/\)$/, '')} for ${c.subject.source_id} (value ${c.value}); this row had attributed it to ${old.subject.model_id}. Same board, same value, corrected configuration.` });
  }
  manual.observations.push(strip(c));
}
for (const { after, entry } of registryAdds) {
  if (registry.entries.some((e) => e.id === entry.id)) continue;
  const at = after ? registry.entries.findIndex((e) => e.id === after) + 1 : registry.entries.length;
  registry.entries.splice(at, 0, entry);
}
for (const { from, to } of supersede) Object.assign(registry.entries.find((e) => e.id === from), { status: 'retained', superseded_by: to });
for (const { id, url, r, page, meta, kind } of guardUpdates) {
  const e = registry.entries.find((x) => x.id === id);
  if (!candidate.some((c) => c.benchmark_id === id)) continue;
  e.last_verified = '2026-09-26';
  if (kind === 'version') e.how_to_collect.version_guard = `Require benchmarkView.metadata.benchmark "${meta.benchmark}" and metadata.version "${meta.version}" (the page is re-dated as Vals adds models: CR-128 read "Updated 9/21/2026", CR-173 "${page}"); keep this exact benchmark and operator separate from other similarly named boards.`;
  if (!e.evidence.some((x) => x.source_sha256 === r.sha256)) {
    const ex = candidate.find((c) => c.benchmark_id === id);
    e.evidence.push({ url, file: r.file, sha256: sha(readFileSync(r.file)), fetched_at: r.retrieved_at, source_sha256: r.sha256,
      excerpt: `${meta.benchmark} (${page}; metadata.version "${meta.version}") ... overall["${ex.subject.source_id}"].accuracy = ${ex.value}` });
  }
}
// Plan + collections for every identity that gained rows.
for (const id of new Set(candidate.map((c) => c.benchmark_id))) {
  const entry = registry.entries.find((e) => e.id === id);
  const reason = 'Hash-bound primary-source snapshot reviewed for CR-173 on 2026-09-26; exact scores are retained in manual-board-observations.json.';
  const spec = { benchmark_id: id, refresh: 'manual', status: 'collected', reason,
    recipe: { command: 'Review the retained primary-source capture, confirm the named row and benchmark version, then update the manual observation file and evidence hash.',
      format: 'Captured leaderboard HTML (Astro island props)', locator: entry.how_to_collect.locator, version_guard: entry.how_to_collect.version_guard } };
  const pi = plan.entries.findIndex((p) => p.benchmark_id === id);
  if (pi < 0) {
    const prev = registry.entries.find((e) => e.superseded_by === id);
    const at = prev ? plan.entries.findIndex((p) => p.benchmark_id === prev.id) + 1 : plan.entries.length;
    plan.entries.splice(at, 0, spec);
  }
  if (!manual.collections.some((c) => c.benchmark_id === id)) manual.collections.push({ benchmark_id: id, status: 'collected', source_url: entry.primary_url, reason: 'Hash-bound primary source reviewed for CR-173; exact rows retained with the observation.' });
}
for (const family of Object.keys(NEW_FAMILIES)) if (!taxonomy.benchmark_kinds[family]) taxonomy.benchmark_kinds[family] = 'capability';
writeFileSync('data/raw/benchmarks/manual-board-observations.json', JSON.stringify(manual, null, 2) + '\n');
writeFileSync('data/raw/benchmarks/registry.json', JSON.stringify(registry, null, 2) + '\n');
writeFileSync('data/raw/benchmarks/collection-plan.json', JSON.stringify(plan, null, 2) + '\n');
writeFileSync('data/benchmark-taxonomy.json', JSON.stringify(taxonomy, null, 2) + '\n');
console.log('written');
