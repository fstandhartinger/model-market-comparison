import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// JevBench pages (/jev-models, /jev-models/api): aria-controls only names a panel that is in the DOM, so toggles whose
// panel renders conditionally set it only while open.
test('JevBench: aria-controls is gated on the conditionally rendered panel', async () => {
  const charts = await src('components/JevBenchV16Charts.tsx');
  assert.match(charts, /aria-controls=\{show3d \? 'jev16-capability-3d' : undefined\}/);
  assert.match(charts, /\{show3d && <div id="jev16-capability-3d">/);
  const combobox = await src('components/JevCompareV14.tsx');
  assert.match(combobox, /aria-controls=\{open \? `\$\{id\}-options` : undefined\}/);
  assert.match(combobox, /\{open && <div ref=\{list\} id=\{`\$\{id\}-options`\}/);
  const presets = await src('components/PresetMenu.tsx');
  assert.match(presets, /aria-controls=\{open \? panelId : undefined\}/);
  assert.match(presets, /\{open && <div id=\{panelId\}/);
});

// The Jev-class reference paragraph is shown once, in Method under "Headline and Composite"; the frozen overnight note
// that repeats it is shown without the repeated sentences.
test('JevBench: Jev-class reference paragraph is not repeated in the overnight notes', async () => {
  const board = await src('components/JevBenchV16Board.tsx');
  assert.equal(board.match(/Jev-class caps use a fixed reference: Jev 1\.13\.0 as measured in v1\.5 \(p50/g)?.length, 1);
  assert.match(board, /data-bh-jev16-class-reference>Jev-class caps use a fixed reference/);
  assert.match(board, /: note\)\.replace\(CLASS_REFERENCE_REPEAT, ''\)/);
  const re = new RegExp(board.match(/const CLASS_REFERENCE_REPEAT = \/(.+)\/;/)[1]);
  const release = JSON.parse(await src('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json'));
  const repeated = release.overnight.notes.filter((n) => n.startsWith('Jev-class caps use a fixed reference'));
  assert.equal(repeated.length, 1);
  assert.equal(repeated[0].replace(re, ''), 'Wity auto remains outside the latency cap and stays ranked in Composite A. OFF and ALWAYS are unranked variants of the AUTO main row.');
});
