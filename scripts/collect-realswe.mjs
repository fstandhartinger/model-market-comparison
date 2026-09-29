#!/usr/bin/env node
// Capture the Real-SWE leaderboard page and its dataset chunk as hash-bound evidence.
//
// The page is a Next.js app: the dataset lives in one of its `_next/static/chunks`
// bundles. We fetch the page, then probe its chunk list for the bundle that carries
// the task list, and store both response bodies through captureLiveSource so the
// manifest records exactly what was received.
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { REALS_WE_ACCESS_URL } from '../lib/realswe.mjs';
import { writeJSONAtomic } from '../lib/snapshot.mjs';
import { captureLiveSource } from '../lib/live-source.mjs';
import { REALSWE_CAPTURE_TARGET } from '../ops/daily/realswe-check.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const exec = promisify(execFile);

export async function collectRealSwe({ directory, page, chunk, chunkUrl } = {}) {
  if (!directory) throw new Error('Real-SWE collector needs an evidence directory');
  let pageReceipt, chunkReceipt, datasetUrl;
  if (page !== undefined || chunk !== undefined) {
    if (page === undefined || chunk === undefined) throw new Error('Offline Real-SWE capture requires both page and chunk');
    pageReceipt = await captureLiveSource(REALS_WE_ACCESS_URL, page, { directory });
    datasetUrl = chunkUrl ?? `${REALS_WE_ACCESS_URL}#inline-dataset`;
    chunkReceipt = await captureLiveSource(datasetUrl, chunk, { directory });
  } else {
    // All network access uses the same bounded robots/rate/challenge policy as
    // the daily pipeline; the legacy CLI must not provide an unguarded path.
    await mkdir(directory, { recursive: true });
    const temp = await mkdtemp(join(directory, '.capture-input-'));
    try {
      const urls = join(temp, 'urls.json');
      await writeFile(urls, JSON.stringify([REALSWE_CAPTURE_TARGET]));
      await exec('python3', [fileURLToPath(new URL('./capture-benchmark-sources.py', import.meta.url)), urls, directory], { timeout: 1_800_000, maxBuffer: 2_000_000 });
      const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
      const captured = manifest.find((r) => r.url === REALSWE_CAPTURE_TARGET.url);
      if (captured?.status !== 200 || captured.follow_error || captured.marker_matches?.length !== 1) throw new Error(`Real-SWE discovery failed: ${captured?.follow_error ?? captured?.reason ?? 'no unique data chunk'}`);
      const data = manifest.find((r) => r.status === 200 && r.url === captured.marker_matches[0]
        && r.discovered_from === captured.url && r.follow_marker === REALSWE_CAPTURE_TARGET.follow_script_marker);
      if (!data) throw new Error('Real-SWE discovered data chunk capture failed');
      pageReceipt = { ...captured, fetched_at: captured.retrieved_at };
      chunkReceipt = data; datasetUrl = data.url;
    } finally { await rm(temp, { recursive: true, force: true }); }
  }

  const receipt = {
    url: pageReceipt.url ?? REALS_WE_ACCESS_URL,
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
