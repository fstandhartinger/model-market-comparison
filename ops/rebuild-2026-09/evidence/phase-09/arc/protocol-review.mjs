// CR-173 (arc lane): replay the daily protocol arm for arc-agi::1 / arc-agi::2 on the corrected registry
// entries, with exactly the daily's row form, source-content rule and criteria (ops/daily/refresh-benchmarks.mjs).
// Receipts are today's captures (results/policy/arc-agi pages captured by this lane; the leaderboard page copied
// from the 2026-09-26 daily run). Usage: node <this> arc-agi::1 [arc-agi::2]
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { protocolReviewRow, protocolSourceContent, protocolSourceLocator, PROTOCOL_REVIEW_CRITERIA } from '../../../../daily/refresh-benchmarks.mjs';
import { reviewArtifact } from '../../../../daily/gauntlet.mjs';
const exec = promisify(execFile);
const E = 'ops/rebuild-2026-09/evidence/phase-09/arc/';
const receipts = new Map();
for (const f of [E + 'captures/manifest.json', E + 'leaderboard-json/manifest.json'])
  for (const r of JSON.parse(await readFile(f, 'utf8'))) if (r.status === 200) receipts.set(r.url, r);
const registry = JSON.parse(await readFile('data/raw/benchmarks/registry.json', 'utf8'));
for (const id of process.argv.slice(2)) {
  const entry = registry.entries.find((e) => e.id === id);
  const references = (entry.evidence ?? []).filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''));
  const sources = [];
  for (const reference of references) {
    const receipt = receipts.get(reference.url);
    if (!receipt) throw new Error(`no capture for ${reference.url}`);
    const { stdout } = await exec('python3', ['ops/daily/public-candidate.py', 'text', receipt.file], { maxBuffer: 16_000_000 });
    const content = protocolSourceContent(id, reference, stdout);
    if (Buffer.byteLength(content) > 60_000) throw new Error('over bound');
    sources.push({ url: receipt.url, file: receipt.file, sha256: receipt.sha256, retrieved_at: receipt.retrieved_at, published_at: null,
      content, locator: protocolSourceLocator(reference) });
  }
  const reviewed = await reviewArtifact({ runDir: E + 'protocol-review', artifactId: `protocol-${id}`, rows: [protocolReviewRow(entry)],
    sources, criteria: PROTOCOL_REVIEW_CRITERIA });
  console.log(JSON.stringify({ id, accepted: reviewed.accepted, fingerprints: reviewed.fingerprints.length, errors: reviewed.errors }));
}
