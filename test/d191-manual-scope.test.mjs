// D191 follow-up (2026-09-26): feea6470 moved `manual.has(spec.benchmark_id)` into the split
// refresh loop of refreshBenchmarks() but left `const manual` behind in captureTargets().
// The ReferenceError crashed the 2026-09-25 and 2026-09-26 daily runs at refresh-benchmarks
// ("DAILY BENCHMARKS FAILED: manual is not defined") and only a clone-level repair published
// on 2026-09-25. The fix declares the set inside refreshBenchmarks itself. This test fails if
// any function in the module reads `manual.` without first declaring `const manual` in its own
// body — the exact regression class, not a pinned line number.
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../ops/daily/refresh-benchmarks.mjs', import.meta.url), 'utf8');

const functionSpans = (code) => {
  const spans = [];
  const re = /\bfunction\s+(\w+)/g;
  let m;
  while ((m = re.exec(code))) {
    let i = code.indexOf('(', m.index);
    if (i === -1) continue;
    let depth = 0, close = -1;
    for (let j = i; j < code.length; j++) {
      if (code[j] === '(') depth++;
      else if (code[j] === ')') { depth--; if (!depth) { close = j; break; } }
    }
    if (close === -1) continue;
    let open = code.indexOf('{', close);
    // Skip default-parameter bodies: the function body's first '{' must come before any ';' or '=>' at top level.
    const semi = code.indexOf(';', close), arrow = code.indexOf('=>', close);
    if (open === -1 || (semi !== -1 && semi < open) || (arrow !== -1 && arrow < open)) continue;
    depth = 0;
    let end = -1;
    for (let j = open; j < code.length; j++) {
      if (code[j] === '{') depth++;
      else if (code[j] === '}') { depth--; if (!depth) { end = j; break; } }
    }
    if (end === -1) continue;
    spans.push({ name: m[1], body: code.slice(open, end + 1) });
    re.lastIndex = end;
  }
  return spans;
};

test('every function reading `manual.` declares its own `const manual` first', () => {
  const offenders = [];
  for (const { name, body } of functionSpans(src)) {
    const declareAt = body.indexOf('const manual');
    const uses = [...body.matchAll(/\bmanual\./g)].map((x) => x.index);
    if (uses.length && declareAt === -1) offenders.push(`${name}: reads manual. with no const manual`);
    for (const at of uses) if (declareAt !== -1 && at < declareAt) offenders.push(`${name}: manual.* used before its declaration`);
  }
  assert.deepEqual(offenders, []);
});

test('refreshBenchmarks retains manual-refresh entries as retained_manual_snapshot after declaring the set', () => {
  const fn = functionSpans(src).find((f) => f.name === 'refreshBenchmarks');
  assert.ok(fn, 'refreshBenchmarks not found');
  assert.ok(fn.body.includes("status: 'retained_manual_snapshot'"), 'manual retention branch missing');
  assert.ok(fn.body.indexOf('const manual') !== -1, 'manual set not declared in refreshBenchmarks');
  assert.ok(fn.body.indexOf('const manual') < fn.body.indexOf("status: 'retained_manual_snapshot'"), 'manual must be declared before the retention branch');
});
