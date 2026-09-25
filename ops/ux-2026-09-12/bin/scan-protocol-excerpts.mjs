#!/usr/bin/env node
// D193/D194. `protocolSourceContent` supplies a primary source to the daily protocol reviewer in
// full while its extracted text is at most 60,000 bytes, and through `reference.excerpt` above that.
// An excerpt that is an editorial locator note rather than a passage of the source therefore fails
// — but only on a day the board's rows changed, which is the only day the review runs. D193 found
// six entries in that state; this scanner asks the question for every registry reference, against a
// real capture directory, using the shipped guard rather than a restatement of it.
//
//   node ops/ux-2026-09-12/bin/scan-protocol-excerpts.mjs <capture-dir> [out.json]
//
// <capture-dir> is any directory holding a `manifest.json` of the daily shape (a run's
// data/raw/benchmarks/daily-evidence/<stamp>/, or a retained set such as
// data/raw/benchmarks/daily-evidence/2026-09-24-d193/). Only references whose URL that manifest
// carries with status 200 can be judged; the rest are reported as `unmeasured`.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, join } from 'node:path';
import { protocolSourceContent } from '../../daily/refresh-benchmarks.mjs';
import { aaMappingApplies } from '../../../lib/benchmark-registry.mjs';

const [dir, out] = process.argv.slice(2);
if (!dir) { console.error('usage: scan-protocol-excerpts.mjs <capture-dir> [out.json]'); process.exit(2); }

const registry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8'));
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
const captures = new Map();
for (const item of Array.isArray(manifest) ? manifest : Object.values(manifest)) {
  if ((item.status ?? 200) === 200 && item.url) captures.set(item.url, join(dir, basename(item.file)));
}

// The same extraction the daily run hands to a review: ops/daily/public-candidate.py text <file>.
const text = (file) => execFileSync('python3', ['ops/daily/public-candidate.py', 'text', file],
  { encoding: 'utf8', maxBuffer: 32_000_000 });
const bodies = new Map();
const body = (url) => {
  if (!bodies.has(url)) bodies.set(url, text(captures.get(url)));
  return bodies.get(url);
};

// An AA benchmark is only reviewed while a mapping in `aa_field_map` still applies to today's
// snapshot (refresh-benchmarks.mjs:277). A retained predecessor of a re-versioned field is past its
// window, so AA having removed its passage is the expected state, not a defect to repair.
const today = new Date().toISOString();
const reviewedToday = (entry) => {
  const mappings = registry.aa_field_map.filter((m) => m.benchmark_id === entry.id);
  return !mappings.length || mappings.some((m) => aaMappingApplies(m, today));
};

const rows = [];
for (const entry of registry.entries) {
  for (const reference of entry.evidence ?? []) {
    // `protocol()`'s own filter: a reference carrying a row digest, or a field locator in the
    // `literal field` form, is never part of a protocol packet and is not asked for a passage.
    if (reference.source_sha256 || /literal field/.test(reference.excerpt ?? '')) continue;
    // Two references can share a URL with different excerpts — an AA benchmark's own description
    // and the Intelligence Index composition table both live on the methodology page. Report the
    // excerpt, or a repair reads as one item when it is two.
    const quote = `${reference.excerpt.replace(/\s+/g, ' ').trim().slice(0, 60)}…`;
    const length = reference.excerpt.length;
    if (!captures.has(reference.url)) { rows.push({ id: entry.id, url: reference.url, quote, length, state: 'unmeasured' }); continue; }
    const extracted = body(reference.url), bytes = Buffer.byteLength(extracted);
    // Does the guard consult the excerpt at all today?
    const demanded = reference.review_content === 'excerpt' || bytes > 60_000;
    let verbatim = true;
    try { protocolSourceContent(entry.id, { ...reference, review_content: 'excerpt' }, extracted); }
    catch { verbatim = false; }
    const reviewed = reviewedToday(entry);
    rows.push({ id: entry.id, url: reference.url, quote, length, bytes, demanded, verbatim, reviewed,
      state: verbatim ? 'ok' : !reviewed ? 'retired' : demanded ? 'failing' : 'latent' });
  }
}

const count = (state) => rows.filter((r) => r.state === state).length;
const report = { capture_dir: dir, generated_at: today, references: rows.length,
  failing: count('failing'), latent: count('latent'), retired: count('retired'), ok: count('ok'),
  unmeasured: count('unmeasured'), rows };
if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

const label = {
  failing: 'FAILING — the guard demands this excerpt today, it is not in the source, and the entry is still reviewed',
  retired: 'retired — no longer matches, and past its aa_field_map window, so it is never reviewed',
  latent: 'latent — under the bound today; fails as soon as the source grows past 60,000 bytes',
};
for (const state of ['failing', 'retired', 'latent']) {
  const group = rows.filter((r) => r.state === state);
  if (!group.length) continue;
  console.log(`\n${label[state]} (${group.length})`);
  for (const r of group.sort((a, b) => b.bytes - a.bytes)) {
    console.log(`  ${String(r.bytes).padStart(9)}  ${r.id}  ${r.url}`);
    console.log(`  ${' '.repeat(9)}  excerpt ${r.length} chars: ${r.quote}`);
  }
}
console.log(`\n${report.references} protocol references · ${report.failing} failing · ${report.retired} retired · ${report.latent} latent · ${report.ok} verbatim · ${report.unmeasured} not in this capture set`);
process.exit(report.failing ? 1 : 0);
