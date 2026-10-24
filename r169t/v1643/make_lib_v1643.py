import json, pathlib
import hashlib

J = pathlib.Path(__file__).resolve().parent
W = J.parents[1]
V = W / "data/raw/benchmarks/jevbench/v1.6"
p = json.loads((V / "jevbench-v1.6.43-publication.json").read_text())
rows = json.loads((J / "receipts/NEW-ROW-SPEC.json").read_text())
proof = json.loads((V / "jevbench-v1.6.43-proof.json").read_text())
preview = proof["refreshed_preview"]
preview_sha = hashlib.sha256(
    json.dumps(preview, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
).hexdigest()
go = json.loads((V / "jevbench-v1.6.43-proof.json").read_text()).get("publication_approval", {}).get("fresh_go")
go_receipt_sha = (go or {}).get("answer_receipt_sha256")
s = (
    (J / "lib-v1643.template.mjs")
    .read_text()
    .replace(
        "/*HASHES*/",
        json.dumps({k: v["sha256"] for k, v in p["files"].items()}, sort_keys=True),
    )
    .replace("/*KEYS*/", json.dumps(sorted(rows)).replace('"', "'").replace(",", ","))
    .replace("/*ROWS*/", json.dumps(rows, sort_keys=True, ensure_ascii=False))
    .replace("/*PREVIEW*/", json.dumps(preview, sort_keys=True, ensure_ascii=False))
    .replace("/*PREVIEW_SHA*/", json.dumps(preview_sha))
    .replace("/*GO_RECEIPT_SHA*/", json.dumps(go_receipt_sha))
)
(W / "lib/jevbench-v1643-release.mjs").write_text(s)
