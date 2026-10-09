import { readDecisionBenchmarkManifest, manifestMarkdown } from '../lib/decision-benchmark-manifest.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.argv[2];
if (!out) throw new Error('Usage: node scripts/generate-decision-benchmark-cards.mjs <output directory>');
await mkdir(out, { recursive: true });
const m = await readDecisionBenchmarkManifest();
await writeFile(`${out}/release-manifest.json`, JSON.stringify(m, null, 2) + '\n');
await writeFile(`${out}/current-results.md`, manifestMarkdown(m));
console.log(`Generated cards from ${m.revision} ${m.artifact_sha256}`);
