#!/usr/bin/env python3
"""Record Florian's written GO for the card-18430 preview (no button tap).

Florian answered the refreshed v1.6.43 card in the laptop chat instead of tapping it.
The chief of staff recorded the answer verbatim in ~/DECISIONS.md (resolved-key
subq-snap-v1643-go) and relayed it as board decision #25583. This script binds that
written answer to the same dispatch receipt and preview binding a button tap would use,
writes a private receipt, and moves the proof from PENDING to PASS. It refuses unless the
DECISIONS entry still carries the exact quote and key, and unless the card's reply action
has no matched button reply (a tap must go through record_fresh_go_v1643.py instead).
"""
import hashlib
import json
import os
import pathlib
import sqlite3
import sys

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
V = W / "data/raw/benchmarks/jevbench/v1.6"
JOB = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919")
HOME = pathlib.Path.home()
sys.path.insert(0, str(J))
from receipt_validation_v1643 import validate_dispatch

DECISIONS_KEY = "subq-snap-v1643-go"
RELAY_BOARD_ENTRY = "25583"
RELAY_AT_UTC = "2026-10-24T08:05:31Z"
QUOTE = ("on the SubQ Snap model: yes, I think we can just release this model. Is there any special "
         "reason why we shouldn't? If it's in the new top five, but it got there in a fair way, why "
         "shouldn't we release it?")

sha = lambda b: hashlib.sha256(b).hexdigest()
canonical = lambda d: json.dumps(d, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
encode = lambda d: json.dumps(d, indent=1, sort_keys=True, ensure_ascii=False).encode() + b"\n"
load = lambda p: json.loads(pathlib.Path(p).read_text())


def atomic_write(path, data, mode):
    path = pathlib.Path(path)
    temp = path.with_name(path.name + f".tmp-{os.getpid()}")
    with open(temp, "wb") as handle:
        os.chmod(temp, mode)
        handle.write(data)
    os.replace(temp, path)


def decisions_entry():
    """Return the exact DECISIONS.md section that carries the key and the quote."""
    text = (HOME / "DECISIONS.md").read_text()
    sections = text.split("\n## ")
    hits = [s for s in sections if f"resolved-keys:" in s and DECISIONS_KEY in s.split("resolved-keys:", 1)[1].split("\n", 1)[0]]
    if len(hits) != 1:
        raise SystemExit(f"expected exactly one DECISIONS section resolving {DECISIONS_KEY}, found {len(hits)}")
    section = hits[0]
    if f'"{QUOTE}"' not in section or "GO for v1.6.43 (card 18430)" not in section or "Florian" not in section.split("\n", 1)[0]:
        raise SystemExit("DECISIONS entry no longer carries Florian's verbatim GO for card 18430")
    return section.encode()


def require_no_button_reply(card_id):
    db = sqlite3.connect(f"file:{HOME / '.notify/reply-actions.sqlite3'}?mode=ro", uri=True, timeout=10)
    try:
        row = db.execute("SELECT status, matched_reply_id FROM actions WHERE ask_id=?", (int(card_id),)).fetchone()
    finally:
        db.close()
    if row is None:
        raise SystemExit("no reply action for the sent card")
    if row[1] is not None or (HOME / f".notify/replies/reply-{card_id}.json").exists():
        raise SystemExit("a button reply exists for this card; use record_fresh_go_v1643.py instead")
    return row[0]


sent_path = JOB / "r175/receipts/CARD-SENT-V1643.json"
receipt_path = JOB / "r175/receipts/FRESH-GO-WRITTEN-V1643.json"
binding = load(J / "receipts/REFRESHED-GO-BINDING.json")
sent_bytes = sent_path.read_bytes()
sent = json.loads(sent_bytes)
sent_sha = sha(sent_bytes)
if sent_sha != binding.get("dispatch_receipt_sha256") or sent["card_id"] != binding.get("sent_card_id"):
    raise SystemExit("sent-card receipt does not match the preview binding")
checked = validate_dispatch(sent, binding["asset_binding_sha256"], binding["card_text_sha256"],
                            binding["card_image_sha256"], J / "preview/card-v1643.png")
if checked["action_sha256"] != binding.get("dispatch_action_sha256"):
    raise SystemExit("durable notify action differs from the bound dispatch")
if not RELAY_AT_UTC > sent["sent_at_utc"]:
    raise SystemExit("written GO predates the card")
action_status = require_no_button_reply(sent["card_id"])
entry = decisions_entry()
binding_sha = sha(canonical(binding))

receipt = {
    "kind": "written-go",
    "card_id": sent["card_id"],
    "sender": "florian",
    "channel": "laptop chat; recorded verbatim by the chief of staff in DECISIONS.md and relayed as board decision #25583",
    "quote": QUOTE,
    "decisions_key": DECISIONS_KEY,
    "decisions_entry_sha256": sha(entry),
    "relay_board_entry": RELAY_BOARD_ENTRY,
    "answered_at_utc": RELAY_AT_UTC,
    "card_reply_action_status_at_record": action_status,
    "dispatch_receipt_sha256": sent_sha,
    "dispatch_action_sha256": binding["dispatch_action_sha256"],
    "preview_binding_sha256": binding_sha,
}
receipt_bytes = encode(receipt)

proof_path = V / "jevbench-v1.6.43-proof.json"
proof = load(proof_path)
approval = proof["publication_approval"]
if approval.get("status") != "PENDING" or approval.get("fresh_go") is not None:
    raise SystemExit("approval is not in the expected PENDING state")
if proof.get("refreshed_preview") != binding or approval.get("refreshed_preview") != binding:
    raise SystemExit("proof preview bytes do not match the refreshed binding")
old_tail = "Publication authority PENDING: refreshed top-five comparison must be checked against the earlier GO; independent review PENDING."
if old_tail not in proof.get("authority", ""):
    raise SystemExit("candidate authority text is not the expected PENDING record")

approval.update(
    go="Fresh written Florian GO for the v1.6.42-baselined preview (card 18430, top-five change accepted); independent release review remains pending.",
    status="PASS",
    top_five_authority="Fresh written Florian GO recorded for the current v1.6.42-baselined preview; independent release review remains pending.",
    fresh_go={
        "channel": "written",
        "card_id": sent["card_id"],
        "reply_to_card_id": sent["card_id"],
        "from_user": "florian",
        "answer_event_id": f"decisions:{DECISIONS_KEY}",
        "button": None,
        "decisions_key": DECISIONS_KEY,
        "answered_at_utc": RELAY_AT_UTC,
        "dispatch_receipt_sha256": sent_sha,
        "dispatch_action_sha256": binding["dispatch_action_sha256"],
        "answer_receipt_sha256": sha(receipt_bytes),
        "preview_binding_sha256": binding_sha,
    },
)
proof["authority"] = proof["authority"].replace(
    old_tail,
    "Publication authority: fresh written top-five GO recorded for the v1.6.42-baselined preview; independent release review remains pending.",
)

manifest_path = V / "jevbench-v1.6.43-publication.json"
manifest = load(manifest_path)
build_path = J / "receipts/BUILD.json"
build = load(build_path)
proof_bytes = encode(proof)
manifest["files"]["proof"]["sha256"] = sha(proof_bytes)
manifest_bytes = encode(manifest)
build["files"] = manifest["files"]
build_bytes = encode(build)
if build["files"] != manifest["files"]:
    raise SystemExit("publication manifest and build receipt do not agree")
atomic_write(receipt_path, receipt_bytes, 0o600)
atomic_write(proof_path, proof_bytes, 0o644)
atomic_write(manifest_path, manifest_bytes, 0o644)
atomic_write(build_path, build_bytes, 0o644)
print(json.dumps({"status": "PASS", "channel": "written", "card_id": sent["card_id"],
                  "answer_receipt_sha256": sha(receipt_bytes), "preview_binding_sha256": binding_sha,
                  "independent_release_review": "PENDING"}, indent=2))
