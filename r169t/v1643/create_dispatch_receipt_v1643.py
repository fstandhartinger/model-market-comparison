#!/usr/bin/env python3
"""Create the private dispatch receipt from notify's real log and durable action."""
import hashlib
import json
import pathlib
import sys

J = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(J))
from receipt_validation_v1643 import create_dispatch_receipt

if len(sys.argv) != 2:
    raise SystemExit("usage: create_dispatch_receipt_v1643.py <Telegram card id from notify output>")
receipt = create_dispatch_receipt(sys.argv[1])
print(json.dumps({"status": "PASS", "delivery_status": receipt["delivery_status"], "card_id": receipt["card_id"],
                  "sent_at_utc": receipt["sent_at_utc"], "notify_log_entry_sha256": receipt["notify_log_entry_sha256"],
                  "reply_action_sha256": receipt["reply_action_sha256"],
                  "receipt_sha256": hashlib.sha256(pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919/r175/receipts/CARD-SENT-V1643.json").read_bytes()).hexdigest()}, indent=2))
