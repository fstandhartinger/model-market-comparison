"""Exact-envelope exception for approved paid-order mail; no general mail exemption.

Only the trusted pickup host writes this outbox. Agent processes have neither its
database socket nor host credentials. The sender independently checks the order,
recipient, template and content, claims once, and parks uncertain SMTP attempts.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess

KEYS = frozenset({"payment_confirmation_v1", "review_passed_v1",
                  "result_private_v1", "result_public_v1", "decisor_result_public_v163_correction"})
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
LATE_RESULT_KEY = "cd7e_late_result_v1"
TABLE = "bh_priority_eval_transactional_mail"
ORDERS = "bh_priority_evaluation_requests"


class TransactionRefused(RuntimeError):
    pass


def query(statement):
    """Fixed local peer-auth connection; no environment/database override."""
    result = subprocess.run(
        ["/usr/bin/psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-h", "/var/run/postgresql",
         "-p", "5432", "-U", "flori", "-d", "benchmarkheaven_accounts"],
        input="SET standard_conforming_strings=on;\n" + statement, text=True, capture_output=True, timeout=20,
        env={"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8", "PGCONNECT_TIMEOUT": "5"},
        check=False,
    )
    if result.returncode or len(result.stdout) > 100_000:
        raise TransactionRefused("paid-order mail validation unavailable")
    try:
        return json.loads(result.stdout) if result.stdout.strip() else None
    except ValueError as exc:
        raise TransactionRefused("invalid paid-order mail receipt") from exc


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def eligible_sql(order_record="r"):
    # CASE keeps normal transactional mail independent of the late branch.
    return f"""CASE WHEN e.template_key='{LATE_RESULT_KEY}'
      THEN bh_cd7e_late_mail_ready(e,{order_record})
      ELSE (r.stripe_mode='live' AND r.synthetic_test=false AND r.paid_at IS NOT NULL
      AND r.payment_intent_id IS NOT NULL AND (r.status IN ('paid','review_passed') OR (e.template_key='decisor_result_public_v163_correction' AND r.id='3687485f-5a51-4964-bd9a-73973f3494d7'::uuid AND r.status='completed' AND r.evaluation_status='done' AND r.release_status='done' AND r.visibility='public' AND r.delivery_email_status='sent' AND r.result_delivered_at='2026-10-06T13:08:59+00:00'::timestamptz AND r.result_url='https://benchmarkheaven.com/jev-models/v1.6.3' AND r.refund_id IS NULL AND r.refunded_at IS NULL))
      AND lower(e.recipient)=lower(r.email) AND e.expires_at>now()
      AND (e.template_key!='decisor_result_public_v163_correction' OR (r.id='3687485f-5a51-4964-bd9a-73973f3494d7'::uuid AND r.status='completed' AND r.evaluation_status='done' AND r.release_status='done' AND r.visibility='public' AND r.delivery_email_status='sent' AND r.result_delivered_at='2026-10-06T13:08:59+00:00'::timestamptz AND r.result_url='https://benchmarkheaven.com/jev-models/v1.6.3' AND r.refund_id IS NULL AND r.refunded_at IS NULL))
      AND (e.template_key IN ('payment_confirmation_v1','decisor_result_public_v163_correction') OR
           (r.review_passed_at IS NOT NULL AND r.customer_hold_started_at IS NULL))
      AND (e.template_key NOT IN ('result_private_v1','result_public_v1') OR
           (e.template_key='result_private_v1' AND r.visibility='private') OR
           (e.template_key='result_public_v1' AND r.visibility='public'))) END"""


class Envelope:
    def __init__(self, envelope_id, account, recipient, cc, subject, body):
        if not isinstance(envelope_id, str) or not UUID.fullmatch(envelope_id):
            raise TransactionRefused("invalid paid-order mail id")
        if account != "gmail" or cc or not isinstance(recipient, str) or any(c in recipient for c in "\r\n,;<>"):
            raise TransactionRefused("paid-order mail requires one exact Gmail recipient and no CC")
        if not isinstance(subject, str) or any(c in subject for c in "\r\n") or not isinstance(body, str):
            raise TransactionRefused("invalid paid-order mail content")
        self.id, self.recipient, self.subject = envelope_id, recipient, subject
        self.digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
        self.state = None
        self.submitted = False

    def validate(self):
        row = query(f"""SELECT json_build_object(
          'template_key',e.template_key,'recipient',e.recipient,'subject',e.subject,
          'body_sha256',e.body_sha256,'state',e.state,'order_email',r.email,
          'paid',r.paid_at IS NOT NULL,'payment',r.payment_intent_id IS NOT NULL,
          'mode',r.stripe_mode,'synthetic',r.synthetic_test,'eligible',({eligible_sql()}))::text
          FROM {TABLE} e JOIN {ORDERS} r ON r.id=e.request_id WHERE e.id='{self.id}'::uuid;""")
        if not isinstance(row, dict) or row.get("template_key") not in KEYS | {LATE_RESULT_KEY} \
                or row.get("mode") != "live" or row.get("synthetic") is not False \
                or row.get("paid") is not True or row.get("payment") is not True \
                or str(row.get("recipient", "")).casefold() != self.recipient.casefold() \
                or str(row.get("order_email", "")).casefold() != self.recipient.casefold() \
                or row.get("subject") != self.subject or row.get("body_sha256") != self.digest:
            raise TransactionRefused("mail does not match an approved paid-order envelope")
        self.state = row.get("state")
        if self.state == "sent":
            return self
        if self.state != "pending" or row.get("eligible") is not True:
            raise TransactionRefused("paid-order mail is expired, held or needs send reconciliation")
        return self

    def claim(self):
        if self.state == "sent":
            return False
        # Recheck identity and live order eligibility atomically with the pending claim.
        row = query(f"""WITH late_order AS MATERIALIZED (
          SELECT r.*, r AS order_record FROM {ORDERS} r JOIN {TABLE} e ON e.request_id=r.id
          WHERE e.id='{self.id}'::uuid AND e.template_key='{LATE_RESULT_KEY}'
          FOR UPDATE OF r
        ), candidate_order AS (
          SELECT * FROM late_order
          UNION ALL
          SELECT r.*, r AS order_record FROM {ORDERS} r JOIN {TABLE} e ON e.request_id=r.id
          WHERE e.id='{self.id}'::uuid AND e.template_key<>'{LATE_RESULT_KEY}'
        ), claimed AS (
          UPDATE {TABLE} e SET state='sending',claimed_at=now()
          FROM candidate_order r WHERE e.id='{self.id}'::uuid AND r.id=e.request_id
          AND e.state='pending' AND ({eligible_sql('r.order_record')})
          AND (e.template_key IN ('payment_confirmation_v1','review_passed_v1','result_private_v1','result_public_v1','decisor_result_public_v163_correction')
               OR e.template_key='{LATE_RESULT_KEY}')
          AND lower(e.recipient)=lower({literal(self.recipient)})
          AND e.subject={literal(self.subject)} AND e.body_sha256='{self.digest}'
          RETURNING e.id)
          SELECT json_build_object('claimed',true)::text FROM claimed;""")
        if row != {"claimed": True}:
            raise TransactionRefused("paid-order mail was already claimed or its state changed")
        self.state = "sending"
        return True

    @property
    def message_id(self):
        return f"<fastlane-{self.id}@benchmarkheaven.com>"

    def before_submission(self):
        self.submitted = True

    def accepted(self):
        row = query(f"""WITH saved AS (UPDATE {TABLE}
          SET state='sent',sent_at=now() WHERE id='{self.id}'::uuid AND state='sending'
          AND body_sha256='{self.digest}' RETURNING id)
          SELECT json_build_object('saved',true)::text FROM saved;""")
        if row != {"saved": True}:
            raise TransactionRefused("SMTP accepted; paid-order receipt needs reconciliation")
        self.state = "sent"

    def failed(self):
        if self.state != "sending":
            return
        next_state = "uncertain" if self.submitted else "pending"
        query(f"""WITH saved AS (UPDATE {TABLE} SET state='{next_state}'
          WHERE id='{self.id}'::uuid AND state='sending' AND body_sha256='{self.digest}' RETURNING id)
          SELECT json_build_object('saved',true)::text FROM saved;""")
        self.state = next_state
