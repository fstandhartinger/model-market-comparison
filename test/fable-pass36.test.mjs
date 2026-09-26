// Fable pass 36 (2026-09-26): source pins for the three surgical fixes Fable shipped on the JevBench hub —
// F-194 the custom-evaluation toast stacks above the fast-lane banner, F-195 the bubble charts' latency sub-ticks sit at the 10 px floor,
// F-196 the weight-slider group says "Official" nowhere (the pressed preset and the badge under the h2 already do).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
const bubble = await readFile(new URL('../components/JevBubbleChart.tsx', import.meta.url), 'utf8');
const board = await readFile(new URL('../components/JevBoardInteractive.tsx', import.meta.url), 'utf8');

test('F-194: while the banner is visible the toast sits above the banner height, not under it', () => {
  assert.match(css, /body\.bh-fastlane-visible \.bh-custom-evaluation-toast \{ bottom: calc\(var\(--bh-fastlane-height, 0px\) \+ 1rem \+ env\(safe-area-inset-bottom, 0px\)\); \}/);
  // the banner keeps owning the variable the rule reads
  assert.match(css, /body\.bh-fastlane-visible \{ padding-bottom: var\(--bh-fastlane-height, 0px\); \}/);
});

test('F-195: no SVG text in the bubble charts is set below the 10 px floor', () => {
  const sizes = [...bubble.matchAll(/fontSize=\{?"?([\d.]+)"?\}?/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length >= 6, `expected the chart's fontSize attributes, found ${sizes.length}`);
  for (const s of sizes) assert.ok(s >= 10, `fontSize ${s} is below the 10 px floor`);
  assert.doesNotMatch(bubble, /fontSize="9\.5"/);
});

test('F-196: the weight-slider group labels only the custom state', () => {
  assert.match(board, /\{!official && <span className="bh-jevc-notdefault ml-1">Custom — not the official ranking<\/span>\}/);
  assert.doesNotMatch(board, /<span className="bh-jevc-official ml-1">Official<\/span>/);
  // the badge under the h2 still says Official for the equal-weight state
  assert.match(board, /<span className="bh-jevc-official mr-2">Official<\/span>/);
});
