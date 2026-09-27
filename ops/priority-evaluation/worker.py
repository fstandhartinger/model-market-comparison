#!/usr/bin/env python3
"""Paid priority-evaluation pickup, customer updates, SLA alerts, and refunds."""

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
from datetime import datetime, timezone
from pathlib import Path

HOME = Path.home()
TABLE = "bh_priority_evaluation_requests"
JOB_ROOT = HOME / "jobs/fastlane-evaluations"
PROMPT_TEMPLATE = Path(os.environ.get("FASTLANE_PROMPT_TEMPLATE", HOME / ".local/share/priority-evaluation/prompt-template.md"))
MAIL_HELPER = Path(os.environ.get("FASTLANE_MAIL_HELPER", HOME / "bin/jevbench-priority-email.py"))
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
STRIPE_ID_RE = re.compile(r"^re_[A-Za-z0-9]+$")
MODEL_SLUG_RE = re.compile(r"[^a-z0-9]+")
OWNER_PREFIX = "fastlane-eval-"


class WorkerError(Exception):
    pass


class StripeFailure(Exception):
    def __init__(self, status: int, data: dict | None):
        self.status = status
        self.data = data or {}


class StripeUnknownOutcome(Exception):
    pass


def sql(statement: str) -> str | None:
    result = subprocess.run(
        ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", "benchmarkheaven_accounts", "-c", statement],
        text=True, capture_output=True, timeout=20,
    )
    if result.returncode:
        raise WorkerError("database operation failed")
    return result.stdout.strip() or None


def sql_json(statement: str) -> dict | None:
    output = sql(statement)
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


def request_uuid(value: object) -> str:
    request_id = str(value)
    if not UUID_RE.fullmatch(request_id):
        raise WorkerError("database returned an invalid request ID")
    return request_id


def safe_job_dir(request_id: str) -> Path:
    request_uuid(request_id)
    return JOB_ROOT / request_id


def deadline(row: dict) -> datetime:
    paid_at = row.get("paid_at")
    if not isinstance(paid_at, str):
        raise WorkerError("paid request has no payment timestamp")
    parsed = datetime.fromisoformat(paid_at.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).replace(microsecond=0)


def display_deadline(row: dict) -> str:
    return datetime.fromtimestamp(
        deadline(row).timestamp() + 48 * 3600, timezone.utc
    ).strftime("%Y-%m-%d %H:%M UTC")


def owner_for(request_id: str) -> str:
    return OWNER_PREFIX + request_uuid(request_id)[:8]


def ensure_job_files(row: dict) -> tuple[Path, str]:
    request_id = request_uuid(row.get("id"))
    job_dir = safe_job_dir(request_id)
    job_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(job_dir, 0o700)
    owner = owner_for(request_id)
    safe_row = {
        key: row.get(key)
        for key in (
            "id", "email", "model_name", "model_link", "code_link", "access_type",
            "access_instructions", "notes", "benchmarks", "visibility", "amount_total",
            "base_amount", "stripe_mode", "paid_at", "review_basis",
            "synthetic_test",
        )
    }
    safe_row["owner"] = owner
    safe_row["job_dir"] = str(job_dir)
    data_path = job_dir / "request.json"
    if not data_path.exists():
        data_path.write_text(json.dumps(safe_row, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
        os.chmod(data_path, 0o600)
    if not (job_dir / "PROMPT.md").exists():
        try:
            template = PROMPT_TEMPLATE.read_text(encoding="utf-8")
        except OSError as exc:
            raise WorkerError("priority evaluation prompt template is unavailable") from exc
        prompt = template.replace("{{REQUEST_JSON}}", json.dumps(safe_row, ensure_ascii=True, indent=2))
        (job_dir / "PROMPT.md").write_text(prompt.rstrip() + "\n", encoding="utf-8")
        os.chmod(job_dir / "PROMPT.md", 0o600)
    sql(
        f"UPDATE {TABLE} SET pickup_job_dir={text_literal(str(job_dir))}, "
        f"pickup_owner={text_literal(owner)}, updated_at=now() WHERE id='{request_id}'::uuid"
    )
    return job_dir, owner


def subprocess_env(source: str) -> dict[str, str]:
    env = dict(os.environ)
    env["NOTIFY_SOURCE"] = source
    return env


def parse_systemd_state(output: str) -> dict[str, str]:
    return {
        key: value
        for line in output.splitlines()
        if "=" in line
        for key, _, value in [line.partition("=")]
    }


def claim_paid_requests(limit: int = 50) -> list[dict]:
    claimed: list[dict] = []
    for _ in range(limit):
        row = sql_json(f"""
          UPDATE {TABLE} AS r
          SET pickup_status=CASE WHEN pickup_status='started' THEN 'started' ELSE 'starting' END,
              pickup_attempts=pickup_attempts+CASE WHEN pickup_status='started' THEN 0 ELSE 1 END,
              last_pickup_attempt_at=now(), updated_at=now()
          WHERE r.id=(
            SELECT id FROM {TABLE}
            WHERE status='paid' AND stripe_mode='live' AND synthetic_test=false AND (
              pickup_status IN ('pending','failed') OR
              (pickup_status='starting' AND last_pickup_attempt_at < now()-interval '10 minutes') OR
              notification_status IN ('pending','sending') OR
              board_status IN ('pending','failed','sending') OR
              confirmation_status IN ('pending','failed','sending')
            )
            ORDER BY paid_at NULLS LAST, created_at
            FOR UPDATE SKIP LOCKED LIMIT 1
          )
          RETURNING json_build_object(
            'id',r.id::text,'email',r.email,'model_name',r.model_name,'model_link',r.model_link,
            'code_link',r.code_link,'access_type',r.access_type,'access_instructions',r.access_instructions,
            'notes',r.notes,'benchmarks',r.benchmarks,'visibility',r.visibility,'amount_total',r.amount_total,
            'base_amount',r.base_amount,'stripe_mode',r.stripe_mode,'payment_intent_id',r.payment_intent_id,
            'paid_at',r.paid_at,'review_basis',r.review_basis,'pickup_status',r.pickup_status,
            'notification_status',r.notification_status,'board_status',r.board_status,
            'confirmation_status',r.confirmation_status,'pickup_job_dir',r.pickup_job_dir,'pickup_owner',r.pickup_owner,
            'synthetic_test',r.synthetic_test
          )::text
        """)
        if not row:
            break
        claimed.append(row)
    return claimed


def send_urgent(row: dict, job_dir: Path) -> bool:
    request_id = request_uuid(row.get("id"))
    if row.get("notification_status") == "sent":
        return True
    deadline_text = display_deadline(row)
    amount = row.get("amount_total") or row.get("base_amount") or 0
    body = (
        "🚨 DRINGEND\n"
        f"New paid evaluation: {row.get('model_name', '')}; customer {row.get('email', '')}; "
        f"benchmarks {', '.join(row.get('benchmarks') or [])}; ${int(amount) / 100:.2f} USD.\n"
        f"Deadline: {deadline_text}. Owner: {owner_for(request_id)}. Job: {job_dir}"
    )
    env = subprocess_env("jevbench-priority-evaluation")
    command = [str(HOME / "bin/notify"), "urgent"]
    if row.get("synthetic_test"):
        command.append("--dry-run")
    command.append(body)
    result = subprocess.run(command, text=True, capture_output=True, timeout=45, env=env)
    state = "sent" if result.returncode == 0 else "pending"
    sql(
        f"UPDATE {TABLE} SET notification_status={text_literal(state)}, updated_at=now() "
        f"WHERE id='{request_id}'::uuid"
    )
    if not state == "sent":
        print("Urgent payment notice failed; it will be retried.", file=sys.stderr)
    if row.get("synthetic_test") and state == "sent":
        (job_dir / ".urgent-notice-dry-run.txt").write_text(result.stdout + result.stderr, encoding="utf-8")
        os.chmod(job_dir / ".urgent-notice-dry-run.txt", 0o600)
    return state == "sent"


def post_board_handoff(row: dict, job_dir: Path, owner: str) -> bool:
    request_id = request_uuid(row.get("id"))
    if row.get("board_status") == "sent":
        return True
    amount = row.get("amount_total") or row.get("base_amount") or 0
    test_prefix = "SYNTHETIC TEST — DO NOT MEASURE\n\n" if row.get("synthetic_test") else ""
    test_footer = "Synthetic dispatch check only; no submitted model or benchmark work is attached." if row.get("synthetic_test") else "Code review comes first. Keep this request at the front of its measurement queue."
    body = (
        f"{test_prefix}FAST LANE — PRIORITY #1\n\n"
        f"Model: {row.get('model_name', '')}\nCustomer: {row.get('email', '')}\n"
        f"Benchmarks: {', '.join(row.get('benchmarks') or [])}\n"
        f"Paid: ${int(amount) / 100:.2f} USD at {row.get('paid_at')}\n"
        f"Result deadline: {display_deadline(row)}\n"
        f"Owner: @{owner}\nJob folder: {job_dir}\nRequest ID: {request_id}\n\n"
        f"{test_footer}"
    )
    result = subprocess.run(
        [str(HOME / "bin/agent-board"), "--as", "fastlane-pickup", "post", "9", "-", "--to", owner, "--kind", "handoff"],
        input=body, text=True, capture_output=True, timeout=30, env=subprocess_env("fastlane-pickup"),
    )
    state = "sent" if result.returncode == 0 else "failed"
    sql(f"UPDATE {TABLE} SET board_status={text_literal(state)}, updated_at=now() WHERE id='{request_id}'::uuid")
    if state != "sent":
        print("Priority board handoff failed; it will be retried.", file=sys.stderr)
    return state == "sent"


def start_evaluation_agent(row: dict, job_dir: Path, owner: str) -> bool:
    request_id = request_uuid(row.get("id"))
    if row.get("pickup_status") == "started":
        return True
    unit = f"jevbench-priority-evaluation@{request_id}.service"
    check = subprocess.run(
        ["systemctl", "--user", "is-active", "--quiet", unit],
        text=True, capture_output=True, timeout=15,
    )
    if check.returncode == 0:
        return True
    reset = subprocess.run(["systemctl", "--user", "reset-failed", unit], text=True, capture_output=True, timeout=15)
    del reset
    result = subprocess.run(
        ["systemctl", "--user", "start", "--no-block", unit], text=True, capture_output=True, timeout=30,
        env={**subprocess_env("fastlane-pickup"), "AGENT_BOARD_NAME": owner, "AGENT_BOARD_JOBDIR": str(job_dir)},
    )
    if result.returncode:
        print("Priority evaluation agent did not start; it will be retried.", file=sys.stderr)
        return False
    # A successful `--no-block` only confirms that systemd accepted the job. Confirm
    # that it became active, or that a short synthetic run completed successfully.
    active_streak = 0
    for _ in range(20):
        state = subprocess.run(
            ["systemctl", "--user", "show", unit, "--property=ActiveState", "--property=Result", "--property=ExecMainStatus"],
            text=True, capture_output=True, timeout=10,
        )
        values = parse_systemd_state(state.stdout)
        active = values.get("ActiveState", "unknown")
        result_state = values.get("Result", "unknown")
        exit_status = values.get("ExecMainStatus", "unknown")
        if state.returncode == 0 and active in ("active", "activating", "reloading"):
            active_streak += 1
            if active_streak >= 3:
                return True
            time.sleep(0.5)
            continue
        active_streak = 0
        if state.returncode == 0 and active == "inactive" and result_state == "success" and exit_status == "0":
            return True
        if active == "failed" or result_state not in ("success", "unknown", ""):
            print("Priority evaluation agent failed during startup; it will be retried.", file=sys.stderr)
            return False
        time.sleep(0.5)
    print("Priority evaluation agent startup could not be confirmed; it will be retried.", file=sys.stderr)
    return False


def send_mail(row: dict, template: str, subject: str, body: str, status_column: str) -> bool:
    request_id = request_uuid(row.get("id"))
    allowed_columns = {"confirmation_status", "review_email_status", "delivery_email_status"}
    allowed_templates = {"payment_confirmation_v1", "review_passed_v1", "result_delivered_v1"}
    if status_column not in allowed_columns or template not in allowed_templates:
        raise WorkerError("email template is not allowlisted")
    if row.get(status_column) == "sent":
        return True
    claim = sql_json(f"""
      UPDATE {TABLE} SET {status_column}='sending', updated_at=now()
      WHERE id='{request_id}'::uuid AND {status_column} IN ('pending','failed','sending')
      RETURNING json_build_object('id',id::text)::text
    """)
    if not claim:
        return False
    env = subprocess_env("jevbench-priority-evaluation-mail")
    if template == "payment_confirmation_v1":
        env["MAIL_APPROVED_BY_FLORIAN"] = "1"
        env["MAIL_WEEKEND_OK"] = "1"
    command = [
        "/usr/bin/python3", str(MAIL_HELPER), "send", "--template", template,
        "--request-id", request_id, "--to", str(row.get("email", "")), "--subject", subject,
    ]
    result = subprocess.run(command, input=body, text=True, capture_output=True, timeout=40, env=env)
    state = "sent" if result.returncode == 0 else "failed"
    sql(f"UPDATE {TABLE} SET {status_column}={text_literal(state)}, updated_at=now() WHERE id='{request_id}'::uuid AND {status_column}='sending'")
    if state != "sent":
        print(f"Customer {template} email failed; it will be retried.", file=sys.stderr)
    return state == "sent"


def send_payment_confirmation(row: dict) -> bool:
    when_due = datetime.fromtimestamp(deadline(row).timestamp() + 48 * 3600, timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    model = str(row.get("model_name", "the submitted model"))
    benchmarks = ", ".join(row.get("benchmarks") or [])
    result_word = "public result" if row.get("visibility") == "public" else "private result"
    subject = f"{model}: payment received, evaluation running"
    body = (
        f"We received your payment for {model} ({benchmarks}). The evaluation has started.\n\n"
        f"We expect your {result_word} by {when_due}. If we miss that deadline, the payment will be automatically refunded in full.\n\n"
        "Please reply to this email if anything about the submission changes."
    )
    return send_mail(row, "payment_confirmation_v1", subject, body, "confirmation_status")


def process_paid_request(row: dict) -> None:
    job_dir, owner = ensure_job_files(row)
    request_id = request_uuid(row.get("id"))
    # Payment-time alert and handoff are independent of mail or model-provider availability.
    send_urgent(row, job_dir)
    post_board_handoff(row, job_dir, owner)
    agent_started = start_evaluation_agent(row, job_dir, owner)
    if agent_started:
        send_payment_confirmation(row)
    next_state = "started" if agent_started else "failed"
    sql(
        f"UPDATE {TABLE} SET pickup_status={text_literal(next_state)}, updated_at=now() "
        f"WHERE id='{request_id}'::uuid AND pickup_status<>'started'"
    )


def pickup_synthetic_request(request_id: str) -> None:
    request_id = request_uuid(request_id)
    row = sql_json(f"""
      SELECT json_build_object('id',id::text,'email',email,'model_name',model_name,'model_link',model_link,
        'code_link',code_link,'access_type',access_type,'access_instructions',access_instructions,
        'notes',notes,'benchmarks',benchmarks,'visibility',visibility,'amount_total',amount_total,
        'base_amount',base_amount,'stripe_mode',stripe_mode,'payment_intent_id',payment_intent_id,
        'paid_at',paid_at,'review_basis',review_basis,'pickup_status',pickup_status,
        'notification_status',notification_status,'board_status',board_status,
        'confirmation_status',confirmation_status,'pickup_job_dir',pickup_job_dir,'pickup_owner',pickup_owner,
        'synthetic_test',synthetic_test)::text
      FROM {TABLE} WHERE id='{request_id}'::uuid AND status='paid'
        AND stripe_mode='test' AND synthetic_test=true
    """)
    if not row:
        raise WorkerError("pickup test accepts only a paid, synthetic Stripe test-mode request")
    process_paid_request(row)


def process_review_and_delivery_mail(limit: int = 50) -> int:
    count = 0
    for status_column, template, subject_suffix, body_builder in (
        ("review_email_status", "review_passed_v1", "review complete", review_email_body),
        ("delivery_email_status", "result_delivered_v1", "results are ready", delivery_email_body),
    ):
        for _ in range(limit):
            row = sql_json(f"""
              SELECT json_build_object(
                'id',id::text,'email',email,'model_name',model_name,'benchmarks',benchmarks,
                'paid_at',paid_at,'result_url',result_url,'visibility',visibility,'{status_column}',{status_column}
              )::text FROM {TABLE}
              WHERE status IN ('review_passed','completed') AND {status_column}='pending'
              ORDER BY paid_at NULLS LAST, created_at LIMIT 1
            """)
            if not row:
                break
            body = body_builder(row)
            subject = f"{row.get('model_name', 'Evaluation')}: {subject_suffix}"
            send_mail(row, template, subject, body, status_column)
            count += 1
    return count


def review_email_body(row: dict) -> str:
    due = datetime.fromtimestamp(deadline(row).timestamp() + 48 * 3600, timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return (
        f"The code review for {row.get('model_name', 'your submission')} has passed, and the evaluation is underway.\n\n"
        f"Your result is due by {due}, within 48 hours of payment. We will email you when it is ready."
    )


def delivery_email_body(row: dict) -> str:
    result_url = row.get("result_url")
    if not isinstance(result_url, str) or not result_url.startswith("https://www.benchmarkheaven.com/") and not result_url.startswith("https://benchmarkheaven.com/"):
        raise WorkerError("delivered request has no valid Benchmark Heaven result URL")
    return f"The evaluation result for {row.get('model_name', 'your submission')} is ready: {result_url}"


def process_sla_alerts(limit: int = 50) -> int:
    count = 0
    for hours, column in ((24, "sla_24h_alerted_at"), (36, "sla_36h_alerted_at")):
        for _ in range(limit):
            row = sql_json(f"""
              UPDATE {TABLE} AS r SET {column}=now(), updated_at=now()
              WHERE r.id=(
                SELECT id FROM {TABLE}
                WHERE status IN ('paid','review_passed') AND result_delivered_at IS NULL
                  AND stripe_mode='live' AND synthetic_test=false
                  AND paid_at + interval '48 hours' + sla_paused_seconds * interval '1 second' <= now() + interval '{48 - hours} hours'
                  AND customer_hold_started_at IS NULL AND {column} IS NULL
                ORDER BY paid_at FOR UPDATE SKIP LOCKED LIMIT 1
              )
              RETURNING json_build_object('id',id::text,'email',email,'model_name',model_name,
                'benchmarks',benchmarks,'paid_at',paid_at,'sla_paused_seconds',sla_paused_seconds)::text
            """)
            if not row:
                break
            request_id = request_uuid(row.get("id"))
            due = datetime.fromtimestamp(deadline(row).timestamp() + 48 * 3600 + int(row.get("sla_paused_seconds") or 0), timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            message = (
                "🚨 DRINGEND\n"
                f"Priority evaluation SLA alert at {hours} hours: {row.get('model_name', '')} for {row.get('email', '')}. "
                f"Benchmarks: {', '.join(row.get('benchmarks') or [])}. Delivery deadline: {due}. "
                f"Request ID: {request_id}."
            )
            result = subprocess.run(
                [str(HOME / "bin/notify"), "urgent", message],
                text=True, capture_output=True, timeout=45, env=subprocess_env("jevbench-priority-sla"),
            )
            if result.returncode:
                sql(f"UPDATE {TABLE} SET {column}=NULL WHERE id='{request_id}'::uuid")
                print(f"{hours}-hour alert failed; it will be retried.", file=sys.stderr)
            count += 1
    return count


def load_stripe_key(mode: str) -> str:
    path = HOME / ".config/stripe/stripe.env"
    try:
        stat_info = path.stat()
        if stat_info.st_uid != os.getuid() or stat_info.st_mode & 0o077:
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


def claim_refund(request_id: str | None = None) -> dict | None:
    new_key = "jev-priority-refund-" + uuid.uuid4().hex
    if request_id is None:
        eligibility = "((status IN ('paid','review_passed') AND result_delivered_at IS NULL AND customer_hold_started_at IS NULL AND stripe_mode='live' AND synthetic_test=false AND paid_at + interval '48 hours' + sla_paused_seconds * interval '1 second' <= now()) OR (status='refund_due' AND updated_at <= now()-interval '5 minutes') OR (status='refund_pending' AND updated_at <= now()-interval '5 minutes'))"
    else:
        if not UUID_RE.fullmatch(request_id):
            raise WorkerError("request ID must be a UUID")
        eligibility = f"id='{request_id}'::uuid AND status IN ('paid','review_passed','refund_due','refund_pending') AND customer_hold_started_at IS NULL"
    return sql_json(f"""
      UPDATE {TABLE} AS r
      SET status='refund_pending',
          refund_attempts=refund_attempts + CASE WHEN refund_id IS NULL AND (refund_idempotency_key IS NULL OR refund_status IN ('failed','canceled')) THEN 1 ELSE 0 END,
          refund_idempotency_key=CASE WHEN refund_id IS NULL AND (refund_idempotency_key IS NULL OR refund_status IN ('failed','canceled')) THEN {text_literal(new_key)} ELSE refund_idempotency_key END,
          refund_status=CASE WHEN refund_id IS NOT NULL THEN refund_status ELSE 'processing' END,
          updated_at=now()
      WHERE r.id=(SELECT id FROM {TABLE} WHERE {eligibility} ORDER BY paid_at NULLS LAST, created_at FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING json_build_object('id',r.id::text,'stripe_mode',r.stripe_mode,
        'payment_intent_id',r.payment_intent_id,'refund_id',r.refund_id,
        'refund_idempotency_key',r.refund_idempotency_key,'refund_attempts',r.refund_attempts)::text
    """)


def set_refund_state(row: dict, status: str, refund_status: str, refund_id: str | None = None, clear_key: bool = False) -> None:
    request_id = request_uuid(row.get("id"))
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
                "🚨 DRINGEND\nPriority evaluation refund needs attention\n"
                f"Request ID: {row.get('id', '')}. Stripe did not confirm the full refund; check its payment record."
            )
        count += 1
    return count


def notify_florian(message: str, dry_run: bool = False) -> bool:
    command = [str(HOME / "bin/notify"), "urgent"]
    if dry_run:
        command.append("--dry-run")
    command.append(message)
    result = subprocess.run(command, text=True, capture_output=True, timeout=45, env=subprocess_env("jevbench-priority-evaluation"))
    return result.returncode == 0


def process_cycle() -> None:
    watcher = subprocess.run(
        ["/usr/bin/python3", str(HOME / "bin/jevbench-priority-mail-watch.py"), "cycle"],
        text=True, capture_output=True, timeout=90,
        env=subprocess_env("fastlane-customer-mail"),
    )
    if watcher.returncode:
        print("Customer-mail watch failed; it will retry on the next worker tick.", file=sys.stderr)
    for row in claim_paid_requests():
        try:
            process_paid_request(row)
        except Exception as exc:
            request_id = request_uuid(row.get("id"))
            sql(f"UPDATE {TABLE} SET pickup_status='failed', updated_at=now() WHERE id='{request_id}'::uuid AND pickup_status<>'started'")
            print(f"Priority request {request_id} pickup failed: {type(exc).__name__}", file=sys.stderr)
    process_review_and_delivery_mail()
    process_sla_alerts()
    process_due_refunds()


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: jevbench-priority-worker.py cycle|refund REQUEST_ID", file=sys.stderr)
        return 2
    command = sys.argv[1]
    try:
        if command == "cycle" and len(sys.argv) == 2:
            process_cycle()
            return 0
        if command == "refund" and len(sys.argv) == 3:
            request_id = request_uuid(sys.argv[2])
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
        if command == "pickup-test" and len(sys.argv) == 3:
            pickup_synthetic_request(sys.argv[2])
            return 0
        print("usage: jevbench-priority-worker.py cycle|refund REQUEST_ID|pickup-test REQUEST_ID", file=sys.stderr)
        return 2
    except WorkerError as exc:
        print(f"priority evaluation worker: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"priority evaluation worker: {type(exc).__name__}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
