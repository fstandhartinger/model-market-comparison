import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jevWithApiA4Rows, jevbenchScopeArtifact, jevbenchScopeCarry, jevScopeClassifier } from '../lib/jevbench-scope.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { radarSpokeFailures, validateRadarSpokeGate } from '../lib/jevbench-radar-spoke-gate.mjs';
const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
export function listedRadarBoards() {
  const rel = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json');
  const carry = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-dated-carry.json');
  const merged = jevWithApiA4Rows(rel, read('data/jevbench-api-a4-equated.json'), new Map(carry.rows.map((r) => [r.key, r])));
  const isApi = jevScopeClassifier(merged.systems, carry.rows, merged.not_measured);
  return Object.fromEntries(['open', 'api'].map((scope) => {
    const a = jevbenchScopeArtifact(merged, scope, isApi);
    const c = jevbenchScopeCarry(carry, scope === 'open' ? 'all' : 'api', isApi);
    return [scope, [...new Set([...a.systems, ...a.not_measured, ...c.rows].map((r) => r.key))]];
  }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const keys = [...new Set(Object.values(listedRadarBoards()).flat())];
  const view = jevbenchCategoryView('v1.6.1', keys, { supplement: true });
  const file = new URL('../data/jevbench-radar-spoke-exceptions.json', import.meta.url);
  let exceptions = JSON.parse(readFileSync(file));
  if (process.argv.includes('--prune')) {
    const failures = radarSpokeFailures(view, keys);
    exceptions = exceptions.filter((e) => failures[e.key]);
    writeFileSync(file, JSON.stringify(exceptions, null, 2) + '\n');
  }
  const failures = validateRadarSpokeGate(view, keys, exceptions);
  console.log(`${keys.length} listed rows: ${keys.length - Object.keys(failures).length} meet all 27 spokes; ${exceptions.length} explicit exceptions`);
}
