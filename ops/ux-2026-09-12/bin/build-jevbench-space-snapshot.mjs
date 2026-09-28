#!/usr/bin/env node
// Build the Hugging Face Space's committed fallback `snapshot.json` from a published JevBench
// release artifact.
//
// Why this exists: the Space (`benchmarkheaven/JevBench`) fetches the live release API and falls
// back to a committed `snapshot.json` only when that fetch is blocked. Until now that file was
// written by hand at publication time, so when a release's bytes were later amended — CR-170's
// display-only rename of the Autoloops row reached the v1.4.2 artifact on 25 Sep, a day after the
// Space snapshot was taken — the fallback kept the retired name while the live path served the new
// one. That drift is defect D237. A snapshot that is *derived* cannot drift: re-run this and commit.
//
// The snapshot is a pure projection of the artifact. Nothing is computed, rounded or restated here;
// every value is copied. Sealed and public item content is never read (the artifact carries none),
// and only the ranked rows are published, which is what the Space's own caption says.
//
// Usage: node ops/ux-2026-09-12/bin/build-jevbench-space-snapshot.mjs <out.json> [--revision v1.4.2]
//                                                                    [--source <url-or-file>]
// Default source: https://benchmarkheaven.com/api/jevbench/<revision>, i.e. the bytes the Space
// itself fetches. Prints the row count and the sha256 of what it wrote.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const outPath = args.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
if (!outPath) {
  console.error('usage: build-jevbench-space-snapshot.mjs <out.json> [--revision v1.4.2] [--source <url-or-file>]');
  process.exit(2);
}
const revision = flag('revision') || 'v1.4.2';
const source = flag('source') || `https://benchmarkheaven.com/api/jevbench/${revision}`;

const art = /^https?:/.test(source)
  ? await (async () => {
      const res = await fetch(source, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${source} -> HTTP ${res.status}`);
      return res.json();
    })()
  : JSON.parse(readFileSync(source, 'utf8'));

if (art.revision !== revision) {
  console.error(`refusing: ${source} carries revision ${art.revision}, not ${revision}`);
  process.exit(1);
}

const systems = (art.systems || [])
  .filter((s) => s.ranked)
  .sort((a, b) => a.rank - b.rank)
  .map((s) => ({
    rank: s.rank,
    display: s.display,
    class: s.class,
    licence: s.licence,
    repo: s.repo ?? null,
    jevbench_score: s.jevbench_score,
    axes: {
      intelligence: s.axes.intelligence,
      calibration: s.axes.calibration,
      speed: s.axes.speed,
      cost: s.axes.cost,
    },
    api_flag: s.api_flag,
    cost_usd_per_1000: (s.cost || {}).usd_per_1000,
  }));

const snapshot = {
  benchmark: art.benchmark,
  revision: art.revision,
  generated_utc: art.generated_utc,
  score_one_liner: art.score_one_liner,
  axis_weights: art.axis_weights,
  top_five_note: art.top_five_note,
  systems,
};

const body = `${JSON.stringify(snapshot, null, 2)}\n`;
writeFileSync(outPath, body);
console.log(`${outPath}: ${systems.length} ranked rows from ${source} (${art.revision}, generated ${art.generated_utc})`);
console.log(`sha256 ${createHash('sha256').update(body).digest('hex')}`);
