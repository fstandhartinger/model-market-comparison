#!/usr/bin/env node
// A daily refresh is a transaction: only a fully checked staging commit can publish.
import { execFile } from 'node:child_process';
import { promisify, isDeepStrictEqual } from 'node:util';
import { cp, mkdir, readFile, writeFile, appendFile, stat, symlink, rm, readdir } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { writeJSONAtomic } from '../../lib/snapshot.mjs';
import { COMMIT_TRAILER, assessCommitScope, parseStatusPorcelain, selectProducerCritic } from './policy.mjs';
import { executeNotifications } from './notify.mjs';
import { compactPublishedRun } from './compact-run.mjs';
const exec = promisify(execFile);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const readJSON = async (path) => JSON.parse(await readFile(path, 'utf8'));
const redact = (value) => {
  let result = String(value);
  for (const [key, secret] of Object.entries(process.env)) if (/KEY|TOKEN|SECRET|PASSWORD/.test(key) && secret?.length > 7) result = result.split(secret).join('[REDACTED]');
  return result;
};
const slim = (ds) => ds && ({ models: ds.models.map((m) => ({ id: m.id, family_key: m.family_key, family_name: m.family_name, display_name: m.display_name, benchmarks: { aa_intelligence_index: m.benchmarks?.aa_intelligence_index } })), benchmark_results: { divergences: ds.benchmark_results?.divergences || [] } });

export function matchesPublishedSnapshot(published, expected) {
  if (!published || typeof published !== 'object' || Array.isArray(published)) return false;
  const { _source, ...snapshot } = published;
  return ['bundled', 'postgres'].includes(_source) && isDeepStrictEqual(snapshot, expected);
}

export async function linkDryRunDependencies(repo, work) {
  await symlink(join(repo, 'node_modules'), join(work, 'node_modules'), 'dir');
  // The repository's node_modules/ pattern ignores directories, not symlinks.
  // Keep this dry-run convenience local to the disposable clone's Git excludes.
  await appendFile(join(work, '.git/info/exclude'), '\n/node_modules\n');
}

export async function runDaily({ repo = ROOT, home = '/opt/benchmarkheaven-daily', runDir, dryRun = false } = {}) {
  repo = resolve(repo); home = resolve(home);
  const started = new Date().toISOString(), day = started.slice(0, 10);
  runDir = resolve(runDir || join(home, 'runs', `${started.replace(/[:.]/g, '-')}-${process.pid}`));
  const work = join(runDir, 'work'), reports = join(runDir, 'reports');
  await mkdir(reports, { recursive: true });
  await mkdir(join(runDir, 'sources'), { recursive: true });
  await mkdir(home, { recursive: true });
  const report = { started_at: started, run_dir: runDir, dry_run: dryRun, steps: [], published: false, exit_code: 1 };
  let before, after, top5 = null;
  const environment = { ...process.env, BH_EVIDENCE_DIR: join(runDir, 'sources'), BH_STATE: join(runDir, 'workers'), BH_WORKER_MAX_PRICE_PER_1M: '4', BH_WORKER_REASONING_EFFORT: 'low', BH_WORKER_DISABLE_OPTIONAL_REASONING: '0' };
  for (const key of ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_API_BASE', 'CODEX_API_KEY']) delete environment[key];
  const command = async (name, file, args, cwd = work, timeout = 600_000) => {
    const begin = Date.now();
    try {
      const { stdout, stderr } = await exec(file, args, { cwd, env: environment, timeout, killSignal: 'SIGTERM', maxBuffer: 32_000_000 });
      await writeFile(join(reports, `${name.replace(/[^a-z0-9-]/gi, '-')}.log`), redact(stdout + stderr));
      report.steps.push({ name, ok: true, duration_ms: Date.now() - begin });
      console.log(`OK ${name}`);
      return stdout.trimEnd();
    } catch (error) {
      const detail = redact([error.stdout, error.stderr, error.message].filter(Boolean).join('\n'));
      await writeFile(join(reports, `${name.replace(/[^a-z0-9-]/gi, '-')}.log`), detail);
      report.steps.push({ name, ok: false, duration_ms: Date.now() - begin, error: detail.slice(-3000) });
      throw new Error(`${name} FAILED: ${detail.slice(-1800)}`);
    }
  };
  const git = (name, args, cwd = repo) => command(name, 'git', args, cwd, 120_000);
  const status = async (name, cwd) => parseStatusPorcelain(await git(name, ['status', '--porcelain=v1', '--untracked-files=all'], cwd));
  console.log(`Benchmark Heaven daily ${started}: ${runDir}${dryRun ? ' (dry run)' : ''}`);
  try {
    if (await git('branch', ['branch', '--show-current']) !== 'main') throw new Error('Daily publication requires the main checkout');
    const dirty = await status('initial-status', repo);
    if (!dryRun && dirty.length) throw new Error('Daily publication requires a clean checkout; owner changes were preserved');
    await git('fetch-main', ['fetch', 'origin', 'main']);
    if (!dryRun) await git('sync-main', ['merge', '--ff-only', 'origin/main']);
    const base = await git('base', ['rev-parse', 'HEAD']);
    const remote = await git('remote-base', ['rev-parse', 'origin/main']);
    if (!dryRun && base !== remote) throw new Error('Local main has unpublished commits; refusing to include them in a daily push');
    report.base = base;
    before = await readJSON(join(repo, 'data/dataset.json'));
    await writeJSONAtomic(join(reports, 'dataset-before.json'), before);
    await command('clone', 'git', ['clone', '--no-hardlinks', repo, work], repo, 120_000);
    await git('detach-stage', ['checkout', '--detach', base], work);
    const overlayHashes = new Map();
    if (dryRun) {
      for (const entry of dirty) {
        const target = resolve(work, entry.path);
        if (!target.startsWith(work + sep)) throw new Error('Unsafe dry-run overlay path');
        if (entry.code.includes('D')) { await rm(target, { recursive: true, force: true }); overlayHashes.set(entry.path, null); continue; }
        await mkdir(dirname(target), { recursive: true });
        await cp(join(repo, entry.path), target, { recursive: true });
        if ((await stat(target)).isFile()) overlayHashes.set(entry.path, hash(await readFile(target)));
      }
      await linkDryRunDependencies(repo, work);
    } else await command('npm-ci', 'npm', ['ci', '--no-audit', '--no-fund'], work, 900_000);
    await cp(join(work, 'data/raw'), join(runDir, 'before/raw'), { recursive: true });
    const legacy = hash(await readFile(join(work, 'data/raw/aa-coding-agents.json')));
    const catalog = JSON.parse(await command('worker-catalog', process.execPath, ['ops/rebuild-2026-09/bin/pick-worker-models.mjs', '--json']));
    report.workers = selectProducerCritic(catalog);
    await writeJSONAtomic(join(reports, 'worker-catalog.json'), catalog);
    await writeJSONAtomic(join(reports, 'workers.json'), report.workers);
    for (const source of ['aa', 'da', 'or']) await command(`fetch-${source}`, process.execPath, ['scripts/fetch-live.mjs', source], work, 1_800_000);
    await command('fetch-coding-v1.5', process.execPath, ['scripts/fetch-aa-coding-agents.mjs']);
    await command('review-live', process.execPath, ['ops/daily/phase-step.mjs', 'live', runDir], work, 3_600_000);
    await command('refresh-benchmarks', process.execPath, ['ops/daily/phase-step.mjs', 'benchmarks', runDir], work, 3_600_000);
    if (hash(await readFile(join(work, 'data/raw/aa-coding-agents.json'))) !== legacy) throw new Error('Legacy Coding Agent v1.4 changed: refusing publication');
    await command('build-dataset', process.execPath, ['scripts/build-dataset.mjs']);
    await command('npm-build', 'npm', ['run', 'build'], work, 1_200_000);
    await command('npm-test', 'npm', ['test'], work, 900_000);
    await command('typecheck', 'npx', ['tsc', '--noEmit', '-p', '.']);
    await command('prerender', process.execPath, ['--test', 'test/production/prerender.mjs']);
    after = await readJSON(join(work, 'data/dataset.json'));
    for (const key of ['artificialanalysis', 'designarena', 'openrouter', 'aa_coding_agents_v1_5', 'aa_efficiency', 'openrouter_efficiency', 'chutes_efficiency']) {
      if (after.sources[key]?.slice(0, 10) !== day) throw new Error(`Source ${key} is not today's collector run (${after.sources[key]})`);
    }
    top5 = JSON.parse(await command('top5', process.execPath, ['scripts/top5.mjs', '5']));
    await writeJSONAtomic(join(reports, 'dataset-after.json'), after);
    const changed = [];
    for (const entry of await status('stage-status', work)) {
      if (dryRun && overlayHashes.has(entry.path) && !entry.path.startsWith('data/')) {
        const current = await readFile(join(work, entry.path)).then(hash).catch((e) => { if (e.code === 'ENOENT') return null; throw e; });
        if (current === overlayHashes.get(entry.path)) continue;
      }
      changed.push(entry.path);
    }
    const extra = await readJSON(join(reports, 'commit-paths.json')).catch((e) => { if (e.code === 'ENOENT') return {}; throw e; });
    const scope = assessCommitScope(changed, extra.extra_allowed || []);
    if (!scope.ok) throw new Error(`Daily commit scope rejected: ${scope.rejected.join(', ')}`);
    report.changed_paths = scope.allowed;
    if (!dryRun && scope.allowed.length) {
      await git('stage-data', ['add', '--', ...scope.allowed], work);
      const userName = await git('git-name', ['config', 'user.name']);
      const userEmail = await git('git-email', ['config', 'user.email']);
      await git('commit-data', ['-c', `user.name=${userName}`, '-c', `user.email=${userEmail}`, 'commit', '-m', `Refresh Benchmark Heaven data ${day}\n\nSource-backed daily gauntlet and build/tests/typecheck passed.\n\n${COMMIT_TRAILER}`], work);
      const sha = await git('candidate-commit', ['rev-parse', 'HEAD'], work);
      if (await git('recheck-head', ['rev-parse', 'HEAD']) !== base || (await status('recheck-status', repo)).length) throw new Error('Main changed during collection; candidate remains isolated');
      const remoteUrl = await git('remote-url', ['remote', 'get-url', 'origin']);
      // Push from staging first: a rejected push leaves the primary checkout untouched.
      await git('push-data', ['push', remoteUrl, 'HEAD:refs/heads/main'], work);
      report.published = true; report.commit = sha;
      if (await git('post-push-head', ['rev-parse', 'HEAD']) !== base || (await status('post-push-status', repo)).length) throw new Error('Main changed after push; published revision is green, local edits were preserved');
      await git('fetch-published', ['fetch', 'origin', 'main']);
      await git('install-published', ['merge', '--ff-only', sha]);
      const deadline = Date.now() + 600_000;
      let last = '';
      const pending = new Set(['benchmarkheaven.com', 'model-market-comparison.app.mintapis.com']);
      while (pending.size && Date.now() < deadline) {
        for (const host of pending) {
          try {
            const response = await fetch(`https://${host}/api/dataset?t=${Date.now()}`, { signal: AbortSignal.timeout(20_000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const published = await response.json();
            if (matchesPublishedSnapshot(published, after)) pending.delete(host);
            else last = `${host}: snapshot mismatch`;
          } catch (error) { last = error.message; }
        }
        if (pending.size) await new Promise((done) => setTimeout(done, 20_000));
      }
      if (pending.size) throw new Error(`Webhook deploy verification failed (${last}); no duplicate deployment queued`);
      report.live_verified = true;
    }
    report.exit_code = 0;
  } catch (error) { report.error = redact(error.message); console.error(`DAILY FAILED: ${report.error}`); }
  report.finished_at = new Date().toISOString();
  const workerFiles = await readdir(join(runDir, 'workers')).catch((e) => { if (e.code === 'ENOENT') return []; throw e; });
  const calls = [];
  for (const file of workerFiles.filter((f) => /^worker(?:-failure)?-.*\.json$/.test(f))) {
    const receipt = await readJSON(join(runDir, 'workers', file));
    calls.push({ receipt: file, role: receipt.mode, actual_model: receipt.actual_model ?? null,
      requested_model: receipt.requested_model, status: receipt.status ?? 'complete',
      returned_cost_usd: Number.isFinite(receipt.usage?.cost) ? receipt.usage.cost : null, reasoning: receipt.reasoning });
  }
  report.worker_calls = { calls, returned_cost_usd: calls.reduce((sum, r) => sum + (r.returned_cost_usd ?? 0), 0),
    calls_without_returned_cost: calls.filter((r) => r.returned_cost_usd === null).length,
    note: 'Sum of returned charges only, including charged failed completions where reported. Missing charges and owner subscription usage are not estimated.' };
  await writeJSONAtomic(join(reports, 'worker-calls.json'), report.worker_calls);
  if (after) report.dataset_sha256 = hash(await readFile(join(work, 'data/dataset.json')));
  try { report.storage = await compactPublishedRun({ runDir, published: report.published, liveVerified: report.live_verified, dryRun }); }
  catch (error) { report.storage = { applied: false, error: redact(error.message) }; console.error(`DAILY STORAGE CLEANUP FAILED: ${report.storage.error}`); }
  const summary = [
    `STATUS: ${report.exit_code === 0 ? 'ok' : 'problem'}`,
    `Benchmark Heaven ${day}${dryRun ? ' — vollstaendiger Testlauf ohne Push/Telegram' : ''}`,
    `Lauf: ${runDir}`,
    report.workers ? `Erste Auswahl: ${report.workers.producer.id}; Kritiker: ${report.workers.critic.id}` : 'Worker-Auswahl nicht abgeschlossen.',
    `Modelle mit Abschluss: ${[...new Set(calls.filter((r) => r.status === 'complete').map((r) => r.actual_model))].filter(Boolean).join(', ') || 'keine'}; gemeldete Kosten: $${report.worker_calls.returned_cost_usd.toFixed(4)} (${report.worker_calls.calls_without_returned_cost} Aufrufe ohne Kostenangabe).`,
    `Schritte: ${report.steps.filter((s) => s.ok).length} erfolgreich; ${report.steps.filter((s) => !s.ok).length} fehlgeschlagen.`,
    `Publikation: ${report.published ? report.commit : dryRun ? 'Testlauf' : 'keine'}; Live-Pruefung: ${report.live_verified ? 'OK' : 'nicht erfolgt'}.`,
    report.error ? `FEHLER: ${report.error.split('\n').filter(Boolean).at(-1).slice(0, 800)}` : 'Build, Tests, Typpruefung und Quellpruefung erfolgreich.',
  ].join('\n') + '\n';
  await writeFile(join(home, 'last-summary.txt'), summary);
  await writeFile(join(reports, 'summary.txt'), summary);
  await writeJSONAtomic(join(reports, 'run-report.json'), report);
  const context = { status_ok: report.exit_code === 0, rc: report.exit_code, top5: top5 ? { current: top5 } : null, datasets: { before: slim(before), after: slim(after) } };
  await writeJSONAtomic(join(reports, 'notify-context.json'), context);
  await executeNotifications({ context, stateDir: join(home, 'state'), dryRun }).catch((e) => console.error(`NOTIFICATION FAILED: ${redact(e.message)}`));
  console.log(summary);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2), option = (key) => { const index = argv.indexOf(key); if (index < 0) return undefined; if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`Missing ${key} value`); return argv[index + 1]; };
  runDaily({ repo: option('--repo'), home: option('--home'), runDir: option('--run-dir'), dryRun: argv.includes('--dry-run') })
    .then((result) => { process.exitCode = result.exit_code; }).catch((error) => { console.error(`DAILY FATAL: ${redact(error.message)}`); process.exitCode = 1; });
}
