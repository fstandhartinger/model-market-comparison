#!/usr/bin/env python3
"""Operator CLI for paid-evaluation review, customer holds, and delivery state."""

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

TABLE = "bh_priority_evaluation_requests"
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)


def query(statement: str) -> str | None:
    result = subprocess.run(
        ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", "benchmarkheaven_accounts", "-c", statement],
        text=True, capture_output=True, timeout=20,
    )
    if result.returncode:
        raise RuntimeError("database operation failed")
    return result.stdout.strip() or None


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def usage() -> int:
    print(
        "usage: jevbench-review list | REQUEST_ID pass --basis TEXT | "
        "REQUEST_ID refuse --basis TEXT | REQUEST_ID hold --reason TEXT | "
        "REQUEST_ID resume | REQUEST_ID wait-for-florian | "
        "REQUEST_ID complete --result-url HTTPS_URL",
        file=sys.stderr,
    )
    return 2


def main() -> int:
    if len(sys.argv) == 2 and sys.argv[1] == "list":
        data = query(f"""
          SELECT COALESCE(json_agg(row_data ORDER BY created_at)::text,'[]') FROM (
            SELECT json_build_object(
              'id',id::text,
              'status',CASE WHEN customer_hold_started_at IS NOT NULL THEN 'waiting_on_customer' ELSE status END,
              'email',email,'model',model_name,'benchmarks',benchmarks,'visibility',visibility,
              'amount_total',amount_total,'stripe_mode',stripe_mode,'paid_at',paid_at,
              'review_passed_at',review_passed_at,'customer_hold_reason',customer_hold_reason,
              'result_delivered_at',result_delivered_at,'result_url',result_url
            ) AS row_data, created_at
            FROM {TABLE}
            WHERE status IN ('paid','review_passed','refund_due','refund_pending')
              AND (result_delivered_at IS NULL OR customer_hold_started_at IS NOT NULL)
          ) AS open_requests
        """)
        rows = json.loads(data or "[]")
        if not rows:
            print("No open priority requests.")
            return 0
        for row in rows:
            amount = row.get("amount_total") or 0
            hold = f"  hold={row['customer_hold_reason']}" if row.get("customer_hold_reason") else ""
            due = row.get("paid_at") or "paid_at-missing"
            print(f"{row['id']}  {row['stripe_mode'].upper()}  {row['status']}  {row['email']}  {row['model']}  {', '.join(row['benchmarks'])}  ${amount / 100:.2f}  paid_at={due}{hold}")
        return 0

    if len(sys.argv) < 3 or not UUID_RE.fullmatch(sys.argv[1]):
        return usage()
    request_id, action = sys.argv[1], sys.argv[2]
    args = sys.argv[3:]
    if action not in ("pass", "refuse", "complete", "hold", "resume", "wait-for-florian"):
        return usage()

    if action in ("pass", "refuse"):
        if len(args) != 2 or args[0] != "--basis" or not args[1].strip() or len(args[1]) > 1200:
            return usage()
        basis = literal(args[1].strip())
        if action == "pass":
            statement = f"""
              UPDATE {TABLE}
              SET status='review_passed', review_passed_at=COALESCE(review_passed_at,now()),
                  evaluation_status=CASE WHEN evaluation_status='pending' THEN 'running' ELSE evaluation_status END,
                  review_basis={basis},
                  review_email_status=CASE WHEN status='paid' AND review_email_status='not_due' THEN 'pending' ELSE review_email_status END,
                  updated_at=now()
              WHERE id='{request_id}'::uuid AND status IN ('paid','review_passed') AND payment_intent_id IS NOT NULL
              RETURNING id
            """
            description = "Review recorded; the 48-hour delivery clock is measured from payment."
        else:
            statement = f"""
              UPDATE {TABLE}
              SET status='refund_due', refund_status=NULL, refund_reason='review_refused', review_basis={basis},
                  evaluation_status='refused',
                  refusal_email_status='approval_required', updated_at=now()
              WHERE id='{request_id}'::uuid AND status IN ('paid','review_passed')
                AND payment_intent_id IS NOT NULL AND result_delivered_at IS NULL
              RETURNING id
            """
            description = "Request refused; full refund is queued and the customer email needs approval."
    elif action == "hold":
        if len(args) != 2 or args[0] != "--reason" or not args[1].strip() or len(args[1]) > 500:
            return usage()
        reason = literal(args[1].strip())
        statement = f"""
          UPDATE {TABLE}
          SET customer_hold_started_at=now(), customer_hold_reason={reason}, release_status='waiting_on_customer', updated_at=now()
          WHERE id='{request_id}'::uuid AND status='review_passed' AND result_delivered_at IS NULL
            AND customer_hold_started_at IS NULL
          RETURNING id
        """
        description = "Customer hold recorded; refund and SLA clocks are paused until the hold is cleared."
    elif action == "resume":
        if args:
            return usage()
        statement = f"""
          UPDATE {TABLE}
          SET sla_paused_seconds=sla_paused_seconds + GREATEST(0, EXTRACT(EPOCH FROM now()-customer_hold_started_at)::integer),
              customer_hold_started_at=NULL, customer_hold_reason=NULL,
              release_status=CASE WHEN release_status='waiting_on_customer' THEN 'pending' ELSE release_status END,
              updated_at=now()
          WHERE id='{request_id}'::uuid AND status='review_passed' AND customer_hold_started_at IS NOT NULL
          RETURNING id
        """
        description = "Customer hold cleared; the remaining payment-time SLA has resumed."
    elif action == "wait-for-florian":
        if args:
            return usage()
        statement = f"""
          UPDATE {TABLE}
          SET release_status='waiting_for_florian', updated_at=now()
          WHERE id='{request_id}'::uuid AND status='review_passed' AND result_delivered_at IS NULL
            AND customer_hold_started_at IS NULL AND release_status IN ('running','pending','failed')
          RETURNING id
        """
        description = "Release is ready and held for Florian's top-five preview decision."
    else:
        if len(args) != 2 or args[0] != "--result-url":
            return usage()
        result_url = args[1].strip()
        parsed = urlparse(result_url)
        if parsed.scheme != "https" or parsed.hostname not in ("benchmarkheaven.com", "www.benchmarkheaven.com") or len(result_url) > 1000:
            print("Result URL must be an HTTPS Benchmark Heaven page.", file=sys.stderr)
            return 2
        url = literal(result_url)
        statement = f"""
          UPDATE {TABLE}
          SET status='completed', result_delivered_at=now(), result_url={url}, release_status='completed',
              delivery_email_status=CASE WHEN delivery_email_status IN ('not_due','failed') THEN 'pending' ELSE delivery_email_status END,
              customer_hold_started_at=NULL, customer_hold_reason=NULL, updated_at=now()
          WHERE id='{request_id}'::uuid AND status='review_passed' AND customer_hold_started_at IS NULL
          RETURNING id
        """
        description = "Result delivery recorded; one delivery email is queued."

    changed = query(statement)
    if not changed:
        print("No transition made. Check the request state with `jevbench-review list`.", file=sys.stderr)
        return 1
    print(description)
    if action == "refuse":
        helper = Path(os.environ.get("FASTLANE_APPROVAL_HELPER", Path.home() / "bin/jevbench-priority-approval.py"))
        try:
            prepared = subprocess.run(
                [sys.executable, str(helper), "prepare", request_id],
                text=True, capture_output=True, timeout=90,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            print(f"Refund remains queued; the one-tap refusal email could not be prepared ({type(exc).__name__}).", file=sys.stderr)
            return 0
        if prepared.returncode:
            print("Refund remains queued; the one-tap refusal email could not be prepared.", file=sys.stderr)
            return 0
        print(prepared.stdout.strip())
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"jevbench-review: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1)
