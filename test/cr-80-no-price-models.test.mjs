import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NO_PUBLIC_PRICE_NOTE } from '../lib/free-route.mjs';

// CR-80.2 (Florian 2026-09-18, CR-20260918a): "Models with a capability score but no priced offer appear in
// the homepage table ('No public API price'), excluded only from cost charts" — a top model must never be
// silently hidden because no provider publishes a price for it yet.
const explorer = readFileSync(new URL('../components/ModelExplorer.tsx', import.meta.url), 'utf8');
const scatter = readFileSync(new URL('../components/CostCapabilityScatter.tsx', import.meta.url), 'utf8');

test('CR-80.2: the "Has provider" evidence filter is OFF by default, so unpriced models stay listed', () => {
  assert.match(explorer, /const \[hasProviderOnly, setHasProviderOnly\] = useState\(false\);/,
    'the default must show models with a score but no public price; the toggle is opt-in');
  // The Evidence highlight follows the NEW default (lit when the user turns the filter ON).
  assert.match(explorer, /const evidenceChanged = !withScoreOnly \|\| hasProviderOnly \|\|/, 'F-28 semantics kept with the new default');
  // The opt-in filter still exists and still narrows the pool when turned on — and ONLY when turned
  // on. The default scope is already `restricted` (allowDataTraining off ⇒ privateDataOnly), so
  // filtering on `offerScope.restricted` dropped scored-but-unscoped models for every default
  // visitor; that clause must never come back.
  assert.match(explorer, /if \(hasProviderOnly\) r = r\.filter\(\(x\) => x\.ncheap > 0\);/, 'the provider filter triggers on the toggle alone');
  assert.doesNotMatch(explorer, /hasProviderOnly \|\| offerScope\.restricted/, 'the scope must never silently hide unpriced scored models');
});

test('CR-80.2: unpriced models are dropped only while the user sets a cost limit, and the loss is named', () => {
  // The cost cap still exists; it is the only thing that hides an unpriced scored model.
  assert.match(explorer, /if \(maxCost != null\) r = r\.filter\(\(x\) => x\.price\.value != null && x\.price\.value <= maxCost\);/);
  // Then it is excluded WITH a note, never silently.
  assert.match(explorer, /data-bh-unpriced-excluded/, 'a visible exclusion note is rendered');
  assert.match(explorer, /without a public price excluded/, "the note's wording");
});

test('CR-80.2: the cost cell of a zero-offer model reads "No public API price", muted, with the reason', () => {
  assert.match(explorer, /No public API price/, 'the literal cell text');
  assert.match(explorer, /offersByModel\[m\.id\].*\)\.length === 0 && \(data\.offersByFamily/, 'only a truly offer-less model gets the phrase');
  assert.match(explorer, /data-bh-no-public-price/, 'machine-readable marker for verification');
  assert.ok(NO_PUBLIC_PRICE_NOTE.includes('No provider publishes an API price'), 'tooltip names the cause');
  assert.ok(NO_PUBLIC_PRICE_NOTE.includes('cost limit'), 'tooltip names the one filter that still excludes it');
});

test('CR-80.2: an unpriced model sorts by score like everyone; only a cost sort sinks it', () => {
  // Default sort is the score column (CR-8.1); price==null rows never get an invented price.
  assert.doesNotMatch(explorer, /price\.value \?\? 0\.5/, 'no invented mid price');
  assert.match(explorer, /const \[sort, setSort\] = useState<SortKey>\(defaultSort \?\? "score"\);/, 'default sort stays the score');
  // Cost sort still sinks unpriced rows to the bottom (pre-existing rule, must survive).
  assert.match(explorer, /Unpriced rows sink to the bottom|x\.price\.value == null/, 'cost-sort rule intact');
});

test('CR-80.2: both value-map variants state how many scored models are not plotted, exactly as phrased', () => {
  const notes = scatter.match(/data-bh-unpriced-note/g) ?? [];
  assert.equal(notes.length, 2, 'compact (home) and full (charts) variants each carry the note');
  assert.match(scatter, /\{unpricedCount\} models without a public price not plotted\./, "Florian's wording");
  assert.match(scatter, /filter\(\(x\) => x\.price\.value == null \|\| \(x\.price\.value as number\) < 0\)/, 'the count is data-derived, never hard-coded');
});
