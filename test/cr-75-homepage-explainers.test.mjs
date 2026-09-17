// CR-75 (Florian 17 Sep 2026): plain-language headers and captions on the home page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('CR-75.1: section headers above the value-map card (Simple/Guided) and above the model table (every mode)', async () => {
  const explorer = await src('components/ModelExplorer.tsx');
  assert.match(explorer, /\{simple && <SectionHeader title="The most capable model at every price" caption="Set a minimum score and a budget — see who wins\." \/>\}/);
  assert.match(explorer, /\n      <SectionHeader title="Most capable models and what they really cost" \/>\n      <div className="card overflow-x-auto">/);
});

test('CR-75.2: one sentence under the home value map explains the green line; the top line no longer repeats it', async () => {
  const scatter = await src('components/CostCapabilityScatter.tsx');
  assert.match(scatter, /Models on the green line are the most capable in their price range\./);
  assert.match(scatter, /advanced \? `Value map · \$\{compactPoints\.length\} models · cheaper → right · green line = Pareto` : `\$\{compactPoints\.length\} models · cheaper → right`/);
  assert.match(scatter, /<AaCredit \/> · <EpochCredit bare \/>/, 'data attribution stays visible');
});

test('CR-75.3: the score column is "Capability Score" with the Composite named in full in its tooltip', async () => {
  const explorer = await src('components/ModelExplorer.tsx');
  assert.match(explorer, /<Th label="Capability Score" k="score" right sub=\{score === "composite" \? "Main Composite Score" : SCORE_SHORT_LABELS\[score\]\}/);
  assert.match(explorer, /"Capability Score — Benchmark Heaven Main Composite Score"/);
  assert.doesNotMatch(explorer, /<Th label="Score"/);
});
