// CR-38.1 (iteration 146): a page whose protocol text lives inside its own RSC payload is reviewed
// through the named `next-rsc` recipe; the default text extraction keeps stripping scripts, and the
// recipe passes from the evidence entry through both the daily protocol path and the offline replay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { protocolSourceContent } from '../ops/daily/refresh-benchmarks.mjs';

const TB = 'data/raw/benchmarks/daily-evidence/2026-09-20T10-13-05-800Z/e94cf464681af72f8659.gz';

test('next-rsc: the RSC payload is only readable when the recipe is named', () => {
  const plain = execFileSync('python3', ['ops/daily/public-candidate.py', 'text', TB], { maxBuffer: 16_000_000 }).toString();
  const rsc = execFileSync('python3', ['ops/daily/public-candidate.py', 'text', TB, 'next-rsc'], { maxBuffer: 16_000_000 }).toString();
  assert.ok(Buffer.byteLength(plain) < 2_000, 'default text strips the scripts');
  assert.ok(Buffer.byteLength(rsc) > 50_000, 'the recipe keeps the RSC chunks');
  assert.match(rsc, /display_accuracy/, 'the board renders its resolution rates with a % sign inside the payload');
  assert.doesNotMatch(plain, /display_accuracy/, 'without the recipe the payload is invisible');
});

test('next-rsc: terminal-bench::4.0 evidence resolves through protocolSourceContent like the review does', async () => {
  const reg = JSON.parse(await readFile(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
  const entry = reg.entries.find((e) => e.id === 'terminal-bench::4.0');
  const refs = entry.evidence.filter((s) => s.url === 'https://www.tbench.ai/');
  // The page is far past the review bound, so the packet is exactly these excerpts: every one
  // of them has to be named with the recipe and has to resolve. The count is not pinned \u2014 D188
  // added the attribution excerpt the maintainer field needs \u2014 but each required subject is.
  assert.ok(refs.length >= 2, 'the page is reviewed through its recorded excerpts');
  const body = execFileSync('python3', ['ops/daily/public-candidate.py', 'text', TB, 'next-rsc'], { maxBuffer: 16_000_000 }).toString();
  for (const s of refs) {
    assert.equal(s.recipe, 'next-rsc', `every excerpt of this page needs the recipe: ${s.excerpt.slice(0, 40)}`);
    const content = protocolSourceContent(entry.id, s, body);
    assert.equal(content, s.excerpt);
  }
  const excerpts = refs.map((s) => s.excerpt);
  const carries = (pattern) => excerpts.some((excerpt) => pattern.test(excerpt));
  assert.ok(carries(/TERMINAL-BENCH 4\.0/), 'the board identity is carried');
  assert.ok(carries(/metrics_schema/), 'the schema pins the unit: accuracy number 0\u2013100');
  assert.ok(carries(/\\"maximum\\":100/), 'percent scale made by the board itself');
  assert.ok(carries(new RegExp(`Hosted by ${entry.maintainer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)),
    'the maintainer field the critic must check is carried too');
});
