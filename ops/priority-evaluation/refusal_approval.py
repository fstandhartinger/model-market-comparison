"""Exact refusal-email approval. Host only; polled by the existing pickup timer.

Notification text/images go through notify and its caps. The shared reply broker owns
Telegram updates. This module only attaches buttons to its own delivered notification.
An uncertain notification or SMTP outcome is never retried automatically.
"""
from __future__ import annotations

import contextlib
import fcntl
import hashlib
import importlib.machinery
import importlib.util
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import subprocess
import tempfile
import textwrap
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

HOME = Path.home()
SOURCE = "fastlane-refusal-approval"
CALLBACK_DB = HOME / ".local/state/telegram-reply-broker/updates.sqlite3"
CALLBACK_STATUS = HOME / ".local/state/telegram-reply-broker/callback-status.d"
WINDOW = 12 * 3600


def atomic(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, name = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as out:
            json.dump(value, out, indent=2, ensure_ascii=False)
            out.write("\n")
            out.flush()
            os.fsync(out.fileno())
        os.replace(name, path)
        directory = os.open(path.parent, os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(name)


KINDS = {
    # kind: (card title, Florian caption lines, callback-status file prefix)
    "refusal": ("Refusal email — exact draft",
                ("Decide the refusal email for order {ref}.",
                 "Why: Source review failed; the full refund succeeded."),
                "fastlane-refusal-"),
    "change_request": ("Change-request email — exact draft",
                       ("Decide the change-request email for order {ref}.",
                        "Why: Source review found fixable problems; the order stays paid and open, no refund."),
                       "fastlane-change-"),
}
CHANGE_HOLD_REASON = "customer_changes"


def envelope(row, to, subject, body, kind="refusal"):
    rid = str(uuid.UUID(str(row["id"])))
    if kind == "refusal":
        if (row.get("stripe_mode") != "live" or row.get("synthetic_test") is not False
                or row.get("status") != "refunded" or row.get("refund_status") != "succeeded"
                or row.get("refund_reason") != "source_review_failed" or not row.get("refunded_at")
                or not re.fullmatch(r"re_[A-Za-z0-9]+", str(row.get("refund_id", "")))):
            raise ValueError("successful live source-refusal refund required")
    elif kind == "change_request":
        if (row.get("stripe_mode") != "live" or row.get("synthetic_test") is not False
                or row.get("status") not in ("paid", "review_passed") or row.get("refund_id")
                or row.get("result_delivered_at") or not row.get("customer_hold_started_at")
                or row.get("customer_hold_reason") != CHANGE_HOLD_REASON):
            raise ValueError("open live order waiting for customer changes required")
    else:
        raise ValueError("unknown approval kind")
    if not re.fullmatch(r"[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}", to):
        raise ValueError("invalid recipient")
    if to != row.get("email") or any(c in subject for c in "\r\n") or len(body) > 4000:
        raise ValueError("invalid exact email")
    draft = {"request_id": rid, "to": to, "subject": subject, "body": body}
    if kind == "refusal":
        draft.update(refund_id=row["refund_id"], refunded_at=str(row["refunded_at"]))
    else:
        draft.update(kind=kind, hold_started_at=str(row["customer_hold_started_at"]))
    digest = hashlib.sha256(json.dumps(draft, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return draft, digest


def callback_rows(message_id, chat_id):
    with sqlite3.connect(f"file:{CALLBACK_DB}?mode=ro", uri=True, timeout=5) as db:
        return db.execute("SELECT update_id,chat_id,message_id,sender_id,received_at,data "
                          "FROM callback_events WHERE message_id=? AND chat_id=? AND sender_id=? "
                          "ORDER BY update_id", (message_id, chat_id, chat_id)).fetchall()


def apply_callbacks(state, rows, now):
    if state.get("decision"):
        return
    for update, chat, message, sender, received, data in rows:
        try:
            received = float(received)
        except (ValueError, TypeError):
            continue
        if (chat != state["chat_id"] or sender != state["chat_id"] or message != state["message_id"]
                or not state["created_at"] <= received <= min(now, state["expires_at"])):
            continue
        for decision in ("send", "keep"):
            if data == state[decision + "_key"]:
                state.update(decision=decision, update_id=update, decided_at=received)
                return
    if now > state["expires_at"]:
        state.update(decision="expired", decided_at=now)


def close_durable_reply_action(state, actions=None):
    """Stop the generic free-text dispatcher after this card reaches a decision."""
    try:
        message_id = state["message_id"]
        if type(message_id) is not int or message_id <= 0:
            return False
        if actions is None:
            helper = HOME / "bin" / "notify_reply_actions.py"
            spec = importlib.util.spec_from_file_location("fastlane_notify_reply_actions", helper)
            if spec is None or spec.loader is None:
                return False
            actions = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(actions)

        expected_job_dir = str((HOME / "jobs" / "fastlane-refusal-reply-guard-20260929").resolve())
        db = actions.connect()
        try:
            db.execute("BEGIN IMMEDIATE")
            action = db.execute(
                "SELECT channel,job_dir,status FROM actions WHERE ask_id=?", (message_id,)
            ).fetchone()
            if (not action or action["channel"] != "telegram"
                    or Path(action["job_dir"]).resolve() != Path(expected_job_dir)):
                db.rollback()
                return False
            if action["status"] == "resolved":
                db.commit()
                return True
            actionable = {"waiting", "matched", "resuming", "ack_pending_reaction",
                          "acknowledged", "dead_letter", "expired"}
            if action["status"] not in actionable:
                db.rollback()
                return False
            changed = db.execute(
                "UPDATE actions SET status='resolved',last_error=NULL "
                "WHERE ask_id=? AND channel='telegram' AND job_dir=? AND status=?",
                (message_id, expected_job_dir, action["status"]),
            )
            if changed.rowcount != 1:
                db.rollback()
                return False
            closed = db.execute(
                "SELECT status FROM actions WHERE ask_id=? AND channel='telegram' AND job_dir=?",
                (message_id, expected_job_dir),
            ).fetchone()
            if not closed or closed["status"] != "resolved":
                db.rollback()
                return False
            db.commit()
            return True
        finally:
            db.close()
    except Exception:
        return False


def telegram_config():
    # Reuse the notification owner's config loader, keeping credentials in memory.
    loader = importlib.machinery.SourceFileLoader("fastlane_notify_config", str(HOME / "bin/notify"))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    module.load_env()
    token = module.current_token("TG_BOT_TOKEN")
    chat = int(os.environ["TG_CHAT_ID"])
    if not token or chat <= 0:  # approval is Florian's private chat only
        raise ValueError("private Telegram approval configuration unavailable")
    return token, chat


def attach(state):
    token, chat = telegram_config()
    if chat != state["chat_id"]:
        raise ValueError("approval chat changed")
    pending = state.get("decision") is None
    keyboard = [[{"text": "Send this email", "callback_data": state["send_key"]},
                 {"text": "Keep unsent", "callback_data": state["keep_key"]}]] if pending else []
    payload = {"chat_id": chat, "message_id": state["message_id"],
               "reply_markup": {"inline_keyboard": keyboard}}
    request = urllib.request.Request(f"https://api.telegram.org/bot{token}/editMessageReplyMarkup",
                                     data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            if not json.load(response).get("ok"):
                raise ValueError("button attachment failed")
    except urllib.error.HTTPError as exc:
        # A retry after a lost successful response is safe and idempotent.
        detail = exc.read(4096)
        if exc.code != 400 or b"message is not modified" not in detail:
            raise ValueError("button attachment failed") from None
    except Exception:
        raise ValueError("button attachment failed") from None


def card(path, draft, title_text="Refusal email — exact draft"):
    from PIL import Image, ImageDraw, ImageFont
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 30)
    lines = []
    for text in ("To: " + draft["to"], "Subject: " + draft["subject"], "", draft["body"]):
        for line in text.split("\n"):
            lines.extend(textwrap.wrap(line, width=65, break_long_words=True) or [""])
    image = Image.new("RGB", (1100, 140 + len(lines) * 35), "#f8fafc")
    draw = ImageDraw.Draw(image)
    draw.text((40, 30), title_text, font=title, fill="#0f172a")
    for index, line in enumerate(lines):
        draw.text((40, 100 + 35 * index), line, font=font, fill="#0f172a")
    image.save(path)
    os.chmod(path, 0o600)


def notify_card(state, path, now, kind="refusal"):
    # Freshness evidence immediately before asking; data is never executed as instructions.
    if state.get("freshness_hold"):
        return  # an owner must reconcile it; inbox reads mark entries read
    decisions = (HOME / "DECISIONS.md").read_bytes()
    inbox = subprocess.run([str(HOME / "bin/agent-board"), "--as", "fastlane-autopickup", "inbox"],
                           capture_output=True, timeout=20, check=True).stdout
    if b"No matching entries." not in inbox:
        state["freshness_hold"] = {"inbox_sha256": hashlib.sha256(inbox).hexdigest(), "at": now}
        atomic(path, state)
        return  # do not let a later empty inbox silently clear this hold
    state["freshness"] = {"decisions_sha256": hashlib.sha256(decisions).hexdigest(),
                          "inbox_sha256": hashlib.sha256(inbox).hexdigest()}
    token, chat = telegram_config()
    del token
    state["chat_id"] = chat
    title_text, (what, why), _ = KINDS[kind]
    caption = ("🧑 DU BIST DRAN\n\n🧑 Für dich\n"
               f"- {what.format(ref=state['draft']['request_id'][:8])}\n"
               f"  {why}\n"
               "  Steps:\n  1. Read the attached exact email.\n  2. Tap Send this email or Keep unsent.\n"
               "  Time: 1 minute. Buttons expire in 12 hours. A text reply does not authorize sending.")
    image_path = path.with_suffix(".png")
    card(image_path, state["draft"], title_text)
    # This is an explicit Florian-only approval from the 27 Sep fast-lane decision.
    # The durable text-reply action resumes only the isolated reply guard; only the
    # exact button callback below can authorize the email.
    command = [str(HOME / "bin/notify"), "now", "--florian-only",
               "Florian's fast-lane decision requires the exact refusal Send button.",
               "--ask", str(WINDOW // 60), "--photo", str(image_path), "--text-stdin"]
    reply_job_dir = str(HOME / "jobs" / "fastlane-refusal-reply-guard-20260929")
    env = {**os.environ, "NOTIFY_SOURCE": SOURCE,
           "AGENT_BOARD_JOBDIR": reply_job_dir,
           "NOTIFY_REPLY_JOB_DIR": reply_job_dir}
    preview = subprocess.run(command + ["--dry-run"], input=caption, text=True, capture_output=True,
                             timeout=45, env=env, check=False)
    if preview.returncode or "[DRY RUN] would send to the" not in preview.stdout:
        return  # cap/dedup: no queued duplicates, retry preview next cycle
    state.update(notification="attempted", created_at=int(now), expires_at=int(now) + WINDOW)
    atomic(path, state)  # unknown outcome is held, never blindly resent
    result = subprocess.run(command, input=caption, text=True, capture_output=True,
                            timeout=45, env=env, check=False)
    match = re.search(r"MESSAGE_ID=(\d+)", result.stdout)
    if result.returncode or not match:
        state["notification"] = "unknown"
        atomic(path, state)
        return
    state.update(notification="sent", message_id=int(match.group(1)))
    atomic(path, state)


def resolve_ask(state, path, action, now):
    receipt = path.with_suffix(".completed.json")
    if not receipt.exists():
        atomic(receipt, {"message_id": state["message_id"], "source": SOURCE,
                         "action_completed": True, "action": action,
                         "completed_at": datetime.fromtimestamp(now, timezone.utc).isoformat()})
    result = subprocess.run([str(HOME / "bin/notify-resolve"), "--message-id", str(state["message_id"]),
                             "--source", SOURCE, "--receipt", str(receipt)],
                            capture_output=True, timeout=20, check=False)
    return result.returncode == 0


def advance(row, to, subject, body, root, effects, now, kind="refusal"):
    """Return pending/held/sent/unknown. Caller holds its global pickup-cycle lock.

    A second per-order flock makes the persisted SMTP claim safe even if another
    host command accidentally invokes this function outside the pickup cycle.
    """
    if effects.dry_run or os.environ.get("FASTLANE_DB") or os.environ.get("FASTLANE_STATE_ROOT"):
        return "pending"  # test fixtures never contact Telegram or approve customer email
    draft, digest = envelope(row, to, subject, body, kind)
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = root / (draft["request_id"] + ".json")
    with path.with_suffix(".lock").open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        state = json.loads(path.read_text()) if path.exists() else {
            "draft": draft, "digest": digest, "send_key": "fr_" + secrets.token_hex(16) + "_send",
            "keep_key": "fr_" + secrets.token_hex(16) + "_keep", "notification": "pending"}
        if state.get("digest") != digest or state.get("draft") != draft:
            return "held"  # never migrate approval to a changed envelope or refund
        if state.get("decision") == "withdrawn":
            return "held"  # superseded by an operator; never send, never re-ask
        atomic(path, state)
        if state["notification"] == "pending":
            notify_card(state, path, now, kind)
        if not state.get("message_id"):
            return "unknown" if state["notification"] != "pending" or state.get("freshness_hold") else "pending"
        if not state.get("buttons_attached"):
            statuses = {state[key + "_key"]: {"text": "Choice recorded; the worker will verify it.",
                        "expires_at": state["expires_at"], "expired_text": "Expired; email stays unsent."}
                        for key in ("send", "keep")}
            atomic(CALLBACK_STATUS / (KINDS[kind][2] + draft["request_id"] + ".json"), statuses)
            attach(state)
            state["buttons_attached"] = True
            atomic(path, state)
        apply_callbacks(state, callback_rows(state["message_id"], state["chat_id"]), now)
        if state.get("decision") in ("send", "keep") and not state.get("reply_action_resolved"):
            if not close_durable_reply_action(state):
                state["reply_action_resolution_hold"] = "durable reply action could not be closed"
                atomic(path, state)
                return "pending"
            state["reply_action_resolved"] = True
            state["reply_action_resolved_at"] = int(now)
        atomic(path, state)
        decision = state.get("decision")
        if decision in ("keep", "expired"):
            state["resolved"] = resolve_ask(state, path, "kept", now)
            atomic(path, state)
            with contextlib.suppress(ValueError):
                attach(state)
            return "held" if state["resolved"] else "pending"
        if decision != "send":
            return "pending"
        # The ordinary sender audit has no body hash. It cannot prove this exact
        # envelope after an uncertain send; retain the claim for manual reconciliation.
        if state.get("mail") in (None, "gate_blocked"):
            state.update(mail="sending", claimed_at=now)
            atomic(path, state)
            try:
                ok, reason = effects.mail(to, subject, body)
            except Exception:
                ok, reason = False, "unknown_exception"
            # Shared Effects.mail reports gate_refused only for SystemExit from the
            # outbound gate before SMTP. Keep the exact approval and retry this known
            # no-send outcome; exceptions/transport errors remain unknown forever.
            state["mail"] = "sent" if ok else "gate_blocked" if reason == "gate_refused" else "unknown"
            atomic(path, state)
        if state["mail"] == "sent":
            state["resolved"] = resolve_ask(state, path, "sent", now)
            atomic(path, state)
            with contextlib.suppress(ValueError):
                attach(state)
            return "sent" if state["resolved"] else "pending"
        return "pending" if state["mail"] == "gate_blocked" else "unknown"
