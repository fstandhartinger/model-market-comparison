"""Florian's refund approval card. Host only; polled by the pickup cycle under its lock.

Florian, 3 Oct 2026: no fast-lane refund without his explicit confirmation. Every refund
(missed 48-hour deadline, late delivery, operator refusal) waits for an exact Telegram
button from his private chat. A text reply, an expired card or any other signal is never
an approval. Approval or decline is written to the order row; the refund worker only
claims rows with refund_decision='approved'.
"""
from __future__ import annotations

import fcntl
import json
import os
import re
import secrets
import subprocess
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

import refusal_approval as ra

SOURCE = "fastlane-refund-approval"
WINDOW = 24 * 3600
MAX_CARDS = 3  # an expired card is asked again at most twice; then the order waits for an operator
REASONS = {
    "sla_missed": "No result 48 hours after payment (deadline {deadline}).",
    "sla_48h_payment": "The result was delivered after the 48-hour deadline.",
    "operator_refusal": "An operator marked the order for refund.",
    "source_review_failed": "Legacy source-review refusal.",
}


def reason_key(row: dict) -> str:
    if row.get("status") in ("paid", "review_passed"):
        return "sla_missed"
    reason = row.get("refund_reason")
    return reason if reason in REASONS else "operator_refusal"


def caption(row: dict, kind: str, deadline: str) -> str:
    rid = str(uuid.UUID(str(row["id"])))
    amount = row.get("amount_total")
    money = f"USD {int(amount) / 100:.2f}" if isinstance(amount, int) and not isinstance(amount, bool) else "the full amount"
    return ("🧑 DU BIST DRAN\n\n🧑 Für dich\n"
            f"- Decide the refund for fast-lane order {rid[:8]} ({money}).\n"
            f"  Why: {REASONS[kind].format(deadline=deadline)} Nothing is refunded without your button.\n"
            "  Steps:\n  1. Tap Refund in full or No refund.\n"
            "  Time: 1 minute. Buttons expire in 24 hours. A text reply does not authorize a refund.")


def _attach(state: dict) -> None:
    token, chat = ra.telegram_config()
    if chat != state["chat_id"]:
        raise ValueError("approval chat changed")
    keyboard = ([[{"text": "Refund in full", "callback_data": state["refund_key"]},
                  {"text": "No refund", "callback_data": state["decline_key"]}]]
                if state.get("decision") is None else [])
    payload = {"chat_id": chat, "message_id": state["message_id"], "reply_markup": {"inline_keyboard": keyboard}}
    request = urllib.request.Request(f"https://api.telegram.org/bot{token}/editMessageReplyMarkup",
                                     data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            if not json.load(response).get("ok"):
                raise ValueError("button attachment failed")
    except urllib.error.HTTPError as exc:
        if exc.code != 400 or b"message is not modified" not in exc.read(4096):
            raise ValueError("button attachment failed") from None
    except ValueError:
        raise
    except Exception:
        raise ValueError("button attachment failed") from None


def apply_callbacks(state: dict, rows, now: float) -> None:
    if state.get("decision"):
        return
    for update, chat, message, sender, received, data in rows:
        try:
            received = float(received)
        except (TypeError, ValueError):
            continue
        if (chat != state["chat_id"] or sender != state["chat_id"] or message != state["message_id"]
                or not state["created_at"] <= received <= min(now, state["expires_at"])):
            continue
        if data == state["refund_key"]:
            state.update(decision="refund", update_id=update, decided_at=received)
            return
        if data == state["decline_key"]:
            state.update(decision="decline", update_id=update, decided_at=received)
            return
    if now > state["expires_at"]:
        state.update(decision="expired", decided_at=now)


def live_runtime() -> bool:
    """Test and scratch runs override the database or state root; they never reach Telegram."""
    return not (os.environ.get("FASTLANE_DB") or os.environ.get("FASTLANE_STATE_ROOT"))


def _send_card(state: dict, path: Path, text: str, now: float) -> None:
    if not live_runtime():
        return
    token, chat = ra.telegram_config()
    del token
    state["chat_id"] = chat
    command = [str(ra.HOME / "bin/notify"), "now", "--florian-only",
               "Florian's 3 Oct decision: every fast-lane refund needs his explicit button.",
               "--ask", str(WINDOW // 60), "--text-stdin"]
    reply_job_dir = str(ra.HOME / "jobs" / "fastlane-refusal-reply-guard-20260929")
    env = {**os.environ, "NOTIFY_SOURCE": SOURCE, "AGENT_BOARD_JOBDIR": reply_job_dir,
           "NOTIFY_REPLY_JOB_DIR": reply_job_dir}
    preview = subprocess.run(command + ["--dry-run"], input=text, text=True, capture_output=True,
                             timeout=45, env=env, check=False)
    if preview.returncode or "[DRY RUN] would send to the" not in preview.stdout:
        return  # cap/dedup: retry the preview next cycle
    state.update(notification="attempted", created_at=int(now), expires_at=int(now) + WINDOW)
    ra.atomic(path, state)  # an unknown outcome is held, never blindly resent
    result = subprocess.run(command, input=text, text=True, capture_output=True,
                            timeout=45, env=env, check=False)
    match = re.search(r"MESSAGE_ID=(\d+)", result.stdout)
    if result.returncode or not match:
        state["notification"] = "unknown"
        ra.atomic(path, state)
        return
    state.update(notification="sent", message_id=int(match.group(1)))
    ra.atomic(path, state)


def _resolve_ask(state: dict, path: Path, decision: str) -> bool:
    receipt = path.with_name(f"{path.stem}.card{state.get('card', 1)}.completed.json")
    if not receipt.exists():
        ra.atomic(receipt, {"message_id": state["message_id"], "source": SOURCE, "action_completed": True,
                            "action": "completed" if decision == "refund" else "declined",
                            "completed_at": datetime.now(timezone.utc).isoformat()})
    result = subprocess.run([str(ra.HOME / "bin/notify-resolve"), "--message-id", str(state["message_id"]),
                             "--source", SOURCE, "--receipt", str(receipt)],
                            capture_output=True, timeout=20, check=False)
    return result.returncode == 0


def _new_card(cards: int) -> dict:
    return {"refund_key": "rf_" + secrets.token_hex(16) + "_refund",
            "decline_key": "rf_" + secrets.token_hex(16) + "_decline",
            "notification": "pending", "card": cards + 1}


def advance(row: dict, root: Path, effects, now: float, deadline: str) -> str:
    """Return pending/refund/decline/unknown/exhausted. Caller holds the pickup-cycle lock.

    'refund' and 'decline' carry an exact Florian button; the caller writes them to the row.
    """
    if effects.dry_run or not live_runtime():
        return "pending"  # fixtures never contact Telegram and never approve a refund
    rid = str(uuid.UUID(str(row["id"])))
    if row.get("stripe_mode") != "live" or row.get("synthetic_test") is not False:
        raise ValueError("refund approval is for real live orders only")
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = root / f"{rid}.json"
    with path.with_suffix(".lock").open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        state = json.loads(path.read_text()) if path.exists() else {
            "request_id": rid, "kind": reason_key(row), "history": [], **_new_card(0)}
        if state.get("decision") in ("refund", "decline"):
            return state["decision"]
        if state.get("decision") == "expired":
            if state.get("card", 1) >= MAX_CARDS:
                return "exhausted"
            history = state.pop("history", [])
            history.append({k: state.get(k) for k in ("card", "message_id", "created_at", "expires_at", "decision")})
            state = {"request_id": rid, "kind": state["kind"], "history": history, **_new_card(state.get("card", 1))}
        ra.atomic(path, state)
        if state["notification"] == "pending":
            _send_card(state, path, caption(row, state["kind"], deadline), now)
        if not state.get("message_id"):
            return "pending" if state["notification"] == "pending" else "unknown"
        if not state.get("buttons_attached"):
            statuses = {state[key]: {"text": "Choice recorded; the worker will verify it.",
                                     "expires_at": state["expires_at"],
                                     "expired_text": "Expired; nothing was refunded."}
                        for key in ("refund_key", "decline_key")}
            ra.atomic(ra.CALLBACK_STATUS / f"fastlane-refund-{rid}.json", statuses)
            _attach(state)
            state["buttons_attached"] = True
            ra.atomic(path, state)
        apply_callbacks(state, ra.callback_rows(state["message_id"], state["chat_id"]), now)
        ra.atomic(path, state)
        decision = state.get("decision")
        if decision is None:
            return "pending"
        try:
            _attach(state)  # remove the buttons once decided or expired
        except ValueError:
            pass
        if decision in ("refund", "decline") and not state.get("reply_action_resolved"):
            state["reply_action_resolved"] = ra.close_durable_reply_action(state)
            ra.atomic(path, state)
        if not state.get("resolved"):
            state["resolved"] = _resolve_ask(state, path, decision)
            ra.atomic(path, state)
        if decision == "expired":
            return "exhausted" if state.get("card", 1) >= MAX_CARDS else "pending"
        return decision


def reference(root: Path, rid: str) -> str:
    """The audit reference written next to a decision: telegram:<message_id>:<update_id>."""
    state = json.loads((root / f"{uuid.UUID(rid)}.json").read_text())
    if state.get("decision") not in ("refund", "decline") or type(state.get("update_id")) is not int \
            or type(state.get("message_id")) is not int:
        raise ValueError("no exact button decision recorded")
    return f"telegram:{state['message_id']}:{state['update_id']}"
