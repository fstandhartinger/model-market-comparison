import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { costAxisCaption } from '../lib/value-map.mjs';

// CR-76 (Florian 2026-09-17): "man sieht im Moment am Diagramm nicht, dass die eine Achse capability und die
// andere cost per task ist" — the value map needs small, subtle axis labels, and the same ones wherever the
// cost/capability chart is reused.
const src = readFileSync(new URL('../components/CostCapabilityScatter.tsx', import.meta.url), 'utf8');

test('CR-76.1: the compact value map labels both axes, under the plot, in every compact variant', () => {
  const block = src.slice(src.indexOf('data-bh-value-map-axes'), src.indexOf('data-bh-pareto-caption'));
  assert.match(block, /data-bh-axis-y>↑ Capability/, 'the Y axis is named capability, with its direction');
  assert.match(block, /data-bh-axis-x>→ Adjusted cost per task/, 'the X axis is named');
  // The direction lives in the map's own header line, so the caption stays one line at 390 px.
  assert.match(src, /cheaper → right/, 'the header still says which way is cheaper');
  // Not hidden behind a mode: the row is rendered unconditionally in the compact branch.
  assert.ok(!/\{advanced && .*data-bh-value-map-axes/.test(src), 'no mode guard on the axis row');
  assert.ok(!src.includes('{advanced && !wide && <div className="flex justify-between text-[11px] text-gray-500"><span>{SCORE_SHORT_LABELS[score]} ↑</span>'),
    'the old advanced-only footer row is replaced, not duplicated');
});

test('CR-76.2: the full chart names the same two axes', () => {
  assert.match(src, /value=\{`Adjusted cost per task · \$\{costAxisCaption\(/, 'X axis label leads with the same words');
  assert.match(src, /value=\{`Capability · \$\{scoreChartLabel\(/, 'Y axis label leads with the same words');
  // The direction hint the caption already carried is kept.
  assert.match(costAxisCaption('lowest Adjusted $/task'), /more expensive.*cheaper/);
});
