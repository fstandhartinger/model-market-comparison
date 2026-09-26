#!/usr/bin/env node
// CR-173 (frontiercode lane), 2026-09-26: protocol review of the two new Extended identities. The daily gauntlet replay
// (protocol-review.mjs) could not run for them: OpenRouter answered HTTP 402 (account credits exhausted) for every paid
// worker, and the only free route (Kimi K3 via the local router) cannot be both producer and critic. So this is an owner
// round in the same packet format (buildPacket, PROTOCOL_REVIEW_CRITERIA, criticTaskFor, parseReview from the daily's own
// modules), with the same sources the daily would supply: producer anthropic/claude-opus-5-5 (owner), critic Kimi K3.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildPacket, criticTaskFor, parseReview, normalizeCriteria, sha256, GAUNTLET_LIMITS } from '../../../../daily/gauntlet.mjs';
import { protocolReviewRow, protocolSourceContent, protocolSourceLocator, PROTOCOL_REVIEW_CRITERIA } from '../../../../daily/refresh-benchmarks.mjs';

const D = 'ops/rebuild-2026-09/evidence/phase-09/frontiercode/protocol-extended', E = 'data/raw/benchmarks/daily-evidence/2026-09-26-frontiercode';
const ROUND = Number(process.argv[2] ?? 1), PRODUCER = 'anthropic/claude-opus-5-5';
mkdirSync(D, { recursive: true });
const manifest = JSON.parse(readFileSync(`${E}/manifest.json`, 'utf8'));
const registry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8'));
const text = (file, recipe) => execFileSync('python3', ['ops/daily/public-candidate.py', 'text', file, ...(recipe ? [recipe] : [])], { encoding: 'utf8', maxBuffer: 16_000_000 });
const rows = [], sources = [], seen = new Set();
for (const id of ['frontiercode-extended::1.1', 'frontiercode-extended-cost::1.1']) {
  const entry = registry.entries.find((e) => e.id === id);
  rows.push(protocolReviewRow(entry));
  for (const reference of entry.evidence.filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''))) {
    const key = `${reference.url}#${reference.recipe ?? ''}`; if (seen.has(key)) continue; seen.add(key);
    const receipt = reference.url === 'https://cognition.com/robots.txt'
      ? { url: reference.url, file: `${E}/cognition.com-robots.txt`, sha256: sha256(readFileSync(`${E}/cognition.com-robots.txt`)), retrieved_at: manifest[0].retrieved_at }
      : manifest.find((r) => r.url === reference.url);
    sources.push({ url: receipt.url, sha256: receipt.sha256, retrieved_at: receipt.retrieved_at, locator: protocolSourceLocator(reference),
      content: protocolSourceContent(id, reference, text(receipt.file, reference.recipe)) });
  }
}
const criteria = normalizeCriteria(PROTOCOL_REVIEW_CRITERIA);
const artifactFile = `${D}/artifact.json`;
writeFileSync(artifactFile, JSON.stringify(rows, null, 2) + '\n');
const artifactSha256 = sha256(readFileSync(artifactFile)), artifactId = 'protocol-frontiercode-extended-1.1';
const packetFile = `${D}/packet-r${ROUND}.md`, out = `${D}/review-r${ROUND}.json`;
writeFileSync(packetFile, buildPacket({ artifactId, artifactSha256, round: ROUND, producers: [PRODUCER], criteria, rows, sources, limits: GAUNTLET_LIMITS, layout: null }));
execFileSync('bash', ['ops/rebuild-2026-09/bin/worker.sh', '--critic', '--json', '--max-tokens', '12000', '--producer', PRODUCER, '--file', packetFile, '--out', out,
  criticTaskFor({ artifactId, artifactSha256, round: ROUND })], { stdio: 'inherit', timeout: 900_000, env: { ...process.env, BH_WORKER_FREE_ROUTER: '1', BH_WORKER_FREE_ROUTE_ROLE: 'any' } });
const review = parseReview(readFileSync(out, 'utf8'), { artifactId, artifactSha256, round: ROUND });
const coverage = [...rows.map((r) => r.id), ...criteria.map((c) => c.id)];
const clean = review.verdict === 'pass' && !review.findings.length && !review.missing_evidence.length && coverage.every((id) => review.coverage_checked.includes(id));
console.log(JSON.stringify({ verdict: review.verdict, clean, findings: review.findings, missing: review.missing_evidence }, null, 1));
