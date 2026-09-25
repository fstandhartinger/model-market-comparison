// D197 (2026-09-25): the unattended daily stopped publishing for a second time, and again on a
// vendor row whose *published* form and whose *input* form had drifted apart. The 00:41 run died in
// `scripts/ingest-benchmark-scores.mjs` with
//
//   Error: Unreviewed vendor score: self-reported:claude-opus-55-healthbench-professional
//
// CR-139 (`3ceb4cd8`) had corrected that row's `unit` and rewritten its `protocol` after the point-unit
// gauntlet, and minted a fresh approval over the corrected row — but it wrote the new `protocol` only
// into the generated `data/raw/benchmarks/scores.json`. The generator's input,
// `data/raw/benchmarks/self-reported-candidates.json`, kept the older wording. So the published file
// verified (its digest matched the approval) while every *fresh* ingest rebuilt the row from the input,
// produced the old protocol, hashed to something else and found no approval — a hard throw, before any
// publication. Nothing in the suite noticed, because nothing compared the published snapshot with what
// its inputs regenerate.
//
// D174 pinned *which form* of a row an approval binds. This pins the other half: a self-reported row as
// published must be the row its input file defines. Whoever corrects such a row has to correct the input
// — a generated file is never the place to fix data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = 'data/raw/benchmarks';
// The observation inputs `scripts/ingest-benchmark-scores.mjs` reads, in its own order.
const INPUTS = ['public-observations.json', 'vendor-candidates.json', 'self-reported-candidates.json',
  'manual-observations.json', 'manual-board-observations.json'];

const json = async (p) => JSON.parse(await readFile(p, 'utf8'));
const basis = (o) => o.source_basis ?? o.basis;

/** The ingest adds exactly these to a row it joins to the catalog; everything else it copies. */
const withoutJoin = (o) => {
  const { join_note: _note, identity_review: _review, ...rest } = o;
  return rest;
};

/** The published row as its input file must define it: the reviewed join may set subject.model_id. */
const asInput = (published, input) => {
  const row = withoutJoin(published);
  if (input.subject?.model_id === null && row.subject?.model_id !== null) {
    return { ...row, subject: { ...row.subject, model_id: null } };
  }
  return row;
};

test('D197: every published self-reported row is the row its input file defines', async () => {
  const inputs = new Map();
  for (const file of INPUTS) {
    let doc;
    try { doc = await json(`${root}/${file}`); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    for (const o of doc.observations) if (!inputs.has(o.id)) inputs.set(o.id, { file, row: o });
  }
  const snapshot = await json(`${root}/scores.json`);
  const published = [...snapshot.observations, ...(snapshot.missing || [])].filter((o) => basis(o) === 'self_reported');
  // Every self-reported row is a captured claim from one of the input files; none is derived.
  assert.ok(published.length > 1000, `expected the full vendor-claim population, got ${published.length}`);

  const drifted = [];
  for (const o of published) {
    const input = inputs.get(o.id);
    if (!input) { drifted.push(`${o.id}: no input file defines this row`); continue; }
    const want = withoutJoin(input.row);
    const have = asInput(o, input.row);
    if (JSON.stringify(have) === JSON.stringify(want)) continue;
    const fields = [...new Set([...Object.keys(want), ...Object.keys(have)])]
      .filter((k) => JSON.stringify(want[k]) !== JSON.stringify(have[k]));
    drifted.push(`${o.id}: ${input.file} and scores.json disagree on ${fields.join(', ')}`);
  }
  assert.deepEqual(drifted, [], 'a generated file was edited without its input — the next ingest will '
    + 'rebuild the input\'s form, miss its approval and stop the daily publication');
});

test('D197: the check sees the drift that stopped the 2026-09-25 run', () => {
  // The shape of the CR-139 defect, on a fixture: the input keeps the old protocol.
  const input = { id: 'self-reported:fixture', value: 65.6, unit: 'points', basis: 'self_reported',
    subject: { source_id: 'https://vendor.example.org/card#Model', name: 'Model', model_id: 'model::max', variant: null, harness: null },
    protocol: 'the wording the input still carries' };
  const published = { ...input, protocol: 'the wording the critic approved' };
  assert.notEqual(JSON.stringify(asInput(published, input)), JSON.stringify(withoutJoin(input)));
  // A reviewed identity join is the one difference the ingest is allowed to make.
  const unjoinedInput = { ...input, subject: { ...input.subject, model_id: null } };
  const joined = { ...input, join_note: 'Reviewed identity map 2026-09-15: label states model and effort',
    identity_review: { critic_model: 'deepseek/critic', producer_models: ['openai/producer'] } };
  assert.equal(JSON.stringify(asInput(joined, unjoinedInput)), JSON.stringify(withoutJoin(unjoinedInput)));
});
