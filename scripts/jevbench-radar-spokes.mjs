import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jevWithApiA4Rows, jevbenchScopeArtifact, jevbenchScopeCarry, jevScopeClassifier } from '../lib/jevbench-scope.mjs';
import { jevbenchCategoryView, withLiveCategoryCells, JEVBENCH_LANGUAGE_CELLS_ARTIFACT } from '../lib/jevbench-categories.mjs';
import { radarSpokeFailures, validateRadarSpokeGate } from '../lib/jevbench-radar-spoke-gate.mjs';
import { API_FULL_ADDENDA_PATH, validateApiFullAddenda, withApiFullAddenda, withApiFullAddendumCategories } from '../lib/jevbench-api-full-addenda.mjs';
const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
export const listedFullAddenda = () => validateApiFullAddenda(read(API_FULL_ADDENDA_PATH));
export function listedRadarBoards(registry = listedFullAddenda()) {
  const rel = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json');
  const carry = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-dated-carry.json');
  const merged = withApiFullAddenda(jevWithApiA4Rows(rel, read('data/jevbench-api-a4-equated.json'), new Map(carry.rows.map((r) => [r.key, r]))), registry);
  const isApi = jevScopeClassifier(merged.systems, carry.rows, merged.not_measured);
  return Object.fromEntries(['open', 'api'].map((scope) => {
    const a = jevbenchScopeArtifact(merged, scope, isApi);
    const c = jevbenchScopeCarry(carry, scope === 'open' ? 'all' : 'api', isApi);
    return [scope, [...new Set([...a.systems, ...a.not_measured, ...c.rows].map((r) => r.key))]];
  }));
}
/** Use the same admitted full-addendum cells as the page, including thin/missing cells. */
export function listedRadarCategoryView(keys, registry = listedFullAddenda()) {
  const base = withLiveCategoryCells(read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json'));
  return jevbenchCategoryView('v1.6.1', keys, { artifact: withApiFullAddendumCategories(base, registry) });
}
export function listedLanguageCells(registry = listedFullAddenda()) {
  validateApiFullAddenda(registry);
  const base = read(JEVBENCH_LANGUAGE_CELLS_ARTIFACT);
  const systems = { ...base.systems };
  for (const entry of registry.entries) {
    if (systems[entry.key]) throw new Error(`Full-addendum language row cannot override ${entry.key}`);
    systems[entry.key] = {
      coverage: [...new Set(entry.coverage.languages.map(c => c.pool))].join('; '),
      languages: Object.fromEntries(entry.coverage.languages.map(c => [c.key, {
        n: c.n, coverage_n: c.coverage_n ?? c.answered_ok, competence: c.competence,
      }])),
    };
  }
  return { ...base, systems };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const registry = listedFullAddenda();
  const keys = [...new Set(Object.values(listedRadarBoards(registry)).flat())];
  const view = listedRadarCategoryView(keys, registry);
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
