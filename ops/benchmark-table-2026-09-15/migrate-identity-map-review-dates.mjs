#!/usr/bin/env node
// One-time migration for the per-entry review date schema. The identity map used to carry
// only reviewed_at=2026-09-16, so recover each existing join's first committed map date from
// repository history instead of re-dating old reviews to the migration day.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'data/raw/benchmarks/identity-map.json';
const map = JSON.parse(readFileSync(file, 'utf8'));
delete map.generated_at;
const key = (entry) => `${entry.benchmark_id}\0${entry.source_id}\0${entry.model_id}`;
const firstSeen = new Map();
const history = execFileSync('git', ['log', '--reverse', '--format=%H %aI', '--', file], { encoding: 'utf8' }).trim();
for (const line of history ? history.split('\n') : []) {
  const [commit, date] = line.split(' ');
  const old = JSON.parse(execFileSync('git', ['show', `${commit}:${file}`], { encoding: 'utf8' }));
  for (const entry of old.entries) if (!firstSeen.has(key(entry))) firstSeen.set(key(entry), date.slice(0, 10));
}
for (const entry of map.entries) {
  const reviewedAt = entry.reviewed_at ?? firstSeen.get(key(entry)) ?? map.reviewed_at;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) throw new Error(`Cannot recover review date for ${key(entry)}`);
  entry.reviewed_at = reviewedAt;
}
if (map.entries.some((entry) => !entry.reviewed_at)) throw new Error('Migration left an entry without reviewed_at');
writeFileSync(file, JSON.stringify(map, null, 2) + '\n');
console.log(JSON.stringify({ entries: map.entries.length, dates: [...new Set(map.entries.map((entry) => entry.reviewed_at))].sort() }));
