import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const offer = await readFile(new URL('../components/CustomEvaluationOffer.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/jev-models/custom-evaluation/page.tsx', import.meta.url), 'utf8');
const layout = await readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

test('CR-99 offer timing, persistence and accessibility stay explicit', () => {
  assert.match(offer, /setTimeout\(\(\) => setPhase\("open"\), 6000\)/);
  assert.match(offer, /setTimeout\(\(\) => setPhase\("landing"\), 14000\)/);
  assert.match(offer, /localStorage\.getItem\(NEVER_KEY\)/);
  assert.match(offer, /try \{/);
  assert.match(offer, /aria-live="polite"/);
  assert.match(offer, /event\.key === "Escape"/);
  assert.match(offer, /aria-label="Dismiss custom evaluation offer"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /--offer-x/);
});

test('CR-99 page states the deliverable, price, data treatment and contact without a turnaround promise', () => {
  for (const phrase of ['accuracy, calibration, latency and cost', '$1,000 per evaluation', 'individual quote', 'written report', 'raw results', 'integration, routing and self-hosting', 'do not publish it', 'delete it on request', 'florian.standhartinger@gmail.com']) assert.match(page, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  assert.doesNotMatch(page, /working days|turnaround/i);
  assert.match(page, /subject=Custom%20Jev-class%20model%20evaluation/);
  assert.match(page, /href="\/impressum"/);
  assert.match(layout, /href="\/jev-models\/custom-evaluation">Custom evaluation/);
});
