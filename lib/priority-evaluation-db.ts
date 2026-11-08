import { Pool, type PoolClient } from 'pg';
import { ACCOUNTS_SCHEMA_SQL, INTAKE_REVIEW_SCHEMA_SQL, MODEL_SUBMISSIONS_SCHEMA_SQL } from './accounts-schema.mjs';
import { DUPLICATE_STATUSES, DUPLICATE_WINDOW_HOURS, findDuplicate, payableRow } from './priority-intake.mjs';

type Submission = {
  submissionId: string; email: string; modelName: string; modelLink: string; codeLink: string;
  accessType: 'open_weights' | 'api_endpoint'; accessInstructions: string; notes: string;
  pricingTier: 'api_or_small_open' | 'large_open_gpu'; benchmarks: string[];
  visibility: 'public' | 'private'; quote: { currency: 'usd'; unitAmount: number; quantity: number; totalAmount: number };
  apiUrl?: string; apiPublic?: boolean; confirmDuplicate?: boolean; requestReview?: boolean;
};

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function privateHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

export async function accountsDb(): Promise<Pool> {
  const url = process.env.ACCOUNTS_DATABASE_URL;
  if (!url) throw new Error('Accounts database is not configured');
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: privateHost(new URL(url).hostname) ? false : { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  ready ??= pool.query(ACCOUNTS_SCHEMA_SQL).then(() => pool!.query(MODEL_SUBMISSIONS_SCHEMA_SQL))
    .then(() => pool!.query(INTAKE_REVIEW_SCHEMA_SQL)).then(() => undefined).catch((err) => { ready = null; throw err; });
  await ready;
  return pool;
}

const sameSubmission = (row: Record<string, unknown>, input: Submission) =>
  row.email === input.email && row.model_name === input.modelName && row.model_link === input.modelLink &&
  row.code_link === input.codeLink && row.access_type === input.accessType &&
  row.access_instructions === input.accessInstructions && row.notes === input.notes &&
  row.pricing_tier === input.pricingTier && JSON.stringify(row.benchmarks) === JSON.stringify(input.benchmarks) &&
  row.visibility === input.visibility && Number(row.base_amount) === input.quote.totalAmount;

export class PrioritySubmissionConflict extends Error {}

export async function preparePriorityRequest(input: Submission, stripeMode: 'test' | 'live') {
  const p = await accountsDb();
  const inserted = await p.query(
    `INSERT INTO bh_priority_evaluation_requests
      (submission_id, email, model_name, model_link, code_link, access_type, access_instructions, notes,
       benchmarks, visibility, pricing_tier, unit_amount, quantity, base_amount, stripe_mode)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (submission_id) DO NOTHING
     RETURNING id, checkout_url, status`,
    [input.submissionId, input.email, input.modelName, input.modelLink, input.codeLink, input.accessType,
      input.accessInstructions, input.notes, input.benchmarks, input.visibility, input.pricingTier,
      input.quote.unitAmount, input.quote.quantity, input.quote.totalAmount, stripeMode],
  );
  if (inserted.rows[0]) return { id: inserted.rows[0].id as string, checkoutUrl: inserted.rows[0].checkout_url as string | null, status: inserted.rows[0].status as string };

  const existing = await p.query('SELECT * FROM bh_priority_evaluation_requests WHERE submission_id = $1', [input.submissionId]);
  const row = existing.rows[0] as Record<string, unknown> | undefined;
  if (!row || !sameSubmission(row, input) || row.stripe_mode !== stripeMode) throw new PrioritySubmissionConflict('This submission ID belongs to a different request. Refresh and try again.');
  if (row.checkout_url && row.status === 'checkout_pending') return { id: row.id as string, checkoutUrl: row.checkout_url as string, status: row.status as string };
  if (row.status !== 'checkout_pending' && row.status !== 'checkout_failed') throw new PrioritySubmissionConflict('This request is already paid or closed. Contact us if you need help.');
  await p.query("UPDATE bh_priority_evaluation_requests SET status='checkout_pending', updated_at=now() WHERE id=$1", [row.id]);
  return { id: row.id as string, checkoutUrl: null, status: 'checkout_pending' };
}

/** Duplicate-payment guard: same lower(email) + same normalised model link, ordered/paid in the last 24 h. */
export async function findRecentDuplicate(input: Submission) {
  const p = await accountsDb();
  const rows = await p.query(
    `SELECT submission_id, email, model_name, model_link, code_link, status, checkout_session_id, created_at
     FROM bh_priority_evaluation_requests
     WHERE lower(email) = lower($1) AND created_at > now() - make_interval(hours => $2) AND status = ANY($3::text[])`,
    [input.email, DUPLICATE_WINDOW_HOURS, DUPLICATE_STATUSES],
  );
  return findDuplicate(rows.rows, input);
}

/** Stores a request that needs manual review: no Stripe session, status awaiting_review. Idempotent on submission_id. */
export async function holdPriorityRequestForReview(input: Submission, stripeMode: 'test' | 'live', intake: Record<string, unknown>) {
  const p = await accountsDb();
  const check = JSON.stringify({ ...intake, checkedAt: new Date().toISOString() });
  const inserted = await p.query(
    `INSERT INTO bh_priority_evaluation_requests
      (submission_id, email, model_name, model_link, code_link, access_type, access_instructions, notes,
       benchmarks, visibility, pricing_tier, unit_amount, quantity, base_amount, stripe_mode, status, intake_check)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'awaiting_review',$16::jsonb)
     ON CONFLICT (submission_id) DO NOTHING
     RETURNING id`,
    [input.submissionId, input.email, input.modelName, input.modelLink, input.codeLink, input.accessType,
      input.accessInstructions, input.notes, input.benchmarks, input.visibility, input.pricingTier,
      input.quote.unitAmount, input.quote.quantity, input.quote.totalAmount, stripeMode, check],
  );
  if (inserted.rows[0]) return { id: inserted.rows[0].id as string };
  const existing = await p.query('SELECT * FROM bh_priority_evaluation_requests WHERE submission_id = $1', [input.submissionId]);
  const row = existing.rows[0] as Record<string, unknown> | undefined;
  if (!row || !sameSubmission(row, input) || row.stripe_mode !== stripeMode || row.status !== 'awaiting_review') {
    throw new PrioritySubmissionConflict('This submission ID belongs to a different request. Refresh and try again.');
  }
  await p.query("UPDATE bh_priority_evaluation_requests SET intake_check=$2::jsonb, updated_at=now() WHERE id=$1 AND intake_approved_at IS NULL", [row.id, check]);
  return { id: row.id as string };
}

/** Approved review-first request for /pay/<id>?token=. null unless the id, token and approval all match (payableRow). */
export async function findPayableRequest(id: string, token: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const p = await accountsDb();
  const res = await p.query('SELECT * FROM bh_priority_evaluation_requests WHERE id=$1', [id]);
  return payableRow(res.rows[0] as Record<string, unknown> | undefined ?? null, id, token) as Record<string, unknown> | null;
}

/** awaiting_review -> checkout_pending for an approved request (idempotent: an existing live session is returned). */
export async function prepareApprovedRequest(row: Record<string, unknown>) {
  const p = await accountsDb();
  const id = row.id as string;
  if (row.status === 'checkout_pending' && row.checkout_url) return { id, checkoutUrl: row.checkout_url as string, status: 'checkout_pending' };
  const moved = await p.query(
    `UPDATE bh_priority_evaluation_requests SET status='checkout_pending', updated_at=now()
     WHERE id=$1 AND status IN ('awaiting_review','checkout_pending') AND checkout_session_id IS NULL AND intake_approved_at IS NOT NULL
     RETURNING id`, [id]);
  if (!moved.rows[0]) {
    const again = await p.query('SELECT status, checkout_url FROM bh_priority_evaluation_requests WHERE id=$1', [id]);
    if (again.rows[0]?.checkout_url && again.rows[0].status === 'checkout_pending') return { id, checkoutUrl: again.rows[0].checkout_url as string, status: 'checkout_pending' };
    throw new PrioritySubmissionConflict('This payment link is no longer valid. Contact us if you need help.');
  }
  return { id, checkoutUrl: null, status: 'checkout_pending' };
}

/** A failed session creation puts an approved request back so the same link can be tried again. */
export async function revertApprovedRequest(requestId: string) {
  const p = await accountsDb();
  await p.query(
    `UPDATE bh_priority_evaluation_requests SET status='awaiting_review', updated_at=now()
     WHERE id=$1 AND status='checkout_pending' AND checkout_session_id IS NULL AND intake_approved_at IS NOT NULL`, [requestId]);
}

export async function saveCheckoutSession(requestId: string, sessionId: string, checkoutUrl: string) {
  const p = await accountsDb();
  await p.query(
    `UPDATE bh_priority_evaluation_requests SET checkout_session_id=$2, checkout_url=$3, updated_at=now()
     WHERE id=$1 AND status='checkout_pending'`,
    [requestId, sessionId, checkoutUrl],
  );
}

export async function markCheckoutFailed(requestId: string) {
  const p = await accountsDb();
  await p.query(
    `UPDATE bh_priority_evaluation_requests SET status='checkout_failed', updated_at=now()
     WHERE id=$1 AND status='checkout_pending' AND checkout_session_id IS NULL`,
    [requestId],
  );
}

type CheckoutEvent = {
  eventId: string; eventType: string; requestId: string; mode: 'test' | 'live';
  // ISO time from the signed event's `created` field; the 48-hour delivery clock starts here.
  paidAt: string;
  session: {
    id?: unknown; mode?: unknown; status?: unknown; payment_status?: unknown; currency?: unknown;
    amount_subtotal?: unknown; amount_total?: unknown; payment_intent?: unknown;
    client_reference_id?: unknown; metadata?: Record<string, unknown> | null;
  };
};

export async function recordPaidCheckout(input: CheckoutEvent): Promise<'recorded' | 'duplicate' | 'already_paid'> {
  const { session } = input;
  const requestId = input.requestId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new Error('Invalid request reference');
  if (typeof input.eventId !== 'string' || !input.eventId.startsWith('evt_') || input.eventId.length > 128) throw new Error('Invalid webhook event reference');
  if (input.eventType !== 'checkout.session.completed' || session.mode !== 'payment' || session.status !== 'complete' || session.payment_status !== 'paid') throw new Error('Checkout session is not a completed payment');
  if (session.metadata?.priority_request_id !== requestId || session.client_reference_id !== requestId) throw new Error('Checkout reference does not match');
  if (session.currency !== 'usd' || typeof session.amount_subtotal !== 'number' || !Number.isSafeInteger(session.amount_subtotal) || typeof session.amount_total !== 'number' || !Number.isSafeInteger(session.amount_total)) throw new Error('Checkout amount is invalid');
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : '';
  if (!paymentIntent.startsWith('pi_')) throw new Error('Checkout payment reference is invalid');
  if (typeof session.id !== 'string' || !session.id.startsWith('cs_')) throw new Error('Checkout session reference is invalid');
  if (typeof input.paidAt !== 'string' || Number.isNaN(Date.parse(input.paidAt))) throw new Error('Checkout payment time is invalid');

  const p = await accountsDb();
  const client: PoolClient = await p.connect();
  try {
    await client.query('BEGIN');
    const request = await client.query(
      'SELECT id, stripe_mode, checkout_session_id, base_amount, status, payment_intent_id FROM bh_priority_evaluation_requests WHERE id=$1 FOR UPDATE',
      [requestId],
    );
    const row = request.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new Error('Priority request was not found');
    if (row.stripe_mode !== input.mode) throw new Error('Payment mode does not match request');
    if (Number(row.base_amount) !== session.amount_subtotal || session.amount_total < session.amount_subtotal) throw new Error('Payment amount does not match request');
    if (row.checkout_session_id && row.checkout_session_id !== session.id) throw new Error('Checkout session does not match request');
    if (row.payment_intent_id && row.payment_intent_id !== paymentIntent) throw new Error('Payment intent does not match request');

    const event = await client.query(
      `INSERT INTO bh_priority_eval_webhook_events (event_id, event_type, request_id)
       VALUES ($1,$2,$3) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [input.eventId, input.eventType, requestId],
    );
    if (event.rowCount === 0) {
      await client.query('COMMIT');
      return 'duplicate';
    }
    if (row.status === 'paid' || row.status === 'review_passed' || row.status === 'completed') {
      await client.query('COMMIT');
      return 'already_paid';
    }
    if (row.status !== 'checkout_pending' && row.status !== 'checkout_failed') throw new Error('Request is not awaiting payment');
    await client.query(
      `UPDATE bh_priority_evaluation_requests SET status='paid', checkout_session_id=$2, payment_intent_id=$3,
       amount_total=$4, notification_status='pending', paid_at=COALESCE(paid_at, $5::timestamptz), updated_at=now()
       WHERE id=$1`,
      [requestId, session.id, paymentIntent, session.amount_total, input.paidAt],
    );
    // CR-251: a /submit submission waiting on this payment joins the queue in the same transaction. If the visitor
    // already switched to the regular queue but still paid, the submission is marked as fast lane instead.
    await client.query(
      `UPDATE bh_model_submissions SET
         status=CASE WHEN status='awaiting_payment' THEN 'queued' ELSE status END,
         fast_lane=true, queued_at=COALESCE(queued_at, now()), updated_at=now()
       WHERE priority_request_id=$1 AND status IN ('awaiting_payment','queued')`,
      [requestId],
    );
    await client.query('COMMIT');
    return 'recorded';
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

/** The /submit record linked to a priority request (for the success/cancel URLs), or null. */
export async function linkedSubmissionUuid(requestId: string): Promise<string | null> {
  const p = await accountsDb();
  const res = await p.query(
    'SELECT s.submission_id FROM bh_model_submissions s JOIN bh_priority_evaluation_requests r ON r.model_submission_id = s.id WHERE r.id=$1', [requestId]);
  return (res.rows[0]?.submission_id as string | undefined) ?? null;
}
