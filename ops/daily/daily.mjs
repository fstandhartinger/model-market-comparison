#!/usr/bin/env node
// A daily refresh is a transaction: only a fully checked staging commit can publish.
import { execFile } from 'node:child_process';
import { promisify, isDeepStrictEqual } from 'node:util';
import { cp, mkdir, readFile, writeFile, appendFile, stat, symlink, rm, readdir } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { writeJSONAtomic } from '../../lib/snapshot.mjs';
import { COMMIT_TRAILER, assessCommitScope, parseScope, parseStatusPorcelain, pricesScopeViolations, selectProducerCritic, sourceFreshnessErrors } from './policy.mjs';
import { executeNotifications } from './notify.mjs';
import { compactPublishedRun } from './compact-run.mjs';
import { GATE_TIMEOUT_MS, gatedPublish } from './publish-gate.mjs';
import { staleSources, updateCollectorHealth } from './source-health.mjs';
import { profileRunDir } from './profile-run.mjs';
import { dailyConcurrency } from './concurrency.mjs';
const exec = promisify(execFile);
// How long publication waits for the other writer's checkout to become clean before it gives up for the day.
// Overridable for tests; the shell entry point allows 3 h in total, so 30 min is affordable.
const CLEAN_CHECKOUT_WAIT_MS = Number(process.env.BH_CLEAN_CHECKOUT_WAIT_MS ?? 30 * 60_000);
const CLEAN_CHECKOUT_POLL_MS = Number(process.env.BH_CLEAN_CHECKOUT_POLL_MS ?? 60_000);
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

export const ISOLATED_STEP_UNSET = ['BH_EVIDENCE_DIR', 'BH_STATE'];
export function isolatedStepEnvironment(environment) {
  const env = { ...environment };
  for (const key of ISOLATED_STEP_UNSET) delete env[key];
  return env;
}

export async function runDaily({ repo = ROOT, home = '/opt/benchmarkheaven-daily', runDir, dryRun = false, scope = 'full' } = {}) {
  repo = resolve(repo); home = resolve(home);
  // CR-66.7: `prices` refreshes OpenRouter and the provider catalogs only (see policy.mjs).
  scope = parseScope(scope);
  const full = scope === 'full';
  const started = new Date().toISOString(), day = started.slice(0, 10);
  runDir = resolve(runDir || join(home, 'runs', `${started.replace(/[:.]/g, '-')}-${process.pid}`));
  const work = join(runDir, 'work'), reports = join(runDir, 'reports');
  await mkdir(reports, { recursive: true });
  await mkdir(join(runDir, 'sources'), { recursive: true });
  await mkdir(home, { recursive: true });
  const report = { started_at: started, run_dir: runDir, dry_run: dryRun, scope, steps: [], published: false, exit_code: 1 };
  let before, after, top5 = null;
  const environment = { ...process.env, BH_EVIDENCE_DIR: join(runDir, 'sources'), BH_STATE: join(runDir, 'workers'), BH_WORKER_MAX_PRICE_PER_1M: '4', BH_WORKER_REASONING_EFFORT: 'low', BH_WORKER_DISABLE_OPTIONAL_REASONING: '0', BH_WORKER_FREE_ROUTER: '1' };
  for (const key of ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_API_BASE', 'CODEX_API_KEY']) delete environment[key];
  const command = async (name, file, args, cwd = work, timeout = 600_000, env = environment) => {
    const begin = Date.now();
    try {
      const { stdout, stderr } = await exec(file, args, { cwd, env, timeout, killSignal: 'SIGTERM', maxBuffer: 32_000_000 });
      await writeFile(join(reports, `${name.replace(/[^a-z0-9-]/gi, '-')}.log`), redact(stdout + stderr));
      report.steps.push({ name, ok: true, duration_ms: Date.now() - begin, started_at: new Date(begin).toISOString(), finished_at: new Date().toISOString() });
      console.log(`OK ${name}`);
      return stdout.trimEnd();
    } catch (error) {
      const detail = redact([error.stdout, error.stderr, error.message].filter(Boolean).join('\n'));
      await writeFile(join(reports, `${name.replace(/[^a-z0-9-]/gi, '-')}.log`), detail);
      report.steps.push({ name, ok: false, duration_ms: Date.now() - begin, started_at: new Date(begin).toISOString(), finished_at: new Date().toISOString(), error: detail.slice(-3000) });
      throw new Error(`${name} FAILED: ${detail.slice(-1800)}`);
    }
  };
  // Hooks reuse the explicit gate result, but a hook that must re-run a stage needs the gate's timeout.
  const git = (name, args, cwd = repo) => command(name, 'git', args, cwd, ['commit-data', 'push-data'].includes(name) ? GATE_TIMEOUT_MS : 120_000);
  // CR-66.4: build, tests, typecheck, prerender and the gate must not write into this run's production
  // evidence (tests used to append /fixture/ captures to sources/live-manifest.jsonl).
  const isolatedEnvironment = isolatedStepEnvironment(environment);
  const status = async (name, cwd) => parseStatusPorcelain(await git(name, ['status', '--porcelain=v1', '--untracked-files=all'], cwd));
  console.log(`Benchmark Heaven daily ${started}: ${runDir}${dryRun ? ' (dry run)' : ''}${full ? '' : ` (scope ${scope})`}`);
  try {
    if (await git('branch', ['branch', '--show-current']) !== 'main') throw new Error('Daily publication requires the main checkout');
    // 2026-09-16: publication needs a clean checkout, but the UX workstream writes to this repo all day
    // and its cron ticks every 10 minutes, so "dirty at 05:17" used to cost the whole day's refresh — the
    // scheduled runs of 15 and 16 Sep both died here. Wait for the other writer instead of giving up: the
    // gate is unchanged and still fail-closed, it just gets a bounded window.
    let dirty = await status('initial-status', repo);
    if (!dryRun && dirty.length) {
      const deadline = Date.now() + CLEAN_CHECKOUT_WAIT_MS;
      for (let attempt = 1; dirty.length && Date.now() < deadline; attempt++) {
        console.log(`WAIT initial-status: ${dirty.length} uncommitted path(s); another writer owns the repo. Retrying in ${Math.round(CLEAN_CHECKOUT_POLL_MS / 1000)}s.`);
        await new Promise((r) => setTimeout(r, CLEAN_CHECKOUT_POLL_MS));
        dirty = await status(`initial-status-retry-${attempt}`, repo);
      }
      if (dirty.length) throw new Error(`Daily publication requires a clean checkout; owner changes were preserved (still dirty after ${Math.round(CLEAN_CHECKOUT_WAIT_MS / 60000)} min: ${dirty.slice(0, 5).map((e) => e.path).join(', ')})`);
      console.log('OK initial-status cleared while waiting');
    }
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
    // Workers only review benchmark sources; a prices run has none to review (the publish gate checks the offers).
    if (full) {
      const catalog = JSON.parse(await command('worker-catalog', process.execPath, ['ops/rebuild-2026-09/bin/pick-worker-models.mjs', '--json']));
      report.workers = selectProducerCritic(catalog);
      await writeJSONAtomic(join(reports, 'worker-catalog.json'), catalog);
      await writeJSONAtomic(join(reports, 'workers.json'), report.workers);
    }
    for (const source of full ? ['aa', 'da', 'or'] : ['or-prices']) await command(`fetch-${source.replace('-prices', '')}`, process.execPath, ['scripts/fetch-live.mjs', source], work, 1_800_000);
    // CR-66.1: bounded OpenRouter withdrawals publish; the run report names every one with its date.
    report.openrouter_withdrawals = (await readJSON(join(work, 'data/raw/openrouter.json'))).withdrawal_run ?? null;
    if (full) {
      await command('fetch-coding-v1.5', process.execPath, ['scripts/fetch-aa-coding-agents.mjs']);
      await command('fetch-epoch-eci', process.execPath, ['scripts/fetch-epoch-eci.mjs']);
      // CR-35.5: rebuild the Epoch hub-provenance sidecar from the newest captured metadata CSV
      // (non-fatal — provenance only, never blocks publication).
      try {
        await command('build-epoch-provenance', process.execPath, ['scripts/build-epoch-provenance.mjs']);
      } catch (error) {
        report.warnings = report.warnings || [];
        report.warnings.push(`build-epoch-provenance skipped: ${error.message.slice(0, 300)}`);
        console.warn(`WARN build-epoch-provenance: keeping the previous snapshot`);
      }
    }
    // R4.10: refresh the OpenRouter provider data-policy table daily. Deliberately
    // non-fatal: it drives one filter, and the collector hard-fails on any layout change
    // it cannot verify against the page's own counts. Aborting the whole price and
    // benchmark publication because a secondary table moved would be the worse outcome —
    // the previous snapshot stays in place and its date is visible in `sources`.
    try {
      await command('fetch-data-policy', process.execPath, ['scripts/fetch-openrouter-data-policy.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-data-policy skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-data-policy: keeping the previous snapshot`);
    }
    if (full) {
      // CR-34.1: OpenRouter Benchmarks API (raw capture; non-fatal — a key or terms change must
      // never block the price/benchmark publication; the previous snapshot stays).
      try {
        await command('fetch-openrouter-benchmarks', process.execPath, ['scripts/fetch-openrouter-benchmarks.mjs']);
      } catch (error) {
        report.warnings = report.warnings || [];
        report.warnings.push(`fetch-openrouter-benchmarks skipped: ${error.message.slice(0, 300)}`);
        console.warn(`WARN fetch-openrouter-benchmarks: keeping the previous snapshot`);
      }
      // CR-37.2: Lumina Bench ledger as a discovery/provenance feed (no values). Non-fatal: a manifest change
      // that needs a decision keeps the previous snapshot and writes a pending-review candidate.
      try {
        await command('fetch-lumina-ledger', process.execPath, ['scripts/fetch-lumina-ledger.mjs']);
      } catch (error) {
        report.warnings = report.warnings || [];
        report.warnings.push(`fetch-lumina-ledger: ${error.message.slice(0, 300)}`);
        console.warn(`WARN fetch-lumina-ledger: keeping the previous snapshot`);
      }
    }
    // R9.1: provider-meta is hand-curated; its date comes from a cross-check of `country` against the table
    // just fetched (dated by that table). New disagreements exit non-zero → a warning, curated values stay.
    try {
      await command('check-provider-meta', process.execPath, ['scripts/check-provider-meta.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`check-provider-meta: ${error.message.slice(0, 300)}`);
      console.warn(`WARN check-provider-meta: see the step log`);
    }
    // R9.1: curated provider catalogs get executable collectors one by one. Non-fatal for the
    // same reason as the data policy: the collector fails closed and the old date stays visible.
    try {
      await command('fetch-chutes-catalog', process.execPath, ['scripts/fetch-chutes-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-chutes-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-chutes-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-nebius-catalog', process.execPath, ['scripts/fetch-nebius-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-nebius-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-nebius-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-mistral-catalog', process.execPath, ['scripts/fetch-mistral-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-mistral-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-mistral-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-scaleway-catalog', process.execPath, ['scripts/fetch-scaleway-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-scaleway-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-scaleway-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-tensorx-catalog', process.execPath, ['scripts/fetch-tensorx-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-tensorx-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-tensorx-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-t-systems-catalog', process.execPath, ['scripts/fetch-t-systems-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-t-systems-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-t-systems-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-trustedtokens-catalog', process.execPath, ['scripts/fetch-trustedtokens-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-trustedtokens-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-trustedtokens-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-ovhcloud-catalog', process.execPath, ['scripts/fetch-ovhcloud-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-ovhcloud-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-ovhcloud-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-ionos-catalog', process.execPath, ['scripts/fetch-ionos-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-ionos-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-ionos-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-stackit-catalog', process.execPath, ['scripts/fetch-stackit-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-stackit-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-stackit-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-inceptron-catalog', process.execPath, ['scripts/fetch-inceptron-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-inceptron-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-inceptron-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-azure-foundry-catalog', process.execPath, ['scripts/fetch-azure-foundry-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-azure-foundry-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-azure-foundry-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-aws-bedrock-catalog', process.execPath, ['scripts/fetch-aws-bedrock-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-aws-bedrock-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-aws-bedrock-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-google-vertex-catalog', process.execPath, ['scripts/fetch-google-vertex-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-google-vertex-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-google-vertex-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-claude-api-catalog', process.execPath, ['scripts/fetch-claude-api-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-claude-api-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-claude-api-catalog: keeping the previous snapshot`);
    }
    try {
      await command('fetch-github-copilot-catalog', process.execPath, ['scripts/fetch-github-copilot-catalog.mjs']);
    } catch (error) {
      report.warnings = report.warnings || [];
      report.warnings.push(`fetch-github-copilot-catalog skipped: ${error.message.slice(0, 300)}`);
      console.warn(`WARN fetch-github-copilot-catalog: keeping the previous snapshot`);
    }
    // 17 Sep: 100 min, not 60. Normal runs take 9–18 min; with a slow paid producer and the only eligible
    // different-family critic timing out (dry run 17 Sep 01:21, killed at 60 min in the last of 7 contracts), the
    // bounded retries need longer. The 3 h run cap still holds; CR-66.3 (free worker chain) is the real fix.
    if (full) {
      await command('review-live', process.execPath, ['ops/daily/phase-step.mjs', 'live', runDir], work, 6_000_000);
      // Same reason, same bound: on 17 Sep each paid producer call took 2–5 min (1 min on 16 Sep) and this step ran past 45 min.
      // 140 min (was 100): the free max-effort critic needs 100–270 s per review; the 06:07 run of 17 Sep was killed at
      // 100 min. Live review (~25 min) + this + build/gate/publish (~5 min) still fits gated-run's 3 h limit.
      await command('refresh-benchmarks', process.execPath, ['ops/daily/phase-step.mjs', 'benchmarks', runDir], work, 8_400_000);
    }
    if (hash(await readFile(join(work, 'data/raw/aa-coding-agents.json'))) !== legacy) throw new Error('Legacy Coding Agent v1.4 changed: refusing publication');
    await command('build-dataset', process.execPath, ['scripts/build-dataset.mjs']);
    await command('npm-build', 'npm', ['run', 'build'], work, 1_200_000, isolatedEnvironment);
    await command('npm-test', 'npm', ['test'], work, 900_000, isolatedEnvironment);
    await command('typecheck', 'npx', ['tsc', '--noEmit', '-p', '.'], work, 600_000, isolatedEnvironment);
    await command('prerender', process.execPath, ['--test', 'test/production/prerender.mjs'], work, 600_000, isolatedEnvironment);
    after = await readJSON(join(work, 'data/dataset.json'));
    // CR-67.2: a withheld live contract (prior snapshot kept) is named in the report and keeps its published date.
    const live = await readJSON(join(reports, 'live-step-result.json')).catch(() => null);
    report.retained_contracts = live?.gauntlet?.retained_contracts ?? [];
    report.deterministic_fallback_contracts = live?.gauntlet?.deterministic_fallback_contracts ?? [];
    report.unverified_providers = (after.providers ?? []).filter((p) => p.metadata_unverified).map((p) => p.provider);
    // Plain notices for the daily digest (gate.mjs finalize appends them): what published in a degraded but honest way.
    report.notices = [
      ...report.unverified_providers.map((p) => `New provider "${p}" published without verified metadata (not in EU/non-US filters) — add it to data/raw/provider-meta.json`),
      ...report.retained_contracts.map((r) => `${r.dataset}: today's capture withheld after a review dispute; previous snapshot kept with its date`),
      ...report.deterministic_fallback_contracts.map((r) => `${r.dataset}: reviewer models gave no usable answer; accepted on the full-row source verification`),
    ];
    const stale = sourceFreshnessErrors({ scope: report.scope, day, before, after, retained: report.retained_contracts.map((r) => r.source) }); // `scope` is the commit scope below
    if (stale.length) throw new Error(stale.join('; '));
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
    const outsidePrices = full ? [] : pricesScopeViolations(scope.allowed);
    if (outsidePrices.length) throw new Error(`Prices-only run changed benchmark or efficiency sources: ${outsidePrices.slice(0, 10).join(', ')}`);
    report.changed_paths = scope.allowed;
    if (!dryRun && scope.allowed.length) {
      await git('stage-data', ['add', '--', ...scope.allowed], work);
      const userName = await git('git-name', ['config', 'user.name']);
      const userEmail = await git('git-email', ['config', 'user.email']);
      // CR-66.2: the publish gate runs explicitly around commit and push; only a PASS bound to this
      // commit's dataset publishes. The git hooks stay as a second line (and reuse this result).
      const gated = await gatedPublish({
        home, work, runDir, env: isolatedEnvironment,
        commit: async () => {
          await git('commit-data', ['-c', `user.name=${userName}`, '-c', `user.email=${userEmail}`, 'commit', '-m', full ? `Refresh Benchmark Heaven data ${day}\n\nSource-backed daily gauntlet and build/tests/typecheck passed.\n\n${COMMIT_TRAILER}` : `Refresh Benchmark Heaven prices ${day}\n\nPrices-only run: OpenRouter and provider catalogs; benchmark and efficiency sources unchanged. Build/tests/typecheck and the publish gate passed.\n\n${COMMIT_TRAILER}`], work);
          return git('candidate-commit', ['rev-parse', 'HEAD'], work);
        },
        push: async () => {
          if (await git('recheck-head', ['rev-parse', 'HEAD']) !== base || (await status('recheck-status', repo)).length) throw new Error('Main changed during collection; candidate remains isolated');
          const remoteUrl = await git('remote-url', ['remote', 'get-url', 'origin']);
          // Push from staging first: a rejected push leaves the primary checkout untouched.
          await git('push-data', ['push', remoteUrl, 'HEAD:refs/heads/main'], work);
        },
      });
      report.gate = { ...gated.gate, verdict: gated.gate.verdict ? { verdict: gated.gate.verdict.verdict, dataset_sha256: gated.gate.verdict.dataset_sha256, commit: gated.gate.verdict.commit ?? null, reasons: (gated.gate.verdict.reasons || []).slice(0, 5), decided_at: gated.gate.verdict.decided_at ?? null } : null };
      for (const stage of gated.gate.stages) report.steps.push({ name: `gate-${stage.stage}`, ok: stage.ok, duration_ms: stage.duration_ms, ...(stage.ok ? {} : { error: redact(stage.log) }) });
      if (!gated.published) throw new Error(gated.error);
      const sha = gated.commit;
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
  // CR-66.9: name secondary sources whose last good data is 3+ days old.
  try {
    const statePath = join(home, 'state', 'collector-health.json');
    const previous = await readJSON(statePath).catch(() => ({ collectors: {} }));
    const health = updateCollectorHealth(previous, report.steps, day);
    if (!dryRun) await writeJSONAtomic(statePath, health);
    const benchmarks = await readJSON(join(reports, 'source-health.json')).catch(() => null);
    report.stale_sources = staleSources({ collectors: health.collectors, benchmarks, day });
  } catch (error) { report.stale_sources = null; console.error(`SOURCE HEALTH FAILED: ${redact(error.message)}`); }
  const summary = [
    `STATUS: ${report.exit_code === 0 ? 'ok' : 'problem'}`,
    `Benchmark Heaven ${day}${full ? '' : ' — nur Preise (OpenRouter, Anbieterkataloge)'}${dryRun ? ' — vollstaendiger Testlauf ohne Push/Telegram' : ''}`,
    `Lauf: ${runDir}`,
    report.workers ? `Erste Auswahl: ${report.workers.producer.id}; Kritiker: ${report.workers.critic.id}` : full ? 'Worker-Auswahl nicht abgeschlossen.' : 'Keine Worker (Preislauf).',
    `Modelle mit Abschluss: ${[...new Set(calls.filter((r) => r.status === 'complete').map((r) => r.actual_model))].filter(Boolean).join(', ') || 'keine'}; gemeldete Kosten: $${report.worker_calls.returned_cost_usd.toFixed(4)} (${report.worker_calls.calls_without_returned_cost} Aufrufe ohne Kostenangabe).`,
    `Schritte: ${report.steps.filter((s) => s.ok).length} erfolgreich; ${report.steps.filter((s) => !s.ok).length} fehlgeschlagen.`,
    `Publikation: ${report.published ? report.commit : dryRun ? 'Testlauf' : 'keine'}; Live-Pruefung: ${report.live_verified ? 'OK' : 'nicht erfolgt'}.`,
    ...(() => {
      const w = report.openrouter_withdrawals;
      if (!w) return [];
      const lines = [...w.withdrawn_models.map((m) => m.id), ...w.withdrawn_endpoints.map((e) => `${e.model_id} ${e.identity}`)];
      const back = [...w.restored_models.map((m) => m.id), ...w.restored_endpoints.map((e) => `${e.model_id} ${e.identity}`)];
      return [
        ...(lines.length ? [`OpenRouter zurueckgezogen (${w.date}): ${lines.length} — ${lines.slice(0, 20).join('; ')}${lines.length > 20 ? ' …' : ''}`] : []),
        ...(back.length ? [`OpenRouter wieder da: ${back.join('; ')}`] : []),
      ];
    })(),
    ...(report.retained_contracts?.length ? [`Zurueckgehalten (Quelle strittig, alter Stand bleibt): ${report.retained_contracts.map((r) => `${r.dataset} (${r.restored.map((f) => `${f.file} vom ${String(f.retained_collected_at).slice(0, 10)}`).join(', ')}; ${String(r.reasons?.[0] ?? '').slice(0, 200)})`).join('; ')}`] : []),
    ...(report.deterministic_fallback_contracts?.length ? [`Ohne Modellpruefung (Pruefer-Antwort unbrauchbar, deterministische Vollpruefung gilt): ${report.deterministic_fallback_contracts.map((r) => r.dataset).join(', ')}`] : []),
    ...(report.unverified_providers?.length ? [`Neue Anbieter ohne gepruefte Metadaten (nicht in EU-/Nicht-US-Filtern): ${report.unverified_providers.join(', ')}`] : []),
    ...(report.stale_sources?.length ? [`Veraltete Quellen (>= 3 Tage): ${report.stale_sources.length} — ${report.stale_sources.map((x) => `${x.id} (zuletzt gut: ${x.last_ok ?? 'nie'})`).join('; ')}`] : []),
    report.error ? `FEHLER: ${report.error.split('\n').filter(Boolean).at(-1).slice(0, 800)}` : 'Build, Tests, Typpruefung und Quellpruefung erfolgreich.',
  ].join('\n') + '\n';
  await writeFile(join(home, 'last-summary.txt'), summary);
  await writeFile(join(reports, 'summary.txt'), summary);
  // CR-73.1: every run profiles itself — stage and worker timing next to the report that
  // produced it, so a change to the pipeline can be compared against the run before it.
  try {
    const timing = await profileRunDir(runDir, report);
    await writeJSONAtomic(join(reports, 'profile.json'), timing);
    report.profile = { wall_min: timing.run.wall_min, worker_calls: timing.workers.calls, worker_min: timing.workers.serial_min,
      worker_share_of_wall: timing.workers.share_of_wall, worker_concurrency: timing.workers.concurrency, configured_concurrency: dailyConcurrency(),
      failed_worker_min: timing.workers.failed_min, top_stages: timing.critical_path.slice(0, 5) };
  } catch (error) { report.profile = { error: redact(String(error.message)) }; }
  await writeJSONAtomic(join(reports, 'run-report.json'), report);
  const context = { status_ok: report.exit_code === 0, rc: report.exit_code, top5: top5 ? { current: top5 } : null, datasets: { before: slim(before), after: slim(after) } };
  await writeJSONAtomic(join(reports, 'notify-context.json'), context);
  await executeNotifications({ context, stateDir: join(home, 'state'), dryRun }).catch((e) => console.error(`NOTIFICATION FAILED: ${redact(e.message)}`));
  console.log(summary);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2), option = (key) => { const index = argv.indexOf(key); if (index < 0) return undefined; if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`Missing ${key} value`); return argv[index + 1]; };
  runDaily({ repo: option('--repo'), home: option('--home'), runDir: option('--run-dir'), dryRun: argv.includes('--dry-run'), scope: option('--scope') ?? 'full' })
    .then((result) => { process.exitCode = result.exit_code; }).catch((error) => { console.error(`DAILY FATAL: ${redact(error.message)}`); process.exitCode = 1; });
}
