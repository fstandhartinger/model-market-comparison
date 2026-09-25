// D200 (2026-09-25): all four UGI registry entries carried the identical `scoring.notes` —
// "Private questions; theoretical bounds and full weighting were not verified. Writing excludes
// broken/refusal outputs; absence is not zero." — so the NatInt, Willingness and composite rows each
// published a sentence about the *Writing* board. The daily protocol reviewer named it on 2026-09-24
// and 2026-09-25 and retained all four boards for it.
//
// The reviewer is not short of evidence: `app.py` extracts to 58,689 bytes, under the 60,000-byte
// bound, so the daily packet carries the board's whole explanatory text. It was short of a note that
// describes the row it sits on. Each note now names its own metric's published components, and every
// sentence it attributes to the board is a passage of the captured protocol text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const registry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8'));
const entry = (id) => {
  const found = registry.entries.find((e) => e.id === id);
  assert.ok(found, `${id} is in the registry`);
  return found;
};
const BOARDS = ['ugi::snapshot-2026-09-10', 'ugi-natint::snapshot-2026-09-10',
  'ugi-willingness::snapshot-2026-09-10', 'ugi-writing::snapshot-2026-09-10'];

// The app.py capture the entries reference as protocol evidence, as the daily hands it to a review.
const protocolText = () => {
  const ref = entry('ugi::snapshot-2026-09-10').evidence.find((s) => s.url.endsWith('/app.py'));
  assert.ok(ref, 'the composite entry references the board’s own app.py as protocol evidence');
  return readFileSync(ref.file, 'utf8').replace(/\s+/g, ' ');
};

test('D200: each UGI note describes its own board, not a sibling', () => {
  const notes = Object.fromEntries(BOARDS.map((id) => [id, entry(id).scoring.notes]));
  // The one note that may talk about a writing score is the Writing board's.
  for (const id of BOARDS) {
    const writing = /writing (score|response)/i.test(notes[id]);
    assert.equal(writing, id === 'ugi-writing::snapshot-2026-09-10', `${id} and the writing score`);
  }
  // Each composite names its own published components and not another's.
  assert.match(notes['ugi-natint::snapshot-2026-09-10'], /Textbook, Pop Culture and World Model/);
  assert.match(notes['ugi-willingness::snapshot-2026-09-10'], /W\/10-Direct and W\/10-Adherence/);
  assert.match(notes['ugi::snapshot-2026-09-10'], /Hazardous, Entertainment, SocPol/);
  assert.doesNotMatch(notes['ugi-natint::snapshot-2026-09-10'], /Hazardous|W\/10-Direct/);
  assert.doesNotMatch(notes['ugi-willingness::snapshot-2026-09-10'], /Textbook|Hazardous/);
  // The four notes are no longer one string repeated four times.
  assert.equal(new Set(Object.values(notes)).size, 4);
  // Every note still states the handling rule the values need.
  for (const id of BOARDS) assert.match(notes[id], /not a zero/);
});

test('D200: what a UGI note attributes to the board is in the captured protocol text', () => {
  const text = protocolText();
  // The privacy claim every one of the four makes.
  assert.ok(text.includes('To ensure a fair evaluation, all test questions are kept private.'),
    'the board states that its test questions are private');
  // The Writing board’s exclusion rule, which is why a missing Writing value is not a zero.
  assert.ok(text.includes('Models that are not able to consistently produce writing responses due to '
    + 'irreparable repetition issues, broken outputs, or constant refusals are not given a writing score.'));
  // The published components each composite note names.
  for (const component of ['Textbook:', 'Pop Culture:', 'World Model:', 'W/10-Direct:', 'W/10-Adherence:',
    'Hazardous:', 'Entertainment:', 'SocPol:']) {
    assert.ok(text.includes(component), `the board publishes the component ${component}`);
  }
  // What the notes deliberately do *not* claim: the board publishes no unit and no bounds for these
  // scores. `score` is our explicit generic display label for that unknown source unit, not a claim
  // that the values are points, percentages, or on a 0–100 scale.
  for (const id of BOARDS) {
    assert.equal(entry(id).scoring.unit, 'score');
    assert.doesNotMatch(entry(id).scoring.notes, /out of 100|percent|0-100/);
  }
});
