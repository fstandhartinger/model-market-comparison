// CR-72.1 (Florian 2026-09-17): "Can we make the font size if these two header sentences adjust
// in mobile portrait so that it doesn't wrap for 1 word?" — neither hero sentence may leave its
// last word alone on a line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const NBSP = "\u00A0";
// The helper is TypeScript; the rule it implements is short enough to mirror here, and the
// source check below keeps the two from drifting apart.
const noWidow = (text) => text.replace(/\s+(\S+)\s*$/, `${NBSP}$1`);

test("noWidow ties the last word to the one before it and changes nothing else", () => {
  assert.equal(noWidow("The most detailed cost–capability analysis in AI."), `The most detailed cost–capability analysis in${NBSP}AI.`);
  assert.equal(noWidow("Every model. Every Benchmark. Actual Costs."), `Every model. Every Benchmark. Actual${NBSP}Costs.`);
  assert.equal(noWidow("Single"), "Single", "one word has no widow to fix");
  assert.equal(noWidow("Two words"), `Two${NBSP}words`);
  assert.equal(noWidow("trailing space "), `trailing${NBSP}space`);
  for (const s of ["The most detailed cost–capability analysis in AI.", "Every model. Every Benchmark. Actual Costs."]) {
    assert.equal(noWidow(s).replace(/\u00A0/g, " "), s, "the approved copy survives, character for character");
    assert.equal(noWidow(s).split(/[\s\u00A0]+/).length, s.split(/\s+/).length, "no word is added or lost");
  }
});

test("the shipped helper implements the same rule", () => {
  const src = read("lib/typography.ts");
  assert.match(src, /replace\(\/\\s\+\(\\S\+\)\\s\*\$\/, `\$\{NBSP\}\$1`\)/);
  assert.match(src, /NBSP = "\\u00A0"/);
});

test("the hero gives each sentence its own balanced block", () => {
  const hero = read("app/page.tsx");
  assert.doesNotMatch(hero, /<br \/>/, "no manual line break in the hero");
  assert.match(hero, /bh-display-line">\{noWidow\(BRAND_CLAIM\)\}/);
  assert.match(hero, /bh-display-line bh-display-accent">\{noWidow\(BRAND_LINE\)\}/);
  const css = read("app/globals.css");
  assert.match(css, /\.bh-display-line \{ display: block; text-wrap: balance; \}/);
  assert.match(css, /\.bh-display \{ font-size: clamp\(17px, 5vw, 19px\)/, "mobile size is fluid, not a fixed 19px");
  assert.match(css, /\.bh-display \.bh-display-accent \{ color: rgb\(var\(--accent2\)\); \}/, "only the second sentence keeps the accent colour");
});

// Found by the CR-72 verifier while measuring the hero: at 768–819 px the header's long BETA
// label pushed the row to ~808 px and the whole page scrolled sideways (live too, before this
// change). The long form now starts where it fits.
test("the header's long BETA label starts only where the header fits", () => {
  const nav = read("components/Nav.tsx");
  assert.match(nav, /BETA<span className="hidden min-\[830px\]:inline">&nbsp;— Work in progress<\/span>/);
  assert.doesNotMatch(nav, /BETA<span className="hidden md:inline"/, "md (768 px) overflowed the header");
});
