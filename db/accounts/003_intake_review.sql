-- Fast-lane SLA (Nov 2026): pre-payment intake check. Orders that fail the automatic check (unsupported runtime, private
-- endpoint, over the GPU cap) are stored as 'awaiting_review' WITHOUT a Stripe session; an agent approves them and the customer
-- pays through /api/priority-evaluation/pay/<id>?token=... . The 48-hour clock still starts at paid_at only.
-- Idempotent; the runtime copy is INTAKE_REVIEW_SCHEMA_SQL in lib/accounts-schema.mjs (test/priority-intake.test.mjs keeps them identical).
DO $$
DECLARE schema_lock_acquired boolean := false;
BEGIN
  FOR lock_attempt IN 1..300 LOOP
    IF pg_try_advisory_xact_lock(hashtext('bh_accounts_priority_eval_schema')) THEN
      schema_lock_acquired := true;
      EXIT;
    END IF;
    PERFORM pg_sleep(0.1);
  END LOOP;
  IF NOT schema_lock_acquired THEN
    RAISE EXCEPTION 'Timed out waiting for accounts schema initialization' USING ERRCODE = '55P03';
  END IF;
  PERFORM set_config('lock_timeout', '2s', true);
END $$;

ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS intake_check jsonb;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS intake_approved_at timestamptz;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS intake_approved_by text;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS pay_token_hash text;
-- Only the constraint on a database that does not know the new statuses yet is replaced (no table rewrite on later boots).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'bh_priority_evaluation_requests'::regclass
      AND conname = 'bh_priority_evaluation_requests_status_check'
      AND pg_get_constraintdef(oid) LIKE '%awaiting_review%'
  ) THEN
    ALTER TABLE bh_priority_evaluation_requests DROP CONSTRAINT IF EXISTS bh_priority_evaluation_requests_status_check;
    ALTER TABLE bh_priority_evaluation_requests ADD CONSTRAINT bh_priority_evaluation_requests_status_check CHECK (status IN (
      'checkout_pending', 'checkout_failed', 'paid', 'review_passed', 'refund_due',
      'refund_pending', 'refunded', 'completed', 'expired', 'awaiting_review', 'intake_declined'
    ));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS bh_priority_eval_awaiting_review_idx
  ON bh_priority_evaluation_requests (created_at) WHERE status = 'awaiting_review';
CREATE INDEX IF NOT EXISTS bh_priority_eval_email_created_idx
  ON bh_priority_evaluation_requests (lower(email), created_at);
