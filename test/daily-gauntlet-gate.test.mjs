import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { reviewArtifact, sha256 } from '../ops/daily/gauntlet.mjs';
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
      sources: [{ ...sources[0], content: 'x'.repeat(70_000) }], criteria: ['fixture'],
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
