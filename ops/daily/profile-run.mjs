#!/usr/bin/env node
// CR-73.1 — profile a daily run end to end.
//
// Florian asked whether the update mechanism can be made faster ("Kann man den Mechanismus
// effizienter machen?"). Before changing anything, this tool says where the time actually goes:
// it accounts for the whole wall clock of a run (not just the sum of its steps), attributes the
// LLM worker calls to the stage that made them, and measures how much of the run is one worker
// waiting for the next — the number that decides whether caching (CR-73.2) or concurrency
// (CR-73.3) is the lever.
//
//   node ops/daily/profile-run.mjs [runDir|--latest] [--home DIR] [--json OUT] [--markdown OUT]
//
// Reads only what a run already writes: reports/run-report.json, the per-stage logs and the
// worker receipts under workers/. Nothing is estimated — a number the run did not record is
// reported as null, and every derived figure names the inputs it came from.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ms = (value) => (Number.isFinite(value) ? value : null);
const minutes = (value) => (Number.isFinite(value) ? Math.round((value / 60_000) * 10) / 10 : null);
const time = (value) => { const t = Date.parse(value ?? ''); return Number.isFinite(t) ? t : null; };
const share = (part, whole) => (Number.isFinite(part) && whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

/** Merge overlapping [start, end) spans; the total length of the union is the real elapsed time. */
export function unionMs(spans) {
  const sorted = spans.filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end >= s.start).sort((a, b) => a.start - b.start);
  let total = 0, open = null;
  for (const span of sorted) {
    if (open && span.start <= open.end) open.end = Math.max(open.end, span.end);
    else { if (open) total += open.end - open.start; open = { start: span.start, end: span.end }; }
  }
  if (open) total += open.end - open.start;
  return total;
}

/**
 * Give every step a start and an end. Runs from 18 Sep on record both (daily.mjs); older runs,
 * and the gate stages that report only a duration, are laid end to end from the last known
 * clock instead. A step whose clock was reconstructed carries `reconstructed: true`, and the
 * report says so, so nobody reads a reconstructed attribution as a measurement.
 */
export function stepTimeline(report) {
  const steps = Array.isArray(report.steps) ? report.steps : [];
  let cursor = time(report.started_at) ?? 0, reconstructed = 0;
  const out = steps.map((s) => {
    const start = time(s.started_at), end = time(s.finished_at);
    if (start != null && end != null) { cursor = end; return { ...s, start, end, reconstructed: false }; }
    const from = cursor, to = cursor + (ms(s.duration_ms) ?? 0);
    cursor = to; reconstructed += 1;
    return { ...s, start: from, end: to, reconstructed: true };
  });
  return { approximate: reconstructed > 0, reconstructed_steps: reconstructed, steps: out };
}

async function readJson(path, fallback = null) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}

async function readReceipts(runDir) {
  let names = [];
  try { names = (await readdir(join(runDir, 'workers'))).filter((n) => /^worker-.*\.json$/.test(n)); } catch { return []; }
  const out = [];
  for (const name of names.sort()) {
    const receipt = await readJson(join(runDir, 'workers', name));
    if (!receipt) continue;
    out.push({
      receipt: name,
      model: receipt.actual_model ?? receipt.requested_model ?? null,
      requested_model: receipt.requested_model ?? null,
      transport: receipt.transport ?? null,
      effort: receipt.reasoning?.effort ?? null,
      finish_reason: receipt.finish_reason ?? null,
      prompt_tokens: receipt.usage?.prompt_tokens ?? null,
      completion_tokens: receipt.usage?.completion_tokens ?? null,
      reasoning_tokens: receipt.usage?.completion_tokens_details?.reasoning_tokens ?? null,
      start: time(receipt.started_at),
      end: time(receipt.finished_at),
      duration_ms: time(receipt.finished_at) != null && time(receipt.started_at) != null ? time(receipt.finished_at) - time(receipt.started_at) : null,
    });
  }
  return out;
}

/** The unit lines the two long stages print — one per benchmark source / live contract. */
export function parseUnits({ benchmarks = '', live = '' } = {}) {
  const units = [];
  for (const line of String(live).split('\n')) {
    const accepted = line.match(/^live gauntlet (\S+): contract accepted; (\d+) rows verified/);
    if (accepted) { units.push({ stage: 'review-live', unit: accepted[1], outcome: 'accepted', rows: Number(accepted[2]) }); continue; }
    const rejected = line.match(/^live gauntlet (\S+): contract NOT accepted(?: — (.*))?/);
    if (rejected) units.push({ stage: 'review-live', unit: rejected[1], outcome: 'retained', detail: (rejected[2] || '').slice(0, 300) });
  }
  const header = String(benchmarks).match(/^Benchmark refresh: (\d+) checks; (\d+)\/(\d+) changed score rows accepted; (\d+) explicit retained failures/m);
  for (const line of String(benchmarks).split('\n')) {
    // Ids carry their version as `family::version`; the reason is separated by a colon *and a space*.
    const retained = line.match(/^BENCHMARK RETAINED (\S+?): (.*)$/);
    if (retained) units.push({ stage: 'refresh-benchmarks', unit: retained[1], outcome: 'retained', detail: retained[2].slice(0, 300) });
  }
  return {
    units,
    benchmarkChecks: header ? { checks: Number(header[1]), accepted_changed_rows: Number(header[2]), changed_rows: Number(header[3]), retained_failures: Number(header[4]) } : null,
  };
}

export function profile({ report, receipts = [], logs = {}, runDir = null }) {
  const runStart = time(report.started_at), runEnd = time(report.finished_at);
  const wall = runStart != null && runEnd != null ? runEnd - runStart : null;
  const timeline = stepTimeline(report);
  const stepsMs = timeline.steps.reduce((sum, s) => sum + (ms(s.duration_ms) ?? 0), 0);

  const calls = Array.isArray(report.worker_calls?.calls) ? report.worker_calls.calls : [];
  const byReceipt = new Map(receipts.map((r) => [r.receipt, r]));
  const workers = calls.map((call) => {
    const measured = byReceipt.get(call.receipt) ?? {};
    return {
      receipt: call.receipt ?? null,
      role: call.role ?? null,
      status: call.status ?? null,
      model: call.actual_model ?? measured.model ?? null,
      requested_model: call.requested_model ?? measured.requested_model ?? null,
      transport: measured.transport ?? null,
      effort: call.reasoning?.effort ?? measured.effort ?? null,
      cost_usd: Number.isFinite(call.returned_cost_usd) ? call.returned_cost_usd : null,
      start: measured.start ?? null,
      end: measured.end ?? null,
      duration_ms: measured.duration_ms ?? null,
      finish_reason: measured.finish_reason ?? null,
      completion_tokens: measured.completion_tokens ?? null,
      reasoning_tokens: measured.reasoning_tokens ?? null,
    };
  });
  // Receipts without a run-report entry still cost wall time (a call that never returned a usable
  // answer), so they are counted rather than dropped.
  for (const r of receipts) if (!calls.some((c) => c.receipt === r.receipt)) workers.push({ ...r, role: null, status: 'no-run-report-entry', cost_usd: null });

  const timedWorkers = workers.filter((w) => Number.isFinite(w.duration_ms));
  const workerSerialMs = timedWorkers.reduce((sum, w) => sum + w.duration_ms, 0);
  const workerUnionMs = unionMs(timedWorkers);
  const failed = workers.filter((w) => w.status && w.status !== 'complete');
  const failedMs = failed.reduce((sum, w) => sum + (ms(w.duration_ms) ?? 0), 0);

  const attribute = (step) => timedWorkers.filter((w) => w.start != null && w.start >= step.start && w.start < step.end);
  const stages = timeline.steps.map((step) => {
    const mine = attribute(step);
    return {
      name: step.name,
      ok: step.ok !== false,
      duration_ms: ms(step.duration_ms),
      share_of_wall: share(ms(step.duration_ms), wall),
      worker_calls: mine.length,
      worker_ms: mine.reduce((sum, w) => sum + w.duration_ms, 0),
      worker_cost_usd: mine.reduce((sum, w) => sum + (w.cost_usd ?? 0), 0),
    };
  }).sort((a, b) => (b.duration_ms ?? 0) - (a.duration_ms ?? 0));

  const group = (key) => {
    const map = new Map();
    for (const w of workers) {
      const k = w[key] ?? 'unknown';
      const entry = map.get(k) ?? { [key]: k, calls: 0, duration_ms: 0, cost_usd: 0, failed: 0 };
      entry.calls += 1; entry.duration_ms += ms(w.duration_ms) ?? 0; entry.cost_usd += w.cost_usd ?? 0;
      if (w.status && w.status !== 'complete') entry.failed += 1;
      map.set(k, entry);
    }
    return [...map.values()].sort((a, b) => b.duration_ms - a.duration_ms);
  };

  // What a perfectly cached, perfectly parallel run could not avoid: the steps that make no worker
  // call (clone, install, fetch, build, test, typecheck, gate, push) plus the single longest worker
  // call. It is a floor, not a promise — it assumes every other call is either skipped or overlapped.
  const nonWorkerStepMs = stages.filter((s) => s.worker_calls === 0).reduce((sum, s) => sum + (s.duration_ms ?? 0), 0);
  const longestWorkerMs = timedWorkers.reduce((max, w) => Math.max(max, w.duration_ms), 0);

  const { units, benchmarkChecks } = parseUnits(logs);
  return {
    generated_at: new Date().toISOString(),
    run: {
      dir: runDir, started_at: report.started_at ?? null, finished_at: report.finished_at ?? null,
      scope: report.scope ?? null, published: report.published ?? null, exit_code: report.exit_code ?? null,
      commit: report.commit ?? null, dataset_sha256: report.dataset_sha256 ?? null,
      wall_ms: wall, wall_min: minutes(wall),
    },
    accounting: {
      // Every millisecond of the run belongs to exactly one of these two buckets.
      steps_ms: stepsMs, steps_min: minutes(stepsMs),
      unaccounted_ms: wall != null ? wall - stepsMs : null, unaccounted_min: wall != null ? minutes(wall - stepsMs) : null,
      unaccounted_share: share(wall != null ? wall - stepsMs : null, wall),
      step_clock: timeline.approximate ? `recorded per step; ${timeline.reconstructed_steps} step(s) laid end to end (no timestamps)` : 'recorded per step',
      reconstructed_steps: timeline.reconstructed_steps,
    },
    stages,
    critical_path: stages.filter((s) => (s.share_of_wall ?? 0) >= 1).map((s) => ({ name: s.name, minutes: minutes(s.duration_ms), share_of_wall: s.share_of_wall })),
    workers: {
      calls: workers.length,
      timed_calls: timedWorkers.length,
      serial_ms: workerSerialMs, serial_min: minutes(workerSerialMs),
      elapsed_ms: workerUnionMs, elapsed_min: minutes(workerUnionMs),
      // 1.00 means the run never ran two workers at the same time.
      concurrency: workerUnionMs > 0 ? Math.round((workerSerialMs / workerUnionMs) * 100) / 100 : null,
      share_of_wall: share(workerUnionMs, wall),
      failed_calls: failed.length, failed_ms: failedMs, failed_min: minutes(failedMs),
      cost_usd: Number.isFinite(report.worker_calls?.returned_cost_usd) ? report.worker_calls.returned_cost_usd : null,
      calls_without_returned_cost: report.worker_calls?.calls_without_returned_cost ?? null,
      by_model: group('model'), by_role: group('role'),
      slowest: [...timedWorkers].sort((a, b) => b.duration_ms - a.duration_ms).slice(0, 10)
        .map((w) => ({ receipt: w.receipt, role: w.role, model: w.model, status: w.status, minutes: minutes(w.duration_ms), completion_tokens: w.completion_tokens, reasoning_tokens: w.reasoning_tokens })),
    },
    units: { count: units.length, benchmark_checks: benchmarkChecks, list: units },
    sources: {
      changed_paths: report.changed_paths ?? null,
      retained_contracts: report.retained_contracts ?? null,
      deterministic_fallback_contracts: report.deterministic_fallback_contracts ?? null,
      openrouter_withdrawals: Array.isArray(report.openrouter_withdrawals) ? report.openrouter_withdrawals.length : null,
      stale_sources: report.stale_sources ?? null,
    },
    headroom: {
      // The three levers of CR-73, measured rather than assumed.
      cacheable_worker_ms: workerSerialMs, // CR-73.2: work skipped when a source is byte-identical
      serialisation_ms: workerSerialMs - longestWorkerMs, // CR-73.3: what perfect overlap could hide
      retry_waste_ms: failedMs, // CR-73.3/73.4: calls that returned nothing usable
      irreducible_floor_ms: nonWorkerStepMs + longestWorkerMs,
      irreducible_floor_min: minutes(nonWorkerStepMs + longestWorkerMs),
      note: 'Floor = stages that make no worker call + the single longest worker call. Upper bound on savings, not a target.',
    },
  };
}

export function toMarkdown(p) {
  const lines = [];
  lines.push(`# Daily run profile — ${p.run.started_at} (${p.run.scope ?? 'full'})`, '');
  lines.push(`Wall clock **${p.run.wall_min} min**; steps ${p.accounting.steps_min} min; unaccounted ${p.accounting.unaccounted_min} min (${p.accounting.unaccounted_share ?? '?'} %). Step clock: ${p.accounting.step_clock}.`, '');
  lines.push(`Published: ${p.run.published} · commit ${p.run.commit ?? '—'} · exit ${p.run.exit_code}`, '');
  lines.push('| Stage | min | % of wall | worker calls | worker min | $ |', '|---|---:|---:|---:|---:|---:|');
  for (const s of p.stages.filter((s) => (s.duration_ms ?? 0) >= 1000)) {
    lines.push(`| ${s.name}${s.ok ? '' : ' (failed)'} | ${minutes(s.duration_ms)} | ${s.share_of_wall ?? ''} | ${s.worker_calls} | ${minutes(s.worker_ms)} | ${s.worker_cost_usd ? s.worker_cost_usd.toFixed(4) : ''} |`);
  }
  lines.push('');
  lines.push(`**Workers:** ${p.workers.calls} calls, ${p.workers.serial_min} min of model time over ${p.workers.elapsed_min} min of clock (concurrency ${p.workers.concurrency}), ${p.workers.share_of_wall} % of the run. ${p.workers.failed_calls} returned nothing usable (${p.workers.failed_min} min). Reported cost $${(p.workers.cost_usd ?? 0).toFixed(4)}.`, '');
  lines.push('| Model | calls | min | failed | $ |', '|---|---:|---:|---:|---:|');
  for (const m of p.workers.by_model) lines.push(`| ${m.model} | ${m.calls} | ${minutes(m.duration_ms)} | ${m.failed} | ${m.cost_usd.toFixed(4)} |`);
  lines.push('');
  lines.push(`**Headroom:** cacheable model time ${minutes(p.headroom.cacheable_worker_ms)} min · serialisation ${minutes(p.headroom.serialisation_ms)} min · retries that returned nothing ${minutes(p.headroom.retry_waste_ms)} min · floor ${p.headroom.irreducible_floor_min} min. ${p.headroom.note}`, '');
  return lines.join('\n');
}

/** `report` is passed in by daily.mjs, which profiles itself before the report is on disk. */
export async function profileRunDir(runDir, inMemoryReport = null) {
  const report = inMemoryReport ?? await readJson(join(runDir, 'reports', 'run-report.json'));
  if (!report) throw new Error(`no run-report.json in ${runDir}`);
  const receipts = await readReceipts(runDir);
  const logs = {
    benchmarks: await readFile(join(runDir, 'reports', 'refresh-benchmarks.log'), 'utf8').catch(() => ''),
    live: await readFile(join(runDir, 'reports', 'review-live.log'), 'utf8').catch(() => ''),
  };
  return profile({ report, receipts, logs, runDir });
}

async function latestRun(home) {
  const names = (await readdir(join(home, 'runs'))).filter((n) => /^\d{4}-\d{2}-\d{2}T/.test(n)).sort();
  if (!names.length) throw new Error(`no runs under ${home}`);
  return join(home, 'runs', names[names.length - 1]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const home = flag('--home') ?? '/opt/benchmarkheaven-daily';
  const positional = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--home' && argv[argv.indexOf(a) - 1] !== '--json' && argv[argv.indexOf(a) - 1] !== '--markdown');
  const runDir = resolve(positional ?? (await latestRun(home)));
  const result = await profileRunDir(runDir);
  const jsonOut = flag('--json'), mdOut = flag('--markdown');
  if (jsonOut) await writeFile(jsonOut, `${JSON.stringify(result, null, 2)}\n`);
  if (mdOut) await writeFile(mdOut, `${toMarkdown(result)}\n`);
  if (!jsonOut && !mdOut) console.log(toMarkdown(result));
  else console.log(`${runDir}: ${result.run.wall_min} min, ${result.workers.calls} worker calls (${result.workers.share_of_wall} % of wall)${jsonOut ? `, json ${jsonOut}` : ''}${mdOut ? `, markdown ${mdOut}` : ''}`);
}
