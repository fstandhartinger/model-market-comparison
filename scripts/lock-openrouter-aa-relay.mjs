#!/usr/bin/env node
// CR-34.4: capture the unfiltered OpenRouter Benchmarks API response once, validate that
// the relayed Artificial Analysis rows carry a numeric agentic_index for >= 90 models with
// unique display names, store the raw bytes gzipped under daily-evidence, and point the
// `openrouter_aa_relay` ingestion-lock entry at them. Rotating the capture is a reviewed
// change: re-run this script, review the diff, commit.
//
// Same access contract as scripts/fetch-openrouter-benchmarks.mjs: documented public API,
// Bearer key from the environment, 30 req/min / 500 req/day; this runs by hand.
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const lockPath = fileURLToPath(new URL('../data/raw/benchmarks/ingestion-lock.json', import.meta.url));
const key = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
if (!key) throw new Error('OPEN_ROUTER_API_KEY is not set in the environment');
const url = 'https://openrouter.ai/api/v1/benchmarks';
const response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', 'User-Agent': 'BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)' }, signal: AbortSignal.timeout(60000) });
if (!response.ok) throw new Error(`OpenRouter benchmarks HTTP ${response.status}`);
const text = await response.text();
const parsed = JSON.parse(text);
const aa = (parsed.data ?? []).filter((row) => row?.source === 'artificial-analysis' && typeof row?.agentic_index === 'number' && Number.isFinite(row.agentic_index));
const names = new Set(aa.map((row) => row.display_name));
if (names.size !== aa.length) throw new Error('relay carries duplicate AA display names');
if (aa.length < 90) throw new Error(`relay carries only ${aa.length} agentic rows (expected >= 90); refusing to lock a partial capture`);
if (aa.some((row) => !row.display_name || !row.model_permaslug)) throw new Error('agentic row without display name or permaslug');

const sha256 = createHash('sha256').update(text).digest('hex');
const date = new Date().toISOString().slice(0, 10);
const dir = fileURLToPath(new URL(`../data/raw/benchmarks/daily-evidence/${date}-openrouter-aa-relay/`, import.meta.url));
mkdirSync(dir, { recursive: true });
const file = join(dir, `${sha256}.gz`);
writeFileSync(file, gzipSync(text));

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
lock.openrouter_aa_relay = {
  source_url: 'https://openrouter.ai/benchmarks',
  api_url: url,
  snapshot_date: date,
  retrieved_at: new Date().toISOString(),
  source_file: file.replace(/^.*?(?=data\/)/, ''),
  source_sha256: sha256,
  note: 'Hash of the decompressed unfiltered /api/v1/benchmarks response; ingestion refuses the AA agentic rows when the capture no longer matches. Use: CR-34.4 (AA Agentic Index, relayed from Artificial Analysis; AA attribution, relay named). Rotate by re-running scripts/lock-openrouter-aa-relay.mjs and reviewing the diff.',
};
writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
console.log(`Locked ${aa.length} AA agentic rows (${names.size} unique names), as_of ${parsed.meta?.as_of}, sha256 ${sha256.slice(0, 16)}… → ${lock.openrouter_aa_relay.source_file}`);
