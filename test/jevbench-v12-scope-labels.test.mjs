// Review gate 20260920T043003Z left three open items on /jev-models, all of them label-vs-number mismatches:
// (a) the tier weight columns and the method list kept the official 14/28/28/30 % under a scope that had already
// re-normalised, (b) F-140 left the task type in a native `title`, unreachable on touch, and (c) a group row headed
// "48 public tasks" showed the whole tier's 72/72. These pin the component source so none of them can come back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = await readFile('components/JevModelsV12.tsx', 'utf8');

test('(a) the scoped view carries re-normalised tier weights and the columns name the excluded tiers', () => {
  assert.match(src, /tierWeights: scopeTierWeights\(scope\)/, 'the scoped view must re-normalise the tier weights');
  const header = src.match(/TIER_ORDER\.map\(\(t\) => <H [^\n]*\/>\)/)?.[0] ?? '';
  assert.match(header, /view\.tierWeights\[t\] > 0/, 'a tier outside the scope may not be labelled with a percentage');
  assert.match(header, /outside this scope/);
  assert.doesNotMatch(src, /const tw = view\.tierWeights/, 'the method list must not read the unscoped weights');
});

test('(a) the "How the score works" Intelligence line is derived from the scoped weights', () => {
  const li = src.match(/<li data-bh-jev12-intel-weights[\s\S]*?<\/li>/)?.[0];
  assert.ok(li, 'the Intelligence line needs a stable hook');
  assert.match(li, /scopedView\.tierWeights\[t\]/);
  assert.match(li, /outside this scope/);
  assert.doesNotMatch(li, /tw\.hard|tw\.easy|tw\.standard|tw\.judge/, 'no hardcoded unscoped weights');
  assert.match(src, /const scoredTiers = tierTextOrder\.filter\(\(t\) => scopedView\.tierWeights\[t\] > 0\)/);
});

test('(b) the task type is visible text, not a native title, and the legend defines all three types', () => {
  assert.doesNotMatch(src, /title=\{`\$\{task\.topic\} · \$\{task\.type\}`\}/, 'topic/type may not live in a title only');
  const typeTag = src.match(/<span className="bh-muted ml-2[^]*?<\/span>/)?.[0] ?? '';
  assert.match(typeTag, /data-bh-jev12-task-type=\{task\.type\}/, 'the type needs a stable hook');
  assert.match(typeTag, />\{task\.type\}<\/span>/, 'the published type code is rendered as visible text');
  const legend = src.match(/<p className="bh-muted mt-2 text-xs" data-bh-jev12-task-legend>[\s\S]*?<\/p>/)?.[0] ?? '';
  for (const type of ['choice', 'noul', 'score']) assert.match(legend, new RegExp(`<b className="text-gray-200">${type}</b>`), `${type} must be defined in the legend`);
  assert.match(legend, /carries its topic/, 'the legend must say where the topic is readable');
  assert.match(legend, /group row counts the public tasks it lists/, 'the two denominators must be named');
});

test('(c) the group summary cells come from the public slice, not the whole-tier aggregate', () => {
  const group = src.match(/data-bh-jev12-task-group=\{tier\}[\s\S]*?<\/tr>,/)?.[0] ?? '';
  assert.match(group, /publicTierSummary\(system, tierTasks\)/);
  assert.doesNotMatch(group, /const summary = tasks\.systems\[r\.key\]\?\.byTier\[tier\]/, 'the cells may not read the whole-tier aggregate');
  assert.match(group, /of \{view\.tierCounts\[tier\]\} decisions public/, 'the header must name both bases');
  assert.match(group, /whole tier \$\{whole\.correct\}\/\$\{whole\.attempted\}/, 'the whole-tier figure stays available in the title');
});

// Review gate 20260920T055002Z: the grid's rotated head is the only thing that names its 21 system columns, and
// `bh-jev-sticky` on the Task column resolves to nothing here (that rule is scoped to `.bh-jev-table`, and this
// grid is a `.bh-table`). The head was `position: static`, so scrolled past the first screenful of 231 rows every
// ✓/× belonged to an unnamed column.
test('the public-task grid head is pinned to its own scroll container', async () => {
  const css = await readFile('app/globals.css', 'utf8');
  const rule = css.match(/\[data-bh-jev12-task-table\] thead th \{[^}]*\}/)?.[0];
  assert.ok(rule, 'the grid head needs a sticky rule of its own');
  assert.match(rule, /position:\s*sticky/);
  assert.match(rule, /top:\s*0/);
  assert.match(src, /data-bh-jev12-task-table/, 'the rule needs its hook on the table');
  assert.match(src, /max-h-\[38rem\] overflow-auto/, 'the head is only sticky because the grid scrolls in a bounded box');
});

test('CR-118: the "How the score works" panel states the v1.3.0 chance correction and the near-chance penalty', () => {
  const li = src.match(/<li data-bh-jev12-intel-weights[\s\S]*?<\/li>/)?.[0] ?? '';
  assert.match(li, /accuracy above chance/, 'Intelligence is no longer plain weighted accuracy');
  assert.doesNotMatch(li, /— weighted accuracy/);
  const formula = src.match(/<section [^>]*data-bh-jev12-formula>[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.match(formula, /data-bh-jev12-penalty>Below 50 Intelligence[^<]*\(Intelligence ÷ 50\)²/);
});
