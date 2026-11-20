-- Install on the trusted pickup database only. This migration grants no send authority.
SET LOCAL lock_timeout = '5s';
SELECT pg_advisory_xact_lock(hashtext('bh_accounts_priority_eval_schema'));

ALTER TABLE bh_priority_eval_transactional_mail
  DROP CONSTRAINT IF EXISTS bh_priority_eval_transactional_mail_template_key_check,
  DROP CONSTRAINT IF EXISTS bh_priority_eval_mail_decisor_v163_template_scope_check,
  DROP CONSTRAINT IF EXISTS bh_priority_eval_mail_exact_template_scope,
  ADD CONSTRAINT bh_priority_eval_mail_exact_template_scope CHECK (
    template_key IN ('payment_confirmation_v1','review_passed_v1','result_private_v1','result_public_v1')
    OR (template_key = 'decisor_result_public_v163_correction'
        AND request_id = '3687485f-5a51-4964-bd9a-73973f3494d7')
    OR (template_key = 'cd7e_late_result_v1'
        AND request_id = 'cd7e038c-dcac-4990-9ca5-feac99cd8d8d')
  );

CREATE TABLE IF NOT EXISTS bh_cd7e_late_result_authorizations (
  envelope_id uuid PRIMARY KEY REFERENCES bh_priority_eval_transactional_mail(id),
  generation text NOT NULL CHECK (generation ~ '^[a-zA-Z0-9_-]{1,80}$'),
  admission_sha256 text NOT NULL CHECK (admission_sha256 ~ '^[a-f0-9]{64}$'),
  identity_sha256 text NOT NULL CHECK (identity_sha256 ~ '^[a-f0-9]{64}$'),
  body_sha256 text NOT NULL CHECK (body_sha256 ~ '^[a-f0-9]{64}$'),
  refund_ref text NOT NULL CHECK (refund_ref ~ '^telegram:[0-9]+:[0-9]+$'),
  release_commit text NOT NULL CHECK (release_commit ~ '^[a-f0-9]{40}$'),
  result_url text NOT NULL CHECK (result_url = 'https://benchmarkheaven.com/jev-models'),
  expires_at timestamptz NOT NULL
);

CREATE OR REPLACE FUNCTION bh_cd7e_late_identity(r bh_priority_evaluation_requests)
RETURNS text LANGUAGE sql STABLE STRICT AS $$
  SELECT encode(sha256(convert_to(jsonb_build_array(
    r.id, extract(epoch FROM r.paid_at), r.email, r.model_name, r.model_link,
    r.code_link, r.access_type, r.payment_intent_id, r.checkout_session_id,
    r.amount_total, r.visibility, r.benchmarks, r.resubmission_count
  )::text, 'UTF8')), 'hex')
$$;

CREATE OR REPLACE FUNCTION bh_cd7e_late_order_ready(
  r bh_priority_evaluation_requests, expected_identity text, expected_refund_ref text,
  allow_pending boolean DEFAULT false
)
RETURNS boolean LANGUAGE sql STABLE STRICT AS $$
  SELECT COALESCE(
    r.id = 'cd7e038c-dcac-4990-9ca5-feac99cd8d8d'
    AND r.paid_at = '2026-11-18 13:33:55+00'::timestamptz
    AND r.stripe_mode = 'live' AND r.synthetic_test = false
    AND r.payment_intent_id IS NOT NULL AND r.checkout_session_id IS NOT NULL
    AND r.visibility = 'public' AND r.benchmarks = ARRAY['jevbench']::text[]
    AND r.sla_paused_seconds = 0 AND now() >= r.paid_at + interval '48 hours'
    AND r.customer_hold_started_at IS NULL AND r.customer_hold_reason IS NULL
    AND r.result_delivered_at IS NULL AND r.result_url IS NULL
    AND r.delivery_email_status = 'not_due'
    AND (r.evaluation_status IN ('ready_for_release','done')
         OR (allow_pending AND r.evaluation_status = 'pending' AND r.release_status = 'not_due'))
    AND r.release_status IN ('not_due','verified')
    AND bh_cd7e_late_identity(r) = expected_identity
    AND r.refund_decision_ref = expected_refund_ref AND r.refund_decided_at IS NOT NULL
    AND (
      (r.status = 'refunded' AND r.refund_decision = 'approved'
       AND r.refund_status = 'succeeded' AND r.refund_id ~ '^re_[a-zA-Z0-9]+$'
       AND r.refunded_at IS NOT NULL)
      OR (r.status IN ('paid','review_passed','refund_due') AND r.refund_decision = 'declined'
          AND r.refund_status IS NULL AND r.refund_id IS NULL AND r.refunded_at IS NULL
          AND r.refund_idempotency_key IS NULL)
    ), false)
$$;

CREATE OR REPLACE FUNCTION bh_cd7e_late_mail_ready(
  e bh_priority_eval_transactional_mail, r bh_priority_evaluation_requests
)
RETURNS boolean LANGUAGE sql STABLE STRICT AS $$
  SELECT e.template_key = 'cd7e_late_result_v1' AND e.request_id = r.id
    AND e.recipient = r.email AND e.expires_at > now()
    AND EXISTS (
      SELECT 1 FROM bh_cd7e_late_result_authorizations a
      WHERE a.envelope_id = e.id AND a.body_sha256 = e.body_sha256
        AND a.expires_at = e.expires_at AND a.expires_at > now()
        AND bh_cd7e_late_order_ready(r, a.identity_sha256, a.refund_ref)
    ) AND NOT EXISTS (
      SELECT 1 FROM bh_priority_eval_transactional_mail prior
      WHERE prior.request_id = r.id AND prior.template_key IN ('result_private_v1','result_public_v1')
    )
$$;
