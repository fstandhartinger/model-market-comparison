import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// CR-320 (7 Oct 2026): Lighthouse 13.5 accessibility audits on /jev-models, /jev-models/api and /image-jev-bench —
// heat-cell number contrast, 24x24 targets for source links and the ⓘ button, sort-button accessible names that
// contain their visible label, and an underline on the "*n" base-model footnote marker.
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [css, client, v16] = await Promise.all([read('../app/globals.css'), read('../components/JevBoardInteractive.tsx'), read('../components/JevBenchV16Board.tsx')]);

// ---- WCAG contrast from the theme tokens in globals.css ----
const block = (selector) => {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} block exists`);
  return css.slice(start, css.indexOf('}', start));
};
const token = (body, name) => {
  const m = body.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(m, `--${name} defined`);
  return m[1].trim();
};
const triple = (s) => s.split(/\s+/).map(Number);
const hex = (s) => s.length === 4 ? [1, 2, 3].map((i) => parseInt(s[i] + s[i], 16)) : [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

const heatVars = (theme) => {
  const line = css.split('\n').find((l) => l.includes('--heat:') && (theme === 'light' ? l.startsWith('[data-theme="light"]') : l.startsWith(':root, [data-theme="dark"]')));
  assert.ok(line, `heat tokens for ${theme}`);
  return { heat: triple(line.match(/--heat:\s*([\d ]+);/)[1]), min: Number(line.match(/--heat-min:\s*([\d.]+)/)[1]), span: Number(line.match(/--heat-span:\s*([\d.]+)/)[1]) };
};

test('numbers on a heat shade use the body text colour, not --muted', () => {
  assert.match(css, /\.bh-heat \{ color: var\(--text\); \}/);
  // The heat scale itself is untouched.
  assert.match(css, /\.bh-heat \{ background-color: rgb\(var\(--heat\) \/ calc\(var\(--heat-min\) \+ var\(--h, 0\) \* var\(--heat-span\)\)\); \}/);
});

for (const theme of ['light', 'dark']) {
  test(`heat-cell numbers reach 4.5:1 on every shade in the ${theme} theme`, () => {
    const vars = theme === 'light' ? block('[data-theme="light"]') : block(':root');
    const text = hex(token(vars, 'text'));
    const { heat, min, span } = heatVars(theme);
    // Page (ink), panel and surface backgrounds under the translucent green; low-n cells use 0.6 x the alpha.
    const grounds = [triple(token(vars, 'ink')), triple(token(vars, 'panel')), hex(token(vars, 'surface'))];
    let worst = Infinity;
    for (const bg of grounds) for (let h = 0; h <= 1.0001; h += 0.05) for (const dim of [1, 0.6]) {
      worst = Math.min(worst, contrast(text, over(heat, (min + h * span) * dim, bg)));
    }
    assert.ok(worst >= 4.5, `worst heat-cell contrast ${worst.toFixed(2)}:1 in ${theme}`);
    // Regression guard: --muted on the strongest light shade is what failed (3.43-4.22:1).
    if (theme === 'light') assert.ok(contrast(hex(token(vars, 'muted')), over(heat, min + span, triple(token(vars, 'ink')))) < 4.5);
  });
}

test('low-n language cells dim only their shade, not the number', () => {
  assert.doesNotMatch(v16, /opacity: lowN/);
  assert.match(v16, /data-bh-heat-low-n=\{lowN \? '' : undefined\}/);
  assert.match(css, /\.bh-heat\[data-bh-heat-low-n\] \{ background-color: rgb\(var\(--heat\) \/ calc\(\(var\(--heat-min\) \+ var\(--h, 0\) \* var\(--heat-span\)\) \* \.6\)\); \}/);
  assert.match(v16, /lowN && <sup[^>]*>†<\/sup>/, 'the dagger still marks low n without colour');
});

test('source links get a >= 24x24px target without moving the layout', () => {
  const rule = css.match(/a\[data-bh-jev-source\] \{ --bh-src-pad: max\(4px, calc\(12\.5px - \.55em\)\); padding: var\(--bh-src-pad\) 0 var\(--bh-src-pad\) (\d+)px; margin: calc\(-1 \* var\(--bh-src-pad\)\) 0 calc\(-1 \* var\(--bh-src-pad\)\) -(\d+)px; \}/);
  assert.ok(rule, 'padding with matching negative margin');
  assert.equal(rule[1], rule[2], 'horizontal padding and margin cancel');
  // Shortest name ("d1") renders ~11px wide at 12px on a phone; 11 + left padding must reach 24.
  assert.ok(11 + Number(rule[1]) >= 24);
  // Inline content height is ~1.15em: 12px and 14px text both grow to >= 24px.
  for (const px of [12, 14, 16]) assert.ok(px * 1.15 + 2 * Math.max(4, 12.5 - 0.55 * px) >= 24, `${px}px link height`);
  const wrap = css.match(/\.truncate:has\(> a\[data-bh-jev-source\]\) \{ padding: (\d+)px 0 \1px (\d+)px; margin: -\1px 0 -\1px -\2px; \}/);
  assert.ok(wrap, 'truncating wrapper gets neutral room so it does not clip the target');
  assert.ok(Number(wrap[2]) >= Number(rule[1]));
  // "details" under a name: 20px line + bottom padding, minus up to 4px reached by the source link above, stays >= 24px.
  const details = css.match(/a\[data-bh-mm-system-details\] \{ padding-bottom: (\d+)px; margin-bottom: -(\d+)px; \}/);
  assert.ok(details, 'details link grows downwards only, cancelled by the margin');
  assert.equal(details[1], '8', '8px bottom padding');
  assert.equal(details[2], '8', 'matching -8px bottom margin');
  assert.ok(20 + Number(details[1]) - 4 >= 24);
});

test('the capability ⓘ button is a 24x24px target around the same centre', () => {
  const m = css.match(/button\.bh-jev-info \{ width: (\d+)px; height: (\d+)px; margin: -(\d+)px -(\d+)px -(\d+)px 0; \}/);
  assert.ok(m);
  const [w, h, top, right, bottom] = m.slice(1).map(Number);
  assert.ok(w >= 24 && h >= 24);
  // Was 16x16 with a 4px left gap: the margin box (and therefore the row) keeps its size.
  assert.equal(w - right, 4 + 16);
  assert.equal(h - top - bottom, 16);
});

test('sort buttons are named by their visible label first, then the column and current order', () => {
  const button = client.slice(client.indexOf('function SortButton'), client.indexOf('// ---- Weight sliders'));
  assert.doesNotMatch(button, /aria-label=/, 'no aria-label that hides the visible label');
  assert.match(button, /\{label\}<span className="sr-only">, sort by \{SORT_LABEL\[k\]\}\{active \? `, currently \$\{dirWords\(sort\)\}` : ''\}<\/span><SortArrow/);
  assert.match(client, /<SortButton k="name" label="System"/);
  assert.match(client, /<SortButton k="intelligence" label="Intel\."/);
});

test('the base-model "*n" footnote marker is underlined, not colour-only', () => {
  assert.match(css, /a\[data-bh-base-model-footnote-ref\] \{ text-decoration: underline; text-underline-offset: 2px; \}/);
});
