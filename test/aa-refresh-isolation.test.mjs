import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';
import { refreshBenchmarks } from '../ops/daily/refresh-benchmarks.mjs';
import { parseAaBenchmarkFields } from '../lib/aa-benchmark-fields.mjs';
import { loadAaBenchmarkSnapshots } from '../lib/aa-snapshot-locks.mjs';
import { sha256 } from '../ops/daily/gauntlet.mjs';

// Run the real refresh AA arm over a tiny isolated filesystem. Unrelated capture
// and ingest subprocesses are local stubs: no network, no worker or publication.
// This tests that the caller cannot advance a field on protocol approval alone.
for (const rawAccepted of [true, false]) {
  test(`AA refresh isolates a protocol rejection; raw-row acceptance=${rawAccepted}`, async () => {
    const cwd = process.cwd(), dir = await mkdtemp(join(tmpdir(), 'bh-aa-isolation-'));
    const write = async (path, value) => {
      await mkdir(dirname(join(dir, path)), { recursive: true });
      await writeFile(join(dir, path), typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
    };
    const read = async (path) => JSON.parse(await readFile(join(dir, path), 'utf8'));
    try {
      const url = 'https://artificialanalysis.ai/models/fixture', protocolUrl = 'https://artificialanalysis.ai/methodology/fixture';
      const flight = (gpqa, hle) => `<script>self.__next_f.push(${JSON.stringify([1, `a:${JSON.stringify([{ id: '00000000-0000-4000-8000-000000000001', slug: 'fixture', name: 'Fixture', effort: { slug: 'high' }, intelligenceIndex: 40, gpqa, hle }])}\n`])})</script>`;
      const oldHtml = flight(.1, .2), newHtml = flight(.3, .4);
      const old = parseAaBenchmarkFields(oldHtml, { source_url: url, collected_at: '2026-09-10', source_sha256: sha256(oldHtml), minimumRows: 1 });
      const oldBytes = JSON.stringify(old);
      const mappings = [{ benchmark_id: 'aa-refused::1', field: 'gpqa' }, { benchmark_id: 'aa-accepted::1', field: 'hle' }];
      const entries = mappings.map((m) => ({ id: m.benchmark_id, name: m.benchmark_id, primary_url: url, version: '1', version_status: 'published', status: 'active',
        scoring: { metric: 'fixture', unit: 'fraction', range: [0, 1] }, how_to_collect: { version_guard: 'Published fixture version 1' }, evidence: [{ url: protocolUrl }] }));
      const root = 'data/raw/benchmarks';
      await write(`${root}/registry.json`, { entries, aa_field_map: mappings });
      await write(`${root}/collection-plan.json`, { entries: [] });
      await write(`${root}/public-observations.json`, { observations: [] });
      await write(`${root}/vendor-candidates.json`, { observations: [] });
      await write(`${root}/score-approvals.json`, { rows: [] });
      await write(`${root}/aa-observed-fields.json`, oldBytes);
      const oldLock = { source_sha256: old.source_sha256, observations_sha256: sha256(oldBytes), source_file: 'evidence/old.gz', protocol_review: 'evidence/original-approval.json' };
      await write(`${root}/ingestion-lock.json`, { aa: oldLock, coding: {} });
      await write('evidence/old.gz', gzipSync(oldHtml));
      const protocolText = 'Both synthetic fixture protocols version 1 use exact fractions. No external claims.';
      await write('run/sources/new.gz', gzipSync(newHtml));
      await write('run/sources/protocol.gz', gzipSync(protocolText));
      await write('run/sources/live-manifest.jsonl', [
        { url, status: 200, sha256: sha256(newHtml), file: join(dir, 'run/sources/new.gz'), retrieved_at: '2026-09-29T05:17:00Z' },
        { url: protocolUrl, status: 200, sha256: sha256(protocolText), file: join(dir, 'run/sources/protocol.gz'), retrieved_at: '2026-09-29T05:17:00Z' },
      ].map(JSON.stringify).join('\n'));
      await write('run/reports/live-step-result.json', { ok: true, gauntlet: { complete: true } });
      await write('data/raw/aa-coding-agents-v1.5.json', { version: '1.5', rows: [{ complete: true }] });
      await write('scripts/capture-benchmark-sources.py', 'import sys,json,pathlib\nassert json.load(open(sys.argv[1])) == []\npathlib.Path(sys.argv[2],"manifest.json").write_text("[]")\n');
      await write('ops/daily/public-candidate.py', 'import sys,gzip\nprint(gzip.open(sys.argv[2],"rt").read())\n');
      await write('scripts/ingest-benchmark-scores.mjs', 'import {writeFile} from "node:fs/promises"; const i=process.argv.indexOf("--out"); if(i>=0) await writeFile(process.argv[i+1],JSON.stringify({observations:[]}));');
      await write('scripts/build-benchmark-history.mjs', 'console.log(JSON.stringify({written:false,state_id:"fixture",count:0}));');
      process.chdir(dir);
      const calls = [];
      let acceptRefused = false;
      const options = { runDir: join(dir, 'run'), concurrency: 1,
        review: async ({ artifactId, rows }) => {
          calls.push(artifactId);
          const accepted = (acceptRefused || artifactId !== 'protocol-aa-refused::1') && (rawAccepted || !artifactId.startsWith('aa-fields-'));
          return { accepted, fingerprints: accepted ? rows.map((r) => ({ id: r.id })) : [],
            errors: accepted ? [] : ['fixture rejection'], manifest: { artifact_id: artifactId } };
        } };
      const report = await refreshBenchmarks(options);
      assert.ok(calls.includes('protocol-aa-refused::1'));
      assert.ok(calls.includes('protocol-aa-accepted::1'), 'neighbour reviewed after refusal');
      assert.ok(calls.includes('aa-fields-0'), 'raw numeric gate still runs');
      const actual = await read(`${root}/aa-observed-fields.json`), lock = (await read(`${root}/ingestion-lock.json`)).aa;
      if (rawAccepted) {
        const views = await loadAaBenchmarkSnapshots({ snapshot: actual, lock, mappings });
        assert.equal(views.get('aa-refused::1').snapshot.rows[0].fields.gpqa, .1);
        assert.equal(views.get('aa-refused::1').snapshot.collected_at, '2026-09-10');
        assert.equal(views.get('aa-refused::1').lock.protocol_review, oldLock.protocol_review);
        assert.equal(views.get('aa-refused::1').lock.source_file, oldLock.source_file);
        assert.equal(views.get('aa-accepted::1').snapshot.rows[0].fields.hle, .4);
        assert.equal(views.get('aa-accepted::1').snapshot.collected_at, '2026-09-29T05:17:00Z');
        assert.equal(report.checks.find((c) => c.id === 'aa-refused::1' && c.collector).status, 'retained_after_failure');
        assert.equal(report.checks.find((c) => c.id === 'aa-accepted::1' && c.collector).status, 'updated');
        // The next run's raw rows are unchanged. A repeated refusal must still
        // be reviewed and retain the original Sep10 lock, not the Sep29 default.
        calls.length = 0;
        await refreshBenchmarks(options);
        assert.deepEqual(calls, ['protocol-aa-refused::1']);
        const repeated = (await read(`${root}/ingestion-lock.json`)).aa;
        assert.equal(repeated.retained_benchmarks['aa-refused::1'].observations_sha256, oldLock.observations_sha256);
        // Only an explicit protocol success releases that older lock. Numeric
        // rows were already accepted in the first run and need no invented date.
        acceptRefused = true; calls.length = 0;
        await refreshBenchmarks(options);
        assert.deepEqual(calls, ['protocol-aa-refused::1']);
        const released = (await read(`${root}/ingestion-lock.json`)).aa;
        assert.deepEqual(released.retained_benchmarks, {});
        assert.equal(released.observations_sha256, repeated.observations_sha256);
      } else {
        assert.deepEqual(actual, old);
        assert.deepEqual(lock, oldLock);
        assert.equal(report.checks.filter((c) => c.collector === 'aa-benchmark-fields').length, 0);
        assert.equal(report.checks.find((c) => c.id === 'aa-benchmark-fields').status, 'retained_after_failure');
      }
    } finally { process.chdir(cwd); await rm(dir, { recursive: true, force: true }); }
  });
}
