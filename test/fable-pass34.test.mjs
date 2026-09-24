// Fable pass 34 (2026-09-24) — source pins for the surgical fixes Fable shipped itself.
// F-176(b): the three.js licence line lives in the Credit disclosure, not in the 3D view's caption.
// F-181: the log-axis tick labels (cost axis, context axis) sit on the 10 px type floor.
// F-186: a cost-modal source note (the 64-character SHA-256 locator) wraps instead of forcing a horizontal scroll at 390 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const cap = read('../components/JevCapabilityChart.tsx');
const ctx = read('../components/JevContextLength.tsx');
const hub = read('../app/jev-models/page.tsx');
const price = read('../components/PriceValue.tsx');

test('F-176(b): the licence sentence is in Credit, not beside the chart', () => {
  assert.equal(/three\.js r\d+ is included under its MIT license/.test(cap), false, 'the caption no longer carries the licence sentence');
  assert.match(cap, /systems plotted; systems missing cost or Speed are omitted\.<\/p>/, 'the caption keeps its count sentence');
  assert.match(hub, /data-bh-jev-credit-3d>3D view: three\.js r128 \(MIT\)\./, 'Credit names the library once');
});

test('F-181: no 9 px tick label on the cost or context axis', () => {
  assert.equal(cap.includes('text-[9px]'), false, 'capability chart has no 9 px text');
  assert.equal(ctx.includes('text-[9px]'), false, 'context chart has no 9 px text');
  assert.match(cap, /data-bh-jev14-cost-axis[\s\S]*?font-mono text-\[10px\] text-\[var\(--muted\)\]/, 'cost ticks are 10 px');
  assert.match(ctx, /CONTEXT_TICKS\.filter[\s\S]*?font-mono text-\[10px\] text-\[var\(--muted\)\]/, 'context ticks are 10 px');
});

test('F-186: a source note in the cost modal may break inside a long locator', () => {
  assert.match(price, /source\.note && <span className="break-all text-gray-500"> · \{source\.note\}<\/span>/, 'the note span is break-all');
});
