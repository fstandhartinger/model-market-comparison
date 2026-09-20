import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const offer = await readFile(new URL('../components/CustomEvaluationOffer.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/jev-models/custom-evaluation/page.tsx', import.meta.url), 'utf8');
const jevPage = await readFile(new URL('../app/jev-models/page.tsx', import.meta.url), 'utf8');
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

test('CR-102 keeps the phone badge beside the eyebrow and makes the toast land legibly', () => {
  assert.match(jevPage, /bh-eyebrow flex flex-nowrap items-center/);
  assert.match(css, /bh-custom-evaluation-badge::after[^}]*height: 44px/);
  assert.match(css, /env\(safe-area-inset-bottom, 0px\)/);
  assert.match(css, /bh-offer-land \.9s/);
  assert.match(css, /0%, 70% \{ opacity: 1; \}/);
  assert.match(css, /bh-offer-wiggle/);
  assert.match(css, /bh-custom-evaluation-badge\.is-wiggling \{ animation: none; \}/);
  assert.doesNotMatch(offer, /addEventListener\("scroll"/);
});

test('CR-102 page states the deliverable, self-run route, data treatment and contact without prices', () => {
  for (const phrase of ['accuracy, calibration, latency and cost', 'free, open-source benchmark', 'github.com/fstandhartinger/jevbench', 'python -m jevbench.cli run', 'python -m jevbench.cli summarize', 'MIT licence', 'written report', 'raw results', 'integration, routing and self-hosting', 'do not publish it', 'delete it on request', 'florian.standhartinger@gmail.com']) assert.match(page, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  assert.doesNotMatch(page, /\$1,000|flat fee|individual quote/i);
  assert.doesNotMatch(page, /working days|turnaround/i);
  assert.match(page, /subject=Custom%20Jev-class%20model%20evaluation/);
  assert.match(page, /href="\/impressum"/);
  assert.match(layout, /href="\/jev-models\/custom-evaluation">Custom evaluation/);
});
