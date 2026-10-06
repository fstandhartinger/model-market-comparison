import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { jevbenchScopeArtifact, jevbenchScopeCarry, jevScopeClassifier } from '../lib/jevbench-scope.mjs';
import { baseModelFootnotes, baseModelFor, baseModelVisibleNote } from '../lib/jev-base-model.mjs';

// CR-292 v1.7.1 (Florian, 6 Oct 2026 ~13:30 Berlin): display-only follow-up of the open-weights / API split.
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const board = src('components/JevBenchV16Board.tsx');
const route = src('components/JevBenchV16ReleaseRoute.tsx');
const ranking = src('components/JevCapabilityRanking.tsx');

test('1: the Jev reference row reads exactly as Florian asked', () => {
  assert.match(ranking, /'Not ranked, only shown as a reference to compare with'/);
  assert.match(ranking, /listing === JEV_SCOPE_LISTING\.reference\) return 'Not ranked, only shown as a reference to compare with'/);
});

test('2: ranking headings name the board (open weights / API offerings)', () => {
  assert.match(board, /scope === 'open' \? 'open weights' : scope === 'api' \? 'API offerings'/);
  assert.match(board, /scoreLabel=\{scopeLabel \? `JevBench Composite Score \(\$\{scopeLabel\}\)`/);
  assert.match(ranking, /Capability Score\{scopeLabel && ` \(\$\{scopeLabel\}\)`\}<\/h2>/);
  assert.match(src('components/JevBubbleChart.tsx'), /Capability against cost and speed\{scopeLabel && ` \(\$\{scopeLabel\}\)`\}/);
});

test('3: the open board has one expandable sentence on the split, with the API link and the toggle', () => {
  const why = route.slice(route.indexOf('data-bh-jev-split-why'), route.indexOf('</details>', route.indexOf('data-bh-jev-split-why')));
  assert.match(why, /<summary[^>]*><b>Why open weights and API offerings are separate:<\/b>/);
  assert.match(why, /href="\/jev-models\/api"/);
  assert.match(why, /Show API offerings/);
  for (const reason of ['Fair cost and speed', 'API prices can change', 'Different fairness needs', 'Open-source focus']) assert.ok(why.includes(reason), reason);
});

test('4: the API board leads with the Composite and lists every API offering', async () => {
  const body = board.slice(board.indexOf('export function JevBenchV16Board('));
  const composite = body.indexOf('<JevScoreChart');
  assert.ok(body.indexOf("{scope !== 'api' && capabilityCharts}") < composite && composite < body.indexOf("{scope === 'api' && capabilityCharts}"));
  assert.match(body, /headline=\{scope === 'api'\}/);
  assert.match(body, /outsideOpen=\{scope === 'api'\}/);
  assert.match(body, /\{scope === 'api' && <ApiRoster /);

  // Roster inputs: ranked + variants from the scoped artifact, carried API rows, and wrappers (classifier.dev).
  const release = await readCurrentJevbench();
  const previous = await readJevbenchV157Release();
  const isApi = jevScopeClassifier(release.artifact.systems, release.carry.rows, previous.artifact.systems, previous.artifact.not_measured);
  const api = jevbenchScopeArtifact(release.artifact, 'api', isApi);
  const carry = jevbenchScopeCarry(release.carry, 'api', isApi);
  const keys = new Set([...api.systems.map((s) => s.key), ...carry.rows.map((r) => r.key)]);
  for (const key of ['jev-1.13.0', 'sage-1.3.0', 'wity-1', 'wity-1-always', 'wity-1-off', 'fastino-gliner-2-5-decide',
    'gpt-6-luna', 'gemini-3.1-flash-lite', 'deepseek-flash', 'decision-machine-1', 'vansa-3.4', 'kushal-gemma4-31b-it-autoloops']) assert.ok(keys.has(key), key);
  const carried = new Set(carry.rows.map((r) => r.key));
  const nm = new Set(api.not_measured.map((r) => r.key));
  const wrappers = previous.artifact.systems.filter((s) => !s.ranked && s.listing === 'honorable_mention' && nm.has(s.key) && !carried.has(s.key)).map((s) => s.key);
  assert.ok(wrappers.includes('classifier-dev-fast'));
  assert.ok(![...keys, ...wrappers].some((k) => /drex|nace/i.test(k)), 'private customer rows stay out');
  assert.match(route, /apiWrappers=\{apiWrappers\}/);
});

test('5: long base-model notes become numbered footnotes; routine notes stay tooltips', () => {
  const fastino = baseModelFor('jevbench', 'fastino-gliner-2-5-decide');
  assert.ok(baseModelVisibleNote(fastino)?.length > 200);
  const { notes, index } = baseModelFootnotes('jevbench', ['jev-1.13.0', 'fastino-gliner-2-5-decide', 'fastino-gliner-2-5-decide']);
  assert.equal(index.get('fastino-gliner-2-5-decide'), notes.find((n) => n.key === 'fastino-gliner-2-5-decide').n);
  assert.equal(notes.filter((n) => n.key === 'fastino-gliner-2-5-decide').length, 1);
  assert.deepEqual(notes.map((n) => n.n), notes.map((_, i) => i + 1));
  assert.equal(baseModelVisibleNote({ status: 'undisclosed', sources: [], note: 'No verified public base-model disclosure recorded.' }), null);
  const display = src('components/BaseModelDisplay.tsx');
  assert.match(display, /showNote && footnote != null && <a href=\{`#\$\{baseModelNoteId\(benchmark, systemKey\)\}`\}/);
  assert.match(display, /showNote && footnote == null && <span className="bh-muted"> · \{entry\.note\}<\/span>/);
  const chart = src('components/JevBoardInteractive.tsx');
  assert.match(chart, /baseNote=\{baseNotes\.index\.get\(row\.key\)\}/);
  assert.match(chart, /<BaseModelFootnotes benchmark=\{benchmark\} notes=\{baseNotes\.notes\}/);
});

test('revision history names board v1.7.1 first; scores untouched (display-only files)', () => {
  assert.match(board, /\{ version: 'v1\.7\.1', date: '2026-10-06', text: 'Display only, no score or rank changed\./);
  assert.ok(board.indexOf("version: 'v1.7.1'") < board.indexOf("version: 'v1.7.0'"));
});
