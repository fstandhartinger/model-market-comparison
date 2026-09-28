// The delegation runner decides a free model "failed" from its output. On 2026-09-28 that decision
// was made by scanning the whole output for provider words, and a delegated *live verifier* printed a
// page reading "Chutes rate limit stopped the run after 81/308 items". The sniffer read "rate limit",
// declared a healthy Kimi K3 dead, fell through to a model with no endpoints, and copied that error
// over --out — losing the written statement for a 78/78 receipt, twice. The predicate now matches only
// the runner's own `Error:` line, and these are the three real cases it has to tell apart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const exec = promisify(execFile);
const script = 'ops/ux-2026-09-12/bin/delegate.sh';

const predicate = async () => {
  const source = await readFile(script, 'utf8');
  const line = source.split('\n').find((l) => l.startsWith('failed() {'));
  assert.ok(line, `${script} no longer defines failed()`);
  return line;
};

const verdict = async (body) => {
  const dir = await mkdtemp(join(tmpdir(), 'delegate-sniffer-'));
  const file = join(dir, 'out.txt');
  await writeFile(file, body);
  const { stdout } = await exec('bash', ['-c', `${await predicate()}\nif failed ${JSON.stringify(file)}; then echo FAILED; else echo OK; fi`]);
  return stdout.trim();
};

test('a provider error on the runner\'s own line is a failure', async () => {
  // Verbatim from the 2026-09-28 fallback attempt, ANSI codes included.
  assert.equal(await verdict('\u001b[0m\n> build · nex-agi/nex-n2.5-pro:free\n\u001b[0m\n\u001b[91m\u001b[1mError: \u001b[0mNo endpoints found for nex-agi/nex-n2.5-pro:free.\n'), 'FAILED');
});

test('the task\'s own output mentioning a rate limit is not a failure', async () => {
  // Verbatim from the verifier output the old sniffer threw away.
  assert.equal(await verdict([
    'PASS  d238/benchmarkheaven.com/desktop/qwen3.8-27b-states-69/308-once  visible=true occurrences=1',
    'text="ed validly (failures count as wrong); partial: Chutes rate limit stopped the run after 81/308 items; unranked as in v1.3"',
    'passed: 78 / 78',
    'failed: []',
  ].join('\n')), 'OK');
});

test('an HTTP status in the task output is not a failure either', async () => {
  assert.equal(await verdict('probe: HTTP 429 from the board, retried once and got 200\npassed: 12 / 12\n'), 'OK');
});

test('no output at all is a failure', async () => {
  assert.equal(await verdict(''), 'FAILED');
});

test('a failing fallback may not overwrite the primary answer', async () => {
  const source = await readFile(script, 'utf8');
  assert.match(source, /if failed "\$ALT"; then cat "\$ALT" >> "\$TMP"; else cp "\$ALT" "\$TMP"; fi/,
    'the fallback replaces the answer only when it produced one');
});
