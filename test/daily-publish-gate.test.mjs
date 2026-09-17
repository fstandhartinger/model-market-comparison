// CR-66.2: daily publication goes through the publish gate explicitly (stub gate binary, real git).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assessVerdict, gatedPublish, gateRequirement } from '../ops/daily/publish-gate.mjs';

// Stub gate: stage 1 writes a marker; stage 2 writes a verdict for HEAD as STUB_GATE says.
const STUB = `import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const stage = process.argv[2], mode = process.env.STUB_GATE, runDir = dirname(process.cwd());
mkdirSync(join(runDir, 'gate'), { recursive: true });
appendFileSync(join(runDir, 'gate', 'calls.txt'), stage + ' ' + process.env.BH_GATE_REQUIRED + ' ' + process.env.BH_GATE_STAGE_BUDGET_MS + '\\n');
if (stage === 'precommit') { if (mode === 'fail-stage1') { writeFileSync(join(runDir, 'gate/verdict.json'), JSON.stringify({ verdict: 'FAIL', reasons: ['blast-radius gates failed'] })); process.exit(1); } process.exit(0); }
if (mode === 'missing') process.exit(0);
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sha = createHash('sha256').update(execFileSync('git', ['show', 'HEAD:data/dataset.json'])).digest('hex');
const verdict = { verdict: mode === 'fail' ? 'FAIL' : 'PASS', reasons: mode === 'fail' ? ['critic FAIL on row 1'] : [], dataset_sha256: mode === 'wrong-hash' ? 'f'.repeat(64) : sha, commit: head };
writeFileSync(join(runDir, 'gate/verdict.json'), JSON.stringify(verdict));
process.exit(verdict.verdict === 'PASS' ? 0 : 1);
`;

async function fixture({ installGate = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'bh-publish-gate-'));
  const home = join(dir, 'home'), runDir = join(home, 'runs', 'r1'), work = join(runDir, 'work'), remote = join(dir, 'remote.git');
  if (installGate) { await mkdir(join(home, 'gate'), { recursive: true }); await writeFile(join(home, 'gate/gate.mjs'), STUB); }
  await mkdir(join(work, 'data'), { recursive: true });
  const git = (...args) => execFileSync('git', args, { cwd: work, encoding: 'utf8' }).trim();
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', remote]);
  git('init', '-q', '-b', 'main'); git('config', 'user.email', 'fixture@example.test'); git('config', 'user.name', 'fixture');
  await writeFile(join(work, 'data/dataset.json'), '{"v":1}'); git('add', '.'); git('commit', '-q', '-m', 'base');
  git('remote', 'add', 'origin', remote); git('push', '-q', 'origin', 'main');
  await writeFile(join(work, 'data/dataset.json'), '{"v":2}'); git('add', '.');
  const remoteHead = () => execFileSync('git', ['rev-parse', 'main'], { cwd: remote, encoding: 'utf8' }).trim();
  const pushed = [];
  const opts = (mode, extra = {}) => ({ home, work, runDir, env: { ...process.env, STUB_GATE: mode, BH_GATE_REQUIRED: '' },
    commit: async () => { git('commit', '-q', '-m', 'refresh'); return git('rev-parse', 'HEAD'); },
    push: async (sha) => { git('push', '-q', 'origin', 'HEAD:refs/heads/main'); pushed.push(sha); }, ...extra });
  return { dir, home, runDir, work, git, remoteHead, pushed, opts };
}

for (const mode of ['fail', 'missing', 'wrong-hash', 'fail-stage1']) {
  test(`CR-66.2: gate ${mode} → no push, publication refused`, async () => {
    const f = await fixture();
    try {
      const before = f.remoteHead();
      const result = await gatedPublish(f.opts(mode));
      assert.equal(result.published, false);
      assert.match(result.error, /publish gate/);
      assert.equal(f.pushed.length, 0);
      assert.equal(f.remoteHead(), before);
      if (mode === 'fail-stage1') assert.equal(f.git('rev-list', '--count', 'HEAD'), '1', 'stage 1 failure stops before the commit');
      const calls = await readFile(join(f.runDir, 'gate/calls.txt'), 'utf8');
      assert.match(calls, /^precommit 1 \d+/, 'the gate runs explicitly and required');
    } finally { await rm(f.dir, { recursive: true, force: true }); }
  });
}

test('CR-66.2: gate PASS bound to the committed dataset publishes, and the verdict is recorded', async () => {
  const f = await fixture();
  try {
    const result = await gatedPublish(f.opts('pass'));
    assert.equal(result.published, true, result.error);
    assert.equal(f.remoteHead(), result.commit);
    const expected = createHash('sha256').update(execFileSync('git', ['show', 'HEAD:data/dataset.json'], { cwd: f.work })).digest('hex');
    assert.equal(result.gate.dataset_sha256, expected);
    assert.equal(result.gate.verdict.dataset_sha256, expected);
    assert.equal(result.gate.verdict.commit, result.commit);
    assert.deepEqual(result.gate.stages.map((s) => [s.stage, s.ok]), [['precommit', true], ['prepush', true]]);
    assert.equal((await readFile(join(f.runDir, 'gate/calls.txt'), 'utf8')).trim().split('\n').length, 2);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('CR-66.2: a gate that hangs is stopped by its own timeout and refuses publication', async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.home, 'gate/gate.mjs'), 'setTimeout(() => {}, 60_000);');
    const result = await gatedPublish(f.opts('pass', { timeoutMs: 1500 }));
    assert.equal(result.published, false);
    assert.match(result.gate.stages[0].log, /timed out after 1500 ms/);
    assert.equal(f.pushed.length, 0);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('CR-66.2: BH_GATE_REQUIRED=1 without an installed gate refuses; no gate and not required publishes as before', async () => {
  const f = await fixture({ installGate: false });
  try {
    const refused = await gatedPublish({ ...f.opts('pass'), env: { BH_GATE_REQUIRED: '1' } });
    assert.equal(refused.published, false);
    assert.match(refused.error, /BH_GATE_REQUIRED=1 but no gate/);
    assert.equal(f.pushed.length, 0);
    const open = await gatedPublish({ ...f.opts('pass'), env: {} });
    assert.equal(open.published, true);
    assert.equal(f.remoteHead(), open.commit);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('CR-66.2: verdict assessment binds hash and commit', () => {
  const v = { verdict: 'PASS', dataset_sha256: 'a', commit: 'c1' };
  assert.equal(assessVerdict(v, { datasetSha256: 'a', commit: 'c1', required: true }).ok, true);
  assert.equal(assessVerdict(v, { datasetSha256: 'b', commit: 'c1', required: true }).ok, false);
  assert.equal(assessVerdict(v, { datasetSha256: 'a', commit: 'c2', required: true }).ok, false);
  assert.equal(assessVerdict({ ...v, verdict: 'FAIL' }, { datasetSha256: 'a', commit: 'c1', required: true }).ok, false);
  assert.equal(assessVerdict(null, { required: true }).ok, false);
  assert.equal(gateRequirement({ home: '/nonexistent', env: { BH_GATE_REQUIRED: '1' } }).required, true);
  assert.equal(gateRequirement({ home: '/nonexistent', env: {} }).required, false);
});

test('CR-66.2: daily.mjs publishes only through gatedPublish', async () => {
  const src = await readFile(new URL('../ops/daily/daily.mjs', import.meta.url), 'utf8');
  const push = src.indexOf("git('push-data'");
  assert.ok(push > 0 && src.lastIndexOf('gatedPublish({', push) > 0 && src.indexOf('push: async', src.lastIndexOf('gatedPublish({', push)) < push, 'push-data runs inside the gated push callback');
  assert.equal(src.match(/git\('push-data'/g).length, 1);
  assert.match(src, /if \(!gated\.published\) throw new Error\(gated\.error\)/);
});

test('CR-66.4: build, test, typecheck and prerender steps run without the production evidence/state directories', async () => {
  const { isolatedStepEnvironment } = await import('../ops/daily/daily.mjs');
  const env = isolatedStepEnvironment({ PATH: '/bin', BH_EVIDENCE_DIR: '/run/sources', BH_STATE: '/run/workers', BH_WORKER_REASONING_EFFORT: 'low' });
  assert.deepEqual(env, { PATH: '/bin', BH_WORKER_REASONING_EFFORT: 'low' });
  const src = await readFile(new URL('../ops/daily/daily.mjs', import.meta.url), 'utf8');
  for (const step of ['npm-build', 'npm-test', 'typecheck', 'prerender']) {
    const line = src.split('\n').find((l) => l.includes(`command('${step}'`));
    assert.ok(line?.trimEnd().endsWith('isolatedEnvironment);'), `${step} uses the isolated environment`);
  }
  assert.match(src, /env: isolatedEnvironment,/, 'the publish gate runs isolated too');
});
