#!/usr/bin/env node
// CR-85.2 — DeepSeek's own model card as vendor-reported evidence for DeepSeek-V4.1-Flash.
//
// Deterministic and offline: the only input is our own capture of the release document
// (data/raw/benchmarks/daily-evidence/2026-09-20-deepseek-v41-flash/), hash-bound to its manifest.
// Every value is read out of the captured bytes — the DS-V4.1-Flash column of the card's own
// "Comparison with frontier models (Max reasoning effort)" table — never typed in here. The
// mapping below decides identity only: which registry entry a printed label becomes, and which
// claims are deliberately refused.
//
// Usage: node ops/ux-2026-09-12/bin/build-deepseek-v41-flash-claims.mjs [--write]
// Without --write it prints what it would do and changes nothing.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { writeJSONAtomic } from '../../../lib/snapshot.mjs';

const CAPTURE_DIR = 'data/raw/benchmarks/daily-evidence/2026-09-20-deepseek-v41-flash';
const CARD_URL = 'https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/raw/main/README.md';
const NEWS_URL = 'https://api-docs.deepseek.com/news/news260910/';
const MODEL_ID = 'deepseek-v4.1-flash::max';
const SUBJECT_NAME = 'DeepSeek-V4.1-Flash';
const COLUMN = 'DS-V4.1-Flash';
const TABLE_HEADING = '#### Comparison with frontier models (Max reasoning effort)';
const PUBLISHED_AT = '2026-09-10';          // Hugging Face repo createdAt/lastModified, both 2026-09-10
const SNAPSHOT = `snapshot-${PUBLISHED_AT}`;
const read = async (p) => JSON.parse(await readFile(p, 'utf8'));
const hash = (b) => createHash('sha256').update(b).digest('hex');
const slugOf = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Printed label -> registry identity. `version` null means the card prints no version for this
// board, so the identity is the card's own publication date and never merges with another release.
const IDENTITY = {
  'GPQA Diamond (Pass@1)':          { slug: 'gpqa-diamond', name: 'GPQA Diamond', version: null, category: 'Reasoning', maintainer: 'GPQA', unit: 'percent', metric: 'Pass@1' },
  'HLE (Pass@1)':                   { slug: 'hle', name: 'HLE', version: null, category: 'Reasoning', maintainer: 'HLE', unit: 'percent', metric: 'Pass@1' },
  'Codeforces (Rating)':            { slug: 'codeforces-rating', name: 'Codeforces (Rating)', version: null, category: 'Coding', maintainer: 'Codeforces', unit: 'Elo', metric: 'Rating' },
  'MathArena Apex (Pass@1)':        { slug: 'matharena-apex', name: 'MathArena Apex', version: null, category: 'Math', maintainer: 'MathArena', unit: 'percent', metric: 'Pass@1' },
  'Terminal-Bench 2.1 (Pass@1)':    { slug: 'terminal-bench-v2-1', name: 'Terminal-Bench 2.1', version: '2.1', category: 'Agentic', maintainer: 'Terminal-Bench', unit: 'percent', metric: 'Pass@1' },
  'Terminal-Bench 3.0 (Pass@1)':    { slug: 'terminal-bench-v3', name: 'Terminal-Bench 3.0', version: '3.0', category: 'Agentic', maintainer: 'Terminal-Bench', unit: 'percent', metric: 'Pass@1' },
  'Terminal-Bench 4.0 (Pass@1)':    { slug: 'terminal-bench-v4', name: 'Terminal-Bench 4.0', version: '4.0', category: 'Agentic', maintainer: 'Terminal-Bench', unit: 'percent', metric: 'Pass@1' },
  'DeepSWE v1.1 (Resolved)':        { slug: 'deepswe-v1-1', name: 'DeepSWE v1.1', version: '1.1', category: 'Coding', maintainer: 'DeepSWE', unit: 'percent', metric: 'Resolved' },
  'ProgramBench (Almost@1)':        { slug: 'programbench-almost-at-1', name: 'ProgramBench (Almost@1)', version: null, category: 'Coding', maintainer: 'ProgramBench', unit: 'percent', metric: 'Almost@1' },
  'NL2Repo-Bench (Score)':          { slug: 'nl2repo-bench', name: 'NL2Repo-Bench', version: null, category: 'Coding', maintainer: 'NL2Repo-Bench', unit: 'points', metric: 'Score' },
  'CyberGym (Pass@1)':              { slug: 'cybergym', name: 'CyberGym', version: null, category: 'Safety/Alignment', maintainer: 'CyberGym', unit: 'percent', metric: 'Pass@1' },
  'SEC-Bench Pro (Pass@1)':         { slug: 'sec-bench-pro', name: 'SEC-Bench Pro', version: null, category: 'Safety/Alignment', maintainer: 'SEC-Bench', unit: 'percent', metric: 'Pass@1' },
  'ExploitGym (Pass@1)':            { slug: 'exploitgym', name: 'ExploitGym', version: null, category: 'Safety/Alignment', maintainer: 'ExploitGym', unit: 'percent', metric: 'Pass@1' },
  'HLE w/ tools (Pass@1)':          { slug: 'hle-w-tools', name: 'HLE w/ tools', version: null, category: 'Agentic', maintainer: 'HLE', unit: 'percent', metric: 'Pass@1' },
  'AutomationBench (Pass@1)':       { slug: 'automationbench', name: 'AutomationBench', version: null, category: 'Agentic', maintainer: 'AutomationBench', unit: 'percent', metric: 'Pass@1' },
  "Agent's Last Exam (Pass@1)":     { slug: 'agents-last-exam', name: "Agent's Last Exam", version: null, category: 'Agentic', maintainer: "Agent's Last Exam", unit: 'percent', metric: 'Pass@1' },
  'Chartography w/ tools (Pass@1)': { slug: 'chartography-w-tools', name: 'Chartography w/ tools', version: null, category: 'Vision', maintainer: 'Chartography', unit: 'percent', metric: 'Pass@1' },
  'BabyVision w/ tools (Pass@1)':   { slug: 'babyvision-w-tools', name: 'BabyVision w/ tools', version: null, category: 'Vision', maintainer: 'BabyVision', unit: 'percent', metric: 'Pass@1' },
  'ZeroBench-main w/ tools (Pass@5)': { slug: 'zerobench-main-w-tools', name: 'ZeroBench-main w/ tools', version: null, category: 'Vision', maintainer: 'ZeroBench', unit: 'percent', metric: 'Pass@5' },
};

// Per-board harness and setting, quoted from the card's own Instruct-model preamble. Everything
// that is not quoted there falls back to the shared setting sentence.
const HARNESS = {
  'terminal-bench-v2-1': 'DeepSeek Harness, Minimal mode, 1M-token context window; evaluated without network access.',
  'terminal-bench-v3': 'DeepSeek Harness, Minimal mode, 1M-token context window.',
  'terminal-bench-v4': 'DeepSeek Harness, Minimal mode, 1M-token context window.',
  'deepswe-v1-1': 'mini-SWE harness ("to align with official setup requirements"), 1M-token context window.',
  'nl2repo-bench': 'DeepSeek Harness, Minimal mode, 1M-token context window.',
  'programbench-almost-at-1': 'DeepSeek Harness, Minimal mode, 1M-token context window.',
  'sec-bench-pro': 'Claude Code harness.',
  'chartography-w-tools': 'Claude Code harness, 512k-token context window.',
  'babyvision-w-tools': 'Claude Code harness, 512k-token context window.',
  'zerobench-main-w-tools': 'Claude Code harness, 512k-token context window.',
  'agents-last-exam': 'Official scaffold.',
  'automationbench': 'Official scaffold.',
};
// The short scaffold label the card names for a board, shown as the row's cohort.
const HARNESS_LABEL = {
  'terminal-bench-v2-1': 'DeepSeek Harness (Minimal)', 'terminal-bench-v3': 'DeepSeek Harness (Minimal)',
  'terminal-bench-v4': 'DeepSeek Harness (Minimal)', 'nl2repo-bench': 'DeepSeek Harness (Minimal)',
  'programbench-almost-at-1': 'DeepSeek Harness (Minimal)', 'deepswe-v1-1': 'mini-SWE',
  'sec-bench-pro': 'Claude Code', 'chartography-w-tools': 'Claude Code',
  'babyvision-w-tools': 'Claude Code', 'zerobench-main-w-tools': 'Claude Code',
  'agents-last-exam': 'Official scaffold', 'automationbench': 'Official scaffold',
};
const SETTING = 'reasoning_effort=100 (the card\'s maximum effort, the catalog\'s only DeepSeek-V4.1-Flash configuration), temperature=1.0, top_p=0.95.';

const manifest = await read(`${CAPTURE_DIR}/manifest.json`);
const cardReceipt = manifest.find((r) => r.url === CARD_URL);
if (!cardReceipt || cardReceipt.status !== 200) throw new Error('No successful capture of the DeepSeek model card');
const cardBytes = gunzipSync(await readFile(cardReceipt.file));
if (hash(cardBytes) !== cardReceipt.sha256) throw new Error('Model-card capture no longer matches its manifest digest');
const card = cardBytes.toString('utf8');
const newsReceipt = manifest.find((r) => r.url === NEWS_URL);

// --- the card's own table, read out of the captured bytes -------------------------------------
const section = card.split(TABLE_HEADING)[1];
if (!section) throw new Error(`Capture does not contain "${TABLE_HEADING}"`);
// Exactly one contiguous pipe-table: the card repeats these row labels in the later
// "across agent scaffolds" table, whose columns are harnesses, not models.
const block = [];
for (const line of section.split('\n')) {
  if (line.trim().startsWith('|')) block.push(line);
  else if (block.length) break;
}
const lines = block;
const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const header = cells(lines[0]);
const column = header.indexOf(COLUMN);
if (column < 0) throw new Error(`Column "${COLUMN}" not in the captured header: ${header.join(' / ')}`);
const plain = (c) => c.replace(/\*\*/g, '').trim();

const claims = [], rejected = [];
for (const line of lines.slice(2)) {
  const row = cells(line);
  const label = plain(row[0]);
  if (!label || row.slice(1).every((c) => !plain(c))) continue;   // bold group header ("**Reasoning**")
  const printed = plain(row[column] ?? '');
  const identity = IDENTITY[label];
  if (!identity) { rejected.push({ label, printed, reason: 'Printed label has no reviewed registry identity in this pass.' }); continue; }
  // "36.8 (39.1†)": the card's own footnote makes the parenthesis a different task set.
  const parenthetical = printed.match(/^([\d.]+)\s*\(([\d.]+)†\)$/);
  const token = parenthetical ? parenthetical[1] : printed;
  if (!/^-?\d+(?:\.\d+)?$/.test(token)) { rejected.push({ label, printed, reason: `No single numeric value printed for ${COLUMN}.` }); continue; }
  if (parenthetical) rejected.push({ label: `${label} — text-only subset`, printed: `${parenthetical[2]}†`,
    reason: `The card's footnote "† Text-only subset of HLE" makes this a different task set from the ${token} full-dataset value ingested for ${label}; it is not carried as a second row under the same identity.` });
  claims.push({ label, identity, value: Number(token), printed, locator: line.trim() });
}
const missing = Object.keys(IDENTITY).filter((l) => !claims.some((c) => c.label === l));
if (missing.length) throw new Error(`Reviewed labels not found in the capture: ${missing.join(', ')}`);

// Deliberate refusals that are not rows of this table.
rejected.push({ label: 'Base Model evaluation table (DeepSeek-V4.1-Flash-Base column)', printed: '21 values',
  reason: 'Base-model results. The catalog carries only the instruct configuration deepseek-v4.1-flash::max; a base checkpoint is not that model and gets no row.' });
rejected.push({ label: 'Performance across agent scaffolds (DeepSWE v1.1, Terminal-Bench 2.1)', printed: '16 values',
  reason: "Per-scaffold breakdown of two claims already ingested. The headline table's own harness (mini-SWE for DeepSWE v1.1, DeepSeek Harness Minimal for Terminal-Bench 2.1) is recorded in each row's protocol; the other scaffolds would duplicate one published result under one identity." });
for (const other of ['Opus-5.0', 'GPT-5.6 Sol', 'K3', 'GLM-5.3'])
  rejected.push({ label: `${other} column`, printed: 'comparison column',
    reason: 'A vendor claim about another lab\'s model. Only the publishing lab\'s own models are ingested as self-reported claims.' });
for (const own of ['DS-V4-Pro', 'DS-V4-Flash'])
  rejected.push({ label: `${own} column`, printed: 'comparison column',
    reason: `DeepSeek's own older model, but the card prints no checkpoint. The catalog carries two candidates each (deepseek-v4-pro::max / deepseek-v4-pro-0813::max, deepseek-v4-flash::max / deepseek-v4-flash-0731::max), so the identity is ambiguous and nothing is joined.` });

// --- registry entries and observations ---------------------------------------------------------
// The registry's evidence digest is of the stored file as it lies in the repository (the gzip
// bytes); the observation's source digest is of the document inside it, which is what the manifest
// records and what verifyScoreEvidence re-checks after gunzip.
const storedSha = hash(await readFile(cardReceipt.file));
const evidence = { url: CARD_URL, file: cardReceipt.file, sha256: storedSha, fetched_at: cardReceipt.retrieved_at };
const entries = [], observations = [], kinds = {};
for (const claim of claims) {
  const { identity, value } = claim;
  const family = `deepseek-${identity.slug}`;
  const version = identity.version ?? SNAPSHOT;
  const id = `${family}::${version}`;
  const printedUnit = identity.unit === 'percent' ? `${value}%` : `${value} ${identity.unit}`;
  const protocol = [
    `Vendor-reported by DeepSeek for ${SUBJECT_NAME}, printed as "${claim.label}".`,
    HARNESS[identity.slug] ?? null, SETTING,
    'No independent reproduction is claimed; replace with an independently measured matching-version result when available.',
  ].filter(Boolean).join(' ');
  kinds[family] = 'capability';
  entries.push({
    id, name: identity.name, version, version_status: identity.version ? 'published' : 'snapshot', family,
    category: identity.category,
    one_sentence_description: `${identity.name} result as reported by DeepSeek in the DeepSeek-V4.1-Flash model card; this registry identity preserves the printed version or the card's publication date when none was stated.`,
    scoring: { metric: `Source-published score (${identity.metric})`, unit: identity.unit,
      range: identity.unit === 'percent' ? [0, 100] : [0, null], higher_better: true,
      notes: 'DeepSeek publishes the settings and scaffold but no complete independent reproduction recipe. This identity retains the exact printed label and keeps vendor claims out of measured cohorts and the Composite.' },
    maintainer: identity.maintainer, source_type: 'vendor_report', primary_url: CARD_URL,
    publication_urls: [
      { url: CARD_URL, type: 'vendor_report', role: 'DeepSeek-V4.1-Flash model card containing the vendor-reported result' },
      { url: NEWS_URL, type: 'vendor_report', role: 'DeepSeek release note of 2026-09-10 announcing the model' },
    ],
    how_to_collect: { command: 'python3 scripts/capture-vendor-documents.py URL_LIST.json CAPTURE_DIR',
      format: 'Hugging Face model-card Markdown',
      locator: `"${TABLE_HEADING.replace(/^#+\s*/, '')}" table; row "${claim.label}"; column "${COLUMN}"`,
      version_guard: identity.version ? `Require the printed version ${identity.version} before collecting.`
        : "No version printed; keep this dated snapshot separate from every other release.",
      notes: 'Capture only. Preserve the self_reported basis and the maximum reasoning effort the card states for every instruct result.' },
    update_cadence: { source_schedule: 'No update schedule stated; the card is a release document.',
      check_recommendation: 'Check on a DeepSeek release or when an independent matching-version result appears.' },
    saturated: { value: false, note: 'No verified saturation claim; false records absence of such a claim, not proof that the benchmark is unsaturated.' },
    superseded_by: null, status: 'active', first_seen: '2026-09-20', last_verified: '2026-09-20',
    evidence: [{ ...evidence, excerpt: `${SUBJECT_NAME} — ${claim.label}: ${printedUnit}; vendor model card captured 2026-09-20.` }],
  });
  observations.push({
    id: `self-reported:deepseek-v41-flash-${identity.slug}`, benchmark_id: id,
    subject: { source_id: `${CARD_URL}#${SUBJECT_NAME}`, name: SUBJECT_NAME, model_id: MODEL_ID, variant: 'max', harness: HARNESS_LABEL[identity.slug] ?? null },
    value, unit: identity.unit, basis: 'self_reported',
    source: { url: CARD_URL, retrieved_at: cardReceipt.retrieved_at, published_at: PUBLISHED_AT,
      sha256: cardReceipt.sha256, file: cardReceipt.file,
      locator: `"${TABLE_HEADING.replace(/^#+\s*/, '')}" table row "${claim.label}"; value under "${COLUMN}"` },
    protocol, comparison_key: null,
  });
}
entries.sort((a, b) => a.id.localeCompare(b.id));
observations.sort((a, b) => a.id.localeCompare(b.id));
rejected.sort((a, b) => `${a.label}${a.reason}`.localeCompare(`${b.label}${b.reason}`));

const collections = entries.map((e) => ({ benchmark_id: e.id, status: 'collected', source_url: CARD_URL,
  reason: "DeepSeek's own published result for DeepSeek-V4.1-Flash, re-read from our hash-bound capture of the model card. Vendor claims never enter the Composite." }));

const report = { built_at: new Date().toISOString().slice(0, 19) + 'Z', capture: CAPTURE_DIR,
  card_sha256: cardReceipt.sha256, news_sha256: newsReceipt?.sha256 ?? null,
  claims: claims.map((c) => ({ label: c.label, value: c.value, benchmark_id: `deepseek-${c.identity.slug}::${c.identity.version ?? SNAPSHOT}` })),
  rejected };
console.log(JSON.stringify({ claims: claims.length, entries: entries.length, rejected: rejected.length }, null, 1));

if (!process.argv.includes('--write')) { console.log(JSON.stringify(report, null, 1)); process.exit(0); }

// --- write: registry, self-reported candidates, taxonomy kinds ---------------------------------
const registry = await read('data/raw/benchmarks/registry.json');
const byId = new Map(registry.entries.map((e) => [e.id, e]));
for (const e of entries) byId.set(e.id, e);
registry.entries = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
await writeJSONAtomic('data/raw/benchmarks/registry.json', registry);

const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
const keep = (list, prefix) => list.filter((o) => !String(o.id ?? '').startsWith(prefix));
candidates.observations = [...keep(candidates.observations, 'self-reported:deepseek-v41-flash-'), ...observations]
  .sort((a, b) => a.id.localeCompare(b.id));
candidates.collections = [...candidates.collections.filter((c) => !c.benchmark_id.startsWith('deepseek-')), ...collections]
  .sort((a, b) => a.benchmark_id.localeCompare(b.benchmark_id));
candidates.rejected = [...candidates.rejected.filter((r) => r.source_id !== CARD_URL),
  ...rejected.map((r) => ({ benchmark_id: null, source_id: CARD_URL, reason: `${r.label}: ${r.reason}` }))]
  .sort((a, b) => `${a.benchmark_id}${a.source_id}${a.reason}`.localeCompare(`${b.benchmark_id}${b.source_id}${b.reason}`));
await writeJSONAtomic('data/raw/benchmarks/self-reported-candidates.json', candidates);

const taxonomy = await read('data/benchmark-taxonomy.json');
Object.assign(taxonomy.benchmark_kinds, kinds);
taxonomy.benchmark_kinds = Object.fromEntries(Object.entries(taxonomy.benchmark_kinds));
await writeJSONAtomic('data/benchmark-taxonomy.json', taxonomy);
console.log('written');
