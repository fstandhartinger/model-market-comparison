import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const release = JSON.parse(await read('../data/imagejev-v03.json'));
const row = (key) => release.ranking.find((r) => r.key === key);
const KEY = 'sage_1_4_images';

test('CR-XXX Sage 1.4 + images: official pass 1 via Levanto /decide, beta image input disclosed in the note', () => {
  const r = row(KEY);
  assert.ok(r, 'Sage 1.4 + images present');
  assert.equal(r.api_flag, true);
  assert.equal(r.author, 'Levanto Labs');
  // the chart labels cut a name at " (", so the beta marker must sit before the author in parentheses
  assert.equal(r.name, 'Sage 1.4 + images, beta (Levanto Labs)');
  assert.equal(r.preview_feature, undefined, 'the PREVIEW tag tooltip is TypeSafe-specific; beta is stated in the note');
  assert.match(r.inference_setting, /sage\.levanto\.ai\/decide/);
  assert.match(r.inference_setting, /levanto-sage-v1\.4/);
  assert.match(r.measurement_source, /16 Oct 2026 \(16:28-16:39 UTC\)/);
  assert.match(r.measurement_source, /600 of 600 answered/);
  assert.match(r.measurement_source, /On 80 items Sage abstained/);
  // critic S1: the capped-Capability #1 depends on the argmax ruling; the counted-wrong sensitivity must be disclosed
  assert.match(r.measurement_source, /If the 80 abstentions were scored wrong instead, Sage's Intelligence would be 58\.6 \(vs 68\.2\), Capability about 65 \(vs 75\.8\) and composite 44\.7 \(still #3\), and it would rank #5 in the capped Capability headline instead of #1\./);
  assert.match(r.measurement_source, /no item was re-sent by the harness/);
  assert.match(r.measurement_source, /13 of 600 images \(9 public, 4 sealed\)/);
  assert.match(r.measurement_source, /image treatment differs between rows/);
  assert.match(r.pricing_note, /USD 0\.05 per 1M input tokens and USD 10 per 1M output tokens/);
  assert.match(r.pricing_note, /about 1,410 image tokens, about 1,550 billed input tokens per item/); // critic S2: 845,964 image / 929,931 billed input over 600 items
  assert.match(r.tracks.core.cost.source, /^Levanto list price/);
  assert.equal(r.ranked, true);
  assert.equal(r.rank, 3);
});

test('CR-XXX Sage 1.4 + images has aggregate-only category, answered-coverage and TypeSafe-20 cells', async () => {
  const cells = release.categories.systems[KEY];
  assert.equal(Object.keys(cells.capabilities).length, 14);
  assert.equal(Object.keys(cells.usecases).length, 5);
  assert.equal(Object.values(cells.usecases).reduce((n, c) => n + c[1], 0), 600);
  const coverage = JSON.parse(await read('../data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json'));
  assert.equal(coverage.systems[KEY].source.public_score_sha256, row(KEY).source_sha256);
  const ts20 = JSON.parse(await read('../data/imagejev-ts20-categories.json'));
  assert.ok(ts20.systems[KEY].typesafe);
  assert.deepEqual(ts20.summary[KEY], { rows: 600, errors: 0 });
});

test('CR-XXX revision history records the Sage 1.4 addendum and both top-five changes', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.match(page, /16 Oct 2026 addendum, new row:<\/b> adds Sage 1\.4 \+ images/);
  assert.match(page, /Both top fives change/);
  assert.match(page, /if they were scored wrong instead, Sage&apos;s Intelligence would be 58\.6 \(vs 68\.2\), Capability about 65 \(vs 75\.8\), composite 44\.7 \(still #3\), and Sage would rank #5 in the capped Capability headline instead of #1\./);
});
