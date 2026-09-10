#!/usr/bin/env node
// Reuse a politely fetched AA model-page response. No additional network request.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseAaBenchmarkFields, assertAaBenchmarkContinuity } from '../lib/aa-benchmark-fields.mjs';
import { writeJSONAtomic } from '../lib/snapshot.mjs';

const [htmlPath, receiptPath, target = 'data/raw/benchmarks/aa-observed-fields.json'] = process.argv.slice(2);
if (!htmlPath || !receiptPath) throw new Error('Usage: node scripts/extract-aa-benchmark-fields.mjs MODEL_PAGE.html SOURCE_RECEIPT.json [OUTPUT.json]');
const html = await readFile(htmlPath, 'utf8');
const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
const sha = createHash('sha256').update(html).digest('hex');
if (receipt.sha256 !== sha || receipt.status !== 200) throw new Error('AA source receipt does not match successful response');
let previous = null;
try { previous = JSON.parse(await readFile(target, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const snapshot = parseAaBenchmarkFields(html, { source_url: receipt.url, collected_at: receipt.fetched_at, source_sha256: sha, minimumRows: Math.max(400, previous?.count ?? 0) });
assertAaBenchmarkContinuity(previous, snapshot);
await writeJSONAtomic(target, snapshot);
console.log(`AA benchmark fields: ${snapshot.count} exact rows; ${snapshot.inventory.filter((f) => f.numeric).length} numeric source fields`);
