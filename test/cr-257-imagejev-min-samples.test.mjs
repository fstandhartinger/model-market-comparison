import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { imageJevSampleFloorViolations, imageJevWithheldNotes, IMAGEJEV_V03_MIN_CELL_N } from '../lib/imagejev-sample-floor.mjs';

// Standing release gate (Florian 12 Nov 2026): every listed row's image-type and use-case cells on >= 30 scored items.
// Florian 27 Nov 2026 (Telegram #20535, "Mit Datum"): smaller cells are withheld and labelled with the last measurement date.
const release = JSON.parse(readFileSync(new URL('../data/imagejev-v03.json', import.meta.url), 'utf8'));

test('ImageJevBench v0.3 publishes image-type and use-case cells only with at least 30 scored items', () => {
  assert.equal(IMAGEJEV_V03_MIN_CELL_N, 30);
  assert.ok(release.ranking.length > 0, 'expected a current release roster');
  const failures = imageJevSampleFloorViolations(release);
  assert.equal(failures.length, 0, `Breakdown cells below the release floor:\n${failures.join('\n')}`);
  assert.equal(release.categories.minN, 30, 'the low-sample table shows nothing under 30');
});

test('every withheld cell carries the row\'s last measurement date on the compare radars', () => {
  const notes = imageJevWithheldNotes(release.categories);
  const withheld = release.categories.withheld;
  assert.equal(Object.values(withheld).filter((w) => w.hosted).length, 15, 'the 15 hosted rows of card #20535');
  for (const [key, w] of Object.entries(withheld)) for (const dim of Object.keys(w.cells))
    assert.match(notes[key][dim], /withheld, fewer than 30 completed answers; not re-measured since \d{1,2} [A-Z][a-z]{2} 2026$/, `${key}/${dim}`);
  assert.match(notes.kettei_fat.capabilities, /^Dense UIs, Agent safety, Multilingual, Surface inspection: .* since 16 Oct 2026$/);
});

test('the gate catches an under-floor cell and an unrecorded gap', () => {
  const copy = structuredClone(release);
  copy.categories.systems.kettei_fat.capabilities.dense_ui = [10, 23, 23];
  copy.categories.withheld.kettei_fat.cells.capabilities = copy.categories.withheld.kettei_fat.cells.capabilities.filter((c) => c !== 'dense_ui');
  delete copy.categories.systems.imajev_4b.capabilities.receipt;
  const failures = imageJevSampleFloorViolations(copy);
  assert.ok(failures.some((f) => f.startsWith('kettei_fat/capabilities/dense_ui: scored=23')));
  assert.ok(failures.some((f) => f.startsWith('imajev_4b/capabilities/receipt: absent')));
});
