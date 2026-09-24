#!/usr/bin/env python3
"""Sandy worker for priority request notices and deadline refunds."""

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

HOME = Path.home()
TABLE = "bh_priority_evaluation_requests"
AUTO_REFUND_FAILURE_ATTEMPT_LIMIT = 3
NOTIFICATION_PHASE_BUDGET_SECONDS = 120
REFUND_IDEMPOTENCY_SAFE_RETRY_SECONDS = 20 * 60 * 60
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
STRIPE_ID_RE = re.compile(r"^re_[A-Za-z0-9]+$")
REFUND_KEY_RE = re.compile(r"^jev-priority-refund-v2-(\d{10})-([0-9a-f]{32})$")


class WorkerError(Exception):
    pass


class InvalidRefundReference(WorkerError):
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


def sql_json_rows(sql_text: str) -> list[dict]:
    output = sql(sql_text)
    if not output:
        return []
    rows = []
    for line in output.splitlines():
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            raise WorkerError("database returned an invalid response") from exc
        if not isinstance(value, dict):
            raise WorkerError("database returned an invalid record")
        rows.append(value)
    return rows


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


def notification_claim_eligibility_sql() -> str:
    return """status='paid' AND (
      (notification_status='pending' AND (
        last_notification_attempt_at IS NULL OR
        last_notification_attempt_at < now()-interval '1 minute'
      )) OR
      (notification_status='sending' AND last_notification_attempt_at < now()-interval '10 minutes')
    )"""


def claim_notification() -> dict | None:
    return sql_json(f"""
      UPDATE {TABLE} AS r
      SET notification_status='sending', notification_attempts=notification_attempts+1,
          last_notification_attempt_at=now(), updated_at=now()
      WHERE r.id=(
        SELECT id FROM {TABLE}
        WHERE {notification_claim_eligibility_sql()}
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


def refund_claim_has_safe_retry_reference_sql() -> str:
    return """refund_id IS NOT NULL OR refund_idempotency_key IS NOT NULL OR
      refund_status IS NULL OR refund_status IN ('failed','canceled')"""


def automatic_terminal_refund_retry_eligibility_sql() -> str:
    return f"""(
      (
        refund_status IS DISTINCT FROM 'manual_review'
        OR refund_attention_notified_attempts < refund_attempt_seq
        OR refund_attention_notified_state IS DISTINCT FROM 'manual_review'
      )
      AND
      (
        (refund_status IS DISTINCT FROM 'failed' AND refund_status IS DISTINCT FROM 'canceled')
        OR (refund_id IS NULL AND refund_attempts < {AUTO_REFUND_FAILURE_ATTEMPT_LIMIT})
      )
      AND ({refund_claim_has_safe_retry_reference_sql()})
    )"""


def refund_attention_marker_eligibility_sql(attempt_seq: int, state: str) -> str:
    return f"""r.refund_attempt_seq >= {attempt_seq} AND (
      r.refund_attention_notified_attempts < {attempt_seq}
      OR (r.refund_attempt_seq={attempt_seq}
        AND r.refund_attention_notified_state IS DISTINCT FROM {text_literal(state)})
    )"""


def refund_attention_marker_state_update_sql(attempt_seq: int, state: str) -> str:
    return f"CASE WHEN r.refund_attempt_seq={attempt_seq} THEN {text_literal(state)} ELSE r.refund_attention_notified_state END"


def mark_refund_attention_notified(row: dict, state: str) -> bool:
    request_id = str(row.get("id", ""))
    attempt_seq = row.get("refund_attempt_seq")
    if not UUID_RE.fullmatch(request_id):
        raise WorkerError("database returned an invalid request ID")
    if not isinstance(attempt_seq, int) or isinstance(attempt_seq, bool) or attempt_seq < 1:
        raise WorkerError("database returned an invalid refund attempt sequence")
    if state not in ("failed", "unknown", "error", "manual_review"):
        raise WorkerError("invalid refund attention state")
    result = sql_json(f"""
      UPDATE {TABLE} AS r
      SET refund_attention_notified_attempts=GREATEST(r.refund_attention_notified_attempts,{attempt_seq}),
          refund_attention_notified_state={refund_attention_marker_state_update_sql(attempt_seq, state)},
          updated_at=now()
      WHERE r.id='{request_id}'::uuid AND ({refund_attention_marker_eligibility_sql(attempt_seq, state)})
      RETURNING json_build_object('id',r.id::text)::text
    """)
    return result is not None


def refund_attention_should_notify(
    state: str,
    refund_attempt_seq: int,
    notified_attempts: int,
    notified_state: str | None,
) -> bool:
    if state not in ("failed", "unknown", "error", "manual_review"):
        return False
    # Alert once per distinct refund attempt and state. Unknown retries reuse the
    # same key, so they do not send a new alert on every five-minute poll.
    return refund_attempt_seq > notified_attempts or state != notified_state


def pending_refund_attention_sql(limit: int = 50) -> str:
    limit = max(0, min(int(limit), 100))
    return f"""SELECT json_build_object(
        'id',r.id::text,'stripe_mode',r.stripe_mode,'status',r.status,
        'refund_status',r.refund_status,'refund_attempt_seq',r.refund_attempt_seq,
        'refund_attention_notified_attempts',r.refund_attention_notified_attempts,
        'refund_attention_notified_state',r.refund_attention_notified_state
      )::text
      FROM {TABLE} AS r
      WHERE r.status IN ('refund_due','refund_pending')
        AND r.refund_status IN ('failed','unknown','manual_review')
        AND r.refund_attempt_seq > 0
        AND (
          r.refund_attention_notified_attempts < r.refund_attempt_seq
          OR r.refund_attention_notified_state IS DISTINCT FROM r.refund_status
        )
      ORDER BY r.updated_at,r.created_at
      LIMIT {limit}
    """


def refund_attention_message(row: dict, state: str) -> str:
    request_id = str(row.get("id", ""))
    message = (
        f"Priority evaluation refund needs attention\nRequest ID: {request_id}\n"
        f"The refund worker could not confirm a full {str(row.get('stripe_mode', '')).upper()} refund. "
        "Check the Stripe payment record before retrying."
    )
    if state == "manual_review":
        message += (
            " The saved idempotency key is outside its safe retry window. "
            "If the Stripe payment has no refund, run "
            f"~/bin/jevbench-refund {request_id} --confirmed-no-refund."
        )
    return message


def deliver_refund_attention(row: dict, state: str) -> bool:
    sent = notify_florian(refund_attention_message(row, state))
    if sent:
        mark_refund_attention_notified(row, state)
    return sent


def process_pending_refund_attention(deadline: float, limit: int = 50) -> int:
    try:
        rows = sql_json_rows(pending_refund_attention_sql(limit))
    except Exception as exc:
        print("Pending refund attention lookup failed: " + type(exc).__name__, file=sys.stderr)
        return 0
    count = 0
    for row in rows:
        if time.monotonic() >= deadline:
            break
        state = str(row.get("refund_status", ""))
        if not refund_attention_should_notify(
            state,
            row.get("refund_attempt_seq", 0),
            row.get("refund_attention_notified_attempts", 0),
            row.get("refund_attention_notified_state"),
        ):
            continue
        try:
            deliver_refund_attention(row, state)
        except Exception as exc:
            print("Refund attention notice failed: " + type(exc).__name__, file=sys.stderr)
        count += 1
    return count


def refund_claim_needs_new_attempt_sql(confirm_unknown_retry: bool = False) -> str:
    retryable_status = (
        "refund_status IN ('failed','canceled') OR refund_status='manual_review'"
        if confirm_unknown_retry
        else "refund_status IN ('failed','canceled')"
    )
    return f"refund_id IS NULL AND (({retryable_status}) OR (refund_idempotency_key IS NULL AND refund_status IS NULL))"


def refund_attempt_increment_sql(automatic: bool = True, confirm_unknown_retry: bool = False) -> str:
    if not automatic:
        # This counter is the automatic retry cap; a manual claim is never blocked by it.
        return "0"
    return f"CASE WHEN {refund_claim_needs_new_attempt_sql(confirm_unknown_retry)} THEN 1 ELSE 0 END"


def refund_attempt_seq_increment_sql(confirm_unknown_retry: bool = False) -> str:
    return f"CASE WHEN {refund_claim_needs_new_attempt_sql(confirm_unknown_retry)} THEN 1 ELSE 0 END"


def refund_idempotency_key_update_sql(new_key: str, confirm_unknown_retry: bool = False) -> str:
    return f"CASE WHEN {refund_claim_needs_new_attempt_sql(confirm_unknown_retry)} THEN {text_literal(new_key)} ELSE refund_idempotency_key END"


def refund_claim_eligibility_sql(request_id: str | None = None, confirm_unknown_retry: bool = False) -> str:
    if request_id is None:
        # Unknown outcomes reuse their timestamped key only inside Stripe's safe window.
        # Only terminal automatic failures that need a new key are capped. An uncertain
        # prior attempt without a safe key is parked for explicit payment-record review.
        return f"""(
          (
            status='review_passed' AND result_delivered_at IS NULL
            AND review_passed_at <= now()-interval '48 hours'
            AND ({refund_claim_has_safe_retry_reference_sql()})
          )
          OR (
            status='refund_due' AND updated_at <= now()-interval '5 minutes'
            AND {automatic_terminal_refund_retry_eligibility_sql()}
          )
          OR (
            status='refund_pending' AND updated_at <= now()-interval '5 minutes'
            AND refund_status IS DISTINCT FROM 'manual_review'
            AND ({refund_claim_has_safe_retry_reference_sql()})
          )
        )"""
    if not UUID_RE.fullmatch(request_id):
        raise WorkerError("request ID must be a UUID")
    status_clause = "('paid','review_passed','refund_due','refund_pending','manual_review')" if confirm_unknown_retry else "('paid','review_passed','refund_due','refund_pending')"
    manual_review_guard = "" if confirm_unknown_retry else " AND refund_status IS DISTINCT FROM 'manual_review'"
    return f"id='{request_id}'::uuid AND status IN {status_clause}{manual_review_guard} AND ({refund_claim_has_safe_retry_reference_sql()})"


def new_refund_idempotency_key(now: int | None = None) -> str:
    issued_at = int(time.time()) if now is None else int(now)
    return f"jev-priority-refund-v2-{issued_at}-{uuid.uuid4().hex}"


def refund_key_within_safe_retry_window(key: object, now: int | None = None) -> bool:
    if not isinstance(key, str):
        return False
    match = REFUND_KEY_RE.fullmatch(key)
    if not match:
        return False
    issued_at = int(match.group(1))
    current_time = int(time.time()) if now is None else int(now)
    age = current_time - issued_at
    return 0 <= age < REFUND_IDEMPOTENCY_SAFE_RETRY_SECONDS


def claim_refund(request_id: str | None = None, confirm_unknown_retry: bool = False) -> dict | None:
    new_key = new_refund_idempotency_key()
    eligibility = refund_claim_eligibility_sql(request_id, confirm_unknown_retry)
    return sql_json(f"""
      UPDATE {TABLE} AS r
      SET status='refund_pending',
          refund_attempts=refund_attempts + {refund_attempt_increment_sql(automatic=request_id is None, confirm_unknown_retry=confirm_unknown_retry)},
          refund_attempt_seq=refund_attempt_seq + {refund_attempt_seq_increment_sql(confirm_unknown_retry)},
          refund_idempotency_key={refund_idempotency_key_update_sql(new_key, confirm_unknown_retry)},
          refund_status=CASE WHEN refund_id IS NOT NULL THEN refund_status ELSE 'processing' END,
          updated_at=now()
      WHERE r.id=(SELECT id FROM {TABLE} WHERE {eligibility} ORDER BY updated_at,created_at FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING json_build_object('id',r.id::text,'stripe_mode',r.stripe_mode,
        'payment_intent_id',r.payment_intent_id,'refund_id',r.refund_id,
        'refund_idempotency_key',r.refund_idempotency_key,'refund_attempts',r.refund_attempts,
        'refund_attempt_seq',r.refund_attempt_seq,
        'refund_attention_notified_attempts',r.refund_attention_notified_attempts,
        'refund_attention_notified_state',r.refund_attention_notified_state,
        'refund_status',r.refund_status)::text
    """)


def set_refund_state(row: dict, status: str, refund_status: str, refund_id: str | None = None, clear_key: bool = False) -> None:
    request_id = str(row["id"])
    if not UUID_RE.fullmatch(request_id):
        raise WorkerError("database returned an invalid request ID")
    if refund_id is not None and not STRIPE_ID_RE.fullmatch(refund_id):
        raise WorkerError("Stripe returned an invalid refund reference")
    refund_sql = refund_id_update_sql(refund_id, clear_key)
    key_sql = ", refund_idempotency_key=NULL" if clear_key else ""
    refunded_sql = ", refunded_at=now()" if status == "refunded" else ""
    sql(f"UPDATE {TABLE} SET status={text_literal(status)}, refund_status={text_literal(refund_status)}, refund_id={refund_sql}{key_sql}{refunded_sql}, updated_at=now() WHERE id='{request_id}'::uuid AND status='refund_pending'")


def refund_id_update_sql(refund_id: str | None, clear_key: bool) -> str:
    refund_sql = "NULL" if refund_id is None else text_literal(refund_id)
    clear_key_literal = "TRUE" if clear_key else "FALSE"
    return f"CASE WHEN {clear_key_literal} THEN NULL ELSE COALESCE({refund_sql},refund_id) END"


def operate_refund(row: dict) -> str:
    mode = row.get("stripe_mode")
    payment_id = row.get("payment_intent_id")
    if mode not in ("test", "live") or not isinstance(payment_id, str) or not re.fullmatch(r"pi_[A-Za-z0-9]+", payment_id):
        set_refund_state(row, "refund_due", "failed")
        return "failed"
    refund_id = row.get("refund_id")
    try:
        if refund_id:
            if not isinstance(refund_id, str) or not STRIPE_ID_RE.fullmatch(refund_id):
                raise InvalidRefundReference("database returned an invalid refund reference")
            data = stripe_request(mode, "GET", "refunds/" + urllib.parse.quote(refund_id, safe=""))
        else:
            idem = row.get("refund_idempotency_key")
            if not isinstance(idem, str) or not idem.startswith("jev-priority-refund-"):
                raise WorkerError("database has no refund idempotency key")
            if not refund_key_within_safe_retry_window(idem):
                # Stripe may prune idempotency results after 24 hours. Park old or
                # legacy keys for a payment-record check instead of risking a new refund.
                set_refund_state(row, "refund_due", "manual_review")
                return "manual_review"
            data = stripe_request(mode, "POST", "refunds", {"payment_intent": payment_id}, idem)
    except StripeUnknownOutcome:
        set_refund_state(row, "refund_due", "unknown", refund_id if isinstance(refund_id, str) else None)
        return "unknown"
    except StripeFailure as exc:
        if refund_id:
            # Never discard a known refund reference after a GET error. Retry
            # transient responses, but surface definite client errors and stop the
            # timer from polling a refund ID Stripe says it cannot retrieve.
            retryable = exc.status >= 500 or exc.status in (408, 409, 429)
            state = "unknown" if retryable else "failed"
            set_refund_state(row, "refund_due", state)
            return state
        retryable = exc.status >= 500 or exc.status in (408, 409, 429)
        set_refund_state(row, "refund_due", "unknown" if retryable else "failed", refund_id if isinstance(refund_id, str) else None, clear_key=not retryable)
        return "unknown" if retryable else "failed"
    except InvalidRefundReference:
        if refund_id:
            # An invalid stored ID cannot be retried against Stripe, but keep it for
            # inspection and never replace it with a second refund attempt.
            set_refund_state(row, "refund_due", "failed")
            return "failed"
        raise
    except WorkerError:
        if refund_id:
            # Credential/configuration failures can recover after local correction;
            # keep the reference and retry the GET without creating another refund.
            set_refund_state(row, "refund_due", "unknown")
            return "unknown"
        set_refund_state(row, "refund_due", "failed", refund_id if isinstance(refund_id, str) else None, clear_key=True)
        return "failed"

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
        # A claim failure is fatal for this cycle: no row was returned, and the
        # nonzero service exit lets the five-minute systemd timer retry later.
        row = claim_refund()
        if not row:
            break
        try:
            state = operate_refund(row)
        except Exception as exc:
            print("Refund processing failed: " + type(exc).__name__, file=sys.stderr)
            state = "error"
        print(f"Refund request {row.get('id', '')}: {state}")
        if refund_attention_should_notify(
            state,
            row.get("refund_attempt_seq", 0),
            row.get("refund_attention_notified_attempts", 0),
            row.get("refund_attention_notified_state"),
        ):
            try:
                deliver_refund_attention(row, state)
            except Exception as exc:
                # A notice/marker error must not starve the rest of the refund batch.
                print("Refund attention notice failed: " + type(exc).__name__, file=sys.stderr)
        count += 1
    return count


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: jevbench-priority-worker.py cycle|refund REQUEST_ID [--confirmed-no-refund]", file=sys.stderr)
        return 2
    command = sys.argv[1]
    try:
        if command == "cycle":
            notification_deadline = time.monotonic() + NOTIFICATION_PHASE_BUDGET_SECONDS
            process_pending_refund_attention(deadline=notification_deadline)
            while time.monotonic() < notification_deadline and process_notification():
                pass
            process_due_refunds(limit=1)
            return 0
        if command == "refund" and len(sys.argv) in (3, 4):
            request_id = sys.argv[2]
            if not UUID_RE.fullmatch(request_id):
                raise WorkerError("request ID must be a UUID")
            confirmed_no_refund = len(sys.argv) == 4 and sys.argv[3] == "--confirmed-no-refund"
            if len(sys.argv) == 4 and not confirmed_no_refund:
                print("usage: jevbench-priority-worker.py refund REQUEST_ID [--confirmed-no-refund]", file=sys.stderr)
                return 2
            row = claim_refund(request_id, confirm_unknown_retry=confirmed_no_refund)
            if not row:
                status = sql_json(f"SELECT json_build_object('status',status,'refund_status',refund_status)::text FROM {TABLE} WHERE id='{request_id}'::uuid")
                if status and status.get("status") == "refunded":
                    print("This request has already been refunded.")
                    return 0
                if status and status.get("refund_status") == "manual_review":
                    print(
                        "This refund needs manual review. Check the Stripe payment record; "
                        "if no refund exists, rerun with --confirmed-no-refund.",
                        file=sys.stderr,
                    )
                elif status:
                    print(f"Cannot refund this request in its current state: {status.get('status')}.", file=sys.stderr)
                else:
                    print("No priority evaluation request found for that ID.", file=sys.stderr)
                return 1
            # This command is operator-attended: report the outcome synchronously
            # and return nonzero when the refund is not confirmed. Scheduled cycles
            # own background attention notices.
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
