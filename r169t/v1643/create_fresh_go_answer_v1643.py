#!/usr/bin/env python3
"""Create a private GO receipt from the acknowledged Telegram callback records."""
import hashlib
import json
import pathlib
import sys

J = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(J))
from receipt_validation_v1643 import make_answer_receipt

job = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919")
sent_path = job / "r175/receipts/CARD-SENT-V1643.json"
answer_path = job / "r175/receipts/FRESH-GO-ANSWER-V1643.json"
binding = json.loads((J / "receipts/REFRESHED-GO-BINDING.json").read_text())
sent_bytes = sent_path.read_bytes()
sent_sha = hashlib.sha256(sent_bytes).hexdigest()
if sent_sha != binding.get("dispatch_receipt_sha256"):
    raise SystemExit("dispatch receipt differs from the preview binding")
binding_sha = hashlib.sha256(json.dumps(binding, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
answer = make_answer_receipt(sent_path, answer_path, sent_sha, binding_sha)
print(json.dumps({"status": "PASS", "card_id": answer["card_id"], "event_id": answer["event_id"], "answered_at_utc": answer["answered_at_utc"], "answer_receipt_sha256": hashlib.sha256(answer_path.read_bytes()).hexdigest()}, indent=2))
