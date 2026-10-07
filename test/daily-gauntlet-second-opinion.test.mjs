// Decision #10945 (7 Oct 2026): a lone producer flag under a clean critic pass gets one second opinion from a
// producer of a different vendor family, then a fresh critic; acceptance needs both. Measured case: the 7 Oct
// 11:41 run lost the core `or` contract because glm-5.3-flash claimed a staged `discount: 0` was missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { reviewArtifact, sha256 } from '../ops/daily/gauntlet.mjs';
import { selectModel } from '../ops/rebuild-2026-09/bin/worker-policy.mjs';

const rows = [{ id: 'or', value: 465 }];
const sources = [{ url: 'https://example.test/primary', sha256: sha256('or = 465'), fetched_at: '2026-10-07', locator: 'or', content: 'or = 465' }];

// producers: one entry per producer call, { model, flag }; the critic is always a clean pass from moonshotai.
function scriptedRunner(producers, calls, critics = []) {
  let producerCall = 0, criticCall = 0;
  return async (args) => {
    calls.push(args);
    const out = args[args.indexOf('--out') + 1];
    const packet = await readFile(args[args.indexOf('--file') + 1], 'utf8');
    const critic = args.includes('--critic');
    let model, object;
    if (critic) {
      model = 'moonshotai/fixture-critic';
      object = { artifact_id: packet.match(/ARTIFACT_ID: (.*)/)[1], artifact_sha256: packet.match(/ARTIFACT_SHA256: (.*)/)[1],
        round: Number(packet.match(/ROUND: (\d+)/)[1]), verdict: 'pass', coverage_checked: ['or', 'c1'], errors_found: 0, findings: [], fixed: [], uncertainties: [], missing_evidence: [] };
      Object.assign(object, critics[criticCall++] ?? {});
    } else {
      const p = producers[producerCall++];
      model = p.model;
      object = { rows: [{ id: 'or', status: p.flag ? 'mismatch' : 'match', note: p.flag ? 'staged pricing omits discount:0 (false claim)' : 'every compared field matches the primary' }] };
    }
    const body = JSON.stringify(object) + '\n';
    await writeFile(out, body);
    await writeFile(out + '.meta.json', JSON.stringify({ actual_model: model, output_sha256: sha256(body), qualification: { id: model, aa_intelligence_index: 40, input_per_1m: 0.1, output_per_1m: 0.5 } }));
  };
}
const producerCalls = (calls) => calls.filter((a) => !a.includes('--critic'));

test('a producer false flag under a clean critic is rescued by a different-family producer and a fresh critic', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-second-opinion-'));
  try {
    const calls = [];
    const runner = scriptedRunner([{ model: 'z-ai/glm-fixture', flag: true }, { model: 'deepseek/fixture', flag: false }], calls);
    const result = await reviewArtifact({ runDir: dir, artifactId: 'live-contract-or', rows, sources, criteria: ['c1'], runner, secondOpinion: true });
    assert.equal(result.accepted, true);
    assert.deepEqual(result.fingerprints.map((f) => f.id), ['or']);
    assert.deepEqual(result.quarantined, []);
    assert.equal(calls.length, 4, 'producer, critic, second producer, fresh critic');
    const second = producerCalls(calls)[1];
    assert.equal(second[second.indexOf('--avoid-family') + 1], 'z-ai');
    assert.equal(producerCalls(calls)[0].includes('--avoid-family'), false);
    // The fresh critic must differ from both producers' families.
    const critic2 = calls.filter((a) => a.includes('--critic'))[1];
    assert.equal(critic2[critic2.indexOf('--producer') + 1], 'z-ai/glm-fixture,deepseek/fixture');
    assert.equal(result.second_opinion.first_producer, 'z-ai/glm-fixture');
    assert.equal(result.second_opinion.second_producer, 'deepseek/fixture');
    assert.match(result.second_opinion.outcome, /^accepted/);
    assert.equal(result.manifest.second_opinion.flagged[0].status, 'mismatch');
    assert.equal(result.manifest.rounds_used, 2);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a second flag keeps the rejection; without secondOpinion the old rule is unchanged', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-second-opinion-no-'));
  try {
    const calls = [];
    const runner = scriptedRunner([{ model: 'z-ai/glm-fixture', flag: true }, { model: 'deepseek/fixture', flag: true }], calls);
    const result = await reviewArtifact({ runDir: dir, artifactId: 'twice', rows, sources, criteria: ['c1'], runner, secondOpinion: true });
    assert.equal(result.accepted, false);
    assert.deepEqual(result.quarantined.map((q) => q.id), ['or']);
    assert.match(result.second_opinion.outcome, /^not rescued/);
    assert.equal(calls.length, 4, 'exactly one second opinion, never a third');

    const plainCalls = [];
    const plain = await reviewArtifact({ runDir: dir, artifactId: 'plain', rows, sources, criteria: ['c1'],
      runner: scriptedRunner([{ model: 'z-ai/glm-fixture', flag: true }], plainCalls) });
    assert.equal(plain.accepted, false);
    assert.equal(plainCalls.length, 2);
    assert.equal(plain.second_opinion, null);
    assert.match(plain.errors.join(' '), /producer uncertainty cannot be overruled/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a second-opinion producer of the flagging family is refused', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-second-opinion-family-'));
  try {
    const calls = [];
    const runner = scriptedRunner([{ model: 'z-ai/glm-fixture', flag: true }, { model: 'z-ai/other', flag: false }, { model: 'z-ai/other', flag: false }], calls);
    const result = await reviewArtifact({ runDir: dir, artifactId: 'same-family', rows, sources, criteria: ['c1'], runner, secondOpinion: true });
    assert.equal(result.accepted, false);
    assert.match(result.errors.join(' '), /from the family it must re-examine/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('worker selection honours avoidFamilies', () => {
  // Fixture shape from test/d199-bounded-critic-retry.test.mjs; prices and indices are fixtures, not claims.
  const GLM = 'z-ai/glm-5.3-flash', DEEPSEEK = 'deepseek/deepseek-v4.1-flash';
  const catalog = [GLM, DEEPSEEK].map((id) => ({ id, pricing: { prompt: '0.0000001', completion: '0.0000002' }, supported_parameters: ['response_format'] }));
  const base = (id) => id.split('/')[1];
  const dataset = { models: catalog.map(({ id }) => ({ id: `${base(id)}::default`, aa_model_id: `${base(id)}::default`,
    family_key: base(id), org: 'Example', aa_metadata: { openrouter_api_id: id }, benchmarks: { aa_intelligence_index: 40 } })) };
  const first = selectModel(catalog, dataset, { scheduled: true, freeRouter: [] }).id;
  const other = selectModel(catalog, dataset, { scheduled: true, freeRouter: [], avoidFamilies: [first.split('/')[0]] }).id;
  assert.notEqual(other.split('/')[0], first.split('/')[0]);
  assert.throws(() => selectModel(catalog, dataset, { scheduled: true, freeRouter: [], avoidFamilies: ['z-ai', 'deepseek'] }), /No supported viable worker model found/);
  assert.throws(() => selectModel(catalog, dataset, { model: GLM, avoidFamilies: ['z-ai'] }), /must avoid/);
});

test('regression (review of #203): an objecting second-opinion critic is terminal, never retried into acceptance', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-second-opinion-critic-'));
  try {
    for (const [name, critic2] of [
      ['missing evidence', { missing_evidence: ['pricing discount is absent from the primary source'] }],
      ['revise', { verdict: 'revise', errors_found: 1, missing_evidence: ['discount absent'] }],
      ['wrong round with objection', { round: 99, verdict: 'revise', errors_found: 1, missing_evidence: ['discount absent'] }],
    ]) {
      const calls = [];
      const runner = scriptedRunner([{ model: 'z-ai/glm-fixture', flag: true }, { model: 'deepseek/fixture', flag: false }, { model: 'deepseek/fixture', flag: false }], calls, [{}, critic2, {}]);
      const result = await reviewArtifact({ runDir: dir, artifactId: `critic-${name.replace(/ /g, '-')}`, rows, sources, criteria: ['c1'], runner, secondOpinion: true });
      assert.equal(result.accepted, false, name);
      assert.equal(calls.length, 4, `${name}: no third round`);
      assert.match(result.second_opinion.outcome, /^not rescued/, name);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('regression (review of #203): only round 1 can start a second opinion', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-second-opinion-late-'));
  try {
    const calls = [];
    // Round 1: producer flags AND the critic reports missing evidence (not eligible). Round 2: producer flags under a clean critic.
    const runner = scriptedRunner([{ model: 'z-ai/glm-fixture', flag: true }, { model: 'z-ai/glm-fixture', flag: true }, { model: 'deepseek/fixture', flag: false }], calls,
      [{ missing_evidence: ['row or: discount not shown'] }, {}, {}]);
    const result = await reviewArtifact({ runDir: dir, artifactId: 'late', rows, sources, criteria: ['c1'], runner, secondOpinion: true });
    assert.equal(result.accepted, false);
    assert.equal(result.second_opinion, null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
