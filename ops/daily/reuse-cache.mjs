// CR-73.2: reuse a prior *verified* outcome for a source unit whose review inputs are
// byte-identical, and re-parse/re-review everything else.
//
// The 17 Sep baseline (ops/daily/PROFILE-CR73.md) spent 96.7 min of model time on 46 calls,
// and finding 4 of that profile says most of it re-checked data that had not moved: the seven
// live source contracts are reviewed every single day whether or not a byte of the captured
// primary bodies changed, and every vendor source is re-extracted by a producer even when its
// capture hash is identical to yesterday's. Re-running a review over an input that is identical
// down to the byte cannot produce new information; it can only produce a new sample of the same
// question, at the price of the whole run's wall clock.
//
// What this module does NOT do, on purpose (CR-20260917g, verbatim: no guarantee may be bought
// with speed):
//
//   * It never reuses a *rejection*, a retention or a deterministic fallback. Only an outcome
//     that a different-family critic accepted is eligible; anything else is re-reviewed, which
//     is always the safe direction.
//   * It never reuses across a change of anything the review depends on. The fingerprint binds
//     the complete row set (identity, pointer, staged value, primary extract and the capture
//     hash behind every row), the extraction contract, the criteria text, the reviewed parser
//     and verifier code, and this module's own version. One byte anywhere in that set and the
//     unit is a miss.
//   * It never treats a missing, unreadable or corrupt cache as a hit. Every failure mode is a
//     miss, counted and reported.
//   * It never ages a decision in silently: an entry older than `maxAgeDays` is a miss, because
//     code the fingerprint does not bind (the gauntlet itself, the worker policy) does drift.
//
// Every hit is recorded with its provenance — fingerprint, the run that produced the accepted
// outcome, its date, and the capture hashes it was taken over — in the run report and in the
// unit's manifest, so a reader of any run can tell a fresh review from a reused one and can
// re-derive the fingerprint themselves.
import { createHash } from 'node:crypto';
import { mkdir, readFile, appendFile, rename, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/** Bump when the meaning of a cached decision changes; every older entry becomes a miss. */
export const REUSE_CACHE_VERSION = '1';
/** A decision older than this is re-reviewed even on identical inputs (code the fingerprint does not bind drifts). */
export const DEFAULT_MAX_AGE_DAYS = 30;
/** Rewrite the append-only log once it grows past this many lines. */
export const COMPACT_AT_LINES = 2000;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Stable key order, so a fingerprint depends on content and never on property order. */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

/**
 * The fingerprint of one reviewable source unit. `kind` and `id` name the unit, `inputs` is
 * everything the review reads: the rows, the contract, the criteria and the code versions.
 * Callers must leave run-varying metadata (timestamps, receipt paths, run ids) out of `inputs`
 * — `reuse-cache` cannot tell which fields are volatile, so the caller states the semantics.
 */
export function unitFingerprint({ kind, id, inputs }) {
  if (typeof kind !== 'string' || !kind.trim()) throw new Error('unitFingerprint requires a kind');
  if (typeof id !== 'string' || !id.trim()) throw new Error('unitFingerprint requires an id');
  if (inputs === undefined) throw new Error('unitFingerprint requires inputs');
  return sha256(JSON.stringify(canonical({ v: REUSE_CACHE_VERSION, kind, id, inputs })));
}

/** Reuse is opt-in: an unset or unusable flag means "review everything", never "guess". */
export function reuseEnabled(env = process.env) {
  const raw = env.BH_DAILY_REUSE;
  if (raw === undefined || raw === '' || raw === '0' || raw === 'false') return false;
  if (raw === '1' || raw === 'true') return true;
  throw new Error('BH_DAILY_REUSE must be 0/false or 1/true');
}

function usableEntry(entry, { now, maxAgeDays }) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.cache_version !== REUSE_CACHE_VERSION) return null;
  if (typeof entry.fingerprint !== 'string' || entry.fingerprint.length !== 64) return null;
  if (entry.decision !== 'accepted') return null; // rejections and fallbacks are always re-reviewed
  const at = Date.parse(entry.accepted_at ?? '');
  if (!Number.isFinite(at)) return null;
  if (now - at > maxAgeDays * 86_400_000) return null;
  if (!entry.outcome || typeof entry.outcome !== 'object') return null;
  return entry;
}

/**
 * Open (or create) the reuse log at `dir/reuse-cache.jsonl`.
 *
 * A disabled cache is a working object that misses on everything and writes nothing, so callers
 * need no branch of their own. Unreadable files, unparsable lines and entries of another version
 * are misses and are counted in `stats()`.
 */
export async function openReuseCache({
  dir, enabled = false, maxAgeDays = DEFAULT_MAX_AGE_DAYS, now = () => Date.now(), log = console,
} = {}) {
  const file = dir ? join(dir, 'reuse-cache.jsonl') : null;
  const entries = new Map();
  const stats = { enabled: !!enabled && !!file, hits: 0, misses: 0, stored: 0, corrupt_lines: 0, expired: 0, entries_loaded: 0, file };
  let lines = 0;

  if (stats.enabled) {
    let text = '';
    try { text = await readFile(file, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') { log.warn?.(`reuse cache unreadable (${error.message}); every unit will be reviewed fresh`); stats.unreadable = error.message; } }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      lines++;
      let parsed = null;
      try { parsed = JSON.parse(line); } catch { stats.corrupt_lines++; continue; }
      if (!parsed || typeof parsed.fingerprint !== 'string') { stats.corrupt_lines++; continue; }
      entries.set(parsed.fingerprint, parsed); // last write wins
    }
    stats.entries_loaded = entries.size;
  }

  return {
    stats: () => ({ ...stats }),
    /** The reusable accepted outcome for this fingerprint, or null. Every non-hit is a miss. */
    get(fingerprint) {
      if (!stats.enabled) { stats.misses++; return null; }
      const raw = entries.get(fingerprint);
      if (raw && raw.cache_version === REUSE_CACHE_VERSION && raw.decision === 'accepted'
        && !usableEntry(raw, { now: now(), maxAgeDays })) stats.expired++;
      const entry = usableEntry(raw, { now: now(), maxAgeDays });
      if (!entry) { stats.misses++; return null; }
      stats.hits++;
      return entry;
    },
    /**
     * Record an accepted outcome. Anything but `decision: 'accepted'` is refused rather than
     * stored, so a later bug cannot turn a withheld source into a reusable pass.
     */
    async put({ fingerprint, kind, id, decision, outcome, run_id = null, captures = [], note = null }) {
      if (!stats.enabled) return false;
      if (decision !== 'accepted') return false;
      if (typeof fingerprint !== 'string' || fingerprint.length !== 64) throw new Error('reuse cache put requires a sha256 fingerprint');
      const entry = {
        cache_version: REUSE_CACHE_VERSION, fingerprint, kind, id, decision,
        accepted_at: new Date(now()).toISOString(), run_id, captures, note, outcome,
      };
      entries.set(fingerprint, entry);
      stats.stored++;
      await mkdir(dirname(file), { recursive: true });
      await appendFile(file, JSON.stringify(entry) + '\n');
      lines++;
      if (lines > COMPACT_AT_LINES) await compact();
      return true;
    },
  };

  async function compact() {
    const temporary = `${file}.compacting`;
    await writeFile(temporary, [...entries.values()].map((e) => JSON.stringify(e)).join('\n') + '\n');
    await rename(temporary, file);
    lines = entries.size;
  }
}

/**
 * The provenance line a reused decision carries into the manifest and the run report. It names
 * the fingerprint, the run and day the acceptance came from, and the captures it was taken over,
 * so nothing about a reuse has to be taken on trust.
 */
export function reuseProvenance(entry, { at = new Date().toISOString() } = {}) {
  return {
    reused: true,
    cache_version: entry.cache_version,
    fingerprint: entry.fingerprint,
    accepted_at: entry.accepted_at,
    accepted_run_id: entry.run_id ?? null,
    captures: entry.captures ?? [],
    reused_at: at,
    note: 'CR-73.2: inputs byte-identical to the run named above (rows, capture hashes, contract, criteria, reviewed code). No worker call was made for this unit.',
  };
}
