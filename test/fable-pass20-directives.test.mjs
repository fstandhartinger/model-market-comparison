// Fable pass 20 directives F-108–F-111: copy and structure checks on the component sources.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('F-108 (e): the Benchmaxxing radar copy says what the signal measures, with both caveats', async () => {
  const report = await src('components/BenchmaxxingReport.tsx');
  assert.match(report, /Jumps between neighbouring benchmarks of one topic are what the signal measures\. Mid-table models jump more often, and models at the rim look smooth — a flag is a screen, not proof\./);
  assert.match(report, /Dashed ring = \{compare \? "each model's" : "this model's"\} average percentile\./);
  assert.doesNotMatch(report + await src('components/BenchmaxxingOverview.tsx'), /more jagged/i);
  assert.match(await src('app/about/page.tsx'), /mid-table models jump more often and models at the rim\s+look smooth/);
});

test('F-108 (a–c): zero ring, ring labels and a dashed average ring in TopicRadar', async () => {
  const radar = await src('components/TopicRadar.tsx');
  assert.match(radar, /const radius = \(v: number\) => inner \+ \(r - inner\)/);
  assert.match(radar, /\[0, 50, 100\]\.map/);
  assert.match(radar, /data-radar-average=/);
});

test('F-109: the Overview legend is a collapsed disclosure with one row per mark', async () => {
  const explorer = await src('components/ModelExplorer.tsx');
  assert.match(explorer, /<details className="bh-legend mt-1" data-bh-legend>/);
  assert.match(explorer, /Legend: marks and tags/);
  assert.equal((explorer.match(/<dt/g) || []).length >= 5, true);
  assert.doesNotMatch(explorer, /<details[^>]*data-bh-legend[^>]*\sopen/);
});

test('F-110: the group count joins the basis line below 640 px', async () => {
  const css = await src('app/globals.css');
  assert.match(css, /@media \(max-width: 639\.98px\) \{\s*\.bh-matrix-group \.bh-cat-count \{ display: none; \}\s*\.bh-cat-count-narrow \{ display: inline; \}/);
  assert.match(await src('components/ScoreRows.tsx'), /bh-cat-count-narrow">\{count\} benchmarks · </);
});

test('F-111: every (i) shares one frame-coalesced media-query subscription', async () => {
  const tip = await src('components/InfoTip.tsx');
  assert.equal((tip.match(/matchMedia\(/g) || []).length, 2, 'one subscription plus the pre-subscribe snapshot read');
  assert.match(tip, /useSyncExternalStore\(subscribePrecise, getPrecise, \(\) => false\)/);
  assert.match(tip, /requestAnimationFrame/);
  assert.doesNotMatch(tip, /setPrecise/);
});

test('CR-65.11: every label of the pinned Coding Agent value names v1.4', async () => {
  const { SCORE_SHORT_LABELS, SCORE_PICKER_LABELS, SCORE_LABELS } = await import('../lib/types.ts');
  for (const label of [SCORE_SHORT_LABELS.aa_coding_agent, SCORE_PICKER_LABELS.aa_coding_agent, SCORE_LABELS.aa_coding_agent]) assert.match(label, /v1\.4/, label);
  // score-label.ts imports ./types without an extension, so its version line is checked in the source.
  assert.match(await src('lib/score-label.ts'), /return `v1\.4 snapshot \$\{dates\?\.aa_coding_agents \|\| 'date unavailable'\} \(AA now publishes v1\.5\)`/);
  for (const path of ['lib/client-model.ts', 'app/models/[id]/page.tsx', 'components/CompareView.tsx']) assert.doesNotMatch(await src(path), /"(AA )?Coding Agent( Index)?"/, path);
});
