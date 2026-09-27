#!/usr/bin/env python3
"""Run one synthetic Stripe test-mode webhook through fast-lane pickup safely."""

import email
import imaplib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from email.utils import formatdate
from pathlib import Path

HOME = Path.home()
TABLE = "bh_priority_evaluation_requests"
EVENTS = "bh_priority_eval_webhook_events"
ROOT = Path(__file__).resolve().parent
JOB_ROOT = HOME / "jobs/fastlane-evaluations"
UNIT_PATH = HOME / ".config/systemd/user/jevbench-priority-evaluation@.service"
EMAIL_HELPER = ROOT / "gmail_email_access.py"
WORKER = ROOT / "worker.py"
DEFAULT_TEST_EMAIL = "florian.standhartinger+fastlane-e2e@gmail.com"
DEFAULT_WEBHOOK_URL = "http://127.0.0.1:3317/api/priority-evaluation/webhook"


def psql(statement: str) -> str:
    result = subprocess.run(
        ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", "benchmarkheaven_accounts", "-c", statement],
        text=True, capture_output=True, timeout=25,
    )
    if result.returncode:
        raise RuntimeError("database operation failed")
    return result.stdout.strip()


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def write_receipt(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.chmod(temp, 0o600)
    os.replace(temp, path)
    os.chmod(path, 0o600)


def test_unit_text() -> str:
    return f"""[Unit]
Description=Temporary synthetic fast-lane evaluation test
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 {ROOT / 'agent_runner.py'} %i evaluate
TimeoutStartSec=600
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=%h/jobs/fastlane-evaluations/%i %h/.local/share/agent-board
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
"""


def ensure_agent_template() -> tuple[bool, str]:
    UNIT_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if UNIT_PATH.exists():
        return False, UNIT_PATH.read_text(encoding="utf-8")
    UNIT_PATH.write_text(test_unit_text(), encoding="utf-8")
    os.chmod(UNIT_PATH, 0o600)
    result = subprocess.run(["systemctl", "--user", "daemon-reload"], text=True, capture_output=True, timeout=30)
    if result.returncode:
        UNIT_PATH.unlink(missing_ok=True)
        raise RuntimeError("temporary evaluation service could not be loaded")
    return True, ""


def restore_agent_template(created: bool, prior_text: str) -> None:
    if created:
        UNIT_PATH.unlink(missing_ok=True)
    else:
        UNIT_PATH.write_text(prior_text, encoding="utf-8")
        os.chmod(UNIT_PATH, 0o644)
    subprocess.run(["systemctl", "--user", "daemon-reload"], text=True, capture_output=True, timeout=30)


def create_checkout_pending(email_address: str, request_id: str, model: str) -> None:
    submission_id = str(uuid.uuid4())
    values = [
        literal(request_id), literal(submission_id), literal(email_address), literal(model),
        literal("https://example.com/synthetic-model"), literal("https://example.com/synthetic-code"),
        literal("open_weights"), literal("Synthetic test only; no model code is attached."),
        literal("Test-mode webhook and pickup verification."), "ARRAY['jevbench']", literal("public"),
        literal("api_or_small_open"), "4900", "1", "4900", literal("test"), "true",
    ]
    query = f"""
      INSERT INTO {TABLE}
        (id,submission_id,email,model_name,model_link,code_link,access_type,access_instructions,notes,
         benchmarks,visibility,pricing_tier,unit_amount,quantity,base_amount,stripe_mode,synthetic_test)
      VALUES ({','.join(values)}) RETURNING id::text
    """
    inserted_id = psql(query)
    if inserted_id != request_id:
        raise RuntimeError("synthetic request ID mismatch")


def signed_webhook(request_id: str, model: str, url: str, secret: str) -> dict:
    created = int(time.time())
    event_id = "evt_synthetic_" + uuid.uuid4().hex
    session_id = "cs_test_synthetic_" + uuid.uuid4().hex[:16]
    payment_intent = "pi_test_synthetic_" + uuid.uuid4().hex[:20]
    event = {
        "id": event_id,
        "type": "checkout.session.completed",
        "created": created,
        "livemode": False,
        "data": {"object": {
            "id": session_id,
            "mode": "payment",
            "status": "complete",
            "payment_status": "paid",
            "currency": "usd",
            "amount_subtotal": 4900,
            "amount_total": 4900,
            "payment_intent": payment_intent,
            "client_reference_id": request_id,
            "metadata": {"priority_request_id": request_id},
            "description": model,
        }},
    }
    payload = json.dumps(event, separators=(",", ":")).encode("utf-8")
    import hashlib
    import hmac
    digest = hmac.new(secret.encode(), str(created).encode() + b"." + payload, hashlib.sha256).hexdigest()
    request = urllib.request.Request(
        url, data=payload, method="POST",
        headers={"Content-Type": "application/json", "stripe-signature": f"t={created},v1={digest}"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        body = json.loads(response.read(32_000))
    return {"event": event, "webhook_response": body}


def send_status(request_id: str) -> dict:
    output = psql(f"""
      SELECT json_build_object('status',status,'pickup_status',pickup_status,
        'notification_status',notification_status,'board_status',board_status,
        'confirmation_status',confirmation_status,'evaluation_status',evaluation_status,
        'paid_at',paid_at)::text
      FROM {TABLE} WHERE id='{request_id}'::uuid
    """)
    return json.loads(output)


def unit_state(request_id: str) -> dict:
    result = subprocess.run(
        ["systemctl", "--user", "show", f"jevbench-priority-evaluation@{request_id}.service",
         "--property=ActiveState", "--property=Result", "--property=ExecMainStatus"],
        text=True, capture_output=True, timeout=10,
    )
    return {key: value for line in result.stdout.splitlines() if "=" in line for key, _, value in [line.partition("=")]}


def find_message_in_sent(message_id: str) -> bool:
    import importlib.util
    spec = importlib.util.spec_from_file_location("fastlane_email_helper", EMAIL_HELPER)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    password = helper.app_password()
    with imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=25) as client:
        client.login("florian.standhartinger@gmail.com", password)
        status, _ = client.select('"[Gmail]/Sent Mail"', readonly=True)
        if status != "OK":
            raise RuntimeError("Gmail Sent folder could not be opened read-only")
        status, data = client.search(None, "HEADER", "Message-ID", message_id)
        return status == "OK" and bool(data and data[0])


def main() -> int:
    email_address = os.environ.get("FASTLANE_E2E_EMAIL", DEFAULT_TEST_EMAIL).strip().lower()
    webhook_url = os.environ.get("FASTLANE_E2E_WEBHOOK_URL", DEFAULT_WEBHOOK_URL)
    webhook_secret = os.environ.get("STRIPE_TEST_WEBHOOK_SECRET", "")
    if not webhook_secret or len(webhook_secret) < 12:
        raise SystemExit("Set STRIPE_TEST_WEBHOOK_SECRET to a local test-only signing secret.")
    request_id = str(uuid.uuid4())
    model = "Synthetic Fastlane E2E " + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    root = JOB_ROOT / request_id
    receipt_path = root / "e2e-receipt.json"
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(root, 0o700)
    template_created, previous_template = ensure_agent_template()
    receipt = {"request_id": request_id, "email": email_address, "model_name": model, "created_at_utc": datetime.now(timezone.utc).isoformat()}
    try:
        create_checkout_pending(email_address, request_id, model)
        webhook = signed_webhook(request_id, model, webhook_url, webhook_secret)
        receipt["stripe_test_event_id"] = webhook["event"]["id"]
        receipt["webhook_response"] = webhook["webhook_response"]
        write_receipt(receipt_path, receipt)
        if webhook["webhook_response"].get("result") != "recorded":
            raise RuntimeError("synthetic webhook did not record a new payment")
        python = str(Path(sys.executable))
        env = dict(os.environ)
        env["FASTLANE_PROMPT_TEMPLATE"] = str(ROOT / "prompt-template.md")
        env["FASTLANE_MAIL_HELPER"] = str(EMAIL_HELPER)
        worker = subprocess.run(
            [python, str(WORKER), "pickup-test", request_id],
            text=True, capture_output=True, timeout=150, env=env,
        )
        receipt["worker_exit_code"] = worker.returncode
        receipt["worker_stdout"] = worker.stdout[-4000:]
        receipt["worker_stderr"] = worker.stderr[-4000:]
        write_receipt(receipt_path, receipt)
        if worker.returncode:
            raise RuntimeError("synthetic worker pickup did not complete")

        expected_unit = f"jevbench-priority-evaluation@{request_id}.service"
        deadline = time.time() + 120
        state = {}
        request_root = JOB_ROOT / request_id
        agent_receipt = request_root / ".agent-started.json"
        engine_receipt = request_root / ".engine"
        service_state = {}
        while time.time() < deadline:
            state = send_status(request_id)
            service_state = unit_state(request_id)
            active = service_state.get("ActiveState")
            completed = service_state.get("ActiveState") == "inactive" and service_state.get("Result") == "success" and service_state.get("ExecMainStatus") == "0"
            started = (agent_receipt.is_file() and engine_receipt.is_file() and (active in ("active", "activating") or completed))
            if (started and state.get("confirmation_status") == "sent"
                    and state.get("notification_status") == "sent" and state.get("board_status") == "sent"
                    and state.get("pickup_status") == "started"):
                break
            time.sleep(3)
        receipt["final_request_state"] = state
        receipt["evaluation_unit_state"] = service_state
        urgent_path = request_root / ".urgent-notice-dry-run.txt"
        urgent_text = urgent_path.read_text(encoding="utf-8", errors="replace") if urgent_path.is_file() else ""
        receipt["urgent_notice_has_required_fields"] = all(
            item in urgent_text for item in (model, email_address, "jevbench", "$49.00", "Deadline:", "Job:")
        )
        for name in (".engine", ".agent-started.json", ".urgent-notice-dry-run.txt", ".agent-attempt.log", "OUTPUT.md"):
            path = request_root / name
            receipt[name.lstrip(".")] = path.read_text(encoding="utf-8", errors="replace")[-4000:] if path.is_file() else None
        message_id = f"<fastlane-{request_id}-payment_confirmation_v1@benchmarkheaven.com>"
        if (not agent_receipt.is_file() or not engine_receipt.is_file()
                or not receipt["urgent_notice_has_required_fields"]
                or state.get("confirmation_status") != "sent"
                or state.get("notification_status") != "sent" or state.get("board_status") != "sent"
                or state.get("pickup_status") != "started"
                or not (service_state.get("ActiveState") in ("active", "activating") or completed)):
            raise RuntimeError(f"synthetic path incomplete; systemd unit {expected_unit}")
        receipt["gmail_sent_message_id"] = message_id
        receipt["gmail_sent_verified"] = find_message_in_sent(message_id)
        if not receipt["gmail_sent_verified"]:
            raise RuntimeError("confirmation is not visible in Gmail Sent")
        receipt["result"] = "passed"
        write_receipt(receipt_path, receipt)
        print("Synthetic fast-lane E2E passed: signed test webhook, urgent dry-run, board handoff, paid agent start, and confirmation in Gmail Sent.")
        return 0
    except Exception as exc:
        receipt["result"] = "failed"
        receipt["error_type"] = type(exc).__name__
        write_receipt(receipt_path, receipt)
        raise
    finally:
        try:
            subprocess.run(["systemctl", "--user", "stop", f"jevbench-priority-evaluation@{request_id}.service"], text=True, capture_output=True, timeout=30)
        except Exception:
            pass
        try:
            psql(f"DELETE FROM {EVENTS} WHERE request_id='{request_id}'::uuid; DELETE FROM {TABLE} WHERE id='{request_id}'::uuid")
        except Exception:
            pass
        if template_created:
            restore_agent_template(template_created, previous_template)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, urllib.error.URLError, imaplib.IMAP4.error) as exc:
        print(f"synthetic fast-lane E2E: {type(exc).__name__}", file=sys.stderr)
        raise SystemExit(1)
