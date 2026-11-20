-- Explicit installer input for the isolated late-pickup package.
-- Apply as a database administrator in a single transaction after migration 004.
-- The deployment provisions and verifies the two roles and pg_ident mapping separately.
SET LOCAL lock_timeout = '5s';
SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('bh_accounts_priority_eval_schema'));

DO $roles$
DECLARE
  owner_role oid;
  pickup_role oid;
BEGIN
  SELECT oid INTO STRICT owner_role FROM pg_catalog.pg_roles
  WHERE rolname = 'jevbench_cd7e_owner' AND NOT rolcanlogin AND NOT rolinherit
    AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls);
  SELECT oid INTO STRICT pickup_role FROM pg_catalog.pg_roles
  WHERE rolname = 'jevbench_cd7e_late' AND rolcanlogin AND NOT rolinherit
    AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls);
  IF EXISTS (SELECT FROM pg_catalog.pg_auth_members WHERE member IN (owner_role, pickup_role))
    OR pg_catalog.has_schema_privilege(pickup_role, 'public', 'CREATE')
    OR pg_catalog.has_database_privilege(pickup_role, current_database(), 'CREATE')
  THEN
    RAISE EXCEPTION 'late pickup database role has unexpected privileges';
  END IF;
END
$roles$;

CREATE SCHEMA cd7e_late AUTHORIZATION jevbench_cd7e_owner;
REVOKE ALL ON SCHEMA cd7e_late FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO jevbench_cd7e_owner;
GRANT SELECT, UPDATE (evaluation_status, updated_at, delivery_email_status,
  result_delivered_at, result_url, release_status, pickup_status)
  ON public.bh_priority_evaluation_requests TO jevbench_cd7e_owner;
GRANT SELECT, INSERT (id, request_id, template_key, recipient, subject, body_sha256, expires_at),
  UPDATE (state, claimed_at, sent_at) ON public.bh_priority_eval_transactional_mail TO jevbench_cd7e_owner;
GRANT SELECT, INSERT ON public.bh_cd7e_late_result_authorizations TO jevbench_cd7e_owner;
GRANT EXECUTE ON FUNCTION public.bh_cd7e_late_identity(public.bh_priority_evaluation_requests),
  public.bh_cd7e_late_order_ready(public.bh_priority_evaluation_requests, text, text, boolean),
  public.bh_cd7e_late_mail_ready(public.bh_priority_eval_transactional_mail,
    public.bh_priority_evaluation_requests) TO jevbench_cd7e_owner;

SET LOCAL ROLE jevbench_cd7e_owner;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE VIEW cd7e_late.exact_order AS
  SELECT r.* FROM public.bh_priority_evaluation_requests r
  WHERE r.id = 'cd7e038c-dcac-4990-9ca5-feac99cd8d8d';

CREATE VIEW cd7e_late.exact_mail AS
  SELECT e.* FROM public.bh_priority_eval_transactional_mail e
  WHERE e.id = '1fe81855-8b6d-50f6-863f-f0760c2e48eb'
    AND e.request_id = 'cd7e038c-dcac-4990-9ca5-feac99cd8d8d'
    AND e.template_key = 'cd7e_late_result_v1'
  WITH CHECK OPTION;

CREATE FUNCTION cd7e_late.read_order() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT jsonb_build_object('id', id, 'visibility', visibility, 'benchmarks', benchmarks, 'email', email)
  FROM cd7e_late.exact_order
$$;

CREATE FUNCTION cd7e_late.receipt() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT jsonb_build_object('state', e.state, 'sent_at', e.sent_at, 'recorded_at', r.result_delivered_at,
    'generation', a.generation, 'expired', e.expires_at <= now(),
    'release_commit', a.release_commit, 'url', a.result_url)
  FROM cd7e_late.exact_mail e
  JOIN public.bh_cd7e_late_result_authorizations a ON a.envelope_id = e.id
  JOIN public.bh_priority_evaluation_requests r ON r.id = e.request_id
  WHERE e.body_sha256 = a.body_sha256 AND e.recipient COLLATE "C" = r.email
    AND e.expires_at = a.expires_at AND public.bh_cd7e_late_identity(r) = a.identity_sha256
$$;

CREATE FUNCTION cd7e_late.stage(expected_identity text, expected_refund_ref text, expected_generation text,
  expected_admission text, expected_release text, expected_expiry timestamptz, expected_recipient text,
  expected_subject text, expected_digest text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM id FROM cd7e_late.exact_order FOR UPDATE;
  IF expected_expiry IS NULL OR expected_expiry <= clock_timestamp() THEN
    RETURN false;
  END IF;

  UPDATE public.bh_priority_evaluation_requests r SET evaluation_status = 'ready_for_release', updated_at = now()
  WHERE r.id = 'cd7e038c-dcac-4990-9ca5-feac99cd8d8d' AND r.evaluation_status = 'pending'
    AND r.email COLLATE "C" = expected_recipient
    AND public.bh_cd7e_late_order_ready(r, expected_identity, expected_refund_ref, true)
    AND NOT EXISTS (SELECT FROM public.bh_priority_eval_transactional_mail prior WHERE prior.request_id = r.id
                    AND prior.template_key IN ('cd7e_late_result_v1', 'result_public_v1', 'result_private_v1'));

  INSERT INTO public.bh_priority_eval_transactional_mail
    (id, request_id, template_key, recipient, subject, body_sha256, expires_at)
  SELECT '1fe81855-8b6d-50f6-863f-f0760c2e48eb', r.id, 'cd7e_late_result_v1',
    r.email, expected_subject, expected_digest, expected_expiry
  FROM public.bh_priority_evaluation_requests r
  WHERE r.id = 'cd7e038c-dcac-4990-9ca5-feac99cd8d8d' AND r.email COLLATE "C" = expected_recipient
    AND public.bh_cd7e_late_order_ready(r, expected_identity, expected_refund_ref)
    AND NOT EXISTS (SELECT FROM public.bh_priority_eval_transactional_mail prior WHERE prior.request_id = r.id
                    AND prior.template_key IN ('result_public_v1', 'result_private_v1'))
  ON CONFLICT DO NOTHING;

  INSERT INTO public.bh_cd7e_late_result_authorizations
    (envelope_id, generation, admission_sha256, identity_sha256, body_sha256, refund_ref,
     release_commit, result_url, expires_at)
  SELECT e.id, expected_generation, expected_admission, expected_identity, expected_digest,
    expected_refund_ref, expected_release, 'https://benchmarkheaven.com/jev-models', e.expires_at
  FROM cd7e_late.exact_mail e JOIN public.bh_priority_evaluation_requests r ON r.id = e.request_id
  WHERE e.recipient COLLATE "C" = expected_recipient AND e.subject COLLATE "C" = expected_subject
    AND e.body_sha256 = expected_digest AND e.expires_at = expected_expiry AND e.state = 'pending'
    AND public.bh_cd7e_late_order_ready(r, expected_identity, expected_refund_ref)
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (
    SELECT FROM public.bh_priority_eval_transactional_mail e
    JOIN public.bh_cd7e_late_result_authorizations a ON a.envelope_id = e.id
    JOIN public.bh_priority_evaluation_requests r ON r.id = e.request_id
    WHERE e.id = '1fe81855-8b6d-50f6-863f-f0760c2e48eb' AND e.state = 'pending'
      AND e.recipient COLLATE "C" = expected_recipient AND e.subject COLLATE "C" = expected_subject
      AND e.body_sha256 = expected_digest AND a.admission_sha256 = expected_admission
      AND a.generation = expected_generation AND a.identity_sha256 = expected_identity
      AND a.refund_ref = expected_refund_ref AND a.release_commit = expected_release
      AND a.result_url = 'https://benchmarkheaven.com/jev-models' AND a.expires_at = expected_expiry
      AND a.expires_at > clock_timestamp() AND public.bh_cd7e_late_mail_ready(e, r)
  ) THEN
    RAISE EXCEPTION 'late envelope failed exact staging checks' USING ERRCODE = '23514';
  END IF;
  RETURN true;
END
$$;

CREATE FUNCTION cd7e_late.validate(expected_recipient text, expected_subject text, expected_digest text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT e.state FROM public.bh_priority_eval_transactional_mail e
  JOIN public.bh_priority_evaluation_requests r ON r.id = e.request_id
  JOIN public.bh_cd7e_late_result_authorizations a ON a.envelope_id = e.id
  WHERE e.id = '1fe81855-8b6d-50f6-863f-f0760c2e48eb'
    AND e.request_id = 'cd7e038c-dcac-4990-9ca5-feac99cd8d8d' AND e.template_key = 'cd7e_late_result_v1'
    AND e.recipient COLLATE "C" = expected_recipient AND e.subject COLLATE "C" = expected_subject
    AND e.body_sha256 = expected_digest AND e.recipient COLLATE "C" = r.email
    AND e.body_sha256 = a.body_sha256 AND e.expires_at = a.expires_at
    AND public.bh_cd7e_late_identity(r) = a.identity_sha256
    AND r.stripe_mode = 'live' AND r.synthetic_test = false
    AND r.paid_at IS NOT NULL AND r.payment_intent_id IS NOT NULL
    AND (e.state = 'sent' OR (e.state = 'pending' AND public.bh_cd7e_late_mail_ready(e, r)))
$$;

CREATE FUNCTION cd7e_late.claim(expected_recipient text, expected_subject text, expected_digest text,
  expected_generation text, expected_admission text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  WITH locked_order AS MATERIALIZED (
    SELECT r AS order_record, r.id FROM public.bh_priority_evaluation_requests r
    WHERE r.id = 'cd7e038c-dcac-4990-9ca5-feac99cd8d8d' FOR UPDATE
  ), claimed AS (
    UPDATE public.bh_priority_eval_transactional_mail e SET state = 'sending', claimed_at = now()
    FROM locked_order r, public.bh_cd7e_late_result_authorizations a
    WHERE e.id = '1fe81855-8b6d-50f6-863f-f0760c2e48eb' AND r.id = e.request_id
      AND e.template_key = 'cd7e_late_result_v1' AND e.state = 'pending'
      AND public.bh_cd7e_late_mail_ready(e, r.order_record)
      AND a.envelope_id = e.id AND a.generation = expected_generation
      AND a.admission_sha256 = expected_admission AND a.expires_at > clock_timestamp()
      AND e.recipient COLLATE "C" = expected_recipient AND e.subject COLLATE "C" = expected_subject
      AND e.body_sha256 = expected_digest
    RETURNING e.id
  )
  SELECT EXISTS (SELECT FROM claimed)
$$;

CREATE FUNCTION cd7e_late.accepted(expected_digest text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  WITH saved AS (
    UPDATE cd7e_late.exact_mail SET state = 'sent', sent_at = clock_timestamp()
    WHERE state = 'sending' AND body_sha256 = expected_digest RETURNING id
  )
  SELECT EXISTS (SELECT FROM saved)
$$;

CREATE FUNCTION cd7e_late.failed(expected_digest text, submitted boolean) RETURNS boolean
LANGUAGE sql STRICT SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  WITH saved AS (
    UPDATE cd7e_late.exact_mail SET state = CASE WHEN submitted THEN 'uncertain' ELSE 'pending' END
    WHERE state = 'sending' AND body_sha256 = expected_digest RETURNING id
  )
  SELECT EXISTS (SELECT FROM saved)
$$;

CREATE FUNCTION cd7e_late.reconcile() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  current_receipt jsonb;
BEGIN
  UPDATE public.bh_priority_evaluation_requests r SET delivery_email_status = 'sent',
    result_delivered_at = e.sent_at, result_url = a.result_url, release_status = 'done',
    pickup_status = 'done', evaluation_status = 'done', updated_at = now()
  FROM cd7e_late.exact_mail e JOIN public.bh_cd7e_late_result_authorizations a ON e.id = a.envelope_id
  WHERE e.request_id = r.id AND e.state = 'sent' AND e.sent_at IS NOT NULL
    AND e.body_sha256 = a.body_sha256 AND e.recipient COLLATE "C" = r.email AND e.expires_at = a.expires_at
    AND public.bh_cd7e_late_order_ready(r, a.identity_sha256, a.refund_ref);
  current_receipt := cd7e_late.receipt();
  IF current_receipt->>'state' = 'sent' AND current_receipt->>'recorded_at' = current_receipt->>'sent_at' THEN
    RETURN current_receipt;
  END IF;
  RETURN NULL;
END
$$;

GRANT USAGE ON SCHEMA cd7e_late TO jevbench_cd7e_late;
GRANT EXECUTE ON FUNCTION cd7e_late.read_order(), cd7e_late.receipt(),
  cd7e_late.stage(text, text, text, text, text, timestamptz, text, text, text),
  cd7e_late.validate(text, text, text), cd7e_late.claim(text, text, text, text, text),
  cd7e_late.accepted(text), cd7e_late.failed(text, boolean), cd7e_late.reconcile()
  TO jevbench_cd7e_late;
RESET ROLE;

DO $permissions$
DECLARE
  relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['public.bh_priority_evaluation_requests',
    'public.bh_priority_eval_transactional_mail', 'public.bh_cd7e_late_result_authorizations',
    'cd7e_late.exact_order', 'cd7e_late.exact_mail']
  LOOP
    IF pg_catalog.has_any_column_privilege('jevbench_cd7e_late', relation_name, 'SELECT,INSERT,UPDATE,REFERENCES')
      OR pg_catalog.has_table_privilege('jevbench_cd7e_late', relation_name, 'DELETE,TRUNCATE,TRIGGER')
    THEN
      RAISE EXCEPTION 'late pickup role can directly access %', relation_name;
    END IF;
  END LOOP;
END
$permissions$;
