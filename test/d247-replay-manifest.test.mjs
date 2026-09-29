import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { replayManifestForRun } from '../ops/daily/replay-manifest.mjs';

const captureKey = (source) => source.zip_member ? `${source.url}#zip:${source.zip_member}` : source.url;

test('daily replay selects the newest matching capture made after that run started', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bh-replay-manifest-'));
  try {
    const workDir = join(root, '2026-09-28T05-17-01-942Z-2060109', 'work');
    const evidenceDir = join(workDir, 'data/raw/benchmarks/daily-evidence');
    const source = { url: 'https://example.test/ugi.csv' };
    const receipt = (retrieved_at, url = source.url) => ({ status: 200, url, retrieved_at });
    const writeManifest = async (name, entries) => {
      const dir = join(evidenceDir, name);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'manifest.json'), JSON.stringify(entries));
      return join(dir, 'manifest.json');
    };

    await writeManifest('stale', [receipt('2026-09-28T05:16:59Z')]);
    await writeManifest('unrelated', [receipt('2026-09-28T05:20:00Z', 'https://example.test/other.csv')]);
    const earlier = await writeManifest('capture-a', [receipt('2026-09-28T05:20:00Z')]);
    const latest = await writeManifest('capture-b', [receipt('2026-09-28T05:21:00Z')]);

    assert.equal(await replayManifestForRun({ workDir, source, captureKey }), latest);
    assert.notEqual(latest, earlier);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('daily replay refuses a source with only stale or absent receipts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bh-replay-manifest-'));
  try {
    const workDir = join(root, '2026-09-28T05-17-01-942Z-2060109', 'work');
    const dir = join(workDir, 'data/raw/benchmarks/daily-evidence', 'stale');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'manifest.json'), JSON.stringify([
      { status: 200, url: 'https://example.test/ugi.csv', retrieved_at: '2026-09-28T05:16:59Z' },
    ]));

    await assert.rejects(
      replayManifestForRun({ workDir, source: { url: 'https://example.test/ugi.csv' }, captureKey }),
      /no successful capture.*from this daily run/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
