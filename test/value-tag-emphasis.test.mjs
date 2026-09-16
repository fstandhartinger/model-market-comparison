// CR-47.1 / F-103 (Fable pass 19): the strong value-tag level must be plainly more emphatic than the weak one — a solid
// pill versus a pale tint, bolder type — in both signal colours and both themes. Guards the stylesheet so a later edit
// cannot quietly reverse the hierarchy again (Florian, 16 Sep 2026: the intense level looked less intense).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const rule = (selector) => {
  const m = css.match(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m"));
  assert.ok(m, `rule ${selector} exists`);
  return m[1];
};
const weight = (body) => Number((body.match(/font-weight:\s*(\d+)/) || [])[1]);
const rgb = (theme, token) => {
  const block = theme === "dark" ? css.match(/:root\s*\{([^}]*)\}/)[1] : css.match(/\[data-theme="light"\]\s*\{([^}]*)\}/)[1];
  return block.match(new RegExp(`${token}:\\s*(\\d+ \\d+ \\d+)`))[1].split(" ").map(Number);
};
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const blend = (fg, alpha, bg) => fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));

test("strong is a solid pill in the signal colour with surface-coloured bold text", () => {
  const strong = rule('.bh-value-tag[data-level="strong"]');
  assert.match(strong, /color:\s*rgb\(var\(--panel\)\)/);
  assert.match(rule('.bh-value-tag[data-level="strong"][data-kind="cheap"]'), /background:\s*rgb\(var\(--accent2\)\)\s*;/);
  assert.match(rule('.bh-value-tag[data-level="strong"][data-kind="pricey"]'), /background:\s*rgb\(var\(--warn\)\)\s*;/);
  assert.equal(weight(strong), 700);
});

test("weak is a pale tint (alpha ≤ 0.2) with medium type, no outline, lighter than strong", () => {
  const weak = rule('.bh-value-tag[data-level="weak"]');
  assert.doesNotMatch(weak, /box-shadow|border/);
  assert.ok(weight(weak) < 700 && weight(weak) >= 500, `weak weight ${weight(weak)} sits between 500 and 699`);
  for (const kind of ["cheap", "pricey"]) {
    const alpha = Number(rule(`.bh-value-tag[data-kind="${kind}"]`).match(/background:\s*rgb\(var\(--\w+\)\s*\/\s*(\.\d+|0?\.\d+)\)/)[1]);
    assert.ok(alpha <= 0.2, `${kind} tint alpha ${alpha} ≤ 0.2`);
  }
});

test("text contrast on both levels meets WCAG AA (≥ 4.5:1) in light and dark", () => {
  for (const theme of ["light", "dark"]) {
    const panel = rgb(theme, "--panel");
    for (const token of ["--accent2", "--warn"]) {
      const colour = rgb(theme, token);
      assert.ok(contrast(panel, colour) >= 4.5, `${theme} strong ${token}: surface text on solid pill ${contrast(panel, colour).toFixed(2)}:1`);
      const tint = blend(colour, 0.14, panel);
      assert.ok(contrast(colour, tint) >= 4.5, `${theme} weak ${token}: signal text on tint ${contrast(colour, tint).toFixed(2)}:1`);
    }
  }
});
