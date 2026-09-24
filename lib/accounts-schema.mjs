// Runtime copy of the idempotent db/accounts/*.sql migrations; test/account-sync.test.mjs asserts the bytes stay identical.
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
  review_passed_at timestamptz,
  result_delivered_at timestamptz,
  refund_id text UNIQUE,
  refund_idempotency_key text,
  refund_attempts integer NOT NULL DEFAULT 0 CHECK (refund_attempts >= 0),
  refund_status text,
  refunded_at timestamptz,
  notification_status text NOT NULL DEFAULT 'not_due' CHECK (notification_status IN ('not_due', 'pending', 'sending', 'sent')),
  notification_attempts integer NOT NULL DEFAULT 0 CHECK (notification_attempts >= 0),
  last_notification_attempt_at timestamptz
);
CREATE INDEX IF NOT EXISTS bh_priority_eval_due_refund_idx
  ON bh_priority_evaluation_requests (review_passed_at)
  WHERE status = 'review_passed' AND result_delivered_at IS NULL;
CREATE INDEX IF NOT EXISTS bh_priority_eval_notification_idx
  ON bh_priority_evaluation_requests (created_at)
  WHERE status = 'paid' AND notification_status = 'pending';
CREATE TABLE IF NOT EXISTS bh_priority_eval_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  request_id uuid REFERENCES bh_priority_evaluation_requests(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
DO $$
BEGIN
  PERFORM set_config('lock_timeout', '2s', true);
  PERFORM pg_advisory_xact_lock(hashtext('bh_accounts_priority_eval_schema'));
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'bh_priority_evaluation_requests'
      AND column_name = 'refund_attention_notified_attempts'
  ) THEN
    ALTER TABLE bh_priority_evaluation_requests
      ADD COLUMN refund_attention_notified_attempts integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'bh_priority_evaluation_requests'
      AND column_name = 'refund_attention_notified_state'
  ) THEN
    ALTER TABLE bh_priority_evaluation_requests
      ADD COLUMN refund_attention_notified_state text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'bh_priority_evaluation_requests'
      AND column_name = 'refund_attempt_seq'
  ) THEN
    ALTER TABLE bh_priority_evaluation_requests
      ADD COLUMN refund_attempt_seq integer NOT NULL DEFAULT 0;
  END IF;
END $$;

UPDATE bh_priority_evaluation_requests
SET refund_attempt_seq = GREATEST(
  refund_attempts,
  refund_attention_notified_attempts,
  CASE WHEN refund_id IS NOT NULL OR refund_idempotency_key IS NOT NULL THEN 1 ELSE 0 END
)
WHERE refund_attempt_seq < GREATEST(
  refund_attempts,
  refund_attention_notified_attempts,
  CASE WHEN refund_id IS NOT NULL OR refund_idempotency_key IS NOT NULL THEN 1 ELSE 0 END
);
`;
