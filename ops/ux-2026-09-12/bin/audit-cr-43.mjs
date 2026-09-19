#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRevalidationReport } from '../../../lib/cr43-revalidation.mjs';

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function load(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const publishedFile = arg('--published', path.join(root, 'data/raw/benchmarks/scores.json'));
const candidateFile = arg('--candidate', null);
const publicPublishedFile = arg('--public-published', path.join(root, 'data/raw/benchmarks/public-observations.json'));
const publicCandidateFile = arg('--public-candidate', null);
const outFile = arg('--out', null);
if (!candidateFile || !publicCandidateFile || !outFile) {
  console.error('usage: audit-cr-43.mjs --candidate FILE --public-candidate FILE --out FILE [--published FILE --public-published FILE]');
  process.exit(2);
}
const report = createRevalidationReport({
  root,
  published: load(publishedFile),
  candidate: load(candidateFile),
  publicPublished: load(publicPublishedFile),
  publicCandidate: load(publicCandidateFile),
});
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, blockers: report.blockers.length, out: outFile }));
if (report.status !== 'pass') process.exitCode = 1;
