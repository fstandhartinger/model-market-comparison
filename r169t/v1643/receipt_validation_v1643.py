#!/usr/bin/env python3
"""Validate fresh Florian GO receipts against notify and the Telegram reply broker."""
import datetime as dt
import hashlib
import importlib.machinery
import importlib.util
import json
import os
import pathlib
import re
import sqlite3
import time

HOME = pathlib.Path.home()
JOB = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919")
NOTIFY_LOG = HOME / ".notify/log.jsonl"
ACTION_DB = HOME / ".notify/reply-actions.sqlite3"
BROKER_DB = HOME / ".local/state/telegram-reply-broker/updates.sqlite3"
RELEASE_DIR = pathlib.Path(__file__).resolve().parent
CHOICES = ["Publish (recommended)", "Hold", "Later"]
FLORIAN_ONLY_REASON = "Material top-five change requires a fresh Florian GO for this preview."


def notify_formatter():
    """Load the installed formatter that produced the central notify record."""
    path = HOME / "bin/notify"
    loader = importlib.machinery.SourceFileLoader("notify_formatter_v1643", str(path))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


def expected_publish_reply():
    return f"Florian tapped the answer button “{CHOICES[0]}” (choices: {' | '.join(CHOICES)})"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def utc_text(seconds):
    return dt.datetime.fromtimestamp(int(seconds), dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def read_action(card_id):
    require(ACTION_DB.is_file(), "notify durable-reply action database is missing")
    db = sqlite3.connect(f"file:{ACTION_DB}?mode=ro", uri=True, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        row = db.execute("SELECT * FROM actions WHERE ask_id=?", (int(card_id),)).fetchone()
    finally:
        db.close()
    require(row is not None, "no durable notify reply action exists for the sent card")
    action = dict(row)
    require(action["channel"] == "telegram", "reply action is not Telegram")
    require(pathlib.Path(action["job_dir"]).resolve() == JOB.resolve(), "reply action targets another job")
    require(json.loads(action.get("choices") or "[]") == CHOICES, "durable reply action has different choices")
    require(action.get("override_reason") == FLORIAN_ONLY_REASON, "reply action has a different Florian-only route")
    require(action.get("reply_file") == str((HOME / f".notify/replies/reply-{card_id}.json").resolve()), "unexpected reply file")
    created, expires = float(action["created_at"]), float(action["expires_at"])
    require(959.9 * 60 <= expires - created <= 960.1 * 60, "durable reply action does not have the requested 960-minute expiry")
    return action


def notify_log_row(expected_sha):
    require(re.fullmatch(r"[a-f0-9]{64}", str(expected_sha or "")) is not None,
            "dispatch receipt lacks a central notify-log SHA256")
    require(NOTIFY_LOG.is_file(), "central notify log is missing")
    matches = [raw for raw in NOTIFY_LOG.read_bytes().splitlines(keepends=True) if digest(raw) == expected_sha]
    require(len(matches) == 1, "dispatch log SHA does not identify exactly one central notify record")
    try:
        return json.loads(matches[0])
    except json.JSONDecodeError as exc:
        raise SystemExit("matching central notify record is invalid JSON") from exc


def find_delivery_log(card_id, expected_photo):
    require(NOTIFY_LOG.is_file(), "central notify log is missing")
    found = []
    for raw in NOTIFY_LOG.read_bytes().splitlines(keepends=True):
        try:
            row = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if (str(row.get("message_id")) == str(card_id) and row.get("sent") is True
                and row.get("level") == "now"
                and pathlib.Path(str(row.get("photo", ""))).resolve() == pathlib.Path(expected_photo).resolve()):
            found.append((raw, row))
    require(len(found) == 1, "card ID and preview image do not identify exactly one delivered notify record")
    return found[0]


def validate_dispatch(receipt, expected_asset_binding, card_text_sha, card_image_sha, card_image_path):
    card_id = receipt.get("card_id")
    require(isinstance(card_id, str) and card_id.isdigit() and card_id != "18406", "dispatch receipt is not for a fresh card")
    log = notify_log_row(receipt.get("notify_log_entry_sha256"))
    require(log.get("sent") is True and log.get("level") == "now" and log.get("status") == "🧑 DU BIST DRAN",
            "central notify log does not show a delivered decision card")
    require(str(log.get("message_id")) == card_id, "central notify log card ID differs from receipt")
    require(int(card_id) in [int(x) for x in log.get("delivery_message_ids", [])], "central notify delivery list omits the card")
    require(not log.get("delivery_errors"), "central notify log reports a delivery error")
    require(pathlib.Path(str(log.get("photo", ""))).resolve() == pathlib.Path(card_image_path).resolve(),
            "central notify log names a different decision image")
    require(digest((RELEASE_DIR / "preview/REFRESHED-GO-CARD.txt").read_bytes()) == card_text_sha,
            "reviewed card text has changed since its binding was created")
    require(digest(pathlib.Path(card_image_path).read_bytes()) == card_image_sha == receipt.get("card_image_sha256"),
            "sent decision image differs from the reviewed preview")
    full_text = str(log.get("full_text", ""))
    card_text = (RELEASE_DIR / "preview/REFRESHED-GO-CARD.txt").read_text()
    require(full_text.startswith(card_text.rstrip() + "\n\n"),
            "delivered full text does not begin with the reviewed decision card bytes")
    action = read_action(card_id)
    require(action.get("ask_text") == full_text,
            "durable reply action text differs from the delivered full text")
    formatter = notify_formatter()
    todos = formatter.parse_human_todos(full_text)
    expected_caption = formatter.compact_immediate(
        full_text, todos, str(log.get("source", "")), dry_run=True,
        details_attached=len(full_text) > formatter.MAX_IMMEDIATE_CHARS,
    )
    require(log.get("text") == expected_caption,
            "delivered caption is not notify's deterministic compact form of the reviewed full text")
    require(receipt.get("card_text_sha256") == card_text_sha, "receipt caption source differs from the reviewed text")
    require(receipt.get("asset_binding_sha256") == expected_asset_binding, "receipt binds different preview assets")
    require(receipt.get("choices") == CHOICES and receipt.get("ask_minutes") == 960 and receipt.get("florian_only") is True,
            "dispatch receipt does not attest the required ask controls")
    require(action.get("status") in {"waiting", "matched", "resuming", "ack_pending_reaction", "acknowledged"},
            "durable reply action is not active")
    sent_at = dt.datetime.fromtimestamp(float(log["ts"]), dt.timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
    require(receipt.get("sent_at_utc") == sent_at, "dispatch receipt timestamp differs from the central notify record")
    require(receipt.get("florian_only_reason") == action.get("override_reason"), "dispatch receipt Florian-only reason differs from the durable action")
    action_fields = {k: action.get(k) for k in ["ask_id", "channel", "job_dir", "reply_file", "asker_name", "override_reason", "choices", "choice_nonce", "ask_text", "created_at", "expires_at"]}
    action_sha256 = digest(canonical(action_fields))
    if receipt.get("reply_action_sha256") is not None:
        require(receipt["reply_action_sha256"] == action_sha256, "dispatch receipt durable-action SHA does not match")
    return {"notify_log": log, "action": action, "action_sha256": action_sha256, "sent_at_utc": sent_at}


def telegram_chat_id():
    if os.environ.get("TG_CHAT_ID"):
        return int(os.environ["TG_CHAT_ID"])
    for path in [pathlib.Path("/etc/profile.d/telegram.sh"), pathlib.Path("/etc/environment")]:
        try:
            for line in path.read_text().splitlines():
                line = line.strip()
                if line.startswith("export "):
                    line = line[7:]
                if line.startswith("TG_CHAT_ID="):
                    return int(line.split("=", 1)[1].strip().strip("\"'"))
        except OSError:
            pass
    raise SystemExit("cannot verify Telegram sender identity without the configured owner chat")


def create_dispatch_receipt(card_id):
    card_id = str(card_id)
    require(card_id.isdigit() and card_id != "18406", "provide the new delivered Telegram card ID")
    receipt_path = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919/r175/receipts/CARD-SENT-V1643.json")
    require(not receipt_path.exists(), "a dispatch receipt already exists; do not send or record a duplicate ask")
    binding = json.loads((RELEASE_DIR / "receipts/REFRESHED-GO-BINDING.json").read_text())
    image = RELEASE_DIR / "preview/card-v1643.png"
    caption = RELEASE_DIR / "preview/REFRESHED-GO-CARD.txt"
    raw, log = find_delivery_log(card_id, image)
    sent_at = dt.datetime.fromtimestamp(float(log["ts"]), dt.timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
    action = read_action(card_id)
    receipt = {
        "schema_version": 1,
        "delivery_status": "DELIVERED",
        "card_id": card_id,
        "sent_at_utc": sent_at,
        "notify_log_entry_sha256": digest(raw),
        "asset_binding_sha256": binding["asset_binding_sha256"],
        "card_text_sha256": digest(caption.read_bytes()),
        "card_image_sha256": digest(image.read_bytes()),
        "choices": CHOICES,
        "ask_minutes": 960,
        "florian_only": True,
        "florian_only_reason": action.get("override_reason"),
    }
    checked = validate_dispatch(receipt, binding["asset_binding_sha256"], binding["card_text_sha256"], binding["card_image_sha256"], image)
    receipt["reply_action_sha256"] = checked["action_sha256"]
    validate_dispatch(receipt, binding["asset_binding_sha256"], binding["card_text_sha256"], binding["card_image_sha256"], image)
    receipt_path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    tmp = receipt_path.with_name(receipt_path.name + f".tmp-{os.getpid()}")
    with open(tmp, "wb") as handle:
        os.chmod(tmp, 0o600)
        handle.write(json.dumps(receipt, sort_keys=True, indent=2).encode() + b"\n")
    os.replace(tmp, receipt_path)
    os.chmod(receipt_path, 0o600)
    return receipt


def validate_answer(answer, sent_receipt, sent_receipt_sha256, preview_binding_sha256):
    card_id = str(sent_receipt.get("card_id", ""))
    require(answer.get("sender") == "florian" and answer.get("card_id") == card_id and answer.get("reply_to_card_id") == card_id,
            "answer receipt does not bind Florian to the exact sent card")
    require(answer.get("choice") == CHOICES[0], "answer is not the Publish button")
    require(answer.get("dispatch_receipt_sha256") == sent_receipt_sha256,
            "answer receipt does not bind the dispatch receipt")
    require(answer.get("preview_binding_sha256") == preview_binding_sha256,
            "answer receipt does not bind the refreshed preview")
    action = read_action(card_id)
    require(action.get("status") == "acknowledged" and action.get("ack_at") is not None,
            "the reply has not been acknowledged by this job")
    require(action.get("matched_reply_id") == int(card_id) and action.get("reply_kind") == "button",
            "durable action did not match a button press on this card")
    event_id, answered_at, callback_at = matched_publish_callback(action, card_id)
    require(str(answer.get("event_id")) == str(event_id), "answer receipt callback ID is not the matched Publish event")
    require(answer.get("answered_at_utc") == answered_at, "answer timestamp differs from the broker callback")
    answered = dt.datetime.strptime(answered_at, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
    sent_log = notify_log_row(sent_receipt.get("notify_log_entry_sha256"))
    require(sent_log.get("sent") is True and str(sent_log.get("message_id")) == card_id,
            "answer does not point to a delivered decision card")
    sent_at = float(sent_log["ts"])
    require(sent_receipt.get("sent_at_utc") == utc_text(sent_at),
            "sent-card receipt timestamp differs from the central notify record")
    action_created_at, action_expires_at = float(action["created_at"]), float(action["expires_at"])
    now = time.time()
    require(callback_at > sent_at, "Telegram callback predates card delivery")
    matched_at, ack_at = float(action.get("matched_at") or 0), float(action.get("ack_at") or 0)
    require(action_created_at <= callback_at <= action_expires_at and callback_at <= matched_at <= ack_at <= now,
            "dispatcher match/ack timestamps are out of order or outside the active action window")
    require(answered <= dt.datetime.now(dt.timezone.utc), "Telegram callback timestamp is in the future")
    reply_file = pathlib.Path(action["reply_file"])
    require(reply_file.is_file(), "durable dispatcher reply file is missing")
    reply = json.loads(reply_file.read_text())
    require(reply.get("message_id") == int(card_id) and reply.get("kind") == "button" and reply.get("ask_message_id") == int(card_id),
            "durable reply file does not match the sent decision card")
    require(reply.get("text") == action.get("reply_text") == expected_publish_reply(),
            "durable reply file does not record this card's exact first Publish choice")
    require(reply.get("acknowledged") == "agent-authored-reply" and reply.get("ack_message_id") == int(card_id),
            "durable reply file does not confirm the required notify acknowledgement")
    require(answer.get("reply_file_sha256") == digest(reply_file.read_bytes()), "answer receipt does not bind the dispatcher reply file")
    return {"event_id": str(event_id), "answered_at_utc": answered_at, "reply_file_sha256": digest(reply_file.read_bytes())}


def matched_publish_callback(action, card_id):
    nonce = action.get("choice_nonce")
    require(bool(nonce), "durable action has no button nonce")
    require(BROKER_DB.is_file(), "Telegram callback broker database is missing")
    owner_id = telegram_chat_id()
    db = sqlite3.connect(f"file:{BROKER_DB}?mode=ro", uri=True, timeout=10)
    try:
        rows = db.execute("SELECT update_id,received_at,sender_id,data FROM callback_events WHERE chat_id=? AND message_id=? AND data LIKE ? ORDER BY update_id",
                          (owner_id, int(card_id), f"nfy:{nonce}:%")).fetchall()
    finally:
        db.close()
    choices = json.loads(action.get("choices") or "[]")
    eligible = []
    for row in rows:
        data = row[3]
        index = data.rsplit(":", 1)[-1]
        if int(row[2]) == owner_id and index.isdigit() and int(index) < len(choices):
            eligible.append(row)
    require(eligible, "no valid answer-button callback from the configured Florian account exists for this card")
    first = eligible[0]
    require(first[3] == f"nfy:{nonce}:0", "Florian's first matched button was not Publish")
    expected_text = f"Florian tapped the answer button “{CHOICES[0]}” (choices: {' | '.join(CHOICES)})"
    require(action.get("reply_text") == expected_text, "durable action matched a different button than the broker's first callback")
    matched_at = float(action.get("matched_at") or 0)
    callback_at = float(first[1])
    require(matched_at >= callback_at and matched_at <= time.time(),
            "durable action match time does not follow the callback")
    require(callback_at <= time.time(), "Telegram callback timestamp is in the future")
    return int(first[0]), utc_text(first[1]), callback_at


def make_answer_receipt(sent_path, answer_path, dispatch_sha256, preview_binding_sha256):
    sent_bytes = pathlib.Path(sent_path).read_bytes()
    sent = json.loads(sent_bytes)
    card_id = str(sent.get("card_id", ""))
    action = read_action(card_id)
    require(action.get("status") == "acknowledged" and action.get("ack_at") is not None,
            "run notify ack for this reply before creating its receipt")
    event_id, answered_at, _ = matched_publish_callback(action, card_id)
    reply_file = pathlib.Path(action["reply_file"])
    require(reply_file.is_file(), "durable dispatcher reply file is missing")
    reply = json.loads(reply_file.read_text())
    require(reply.get("message_id") == int(card_id) and reply.get("ask_message_id") == int(card_id)
            and reply.get("kind") == "button" and reply.get("acknowledged") == "agent-authored-reply",
            "durable reply file does not confirm the acknowledged button response")
    require(reply.get("text") == action.get("reply_text") == expected_publish_reply(),
            "durable reply file does not record this card's exact first Publish choice")
    answer = {
        "sender": "florian",
        "card_id": card_id,
        "reply_to_card_id": card_id,
        "choice": CHOICES[0],
        "event_id": str(event_id),
        "answered_at_utc": answered_at,
        "dispatch_receipt_sha256": dispatch_sha256,
        "preview_binding_sha256": preview_binding_sha256,
        "reply_file_sha256": digest(reply_file.read_bytes()),
    }
    validate_answer(answer, sent, dispatch_sha256, preview_binding_sha256)
    target = pathlib.Path(answer_path)
    target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    tmp = target.with_name(target.name + f".tmp-{os.getpid()}")
    with open(tmp, "wb") as handle:
        os.chmod(tmp, 0o600)
        handle.write(json.dumps(answer, sort_keys=True, indent=2).encode() + b"\n")
    os.replace(tmp, target)
    os.chmod(target, 0o600)
    return answer
