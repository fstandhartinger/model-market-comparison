#!/usr/bin/env node
/** Strict completion audit. Aggregate site cells only; exceptions never grant completion. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
function arg(flag, fallback) { const i = args.indexOf(flag); return i < 0 ? fallback : args[i + 1]; }
const repo = path.resolve(arg('--repo', fileURLToPath(new URL('..', import.meta.url))));
const outputArg = arg('--output', null);
const output = outputArg ? path.resolve(outputArg) : null;
const load = (file) => import(pathToFileURL(path.join(repo, file)));
const { listedRadarBoards, listedRadarCategoryView, listedLanguageCells, listedFullAddenda } = await load('scripts/jevbench-radar-spokes.mjs');
const { jevbenchCategoryView, JEVBENCH_LANGUAGE_CELLS_ARTIFACT } = await load('lib/jevbench-categories.mjs');
const registry = listedFullAddenda?.();
const cells = listedLanguageCells ? listedLanguageCells(registry) : JSON.parse(fs.readFileSync(path.join(repo, JEVBENCH_LANGUAGE_CELLS_ARTIFACT), 'utf8'));
const languageKeys = cells.languages.map((l) => l.key);
if (languageKeys.length !== 23 || new Set(languageKeys).size !== 23) throw new Error('Expected all 23 unique language cells');
const boards = listedRadarBoards(registry);
const report = {
  checked_at: new Date().toISOString(), repo, thresholds: { language: 60, topic: 30, usecase: 30 },
  denominator: 'Completed supported responses including reviewed input refusals; operational failures do not count as answered. Official scored n and scores remain unchanged.',
  exceptions_satisfy_completion: false,
  boards: {},
};
for (const [scope, keys] of Object.entries(boards)) {
  if (!keys.length) throw new Error(`Empty board: ${scope}`);
  const view = listedRadarCategoryView ? listedRadarCategoryView(keys, registry) : jevbenchCategoryView('v1.6.1', keys, { supplement: true });
  for (const [dim, expected] of [['topics', 7], ['usecases', 20]]) {
    const cats = view.dims.find((d) => d.key === dim)?.cats;
    if (cats?.length !== expected || new Set(cats.map((c) => c.key)).size !== expected) throw new Error(`${dim}: expected ${expected} spokes`);
  }
  const rows = keys.map((key) => {
    const language = Object.fromEntries(languageKeys.map((k) => {
      const cell = cells.systems[key]?.languages?.[k];
      return [k, { n: Number.isInteger(cell?.coverage_n) && cell.coverage_n >= 0 && cell.coverage_n <= cell.n ? cell.coverage_n : 0, scored_n: cell?.n ?? 0, finite_score: Number.isFinite(cell?.competence) }];
    }));
    const radar = Object.fromEntries(['topics', 'usecases'].map((dim) => [dim, Object.fromEntries(view.dims.find((d) => d.key === dim).cats.map((cat) => {
      const cell = view.systems[key]?.[dim]?.[cat.key];
      return [cat.key, { n: Number.isInteger(cell?.[2]) && cell[2] >= 0 && cell[2] <= cell[1] ? cell[2] : 0, scored_n: cell?.[1] ?? 0, finite_score: Number.isFinite(cell?.[0]), pool_n: view.rowCategoryPoolSizes?.[key]?.[dim]?.[cat.key] ?? cat.n }];
    }))]));
    const gaps = {
      languages: Object.keys(language).filter((k) => language[k].n < 60 || !language[k].finite_score),
      topics: Object.keys(radar.topics).filter((k) => radar.topics[k].n < 30 || !radar.topics[k].finite_score || radar.topics[k].pool_n < 30),
      usecases: Object.keys(radar.usecases).filter((k) => radar.usecases[k].n < 30 || !radar.usecases[k].finite_score || radar.usecases[k].pool_n < 30),
    };
    return { key, language_coverage: cells.systems[key]?.coverage ?? null, category_coverage: view.categoryPools?.[key] ?? null,
      language, radar, gaps, has_interim_exception: Boolean(view.spokeExceptions?.[key]),
      pass_languages: gaps.languages.length === 0, pass_radar: gaps.topics.length + gaps.usecases.length === 0,
      pass: Object.values(gaps).every((g) => !g.length) };
  });
  report.boards[scope] = { listed_rows: keys.length, pass_languages: rows.filter((r) => r.pass_languages).length,
    pass_radar: rows.filter((r) => r.pass_radar).length, pass_both: rows.filter((r) => r.pass).length,
    failing_rows: rows.filter((r) => !r.pass).map((r) => r.key), rows };
}
report.pass = Object.values(report.boards).every((b) => b.pass_both === b.listed_rows);
if (output) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
}
for (const [scope, b] of Object.entries(report.boards)) console.log(`${scope}: ${b.pass_languages}/${b.listed_rows} languages; ${b.pass_radar}/${b.listed_rows} radars; ${b.pass_both}/${b.listed_rows} both`);
console.log(`Strict completion: ${report.pass ? 'PASS' : 'FAIL'}${output ? '; ' + output : ''}`);
process.exitCode = report.pass ? 0 : 1;
