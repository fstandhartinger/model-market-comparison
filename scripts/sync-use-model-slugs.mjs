#!/usr/bin/env node
// Refreshes data/use-model-slugs.json (benchmark system key -> decisionmodels.io hub slug) from the hub's shared
// mapping (workstream D). Usage: node scripts/sync-use-model-slugs.mjs [path/to/model-map.json]
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';

const source = process.argv[2] ?? path.join(homedir(), 'jobs/decisionmodels-program-20261009/model-map.json');
const map = JSON.parse(await readFile(source, 'utf8'));
if (map.schema !== 'decisionmodels-model-map/1') throw new Error(`unexpected schema ${map.schema}`);
const out = { source_schema: map.schema, generated_utc: map.generated_utc, jevbench: {}, imagejevbench: {} };
for (const [slug, model] of Object.entries(map.models)) {
  for (const bench of ['jevbench', 'imagejevbench']) {
    const key = model.benchmarks?.[bench]?.key;
    if (key) out[bench][key] = slug;
  }
}
for (const bench of ['jevbench', 'imagejevbench']) out[bench] = Object.fromEntries(Object.entries(out[bench]).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(new URL('../data/use-model-slugs.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
console.log(`jevbench ${Object.keys(out.jevbench).length}, imagejevbench ${Object.keys(out.imagejevbench).length}`);
