import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = async (path) => JSON.parse(await readFile(path, 'utf8'));

// CR-740: exercise the upstream metadata transition that broke the November 12 daily.
// Both the old blank HF field and the newly populated checkpoint must keep the
// same exact catalog configuration, its router offers, and its measured Epoch score.
test('Mistral Large 2407 keeps its Epoch GPQA join when OpenRouter adds or removes HF metadata', { timeout: 300_000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-mistral-2407-'));
  const linkAllBut = async (from, to, own) => {
    await mkdir(to, { recursive: true });
    for (const name of await readdir(from)) {
      if (!own.includes(name)) await symlink(join(from, name), join(to, name));
    }
  };
  try {
    await linkAllBut(root, dir, ['scripts', 'lib', 'data', '.git']);
    for (const sub of ['scripts', 'lib']) await cp(join(root, sub), join(dir, sub), { recursive: true });
    await linkAllBut(join(root, 'data'), join(dir, 'data'), ['raw', 'dataset.json']);
    await linkAllBut(join(root, 'data/raw'), join(dir, 'data/raw'), ['openrouter.json']);
    const routerPath = join(dir, 'data/raw/openrouter.json');
    const router = await read(join(root, 'data/raw/openrouter.json'));
    const source = router.models.find((m) => m.id === 'mistralai/mistral-large-2407');
    assert.ok(source, 'retained OpenRouter checkpoint exists');
    const score = (await read(join(root, 'data/raw/benchmarks/scores.json'))).observations.find(
      (o) => o.benchmark_id === 'epoch-gpqa-diamond::snapshot-2026-09-18' && o.subject.source_id === 'mistral-large-2407');
    assert.ok(score, 'retained measured Epoch result exists');
    for (const hf of ['', 'mistralai/Mistral-Large-Instruct-2407']) {
      source.hugging_face_id = hf;
      await writeFile(routerPath, JSON.stringify(router));
      await cp(join(root, 'data/dataset.json'), join(dir, 'data/dataset.json'));
      await promisify(execFile)(process.execPath, ['scripts/build-dataset.mjs'], { cwd: dir, maxBuffer: 8 * 1024 * 1024 });
      const dataset = await read(join(dir, 'data/dataset.json'));
      const target = dataset.models.find((m) => m.id === 'mistral-large-2-jul-24::default');
      assert.ok(target, `exact AA configuration survives HF=${hf}`);
      assert.ok(!dataset.models.some((m) => m.id === 'mistral-large-2407::default'), 'no duplicate catalog configuration');
      assert.ok(target.offers.some((o) => o.or_model_id === source.id), 'router offers follow the checkpoint');
      const attached = dataset.benchmark_results.observations.find((o) => o.id === score.id);
      assert.ok(attached, 'the Epoch score is not silently withheld');
      assert.equal(attached.subject.model_id, target.id);
      assert.equal(attached.value, score.value, 'measured value is preserved');
      assert.deepEqual(attached.source, score.source, 'original evidence is preserved');
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
