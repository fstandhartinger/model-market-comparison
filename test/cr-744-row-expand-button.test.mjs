// CR-744 (BH-QR-003, 12 Nov 2026): ranking rows expand by keyboard too. The chevron is a real
// button with aria-expanded and aria-controls pointing at the details cell; the row click stays.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../components/ModelExplorer.tsx", import.meta.url), "utf8");

test("ranking row chevron is a button with aria-expanded and aria-controls", () => {
  const btn = src.match(/<button type="button"[\s\S]*?bh-row-chevron[\s\S]*?>›<\/button>/);
  assert.ok(btn, "chevron button missing");
  assert.match(btn[0], /aria-expanded=\{isOpen\}/);
  assert.match(btn[0], /aria-controls=\{`model-details-\$\{encodeURIComponent\(m\.id\)\}`\}/);
  assert.match(btn[0], /e\.stopPropagation\(\)/);
});

test("details cell carries the id the button controls; row click still toggles", () => {
  assert.match(src, /<td id=\{`model-details-\$\{encodeURIComponent\(m\.id\)\}`\} colSpan=\{6\}/);
  assert.match(src, /<tr className="bh-ranking-row[^"]*" onClick=\{\(\) => setExpanded\(isOpen \? null : m\.id\)\}/);
});
