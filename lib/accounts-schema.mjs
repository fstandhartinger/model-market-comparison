export const ACCOUNTS_SCHEMA_SQL = `-- CR-5.2: Benchmark Heaven accounts. Kept in its own database (ACCOUNTS_DATABASE_URL), apart from the
-- optional dataset database (DATABASE_URL). CR-5.5: only the Google account id, email, name and
-- avatar URL are stored about a person, plus their saved presets and settings.
CREATE TABLE IF NOT EXISTS bh_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub text NOT NULL UNIQUE,
  email text NOT NULL,
  name text,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bh_user_data (
  user_id uuid PRIMARY KEY REFERENCES bh_users(id) ON DELETE CASCADE,
  presets jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bh_priority_evaluation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL CHECK (length(email) <= 254),
  model_name text NOT NULL CHECK (length(model_name) BETWEEN 1 AND 120),
  model_link text NOT NULL DEFAULT '',
  code_link text NOT NULL DEFAULT '',
  access_type text NOT NULL CHECK (access_type IN ('open_weights', 'api_endpoint')),
  access_instructions text NOT NULL CHECK (length(access_instructions) BETWEEN 4 AND 800),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 1200),
  benchmarks text[] NOT NULL CHECK (
    cardinality(benchmarks) BETWEEN 1 AND 2
    AND benchmarks <@ ARRAY['jevbench', 'imagejevbench']::text[]
  ),
  visibility text NOT NULL CHECK (visibility IN ('public', 'private')),
  pricing_tier text NOT NULL CHECK (pricing_tier IN ('api_or_small_open', 'large_open_gpu')),
  unit_amount integer NOT NULL CHECK (unit_amount IN (4900, 9900)),
  quantity smallint NOT NULL CHECK (quantity BETWEEN 1 AND 2),
  base_amount integer NOT NULL CHECK (base_amount = unit_amount * quantity),
  currency text NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  stripe_mode text NOT NULL CHECK (stripe_mode IN ('test', 'live')),
  checkout_session_id text UNIQUE,
  checkout_url text,
  payment_intent_id text UNIQUE,
  amount_total integer CHECK (amount_total IS NULL OR amount_total >= base_amount),
  status text NOT NULL DEFAULT 'checkout_pending' CHECK (status IN (
    'checkout_pending', 'checkout_failed', 'paid', 'review_passed', 'refund_due',
    'refund_pending', 'refunded', 'completed', 'expired'
  )),
  paid_at timestamptz,
  review_passed_at timestamptz,
  review_basis text CHECK (review_basis IS NULL OR length(review_basis) <= 1200),
  result_delivered_at timestamptz,
  result_url text,
  refund_reason text,
  refund_id text UNIQUE,
  refund_idempotency_key text,
  refund_attempts integer NOT NULL DEFAULT 0 CHECK (refund_attempts >= 0),
  refund_status text,
  refunded_at timestamptz,
  notification_status text NOT NULL DEFAULT 'not_due' CHECK (notification_status IN ('not_due', 'pending', 'sending', 'sent')),
  notification_attempts integer NOT NULL DEFAULT 0 CHECK (notification_attempts >= 0),
  last_notification_attempt_at timestamptz,
  pickup_status text NOT NULL DEFAULT 'not_due' CHECK (pickup_status IN ('not_due','pending','starting','started','failed')),
  pickup_job_dir text,
  pickup_owner text,
  pickup_attempts integer NOT NULL DEFAULT 0 CHECK (pickup_attempts >= 0),
  last_pickup_attempt_at timestamptz,
  evaluation_status text NOT NULL DEFAULT 'pending' CHECK (evaluation_status IN ('pending','running','ready_for_release','failed','refused','test_complete')),
  release_status text NOT NULL DEFAULT 'not_due' CHECK (release_status IN ('not_due','pending','running','waiting_for_florian','waiting_on_customer','completed','failed')),
  release_job_dir text,
  synthetic_test boolean NOT NULL DEFAULT false,
  mail_last_checked_at timestamptz,
  board_status text NOT NULL DEFAULT 'not_due' CHECK (board_status IN ('not_due','pending','sending','sent','failed')),
  confirmation_status text NOT NULL DEFAULT 'not_due' CHECK (confirmation_status IN ('not_due','pending','sending','sent','failed','unknown')),
  review_email_status text NOT NULL DEFAULT 'not_due' CHECK (review_email_status IN ('not_due','pending','sending','sent','failed','unknown')),
  delivery_email_status text NOT NULL DEFAULT 'not_due' CHECK (delivery_email_status IN ('not_due','pending','sending','sent','failed','unknown')),
  refusal_email_status text NOT NULL DEFAULT 'not_due' CHECK (refusal_email_status IN ('not_due','approval_required','held','expired','sent')),
  customer_hold_started_at timestamptz,
  customer_hold_reason text,
  sla_paused_seconds integer NOT NULL DEFAULT 0 CHECK (sla_paused_seconds >= 0),
  sla_24h_alerted_at timestamptz,
  sla_36h_alerted_at timestamptz
);
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS review_basis text;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS result_url text;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS refund_reason text;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS pickup_status text NOT NULL DEFAULT 'not_due';
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS pickup_job_dir text;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS pickup_owner text;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS pickup_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS last_pickup_attempt_at timestamptz;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS evaluation_status text NOT NULL DEFAULT 'pending';
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS release_status text NOT NULL DEFAULT 'not_due';
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS release_job_dir text;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS synthetic_test boolean NOT NULL DEFAULT false;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS mail_last_checked_at timestamptz;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS board_status text NOT NULL DEFAULT 'not_due';
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS confirmation_status text NOT NULL DEFAULT 'not_due';
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS review_email_status text NOT NULL DEFAULT 'not_due';
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS delivery_email_status text NOT NULL DEFAULT 'not_due';
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS refusal_email_status text NOT NULL DEFAULT 'not_due';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='bh_priority_evaluation_requests'::regclass
      AND conname='bh_priority_evaluation_requests_refusal_email_status_check'
      AND pg_get_constraintdef(oid) NOT LIKE '%held%'
  ) THEN
    ALTER TABLE bh_priority_evaluation_requests DROP CONSTRAINT bh_priority_evaluation_requests_refusal_email_status_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='bh_priority_evaluation_requests'::regclass
      AND conname='bh_priority_evaluation_requests_refusal_email_status_check'
  ) THEN
    ALTER TABLE bh_priority_evaluation_requests ADD CONSTRAINT bh_priority_evaluation_requests_refusal_email_status_check
      CHECK (refusal_email_status IN ('not_due','approval_required','held','expired','sent'));
  END IF;
END $$;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS customer_hold_started_at timestamptz;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS customer_hold_reason text;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS sla_paused_seconds integer NOT NULL DEFAULT 0;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS sla_24h_alerted_at timestamptz;
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS sla_36h_alerted_at timestamptz;
UPDATE bh_priority_evaluation_requests SET paid_at=updated_at
  WHERE paid_at IS NULL AND payment_intent_id IS NOT NULL;
UPDATE bh_priority_evaluation_requests SET confirmation_status='sent'
  WHERE confirmation_status='not_due' AND payment_intent_id IS NOT NULL
    AND status IN ('paid','review_passed','refund_due','refund_pending','refunded','completed');
UPDATE bh_priority_evaluation_requests SET review_email_status='sent'
  WHERE review_email_status='not_due' AND review_passed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS bh_priority_eval_due_refund_idx
  ON bh_priority_evaluation_requests (review_passed_at)
  WHERE status = 'review_passed' AND result_delivered_at IS NULL;
CREATE INDEX IF NOT EXISTS bh_priority_eval_paid_due_refund_idx
  ON bh_priority_evaluation_requests (paid_at)
  WHERE status IN ('paid','review_passed') AND result_delivered_at IS NULL AND customer_hold_started_at IS NULL;
CREATE INDEX IF NOT EXISTS bh_priority_eval_notification_idx
  ON bh_priority_evaluation_requests (created_at)
  WHERE status = 'paid' AND notification_status = 'pending';
CREATE INDEX IF NOT EXISTS bh_priority_eval_pickup_idx
  ON bh_priority_evaluation_requests (created_at)
  WHERE status = 'paid' AND pickup_status = 'pending';
CREATE INDEX IF NOT EXISTS bh_priority_eval_release_idx
  ON bh_priority_evaluation_requests (paid_at)
  WHERE release_status = 'pending';
CREATE TABLE IF NOT EXISTS bh_priority_eval_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  request_id uuid REFERENCES bh_priority_evaluation_requests(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bh_priority_eval_customer_mail_events (
  gmail_message_id text PRIMARY KEY,
  gmail_thread_id text,
  request_id uuid NOT NULL REFERENCES bh_priority_evaluation_requests(id) ON DELETE CASCADE,
  sender_email text NOT NULL,
  subject text NOT NULL,
  received_at timestamptz NOT NULL,
  summary text NOT NULL,
  body_file text NOT NULL,
  notification_status text NOT NULL DEFAULT 'pending'
    CHECK (notification_status IN ('pending','sending','sent','failed')),
  board_status text NOT NULL DEFAULT 'pending'
    CHECK (board_status IN ('pending','sending','sent','failed')),
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bh_priority_eval_customer_mail_pending_idx
  ON bh_priority_eval_customer_mail_events (received_at)
  WHERE notification_status IN ('pending','failed');
`;
