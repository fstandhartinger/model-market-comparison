import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JEV_ARCH_CLASSES } from '../lib/jevbench-architecture.mjs';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const linear = (v) => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const luminance = (rgb) => rgb.map(linear).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
// CR-292: Machado 2009 severity-1 matrices on linear RGB; CIE76 in D65 Lab. ΔE >= 5 guards against
// near-identical swatches; labels, counts and dashed comparison lines also identify classes without hue.
const matrices = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
};
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
function lab(rgb, matrix) {
  const original = rgb.map(linear);
  const simulated = matrix.map((row) => Math.max(0, Math.min(1, dot(row, original))));
  const xyz = [[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.072175], [0.0193339, 0.119192, 0.9503041]].map((row, i) => dot(row, simulated) / [0.95047, 1, 1.08883][i]);
  const f = xyz.map((v) => v > 216 / 24389 ? Math.cbrt(v) : (24389 / 27 * v + 16) / 116);
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}
function variables(theme) {
  const out = {};
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!(theme === 'dark' ? selector.includes(':root') || selector.includes('[data-theme="dark"]') : selector.includes('[data-theme="light"]'))) continue;
    for (const [, name, value] of body.matchAll(/(--jev-a-[\w-]+|--ink):\s*([\d ]+)\s*;/g)) out[name] = value.trim().split(/\s+/).map(Number);
  }
  return out;
}
for (const theme of ['dark', 'light']) test(`${theme} architecture palette: contrast and CVD distance`, (t) => {
  const vars = variables(theme);
  const colors = JEV_ARCH_CLASSES.map((c) => { assert.equal(vars[c.cssVar]?.length, 3, c.id); return vars[c.cssVar]; });
  assert.equal(new Set(colors.map(String)).size, 8);
  for (const [i, color] of colors.entries()) assert.ok(contrast(color, vars['--ink']) >= 3, `${JEV_ARCH_CLASSES[i].id}: ${contrast(color, vars['--ink'])}`);
  for (const [name, matrix] of Object.entries(matrices)) {
    const labs = colors.map((c) => lab(c, matrix)); let min = Infinity, pair;
    for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
      const distance = Math.hypot(...labs[i].map((v, k) => v - labs[j][k]));
      if (distance < min) { min = distance; pair = `${JEV_ARCH_CLASSES[i].id}/${JEV_ARCH_CLASSES[j].id}`; }
    }
    t.diagnostic(`${theme} ${name} minimum CIE76 ${min.toFixed(3)} (${pair})`);
    assert.ok(min >= 5, `${name} minimum ${min} (${pair})`);
  }
});
