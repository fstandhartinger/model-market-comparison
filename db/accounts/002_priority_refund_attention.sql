ALTER TABLE bh_priority_evaluation_requests
  ADD COLUMN IF NOT EXISTS refund_attention_notified_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE bh_priority_evaluation_requests
  ADD COLUMN IF NOT EXISTS refund_attention_notified_state text;
