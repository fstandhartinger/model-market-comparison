import test from 'node:test';
import assert from 'node:assert/strict';
import { assertRetainedDate, assertRetainedCache, assertRetainedFieldOmitted, buildLiveEvidence } from '../ops/daily/review-live.mjs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { enrichArtificialAnalysis } from '../lib/aa-metadata.mjs';

test('retained dates cannot claim the current run or a future measurement', () => {
  const start = '2026-01-02T12:00:00Z';
  assert.doesNotThrow(() => assertRetainedDate('2026-01-01T12:00:00Z', start, 'synthetic'));
  for (const date of [null, 'invalid', start, '2026-01-03T12:00:00Z']) assert.throws(() => assertRetainedDate(date, start, 'synthetic'));
});

test('CR-287: captured AA verification rejects a retained value when its source publishes the field again', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-aa-retention-'));
  try {
    const rawDir = join(dir, 'raw');
    const sources = join(dir, 'sources');
    await mkdir(rawDir);
    await mkdir(sources);
    await mkdir(join(dir, 'before', 'raw'), { recursive: true });
    const model = { id: 'uuid', slug: 'fixture-model', name: 'Fixture' };
    const retained = { collected_at: '2026-01-01T00:00:00Z' };
    const metadata = { is_open_weights: true, license_name: 'Old', retained_fields: { license_name: retained } };
    const snapshot = { count: 1, collected_at: retained.collected_at, models: [{ ...model, metadata }] };
    await writeFile(join(dir, 'before', 'raw', 'artificialanalysis.json'), JSON.stringify(snapshot));
    await writeFile(join(rawDir, 'artificialanalysis.json'), JSON.stringify(snapshot));
    // Stop after AA at a deliberate, unrelated DA boundary. Reaching this error
    // proves AA passed without constructing the other six source datasets.
    await writeFile(join(rawDir, 'designarena.json'), '{}');
    async function capture(leaderboard) {
      const records = [
        ['https://artificialanalysis.ai/api/v2/data/llms/models', JSON.stringify({ data: [model] })],
        ['https://artificialanalysis.ai/leaderboards/models', `<script>self.__next_f.push(${JSON.stringify([1, `0:${JSON.stringify(leaderboard)}\n`])})</script>`],
      ];
      const manifest = [];
      for (const [url, body] of records) {
        const sha256 = createHash('sha256').update(body).digest('hex');
        await writeFile(join(sources, `${sha256}.gz`), gzipSync(body));
        manifest.push(JSON.stringify({ url, sha256, file: `${sha256}.gz`, status: 200, fetched_at: '2026-01-02T00:00:00Z' }));
      }
      await writeFile(join(sources, 'live-manifest.jsonl'), manifest.join('\n') + '\n');
    }
    const leaderboard = { slug: model.slug, isOpenWeights: true };
    await capture(leaderboard);
    await assert.rejects(buildLiveEvidence({ runDir: dir, rawDir }), /da staged leaderboards missing/);
    for (const licenseName of ['New', 'Old', null, '']) {
      await capture({ ...leaderboard, licenseName });
      await assert.rejects(buildLiveEvidence({ runDir: dir, rawDir }), /aa uuid metadata\.license_name: currently published by the leaderboard but staged as retained/);
    }
    await writeFile(join(rawDir, 'artificialanalysis.json'), JSON.stringify({ ...snapshot, models: [{ ...model, metadata: { is_open_weights: true, license_name: 'New' } }] }));
    await capture({ ...leaderboard, licenseName: 'New' });
    await assert.rejects(buildLiveEvidence({ runDir: dir, rawDir }), /da staged leaderboards missing/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('retained measured cache requires marker, original date and exact prior values', () => {
  const start = '2026-01-02T12:00:00Z';
  const previous = { summary: 0, provenance: { collected_at: '2026-01-01T12:00:00Z', url: 'https://example.test/fixture' } };
  const kept = { ...previous, retained_after_failure: true };
  assert.doesNotThrow(() => assertRetainedCache(kept, previous, start, true));
  for (const cache of [previous, { retained_after_failure: true }, { ...kept, summary: 0.8 }, { ...kept, provenance: { ...previous.provenance, collected_at: start } }]) assert.throws(() => assertRetainedCache(cache, previous, start, true));
  // A first failed cache request has no retained statistic to misrepresent.
  assert.doesNotThrow(() => assertRetainedCache({ status: 'fetch_or_parse_failed' }, null, start, false));
});

test('CR-285: AA metadata may be retained only while the current leaderboard omits the field', () => {
  assert.doesNotThrow(() => assertRetainedFieldOmitted({ isReasoning: true }, 'licenseName', 'synthetic'));
  assert.doesNotThrow(() => assertRetainedFieldOmitted(undefined, 'licenseName', 'synthetic'));
  for (const value of ['MIT', null]) {
    assert.throws(() => assertRetainedFieldOmitted({ licenseName: value }, 'licenseName', 'synthetic'), /currently published by the leaderboard but staged as retained/);
  }
  // The collector keeps the same rule: a field the leaderboard publishes again is never retained.
  const model = { id: 'synthetic-id', slug: 'synthetic' };
  const previous = { collected_at: '2026-01-01', metadata_endpoint: 'synthetic', models: [{ ...model, metadata: { license_name: 'Old', retained_fields: { license_name: { collected_at: '2025-12-31' } } } }] };
  const enriched = enrichArtificialAnalysis([model], new Map([['synthetic', { licenseName: 'New' }]]), previous).models[0].metadata;
  assert.equal(enriched.license_name, 'New');
  assert.equal(enriched.retained_fields, undefined);
});
