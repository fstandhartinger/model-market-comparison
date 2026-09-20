// Fable pass 27 work-engine directives F-149/F-150/F-151 (implemented by the work engine, opencode-kimi):
// F-149 the custom-evaluation page's two actions under the title, the shortened email sentence, and the code
// block wrapping instead of scrolling sideways; F-150 the JevBench table head back inside the pass-22 budget;
// F-151 the four scope buttons as a 2 × 2 grid below sm. Source-level pins, like test/fable-pass27.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p) => readFile(new URL(p, import.meta.url), 'utf8');
const [custom, jev] = await Promise.all([
  read('../app/jev-models/custom-evaluation/page.tsx'), read('../components/JevModelsV12.tsx'),
]);

test('F-149: the two actions sit under the header lead, mail primary, GitHub secondary', () => {
  const actions = custom.match(/<p className="mt-5 flex flex-wrap gap-3" data-bh-custom-actions>([\s\S]*?)<\/p>/)?.[1];
  assert.ok(actions, 'data-bh-custom-actions row exists');
  const links = [...actions.matchAll(/<a className="([^"]*)" href=\{?([^ }>]{1,80})\}?([^>]*)>([^<]+)<\/a>/g)];
  assert.equal(links.length, 2, 'exactly two actions');
  assert.match(links[0][4], /Email us about your data/);
  assert.match(actions, /href=\{contact\}/, 'primary keeps the existing mailto target');
  assert.ok(actions.indexOf('{contact}') < actions.indexOf('github.com'), 'mail first');
  assert.match(links[1][4], /Run it yourself on GitHub/);
  assert.match(links[1][3], /target="_blank" rel="noopener noreferrer"/);
  assert.match(links[0][1], /bh-button/, 'buttons use the site button class');
  assert.equal(custom.match(/mailto:/g).length, 1, 'exactly one mailto target as before');
  assert.ok(actions.indexOf('data-bh-custom-actions') === -1);
  assert.ok(custom.indexOf('data-bh-custom-actions') < custom.indexOf('</header>'), 'actions inside the header');
});

test('F-149: the email-section closing sentence is the short form; the code block wraps', () => {
  assert.doesNotMatch(custom, /Evaluation and consulting arrangements are discussed by email/);
  assert.match(custom, /Custom evaluations and consulting are arranged by email\./);
  const pre = custom.match(/<pre className="([^"]*)">/)?.[1];
  assert.ok(pre);
  assert.match(pre, /whitespace-pre-wrap/, 'the code block wraps');
  assert.doesNotMatch(pre, /overflow-x-auto/, 'no sideways scroll at 390');
});

test('F-150: the sort column is min-w-[9.5rem] at sm+ so the head fits the pass-22 budget', () => {
  assert.match(jev, /className=\{hero \? "sm:min-w-\[9\.5rem\]" : "whitespace-nowrap"\}/);
  assert.doesNotMatch(jev, /min-w-\[7\.5rem\]/, 'the 120 px cap is gone');
});

test('F-151: the four scope buttons are a 2 × 2 grid below sm, one row at sm+', () => {
  assert.match(jev, /className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group"/);
  const btn = jev.match(/data-bh-jev12-scope-option=\{item\.id\}[^]*$/)?.[0];
  assert.ok(btn);
  assert.match(jev, /className="bh-button min-h-10 w-full text-sm font-semibold sm:w-auto" aria-pressed/);
});
