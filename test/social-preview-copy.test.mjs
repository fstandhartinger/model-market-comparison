// CR-45.1 (Florian 2026-09-16): link previews (description, Open Graph, Twitter, share image) carry the
// accepted hero copy, never the retired slogan.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const RETIRED = [/benchmark we can find/i, /really costs you/i];

test("layout metadata uses the accepted brand copy in every preview field", () => {
  const src = read("app/layout.tsx");
  for (const re of RETIRED) assert.doesNotMatch(src, re);
  assert.match(src, /BRAND_CLAIM = "The most detailed cost–capability analysis in AI\."/);
  assert.match(src, /BRAND_LINE = "Every model\. Every Benchmark\. Actual Costs\."/);
  const hero = read("app/page.tsx");
  // CR-72.1: the hero renders the same two constants the previews use, one block per sentence.
  assert.match(hero, /noWidow\(BRAND_CLAIM\)/, "hero claim comes from the shared constant");
  assert.match(hero, /noWidow\(BRAND_LINE\)/, "hero line comes from the shared constant");
  const seo = read("lib/seo.ts");
  assert.match(seo, /BRAND_CLAIM = "The most detailed cost–capability analysis in AI\."/);
  assert.match(seo, /BRAND_LINE = "Every model\. Every Benchmark\. Actual Costs\."/);
  for (const key of ["description:", "openGraph:", "twitter:"]) assert.ok(src.includes(key));
  assert.equal((src.match(/\$\{BRAND_CLAIM\} \$\{BRAND_LINE\}/g) || []).length, 4, "description, og description, og alt, twitter description");
});

test("share image carries the accepted copy and no retired wording", () => {
  for (const p of ["public/brand/og-image.svg", "scripts/build-brand-assets.mjs"]) {
    const s = read(p);
    for (const re of RETIRED) assert.doesNotMatch(s, re, p);
    assert.ok(s.includes(">The most detailed cost–capability analysis in AI.</text>"), p);
    assert.ok(s.includes(">Every model. Every Benchmark. Actual Costs.</text>"), p);
  }
});
