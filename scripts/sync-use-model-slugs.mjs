#!/usr/bin/env node
// Refreshes data/use-model-slugs.json (benchmark system key -> decisionmodels.io hub slug) from the hub's shared
// mapping (workstream D). Usage: node scripts/sync-use-model-slugs.mjs [path/to/model-map.json]
// Since 27 Oct 2026 the map lives in the private repo fstandhartinger/decisionmodels-hosting (data/model-map.json, built by
// scripts/build_model_map.py from the live board); without an argument it is read via `gh api` from that repo's main.
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const source = process.argv[2];
const map = JSON.parse(source ? await readFile(source, 'utf8')
  : execFileSync('gh', ['api', '-H', 'Accept: application/vnd.github.raw', 'repos/fstandhartinger/decisionmodels-hosting/contents/data/model-map.json'], { encoding: 'utf8', maxBuffer: 64 << 20 }));
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
