// Pareto blue (23 Oct 2026, display only): Jev is highlighted in blue on both Pareto charts, on or off the frontier,
// identified only by the exact JEV_OPEN_REFERENCE_KEYS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JEV_OPEN_REFERENCE_KEYS } from '../lib/jevbench-scope.mjs';

const src = await readFile(new URL('../components/JevParetoCharts.tsx', import.meta.url), 'utf8');

test('Jev identity comes only from the exact reference keys', () => {
  assert.deepEqual(JEV_OPEN_REFERENCE_KEYS, ['jev-1.13.0', 'jev-1.14.0']);
  assert.match(src, /import \{ JEV_OPEN_REFERENCE_KEYS \} from '\.\.\/lib\/jevbench-scope\.mjs';/);
  assert.match(src, /const isJev = \(key: string\) => JEV_OPEN_REFERENCE_KEYS\.includes\(key\);/);
  assert.doesNotMatch(src, /name\.toLowerCase\(\)\.includes\('jev'\)|\/jev\/i/);
});

test('Jev marker, label and legend carry their test hooks', () => {
  assert.match(src, /fill=\{JEV_BLUE\}[^>]*data-bh-jev-pareto-jev=\{d\.p\.key\}/);
  assert.match(src, /data-bh-jev-pareto-jev-label=\{l\.jev \? l\.key : undefined\}/);
  assert.match(src, /data-bh-jev-pareto-legend/);
  assert.match(src, /Jev \(TypeSafe reference\)/);
});

test('Jev is drawn after (on top of) the frontier and other points, and its label is placed first', () => {
  const line = src.indexOf('data-bh-jev-pareto-line');
  const marker = src.indexOf('data-bh-jev-pareto-jev={');
  assert.ok(line > 0 && marker > line);
  assert.match(src, /return \[\.\.\.jev, \.\.\.rest\]\.map/);
  // a frontier Jev never gets a second (red) marker or a duplicate label
  assert.match(src, /onFrontier\.has\(d\.p\.key\) && !isJev\(d\.p\.key\)\)\.map\(\(d\) => <circle/);
  assert.match(src, /onFrontier\.has\(d\.p\.key\) && !isJev\(d\.p\.key\)\)\.sort/);
});

test('frontier math is untouched', () => {
  assert.match(src, /paretoFrontier\(plotted\.map\(\(p\) => \(\{ id: p\.key, x: value\(p\) as number, y: p\.capability \}\)\)\)/);
});
