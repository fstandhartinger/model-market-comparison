#!/usr/bin/env python3
"""Queue and honor a one-tap approval for a paid-request refusal email."""

import json
import os
import re
import sqlite3
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

HOME = Path.home()
TABLE = "bh_priority_evaluation_requests"
CALLBACK_DB = HOME / ".local/state/telegram-reply-broker/updates.sqlite3"
CALLBACK_STATUS_DIR = HOME / ".local/state/telegram-reply-broker/callback-status.d"
JOB_ROOT = HOME / "jobs/fastlane-evaluations"
MAIL_HELPER = Path(os.environ.get("FASTLANE_MAIL_HELPER", HOME / "bin/jevbench-priority-email.py"))
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
APPROVAL_SECONDS = 12 * 60 * 60


class ApprovalError(Exception):
    pass


def sql(statement: str) -> str:
    result = subprocess.run(
        ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", "benchmarkheaven_accounts", "-c", statement],
        text=True, capture_output=True, timeout=20,
    )
    if result.returncode:
        raise ApprovalError("database operation failed")
    return result.stdout.strip()


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def read_request(request_id: str) -> dict:
    if not UUID_RE.fullmatch(request_id):
        raise ApprovalError("invalid request ID")
    output = sql(f"""
      SELECT json_build_object('id',id::text,'email',email,'model_name',model_name,'status',status,
        'refund_status',refund_status,'refusal_email_status',refusal_email_status,
        'pickup_job_dir',pickup_job_dir)::text
      FROM {TABLE} WHERE id='{request_id}'::uuid
    """)
    if not output:
        raise ApprovalError("request was not found")
    try:
        return json.loads(output)
    except json.JSONDecodeError as exc:
        raise ApprovalError("request record is invalid") from exc


def atomic_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(path.parent, 0o700)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.chmod(temp, 0o600)
    os.replace(temp, path)
    os.chmod(path, 0o600)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ApprovalError("approval record is unavailable") from exc


def config_value(name: str) -> str | None:
    if os.environ.get(name):
        return os.environ[name]
    for path in ("/etc/profile.d/telegram.sh", "/etc/environment", str(HOME / ".hermes/.env")):
        try:
            for line in Path(path).read_text(encoding="utf-8").splitlines():
                match = re.match(r"^\s*%s\s*=\s*(['\"]?)(.*?)\1\s*(?:#.*)?$" % re.escape(name), line)
                if match:
                    return match.group(2).strip()
        except OSError:
            pass
    return None


def notify_and_attach(row: dict, request_id: str, state_path: Path, draft_body: str) -> dict:
    model = str(row.get("model_name", "the submitted model"))
    message = (
        "🧑 DU BIST DRAN\n"
        f"Review refused {model}; the full refund is queued.\n"
        f"Draft: “{draft_body}” It sends only after the full refund succeeds.\n"
        "🧑 Für dich\n"
        "- Approve this exact refusal email or keep it unsent.\n"
        "  Why: A failed code review needs your one-tap approval before customer email.\n"
        "  Steps:\n  1. Tap “✅ Send refusal email” after checking the preview.\n"
        "  2. Tap “⏸ Keep unsent” to decline.\n  Time: 1 min"
    )
    env = dict(os.environ)
    env["NOTIFY_SOURCE"] = "fastlane-refusal-approval"
    result = subprocess.run(
        [str(HOME / "bin/notify"), "now", "--text-stdin"],
        input=message, text=True, capture_output=True, timeout=45, env=env,
    )
    match = re.search(r"MESSAGE_ID=(\d+)", result.stdout + result.stderr)
    if result.returncode or not match:
        raise ApprovalError("approval notification was not delivered")
    message_id = int(match.group(1))
    chat_value = config_value("TG_CHAT_ID")
    token = config_value("TG_BOT_TOKEN")
    if not chat_value or not token:
        raise ApprovalError("Telegram approval configuration is unavailable")
    chat_id = int(chat_value)
    expires_at = int(time.time()) + APPROVAL_SECONDS
    send_key = f"fr_{request_id}_send"
    hold_key = f"fr_{request_id}_hold"
    callback_status = {
        send_key: {
            "text": f"Approved the exact refusal email for {model}; it will send after the refund succeeds.",
            "expires_at": expires_at,
            "expired_text": "Approval window expired; no refusal email was sent.",
        },
        hold_key: {
            "text": f"The refusal email for {model} remains unsent.",
            "expires_at": expires_at,
            "expired_text": "Approval window expired; no refusal email was sent.",
        },
    }
    CALLBACK_STATUS_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(CALLBACK_STATUS_DIR, 0o700)
    status_path = CALLBACK_STATUS_DIR / f"fastlane-refusal-{request_id}.json"
    atomic_json(status_path, callback_status)
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "reply_markup": {"inline_keyboard": [[
            {"text": "✅ Send refusal email", "callback_data": send_key},
            {"text": "⏸ Keep unsent", "callback_data": hold_key},
        ]]},
    }
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/editMessageReplyMarkup",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            telegram_result = json.load(response)
    except Exception as exc:
        raise ApprovalError(f"approval buttons could not be attached ({type(exc).__name__})") from None
    if not telegram_result.get("ok"):
        raise ApprovalError("approval buttons could not be attached")
    state = {
        "request_id": request_id,
        "message_id": message_id,
        "chat_id": chat_id,
        "created_at": int(time.time()),
        "expires_at": expires_at,
        "processed_update_ids": [],
        "decision": None,
        "send_claimed": False,
    }
    atomic_json(state_path, state)
    start = subprocess.run(
        ["systemctl", "--user", "start", "--no-block", f"fastlane-refusal-approval@{request_id}.service"],
        text=True, capture_output=True, timeout=30,
    )
    if start.returncode:
        raise ApprovalError("approval watcher could not be started")
    return state


def prepare(request_id: str) -> int:
    row = read_request(request_id)
    if row.get("status") not in ("refund_due", "refund_pending", "refunded") or row.get("refusal_email_status") != "approval_required":
        raise ApprovalError("request is not awaiting a refusal-email approval")
    # Keep approval state in its own per-request folder so the bounded watcher
    # unit only needs write access to fastlane-evaluations/<request-id>.
    job_dir = (JOB_ROOT / request_id).resolve()
    if not job_dir.is_relative_to((HOME / "jobs").resolve()):
        raise ApprovalError("request folder is outside the job directory")
    job_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(job_dir, 0o700)
    state_path = job_dir / "refusal-approval.json"
    if state_path.exists():
        previous = load_json(state_path)
        if previous.get("message_id") and int(previous.get("expires_at", 0)) > int(time.time()):
            print("A refusal-email approval is already active.")
            return 0
    subject = f"{row.get('model_name', 'Evaluation')}: evaluation request declined"
    body = (
        "We cannot evaluate your submission fairly, so we have issued a full refund. Your bank or card provider may take several days to post it."
    )
    draft = {"request_id": request_id, "to": str(row.get("email", "")), "subject": subject, "body": body}
    atomic_json(job_dir / "refusal-email-draft.json", draft)
    state = notify_and_attach(row, request_id, state_path, body)
    print(f"Refusal email draft prepared; one-tap approval expires at {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(state['expires_at']))}.")
    return 0


def callback_rows(message_id: int, chat_id: int) -> list[tuple]:
    uri = f"file:{CALLBACK_DB}?mode=ro"
    connection = sqlite3.connect(uri, uri=True, timeout=10)
    try:
        return connection.execute(
            "SELECT update_id,chat_id,message_id,sender_id,received_at,data FROM callback_events "
            "WHERE message_id=? AND chat_id=? AND sender_id=? ORDER BY update_id",
            (message_id, chat_id, chat_id),
        ).fetchall()
    finally:
        connection.close()


def send_approved_email(request_id: str, state: dict, draft: dict) -> bool:
    row = read_request(request_id)
    if row.get("refusal_email_status") != "approval_required":
        raise ApprovalError("refusal-email state changed before send")
    if row.get("status") != "refunded" or row.get("refund_status") != "succeeded":
        return False
    if state.get("send_claimed"):
        raise ApprovalError("approval was already claimed; refusing to retry")
    state["send_claimed"] = True
    state["send_status"] = "sending"
    state_path = JOB_ROOT / request_id / "refusal-approval.json"
    atomic_json(state_path, state)
    env = dict(os.environ)
    env.pop("MAIL_WEEKEND_OK", None)
    env["MAIL_APPROVED_BY_FLORIAN"] = "1"
    result = subprocess.run(
        ["/usr/bin/python3", str(MAIL_HELPER), "send", "--template", "refusal_notice_v1",
         "--request-id", request_id, "--to", str(draft["to"]), "--subject", str(draft["subject"])],
        input=str(draft["body"]), text=True, capture_output=True, timeout=45, env=env,
    )
    state["send_status"] = "sent" if result.returncode == 0 else "failed_no_retry"
    state["send_finished_at"] = int(time.time())
    state["send_error_type"] = None if result.returncode == 0 else "mail_send_failed"
    atomic_json(state_path, state)
    if result.returncode == 0:
        sql(f"UPDATE {TABLE} SET refusal_email_status='sent',updated_at=now() WHERE id='{request_id}'::uuid AND refusal_email_status='approval_required'")
        return True
    sql(f"UPDATE {TABLE} SET refusal_email_status='held',updated_at=now() WHERE id='{request_id}'::uuid AND refusal_email_status='approval_required'")
    return False


def watch(request_id: str) -> int:
    if not UUID_RE.fullmatch(request_id):
        raise ApprovalError("invalid request ID")
    state_path = JOB_ROOT / request_id / "refusal-approval.json"
    draft_path = JOB_ROOT / request_id / "refusal-email-draft.json"
    state = load_json(state_path)
    draft = load_json(draft_path)
    message_id = int(state["message_id"])
    chat_id = int(state["chat_id"])
    expires_at = int(state["expires_at"])
    send_key = f"fr_{request_id}_send"
    hold_key = f"fr_{request_id}_hold"
    while int(time.time()) < expires_at:
        for update_id, row_chat, row_message, sender_id, received_at, data in callback_rows(message_id, chat_id):
            if int(row_chat) != chat_id or int(row_message) != message_id or int(sender_id) != chat_id:
                continue
            if int(update_id) in state["processed_update_ids"] or data not in (send_key, hold_key):
                continue
            if int(received_at) > expires_at or state.get("decision") is not None:
                continue
            state["processed_update_ids"].append(int(update_id))
            state["decision"] = "send" if data == send_key else "hold"
            state["decision_at"] = int(received_at)
            atomic_json(state_path, state)
            if data == hold_key:
                sql(f"UPDATE {TABLE} SET refusal_email_status='held',updated_at=now() WHERE id='{request_id}'::uuid AND refusal_email_status='approval_required'")
                state["send_status"] = "held"
                atomic_json(state_path, state)
                return 0
        if state.get("decision") == "send" and not state.get("send_claimed"):
            if send_approved_email(request_id, state, draft):
                return 0
            row = read_request(request_id)
            if row.get("status") in ("refund_due", "refund_pending"):
                time.sleep(10)
                state = load_json(state_path)
                continue
            state = load_json(state_path)
            if state.get("send_claimed"):
                return 1
        time.sleep(2)
    row = read_request(request_id)
    if row.get("refusal_email_status") == "approval_required":
        sql(f"UPDATE {TABLE} SET refusal_email_status='expired',updated_at=now() WHERE id='{request_id}'::uuid AND refusal_email_status='approval_required'")
    state["send_status"] = "expired" if state.get("decision") is None else state.get("send_status", "waiting_for_refund")
    state["closed_at"] = int(time.time())
    atomic_json(state_path, state)
    return 0


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[1] not in ("prepare", "watch"):
        print("usage: jevbench-priority-approval.py prepare|watch REQUEST_UUID", file=sys.stderr)
        return 2
    request_id = sys.argv[2]
    try:
        return prepare(request_id) if sys.argv[1] == "prepare" else watch(request_id)
    except Exception as exc:
        print(f"priority refusal approval: {type(exc).__name__}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
