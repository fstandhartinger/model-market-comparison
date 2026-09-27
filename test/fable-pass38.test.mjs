// Fable pass 38 (2026-09-27): source pin for the one fix Fable shipped — F-207(a): a 3D top-five label sits on a translucent plate
// and carries a 3 × 11 px colour bar instead of an 8 px disc that read as a sixth sphere. The halo on the labelled sphere (F-207(b))
// and the context chart's pixel-scale rendering (F-208) were directed, not shipped there. F-208 is implemented by iteration 245
// (claude-opus) and pinned below; F-207(b) is still open.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const three = readFileSync(new URL('../components/JevCapability3D.tsx', import.meta.url), 'utf8');
const context = readFileSync(new URL('../components/JevContextLength.tsx', import.meta.url), 'utf8');
const bubble = readFileSync(new URL('../components/JevBubbleChart.tsx', import.meta.url), 'utf8');

test('F-207(a): the DOM top-five label has a translucent panel-colour plate', () => {
  const rule = css.match(/\.bh-jev-3d-labels \.bh-jev-3d-model-label \{([^}]*)\}/);
  assert.ok(rule, 'the plate rule exists');
  assert.match(rule[1], /background: rgb\(var\(--panel\) \/ \.8\d?\);/);
  assert.match(rule[1], /padding: 1px 5px 1px 4px;/);
  assert.match(rule[1], /border-radius: 4px;/);
});

test('F-207(a): the class marker is a bar, not a disc', () => {
  const rule = css.match(/\.bh-jev-3d-model-dot \{([^}]*)\}/);
  assert.ok(rule, 'the marker rule exists');
  assert.match(rule[1], /width: 3px;/);
  assert.match(rule[1], /height: 11px;/);
  assert.doesNotMatch(rule[1], /border-radius: 9999px/);
  assert.match(three, /dot\.className = 'bh-jev-3d-model-dot'/, 'the DOM label path still creates the marker the rule targets');
});

test('F-208: the input-length chart draws at its wrapper\'s pixel width, so one SVG unit is one CSS pixel', () => {
  // The defect: `viewBox="0 0 740 305"` on a `w-full` svg stretched the whole drawing by ~1.79 at 1440,
  // so the chart's 10 px bucket ticks rendered at ~18 px — the hub's largest chart text.
  const floor = context.match(/usePlotWidth\((\d+)\)/);
  assert.ok(floor, 'the plot declares the floor width it never draws below');
  // The svg's own width attribute and its viewBox are the same expression, which is what makes the
  // scale exactly 1; a `w-full` or `h-auto` class would stretch it again.
  const svg = context.match(/<svg className="([^"]*)"([^>]*?)viewBox=\{`0 0 \$\{(\w+)\} \$\{(\w+)\}`\}/);
  assert.ok(svg, 'the accuracy chart still declares its viewBox from the measured width');
  assert.match(svg[2], new RegExp(`width=\\{${svg[3]}\\}`), 'the svg width attribute is the viewBox width');
  assert.match(svg[2], new RegExp(`height=\\{${svg[4]}\\}`), 'the svg height attribute is the viewBox height');
  assert.doesNotMatch(svg[1], /\bw-full\b/, 'a stretched width is what F-208 removed');
  assert.doesNotMatch(svg[1], /\bh-auto\b/, 'a derived height would scale the drawing again');
  assert.match(svg[1], new RegExp(`min-w-\\[${floor[1]}px\\]`), 'the phone keeps the floor width inside a scrolling wrapper');
  // Measured the same way as the bubble charts: a ResizeObserver on the wrapper with a resize fallback.
  for (const source of [context, bubble]) {
    assert.match(source, /new ResizeObserver\(update\)/);
    assert.match(source, /window\.addEventListener\('resize', update\)/);
    // The floor is a literal in the bubble charts and this hook's parameter here; what is pinned is
    // that the measured value is the wrapper's own clientWidth, never the viewport or a constant.
    assert.match(source, /Math\.max\([^,]+, Math\.round\(el\.clientWidth\)\)/);
  }
  // The wrapper the observer measures is the scroller the svg lives in, not some other element.
  assert.match(context, /<div ref=\{plotRef\}[^>]*data-bh-jev-context-chart-scroll>/);
  // Text stays at the CSS sizes it had; only the axis title joins the bubble charts' 11 px axis titles.
  assert.match(context, /const tickFontSize = 10;/);
  assert.match(context, /fontSize="11"[^>]*className="hidden sm:block">Actual input tokens per decision/);
  const sizes = [...context.matchAll(/fontSize="(\d+(?:\.\d+)?)"/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length && Math.min(...sizes) >= 10, `every literal font size is at least 10 px (got ${sizes.join(', ')})`);
});
