#!/usr/bin/env node
// 2026-09-20 (iteration 139, CR-85.2): applies the reviewed LiveBench identity joins to
// data/raw/benchmarks/scores.json exactly the way scripts/ingest-benchmark-scores.mjs would for these
// observations (subject.model_id + join_note from the reviewed entry; the reviewed rule replaces the
// 2026-09-10 display-name bridge for minimax-m3 and qwen3.8-flash-next). A full ingest is deliberately
// NOT run here: it would also re-date the AA protocol strings (methodology capture), which is the daily
// pipeline's to write, not this commit's. Review the diff before committing.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const identityMap = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8'));
const reviewed = new Map(identityMap.entries.filter((e) => e.benchmark_id.startsWith('livebench::')).map((e) => [`${e.benchmark_id}\0${e.source_id}`, e]));
const scores = JSON.parse(readFileSync('data/raw/benchmarks/scores.json', 'utf8'));
const applied = [], skipped = [];
for (const observation of scores.observations) {
  if (!observation.benchmark_id.startsWith('livebench::')) continue;
  const entry = reviewed.get(`${observation.benchmark_id}\0${observation.subject.source_id}`);
  if (!entry) { skipped.push(`${observation.subject.source_id} (unjoined by review)`); continue; }
  const previous = observation.subject.model_id;
  observation.subject.model_id = entry.model_id;
  observation.join_note = `Reviewed identity map ${entry.reviewed_at}: ${entry.rule}`;
  applied.push(`${observation.subject.source_id}: ${previous ?? 'null'} -> ${entry.model_id}`);
}
if (applied.length !== reviewed.size) throw new Error(`applied ${applied.length} of ${reviewed.size} reviewed joins; refusing to write`);
const temporary = `data/raw/benchmarks/scores.json.${process.pid}.tmp`;
writeFileSync(temporary, `${JSON.stringify(scores, null, 2)}\n`);
renameSync(temporary, 'data/raw/benchmarks/scores.json');
console.log(JSON.stringify({ applied: applied.length, unjoinedObservations: skipped.length }));
console.log(applied.join('\n'));
console.log('UNJOINED:', skipped.join(' | '));
