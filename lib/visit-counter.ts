import { Pool } from "pg";
import { privateHost } from "./accounts-db";
import { applyRetention, classifyRequest, createAccumulator, flushRows, visitReport, VISIT_STATS_SCHEMA_SQL } from "./visit-stats.mjs";

// CR-67.4: the Node side of the visitor statistics. Page views are added to in-memory daily totals and
// written to the accounts database (a separate table, never joined with accounts) once a minute.
// Without ACCOUNTS_DATABASE_URL nothing is counted.

const FLUSH_MS = 60_000;
const MAX_KEYS = 5_000;

type State = { acc: ReturnType<typeof createAccumulator>; pool: Pool | null; ready: Promise<unknown> | null; timer: NodeJS.Timeout | null;
  flushing: Promise<void> | null; retainedAt: number };
const g = globalThis as typeof globalThis & { __bhVisitStats?: State };
const state: State = (g.__bhVisitStats ??= { acc: createAccumulator(), pool: null, ready: null, timer: null, flushing: null, retainedAt: 0 });

function pool(): Pool | null {
  const url = process.env.ACCOUNTS_DATABASE_URL;
  if (!url) return null;
  if (!state.pool) {
    state.pool = new Pool({
      connectionString: url,
      ssl: privateHost(new URL(url).hostname) ? false : { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 10_000,
    });
    // An idle-connection error must never take the page server down; pg drops that client and the next query opens a new one.
    state.pool.on("error", (e) => console.warn("[visit-stats] pool error:", e.message));
  }
  return state.pool;
}

async function query(sql: string, params?: unknown[]) {
  const p = pool();
  if (!p) throw new Error("Visit statistics are not configured");
  state.ready ??= p.query(VISIT_STATS_SCHEMA_SQL).catch((e) => { state.ready = null; throw e; });
  await state.ready;
  return p.query(sql, params);
}

const RETENTION_EVERY_MS = 60 * 60_000;

async function flushOnce() {
  const rows = state.acc.take();
  try { await flushRows(query, rows); } catch (e) {
    state.acc.restore(rows, Date.now(), MAX_KEYS);
    console.warn("[visit-stats] flush failed:", (e as Error).message);
  }
  // Retention runs at least hourly while the process lives, with or without new page loads.
  if (Date.now() - state.retainedAt >= RETENTION_EVERY_MS) {
    try { await applyRetention(query); state.retainedAt = Date.now(); } catch (e) {
      console.warn("[visit-stats] retention failed:", (e as Error).message);
    }
  }
}

function flush(): Promise<void> {
  state.flushing ??= flushOnce().finally(() => { state.flushing = null; });
  return state.flushing;
}

export function countRequest(req: { method: string; url: string; headers: Headers }) {
  if (!process.env.ACCOUNTS_DATABASE_URL) return;
  const hit = classifyRequest(req);
  if (!hit) return;
  state.acc.add(hit, Date.now(), MAX_KEYS);
  ensureTimer();
}

function ensureTimer() {
  if (state.timer || !process.env.ACCOUNTS_DATABASE_URL) return;
  state.timer = setInterval(() => { void flush(); }, FLUSH_MS);
  state.timer.unref();
}
ensureTimer();

export async function readVisitReport(days: number) {
  await flush();
  return visitReport(query, days);
}

export const visitStatsConfigured = () => Boolean(process.env.ACCOUNTS_DATABASE_URL);
