// CR-74.5 (Florian 2026-09-17): opening "Better than a model ▾" / "Evidence ▾" in the Advanced Overview must not move
// the toolbar row, and Advanced shows every header Options control inline through the same component.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const explorer = read('components/ModelExplorer.tsx');
const filters = read('components/GlobalFilters.tsx');
const css = read('app/globals.css');

test('CR-74.5: toolbar popovers are out of flow and close on Escape / outside click', () => {
  const popovers = explorer.match(/<div className="bh-toolbar-popover [^"]*"/g) ?? [];
  assert.equal(popovers.length, 2);
  for (const p of popovers) { assert.match(p, /\babsolute\b/); assert.match(p, /\btop-full\b/); }
  assert.doesNotMatch(explorer, /<details className="relative">\s*<summary[^>]*>\s*(Evidence|\{chosenComparisonMetric)/);
  assert.match(explorer, /import \{ MenuDetails \} from "\.\/Nav"/);
  assert.match(read('components/Nav.tsx'), /export function MenuDetails/);
  // the global open-summary margin grew the <details> by 8 px and pushed the row
  assert.match(css, /\.bh-advanced-toolbar details\[open\] > summary \{ margin-bottom: 0; \}/);
});

test('CR-74.5: Advanced renders the shared Options body inline, not a copy', () => {
  assert.match(explorer, /\{!simple && <OptionsInline /);
  assert.match(filters, /export function OptionsInline/);
  assert.equal((filters.match(/<OptionsBody /g) ?? []).length, 2, 'header popup and inline panel both render OptionsBody');
  assert.equal((filters.match(/<Section title="Ranking">/g) ?? []).length, 1, 'the controls exist once');
  // both can be in the page at once: ids differ
  assert.match(filters, /ioBasisId = inline \? "bh-io-basis-inline" : "bh-io-basis"/);
});
