-- CR-251: public /submit page. One row per model submission (regular queue or fast lane). Idempotent; the runtime
-- copy is MODEL_SUBMISSIONS_SCHEMA_SQL in lib/accounts-schema.mjs (test/cr-251-model-submission.test.mjs keeps them identical).
-- The API key is stored only as RSA-OAEP/AES-GCM ciphertext (lib/submission-crypto.mjs); it is deleted after the evaluation.
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

CREATE TABLE IF NOT EXISTS bh_model_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  model_name text,
  github_url text,
  huggingface_url text,
  api_url text,
  description text,
  contact_email text NOT NULL,
  contact_x text,
  benchmarks text[] NOT NULL,
  followup_benchmark text,
  followup_key text,
  followup_name text,
  followup_rank int,
  api_key_ciphertext text,
  api_key_present boolean NOT NULL DEFAULT false,
  api_key_deleted_at timestamptz,
  fast_lane boolean NOT NULL DEFAULT false,
  priority_request_id uuid REFERENCES bh_priority_evaluation_requests(id),
  status text NOT NULL DEFAULT 'queued',
  queued_at timestamptz,
  ip_hash text NOT NULL,
  stripe_mode text,
  intake_synced_at timestamptz,
  confirmation_status text NOT NULL DEFAULT 'pending',
  confirmation_attempts int NOT NULL DEFAULT 0,
  admin_note text
);
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS followup_benchmark text;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS followup_key text;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS followup_name text;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS followup_rank int;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS api_key_ciphertext text;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS api_key_present boolean NOT NULL DEFAULT false;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS api_key_deleted_at timestamptz;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS fast_lane boolean NOT NULL DEFAULT false;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS priority_request_id uuid REFERENCES bh_priority_evaluation_requests(id);
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS queued_at timestamptz;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS stripe_mode text;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS intake_synced_at timestamptz;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS confirmation_status text NOT NULL DEFAULT 'pending';
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS confirmation_attempts int NOT NULL DEFAULT 0;
ALTER TABLE bh_model_submissions ADD COLUMN IF NOT EXISTS admin_note text;
-- status: awaiting_payment | queued | in_evaluation | evaluated | rejected | spam | withdrawn
-- confirmation_status: pending | sent | failed | skipped
CREATE INDEX IF NOT EXISTS bh_model_submissions_status_queued_idx ON bh_model_submissions (status, queued_at);
CREATE INDEX IF NOT EXISTS bh_model_submissions_ip_idx ON bh_model_submissions (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS bh_model_submissions_created_idx ON bh_model_submissions (created_at);
ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS model_submission_id uuid;
