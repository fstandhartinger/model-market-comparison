#!/usr/bin/env python3
"""Record a fresh Publish answer after checking the central notify/reply receipts."""
import argparse
import hashlib
import json
import os
import pathlib
import sys

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
V = W / "data/raw/benchmarks/jevbench/v1.6"
JOB = pathlib.Path("/home/flori/jobs/jevbench-add-requests-20260919")
sys.path.insert(0, str(J))
from receipt_validation_v1643 import validate_answer, validate_dispatch

sha = lambda b: hashlib.sha256(b).hexdigest()
canonical = lambda d: json.dumps(d, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
encode = lambda d: json.dumps(d, indent=1, sort_keys=True, ensure_ascii=False).encode() + b"\n"
load = lambda p: json.loads(pathlib.Path(p).read_text())


def atomic_write(path, data):
    path = pathlib.Path(path)
    temp = path.with_name(path.name + f".tmp-{os.getpid()}")
    with open(temp, "wb") as handle:
        os.chmod(temp, 0o600 if "r175/receipts" in str(path) else 0o644)
        handle.write(data)
    os.replace(temp, path)


ap = argparse.ArgumentParser()
ap.add_argument("--sent-receipt", type=pathlib.Path, required=True)
ap.add_argument("--answer-receipt", type=pathlib.Path, required=True)
args = ap.parse_args()
sent_path = JOB / "r175/receipts/CARD-SENT-V1643.json"
answer_path = JOB / "r175/receipts/FRESH-GO-ANSWER-V1643.json"
if args.sent_receipt.resolve() != sent_path.resolve() or args.answer_receipt.resolve() != answer_path.resolve():
    raise SystemExit("GO receipts must use the fixed private receipt paths")

binding = load(J / "receipts/REFRESHED-GO-BINDING.json")
sent_bytes = sent_path.read_bytes()
sent = json.loads(sent_bytes)
sent_sha = sha(sent_bytes)
if sent_sha != binding.get("dispatch_receipt_sha256"):
    raise SystemExit("sent-card receipt SHA does not match generated validator binding")
checked_dispatch = validate_dispatch(
    sent,
    binding["asset_binding_sha256"],
    binding["card_text_sha256"],
    binding["card_image_sha256"],
    J / "preview/card-v1643.png",
)
if checked_dispatch["action_sha256"] != binding.get("dispatch_action_sha256"):
    raise SystemExit("durable notify action differs from the bound dispatch")

answer_bytes = answer_path.read_bytes()
answer = json.loads(answer_bytes)
binding_sha = sha(canonical(binding))
checked_answer = validate_answer(answer, sent, sent_sha, binding_sha)
if answer.get("event_id") != checked_answer["event_id"] or answer.get("answered_at_utc") != checked_answer["answered_at_utc"]:
    raise SystemExit("answer receipt fields differ from the reply broker callback")

proof_path = V / "jevbench-v1.6.43-proof.json"
proof = load(proof_path)
approval = proof["publication_approval"]
if approval.get("status") != "PENDING" or approval.get("fresh_go") is not None:
    raise SystemExit("approval is not in the expected PENDING state")
if proof.get("refreshed_preview") != binding or approval.get("refreshed_preview") != binding:
    raise SystemExit("proof preview bytes do not match the refreshed binding")
if "refreshed_preview_approval" in proof or "refreshed_preview_go_card" in proof:
    raise SystemExit("stale predecessor authority must not be carried into this release")
old_tail = "Publication authority PENDING: refreshed top-five comparison must be checked against the earlier GO; independent review PENDING."
if old_tail not in proof.get("authority", ""):
    raise SystemExit("candidate authority text is not the expected PENDING record")

fresh_go = {
    "card_id": sent["card_id"],
    "reply_to_card_id": sent["card_id"],
    "from_user": "florian",
    "answer_event_id": answer["event_id"],
    "button": "Publish (recommended)",
    "answered_at_utc": answer["answered_at_utc"],
    "dispatch_receipt_sha256": sent_sha,
    "dispatch_action_sha256": binding["dispatch_action_sha256"],
    "answer_receipt_sha256": sha(answer_bytes),
    "preview_binding_sha256": binding_sha,
}
approval.update(
    go="Fresh Florian Publish choice received for the v1.6.42-baselined preview; independent release review remains pending.",
    status="PASS",
    top_five_authority="Fresh Florian GO recorded for the current v1.6.42-baselined preview; independent release review remains pending.",
    fresh_go=fresh_go,
)
proof["authority"] = proof["authority"].replace(
    old_tail,
    "Publication authority: fresh top-five GO recorded for the v1.6.42-baselined preview; independent release review remains pending.",
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

# Validate all inputs and resulting hashes before touching any release file.
if sha(proof_bytes) != manifest["files"]["proof"]["sha256"] or build["files"] != manifest["files"]:
    raise SystemExit("new GO proof, publication manifest and build receipt do not agree")
atomic_write(proof_path, proof_bytes)
atomic_write(manifest_path, manifest_bytes)
atomic_write(build_path, build_bytes)
print(json.dumps({"status": "PASS", "card_id": sent["card_id"], "dispatch_receipt_sha256": sent_sha,
                  "answer_receipt_sha256": sha(answer_bytes), "fresh_preview_binding_sha256": binding_sha,
                  "independent_release_review": "PENDING"}, indent=2))
