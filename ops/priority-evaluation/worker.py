#!/usr/bin/env python3
"""Sandy worker for priority request notices and deadline refunds."""

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

HOME = Path.home()
TABLE = "bh_priority_evaluation_requests"
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
STRIPE_ID_RE = re.compile(r"^re_[A-Za-z0-9]+$")


class WorkerError(Exception):
    pass


class StripeFailure(Exception):
    def __init__(self, status: int, data: dict | None):
        self.status = status
        self.data = data or {}


class StripeUnknownOutcome(Exception):
    pass


def sql(sql_text: str) -> str | None:
    result = subprocess.run(
        ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", "benchmarkheaven_accounts", "-c", sql_text],
        text=True, capture_output=True, timeout=20,
    )
    if result.returncode:
        raise WorkerError("database operation failed")
    output = result.stdout.strip()
    return output or None


def sql_json(sql_text: str) -> dict | None:
    output = sql(sql_text)
    if not output:
        return None
    try:
        value = json.loads(output)
    except json.JSONDecodeError as exc:
        raise WorkerError("database returned an invalid response") from exc
    if not isinstance(value, dict):
        raise WorkerError("database returned an invalid record")
    return value


def text_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def load_stripe_key(mode: str) -> str:
    path = HOME / ".config/stripe/stripe.env"
    try:
        stat = path.stat()
        if stat.st_uid != os.getuid() or stat.st_mode & 0o077:
            raise WorkerError("Stripe credential file permissions are not private")
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise WorkerError("Stripe credentials are unavailable") from exc
    name = f"STRIPE_{mode.upper()}_SECRET_KEY"
    key = ""
    for line in lines:
        line = line.strip()
        if line.startswith("export "):
            line = line[7:].lstrip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        candidate, value = line.split("=", 1)
        if candidate.strip() != name:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        key = value
        break
    if not key.startswith("sk_test_" if mode == "test" else "sk_live_"):
        raise WorkerError("matching Stripe mode credential is unavailable")
    return key


def stripe_request(mode: str, method: str, path: str, fields: dict | None = None, idem: str | None = None) -> dict:
    key = load_stripe_key(mode)
    body = urllib.parse.urlencode(fields or {}).encode() if method == "POST" else None
    headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    if idem:
        headers["Idempotency-Key"] = idem
    request = urllib.request.Request("https://api.stripe.com/v1/" + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.loads(response.read(1_000_000))
    except urllib.error.HTTPError as exc:
        try:
            data = json.loads(exc.read(64_000))
        except Exception:
            data = {}
        raise StripeFailure(exc.code, data if isinstance(data, dict) else {}) from None
    except Exception as exc:
        raise StripeUnknownOutcome(type(exc).__name__) from None
    if not isinstance(data, dict):
        raise StripeUnknownOutcome("invalid Stripe response")
    return data


def json_fields(row: dict) -> str:
    return json.dumps(row, ensure_ascii=True, separators=(",", ":"))


def claim_notification() -> dict | None:
    return sql_json(f"""
      UPDATE {TABLE} AS r
      SET notification_status='sending', notification_attempts=notification_attempts+1,
          last_notification_attempt_at=now(), updated_at=now()
      WHERE r.id=(
        SELECT id FROM {TABLE}
        WHERE status='paid' AND (
          notification_status='pending' OR
          (notification_status='sending' AND last_notification_attempt_at < now()-interval '10 minutes')
        )
        ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
      )
      RETURNING json_build_object(
        'id', r.id::text, 'email', r.email, 'model_name', r.model_name, 'model_link', r.model_link,
        'code_link', r.code_link, 'benchmarks', r.benchmarks, 'visibility', r.visibility,
        'amount_total', r.amount_total, 'base_amount', r.base_amount, 'stripe_mode', r.stripe_mode,
        'payment_intent_id', r.payment_intent_id
      )::text
    """)


def notify_florian(message: str) -> bool:
    env = dict(os.environ)
    env["NOTIFY_SOURCE"] = "jevbench-priority-evaluation"
    result = subprocess.run(
        [str(HOME / "bin/notify"), "now", "--requested", "--text-stdin"],
        input=message, text=True, capture_output=True, timeout=30, env=env,
    )
    return result.returncode == 0


def process_notification() -> bool:
    row = claim_notification()
    if not row:
        return False
    mode = str(row.get("stripe_mode", "")).upper()
    mode_segment = "/test" if mode == "TEST" else ""
    payment_id = row.get("payment_intent_id") or ""
    payment_link = f"https://dashboard.stripe.com{mode_segment}/payments/{payment_id}" if re.fullmatch(r"pi_[A-Za-z0-9]+", str(payment_id)) else "Stripe payment record unavailable"
    amount = row.get("amount_total") or row.get("base_amount") or 0
    benchmarks = ", ".join(row.get("benchmarks") or [])
    message = (
        f"New {mode} priority evaluation payment\n"
        f"From: {row.get('email', '')}\n"
        f"Model: {row.get('model_name', '')}\n"
        f"Benchmarks: {benchmarks}\n"
        f"Visibility: {row.get('visibility', '')}\n"
        f"Amount paid: ${int(amount) / 100:.2f} USD\n"
        f"Request ID: {row.get('id', '')}\n"
        f"Stripe: {payment_link}"
    )
    success = notify_florian(message)
    state = "sent" if success else "pending"
    request_id = str(row["id"])
    if not UUID_RE.fullmatch(request_id):
        raise WorkerError("database returned an invalid request ID")
    sql(f"UPDATE {TABLE} SET notification_status={text_literal(state)}, updated_at=now() WHERE id='{request_id}'::uuid AND notification_status='sending'")
    if not success:
        print("Notification delivery failed; it will be retried.", file=sys.stderr)
    return True


def claim_refund(request_id: str | None = None) -> dict | None:
    new_key = "jev-priority-refund-" + uuid.uuid4().hex
    if request_id is None:
        eligibility = "((status='review_passed' AND result_delivered_at IS NULL AND review_passed_at <= now()-interval '48 hours') OR (status='refund_due' AND updated_at <= now()-interval '5 minutes') OR (status='refund_pending' AND updated_at <= now()-interval '5 minutes'))"
    else:
        if not UUID_RE.fullmatch(request_id):
            raise WorkerError("request ID must be a UUID")
        eligibility = f"id='{request_id}'::uuid AND status IN ('paid','review_passed','refund_due','refund_pending')"
    return sql_json(f"""
      UPDATE {TABLE} AS r
      SET status='refund_pending',
          refund_attempts=refund_attempts + CASE WHEN refund_id IS NULL AND (refund_idempotency_key IS NULL OR refund_status IN ('failed','canceled')) THEN 1 ELSE 0 END,
          refund_idempotency_key=CASE WHEN refund_id IS NULL AND (refund_idempotency_key IS NULL OR refund_status IN ('failed','canceled')) THEN {text_literal(new_key)} ELSE refund_idempotency_key END,
          refund_status=CASE WHEN refund_id IS NOT NULL THEN refund_status ELSE 'processing' END,
          updated_at=now()
      WHERE r.id=(SELECT id FROM {TABLE} WHERE {eligibility} ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING json_build_object('id',r.id::text,'stripe_mode',r.stripe_mode,
        'payment_intent_id',r.payment_intent_id,'refund_id',r.refund_id,
        'refund_idempotency_key',r.refund_idempotency_key,'refund_attempts',r.refund_attempts)::text
    """)


def set_refund_state(row: dict, status: str, refund_status: str, refund_id: str | None = None, clear_key: bool = False) -> None:
    request_id = str(row["id"])
    if not UUID_RE.fullmatch(request_id):
        raise WorkerError("database returned an invalid request ID")
    if refund_id is not None and not STRIPE_ID_RE.fullmatch(refund_id):
        raise WorkerError("Stripe returned an invalid refund reference")
    refund_sql = "NULL" if refund_id is None else text_literal(refund_id)
    key_sql = ", refund_idempotency_key=NULL" if clear_key else ""
    refunded_sql = ", refunded_at=now()" if status == "refunded" else ""
    new_refund_id_sql = f"CASE WHEN {str(clear_key).upper()} THEN NULL ELSE COALESCE({refund_sql},refund_id) END"
    sql(f"UPDATE {TABLE} SET status={text_literal(status)}, refund_status={text_literal(refund_status)}, refund_id={new_refund_id_sql}{key_sql}{refunded_sql}, updated_at=now() WHERE id='{request_id}'::uuid AND status='refund_pending'")


def operate_refund(row: dict) -> str:
    mode = row.get("stripe_mode")
    payment_id = row.get("payment_intent_id")
    if mode not in ("test", "live") or not isinstance(payment_id, str) or not re.fullmatch(r"pi_[A-Za-z0-9]+", payment_id):
        set_refund_state(row, "refund_due", "failed")
        raise WorkerError("request has no valid payment reference")
    refund_id = row.get("refund_id")
    try:
        if refund_id:
            if not isinstance(refund_id, str) or not STRIPE_ID_RE.fullmatch(refund_id):
                raise WorkerError("database returned an invalid refund reference")
            data = stripe_request(mode, "GET", "refunds/" + urllib.parse.quote(refund_id, safe=""))
        else:
            idem = row.get("refund_idempotency_key")
            if not isinstance(idem, str) or not idem.startswith("jev-priority-refund-"):
                raise WorkerError("database has no refund idempotency key")
            data = stripe_request(mode, "POST", "refunds", {"payment_intent": payment_id}, idem)
    except StripeUnknownOutcome:
        set_refund_state(row, "refund_due", "unknown", refund_id if isinstance(refund_id, str) else None)
        return "unknown"
    except StripeFailure as exc:
        retryable = exc.status >= 500 or exc.status in (408, 409, 429)
        set_refund_state(row, "refund_due", "unknown" if retryable else "failed", refund_id if isinstance(refund_id, str) else None, clear_key=not retryable)
        return "unknown" if retryable else "failed"
    except WorkerError:
        set_refund_state(row, "refund_due", "failed", refund_id if isinstance(refund_id, str) else None, clear_key=True)
        raise

    returned_id = data.get("id")
    returned_status = data.get("status")
    if not isinstance(returned_id, str) or not STRIPE_ID_RE.fullmatch(returned_id):
        set_refund_state(row, "refund_due", "unknown", refund_id if isinstance(refund_id, str) else None)
        return "unknown"
    if returned_status == "succeeded":
        set_refund_state(row, "refunded", "succeeded", returned_id)
        return "refunded"
    if returned_status in ("failed", "canceled"):
        set_refund_state(row, "refund_due", str(returned_status), returned_id, clear_key=True)
        return "failed"
    set_refund_state(row, "refund_pending", str(returned_status or "pending"), returned_id)
    return "pending"


def process_due_refunds(limit: int = 50) -> int:
    count = 0
    for _ in range(limit):
        row = claim_refund()
        if not row:
            break
        try:
            state = operate_refund(row)
        except Exception as exc:
            print("Refund processing failed: " + type(exc).__name__, file=sys.stderr)
            state = "error"
        print(f"Refund request {row.get('id', '')}: {state}")
        if state in ("failed", "unknown", "error"):
            notify_florian(
                f"Priority evaluation refund needs attention\nRequest ID: {row.get('id', '')}\n"
                f"The refund worker could not confirm a full {str(row.get('stripe_mode', '')).upper()} refund. "
                "Check the Stripe payment record before retrying."
            )
        count += 1
    return count


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: jevbench-priority-worker.py cycle|refund REQUEST_ID", file=sys.stderr)
        return 2
    command = sys.argv[1]
    try:
        if command == "cycle":
            while process_notification():
                pass
            process_due_refunds()
            return 0
        if command == "refund" and len(sys.argv) == 3:
            request_id = sys.argv[2]
            row = claim_refund(request_id)
            if not row:
                status = sql_json(f"SELECT json_build_object('status',status)::text FROM {TABLE} WHERE id='{request_id}'::uuid")
                if status and status.get("status") == "refunded":
                    print("This request has already been refunded.")
                    return 0
                print("No refundable request found for that ID.", file=sys.stderr)
                return 1
            state = operate_refund(row)
            print(f"Refund request {request_id}: {state}")
            return 0 if state in ("refunded", "pending") else 1
        print("usage: jevbench-priority-worker.py cycle|refund REQUEST_ID", file=sys.stderr)
        return 2
    except WorkerError as exc:
        print(f"priority evaluation worker: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"priority evaluation worker: {type(exc).__name__}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
