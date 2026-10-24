#!/usr/bin/env python3
"""Bind refreshed approval authority to exact preview bytes and, after send, a dispatch receipt."""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import sys

J = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(J))
from receipt_validation_v1643 import validate_dispatch
sha = lambda b: hashlib.sha256(b).hexdigest()
sha_file = lambda p: sha(pathlib.Path(p).read_bytes())
canonical = lambda d: json.dumps(d, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def parse_utc(value):
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("timestamp must be canonical UTC with Z suffix")
    parsed = dt.datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
    if parsed.strftime("%Y-%m-%dT%H:%M:%SZ") != value:
        raise ValueError("timestamp is not a canonical UTC second")
    return parsed


ap = argparse.ArgumentParser()
ap.add_argument("--dispatch-receipt", type=pathlib.Path)
ap.add_argument("--verify-existing", action="store_true")
args = ap.parse_args()

assets = {
    "baseline": "v1.6.42",
    "candidate": "v1.6.43",
    "topfive_diff_sha256": sha_file(J / "receipts/topfive-diff.json"),
    "approval_comparison_sha256": sha_file(J / "receipts/APPROVAL-COMPARISON.json"),
    "interactive_preview_sha256": sha_file(J / "preview/preview-full-ranking.html"),
    "card_image_sha256": sha_file(J / "preview/card-v1643.png"),
    "card_text_sha256": sha_file(J / "preview/REFRESHED-GO-CARD.txt"),
}
assets["asset_binding_sha256"] = sha(canonical(assets))
binding = {
    **assets,
    "sent_card_id": None,
    "sent_at_utc": None,
    "dispatch_receipt_sha256": None,
    "dispatch_action_sha256": None,
}
out = J / "receipts/REFRESHED-GO-BINDING.json"
if args.dispatch_receipt:
    expected_receipt = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919/r175/receipts/CARD-SENT-V1643.json")
    if args.dispatch_receipt.resolve() != expected_receipt.resolve():
        raise SystemExit("dispatch receipt must use the job's fixed receipt path")
    receipt_bytes = args.dispatch_receipt.read_bytes()
    receipt = json.loads(receipt_bytes)
    if receipt.get("delivery_status") != "DELIVERED":
        raise SystemExit("dispatch receipt does not confirm delivery")
    checked = validate_dispatch(receipt, assets["asset_binding_sha256"], assets["card_text_sha256"], assets["card_image_sha256"], J / "preview/card-v1643.png")
    binding.update(
        sent_card_id=receipt["card_id"],
        sent_at_utc=checked["sent_at_utc"],
        dispatch_receipt_sha256=sha(receipt_bytes),
        dispatch_action_sha256=checked["action_sha256"],
    )
else:
    existing = json.loads(out.read_text()) if out.exists() else None
    if existing and existing.get("dispatch_receipt_sha256"):
        binding.update(
            sent_card_id=existing["sent_card_id"],
            sent_at_utc=existing["sent_at_utc"],
            dispatch_receipt_sha256=existing["dispatch_receipt_sha256"],
            dispatch_action_sha256=existing["dispatch_action_sha256"],
        )

if args.verify_existing:
    if not out.exists() or json.loads(out.read_text()) != binding:
        raise SystemExit("preview/card/dispatch bytes differ from the pinned binding")
    if binding["dispatch_receipt_sha256"]:
        receipt_path = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919/r175/receipts/CARD-SENT-V1643.json")
        receipt_bytes = receipt_path.read_bytes()
        if sha(receipt_bytes) != binding["dispatch_receipt_sha256"]:
            raise SystemExit("fixed dispatch receipt bytes differ from the pinned binding")
        receipt = json.loads(receipt_bytes)
        checked = validate_dispatch(receipt, assets["asset_binding_sha256"], assets["card_text_sha256"], assets["card_image_sha256"], J / "preview/card-v1643.png")
        if checked["action_sha256"] != binding["dispatch_action_sha256"]:
            raise SystemExit("durable reply-action record differs from the pinned binding")
    print("PASS: preview, caption, image and dispatch receipts match pinned binding")
else:
    out.write_text(json.dumps(binding, indent=2, sort_keys=True) + "\n")
    print(json.dumps(binding, indent=2))
