// Same-run handoff of guarded captures. This is not an approval cache.
import { readFile, realpath } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { writeJSONAtomic } from '../../lib/snapshot.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fileFor = (runDir) => join(runDir, 'reports', 'benchmark-captures.json');
const binding = (runDir, inputs) => ({ run_dir: resolve(runDir), checkout: resolve('.'), inputs_sha256: hash(JSON.stringify(inputs)) });

async function verifyFiles(state) {
  const evidence = await realpath(state.evidenceDir);
  const allowed = resolve('data/raw/benchmarks/daily-evidence') + sep;
  if (!evidence.startsWith(allowed)) throw new Error('Benchmark capture directory outside staged evidence');
  for (const receipt of state.receipts) {
    if (!receipt.file) {
      if (receipt.status === 200) throw new Error('Successful benchmark capture has no body');
      continue;
    }
    const path = await realpath(receipt.file);
    if (!path.startsWith(evidence + sep)) throw new Error('Benchmark capture body outside its evidence directory');
    const bytes = await readFile(path);
    if (receipt.body_sha256 !== hash(bytes)) throw new Error('Benchmark capture compressed-body hash changed');
    if (receipt.status === 200 && receipt.sha256 !== hash(gunzipSync(bytes))) throw new Error('Benchmark capture primary-body hash mismatch');
  }
}

export async function saveCaptureState({ runDir, inputs, evidenceDir, receipts, checks }) {
  const frozen = [];
  for (const receipt of receipts) frozen.push({ ...receipt,
    ...(receipt.file ? { body_sha256: hash(await readFile(receipt.file)) } : {}) });
  const state = { schema: 1, ...binding(runDir, inputs), evidenceDir, receipts: frozen, checks };
  await verifyFiles(state);
  await writeJSONAtomic(fileFor(runDir), state);
}

export async function loadCaptureState({ runDir, inputs }) {
  let state;
  try { state = JSON.parse(await readFile(fileFor(runDir), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const expected = binding(runDir, inputs);
  if (state.schema !== 1 || Object.entries(expected).some(([key, value]) => state[key] !== value)
      || !Array.isArray(state.receipts) || !Array.isArray(state.checks)) throw new Error('Benchmark capture handoff belongs to different inputs or run');
  await verifyFiles(state);
  return state;
}
