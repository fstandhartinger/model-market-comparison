// ops/daily/policy.mjs — phase 08 daily orchestration policy.
//
// Pure functions only: no filesystem, no network, no clock (pass `now` in).
// Every decision the daily run or the notifier makes is computed here so that
// test/daily-policy.test.mjs can pin the exact behaviour. Silent weakening is
// treated as a bug: malformed state degrades to "no comparison possible",
// never to "everything is fine".

// --- Tunables (master brief §6 + phase 08 contract) ------------------------
export const TOP_N = 5; // Composite top-N family watchlist
export const NOTABLE_AA_INDEX = 55; // "meaningful new major model": AA index >= 55 ...
export const DIVERGENCE_ALERT_PP = 10; // ... or new exact divergence >= 10 percentage points
export const FAILURE_ALERT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // failure alert at most once / 7d
export const ESCALATION_THRESHOLD = 3; // consecutive failures before an escalation request
export const MAX_WORKER_USD_PER_MTOK = 4; // daily workers: <= $4 per million prompt AND completion
export const MIN_WORKER_AA_INDEX = 34; // hard gate, same as worker-policy.mjs
export const COMMIT_TRAILER = 'Co-Authored-By: Codex GPT-6 Astra (Sandy rebuild) <noreply@openai.com>';
// A daily commit may contain data, and only explicitly declared new source
// evidence (refreshBenchmarks reports those paths). Nothing else. Ever.
export const ALLOWED_COMMIT_PREFIXES = ['data/'];

// --- Tolerant parsing ------------------------------------------------------
// Malformed or partial snapshots must never crash the notifier and must never
// be interpreted as a clean baseline.
export function parseJsonTolerant(text, fallback = null) {
  if (typeof text !== 'string' || !text.trim()) return fallback;
  try { return JSON.parse(text); } catch { return fallback; }
}

// A usable top-N row is exactly {family_key: string, name: string, composite: finite number}.
// Partial rows are dropped; a non-array yields null ("unknown", distinct from "empty").
export function sanitizeTop5(value) {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return null;
  return value.filter((row) => row && typeof row.family_key === 'string' && row.family_key.trim()
    && typeof row.name === 'string' && Number.isFinite(row.composite));
}

// previous === null or malformed  => no usable baseline: seed, notify nobody.
// An empty-but-valid baseline ("known empty") is also seeded rather than
// spamming five "new" entrants after a state-file loss.
// Returns { seeded, entrants } where entrants are full current rows in rank order.
export function diffTop5Entrants(previous, current) {
  const curr = sanitizeTop5(current) ?? [];
  const before = sanitizeTop5(previous);
  if (before === null || before.length === 0) return { seeded: true, entrants: [] };
  const known = new Set(before.map((row) => row.family_key));
  return { seeded: false, entrants: curr.filter((row) => !known.has(row.family_key)) };
}

// --- New major models ------------------------------------------------------
// "Meaningful new major model": AA intelligence index >= NOTABLE_AA_INDEX on a
// model whose family was entirely absent from the previous dataset.
// Several reasoning variants of one new family collapse into a single event,
// represented by the variant with the highest AA index.
function aaIndexValue(model) {
  const value = model?.benchmarks?.aa_intelligence_index;
  return Number.isFinite(value) ? value : null;
}

export function findNewMajorModels(before, after, { minIndex = NOTABLE_AA_INDEX } = {}) {
  const beforeModels = Array.isArray(before?.models) ? before.models : [];
  const afterModels = Array.isArray(after?.models) ? after.models : [];
  const known = new Set(beforeModels.map((m) => m?.family_key).filter((f) => typeof f === 'string' && f));
  const bestPerFamily = new Map();
  for (const m of afterModels) {
    const index = aaIndexValue(m);
    if (index === null || index < minIndex) continue;
    const family = typeof m?.family_key === 'string' && m.family_key ? m.family_key : null;
    if (!family || known.has(family)) continue;
    const candidate = { id: m.id ?? null, family_key: family, name: m.family_name || m.display_name || m.id || family, index };
    const best = bestPerFamily.get(family);
    if (!best || candidate.index > best.index
      || (candidate.index === best.index && String(candidate.id).localeCompare(String(best.id)) < 0)) {
      bestPerFamily.set(family, candidate);
    }
  }
  return [...bestPerFamily.values()].sort((a, b) => b.index - a.index || String(a.id).localeCompare(String(b.id)));
}

// --- Exact-comparable divergences (unit-aware) -----------------------------
// dataset.benchmark_results.divergences rows (lib/benchmark-scores.mjs) carry an
// exact-pair identity: same model, benchmark version, unit, variant, harness and
// reviewed comparison_key. We alert only on *newly appearing* pairs whose absolute
// delta is >= threshold percentage points. Units are never invented and never
// rescaled by an arbitrary constant: a 'percent' delta IS percentage points,
// a 'fraction' delta is converted (x100) into percentage points; every other
// unit (including unscaled 'points', which is not a percentage-point scale)
// is ignored.
function rawDelta(d) {
  if (Number.isFinite(d.delta)) return d.delta;
  const a = d.self_reported_value ?? d.self_reported;
  const b = d.measured_value ?? d.measured;
  return Number.isFinite(a) && Number.isFinite(b) ? a - b : null;
}

export function findNotableDivergences(beforeResults, afterResults, { thresholdPp = DIVERGENCE_ALERT_PP } = {}) {
  const known = new Set((beforeResults?.divergences ?? []).map((d) => d?.id).filter(Boolean));
  const out = [];
  for (const d of afterResults?.divergences ?? []) {
    if (!d?.id || known.has(d.id)) continue;
    const raw = rawDelta(d);
    let deltaPp = null;
    if (d.unit === 'percent') deltaPp = raw;
    else if (d.unit === 'fraction') deltaPp = raw === null ? null : raw * 100;
    // 'points' and any other unit: inherently arbitrary, never percentage points.
    if (deltaPp === null || Math.abs(deltaPp) < thresholdPp) continue;
    out.push({ id: d.id, model_id: d.model_id ?? null, benchmark_id: d.benchmark_id ?? null, unit: d.unit,
      delta: Number.isFinite(d.delta) ? d.delta : raw, delta_pp: deltaPp,
      self_reported: d.self_reported_value ?? null, measured: d.measured_value ?? null });
  }
  return out.sort((a, b) => Math.abs(b.delta_pp) - Math.abs(a.delta_pp) || a.id.localeCompare(b.id));
}

// --- Failure streak / escalation -------------------------------------------
export function nextFailureStreak(current, statusOk) {
  const streak = Number.isSafeInteger(current) && current >= 0 ? current : 0;
  return statusOk ? 0 : streak + 1;
}

// --- The notification plan --------------------------------------------------
// One pure function computes everything the notifier may do. It returns the
// messages to send (`sends`), why others were held back (`skips`) and the state
// mutations. Mutations split into `baseline` (always applied, even without any
// send: first-run seeding, streak bookkeeping, escalation request record) and
// per-send `onSent` (applied ONLY after a Telegram send actually succeeded, so
// a missing credential can never fake a dedup entry).
// A failed run never advances the top5 baseline (it keeps `previous`) and a
// successful run clears any stale escalation request.
export function planNotifications({
  status_ok: statusOk, rc = null,
  top5: { previous: top5Previous = null, current: top5CurrentInput = [] } = {},
  datasets: { before: beforeDs = null, after: afterDs = null } = {},
  failure_streak: streakBefore = 0,
  failure_alert_last_sent_at: lastFailureAlertAt = null,
  notified = {},
  escalation_request: escalationRequest = null,
  summary_excerpt: summaryExcerpt = null,
  now = Date.now(),
} = {}) {
  const at = Number.isFinite(now) ? now : Date.parse(now);
  if (!Number.isFinite(at)) throw new Error('planNotifications: invalid now');
  const iso = new Date(at).toISOString();
  const current = sanitizeTop5(top5CurrentInput);
  const previous = top5Previous === null ? null : sanitizeTop5(top5Previous);
  const known = notified && typeof notified === 'object' ? notified : {};
  const sends = []; const skips = []; const baseline = {}; const seeded = previous === null;

  baseline.failure_streak = nextFailureStreak(streakBefore, statusOk);
  // A failed run keeps the last successful baseline; only a successful run
  // advances the watchlist snapshot.
  baseline.top5_state = statusOk ? current : previous;

  // Escalation request: state record (loud in the log), not a hidden bypass of
  // the weekly failure rate limit. The failure alert text mentions it.
  const escalationDue = !statusOk && baseline.failure_streak >= ESCALATION_THRESHOLD && !escalationRequest;
  if (escalationDue) baseline.escalation_request = { requested_at: iso, streak: baseline.failure_streak };
  // A successful run clears any stale escalation request.
  if (statusOk) baseline.escalation_request = null;

  // (b) failure, at most once per 7 days — the 7-day limit itself is only
  // advanced once a send is CONFIRMED (onSent below), never by planning.
  if (!statusOk) {
    const key = `failure:${iso.slice(0, 10)}`;
    const lines = [
      `⚠️ Benchmark Heaven Daily-Refresh fehlgeschlagen (rc=${rc ?? 'unbekannt'}).`,
      `Fehlerserie: ${baseline.failure_streak}. Nächste Warnung frühestens in 7 Tagen.`,
    ];
    if (escalationDue) lines.push(`ESKALATION ANGEFORDERT: ${baseline.failure_streak} aufeinanderfolgende Fehler — bitte manuell ops/daily/escalate.sh ausführen.`);
    if (typeof summaryExcerpt === 'string' && summaryExcerpt.trim()) lines.push('', summaryExcerpt.trim().slice(0, 1500));
    if (lastFailureAlertAt === null || at - lastFailureAlertAt >= FAILURE_ALERT_INTERVAL_MS) {
      sends.push({ kind: 'failure', key, text: lines.join('\n'), onSent: { failure_alert_sent_at: at } });
    } else skips.push({ kind: 'failure', key, reason: 'rate-limited' });
  }

  // Data events only from a successful run with both snapshots present.
  if (statusOk) {
    // (a) new family in the top 5 — but never on the very first run: seed only.
    if (seeded) skips.push({ kind: 'top5-entrant', key: null, reason: 'baseline-seeded' });
    else {
      const { entrants } = diffTop5Entrants(previous, current);
      if (entrants.length) {
        const key = `top5:${entrants.map((r) => r.family_key).sort().join('|')}`;
        if (known[key]) skips.push({ kind: 'top5-entrant', key, reason: 'duplicate' });
        else {
          const lines = [`🏆 Benchmark Heaven: Neu in den Top ${TOP_N} (Composite): ${entrants.map((r) => `${r.name} (${r.composite})`).join(', ')}`, ''];
          lines.push(...current.map((r, i) => `${i + 1}. ${r.name} — ${r.composite}`));
          lines.push('https://benchmarkheaven.com');
          sends.push({ kind: 'top5-entrant', key, text: lines.join('\n'), onSent: { notified_key: key } });
        }
      }
    }
    if (beforeDs && afterDs) {
      // (c1) meaningful new major model — one entry per new family (highest AA).
      const majors = findNewMajorModels(beforeDs, afterDs);
      if (majors.length) {
        const key = `major:${majors.map((m) => m.id).sort().join('|')}`;
        if (known[key]) skips.push({ kind: 'major-model', key, reason: 'duplicate' });
        else sends.push({ kind: 'major-model', key, onSent: { notified_key: key },
          text: [`🚀 Benchmark Heaven: bedeutende${majors.length > 1 ? ' neue Modelle' : 's neues Modell'} (AA ≥ ${NOTABLE_AA_INDEX}, neue Familie):`,
            ...majors.map((m) => `• ${m.name} — AA ${m.index}`), 'https://benchmarkheaven.com'].join('\n') });
      }
      // (c2) new exact-comparable self-reported-vs-measured divergence >= 10 pp
      const divergences = findNotableDivergences(beforeDs?.benchmark_results, afterDs?.benchmark_results);
      if (divergences.length) {
        const key = `divergence:${divergences.map((d) => d.id).sort().join('|')}`;
        if (known[key]) skips.push({ kind: 'divergence', key, reason: 'duplicate' });
        else sends.push({ kind: 'divergence', key, onSent: { notified_key: key },
          text: [`📊 Benchmark Heaven: neue exakt vergleichbare Abweichung Selbstauskunft vs. Messung (≥ ${DIVERGENCE_ALERT_PP} Prozentpunkte):`,
            ...divergences.map((d) => `• ${d.model_id} / ${d.benchmark_id}: ${d.self_reported} vs. ${d.measured} ${d.unit} (Δ ${d.delta_pp > 0 ? '+' : ''}${Math.round(d.delta_pp * 10) / 10} pp)`),
            'https://benchmarkheaven.com/benchmarks'].join('\n') });
      }
    }
  }
  return { sends, skips, baseline, seeded, evaluated_at: iso };
}

// --- Cheap worker selection (producer + different-family critic) ------------
// Input: parsed output of `node ops/rebuild-2026-09/bin/pick-worker-models.mjs --json`
// (which already enforces the AA >= 34 gate against our own dataset). We
// defensively re-check the gate and additionally cap cost at <= $4 per million
// prompt AND completion tokens. The critic must come from a different vendor
// family than the producer. Astra (Codex) is never a daily worker.
export function selectProducerCritic(catalog, { maxUsdPerMtok = MAX_WORKER_USD_PER_MTOK, minAa = MIN_WORKER_AA_INDEX } = {}) {
  if (!Number.isFinite(minAa) || minAa < 34 || !Number.isFinite(maxUsdPerMtok) || maxUsdPerMtok <= 0 || maxUsdPerMtok > MAX_WORKER_USD_PER_MTOK) throw new Error('Invalid daily worker qualification/cost limits');
  if (!catalog || typeof catalog !== 'object') throw new Error('worker catalog missing');
  const pool = [...(catalog.free_verified ?? []), ...(catalog.cheap_verified ?? [])];
  const viable = pool.filter((m) => m && typeof m.id === 'string'
    && Number.isFinite(m.aa_intelligence_index) && m.aa_intelligence_index >= minAa
    && Number.isFinite(m.input_per_1m) && Number.isFinite(m.output_per_1m)
    && m.input_per_1m >= 0 && m.output_per_1m >= 0
    && m.input_per_1m <= maxUsdPerMtok && m.output_per_1m <= maxUsdPerMtok
    && typeof m.family === 'string' && m.family)
    .sort((a, b) => (a.input_per_1m + a.output_per_1m) - (b.input_per_1m + b.output_per_1m));
  if (!viable.length) throw new Error(`no viable daily worker (AA >= ${minAa}, <= $${maxUsdPerMtok}/Mtok prompt+completion)`);
  const producer = viable[0];
  const critic = viable.find((m) => m.family !== producer.family);
  if (!critic) throw new Error(`no different-family critic available (producer family: ${producer.family})`);
  return { producer, critic };
}

// --- Staging / commit scope / publication -----------------------------------
// Parse `git status --porcelain=v1` output. Handles modified/added/deleted/
// untracked and `R  old -> new` renames, including C-quoted paths. Returned
// paths are repo-relative, unquoted.
export function parseStatusPorcelain(text) {
  const rows = [];
  for (const line of String(text ?? '').split('\n')) {
    if (!line.trim()) continue;
    const code = line.slice(0, 2);
    let path = line.slice(3);
    if (code.includes('R') || code.includes('C')) {
      const arrow = path.lastIndexOf(' -> ');
      if (arrow >= 0) path = path.slice(arrow + 4);
    }
    rows.push({ code, path: unquoteGitPath(path) });
  }
  return rows;
}

function unquoteGitPath(path) {
  const trimmed = path.trim();
  if (!trimmed.startsWith('"')) return trimmed;
  try { return JSON.parse(trimmed); } catch { return trimmed.slice(1, -1); }
}

// Which paths may a daily staging commit contain? Data, plus explicitly
// declared new source evidence (reported by refreshBenchmarks). Anything else
// blocks publication — a daily run must never smuggle ops or app changes.
export function assessCommitScope(changedPaths, extraAllowed = []) {
  const prefixes = [...ALLOWED_COMMIT_PREFIXES];
  const extras = new Set(extraAllowed.filter((p) => typeof p === 'string' && p && !p.startsWith('/') && !p.includes('..')));
  const allowed = []; const rejected = [];
  for (const raw of changedPaths) {
    const path = String(raw ?? '');
    if (!path || path.startsWith('/') || path.split('/').includes('..')) { rejected.push(path); continue; }
    if (prefixes.some((p) => path.startsWith(p)) || extras.has(path)) allowed.push(path);
    else rejected.push(path);
  }
  return { ok: rejected.length === 0, hasChanges: changedPaths.length > 0, allowed, rejected };
}

// Publication decision. Rollback semantics: anything other than `publish`
// leaves main untouched; the staged workdir is simply retained for inspection.
export function planPublication({ dryRun = false, checksOk = false, scope } = {}) {
  if (!checksOk) return { action: 'abort', reason: 'one or more collection/review/check steps failed; main stays untouched' };
  if (!scope?.ok) return { action: 'abort', reason: `commit scope rejected (outside data/evidence): ${(scope?.rejected ?? []).join(', ') || 'unknown'}` };
  if (!scope.hasChanges) return { action: 'skip', reason: 'no data changes; nothing to commit' };
  if (dryRun) return { action: 'dry-run', reason: '--dry-run: commit/push/suppress active but withheld' };
  return { action: 'publish', reason: 'staged run green; ff-only publication allowed' };
}

// Final process exit code from the recorded step outcomes.
export function planExitCode(steps) {
  return (steps ?? []).some((s) => s.required !== false && !s.ok) ? 1 : 0;
}
