// 2026-09-22: an English count never reads "1 offers". 194 of the 863 published model pages carry
// exactly one offer, seven providers offer exactly one model, and a board can open on a single
// matched row — every one of those surfaces printed a plural noun after the number.
//
// These tests do not pin the spelling of a sentence (a later copy change would only have to be
// re-spelled here). They take the rule's own expression out of the source, evaluate it, and read
// the two counts that matter: one, and more than one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p) => readFile(new URL(p, import.meta.url), 'utf8');
const format = await read('../lib/format.ts');

/** The shipped helper, lifted out of lib/format.ts and made runnable — so these tests fail when
 *  the helper itself changes, not when someone reformats the file around it. */
const countedSrc = format.match(/export function counted\([\s\S]*?\n\}/)?.[0];
const counted = new Function(`${countedSrc.replace('export function', 'return function')}`.replace(/: number|: string(?= *[,)])|: string(?= *\{)/g, '').replace(/\): string \{/, ') {'))();

test('counted() reads one thing in the singular and everything else in the plural', () => {
  assert.ok(countedSrc, 'lib/format.ts exports counted()');
  assert.equal(counted(1, 'offer'), '1 offer');
  assert.equal(counted(0, 'offer'), '0 offers');
  assert.equal(counted(2, 'offer'), '2 offers');
  assert.equal(counted(17, 'model'), '17 models');
  assert.equal(counted(1, 'family', 'families'), '1 family');
  assert.equal(counted(3, 'family', 'families'), '3 families');
});

// Every surface below prints a count that today can be exactly one. The check evaluates the
// component's own expression with counted() in scope, so it tests what a reader sees.
const sites = [
  ['../app/models/[id]/page.tsx', /counted\(offers\.length, "offer"\)/, 'the model page subtitle'],
  ['../components/ModelDetailOffers.tsx', /counted\(catalog\.length, "offer"\)/, 'the token-offer panel'],
  ['../components/ModelExplorer.tsx', /counted\(rows\.length, "model"\)/, 'the explorer row count'],
  ['../components/GlobalFilters.tsx', /counted\(s\.resultCount, "model"\)/, 'the filter sheet button'],
  ['../components/ProviderExplorer.tsx', /counted\(dir\.length, "provider"\)/, 'the provider directory'],
  ['../components/ProvidersView.tsx', /counted\(shown\.length, "provider"\)/, 'the providers table'],
  ['../components/CostCapabilityScatter.tsx', /counted\(points\.length, "model"\)/, 'the value map'],
  ['../components/BenchmarkRanking.tsx', /counted\(rows\.length, 'result'\)/, 'a board’s result count'],
  ['../components/BenchmarkMatrix.tsx', /counted\(m\.benchmark_count, "benchmark"\)/, 'the matrix model picker'],
  ['../components/BenchmarkSheet.tsx', /counted\(sheetRows\.length, "value"\)/, 'the benchmark sheet basis lines'],
];

test('the counted surfaces all take their noun from the helper', async () => {
  for (const [file, re, what] of sites) {
    assert.match(await read(file), re, `${what} (${file}) counts through counted()`);
  }
});

test('no counted surface prints a bare plural after a number again', async () => {
  // The exact shape the bug had: a braced count immediately followed by a plural noun.
  const bare = /\{[^{}]*\b(?:length|count|resultCount|benchmark_count)\b[^{}]*\}[  ]?(?:models|offers|providers|results|benchmarks|rows|values|families)\b/;
  for (const [file, , what] of sites) {
    const src = await read(file);
    const hit = src.match(bare);
    assert.equal(hit, null, `${what} (${file}) still prints ${hit?.[0]}`);
  }
});

test('the ranking sentence about unmatched rows agrees with its own number', async () => {
  const ranking = await read('../components/BenchmarkRanking.tsx');
  const expr = ranking.match(/`\$\{matchedRows\} of \$\{counted\([\s\S]*?\} matched to catalog models[^`]*`/)?.[0];
  assert.ok(expr, 'the sentence is built from one template literal');
  const render = (allRowsLength, matchedRows) =>
    new Function('counted', 'allRows', 'matchedRows', 'axis', 'direction', `return ${expr};`)(
      counted, { length: allRowsLength }, matchedRows, { unit: '%' }, 'higher is better');
  assert.match(render(1, 1), /^1 of 1 published result is matched to catalog models/);
  assert.match(render(15, 1), /^1 of 15 published results are matched to catalog models/);
});

test('a one-row board and a one-value sheet read as English', async () => {
  const ranking = await read('../components/BenchmarkRanking.tsx');
  assert.match(ranking, /none of these \$\{counted\(rows\.length, 'result'\)\} is matched to a catalog model yet\./);
  assert.equal(counted(1, 'result'), '1 result');

  const sheet = await read('../components/BenchmarkSheet.tsx');
  // The plural reading must stay byte-identical: CR-127.4's live verifier reads
  // "2 of 2 values are announced, chart-read figures (‡)" off the page.
  const line = sheet.match(/data-bh-sheet-preliminary-line>([\s\S]*?)<\/p>/)?.[1];
  assert.ok(line, 'the preliminary-basis sentence is still there');
  const render = (n) => new Function('counted', 'preliminaryRows', 'sheetRows', `return \`${line
    .replace(/\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (_, e) => '${' + e + '}')
    .replace(/&apos;/g, "'")}\`;`)(counted, { length: n }, { length: n });
  assert.equal(render(2), '2 of 2 values are announced, chart-read figures (‡): shown only, and never entering a score, a ranking or a percentile.');
  assert.equal(render(1), '1 of 1 value is an announced, chart-read figure (‡): shown only, and never entering a score, a ranking or a percentile.');
});
