import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// CR-79 (Florian via Hermes, 17 Sep 2026: "Fix the headers"): on a phone the model table's column headers ran
// outside their cells and lost letters — worst with the phone's larger-text setting, because the header cell's
// width is a percentage of the viewport and does not grow with the text. The header must never be hidden, and
// its primary names must stay readable.
const src = readFileSync(new URL('../components/ModelExplorer.tsx', import.meta.url), 'utf8');
const th = src.slice(src.indexOf('const Th = ({ label, k, right, sub, info, hideBelowMd }'), src.indexOf('// CR-63.7: one legend'));

test('CR-79.1: the phone header label can shrink and, as a last resort, break inside a word', () => {
  assert.match(th, /className="min-h-0 min-w-0 break-words text-inherit/, 'the sort button may shrink and break (F-116: no 44 px minimum, so the (i) aligns with its last line)');
  // F-116 (Fable pass 22): the parent no longer wraps — the label breaks inside its own button and the (i) is a
  // non-shrinking sibling on the last line, so it can never take a line of its own (F-92); the shrink guarantee holds.
  assert.match(th, /<span className=\{`flex min-w-0 flex-nowrap items-end/, 'its flex parent allows the shrink (min-w-0); the (i) stays beside the last line');
  assert.match(th, /\{info && <span className="shrink-0">\{info\}<\/span>\}/, 'the (i) never shrinks or wraps');
  assert.match(th, /\{sub && <span className="block break-words/, 'the sub-label breaks too');
});

test('CR-79.1: phones get the narrower label treatment, desktop keeps its own', () => {
  assert.match(th, /px-2 py-2 md:px-3/, 'tighter cell padding below md, unchanged at md+');
  assert.match(th, /normal-case md:uppercase/, 'no uppercasing on phones (same words, ~12 % narrower); uppercase returns at md');
  assert.match(th, /tracking-normal md:tracking-wide/, 'letter-spacing unchanged from CR-75.3');
});

test('CR-79.2: the header is never hidden as a workaround, and sorting stays keyboard-operable', () => {
  assert.ok(!/thead[^>]*hidden/.test(src), 'no hidden thead');
  assert.match(th, /aria-sort=\{sort === k \? \(asc \? "ascending" : "descending"\) : "none"\}/, 'aria-sort preserved');
  assert.match(th, /<button type="button" onClick=\{\(\) => onSort\(k\)\}/, 'a real button, so touch and keyboard both sort');
  // Only the three phone columns exist below md; Org / #benchmarks / #providers stay md-only (F-14), not the rest.
  assert.equal((th.match(/hidden md:table-cell/g) || []).length, 1, 'one hideBelowMd branch, unchanged');
});

test('CR-79 follow-up: nothing forces the page sideways at a large text setting', () => {
  // Found while verifying CR-79 and fixed in the same iteration: at the phone's larger-text setting the page
  // overflowed ~61 px. Two causes, both "an intrinsic width that cannot shrink".
  const nav = readFileSync(new URL('../components/Nav.tsx', import.meta.url), 'utf8');
  assert.match(nav, /flex min-h-\[58px\] max-w-\[1400px\] flex-wrap items-center/,
    'the header row may wrap instead of overflowing, and is no longer pinned to a fixed height');
  const cols = readFileSync(new URL('../components/ShortlistColumns.tsx', import.meta.url), 'utf8');
  assert.match(cols, /<div className="relative flex min-w-0 max-w-full items-center gap-1">/, 'the chart-score row may shrink');
  assert.match(cols, /<select className="bh-input max-w-full py-1 text-xs"/, 'and its picker never exceeds the card');
});
