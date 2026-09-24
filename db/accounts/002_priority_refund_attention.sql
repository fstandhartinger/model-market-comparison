DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('bh_accounts_priority_eval_schema'));
  PERFORM set_config('lock_timeout', '2s', true);
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
