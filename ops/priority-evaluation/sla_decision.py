"""Florian's 40-hour SLA decision card. Host only; polled by the pickup cycle under its lock.

At 40 hours after payment (48-hour clock minus pauses) an open order asks Florian once for an
exact Telegram button: "Send delay note" (one fixed-template delay email to the customer),
"Refund in full" (identical to the refund card's approval) or "No action". A text reply, an
expired card or any other signal is never a decision. Built on the refund_approval.py
mechanism: exact callback keys, his private chat only, 24-hour expiry.

One card per order (N91): after "Send delay note" or "No action" the same card keeps exactly one live
"Refund in full" button (via editMessageReplyMarkup, caption untouched) until the card's own expires_at; an
exact later tap is the refund decision, once. Expiry removes the button and settles the card.
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
# DECISIONS 6 Nov 00:55Z, wps-order-114b6e41-customer-path-after-cleanup-failure-1106.
# The native owner + deputy handle the no-ETA note choice at 40h. The normal 48h
# refund card remains active; this mapping grants no contact/refund/run authority.
OWNER_MANAGED_40H = frozenset({"114b6e41-14c5-42b1-9a35-386ab83b62e9"})


def owner_managed(row: dict) -> bool:
    return str(uuid.UUID(str(row["id"]))) in OWNER_MANAGED_40H


MAX_CARDS = 3  # an expired card is asked again at most twice; then the order waits for an operator


# the ↳ line on the card once its decision is recorded (notify settle, board #41061)
SETTLED = {"delay_note": "You tapped Send delay note; the worker sends the fixed delay email.",
           "refund": "You tapped Refund in full; the refund worker pays it back.",
           "no_action": "You tapped No action; nothing was sent or refunded.",
           "expired": "The buttons expired unanswered; nothing was sent or refunded."}


def caption(row: dict, deadline: str) -> str:
    if owner_managed(row):
        raise ValueError("40h decision is owner-managed; no generic ETA card")
    rid = str(uuid.UUID(str(row["id"])))
    amount = row.get("amount_total")
    money = f"USD {int(amount) / 100:.2f}" if isinstance(amount, int) and not isinstance(amount, bool) else "the full amount"
    from autopickup import decision_context_line, eur_phrase
    eur = eur_phrase(amount)
    context = decision_context_line(row, "No result 40 h after payment for {customer}, model {model}: "
                                         f"delay note or refund{f' ({eur})' if eur else ''}?")
    return (f"🧑 DU BIST DRAN\n{context}\n\n🧑 Für dich\n"
            "- Decide the next step for this customer.\n"
            f"  Why: No result 40 hours after payment; the deadline is {deadline}.\n"
            f"  Effect: Send delay note = mails a new date (deadline + 24 h), no cost. Refund in full = pays {money} back, final. "
            "No action = nothing goes out.\n"
            "  Steps:\n  1. Tap Send delay note (mails the customer a new ETA of deadline + 24 h), "
            "Refund in full, or No action.\n"
            "  Time: 1 minute. Buttons expire in 24 hours so that an old card can never act. "
            "A text reply does not decide.")


def _keyboard(state: dict) -> list:
    return [[{"text": "Send delay note", "callback_data": state["delay_key"]},
             {"text": "Refund in full", "callback_data": state["refund_key"]},
             {"text": "No action", "callback_data": state["noaction_key"]}]]


def _late_keyboard(state: dict) -> list:
    return [[{"text": "Refund in full", "callback_data": state["refund_key"]}]]


def _attach(state: dict, keyboard: list | None = None) -> None:
    token, chat = ra.telegram_config()
    if chat != state["chat_id"]:
        raise ValueError("approval chat changed")
    if keyboard is None:
        keyboard = _keyboard(state) if state.get("decision") is None else []
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
        if (chat != state["chat_id"] or sender != state["chat_id"]
                or not state["created_at"] <= received <= min(now, state["expires_at"])):
            continue
        if data == state["delay_key"]:
            state.update(decision="delay_note", update_id=update, decided_at=received, tap_message_id=message)
            return
        if data == state["refund_key"]:
            state.update(decision="refund", update_id=update, decided_at=received, tap_message_id=message)
            return
        if data == state["noaction_key"]:
            state.update(decision="no_action", update_id=update, decided_at=received, tap_message_id=message)
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
               "--topic", ra.order_topic(state["request_id"], "sla40"),
               "--ask", str(WINDOW // 60), "--text-stdin"]
    reply_job_dir = str(ra.HOME / "jobs" / "fastlane-refusal-reply-guard-20260929")
    env = {**os.environ, "NOTIFY_SOURCE": SOURCE, "AGENT_BOARD_JOBDIR": reply_job_dir,
           "NOTIFY_REPLY_JOB_DIR": reply_job_dir, **ra.CALLER_BUTTONS_ENV}
    preview = subprocess.run(command + ["--dry-run"], input=text, text=True, capture_output=True,
                             timeout=45, env=env, check=False)
    if preview.returncode or "[DRY RUN] would send to the" not in preview.stdout:
        ra.preview_failed(state, path, preview, SOURCE)
        return  # cap/dedup: retry the preview next cycle
    ra.preview_passed(state)
    state.update(notification="attempted", created_at=int(now), expires_at=int(now) + WINDOW)
    ra.atomic(path, state)  # an unknown outcome is held, never blindly resent
    # notify's own Telegram uploads may take up to 180 s; a shorter kill leaves an unsent card "unknown".
    result = subprocess.run(command, input=text, text=True, capture_output=True,
                            timeout=180, env=env, check=False)
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


LATE_KEEP = ("delay_note", "no_action")  # decisions after which the Refund button stays live until expires_at


def _finish(state: dict, path: Path, decision: str) -> None:
    """Close the card for good: no buttons, reply action and ask resolved, settled line. Every step is idempotent."""
    try:
        _attach(state, [])
    except ValueError:
        pass
    if not state.get("reply_action_resolved"):
        state["reply_action_resolved"] = ra.close_durable_reply_action(state)
        ra.atomic(path, state)
    if not state.get("resolved"):
        state["resolved"] = _resolve_ask(state, path, decision)
        ra.atomic(path, state)
    ra.settle_card(state, path, SETTLED[decision], SOURCE)


def apply_late_refund(state: dict, rows, now: float) -> None:
    """A later tap on the one remaining Refund button: newer than the first decision, same chat/sender, in window."""
    if state.get("late_refund"):
        return
    floor = float(state.get("decided_at") or state["created_at"])
    for update, chat, message, sender, received, data in rows:
        try:
            received = float(received)
        except (TypeError, ValueError):
            continue
        if (data != state["refund_key"] or chat != state["chat_id"] or sender != state["chat_id"]
                or type(update) is not int or update <= int(state.get("update_id") or 0)
                or not floor <= received <= min(now, state["expires_at"])):
            continue
        state.update(late_refund=True, late_update_id=update, late_decided_at=received, late_tap_message_id=message)
        return


def _late_followup(state: dict, path: Path, now: float) -> str:
    """After delay note / no action: one live "Refund in full" button on this card until its existing expires_at."""
    first = state["decision"]
    if state.get("late_refund"):
        _finish(state, path, "refund")
        return "refund"
    if state.get("late_closed"):
        return first
    if not state.get("late_attached") and now <= state["expires_at"]:
        try:  # a failed edit is retried next cycle and never blocks the decision the caller applies
            _attach(state, _late_keyboard(state))
        except ValueError:
            return first
        ra.register_keyboard(state["message_id"], _late_keyboard(state), carryable=True)
        state["late_attached"] = True
        ra.atomic(path, state)
    apply_late_refund(state, ra.callback_rows((state["refund_key"],), state["chat_id"]), now)
    if state.get("late_refund"):
        ra.atomic(path, state)
        _finish(state, path, "refund")
        return "refund"
    if now > state["expires_at"]:
        state["late_closed"] = True
        ra.atomic(path, state)
        _finish(state, path, first)
    return first


def advance(row: dict, root: Path, effects, now: float, deadline: str) -> str:
    """Return pending/delay_note/refund/no_action/unknown/exhausted. Caller holds the cycle lock.

    The three outcomes all carry an exact Florian button; the caller applies them to the row.
    """
    rid = str(uuid.UUID(str(row["id"])))
    if row.get("stripe_mode") != "live" or row.get("synthetic_test") is not False:
        raise ValueError("the SLA decision card is for real live orders only")
    if owner_managed(row):
        return "owner_managed"  # before reading stale decisions or creating callback state
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = root / f"{rid}.json"
    with path.with_suffix(".lock").open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if path.exists():
            saved = json.loads(path.read_text())
            recorded = saved.get("decision")
            if recorded in LATE_KEEP and saved.get("late_refund"):
                if not effects.dry_run and live_runtime():
                    _late_followup(saved, path, now)  # closes the card
                return "refund"  # the exact later tap is recorded: apply it (reference() names that tap)
            if recorded in ("delay_note", "refund", "no_action") and (
                    recorded not in LATE_KEEP or effects.dry_run or not live_runtime()):
                return recorded  # an exact button already recorded; apply it (also in dry runs)
        if effects.dry_run or not live_runtime():
            return "pending"  # fixtures never contact Telegram and never decide
        state = json.loads(path.read_text()) if path.exists() else {
            "request_id": rid, "kind": "sla_40h", "history": [], **_new_card(0)}
        if state.get("decision") == "refund":
            return "refund"
        if state.get("decision") in LATE_KEEP:
            return _late_followup(state, path, now)
        if state.get("decision") == "expired":
            if state.get("card", 1) >= MAX_CARDS:
                return "exhausted"
            ra.settle_card(state, path, SETTLED["expired"], SOURCE)  # the old card, before a re-ask replaces it
            if not ra.close_expired(state, path, _resolve_ask):
                return "pending"
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
            ra.register_keyboard(state["message_id"], _keyboard(state), carryable=True)
            state["buttons_attached"] = True
            ra.atomic(path, state)
        apply_callbacks(state, ra.callback_rows((state["delay_key"], state["refund_key"], state["noaction_key"]), state["chat_id"]), now)
        ra.atomic(path, state)
        decision = state.get("decision")
        if decision is None:
            return "pending"
        if decision in LATE_KEEP:
            return _late_followup(state, path, now)
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
        ra.settle_card(state, path, SETTLED[decision], SOURCE)
        if decision == "expired":
            return "exhausted" if state.get("card", 1) >= MAX_CARDS else "pending"
        return decision


def reference(root: Path, rid: str) -> str:
    """The audit reference written next to a decision: telegram:<message_id>:<update_id>."""
    state = json.loads((root / f"{uuid.UUID(rid)}.json").read_text())
    if state.get("late_refund") and state.get("decision") in LATE_KEEP and type(state.get("late_update_id")) is int \
            and type(state.get("message_id")) is int:
        return f"telegram:{state['message_id']}:{state['late_update_id']}"  # the Refund tap after the first decision
    if state.get("decision") not in ("delay_note", "refund", "no_action") \
            or type(state.get("update_id")) is not int or type(state.get("message_id")) is not int:
        raise ValueError("no exact button decision recorded")
    return f"telegram:{state['message_id']}:{state['update_id']}"
