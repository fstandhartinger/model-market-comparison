import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('completion refuses thin cells even with an interim exception, and accepts fully measured cells', () => {
  const root = mkdtempSync(join(tmpdir(), 'jevbench-completion-'));
  try {
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'lib'));
    writeFileSync(join(root, 'scripts/jevbench-radar-spokes.mjs'),
      'export const listedRadarBoards = () => ({open:["row"],api:["row"]});');
    const languages = Array.from({ length: 23 }, (_, i) => ({ key: `lang${i}` }));
    function fixture(thin) {
      const dims = [['topics', 7], ['usecases', 20]].map(([key, n]) => ({key,
        cats: Array.from({ length: n }, (_, i) => ({key: `${key}${i}`, n: 100}))}));
      const row = Object.fromEntries(dims.map((d) => [d.key,
        Object.fromEntries(d.cats.map((c, i) => [c.key, [0, 100, thin && d.key === 'usecases' && i === 0 ? 29 : 30]]))]));
      const view = {dims, systems:{row}, spokeExceptions:{row:{reason:'Interim provider failure',since:'2026-10-08'}}};
      writeFileSync(join(root, 'lib/jevbench-categories.mjs'),
        `export const JEVBENCH_LANGUAGE_CELLS_ARTIFACT='language.json';\nexport const jevbenchCategoryView=()=>(${JSON.stringify(view)});`);
      writeFileSync(join(root, 'language.json'), JSON.stringify({languages, systems:{row:{languages:
        Object.fromEntries(languages.map((l, i) => [l.key, {competence:0,n:100,coverage_n:thin && i === 0 ? 59 : 60}]))}}}));
    }
    const run = () => spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/jevbench-full-coverage.mjs', import.meta.url)),
      '--repo', root, '--output', join(root, 'report.json')], {encoding:'utf8'});
    fixture(true);
    let result = run();
    assert.equal(result.status, 1, result.stderr);
    let report = JSON.parse(readFileSync(join(root, 'report.json')));
    assert.equal(report.pass, false);
    assert.equal(report.exceptions_satisfy_completion, false);
    assert.deepEqual(report.boards.api.rows[0].gaps.languages, ['lang0']);
    assert.deepEqual(report.boards.api.rows[0].gaps.usecases, ['usecases0']);
    fixture(false);
    result = run();
    assert.equal(result.status, 0, result.stderr);
    report = JSON.parse(readFileSync(join(root, 'report.json')));
    assert.equal(report.pass, true);
    const legacy = JSON.parse(readFileSync(join(root, 'language.json')));
    delete legacy.systems.row.languages.lang0.coverage_n;
    writeFileSync(join(root, 'language.json'), JSON.stringify(legacy));
    result = run();
    assert.equal(result.status, 1, 'scored count alone cannot prove answered coverage');
    report = JSON.parse(readFileSync(join(root, 'report.json')));
    assert.deepEqual(report.boards.api.rows[0].gaps.languages, ['lang0']);
    legacy.systems.row.languages.lang0.coverage_n = 101;
    writeFileSync(join(root, 'language.json'), JSON.stringify(legacy));
    assert.equal(run().status, 1, 'answered count cannot exceed scored observations');
  } finally { rmSync(root, {recursive:true,force:true}); }
});
