import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { reviewArtifact, sha256, WORKER_MAX_TOKENS_CEILING } from '../ops/daily/gauntlet.mjs';
const rows = [{ id: 'fixture:1', value: 42 }];
const sources = [{ url: 'https://example.test/primary', sha256: sha256('fixture:1 = 42'), fetched_at: '2026-01-01', locator: 'fixture:1', content: 'fixture:1 = 42' }];
async function mockRunner(args) {
  const out = args[args.indexOf('--out') + 1];
  const packet = await readFile(args[args.indexOf('--file') + 1], 'utf8');
  const critic = args.includes('--critic');
  const object = critic ? {
    artifact_id: packet.match(/ARTIFACT_ID: (.*)/)[1], artifact_sha256: packet.match(/ARTIFACT_SHA256: (.*)/)[1],
    round: Number(packet.match(/ROUND: (\d+)/)[1]), verdict: 'pass', coverage_checked: ['fixture:1', 'c1'], errors_found: 0, findings: [], fixed: [], uncertainties: [], missing_evidence: [],
  } : { rows: [{ id: 'fixture:1', status: 'mismatch', note: 'synthetic disagreement requiring resolution' }] };
  const body = JSON.stringify(object) + '\n';
  await writeFile(out, body);
  await writeFile(out + '.meta.json', JSON.stringify({ actual_model: critic ? 'z-ai/fixture' : 'deepseek/fixture', output_sha256: sha256(body), qualification: { id: critic ? 'z-ai/fixture' : 'deepseek/fixture', aa_intelligence_index: 34, input_per_1m: 0, output_per_1m: 0 } }));
}

test('a critic pass quarantines producer disagreement without retrying or blacklisting a careful producer', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-disagreement-'));
  try {
    let calls = 0;
    const result = await reviewArtifact({ runDir: dir, artifactId: 'fixture', rows, sources, criteria: ['Verify exact value against the supplied fixture source'], runner: async (args) => { calls++; return mockRunner(args); } });
    assert.equal(result.accepted, false);
    assert.equal(result.fingerprints.length, 0);
    assert.equal(calls, 2);
    assert.deepEqual(result.quarantined.map((r) => r.id), ['fixture:1']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('malformed rows are not an accepted empty artifact', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-invalid-'));
  try {
    for (const invalid of [null, {}, [rows[0], rows[0]]]) {
      await assert.rejects(reviewArtifact({ runDir: dir, artifactId: 'invalid', rows: invalid, sources, criteria: ['fixture'], runner: mockRunner }));
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('one disputed source row is dropped while independently checked neighbors can be accepted', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-row-scope-'));
  try {
    const runner = async (args) => {
      await mockRunner(args);
      const path = args[args.indexOf('--out') + 1];
      const value = JSON.parse(await readFile(path));
      if (args.includes('--critic')) value.coverage_checked.push('fixture:2');
      else value.rows.push({ id: 'fixture:2', status: 'match', note: 'exact synthetic source value' });
      const body = JSON.stringify(value) + '\n';
      await writeFile(path, body);
      const meta = JSON.parse(await readFile(path + '.meta.json')); meta.output_sha256 = sha256(body);
      await writeFile(path + '.meta.json', JSON.stringify(meta));
    };
    const result = await reviewArtifact({ runDir: dir, artifactId: 'row-scope', rows: [...rows, { id: 'fixture:2', value: 7 }], sources: [...sources, { ...sources[0], content: 'fixture:2 = 7', sha256: sha256('fixture:2 = 7') }], criteria: ['Verify values'], runner });
    assert.deepEqual(result.fingerprints.map((r) => r.id), ['fixture:2']);
    assert.deepEqual(result.quarantined.map((r) => r.id), ['fixture:1']);
    assert.equal(result.manifest.rounds_used, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('same-family critic and below-gate receipt cannot produce an acceptance fingerprint', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-qualification-'));
  try {
    for (const mode of ['same-family', 'unqualified']) {
      const runner = async (args) => {
        await mockRunner(args);
        const path = args[args.indexOf('--out') + 1] + '.meta.json';
        const meta = JSON.parse(await readFile(path, 'utf8'));
        if (mode === 'same-family' && args.includes('--critic')) { meta.actual_model = 'deepseek/other'; meta.qualification.id = meta.actual_model; }
        if (mode === 'unqualified') meta.qualification.aa_intelligence_index = 33.9;
        await writeFile(path, JSON.stringify(meta));
      };
      const result = await reviewArtifact({ runDir: dir, artifactId: mode, rows, sources, criteria: ['fixture'], runner, maxRounds: 1 });
      assert.equal(result.accepted, false); assert.equal(result.fingerprints.length, 0);
      assert.match(result.errors.join(' '), mode === 'same-family' ? /different vendor family/ : /not qualified/);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('an oversized source is refused instead of silently truncated into a passing review', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-source-size-'));
  try {
    let called = false;
    const result = await reviewArtifact({ runDir: dir, artifactId: 'oversized', rows,
      sources: [{ ...sources[0], content: 'x'.repeat(140_000) }], criteria: ['fixture'],
      runner: async () => { called = true; }, maxRounds: 1 });
    assert.equal(called, false); assert.equal(result.accepted, false);
    assert.match(result.errors.join(' '), /complete bounded extract/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a critic transport retry reuses an unchanged, hash-verified producer audit without another production charge', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-reuse-'));
  let producers = 0, critics = 0;
  try {
    const runner = async (args) => {
      if (args.includes('--critic') && ++critics === 1) throw new Error('synthetic critic transport failure');
      await mockRunner(args);
      if (!args.includes('--critic')) {
        producers++;
        const path = args[args.indexOf('--out') + 1];
        const body = JSON.stringify({ rows: [{ id: 'fixture:1', status: 'match', note: 'Fixture value matches primary input' }] }) + '\n';
        await writeFile(path, body);
        const meta = JSON.parse(await readFile(path + '.meta.json', 'utf8')); meta.output_sha256 = sha256(body);
        await writeFile(path + '.meta.json', JSON.stringify(meta));
      }
    };
    const result = await reviewArtifact({ runDir: dir, artifactId: 'reuse', rows, sources, criteria: ['Verify source value'], runner, maxRounds: 2 });
    assert.equal(result.accepted, true); assert.equal(producers, 1); assert.equal(critics, 2);
    assert.equal(result.manifest.receipts.find((r) => r.round === 2 && r.role === 'producer').reused_from_round, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CR-66.8: a critic PASS with an unbound finding retries the round with another critic instead of aborting', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-unbound-pass-'));
  let critics = 0, alwaysUnbound = false;
  try {
    const runner = async (args) => {
      await mockRunner(args);
      const path = args[args.indexOf('--out') + 1];
      const meta = JSON.parse(await readFile(path + '.meta.json', 'utf8'));
      let body;
      if (args.includes('--critic')) {
        const review = JSON.parse(await readFile(path, 'utf8'));
        if (++critics === 1 || alwaysUnbound) {
          // Round 1 critic: "pass", but a major finding that names no row (the 14 and 16 Sep aborts).
          Object.assign(review, { errors_found: 1, findings: [{ id: 'F1', severity: 'major', location: 'overall', evidence: 'values look plausible but formatting differs', repair: 'none' }] });
        } else meta.actual_model = meta.qualification.id = 'qwen/fixture-critic';
        body = JSON.stringify(review) + '\n';
      } else body = JSON.stringify({ rows: [{ id: 'fixture:1', status: 'match', note: 'Fixture value matches primary input' }] }) + '\n';
      await writeFile(path, body);
      meta.output_sha256 = sha256(body);
      await writeFile(path + '.meta.json', JSON.stringify(meta));
    };
    const result = await reviewArtifact({ runDir: dir, artifactId: 'unbound-pass', rows, sources, criteria: ['Verify source value'], runner });
    assert.equal(critics, 2);
    assert.equal(result.accepted, true);
    assert.match(result.errors[0], /round 1: critic z-ai\/fixture returned pass without a bounded row-level revision \(artifact-wide finding\); retrying with another critic/);
    assert.equal(result.fingerprints[0].critic_model, 'qwen/fixture-critic');

    // Every critic doing it: bounded by maxRounds, then refused (never accepted).
    alwaysUnbound = true;
    const refused = await reviewArtifact({ runDir: dir, artifactId: 'unbound-pass-all', rows, sources, criteria: ['Verify source value'], maxRounds: 2, runner });
    assert.equal(refused.accepted, false);
    assert.equal(refused.errors.length, 2);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CR-67.3: one malformed answer from a paid worker earns one retry; timeouts, repeats and free routes stay excluded', async () => {
  const { excludedWorkerModels } = await import('../ops/daily/gauntlet.mjs');
  const excluded = excludedWorkerModels([
    { model: 'chutes/moonshotai/Kimi-K3-TEE', reason: 'Malformed producer audit row' },
    { model: 'deepseek/deepseek-v4-flash-0731', reason: 'The operation was aborted due to timeout' },
    { model: 'z-ai/glm-5.3-flash', reason: 'JSON mode returned malformed JSON' },
    { model: 'deepseek/deepseek-v4.1-flash', reason: 'Malformed producer audit: missing rows array' },
    { model: 'deepseek/deepseek-v4.1-flash', reason: 'Malformed critic output: not JSON' },
  ]);
  assert.deepEqual(excluded.sort(), ['chutes/moonshotai/Kimi-K3-TEE', 'deepseek/deepseek-v4-flash-0731', 'deepseek/deepseek-v4.1-flash']);
});

test('a dropped connection costs the call, not the review round', async () => {
  // 2026-09-23 (iteration 181): on the 09:23 unattended run one `fetch failed` on the critic call ended
  // round 2 and another ended round 3, so the AA contract was rejected and nothing was published — while
  // the round-3 producer had already reported "match". The call is retried once in place instead.
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-drop-'));
  try {
    let critics = 0, drops = 0;
    const runner = async (args) => {
      if (args.includes('--critic')) {
        critics++;
        if (critics === 1) { drops++; throw new Error('chutes/moonshotai/Kimi-K3-TEE: fetch failed'); }
      }
      await mockRunner(args);
      const path = args[args.indexOf('--out') + 1];
      if (!args.includes('--critic')) {
        const body = JSON.stringify({ rows: [{ id: 'fixture:1', status: 'match', note: 'exact synthetic source value' }] }) + '\n';
        await writeFile(path, body);
        const meta = JSON.parse(await readFile(path + '.meta.json')); meta.output_sha256 = sha256(body);
        await writeFile(path + '.meta.json', JSON.stringify(meta));
      }
    };
    const result = await reviewArtifact({ runDir: dir, artifactId: 'drop', rows, sources, criteria: ['Verify exact value against the supplied fixture source'], runner });
    assert.equal(drops, 1);
    assert.equal(critics, 2, 'the critic call was retried in place');
    assert.equal(result.manifest.rounds_used, 1, 'the drop did not spend a round');
    assert.deepEqual(result.fingerprints.map((r) => r.id), ['fixture:1']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a producer cut off at the cap is asked again with the runner\'s maximum, once', async () => {
  // 2026-09-23 (iteration 182): two producer calls on the 09:57 unattended run returned exactly
  // `completion_tokens: 16384` and were discarded, each one paid for. The cap stays where D179 left it;
  // only the call that ran into it is repeated with the runner's maximum.
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-length-'));
  try {
    let producers = 0;
    const caps = [];
    const runner = async (args, options) => {
      if (!args.includes('--critic')) {
        producers++;
        caps.push(options?.maxTokens ?? null);
        if (producers === 1) throw new Error('z-ai/glm-5.3-flash: Incomplete completion (length)');
      }
      await mockRunner(args);
      const path = args[args.indexOf('--out') + 1];
      if (!args.includes('--critic')) {
        const body = JSON.stringify({ rows: [{ id: 'fixture:1', status: 'match', note: 'exact synthetic source value' }] }) + '\n';
        await writeFile(path, body);
        const meta = JSON.parse(await readFile(path + '.meta.json')); meta.output_sha256 = sha256(body);
        await writeFile(path + '.meta.json', JSON.stringify(meta));
      }
    };
    const result = await reviewArtifact({ runDir: dir, artifactId: 'length', rows, sources, criteria: ['Verify exact value against the supplied fixture source'], runner });
    assert.equal(producers, 2, 'the producer call was retried in place');
    assert.deepEqual(caps, [null, WORKER_MAX_TOKENS_CEILING], 'the first call keeps the default cap, the retry gets the ceiling');
    assert.equal(result.manifest.rounds_used, 1, 'the cut did not spend a round');
    assert.deepEqual(result.fingerprints.map((r) => r.id), ['fixture:1']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a critic cut off at the ceiling is not repeated: the retry would buy the same room twice', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-length3-'));
  try {
    let critics = 0;
    const runner = async (args) => {
      if (args.includes('--critic')) { critics++; throw new Error('z-ai/glm-5.3-flash: Incomplete completion (length)'); }
      return mockRunner(args);
    };
    const result = await reviewArtifact({ runDir: dir, artifactId: 'length3', rows, sources, criteria: ['Verify values'], runner, maxRounds: 2 });
    assert.equal(result.accepted, false);
    assert.equal(critics, 2, 'two rounds, one critic call each');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a second cut at the ceiling is a real failure, not an endless retry', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-length2-'));
  try {
    let producers = 0;
    const runner = async (args) => {
      if (!args.includes('--critic')) { producers++; throw new Error('z-ai/glm-5.3-flash: Incomplete completion (length)'); }
      return mockRunner(args);
    };
    const result = await reviewArtifact({ runDir: dir, artifactId: 'length2', rows, sources, criteria: ['Verify values'], runner, maxRounds: 2 });
    assert.equal(result.accepted, false);
    assert.equal(producers, 4, 'two rounds, each retried exactly once');
    assert.ok(result.errors.some((e) => /Incomplete completion/.test(e)), result.errors);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a producer error that is not a cap cut is not retried: the extra call would be paid for nothing', async () => {
  // D184 buys round survival for a completion that stopped because it hit the cap. Kimi K3's
  // sign-off of D184 found that nothing pinned the other direction: broadening the retry to fire on
  // any producer error would still pass, because no case had a producer throw something else.
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-nonlength-'));
  try {
    let producers = 0;
    const runner = async (args) => {
      if (!args.includes('--critic')) { producers++; throw new Error('z-ai/glm-5.3-flash: malformed worker output'); }
      return mockRunner(args);
    };
    const result = await reviewArtifact({ runDir: dir, artifactId: 'nonlength', rows, sources, criteria: ['Verify values'], runner, maxRounds: 2 });
    assert.equal(result.accepted, false);
    assert.equal(producers, 2, 'one call per round: only a cap cut earns the second attempt');
    assert.ok(result.errors.some((e) => /malformed worker output/.test(e)), result.errors);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a second drop is a real failure, not an endless retry', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-drop2-'));
  try {
    let critics = 0;
    const runner = async (args) => {
      if (args.includes('--critic')) { critics++; throw new Error('chutes/moonshotai/Kimi-K3-TEE: fetch failed'); }
      return mockRunner(args);
    };
    const result = await reviewArtifact({ runDir: dir, artifactId: 'drop2', rows, sources, criteria: ['Verify values'], runner, maxRounds: 2 });
    assert.equal(result.accepted, false);
    assert.equal(critics, 4, 'two rounds, each retried exactly once');
    assert.ok(result.errors.some((e) => /fetch failed/.test(e)), result.errors);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// D188: the refusal reason a single-row artifact produced was "revise without a bounded
// row-level revision" even when the critic had named that very row and written a repair.
// Every protocol review is a single-row artifact, so twelve boards froze for up to a week
// behind a sentence that pointed at the harness instead of at the registry field to fix.
// Refusal is unchanged; only the reason is now true and carries the critic's instruction.
async function refusalReason({ dir, artifactId, findings, verdict = 'revise', rows: artifactRows = rows }) {
  const runner = async (args) => {
    await mockRunner(args);
    const path = args[args.indexOf('--out') + 1];
    const meta = JSON.parse(await readFile(path + '.meta.json', 'utf8'));
    let body;
    if (args.includes('--critic')) {
      const review = JSON.parse(await readFile(path, 'utf8'));
      Object.assign(review, { verdict, errors_found: findings.length, findings });
      review.coverage_checked = [...artifactRows.map((row) => row.id), 'c1'];
      body = JSON.stringify(review) + '\n';
    } else body = JSON.stringify({ rows: artifactRows.map((row) => ({ id: row.id, status: 'match', note: 'Fixture value matches primary input' })) }) + '\n';
    await writeFile(path, body);
    meta.output_sha256 = sha256(body);
    await writeFile(path + '.meta.json', JSON.stringify(meta));
  };
  const result = await reviewArtifact({ runDir: dir, artifactId, rows: artifactRows,
    sources: artifactRows.map((row) => ({ ...sources[0], content: `${row.id} = ${row.value}`, sha256: sha256(`${row.id} = ${row.value}`) })),
    criteria: ['Verify source value'], maxRounds: 1, runner });
  assert.equal(result.accepted, false, 'refusal must be unchanged');
  return result.errors.join(' ;; ');
}

test('D188: a refused single-row artifact says every row is disputed and quotes the critic repair', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-gauntlet-reason-'));
  try {
    const named = await refusalReason({ dir, artifactId: 'reason-named', findings: [
      { id: 'F1', severity: 'major', location: 'row fixture:1 scoring.notes', evidence: 'the notes claim a protocol family the board no longer publishes', repair: 'Update the notes to the protocol family the board CSV actually carries' },
    ] });
    assert.match(named, /all 1 row disputed, nothing left to publish/);
    assert.match(named, /\[major\] row fixture:1 scoring\.notes → Update the notes to the protocol family the board CSV actually carries/);
    assert.doesNotMatch(named, /without a bounded row-level revision/);
    // source-health.md clips the reason at 160 characters, so the field to repair has to be
    // inside that clip, not behind the shape sentence.
    assert.match(named.slice(0, 160), /row fixture:1 scoring\.notes/);

    // A minor-only revise names no droppable row; that is a different situation and says so.
    const minor = await refusalReason({ dir, artifactId: 'reason-minor', findings: [
      { id: 'F1', severity: 'minor', location: 'row fixture:1 maintainer', evidence: 'no excerpt carries the attribution', repair: 'Supply the attribution excerpt or drop the field' },
    ] });
    assert.match(minor, /only minor findings, no row-level revision to apply/);
    assert.match(minor, /\[minor\] row fixture:1 maintainer → Supply the attribution excerpt or drop the field/);

    // A finding that names no row at all is the genuinely unbounded case; wording kept.
    const wide = await refusalReason({ dir, artifactId: 'reason-wide', findings: [
      { id: 'F1', severity: 'blocker', location: 'overall', evidence: 'the artifact as a whole disagrees with the source', repair: 'Re-extract the artifact' },
    ] });
    assert.match(wide, /no bounded row-level revision \(artifact-wide finding\)/);
    assert.match(wide, /\[blocker\] overall → Re-extract the artifact/);

    // Multi-row artifacts still drop the named rows rather than refusing, so the new
    // wording can only appear when every row is gone: two rows, both named.
    const both = await refusalReason({ dir, artifactId: 'reason-both',
      rows: [{ id: 'fixture:1', value: 42 }, { id: 'fixture:2', value: 7 }],
      findings: [
        { id: 'F1', severity: 'blocker', location: 'row fixture:1', evidence: 'wrong', repair: 'Fix row one' },
        { id: 'F2', severity: 'major', location: 'row fixture:2', evidence: 'wrong', repair: 'Fix row two' },
      ] });
    assert.match(both, /all 2 rows disputed, nothing left to publish/);
    assert.match(both, /\[blocker\] row fixture:1 → Fix row one \| \[major\] row fixture:2 → Fix row two/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
