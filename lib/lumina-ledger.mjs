// CR-37.2 / CR-38.4: Lumina Bench's public data ledger as a discovery and provenance feed.
// Lumina is an aggregator. Nothing here carries a score: the feed records which benchmark
// families exist, who they say ran each result (by the cited URL's host), and what changed
// since the last manifest hash. Values reach the dataset only through a primary-source
// collector (data/raw/benchmarks/collection-plan.json), never from this file.
import { createHash } from 'node:crypto';

export const LEDGER_BASE = 'https://luminabench.com/downloads/';
export const MANIFEST_FILE = 'luminabench-ledger-manifest.json';
// Only the three tables the feed reads; the ledger's other tables (models, pricing, media) are out of scope.
export const TABLES = {
  'benchmark-definitions': 'luminabench-ledger-benchmark-definitions.json',
  'benchmark-results': 'luminabench-ledger-benchmark-results.json',
  sources: 'luminabench-ledger-sources.json',
};
const REQUIRED_COLUMNS = {
  'benchmark-definitions': ['benchmarkSlug', 'benchmarkName', 'organisation', 'category', 'version', 'lifecycle', 'primarySourceUrl'],
  'benchmark-results': ['resultId', 'modelSlug', 'benchmarkSlug', 'evidenceState', 'observedAt', 'sourceKey', 'sourceUrl'],
  sources: ['sourceKey', 'url', 'licence', 'redistributionStatus'],
};
export const ROLES = ['evaluator', 'vendor', 'aggregator'];

// 2026-09-22: the manifest and the tables answer 404 and Lumina's /data/ page says "Public bulk downloads are
// paused." A 404 alone could be a moved file; only the page's own sentence counts as a pause. While paused the
// feed keeps the last ledger and records the pause — it never rebuilds the ledger from Lumina's model pages.
export const PAUSE_PAGE = 'https://luminabench.com/data/';
export const PAUSE_PHRASE = 'Public bulk downloads are paused.';
const PAUSE_FOLLOW = 'Model pages, charts and source attribution remain available.';
// The exact phrase is the signal; the page's next sentence is kept in the notice only when it is the known one.
export function pauseNotice(html) {
  const text = String(html).replace(/<[^>]*>/g, ' ').replace(/\\"/g, '"').replace(/\s+/g, ' ');
  const at = text.indexOf(PAUSE_PHRASE);
  if (at < 0) return null;
  const rest = text.slice(at + PAUSE_PHRASE.length).trimStart();
  return rest.startsWith(PAUSE_FOLLOW) ? `${PAUSE_PHRASE} ${PAUSE_FOLLOW}` : PAUSE_PHRASE;
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

export function parseManifest(text) {
  let manifest;
  try { manifest = JSON.parse(text); } catch { throw new Error('Lumina manifest: not JSON'); }
  if (!/^1\./.test(String(manifest.ledgerSchemaVersion))) throw new Error(`Lumina manifest: unsupported ledgerSchemaVersion ${manifest.ledgerSchemaVersion}`);
  if (manifest.projection !== 'public') throw new Error(`Lumina manifest: projection ${manifest.projection}, expected public`);
  if (!/^[0-9a-f]{64}$/.test(manifest.sourceDataHash || '')) throw new Error('Lumina manifest: sourceDataHash missing or malformed');
  for (const [id, file] of Object.entries(TABLES)) {
    const table = (manifest.tables || []).find((t) => t.id === id);
    if (!table || !Number.isInteger(table.recordCount) || !Array.isArray(table.columns)) throw new Error(`Lumina manifest: table ${id} missing`);
    const missing = REQUIRED_COLUMNS[id].filter((c) => !table.columns.includes(c));
    if (missing.length) throw new Error(`Lumina manifest: table ${id} lacks ${missing.join(', ')}`);
    const entry = (manifest.files || []).find((f) => f.fileName === file);
    if (!entry || !/^[0-9a-f]{64}$/.test(entry.sha256 || '')) throw new Error(`Lumina manifest: no sha256 for ${file}`);
  }
  return manifest;
}

/** Rows of one table as objects, after proving the bytes are the ones the manifest hashed. */
export function tableRows(text, manifest, id) {
  const file = TABLES[id];
  const expected = manifest.files.find((f) => f.fileName === file).sha256;
  const actual = sha256(text);
  if (actual !== expected) throw new Error(`Lumina ${file}: sha256 ${actual.slice(0, 12)} does not match the manifest's ${expected.slice(0, 12)}`);
  const table = JSON.parse(text);
  const meta = manifest.tables.find((t) => t.id === id);
  if (JSON.stringify(table.columns) !== JSON.stringify(meta.columns)) throw new Error(`Lumina ${file}: columns differ from the manifest`);
  if (!Array.isArray(table.rows) || table.rows.length !== meta.recordCount) throw new Error(`Lumina ${file}: ${table.rows?.length} rows, manifest says ${meta.recordCount}`);
  return table.rows.map((row) => Object.fromEntries(table.columns.map((c, i) => [c, row[i]])));
}

export function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

/** evaluator | vendor | aggregator for a cited URL, or null when the host is not in the reviewed policy. */
export function hostRole(url, policy) {
  const host = hostOf(url);
  if (!host) return null;
  for (const role of ROLES) if ((policy.host_roles[role] || []).includes(host)) return role;
  return null;
}

/**
 * One compact record per benchmark family: identity fields and counts of results by the role of the
 * cited host. `estimated` counts Lumina's own estimates, which are not a result anyone published.
 */
export function familyIndex({ definitions, results, sources }, policy) {
  const sourceByKey = new Map(sources.map((s) => [s.sourceKey, s]));
  const stats = new Map();
  const unclassified = new Map();
  for (const r of results) {
    let s = stats.get(r.benchmarkSlug);
    if (!s) stats.set(r.benchmarkSlug, s = { results: 0, models: new Set(), latest: null, evaluator: 0, vendor: 0, aggregator: 0, estimated: 0, hosts: new Set() });
    s.results += 1;
    s.models.add(r.modelSlug);
    if (r.observedAt && (!s.latest || r.observedAt > s.latest)) s.latest = r.observedAt;
    if (r.evidenceState === 'estimated') { s.estimated += 1; continue; }
    const role = hostRole(r.sourceUrl, policy);
    const host = hostOf(r.sourceUrl) || '(no url)';
    s.hosts.add(host);
    if (role) s[role] += 1;
    else unclassified.set(host, (unclassified.get(host) || 0) + 1);
  }
  const families = definitions.map((d) => {
    const s = stats.get(d.benchmarkSlug);
    const primary = sourceByKey.get(d.primarySourceKey);
    return {
      slug: d.benchmarkSlug,
      name: d.benchmarkName,
      organisation: d.organisation,
      category: d.category,
      version: d.version ?? null,
      lifecycle: d.lifecycle,
      primary_source_url: d.primarySourceUrl ?? null,
      primary_source_licence: primary?.licence ?? null,
      primary_source_redistribution: primary?.redistributionStatus ?? null,
      results: s?.results || 0,
      models: s?.models.size || 0,
      latest_observed: s?.latest || null,
      by_role: { evaluator: s?.evaluator || 0, vendor: s?.vendor || 0, aggregator: s?.aggregator || 0, estimated: s?.estimated || 0 },
      cited_hosts: s ? [...s.hosts].sort() : [],
    };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
  const slugs = new Set(families.map((f) => f.slug));
  const orphans = [...stats.keys()].filter((slug) => !slugs.has(slug));
  if (orphans.length) throw new Error(`Lumina results name ${orphans.length} benchmark slugs without a definition (${orphans.slice(0, 3).join(', ')})`);
  return { families, unclassified_hosts: Object.fromEntries([...unclassified].sort()) };
}

const TRACKED = ['name', 'organisation', 'category', 'version', 'lifecycle', 'primary_source_url', 'results', 'models'];

export function diffFamilies(previous = [], next = []) {
  const before = new Map(previous.map((f) => [f.slug, f]));
  const after = new Map(next.map((f) => [f.slug, f]));
  const added = [...after.keys()].filter((s) => !before.has(s)).sort();
  // A family that disappears upstream is only logged; nothing on the site depends on Lumina keeping it.
  const removed = [...before.keys()].filter((s) => !after.has(s)).sort();
  const changed = [];
  for (const [slug, f] of after) {
    const p = before.get(slug);
    if (!p) continue;
    const fields = TRACKED.filter((k) => JSON.stringify(p[k]) !== JSON.stringify(f[k]));
    if (fields.length) changed.push({ slug, fields });
  }
  return { added, removed, changed };
}

/**
 * The decision for one family. A reviewed entry in policy.family_decisions wins (already in the registry,
 * on hold, excluded, planned); otherwise the class follows mechanically from who the cited results
 * come from, and says what the next step would be.
 */
export function classifyFamily(family, policy) {
  const reviewed = policy.family_decisions[family.slug];
  if (reviewed) return reviewed.decision;
  const r = family.by_role;
  if (!family.results) return 'no_results';
  const unclassified = family.results - r.estimated - r.evaluator - r.vendor - r.aggregator;
  if (unclassified > 0) return 'needs_host_review';
  if (r.evaluator) return 'evaluator_result';
  if (r.vendor) return 'vendor_reported';
  return 'aggregator_only';
}

export const CLASS_MEANING = {
  in_registry: 'The family is already in Benchmark Heaven\'s benchmark registry from a primary source (the entry names the registry ids or dataset fields; a board withheld from display stays withheld).',
  on_hold: 'Not added while a standing hold applies (the entry names it).',
  excluded: 'Deliberately not collected (the entry gives the reason).',
  planned: 'A primary-source collector is planned (data/SCRAPING.md names it).',
  no_results: 'Lumina lists the benchmark but no result for it — nothing to show.',
  evaluator_result: 'At least one cited result comes from the evaluator that ran it: a candidate for a primary-source collector.',
  vendor_reported: 'No cited result comes from an evaluator, and at least one is a model developer reporting its own model: the self-reported route (CR-30.1), labelled as such.',
  aggregator_only: 'Every cited result points at an aggregator page or is a Lumina estimate: Lumina gives no primary value; a primary board must be found first.',
  needs_host_review: 'A cited host is not in the reviewed host policy yet.',
};

export function summarize(families, policy) {
  const counts = {};
  const byClass = {};
  for (const f of families) {
    const c = classifyFamily(f, policy);
    counts[c] = (counts[c] || 0) + 1;
    (byClass[c] ||= []).push(f);
  }
  return { counts, byClass };
}
