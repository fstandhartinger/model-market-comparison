#!/usr/bin/env node
// Capture the Real-SWE leaderboard page and its dataset chunk as hash-bound evidence.
//
// The page is a Next.js app: the dataset lives in one of its `_next/static/chunks`
// bundles. We fetch the page, then probe its chunk list for the bundle that carries
// the task list, and store both response bodies through captureLiveSource so the
// manifest records exactly what was received.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { REALS_WE_ACCESS_URL } from '../lib/realswe.mjs';
import { writeJSONAtomic } from '../lib/snapshot.mjs';
import { captureLiveSource } from '../lib/live-source.mjs';

const USER_AGENT = 'BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)';
const CHUNK_MARKER = 'entitlement-overage-lines';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function get(url, fetcher) {
  const response = await fetcher(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Real-SWE fetch HTTP ${response.status} for ${url}`);
  return response.text();
}

export async function collectRealSwe({ directory, fetcher = fetch, page, chunk, chunkUrl } = {}) {
  if (!directory) throw new Error('Real-SWE collector needs an evidence directory');
  const html = page ?? await get(REALS_WE_ACCESS_URL, fetcher);
  const pageReceipt = await captureLiveSource(REALS_WE_ACCESS_URL, html, { directory });

  let dataset = chunk;
  let datasetUrl = chunkUrl ?? null;
  if (dataset === undefined) {
    const paths = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/chunks\/[^"]+?\.js(?:\?[^"]*)?)"/g)].map((m) => m[1]))];
    if (!paths.length) throw new Error('Real-SWE: page references no Next.js chunks');
    for (const path of paths) {
      const url = new URL(path, REALS_WE_ACCESS_URL).href;
      const body = await get(url, fetcher);
      if (body.includes(CHUNK_MARKER)) { dataset = body; datasetUrl = url; break; }
    }
    if (dataset === undefined) throw new Error('Real-SWE: no chunk carried the dataset marker');
  }
  const chunkReceipt = await captureLiveSource(datasetUrl ?? `${REALS_WE_ACCESS_URL}#inline-dataset`, dataset, { directory });

  const receipt = {
    url: REALS_WE_ACCESS_URL,
    retrieved_at: pageReceipt.fetched_at,
    source_file: pageReceipt.file,
    source_sha256: pageReceipt.sha256,
    source_file_sha256: hash(await readFile(pageReceipt.file)),
    chunk_url: datasetUrl,
    chunk_file: chunkReceipt.file,
    chunk_sha256: chunkReceipt.sha256,
    chunk_file_sha256: hash(await readFile(chunkReceipt.file)),
  };
  return receipt;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (flag) => { const at = process.argv.indexOf(flag); return at < 0 ? undefined : process.argv[at + 1]; };
  const directory = arg('--dir') ?? `data/raw/benchmarks/daily-evidence/${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const local = arg('--page');
  const localChunk = arg('--chunk');
  const read = async (path) => path === undefined ? undefined : readFile(path, 'utf8');
  collectRealSwe({ directory, page: await read(local), chunk: await read(localChunk), chunkUrl: arg('--chunk-url') }).then(async (receipt) => {
    if (arg('--lock-out')) await writeJSONAtomic(arg('--lock-out'), receipt);
    console.log(JSON.stringify(receipt, null, 2));
  }).catch((error) => { console.error(`REAL-SWE COLLECT FAILED: ${error.message}`); process.exitCode = 1; });
}
