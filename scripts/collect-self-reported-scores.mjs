#!/usr/bin/env node
// Deterministic, offline: turns the scout extraction into registry candidates, but only where our own
// capture of the primary document confirms the number. Re-run after a new capture or a widened
// identity map; the output is a pure function of the retained evidence.
//
// Two populations share the output file. This script owns one of them — everything the 2026-09-15
// scout job found — and rebuilds it from scratch on every run. The other is the release documents
// ingested by hand since (CR-98's Step-5 launch table, CR-85.2's DeepSeek model card), which the
// locked scout extraction cannot produce and which a rebuild would therefore delete. Those are
// listed by URL in data/raw/benchmarks/self-reported/carried-documents.json and are carried through
// here, each one re-checked against its own retained capture first, so the file stays a pure
// function of the retained evidence either way.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { writeJSONAtomic } from '../lib/snapshot.mjs';
import { mapIdentity, verifyRow, buildObservation, carryReviewedDocuments } from '../lib/self-reported-vendor.mjs';

const read = async (p) => JSON.parse(await readFile(p, 'utf8'));
const hash = (b) => createHash('sha256').update(b).digest('hex');

const identityMap = await read('data/raw/benchmarks/self-reported-identity-map.json');
const registry = await read('data/raw/benchmarks/registry.json');
const entries = new Map(registry.entries.map((e) => [e.id, e]));
const models = new Set((await read('data/dataset.json')).models.map((m) => m.id));
const lock = await read('data/raw/benchmarks/self-reported/lock.json');

const scoutBytes = gunzipSync(await readFile(identityMap.source.file));
if (hash(scoutBytes) !== lock.scout_sha256) throw new Error('Scout extraction changed: review the new rows before accepting scores');
const rows = scoutBytes.toString('utf8').trim().split('\n').map((l) => JSON.parse(l));

const manifest = await read(`${lock.capture_dir}/manifest.json`);
const captures = new Map();
for (const receipt of manifest) {
  if (receipt.status !== 200) continue;
  const stored = await readFile(receipt.file);
  if (hash(gunzipSync(stored)) !== receipt.sha256) throw new Error(`Capture changed: ${receipt.file}`);
  captures.set(receipt.url, { ...receipt, text: gunzipSync(stored).toString('utf8') });
}

const observations = [], rejected = [], collections = [];
const seen = new Set();
for (const row of rows) {
  if (row.basis_hint !== 'vendor_claim_own_model') continue;
  const mapEntry = mapIdentity(row, identityMap);
  if (!mapEntry) continue;
  const entry = entries.get(mapEntry.benchmark_id);
  const reject = (reason) => rejected.push({ benchmark_id: mapEntry.benchmark_id, source_id: `${row.source_url}#${row.model_name_as_written}`, reason });
  if (!entry) { reject(`Identity map names an unknown registry entry ${mapEntry.benchmark_id}`); continue; }
  const capture = captures.get(row.source_url);
  if (!capture) { reject(`No retained capture of ${row.source_url}; the claim is not re-verifiable offline.`); continue; }
  const verification = verifyRow(row, capture.text);
  if (!verification.ok) { reject(`${row.model_name_as_written} / ${row.benchmark_name_as_written}: ${verification.reason} (${row.source_url})`); continue; }
  const modelId = row.model_id && row.model_id !== 'unmapped' && models.has(row.model_id) ? row.model_id : null;
  const observation = buildObservation(row, { entry, mapEntry, capture, modelId, verification });
  const withheld = (identityMap.withheld ?? []).find((w) => w.id === observation.id);
  if (withheld) { reject(`Withheld by review: ${withheld.reason}`); continue; }
  // Two workers reading the same published cell is one claim, not two. A second document reporting
  // the same model is a separate claim and stays.
  const cell = `${observation.benchmark_id}\0${row.source_url}\0${observation.subject.name}\0${observation.value}`;
  if (seen.has(observation.id) || seen.has(cell)) { reject(`Duplicate extraction of one published cell: ${observation.benchmark_id} / ${observation.subject.name} in ${row.source_url}`); continue; }
  seen.add(observation.id);
  seen.add(cell);
  observations.push(observation);
}
for (const id of new Set(observations.map((o) => o.benchmark_id))) {
  collections.push({ benchmark_id: id, status: 'collected', source_url: entries.get(id).primary_url,
    reason: `Self-reported vendor results re-verified against our own captures of the release documents (${identityMap.reviewed_at} identity map). Vendor claims never enter the Composite.` });
}
observations.sort((a, b) => a.id.localeCompare(b.id));
rejected.sort((a, b) => `${a.benchmark_id}${a.source_id}${a.reason}`.localeCompare(`${b.benchmark_id}${b.source_id}${b.reason}`));
collections.sort((a, b) => a.benchmark_id.localeCompare(b.benchmark_id));

// The hand-ingested release documents: carried through, never rebuilt, never silently dropped.
const carriedDocuments = (await read('data/raw/benchmarks/self-reported/carried-documents.json')).documents;
const previous = await read('data/raw/benchmarks/self-reported-candidates.json').catch((e) => {
  if (e.code === 'ENOENT') return { observations: [], collections: [], rejected: [] };
  throw e;
});
const carried = carryReviewedDocuments(previous, carriedDocuments, new Set(observations.map((o) => o.id)));
// A carried row is only as good as the capture behind it; re-check that before it survives a rebuild.
for (const o of carried.observations) {
  const stored = await readFile(o.source.file);
  if (hash(o.source.file.endsWith('.gz') ? gunzipSync(stored) : stored) !== o.source.sha256) {
    throw new Error(`Carried row no longer matches its retained capture: ${o.id}`);
  }
}
observations.push(...carried.observations);
collections.push(...carried.collections);
rejected.push(...carried.rejected);
observations.sort((a, b) => a.id.localeCompare(b.id));
rejected.sort((a, b) => `${a.benchmark_id}${a.source_id}${a.reason}`.localeCompare(`${b.benchmark_id}${b.source_id}${b.reason}`));
collections.sort((a, b) => a.benchmark_id.localeCompare(b.benchmark_id));

await writeJSONAtomic('data/raw/benchmarks/self-reported-candidates.json', { schema_version: 1, observations, collections, rejected });
console.log(JSON.stringify({ observations: observations.length, matched: observations.filter((o) => o.subject.model_id).length,
  unmatched: observations.filter((o) => !o.subject.model_id).length, rejected: rejected.length,
  benchmarks: [...new Set(observations.map((o) => o.benchmark_id))].length,
  carried: carried.observations.length, carried_documents: carriedDocuments.length }));
