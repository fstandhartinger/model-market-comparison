// Fable pass 37 (2026-09-26): source pins for the two fixes Fable shipped — F-201 (the 3D top-five labels are positioned by
// their transform alone, so they sit beside their spheres instead of stacking at the left edge) and F-202 (the bubble charts'
// 2× label and direction hints never drop under the 10 px floor on phones).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const bubble = readFileSync(new URL('../components/JevBubbleChart.tsx', import.meta.url), 'utf8');
const three = readFileSync(new URL('../components/JevCapability3D.tsx', import.meta.url), 'utf8');

test('F-201: every child of the 3D label layer is absolutely positioned (transform-only placement)', () => {
  assert.match(css, /\.bh-jev-3d-labels > \* \{[^}]*position: absolute;[^}]*white-space: nowrap;/);
  assert.match(three, /className = 'bh-jev-3d-model-label'/, 'the DOM label path still uses the class the rule targets');
});

test('F-202: the bubble separator label and its direction hints are 10 px at every width', () => {
  assert.doesNotMatch(bubble, /fontSize=\{narrow \? 9 : 10\}/);
  const sep = bubble.slice(bubble.indexOf('const separator = ('), bubble.indexOf('</g>;', bubble.indexOf('const separator = (')));
  const sizes = [...sep.matchAll(/fontSize="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length >= 5, `expected the label and four hint texts, saw ${sizes.length}`);
  assert.ok(sizes.every((s) => s >= 10), `separator text sizes ${sizes.join(', ')}`);
});

// F-203/F-204/F-205 (iteration 239, claude-opus): the three mechanical directives pass 37 left open.
const context = readFileSync(new URL('../components/JevContextLength.tsx', import.meta.url), 'utf8');
const ranking = readFileSync(new URL('../components/JevCapabilityRanking.tsx', import.meta.url), 'utf8');

test('F-203: the input-length bucket ticks are 10 px, and the chart never renders below its own scale', () => {
  assert.match(context, /const tickFontSize = 10;/);
  assert.doesNotMatch(context, /fontSize="9\.5"/, 'no 9.5 px text is left in the chart');
  // The viewBox is 740 wide; a smaller minimum width scaled the whole chart below 1 and drew a 10 px
  // attribute at 9.46 px on a phone.
  const view = context.match(/const width = (\d+), height/);
  assert.ok(view, 'the chart still declares its viewBox width');
  assert.match(context, new RegExp(`min-w-\\[${view[1]}px\\]`), 'the svg minimum width matches the viewBox width');
  // The crowding guard drops every second label, always keeping the last bin, rather than shrinking the text.
  assert.match(context, /const tickCrowded = widestTick \+ 6 > tickGap;/);
  assert.match(context, /position % 2 === \(active\.length - 1\) % 2/);
});

test('F-204: one name per axis, "decisions" as the unit, one arrow per direction', () => {
  assert.doesNotMatch(three, /data-bh-jev14-3d-axes\b/, 'the 3D legend box is gone; the on-plot labels name the axes');
  assert.doesNotMatch(three, /Toward you/, 'the caption paragraph is gone');
  // The three on-plot axis names stay (they are what replaces the legend box).
  assert.match(three, /Cost · \$\/1k decisions · cheaper →/);
  assert.match(three, /Speed · faster →/);
  for (const src of [three, ranking, bubble, context]) {
    assert.doesNotMatch(src, /\$\/1k tasks/);
    assert.doesNotMatch(src, /per 1,000 tasks/);
  }
  assert.match(ranking, /\$\/1k decisions/);
  assert.match(ranking, /Thin red line = cost per 1,000 decisions;/);
  assert.match(ranking, /\* = est\. \(estimated cost\)\./, 'the marker legend uses the same word as the tables’ pill');
  // The flat charts state the direction once, in Florian's top hints.
  assert.match(bubble, /'\$ per 1,000 decisions \(log\)' : 'Median-latency speed'/);
});

test('F-205: under 640 px the five labels are one column with leaders that do not cross', () => {
  assert.match(bubble, /const stacked = viewportWidth < 640;/, 'the column follows the viewport, not the chart: at 1440 the two-up grid gives each chart ~625 px and the directive keeps that placement');
  assert.match(bubble, /const segCross = \(p: Seg, q: Seg\)/, 'the layout runs the same crossing test as the verifier');
  const stack = bubble.slice(bubble.indexOf('if (stacked) {'), bubble.indexOf('// the greedy') + 1 || undefined);
  assert.match(stack, /rowH = Math\.round\(fs \+ 9\)/, 'the row pitch clears the glyph cell plus the halo stroke');
  assert.match(stack, /sort\(\(a2, b2\) => chosen\[a2\]\.d\.cy - chosen\[b2\]\.d\.cy\)/, 'rows are ordered by the point’s y');
  assert.match(stack, /for \(let pass = 0; pass < 10; pass\+\+\)/, 'at most ten swaps');
  assert.match(stack, /laid\.crossings > 0 && items\.length > 3/, 'the fallback labels the top three');
  // Above 640 px the greedy placement stays, but now rejects a candidate whose leader would cross another.
  assert.match(bubble, /if \(drawnLeaders\.some\(\(other\) => segCross\(leader, other\)\)\) continue;/);
});

test('D216: both 3D render paths push a label clear of one it would print on top of', () => {
  // The WebGL overlay measures each label once and separates the boxes; the SVG fallback runs the
  // same rule on estimated widths, because it has no layout to measure.
  assert.match(three, /const taken: \{ x: number; y: number; w: number; h: number \}\[\] = \[\];/);
  assert.match(three, /top = hit\.y \+ hit\.h \+ 2;/);
  assert.match(three, /function declump</);
  assert.match(three, /\{declump\(rankedPoints/, 'the fallback renders the de-clumped positions');
});
