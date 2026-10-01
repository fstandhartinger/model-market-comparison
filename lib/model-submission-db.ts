import type { PoolClient } from 'pg';
import { accountsDb } from './priority-evaluation-db';
import { RATE_LIMITS } from './submission-guard.mjs';
import type { ModelSubmission } from './model-submission.mjs';

export type SubmissionRow = {
  id: string; submission_id: string; created_at: Date; model_name: string | null; github_url: string | null;
  huggingface_url: string | null; api_url: string | null; contact_email: string; contact_x: string | null;
  benchmarks: string[]; followup_benchmark: string | null; followup_name: string | null; followup_rank: number | null;
  api_key_present: boolean; fast_lane: boolean; priority_request_id: string | null; status: string;
  queued_at: Date | null; intake_synced_at: Date | null; confirmation_status: string;
  priority_status?: string | null; priority_paid_at?: Date | null; queue_position?: number | null;
};

export const SUBMISSION_STATUSES = ['awaiting_payment', 'queued', 'in_evaluation', 'evaluated', 'rejected', 'spam', 'withdrawn'] as const;

export type InsertResult =
  | { kind: 'created' | 'existing'; id: string; status: string; fastLane: boolean }
  | { kind: 'rate_limited' }
  | { kind: 'conflict' };

/**
 * Idempotent on the client's submission_id, rate-limited per ip_hash (5/hour, 20/day) and globally (300/day).
 * One transaction under a per-ip advisory lock so parallel posts cannot slip past the counters.
 */
export async function insertSubmission(
  v: ModelSubmission, opts: { ipHash: string; apiKeyCiphertext: string | null; stripeMode: string | null },
): Promise<InsertResult> {
  const pool = await accountsDb();
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [opts.ipHash]);
    const existing = await client.query(
      'SELECT id, status, fast_lane, contact_email, model_name FROM bh_model_submissions WHERE submission_id=$1', [v.submissionId]);
    const row = existing.rows[0];
    if (row) {
      await client.query('COMMIT');
      if (row.contact_email !== v.email || row.model_name !== v.modelName || row.fast_lane !== v.fastLane) return { kind: 'conflict' };
      return { kind: 'existing', id: row.id, status: row.status, fastLane: row.fast_lane };
    }
    const counts = await client.query(
      `SELECT count(*) FILTER (WHERE ip_hash=$1 AND created_at > now() - interval '1 hour')::int AS hour,
              count(*) FILTER (WHERE ip_hash=$1)::int AS day, count(*)::int AS total
       FROM bh_model_submissions WHERE created_at > now() - interval '24 hours'`, [opts.ipHash]);
    const c = counts.rows[0];
    if (c.hour >= RATE_LIMITS.perIpHour || c.day >= RATE_LIMITS.perIpDay || c.total >= RATE_LIMITS.globalDay) {
      await client.query('ROLLBACK');
      return { kind: 'rate_limited' };
    }
    const inserted = await client.query(
      `INSERT INTO bh_model_submissions
        (submission_id, model_name, github_url, huggingface_url, api_url, description, contact_email, contact_x, benchmarks,
         followup_benchmark, followup_key, followup_name, followup_rank, api_key_ciphertext, api_key_present,
         fast_lane, status, queued_at, ip_hash, stripe_mode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,CASE WHEN $16 THEN NULL ELSE now() END,$18,$19)
       RETURNING id, status, fast_lane`,
      [v.submissionId, v.modelName, v.githubUrl || null, v.huggingfaceUrl || null, v.apiUrl || null, v.description || null,
        v.email, v.contactX || null, v.benchmarks, v.followup?.benchmark ?? null, v.followup?.key ?? null,
        v.followup?.name ?? null, v.followup?.rank ?? null, opts.apiKeyCiphertext, Boolean(opts.apiKeyCiphertext),
        v.fastLane, v.fastLane ? 'awaiting_payment' : 'queued', opts.ipHash, v.fastLane ? opts.stripeMode : null],
    );
    await client.query('COMMIT');
    const r = inserted.rows[0];
    return { kind: 'created', id: r.id, status: r.status, fastLane: r.fast_lane };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

/** Called while the priority request is prepared, so the webhook can find the submission when payment arrives. */
export async function linkPriorityRequest(submissionUuid: string, priorityRequestId: string) {
  const pool = await accountsDb();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE bh_model_submissions SET priority_request_id=$2, updated_at=now() WHERE submission_id=$1`, [submissionUuid, priorityRequestId]);
    await client.query(
      `UPDATE bh_priority_evaluation_requests SET model_submission_id=(SELECT id FROM bh_model_submissions WHERE submission_id=$1)
       WHERE id=$2`, [submissionUuid, priorityRequestId]);
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

export async function queuePosition(id: string): Promise<number | null> {
  const pool = await accountsDb();
  const r = await pool.query(
    `SELECT count(*)::int AS n FROM bh_model_submissions
     WHERE status='queued' AND fast_lane=false AND queued_at <= (SELECT queued_at FROM bh_model_submissions WHERE id=$1)`, [id]);
  return r.rows[0]?.n ?? null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** For the success page: only non-sensitive fields, looked up by the client's idempotency UUID. */
export async function submissionForPage(submissionUuid: string) {
  if (!UUID.test(submissionUuid)) return null;
  const pool = await accountsDb();
  const r = await pool.query(
    `SELECT s.id, s.model_name, s.status, s.fast_lane, s.benchmarks, p.status AS priority_status, p.paid_at
     FROM bh_model_submissions s LEFT JOIN bh_priority_evaluation_requests p ON p.id = s.priority_request_id
     WHERE s.submission_id=$1`, [submissionUuid]);
  return (r.rows[0] as { id: string; model_name: string | null; status: string; fast_lane: boolean; benchmarks: string[]; priority_status: string | null; paid_at: Date | null } | undefined) ?? null;
}

/** Cancel page: drop the fast lane and put the submission into the regular queue (never touches a paid request). */
export async function withoutFastLane(submissionUuid: string): Promise<'queued' | 'already_queued' | 'paid' | 'not_found'> {
  if (!UUID.test(submissionUuid)) return 'not_found';
  const pool = await accountsDb();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const s = await client.query(
      'SELECT id, status, fast_lane, priority_request_id FROM bh_model_submissions WHERE submission_id=$1 FOR UPDATE', [submissionUuid]);
    const row = s.rows[0];
    if (!row) { await client.query('ROLLBACK'); return 'not_found'; }
    if (row.status !== 'awaiting_payment') {
      await client.query('COMMIT');
      return row.fast_lane ? 'paid' : 'already_queued';
    }
    if (row.priority_request_id) {
      const p = await client.query('SELECT status FROM bh_priority_evaluation_requests WHERE id=$1 FOR UPDATE', [row.priority_request_id]);
      const status = p.rows[0]?.status;
      if (status && status !== 'checkout_pending' && status !== 'checkout_failed' && status !== 'expired') { await client.query('COMMIT'); return 'paid'; }
      await client.query(
        `UPDATE bh_priority_evaluation_requests SET status='checkout_failed', updated_at=now() WHERE id=$1 AND status='checkout_pending'`,
        [row.priority_request_id]);
    }
    await client.query(
      `UPDATE bh_model_submissions SET fast_lane=false, status='queued', queued_at=now(), updated_at=now() WHERE id=$1`, [row.id]);
    await client.query('COMMIT');
    return 'queued';
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

export async function listSubmissions(status: string | null, limit = 200): Promise<SubmissionRow[]> {
  const pool = await accountsDb();
  const r = await pool.query(
    `SELECT s.id, s.submission_id, s.created_at, s.model_name, s.github_url, s.huggingface_url, s.api_url, s.contact_email,
            s.contact_x, s.benchmarks, s.followup_benchmark, s.followup_name, s.followup_rank, s.api_key_present, s.fast_lane,
            s.priority_request_id, s.status, s.queued_at, s.intake_synced_at, s.confirmation_status,
            p.status AS priority_status, p.paid_at AS priority_paid_at,
            CASE WHEN s.status='queued' AND s.fast_lane=false THEN
              (SELECT count(*)::int FROM bh_model_submissions q WHERE q.status='queued' AND q.fast_lane=false AND q.queued_at <= s.queued_at)
            END AS queue_position
     FROM bh_model_submissions s LEFT JOIN bh_priority_evaluation_requests p ON p.id = s.priority_request_id
     WHERE ($1::text IS NULL OR s.status=$1)
     ORDER BY s.created_at DESC LIMIT $2`, [status, limit]);
  return r.rows as SubmissionRow[];
}

export async function setSubmissionStatus(id: string, status: 'spam' | 'rejected') {
  const pool = await accountsDb();
  await pool.query(
    `UPDATE bh_model_submissions SET status=$2, updated_at=now() WHERE id=$1 AND status IN ('queued','awaiting_payment')`, [id, status]);
}
