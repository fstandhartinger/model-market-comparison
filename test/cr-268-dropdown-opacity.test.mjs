import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// CR-268 (2 Oct 2026): the JevCompareV14 SystemCombobox and the ImageJevRadar SystemPicker dropdowns must render
// fully opaque above the page's charts/panels. `--surface` is defined in app/globals.css as a complete hex color,
// so `rgb(var(--surface))` and the never-defined `--surface-2` produced transparent/invalid backgrounds that let
// charts bleed through the open listboxes. Both listboxes now sit on an opaque var(--surface) with their original
// border/shadow, raised to z-50 (GlobalFilters popover is z-40, Nav header z-50 when open), and the active option
// highlights with the theme-aware `accent` token (registered in tailwind.config.ts as rgb(var(--accent)/<alpha>)),
// matching the ImageJevRadar picker's existing bg-accent/10.

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const themeBlocks = async () => {
  const css = await read('../app/globals.css');
  const blocks = [];
  for (const match of css.matchAll(/(^\s*(:root|\[data-theme="light"\])\s*\{)([\s\S]*?)(^\s*\})/gm)) {
    blocks.push({ selector: match[2], body: match[3] });
  }
  assert.ok(blocks.length >= 2, 'globals.css has :root and light theme blocks');
  return blocks;
};

const token = (body, name) => {
  const value = body.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`))?.[1]?.trim();
  assert.ok(value, `theme block defines --${name}`);
  return value;
};

const isNumericTriplet = (value) => /^[\d.]+\s+[\d.]+\s+[\d.]+$/.test(value);
const isCompleteColor = (value) => /^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(value);

test('CR-268: theme tokens are defined as the dropdowns assume them', async () => {
  const blocks = await themeBlocks();
  // Both base theme blocks (dark :root and [data-theme="light"]) define --surface; validate those in full.
  const base = { ':root': blocks.find((b) => b.selector === ':root' && /--surface\s*:/.test(b.body)),
    '[data-theme="light"]': blocks.find((b) => b.selector === '[data-theme="light"]' && /--surface\s*:/.test(b.body)) };
  for (const [selector, block] of Object.entries(base)) {
    assert.ok(block, `${selector} has a base block defining --surface`);
    // --surface is a complete color, so a raw var() background is opaque in both themes…
    assert.ok(isCompleteColor(token(block.body, 'surface')), `${selector} --surface is a complete color, not an rgb triplet`);
    assert.ok(!isNumericTriplet(token(block.body, 'surface')), `${selector} --surface is not an rgb triplet`);
  }
  // …while --accent and --line are rgb triplets everywhere they are defined, so rgb(var(--accent)/a)
  // and rgb(var(--line)) are valid in every theme.
  for (const block of blocks) {
    for (const name of ['accent', 'line']) {
      if (!new RegExp(`--${name}\\s*:`).test(block.body)) continue;
      assert.ok(isNumericTriplet(token(block.body, name)), `every --${name} definition stays an rgb triplet`);
    }
  }
});

test('CR-268: JevCompareV14 SystemCombobox listbox is opaque, bordered, shadowed and stacked above the page', async () => {
  const source = await read('../components/JevCompareV14.tsx');
  const listbox = source.match(/role="listbox"[^>]*\n?\s*className="([^"]+)"/);
  assert.ok(listbox, 'SystemCombobox renders a role=listbox');
  const classes = listbox[1];
  assert.ok(classes.includes('bg-[var(--surface)]'), 'listbox background is the opaque --surface');
  assert.ok(!classes.includes('rgb(var(--surface))'), 'listbox does not wrap the hex --surface in rgb()');
  assert.ok(classes.includes('border-[rgb(var(--line))]'), 'listbox keeps its --line border');
  assert.ok(classes.includes('shadow-lg'), 'listbox keeps its shadow');
  assert.ok(classes.includes('z-50'), 'listbox stacks at z-50');
  assert.ok(!/\bz-[1234]0\b/.test(classes), 'listbox is not stacked below its old z-30');
  const option = source.match(/data-option-index=\{index\} className=\{`([^`]+)`\}/);
  assert.ok(option, 'active option class is present');
  assert.ok(option[1].includes('bg-accent/10'), 'active option highlight is the theme-aware accent tint');
  // The table row-group headers keep their own (out-of-scope) styling; the dropdown option must not use --surface-2.
  assert.ok(!option[1].includes('surface-2'), 'dropdown option no longer references the undefined --surface-2');
});

test('CR-268: ImageJevRadar SystemPicker listbox stays opaque and stacks at z-50', async () => {
  const source = await read('../components/ImageJevRadar.tsx');
  const listbox = source.match(/role="listbox"[\s\S]{0,120}?className="([^"]+)"/);
  assert.ok(listbox, 'SystemPicker renders a role=listbox');
  const classes = listbox[1];
  assert.ok(classes.includes('bg-[var(--surface)]'), 'listbox background is the opaque --surface');
  assert.ok(!classes.includes('rgb(var(--surface))'), 'listbox does not wrap the hex --surface in rgb()');
  assert.ok(classes.includes('border-line'), 'listbox keeps its border');
  assert.ok(/shadow-(lg|xl)/.test(classes), 'listbox keeps its shadow');
  assert.ok(classes.includes('z-50'), 'listbox stacks at z-50');
  assert.ok(!classes.includes('z-20'), 'listbox is not stacked below its old z-20');
});

test('CR-268: the accent tint resolves through a registered Tailwind theme token', async () => {
  const config = await read('../tailwind.config.ts');
  const accent = config.match(/accent:\s*"([^"]+)"/);
  assert.ok(accent && accent[1].includes('var(--accent)'), "tailwind registers accent on --accent, so bg-accent/10 is theme-aware");
  const css = await read('../app/globals.css');
  const uses = (await Promise.all([read('../components/JevCompareV14.tsx'), read('../components/ImageJevRadar.tsx')]))
    .map((s) => [...s.matchAll(/bg-accent\/(\d+)/g)]).flat();
  assert.ok(uses.length >= 2, 'both pickers highlight via bg-accent/<alpha>');
  for (const use of uses) {
    assert.ok(Number(use[1]) <= 25, `bg-accent/${use[1]} stays a light tint over the opaque surface`);
  }
  assert.ok(css.includes('--accent:'), 'globals.css defines --accent for both themes');
});
