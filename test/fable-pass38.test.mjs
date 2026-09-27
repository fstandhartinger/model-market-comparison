// Fable pass 38 (2026-09-27): source pin for the one fix Fable shipped — F-207(a): a 3D top-five label sits on a translucent plate
// and carries a 3 × 11 px colour bar instead of an 8 px disc that read as a sixth sphere. The halo on the labelled sphere (F-207(b))
// and the context chart's pixel-scale rendering (F-208) were directed, not shipped there. F-208 is implemented by iteration 245
// (claude-opus) and pinned below, together with F-207(b).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { haloDiameter, leaderTo } from '../lib/jev-3d-halo.mjs';

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

test('F-207(b): each labelled sphere wears a halo, and a pushed plate is joined to it by a leader', () => {
  // The geometry is one rule used by both render paths, so it is exercised directly rather than pinned
  // as a string: a ring 4 px outside the projected sphere, clamped to a readable 14–32 px, and a leader
  // only once the declump has pushed the plate more than 24 px clear of the ring's edge.
  assert.equal(haloDiameter(3), 14, 'the smallest sphere still gets a 14 px ring');
  assert.equal(haloDiameter(9), 26, '2 × (radius + 4)');
  assert.equal(haloDiameter(40), 32, 'and it never grows past 32');
  const plate = (x, y) => ({ x, y, w: 90, h: 16 });
  // Plate sitting on its own sphere: no leader.
  assert.equal(leaderTo(plate(100, 100), 145, 112, 20), null);
  // Plate pushed far below: a leader from the plate's nearest edge midpoint to the ring's edge.
  const pushed = leaderTo(plate(100, 300), 145, 100, 20);
  assert.ok(pushed, 'a pushed plate is joined to its sphere');
  assert.deepEqual({ x: pushed.x, y: pushed.y }, { x: 145, y: 300 }, 'the nearest edge midpoint is the plate top');
  assert.ok(Math.abs(pushed.length - (200 - 10)) < 0.01, 'the leader stops at the ring, not at its centre');
  assert.ok(Math.abs(pushed.angle + 90) < 0.01, 'it points at the sphere');
  // Its end point is on the ring's edge, which is what the SVG path draws to.
  assert.ok(Math.abs(Math.hypot(145 - pushed.to.x, 100 - pushed.to.y) - 10) < 0.01);
  // Exactly at the threshold nothing is drawn — the leader is for plates the declump moved, not for all.
  assert.equal(leaderTo(plate(100, 100), 145, 100 - 24 - 10, 20), null);
  assert.ok(leaderTo(plate(100, 100), 145, 100 - 25 - 10, 20));

  // Both render paths create the ring and the leader with the markers the verifier looks for, and the
  // ring is painted under the plate so a plate over its own sphere still reads as text on a plate.
  assert.match(three, /data-bh-jev14-3d-halo/);
  assert.match(three, /data-bh-jev14-3d-leader-line/);
  assert.match(three, /halo\.className = 'bh-jev-3d-halo'/);
  assert.match(three, /halo\.style\.borderColor = `rgb\(var\(\$\{entry\.point\.colorVariable\}\)\)`/);
  assert.match(three, /labelLayer\.appendChild\(halo\);\n\s*labelLayer\.appendChild\(leader\);\n\s*labelLayer\.appendChild\(el\);/);
  assert.match(three, /<circle data-bh-jev14-3d-halo=\{entry\.point\.key\}[^>]*fill="none"[^>]*strokeWidth="2"/s);
  // A rebuild of the top five (weights or the Jev-class toggle) must not leave orphan rings behind.
  assert.match(three, /for \(const ref of modelRefs\) \{ ref\.el\.remove\(\); ref\.halo\.remove\(\); ref\.leader\.remove\(\); \}/);
  // A sphere behind the camera hides its ring and leader with its label.
  assert.match(three, /hide\(entry\.item\.halo\); hide\(entry\.item\.leader\);/);
  const rule = css.match(/\.bh-jev-3d-labels \.bh-jev-3d-halo \{([^}]*)\}/);
  assert.ok(rule, 'the ring rule exists');
  assert.match(rule[1], /background: transparent;/);
  assert.match(rule[1], /box-shadow: 0 0 0 1px rgb\(var\(--panel\) \/ \.9\);/);
  assert.match(css, /\.bh-jev-3d-labels \.bh-jev-3d-leader-line \{[^}]*height: 1px;[^}]*transform-origin: 0 50%;[^}]*\}/);
  // The ring first shipped with `border: 2px solid rgb(var(--muted))` and drew nothing: `--muted` is a hex
  // colour in this stylesheet (`--panel`/`--line` are R G B triplets), `rgb(#4c5e75)` is not a colour, and an
  // invalid colour inside a shorthand invalidates the whole declaration — width and style fall back to the
  // initial `none`. Found live, not by this suite; the pass-38 verifier now reads the rendered ring width too.
  assert.match(rule[1], /border-width: 2px;/, 'the width is its own longhand, so a bad colour cannot take it');
  assert.match(rule[1], /border-style: solid;/, 'and neither can it take the style');
  for (const [name, source] of [['the halo/leader CSS', `${rule[1]} ${(css.match(/\.bh-jev-3d-leader-line \{([^}]*)\}/) ?? ['', ''])[1]}`],
    ['the SVG fallback', (three.match(/data-bh-jev14-3d-leader-line[\s\S]{0,400}/) ?? [''])[0]]]) {
    assert.doesNotMatch(source, /rgb\(var\(--muted\)\)/, `${name} must use var(--muted) directly — it is a hex colour`);
  }
});
