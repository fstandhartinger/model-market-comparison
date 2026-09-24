// Fable pass 31 (2026-09-22): the surfaces that changed after pass 30 — the launch-day model pages (CR-123–CR-126), the preliminary
// Union Alpha page (CR-127.4) and the Compare page's "not measured yet" state (CR-122). F-161: a Composite built on fewer than three
// of its seven inputs wears the Overview's "◔ Thin data · n/7" tag beside the number, and with no input at all no number is printed.
// F-162: a model whose only offer carries no price never gets a card headed "Top 0 cheapest providers". F-166: the "not measured yet"
// panel says only what the page head does not. Source-level pins, like test/fable-pass30.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p) => readFile(new URL(p, import.meta.url), 'utf8');
const [page, value, offers, compare] = await Promise.all([
  read('../app/models/[id]/page.tsx'), read('../components/CompositeScoreValue.tsx'), read('../components/ModelDetailOffers.tsx'), read('../components/BenchmarkCompare.tsx'),
]);

test('CR-139.4: the model page uses exact evidence to qualify the score', () => {
  assert.match(page, /import \{ clientData, hasScoreEvidence, isThinComposite, thinCompositeNote \} from "\.\.\/\.\.\/\.\.\/lib\/client-model";/);
  assert.match(page, /const compositeEligible = hasScoreEvidence\(clientModel, "composite"\);/);
});

test('CR-139.4: attached-only evidence does not qualify a model-specific Composite score', () => {
  assert.match(page, /\{!compositeEligible\s*\? <p className="mt-2 text-sm text-gray-500" data-bh-no-composite>No Composite score for this exact configuration: none of its inputs has a directly measured result\. Family-attached evidence does not qualify this row for model-specific scoring\.<\/p>/);
  assert.match(page, /\{compositeInputs > 0 && <>\s*<MiniRadar/, 'the radar is inside the > 0 branch');
  assert.match(page, /a gap means not measured\.<\/p>\s*<\/>\}/, 'the caption strip and radar note close the > 0 branch');
  assert.match(page, /\{compositeEligible && clientModel\.composite_raw != null && clientModel\.composite_base != null/, 'the dominance line needs a number to qualify');
});

test('F-161: a thin Composite carries the Overview\'s tag beside the number, outside the value element', () => {
  assert.match(page, /tag=\{isThinComposite\(clientModel\) \? <span className="bh-thin-tag" data-bh-composite-thin data-composite-inputs=\{compositeInputs\} title=\{thinCompositeNote\(clientModel\)\}><span aria-hidden="true">◔<\/span>&nbsp;Thin data · \{compositeInputs\}\/7<span className="sr-only">\{thinCompositeNote\(clientModel\)\}<\/span><\/span> : undefined\}/);
  assert.match(value, /tag\?: ReactNode/);
  assert.match(value, /<div className="flex flex-wrap items-baseline gap-x-2"><p className="text-4xl font-bold tabular" data-bh-composite-value>\{num\(shown\)\}<\/p>\{tag\}<\/div>/, 'the tag is a sibling of the value, so data-bh-composite-value stays a bare number');
});

test('F-162: the offers card never counts to zero and drops the filter line with the count', () => {
  assert.match(offers, /<h2 className="mb-1 font-semibold">\{top\.length \? <>Top \{Math\.min\(5, top\.length\)\} cheapest providers <span className="text-xs font-normal text-gray-500">\(\{priceLabel\(s\)\}\)<\/span><\/> : "Providers"\}<\/h2>/);
  assert.match(offers, /\{top\.length > 0 && <p className="mb-3 text-\[11px\] text-gray-500">Within the active global provider, residency and confidentiality filters\.<\/p>\}/);
  assert.match(offers, /free \(stealth preview\)<\/span> on OpenRouter — rate-limited and temporary, not a paid price; the eventual price is not announced\./, 'CR-60.3 sentence unchanged');
  assert.match(offers, /data-bh-no-offers/, 'F-145 branch for zero offers unchanged');
});

test('F-166: the "not measured yet" panel is two sentences that the head does not already say; id and org live in the chip title', () => {
  const panel = compare.slice(compare.indexOf('data-bh-coming-soon'), compare.indexOf('See how results are collected →'));
  assert.doesNotMatch(panel, /COMING_SOON_LINE|numbers land here as soon as they are published/, 'the head\'s sentence is not repeated');
  assert.doesNotMatch(panel, /announced as|the id in this link|Benchmark Heaven collects every published result daily/, 'no id, no org, no mission statement in the copy');
  assert.match(panel, /not in our data yet, so this page shows no score for \{pending\.length === 1 \? 'it' : 'them'\} — we never estimate one\./);
  assert.match(panel, /Keep this link: as soon as \{pending\.length === 1 \? 'this model is' : 'these models are'\} collected, the same URL shows the real numbers\.<\/p>/);
  assert.equal((panel.match(/<p className="bh-muted mt-2 max-w-3xl text-sm">/g) || []).length, 2, 'exactly two muted paragraphs');
  assert.match(compare, /title=\{`\$\{entry\.org \? `Announced by \$\{entry\.org\}\. ` : ''\}The id in this link is “\$\{entry\.id\}”; the page shows its numbers as soon as a model is collected under it\.`\}>\{entry\.name\}<\/span>/);
  assert.doesNotMatch(compare, /import \{ COMING_SOON_LINE/, 'the constant is no longer imported by the component');
  assert.match(compare, /data-bh-coming-soon/, 'CR-122 hook unchanged');
});
