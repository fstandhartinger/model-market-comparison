// D191: the daily run's protocol reviews run with bounded concurrency
// (ops/daily/refresh-benchmarks.mjs). Each round writes its packets, critic answers and
// manifest into `${runDir}/gauntlet/<sanitize(artifactId)>/`, and the protocol arm's artifact
// id is `protocol-<registry entry id>`. While the reviews ran one after another, two entry ids
// that sanitize to the same directory name were merely a confusing reuse of one folder. Run
// concurrently they are two gauntlet rounds writing the same files at the same time, and the
// evidence of at least one of them is lost — silently, because neither round reads the other's
// files. The registry is the only thing that decides whether that pair can exist, so it is the
// registry this test reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sanitize } from '../ops/daily/gauntlet.mjs';

test('D191: every registry entry gets its own protocol gauntlet directory', async () => {
  const registry = JSON.parse(await readFile('data/raw/benchmarks/registry.json', 'utf8'));
  assert.ok(registry.entries.length > 100, 'the real registry, not a stub');
  const byDirectory = new Map();
  for (const entry of registry.entries) {
    const directory = sanitize(`protocol-${entry.id}`);
    byDirectory.set(directory, [...(byDirectory.get(directory) ?? []), entry.id]);
  }
  const shared = [...byDirectory].filter(([, ids]) => ids.length > 1);
  assert.deepEqual(shared, [], `these registry ids share one gauntlet directory: ${JSON.stringify(shared)}`);
  assert.equal(byDirectory.size, registry.entries.length);
});

// The collision this guards against is not hypothetical: `sanitize` folds every unsafe
// character to `-` and truncates at 120 characters, so two long ids differing only past that
// point, or only in `::` versus `-`, would collide. Both shapes are refused here rather than
// left to be discovered as missing evidence.
test('D191: the shapes that would collide are really caught by this rule', () => {
  assert.equal(sanitize('protocol-arc-agi::1'), sanitize('protocol-arc-agi-1'));
  const long = 'protocol-' + 'a'.repeat(130);
  assert.equal(sanitize(long + 'x'), sanitize(long + 'y'));
  assert.equal(sanitize(long).length, 120);
});
