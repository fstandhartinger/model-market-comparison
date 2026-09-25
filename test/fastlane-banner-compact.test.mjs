import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// CR-167.2 / D207. Florian asked for a bottom-fixed fast-lane bar that does "not cover content on
// mobile (reserve space or make it compact)". Reserving space with `body { padding-bottom }` only
// keeps the end of the document reachable: the review gate of 2026-09-25T19:20Z measured a 145 px
// bar sitting exactly on the first Jev-class result row (row 699..778, banner top 699) on a
// 390x844 phone. The fix is the compact phone form, and its height is what has to stay true.
//
// The live proof is `ops/ux-2026-09-12/bin/verify-cr-167-2.mjs`. This test is the cheap companion
// that runs in `npm test`: it re-derives the collapsed height from the declarations rather than
// pinning their text, so tightening a value is fine and *growing* one fails here first.
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const tsx = readFileSync(new URL('../components/FastlaneBanner.tsx', import.meta.url), 'utf8');

const PHONE_MQ = '@media (max-width: 760px)';
const phoneBlock = (() => {
  const start = css.indexOf(PHONE_MQ + ' {', css.indexOf('.bh-fastlane-banner {'));
  assert.ok(start > 0, 'the phone media query that styles the fast-lane banner is missing');
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}' && (depth -= 1) === 0) return css.slice(start, i + 1);
  }
  throw new Error('unbalanced media query');
})();

/** The last declaration of `prop` among the rules whose selector list contains `selector` exactly. */
function declaration(block, selector, prop) {
  const rules = [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => m[1].split(',').some((part) => part.trim() === selector))
    .flatMap((m) => [...m[2].matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'g'))].map((d) => d[1].trim()));
  return rules.at(-1) ?? null;
}
const px = (value) => {
  assert.match(value ?? '', /^[\d.]+px$/, `expected a px length, got ${value}`);
  return parseFloat(value);
};

test('CR-167.2/D207: the collapsed phone banner is short enough to clear the first result row', () => {
  const COLLAPSED = '.bh-fastlane-banner[data-bh-fastlane-expanded="no"]';
  const padding = declaration(phoneBlock, `${COLLAPSED} .bh-fastlane-inner`, 'padding');
  assert.ok(padding, 'the collapsed phone banner has no padding rule');
  const [top, , bottom = top] = padding.split(/\s+/);
  const teaser = px(declaration(phoneBlock, '.bh-fastlane-teaser', 'height'));
  const border = px(declaration(css.slice(0, css.indexOf(PHONE_MQ)), '.bh-fastlane-banner', 'border-top').split(/\s+/)[0]);
  const collapsed = border + px(top) + teaser + px(bottom);

  // 390x844, the banner's own route: the first Jev-class row ends at y 778.2, so the bar must be at
  // most 844 - 778.2 = 65.8 px tall. 60 keeps a margin for sub-pixel rounding and page drift.
  assert.ok(collapsed <= 60, `collapsed phone banner is ${collapsed}px, which no longer clears the first result row`);
  assert.equal(teaser, 44, 'the teaser is the only tap target in the collapsed bar and must stay 44px');
});

test('CR-167.2/D207: the phone banner starts collapsed and the teaser discloses the full offer', () => {
  assert.match(tsx, /useState\(false\)[\s\S]{0,400}bannerRef/, 'the disclosure must default to collapsed so the first render is the compact bar');
  assert.match(tsx, /data-bh-fastlane-expanded=\{expanded \? "yes" : "no"\}/);
  assert.match(tsx, /aria-expanded=\{expanded\}/);
  assert.match(tsx, /aria-controls="bh-fastlane-body"/);
  assert.match(tsx, /id="bh-fastlane-body"/);
  // Reserved space has to be re-measured when the bar opens or closes, or the end of the document
  // becomes unreachable again.
  assert.match(tsx, /\}, \[visible, expanded\]\);/);
});

test('CR-167.2/D207: the collapsed bar keeps Florian\'s copy and both controls one tap away', () => {
  assert.match(tsx, /Are you a model developer\?<\/strong> Priority evaluations/, 'the teaser must name the audience');
  assert.match(tsx, /Don&apos;t show again/);
  assert.match(tsx, /Request an evaluation/);
  assert.match(tsx, /href="\/jev-models\/request-evaluation"/);
  // The collapsed bar hides the offer, never the close control.
  const hidden = phoneBlock.match(/\[data-bh-fastlane-expanded="no"\][^{]*\{[^}]*display:\s*none/g) ?? [];
  assert.ok(hidden.some((rule) => rule.includes('.bh-fastlane-body')), 'the collapsed bar must hide the offer body');
  assert.ok(!hidden.some((rule) => rule.includes('.bh-fastlane-close')), 'the close control must stay reachable while collapsed');
});

test('CR-167.2/D207: the collapsed height cannot grow with the browser text scale', () => {
  for (const prop of ['height', 'min-height', 'font-size']) {
    const value = declaration(phoneBlock, '.bh-fastlane-teaser', prop);
    assert.match(value ?? '', /px$/, `.bh-fastlane-teaser ${prop} must be an absolute length, got ${value}`);
  }
  assert.equal(declaration(phoneBlock, '.bh-fastlane-teaser-label', 'white-space'), 'nowrap',
    'a wrapping teaser label would make the collapsed bar two lines tall');
});
