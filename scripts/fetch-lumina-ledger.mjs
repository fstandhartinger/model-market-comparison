#!/usr/bin/env node
// CR-37.2: daily discovery + provenance feed from Lumina Bench's public data ledger.
//
// Lumina is an aggregator (CR-38.4): this collector never writes a score. It keeps one compact record per
// benchmark family in data/raw/lumina-ledger.json (identity, how many results, and whether the cited
// results come from the evaluator, a model vendor or another aggregator), and on every manifest-hash change
// the diff against the previous state. data/lumina-feed-policy.json holds the reviewed host roles and the
// per-family decisions; `--report` prints what the feed means for the catalog.
//
// Access: robots.txt allows everything; the ledger downloads are Lumina's own published files. One small
// manifest request a day; the three tables (≈13 MB) only when the manifest's sourceDataHash changed.
// Fails closed: a manifest shape change, a table whose bytes do not match the manifest's sha256, a row count
// that differs from the manifest, or a family count that shrinks by more than 10 % leaves the previous
// snapshot untouched. So does a new family whose cited results nobody has read yet (see below).
//
//   node scripts/fetch-lumina-ledger.mjs                 live
//   node scripts/fetch-lumina-ledger.mjs --from-dir DIR  same checks on files already downloaded
//   node scripts/fetch-lumina-ledger.mjs --report        summary of the committed snapshot
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { writeJSONAtomic } from '../lib/snapshot.mjs';
import { captureLiveSource } from '../lib/live-source.mjs';
import { LEDGER_BASE, MANIFEST_FILE, TABLES, parseManifest, tableRows, familyIndex, diffFamilies, summarize, CLASS_MEANING } from '../lib/lumina-ledger.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const target = join(root, 'data/raw/lumina-ledger.json');
const policyPath = join(root, 'data/lumina-feed-policy.json');
const pendingPath = join(root, 'data/raw/lumina-ledger.pending-review.json');
const UA = 'BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)';

const readJSON = async (path, fallback = null) => { try { return JSON.parse(await readFile(path, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; } };

async function get(file, fromDir) {
  if (fromDir) return readFile(join(fromDir, file), 'utf8');
  const url = LEDGER_BASE + file;
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(180_000) });
  if ([401, 403, 429].includes(response.status)) throw new Error(`${url}: HTTP ${response.status} — stop, do not retry`);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

export function report(snapshot, policy) {
  const { counts, byClass } = summarize(snapshot.families, policy);
  const lines = [`# Lumina Bench feed — ${snapshot.families.length} families, ledger generated ${snapshot.ledger.generated_at}, checked ${snapshot.checked_at}`, ''];
  for (const [c, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) lines.push(`- **${c}** ${n} — ${CLASS_MEANING[c] || ''}`);
  const unclassified = Object.keys(snapshot.unclassified_hosts || {});
  if (unclassified.length) lines.push('', `Hosts needing a role in data/lumina-feed-policy.json: ${unclassified.join(', ')}`);
  for (const c of ['evaluator_result', 'needs_host_review']) {
    if (!byClass[c]) continue;
    lines.push('', `## ${c}`, '', '| Lumina family | Organisation | Results (evaluator / vendor / aggregator / estimated) | Models | Latest |', '|---|---|---|---|---|');
    for (const f of byClass[c].sort((a, b) => b.models - a.models)) {
      const r = f.by_role;
      lines.push(`| ${f.name} (\`${f.slug}\`) | ${String(f.organisation).slice(0, 40)} | ${r.evaluator} / ${r.vendor} / ${r.aggregator} / ${r.estimated} | ${f.models} | ${f.latest_observed || '—'} |`);
    }
  }
  const change = snapshot.last_change;
  if (change) lines.push('', `Last change detected ${change.detected_at}: +${change.added.length} families, −${change.removed.length}, ${change.changed.length} changed.`);
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const policy = await readJSON(policyPath);
  if (!policy) throw new Error('data/lumina-feed-policy.json missing');
  const previous = await readJSON(target);
  if (args.includes('--report')) {
    if (!previous) throw new Error('no committed snapshot');
    console.log(report(previous, policy));
    return;
  }
  const fromDir = args.includes('--from-dir') ? args[args.indexOf('--from-dir') + 1] : null;
  const now = new Date().toISOString();

  const manifestText = await get(MANIFEST_FILE, fromDir);
  const manifest = parseManifest(manifestText);
  if (!fromDir) await captureLiveSource(LEDGER_BASE + MANIFEST_FILE, manifestText);
  if (previous && previous.ledger.source_data_hash === manifest.sourceDataHash) {
    await writeJSONAtomic(target, { ...previous, checked_at: now });
    console.log(`Lumina ledger unchanged (sourceDataHash ${manifest.sourceDataHash.slice(0, 12)}, generated ${manifest.generatedAt}); no table fetched`);
    return;
  }

  const texts = {};
  for (const [id, file] of Object.entries(TABLES)) {
    texts[id] = await get(file, fromDir);
    // The 12 MB results table is verified against the manifest's hash but not kept as evidence; the manifest is.
    if (!fromDir && id !== 'benchmark-results') await captureLiveSource(LEDGER_BASE + file, texts[id]);
  }
  const definitions = tableRows(texts['benchmark-definitions'], manifest, 'benchmark-definitions');
  const results = tableRows(texts['benchmark-results'], manifest, 'benchmark-results');
  const sources = tableRows(texts.sources, manifest, 'sources');
  const { families, unclassified_hosts } = familyIndex({ definitions, results, sources }, policy);
  if (new Set(families.map((f) => f.slug)).size !== families.length) throw new Error('Lumina definitions: duplicate benchmarkSlug');
  if (previous && families.length < previous.families.length * 0.9) {
    throw new Error(`Lumina definitions shrank from ${previous.families.length} to ${families.length} families — retained for review`);
  }
  const change = diffFamilies(previous?.families, families);
  const snapshot = {
    source: 'Lumina Bench public data ledger — https://luminabench.com/ (downloads/luminabench-ledger-*.json)',
    role: 'Discovery and provenance feed only (CR-37.2, CR-38.4). No score from this file reaches the dataset; values come from the primary evaluator\'s own collector.',
    terms: 'robots.txt: Allow /. No site-wide data licence published; Lumina\'s own /terms calls its terms placeholders. Per-source licence and redistribution status are Lumina\'s own fields and mostly unrecorded.',
    method: 'scripts/fetch-lumina-ledger.mjs: manifest daily; on a sourceDataHash change the benchmark-definitions, benchmark-results and sources tables, each verified against the manifest sha256, column list and record count. Result counts by the role of the cited URL host (data/lumina-feed-policy.json → host_roles); no values kept.',
    checked_at: now,
    changed_at: now,
    ledger: {
      generated_at: manifest.generatedAt,
      source_data_hash: manifest.sourceDataHash,
      source_data_commit_sha: manifest.sourceDataCommitSha ?? null,
      methodology_version: manifest.methodologyVersion ?? null,
      manifest_sha256: createHash('sha256').update(manifestText).digest('hex'),
      table_sha256: Object.fromEntries(Object.values(TABLES).map((file) => [file, manifest.files.find((f) => f.fileName === file).sha256])),
      record_counts: { definitions: definitions.length, results: results.length, sources: sources.length },
    },
    unclassified_hosts,
    last_change: previous ? { detected_at: now, from_hash: previous.ledger.source_data_hash, to_hash: manifest.sourceDataHash, ...change } : null,
    families,
  };
  // A family nobody has read yet must not reach the committed feed: its test would fail the daily build and
  // hold back unrelated publication. The candidate goes to a pending file for a work iteration instead.
  const { counts, byClass } = summarize(families, policy);
  const unread = [...(byClass.evaluator_result || []), ...(byClass.needs_host_review || [])].map((f) => f.slug);
  if (unread.length || Object.keys(unclassified_hosts).length) {
    await writeJSONAtomic(pendingPath, snapshot);
    throw new Error(`retained for review: ${unread.length} families need a decision (${unread.slice(0, 5).join(', ')}), ` +
      `hosts without a role: ${Object.keys(unclassified_hosts).join(', ') || 'none'} — candidate written to data/raw/lumina-ledger.pending-review.json`);
  }
  await writeJSONAtomic(target, snapshot);
  await rm(pendingPath, { force: true });
  console.log(`Lumina ledger ${previous ? 'changed' : 'seeded'}: ${families.length} families, ${results.length} results (generated ${manifest.generatedAt})` +
    (previous ? `; +${change.added.length} −${change.removed.length} ~${change.changed.length}` : ''));
  console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Lumina ledger refresh failed; previous snapshot preserved: ${error.message}`);
    process.exitCode = 1;
  });
}
