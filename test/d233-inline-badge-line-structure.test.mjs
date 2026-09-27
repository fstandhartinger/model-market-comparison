// D233, 2026-09-27. The text extractor that builds every protocol-review packet
// (`ops/daily/public-candidate.py text <file>`) put every HTML text node on a line of its own.
// Andon Labs' nav renders `<li><a><span>Vending-Bench</span> <span>Deprecated</span></a></li>`, so
// the packet read
//
//     Vending-Bench
//     Deprecated
//     Robot
//
// and a reviewer took "Deprecated" for a heading over the next group — Drone-Bench, Butter-Bench and
// Blueprint-Bench 2. That is what disputed `blueprint-bench::2`'s `status` in iteration 248's first
// replay round: the badge belongs to the link before it, and Blueprint-Bench 2 carries no badge at
// all (it sits in the "Robot" group with `aria-current="page"`).
//
// The rule: an inline formatting element cannot start a new line. Its boundaries join with a single
// space; every other tag boundary keeps the newline it always had. Exactly one separator character
// per boundary either way, so the extracted text keeps its byte length and its `\s+`-normalised form
// character for character — which is the form `protocolSourceContent` matches an excerpt against and
// the form the 60,000-byte review bound is measured on. Line structure is the only thing that moves.
//
// Proved once over every capture in the repository: 2,491 files, 1,073 of them HTML whose line
// structure changed, 0 byte-length differences and 0 normalised differences
// (/opt/benchmarkheaven/state/ux-evidence/iter250-d233/extractor-equivalence.json), and
// `scan-protocol-excerpts.mjs` reports the same 428 references · 0 failing before and after.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repo = new URL('..', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'd233-'));
const extract = (html) => {
  const file = join(dir, `page-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(file, html);
  return execFileSync('python3', ['ops/daily/public-candidate.py', 'text', file],
    { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
};
// The shape Andon Labs' nav actually serves, reduced to the two links that mattered.
const NAV = '<!doctype html><html><body><div><p>Retail</p><ul>'
  + '<li><a href="/evals/vending-bench" class="group"><span>Vending-Bench</span> '
  + '<span class="rounded-full">Deprecated</span></a></li></ul></div>'
  + '<div><p>Robot</p><ul><li><a href="/evals/blueprint-bench-2"><span>Blueprint-Bench 2</span></a>'
  + '</li></ul></div></body></html>';

test('an inline badge stays on its link\'s line, and the next group heading starts its own', () => {
  const lines = extract(NAV).split('\n').map((l) => l.trim()).filter(Boolean);
  assert.ok(lines.some((l) => /^Vending-Bench\s+Deprecated$/.test(l)),
    `the badge must read on the link's own line, got ${JSON.stringify(lines)}`);
  assert.equal(lines.includes('Deprecated'), false, '"Deprecated" must never be a line of its own');
  assert.ok(lines.includes('Robot'), 'the next group heading keeps its own line');
  // The defect was positional: the badge sat immediately above the heading it was mistaken for.
  assert.equal(lines[lines.indexOf('Robot') - 1].includes('Vending-Bench'), true);
});

test('block boundaries still break lines', () => {
  const lines = extract('<!doctype html><html><body><p>One</p><p>Two</p>'
    + '<table><tr><td>A</td><td>B</td></tr></table><ul><li>x</li><li>y</li></ul>'
    + '<div>left<br>right</div></body></html>')
    .split('\n').map((l) => l.trim()).filter(Boolean);
  for (const word of ['One', 'Two', 'A', 'B', 'x', 'y', 'left', 'right']) {
    assert.ok(lines.includes(word), `${word} must keep a line of its own, got ${JSON.stringify(lines)}`);
  }
});

test('every inline boundary keeps one separator character, so the normalised text cannot move', () => {
  // Inline runs, an inline element directly against a block one, and an empty inline element.
  const html = '<!doctype html><html><body><p>Cost <span>(</span><b>$</b><span>)</span> per '
    + '<em>rollout</em><sup>1</sup><span></span> is the <code>cost</code> field.</p></body></html>';
  const text = extract(html);
  assert.equal(text.replace(/\s+/g, ' ').trim(), 'Cost ( $ ) per rollout 1 is the cost field.',
    'the space-normalised form is the one an excerpt is matched against');
  // One line, because nothing but inline elements separates the words.
  const body = text.split('\n').map((l) => l.trim()).filter(Boolean);
  assert.equal(body.length, 1, `inline-only content is one line, got ${JSON.stringify(body)}`);
});

test('scripts and styles are still dropped, and the badge rule does not reach into them', () => {
  const text = extract('<!doctype html><html><head><style>.a{color:red}</style></head>'
    + '<body><p>Visible</p><script>var hidden = "secret";</script></body></html>');
  assert.match(text, /Visible/);
  assert.equal(/secret|color:red/.test(text), false);
});
