// CR-234: frozen vendor reports still need a daily source check. Exact bytes
// establish that an already reviewed document is unchanged; new bytes establish
// only drift. This module never changes scores, dates, protocols or approvals.
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function frozenVendorEntries({ entries, plan }) {
  const executable = new Set(plan.entries.filter((s) => s.parser || s.refresh === 'manual').map((s) => s.benchmark_id));
  return entries.filter((e) => e.source_type === 'vendor_report' && !executable.has(e.id)
    && e.how_to_collect?.access?.mode !== 'browser_only');
}
export const frozenVendorModule = (entry) => entry.source_type === 'vendor_report'
  && /Vite module JavaScript/i.test(entry.how_to_collect?.format ?? '');
const ref = (r) => ({ url: r.url, file: r.file, sha256: r.sha256, retrieved_at: r.retrieved_at });

export async function checkFrozenVendorSources({ entries, plan, observations, receipts, read = readFile }) {
  const checks = [], verified = new Map();
  const verify = (source) => {
    const key = JSON.stringify([source.file, source.sha256]);
    if (!verified.has(key)) verified.set(key, (async () => {
      if (!source.file || !/^[a-f0-9]{64}$/.test(source.sha256 ?? '')) throw new Error('Frozen vendor source lacks a file/body hash');
      const bytes = gunzipSync(await read(source.file));
      if (hash(bytes) !== source.sha256) throw new Error('Frozen vendor source body hash mismatch');
    })());
    return verified.get(key);
  };
  for (const entry of frozenVendorEntries({ entries, plan })) {
    const common = { id: entry.id, collector: 'frozen-vendor-document' };
    try {
      const rows = observations.filter((r) => r.benchmark_id === entry.id && r.basis === 'self_reported');
      if (!rows.length) throw new Error('No published self-reported observations to bind this source check');
      const sources = new Map(), changed = new Set();
      for (const row of rows) {
        const prior = row.source;
        if (!prior?.url) throw new Error('Published vendor observation lacks its source URL');
        await verify(prior);
        let current;
        if (frozenVendorModule(entry) && prior.url === entry.primary_url) {
          const page = receipts.find((r) => r.url === entry.primary_url);
          if (page?.status !== 200 || page.follow_error) throw new Error(`Vendor module discovery failed: ${page?.follow_error ?? page?.reason ?? 'no page receipt'}`);
          await verify(page);
          const modules = receipts.filter((r) => r.discovered_from === entry.primary_url && !r.follow_marker && r.status === 200);
          if (modules.length !== 1) throw new Error('Vendor source requires exactly one captured module');
          current = modules[0];
        } else current = receipts.find((r) => r.url === prior.url && !r.discovered_from);
        if (current?.status !== 200) throw new Error(`Vendor source capture unavailable: ${prior.url}: ${current?.reason ?? current?.status ?? 'missing receipt'}`);
        await verify(current);
        sources.set(current.url, ref(current));
        if (current.sha256 !== prior.sha256) changed.add(prior.url);
      }
      checks.push({ ...common, status: changed.size ? 'source_changed_retained' : 'checked_unchanged', rows: rows.length,
        reason: changed.size ? 'Current document bytes differ from the reviewed snapshot. Captures are retained for review; published claims, dates and approvals are unchanged.'
          : 'Current document bytes exactly match the evidence behind every published claim. Original observation dates and approvals are retained; no new scores are inferred.',
        changed_source_urls: [...changed], sources: [...sources.values()] });
    } catch (error) { checks.push({ ...common, status: 'retained_after_failure', reason: error.message ?? String(error) }); }
  }
  return checks;
}
