"""Florian's 40-hour SLA decision card. Host only; polled by the pickup cycle under its lock.

At 40 hours after payment (48-hour clock minus pauses) an open order asks Florian once for an
exact Telegram button: "Send delay note" (one fixed-template delay email to the customer),
"Refund in full" (identical to the refund card's approval) or "No action". A text reply, an
expired card or any other signal is never a decision. Built on the refund_approval.py
mechanism: exact callback keys, his private chat only, 24-hour expiry.
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

SOURCE = "fastlane-sla40-decision"
WINDOW = 24 * 3600
MAX_CARDS = 3  # an expired card is asked again at most twice; then the order waits for an operator


def caption(row: dict, deadline: str) -> str:
    rid = str(uuid.UUID(str(row["id"])))
    amount = row.get("amount_total")
    money = f"USD {int(amount) / 100:.2f}" if isinstance(amount, int) and not isinstance(amount, bool) else "the full amount"
    return ("🧑 DU BIST DRAN\n\n🧑 Für dich\n"
            f"- Decide the next step for fast-lane order {rid[:8]} ({money}).\n"
            f"  Why: No result 40 hours after payment; the deadline is {deadline}.\n"
            "  Steps:\n  1. Tap Send delay note (mails the customer a new ETA of deadline + 24 h), "
            "Refund in full, or No action.\n"
            "  Time: 1 minute. Buttons expire in 24 hours. A text reply does not decide.")


def _attach(state: dict) -> None:
    token, chat = ra.telegram_config()
    if chat != state["chat_id"]:
        raise ValueError("approval chat changed")
    keyboard = ([[{"text": "Send delay note", "callback_data": state["delay_key"]},
                  {"text": "Refund in full", "callback_data": state["refund_key"]},
                  {"text": "No action", "callback_data": state["noaction_key"]}]]
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
            raise ValueError("button attachment failed")
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
        if data == state["delay_key"]:
            state.update(decision="delay_note", update_id=update, decided_at=received)
            return
        if data == state["refund_key"]:
            state.update(decision="refund", update_id=update, decided_at=received)
            return
        if data == state["noaction_key"]:
            state.update(decision="no_action", update_id=update, decided_at=received)
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
               "Florian's 4 Oct decision: every fast-lane SLA/refund step needs his explicit button.",
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
                            "action": "completed" if decision in ("delay_note", "refund") else "declined",
                            "completed_at": datetime.now(timezone.utc).isoformat()})
    result = subprocess.run([str(ra.HOME / "bin/notify-resolve"), "--message-id", str(state["message_id"]),
                             "--source", SOURCE, "--receipt", str(receipt)],
                            capture_output=True, timeout=20, check=False)
    return result.returncode == 0


def _new_card(cards: int) -> dict:
    return {"delay_key": "sla_" + secrets.token_hex(16) + "_delay",
            "refund_key": "sla_" + secrets.token_hex(16) + "_refund",
            "noaction_key": "sla_" + secrets.token_hex(16) + "_noaction",
            "notification": "pending", "card": cards + 1}


def advance(row: dict, root: Path, effects, now: float, deadline: str) -> str:
    """Return pending/delay_note/refund/no_action/unknown/exhausted. Caller holds the cycle lock.

    The three outcomes all carry an exact Florian button; the caller applies them to the row.
    """
    rid = str(uuid.UUID(str(row["id"])))
    if row.get("stripe_mode") != "live" or row.get("synthetic_test") is not False:
        raise ValueError("the SLA decision card is for real live orders only")
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = root / f"{rid}.json"
    with path.with_suffix(".lock").open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if path.exists():
            recorded = json.loads(path.read_text()).get("decision")
            if recorded in ("delay_note", "refund", "no_action"):
                return recorded  # an exact button already recorded; apply it (also in dry runs)
        if effects.dry_run or not live_runtime():
            return "pending"  # fixtures never contact Telegram and never decide
        state = json.loads(path.read_text()) if path.exists() else {
            "request_id": rid, "kind": "sla_40h", "history": [], **_new_card(0)}
        if state.get("decision") in ("delay_note", "refund", "no_action"):
            return state["decision"]
        if state.get("decision") == "expired":
            if state.get("card", 1) >= MAX_CARDS:
                return "exhausted"
            history = state.pop("history", [])
            history.append({k: state.get(k) for k in ("card", "message_id", "created_at", "expires_at", "decision")})
            state = {"request_id": rid, "kind": state["kind"], "history": history, **_new_card(state.get("card", 1))}
        ra.atomic(path, state)
        if state["notification"] == "pending":
            _send_card(state, path, caption(row, deadline), now)
        if not state.get("message_id"):
            return "pending" if state["notification"] == "pending" else "unknown"
        if not state.get("buttons_attached"):
            statuses = {state[key]: {"text": "Choice recorded; the worker will verify it.",
                                     "expires_at": state["expires_at"],
                                     "expired_text": "Expired; nothing was decided."}
                        for key in ("delay_key", "refund_key", "noaction_key")}
            ra.atomic(ra.CALLBACK_STATUS / f"fastlane-sla40-{rid}.json", statuses)
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
        if decision in ("delay_note", "refund", "no_action") and not state.get("reply_action_resolved"):
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
    if state.get("decision") not in ("delay_note", "refund", "no_action") \
            or type(state.get("update_id")) is not int or type(state.get("message_id")) is not int:
        raise ValueError("no exact button decision recorded")
    return f"telegram:{state['message_id']}:{state['update_id']}"
