// D219 (2026-09-26): three daily arms — eqbench creative-writing, eqbench longform-writing and
// Vending-Bench 2 — failed closed with "Prior public identities disappeared" because the field we read
// as the model name carries a *display badge* the board strips in its own renderer before anyone sees
// it: a leading `*` (new) or `!` (NSFW) in eqbench's CSV payload, a trailing "New" pill in Andon Labs'
// table. Read as part of the name it invented an identity that joined to nothing and that changed the
// day the badge was retired.
//
// The marker is now declared per source in the collection plan and stripped by the parser; each
// already-published badged label is corrected, and the badged spelling is republished as a *withheld*
// rejection so the retained history states cannot bridge the same measurement back as a "no longer
// published" estimate (the D180/D186 trap — here it was 54 of them).
//
// Every check re-derives its claim from the committed captures, never from the record's prose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { datedEstimates } from '../lib/benchmark-history.mjs';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const plan = json('data/raw/benchmarks/collection-plan.json');
const observations = json('data/raw/benchmarks/public-observations.json');
const scores = json('data/raw/benchmarks/scores.json');
const dataset = json('data/dataset.json');
const corrections = observations.display_badge_corrections ?? [];
const BOARDS = ['eqbench-creative-writing::3', 'eqbench-longform-writing::v1.11', 'vending-bench::2'];
const badged = (name) => name.startsWith('*') || name.startsWith('!') || name.endsWith(' New');
const capture = (ref) => {
  const raw = readFileSync(ref.file);
  const bytes = ref.file.endsWith('.gz') ? gunzipSync(raw) : raw;
  assert.equal(createHash('sha256').update(bytes).digest('hex'), ref.sha256, `${ref.file} digest`);
  return bytes.toString('utf8').replace(/^﻿/, '');
};

test('each board declares its badge in the plan, with the page\'s own words for each marker', () => {
  for (const id of BOARDS) {
    const rule = plan.entries.find((e) => e.benchmark_id === id).parser;
    const markers = { ...(rule.name_markers?.prefix ?? {}), ...(rule.name_markers?.suffix ?? {}) };
    assert.ok(Object.keys(markers).length, `${id} declares no name_markers`);
    for (const [marker, meaning] of Object.entries(markers)) {
      assert.ok(marker.length >= 1 && meaning.length > 80, `${id} marker ${marker} has no reviewed meaning`);
    }
  }
  // The strip is never a global rule: only these three boards declare one.
  const declaring = plan.entries.filter((e) => e.parser?.name_markers).map((e) => e.benchmark_id);
  assert.deepEqual(declaring.sort(), [...BOARDS].sort());
  // Vending-Bench's strip must be confirmed by the row's own logo alt text, so a model genuinely named
  // "... New" cannot be truncated.
  assert.equal(plan.entries.find((e) => e.benchmark_id === 'vending-bench::2').parser.name_markers.confirm_with, 'name_image_alt');
});

test('eqbench\'s own renderer strips the declared markers, in the very file the rows cite', () => {
  for (const id of ['eqbench-creative-writing::3', 'eqbench-longform-writing::v1.11']) {
    const row = observations.observations.find((o) => o.benchmark_id === id);
    const source = capture(row.source);
    assert.match(source, /startsWith\('\*'\)/, `${id}: no new-model badge test in the renderer`);
    assert.match(source, /startsWith\('!'\)/, `${id}: no NSFW badge test in the renderer`);
    // Stripped, not merely detected — and the stripped name is what the board links from.
    assert.match(source, /replace\(\/\^(?:\(!\|)?\\\*(?:\)\/)?/, `${id}: the renderer does not strip the marker`);
  }
});

test('Andon Labs states the model name badge-free in the row\'s own logo alt attribute', () => {
  const record = corrections.find((c) => c.benchmark_id === 'vending-bench::2');
  const source = capture(record.renderer_evidence);
  assert.ok(source.includes(record.renderer_evidence.excerpt), 'the excerpt is not verbatim in the cited capture');
  assert.match(record.renderer_evidence.excerpt, /alt="GPT-6 Astra"/);
  assert.match(record.renderer_evidence.excerpt, />New</);
});

test('every correction names a published row under a plain name it really strips to', () => {
  assert.ok(corrections.length > 0);
  assert.equal(new Set(corrections.map((c) => c.id)).size, corrections.length);
  for (const c of corrections) {
    const row = observations.observations.find((o) => o.id === c.id);
    assert.ok(row, `${c.id} is not a published row`);
    assert.equal(row.benchmark_id, c.benchmark_id);
    assert.equal(row.subject.source_id, c.to);
    assert.equal(row.subject.name, c.to);
    assert.ok(badged(c.from) && !badged(c.to), `${c.id}: ${c.from} -> ${c.to}`);
    const stripped = c.marker.startsWith(' ') ? c.from.slice(0, -c.marker.length).trim() : c.from.slice(c.marker.length).trim();
    assert.equal(stripped, c.to, `${c.id}: the marker does not strip from to to`);
    assert.ok(c.reason.length > 120, `${c.id}: a correction states why the badge was never an identity`);
    assert.match(c.previous_locator, new RegExp(`; ${c.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}; field `));
    // The row's own locator follows the plain name, and the row still hashes the evidence it cites.
    assert.match(row.source.locator, new RegExp(`; ${c.to.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}; field `));
    capture(row.source);
  }
});

test('no badged spelling is published anywhere, and each is withheld with its old locator', () => {
  for (const set of [observations.observations, scores.observations, dataset.benchmark_results.observations]) {
    const published = set.filter((o) => BOARDS.includes(o.benchmark_id) && badged(o.subject.source_id));
    assert.deepEqual(published.map((o) => `${o.benchmark_id} ${o.subject.source_id}`), []);
  }
  for (const c of corrections) {
    const withheld = scores.rejected.filter((r) => r.withheld && r.locator === c.previous_locator && r.source_id === c.from);
    assert.equal(withheld.length, 1, `${c.id}: one withheld rejection carries the old locator`);
    assert.equal(withheld[0].benchmark_id, c.benchmark_id);
    // Only the label may be suppressed: a model_id here would withhold every retained value of the pair.
    assert.equal(withheld[0].model_id, null);
  }
});

test('the retained states do not bring a corrected badge back as a "no longer published" estimate', () => {
  const estimates = dataset.benchmark_results.historical.estimates;
  const back = estimates.filter((e) => corrections.some((c) => c.benchmark_id === e.benchmark_id && c.from === e.subject_name));
  assert.deepEqual(back.map((e) => `${e.benchmark_id} ${e.subject_name}`), []);
  // Proven to bite: the very states that hold those labels carry no `source_locator` (they predate the
  // field), so the locator and model_id routes cannot reach them — without the label route they come back.
  const history = json('data/raw/benchmarks/history/index.json');
  const states = history.states.map((s) => json(`data/raw/benchmarks/history/states/${s.state_id}.json`));
  const registry = json('data/raw/benchmarks/registry.json');
  const withheldLocators = scores.rejected.filter((r) => r.withheld && r.locator).map((r) => ({ benchmark_id: r.benchmark_id, locator: r.locator }));
  const withheldModels = scores.rejected.filter((r) => r.withheld && r.model_id).map((r) => `${r.benchmark_id}#${r.model_id}`);
  const labels = scores.rejected.filter((r) => r.withheld && !r.model_id && r.source_id).map((r) => `${r.benchmark_id}\0${r.source_id}`);
  const named = (list) => list.filter((e) => corrections.some((c) => c.benchmark_id === e.benchmark_id && c.from === e.subject_name)).length;
  const without = named(datedEstimates(scores.observations, registry, states, withheldLocators, withheldModels, []));
  const with_ = named(datedEstimates(scores.observations, registry, states, withheldLocators, withheldModels, labels));
  assert.ok(without > 0, 'the label route is not what suppresses them — this check proves nothing');
  assert.equal(with_, 0);
});
