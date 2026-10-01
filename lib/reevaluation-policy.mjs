// CR-251: re-evaluation roster planner. Pure functions; no I/O except the optional file helpers at the bottom.
// Policy (data/reevaluation-policy.json): the top N by composite rank are re-measured with every refresh; the rest
// are measured at most every Nth refresh or when their last measurement is older than max_age_days.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const REEVALUATION_POLICY_FILE = 'data/reevaluation-policy.json';
export const REEVALUATION_LEDGER_FILE = 'data/reevaluation-ledger.json';
export const RELEASE_KINDS = ['addendum', 'refresh', 'method_change'];
export const BENCHMARKS = ['jevbench', 'imagejevbench', 'audiojevbench'];
const DAY_MS = 86_400_000;

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const dayNumber = (s) => Math.floor(Date.parse(`${s}T00:00:00Z`) / DAY_MS);
const addDays = (s, n) => new Date((dayNumber(s) + n) * DAY_MS).toISOString().slice(0, 10);

export function validatePolicy(policy) {
  const p = policy ?? {};
  const n = p.top_n, every = p.slow_cadence?.every_nth_refresh, age = p.slow_cadence?.max_age_days;
  if (!Number.isInteger(n) || n < 1) throw new TypeError('policy.top_n must be a positive integer');
  if (!Number.isInteger(every) || every < 1) throw new TypeError('policy.slow_cadence.every_nth_refresh must be a positive integer');
  if (!Number.isInteger(age) || age < 1) throw new TypeError('policy.slow_cadence.max_age_days must be a positive integer');
  return p;
}


/** Ledger shape: { <benchmark>: {key: {release, date, refreshIndex}}, refreshCounter: {benchmark: n} }. */
function cloneLedger(ledger) {
  return JSON.parse(JSON.stringify(ledger && typeof ledger === 'object' ? ledger : {}));
}

function queueOrder(a, b) {
  if (!!a.fast_lane !== !!b.fast_lane) return a.fast_lane ? -1 : 1;
  const ta = Date.parse(a.queued_at ?? '') || 0, tb = Date.parse(b.queued_at ?? '') || 0;
  return ta - tb;
}

/**
 * @returns {{remeasure, carryForward, newEntrants, ledgerUpdate, summary}}
 */
export function planReevaluation({ benchmark, releaseKind, releaseLabel, releaseDate, rows, ledger, paidKeys = [], newQueue = [], policy }) {
  const pol = validatePolicy(policy);
  if (!RELEASE_KINDS.includes(releaseKind)) throw new RangeError(`unknown release kind: ${releaseKind}`);
  if (!benchmark) throw new TypeError('benchmark is required');
  if (!releaseLabel) throw new TypeError('releaseLabel is required');
  if (!isDate(releaseDate)) throw new TypeError('releaseDate must be YYYY-MM-DD');
  if (!Array.isArray(rows)) throw new TypeError('rows must be an array');
  const every = pol.slow_cadence.every_nth_refresh, maxAge = pol.slow_cadence.max_age_days;
  const next = cloneLedger(ledger);
  next[benchmark] ??= {};
  next.refreshCounter ??= {};
  const known = ledger?.[benchmark] ?? {};
  const counter = Number(ledger?.refreshCounter?.[benchmark] ?? 0);
  // A refresh and a method change each count as one refresh; an addendum does not move the counter.
  const thisIndex = releaseKind === 'addendum' ? counter : counter + 1;
  const paid = new Set(paidKeys);
  const ordered = [...rows].filter((r) => r && r.key != null).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || String(a.key).localeCompare(String(b.key)));
  const remeasure = [], carryForward = [];

  for (const row of ordered) {
    const base = { key: row.key, name: row.name ?? row.key, rank: row.rank ?? null };
    const last = known[row.key];
    const reasons = [];
    if (releaseKind === 'method_change') reasons.push('method_change');
    if (!last) reasons.push('never_measured');
    if (releaseKind === 'refresh' && base.rank != null && base.rank <= pol.top_n) reasons.push('top_n');
    if (paid.has(row.key)) reasons.push('paid_fast_lane');
    if (releaseKind === 'refresh' && last) {
      const since = counter - (Number(last.refreshIndex) || 0);       // refreshes since the last measurement
      if (since >= every - 1 && !reasons.includes('top_n')) reasons.push('slow_cadence_nth_refresh');
      const age = dayNumber(releaseDate) - dayNumber(last.date);
      if (age >= maxAge) reasons.push('slow_cadence_max_age');
    }
    if (reasons.length) {
      // Primary reason: the first applicable in the policy's own order.
      const order = ['method_change', 'top_n', 'paid_fast_lane', 'never_measured', 'slow_cadence_nth_refresh', 'slow_cadence_max_age'];
      const primary = order.find((r) => reasons.includes(r));
      remeasure.push({ ...base, reason: primary, reasons: order.filter((r) => reasons.includes(r)) });
    } else {
      carryForward.push({
        ...base,
        lastMeasured: { release: last.release, date: last.date },
        dueBy: { refreshIndex: (Number(last.refreshIndex) || 0) + every, date: addDays(last.date, maxAge) },
      });
    }
  }

  const rowKeys = new Set(ordered.map((r) => r.key));
  const newEntrants = [...newQueue].sort(queueOrder).map((q, i) => ({
    key: q.key ?? q.ref ?? null, name: q.name ?? q.key ?? q.ref ?? 'unnamed submission',
    queuedAt: q.queued_at ?? null, fastLane: !!q.fast_lane, position: i + 1,
    reason: q.fast_lane ? 'paid_fast_lane' : 'new_entrant',
  })).filter((q) => q.key == null || !rowKeys.has(q.key));
  // Paid keys that are neither on the board nor queued still get measured.
  const entrantKeys = new Set(newEntrants.map((q) => q.key));
  for (const key of paid) if (!rowKeys.has(key) && !entrantKeys.has(key)) {
    newEntrants.unshift({ key, name: key, queuedAt: null, fastLane: true, position: 0, reason: 'paid_fast_lane' });
  }
  newEntrants.forEach((q, i) => { q.position = i + 1; });

  // Everything this release measures is marked as measured now.
  const stamp = { release: releaseLabel, date: releaseDate, refreshIndex: thisIndex };
  for (const r of remeasure) next[benchmark][r.key] = { ...stamp };
  for (const q of newEntrants) if (q.key) next[benchmark][q.key] = { ...stamp };
  next.refreshCounter[benchmark] = thisIndex;

  return {
    benchmark, releaseKind, releaseLabel, releaseDate, refreshIndex: thisIndex, policy: pol,
    remeasure, carryForward, newEntrants, ledgerUpdate: next,
    summary: { rows: ordered.length, remeasure: remeasure.length, carryForward: carryForward.length, newEntrants: newEntrants.length },
  };
}

/** Markdown for the release PR. */
export function renderPlan(plan) {
  const cell = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const L = [];
  L.push(`# Re-evaluation plan: ${plan.benchmark} ${plan.releaseLabel} (${plan.releaseKind}, ${plan.releaseDate})`, '');
  L.push(`Policy: top ${plan.policy.top_n} by ${plan.policy.rank_basis}; slow cadence: measured at most every ${plan.policy.slow_cadence.every_nth_refresh} refreshes, or when older than ${plan.policy.slow_cadence.max_age_days} days. Refresh index after this release: ${plan.refreshIndex}.`, '');
  L.push(`Re-measure ${plan.summary.remeasure} of ${plan.summary.rows} rows, carry forward ${plan.summary.carryForward}, new entrants ${plan.summary.newEntrants}.`, '');
  L.push('## Re-measure', '', '| Rank | Key | Name | Reason |', '|---|---|---|---|');
  for (const r of plan.remeasure) L.push(`| ${r.rank ?? ''} | ${cell(r.key)} | ${cell(r.name)} | ${r.reasons.join(', ')} |`);
  if (!plan.remeasure.length) L.push('| | | (none) | |');
  L.push('', '## New entrants (queue order, fast lane first)', '', '| # | Key/ref | Name | Reason |', '|---|---|---|---|');
  for (const q of plan.newEntrants) L.push(`| ${q.position} | ${cell(q.key)} | ${cell(q.name)} | ${q.reason} |`);
  if (!plan.newEntrants.length) L.push('| | | (none) | |');
  L.push('', '## Carry forward (mark each with its last-measured release)', '', '| Rank | Key | Name | Last measured | Due by |', '|---|---|---|---|---|');
  for (const c of plan.carryForward) L.push(`| ${c.rank ?? ''} | ${cell(c.key)} | ${cell(c.name)} | ${cell(c.lastMeasured.release)} (${c.lastMeasured.date}) | refresh #${c.dueBy.refreshIndex} or ${c.dueBy.date} |`);
  if (!plan.carryForward.length) L.push('| | | (none) | | |');
  return L.join('\n') + '\n';
}

// ------------------------------------------------------------------ file helpers
export async function readPolicy(root = process.cwd()) {
  return validatePolicy(JSON.parse(await readFile(path.join(root, REEVALUATION_POLICY_FILE), 'utf8')));
}

export async function readLedger(root = process.cwd()) {
  try { return JSON.parse(await readFile(path.join(root, REEVALUATION_LEDGER_FILE), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
}

export async function writeLedger(ledger, root = process.cwd()) {
  await writeFile(path.join(root, REEVALUATION_LEDGER_FILE), JSON.stringify(ledger, null, 2) + '\n');
}

/** Current live rows per benchmark: [{key,name,rank}] ranked by composite, from the files the site treats as current. */
export async function currentRows(benchmark, root = process.cwd()) {
  const readJson = async (p) => JSON.parse(await readFile(path.join(root, p), 'utf8'));
  if (benchmark === 'jevbench') {
    const d = await readJson('data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-results.json');
    return { release: d.revision, rows: d.systems.filter((s) => s.ranked && Number.isFinite(s.rank)).map((s) => ({ key: s.key, name: s.display ?? s.key, rank: s.rank })) };
  }
  if (benchmark === 'imagejevbench') {
    const d = await readJson('data/raw/benchmarks/jevbench/multimodal-preview/preview.json');
    return { release: d.status === 'preview' ? 'v0.1.5' : String(d.status), rows: d.ranking.filter((s) => Number.isFinite(s.rank)).map((s) => ({ key: s.key, name: s.name ?? s.key, rank: s.rank })) };
  }
  if (benchmark === 'audiojevbench') {
    const { audiojevView } = await import(new URL('./audiojev-preview.mjs', import.meta.url));
    const view = audiojevView(await readJson('data/audiojev-preview.json'));
    return { release: 'v0.1', rows: view.full.filter((r) => r.rank != null).map((r) => ({ key: r.key, name: r.config ? `${r.name} (${r.config})` : r.name, rank: r.rank })) };
  }
  throw new RangeError(`unknown benchmark: ${benchmark}`);
}

/** Seed dates are the publication dates of the artifacts the site treats as current on 2026-10-01. */
export const SEED = {
  jevbench: { release: 'v1.5.4', date: '2026-09-29' },
  imagejevbench: { release: 'v0.1.5', date: '2026-10-01' },
  audiojevbench: { release: 'v0.1', date: '2026-09-26' },
};

export async function seedLedger(root = process.cwd()) {
  const ledger = { refreshCounter: {} };
  for (const benchmark of BENCHMARKS) {
    const { rows } = await currentRows(benchmark, root);
    const { release, date } = SEED[benchmark];
    ledger[benchmark] = Object.fromEntries(rows.map((r) => [r.key, { release, date, refreshIndex: 0 }]));
    ledger.refreshCounter[benchmark] = 0;
  }
  return ledger;
}
