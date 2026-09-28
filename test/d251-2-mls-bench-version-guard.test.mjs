import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

// D251.2 (iteration 266). The daily retained `mls-bench-lite::30-tasks` for days because the *prose*
// version_guard demanded "a harness parenthesis that agrees with the stated effort" on every chart key,
// while the board — unchanged since the 2026-09-22 capture this entry was registered against — serves
// keys with no parenthesis at all (`Qwen3.8-Max-0902|Claude Code`, effort "") and one that qualifies the
// effort (`Claude Fable 5|Claude Code (max effort, with fallback)`). The collector
// (`collect-public-benchmarks.py`, `mls_bench_lite_board`) always enforced the right rule: a parenthesis
// exactly when an effort is stated, opening with that effort word. A reviewer reads the prose, not the
// code, so the prose had to be re-derived from the board.
//
// This test pins the prose against the board's own registered capture: the guard must describe every key
// shape the capture holds, and may never again be narrower than the source it guards.

const ID = 'mls-bench-lite::30-tasks';
const readJson = async (p) => JSON.parse(await readFile(new URL(`../${p}`, import.meta.url), 'utf8'));

const plan = await readJson('data/raw/benchmarks/collection-plan.json');
const registry = await readJson('data/raw/benchmarks/registry.json');
const planEntry = plan.entries.find((e) => e.benchmark_id === ID);
const regEntry = registry.entries.find((e) => e.id === ID);
assert.ok(planEntry && regEntry, 'the plan and the registry both carry the entry');

const page = gunzipSync(await readFile(new URL(`../${planEntry.source.file}`, import.meta.url))).toString('utf8');
// The board streams its chart inside the Next.js flight payload, so the JSON is escaped once.
const unescaped = page.replaceAll('\\"', '"');
const rows = [...unescaped.matchAll(/"key":"([^"]*)","name":"([^"]*)","effort":"([^"]*)","score":([0-9.]+)/g)]
  .map(([, key, name, effort, score]) => ({ key, name, effort, score: Number(score) }));

test('the registered capture really holds both key shapes the old guard excluded', () => {
  assert.equal(rows.length, 15, 'the 2026-09-22 capture holds 15 chart rows');
  const harness = (r) => r.key.slice(r.name.length + 1);
  const noParen = rows.filter((r) => r.effort === '' && !/\([^()]*\)$/.test(harness(r)));
  const qualified = rows.filter((r) => r.effort !== '' && /\([^()]*,[^()]*\)$/.test(harness(r)));
  assert.ok(noParen.length >= 1, 'at least one row states no effort and carries no parenthesis');
  assert.deepEqual(noParen.map((r) => r.key).sort(), [
    'DeepSeek-V4 Pro Preview|Claude Code', 'Kimi K2.6|Kimi-Code', 'Kimi K2.7 Code|Kimi-Code',
    'Qwen3.7-Max|Claude Code', 'Qwen3.8-Max-0902|Claude Code', 'Qwen3.8-Max|Claude Code',
  ]);
  assert.deepEqual(qualified.map((r) => r.key), ['Claude Fable 5|Claude Code (max effort, with fallback)']);
  // And every key does obey the rule the collector enforces.
  for (const r of rows) {
    const paren = harness(r).match(/\(([^()]*)\)$/);
    assert.equal(Boolean(r.effort), Boolean(paren), `${r.key}: parenthesis iff an effort is stated`);
    if (r.effort) assert.ok(new RegExp(`^${r.effort}\\b`).test(paren[1]), `${r.key}: parenthesis opens with ${r.effort}`);
  }
});

test('the version_guard prose describes that board, in all three places that carry it', () => {
  const guard = regEntry.how_to_collect.version_guard;
  assert.equal(planEntry.version_guard, guard, 'the plan\'s top-level guard equals the registry\'s');
  assert.equal(planEntry.recipe.version_guard, guard, 'the plan\'s recipe guard equals the registry\'s');
  assert.ok(!/with a harness parenthesis that agrees with the stated effort/.test(guard),
    'the withdrawn clause, which demanded a parenthesis on every key, is gone');
  assert.match(guard, /no parenthesis at all when the board states no effort/,
    'the guard states the no-effort case the board actually serves');
  assert.ok(guard.includes('"Claude Code (max effort, with fallback)"'),
    'the guard quotes the qualified harness verbatim');
  for (const effort of new Set(rows.map((r) => r.effort).filter(Boolean))) {
    assert.ok(guard.includes(effort), `the guard names the stated effort ${effort}`);
  }
  for (const key of ['Claude Code', 'Codex', 'Kimi-Code']) {
    assert.ok(guard.includes(`"${key}`), `the guard names the harness ${key}`);
  }
});
