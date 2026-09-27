// D227, 2026-09-27. The `aa-benchmark-fields` arm — the widest AA source we hold — had published
// nothing since 2026-09-11, and today's daily reports it as stale with `last ok: never`. One row
// held it: `aa-aime::2025: protocol not approved: round 1: revise — [major] row aa-aime::2025, field
// version_status`, and with one row disputed there is no accept-eligible remainder, so the arm was
// retained whole.
//
// Iteration 107 proved that same row accepted on 2026-09-18, so this is not round variance — AA's
// methodology text moved underneath it. The board's own note now reads "Retired from our active
// reporting; no longer part of Artificial Analysis Intelligence Index v4.3.2" (AA moved the index to
// v4.3.2), while the registry still called the version `published`. `status` was already `retained`;
// `version_status` had not followed. The reviewer is right: a retired version is not a published one.
//
// The repair is one field. No value moves: `aa-aime` has a single member, so the cross-version
// bridge in `crossVersionEstimates` skips the family entirely (it needs two members with
// observations), and that filter is the only reader of `version_status` outside validation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { crossVersionEstimates } from '../lib/benchmark-history.mjs';

const repo = new URL('..', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, repo), 'utf8'));
const registry = read('data/raw/benchmarks/registry.json');
const METHODOLOGY = 'https://artificialanalysis.ai/methodology/intelligence-benchmarking';
const flat = (s) => s.replace(/\s+/g, ' ').trim();

const entry = (id) => {
  const e = registry.entries.find((x) => x.id === id);
  assert.ok(e, `${id}: registry entry`);
  return e;
};

test('D227: AIME 2025 records a retired version, not a published one', () => {
  const e = entry('aa-aime::2025');
  assert.equal(e.version_status, 'retained');
  assert.equal(e.status, 'retained');
  // No successor AIME board is named by the protocol, and none exists in the registry.
  assert.equal(e.superseded_by, null);
  assert.equal(registry.entries.filter((x) => x.family === 'aa-aime').length, 1);
});

test('D227: the retirement is the source\'s own sentence in the capture the failing run read', () => {
  const reference = entry('aa-aime::2025').evidence.find((s) => s.url === METHODOLOGY);
  assert.ok(reference, 'the methodology reference');
  for (const capture of ['data/raw/benchmarks/daily-evidence/2026-09-21-aa-methodology-b/manifest.json',
    'data/raw/benchmarks/daily-evidence/2026-09-27T05-33-09-831Z/manifest.json']) {
    const receipt = read(capture).find((c) => c.url === METHODOLOGY);
    assert.ok(receipt, `${capture}: no methodology receipt`);
    const raw = gunzipSync(readFileSync(new URL(receipt.file, repo)));
    assert.equal(createHash('sha256').update(raw).digest('hex'), receipt.sha256,
      `retained capture no longer matches its receipt: ${capture}`);
    const body = flat(execFileSync('python3', ['ops/daily/public-candidate.py', 'text', receipt.file],
      { cwd: repo, encoding: 'utf8', maxBuffer: 16_000_000 }));
    // The pinned excerpt is what `protocolSourceContent` hands the reviewer for this 697 KB page.
    assert.ok(body.includes(flat(reference.excerpt)), `${capture}: the pinned excerpt is not verbatim`);
    assert.ok(/AIME 2025[^.]*Note: Retired from our active reporting/.test(body),
      `${capture}: AIME 2025's own note states the retirement`);
  }
});

test('D227: no board whose own note opens with a retirement still calls its version published', () => {
  // The AA methodology page lists each board as "<name> Note: …", so an excerpt that opens on this
  // board's name and carries the retirement sentence is that board's own note, not a neighbour's.
  const retired = registry.entries.filter((e) => (e.evidence ?? []).some((s) => {
    const excerpt = s.excerpt ?? '';
    return excerpt.includes('Retired from our active reporting')
      && excerpt.slice(0, 200).toLowerCase().includes(e.name.split(' (')[0].toLowerCase());
  }));
  assert.deepEqual(retired.map((e) => e.id).sort(),
    ['aa-aime::2025', 'aa-livecodebench::snapshot-2026-09-10'],
    'a new board carrying its own retirement note needs its lifecycle reviewed, not this list widened');
  for (const e of retired) {
    assert.notEqual(e.version_status, 'published', `${e.id}: a retired version is not published`);
    assert.equal(e.status, 'retained', `${e.id}: values are kept without claiming they are current`);
  }
});

test('D227: the field change moves no value, because the family has nothing to bridge', () => {
  // AA per-benchmark values reach the dataset through scores.json, not the public-leaderboard file.
  const observations = read('data/raw/benchmarks/scores.json').observations
    .filter((o) => String(o.benchmark_id ?? '').startsWith('aa-aime'));
  assert.ok(observations.length > 0, 'AIME 2025 still publishes the values already collected');
  for (const version_status of ['published', 'retained']) {
    const patched = { ...registry, entries: registry.entries.map((e) =>
      e.id === 'aa-aime::2025' ? { ...e, version_status } : e) };
    assert.deepEqual(crossVersionEstimates(observations, patched)
      .filter((x) => x.benchmark_id?.startsWith('aa-aime')), [],
      `version_status ${version_status}: a one-member family is never bridged`);
  }
});
