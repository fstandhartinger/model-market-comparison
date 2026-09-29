-- Schema-only snapshot of the live fast-lane tables (29 Sep 2026) for test_autopickup.py; no data.

CREATE TABLE public.bh_priority_eval_customer_mail_events (
    gmail_message_id text NOT NULL,
    gmail_thread_id text,
    request_id uuid NOT NULL,
    sender_email text NOT NULL,
    subject text NOT NULL,
    received_at timestamp with time zone NOT NULL,
    summary text NOT NULL,
    body_file text NOT NULL,
    notification_status text DEFAULT 'pending'::text NOT NULL,
    board_status text DEFAULT 'pending'::text NOT NULL,
    notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bh_priority_eval_customer_mail_events_board_status_check CHECK ((board_status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text]))),
    CONSTRAINT bh_priority_eval_customer_mail_events_notification_status_check CHECK ((notification_status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text])))
);

CREATE TABLE public.bh_priority_eval_webhook_events (
    event_id text NOT NULL,
    event_type text NOT NULL,
    request_id uuid,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.bh_priority_evaluation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text NOT NULL,
    model_name text NOT NULL,
    model_link text DEFAULT ''::text NOT NULL,
    code_link text DEFAULT ''::text NOT NULL,
    access_type text NOT NULL,
    access_instructions text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    benchmarks text[] NOT NULL,
    visibility text NOT NULL,
    pricing_tier text NOT NULL,
    unit_amount integer NOT NULL,
    quantity smallint NOT NULL,
    base_amount integer NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    stripe_mode text NOT NULL,
    checkout_session_id text,
    checkout_url text,
    payment_intent_id text,
    amount_total integer,
    status text DEFAULT 'checkout_pending'::text NOT NULL,
    review_passed_at timestamp with time zone,
    result_delivered_at timestamp with time zone,
    refund_id text,
    refund_idempotency_key text,
    refund_attempts integer DEFAULT 0 NOT NULL,
    refund_status text,
    refunded_at timestamp with time zone,
    notification_status text DEFAULT 'not_due'::text NOT NULL,
    notification_attempts integer DEFAULT 0 NOT NULL,
    last_notification_attempt_at timestamp with time zone,
    refund_attention_notified_attempts integer DEFAULT 0 NOT NULL,
    refund_attention_notified_state text,
    refund_attempt_seq integer DEFAULT 0 NOT NULL,
    paid_at timestamp with time zone,
    review_basis text,
    result_url text,
    refund_reason text,
    pickup_status text DEFAULT 'not_due'::text NOT NULL,
    pickup_job_dir text,
    pickup_owner text,
    pickup_attempts integer DEFAULT 0 NOT NULL,
    last_pickup_attempt_at timestamp with time zone,
    board_status text DEFAULT 'not_due'::text NOT NULL,
    confirmation_status text DEFAULT 'not_due'::text NOT NULL,
    review_email_status text DEFAULT 'not_due'::text NOT NULL,
    delivery_email_status text DEFAULT 'not_due'::text NOT NULL,
    refusal_email_status text DEFAULT 'not_due'::text NOT NULL,
    customer_hold_started_at timestamp with time zone,
    customer_hold_reason text,
    sla_paused_seconds integer DEFAULT 0 NOT NULL,
    sla_24h_alerted_at timestamp with time zone,
    sla_36h_alerted_at timestamp with time zone,
    evaluation_status text DEFAULT 'pending'::text NOT NULL,
    release_status text DEFAULT 'not_due'::text NOT NULL,
    release_job_dir text,
    synthetic_test boolean DEFAULT false NOT NULL,
    mail_last_checked_at timestamp with time zone,
    evaluation_attempts integer DEFAULT 0 NOT NULL,
    release_attempts integer DEFAULT 0 NOT NULL,
    sla_24h_alert_claimed_at timestamp with time zone,
    sla_36h_alert_claimed_at timestamp with time zone,
    CONSTRAINT bh_priority_evaluation_requests_access_instructions_check CHECK (((length(access_instructions) >= 4) AND (length(access_instructions) <= 800))),
    CONSTRAINT bh_priority_evaluation_requests_access_type_check CHECK ((access_type = ANY (ARRAY['open_weights'::text, 'api_endpoint'::text]))),
    CONSTRAINT bh_priority_evaluation_requests_benchmarks_check CHECK ((((cardinality(benchmarks) >= 1) AND (cardinality(benchmarks) <= 2)) AND (benchmarks <@ ARRAY['jevbench'::text, 'imagejevbench'::text]))),
    CONSTRAINT bh_priority_evaluation_requests_check CHECK ((base_amount = (unit_amount * quantity))),
    CONSTRAINT bh_priority_evaluation_requests_check1 CHECK (((amount_total IS NULL) OR (amount_total >= base_amount))),
    CONSTRAINT bh_priority_evaluation_requests_currency_check CHECK ((currency = 'usd'::text)),
    CONSTRAINT bh_priority_evaluation_requests_email_check CHECK ((length(email) <= 254)),
    CONSTRAINT bh_priority_evaluation_requests_evaluation_attempts_check CHECK ((evaluation_attempts >= 0)),
    CONSTRAINT bh_priority_evaluation_requests_model_name_check CHECK (((length(model_name) >= 1) AND (length(model_name) <= 120))),
    CONSTRAINT bh_priority_evaluation_requests_notes_check CHECK ((length(notes) <= 1200)),
    CONSTRAINT bh_priority_evaluation_requests_notification_attempts_check CHECK ((notification_attempts >= 0)),
    CONSTRAINT bh_priority_evaluation_requests_notification_status_check CHECK ((notification_status = ANY (ARRAY['not_due'::text, 'pending'::text, 'sending'::text, 'sent'::text]))),
    CONSTRAINT bh_priority_evaluation_requests_pricing_tier_check CHECK ((pricing_tier = ANY (ARRAY['api_or_small_open'::text, 'large_open_gpu'::text]))),
    CONSTRAINT bh_priority_evaluation_requests_quantity_check CHECK (((quantity >= 1) AND (quantity <= 2))),
    CONSTRAINT bh_priority_evaluation_requests_refund_attempts_check CHECK ((refund_attempts >= 0)),
    CONSTRAINT bh_priority_evaluation_requests_refusal_email_status_check CHECK ((refusal_email_status = ANY (ARRAY['not_due'::text, 'approval_required'::text, 'held'::text, 'expired'::text, 'sent'::text]))),
    CONSTRAINT bh_priority_evaluation_requests_release_attempts_check CHECK ((release_attempts >= 0)),
    CONSTRAINT bh_priority_evaluation_requests_status_check CHECK ((status = ANY (ARRAY['checkout_pending'::text, 'checkout_failed'::text, 'paid'::text, 'review_passed'::text, 'refund_due'::text, 'refund_pending'::text, 'refunded'::text, 'completed'::text, 'expired'::text]))),
    CONSTRAINT bh_priority_evaluation_requests_stripe_mode_check CHECK ((stripe_mode = ANY (ARRAY['test'::text, 'live'::text]))),
    CONSTRAINT bh_priority_evaluation_requests_unit_amount_check CHECK ((unit_amount = ANY (ARRAY[4900, 9900]))),
    CONSTRAINT bh_priority_evaluation_requests_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'private'::text])))
);

ALTER TABLE ONLY public.bh_priority_eval_customer_mail_events
    ADD CONSTRAINT bh_priority_eval_customer_mail_events_pkey PRIMARY KEY (gmail_message_id);

ALTER TABLE ONLY public.bh_priority_eval_webhook_events
    ADD CONSTRAINT bh_priority_eval_webhook_events_pkey PRIMARY KEY (event_id);

ALTER TABLE ONLY public.bh_priority_evaluation_requests
    ADD CONSTRAINT bh_priority_evaluation_requests_checkout_session_id_key UNIQUE (checkout_session_id);

ALTER TABLE ONLY public.bh_priority_evaluation_requests
    ADD CONSTRAINT bh_priority_evaluation_requests_payment_intent_id_key UNIQUE (payment_intent_id);

ALTER TABLE ONLY public.bh_priority_evaluation_requests
    ADD CONSTRAINT bh_priority_evaluation_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.bh_priority_evaluation_requests
    ADD CONSTRAINT bh_priority_evaluation_requests_refund_id_key UNIQUE (refund_id);

ALTER TABLE ONLY public.bh_priority_evaluation_requests
    ADD CONSTRAINT bh_priority_evaluation_requests_submission_id_key UNIQUE (submission_id);

CREATE INDEX bh_priority_eval_customer_mail_pending_idx ON public.bh_priority_eval_customer_mail_events USING btree (received_at) WHERE (notification_status = ANY (ARRAY['pending'::text, 'failed'::text]));

CREATE INDEX bh_priority_eval_customer_mail_sending_idx ON public.bh_priority_eval_customer_mail_events USING btree (updated_at) WHERE ((notification_status = 'sending'::text) OR (board_status = 'sending'::text));

CREATE INDEX bh_priority_eval_due_refund_idx ON public.bh_priority_evaluation_requests USING btree (review_passed_at) WHERE ((status = 'review_passed'::text) AND (result_delivered_at IS NULL));

CREATE INDEX bh_priority_eval_notification_idx ON public.bh_priority_evaluation_requests USING btree (created_at) WHERE ((status = 'paid'::text) AND (notification_status = 'pending'::text));

CREATE INDEX bh_priority_eval_paid_due_refund_idx ON public.bh_priority_evaluation_requests USING btree (paid_at) WHERE ((status = ANY (ARRAY['paid'::text, 'review_passed'::text])) AND (result_delivered_at IS NULL) AND (customer_hold_started_at IS NULL));

CREATE INDEX bh_priority_eval_pickup_idx ON public.bh_priority_evaluation_requests USING btree (created_at) WHERE ((status = 'paid'::text) AND (pickup_status = 'pending'::text));

CREATE INDEX bh_priority_eval_release_idx ON public.bh_priority_evaluation_requests USING btree (paid_at) WHERE (release_status = 'pending'::text);

ALTER TABLE ONLY public.bh_priority_eval_customer_mail_events
    ADD CONSTRAINT bh_priority_eval_customer_mail_events_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.bh_priority_evaluation_requests(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.bh_priority_eval_webhook_events
    ADD CONSTRAINT bh_priority_eval_webhook_events_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.bh_priority_evaluation_requests(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS bh_priority_eval_transactional_mail (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES bh_priority_evaluation_requests(id),
  template_key text NOT NULL CHECK (template_key IN ('payment_confirmation_v1','review_passed_v1','result_private_v1','result_public_v1')),
  recipient text NOT NULL, subject text NOT NULL,
  body_sha256 text NOT NULL CHECK (body_sha256 ~ '^[a-f0-9]{64}$'),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','sent','uncertain')),
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  claimed_at timestamptz, sent_at timestamptz,
  UNIQUE (request_id,template_key)
);
